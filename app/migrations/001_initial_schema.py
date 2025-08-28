"""Migration: Initial SafeWork Database Schema

Created: 2025-01-15 12:00:00 UTC
Version: 001

This migration creates the initial database schema for SafeWork project
including users, surveys, statistics, and audit logs.
"""

from models import db
from sqlalchemy import text


def upgrade():
    """Apply the migration - Create initial schema"""

    # Create all tables defined in models.py
    db.create_all()

    # Create indexes for better performance
    with db.engine.connect() as conn:
        conn.execute(
            text("""
            CREATE INDEX IF NOT EXISTS idx_surveys_user_id ON surveys(user_id);
        """)
        )
        conn.commit()

        conn.execute(
            text("""
            CREATE INDEX IF NOT EXISTS idx_surveys_submission_date ON surveys(submission_date);
        """)
        )

        conn.execute(
            text("""
            CREATE INDEX IF NOT EXISTS idx_surveys_department ON surveys(department);
        """)
        )

        conn.execute(
            text("""
            CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);
        """)
        )

        conn.execute(
            text("""
            CREATE INDEX IF NOT EXISTS idx_survey_statistics_date ON survey_statistics(stat_date);
        """)
        )

        conn.execute(
            text("""
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
        """)
        )

        conn.execute(
            text("""
            CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
        """)
        )

    print("✅ Created initial database schema with indexes")


def downgrade():
    """Rollback the migration - Drop all tables"""

    # Drop indexes first
    try:
        with db.engine.connect() as conn:
            conn.execute(text("DROP INDEX IF EXISTS idx_surveys_user_id;"))
            conn.execute(text("DROP INDEX IF EXISTS idx_surveys_submission_date;"))
            conn.execute(text("DROP INDEX IF EXISTS idx_surveys_department;"))
            conn.execute(text("DROP INDEX IF EXISTS idx_surveys_status;"))
            conn.execute(text("DROP INDEX IF EXISTS idx_survey_statistics_date;"))
            conn.execute(text("DROP INDEX IF EXISTS idx_audit_logs_user_id;"))
            conn.execute(text("DROP INDEX IF EXISTS idx_audit_logs_created_at;"))
            conn.commit()
    except Exception as e:
        print(f"Warning: Could not drop some indexes: {e}")

    # Drop all tables
    db.drop_all()

    print("✅ Dropped initial database schema")
