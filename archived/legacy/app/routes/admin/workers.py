"""
Workers Management Module
근로자 관리 기능
"""
from datetime import datetime, date
from flask import Blueprint, render_template, request
from sqlalchemy import text
from models import db
from utils.activity_tracker import track_admin_action, track_page_view
from . import admin_required

workers_bp = Blueprint("workers", __name__)


@workers_bp.route("/safework/workers")
@admin_required
def safework_workers():
    """SafeWork 근로자 관리"""
    track_page_view("safework_workers")
    track_admin_action("VIEW_WORKERS", details={"page": request.args.get("page", 1)})

    page = request.args.get("page", 1, type=int)
    per_page = 10

    try:
        # 실제 근로자 데이터 조회 (페이지네이션 적용)
        workers_query = db.session.execute(
            text(
                """
            SELECT sw.id, sw.employee_number, sw.name, sw.department, sw.position,
                   sw.hire_date, sw.birth_date, sw.is_active,
                   (SELECT MAX(check_date) FROM safework_health_checks WHERE worker_id = sw.id) as last_check_date
            FROM safework_workers sw
            ORDER BY sw.employee_number
            LIMIT :per_page OFFSET :offset
        """
            ),
            {"per_page": per_page, "offset": (page - 1) * per_page},
        )

        workers = []
        for row in workers_query:
            # 나이 계산
            age = None
            if row[6]:  # birth_date
                today = date.today()
                birth_date = (
                    row[6]
                    if isinstance(row[6], date)
                    else datetime.strptime(str(row[6]), "%Y-%m-%d").date()
                )
                age = (
                    today.year
                    - birth_date.year
                    - ((today.month, today.day) < (birth_date.month, birth_date.day))
                )

            worker = {
                "id": row[0],
                "employee_number": row[1] or "",
                "name": row[2] or "",
                "department": row[3] or "미지정",
                "position": row[4] or "사원",
                "hire_date": row[5].strftime("%Y-%m-%d") if row[5] else "",
                "age": age,
                "last_check_date": row[8].strftime("%Y-%m-%d") if row[8] else None,
                "is_special_management": False,  # 추후 특별관리 로직 추가
                "status": "ACTIVE" if row[7] else "INACTIVE",
            }
            workers.append(worker)

        # 총 근로자 수 조회
        total_query = db.session.execute(text("SELECT COUNT(*) FROM safework_workers"))
        total_workers = total_query.fetchone()[0] if total_query else 0
        total_pages = (total_workers + per_page - 1) // per_page

    except Exception as e:
        print(f"Workers query error: {e}")
        # 에러 발생 시 빈 목록 반환
        workers = []
        total_pages = 1

    return render_template(
        "admin/safework_workers.html",
        workers=workers,
        page=page,
        total_pages=total_pages,
    )
