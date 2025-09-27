"""SafeWork API 라우트 (v2.0) - 확장된 API 엔드포인트"""

from datetime import datetime, date
from flask import Blueprint, jsonify, request, current_app as app
from flask_login import login_required, current_user
from sqlalchemy import text, func
from models import db, SlackWebhookConfigModel, SlackNotificationLogModel, kst_now, CompanyModel, ProcessModel
from models_safework_v2 import (
    SafeworkWorker,
    SafeworkHealthCheck,
    SafeworkMedicalVisit,
    SafeworkMedication,
    SafeworkMedicationLog,
    SafeworkHealthPlan,
)
from models_safework import SafeworkMsds

api_safework_bp = Blueprint("api_safework", __name__)


# 마스터 데이터 API (설문조사용)
@api_safework_bp.route("/companies", methods=["GET"])
def get_companies():
    """업체 목록 조회 (인증 불필요 - 설문조사용)"""
    try:
        companies = CompanyModel.query.filter_by(is_active=True).order_by(CompanyModel.display_order, CompanyModel.name).all()

        return jsonify({
            "success": True,
            "data": [
                {
                    "id": company.id,
                    "name": company.name,
                    "display_order": company.display_order
                }
                for company in companies
            ]
        })

    except Exception as e:
        app.logger.error(f"업체 목록 조회 오류: {e}")
        return jsonify({
            "success": False,
            "error": "업체 목록을 조회할 수 없습니다."
        }), 500


@api_safework_bp.route("/processes", methods=["GET"])
def get_processes():
    """공정 목록 조회 (인증 불필요 - 설문조사용)"""
    try:
        processes = ProcessModel.query.filter_by(is_active=True).order_by(ProcessModel.display_order, ProcessModel.name).all()

        return jsonify({
            "success": True,
            "data": [
                {
                    "id": process.id,
                    "name": process.name,
                    "description": process.description,
                    "display_order": process.display_order
                }
                for process in processes
            ]
        })

    except Exception as e:
        app.logger.error(f"공정 목록 조회 오류: {e}")
        return jsonify({
            "success": False,
            "error": "공정 목록을 조회할 수 없습니다."
        }), 500


# 근로자 관리 API
@api_safework_bp.route("/workers", methods=["GET"])
@login_required
def get_workers():
    """근로자 목록 조회"""
    try:
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        department = request.args.get("department")
        search = request.args.get("search")

        query = SafeworkWorker.query

        if department:
            query = query.filter_by(department=department)
        if search:
            query = query.filter(
                db.or_(
                    SafeworkWorker.name.contains(search),
                    SafeworkWorker.employee_number.contains(search),
                )
            )

        workers = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify(
            {
                "success": True,
                "data": [
                    {
                        "id": w.id,
                        "employee_number": w.employee_number,
                        "name": w.name,
                        "department": w.department,
                        "position": w.position,
                        "phone": w.phone,
                        "email": w.email,
                        "is_active": w.is_active,
                    }
                    for w in workers.items
                ],
                "total": workers.total,
                "page": page,
                "per_page": per_page,
            }
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@api_safework_bp.route("/workers", methods=["POST"])
@login_required
def create_worker():
    """근로자 등록"""
    try:
        data = request.get_json()

        # 중복 체크
        if SafeworkWorker.query.filter_by(
            employee_number=data["employee_number"]
        ).first():
            return jsonify({"success": False, "error": "이미 등록된 사번입니다."}), 400

        worker = SafeworkWorker(
            employee_number=data["employee_number"],
            name=data["name"],
            department=data.get("department"),
            position=data.get("position"),
            birth_date=datetime.strptime(data["birth_date"], "%Y-%m-%d").date()
            if data.get("birth_date")
            else None,
            gender=data.get("gender"),
            phone=data.get("phone"),
            email=data.get("email"),
            emergency_contact=data.get("emergency_contact"),
            emergency_relationship=data.get("emergency_relationship"),
            address=data.get("address"),
            hire_date=datetime.strptime(data["hire_date"], "%Y-%m-%d").date()
            if data.get("hire_date")
            else None,
            blood_type=data.get("blood_type"),
            medical_conditions=data.get("medical_conditions"),
            allergies=data.get("allergies"),
        )

        db.session.add(worker)
        db.session.commit()

        return (
            jsonify(
                {"success": True, "message": "근로자가 등록되었습니다.", "worker_id": worker.id}
            ),
            201,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@api_safework_bp.route("/workers/<int:worker_id>", methods=["PUT"])
@login_required
def update_worker(worker_id):
    """근로자 정보 수정"""
    try:
        worker = SafeworkWorker.query.get_or_404(worker_id)
        data = request.get_json()

        # 업데이트 가능한 필드들
        for field in [
            "name",
            "department",
            "position",
            "phone",
            "email",
            "emergency_contact",
            "emergency_relationship",
            "address",
            "blood_type",
            "medical_conditions",
            "allergies",
            "is_active",
        ]:
            if field in data:
                setattr(worker, field, data[field])

        # 날짜 필드 처리
        if "birth_date" in data and data["birth_date"]:
            worker.birth_date = datetime.strptime(data["birth_date"], "%Y-%m-%d").date()
        if "hire_date" in data and data["hire_date"]:
            worker.hire_date = datetime.strptime(data["hire_date"], "%Y-%m-%d").date()

        worker.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({"success": True, "message": "근로자 정보가 수정되었습니다."})

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


# 의무실 방문 기록 API
@api_safework_bp.route("/medical-visits", methods=["GET"])
@login_required
def get_medical_visits():
    """의무실 방문 기록 조회"""
    try:
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        worker_id = request.args.get("worker_id", type=int)

        query = SafeworkMedicalVisit.query.join(SafeworkWorker)

        if worker_id:
            query = query.filter(SafeworkMedicalVisit.worker_id == worker_id)
        if start_date:
            query = query.filter(SafeworkMedicalVisit.visit_date >= start_date)
        if end_date:
            query = query.filter(SafeworkMedicalVisit.visit_date <= end_date)

        visits = query.order_by(SafeworkMedicalVisit.visit_date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify(
            {
                "success": True,
                "data": [
                    {
                        "id": v.id,
                        "worker_name": v.worker.name,
                        "employee_number": v.worker.employee_number,
                        "department": v.worker.department,
                        "visit_date": v.visit_date.strftime("%Y-%m-%d %H:%M"),
                        "chief_complaint": v.chief_complaint,
                        "diagnosis": v.diagnosis,
                        "treatment": v.treatment,
                        "follow_up_needed": v.follow_up_needed,
                        "follow_up_date": v.follow_up_date.strftime("%Y-%m-%d")
                        if v.follow_up_date
                        else None,
                    }
                    for v in visits.items
                ],
                "total": visits.total,
                "page": page,
                "per_page": per_page,
            }
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@api_safework_bp.route("/medical-visits", methods=["POST"])
@login_required
def create_medical_visit():
    """의무실 방문 기록 생성"""
    try:
        data = request.get_json()

        visit = SafeworkMedicalVisit(
            worker_id=data["worker_id"],
            visit_date=datetime.strptime(data["visit_date"], "%Y-%m-%dT%H:%M"),
            chief_complaint=data.get("chief_complaint"),
            blood_pressure=data.get("blood_pressure"),
            heart_rate=data.get("heart_rate", type=int)
            if data.get("heart_rate")
            else None,
            body_temp=data.get("body_temp", type=float)
            if data.get("body_temp")
            else None,
            resp_rate=data.get("resp_rate", type=int)
            if data.get("resp_rate")
            else None,
            diagnosis=data.get("diagnosis"),
            treatment=data.get("treatment"),
            medication_given=data.get("medication_given"),
            follow_up_needed=data.get("follow_up_needed", False),
            follow_up_date=datetime.strptime(data["follow_up_date"], "%Y-%m-%d").date()
            if data.get("follow_up_date")
            else None,
            nurse_name=data.get("nurse_name", current_user.username),
            notes=data.get("notes"),
        )

        db.session.add(visit)
        db.session.commit()

        return (
            jsonify(
                {
                    "success": True,
                    "message": "의무실 방문 기록이 저장되었습니다.",
                    "visit_id": visit.id,
                }
            ),
            201,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


# 의약품 관리 API
@api_safework_bp.route("/medications", methods=["GET"])
@login_required
def get_medications():
    """의약품 목록 조회"""
    try:
        category = request.args.get("category")
        stock_status = request.args.get("stock_status")

        query = SafeworkMedication.query

        if category:
            query = query.filter_by(category=category)

        medications = query.all()

        # 재고 상태 필터링
        if stock_status:
            filtered = []
            for med in medications:
                if stock_status == "out" and med.current_stock == 0:
                    filtered.append(med)
                elif (
                    stock_status == "low" and 0 < med.current_stock <= med.minimum_stock
                ):
                    filtered.append(med)
                elif stock_status == "normal" and med.current_stock > med.minimum_stock:
                    filtered.append(med)
            medications = filtered

        return jsonify(
            {
                "success": True,
                "data": [
                    {
                        "id": m.id,
                        "name": m.name,
                        "category": m.category,
                        "unit": m.unit,
                        "current_stock": m.current_stock,
                        "minimum_stock": m.minimum_stock,
                        "expiry_date": m.expiry_date.strftime("%Y-%m-%d")
                        if m.expiry_date
                        else None,
                        "is_expired": m.expiry_date < datetime.now().date()
                        if m.expiry_date
                        else False,
                        "stock_status": "out"
                        if m.current_stock == 0
                        else "low"
                        if m.current_stock <= m.minimum_stock
                        else "normal",
                    }
                    for m in medications
                ],
            }
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@api_safework_bp.route("/medications", methods=["POST"])
@login_required
def create_medication():
    """의약품 등록"""
    try:
        data = request.get_json()

        medication = SafeworkMedication(
            name=data["name"],
            category=data.get("category"),
            unit=data.get("unit"),
            current_stock=data.get("current_stock", 0),
            minimum_stock=data.get("minimum_stock", 0),
            expiry_date=datetime.strptime(data["expiry_date"], "%Y-%m-%d").date()
            if data.get("expiry_date")
            else None,
            supplier=data.get("supplier"),
            price_per_unit=data.get("price_per_unit", type=float)
            if data.get("price_per_unit")
            else None,
            location=data.get("location"),
            notes=data.get("notes"),
        )

        db.session.add(medication)
        db.session.commit()

        return (
            jsonify(
                {
                    "success": True,
                    "message": "의약품이 등록되었습니다.",
                    "medication_id": medication.id,
                }
            ),
            201,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@api_safework_bp.route("/medications/<int:med_id>/adjust-stock", methods=["POST"])
@login_required
def adjust_medication_stock(med_id):
    """의약품 재고 조정"""
    try:
        medication = SafeworkMedication.query.get_or_404(med_id)
        data = request.get_json()

        adjust_type = data["adjust_type"]  # in, out, use, disposal
        quantity = int(data["quantity"])

        # 재고 조정
        if adjust_type == "in":
            medication.current_stock += quantity
        else:
            if medication.current_stock < quantity:
                return jsonify({"success": False, "error": "재고가 부족합니다."}), 400
            medication.current_stock -= quantity

        # 로그 기록
        log = SafeworkMedicationLog(
            medication_id=med_id,
            worker_id=data.get("worker_id"),
            action_type=adjust_type,
            quantity=quantity,
            reason=data.get("reason"),
            performed_by=current_user.username,
        )

        medication.updated_at = datetime.utcnow()
        db.session.add(log)
        db.session.commit()

        return jsonify(
            {
                "success": True,
                "message": "재고가 조정되었습니다.",
                "new_stock": medication.current_stock,
            }
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


# 건강검진 관리 API
@api_safework_bp.route("/health-checks", methods=["POST"])
@login_required
def create_health_check():
    """건강검진 기록 생성"""
    try:
        data = request.get_json()

        health_check = SafeworkHealthCheck(
            worker_id=data["worker_id"],
            check_type=data.get("check_type"),
            check_date=datetime.strptime(data["check_date"], "%Y-%m-%d").date(),
            hospital=data.get("hospital"),
            result=data.get("result"),
            blood_pressure=data.get("blood_pressure"),
            blood_sugar=data.get("blood_sugar"),
            cholesterol=data.get("cholesterol"),
            bmi=data.get("bmi", type=float) if data.get("bmi") else None,
            vision_left=data.get("vision_left"),
            vision_right=data.get("vision_right"),
            hearing_left=data.get("hearing_left"),
            hearing_right=data.get("hearing_right"),
            chest_xray=data.get("chest_xray"),
            findings=data.get("findings"),
            recommendations=data.get("recommendations"),
            next_check_date=datetime.strptime(
                data["next_check_date"], "%Y-%m-%d"
            ).date()
            if data.get("next_check_date")
            else None,
        )

        db.session.add(health_check)
        db.session.commit()

        return (
            jsonify(
                {
                    "success": True,
                    "message": "건강검진 기록이 저장되었습니다.",
                    "check_id": health_check.id,
                }
            ),
            201,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


# 대시보드 통계 API
@api_safework_bp.route("/dashboard/stats", methods=["GET"])
@login_required
def get_dashboard_stats():
    """대시보드 통계 데이터"""
    try:
        # 근로자 통계
        total_workers = SafeworkWorker.query.filter_by(is_active=True).count()

        # 오늘 의무실 방문
        today = datetime.now().date()
        today_visits = SafeworkMedicalVisit.query.filter(
            db.func.date(SafeworkMedicalVisit.visit_date) == today
        ).count()

        # 이번달 건강검진
        current_month = datetime.now().month
        current_year = datetime.now().year
        month_checks = SafeworkHealthCheck.query.filter(
            db.extract("year", SafeworkHealthCheck.check_date) == current_year,
            db.extract("month", SafeworkHealthCheck.check_date) == current_month,
        ).count()

        # 재고 부족 의약품
        low_stock_meds = SafeworkMedication.query.filter(
            SafeworkMedication.current_stock <= SafeworkMedication.minimum_stock,
            SafeworkMedication.current_stock > 0,
        ).count()

        # 후속조치 필요
        followup_needed = SafeworkMedicalVisit.query.filter(
            SafeworkMedicalVisit.follow_up_needed == True,
            SafeworkMedicalVisit.follow_up_date >= today,
        ).count()

        return jsonify(
            {
                "success": True,
                "stats": {
                    "total_workers": total_workers,
                    "today_visits": today_visits,
                    "month_checks": month_checks,
                    "low_stock_meds": low_stock_meds,
                    "followup_needed": followup_needed,
                },
            }
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# 고급 의약품 재고 관리 API
@api_safework_bp.route("/medications/alerts", methods=["GET"])
@login_required
def get_medication_alerts():
    """의약품 재고 알림 조회 (재고 부족, 유효기간 임박)"""
    try:
        # 재고 부족 의약품
        low_stock = db.session.execute(
            text(
                """
            SELECT id, name, current_stock, minimum_stock, 
                   CASE 
                       WHEN current_stock = 0 THEN 'out_of_stock'
                       WHEN current_stock <= minimum_stock THEN 'low_stock'
                       ELSE 'normal'
                   END as alert_type
            FROM safework_medications 
            WHERE current_stock <= minimum_stock AND is_active = 1
            ORDER BY current_stock ASC
        """
            )
        ).fetchall()

        # 유효기간 임박 의약품 (30일 이내)
        expiring_soon = db.session.execute(
            text(
                """
            SELECT id, name, expiry_date, current_stock,
                   DATEDIFF(expiry_date, CURDATE()) as days_until_expiry
            FROM safework_medications 
            WHERE expiry_date IS NOT NULL 
            AND expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            AND current_stock > 0 AND is_active = 1
            ORDER BY expiry_date ASC
        """
            )
        ).fetchall()

        # 이미 만료된 의약품
        expired = db.session.execute(
            text(
                """
            SELECT id, name, expiry_date, current_stock
            FROM safework_medications 
            WHERE expiry_date < CURDATE() AND current_stock > 0 AND is_active = 1
            ORDER BY expiry_date ASC
        """
            )
        ).fetchall()

        return jsonify(
            {
                "success": True,
                "data": {
                    "low_stock": [dict(row._mapping) for row in low_stock],
                    "expiring_soon": [dict(row._mapping) for row in expiring_soon],
                    "expired": [dict(row._mapping) for row in expired],
                    "total_alerts": len(low_stock) + len(expiring_soon) + len(expired),
                },
            }
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@api_safework_bp.route("/medications/usage-analytics", methods=["GET"])
@login_required
def get_medication_usage_analytics():
    """의약품 사용량 분석"""
    try:
        # 최근 30일 사용량
        days = request.args.get("days", 30, type=int)

        usage_data = db.session.execute(
            text(
                """
            SELECT 
                m.id,
                m.name,
                m.category,
                COUNT(ml.id) as usage_count,
                SUM(CASE WHEN ml.action_type = 'use' THEN ml.quantity ELSE 0 END) as total_used,
                AVG(CASE WHEN ml.action_type = 'use' THEN ml.quantity ELSE NULL END) as avg_per_use,
                MAX(ml.created_at) as last_used
            FROM safework_medications m
            LEFT JOIN safework_medication_logs ml ON m.id = ml.medication_id 
                AND ml.created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
                AND ml.action_type = 'use'
            WHERE m.is_active = 1
            GROUP BY m.id, m.name, m.category
            ORDER BY total_used DESC
        """
            ),
            {"days": days},
        ).fetchall()

        # 카테고리별 사용량
        category_usage = db.session.execute(
            text(
                """
            SELECT 
                m.category,
                COUNT(ml.id) as usage_count,
                SUM(CASE WHEN ml.action_type = 'use' THEN ml.quantity ELSE 0 END) as total_used
            FROM safework_medications m
            LEFT JOIN safework_medication_logs ml ON m.id = ml.medication_id 
                AND ml.created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
                AND ml.action_type = 'use'
            WHERE m.is_active = 1 AND m.category IS NOT NULL
            GROUP BY m.category
            ORDER BY total_used DESC
        """
            ),
            {"days": days},
        ).fetchall()

        return jsonify(
            {
                "success": True,
                "data": {
                    "medication_usage": [dict(row._mapping) for row in usage_data],
                    "category_usage": [dict(row._mapping) for row in category_usage],
                    "period_days": days,
                },
            }
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@api_safework_bp.route("/medications/auto-reorder-suggestions", methods=["GET"])
@login_required
def get_auto_reorder_suggestions():
    """자동 재주문 제안"""
    try:
        # 사용 패턴을 기반으로 재주문 제안
        suggestions = db.session.execute(
            text(
                """
            WITH usage_stats AS (
                SELECT 
                    m.id,
                    m.name,
                    m.current_stock,
                    m.minimum_stock,
                    m.supplier,
                    m.price_per_unit,
                    AVG(CASE WHEN ml.action_type = 'use' THEN ml.quantity ELSE 0 END) as avg_daily_usage,
                    COUNT(CASE WHEN ml.action_type = 'use' THEN ml.id ELSE NULL END) / 30.0 as usage_frequency
                FROM safework_medications m
                LEFT JOIN safework_medication_logs ml ON m.id = ml.medication_id 
                    AND ml.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                WHERE m.is_active = 1
                GROUP BY m.id
            )
            SELECT 
                *,
                CASE 
                    WHEN avg_daily_usage > 0 THEN 
                        CEIL(current_stock / (avg_daily_usage * usage_frequency))
                    ELSE 999
                END as estimated_days_remaining,
                CASE 
                    WHEN avg_daily_usage > 0 THEN
                        CEIL((avg_daily_usage * usage_frequency * 60) - current_stock)
                    ELSE minimum_stock * 2
                END as suggested_order_quantity
            FROM usage_stats
            WHERE current_stock <= minimum_stock * 1.5 
               OR (avg_daily_usage > 0 AND current_stock / (avg_daily_usage * usage_frequency) <= 14)
            ORDER BY estimated_days_remaining ASC
        """
            )
        ).fetchall()

        return jsonify(
            {"success": True, "data": [dict(row._mapping) for row in suggestions]}
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@api_safework_bp.route("/medications/<int:med_id>/set-auto-reorder", methods=["POST"])
@login_required
def set_medication_auto_reorder(med_id):
    """의약품 자동 재주문 설정"""
    try:
        medication = SafeworkMedication.query.get_or_404(med_id)
        data = request.get_json()

        # 자동 재주문 설정 업데이트
        medication.auto_reorder_enabled = data.get("enabled", False)
        medication.reorder_point = data.get("reorder_point", medication.minimum_stock)
        medication.reorder_quantity = data.get("reorder_quantity")
        medication.preferred_supplier = data.get(
            "preferred_supplier", medication.supplier
        )
        medication.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({"success": True, "message": "자동 재주문 설정이 업데이트되었습니다."})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@api_safework_bp.route("/medications/bulk-update-expiry", methods=["POST"])
@login_required
def bulk_update_medication_expiry():
    """의약품 유효기간 일괄 업데이트"""
    try:
        data = request.get_json()
        updates = data.get("updates", [])

        updated_count = 0
        for update in updates:
            medication = db.session.get(SafeworkMedication, update["id"])
            if medication:
                if update.get("expiry_date"):
                    medication.expiry_date = datetime.strptime(
                        update["expiry_date"], "%Y-%m-%d"
                    ).date()
                    medication.updated_at = datetime.utcnow()
                    updated_count += 1

        db.session.commit()

        return jsonify(
            {"success": True, "message": f"{updated_count}개 의약품의 유효기간이 업데이트되었습니다."}
        )
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@api_safework_bp.route("/medications/inventory-valuation", methods=["GET"])
@login_required
def get_inventory_valuation():
    """의약품 재고 자산 평가"""
    try:
        valuation = db.session.execute(
            text(
                """
            SELECT 
                m.category,
                COUNT(m.id) as item_count,
                SUM(m.current_stock) as total_stock,
                SUM(m.current_stock * COALESCE(m.price_per_unit, 0)) as total_value,
                AVG(m.price_per_unit) as avg_price_per_unit,
                SUM(CASE WHEN m.current_stock <= m.minimum_stock THEN 1 ELSE 0 END) as low_stock_items,
                SUM(CASE WHEN m.expiry_date < CURDATE() THEN m.current_stock * COALESCE(m.price_per_unit, 0) ELSE 0 END) as expired_value
            FROM safework_medications m
            WHERE m.is_active = 1
            GROUP BY m.category
            WITH ROLLUP
        """
            )
        ).fetchall()

        # 만료 예정 의약품 가치
        expiring_value = db.session.execute(
            text(
                """
            SELECT 
                SUM(current_stock * COALESCE(price_per_unit, 0)) as expiring_value
            FROM safework_medications 
            WHERE expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            AND is_active = 1
        """
            )
        ).fetchone()

        return jsonify(
            {
                "success": True,
                "data": {
                    "category_breakdown": [dict(row._mapping) for row in valuation],
                    "expiring_within_30_days_value": expiring_value.expiring_value
                    if expiring_value.expiring_value
                    else 0,
                },
            }
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ========================================
# MSDS (물질안전보건자료) 관리 API
# ========================================


@api_safework_bp.route("/msds", methods=["GET"])
@login_required
def get_msds_list():
    """MSDS 목록 조회"""
    try:
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        search = request.args.get("search")
        hazard_level = request.args.get("hazard_level")
        status = request.args.get("status")
        department = request.args.get("department")
        expiring_soon = request.args.get("expiring_soon", type=bool)

        query = SafeworkMsds.query

        # 검색 조건
        if search:
            query = query.filter(
                db.or_(
                    SafeworkMsds.chemical_name.contains(search),
                    SafeworkMsds.cas_number.contains(search),
                    SafeworkMsds.product_name.contains(search),
                    SafeworkMsds.supplier.contains(search),
                )
            )

        # 위험도 필터
        if hazard_level:
            query = query.filter_by(hazard_level=hazard_level)

        # 상태 필터
        if status:
            query = query.filter_by(status=status)

        # 사용부서 필터
        if department:
            query = query.filter_by(usage_department=department)

        # 만료 임박 필터 (30일 이내)
        if expiring_soon:
            from datetime import timedelta

            warning_date = datetime.now().date() + timedelta(days=30)
            query = query.filter(SafeworkMsds.expiry_date <= warning_date)

        msds_list = query.order_by(SafeworkMsds.chemical_name).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify(
            {
                "success": True,
                "data": [msds.to_summary_dict() for msds in msds_list.items],
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": msds_list.total,
                    "pages": msds_list.pages,
                    "has_next": msds_list.has_next,
                    "has_prev": msds_list.has_prev,
                },
            }
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@api_safework_bp.route("/msds/<int:msds_id>", methods=["GET"])
@login_required
def get_msds_detail(msds_id):
    """MSDS 상세 정보 조회"""
    try:
        msds = SafeworkMsds.query.get_or_404(msds_id)
        return jsonify({"success": True, "data": msds.to_dict()})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@api_safework_bp.route("/msds", methods=["POST"])
@login_required
def create_msds():
    """새 MSDS 등록"""
    try:
        data = request.get_json()

        msds = SafeworkMsds(
            chemical_name=data["chemical_name"],
            cas_number=data.get("cas_number"),
            product_name=data.get("product_name"),
            supplier=data.get("supplier"),
            supplier_contact=data.get("supplier_contact"),
            hazard_classification=data.get("hazard_classification"),
            signal_word=data.get("signal_word", "WARNING"),
            hazard_statements=data.get("hazard_statements"),
            precautionary_statements=data.get("precautionary_statements"),
            # 물리화학적 특성
            appearance=data.get("appearance"),
            odor=data.get("odor"),
            ph_value=data.get("ph_value"),
            melting_point=data.get("melting_point"),
            boiling_point=data.get("boiling_point"),
            flash_point=data.get("flash_point"),
            auto_ignition_temp=data.get("auto_ignition_temp"),
            # 사용 및 관리 정보
            usage_department=data.get("usage_department"),
            usage_purpose=data.get("usage_purpose"),
            storage_location=data.get("storage_location"),
            storage_conditions=data.get("storage_conditions"),
            handling_precautions=data.get("handling_precautions"),
            # 응급조치 정보
            first_aid_inhalation=data.get("first_aid_inhalation"),
            first_aid_skin=data.get("first_aid_skin"),
            first_aid_eye=data.get("first_aid_eye"),
            first_aid_ingestion=data.get("first_aid_ingestion"),
            # 소화 정보
            extinguishing_media=data.get("extinguishing_media"),
            unsuitable_extinguishing_media=data.get("unsuitable_extinguishing_media"),
            fire_fighting_measures=data.get("fire_fighting_measures"),
            # 누출사고시 대처방법
            personal_precautions=data.get("personal_precautions"),
            environmental_precautions=data.get("environmental_precautions"),
            containment_cleanup=data.get("containment_cleanup"),
            # 노출방지 및 개인보호구
            exposure_limits=data.get("exposure_limits"),
            engineering_controls=data.get("engineering_controls"),
            personal_protective_equipment=data.get("personal_protective_equipment"),
            # 안정성 및 반응성
            chemical_stability=data.get("chemical_stability"),
            reactivity=data.get("reactivity"),
            incompatible_materials=data.get("incompatible_materials"),
            # 독성학적 정보
            acute_toxicity=data.get("acute_toxicity"),
            skin_corrosion=data.get("skin_corrosion"),
            eye_damage=data.get("eye_damage"),
            respiratory_sensitisation=data.get("respiratory_sensitisation"),
            skin_sensitisation=data.get("skin_sensitisation"),
            carcinogenicity=data.get("carcinogenicity"),
            reproductive_toxicity=data.get("reproductive_toxicity"),
            # 생태독성 정보
            aquatic_toxicity=data.get("aquatic_toxicity"),
            persistence_degradability=data.get("persistence_degradability"),
            bioaccumulation=data.get("bioaccumulation"),
            mobility=data.get("mobility"),
            # 폐기 정보
            waste_disposal=data.get("waste_disposal"),
            contaminated_packaging=data.get("contaminated_packaging"),
            # 운송 정보
            un_number=data.get("un_number"),
            proper_shipping_name=data.get("proper_shipping_name"),
            transport_hazard_class=data.get("transport_hazard_class"),
            packing_group=data.get("packing_group"),
            # 법적 규제현황
            industrial_safety_act=data.get("industrial_safety_act"),
            chemical_control_act=data.get("chemical_control_act"),
            dangerous_goods_act=data.get("dangerous_goods_act"),
            # 문서 관리 정보
            msds_version=data.get("msds_version"),
            revision_date=datetime.strptime(data["revision_date"], "%Y-%m-%d").date()
            if data.get("revision_date")
            else None,
            prepared_by=data.get("prepared_by"),
            last_updated=datetime.strptime(data["last_updated"], "%Y-%m-%d").date()
            if data.get("last_updated")
            else None,
            expiry_date=datetime.strptime(data["expiry_date"], "%Y-%m-%d").date()
            if data.get("expiry_date")
            else None,
            document_path=data.get("document_path"),
            # 상태 및 메타데이터
            status=data.get("status", "ACTIVE"),
            approval_status=data.get("approval_status", "PENDING"),
            hazard_level=data.get("hazard_level", "MEDIUM"),
            risk_assessment_score=data.get("risk_assessment_score"),
            # 사용량 추적
            annual_usage_amount=data.get("annual_usage_amount"),
            usage_unit=data.get("usage_unit"),
            inventory_amount=data.get("inventory_amount"),
            # 감사 정보
            created_by=current_user.username,
            updated_by=current_user.username,
        )

        db.session.add(msds)
        db.session.commit()

        return (
            jsonify({"success": True, "message": "MSDS가 등록되었습니다.", "msds_id": msds.id}),
            201,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@api_safework_bp.route("/msds/<int:msds_id>", methods=["PUT"])
@login_required
def update_msds(msds_id):
    """MSDS 정보 수정"""
    try:
        msds = SafeworkMsds.query.get_or_404(msds_id)
        data = request.get_json()

        # 업데이트할 필드들
        updateable_fields = [
            "chemical_name",
            "cas_number",
            "product_name",
            "supplier",
            "supplier_contact",
            "hazard_classification",
            "signal_word",
            "hazard_statements",
            "precautionary_statements",
            "appearance",
            "odor",
            "ph_value",
            "melting_point",
            "boiling_point",
            "flash_point",
            "auto_ignition_temp",
            "usage_department",
            "usage_purpose",
            "storage_location",
            "storage_conditions",
            "handling_precautions",
            "first_aid_inhalation",
            "first_aid_skin",
            "first_aid_eye",
            "first_aid_ingestion",
            "extinguishing_media",
            "unsuitable_extinguishing_media",
            "fire_fighting_measures",
            "personal_precautions",
            "environmental_precautions",
            "containment_cleanup",
            "exposure_limits",
            "engineering_controls",
            "personal_protective_equipment",
            "chemical_stability",
            "reactivity",
            "incompatible_materials",
            "acute_toxicity",
            "skin_corrosion",
            "eye_damage",
            "respiratory_sensitisation",
            "skin_sensitisation",
            "carcinogenicity",
            "reproductive_toxicity",
            "aquatic_toxicity",
            "persistence_degradability",
            "bioaccumulation",
            "mobility",
            "waste_disposal",
            "contaminated_packaging",
            "un_number",
            "proper_shipping_name",
            "transport_hazard_class",
            "packing_group",
            "industrial_safety_act",
            "chemical_control_act",
            "dangerous_goods_act",
            "msds_version",
            "prepared_by",
            "document_path",
            "status",
            "approval_status",
            "hazard_level",
            "risk_assessment_score",
            "annual_usage_amount",
            "usage_unit",
            "inventory_amount",
        ]

        # 날짜 필드 처리
        date_fields = ["revision_date", "last_updated", "expiry_date", "approved_date"]

        for field in updateable_fields:
            if field in data:
                setattr(msds, field, data[field])

        for field in date_fields:
            if field in data and data[field]:
                setattr(msds, field, datetime.strptime(data[field], "%Y-%m-%d").date())

        # 승인 정보 처리
        if data.get("approval_status") == "APPROVED":
            msds.approved_by = current_user.username
            msds.approved_date = datetime.now().date()

        msds.updated_by = current_user.username
        msds.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({"success": True, "message": "MSDS 정보가 업데이트되었습니다."})

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@api_safework_bp.route("/msds/<int:msds_id>", methods=["DELETE"])
@login_required
def delete_msds(msds_id):
    """MSDS 삭제 (비활성화)"""
    try:
        msds = SafeworkMsds.query.get_or_404(msds_id)

        # 실제 삭제 대신 상태를 변경
        msds.status = "EXPIRED"
        msds.updated_by = current_user.username
        msds.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({"success": True, "message": "MSDS가 삭제되었습니다."})

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@api_safework_bp.route("/msds/alerts", methods=["GET"])
@login_required
def get_msds_alerts():
    """MSDS 알림 조회 (만료 예정, 만료됨)"""
    try:
        from datetime import timedelta

        today = datetime.now().date()
        warning_date = today + timedelta(days=30)

        # 만료 예정 MSDS (30일 이내)
        expiring_soon = (
            SafeworkMsds.query.filter(
                SafeworkMsds.expiry_date.between(today, warning_date),
                SafeworkMsds.status == "ACTIVE",
            )
            .order_by(SafeworkMsds.expiry_date)
            .all()
        )

        # 이미 만료된 MSDS
        expired = (
            SafeworkMsds.query.filter(
                SafeworkMsds.expiry_date < today, SafeworkMsds.status == "ACTIVE"
            )
            .order_by(SafeworkMsds.expiry_date)
            .all()
        )

        # 승인 대기 중인 MSDS
        pending_approval = (
            SafeworkMsds.query.filter(
                SafeworkMsds.approval_status == "PENDING",
                SafeworkMsds.status == "ACTIVE",
            )
            .order_by(SafeworkMsds.created_at.desc())
            .all()
        )

        # 고위험 물질
        high_risk = (
            SafeworkMsds.query.filter(
                SafeworkMsds.hazard_level.in_(["HIGH", "VERY_HIGH"]),
                SafeworkMsds.status == "ACTIVE",
            )
            .order_by(SafeworkMsds.hazard_level.desc())
            .all()
        )

        return jsonify(
            {
                "success": True,
                "data": {
                    "expiring_soon": [msds.to_summary_dict() for msds in expiring_soon],
                    "expired": [msds.to_summary_dict() for msds in expired],
                    "pending_approval": [
                        msds.to_summary_dict() for msds in pending_approval
                    ],
                    "high_risk": [msds.to_summary_dict() for msds in high_risk],
                    "total_alerts": len(expiring_soon)
                    + len(expired)
                    + len(pending_approval),
                },
            }
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@api_safework_bp.route("/msds/statistics", methods=["GET"])
@login_required
def get_msds_statistics():
    """MSDS 통계"""
    try:
        # 전체 통계
        total_msds = SafeworkMsds.query.filter_by(status="ACTIVE").count()

        # 위험도별 통계
        hazard_stats = (
            db.session.query(
                SafeworkMsds.hazard_level, func.count(SafeworkMsds.id).label("count")
            )
            .filter_by(status="ACTIVE")
            .group_by(SafeworkMsds.hazard_level)
            .all()
        )

        # 부서별 통계
        dept_stats = (
            db.session.query(
                SafeworkMsds.usage_department,
                func.count(SafeworkMsds.id).label("count"),
            )
            .filter_by(status="ACTIVE")
            .group_by(SafeworkMsds.usage_department)
            .all()
        )

        # 상태별 통계
        status_stats = (
            db.session.query(
                SafeworkMsds.status, func.count(SafeworkMsds.id).label("count")
            )
            .group_by(SafeworkMsds.status)
            .all()
        )

        # 승인 상태별 통계
        approval_stats = (
            db.session.query(
                SafeworkMsds.approval_status, func.count(SafeworkMsds.id).label("count")
            )
            .filter_by(status="ACTIVE")
            .group_by(SafeworkMsds.approval_status)
            .all()
        )

        # 만료 관련 통계
        today = datetime.now().date()
        expired_count = SafeworkMsds.query.filter(
            SafeworkMsds.expiry_date < today, SafeworkMsds.status == "ACTIVE"
        ).count()

        from datetime import timedelta

        expiring_soon_count = SafeworkMsds.query.filter(
            SafeworkMsds.expiry_date.between(today, today + timedelta(days=30)),
            SafeworkMsds.status == "ACTIVE",
        ).count()

        return jsonify(
            {
                "success": True,
                "data": {
                    "total_msds": total_msds,
                    "hazard_level_breakdown": [
                        {"level": row[0], "count": row[1]} for row in hazard_stats
                    ],
                    "department_breakdown": [
                        {"department": row[0], "count": row[1]}
                        for row in dept_stats
                        if row[0]
                    ],
                    "status_breakdown": [
                        {"status": row[0], "count": row[1]} for row in status_stats
                    ],
                    "approval_breakdown": [
                        {"status": row[0], "count": row[1]} for row in approval_stats
                    ],
                    "expiry_alerts": {
                        "expired": expired_count,
                        "expiring_soon": expiring_soon_count,
                    },
                },
            }
        )
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@api_safework_bp.route("/msds/<int:msds_id>/approve", methods=["POST"])
@login_required
def approve_msds(msds_id):
    """MSDS 승인"""
    try:
        msds = SafeworkMsds.query.get_or_404(msds_id)
        data = request.get_json()

        action = data.get("action", "approve")  # approve, reject

        if action == "approve":
            msds.approval_status = "APPROVED"
            msds.approved_by = current_user.username
            msds.approved_date = datetime.now().date()
            message = "MSDS가 승인되었습니다."
        elif action == "reject":
            msds.approval_status = "REJECTED"
            message = "MSDS가 반려되었습니다."
        else:
            return jsonify({"success": False, "error": "유효하지 않은 액션입니다."}), 400

        msds.updated_by = current_user.username
        msds.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({"success": True, "message": message})

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@api_safework_bp.route("/msds/bulk-update-status", methods=["POST"])
@login_required
def bulk_update_msds_status():
    """MSDS 상태 일괄 업데이트"""
    try:
        data = request.get_json()
        msds_ids = data.get("msds_ids", [])
        new_status = data.get("status")

        if not msds_ids or not new_status:
            return jsonify({"success": False, "error": "필수 데이터가 누락되었습니다."}), 400

        updated_count = SafeworkMsds.query.filter(SafeworkMsds.id.in_(msds_ids)).update(
            {
                "status": new_status,
                "updated_by": current_user.username,
                "updated_at": datetime.utcnow(),
            },
            synchronize_session=False,
        )

        db.session.commit()

        return jsonify(
            {
                "success": True,
                "message": f"{updated_count}개 MSDS의 상태가 업데이트되었습니다.",
                "updated_count": updated_count,
            }
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

# =============================================================================
# Slack 웹훅 관리 API
# =============================================================================

@api_safework_bp.route('/slack-webhooks', methods=['GET'])
@login_required
def get_slack_webhooks():
    """Slack 웹훅 설정 목록 조회"""
    try:
        webhooks = SlackWebhookConfigModel.query.all()
        return jsonify({
            'status': 'success',
            'data': [{
                'id': webhook.id,
                'name': webhook.name,
                'webhook_url': webhook.webhook_url,
                'channel': webhook.channel,
                'description': webhook.description,
                'is_active': webhook.is_active,
                'notify_survey_submission': webhook.notify_survey_submission,
                'notify_system_events': webhook.notify_system_events,
                'notify_errors': webhook.notify_errors,
                'created_at': webhook.created_at.isoformat() if webhook.created_at else None,
                'updated_at': webhook.updated_at.isoformat() if webhook.updated_at else None,
                'last_test_at': webhook.last_test_at.isoformat() if webhook.last_test_at else None,
                'test_status': webhook.test_status,
                'test_result_message': webhook.test_result_message
            } for webhook in webhooks]
        })
    except Exception as e:
        app.logger.error(f"Slack webhook 목록 조회 오류: {e}")
        return jsonify({
            'status': 'error',
            'message': f'Slack webhook 목록 조회 중 오류가 발생했습니다: {str(e)}'
        }), 500


@api_safework_bp.route('/slack-webhooks', methods=['POST'])
@login_required
def create_slack_webhook():
    """새로운 Slack 웹훅 설정 생성"""
    try:
        data = request.get_json()
        
        # 필수 필드 검증
        required_fields = ['name', 'webhook_url']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'status': 'error',
                    'message': f'{field} 필드는 필수입니다.'
                }), 400
        
        # Slack 웹훅 URL 형식 검증
        webhook_url = data['webhook_url']
        if not webhook_url.startswith('https://hooks.slack.com/'):
            return jsonify({
                'status': 'error',
                'message': '올바른 Slack 웹훅 URL 형식이 아닙니다.'
            }), 400
        
        # 새 웹훅 설정 생성
        webhook = SlackWebhookConfigModel(
            name=data['name'],
            webhook_url=webhook_url,
            channel=data.get('channel', '#general'),
            description=data.get('description', ''),
            is_active=data.get('is_active', True),
            notify_survey_submission=data.get('notify_survey_submission', True),
            notify_system_events=data.get('notify_system_events', True),
            notify_errors=data.get('notify_errors', True),
            created_by=current_user.username if hasattr(current_user, 'username') else 'admin'
        )
        
        db.session.add(webhook)
        db.session.commit()
        
        app.logger.info(f"새 Slack 웹훅 설정 생성됨: {webhook.name} (ID: {webhook.id})")
        
        return jsonify({
            'status': 'success',
            'message': 'Slack 웹훅 설정이 성공적으로 생성되었습니다.',
            'data': {
                'id': webhook.id,
                'name': webhook.name,
                'webhook_url': webhook.webhook_url,
                'channel': webhook.channel,
                'is_active': webhook.is_active
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Slack 웹훅 생성 오류: {e}")
        return jsonify({
            'status': 'error',
            'message': f'Slack 웹훅 생성 중 오류가 발생했습니다: {str(e)}'
        }), 500


@api_safework_bp.route('/slack-webhooks/<int:webhook_id>', methods=['PUT'])
@login_required
def update_slack_webhook(webhook_id):
    """Slack 웹훅 설정 수정"""
    try:
        webhook = SlackWebhookConfigModel.query.get_or_404(webhook_id)
        data = request.get_json()
        
        # 업데이트 가능한 필드들
        if 'name' in data:
            webhook.name = data['name']
        if 'webhook_url' in data:
            webhook_url = data['webhook_url']
            if not webhook_url.startswith('https://hooks.slack.com/'):
                return jsonify({
                    'status': 'error',
                    'message': '올바른 Slack 웹훅 URL 형식이 아닙니다.'
                }), 400
            webhook.webhook_url = webhook_url
        if 'channel' in data:
            webhook.channel = data['channel']
        if 'description' in data:
            webhook.description = data['description']
        if 'is_active' in data:
            webhook.is_active = data['is_active']
        if 'notify_survey_submission' in data:
            webhook.notify_survey_submission = data['notify_survey_submission']
        if 'notify_system_events' in data:
            webhook.notify_system_events = data['notify_system_events']
        if 'notify_errors' in data:
            webhook.notify_errors = data['notify_errors']
        
        webhook.updated_at = kst_now()
        webhook.updated_by = current_user.username if hasattr(current_user, 'username') else 'admin'
        
        db.session.commit()
        
        app.logger.info(f"Slack 웹훅 설정 업데이트됨: {webhook.name} (ID: {webhook.id})")
        
        return jsonify({
            'status': 'success',
            'message': 'Slack 웹훅 설정이 성공적으로 업데이트되었습니다.',
            'data': {
                'id': webhook.id,
                'name': webhook.name,
                'webhook_url': webhook.webhook_url,
                'channel': webhook.channel,
                'is_active': webhook.is_active,
                'updated_at': webhook.updated_at.isoformat()
            }
        })
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Slack 웹훅 업데이트 오류: {e}")
        return jsonify({
            'status': 'error',
            'message': f'Slack 웹훅 업데이트 중 오류가 발생했습니다: {str(e)}'
        }), 500


@api_safework_bp.route('/slack-webhooks/<int:webhook_id>', methods=['DELETE'])
@login_required
def delete_slack_webhook(webhook_id):
    """Slack 웹훅 설정 삭제"""
    try:
        webhook = SlackWebhookConfigModel.query.get_or_404(webhook_id)
        webhook_name = webhook.name
        
        db.session.delete(webhook)
        db.session.commit()
        
        app.logger.info(f"Slack 웹훅 설정 삭제됨: {webhook_name} (ID: {webhook_id})")
        
        return jsonify({
            'status': 'success',
            'message': f'Slack 웹훅 설정 "{webhook_name}"이 성공적으로 삭제되었습니다.'
        })
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Slack 웹훅 삭제 오류: {e}")
        return jsonify({
            'status': 'error',
            'message': f'Slack 웹훅 삭제 중 오류가 발생했습니다: {str(e)}'
        }), 500


@api_safework_bp.route('/slack-webhooks/<int:webhook_id>/test', methods=['POST'])
@login_required
def test_slack_webhook(webhook_id):
    """Slack 웹훅 테스트"""
    try:
        webhook = SlackWebhookConfigModel.query.get_or_404(webhook_id)
        
        # 테스트 메시지 발송
        test_message = {
            "text": f"SafeWork 시스템 웹훅 테스트",
            "attachments": [
                {
                    "color": "good",
                    "fields": [
                        {
                            "title": "웹훅 이름",
                            "value": webhook.name,
                            "short": True
                        },
                        {
                            "title": "채널",
                            "value": webhook.channel or "기본 채널",
                            "short": True
                        },
                        {
                            "title": "테스트 시간",
                            "value": kst_now().strftime("%Y-%m-%d %H:%M:%S KST"),
                            "short": False
                        }
                    ]
                }
            ]
        }
        
        import requests
        response = requests.post(
            webhook.webhook_url,
            json=test_message,
            timeout=10
        )
        
        # 테스트 결과 저장
        webhook.last_test_at = kst_now()
        if response.status_code == 200:
            webhook.test_status = 'success'
            webhook.test_result_message = '테스트 메시지 전송 성공'
            
            # 알림 로그 저장
            log = SlackNotificationLogModel(
                webhook_config_id=webhook.id,
                message_type='test',
                message_content=test_message['text'],
                status='sent',
                sent_at=kst_now(),
                response_status_code=response.status_code,
                response_body=response.text[:500]  # 응답 본문 일부 저장
            )
            db.session.add(log)
        else:
            webhook.test_status = 'failed'
            webhook.test_result_message = f'테스트 실패: HTTP {response.status_code}'
            
            # 실패 로그 저장
            log = SlackNotificationLogModel(
                webhook_config_id=webhook.id,
                message_type='test',
                message_content=test_message['text'],
                status='failed',
                sent_at=kst_now(),
                response_status_code=response.status_code,
                response_body=response.text[:500],
                error_message=f'HTTP {response.status_code}: {response.text[:200]}'
            )
            db.session.add(log)
        
        db.session.commit()
        
        return jsonify({
            'status': 'success' if response.status_code == 200 else 'error',
            'message': webhook.test_result_message,
            'data': {
                'webhook_id': webhook.id,
                'test_status': webhook.test_status,
                'test_time': webhook.last_test_at.isoformat(),
                'response_status_code': response.status_code
            }
        })
        
    except requests.exceptions.RequestException as e:
        # 네트워크 오류 처리
        webhook.test_status = 'failed'
        webhook.test_result_message = f'네트워크 오류: {str(e)}'
        webhook.last_test_at = kst_now()
        
        # 오류 로그 저장
        log = SlackNotificationLogModel(
            webhook_config_id=webhook.id,
            message_type='test',
            message_content='테스트 메시지',
            status='failed',
            sent_at=kst_now(),
            error_message=str(e)[:500]
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({
            'status': 'error',
            'message': f'웹훅 테스트 실패: {str(e)}',
            'data': {
                'webhook_id': webhook.id,
                'test_status': 'failed',
                'test_time': webhook.last_test_at.isoformat()
            }
        }), 500
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Slack 웹훅 테스트 오류: {e}")
        return jsonify({
            'status': 'error',
            'message': f'웹훅 테스트 중 오류가 발생했습니다: {str(e)}'
        }), 500


@api_safework_bp.route('/slack-webhooks/logs', methods=['GET'])
@login_required
def get_slack_notification_logs():
    """Slack 알림 로그 조회"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        webhook_id = request.args.get('webhook_id', type=int)
        status = request.args.get('status')
        message_type = request.args.get('message_type')
        
        query = SlackNotificationLogModel.query
        
        # 필터링
        if webhook_id:
            query = query.filter_by(webhook_config_id=webhook_id)
        if status:
            query = query.filter_by(status=status)
        if message_type:
            query = query.filter_by(message_type=message_type)
        
        # 최신순 정렬 및 페이지네이션
        logs = query.order_by(SlackNotificationLogModel.sent_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'status': 'success',
            'data': {
                'logs': [{
                    'id': log.id,
                    'webhook_name': log.webhook_config.name if log.webhook_config else '삭제된 웹훅',
                    'message_type': log.message_type,
                    'message_content': log.message_content[:100] + '...' if len(log.message_content) > 100 else log.message_content,
                    'status': log.status,
                    'sent_at': log.sent_at.isoformat() if log.sent_at else None,
                    'response_status_code': log.response_status_code,
                    'error_message': log.error_message
                } for log in logs.items],
                'pagination': {
                    'page': logs.page,
                    'pages': logs.pages,
                    'per_page': logs.per_page,
                    'total': logs.total,
                    'has_next': logs.has_next,
                    'has_prev': logs.has_prev
                }
            }
        })
        
    except Exception as e:
        app.logger.error(f"Slack 알림 로그 조회 오류: {e}")
        return jsonify({
            'status': 'error',
            'message': f'Slack 알림 로그 조회 중 오류가 발생했습니다: {str(e)}'
        }), 500
