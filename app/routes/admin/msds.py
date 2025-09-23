"""
MSDS Management Module
MSDS 관리 및 화학물질 안전 기능
"""
from datetime import datetime
from flask import Blueprint, render_template, request, flash, redirect, url_for
from sqlalchemy import or_
from models import db, MSDSModel, MSDSComponentModel, MSDSUsageRecordModel
from utils.activity_tracker import track_admin_action, track_page_view
from . import admin_required

msds_bp = Blueprint("msds", __name__)


@msds_bp.route("/safework/msds")
@admin_required
def safework_msds():
    """MSDS 관리"""
    track_page_view("safework_msds")
    msds_list = [
        {
            "id": 1,
            "chemical_name": "톨루엔",
            "cas_number": "108-88-3",
            "supplier": "한국화학",
            "last_updated": "2024-01-01",
            "expiry_date": "2027-01-01",
            "usage_department": "생산부",
            "hazard_level": "HIGH",
            "storage_location": "화학물질창고 A-1",
        },
        {
            "id": 2,
            "chemical_name": "아세톤",
            "cas_number": "67-64-1",
            "supplier": "대한케미칼",
            "last_updated": "2024-01-15",
            "expiry_date": "2027-01-15",
            "usage_department": "품질관리부",
            "hazard_level": "MEDIUM",
            "storage_location": "화학물질창고 B-2",
        },
    ]
    return render_template("admin/safework_msds.html", msds_list=msds_list)


@msds_bp.route("/safework/protective-equipment")
@admin_required
def safework_protective_equipment():
    """보호구 관리"""
    track_page_view("safework_protective_equipment")
    equipment = [
        {
            "id": 1,
            "name": "안전헬멧",
            "category": "머리보호구",
            "total_quantity": 150,
            "distributed": 142,
            "available": 8,
            "last_inspection": "2024-01-10",
            "next_inspection": "2024-04-10",
            "replacement_cycle": "2년",
            "status": "NORMAL",
        },
        {
            "id": 2,
            "name": "안전화",
            "category": "발보호구",
            "total_quantity": 200,
            "distributed": 195,
            "available": 5,
            "last_inspection": "2024-01-15",
            "next_inspection": "2024-04-15",
            "replacement_cycle": "1년",
            "status": "LOW_STOCK",
        },
    ]
    return render_template(
        "admin/safework_protective_equipment.html", equipment=equipment
    )


@msds_bp.route("/safework/education")
@admin_required
def safework_education():
    """교육 이수 현황 관리"""
    track_page_view("safework_education")
    education_stats = {
        "total_workers": 245,
        "completed_safety": 230,
        "completed_health": 225,
        "completion_rate_safety": 93.9,
        "completion_rate_health": 91.8,
    }

    education_records = [
        {
            "id": 1,
            "worker_name": "김철수",
            "employee_number": "2024001",
            "department": "생산부",
            "education_type": "안전교육",
            "completed_date": "2024-01-10",
            "valid_until": "2024-12-31",
            "instructor": "안전관리자",
            "hours": 4,
            "status": "COMPLETED",
        },
        {
            "id": 2,
            "worker_name": "이영희",
            "employee_number": "2024002",
            "department": "품질관리부",
            "education_type": "보건교육",
            "completed_date": "2024-01-15",
            "valid_until": "2024-12-31",
            "instructor": "보건관리자",
            "hours": 3,
            "status": "COMPLETED",
        },
    ]

    return render_template(
        "admin/safework_education.html",
        education_stats=education_stats,
        education_records=education_records,
    )


@msds_bp.route("/safework/certifications")
@admin_required
def safework_certifications():
    """자격/면허 관리"""
    track_page_view("safework_certifications")
    certifications = [
        {
            "id": 1,
            "worker_name": "박지성",
            "employee_number": "2024001",
            "certification_name": "산업안전기사",
            "certification_number": "IS-2023-001",
            "issue_date": "2023-05-15",
            "expiry_date": "2028-05-14",
            "issuing_agency": "한국산업인력공단",
            "status": "VALID",
        },
        {
            "id": 2,
            "worker_name": "김연아",
            "employee_number": "2024002",
            "certification_name": "보건관리자",
            "certification_number": "HM-2022-015",
            "issue_date": "2022-03-20",
            "expiry_date": "2025-03-19",
            "issuing_agency": "한국산업인력공단",
            "status": "EXPIRING_SOON",
        },
    ]
    return render_template(
        "admin/safework_certifications.html", certifications=certifications
    )


@msds_bp.route("/safework/departments")
@admin_required
def safework_departments():
    """부서별 현황 관리"""
    track_page_view("safework_departments")
    department_stats = [
        {
            "department": "생산부",
            "total_workers": 85,
            "health_check_completed": 80,
            "education_completed": 82,
            "accident_count": 2,
            "high_risk_workers": 5,
            "completion_rate": 94.1,
        },
        {
            "department": "품질관리부",
            "total_workers": 45,
            "health_check_completed": 44,
            "education_completed": 45,
            "accident_count": 0,
            "high_risk_workers": 2,
            "completion_rate": 97.8,
        },
        {
            "department": "경영지원부",
            "total_workers": 35,
            "health_check_completed": 35,
            "education_completed": 34,
            "accident_count": 0,
            "high_risk_workers": 1,
            "completion_rate": 97.1,
        },
    ]
    return render_template(
        "admin/safework_departments.html", department_stats=department_stats
    )


# === MSDS Management Routes ===


@msds_bp.route("/msds")
@admin_required
def msds_dashboard():
    """MSDS 관리 대시보드"""
    track_page_view("msds_dashboard")
    track_admin_action("VIEW_MSDS_DASHBOARD")

    # 통계 데이터
    total_msds = MSDSModel.query.count()
    active_msds = MSDSModel.query.filter_by(status="active").count()
    special_management_count = MSDSModel.query.filter_by(
        is_special_management=True
    ).count()
    expired_msds = MSDSModel.query.filter(
        MSDSModel.next_review_date < datetime.now()
    ).count()

    # 최근 등록된 MSDS
    recent_msds = MSDSModel.query.order_by(MSDSModel.created_at.desc()).limit(10).all()

    # 특별관리물질 목록
    special_substances = MSDSModel.query.filter_by(is_special_management=True).all()

    stats = {
        "total_msds": total_msds,
        "active_msds": active_msds,
        "special_management_count": special_management_count,
        "expired_msds": expired_msds,
    }

    return render_template(
        "admin/msds_dashboard.html",
        stats=stats,
        recent_msds=recent_msds,
        special_substances=special_substances,
    )


@msds_bp.route("/msds/list")
@admin_required
def msds_list():
    """MSDS 목록 관리"""
    page = request.args.get("page", 1, type=int)
    search = request.args.get("search", "", type=str)
    status_filter = request.args.get("status", "all", type=str)
    special_filter = request.args.get("special", "all", type=str)

    query = MSDSModel.query

    # 검색 필터
    if search:
        query = query.filter(
            or_(
                MSDSModel.substance_name.ilike(f"%{search}%"),
                MSDSModel.cas_number.ilike(f"%{search}%"),
                MSDSModel.manufacturer.ilike(f"%{search}%"),
            )
        )

    # 상태 필터
    if status_filter != "all":
        query = query.filter(MSDSModel.status == status_filter)

    # 특별관리물질 필터
    if special_filter == "yes":
        query = query.filter(MSDSModel.is_special_management == True)
    elif special_filter == "no":
        query = query.filter(MSDSModel.is_special_management == False)

    pagination = query.order_by(MSDSModel.created_at.desc()).paginate(
        page=page, per_page=20, error_out=False
    )

    return render_template(
        "admin/msds_list.html",
        pagination=pagination,
        search=search,
        status_filter=status_filter,
        special_filter=special_filter,
    )


@msds_bp.route("/msds/create", methods=["GET", "POST"])
@admin_required
def msds_create():
    """MSDS 등록"""
    if request.method == "POST":
        try:
            # MSDS 데이터 생성
            msds = MSDSModel(
                substance_name=request.form.get("substance_name"),
                cas_number=request.form.get("cas_number"),
                manufacturer=request.form.get("manufacturer"),
                supplier=request.form.get("supplier"),
                hazard_classification=request.form.get("hazard_classification"),
                is_special_management=bool(request.form.get("is_special_management")),
                status="active",
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )

            db.session.add(msds)
            db.session.commit()

            track_admin_action(
                "CREATE_MSDS",
                details={"msds_id": msds.id, "substance_name": msds.substance_name},
            )

            flash("MSDS가 성공적으로 등록되었습니다.", "success")
            return redirect(url_for("admin.msds_list"))

        except Exception as e:
            db.session.rollback()
            flash(f"MSDS 등록 중 오류가 발생했습니다: {str(e)}", "error")

    return render_template("admin/msds_create.html")
