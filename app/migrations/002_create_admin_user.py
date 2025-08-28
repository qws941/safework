"""Migration: Create Default Admin User

Created: 2025-01-15 12:05:00 UTC
Version: 002

This migration creates the default admin user for SafeWork system.
"""

from app.models import User, db


def upgrade():
    """Apply the migration - Create admin user"""

    # Check if admin user already exists
    existing_admin = User.query.filter_by(username="admin").first()

    if not existing_admin:
        # Create admin user
        admin_user = User(username="admin", email="admin@safework.local", is_admin=True)
        admin_user.set_password("safework2024")

        db.session.add(admin_user)
        db.session.commit()

        print("✅ Created default admin user (admin/safework2024)")
    else:
        print("ℹ️  Admin user already exists, skipping creation")


def downgrade():
    """Rollback the migration - Remove admin user"""

    admin_user = User.query.filter_by(username="admin").first()

    if admin_user:
        # Only delete if it's the default admin (no surveys)
        if admin_user.surveys.count() == 0:
            db.session.delete(admin_user)
            db.session.commit()
            print("✅ Removed default admin user")
        else:
            print("⚠️  Admin user has associated data, skipping deletion")
    else:
        print("ℹ️  Admin user not found, nothing to rollback")
