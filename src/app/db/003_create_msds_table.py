"""Migration: Create SafeWork MSDS Table

Created: 2025-01-15 18:00:00 UTC
Version: 003

This migration creates the safework_msds table for Material Safety Data Sheets management.
"""

import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, '/app')  # Docker container path

try:
    from models import db
    from models_safework import SafeworkMsds
except ImportError:
    # Fallback for different execution contexts
    from app.models import db
    from app.models_safework import SafeworkMsds


def upgrade():
    """Apply the migration - Create MSDS table"""
    
    # Create the safework_msds table
    db.create_all()
    
    # Verify table was created
    from sqlalchemy import text
    
    result = db.session.execute(text("""
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'safework_msds'
    """)).fetchone()
    
    if result.count > 0:
        print("✅ Created safework_msds table successfully")
        
        # Create indexes for performance
        try:
            db.session.execute(text("""
                CREATE INDEX idx_msds_chemical_name ON safework_msds(chemical_name);
            """))
            db.session.execute(text("""
                CREATE INDEX idx_msds_cas_number ON safework_msds(cas_number);
            """))
            db.session.execute(text("""
                CREATE INDEX idx_msds_hazard_level ON safework_msds(hazard_level);
            """))
            db.session.execute(text("""
                CREATE INDEX idx_msds_status ON safework_msds(status);
            """))
            db.session.execute(text("""
                CREATE INDEX idx_msds_expiry_date ON safework_msds(msds_expiry_date);
            """))
            db.session.execute(text("""
                CREATE INDEX idx_msds_created_at ON safework_msds(created_at);
            """))
            
            db.session.commit()
            print("✅ Created MSDS table indexes successfully")
            
        except Exception as e:
            print(f"⚠️ Warning: Could not create indexes: {e}")
            db.session.rollback()
    else:
        print("❌ Failed to create safework_msds table")


def downgrade():
    """Rollback the migration - Drop MSDS table"""
    
    from sqlalchemy import text
    
    try:
        # Drop indexes first
        indexes = [
            'idx_msds_chemical_name',
            'idx_msds_cas_number', 
            'idx_msds_hazard_level',
            'idx_msds_status',
            'idx_msds_expiry_date',
            'idx_msds_created_at'
        ]
        
        for index_name in indexes:
            try:
                db.session.execute(text(f"DROP INDEX {index_name} ON safework_msds"))
            except Exception as e:
                print(f"⚠️ Warning: Could not drop index {index_name}: {e}")
        
        # Drop the table
        db.session.execute(text("DROP TABLE IF EXISTS safework_msds"))
        db.session.commit()
        
        print("✅ Removed safework_msds table and indexes successfully")
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Failed to remove safework_msds table: {e}")