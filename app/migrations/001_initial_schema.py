"""Migration: Initial SafeWork Database Schema

Created: 2025-01-15 12:00:00 UTC
Version: 001

This migration creates the initial database schema for SafeWork project
including users, surveys, statistics, and audit logs.
"""

from models import db
from sqlalchemy import text


def create_index_if_not_exists(conn, index_name, table_name, columns):
    """Helper function to create index only if it doesn't exist (MySQL compatible)"""
    # Check if index exists
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
        # Index doesn't exist, create it
        conn.execute(
            text(f"CREATE INDEX {index_name} ON {table_name}({columns})")
        )
        print(f"  ✓ Created index {index_name} on {table_name}({columns})")
    else:
        print(f"  → Index {index_name} already exists on {table_name}")


def upgrade():
    """Apply the migration - Create initial schema"""
    
    # Create all tables defined in models.py
    db.create_all()
    
    # Create indexes for better performance (MySQL compatible)
    with db.engine.connect() as conn:
        # Start transaction
        trans = conn.begin()
        try:
            create_index_if_not_exists(conn, "idx_surveys_user_id", "surveys", "user_id")
            create_index_if_not_exists(conn, "idx_surveys_submission_date", "surveys", "submission_date")
            create_index_if_not_exists(conn, "idx_surveys_department", "surveys", "department")
            create_index_if_not_exists(conn, "idx_surveys_status", "surveys", "status")
            create_index_if_not_exists(conn, "idx_survey_statistics_date", "survey_statistics", "stat_date")
            create_index_if_not_exists(conn, "idx_audit_logs_user_id", "audit_logs", "user_id")
            create_index_if_not_exists(conn, "idx_audit_logs_created_at", "audit_logs", "created_at")
            
            trans.commit()
            print("✅ Created initial database schema with indexes")
        except Exception as e:
            trans.rollback()
            raise e


def drop_index_if_exists(conn, index_name, table_name):
    """Helper function to drop index only if it exists (MySQL compatible)"""
    # Check if index exists
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
    
    if result[0] > 0:
        # For MySQL, we need to use ALTER TABLE to drop indexes
        conn.execute(
            text(f"ALTER TABLE {table_name} DROP INDEX {index_name}")
        )
        print(f"  ✓ Dropped index {index_name} from {table_name}")


def downgrade():
    """Rollback the migration - Drop all tables"""
    
    # Drop indexes first (MySQL compatible)
    try:
        with db.engine.connect() as conn:
            trans = conn.begin()
            try:
                drop_index_if_exists(conn, "idx_surveys_user_id", "surveys")
                drop_index_if_exists(conn, "idx_surveys_submission_date", "surveys")
                drop_index_if_exists(conn, "idx_surveys_department", "surveys")
                drop_index_if_exists(conn, "idx_surveys_status", "surveys")
                drop_index_if_exists(conn, "idx_survey_statistics_date", "survey_statistics")
                drop_index_if_exists(conn, "idx_audit_logs_user_id", "audit_logs")
                drop_index_if_exists(conn, "idx_audit_logs_created_at", "audit_logs")
                trans.commit()
            except Exception as e:
                trans.rollback()
                print(f"Warning: Could not drop some indexes: {e}")
    except Exception as e:
        print(f"Warning: Could not drop indexes: {e}")
    
    # Drop all tables
    db.drop_all()
    
    print("✅ Dropped initial database schema")