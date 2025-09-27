"""
pytest configuration and fixtures for SafeWork integration tests
"""

import pytest
import requests
import time
import redis
import psycopg2
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from flask import Flask
from datetime import datetime, timezone, timedelta
import json
import os

# Test configuration
BASE_URL = os.environ.get('TEST_BASE_URL', 'http://localhost:4545')
DB_URL = os.environ.get('TEST_DB_URL', 'postgresql://safework:safework2024@localhost:5432/safework_test')
REDIS_URL = os.environ.get('TEST_REDIS_URL', 'redis://localhost:6379/1')
ADMIN_USERNAME = os.environ.get('TEST_ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', 'safework2024')

# KST timezone
KST = timezone(timedelta(hours=9))


@pytest.fixture(scope="session")
def base_url():
    """Base URL for SafeWork application"""
    return BASE_URL


@pytest.fixture(scope="session")
def admin_credentials():
    """Admin credentials for authentication tests"""
    return {
        'username': ADMIN_USERNAME,
        'password': ADMIN_PASSWORD
    }


@pytest.fixture(scope="session")
def http_session():
    """HTTP session with custom configuration"""
    session = requests.Session()
    session.timeout = 30
    session.headers.update({
        'User-Agent': 'SafeWork-Integration-Tests/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    })
    return session


@pytest.fixture(scope="session")
def authenticated_session(http_session, base_url, admin_credentials):
    """Authenticated HTTP session for protected endpoints"""
    # Login and get session cookie
    login_data = {
        'username': admin_credentials['username'],
        'password': admin_credentials['password']
    }
    
    # Try to login
    login_response = http_session.post(
        f"{base_url}/auth/login",
        data=login_data,
        allow_redirects=False
    )
    
    if login_response.status_code in [200, 302]:
        return http_session
    else:
        pytest.skip(f"Authentication failed: {login_response.status_code}")


@pytest.fixture(scope="session")
def db_engine():
    """Database engine for direct database operations"""
    try:
        engine = create_engine(DB_URL)
        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return engine
    except Exception as e:
        pytest.skip(f"Database connection failed: {e}")


@pytest.fixture(scope="session")
def db_session(db_engine):
    """Database session for queries"""
    Session = sessionmaker(bind=db_engine)
    session = Session()
    yield session
    session.close()


@pytest.fixture(scope="session")
def redis_client():
    """Redis client for cache testing"""
    try:
        client = redis.from_url(REDIS_URL, decode_responses=True)
        client.ping()
        return client
    except Exception as e:
        pytest.skip(f"Redis connection failed: {e}")


@pytest.fixture
def sample_survey_data():
    """Sample survey data for testing"""
    return {
        'form_type': '001_musculoskeletal_symptom_survey',
        'user_id': 1,  # Anonymous user
        'responses': {
            'basic_info': {
                'age': 35,
                'gender': 'male',
                'department': 'construction',
                'work_years': 10
            },
            'symptoms': {
                'back_pain': True,
                'neck_pain': False,
                'shoulder_pain': True,
                'frequency': 'sometimes'
            }
        },
        'submitted_at': datetime.now(KST).isoformat()
    }


@pytest.fixture
def sample_worker_data():
    """Sample worker data for testing"""
    return {
        'employee_id': 'TEST001',
        'name': 'Test Worker',
        'department_id': 1,
        'position': 'Safety Officer',
        'hire_date': '2024-01-01',
        'status': 'ACTIVE',
        'birth_date': '1990-01-01',
        'gender': 'MALE',
        'contact_phone': '010-1234-5678',
        'email': 'test@example.com'
    }


@pytest.fixture(autouse=True)
def cleanup_test_data(db_session):
    """Clean up test data after each test"""
    yield
    
    # Clean up test records created during tests
    try:
        # Delete test surveys
        db_session.execute(text("""
            DELETE FROM surveys 
            WHERE form_type LIKE '%test%' 
            OR responses::text LIKE '%Test Worker%'
        """))
        
        # Delete test workers
        db_session.execute(text("""
            DELETE FROM workers 
            WHERE employee_id LIKE 'TEST%'
        """))
        
        db_session.commit()
    except Exception as e:
        db_session.rollback()
        print(f"Cleanup warning: {e}")


@pytest.fixture
def wait_for_service():
    """Utility function to wait for service availability"""
    def _wait_for_service(url, timeout=30, interval=1):
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    return True
            except requests.RequestException:
                pass
            time.sleep(interval)
        return False
    return _wait_for_service


@pytest.fixture(scope="session", autouse=True)
def ensure_services_running(wait_for_service):
    """Ensure all required services are running before tests"""
    services = [
        f"{BASE_URL}/health",
    ]
    
    for service_url in services:
        if not wait_for_service(service_url, timeout=60):
            pytest.exit(f"Service not available: {service_url}")


def pytest_configure(config):
    """pytest configuration"""
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "api: marks tests as API tests"
    )
    config.addinivalue_line(
        "markers", "database: marks tests as database tests"
    )
    config.addinivalue_line(
        "markers", "container: marks tests as container tests"
    )
    config.addinivalue_line(
        "markers", "e2e: marks tests as end-to-end tests"
    )
    config.addinivalue_line(
        "markers", "slow: marks tests as slow running"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection"""
    # Add integration marker to all tests
    for item in items:
        item.add_marker(pytest.mark.integration)