"""Migration: Database Performance Optimization

Created: 2025-01-15 12:10:00 UTC
Version: 003

This migration adds additional indexes and constraints for better performance.
"""

import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, '/app')  # Docker container path

try:
    from models import db
except ImportError:
    # Fallback for different execution contexts
    from app.models import db
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


def drop_index_if_exists(conn, index_name, table_name):
    """Helper function to drop index only if it exists (MySQL compatible)"""
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
        conn.execute(text(f"ALTER TABLE {table_name} DROP INDEX {index_name}"))
        print(f"  ✓ Dropped index {index_name} from {table_name}")


def upgrade():
    """Apply the migration - Add performance optimizations"""
    
    with db.engine.connect() as conn:
        trans = conn.begin()
        try:
            # Note: MySQL doesn't support GIN indexes for JSON fields
            # We'll create regular indexes on the JSON columns instead
            print("ℹ️  Skipping GIN indexes (MySQL doesn't support them for JSON)")
            
            # Create composite indexes for better query performance
            create_index_if_not_exists(conn, "idx_surveys_dept_date", "surveys", "department, submission_date")
            create_index_if_not_exists(conn, "idx_surveys_status_date", "surveys", "status, submission_date")
            create_index_if_not_exists(conn, "idx_surveys_user_date", "surveys", "user_id, submission_date")
            
            print("✅ Created composite indexes for common queries")
            
            # Add constraints (MySQL compatible)
            # Check if constraints already exist before adding
            try:
                # MySQL doesn't support named CHECK constraints in the same way
                # We'll check if the table has these constraints already
                result = conn.execute(
                    text("""
                    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                    WHERE table_schema = DATABASE() 
                    AND table_name = 'surveys' 
                    AND constraint_type = 'CHECK'
                    """)
                ).fetchone()
                
                if result[0] == 0:
                    # Add CHECK constraints (MySQL 8.0.16+)
                    conn.execute(
                        text("""
                        ALTER TABLE surveys 
                        ADD CONSTRAINT check_age CHECK (age >= 18 AND age <= 100)
                        """)
                    )
                    conn.execute(
                        text("""
                        ALTER TABLE surveys 
                        ADD CONSTRAINT check_work_hours CHECK (work_hours_per_day >= 1 AND work_hours_per_day <= 24)
                        """)
                    )
                    print("✅ Added data validation constraints")
                else:
                    print("  → Constraints already exist")
            except Exception as e:
                print(f"ℹ️  Constraints not added (may not be supported in this MySQL version): {e}")
            
            trans.commit()
        except Exception as e:
            trans.rollback()
            raise e


def downgrade():
    """Rollback the migration - Remove performance optimizations"""
    
    with db.engine.connect() as conn:
        trans = conn.begin()
        try:
            # Drop composite indexes
            drop_index_if_exists(conn, "idx_surveys_dept_date", "surveys")
            drop_index_if_exists(conn, "idx_surveys_status_date", "surveys")
            drop_index_if_exists(conn, "idx_surveys_user_date", "surveys")
            print("✅ Dropped composite indexes")
            
            # Drop constraints (MySQL compatible)
            try:
                conn.execute(text("ALTER TABLE surveys DROP CHECK check_age"))
                conn.execute(text("ALTER TABLE surveys DROP CHECK check_work_hours"))
                print("✅ Dropped data validation constraints")
            except Exception as e:
                print(f"ℹ️  Could not drop constraints: {e}")
            
            trans.commit()
        except Exception as e:
            trans.rollback()
            print(f"⚠️  Error during downgrade: {e}")