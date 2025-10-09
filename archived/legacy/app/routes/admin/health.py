"""
Health Management Module
건강검진, 의료진료 관리 기능
"""
from datetime import datetime, timedelta
from flask import Blueprint, render_template, request
from sqlalchemy import text
from models import db
from utils.activity_tracker import track_admin_action, track_page_view
from . import admin_required

health_bp = Blueprint("health", __name__)


@health_bp.route("/safework/health-checks")
@admin_required
def safework_health_checks():
    """SafeWork 건강검진 관리"""
    track_page_view("safework_health_checks")
    track_admin_action("VIEW_HEALTH_CHECKS")

    try:
        # 실제 건강검진 통계 데이터 조회
        total_workers = db.session.execute(
            text("SELECT COUNT(*) FROM safework_workers WHERE is_active = true")
        ).fetchone()[0]
        completed_checks = db.session.execute(
            text(
                """
            SELECT COUNT(DISTINCT worker_id) FROM safework_health_checks
            WHERE EXTRACT(YEAR FROM check_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        """
            )
        ).fetchone()[0]

        total_targets = total_workers or 0
        completed_count = completed_checks or 0
        scheduled_count = total_targets - completed_count
        completion_rate = round(
            (completed_count / total_targets * 100) if total_targets > 0 else 0, 1
        )

        # 실제 건강검진 결과 데이터 조회
        health_results_query = db.session.execute(
            text(
                """
            SELECT hc.id, hc.check_date, w.name, w.department, hc.result,
                   hc.blood_pressure, hc.notes
            FROM safework_health_checks hc
            JOIN safework_workers w ON hc.worker_id = w.id
            WHERE EXTRACT(YEAR FROM hc.check_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            ORDER BY hc.check_date DESC
            LIMIT 20
        """
            )
        )

        health_results = []
        for row in health_results_query:
            result = {
                "id": row[0],
                "check_date": row[1].strftime("%Y-%m-%d") if row[1] else "",
                "name": row[2] or "",
                "department": row[3] or "미지정",
                "grade": row[4] or "A",  # result 필드를 grade로 매핑
                "bmi": "N/A",  # BMI 계산 로직 추가 필요
                "blood_pressure": row[5] or "N/A",
                "follow_up_required": True if row[6] and "관찰" in row[6] else False,
            }
            health_results.append(result)

    except Exception as e:
        print(f"Health checks query error: {e}")
        # 에러 발생 시 기본값 사용
        total_targets = 0
        completed_count = 0
        scheduled_count = 0
        completion_rate = 0
        health_results = []

    # 기본 건강검진 계획 (추후 별도 테이블로 관리)
    health_plans = [
        {
            "id": 1,
            "year": 2024,
            "type": "GENERAL",
            "planned_date": "2024-03-15",
            "target_count": total_targets,
            "completed_count": completed_count,
            "status": "IN_PROGRESS",
            "completion_rate": completion_rate,
        }
    ]

    # 건강검진 대상자 목록 (활성 근로자 기반)
    try:
        health_targets_query = db.session.execute(
            text(
                """
            SELECT w.id, w.employee_number, w.name, w.department,
                   CASE WHEN hc.id IS NULL THEN 'SCHEDULED' ELSE 'COMPLETED' END as status,
                   COALESCE(hc.check_date, CURRENT_DATE + INTERVAL '30 days') as scheduled_date
            FROM safework_workers w
            LEFT JOIN safework_health_checks hc ON w.id = hc.worker_id
                AND EXTRACT(YEAR FROM hc.check_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            WHERE w.is_active = true
            ORDER BY w.employee_number
            LIMIT 20
        """
            )
        )

        health_targets = []
        for row in health_targets_query:
            target = {
                "id": row[0],
                "employee_number": row[1] or "",
                "name": row[2] or "",
                "department": row[3] or "미지정",
                "check_type": "일반",
                "scheduled_date": row[5].strftime("%Y-%m-%d") if row[5] else "",
                "hospital_name": "지정 병원",
                "status": row[4],
            }
            health_targets.append(target)

    except Exception as e:
        print(f"Health targets query error: {e}")
        health_targets = []

    return render_template(
        "admin/safework_health_checks.html",
        total_targets=total_targets,
        completed_count=completed_count,
        scheduled_count=scheduled_count,
        completion_rate=completion_rate,
        health_plans=health_plans,
        health_targets=health_targets,
        health_results=health_results,
    )


@health_bp.route("/safework/medical-visits")
@admin_required
def safework_medical_visits():
    """SafeWork 의무실 방문 관리"""
    track_page_view("safework_medical_visits")
    track_admin_action("VIEW_MEDICAL_VISITS")

    try:
        # 실제 통계 데이터
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        month_start = datetime.now().replace(day=1).date()

        # 오늘 방문 수
        today_visits_query = db.session.execute(
            text(
                """
            SELECT COUNT(*) FROM safework_medical_visits
            WHERE visit_date::date = :today
        """
            ),
            {"today": today},
        )
        today_visits = today_visits_query.fetchone()[0] if today_visits_query else 0

        # 이번 주 방문 수
        week_visits_query = db.session.execute(
            text(
                """
            SELECT COUNT(*) FROM safework_medical_visits
            WHERE visit_date::date >= :week_ago
        """
            ),
            {"week_ago": week_ago},
        )
        week_visits = week_visits_query.fetchone()[0] if week_visits_query else 0

        # 이번 달 방문 수
        month_visits_query = db.session.execute(
            text(
                """
            SELECT COUNT(*) FROM safework_medical_visits
            WHERE visit_date::date >= :month_start
        """
            ),
            {"month_start": month_start},
        )
        month_visits = month_visits_query.fetchone()[0] if month_visits_query else 0

        # 추적관찰 필요한 경우 수
        followup_query = db.session.execute(
            text(
                """
            SELECT COUNT(*) FROM safework_medical_visits
            WHERE follow_up_needed = 1 AND (follow_up_date IS NULL OR follow_up_date >= CURRENT_DATE)
        """
            )
        )
        followup_needed = followup_query.fetchone()[0] if followup_query else 0

        # 실제 의무실 방문 기록 조회
        medical_visits_query = db.session.execute(
            text(
                """
            SELECT smv.id, smv.visit_date, sw.name, sw.department,
                   smv.chief_complaint, smv.treatment_notes,
                   smv.follow_up_needed, smv.follow_up_date
            FROM safework_medical_visits smv
            JOIN safework_workers sw ON smv.worker_id = sw.id
            ORDER BY smv.visit_date DESC
            LIMIT 20
        """
            )
        )

        medical_visits = []
        for row in medical_visits_query:
            visit = {
                "id": row[0],
                "visit_date": row[1].strftime("%Y-%m-%d %H:%M") if row[1] else "",
                "name": row[2] or "",
                "department": row[3] or "미지정",
                "reason": row[4] or "일반 상담",
                "treatment": row[5] or "경과관찰",
                "follow_up_needed": bool(row[6]) if row[6] is not None else False,
                "follow_up_date": row[7].strftime("%Y-%m-%d") if row[7] else None,
                "status": "FOLLOW_UP" if row[6] else "COMPLETED",
            }
            medical_visits.append(visit)

        # 근로자 목록 (의무실 방문 등록용)
        workers_query = db.session.execute(
            text(
                """
            SELECT id, name, employee_number FROM safework_workers
            WHERE is_active = true
            ORDER BY employee_number
            LIMIT 50
        """
            )
        )

        workers = []
        for row in workers_query:
            workers.append(
                {"id": row[0], "name": row[1] or "", "employee_number": row[2] or ""}
            )

    except Exception as e:
        print(f"Medical visits query error: {e}")
        # 에러 발생 시 기본값 사용
        today_visits = 0
        week_visits = 0
        month_visits = 0
        followup_needed = 0
        medical_visits = []
        workers = []

    return render_template(
        "admin/safework_medical_visits.html",
        today_visits=today_visits,
        week_visits=week_visits,
        month_visits=month_visits,
        followup_needed=followup_needed,
        medical_visits=medical_visits,
        workers=workers,
    )
