"""Migration: Add document management system tables

Created: 2025-01-28 12:00:00 UTC
Version: 004
"""

from models import db
from sqlalchemy import text


def upgrade():
    """Apply the migration - Create document management tables"""
    
    with db.engine.connect() as conn:
        # Create document categories table
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS document_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            icon VARCHAR(50),
            sort_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """))
        
        # Create documents table  
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted_at DATETIME,
            FOREIGN KEY (category_id) REFERENCES document_categories(id),
            FOREIGN KEY (uploaded_by) REFERENCES users(id)
        );
        """))
        
        # Create document versions table
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS document_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        
        # Create document access logs table
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS document_access_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        
        # Create document templates table
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS document_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """))
        
        # Create indexes for better performance
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_documents_number ON documents(document_number);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions(document_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_document_access_document ON document_access_logs(document_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_document_access_user ON document_access_logs(user_id);"))
        
        # Insert default categories
        conn.execute(text("""
        INSERT OR IGNORE INTO document_categories (name, description, icon, sort_order) VALUES
        ('정책 및 규정', '회사 정책, 규정, 지침 문서', 'fa-gavel', 1),
        ('안전 가이드', '안전 작업 지침 및 가이드라인', 'fa-shield-alt', 2),
        ('교육 자료', '안전 교육 및 훈련 자료', 'fa-graduation-cap', 3),
        ('양식 및 템플릿', '각종 신청서 및 보고서 양식', 'fa-file-alt', 4),
        ('보고서', '안전 점검 및 사고 보고서', 'fa-chart-bar', 5),
        ('법규 및 표준', '관련 법규 및 산업 표준', 'fa-balance-scale', 6),
        ('비상 대응', '비상 상황 대응 절차 및 매뉴얼', 'fa-exclamation-triangle', 7),
        ('기타', '기타 문서 자료', 'fa-folder', 99);
        """))
        
        # Insert sample templates
        conn.execute(text("""
        INSERT OR IGNORE INTO document_templates (name, description, template_code, file_path, file_type, category, instructions) VALUES
        ('안전점검 체크리스트', '일일 안전점검용 체크리스트 양식', 'TMPL-SAFETY-001', '/app/forms/safety_checklist.pdf', 'pdf', 'safety', '매일 작업 시작 전 작성하여 제출'),
        ('사고 보고서', '산업재해 및 사고 발생 시 작성 양식', 'TMPL-INCIDENT-001', '/app/forms/incident_report.docx', 'docx', 'incident', '사고 발생 24시간 이내 작성 필수'),
        ('안전 교육 참석 확인서', '안전 교육 참석자 명단 및 확인서', 'TMPL-EDU-001', '/app/forms/education_attendance.xlsx', 'xlsx', 'education', '교육 완료 후 즉시 작성'),
        ('위험성 평가서', '작업장 위험성 평가 양식', 'TMPL-RISK-001', '/app/forms/risk_assessment.pdf', 'pdf', 'inspection', '신규 작업 또는 변경 시 작성');
        """))
        
        conn.commit()
    
    print("✅ Document management tables created successfully")


def downgrade():
    """Rollback the migration - Remove document management tables"""
    
    with db.engine.connect() as conn:
        # Drop indexes first
        conn.execute(text("DROP INDEX IF EXISTS idx_documents_category;"))
        conn.execute(text("DROP INDEX IF EXISTS idx_documents_type;"))
        conn.execute(text("DROP INDEX IF EXISTS idx_documents_uploaded_by;"))
        conn.execute(text("DROP INDEX IF EXISTS idx_documents_number;"))
        conn.execute(text("DROP INDEX IF EXISTS idx_document_versions_document;"))
        conn.execute(text("DROP INDEX IF EXISTS idx_document_access_document;"))
        conn.execute(text("DROP INDEX IF EXISTS idx_document_access_user;"))
        
        # Drop tables in reverse order (due to foreign key constraints)
        conn.execute(text("DROP TABLE IF EXISTS document_templates;"))
        conn.execute(text("DROP TABLE IF EXISTS document_access_logs;"))
        conn.execute(text("DROP TABLE IF EXISTS document_versions;"))
        conn.execute(text("DROP TABLE IF EXISTS documents;"))
        conn.execute(text("DROP TABLE IF EXISTS document_categories;"))
        
        conn.commit()
    
    print("✅ Document management tables removed successfully")