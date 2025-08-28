"""Test configuration and fixtures for SafeWork application."""

import pytest
import tempfile
import os
from app import create_app
from models import db, User


@pytest.fixture
def app():
    """Create application for testing."""
    # Set environment variables for testing before import
    import os
    os.environ['FLASK_ENV'] = 'testing'
    os.environ['MYSQL_HOST'] = 'localhost'
    os.environ['MYSQL_PORT'] = '3306'
    os.environ['MYSQL_USER'] = 'testuser'  
    os.environ['MYSQL_PASSWORD'] = 'test123'
    os.environ['MYSQL_DATABASE'] = 'safework_test'
    
    # Create temporary database file
    db_fd, db_path = tempfile.mkstemp()
    
    # Test configuration
    test_config = {
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path}',
        'SQLALCHEMY_TRACK_MODIFICATIONS': False,
        'WTF_CSRF_ENABLED': False,
        'SECRET_KEY': 'test-secret-key',
        'ADMIN_USERNAME': 'testadmin',
        'ADMIN_PASSWORD': 'testpass123',
        'REDIS_HOST': 'localhost',
        'REDIS_PORT': 6379,
        'REDIS_PASSWORD': '',
        'REDIS_DB': 1,  # Use different DB for testing
    }
    
    # Create app with test config - import here to avoid module-level app creation
    from app import create_app
    app = create_app('testing')
    app.config.update(test_config)
    
    with app.app_context():
        db.create_all()
        # Create test users
        admin_user = User(
            username='testadmin',
            email='admin@test.com',
            is_admin=True
        )
        admin_user.set_password('testpass123')
        
        regular_user = User(
            username='testuser',
            email='user@test.com',
            is_admin=False
        )
        regular_user.set_password('testpass123')
        
        db.session.add(admin_user)
        db.session.add(regular_user)
        db.session.commit()
        
        yield app
        
        db.session.remove()
        db.drop_all()
    
    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client(app):
    """Test client for making requests."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Test CLI runner."""
    return app.test_cli_runner()


@pytest.fixture
def admin_user(app):
    """Get admin user for testing."""
    with app.app_context():
        return User.query.filter_by(username='testadmin').first()


@pytest.fixture
def regular_user(app):
    """Get regular user for testing."""
    with app.app_context():
        return User.query.filter_by(username='testuser').first()


@pytest.fixture
def auth_headers(client, regular_user):
    """Get authentication headers for requests."""
    # Login user and get session
    response = client.post('/auth/login', data={
        'username': 'testuser',
        'password': 'testpass123'
    })
    return {'Content-Type': 'application/x-www-form-urlencoded'}


@pytest.fixture
def admin_headers(client, admin_user):
    """Get admin authentication headers."""
    response = client.post('/auth/login', data={
        'username': 'testadmin', 
        'password': 'testpass123'
    })
    return {'Content-Type': 'application/x-www-form-urlencoded'}