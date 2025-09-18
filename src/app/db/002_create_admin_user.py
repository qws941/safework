"""Migration: Create Default Admin User

Created: 2025-01-15 12:05:00 UTC
Version: 002

This migration creates the default admin user for SafeWork system.
"""

import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, "/app")  # Docker container path

try:
    from models import User, db
except ImportError:
    # Fallback for different execution contexts
    from app.models import User, db


def upgrade():
    """Apply the migration - Create admin user"""

    # Check if admin user already exists (check both admin and safewrork)
    existing_admin = User.query.filter_by(username="admin").first()
    existing_safewrork = User.query.filter_by(username="safewrork").first()

    if not existing_admin and not existing_safewrork:
        # Create admin user with actual credentials
        admin_user = User(
            username="safewrork", email="admin@safework.local", is_admin=True
        )
        admin_user.set_password("123")

        db.session.add(admin_user)
        db.session.commit()

        print("✅ Created default admin user (safewrork/123)")
    else:
        print("ℹ️  Admin user already exists, skipping creation")


def downgrade():
    """Rollback the migration - Remove admin user"""

    # Check for both possible admin usernames
    admin_user = User.query.filter_by(username="admin").first()
    safewrork_user = User.query.filter_by(username="safewrork").first()

    user_to_remove = admin_user or safewrork_user

    if user_to_remove:
        # Only delete if it's the default admin (no surveys)
        if user_to_remove.surveys.count() == 0:
            db.session.delete(user_to_remove)
            db.session.commit()
            print(f"✅ Removed default admin user ({user_to_remove.username})")
        else:
            print("⚠️  Admin user has associated data, skipping deletion")
    else:
        print("ℹ️  Admin user not found, nothing to rollback")
