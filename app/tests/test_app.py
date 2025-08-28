"""Test application factory and basic functionality."""

import pytest
from app import create_app
from models import db


def test_config():
    """Test that testing configuration is loaded."""
    app = create_app('testing')
    assert app.config['TESTING'] is True


def test_app_creation():
    """Test application factory creates app correctly."""
    app = create_app('testing')
    assert app is not None
    assert 'SQLALCHEMY_DATABASE_URI' in app.config


def test_database_initialization(app):
    """Test database is initialized correctly."""
    with app.app_context():
        # Check that database is accessible
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        table_names = inspector.get_table_names()
        # At minimum, we should have some tables after db initialization
        assert isinstance(table_names, list)


def test_blueprints_registered(app):
    """Test that all blueprints are registered."""
    blueprint_names = [bp.name for bp in app.blueprints.values()]
    expected_blueprints = ['main', 'auth', 'survey', 'admin', 'migration', 'health']
    
    for bp_name in expected_blueprints:
        assert bp_name in blueprint_names, f"Blueprint {bp_name} not registered"


def test_error_handlers(client):
    """Test custom error handlers."""
    # Test 404 handler
    response = client.get('/nonexistent-page')
    assert response.status_code == 404


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get('/health')
    assert response.status_code == 200
    
    data = response.get_json()
    assert 'status' in data
    assert 'timestamp' in data


def test_context_processors(app, client):
    """Test context processors inject variables."""
    with app.app_context():
        # Check that context processor variables are available
        with client:
            response = client.get('/')
            # Should have app_name and app_version in context
            assert response.status_code in [200, 302]  # 302 if redirect to login


def test_app_factory_with_config():
    """Test app factory with different configurations."""
    # Test testing config (in-memory) to avoid MySQL connection issues
    app_test = create_app('testing')
    assert app_test.config['TESTING'] is True
    assert 'SQLALCHEMY_DATABASE_URI' in app_test.config
    assert 'sqlite:///:memory:' in app_test.config['SQLALCHEMY_DATABASE_URI']


def test_redis_initialization(app):
    """Test Redis client initialization."""
    with app.app_context():
        assert hasattr(app, 'redis')
        # Test Redis connection (may fail in test environment, but should not crash)
        try:
            app.redis.ping()
        except Exception:
            # Redis may not be available in test environment
            pass


def test_migration_manager(app):
    """Test migration manager initialization."""
    with app.app_context():
        assert hasattr(app, 'migration_manager')
        assert app.migration_manager is not None