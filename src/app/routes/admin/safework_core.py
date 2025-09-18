"""
SafeWork Core Module
SafeWork 대시보드 및 공통 기능
"""
from datetime import datetime, date, timedelta
from flask import Blueprint, render_template, request
from sqlalchemy import text
from models import db
from utils.activity_tracker import track_page_view
from . import admin_required, SafeworkTodo

safework_bp = Blueprint("safework", __name__)


@safework_bp.route("/safework")
@admin_required
def safework_dashboard():
    """SafeWork 안전보건관리 대시보드"""
    track_page_view("safework_dashboard")

    # 현재 날짜 정보
    today = date.today().strftime("%Y-%m-%d")
    current_year = datetime.now().year

    # 실제 SafeWork 데이터베이스에서 통계 가져오기
    try:
        # 근로자 통계 (safework_workers 테이블)
        worker_total_query = db.session.execute(
            text("SELECT COUNT(*) FROM safework_workers WHERE is_active = 1")
        )
        worker_total = worker_total_query.fetchone()[0] if worker_total_query else 0

        worker_active_query = db.session.execute(
            text("SELECT COUNT(*) FROM safework_workers WHERE is_active = 1")
        )
        worker_active = worker_active_query.fetchone()[0] if worker_active_query else 0

        worker_leave_query = db.session.execute(
            text("SELECT COUNT(*) FROM safework_workers WHERE is_active = 0")
        )
        worker_leave = worker_leave_query.fetchone()[0] if worker_leave_query else 0

        # 건강검진 통계
        health_check_total_query = db.session.execute(
            text("SELECT COUNT(*) FROM safework_health_checks")
        )
        health_check_completed = (
            health_check_total_query.fetchone()[0] if health_check_total_query else 0
        )
        health_check_target = worker_total
        health_check_rate = round(
            (health_check_completed / health_check_target * 100)
            if health_check_target > 0
            else 0,
            1,
        )

        # 이번 달 의무실 방문 통계
        month_start = datetime.now().replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        medical_visits_query = db.session.execute(
            text(
                "SELECT COUNT(*) FROM safework_medical_visits WHERE visit_date >= :month_start"
            ),
            {"month_start": month_start},
        )
        medical_visits_month = (
            medical_visits_query.fetchone()[0] if medical_visits_query else 0
        )

        # 실제 건강검진 일정 데이터
        health_checks_query = db.session.execute(
            text(
                """
            SELECT sw.name as worker_name, shc.check_type, shc.check_date as scheduled_date,
                   CASE WHEN shc.result IS NOT NULL THEN 'COMPLETED' ELSE 'SCHEDULED' END as status
            FROM safework_health_checks shc
            JOIN safework_workers sw ON shc.worker_id = sw.id
            ORDER BY shc.check_date DESC
            LIMIT 5
        """
            )
        )
        health_checks = []
        for row in health_checks_query:
            health_checks.append(
                {
                    "scheduled_date": row[2].strftime("%Y-%m-%d") if row[2] else "",
                    "worker_name": row[0] or "",
                    "check_type": row[1] or "일반",
                    "status": row[3] or "SCHEDULED",
                }
            )

        # 실제 의무실 방문 데이터
        medical_visits_query = db.session.execute(
            text(
                """
            SELECT smv.visit_date, sw.name as worker_name, smv.chief_complaint, smv.follow_up_needed
            FROM safework_medical_visits smv
            JOIN safework_workers sw ON smv.worker_id = sw.id
            ORDER BY smv.visit_date DESC
            LIMIT 5
        """
            )
        )
        medical_visits = []
        for row in medical_visits_query:
            medical_visits.append(
                {
                    "visit_date": row[0] if row[0] else datetime.now(),
                    "worker_name": row[1] or "",
                    "chief_complaint": row[2] or "증상 없음",
                    "follow_up_needed": bool(row[3]) if row[3] is not None else False,
                }
            )

        # 부서별 통계 (실제 데이터)
        dept_stats_query = db.session.execute(
            text(
                """
            SELECT department, COUNT(*) as total_workers,
                   COUNT(CASE WHEN (SELECT COUNT(*) FROM safework_health_checks WHERE worker_id = sw.id) > 0 THEN 1 END) as completed
            FROM safework_workers sw
            WHERE is_active = 1
            GROUP BY department
        """
            )
        )

        department_names = []
        department_completed = []
        department_pending = []

        for row in dept_stats_query:
            dept_name = row[0] or "미지정"
            total = row[1] or 0
            completed = row[2] or 0
            pending = total - completed

            department_names.append(dept_name)
            department_completed.append(completed)
            department_pending.append(pending)

        # 의약품 재고 부족 확인
        low_stock_query = db.session.execute(
            text(
                """
            SELECT COUNT(*) FROM safework_medications
            WHERE current_stock <= minimum_stock
        """
            )
        )
        low_stock_count = low_stock_query.fetchone()[0] if low_stock_query else 0

        # 곧 만료될 의약품 확인
        expiry_soon_query = db.session.execute(
            text(
                """
            SELECT COUNT(*) FROM safework_medications
            WHERE expiry_date <= CURRENT_DATE + INTERVAL '30 days'
        """
            )
        )
        expiry_soon_count = expiry_soon_query.fetchone()[0] if expiry_soon_query else 0

    except Exception as e:
        print(f"Database query error: {e}")
        # 에러 발생 시 기본값 사용
        worker_total = 0
        worker_active = 0
        worker_leave = 0
        health_check_rate = 0
        health_check_completed = 0
        health_check_target = 0
        medical_visits_month = 0
        health_checks = []
        medical_visits = []
        department_names = ["데이터 없음"]
        department_completed = [0]
        department_pending = [0]
        low_stock_count = 0
        expiry_soon_count = 0

    # 기본값들
    medical_change = -5.2
    env_status = "정상"
    next_measurement = "2024-06-15"

    # 알림 데이터 (실제 데이터 기반)
    alerts = []
    if health_check_target - health_check_completed > 0:
        alerts.append(
            {
                "type": "warning",
                "title": "건강검진 미수검자",
                "message": f"{health_check_target - health_check_completed}명",
            }
        )

    alerts.extend(
        [
            {"type": "info", "title": "작업환경측정", "message": "D-45"},
            {"type": "success", "title": "안전교육 완료율", "message": "94.2%"},
        ]
    )

    if low_stock_count > 0:
        alerts.append(
            {"type": "danger", "title": "의약품 재고부족", "message": f"{low_stock_count}종"}
        )

    if expiry_soon_count > 0:
        alerts.append(
            {
                "type": "warning",
                "title": "의약품 유효기간 임박",
                "message": f"{expiry_soon_count}종",
            }
        )

    return render_template(
        "admin/safework_dashboard.html",
        today=today,
        current_year=current_year,
        worker_total=worker_total,
        worker_active=worker_active,
        worker_leave=worker_leave,
        health_check_rate=health_check_rate,
        health_check_completed=health_check_completed,
        health_check_target=health_check_target,
        medical_visits_month=medical_visits_month,
        medical_change=medical_change,
        env_status=env_status,
        next_measurement=next_measurement,
        health_checks=health_checks,
        medical_visits=medical_visits,
        department_names=department_names,
        department_completed=department_completed,
        department_pending=department_pending,
        alerts=alerts,
    )


@safework_bp.route("/safework/todos")
@admin_required
def safework_todos():
    """SafeWork Todo 관리 대시보드"""
    track_page_view("safework_todos")

    page = request.args.get("page", 1, type=int)
    per_page = 10
    status_filter = request.args.get("status", "")
    priority_filter = request.args.get("priority", "")
    category_filter = request.args.get("category", "")

    try:
        # Todo 데이터 조회
        query = SafeworkTodo.query

        # 필터 적용
        if status_filter:
            query = query.filter(SafeworkTodo.status == status_filter)
        if priority_filter:
            query = query.filter(SafeworkTodo.priority == priority_filter)
        if category_filter:
            query = query.filter(SafeworkTodo.category == category_filter)

        # 페이지네이션
        todos = query.order_by(SafeworkTodo.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        # 통계 계산
        total_todos = SafeworkTodo.query.count()
        pending_todos = SafeworkTodo.query.filter(
            SafeworkTodo.status == "pending"
        ).count()
        completed_todos = SafeworkTodo.query.filter(
            SafeworkTodo.status == "completed"
        ).count()
        in_progress_todos = SafeworkTodo.query.filter(
            SafeworkTodo.status == "in_progress"
        ).count()

        # 우선순위별 통계
        high_priority = SafeworkTodo.query.filter(
            SafeworkTodo.priority == "high"
        ).count()
        medium_priority = SafeworkTodo.query.filter(
            SafeworkTodo.priority == "medium"
        ).count()
        low_priority = SafeworkTodo.query.filter(SafeworkTodo.priority == "low").count()

        return render_template(
            "admin/safework_todos.html",
            todos=todos,
            total_todos=total_todos,
            pending_todos=pending_todos,
            completed_todos=completed_todos,
            in_progress_todos=in_progress_todos,
            high_priority=high_priority,
            medium_priority=medium_priority,
            low_priority=low_priority,
            status_filter=status_filter,
            priority_filter=priority_filter,
            category_filter=category_filter,
        )

    except Exception as e:
        # 테이블이 존재하지 않는 경우 빈 데이터로 처리
        print(f"SafeworkTodo query error: {e}")
        return render_template(
            "admin/safework_todos.html",
            todos=None,
            total_todos=0,
            pending_todos=0,
            completed_todos=0,
            in_progress_todos=0,
            high_priority=0,
            medium_priority=0,
            low_priority=0,
            status_filter=status_filter,
            priority_filter=priority_filter,
            category_filter=category_filter,
        )
