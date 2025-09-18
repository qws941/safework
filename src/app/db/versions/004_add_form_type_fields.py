"""Add form_type and additional fields for Survey model

Revision ID: 004
Create Date: 2025-08-28
"""

from alembic import op
import sqlalchemy as sa


def upgrade():
    # Add form_type column
    op.add_column("surveys", sa.Column("form_type", sa.String(50), nullable=True))

    # Add employee_number column if not exists
    try:
        op.add_column(
            "surveys", sa.Column("employee_number", sa.String(50), nullable=True)
        )
    except:
        pass

    # Add position column if not exists
    try:
        op.add_column("surveys", sa.Column("position", sa.String(100), nullable=True))
    except:
        pass

    # Add fields for form_002
    op.add_column("surveys", sa.Column("height_cm", sa.Float(), nullable=True))
    op.add_column("surveys", sa.Column("weight_kg", sa.Float(), nullable=True))
    op.add_column("surveys", sa.Column("blood_type", sa.String(10), nullable=True))
    op.add_column("surveys", sa.Column("existing_conditions", sa.Text(), nullable=True))
    op.add_column("surveys", sa.Column("medication_history", sa.Text(), nullable=True))
    op.add_column("surveys", sa.Column("allergy_history", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("surveys", "allergy_history")
    op.drop_column("surveys", "medication_history")
    op.drop_column("surveys", "existing_conditions")
    op.drop_column("surveys", "blood_type")
    op.drop_column("surveys", "weight_kg")
    op.drop_column("surveys", "height_cm")
    op.drop_column("surveys", "form_type")
