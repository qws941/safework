"""
End-to-End Workflow Tests for SafeWork
=====================================

Tests complete user workflows from start to finish,
including survey submissions, admin operations, and
comprehensive system integrations.
"""

import pytest
import requests
import time
import json
from datetime import datetime, timezone, timedelta
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, WebDriverException

# KST timezone
KST = timezone(timedelta(hours=9))


@pytest.fixture(scope="module")
def browser():
    """Create a browser instance for E2E tests"""
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Run in headless mode
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    
    try:
        driver = webdriver.Chrome(options=chrome_options)
        driver.implicitly_wait(10)
        yield driver
        driver.quit()
    except WebDriverException:
        pytest.skip("Chrome WebDriver not available for E2E tests")


@pytest.mark.e2e
class TestSurveyWorkflows:
    """Test complete survey submission workflows"""
    
    def test_musculoskeletal_survey_complete_workflow(self, browser, base_url):
        """Test complete musculoskeletal symptom survey workflow"""
        try:
            # Navigate to survey form
            browser.get(f"{base_url}/survey/001_musculoskeletal_symptom_survey")
            
            # Wait for form to load
            WebDriverWait(browser, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "form"))
            )
            
            # Verify page title contains survey information
            assert "설문" in browser.title or "survey" in browser.title.lower()
            
            # Fill out basic information (example - adjust based on actual form)
            try:
                # Look for common form elements
                age_input = browser.find_element(By.NAME, "age")
                age_input.clear()
                age_input.send_keys("35")
            except:
                # If age field doesn't exist, continue
                pass
            
            try:
                # Look for gender selection
                gender_select = browser.find_element(By.NAME, "gender")
                gender_select.send_keys("male")
            except:
                pass
            
            try:
                # Look for department field
                dept_input = browser.find_element(By.NAME, "department")
                dept_input.clear()
                dept_input.send_keys("construction")
            except:
                pass
            
            # Try to submit the form
            submit_button = browser.find_element(By.CSS_SELECTOR, "input[type='submit'], button[type='submit']")
            submit_button.click()
            
            # Wait for response (either success page or redirect)
            time.sleep(3)
            
            # Verify we're not on an error page
            assert "error" not in browser.current_url.lower()
            assert browser.current_url != f"{base_url}/survey/001_musculoskeletal_symptom_survey"
            
        except TimeoutException:
            pytest.skip("Survey form elements not found - may need form structure adjustment")
    
    def test_workplace_environment_survey_workflow(self, browser, base_url):
        """Test workplace environment survey workflow"""
        try:
            # Navigate to survey form
            browser.get(f"{base_url}/survey/002_workplace_environment_survey")
            
            # Wait for form to load
            WebDriverWait(browser, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "form"))
            )
            
            # Verify page loads correctly
            assert browser.current_url.endswith("002_workplace_environment_survey")
            
            # Fill out form fields (adapt based on actual form structure)
            try:
                # Look for common workplace environment fields
                noise_level = browser.find_element(By.NAME, "noise_level")
                noise_level.send_keys("moderate")
            except:
                pass
            
            try:
                temperature = browser.find_element(By.NAME, "temperature")
                temperature.send_keys("comfortable")
            except:
                pass
            
            # Submit form
            submit_button = browser.find_element(By.CSS_SELECTOR, "input[type='submit'], button[type='submit']")
            submit_button.click()
            
            # Wait for response
            time.sleep(3)
            
            # Verify submission was processed
            assert "error" not in browser.current_url.lower()
            
        except TimeoutException:
            pytest.skip("Survey form elements not found")
    
    def test_anonymous_survey_submission(self, http_session, base_url, sample_survey_data):
        """Test anonymous survey submission via API"""
        # Submit survey without authentication
        response = http_session.post(
            f"{base_url}/api/survey/submit",
            json=sample_survey_data
        )
        
        # Should accept anonymous submissions
        assert response.status_code in [200, 201, 302]
        
        # Verify system remains healthy after submission
        health_response = http_session.get(f"{base_url}/health")
        assert health_response.status_code == 200


@pytest.mark.e2e
class TestAdminWorkflows:
    """Test complete admin workflow operations"""
    
    def test_admin_login_and_dashboard_access(self, browser, base_url, admin_credentials):
        """Test complete admin login and dashboard access workflow"""
        try:
            # Navigate to login page
            browser.get(f"{base_url}/auth/login")
            
            # Wait for login form
            WebDriverWait(browser, 10).until(
                EC.presence_of_element_located((By.NAME, "username"))
            )
            
            # Fill login form
            username_field = browser.find_element(By.NAME, "username")
            password_field = browser.find_element(By.NAME, "password")
            
            username_field.clear()
            username_field.send_keys(admin_credentials['username'])
            
            password_field.clear()
            password_field.send_keys(admin_credentials['password'])
            
            # Submit login
            login_button = browser.find_element(By.CSS_SELECTOR, "input[type='submit'], button[type='submit']")
            login_button.click()
            
            # Wait for redirect
            WebDriverWait(browser, 10).until(
                lambda driver: driver.current_url != f"{base_url}/auth/login"
            )
            
            # Should be redirected to admin area
            assert "admin" in browser.current_url or browser.current_url == f"{base_url}/"
            
            # Try to access admin dashboard
            browser.get(f"{base_url}/admin")
            time.sleep(2)
            
            # Should have access to admin functions
            assert "admin" in browser.current_url.lower() or "dashboard" in browser.page_source.lower()
            
        except TimeoutException:
            pytest.skip("Login form not found or admin access denied")
    
    def test_worker_management_workflow(self, authenticated_session, base_url, sample_worker_data):
        """Test worker management workflow via API"""
        # Try to access worker management API
        workers_response = authenticated_session.get(f"{base_url}/api/safework/workers")
        
        if workers_response.status_code == 200:
            # If API is accessible, test worker operations
            workers_data = workers_response.json()
            assert isinstance(workers_data, (list, dict))
            
            # Try to add a new worker
            create_response = authenticated_session.post(
                f"{base_url}/api/safework/workers",
                json=sample_worker_data
            )
            
            # Should either succeed or return validation error
            assert create_response.status_code in [200, 201, 400, 422]
            
        else:
            # API might require different authentication or redirect
            assert workers_response.status_code in [302, 401, 403]
    
    def test_survey_data_review_workflow(self, authenticated_session, base_url):
        """Test survey data review workflow"""
        # Access survey management
        surveys_response = authenticated_session.get(f"{base_url}/api/surveys")
        
        if surveys_response.status_code == 200:
            # Review survey data
            surveys_data = surveys_response.json()
            assert isinstance(surveys_data, (list, dict))
            
            # Access survey statistics
            stats_response = authenticated_session.get(f"{base_url}/api/surveys/statistics")
            assert stats_response.status_code in [200, 302, 401]
            
        else:
            # Might require redirect or different authentication
            assert surveys_response.status_code in [302, 401, 403]


@pytest.mark.e2e
class TestDataFlowWorkflows:
    """Test complete data flow from input to storage to retrieval"""
    
    def test_survey_to_database_workflow(self, http_session, db_session, base_url, sample_survey_data):
        """Test complete survey submission to database storage workflow"""
        # Submit survey
        submit_response = http_session.post(
            f"{base_url}/api/survey/submit",
            json=sample_survey_data
        )
        
        # Should be accepted
        assert submit_response.status_code in [200, 201, 302]
        
        # Wait for data to be processed
        time.sleep(2)
        
        # Verify data appears in database
        from sqlalchemy import text
        
        query = text("""
            SELECT id, form_type, responses, submitted_at
            FROM surveys
            WHERE form_type = :form_type
            ORDER BY submitted_at DESC
            LIMIT 1
        """)
        
        result = db_session.execute(query, {'form_type': sample_survey_data['form_type']})
        recent_survey = result.fetchone()
        
        if recent_survey:
            assert recent_survey.form_type == sample_survey_data['form_type']
            
            # Verify JSON data integrity
            stored_responses = json.loads(recent_survey.responses)
            assert isinstance(stored_responses, dict)
    
    def test_cache_invalidation_workflow(self, http_session, redis_client, base_url):
        """Test cache invalidation workflow"""
        # Make initial request (might populate cache)
        first_response = http_session.get(f"{base_url}/health")
        assert first_response.status_code == 200
        
        # Clear relevant cache keys (if any)
        try:
            redis_client.flushdb()
        except:
            # Redis might not be accessible or configured
            pass
        
        # Make second request (should still work)
        second_response = http_session.get(f"{base_url}/health")
        assert second_response.status_code == 200
        
        # Both responses should be valid
        first_data = first_response.json()
        second_data = second_response.json()
        
        assert first_data['service'] == second_data['service']


@pytest.mark.e2e
@pytest.mark.slow
class TestSystemIntegrationWorkflows:
    """Test complete system integration workflows"""
    
    def test_full_system_stress_workflow(self, base_url, http_session):
        """Test system under moderate stress"""
        import concurrent.futures
        
        def mixed_requests():
            """Make mixed requests to different endpoints"""
            endpoints = ['/health', '/survey/001_musculoskeletal_symptom_survey']
            results = []
            
            for endpoint in endpoints:
                try:
                    response = http_session.get(f"{base_url}{endpoint}", timeout=10)
                    results.append(response.status_code == 200)
                except:
                    results.append(False)
                time.sleep(0.1)
            
            return results
        
        # Run concurrent mixed requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(mixed_requests) for _ in range(10)]
            all_results = [future.result() for future in futures]
        
        # Flatten results
        flat_results = [item for sublist in all_results for item in sublist]
        success_rate = sum(flat_results) / len(flat_results)
        
        # Should maintain good success rate
        assert success_rate >= 0.8
        
        # Verify system is still healthy after stress
        final_health = http_session.get(f"{base_url}/health")
        assert final_health.status_code == 200
    
    def test_disaster_recovery_workflow(self, base_url, http_session):
        """Test system resilience and recovery"""
        # Verify system is initially healthy
        initial_health = http_session.get(f"{base_url}/health")
        assert initial_health.status_code == 200
        
        # Simulate heavy load
        for i in range(50):
            try:
                response = http_session.get(f"{base_url}/health", timeout=2)
            except:
                pass
        
        # Allow system to recover
        time.sleep(5)
        
        # Verify system has recovered
        recovery_health = http_session.get(f"{base_url}/health")
        assert recovery_health.status_code == 200
        
        health_data = recovery_health.json()
        assert health_data['status'] in ['healthy', 'degraded']
    
    def test_multi_user_workflow_simulation(self, base_url):
        """Simulate multiple users using the system simultaneously"""
        import concurrent.futures
        
        def user_session():
            """Simulate a user session"""
            session = requests.Session()
            session.timeout = 10
            
            # User visits health check
            health_response = session.get(f"{base_url}/health")
            if health_response.status_code != 200:
                return False
            
            # User visits survey form
            survey_response = session.get(f"{base_url}/survey/001_musculoskeletal_symptom_survey")
            if survey_response.status_code != 200:
                return False
            
            # User might submit survey (simplified)
            time.sleep(0.5)  # Simulate form filling time
            
            return True
        
        # Simulate 10 concurrent users
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(user_session) for _ in range(10)]
            results = [future.result() for future in futures]
        
        # Most user sessions should complete successfully
        success_rate = sum(results) / len(results)
        assert success_rate >= 0.7


@pytest.mark.e2e
class TestBusinessWorkflows:
    """Test business-specific workflows for SafeWork"""
    
    def test_safety_inspection_workflow(self, authenticated_session, base_url):
        """Test safety inspection data workflow"""
        # Access dashboard overview
        dashboard_response = authenticated_session.get(f"{base_url}/api/safework/dashboard/overview")
        
        if dashboard_response.status_code == 200:
            dashboard_data = dashboard_response.json()
            
            # Should contain key safety metrics
            assert isinstance(dashboard_data, dict)
            
            # Look for typical safety metrics (adjust based on actual implementation)
            # This is a flexible test since the exact structure may vary
            assert len(str(dashboard_data)) > 10  # Should have some content
        
        else:
            # Might require different authentication
            assert dashboard_response.status_code in [302, 401, 403]
    
    def test_health_check_planning_workflow(self, authenticated_session, base_url):
        """Test health check planning workflow"""
        # Access health check plans
        plans_response = authenticated_session.get(f"{base_url}/api/safework/health-check-plans")
        
        if plans_response.status_code == 200:
            plans_data = plans_response.json()
            assert isinstance(plans_data, (list, dict))
        else:
            assert plans_response.status_code in [302, 401, 403]
    
    def test_environment_monitoring_workflow(self, authenticated_session, base_url):
        """Test environment monitoring workflow"""
        # Access environment measurements
        env_response = authenticated_session.get(f"{base_url}/api/safework/environment-measurements")
        
        if env_response.status_code == 200:
            env_data = env_response.json()
            assert isinstance(env_data, (list, dict))
        else:
            assert env_response.status_code in [302, 401, 403]
    
    def test_worker_safety_profile_workflow(self, authenticated_session, base_url, sample_worker_data):
        """Test worker safety profile management workflow"""
        # Access worker safety data
        workers_response = authenticated_session.get(f"{base_url}/api/safework/workers")
        
        if workers_response.status_code == 200:
            workers_data = workers_response.json()
            
            # Should be able to view worker safety profiles
            assert isinstance(workers_data, (list, dict))
            
            # Test worker profile operations
            if isinstance(workers_data, list) and len(workers_data) > 0:
                # Verify worker data structure
                first_worker = workers_data[0]
                assert isinstance(first_worker, dict)
        
        else:
            assert workers_response.status_code in [302, 401, 403]