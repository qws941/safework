"""
API Integration Tests for SafeWork
=================================

Tests all REST API endpoints, authentication, data validation,
and API response formats.
"""

import pytest
import requests
import json
from datetime import datetime, timezone, timedelta

# KST timezone
KST = timezone(timedelta(hours=9))


@pytest.mark.api
class TestHealthEndpoints:
    """Test health check and monitoring endpoints"""
    
    def test_health_check_endpoint(self, http_session, base_url):
        """Test main health check endpoint"""
        response = http_session.get(f"{base_url}/health")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        assert 'status' in data
        assert 'service' in data
        assert 'timestamp' in data
        assert 'environment' in data
        assert 'services' in data
        
        # Verify service is SafeWork
        assert data['service'] == 'safework'
        
        # Verify services status
        services = data['services']
        assert 'database' in services
        assert 'redis' in services
        
        # Status should be healthy or degraded (not error)
        assert data['status'] in ['healthy', 'degraded']
    
    def test_health_check_response_time(self, http_session, base_url):
        """Test health check response time"""
        start_time = datetime.now()
        response = http_session.get(f"{base_url}/health")
        end_time = datetime.now()
        
        response_time = (end_time - start_time).total_seconds()
        
        assert response.status_code == 200
        assert response_time < 5.0  # Should respond within 5 seconds
    
    def test_health_check_headers(self, http_session, base_url):
        """Test health check response headers"""
        response = http_session.get(f"{base_url}/health")
        
        assert response.status_code == 200
        assert response.headers.get('Content-Type') == 'application/json'


@pytest.mark.api
class TestAuthenticationEndpoints:
    """Test authentication and authorization"""
    
    def test_login_endpoint_get(self, http_session, base_url):
        """Test login page accessibility"""
        response = http_session.get(f"{base_url}/auth/login")
        
        # Should return login form or redirect
        assert response.status_code in [200, 302]
    
    def test_login_with_valid_credentials(self, http_session, base_url, admin_credentials):
        """Test login with valid admin credentials"""
        login_data = {
            'username': admin_credentials['username'],
            'password': admin_credentials['password']
        }
        
        response = http_session.post(
            f"{base_url}/auth/login",
            data=login_data,
            allow_redirects=False
        )
        
        # Should redirect on successful login
        assert response.status_code in [200, 302]
    
    def test_login_with_invalid_credentials(self, http_session, base_url):
        """Test login with invalid credentials"""
        login_data = {
            'username': 'invalid_user',
            'password': 'invalid_password'
        }
        
        response = http_session.post(
            f"{base_url}/auth/login",
            data=login_data,
            allow_redirects=False
        )
        
        # Should not redirect or return error
        assert response.status_code in [200, 400, 401, 403]
    
    def test_protected_endpoint_without_auth(self, http_session, base_url):
        """Test accessing protected endpoint without authentication"""
        # Try to access admin panel
        response = http_session.get(f"{base_url}/admin")
        
        # Should redirect to login or return unauthorized
        assert response.status_code in [302, 401, 403]
    
    def test_logout_endpoint(self, authenticated_session, base_url):
        """Test logout functionality"""
        response = authenticated_session.get(f"{base_url}/auth/logout")
        
        # Should redirect after logout
        assert response.status_code in [200, 302]


@pytest.mark.api
class TestSurveyEndpoints:
    """Test survey-related API endpoints"""
    
    def test_survey_form_001_accessibility(self, http_session, base_url):
        """Test musculoskeletal survey form accessibility"""
        response = http_session.get(f"{base_url}/survey/001_musculoskeletal_symptom_survey")
        
        assert response.status_code == 200
        assert 'text/html' in response.headers.get('Content-Type', '')
    
    def test_survey_form_002_accessibility(self, http_session, base_url):
        """Test workplace environment survey form accessibility"""
        response = http_session.get(f"{base_url}/survey/002_workplace_environment_survey")
        
        assert response.status_code == 200
        assert 'text/html' in response.headers.get('Content-Type', '')
    
    def test_survey_submission(self, http_session, base_url, sample_survey_data):
        """Test survey submission endpoint"""
        # Submit survey data
        response = http_session.post(
            f"{base_url}/api/survey/submit",
            json=sample_survey_data
        )
        
        # Should accept submission
        assert response.status_code in [200, 201, 302]
    
    def test_survey_list_endpoint(self, authenticated_session, base_url):
        """Test survey list API for admin"""
        response = authenticated_session.get(f"{base_url}/api/surveys")
        
        # Should return survey list or redirect to auth
        assert response.status_code in [200, 302, 401]
    
    def test_survey_statistics_endpoint(self, authenticated_session, base_url):
        """Test survey statistics API"""
        response = authenticated_session.get(f"{base_url}/api/surveys/statistics")
        
        # Should return statistics or redirect to auth
        assert response.status_code in [200, 302, 401]


@pytest.mark.api
class TestAdminEndpoints:
    """Test admin panel API endpoints"""
    
    def test_admin_dashboard_access(self, authenticated_session, base_url):
        """Test admin dashboard accessibility"""
        response = authenticated_session.get(f"{base_url}/admin")
        
        # Should redirect to admin panel or show dashboard
        assert response.status_code in [200, 302]
    
    def test_admin_safework_panel(self, authenticated_session, base_url):
        """Test SafeWork admin panel"""
        response = authenticated_session.get(f"{base_url}/admin/safework")
        
        assert response.status_code in [200, 302]
    
    def test_worker_management_api(self, authenticated_session, base_url):
        """Test worker management API endpoints"""
        # Test worker list
        response = authenticated_session.get(f"{base_url}/api/safework/workers")
        
        assert response.status_code in [200, 302, 401]
    
    def test_department_management_api(self, authenticated_session, base_url):
        """Test department management API"""
        response = authenticated_session.get(f"{base_url}/api/safework/departments")
        
        assert response.status_code in [200, 302, 401]


@pytest.mark.api
class TestSafeWorkAPIv2:
    """Test SafeWork API v2 endpoints"""
    
    def test_dashboard_overview_api(self, authenticated_session, base_url):
        """Test dashboard overview API"""
        response = authenticated_session.get(f"{base_url}/api/safework/dashboard/overview")
        
        if response.status_code == 200:
            data = response.json()
            # Verify response structure
            assert isinstance(data, dict)
        else:
            assert response.status_code in [302, 401]  # Redirect or unauthorized
    
    def test_health_check_plans_api(self, authenticated_session, base_url):
        """Test health check plans API"""
        response = authenticated_session.get(f"{base_url}/api/safework/health-check-plans")
        
        assert response.status_code in [200, 302, 401]
    
    def test_environment_measurements_api(self, authenticated_session, base_url):
        """Test environment measurements API"""
        response = authenticated_session.get(f"{base_url}/api/safework/environment-measurements")
        
        assert response.status_code in [200, 302, 401]


@pytest.mark.api
class TestAPIErrorHandling:
    """Test API error handling and edge cases"""
    
    def test_invalid_endpoint(self, http_session, base_url):
        """Test accessing non-existent endpoint"""
        response = http_session.get(f"{base_url}/invalid/endpoint")
        
        assert response.status_code == 404
    
    def test_malformed_json_request(self, http_session, base_url):
        """Test sending malformed JSON"""
        response = http_session.post(
            f"{base_url}/api/survey/submit",
            data="invalid json data",
            headers={'Content-Type': 'application/json'}
        )
        
        assert response.status_code in [400, 422, 500]
    
    def test_large_request_payload(self, http_session, base_url):
        """Test handling large request payload"""
        large_data = {'data': 'x' * 1000000}  # 1MB of data
        
        response = http_session.post(
            f"{base_url}/api/survey/submit",
            json=large_data
        )
        
        # Should handle gracefully (reject or accept)
        assert response.status_code in [200, 201, 400, 413, 422]
    
    def test_request_timeout_handling(self, base_url):
        """Test request timeout handling"""
        try:
            response = requests.get(f"{base_url}/health", timeout=0.001)
            # If it somehow responds in 1ms, that's fine
            assert response.status_code == 200
        except requests.Timeout:
            # Expected behavior
            pass
        except requests.RequestException:
            # Other connection errors are acceptable
            pass


@pytest.mark.api
@pytest.mark.slow
class TestAPIPerformance:
    """Test API performance characteristics"""
    
    def test_concurrent_health_checks(self, base_url):
        """Test concurrent requests to health endpoint"""
        import concurrent.futures
        import time
        
        def make_request():
            start = time.time()
            response = requests.get(f"{base_url}/health", timeout=10)
            end = time.time()
            return response.status_code, end - start
        
        # Make 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [future.result() for future in futures]
        
        # All should succeed
        for status_code, response_time in results:
            assert status_code == 200
            assert response_time < 10.0  # Should respond within 10 seconds
    
    def test_api_response_consistency(self, http_session, base_url):
        """Test API response consistency across multiple calls"""
        responses = []
        
        for _ in range(5):
            response = http_session.get(f"{base_url}/health")
            assert response.status_code == 200
            data = response.json()
            responses.append(data)
        
        # Verify consistent structure
        first_response = responses[0]
        for response in responses[1:]:
            assert set(response.keys()) == set(first_response.keys())
            assert response['service'] == first_response['service']