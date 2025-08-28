import json
from datetime import datetime

from flask import (Blueprint, current_app, flash, jsonify, redirect,
                   render_template, request, url_for)
from flask_login import current_user, login_required

from forms import SurveyForm
from models import AuditLog, Survey, db

survey_bp = Blueprint("survey", __name__)


@survey_bp.route("/001_musculoskeletal_symptom_survey", methods=["GET", "POST"])
def musculoskeletal_symptom_survey():
    """근골격계 증상조사표 (001) - 로그인 불필요"""
    form = SurveyForm()

    if form.validate_on_submit():
        # 기본적으로 익명 사용자 ID 1을 사용
        user_id = 1  # 익명 사용자
        if current_user.is_authenticated:
            user_id = current_user.id

        survey = Survey(
            user_id=user_id,
            employee_number=request.form.get("employee_number"),
            name=request.form.get("name"),
            department=request.form.get("department"),
            position=request.form.get("position"),
            age=request.form.get("age", type=int),
            gender=request.form.get("gender"),
            work_years=request.form.get("work_years", type=float),
            work_months=request.form.get("work_months", type=int),
            # 작업 정보
            work_type=request.form.get("work_type"),
            work_hours_per_day=request.form.get("work_hours_per_day", type=float),
            break_time_minutes=request.form.get("break_time_minutes", type=int),
            overtime_hours_per_week=request.form.get(
                "overtime_hours_per_week", type=float
            ),
            # 작업 형태
            work_posture=json.dumps(request.form.getlist("work_posture")),
            repetitive_motion=json.dumps(request.form.getlist("repetitive_motion")),
            heavy_lifting=request.form.get("heavy_lifting") == "true",
            lifting_weight_kg=request.form.get("lifting_weight_kg", type=float),
            # 목 증상
            neck_pain=request.form.get("neck_pain", 0, type=int),
            neck_symptoms=json.dumps(request.form.getlist("neck_symptoms")),
            neck_frequency=request.form.get("neck_frequency"),
            neck_duration=request.form.get("neck_duration"),
            neck_severity=request.form.get("neck_severity"),
            neck_work_impact=request.form.get("neck_work_impact"),
            neck_last_year=request.form.get("neck_last_year") == "true",
            neck_last_week=request.form.get("neck_last_week") == "true",
            # 어깨 증상
            shoulder_pain=request.form.get("shoulder_pain", 0, type=int),
            shoulder_left=request.form.get("shoulder_left") == "true",
            shoulder_right=request.form.get("shoulder_right") == "true",
            shoulder_both=request.form.get("shoulder_both") == "true",
            shoulder_symptoms=json.dumps(request.form.getlist("shoulder_symptoms")),
            shoulder_frequency=request.form.get("shoulder_frequency"),
            shoulder_duration=request.form.get("shoulder_duration"),
            shoulder_severity=request.form.get("shoulder_severity"),
            shoulder_work_impact=request.form.get("shoulder_work_impact"),
            shoulder_last_year=request.form.get("shoulder_last_year") == "true",
            shoulder_last_week=request.form.get("shoulder_last_week") == "true",
            # 팔/팔꿈치 증상
            arm_pain=request.form.get("arm_pain", 0, type=int),
            arm_left=request.form.get("arm_left") == "true",
            arm_right=request.form.get("arm_right") == "true",
            arm_both=request.form.get("arm_both") == "true",
            arm_symptoms=json.dumps(request.form.getlist("arm_symptoms")),
            arm_frequency=request.form.get("arm_frequency"),
            arm_duration=request.form.get("arm_duration"),
            arm_severity=request.form.get("arm_severity"),
            arm_work_impact=request.form.get("arm_work_impact"),
            arm_last_year=request.form.get("arm_last_year") == "true",
            arm_last_week=request.form.get("arm_last_week") == "true",
            # 손/손목/손가락 증상
            hand_pain=request.form.get("hand_pain", 0, type=int),
            hand_left=request.form.get("hand_left") == "true",
            hand_right=request.form.get("hand_right") == "true",
            hand_both=request.form.get("hand_both") == "true",
            hand_symptoms=json.dumps(request.form.getlist("hand_symptoms")),
            hand_frequency=request.form.get("hand_frequency"),
            hand_duration=request.form.get("hand_duration"),
            hand_severity=request.form.get("hand_severity"),
            hand_work_impact=request.form.get("hand_work_impact"),
            hand_last_year=request.form.get("hand_last_year") == "true",
            hand_last_week=request.form.get("hand_last_week") == "true",
            # 등 증상
            back_pain=request.form.get("back_pain", 0, type=int),
            back_symptoms=json.dumps(request.form.getlist("back_symptoms")),
            back_frequency=request.form.get("back_frequency"),
            back_duration=request.form.get("back_duration"),
            back_severity=request.form.get("back_severity"),
            back_work_impact=request.form.get("back_work_impact"),
            back_last_year=request.form.get("back_last_year") == "true",
            back_last_week=request.form.get("back_last_week") == "true",
            # 허리 증상
            waist_pain=request.form.get("waist_pain", 0, type=int),
            waist_symptoms=json.dumps(request.form.getlist("waist_symptoms")),
            waist_frequency=request.form.get("waist_frequency"),
            waist_duration=request.form.get("waist_duration"),
            waist_severity=request.form.get("waist_severity"),
            waist_work_impact=request.form.get("waist_work_impact"),
            waist_last_year=request.form.get("waist_last_year") == "true",
            waist_last_week=request.form.get("waist_last_week") == "true",
            # 다리/무릎/발 증상
            leg_pain=request.form.get("leg_pain", 0, type=int),
            leg_left=request.form.get("leg_left") == "true",
            leg_right=request.form.get("leg_right") == "true",
            leg_both=request.form.get("leg_both") == "true",
            leg_symptoms=json.dumps(request.form.getlist("leg_symptoms")),
            leg_frequency=request.form.get("leg_frequency"),
            leg_duration=request.form.get("leg_duration"),
            leg_severity=request.form.get("leg_severity"),
            leg_work_impact=request.form.get("leg_work_impact"),
            leg_last_year=request.form.get("leg_last_year") == "true",
            leg_last_week=request.form.get("leg_last_week") == "true",
            # 증상 발생 정보
            symptom_cause=request.form.get("symptom_cause"),
            # 치료 이력
            medical_treatment=request.form.get("medical_treatment") == "true",
            treatment_details=request.form.get("treatment_details"),
            treatment_duration_days=request.form.get(
                "treatment_duration_days", type=int
            ),
            current_treatment=request.form.get("current_treatment") == "true",
            # 작업 관련성
            work_related=request.form.get("work_related") == "true",
            work_related_details=request.form.get("work_related_details"),
            accident_related=request.form.get("accident_related") == "true",
            # 기타
            additional_notes=request.form.get("additional_notes"),
            ip_address=request.remote_addr,
            status="submitted",
        )

        # 추가 증상 데이터를 JSON으로 저장
        symptoms_data = {
            "pain_frequency": form.data.get("pain_frequency"),
            "pain_timing": form.data.get("pain_timing"),
            "pain_characteristics": form.data.get("pain_characteristics"),
        }
        survey.symptoms_data = symptoms_data

        db.session.add(survey)
        db.session.commit()

        # Redis에 캐시
        if hasattr(current_app, "redis"):
            cache_key = f"survey:{survey.id}"
            current_app.redis.setex(
                cache_key, 3600, json.dumps(survey.to_dict(), default=str)  # 1시간 캐시
            )

        # 감사 로그
        if current_user.is_authenticated:
            log = AuditLog(
                user_id=current_user.id,
                action="survey_submitted",
                target_type="survey",
                target_id=survey.id,
                details={"name": survey.name},
                ip_address=request.remote_addr,
                user_agent=request.user_agent.string,
            )
            db.session.add(log)
            db.session.commit()

        flash("증상조사표가 성공적으로 제출되었습니다.", "success")
        return redirect(url_for("survey.complete", id=survey.id))

    return render_template("survey/001_musculoskeletal_symptom_survey.html", form=form)


@survey_bp.route("/002_new_employee_health_checkup_form", methods=["GET", "POST"])
def new_employee_health_checkup_form():
    """신규 입사자 건강검진 양식 (002) - 로그인 불필요"""
    form = SurveyForm()

    if form.validate_on_submit():
        # 기본적으로 익명 사용자 ID 1을 사용
        user_id = 1  # 익명 사용자
        if current_user.is_authenticated:
            user_id = current_user.id

        survey = Survey(
            user_id=user_id,
            form_type="002_new_employee_health_checkup",  # 양식 타입 구분
            employee_number=request.form.get("employee_number"),
            name=request.form.get("name"),
            department=request.form.get("department"),
            position=request.form.get("position"),
            age=request.form.get("age", type=int),
            gender=request.form.get("gender"),
            work_years=request.form.get("work_years", type=float),
            work_months=request.form.get("work_months", type=int),
            # 기본 건강 정보
            height_cm=request.form.get("height_cm", type=float),
            weight_kg=request.form.get("weight_kg", type=float),
            blood_type=request.form.get("blood_type"),
            # 기존 질병 이력
            existing_conditions=json.dumps(request.form.getlist("existing_conditions")),
            medication_history=request.form.get("medication_history"),
            allergy_history=request.form.get("allergy_history"),
            # 추가 필드는 필요시 확장
        )

        db.session.add(survey)
        db.session.commit()

        flash("신규 입사자 건강검진 양식이 성공적으로 제출되었습니다.", "success")
        return redirect(url_for("survey.complete", id=survey.id))

    return render_template("survey/002_new_employee_health_checkup_form.html", form=form)


@survey_bp.route("/complete/<int:id>")
def complete(id):
    """제출 완료 페이지"""
    survey = Survey.query.get_or_404(id)
    return render_template("survey/complete.html", survey=survey)


@survey_bp.route("/my-surveys")
@login_required
def my_surveys():
    """내 제출 이력"""
    page = request.args.get("page", 1, type=int)
    surveys = (
        Survey.query.filter_by(user_id=current_user.id)
        .order_by(Survey.submission_date.desc())
        .paginate(page=page, per_page=10, error_out=False)
    )

    return render_template("survey/my_surveys.html", surveys=surveys)


@survey_bp.route("/admin")
@login_required
def admin_dashboard():
    """관리자 대시보드 - 제출된 모든 조사표 보기"""
    # 관리자 권한 체크 (필요시)
    # if not current_user.is_admin:
    #     flash("관리자 권한이 필요합니다.", "error")
    #     return redirect(url_for("main.index"))
    
    # 필터 파라미터
    form_type = request.args.get("form_type", "all")
    search_query = request.args.get("search", "")
    page = request.args.get("page", 1, type=int)
    
    # 기본 쿼리
    query = Survey.query
    
    # 양식 타입별 필터링
    if form_type == "001":
        query = query.filter(Survey.form_type.contains("001"))
    elif form_type == "002":
        query = query.filter(Survey.form_type.contains("002"))
    
    # 검색어 필터링
    if search_query:
        query = query.filter(
            db.or_(
                Survey.name.contains(search_query),
                Survey.employee_number.contains(search_query),
                Survey.department.contains(search_query)
            )
        )
    
    # 페이지네이션
    surveys = query.order_by(Survey.submission_date.desc()).paginate(
        page=page, per_page=20, error_out=False
    )
    
    # 통계 데이터
    total_001 = Survey.query.filter(Survey.form_type.contains("001")).count()
    total_002 = Survey.query.filter(Survey.form_type.contains("002")).count()
    
    return render_template(
        "survey/admin_dashboard.html",
        surveys=surveys,
        form_type=form_type,
        search_query=search_query,
        total_001=total_001,
        total_002=total_002
    )


@survey_bp.route("/admin/001_musculoskeletal")
@login_required
def admin_001_musculoskeletal():
    """관리자 - 001 근골격계 증상조사표 목록"""
    page = request.args.get("page", 1, type=int)
    
    surveys = Survey.query.filter(
        db.or_(
            Survey.form_type.contains("001"),
            Survey.form_type == None  # 기존 데이터 호환성
        )
    ).order_by(Survey.submission_date.desc()).paginate(
        page=page, per_page=20, error_out=False
    )
    
    return render_template(
        "survey/admin_001_list.html",
        surveys=surveys,
        title="근골격계 증상조사표 (001) 목록"
    )


@survey_bp.route("/admin/002_new_employee")
@login_required
def admin_002_new_employee():
    """관리자 - 002 신규 입사자 건강검진 양식 목록"""
    page = request.args.get("page", 1, type=int)
    
    surveys = Survey.query.filter(
        Survey.form_type.contains("002")
    ).order_by(Survey.submission_date.desc()).paginate(
        page=page, per_page=20, error_out=False
    )
    
    return render_template(
        "survey/admin_002_list.html",
        surveys=surveys,
        title="신규 입사자 건강검진 양식 (002) 목록"
    )


@survey_bp.route("/admin/survey/<int:id>")
@login_required
def admin_survey_detail(id):
    """관리자 - 조사표 상세 보기"""
    survey = Survey.query.get_or_404(id)
    
    return render_template(
        "survey/admin_detail.html",
        survey=survey
    )


@survey_bp.route("/admin/export/<form_type>")
@login_required
def admin_export(form_type):
    """관리자 - 데이터 엑셀 다운로드"""
    import pandas as pd
    from io import BytesIO
    from flask import send_file
    
    # 양식별 데이터 조회
    if form_type == "001":
        surveys = Survey.query.filter(
            db.or_(Survey.form_type.contains("001"), Survey.form_type == None)
        ).all()
    elif form_type == "002":
        surveys = Survey.query.filter(Survey.form_type.contains("002")).all()
    else:
        surveys = Survey.query.all()
    
    # DataFrame 생성
    data = []
    for survey in surveys:
        data.append({
            "제출일시": survey.submission_date,
            "사번": survey.employee_number,
            "이름": survey.name,
            "부서": survey.department,
            "직위": survey.position,
            "나이": survey.age,
            "성별": survey.gender,
            "근무연수": survey.work_years,
            # 추가 필드들...
        })
    
    df = pd.DataFrame(data)
    
    # 엑셀 파일 생성
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='조사표 데이터')
    
    output.seek(0)
    
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=f'survey_data_{form_type}_{datetime.now().strftime("%Y%m%d")}.xlsx'
    )


@survey_bp.route("/view/<int:id>")
@login_required
def view(id):
    """조사표 상세 보기"""
    survey = Survey.query.get_or_404(id)

    # 권한 체크: 본인 또는 관리자만 볼 수 있음
    if not current_user.is_admin and survey.user_id != current_user.id:
        flash("접근 권한이 없습니다.", "danger")
        return redirect(url_for("main.index"))

    return render_template("survey/view.html", survey=survey)


@survey_bp.route("/api/submit", methods=["POST"])
def api_submit():
    """API를 통한 제출 (외부 시스템 연동용)"""
    data = request.get_json()

    if not data:
        return jsonify({"error": "데이터가 없습니다."}), 400

    try:
        survey = Survey(
            user_id=None,  # API 제출은 익명
            employee_number=data.get("employee_number"),
            name=data.get("name"),
            department=data.get("department"),
            position=data.get("position"),
            age=data.get("age"),
            gender=data.get("gender"),
            work_years=data.get("work_years"),
            work_type=data.get("work_type"),
            work_hours_per_day=data.get("work_hours_per_day"),
            break_time_minutes=data.get("break_time_minutes"),
            neck_pain=data.get("neck_pain", 0),
            shoulder_pain=data.get("shoulder_pain", 0),
            arm_pain=data.get("arm_pain", 0),
            hand_pain=data.get("hand_pain", 0),
            back_pain=data.get("back_pain", 0),
            waist_pain=data.get("waist_pain", 0),
            leg_pain=data.get("leg_pain", 0),
            symptoms_data=data.get("symptoms_data"),
            ip_address=request.remote_addr,
            status="submitted",
        )

        db.session.add(survey)
        db.session.commit()

        return (
            jsonify(
                {
                    "success": True,
                    "survey_id": survey.id,
                    "message": "제출이 완료되었습니다.",
                }
            ),
            201,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
