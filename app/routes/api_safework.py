"""
SafeWork API Routes
산업안전보건 관리 시스템 API 엔드포인트
"""

from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required, current_user
from datetime import datetime, timedelta
from models import db
from models_safework import (
    Worker,
    Department,
    HealthCheckPlan,
    HealthCheckTarget,
    HealthCheckResult,
    MedicalVisit,
    Medication,
    EnvironmentMeasurementPlan,
    EnvironmentMeasurement,
)

api_safework_bp = Blueprint("api_safework", __name__)

# ========================================
# 대시보드 API
# ========================================


@api_safework_bp.route("/dashboard/overview", methods=["GET"])
@login_required
def dashboard_overview():
    """대시보드 전체 현황"""
    try:
        # 총 근로자 수
        total_workers = Worker.query.filter_by(status="ACTIVE").count()

        # 특별관리 대상자
        special_management = Worker.query.filter_by(
            is_special_management=True, status="ACTIVE"
        ).count()

        # 올해 건강검진 현황
        current_year = datetime.now().year
        health_plans = HealthCheckPlan.query.filter_by(year=current_year).all()

        total_target = sum(p.target_count for p in health_plans)
        total_completed = sum(p.completed_count for p in health_plans)
        completion_rate = (
            (total_completed / total_target * 100) if total_target > 0 else 0
        )

        # 최근 의무실 방문
        recent_visits = MedicalVisit.query.filter(
            MedicalVisit.visit_date >= datetime.now() - timedelta(days=30)
        ).count()

        # 재고 부족 의약품
        low_stock_meds = Medication.query.filter(
            Medication.current_stock <= Medication.minimum_stock
        ).count()

        # 작업환경측정 초과
        exceeded_measurements = EnvironmentMeasurement.query.filter(
            EnvironmentMeasurement.result.in_(["EXCEEDED", "ACTION_REQUIRED"])
        ).count()

        return jsonify(
            {
                "success": True,
                "data": {
                    "total_workers": total_workers,
                    "special_management": special_management,
                    "health_check": {
                        "target": total_target,
                        "completed": total_completed,
                        "rate": round(completion_rate, 1),
                    },
                    "recent_visits": recent_visits,
                    "low_stock_medications": low_stock_meds,
                    "exceeded_measurements": exceeded_measurements,
                },
            }
        )

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@api_safework_bp.route("/dashboard/alerts", methods=["GET"])
@login_required
def dashboard_alerts():
    """경고 및 알림 사항"""
    alerts = []

    # 건강검진 미수검자
    missed_checks = HealthCheckTarget.query.filter(
        HealthCheckTarget.status == "MISSED",
        HealthCheckTarget.scheduled_date < datetime.now().date(),
    ).count()

    if missed_checks > 0:
        alerts.append(
            {
                "type": "warning",
                "category": "health_check",
                "message": f"건강검진 미수검자 {missed_checks}명",
                "action": "/health-check/missed",
            }
        )

    # 의약품 유효기간 임박
    expiring_meds = Medication.query.filter(
        Medication.expiry_date <= datetime.now().date() + timedelta(days=30),
        Medication.expiry_date > datetime.now().date(),
    ).count()

    if expiring_meds > 0:
        alerts.append(
            {
                "type": "warning",
                "category": "medication",
                "message": f"유효기간 임박 의약품 {expiring_meds}종",
                "action": "/medications/expiring",
            }
        )

    # 사후관리 필요자
    follow_up_required = HealthCheckResult.query.filter_by(
        follow_up_required=True
    ).count()

    if follow_up_required > 0:
        alerts.append(
            {
                "type": "info",
                "category": "follow_up",
                "message": f"건강검진 사후관리 대상자 {follow_up_required}명",
                "action": "/health-check/follow-up",
            }
        )

    return jsonify({"success": True, "alerts": alerts})


# ========================================
# 근로자 관리 API
# ========================================


@api_safework_bp.route("/workers", methods=["GET"])
@login_required
def get_workers():
    """근로자 목록 조회"""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    department_id = request.args.get("department_id", type=int)
    is_special = request.args.get("is_special", type=bool)
    search = request.args.get("search", "")

    query = Worker.query.filter_by(status="ACTIVE")

    if department_id:
        query = query.filter_by(department_id=department_id)

    if is_special:
        query = query.filter_by(is_special_management=True)

    if search:
        query = query.filter(
            db.or_(
                Worker.name.contains(search), Worker.employee_number.contains(search)
            )
        )

    workers = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify(
        {
            "success": True,
            "data": [w.to_dict() for w in workers.items],
            "total": workers.total,
            "pages": workers.pages,
            "current_page": page,
        }
    )


@api_safework_bp.route("/workers/<int:worker_id>", methods=["GET"])
@login_required
def get_worker_detail(worker_id):
    """근로자 상세 정보"""
    worker = Worker.query.get_or_404(worker_id)

    # 최근 건강검진 결과
    latest_health_check = (
        HealthCheckResult.query.filter_by(worker_id=worker_id)
        .order_by(HealthCheckResult.check_date.desc())
        .first()
    )

    # 최근 의무실 방문
    recent_visits = (
        MedicalVisit.query.filter_by(worker_id=worker_id)
        .order_by(MedicalVisit.visit_date.desc())
        .limit(5)
        .all()
    )

    data = worker.to_dict()
    data["latest_health_check"] = (
        latest_health_check.to_dict() if latest_health_check else None
    )
    data["recent_visits"] = [v.to_dict() for v in recent_visits]

    return jsonify({"success": True, "data": data})


@api_safework_bp.route("/workers", methods=["POST"])
@login_required
def create_worker():
    """근로자 등록"""
    data = request.json

    # 중복 체크
    if Worker.query.filter_by(employee_number=data["employee_number"]).first():
        return jsonify({"success": False, "error": "이미 존재하는 사번입니다"}), 400

    worker = Worker(
        employee_number=data["employee_number"],
        name=data["name"],
        department_id=data.get("department_id"),
        position=data.get("position"),
        hire_date=datetime.strptime(data["hire_date"], "%Y-%m-%d").date()
        if data.get("hire_date")
        else None,
        birth_date=datetime.strptime(data["birth_date"], "%Y-%m-%d").date()
        if data.get("birth_date")
        else None,
        gender=data.get("gender"),
        phone=data.get("phone"),
        email=data.get("email"),
        blood_type=data.get("blood_type"),
    )

    db.session.add(worker)
    db.session.commit()

    return jsonify({"success": True, "data": worker.to_dict()}), 201


# ========================================
# 건강검진 관리 API
# ========================================


@api_safework_bp.route("/health-check/plans", methods=["GET"])
@login_required
def get_health_check_plans():
    """건강검진 계획 목록"""
    year = request.args.get("year", datetime.now().year, type=int)

    plans = HealthCheckPlan.query.filter_by(year=year).all()

    return jsonify({"success": True, "data": [p.to_dict() for p in plans]})


@api_safework_bp.route("/health-check/plans", methods=["POST"])
@login_required
def create_health_check_plan():
    """건강검진 계획 생성"""
    data = request.json

    plan = HealthCheckPlan(
        year=data["year"],
        type=data["type"],
        planned_date=datetime.strptime(data["planned_date"], "%Y-%m-%d").date()
        if data.get("planned_date")
        else None,
        description=data.get("description"),
    )

    db.session.add(plan)
    db.session.commit()

    # 대상자 자동 선정 (필요시)
    if data.get("auto_select_targets"):
        workers = Worker.query.filter_by(status="ACTIVE").all()
        for worker in workers:
            target = HealthCheckTarget(
                plan_id=plan.id,
                worker_id=worker.id,
                scheduled_date=plan.planned_date,
                status="SCHEDULED",
            )
            db.session.add(target)

        plan.target_count = len(workers)
        db.session.commit()

    return jsonify({"success": True, "data": plan.to_dict()}), 201


@api_safework_bp.route("/health-check/targets", methods=["GET"])
@login_required
def get_health_check_targets():
    """건강검진 대상자 목록"""
    plan_id = request.args.get("plan_id", type=int)
    status = request.args.get("status")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    query = HealthCheckTarget.query

    if plan_id:
        query = query.filter_by(plan_id=plan_id)

    if status:
        query = query.filter_by(status=status)

    targets = query.paginate(page=page, per_page=per_page, error_out=False)

    data = []
    for target in targets.items:
        target_dict = {
            "id": target.id,
            "worker_name": target.worker.name if target.worker else None,
            "worker_number": target.worker.employee_number if target.worker else None,
            "department": target.worker.department.name
            if target.worker and target.worker.department
            else None,
            "scheduled_date": target.scheduled_date.isoformat()
            if target.scheduled_date
            else None,
            "actual_date": target.actual_date.isoformat()
            if target.actual_date
            else None,
            "status": target.status,
        }
        data.append(target_dict)

    return jsonify(
        {
            "success": True,
            "data": data,
            "total": targets.total,
            "pages": targets.pages,
            "current_page": page,
        }
    )


@api_safework_bp.route("/health-check/results", methods=["POST"])
@login_required
def create_health_check_result():
    """건강검진 결과 입력"""
    data = request.json

    result = HealthCheckResult(
        target_id=data["target_id"],
        worker_id=data["worker_id"],
        check_date=datetime.strptime(data["check_date"], "%Y-%m-%d").date(),
        height=data.get("height"),
        weight=data.get("weight"),
        bmi=data.get("bmi"),
        blood_pressure_sys=data.get("blood_pressure_sys"),
        blood_pressure_dia=data.get("blood_pressure_dia"),
        vision_left=data.get("vision_left"),
        vision_right=data.get("vision_right"),
        hearing_left=data.get("hearing_left"),
        hearing_right=data.get("hearing_right"),
        chest_xray=data.get("chest_xray"),
        ecg=data.get("ecg"),
        blood_test=data.get("blood_test"),
        urine_test=data.get("urine_test"),
        overall_opinion=data.get("overall_opinion"),
        grade=data["grade"],
        follow_up_required=data.get("follow_up_required", False),
        follow_up_items=data.get("follow_up_items"),
    )

    db.session.add(result)

    # 대상자 상태 업데이트
    target = db.session.get(HealthCheckTarget, data["target_id"])
    if target:
        target.status = "COMPLETED"
        target.actual_date = result.check_date

        # 계획 완료 수 업데이트
        plan = target.plan
        if plan:
            plan.completed_count += 1

    db.session.commit()

    return jsonify({"success": True, "data": result.to_dict()}), 201


# ========================================
# 보건관리 API
# ========================================


@api_safework_bp.route("/medical-visits", methods=["GET"])
@login_required
def get_medical_visits():
    """의무실 방문 기록 조회"""
    worker_id = request.args.get("worker_id", type=int)
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    query = MedicalVisit.query

    if worker_id:
        query = query.filter_by(worker_id=worker_id)

    if date_from:
        query = query.filter(
            MedicalVisit.visit_date >= datetime.strptime(date_from, "%Y-%m-%d")
        )

    if date_to:
        query = query.filter(
            MedicalVisit.visit_date <= datetime.strptime(date_to, "%Y-%m-%d")
        )

    visits = query.order_by(MedicalVisit.visit_date.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify(
        {
            "success": True,
            "data": [v.to_dict() for v in visits.items],
            "total": visits.total,
            "pages": visits.pages,
            "current_page": page,
        }
    )


@api_safework_bp.route("/medical-visits", methods=["POST"])
@login_required
def create_medical_visit():
    """의무실 방문 기록 생성"""
    data = request.json

    visit = MedicalVisit(
        worker_id=data["worker_id"],
        visit_date=datetime.now(),
        chief_complaint=data.get("chief_complaint"),
        vital_signs=data.get("vital_signs"),
        diagnosis=data.get("diagnosis"),
        treatment=data.get("treatment"),
        medication_given=data.get("medication_given"),
        follow_up_needed=data.get("follow_up_needed", False),
        follow_up_date=datetime.strptime(data["follow_up_date"], "%Y-%m-%d").date()
        if data.get("follow_up_date")
        else None,
        nurse_id=current_user.id,
    )

    db.session.add(visit)
    db.session.commit()

    return jsonify({"success": True, "data": visit.to_dict()}), 201


@api_safework_bp.route("/medications", methods=["GET"])
@login_required
def get_medications():
    """의약품 목록 조회"""
    low_stock_only = request.args.get("low_stock_only", type=bool)
    expiring_only = request.args.get("expiring_only", type=bool)

    query = Medication.query

    if low_stock_only:
        query = query.filter(Medication.current_stock <= Medication.minimum_stock)

    if expiring_only:
        query = query.filter(
            Medication.expiry_date <= datetime.now().date() + timedelta(days=30)
        )

    medications = query.order_by(Medication.name).all()

    return jsonify({"success": True, "data": [m.to_dict() for m in medications]})


@api_safework_bp.route("/medications/<int:med_id>/dispense", methods=["POST"])
@login_required
def dispense_medication(med_id):
    """의약품 불출"""
    medication = Medication.query.get_or_404(med_id)
    data = request.json

    quantity = data.get("quantity", 1)

    if medication.current_stock < quantity:
        return jsonify({"success": False, "error": "재고가 부족합니다"}), 400

    medication.current_stock -= quantity
    db.session.commit()

    # 불출 기록 (필요시 별도 테이블에 기록)

    return jsonify(
        {
            "success": True,
            "data": medication.to_dict(),
            "message": f"{medication.name} {quantity}개 불출 완료",
        }
    )


# ========================================
# 작업환경 관리 API
# ========================================


@api_safework_bp.route("/environment/measurements", methods=["GET"])
@login_required
def get_environment_measurements():
    """작업환경측정 결과 조회"""
    department_id = request.args.get("department_id", type=int)
    factor_type = request.args.get("factor_type")
    result = request.args.get("result")

    query = EnvironmentMeasurement.query

    if department_id:
        query = query.filter_by(department_id=department_id)

    if factor_type:
        query = query.filter_by(factor_type=factor_type)

    if result:
        query = query.filter_by(result=result)

    measurements = query.order_by(EnvironmentMeasurement.measurement_date.desc()).all()

    return jsonify({"success": True, "data": [m.to_dict() for m in measurements]})


@api_safework_bp.route("/environment/measurements", methods=["POST"])
@login_required
def create_environment_measurement():
    """작업환경측정 결과 입력"""
    data = request.json

    measurement = EnvironmentMeasurement(
        plan_id=data.get("plan_id"),
        department_id=data.get("department_id"),
        measurement_date=datetime.strptime(data["measurement_date"], "%Y-%m-%d").date(),
        factor_type=data["factor_type"],
        factor_name=data["factor_name"],
        measurement_value=data["measurement_value"],
        unit=data["unit"],
        exposure_limit=data["exposure_limit"],
        result=data["result"],
        improvement_measures=data.get("improvement_measures"),
    )

    db.session.add(measurement)
    db.session.commit()

    return jsonify({"success": True, "data": measurement.to_dict()}), 201
