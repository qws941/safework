import json
from datetime import datetime

from flask import (
    Blueprint,
    current_app,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    url_for,
    session,
    send_from_directory,
    abort,
)
from flask_login import current_user, login_required

# CSRF imports removed for survey testing
# from flask_wtf import FlaskForm  # REMOVED FOR SURVEY TESTING

# SurveyForm removed - using direct HTML forms now
from models import AuditLog, Survey, Company, Process, Role, db

# 슬랙 알림 기능 - HTML 원데이터 형식
from utils.slack_notifications import slack_notifier

# Activity tracking temporarily disabled due to missing module

survey_bp = Blueprint("survey", __name__)


@survey_bp.route("/")
def index():
    """설문 목록 페이지"""
    return """<!DOCTYPE html>
<html>
<head>
    <title>설문 목록 - SafeWork</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #2c3e50; }
        ul { list-style: none; padding: 0; }
        li { margin: 15px 0; }
        a { 
            display: block; 
            padding: 15px 20px; 
            background: #f8f9fa; 
            border-left: 4px solid #4CAF50; 
            text-decoration: none; 
            color: #2c3e50;
            border-radius: 5px;
            transition: background 0.2s;
        }
        a:hover { background: #e9ecef; }
        .new-badge { 
            background: #ff6b6b; 
            color: white; 
            padding: 3px 8px; 
            border-radius: 12px; 
            font-size: 12px; 
            margin-left: 10px; 
        }
        .enhanced-badge { 
            background: #4ecdc4; 
            color: white; 
            padding: 3px 8px; 
            border-radius: 12px; 
            font-size: 12px; 
            margin-left: 10px; 
        }
    </style>
</head>
<body>
<h1>🏥 SafeWork 설문 목록</h1>
<p>산업안전보건관리시스템 - 건강조사 설문</p>
<ul>
<li><a href="/survey/001_musculoskeletal_symptom_survey">📋 근골격계 증상조사표 (Form 001)</a></li>
<li><a href="/survey/002_new_employee_health_checkup_form">🩺 신규 입사자 건강검진표 (Form 002)</a></li>
<li><a href="/survey/003_musculoskeletal_program">📊 근골격계질환 예방관리 프로그램 조사표 (Form 003) <span class="new-badge">기본</span></a></li>
<li><a href="/survey/003_musculoskeletal_program_enhanced">🔬 근골격계질환 예방관리 프로그램 조사표 - 완전판 (Form 003 Enhanced) <span class="enhanced-badge">60+ 필드</span></a></li>
</ul>
<hr>
<p><small>© 2024 SafeWork v3.0.0 - 한국 산업안전보건관리시스템</small></p>
</body>
</html>"""

@survey_bp.route("/001", methods=["GET", "POST"])
def survey_001():
    """근골격계증상조사표 (001) - 단축 URL"""
    return redirect("/survey/001_musculoskeletal_symptom_survey")


@survey_bp.route("/002", methods=["GET", "POST"])
def survey_002():
    """신규입사자건강진단 (002) - 단축 URL"""  
    return redirect("/survey/002_new_employee_health_survey")


@survey_bp.route("/statistics")
def statistics():
    """설문 통계 페이지 (임시로 관리자 대시보드 사용)"""
    return redirect(url_for("admin.safework_dashboard"))


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
                current_app.logger.error(
                    f"Failed to get or create company '{name}': {str(e)}"
                )
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
                current_app.logger.error(
                    f"Failed to get or create process '{name}': {str(e)}"
                )
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
                current_app.logger.error(
                    f"Failed to get or create role '{title}': {str(e)}"
                )
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
    kiosk_mode = (
        request.args.get("kiosk") == "1"
        or request.referrer is None
        or "survey" not in (request.referrer or "")
    )
    if request.method == "POST":
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
            part_name = detail.get("part", "")
            # 영어 부위명을 한글로 변환
            part_map = {
                "neck": "목",
                "shoulder": "어깨",
                "arm": "팔/팔꿈치",
                "hand": "손/손목/손가락",
                "waist": "허리",
                "leg": "다리/발",
            }
            korean_part = part_map.get(part_name, part_name)

            # 기존 구조에 맞춰 데이터 변환
            symptom_data_dict[korean_part] = {
                "side": detail.get("side"),
                "duration": detail.get("duration"),
                "severity": detail.get("severity"),
                "frequency": detail.get("frequency"),
                "last_week": detail.get("last_week"),
                "consequences": detail.get("consequences", []),
                "consequence_other": detail.get("consequence_other"),
            }

        # 회사, 공정, 역할 처리
        company_name = (
            request.form.get("company_custom")
            if request.form.get("company") == "__custom__"
            else request.form.get("company")
        )
        process_name = (
            request.form.get("process_custom")
            if request.form.get("process") == "__custom__"
            else request.form.get("process")
        )
        role_name = (
            request.form.get("role_custom")
            if request.form.get("role") == "__custom__"
            else request.form.get("role")
        )

        # 모든 폼 데이터를 수집하여 responses JSON 필드에 저장
        all_form_data = {}
        for key, value in request.form.items():
            if key.endswith("[]"):
                # 리스트 형태 데이터 처리
                all_form_data[key] = request.form.getlist(key)
            else:
                all_form_data[key] = value

        # 근골격계 상세 데이터 추가
        if musculo_details:
            all_form_data["musculo_details"] = musculo_details
            all_form_data["symptom_data_dict"] = symptom_data_dict

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
            work_months=request.form.get("work_months", type=int),
            # 모든 설문 응답 데이터를 JSON으로 저장
            responses=all_form_data,
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

            # 🚀 RAW DATA 파일 생성 - 설문 제출마다 개별 파일 저장
            try:
                from utils.raw_data_exporter import export_survey_raw_data

                # JSON과 CSV 형태로 모두 저장
                exported_files = export_survey_raw_data(
                    survey_data=all_form_data,
                    survey_id=survey.id,
                    form_type="001",
                    format_types=["json", "csv"],
                )

                current_app.logger.info(
                    f"✅ Raw data files created for survey {survey.id}: {exported_files}"
                )

            except Exception as export_error:
                # Raw data 저장 오류해도 설문 제출은 완료로 처리
                current_app.logger.warning(
                    f"⚠️ Raw data export failed for survey {survey.id}: {str(export_error)}"
                )

            # 원본 설문지 HTML 저장
            original_html_path = None
            try:
                from utils.survey_html_saver import save_survey_original_html
                original_html_path = save_survey_original_html(all_form_data, survey.id, "001")
                current_app.logger.info(f"✅ Original survey HTML saved: {original_html_path}")
            except Exception as html_error:
                current_app.logger.warning(f"⚠️ Original HTML save failed for survey {survey.id}: {str(html_error)}")

            # HTML 보고서 URL 생성
            report_url = url_for('survey.survey_report', id=survey.id, _external=True)

            # 원본 HTML URL 생성 (새로운 커스텀 라우트 사용)
            original_html_url = None
            if original_html_path:
                # survey_originals/survey_001_123_20241219_143045.html -> survey_001_123_20241219_143045.html
                filename = original_html_path.split('/')[-1] if '/' in original_html_path else original_html_path
                original_html_url = url_for('survey.serve_original_survey', filename=filename, _external=True)

            # Slack 알림 전송 (HTML 보고서 URL 포함)
            try:
                from utils.slack_notifier import send_survey_slack_notification

                # 설문 데이터에 보고서 URL 추가
                survey_data_for_slack = {
                    'id': survey.id,
                    'form_type': survey.form_type,
                    'name': survey.name,
                    'age': survey.age,
                    'gender': survey.gender,
                    'department': survey.department,
                    'position': survey.position,
                    'report_url': report_url,
                    'original_html_url': original_html_url
                }

                send_survey_slack_notification(survey_data_for_slack)
                current_app.logger.info(f"✅ Slack notification sent for survey {survey.id} with report URL: {report_url}")

            except Exception as slack_error:
                current_app.logger.warning(f"⚠️ Slack notification failed for survey {survey.id}: {str(slack_error)}")

            # 설문 제출 추적
            # track_survey_submission(form_type="001", survey_id=survey.id, form_data=all_form_data)

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

        # 감사 로그 (임시 비활성화 - 프로덕션 스키마 호환성)
        # if current_user.is_authenticated:
        #     log = AuditLog(
        #         user_id=current_user.id,
        #         action="survey_submitted",
        #         details={"name": survey.name, "survey_id": survey.id},
        #     )
        #     db.session.add(log)
        #     db.session.commit()

        # 슬랙 알림 전송 (설문 제출 완료)
        try:
            survey_data = {
                'id': survey.id,
                'form_type': survey.form_type,
                'name': survey.name,
                'department': survey.department,
                'position': survey.position,
                'age': survey.age,
                'responses': all_form_data
            }
            send_survey_slack_notification(survey_data)
            current_app.logger.info(f"✅ 슬랙 알림 전송 완료: 설문 ID {survey.id}")
        except Exception as slack_error:
            current_app.logger.warning(f"⚠️ 슬랙 알림 전송 오류: {str(slack_error)}")

        flash("증상조사표가 완료되었습니다 제출되었습니다.", "success")
        if kiosk_mode:
            return redirect(url_for("survey.complete", id=survey.id, kiosk=1))
        return redirect(url_for("survey.complete", id=survey.id))

    # 페이지 조회 추적
    # track_page_view("001_musculoskeletal_symptom_survey")

    return render_template(
        "survey/001_musculoskeletal_symptom_survey.html", kiosk_mode=kiosk_mode
    )

@survey_bp.route("/002_new_employee_health_survey", methods=["GET", "POST"])
def new_employee_health_survey():
    """신규입사자건강진단 (002) - 로그인 불필요"""
    try:
        from flask import g
        g._csrf_disabled = True
    except:
        pass
    
    if request.method == "POST":
        try:
            # 폼 데이터 수집
            form_data = {
                "name": request.form.get("name", ""),
                "employee_number": request.form.get("employee_number", ""),
                "department": request.form.get("department", ""),
                "age": request.form.get("age", ""),
                "gender": request.form.get("gender", ""),
                "height": request.form.get("height", ""),
                "weight": request.form.get("weight", ""),
                "blood_pressure": request.form.get("blood_pressure", ""),
                "medical_history": request.form.get("medical_history", ""),
                "allergies": request.form.get("allergies", ""),
                "medications": request.form.get("medications", ""),
                "smoking": request.form.get("smoking", ""),
                "alcohol": request.form.get("alcohol", ""),
                "exercise": request.form.get("exercise", ""),
            }
            
            # 데이터베이스 저장
            survey = Survey(
                form_type="002",
                user_id=1,  # 익명 사용자
                responses=form_data
            )
            db.session.add(survey)
            db.session.commit()
            
            # 성공 응답
            return jsonify({
                "status": "success",
                "message": "신규입사자건강진단이 성공적으로 제출되었습니다."
            }), 201
            
        except Exception as e:
            db.session.rollback()
            return jsonify({
                "status": "error", 
                "message": f"제출 중 오류가 발생했습니다: {str(e)}"
            }), 500
    
    # GET 요청 - 폼 템플릿 반환
    return render_template("survey/002_new_employee_health.html")


@survey_bp.route("/002_new_employee_health_checkup_form", methods=["GET", "POST"])
def new_employee_health_checkup_form():
    """신규 입사자 건강검진 양식 (002) - 로그인 불필요"""
    # Check if accessed via direct URL (kiosk mode)
    kiosk_mode = (
        request.args.get("kiosk") == "1"
        or request.referrer is None
        or "survey" not in (request.referrer or "")
    )

    if request.method == "GET":
        # track_page_view("002_new_employee_health_checkup_form")
        pass

    if request.method == "POST":
        # 기본적으로 익명 사용자 ID 1을 사용
        user_id = 1  # 익명 사용자
        if current_user.is_authenticated:
            user_id = current_user.id

        # 모든 폼 데이터를 수집하여 responses JSON 필드에 저장
        all_form_data = {}
        for key, value in request.form.items():
            if key.endswith("[]"):
                # 리스트 형태 데이터 처리
                all_form_data[key] = request.form.getlist(key)
            else:
                all_form_data[key] = value

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
            allergy_history=request.form.get("allergy_history"),
            # 모든 설문 응답 데이터를 JSON으로 저장
            responses=all_form_data,
        )

        try:
            db.session.add(survey)
            db.session.commit()

            # 🚀 RAW DATA 파일 생성 - 설문 제출마다 개별 파일 저장
            try:
                from utils.raw_data_exporter import export_survey_raw_data

                # JSON과 CSV 형태로 모두 저장
                exported_files = export_survey_raw_data(
                    survey_data=all_form_data,
                    survey_id=survey.id,
                    form_type="002",
                    format_types=["json", "csv"],
                )

                current_app.logger.info(
                    f"✅ Raw data files created for survey {survey.id}: {exported_files}"
                )

            except Exception as export_error:
                # Raw data 저장 오류해도 설문 제출은 완료로 처리
                current_app.logger.warning(
                    f"⚠️ Raw data export failed for survey {survey.id}: {str(export_error)}"
                )

            # 설문 제출 추적
            # track_survey_submission(form_type="002", survey_id=survey.id, form_data=all_form_data)

            # 슬랙 알림 전송 (002 설문 제출 완료)
            try:
                survey_data = {
                    'id': survey.id,
                    'form_type': survey.form_type,
                    'name': survey.name,
                    'department': survey.department,
                    'position': survey.position,
                    'age': survey.age,
                    'responses': all_form_data
                }
                send_survey_slack_notification(survey_data)
                current_app.logger.info(f"✅ 슬랙 알림 전송 완료: 설문 ID {survey.id}")
            except Exception as slack_error:
                current_app.logger.warning(f"⚠️ 슬랙 알림 전송 오류: {str(slack_error)}")

            flash("신규 입사자 건강검진 양식이 완료되었습니다 제출되었습니다.", "success")
            if kiosk_mode:
                return redirect(url_for("survey.complete", id=survey.id, kiosk=1))
            return redirect(url_for("survey.complete", id=survey.id))

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Survey 002 submission error: {str(e)}")
            flash(f"설문 제출 중 오류가 발생했습니다: {str(e)}", "error")
            return redirect(url_for("survey.new_employee_health_checkup_form"))

    return render_template(
        "survey/002_new_employee_health_checkup_form.html", kiosk_mode=kiosk_mode
    )


@survey_bp.route("/003_musculoskeletal_program", methods=["GET", "POST"])
def musculoskeletal_program():
    """근골격계질환 예방관리 프로그램 조사표 (003) - 로그인 불필요"""
    # CSRF 완전 우회 - 익명 설문조사용
    try:
        from flask import g

        g._csrf_disabled = True
    except:
        pass

    # Check if accessed via direct URL (kiosk mode)
    kiosk_mode = (
        request.args.get("kiosk") == "1"
        or request.referrer is None
        or "survey" not in (request.referrer or "")
    )

    if request.method == "POST":
        # 기본적으로 익명 사용자 ID 1을 사용
        user_id = 1  # 익명 사용자
        if current_user.is_authenticated:
            user_id = current_user.id

        # 모든 폼 데이터를 수집하여 responses JSON 필드에 저장
        all_form_data = {}
        for key, value in request.form.items():
            if key.endswith("[]"):
                # 리스트 형태 데이터 처리
                all_form_data[key] = request.form.getlist(key)
            else:
                all_form_data[key] = value

        # 신체 부위별 통증 데이터 수집
        body_parts = ["neck", "shoulder", "arm_elbow", "hand_wrist", "back", "leg_foot"]
        body_part_data = {}

        for part in body_parts:
            body_part_data[part] = {
                "has_pain": request.form.get(f"{part}_pain") == "예",
                "pain_duration": request.form.get(f"{part}_duration"),
                "pain_intensity": request.form.get(f"{part}_intensity", type=int),
                "pain_frequency": request.form.get(f"{part}_frequency"),
                "daily_interference": request.form.get(f"{part}_interference"),
            }

        # 관리대상자 분류 계산
        management_classification = calculate_management_classification(body_part_data)

        # 데이터베이스 스키마에 맞춘 Survey 생성
        survey = Survey(
            user_id=user_id,
            form_type="003",
            # 기본 정보
            name=request.form.get("name") or "익명",
            age=request.form.get("age", type=int) or 30,
            gender=request.form.get("gender") or "male",
            department=request.form.get("department"),
            position=request.form.get("position"),
            employee_number=request.form.get("employee_number"),
            # 근무 정보
            work_years=request.form.get("work_experience", type=int),
            work_months=request.form.get("work_months", type=int),
            # 증상 여부 (6개 부위 중 하나라도 통증이 있으면 True)
            has_symptoms=any(data["has_pain"] for data in body_part_data.values()),
            # 모든 설문 응답 데이터를 JSON으로 저장
            responses=all_form_data,
        )

        # 상세 분석 데이터 추가
        survey.responses["body_parts_analysis"] = body_part_data
        survey.responses["management_classification"] = management_classification

        try:
            db.session.add(survey)
            db.session.commit()

            # 🚀 RAW DATA 파일 생성 - 설문 제출마다 개별 파일 저장
            try:
                from utils.raw_data_exporter import export_survey_raw_data

                # 분석 데이터 포함하여 저장
                complete_data = all_form_data.copy()
                complete_data["body_parts_analysis"] = body_part_data
                complete_data["management_classification"] = management_classification

                # JSON과 CSV 형태로 모두 저장
                exported_files = export_survey_raw_data(
                    survey_data=complete_data,
                    survey_id=survey.id,
                    form_type="003",
                    format_types=["json", "csv"],
                )

                current_app.logger.info(
                    f"✅ Raw data files created for survey {survey.id}: {exported_files}"
                )

            except Exception as export_error:
                # Raw data 저장 오류해도 설문 제출은 완료로 처리
                current_app.logger.warning(
                    f"⚠️ Raw data export failed for survey {survey.id}: {str(export_error)}"
                )

            # 원본 설문지 HTML 저장 (전체 데이터 포함)
            original_html_path = None
            try:
                from utils.survey_html_saver import save_survey_original_html
                # 분석 데이터 포함한 전체 데이터로 HTML 생성
                html_data = complete_data.copy()
                original_html_path = save_survey_original_html(html_data, survey.id, "003")
                current_app.logger.info(f"✅ Original survey HTML saved: {original_html_path}")
            except Exception as html_error:
                current_app.logger.warning(f"⚠️ Original HTML save failed for survey {survey.id}: {str(html_error)}")

            # HTML 보고서 URL 생성
            report_url = url_for('survey.survey_report', id=survey.id, _external=True)

            # 원본 HTML URL 생성 (새로운 커스텀 라우트 사용)
            original_html_url = None
            if original_html_path:
                # survey_originals/survey_001_123_20241219_143045.html -> survey_001_123_20241219_143045.html
                filename = original_html_path.split('/')[-1] if '/' in original_html_path else original_html_path
                original_html_url = url_for('survey.serve_original_survey', filename=filename, _external=True)

            # Slack 알림 전송 (HTML 보고서 URL 포함)
            try:
                from utils.slack_notifier import send_survey_slack_notification

                # 설문 데이터에 보고서 URL 추가
                survey_data_for_slack = {
                    'id': survey.id,
                    'form_type': survey.form_type,
                    'name': survey.name,
                    'age': survey.age,
                    'gender': survey.gender,
                    'department': survey.department,
                    'position': survey.position,
                    'management_classification': management_classification,
                    'report_url': report_url,
                    'original_html_url': original_html_url
                }

                send_survey_slack_notification(survey_data_for_slack)
                current_app.logger.info(f"✅ Slack notification sent for survey {survey.id} with report URL: {report_url}")

            except Exception as slack_error:
                current_app.logger.warning(f"⚠️ Slack notification failed for survey {survey.id}: {str(slack_error)}")

            flash("근골격계질환 예방관리 프로그램 조사표가 완료되었습니다 제출되었습니다.", "success")
            if kiosk_mode:
                return redirect(url_for("survey.complete", id=survey.id, kiosk=1))
            return redirect(url_for("survey.complete", id=survey.id))

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Survey 003 submission error: {str(e)}")
            flash(f"설문 제출 중 오류가 발생했습니다: {str(e)}", "error")
            return redirect(url_for("survey.musculoskeletal_program"))

    return render_template(
        "survey/003_musculoskeletal_program.html", kiosk_mode=kiosk_mode
    )


@survey_bp.route("/003_musculoskeletal_program_enhanced", methods=["GET", "POST"])
def musculoskeletal_program_enhanced():
    """근골격계질환 예방관리 프로그램 조사표 (003 Enhanced) - 60+ 필드 완전판"""
    # CSRF 완전 우회 - 익명 설문조사용
    try:
        from flask import g

        g._csrf_disabled = True
    except:
        pass

    # Check if accessed via direct URL (kiosk mode)
    kiosk_mode = (
        request.args.get("kiosk") == "1"
        or request.referrer is None
        or "survey" not in (request.referrer or "")
    )

    if request.method == "POST":
        # 기본적으로 익명 사용자 ID 1을 사용
        user_id = 1  # 익명 사용자
        if current_user.is_authenticated:
            user_id = current_user.id

        # 모든 폼 데이터를 수집하여 responses JSON 필드에 저장
        all_form_data = {}
        for key, value in request.form.items():
            if key.endswith("[]"):
                # 리스트 형태 데이터 처리
                all_form_data[key] = request.form.getlist(key)
            else:
                all_form_data[key] = value

        # 신체 부위별 통증 데이터 수집 (확장된 6개 부위)
        body_parts = ["neck", "shoulder", "arm_elbow", "hand_wrist", "back", "leg_foot"]
        body_part_data = {}

        for part in body_parts:
            body_part_data[part] = {
                "has_pain": request.form.get(f"{part}_pain") == "예",
                "pain_duration": request.form.get(f"{part}_duration"),
                "pain_intensity": request.form.get(f"{part}_intensity", type=int),
                "pain_frequency": request.form.get(f"{part}_frequency"),
                "daily_interference": request.form.get(f"{part}_interference"),
            }

        # 근무환경 위험요인 데이터 수집
        work_environment = {
            "work_posture": request.form.get("work_posture"),
            "work_duration": request.form.get("work_duration"),
            "repetitive_work": request.form.get("repetitive_work"),
            "heavy_lifting": request.form.get("heavy_lifting"),
            "vibration_exposure": request.form.get("vibration_exposure"),
            "work_stress": request.form.get("work_stress"),
            "work_environment_temp": request.form.get("work_environment_temp"),
            "workplace_lighting": request.form.get("workplace_lighting"),
        }

        # 추가 건강 정보 수집
        health_lifestyle = {
            "previous_injury": request.form.get("previous_injury"),
            "exercise_frequency": request.form.get("exercise_frequency"),
            "smoking_status": request.form.get("smoking_status"),
            "sleep_quality": request.form.get("sleep_quality"),
            "current_treatment": request.form.get("current_treatment"),
            "improvement_suggestions": request.form.get("improvement_suggestions"),
            "additional_comments": request.form.get("additional_comments"),
        }

        # 관리대상자 분류 계산 (기존 함수 재사용)
        management_classification = calculate_management_classification(body_part_data)

        # 위험도 점수 계산 (새로운 기능)
        risk_score = calculate_enhanced_risk_score(
            body_part_data, work_environment, health_lifestyle
        )

        # 데이터베이스 스키마에 맞춘 Survey 생성
        survey = Survey(
            user_id=user_id,
            form_type="003",
            # 기본 정보
            name=request.form.get("name") or "익명",
            age=request.form.get("age", type=int) or 30,
            gender=request.form.get("gender") or "남성",
            department=request.form.get("department"),
            position=request.form.get("position"),
            employee_number=request.form.get("employee_number"),
            # 근무 정보
            work_years=request.form.get("work_years", type=int),
            work_months=request.form.get("work_months", type=int),
            # 증상 여부 (6개 부위 중 하나라도 통증이 있으면 True)
            has_symptoms=any(data["has_pain"] for data in body_part_data.values()),
            # 모든 설문 응답 데이터를 JSON으로 저장
            responses=all_form_data,
        )

        # 상세 분석 데이터 추가
        survey.responses["body_parts_analysis"] = body_part_data
        survey.responses["work_environment_analysis"] = work_environment
        survey.responses["health_lifestyle_analysis"] = health_lifestyle
        survey.responses["management_classification"] = management_classification
        survey.responses["risk_score"] = risk_score
        survey.responses["form_version"] = "enhanced_v1.0"

        try:
            db.session.add(survey)
            db.session.commit()

            # 🚀 RAW DATA 파일 생성 - 설문 제출마다 개별 파일 저장
            try:
                from utils.raw_data_exporter import export_survey_raw_data

                # 완전한 분석 데이터 포함하여 저장
                complete_data = all_form_data.copy()
                complete_data["body_parts_analysis"] = body_part_data
                complete_data["work_environment_analysis"] = work_environment
                complete_data["health_lifestyle_analysis"] = health_lifestyle
                complete_data["management_classification"] = management_classification
                complete_data["risk_score"] = risk_score
                complete_data["form_version"] = "enhanced_v1.0"

                # JSON과 CSV 형태로 모두 저장
                exported_files = export_survey_raw_data(
                    survey_data=complete_data,
                    survey_id=survey.id,
                    form_type="003",
                    format_types=["json", "csv"],
                )

                current_app.logger.info(
                    f"✅ Raw data files created for survey {survey.id}: {exported_files}"
                )

            except Exception as export_error:
                # Raw data 저장 오류해도 설문 제출은 완료로 처리
                current_app.logger.warning(
                    f"⚠️ Raw data export failed for survey {survey.id}: {str(export_error)}"
                )

            flash("근골격계질환 예방관리 프로그램 조사표(완전판)가 완료되었습니다 제출되었습니다.", "success")
            if kiosk_mode:
                return redirect(url_for("survey.complete", id=survey.id, kiosk=1))
            return redirect(url_for("survey.complete", id=survey.id))

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Survey 003 Enhanced submission error: {str(e)}")
            flash(f"설문 제출 중 오류가 발생했습니다: {str(e)}", "error")
            return redirect(url_for("survey.musculoskeletal_program_enhanced"))

    return render_template(
        "survey/003_musculoskeletal_program_enhanced.html", kiosk_mode=kiosk_mode
    )


def calculate_enhanced_risk_score(body_part_data, work_environment, health_lifestyle):
    """향상된 위험도 점수 계산 함수"""
    risk_score = 0
    risk_factors = []

    # 신체 부위별 통증 점수 (기존 분류 기반)
    pain_count = sum(1 for data in body_part_data.values() if data["has_pain"])
    severe_pain_count = sum(
        1
        for data in body_part_data.values()
        if data["has_pain"] and str(data.get("pain_intensity", 0)) in ["8", "9", "10"]
    )

    risk_score += pain_count * 10  # 통증 부위당 10점
    risk_score += severe_pain_count * 15  # 심한 통증당 추가 15점

    if pain_count > 0:
        risk_factors.append(f"통증 부위 {pain_count}개소")
    if severe_pain_count > 0:
        risk_factors.append(f"심한 통증 {severe_pain_count}개소")

    # 작업환경 위험요인 점수
    work_risk_factors = {
        "work_posture": {"굽힌자세": 15, "쪼그린자세": 20, "높은곳작업": 10},
        "work_duration": {"4-6시간": 10, "6시간이상": 20},
        "repetitive_work": {"예": 15},
        "heavy_lifting": {"15-25kg": 15, "25kg이상": 25},
        "vibration_exposure": {"전신진동": 10, "국소진동": 15, "둘다": 25},
        "work_stress": {"높음": 10, "매우높음": 20},
    }

    for factor, value in work_environment.items():
        if factor in work_risk_factors and value in work_risk_factors[factor]:
            points = work_risk_factors[factor][value]
            risk_score += points
            risk_factors.append(f"{factor}: {value} (+{points}점)")

    # 개인 건강 위험요인
    lifestyle_risk = {
        "exercise_frequency": {"없음": 10},
        "smoking_status": {"현재흡연": 15},
        "sleep_quality": {"나쁨": 10, "매우나쁨": 15},
        "previous_injury": {"업무관련": 20, "둘다": 15},
    }

    for factor, value in health_lifestyle.items():
        if factor in lifestyle_risk and value in lifestyle_risk[factor]:
            points = lifestyle_risk[factor][value]
            risk_score += points
            risk_factors.append(f"{factor}: {value} (+{points}점)")

    # 위험도 등급 결정
    if risk_score >= 80:
        risk_level = "매우 높음"
    elif risk_score >= 60:
        risk_level = "높음"
    elif risk_score >= 40:
        risk_level = "보통"
    elif risk_score >= 20:
        risk_level = "낮음"
    else:
        risk_level = "매우 낮음"

    return {
        "total_score": risk_score,
        "risk_level": risk_level,
        "risk_factors": risk_factors,
        "pain_count": pain_count,
        "severe_pain_count": severe_pain_count,
    }


def calculate_management_classification(body_part_data):
    """관리대상자 분류 계산 함수"""
    pain_reports = []
    management_targets = []

    for part_name, data in body_part_data.items():
        if data["has_pain"]:
            duration = data.get("pain_duration", "")
            frequency = data.get("pain_frequency", "")
            intensity = data.get("pain_intensity", "")

            # 통증강도를 문자열로 변환 (폼에서 정수로 전송되는 경우 처리)
            intensity_str = str(intensity) if intensity else ""

            # 통증강도 매핑 (1-10 숫자를 한국어 텍스트로 변환)
            intensity_mapping = {
                "1": "매우약함",
                "2": "매우약함",
                "3": "약함",
                "4": "약함",
                "5": "보통",
                "6": "중간정도",
                "7": "중간정도",
                "8": "심한통증",
                "9": "매우심한통증",
                "10": "매우심한통증",
            }

            # 숫자인 경우 한국어로 변환, 이미 한국어인 경우 그대로 사용
            if intensity_str.isdigit():
                intensity_korean = intensity_mapping.get(intensity_str, "보통")
            else:
                intensity_korean = intensity_str

            # 통증호소자 기준 체크
            is_pain_reporter = False
            if (
                "1주일이상" in duration
                or "1-4주" in duration
                or "1-6개월" in duration
                or "6개월이상" in duration
            ):
                if "주1-2회" in frequency or "주3-4회" in frequency or "매일" in frequency:
                    if (
                        "중간정도" in intensity_korean
                        or "심한통증" in intensity_korean
                        or "매우심한통증" in intensity_korean
                    ):
                        is_pain_reporter = True

            # 관리대상자 기준 체크
            is_management_target = False
            if (
                "1주일이상" in duration
                or "1-4주" in duration
                or "1-6개월" in duration
                or "6개월이상" in duration
            ):
                if "주1-2회" in frequency or "주3-4회" in frequency or "매일" in frequency:
                    if "심한통증" in intensity_korean or "매우심한통증" in intensity_korean:
                        is_management_target = True

            if is_pain_reporter:
                pain_reports.append(part_name)
            if is_management_target:
                management_targets.append(part_name)

    # 분류 결정
    if management_targets:
        return "관리대상자"
    elif pain_reports:
        return "통증호소자"
    else:
        return "상태정상"


@survey_bp.route("/complete/<int:id>")
def complete(id):
    """제출 완료 페이지"""
    survey = Survey.query.get_or_404(id)
    kiosk_mode = request.args.get("kiosk") == "1"
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
    """관리자 대시보드 - 통합된 관리자 페이지로 리디렉션"""
    return redirect(url_for("admin.survey.surveys"))


@survey_bp.route("/admin/001_musculoskeletal")
@login_required
def admin_001_musculoskeletal():
    """관리자 - 001 근골격계 증상조사표 목록"""
    page = request.args.get("page", 1, type=int)

    surveys = (
        Survey.query.filter(
            db.or_(
                Survey.form_type.contains("001"), Survey.form_type == None  # 기존 데이터 호환성
            )
        )
        .order_by(Survey.submission_date.desc())
        .paginate(page=page, per_page=20, error_out=False)
    )

    return render_template(
        "survey/admin_001_list.html", surveys=surveys, title="근골격계 증상조사표 (001) 목록"
    )


@survey_bp.route("/admin/002_new_employee")
@login_required
def admin_002_new_employee():
    """관리자 - 002 신규 입사자 건강검진 양식 목록"""
    page = request.args.get("page", 1, type=int)

    surveys = (
        Survey.query.filter(Survey.form_type.contains("002"))
        .order_by(Survey.submission_date.desc())
        .paginate(page=page, per_page=20, error_out=False)
    )

    return render_template(
        "survey/admin_002_list.html", surveys=surveys, title="신규 입사자 건강검진 양식 (002) 목록"
    )


@survey_bp.route("/admin/survey/<int:id>")
@login_required
def admin_survey_detail(id):
    """관리자 - 조사표 상세 보기 - Redirect to consolidated route"""
    return redirect(url_for("admin.survey_detail", id=id))


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
        # timezone 정보 제거 (Excel 호환성)
        submission_date = (
            survey.submission_date.replace(tzinfo=None)
            if survey.submission_date
            else None
        )
        data.append(
            {
                "제출일시": submission_date,
                "사번": survey.employee_number,
                "이름": survey.name,
                "부서": survey.department,
                "직위": survey.position,
                "나이": survey.age,
                "성별": survey.gender,
                "근무연수": survey.work_years,
                # 추가 필드들...
            }
        )

    df = pd.DataFrame(data)

    # timezone 정보가 있는 datetime 컬럼들 처리 (Excel 호환성)
    for col in df.columns:
        if df[col].dtype == "object":
            # datetime 객체인지 확인하고 timezone 제거
            df[col] = df[col].apply(
                lambda x: x.replace(tzinfo=None)
                if pd.notnull(x)
                and hasattr(x, "replace")
                and hasattr(x, "tzinfo")
                and x.tzinfo is not None
                else x
            )

    # 엑셀 파일 생성
    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="조사표 데이터")

    output.seek(0)

    return send_file(
        output,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=f'survey_data_{form_type}_{datetime.now().strftime("%Y%m%d")}.xlsx',
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


@survey_bp.route("/report/<int:id>")
def survey_report(id):
    """설문조사 HTML 보고서 생성 및 제공"""
    from datetime import datetime

    survey = Survey.query.get_or_404(id)

    # 현재 시간 정보
    current_time = datetime.now()

    # HTML 보고서 렌더링
    return render_template(
        "survey/survey_report.html",
        survey=survey,
        current_time=current_time,
        config=current_app.config
    )


@survey_bp.route("/api/submit", methods=["POST"])
def api_submit():
    """API를 통한 제출 (외부 시스템 연동용)"""
    # API 호출 추적
    # track_api_call(endpoint="/survey/api/submit", method="POST", payload_size=len(request.get_data()) if request.get_data() else 0)
    data = request.get_json()

    if not data:
        return jsonify({"error": "데이터가 없습니다."}), 400

    try:
        # 디버깅: 받은 데이터 로그 출력
        current_app.logger.info(f"[DEBUG] Received data: {data}")
        current_app.logger.info(f"[DEBUG] Data type: {type(data)}")

        # 필수 필드 검증 및 기본값 설정
        form_type = data.get("form_type", "001")
        name = data.get("name") or "익명 사용자"  # name이 None이면 기본값 설정
        age = data.get("age") or 0

        survey = Survey(
            user_id=1,  # API 제출은 익명 사용자 (user_id=1)
            form_type=form_type,
            name=name,
            age=age,
            gender=data.get("gender"),
            years_of_service=data.get("years_of_service", 0),
            employee_number=data.get("employee_number"),
            department=data.get("department"),
            position=data.get("position"),
            employee_id=data.get("employee_id"),
            work_years=data.get("work_years", 0),
            work_months=data.get("work_months", 0),
            has_symptoms=data.get("data", {}).get(
                "has_symptoms", data.get("has_symptoms", False)
            ),
            # employment_type=data.get("employment_type"),  # 컬럼 없음 - 주석처리
            responses=data,  # 전체 요청 데이터 저장
            data=data.get("data", {}),  # 상세 응답 데이터를 data 필드에 저장
            status="submitted",
        )

        # 디버깅: Survey 객체 생성 후 상태 확인
        current_app.logger.info(
            f"[DEBUG] Survey.responses before commit: {survey.responses}"
        )

        db.session.add(survey)
        db.session.commit()

        # 🚀 RAW DATA 파일 생성 - API 제출도 개별 파일 저장
        try:
            from utils.raw_data_exporter import export_survey_raw_data

            # JSON과 CSV 형태로 모두 저장
            exported_files = export_survey_raw_data(
                survey_data=data,
                survey_id=survey.id,
                form_type=form_type,
                format_types=["json", "csv"],
            )

            current_app.logger.info(
                f"✅ Raw data files created for API survey {survey.id}: {exported_files}"
            )

        except Exception as export_error:
            # Raw data 저장 오류해도 API 제출은 성공으로 처리
            current_app.logger.warning(
                f"⚠️ Raw data export failed for API survey {survey.id}: {str(export_error)}"
            )

        # 설문 제출 추적
        # track_survey_submission(form_type=form_type, survey_id=survey.id, form_data=data)

        # 🚀 새로운 HTML 원데이터 형식 Slack 알림 발송
        try:
            slack_notifier.send_survey_submission_with_raw_data(
                survey_id=survey.id,
                survey_data=data,
                form_type=form_type
            )
            current_app.logger.info(f"✅ HTML 원데이터 Slack 알림 전송 완료: 설문 ID {survey.id}")
        except Exception as slack_error:
            current_app.logger.warning(f"⚠️ Slack 알림 전송 오류: {str(slack_error)}")

        # 디버깅: 커밋 후 다시 조회해서 확인
        saved_survey = db.session.get(Survey, survey.id)
        current_app.logger.info(
            f"[DEBUG] Survey.responses after commit: {saved_survey.responses}"
        )

        return (
            jsonify(
                {
                    "success": True,
                    "survey_id": survey.id,
                    "message": "제출이 완료되었습니다.",
                    "raw_data_exported": True,  # Raw data 저장 여부 표시
                }
            ),
            201,
        )

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"API submit error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@survey_bp.route("/original/<filename>")
def serve_original_survey(filename):
    """원본 설문지 HTML 파일 제공"""
    import os

    # 보안 검증: survey_원형식 파일명만 허용
    if not filename.startswith('survey_') or not filename.endswith('.html'):
        abort(404)

    # 파일 경로 설정 (컨테이너 내부 경로)
    survey_originals_dir = "/app/static/survey_originals"

    # 로컬 개발환경에서는 다른 경로 사용
    if not os.path.exists(survey_originals_dir):
        survey_originals_dir = os.path.join(current_app.root_path, "static", "survey_originals")

    try:
        return send_from_directory(survey_originals_dir, filename)
    except FileNotFoundError:
        current_app.logger.error(f"Original survey file not found: {filename}")
        abort(404)
