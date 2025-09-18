"""
Migration 004: Add submission_date column to surveys table

This migration adds the missing submission_date column to the surveys table
to resolve the psycopg2.errors.UndefinedColumn error.
"""

import os
import sys
from datetime import datetime, timezone, timedelta

# Add app directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import db, kst_now


def upgrade():
    """Add submission_date column to surveys table"""
    try:
        # Create the submission_date column with default value
        db.engine.execute("""
            ALTER TABLE surveys
            ADD COLUMN IF NOT EXISTS submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        """)

        # Update existing records to set submission_date = created_at
        db.engine.execute("""
            UPDATE surveys
            SET submission_date = created_at
            WHERE submission_date IS NULL
        """)

        # Create index for performance
        db.engine.execute("""
            CREATE INDEX IF NOT EXISTS idx_surveys_submission_date
            ON surveys (submission_date)
        """)

        print("✅ Added submission_date column to surveys table")
        print("✅ Updated existing records with submission_date = created_at")
        print("✅ Created index on submission_date column")

    except Exception as e:
        print(f"❌ Error adding submission_date column: {e}")
        raise


def downgrade():
    """Remove submission_date column from surveys table"""
    try:
        # Drop index first
        db.engine.execute("DROP INDEX IF EXISTS idx_surveys_submission_date")

        # Remove the column
        db.engine.execute("ALTER TABLE surveys DROP COLUMN IF EXISTS submission_date")

        print("✅ Removed submission_date column from surveys table")

    except Exception as e:
        print(f"❌ Error removing submission_date column: {e}")
        raise


if __name__ == "__main__":
    print("Migration 004: Add submission_date column")

    # Create app context for migration
    from app import create_app
    app = create_app()

    with app.app_context():
        upgrade()