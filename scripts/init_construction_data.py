#!/usr/bin/env python3
"""
건설업 맞춤 마스터 데이터 초기화 스크립트
"""

import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'app'))

from app import create_app
from models import db, Company, Process, Role

def init_companies():
    """건설업체 기본 데이터"""
    companies = [
        {"name": "대한건설", "company_type": "원도급", "business_number": "123-45-67890"},
        {"name": "삼성물산", "company_type": "원도급", "business_number": "234-56-78901"},
        {"name": "현대건설", "company_type": "원도급", "business_number": "345-67-89012"},
        {"name": "태영건설", "company_type": "하도급", "business_number": "456-78-90123"},
        {"name": "동아건설", "company_type": "하도급", "business_number": "567-89-01234"},
    ]
    
    for company_data in companies:
        existing = Company.query.filter_by(name=company_data["name"]).first()
        if not existing:
            company = Company(**company_data)
            db.session.add(company)
            
    print(f"✅ {len(companies)}개 건설업체 데이터 초기화 완료")

def init_processes():
    """공정 기본 데이터"""
    processes = [
        {"name": "토공사", "category": "토목공사", "risk_level": "중"},
        {"name": "기초공사", "category": "토목공사", "risk_level": "상"},
        {"name": "철근공사", "category": "구조공사", "risk_level": "중"},
        {"name": "콘크리트공사", "category": "구조공사", "risk_level": "중"},
        {"name": "철골공사", "category": "구조공사", "risk_level": "상"},
        {"name": "조적공사", "category": "마감공사", "risk_level": "하"},
        {"name": "미장공사", "category": "마감공사", "risk_level": "하"},
        {"name": "타일공사", "category": "마감공사", "risk_level": "하"},
        {"name": "도장공사", "category": "마감공사", "risk_level": "중"},
        {"name": "전기공사", "category": "설비공사", "risk_level": "상"},
        {"name": "배관공사", "category": "설비공사", "risk_level": "중"},
        {"name": "공조공사", "category": "설비공사", "risk_level": "중"},
    ]
    
    for process_data in processes:
        existing = Process.query.filter_by(name=process_data["name"]).first()
        if not existing:
            process = Process(**process_data)
            db.session.add(process)
            
    print(f"✅ {len(processes)}개 공정 데이터 초기화 완료")

def init_roles():
    """직위/직책 기본 데이터"""
    roles = [
        {"name": "현장소장", "category": "관리직", "authority_level": 5},
        {"name": "공사부장", "category": "관리직", "authority_level": 4},
        {"name": "현장대리인", "category": "관리직", "authority_level": 4},
        {"name": "공무팀장", "category": "관리직", "authority_level": 3},
        {"name": "안전관리자", "category": "기술직", "authority_level": 3},
        {"name": "품질관리자", "category": "기술직", "authority_level": 3},
        {"name": "시공기술자", "category": "기술직", "authority_level": 2},
        {"name": "측량기술자", "category": "기술직", "authority_level": 2},
        {"name": "반장", "category": "작업자", "authority_level": 2},
        {"name": "숙련기능자", "category": "작업자", "authority_level": 1},
        {"name": "일반기능자", "category": "작업자", "authority_level": 1},
        {"name": "보통인부", "category": "작업자", "authority_level": 1},
    ]
    
    for role_data in roles:
        existing = Role.query.filter_by(name=role_data["name"]).first()
        if not existing:
            role = Role(**role_data)
            db.session.add(role)
            
    print(f"✅ {len(roles)}개 직위/직책 데이터 초기화 완료")

def main():
    app = create_app()
    with app.app_context():
        print("🏗️ 건설업 마스터 데이터 초기화 시작...")
        
        # 테이블 생성
        db.create_all()
        
        # 데이터 초기화
        init_companies()
        init_processes()
        init_roles()
        
        # 커밋
        try:
            db.session.commit()
            print("🎉 모든 마스터 데이터 초기화 완료!")
        except Exception as e:
            db.session.rollback()
            print(f"❌ 데이터 초기화 실패: {e}")

if __name__ == "__main__":
    main()
