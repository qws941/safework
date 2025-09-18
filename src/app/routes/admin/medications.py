"""
Medications Management Module
의약품 재고 관리 기능
"""
from datetime import datetime, timedelta
from flask import Blueprint, render_template, request
from sqlalchemy import text
from models import db
from utils.activity_tracker import track_admin_action, track_page_view
from . import admin_required

medications_bp = Blueprint("medications", __name__)


@medications_bp.route("/safework/medications")
@admin_required
def safework_medications():
    """SafeWork 의약품 관리"""
    track_page_view("safework_medications")
    track_admin_action("VIEW_MEDICATIONS")

    try:
        # 실제 의약품 통계
        total_query = db.session.execute(
            text("SELECT COUNT(*) FROM safework_medications")
        )
        total_medications = total_query.fetchone()[0] if total_query else 0

        # 재고 부족 의약품 수
        low_stock_query = db.session.execute(
            text(
                """
            SELECT COUNT(*) FROM safework_medications
            WHERE current_stock <= minimum_stock
        """
            )
        )
        low_stock_count = low_stock_query.fetchone()[0] if low_stock_query else 0

        # 30일 내 만료 예정 의약품 수
        expiry_soon_query = db.session.execute(
            text(
                """
            SELECT COUNT(*) FROM safework_medications
            WHERE expiry_date <= CURRENT_DATE + INTERVAL '30 days'
        """
            )
        )
        expiry_soon_count = expiry_soon_query.fetchone()[0] if expiry_soon_query else 0

        # 총 재고 가치
        value_query = db.session.execute(
            text(
                """
            SELECT COALESCE(SUM(current_stock * price_per_unit), 0)
            FROM safework_medications
            WHERE price_per_unit IS NOT NULL
        """
            )
        )
        total_value = value_query.fetchone()[0] if value_query else 0

        # 실제 의약품 데이터
        meds_query = db.session.execute(
            text(
                """
            SELECT id, name, category, unit, current_stock, minimum_stock,
                   expiry_date, supplier, price_per_unit, last_purchase_date
            FROM safework_medications
            ORDER BY
                CASE WHEN current_stock <= minimum_stock THEN 0 ELSE 1 END,
                CASE WHEN expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 0 ELSE 1 END,
                name
        """
            )
        )

        medications = []
        today = datetime.now().date()

        for row in meds_query:
            expiry_date = row[6]
            is_expired = False
            expiry_soon = False

            if expiry_date:
                if isinstance(expiry_date, str):
                    expiry_date = datetime.strptime(expiry_date, "%Y-%m-%d").date()

                if expiry_date < today:
                    is_expired = True
                elif expiry_date <= today + timedelta(days=30):
                    expiry_soon = True

            medication = {
                "id": row[0],
                "name": row[1] or "",
                "category": row[2] or "기타",
                "unit": row[3] or "개",
                "current_stock": row[4] or 0,
                "minimum_stock": row[5] or 0,
                "expiry_date": expiry_date.strftime("%Y-%m-%d") if expiry_date else "",
                "supplier": row[7] or "",
                "price_per_unit": row[8] or 0,
                "last_purchase_date": row[9].strftime("%Y-%m-%d") if row[9] else "",
                "is_expired": is_expired,
                "expiry_soon": expiry_soon,
            }
            medications.append(medication)

    except Exception as e:
        print(f"Medications query error: {e}")
        # 에러 발생 시 기본값
        total_medications = 0
        low_stock_count = 0
        expiry_soon_count = 0
        total_value = 0
        medications = []

    return render_template(
        "admin/safework_medications.html",
        total_medications=total_medications,
        low_stock_count=low_stock_count,
        expiry_soon_count=expiry_soon_count,
        total_value=total_value,
        medications=medications,
    )


@medications_bp.route("/safework/medication/inventory")
@admin_required
def safework_medication_inventory():
    """의약품 재고 관리"""
    track_page_view("safework_medication_inventory")
    track_admin_action("VIEW_MEDICATION_INVENTORY")
    return render_template("admin/safework_medication_inventory.html")
