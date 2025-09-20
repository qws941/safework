#!/usr/bin/env python3
"""
SafeWork 의약품 재고 확인 스크립트
Production 데이터베이스에서 재고 부족 의약품 확인
"""

import os
import sys
import psycopg2
from datetime import datetime

def check_medication_stock():
    """의약품 재고 현황 확인"""

    # 데이터베이스 연결 정보
    db_config = {
        'host': 'safework-postgres',
        'port': 5432,
        'database': 'safework_db',
        'user': 'safework',
        'password': 'safework2024'
    }

    try:
        # PostgreSQL 연결
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()

        print("=" * 60)
        print("🏥 SafeWork 의약품 재고 현황 확인")
        print("=" * 60)
        print(f"📅 확인 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()

        # 1. 전체 의약품 목록 확인
        cursor.execute("""
            SELECT COUNT(*) FROM medications
        """)
        total_medications = cursor.fetchone()[0]
        print(f"📊 등록된 의약품 총 개수: {total_medications}개")

        # 2. 재고 부족 의약품 확인
        cursor.execute("""
            SELECT name, category, current_stock, minimum_stock, unit,
                   (minimum_stock - current_stock) as shortage_amount,
                   expiry_date, supplier
            FROM medications
            WHERE current_stock <= minimum_stock
            ORDER BY (minimum_stock - current_stock) DESC
        """)

        low_stock_items = cursor.fetchall()

        if low_stock_items:
            print(f"🚨 재고 부족 의약품: {len(low_stock_items)}개")
            print("-" * 60)

            for item in low_stock_items:
                name, category, current, minimum, unit, shortage, expiry, supplier = item
                print(f"📦 의약품명: {name}")
                print(f"   분류: {category or '미분류'}")
                print(f"   현재 재고: {current}{unit or '개'}")
                print(f"   최소 재고: {minimum}{unit or '개'}")
                print(f"   부족량: {shortage}{unit or '개'}")
                if expiry:
                    print(f"   유효기간: {expiry}")
                if supplier:
                    print(f"   공급업체: {supplier}")
                print(f"   ⚠️ 상태: {'긴급 보충 필요' if shortage > 5 else '보충 필요'}")
                print("-" * 40)
        else:
            print("✅ 재고 부족 의약품이 없습니다.")

        # 3. 유효기간 임박 의약품 확인
        cursor.execute("""
            SELECT name, current_stock, expiry_date,
                   (expiry_date - CURRENT_DATE) as days_until_expiry
            FROM medications
            WHERE expiry_date IS NOT NULL
              AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
            ORDER BY expiry_date ASC
        """)

        expiring_items = cursor.fetchall()

        if expiring_items:
            print()
            print(f"⏰ 유효기간 임박 의약품: {len(expiring_items)}개")
            print("-" * 60)

            for item in expiring_items:
                name, stock, expiry, days_left = item
                status = "만료됨" if days_left.days < 0 else f"{days_left.days}일 남음"
                urgency = "🔴 긴급" if days_left.days <= 7 else "🟡 주의" if days_left.days <= 30 else "🟢 양호"

                print(f"📦 의약품명: {name}")
                print(f"   재고: {stock}개")
                print(f"   유효기간: {expiry}")
                print(f"   상태: {status} ({urgency})")
                print("-" * 40)

        # 4. 총 재고 현황 요약
        cursor.execute("""
            SELECT
                COUNT(*) as total_items,
                COUNT(CASE WHEN current_stock <= minimum_stock THEN 1 END) as low_stock_count,
                COUNT(CASE WHEN expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as expiring_count,
                SUM(current_stock) as total_stock_value
            FROM medications
        """)

        summary = cursor.fetchone()
        total, low_stock, expiring, total_value = summary

        print()
        print("📈 재고 현황 요약")
        print("-" * 30)
        print(f"전체 의약품: {total}개")
        print(f"재고 부족: {low_stock}개")
        print(f"유효기간 임박: {expiring}개")
        print(f"총 재고량: {total_value or 0}개")
        print()

        # 5. 권장 조치사항
        if low_stock > 0 or expiring > 0:
            print("🔧 권장 조치사항")
            print("-" * 30)
            if low_stock > 0:
                print(f"• {low_stock}개 의약품 즉시 보충 필요")
            if expiring > 0:
                print(f"• {expiring}개 의약품 유효기간 확인 및 교체 검토")
            print("• 담당자에게 Slack 알림 발송 권장")
            print("• 재고 관리 시스템 점검 필요")
        else:
            print("✅ 현재 재고 상태 양호함")

        cursor.close()
        conn.close()

        return {
            'total_medications': total,
            'low_stock_count': low_stock,
            'expiring_count': expiring,
            'low_stock_items': low_stock_items,
            'expiring_items': expiring_items
        }

    except Exception as e:
        print(f"❌ 데이터베이스 연결 실패: {e}")
        print("🔧 Docker 컨테이너가 실행 중인지 확인해주세요.")
        return None

if __name__ == "__main__":
    result = check_medication_stock()

    if result and (result['low_stock_count'] > 0 or result['expiring_count'] > 0):
        print()
        print("🚨 조치가 필요한 항목이 발견되었습니다!")
        sys.exit(1)
    else:
        print()
        print("✅ 재고 상태 점검 완료")
        sys.exit(0)