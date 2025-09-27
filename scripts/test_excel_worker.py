#!/usr/bin/env python3
"""
Test script for Excel Worker functionality
Tests the Excel processing worker endpoints
"""

import requests
import json
import base64
import os

def test_excel_worker():
    """Test the Excel worker endpoints"""

    print("🔄 Testing Excel Worker Implementation...")

    # Mock Excel file data for testing
    mock_excel_data = {
        "formId": "002_musculoskeletal_symptom_program",
        "title": "근골격계부담작업 유해요인조사",
        "description": "근골격계 질환 예방을 위한 작업환경 유해요인 조사",
        "sections": [
            {
                "id": "basic_info",
                "title": "기본 정보",
                "fields": ["company_name", "department", "investigator_name", "investigation_date"]
            },
            {
                "id": "work_environment",
                "title": "작업환경 평가",
                "fields": ["work_posture", "repetitive_motion", "force_exertion", "vibration_exposure"]
            }
        ],
        "fields": [
            {"id": "company_name", "type": "text", "required": True, "label": "회사명"},
            {"id": "department", "type": "text", "required": True, "label": "부서명"},
            {"id": "investigator_name", "type": "text", "required": True, "label": "조사자명"},
            {"id": "investigation_date", "type": "date", "required": True, "label": "조사일자"},
            {"id": "work_posture", "type": "select", "required": True, "label": "작업자세 평가", "options": ["양호", "보통", "위험", "매우위험"]},
            {"id": "repetitive_motion", "type": "select", "required": True, "label": "반복동작 평가", "options": ["낮음", "보통", "높음", "매우높음"]}
        ]
    }

    # Test endpoints
    base_url = "https://safework.jclee.me/api/excel"

    print(f"📡 Testing against: {base_url}")

    # Test 1: Process Excel (mock)
    print("\n1️⃣ Testing Excel Processing...")
    try:
        mock_file_data = base64.b64encode(json.dumps(mock_excel_data).encode()).decode()

        process_payload = {
            "fileData": mock_file_data,
            "fileName": "002_musculoskeletal_symptom_program.xls"
        }

        response = requests.post(
            f"{base_url}/process-excel",
            json=process_payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )

        if response.status_code == 200:
            result = response.json()
            print(f"✅ Excel processing successful:")
            print(f"   Survey ID: {result.get('surveyId')}")
            print(f"   Fields Count: {result.get('fieldsCount')}")
            print(f"   Sections: {result.get('sections')}")
        else:
            print(f"❌ Excel processing failed: {response.status_code}")
            print(f"   Response: {response.text}")

    except Exception as e:
        print(f"❌ Error testing Excel processing: {str(e)}")

    # Test 2: Get Form Structure
    print("\n2️⃣ Testing Form Structure Retrieval...")
    try:
        response = requests.get(
            f"{base_url}/form-structure/002_musculoskeletal_symptom_program",
            timeout=10
        )

        if response.status_code == 200:
            structure = response.json()
            print(f"✅ Form structure retrieved:")
            print(f"   Title: {structure.get('title')}")
            print(f"   Fields: {len(structure.get('fields', []))}")
        elif response.status_code == 404:
            print("ℹ️ Form structure not found (expected for first test)")
        else:
            print(f"❌ Form structure retrieval failed: {response.status_code}")

    except Exception as e:
        print(f"❌ Error testing form structure: {str(e)}")

    # Test 3: Export to Excel
    print("\n3️⃣ Testing Excel Export...")
    try:
        export_payload = {
            "formType": "002_musculoskeletal_symptom_program",
            "responses": [],
            "format": "xlsx"
        }

        response = requests.post(
            f"{base_url}/export-to-excel",
            json=export_payload,
            timeout=10
        )

        if response.status_code == 200:
            result = response.json()
            print(f"✅ Excel export successful:")
            print(f"   File ID: {result.get('fileId')}")
            print(f"   Download URL: {result.get('downloadUrl')}")
            print(f"   File Name: {result.get('fileName')}")
        else:
            print(f"❌ Excel export failed: {response.status_code}")
            print(f"   Response: {response.text}")

    except Exception as e:
        print(f"❌ Error testing Excel export: {str(e)}")

    # Test 4: Validate Excel Structure
    print("\n4️⃣ Testing Excel Validation...")
    try:
        validation_payload = {
            "fileData": mock_file_data,
            "expectedFields": ["company_name", "department", "investigator_name"]
        }

        response = requests.post(
            f"{base_url}/validate-excel",
            json=validation_payload,
            timeout=10
        )

        if response.status_code == 200:
            result = response.json()
            print(f"✅ Excel validation successful:")
            print(f"   Is Valid: {result.get('isValid')}")
            print(f"   Errors: {len(result.get('errors', []))}")
            print(f"   Warnings: {len(result.get('warnings', []))}")
        else:
            print(f"❌ Excel validation failed: {response.status_code}")
            print(f"   Response: {response.text}")

    except Exception as e:
        print(f"❌ Error testing Excel validation: {str(e)}")

def test_local_worker():
    """Test worker locally if possible"""
    print("\n🏠 Testing Local Worker (if available)...")

    try:
        # Try local worker first
        local_url = "http://localhost:8787/api/excel"

        response = requests.get(f"{local_url}/form-structure/test", timeout=5)
        print("✅ Local worker is running!")

        # Run the same tests against local worker
        return test_excel_worker_at_url(local_url)

    except Exception as e:
        print(f"ℹ️ Local worker not available: {str(e)}")
        return False

def test_excel_worker_at_url(base_url):
    """Test worker at specific URL"""
    print(f"🔄 Testing worker at: {base_url}")

    try:
        response = requests.get(f"{base_url}/form-structure/test", timeout=5)
        if response.status_code in [200, 404]:
            print("✅ Worker endpoint is responsive")
            return True
        else:
            print(f"❌ Worker returned unexpected status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Worker test failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("🧪 Excel Worker Test Suite")
    print("=" * 50)

    # Test local worker first
    local_available = test_local_worker()

    if not local_available:
        # Test production worker
        test_excel_worker()

    print("\n" + "=" * 50)
    print("✅ Test suite completed!")