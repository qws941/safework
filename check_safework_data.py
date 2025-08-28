#!/usr/bin/env python3
"""SafeWork 데이터베이스 상태 확인 스크립트"""

from app import create_app
from models import db
from sqlalchemy import text

def check_safework_data():
    app = create_app()
    with app.app_context():
        try:
            # Check safework_workers
            result = db.session.execute(text('SELECT COUNT(*) FROM safework_workers')).fetchone()
            workers_count = result[0] if result else 0
            print(f"✅ SafeWork Workers: {workers_count}")
            
            if workers_count > 0:
                result = db.session.execute(text('SELECT employee_number, name, department FROM safework_workers LIMIT 3'))
                print("   Sample workers:")
                for row in result:
                    print(f"   - {row[0]}: {row[1]} ({row[2]})")
            
            # Check safework_medications
            result = db.session.execute(text('SELECT COUNT(*) FROM safework_medications')).fetchone()
            meds_count = result[0] if result else 0
            print(f"✅ SafeWork Medications: {meds_count}")
            
            if meds_count > 0:
                result = db.session.execute(text('SELECT name, current_stock FROM safework_medications LIMIT 3'))
                print("   Sample medications:")
                for row in result:
                    print(f"   - {row[0]}: {row[1]} 재고")
            
            # Check safework_health_checks
            result = db.session.execute(text('SELECT COUNT(*) FROM safework_health_checks')).fetchone()
            health_count = result[0] if result else 0
            print(f"✅ SafeWork Health Checks: {health_count}")
            
            # Check safework_medical_visits
            result = db.session.execute(text('SELECT COUNT(*) FROM safework_medical_visits')).fetchone()
            visits_count = result[0] if result else 0
            print(f"✅ SafeWork Medical Visits: {visits_count}")
            
            print(f"\n🎉 모든 SafeWork 테이블이 성공적으로 생성되었습니다!")
            print(f"   총 근로자: {workers_count}명")
            print(f"   의약품 종류: {meds_count}종") 
            print(f"   건강검진 기록: {health_count}건")
            print(f"   의무실 방문: {visits_count}건")
            
        except Exception as e:
            print(f"❌ Database error: {e}")

if __name__ == "__main__":
    check_safework_data()