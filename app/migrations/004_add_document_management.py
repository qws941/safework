"""Migration: Add document management system tables

Created: 2025-01-28 12:00:00 UTC
Version: 004
"""

from models import db
from sqlalchemy import text


def create_index_if_not_exists(conn, index_name, table_name, columns):
    """Helper function to create index only if it doesn't exist (MySQL compatible)"""
    result = conn.execute(
        text("""
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE table_schema = DATABASE() 
        AND table_name = :table_name 
        AND index_name = :index_name
        """),
        {"table_name": table_name, "index_name": index_name}
    ).fetchone()
    
    if result[0] == 0:
        conn.execute(text(f"CREATE INDEX {index_name} ON {table_name}({columns})"))
        print(f"  ✓ Created index {index_name} on {table_name}({columns})")
    else:
        print(f"  → Index {index_name} already exists on {table_name}")


def table_exists(conn, table_name):
    """Check if table exists in MySQL"""
    result = conn.execute(
        text("""
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
        WHERE table_schema = DATABASE() 
        AND table_name = :table_name
        """),
        {"table_name": table_name}
    ).fetchone()
    return result[0] > 0


def upgrade():
    """Apply the migration - Create document management tables"""
    
    with db.engine.connect() as conn:
        trans = conn.begin()
        try:
            # Create document categories table
            if not table_exists(conn, "document_categories"):
                conn.execute(text("""
                CREATE TABLE document_categories (
                    id INTEGER PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(100) NOT NULL UNIQUE,
                    description TEXT,
                    icon VARCHAR(50),
                    sort_order INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                """))
                print("  ✓ Created document_categories table")
            
            # Create documents table
            if not table_exists(conn, "documents"):
                conn.execute(text("""
                CREATE TABLE documents (
                    id INTEGER PRIMARY KEY AUTO_INCREMENT,
                    title VARCHAR(200) NOT NULL,
                    description TEXT,
                    file_name VARCHAR(255) NOT NULL,
                    file_path VARCHAR(500) NOT NULL,
                    file_size INTEGER,
                    file_type VARCHAR(50),
                    document_number VARCHAR(50) UNIQUE,
                    version VARCHAR(20) DEFAULT '1.0',
                    language VARCHAR(10) DEFAULT 'ko',
                    tags JSON,
                    category_id INTEGER,
                    document_type VARCHAR(50),
                    is_public BOOLEAN DEFAULT FALSE,
                    requires_admin BOOLEAN DEFAULT FALSE,
                    department_access JSON,
                    uploaded_by INTEGER NOT NULL,
                    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE,
                    is_archived BOOLEAN DEFAULT FALSE,
                    valid_from DATE,
                    valid_until DATE,
                    download_count INTEGER DEFAULT 0,
                    view_count INTEGER DEFAULT 0,
                    last_accessed DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    deleted_at DATETIME,
                    FOREIGN KEY (category_id) REFERENCES document_categories(id),
                    FOREIGN KEY (uploaded_by) REFERENCES users(id)
                );
                """))
                print("  ✓ Created documents table")
            
            # Create document versions table
            if not table_exists(conn, "document_versions"):
                conn.execute(text("""
                CREATE TABLE document_versions (
                    id INTEGER PRIMARY KEY AUTO_INCREMENT,
                    document_id INTEGER NOT NULL,
                    version_number VARCHAR(20) NOT NULL,
                    file_path VARCHAR(500) NOT NULL,
                    file_size INTEGER,
                    change_description TEXT,
                    uploaded_by INTEGER,
                    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    is_current BOOLEAN DEFAULT FALSE,
                    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
                    FOREIGN KEY (uploaded_by) REFERENCES users(id)
                );
                """))
                print("  ✓ Created document_versions table")
            
            # Create document access logs table
            if not table_exists(conn, "document_access_logs"):
                conn.execute(text("""
                CREATE TABLE document_access_logs (
                    id INTEGER PRIMARY KEY AUTO_INCREMENT,
                    document_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    action VARCHAR(50),
                    ip_address VARCHAR(45),
                    user_agent VARCHAR(500),
                    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );
                """))
                print("  ✓ Created document_access_logs table")
            
            # Create document templates table
            if not table_exists(conn, "document_templates"):
                conn.execute(text("""
                CREATE TABLE document_templates (
                    id INTEGER PRIMARY KEY AUTO_INCREMENT,
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    template_code VARCHAR(50) UNIQUE,
                    file_path VARCHAR(500) NOT NULL,
                    file_type VARCHAR(50),
                    category VARCHAR(50),
                    fields JSON,
                    instructions TEXT,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                );
                """))
                print("  ✓ Created document_templates table")
            
            # Create indexes for better performance
            create_index_if_not_exists(conn, "idx_documents_category", "documents", "category_id")
            create_index_if_not_exists(conn, "idx_documents_type", "documents", "document_type")
            create_index_if_not_exists(conn, "idx_documents_uploaded_by", "documents", "uploaded_by")
            create_index_if_not_exists(conn, "idx_documents_number", "documents", "document_number")
            create_index_if_not_exists(conn, "idx_document_versions_document", "document_versions", "document_id")
            create_index_if_not_exists(conn, "idx_document_access_document", "document_access_logs", "document_id")
            create_index_if_not_exists(conn, "idx_document_access_user", "document_access_logs", "user_id")
            
            # Insert default categories (MySQL compatible - use INSERT IGNORE)
            conn.execute(text("""
            INSERT IGNORE INTO document_categories (name, description, icon, sort_order) VALUES
            ('정책 및 규정', '회사 정책, 규정, 지침 문서', 'fa-gavel', 1),
            ('안전 가이드', '안전 작업 지침 및 가이드라인', 'fa-shield-alt', 2),
            ('교육 자료', '안전 교육 및 훈련 자료', 'fa-graduation-cap', 3),
            ('양식 및 템플릿', '각종 신청서 및 보고서 양식', 'fa-file-alt', 4),
            ('보고서', '안전 점검 및 사고 보고서', 'fa-chart-bar', 5),
            ('인증서', '안전 관련 인증서 및 자격증', 'fa-certificate', 6),
            ('매뉴얼', '장비 및 시스템 사용 매뉴얼', 'fa-book', 7),
            ('기타', '기타 문서 및 자료', 'fa-folder', 8);
            """))
            
            print("✅ Created document management tables and indexes")
            trans.commit()
            
        except Exception as e:
            trans.rollback()
            raise e


def downgrade():
    """Rollback the migration - Drop document management tables"""
    
    with db.engine.connect() as conn:
        trans = conn.begin()
        try:
            # Drop tables in reverse order to avoid foreign key constraints
            tables = [
                'document_access_logs',
                'document_versions',
                'document_templates',
                'documents',
                'document_categories'
            ]
            
            for table in tables:
                if table_exists(conn, table):
                    conn.execute(text(f"DROP TABLE {table}"))
                    print(f"  ✓ Dropped {table} table")
            
            print("✅ Dropped document management tables")
            trans.commit()
            
        except Exception as e:
            trans.rollback()
            print(f"⚠️  Error during downgrade: {e}")