import json
from datetime import datetime

from flask import (Blueprint, current_app, flash, jsonify, redirect,
                   render_template, request, url_for, session)
from flask_login import current_user, login_required
# CSRF imports removed for survey testing
# from flask_wtf import FlaskForm  # REMOVED FOR SURVEY TESTING

# SurveyForm removed - using direct HTML forms now
from models import AuditLog, Survey, Company, Process, Role, db

survey_bp = Blueprint("survey", __name__)


def get_or_create_company(name):
    """회사명으로 Company 객체 찾기 또는 생성"""
    if not name or name.strip() == "":
        # 기본 회사 생성 또는 찾기
        name = "기타"
    
    company = Company.query.filter_by(name=name).first()
    if not company:
        try:
            company = Company(name=name, is_active=True)
            db.session.add(company)
            db.session.flush()  # ID 할당을 위해 flush
        except Exception as e:
            # Unique 제약 조건 위반시 롤백하고 재조회
            db.session.rollback()
            company = Company.query.filter_by(name=name).first()
            if not company:
                # 여전히 찾을 수 없으면 에러 발생
                current_app.logger.error(f"Failed to get or create company '{name}': {str(e)}")
                raise e
    return company.id


def get_or_create_process(name):
    """공정명으로 Process 객체 찾기 또는 생성"""
    if not name or name.strip() == "":
        # 기본 공정 생성 또는 찾기
        name = "기타"
    
    process = Process.query.filter_by(name=name).first()
    if not process:
        try:
            process = Process(name=name, is_active=True)
            db.session.add(process)
            db.session.flush()  # ID 할당을 위해 flush
        except Exception as e:
            # Unique 제약 조건 위반시 롤백하고 재조회
            db.session.rollback()
            process = Process.query.filter_by(name=name).first()
            if not process:
                # 여전히 찾을 수 없으면 에러 발생
                current_app.logger.error(f"Failed to get or create process '{name}': {str(e)}")
                raise e
    return process.id


def get_or_create_role(title):
    """직위/역할로 Role 객체 찾기 또는 생성"""
    if not title or title.strip() == "":
        # 기본 역할 생성 또는 찾기
        title = "기타"
    
    role = Role.query.filter_by(title=title).first()
    if not role:
        try:
            role = Role(title=title, is_active=True)
            db.session.add(role)
            db.session.flush()  # ID 할당을 위해 flush
        except Exception as e:
            # Unique 제약 조건 위반시 롤백하고 재조회
            db.session.rollback()
            role = Role.query.filter_by(title=title).first()
            if not role:
                # 여전히 찾을 수 없으면 에러 발생
                current_app.logger.error(f"Failed to get or create role '{title}': {str(e)}")
                raise e
    return role.id


@survey_bp.route("/new", methods=["GET", "POST"])
def new():
    """Redirect to musculoskeletal survey for backward compatibility"""
    return redirect(url_for("survey.musculoskeletal_symptom_survey"))


@survey_bp.route("/001_musculoskeletal_symptom_survey", methods=["GET", "POST"])
def musculoskeletal_symptom_survey():
    # CSRF 완전 우회 - 익명 설문조사용
    try:
        from flask import g
        g._csrf_disabled = True
    except:
        pass
    """근골격계 증상조사표 (001) - 로그인 불필요"""
    # Check if accessed via direct URL (kiosk mode)
    kiosk_mode = request.args.get('kiosk') == '1' or request.referrer is None or 'survey' not in (request.referrer or '')
    if request.method == 'POST':
        # 기본적으로 익명 사용자 ID 1을 사용
        user_id = 1  # 익명 사용자
        if current_user.is_authenticated:
            user_id = current_user.id

        # 새로운 구조의 근골격계 증상 데이터 처리
        musculo_details_json = request.form.get("musculo_details_json")
        musculo_details = []
        if musculo_details_json:
            try:
                musculo_details = json.loads(musculo_details_json)
            except json.JSONDecodeError:
                current_app.logger.warning("Invalid JSON musculo details data received")
        
        # 기존 호환성을 위한 부위별 데이터 딕셔너리 생성
        symptom_data_dict = {}
        for detail in musculo_details:
            part_name = detail.get('part', '')
            # 영어 부위명을 한글로 변환
            part_map = {
                'neck': '목',
                'shoulder': '어깨',
                'arm': '팔/팔꿈치', 
                'hand': '손/손목/손가락',
                'waist': '허리',
                'leg': '다리/발'
            }
            korean_part = part_map.get(part_name, part_name)
            
            # 기존 구조에 맞춰 데이터 변환
            symptom_data_dict[korean_part] = {
                'side': detail.get('side'),
                'duration': detail.get('duration'),
                'severity': detail.get('severity'), 
                'frequency': detail.get('frequency'),
                'last_week': detail.get('last_week'),
                'consequences': detail.get('consequences', []),
                'consequence_other': detail.get('consequence_other')
            }

        # 회사, 공정, 역할 처리
        company_name = request.form.get("company_custom") if request.form.get("company") == "__custom__" else request.form.get("company")
        process_name = request.form.get("process_custom") if request.form.get("process") == "__custom__" else request.form.get("process")
        role_name = request.form.get("role_custom") if request.form.get("role") == "__custom__" else request.form.get("role")

        # 데이터베이스 스키마에 맞춘 Survey 생성
        survey = Survey(
            user_id=user_id,
            form_type="001",
            # 실제 DB 필드만 사용
            name=request.form.get("name") or "익명",
            age=request.form.get("age", type=int) or 30,
            gender=request.form.get("gender") or "male", 
            department=request.form.get("department"),
            position=request.form.get("position"),
            employee_number=request.form.get("employee_number"),
            # 근골격계 증상 여부
            has_symptoms=request.form.get("current_symptom") == "예",
            work_years=request.form.get("work_years", type=int),
            work_months=request.form.get("work_months", type=int)
        )

        # 추가 증상 데이터를 JSON으로 저장 - 임시 비활성화 (DB 컬럼 없음)
        # symptoms_data = {
        #     "pain_frequency": request.form.get("pain_frequency"),
        #     "pain_timing": request.form.get("pain_timing"),  
        #     "pain_characteristics": request.form.get("pain_characteristics"),
        # }
        # survey.symptoms_data = symptoms_data

        try:
            db.session.add(survey)
            db.session.commit()

            # Redis에 캐시 - to_dict() 메서드 미정의로 인해 임시 비활성화
            # if hasattr(current_app, "redis"):
            #     cache_key = f"survey:{survey.id}"
            #     current_app.redis.setex(
            #         cache_key, 3600, json.dumps(survey.to_dict(), default=str)  # 1시간 캐시
            #     )
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Survey submission error: {str(e)}")
            flash(f"설문 제출 중 오류가 발생했습니다: {str(e)}", "error")
            return redirect(url_for("survey.musculoskeletal_symptom_survey"))

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
        if kiosk_mode:
            return redirect(url_for("survey.complete", id=survey.id, kiosk=1))
        return redirect(url_for("survey.complete", id=survey.id))

    return render_template("survey/001_musculoskeletal_symptom_survey.html", kiosk_mode=kiosk_mode)


@survey_bp.route("/002_new_employee_health_checkup_form", methods=["GET", "POST"])
def new_employee_health_checkup_form():
    """신규 입사자 건강검진 양식 (002) - 로그인 불필요"""
    # Check if accessed via direct URL (kiosk mode)
    kiosk_mode = request.args.get('kiosk') == '1' or request.referrer is None or 'survey' not in (request.referrer or '')
    if request.method == 'POST':
        # 기본적으로 익명 사용자 ID 1을 사용
        user_id = 1  # 익명 사용자
        if current_user.is_authenticated:
            user_id = current_user.id

        survey = Survey(
            user_id=user_id,
            form_type="002",  # 양식 타입 구분
            employee_number=request.form.get("employee_number"),
            name=request.form.get("name"),
            department=request.form.get("department"),
            position=request.form.get("position"),
            age=request.form.get("age", type=int),
            gender=request.form.get("gender"),
            work_years=request.form.get("work_years", type=int),
            work_months=request.form.get("work_months", type=int),
            # 기본 건강 정보
            height_cm=request.form.get("height_cm", type=float),
            weight_kg=request.form.get("weight_kg", type=float),
            blood_type=request.form.get("blood_type"),
            # 기존 질병 이력
            existing_conditions=request.form.get("existing_conditions"),
            medication_history=request.form.get("medication_history"),
            allergy_history=request.form.get("allergy_history")
        )

        db.session.add(survey)
        db.session.commit()

        flash("신규 입사자 건강검진 양식이 성공적으로 제출되었습니다.", "success")
        if kiosk_mode:
            return redirect(url_for("survey.complete", id=survey.id, kiosk=1))
        return redirect(url_for("survey.complete", id=survey.id))

    return render_template("survey/002_new_employee_health_checkup_form.html", kiosk_mode=kiosk_mode)


@survey_bp.route("/complete/<int:id>")
def complete(id):
    """제출 완료 페이지"""
    survey = Survey.query.get_or_404(id)
    kiosk_mode = request.args.get('kiosk') == '1'
    return render_template("survey/complete.html", survey=survey, kiosk_mode=kiosk_mode)


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
            user_id=1,  # API 제출은 익명 사용자 (user_id=1)
            form_type=data.get("form_type", "001"),
            name=data.get("name"),
            age=data.get("age"),
            gender=data.get("gender"),
            years_of_service=data.get("years_of_service", 0),
            employee_number=data.get("employee_number"),
            department=data.get("department"),
            position=data.get("position"),
            employee_id=data.get("employee_id"),
            work_years=data.get("work_years", 0),
            work_months=data.get("work_months", 0),
            has_symptoms=data.get("data", {}).get("has_symptoms", False),
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
