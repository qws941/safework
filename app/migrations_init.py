#!/usr/bin/env python
"""Initialize Flask-Migrate for database migrations"""
from flask import Flask
from flask_migrate import Migrate, init, migrate, upgrade
from models import db
from config import Config
import os

def init_migrations():
    """Initialize migrations"""
    app = Flask(__name__)
    app.config.from_object(Config)
    
    db.init_app(app)
    migrate_obj = Migrate(app, db)
    
    with app.app_context():
        # Initialize migrations if not exists
        if not os.path.exists('migrations'):
            init()
            print("Initialized migrations")
        
        # Create initial migration
        migrate(message='Add all survey fields for 001 and 002')
        print("Created migration")
        
        # Apply migration
        upgrade()
        print("Applied migration")

if __name__ == '__main__':
    init_migrations()