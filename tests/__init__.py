"""
SafeWork Integration Test Suite
==============================

Comprehensive testing framework for SafeWork industrial safety management system.
Covers API, database, container orchestration, and end-to-end workflows.

Test Categories:
- API Integration Tests: REST endpoints, authentication, data validation
- Database Integration Tests: CRUD operations, transactions, migrations
- Container Orchestration Tests: Service connectivity, health checks
- End-to-End Tests: Complete user workflows, survey submissions
- Performance Tests: Load testing, response times, concurrent users
"""

import os
import sys
import pytest
import logging
from pathlib import Path

# Add app directory to Python path for imports
project_root = Path(__file__).parent.parent
app_path = project_root / 'app'
sys.path.insert(0, str(app_path))

# Configure test logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Test configuration
TEST_CONFIG = {
    'BASE_URL': os.environ.get('TEST_BASE_URL', 'http://localhost:4545'),
    'DB_URL': os.environ.get('TEST_DB_URL', 'postgresql://safework:safework2024@localhost:5432/safework_test'),
    'REDIS_URL': os.environ.get('TEST_REDIS_URL', 'redis://localhost:6379/1'),
    'ADMIN_USERNAME': os.environ.get('TEST_ADMIN_USERNAME', 'admin'),
    'ADMIN_PASSWORD': os.environ.get('TEST_ADMIN_PASSWORD', 'safework2024'),
    'TIMEOUT': int(os.environ.get('TEST_TIMEOUT', '30')),
    'MAX_RETRIES': int(os.environ.get('TEST_MAX_RETRIES', '3')),
}

__version__ = '1.0.0'
__author__ = 'SafeWork Team'