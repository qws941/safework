#!/usr/bin/env python3
"""Script to run database migrations"""

import sys
from app import create_app
from migration_manager import MigrationManager

if __name__ == '__main__':
    # Get migration file from command line
    if len(sys.argv) > 1:
        migration_file = sys.argv[1]
    else:
        migration_file = '004_add_document_management.py'
    
    # Create app with testing config (SQLite)
    app = create_app('testing')
    
    with app.app_context():
        mm = MigrationManager(app)
        result = mm.run_migration(migration_file)
        
        if result:
            print(f"✅ Migration {migration_file} completed successfully")
        else:
            print(f"❌ Migration {migration_file} failed")
            sys.exit(1)