"""
Migration 007: Fix surveys table missing columns
Add missing columns from models.py that are not in the database
"""

import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, "/app")  # Docker container path

try:
    from models import db
except ImportError:
    # Fallback for different execution contexts
    from app.models import db
from sqlalchemy import text


def upgrade():
    """Add missing columns to surveys table"""

    with db.engine.begin() as conn:
        # Check if columns exist and add them if missing
        missing_columns = [
            ("work_years", "INT"),
            ("work_months", "INT"),
            ("marriage_status", "VARCHAR(10)"),
            ("current_work_details", "TEXT"),
            ("current_work_years", "INT"),
            ("current_work_months", "INT"),
            ("break_time_minutes", "INT"),
            ("break_frequency", "INT"),
            ("previous_work_details", "TEXT"),
            ("previous_work_years", "INT"),
            ("previous_work_months", "INT"),
            ("hobby_computer", "BOOLEAN DEFAULT FALSE"),
            ("hobby_instrument", "BOOLEAN DEFAULT FALSE"),
            ("hobby_knitting", "BOOLEAN DEFAULT FALSE"),
            ("hobby_racket_sports", "BOOLEAN DEFAULT FALSE"),
            ("hobby_ball_sports", "BOOLEAN DEFAULT FALSE"),
            ("hobby_none", "BOOLEAN DEFAULT FALSE"),
            ("housework_hours", "VARCHAR(50)"),
            ("disease_rheumatoid", "BOOLEAN DEFAULT FALSE"),
            ("disease_diabetes", "BOOLEAN DEFAULT FALSE"),
            ("disease_lupus", "BOOLEAN DEFAULT FALSE"),
            ("disease_gout", "BOOLEAN DEFAULT FALSE"),
            ("disease_alcoholism", "BOOLEAN DEFAULT FALSE"),
            ("disease_status", "VARCHAR(20)"),
            ("past_accident", "BOOLEAN DEFAULT FALSE"),
            ("accident_hand", "BOOLEAN DEFAULT FALSE"),
            ("accident_arm", "BOOLEAN DEFAULT FALSE"),
            ("accident_shoulder", "BOOLEAN DEFAULT FALSE"),
            ("accident_neck", "BOOLEAN DEFAULT FALSE"),
            ("accident_waist", "BOOLEAN DEFAULT FALSE"),
            ("accident_leg", "BOOLEAN DEFAULT FALSE"),
            ("physical_burden", "VARCHAR(30)"),
            ("has_symptoms", "BOOLEAN DEFAULT FALSE"),
            ("neck_data", "JSON"),
            ("shoulder_data", "JSON"),
            ("arm_data", "JSON"),
            ("hand_data", "JSON"),
            ("waist_data", "JSON"),
            ("leg_data", "JSON"),
            ("ip_address", "VARCHAR(45)"),
            ("reviewed_by", "INT"),
            ("reviewed_at", "DATETIME"),
        ]

        for column_name, column_type in missing_columns:
            # Check if column exists
            result = conn.execute(
                text(
                    """
                SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'surveys' 
                AND COLUMN_NAME = :column_name
            """
                ),
                {"column_name": column_name},
            ).fetchone()

            if result[0] == 0:  # Column doesn't exist
                conn.execute(
                    text(f"ALTER TABLE surveys ADD COLUMN {column_name} {column_type}")
                )
                print(f"  ✓ Added column: {column_name}")

        # Add foreign key constraints if they don't exist
        try:
            conn.execute(
                text(
                    """
                ALTER TABLE surveys 
                ADD CONSTRAINT fk_surveys_reviewed_by 
                FOREIGN KEY (reviewed_by) REFERENCES users(id)
            """
                )
            )
            print("  ✓ Added foreign key constraint for reviewed_by")
        except:
            print("  → Foreign key constraint for reviewed_by already exists or failed")

        print("✅ Fixed surveys table missing columns")


def downgrade():
    """Remove the added columns (optional - usually not used in production)"""

    with db.engine.begin() as conn:
        # Remove foreign key constraint
        conn.execute(
            text(
                "ALTER TABLE surveys DROP FOREIGN KEY IF EXISTS fk_surveys_reviewed_by"
            )
        )

        # Note: In production, we usually don't remove columns in downgrade
        # as it could cause data loss. This is just for development.
        columns_to_remove = [
            "work_years",
            "work_months",
            "marriage_status",
            "current_work_details",
            "current_work_years",
            "current_work_months",
            "break_time_minutes",
            "break_frequency",
            "previous_work_details",
            "previous_work_years",
            "previous_work_months",
            "hobby_computer",
            "hobby_instrument",
            "hobby_knitting",
            "hobby_racket_sports",
            "hobby_ball_sports",
            "hobby_none",
            "housework_hours",
            "disease_rheumatoid",
            "disease_diabetes",
            "disease_lupus",
            "disease_gout",
            "disease_alcoholism",
            "disease_status",
            "past_accident",
            "accident_hand",
            "accident_arm",
            "accident_shoulder",
            "accident_neck",
            "accident_waist",
            "accident_leg",
            "physical_burden",
            "has_symptoms",
            "neck_data",
            "shoulder_data",
            "arm_data",
            "hand_data",
            "waist_data",
            "leg_data",
            "ip_address",
            "reviewed_by",
            "reviewed_at",
        ]

        for column_name in columns_to_remove:
            conn.execute(
                text(f"ALTER TABLE surveys DROP COLUMN IF EXISTS {column_name}")
            )

        print("✅ Removed added columns from surveys table")


# Migration metadata
metadata = {
    "version": "007",
    "description": "Fix surveys table missing columns",
    "author": "SafeWork Team",
    "created_at": "2025-09-04",
}
