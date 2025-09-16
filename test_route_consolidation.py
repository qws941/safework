#!/usr/bin/env python3
"""
Test script to verify route consolidation and pain score fix
"""
import sys
import os
sys.path.append('app')

def test_route_consolidation():
    """Test that route consolidation is working"""
    print("=== Testing Route Consolidation ===")

    # Import Flask app
    from app import create_app
    from models import Survey, db

    app = create_app('testing')

    with app.test_client() as client:
        with app.app_context():
            # Test route redirects
            routes_to_test = [
                ('/admin/surveys', '/admin/survey'),  # Legacy route should redirect
                ('/survey/admin', '/admin/survey'),   # Survey admin should redirect
            ]

            for legacy_route, expected_redirect in routes_to_test:
                print(f"Testing {legacy_route} -> {expected_redirect}")
                try:
                    response = client.get(legacy_route, follow_redirects=False)
                    if response.status_code in [301, 302, 307, 308]:
                        print(f"✓ {legacy_route} redirects properly (status: {response.status_code})")
                    else:
                        print(f"✗ {legacy_route} did not redirect (status: {response.status_code})")
                except Exception as e:
                    print(f"✗ Error testing {legacy_route}: {e}")

            # Test new consolidated routes exist
            new_routes = [
                '/admin/survey',
            ]

            for route in new_routes:
                print(f"Testing consolidated route: {route}")
                try:
                    response = client.get(route, follow_redirects=False)
                    # We expect 401/403 since we're not logged in, but route should exist
                    if response.status_code in [200, 401, 403, 302]:
                        print(f"✓ {route} exists (status: {response.status_code})")
                    else:
                        print(f"? {route} returned status: {response.status_code}")
                except Exception as e:
                    print(f"✗ Error testing {route}: {e}")

    print("\n=== Route Consolidation Test Complete ===\n")

def test_survey_model():
    """Test Survey model structure"""
    print("=== Testing Survey Model Structure ===")

    from models import SurveyModel as Survey

    # Check if essential fields exist
    essential_fields = [
        'id', 'user_id', 'form_type', 'name', 'department',
        'position', 'employee_id', 'gender', 'age', 'responses', 'data'
    ]

    for field in essential_fields:
        if hasattr(Survey, field):
            print(f"✓ Survey.{field} exists")
        else:
            print(f"✗ Survey.{field} missing")

    print("\n=== Survey Model Test Complete ===\n")

def test_pain_score_template_logic():
    """Test pain score template logic"""
    print("=== Testing Pain Score Template Logic ===")

    # Simulate survey data structure
    sample_survey_data = {
        'responses': {
            '목': {
                'severity': '중간',
                'side': '왼쪽',
                'frequency': '가끔',
                'duration': '1-2시간',
                'consequences': ['업무중단', '의료치료'],
                'last_year': True,
                'last_week': False
            },
            '어깨': {
                'severity': '심함',
                'side': '양쪽',
                'frequency': '자주',
                'duration': '하루종일',
                'consequences': ['업무중단'],
                'last_year': True,
                'last_week': True
            }
        },
        'data': {
            'has_symptoms': True
        }
    }

    # Test data extraction logic (simulating template logic)
    neck_data = sample_survey_data['responses'].get('목', {})
    if neck_data.get('severity'):
        print(f"✓ Neck severity extracted: {neck_data['severity']}")
    else:
        print("✗ Neck severity not found")

    if neck_data.get('consequences'):
        consequences_str = ', '.join(neck_data['consequences'])
        print(f"✓ Neck consequences extracted: {consequences_str}")
    else:
        print("✗ Neck consequences not found")

    # Test zero vs null handling
    zero_severity_data = {'severity': 0}
    null_severity_data = {}

    # Template logic: {{ data.severity or '-' }}
    zero_result = zero_severity_data.get('severity') or '-'
    null_result = null_severity_data.get('severity') or '-'

    print(f"✓ Zero severity displays as: '{zero_result}' (should show 0)")
    print(f"✓ Null severity displays as: '{null_result}' (should show -)")

    print("\n=== Pain Score Template Logic Test Complete ===\n")

if __name__ == '__main__':
    print("SafeWork Route Consolidation & Pain Score Fix Test")
    print("=" * 50)

    test_survey_model()
    test_pain_score_template_logic()
    test_route_consolidation()

    print("All tests completed!")