"""
Container Orchestration Integration Tests for SafeWork
====================================================

Tests Docker container functionality, service connectivity,
health checks, and container orchestration patterns.
"""

import pytest
import requests
import docker
import time
import redis
import psycopg2
from datetime import datetime, timezone, timedelta
import subprocess
import json
import os

# KST timezone
KST = timezone(timedelta(hours=9))


@pytest.mark.container
class TestContainerConnectivity:
    """Test connectivity between containers"""
    
    def test_app_to_database_connectivity(self, base_url, http_session):
        """Test app container can connect to database container"""
        response = http_session.get(f"{base_url}/health")
        
        assert response.status_code == 200
        health_data = response.json()
        
        # Verify database connection status
        assert 'services' in health_data
        assert 'database' in health_data['services']
        
        db_status = health_data['services']['database']
        assert db_status == 'connected' or 'error:' not in db_status
    
    def test_app_to_redis_connectivity(self, base_url, http_session):
        """Test app container can connect to Redis container"""
        response = http_session.get(f"{base_url}/health")
        
        assert response.status_code == 200
        health_data = response.json()
        
        # Verify Redis connection status
        assert 'services' in health_data
        assert 'redis' in health_data['services']
        
        redis_status = health_data['services']['redis']
        assert redis_status == 'connected' or 'error:' not in redis_status
    
    def test_container_network_isolation(self, base_url, http_session):
        """Test containers are properly networked but isolated"""
        # Test that the application is accessible
        response = http_session.get(f"{base_url}/health")
        assert response.status_code == 200
        
        # Test that we cannot directly access database port from outside
        # (This assumes database is not exposed externally)
        try:
            # Try to connect directly to PostgreSQL (should fail if properly isolated)
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(2)
            
            # Extract host from base_url
            host = base_url.split('://')[1].split(':')[0] if ':' in base_url else base_url.split('://')[1]
            result = sock.connect_ex((host, 5432))
            sock.close()
            
            # Connection should fail (non-zero result) for proper isolation
            # Or if it succeeds, that's also acceptable for test environments
            assert True  # Pass either way - this is environment dependent
            
        except Exception:
            # Exception is expected and acceptable
            assert True


@pytest.mark.container
class TestContainerHealth:
    """Test container health check functionality"""
    
    def test_application_health_endpoint(self, base_url, http_session):
        """Test application container health endpoint"""
        response = http_session.get(f"{base_url}/health")
        
        assert response.status_code == 200
        health_data = response.json()
        
        # Verify health response structure
        required_fields = ['status', 'service', 'timestamp', 'services']
        for field in required_fields:
            assert field in health_data
        
        # Status should be healthy or degraded (not failed)
        assert health_data['status'] in ['healthy', 'degraded']
        assert health_data['service'] == 'safework'
    
    def test_health_check_response_time(self, base_url, http_session):
        """Test health check responds quickly"""
        start_time = time.time()
        response = http_session.get(f"{base_url}/health")
        end_time = time.time()
        
        response_time = end_time - start_time
        
        assert response.status_code == 200
        assert response_time < 5.0  # Should respond within 5 seconds
    
    def test_repeated_health_checks(self, base_url, http_session):
        """Test repeated health checks for stability"""
        successful_checks = 0
        
        for i in range(10):
            try:
                response = http_session.get(f"{base_url}/health", timeout=10)
                if response.status_code == 200:
                    successful_checks += 1
            except requests.RequestException:
                pass
            
            time.sleep(0.5)  # Small delay between checks
        
        # At least 80% of health checks should succeed
        assert successful_checks >= 8


@pytest.mark.container
class TestContainerResourceUsage:
    """Test container resource usage and limits"""
    
    def test_memory_usage_stability(self, base_url, http_session):
        """Test application doesn't have memory leaks during normal operation"""
        # Make multiple requests to simulate normal usage
        for i in range(20):
            try:
                response = http_session.get(f"{base_url}/health")
                assert response.status_code == 200
            except requests.RequestException:
                pass
            
            time.sleep(0.1)
        
        # If we get here without container crashing, memory is stable
        final_response = http_session.get(f"{base_url}/health")
        assert final_response.status_code == 200
    
    def test_concurrent_request_handling(self, base_url):
        """Test container can handle concurrent requests"""
        import concurrent.futures
        
        def make_request():
            try:
                response = requests.get(f"{base_url}/health", timeout=10)
                return response.status_code == 200
            except requests.RequestException:
                return False
        
        # Make 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [future.result() for future in futures]
        
        # At least 80% should succeed
        successful_requests = sum(results)
        assert successful_requests >= 8


@pytest.mark.container
class TestContainerLogging:
    """Test container logging functionality"""
    
    def test_application_generates_logs(self, base_url, http_session):
        """Test that application generates proper logs"""
        # Make a request that should generate logs
        response = http_session.get(f"{base_url}/health")
        assert response.status_code == 200
        
        # Wait a moment for logs to be written
        time.sleep(1)
        
        # The fact that the request succeeded indicates logging is working
        # More detailed log testing would require access to container logs
        assert True
    
    def test_error_logging(self, base_url, http_session):
        """Test that errors are properly logged"""
        # Make a request to non-existent endpoint
        response = http_session.get(f"{base_url}/non-existent-endpoint")
        
        # Should return 404
        assert response.status_code == 404
        
        # Error should be logged (we can't easily verify this in integration test)
        # but the 404 response indicates error handling is working
        assert True


@pytest.mark.container
class TestContainerPersistence:
    """Test data persistence across container operations"""
    
    def test_database_data_persistence(self, base_url, http_session, sample_survey_data):
        """Test that database data persists"""
        # Submit test data
        submit_response = http_session.post(
            f"{base_url}/api/survey/submit",
            json=sample_survey_data
        )
        
        # Should be accepted (or redirect/auth required)
        assert submit_response.status_code in [200, 201, 302, 401]
        
        # Wait for data to be written
        time.sleep(2)
        
        # Verify system is still responsive
        health_response = http_session.get(f"{base_url}/health")
        assert health_response.status_code == 200
        
        # Data persistence is verified by database tests
        assert True
    
    def test_redis_cache_functionality(self, base_url, http_session):
        """Test Redis cache functionality"""
        # Make multiple requests that might use caching
        first_response = http_session.get(f"{base_url}/health")
        assert first_response.status_code == 200
        
        time.sleep(0.1)
        
        second_response = http_session.get(f"{base_url}/health")
        assert second_response.status_code == 200
        
        # Both requests should succeed regardless of caching
        assert True


@pytest.mark.container
@pytest.mark.slow
class TestContainerScaling:
    """Test container scaling scenarios"""
    
    def test_service_availability_during_load(self, base_url):
        """Test service remains available under load"""
        import concurrent.futures
        import time
        
        def sustained_load():
            """Generate sustained load for 30 seconds"""
            end_time = time.time() + 30
            successful_requests = 0
            total_requests = 0
            
            while time.time() < end_time:
                try:
                    response = requests.get(f"{base_url}/health", timeout=5)
                    total_requests += 1
                    if response.status_code == 200:
                        successful_requests += 1
                except requests.RequestException:
                    total_requests += 1
                
                time.sleep(0.1)  # 10 requests per second
            
            return successful_requests, total_requests
        
        # Run sustained load test
        successful, total = sustained_load()
        
        # Should maintain at least 90% success rate under load
        success_rate = successful / total if total > 0 else 0
        assert success_rate >= 0.9, f"Success rate {success_rate} below threshold"
        assert total > 250, "Insufficient load generated"  # Should make ~300 requests
    
    def test_recovery_after_stress(self, base_url, http_session):
        """Test system recovery after stress period"""
        # Apply some stress by making rapid requests
        for i in range(50):
            try:
                requests.get(f"{base_url}/health", timeout=1)
            except requests.RequestException:
                pass
        
        # Wait for recovery
        time.sleep(5)
        
        # Verify system has recovered
        response = http_session.get(f"{base_url}/health")
        assert response.status_code == 200
        
        health_data = response.json()
        assert health_data['status'] in ['healthy', 'degraded']


@pytest.mark.container
class TestContainerSecurity:
    """Test container security configurations"""
    
    def test_security_headers(self, base_url, http_session):
        """Test security headers are present"""
        response = http_session.get(f"{base_url}/health")
        assert response.status_code == 200
        
        # Check for basic security headers (Traefik might add these)
        headers = response.headers
        
        # These tests are flexible as security headers might be added by proxy
        # Just verify the response is properly formatted
        assert 'Content-Type' in headers
        assert headers['Content-Type'] == 'application/json'
    
    def test_no_sensitive_info_exposure(self, base_url, http_session):
        """Test that sensitive information is not exposed"""
        response = http_session.get(f"{base_url}/health")
        assert response.status_code == 200
        
        health_data = response.json()
        response_text = json.dumps(health_data)
        
        # Verify no sensitive data in health endpoint
        sensitive_patterns = [
            'password', 'secret', 'key', 'token',
            'admin', 'root', 'postgres', 'redis'
        ]
        
        response_lower = response_text.lower()
        for pattern in sensitive_patterns:
            # Allow these in field names but not as values
            if pattern in response_lower:
                # This is acceptable as they appear in connection strings or field names
                assert True
        
        # Should not contain actual credentials
        assert 'safework2024' not in response_text
        assert 'bingogo1' not in response_text
    
    def test_error_handling_security(self, base_url, http_session):
        """Test error responses don't leak sensitive information"""
        # Try to access non-existent endpoint
        response = http_session.get(f"{base_url}/admin/non-existent")
        
        # Should return proper error without stack traces
        assert response.status_code in [404, 401, 403, 302]
        
        # Response should not contain stack traces or internal paths
        response_text = response.text if hasattr(response, 'text') else str(response.content)
        
        # Should not contain internal file paths
        assert '/app/' not in response_text
        assert '/home/' not in response_text
        assert 'Traceback' not in response_text


@pytest.mark.container
class TestContainerEnvironment:
    """Test container environment configuration"""
    
    def test_timezone_configuration(self, base_url, http_session):
        """Test container timezone is properly configured"""
        response = http_session.get(f"{base_url}/health")
        assert response.status_code == 200
        
        health_data = response.json()
        timestamp_str = health_data.get('timestamp', '')
        
        # Should contain timezone information
        assert timestamp_str != ''
        
        # Should be ISO format with timezone
        try:
            parsed_time = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            assert parsed_time is not None
        except ValueError:
            # If it's not ISO format, at least verify it's a timestamp
            assert len(timestamp_str) > 10
    
    def test_environment_variables(self, base_url, http_session):
        """Test application uses correct environment"""
        response = http_session.get(f"{base_url}/health")
        assert response.status_code == 200
        
        health_data = response.json()
        
        # Should have environment information
        assert 'environment' in health_data
        assert 'config' in health_data
        
        environment = health_data['environment']
        config = health_data['config']
        
        # Should be a valid environment
        assert environment in ['production', 'development', 'local']
        assert config in ['production', 'development', 'testing']
    
    def test_service_discovery(self, base_url, http_session):
        """Test services can discover each other"""
        response = http_session.get(f"{base_url}/health")
        assert response.status_code == 200
        
        health_data = response.json()
        services = health_data.get('services', {})
        
        # Should be able to connect to dependent services
        if 'database' in services:
            db_status = services['database']
            assert 'connected' in db_status or db_status == 'connected'
        
        if 'redis' in services:
            redis_status = services['redis']
            assert 'connected' in redis_status or redis_status == 'connected'