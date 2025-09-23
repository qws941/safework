"""
Survey Management Module
설문 관리, 리뷰, 통계 분석 기능
"""
import io
from datetime import datetime
from flask import (
    Blueprint,
    render_template,
    request,
    redirect,
    url_for,
    flash,
    send_file,
    abort,
)
from sqlalchemy import or_
import pandas as pd

from forms import AdminFilterForm
from models import Survey, SurveyStatistics, db
from utils.activity_tracker import track_admin_action, track_page_view
from . import admin_required

survey_bp = Blueprint("survey", __name__)


@survey_bp.route("/survey")
@admin_required
def survey():
    """조사표 목록 관리 - 통합된 라우트"""
    track_page_view("admin_survey_list")
    form = AdminFilterForm()
    page = request.args.get("page", 1, type=int)

    # 쿼리 빌드
    query = Survey.query

    # 검색 필터
    search = request.args.get("search")
    if search:
        query = query.filter(
            or_(
                Survey.name.contains(search),
                Survey.employee_number.contains(search),
                Survey.department.contains(search),
            )
        )

    # 부서 필터
    department = request.args.get("department")
    if department:
        query = query.filter(Survey.department == department)

    # 날짜 필터 (created_at 사용으로 변경)
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    if date_from:
        query = query.filter(
            Survey.created_at >= datetime.strptime(date_from, "%Y-%m-%d")
        )
    if date_to:
        query = query.filter(
            Survey.created_at <= datetime.strptime(date_to, "%Y-%m-%d")
        )

    # 상태 필터
    status = request.args.get("status")
    if status:
        query = query.filter(Survey.status == status)

    # 증상 유무 필터 (pain_level 대신 has_symptoms 사용)
    has_symptoms = request.args.get("has_symptoms")
    if has_symptoms == "true":
        query = query.filter(Survey.has_symptoms == True)
    elif has_symptoms == "false":
        query = query.filter(Survey.has_symptoms == False)

    # 페이지네이션 (created_at 사용으로 변경)
    surveys = query.order_by(Survey.created_at.desc()).paginate(
        page=page, per_page=20, error_out=False
    )

    # 부서 목록 (필터용)
    departments = db.session.query(Survey.department).distinct().all()
    form.department.choices = [("", "전체")] + [(d[0], d[0]) for d in departments if d[0]]

    return render_template("admin/surveys.html", surveys=surveys, form=form)


@survey_bp.route("/surveys")
@admin_required
def surveys():
    """Legacy route - redirect to consolidated route"""
    return redirect(url_for("admin.survey"))


@survey_bp.route("/survey/<int:id>")
@admin_required
def survey_detail(id):
    """조사표 상세 보기 - 통합된 라우트"""
    from models import Survey, db

    survey = db.session.get(Survey, id)
    if not survey:
        abort(404)

    track_page_view("admin_survey_detail")
    track_admin_action(
        "VIEW_SURVEY",
        details={
            "survey_id": id,
            "survey_name": survey.name,
            "form_type": survey.form_type,
        },
    )

    return render_template("survey/admin_detail.html", survey=survey)


@survey_bp.route("/surveys-test")
@admin_required
def surveys_test():
    """설문 목록 테스트 - 간소화 버전"""
    try:
        # 가장 간단한 쿼리
        surveys_list = Survey.query.order_by(Survey.created_at.desc()).limit(10).all()

        # 간단한 HTML 응답
        html = f"""
        <!DOCTYPE html>
        <html>
        <head><title>설문 목록 테스트</title></head>
        <body>
            <h1>설문 목록 테스트</h1>
            <p>총 설문 개수: {Survey.query.count()}개</p>
            <ul>
        """

        for survey in surveys_list:
            html += f"""
                <li>
                    ID: {survey.id},
                    이름: {survey.name},
                    부서: {survey.department},
                    일시: {survey.created_at}
                </li>
            """

        html += """
            </ul>
        </body>
        </html>
        """

        return html

    except Exception as e:
        return f"오류 발생: {str(e)}"


@survey_bp.route("/survey/<int:id>/review", methods=["GET", "POST"])
@admin_required
def review_survey(id):
    """조사표 검토 및 처리"""
    try:
        survey = Survey.query.get_or_404(id)

        # 템플릿을 사용하여 정상적인 응답 반환
        return render_template("admin/review_survey.html", survey=survey)

    except Exception as e:
        flash(f"설문 조회 중 오류가 발생했습니다: {str(e)}", "error")
        return redirect(url_for("admin.survey.surveys"))


@survey_bp.route("/export/excel")
@admin_required
def export_excel():
    """Excel 파일로 내보내기"""
    track_admin_action(
        "EXPORT_SURVEY_EXCEL",
        details={
            "search_filter": request.args.get("search", ""),
            "export_timestamp": datetime.now().isoformat(),
        },
    )

    # 필터 적용 (URL 파라미터 기반)
    query = Survey.query

    # 필터 로직 (surveys 함수와 동일)
    search = request.args.get("search")
    if search:
        query = query.filter(
            or_(
                Survey.name.contains(search),
                Survey.employee_number.contains(search),
                Survey.department.contains(search),
            )
        )

    surveys = query.all()

    # DataFrame 생성
    data = []
    for s in surveys:
        data.append(
            {
                "제출일시": s.created_at,
                "양식유형": s.form_type,
                "사번": s.employee_number,
                "성명": s.name,
                "부서": s.department,
                "직위": s.position,
                "나이": s.age,
                "성별": s.gender,
                "근무년수": s.work_years,
                "근무개월수": s.work_months,
                "재직년수": s.years_of_service,
                "증상유무": "있음" if s.has_symptoms else "없음",
                "상태": s.status,
                "추가데이터": str(s.responses) if s.responses else "",
            }
        )

    df = pd.DataFrame(data)

    # Excel 파일 생성
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="증상조사표", index=False)

    output.seek(0)

    # 파일명에 현재 시간 포함
    filename = f"survey_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    return send_file(
        output,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=filename,
    )


@survey_bp.route("/statistics")
@admin_required
def statistics():
    """통계 페이지"""
    track_page_view("admin_statistics")
    track_admin_action(
        "VIEW_STATISTICS", details={"access_timestamp": datetime.now().isoformat()}
    )

    # 기본 통계 계산
    total_surveys = Survey.query.count()
    symptom_surveys = Survey.query.filter(Survey.has_symptoms == True).count()
    no_symptom_surveys = Survey.query.filter(Survey.has_symptoms == False).count()

    # 부서별 통계
    department_stats = (
        db.session.query(
            Survey.department,
            func.count(Survey.id).label("count"),
            func.sum(func.case((Survey.has_symptoms == True, 1), else_=0)).label(
                "symptom_count"
            ),
        )
        .group_by(Survey.department)
        .all()
    )

    # 월별 통계
    monthly_stats = (
        db.session.query(
            func.date_trunc("month", Survey.created_at).label("month"),
            func.count(Survey.id).label("count"),
        )
        .group_by(func.date_trunc("month", Survey.created_at))
        .order_by("month")
        .all()
    )

    return render_template(
        "admin/survey_statistics.html",
        total_surveys=total_surveys,
        symptom_surveys=symptom_surveys,
        no_symptom_surveys=no_symptom_surveys,
        department_stats=department_stats,
        monthly_stats=monthly_stats,
    )


# 분석 함수들
def is_management_target(responses):
    """관리대상 여부 판단"""
    if not responses:
        return False

    # 근골격계 증상이 있는지 확인
    if responses.get("has_symptoms"):
        return True

    # 추가 기준들 확인
    pain_level = responses.get("pain_level", 0)
    if pain_level >= 7:  # 7점 이상 통증
        return True

    return False


def analyze_musculo_symptoms(responses):
    """근골격계 증상 분석"""
    if not responses:
        return {"status": "정상", "risk_level": "낮음"}

    analysis = {
        "status": "정상",
        "risk_level": "낮음",
        "symptoms": [],
        "recommendations": [],
    }

    # 증상 분석
    if responses.get("has_symptoms"):
        analysis["status"] = "주의 필요"
        analysis["risk_level"] = "중간"

        # 통증 부위 분석
        body_parts = responses.get("body_parts", [])
        if body_parts:
            analysis["symptoms"] = body_parts
            analysis["risk_level"] = "높음"

    return analysis


def is_management_target_by_detail(pain_details):
    """상세 증상 정보를 기반으로 관리대상 여부 판단"""
    if not pain_details:
        return False

    # 각 부위별 통증 강도 확인
    for detail in pain_details:
        if detail.get("intensity", 0) >= 7:
            return True
        if detail.get("frequency") == "매일":
            return True

    return False
