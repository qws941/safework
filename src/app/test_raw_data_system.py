#!/usr/bin/env python3
"""
SafeWork Raw Data System 테스트 스크립트
설문 제출별 개별 raw data 파일 생성 시스템을 테스트합니다.
"""

import os
import json
import requests
import time
from datetime import datetime
from pathlib import Path

# 테스트 설정
BASE_URL = "http://localhost:4545"
TEST_SURVEY_DATA = [
    {
        "form_type": "001",
        "name": "테스트사용자1",
        "age": 30,
        "gender": "남성",
        "department": "개발부",
        "position": "시니어 개발자",
        "employee_number": "EMP001",
        "work_years": 5,
        "work_months": 3,
        "current_symptom": "예",
        "musculo_details": [
            {
                "part": "neck",
                "side": "양쪽",
                "duration": "1-4주",
                "severity": "7",
                "frequency": "주3-4회"
            }
        ]
    },
    {
        "form_type": "002", 
        "name": "신입사원김철수",
        "age": 25,
        "gender": "남성",
        "department": "생산부",
        "position": "생산직",
        "employee_number": "NEW002",
        "height_cm": 175.5,
        "weight_kg": 70.2,
        "blood_type": "A",
        "existing_conditions": "없음",
        "medication_history": "없음",
        "allergy_history": "복숭아 알레르기"
    },
    {
        "form_type": "003",
        "name": "관리자이영희",
        "age": 35,
        "gender": "여성", 
        "department": "관리부",
        "position": "팀장",
        "employee_number": "MGR003",
        "work_years": 8,
        "work_months": 2,
        "neck_pain": "예",
        "neck_intensity": 6,
        "neck_frequency": "주1-2회",
        "work_posture": "구부린자세",
        "work_stress": "높음",
        "exercise_frequency": "주2-3회"
    }
]


def test_api_submission():
    """API를 통한 설문 제출 테스트"""
    print("🚀 API 설문 제출 테스트 시작...")
    
    submitted_surveys = []
    
    for i, survey_data in enumerate(TEST_SURVEY_DATA, 1):
        print(f"\n📝 테스트 {i}: Form {survey_data['form_type']} 제출...")
        
        try:
            response = requests.post(
                f"{BASE_URL}/survey/api/submit",
                json=survey_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 201:
                result = response.json()
                survey_id = result.get('survey_id')
                print(f"✅ 성공: Survey ID {survey_id}")
                
                submitted_surveys.append({
                    'survey_id': survey_id,
                    'form_type': survey_data['form_type'],
                    'name': survey_data['name']
                })
            else:
                print(f"❌ 실패: HTTP {response.status_code}")
                print(f"응답: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ 요청 오류: {str(e)}")
            
        time.sleep(1)  # 서버 부하 방지
    
    return submitted_surveys


def test_form_submission():
    """웹 폼을 통한 설문 제출 테스트"""
    print("\n🌐 웹 폼 제출 테스트 시작...")
    
    # 세션 생성
    session = requests.Session()
    
    # Form 001 테스트
    form_data = {
        "name": "웹폼테스트사용자",
        "age": "28",
        "gender": "여성",
        "department": "품질부",
        "position": "품질검사원",
        "employee_number": "WEB001",
        "work_years": "3",
        "work_months": "6",
        "current_symptom": "예",
        "musculo_details_json": json.dumps([
            {
                "part": "shoulder",
                "side": "오른쪽",
                "duration": "1주일이상",
                "severity": "5",
                "frequency": "주1-2회"
            }
        ])
    }
    
    try:
        response = session.post(
            f"{BASE_URL}/survey/001_musculoskeletal_symptom_survey",
            data=form_data,
            timeout=10,
            allow_redirects=False
        )
        
        if response.status_code in [200, 302]:
            print("✅ 웹 폼 제출 성공")
        else:
            print(f"❌ 웹 폼 제출 실패: HTTP {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ 웹 폼 요청 오류: {str(e)}")


def check_raw_data_files():
    """생성된 raw data 파일들 확인"""
    print("\n📁 생성된 Raw Data 파일 확인...")
    
    # 현재 스크립트 경로에서 raw_data 디렉토리 찾기
    script_dir = Path(__file__).parent
    raw_data_dir = script_dir / "raw_data"
    
    if not raw_data_dir.exists():
        print(f"❌ Raw data 디렉토리를 찾을 수 없습니다: {raw_data_dir}")
        print("💡 설문이 제출되었는지 확인하고, 서버가 올바르게 설정되었는지 확인하세요.")
        return False
    
    total_files = 0
    
    for form_type in ['001', '002', '003']:
        form_dir = raw_data_dir / f'form_{form_type}'
        if form_dir.exists():
            json_files = list(form_dir.glob('*.json'))
            csv_files = list(form_dir.glob('*.csv'))
            
            print(f"\n📋 Form {form_type}:")
            print(f"  - JSON 파일: {len(json_files)}개")
            print(f"  - CSV 파일: {len(csv_files)}개")
            
            # 최신 파일 몇 개 출력
            all_files = json_files + csv_files
            all_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
            
            for file_path in all_files[:3]:  # 최신 3개만
                file_stat = file_path.stat()
                created_time = datetime.fromtimestamp(file_stat.st_ctime)
                size_mb = file_stat.st_size / (1024 * 1024)
                
                print(f"    📄 {file_path.name}")
                print(f"       생성: {created_time.strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"       크기: {size_mb:.3f} MB")
            
            total_files += len(all_files)
    
    print(f"\n📊 총 생성된 파일: {total_files}개")
    return total_files > 0


def validate_file_content():
    """파일 내용 검증"""
    print("\n🔍 파일 내용 검증...")
    
    script_dir = Path(__file__).parent
    raw_data_dir = script_dir / "raw_data"
    
    if not raw_data_dir.exists():
        print("❌ Raw data 디렉토리가 없습니다.")
        return False
    
    validation_passed = True
    
    # 각 폼별로 최신 JSON 파일 하나씩 검증
    for form_type in ['001', '002', '003']:
        form_dir = raw_data_dir / f'form_{form_type}'
        if form_dir.exists():
            json_files = list(form_dir.glob('*.json'))
            if json_files:
                # 가장 최신 파일 선택
                latest_file = max(json_files, key=lambda x: x.stat().st_mtime)
                
                try:
                    with open(latest_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    print(f"\n✅ Form {form_type} 파일 검증: {latest_file.name}")
                    
                    # 메타데이터 확인
                    if 'metadata' in data:
                        metadata = data['metadata']
                        print(f"  - Survey ID: {metadata.get('survey_id')}")
                        print(f"  - Form Type: {metadata.get('form_type')}")
                        print(f"  - Export Version: {metadata.get('export_version')}")
                    
                    # 실제 설문 데이터 확인
                    if 'survey_data' in data:
                        survey_data = data['survey_data']
                        print(f"  - 응답자: {survey_data.get('name', 'N/A')}")
                        print(f"  - 데이터 필드: {len(survey_data)}개")
                        
                        # 필수 필드 확인
                        required_fields = ['name', 'form_type']
                        for field in required_fields:
                            if field not in survey_data:
                                print(f"  ⚠️ 필수 필드 누락: {field}")
                                validation_passed = False
                    
                except json.JSONDecodeError as e:
                    print(f"❌ JSON 파싱 오류: {latest_file.name} - {str(e)}")
                    validation_passed = False
                except Exception as e:
                    print(f"❌ 파일 읽기 오류: {latest_file.name} - {str(e)}")
                    validation_passed = False
    
    return validation_passed


def test_system_health():
    """시스템 상태 확인"""
    print("\n🏥 시스템 상태 확인...")
    
    try:
        # 헬스 체크
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ 서버 상태: {health_data.get('status', 'unknown')}")
        else:
            print(f"⚠️ 헬스 체크 응답: HTTP {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ 서버 연결 실패: {str(e)}")
        return False
    
    # 메인 페이지 확인
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        if response.status_code == 200:
            print("✅ 메인 페이지 접근 가능")
        else:
            print(f"⚠️ 메인 페이지 응답: HTTP {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ 메인 페이지 접근 실패: {str(e)}")
    
    return True


def print_test_summary():
    """테스트 결과 요약 출력"""
    print("\n" + "="*60)
    print("🎯 SafeWork Raw Data System 테스트 완료")
    print("="*60)
    print()
    print("✅ 테스트한 기능들:")
    print("   - API를 통한 설문 제출")
    print("   - 웹 폼을 통한 설문 제출")
    print("   - Raw data 파일 생성 확인")
    print("   - 파일 내용 검증")
    print("   - 시스템 상태 확인")
    print()
    print("📁 생성된 파일 위치:")
    script_dir = Path(__file__).parent
    raw_data_dir = script_dir / "raw_data"
    print(f"   {raw_data_dir}")
    print()
    print("🔧 추가 확인 사항:")
    print("   - 관리자 대시보드: http://localhost:4545/admin/raw-data/dashboard")
    print("   - API 문서: 각 라우트의 독스트링 참조")
    print("   - 파일 백업: 자동 백업 시스템 동작 확인")


def main():
    """메인 테스트 실행"""
    print("🚀 SafeWork Raw Data System 테스트 시작")
    print(f"📅 테스트 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # 1. 시스템 상태 확인
    if not test_system_health():
        print("❌ 시스템 상태 확인 실패. 서버가 실행 중인지 확인하세요.")
        return
    
    # 2. API 테스트
    submitted_surveys = test_api_submission()
    
    # 3. 웹 폼 테스트
    test_form_submission()
    
    # 4. 파일 생성 확인
    print("\n⏳ 파일 생성 대기 중... (3초)")
    time.sleep(3)
    
    files_created = check_raw_data_files()
    
    # 5. 파일 내용 검증
    if files_created:
        content_valid = validate_file_content()
        if content_valid:
            print("\n✅ 모든 파일 내용 검증 통과")
        else:
            print("\n⚠️ 일부 파일에서 검증 문제 발견")
    
    # 6. 결과 요약
    print_test_summary()


if __name__ == "__main__":
    main()