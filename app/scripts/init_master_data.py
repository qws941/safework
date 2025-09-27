#!/usr/bin/env python3
"""
SafeWork 마스터 데이터 초기화 스크립트
업체 및 공정 데이터를 데이터베이스에 추가합니다.
"""

import sys
import os

# 앱 모듈 경로 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models import db, CompanyModel, ProcessModel
from datetime import datetime

def init_companies():
    """업체 데이터 초기화"""
    companies = [
        {"name": "미래도시건설", "display_order": 1},
        {"name": "직영팀", "display_order": 2},
        {"name": "포커스이엔씨", "display_order": 3},
        {"name": "골조팀", "display_order": 4},
        {"name": "티이엔", "display_order": 5},
        {"name": "대우건설", "display_order": 6},
        {"name": "현대건설", "display_order": 7},
        {"name": "삼성물산", "display_order": 8},
        {"name": "GS건설", "display_order": 9},
        {"name": "롯데건설", "display_order": 10},
    ]
    
    added_count = 0
    for company_data in companies:
        # 중복 체크
        existing = CompanyModel.query.filter_by(name=company_data["name"]).first()
        if not existing:
            company = CompanyModel(
                name=company_data["name"],
                display_order=company_data["display_order"],
                is_active=True
            )
            db.session.add(company)
            added_count += 1
            print(f"✓ 업체 추가: {company_data['name']}")
        else:
            print(f"- 업체 이미 존재: {company_data['name']}")
    
    if added_count > 0:
        db.session.commit()
        print(f"\n업체 {added_count}개가 추가되었습니다.")
    else:
        print("\n추가된 업체가 없습니다.")

def init_processes():
    """공정 데이터 초기화"""
    processes = [
        {"name": "관리자", "description": "현장 관리 및 감독 업무", "display_order": 1},
        {"name": "철근", "description": "철근 가공, 배근, 결속 작업", "display_order": 2},
        {"name": "형틀목공", "description": "거푸집 설치 및 해체 작업", "display_order": 3},
        {"name": "콘크리트타설", "description": "콘크리트 운반, 타설, 마감 작업", "display_order": 4},
        {"name": "비계", "description": "비계 설치 및 해체 작업", "display_order": 5},
        {"name": "전기", "description": "전기 배선 및 설비 설치 작업", "display_order": 6},
        {"name": "배관", "description": "급수, 배수, 난방 배관 작업", "display_order": 7},
        {"name": "방수", "description": "방수 시공 및 마감 작업", "display_order": 8},
        {"name": "도장", "description": "도료 도장 및 마감 작업", "display_order": 9},
        {"name": "미장", "description": "벽체 미장 및 마감 작업", "display_order": 10},
        {"name": "석공", "description": "석재 가공 및 설치 작업", "display_order": 11},
        {"name": "타일", "description": "타일 부착 및 마감 작업", "display_order": 12},
        {"name": "토공", "description": "토목 굴착 및 성토 작업", "display_order": 13},
        {"name": "굴삭", "description": "기계 굴착 및 정지 작업", "display_order": 14},
        {"name": "크레인", "description": "크레인 운전 및 양중 작업", "display_order": 15},
        {"name": "신호수", "description": "크레인 및 장비 신호 작업", "display_order": 16},
        {"name": "용접", "description": "철골 용접 및 접합 작업", "display_order": 17},
        {"name": "조적", "description": "벽돌, 블록 쌓기 작업", "display_order": 18},
        {"name": "지붕", "description": "지붕 골조 및 마감 작업", "display_order": 19},
        {"name": "유리", "description": "유리창 설치 및 교체 작업", "display_order": 20},
        {"name": "내장", "description": "실내 마감 및 인테리어 작업", "display_order": 21},
        {"name": "외장", "description": "외벽 마감 및 외장재 설치", "display_order": 22},
        {"name": "조경", "description": "조경 설계 및 시공 작업", "display_order": 23},
        {"name": "설비", "description": "기계설비 설치 및 유지보수", "display_order": 24},
        {"name": "안전", "description": "현장 안전 관리 및 감시", "display_order": 25},
    ]
    
    added_count = 0
    for process_data in processes:
        # 중복 체크
        existing = ProcessModel.query.filter_by(name=process_data["name"]).first()
        if not existing:
            process = ProcessModel(
                name=process_data["name"],
                description=process_data["description"],
                display_order=process_data["display_order"],
                is_active=True
            )
            db.session.add(process)
            added_count += 1
            print(f"✓ 공정 추가: {process_data['name']} ({process_data['description']})")
        else:
            print(f"- 공정 이미 존재: {process_data['name']}")
    
    if added_count > 0:
        db.session.commit()
        print(f"\n공정 {added_count}개가 추가되었습니다.")
    else:
        print("\n추가된 공정이 없습니다.")

def main():
    """메인 실행 함수"""
    print("SafeWork 마스터 데이터 초기화를 시작합니다...")
    print("=" * 50)
    
    # Flask 앱 생성
    app = create_app()
    
    with app.app_context():
        # 데이터베이스 테이블 생성 (존재하지 않는 경우)
        db.create_all()
        
        print("\n1. 업체 데이터 초기화")
        print("-" * 30)
        init_companies()
        
        print("\n2. 공정 데이터 초기화")
        print("-" * 30)
        init_processes()
        
        # 최종 통계
        print("\n" + "=" * 50)
        print("초기화 완료 통계:")
        print(f"- 총 업체 수: {CompanyModel.query.filter_by(is_active=True).count()}")
        print(f"- 총 공정 수: {ProcessModel.query.filter_by(is_active=True).count()}")
        print("=" * 50)

if __name__ == "__main__":
    main()