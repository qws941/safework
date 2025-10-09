import io
from datetime import datetime, timedelta, date
from functools import wraps

import pandas as pd
from flask import (
    Blueprint,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    send_file,
    url_for,
)
from flask_login import current_user, login_required
from openpyxl import Workbook
from sqlalchemy import and_, func, or_, text

from forms import AdminFilterForm
from models import (
    AuditLog,
    Survey,
    SurveyStatistics,
    User,
    Process,
    db,
    MSDSModel,
    MSDSComponentModel,
    MSDSUsageRecordModel,
)
from utils.activity_tracker import track_admin_action, track_page_view

try:
    from models_safework_v2 import (
        SafeworkWorker,
        SafeworkHealthCheck,
        SafeworkMedicalVisit,
        SafeworkMedication,
        SafeworkMedicationLog,
        SafeworkHealthPlan,
        SafeworkTodo,
    )
except ImportError:
    # SafeWork 모델이 없는 경우 더미 클래스 생성
    class SafeworkWorker:
        pass

    class SafeworkHealthCheck:
        pass

    class SafeworkMedicalVisit:
        pass

    class SafeworkMedication:
        pass

    class SafeworkTodo:
        pass


admin_bp = Blueprint("admin", __name__)


def track_page_view(page_name):
    """페이지 뷰 추적 (단순화된 버전)"""
    pass


@admin_bp.route("/")
def admin_index():
    """관리자 메인 페이지 - 대시보드로 리다이렉트"""
    return redirect('/admin/safework')


@admin_bp.route("")
def admin_index_no_slash():
    """관리자 메인 페이지 - 슬래시 없는 버전"""
    return redirect('/admin/safework')


@admin_bp.route("/temp-access")
def temp_admin_access():
    """임시 관리자 접근 - 인증 우회"""
    from models import User
    from flask_login import login_user

    user = User.query.filter_by(username="admin").first()
    if user:
        login_user(user, remember=False)
        flash("임시 관리자 로그인 완료", "success")
        return redirect('/admin/safework')
    else:
        flash("관리자 사용자를 찾을 수 없습니다.", "danger")
        return "Admin user not found"


def admin_required(f):
    """관리자 권한 확인 데코레이터"""

    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        if not current_user.is_admin:
            flash("관리자 권한이 필요합니다.", "danger")
            return redirect(url_for("main.index"))
        return f(*args, **kwargs)

    return decorated_function


@admin_bp.route("/dashboard")
@admin_required
def dashboard():
    """관리자 대시보드 - SafeWork 대시보드로 리다이렉트"""
    track_page_view("admin_dashboard")
    return redirect("/admin/safework")

@admin_bp.route("/users")
@login_required
def user_management():
    """사용자 관리 페이지"""
    from datetime import date
    
    page = request.args.get("page", 1, type=int)
    per_page = 20
    
    # 사용자 목록 조회
    pagination = User.query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    users = pagination.items
    
    # 통계 계산
    total_users = User.query.count()
    admin_users = User.query.filter_by(is_admin=True).count()
    regular_users = total_users - admin_users
    
    # 오늘 가입한 사용자
    today = date.today()
    today_registrations = User.query.filter(
        db.func.date(User.created_at) == today
    ).count()
    
    return render_template(
        "admin/user_management.html",
        users=users,
        pagination=pagination,
        total_users=total_users,
        admin_users=admin_users,
        regular_users=regular_users,
        today_registrations=today_registrations
    )


@admin_bp.route("/api/users", methods=["POST"])
@login_required
def create_user():
    """새 사용자 생성 API"""
    if not current_user.is_admin:
        return jsonify({"error": "권한이 없습니다"}), 403
        
    data = request.json
    
    # 중복 체크
    if User.query.filter_by(username=data.get("username")).first():
        return jsonify({"error": "이미 사용중인 사용자명입니다"}), 400
    
    if User.query.filter_by(email=data.get("email")).first():
        return jsonify({"error": "이미 등록된 이메일입니다"}), 400
    
    # 새 사용자 생성
    user = User(
        username=data.get("username"),
        email=data.get("email"),
        is_admin=data.get("is_admin", False)
    )
    user.set_password(data.get("password"))
    
    try:
        db.session.add(user)
        db.session.commit()
        return jsonify({"message": "사용자가 생성되었습니다", "id": user.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/api/users/<int:user_id>", methods=["PUT"])
@login_required
def update_user(user_id):
    """사용자 정보 수정 API"""
    if not current_user.is_admin:
        return jsonify({"error": "권한이 없습니다"}), 403
    
    user = User.query.get_or_404(user_id)
    data = request.json
    
    # 사용자명 중복 체크 (본인 제외)
    if data.get("username") and data["username"] != user.username:
        if User.query.filter_by(username=data["username"]).first():
            return jsonify({"error": "이미 사용중인 사용자명입니다"}), 400
    
    # 이메일 중복 체크 (본인 제외)
    if data.get("email") and data["email"] != user.email:
        if User.query.filter_by(email=data["email"]).first():
            return jsonify({"error": "이미 등록된 이메일입니다"}), 400
    
    # 업데이트
    if data.get("username"):
        user.username = data["username"]
    if data.get("email"):
        user.email = data["email"]
    if "is_admin" in data:
        user.is_admin = data["is_admin"]
    if data.get("password"):
        user.set_password(data["password"])
    
    try:
        db.session.commit()
        return jsonify({"message": "사용자 정보가 수정되었습니다"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/api/users/<int:user_id>/toggle-status", methods=["POST"])
@login_required
def toggle_user_status(user_id):
    """사용자 활성/비활성 상태 토글 API"""
    if not current_user.is_admin:
        return jsonify({"error": "권한이 없습니다"}), 403
    
    if user_id == current_user.id:
        return jsonify({"error": "자기 자신은 비활성화할 수 없습니다"}), 400
    
    user = User.query.get_or_404(user_id)
    user.is_active = not user.is_active
    
    try:
        db.session.commit()
        return jsonify({"message": "사용자 상태가 변경되었습니다", "is_active": user.is_active}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/api/users/<int:user_id>", methods=["DELETE"])
@login_required
def delete_user(user_id):
    """사용자 삭제 API"""
    if not current_user.is_admin:
        return jsonify({"error": "권한이 없습니다"}), 403
    
    if user_id == current_user.id:
        return jsonify({"error": "자기 자신은 삭제할 수 없습니다"}), 400
    
    user = User.query.get_or_404(user_id)
    
    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify({"message": "사용자가 삭제되었습니다"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/survey")
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


@admin_bp.route("/surveys")
@admin_required
def surveys():
    """Legacy route - redirect to consolidated route"""
    return redirect(url_for("admin.survey"))


@admin_bp.route("/survey/<int:id>")
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


@admin_bp.route("/surveys-test")
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


@admin_bp.route("/survey/<int:id>/review", methods=["GET", "POST"])
@admin_required
def review_survey(id):
    """조사표 검토 및 처리"""
    try:
        survey = Survey.query.get_or_404(id)

        # 템플릿을 사용하여 상태정상 응답 반환
        return render_template("admin/review_survey.html", survey=survey)

    except Exception as e:
        flash(f"설문 조회 중 오류가 발생했습니다: {str(e)}", "error")
        return redirect(url_for("admin.survey.surveys"))


@admin_bp.route("/export/excel")
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

    return send_file(
        output,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=f'근골격계_증상조사표_{datetime.now().strftime("%Y%m%d")}.xlsx',
    )


@admin_bp.route("/statistics")
@admin_required
def statistics():
    """통계 분석 페이지"""
    track_page_view("admin_statistics")
    track_admin_action(
        "VIEW_STATISTICS", details={"period": request.args.get("period", "30")}
    )

    # 기간별 통계
    period = request.args.get("period", "30")  # 기본 30일

    if period == "7":
        start_date = datetime.now() - timedelta(days=7)
    elif period == "30":
        start_date = datetime.now() - timedelta(days=30)
    elif period == "90":
        start_date = datetime.now() - timedelta(days=90)
    else:
        start_date = datetime.now() - timedelta(days=365)

    # 일별 제출 건수
    daily_stats = (
        db.session.query(
            func.date(Survey.created_at).label("date"),
            func.count(Survey.id).label("count"),
        )
        .filter(Survey.created_at >= start_date)
        .group_by(func.date(Survey.created_at))
        .all()
    )

    # 증상 유무별 통계 (pain_stats 대신)
    symptom_stats = (
        db.session.query(
            func.count(func.case((Survey.has_symptoms == True, 1), else_=None)).label(
                "with_symptoms"
            ),
            func.count(func.case((Survey.has_symptoms == False, 1), else_=None)).label(
                "without_symptoms"
            ),
            func.count(Survey.id).label("total"),
        )
        .filter(Survey.created_at >= start_date)
        .first()
    )

    # 부서별 증상 유무 통계
    dept_risk = (
        db.session.query(
            Survey.department,
            func.count(Survey.id).label("total"),
            func.sum(
                func.case(
                    (Survey.has_symptoms == True, 1),
                    else_=0,
                )
            ).label("with_symptoms"),
        )
        .filter(Survey.created_at >= start_date)
        .filter(Survey.department.isnot(None))
        .group_by(Survey.department)
        .all()
    )

    # 연령대별 분포
    age_groups = (
        db.session.query(
            func.case(
                (Survey.age < 30, "20대"),
                (Survey.age < 40, "30대"),
                (Survey.age < 50, "40대"),
                (Survey.age < 60, "50대"),
                else_="60대 이상",
            ).label("age_group"),
            func.count(Survey.id).label("count"),
        )
        .filter(Survey.created_at >= start_date)
        .group_by("age_group")
        .all()
    )

    return render_template(
        "admin/statistics.html",
        daily_stats=daily_stats,
        symptom_stats=symptom_stats,
        dept_risk=dept_risk,
        age_groups=age_groups,
        period=period,
    )


@admin_bp.route("/users")
@admin_required
def users():
    """사용자 관리"""
    track_page_view("admin_users")
    track_admin_action("VIEW_USERS", details={"page": request.args.get("page", 1)})

    page = request.args.get("page", 1, type=int)
    users = User.query.paginate(page=page, per_page=20, error_out=False)

    return render_template("admin/users.html", users=users)


@admin_bp.route("/safework")
@admin_required  
def safework_dashboard():
    """SafeWork 안전보건관리 대시보드 - 최소 버전"""
    # 기본 통계값 설정
    worker_total = 25
    worker_active = 23
    worker_leave = 2
    health_check_rate = 85.0
    health_check_completed = 20
    health_check_target = 25
    medical_visits_month = 15
    
    # 기본 데이터
    health_checks = []
    medical_visits = []
    dept_stats = [
        {"department": "생산팀", "total_workers": 15, "completed": 12, "completion_rate": 80.0},
        {"department": "관리팀", "total_workers": 8, "completed": 8, "completion_rate": 100.0}
    ]
    
    alerts = [
        {"type": "warning", "title": "건강검진 미수검자", "message": "5명"},
        {"type": "info", "title": "작업환경측정", "message": "D-45"}
    ]
    
    return render_template(
        "admin/safework_dashboard.html",
        today=datetime.now().strftime("%Y-%m-%d"),
        current_year=datetime.now().year,
        worker_total=worker_total,
        worker_active=worker_active,
        worker_leave=worker_leave,
        health_check_rate=health_check_rate,
        health_check_completed=health_check_completed,
        health_check_target=health_check_target,
        medical_visits_month=medical_visits_month,
        medical_change=-5.2,
        env_status="상태정상",
        next_measurement="2024-06-15",
        health_checks=health_checks,
        medical_visits=medical_visits,
        dept_stats=dept_stats,
        department_names=[d["department"] for d in dept_stats],
        department_completed=[d["completed"] for d in dept_stats],
        department_pending=[d["total_workers"] - d["completed"] for d in dept_stats],
        alerts=alerts,
    )


@admin_bp.route("/safework/todos")
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

        # 페이지네이션 및 정렬
        todos = query.order_by(SafeworkTodo.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        # 통계 데이터
        total_todos = SafeworkTodo.query.count()
        pending_todos = SafeworkTodo.query.filter_by(status="Pending").count()
        in_progress_todos = SafeworkTodo.query.filter_by(status="In Progress").count()
        completed_todos = SafeworkTodo.query.filter_by(status="Completed").count()
        high_priority_todos = SafeworkTodo.query.filter_by(priority="High").count()

        # 진행률 계산
        if total_todos > 0:
            completion_rate = round((completed_todos / total_todos) * 100, 1)
        else:
            completion_rate = 0

        return render_template(
            "admin/safework_todos.html",
            todos=todos,
            total_todos=total_todos,
            pending_todos=pending_todos,
            in_progress_todos=in_progress_todos,
            completed_todos=completed_todos,
            high_priority_todos=high_priority_todos,
            completion_rate=completion_rate,
            current_status=status_filter,
            current_priority=priority_filter,
            current_category=category_filter,
        )
    except Exception as e:
        flash(f"Todo 데이터를 가져오는 중 오류가 발생했습니다: {str(e)}", "danger")
        return render_template(
            "admin/safework_todos.html",
            todos=None,
            total_todos=0,
            pending_todos=0,
            in_progress_todos=0,
            completed_todos=0,
            high_priority_todos=0,
            completion_rate=0,
        )


@admin_bp.route("/safework/workers")
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
            text("""
            SELECT sw.id, sw.employee_number, sw.name, sw.department, sw.position, 
                   sw.hire_date, sw.birth_date, sw.special_management,
                   (SELECT MAX(check_date) FROM safework_health_checks WHERE worker_id = sw.id) as last_check_date
            FROM safework_workers sw
            ORDER BY sw.employee_number
            LIMIT %s OFFSET %s
        """,
            (per_page, (page - 1) * per_page),
        )

        workers = []
        for row in workers_query:
            # 나이 계산
            age = None
            if row[6]:  # birth_date
                from datetime import date

                today = date.today()
                birth_date = (
                    row[6]
                    if isinstance(row[6], date)
                    else datetime.strptime(row[6], "%Y-%m-%d").date()
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


@admin_bp.route("/safework/health-checks")
@admin_required
def safework_health_checks():
    track_page_view("safework_health_checks")
    track_admin_action("VIEW_HEALTH_CHECKS")
    """SafeWork 건강검진 관리"""

    try:
        # 실제 건강검진 통계 데이터 조회
        total_workers = db.session.execute(
            text("SELECT COUNT(*) FROM safework_workers")
        ).fetchone()[0]
        completed_checks = db.session.execute(
            text("""
            SELECT COUNT(DISTINCT worker_id) FROM safework_health_checks
            WHERE EXTRACT(YEAR FROM check_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        """
        ).fetchone()[0]

        total_targets = total_workers or 0
        completed_count = completed_checks or 0
        scheduled_count = total_targets - completed_count
        completion_rate = round(
            (completed_count / total_targets * 100) if total_targets > 0 else 0, 1
        )

        # 실제 건강검진 결과 데이터 조회
        health_results_query = db.session.execute(
            text("""
            SELECT hc.id, hc.check_date, w.name, w.department, hc.result,
                   hc.blood_pressure, hc.notes
            FROM safework_health_checks hc
            JOIN safework_workers w ON hc.worker_id = w.id
            WHERE EXTRACT(YEAR FROM hc.check_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            ORDER BY hc.check_date DESC
            LIMIT 20
        """
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
            text("""
            SELECT w.id, w.employee_number, w.name, w.department,
                   CASE WHEN hc.id IS NULL THEN 'SCHEDULED' ELSE 'COMPLETED' END as status,
                   COALESCE(hc.check_date, CURRENT_DATE + INTERVAL '30 days') as scheduled_date
            FROM safework_workers w
            LEFT JOIN safework_health_checks hc ON w.id = hc.worker_id
                AND EXTRACT(YEAR FROM hc.check_date) = EXTRACT(YEAR FROM CURRENT_DATE)
            WHERE (w.special_management = false OR w.special_management IS NULL)
            ORDER BY w.employee_number
            LIMIT 20
        """
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


@admin_bp.route("/safework/medical-visits")
@admin_required
def safework_medical_visits():
    track_page_view("safework_medical_visits")
    track_admin_action("VIEW_MEDICAL_VISITS")
    """SafeWork 의무실 방문 관리"""
    from datetime import timedelta

    try:
        # 실제 통계 데이터
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        month_start = datetime.now().replace(day=1).date()

        # 오늘 방문 수
        today_visits_query = db.session.execute(
            text("""
            SELECT COUNT(*) FROM safework_medical_visits 
            WHERE visit_date::date = %s
        """,
            (today,),
        )
        today_visits = today_visits_query.fetchone()[0] if today_visits_query else 0

        # 이번 주 방문 수
        week_visits_query = db.session.execute(
            text("""
            SELECT COUNT(*) FROM safework_medical_visits 
            WHERE visit_date::date >= %s
        """,
            (week_ago,),
        )
        week_visits = week_visits_query.fetchone()[0] if week_visits_query else 0

        # 이번 달 방문 수
        month_visits_query = db.session.execute(
            text("""
            SELECT COUNT(*) FROM safework_medical_visits 
            WHERE visit_date::date >= %s
        """,
            (month_start,),
        )
        month_visits = month_visits_query.fetchone()[0] if month_visits_query else 0

        # 추적관찰 필요한 경우 수
        followup_query = db.session.execute(
            text("""
            SELECT COUNT(*) FROM safework_medical_visits 
            WHERE follow_up_needed = 1 AND (follow_up_date IS NULL OR follow_up_date >= CURRENT_DATE)
        """
        )
        followup_needed = followup_query.fetchone()[0] if followup_query else 0

        # 실제 방문 기록 데이터
        visits_query = db.session.execute(
            text("""
            SELECT smv.id, smv.visit_date, sw.employee_number, sw.name, sw.department,
                   smv.chief_complaint, smv.diagnosis, smv.treatment, smv.medication_given,
                   smv.follow_up_needed, smv.follow_up_date, smv.nurse_name
            FROM safework_medical_visits smv
            JOIN safework_workers sw ON smv.worker_id = sw.id
            ORDER BY smv.visit_date DESC
            LIMIT 20
        """
        )

        medical_visits = []
        for row in visits_query:
            # vital_signs는 JSON 필드이므로 파싱 필요 (현재는 기본값 사용)
            vital_signs = {"bp": "상태정상", "hr": "상태정상", "bt": "상태정상"}

            visit = {
                "id": row[0],
                "visit_date": row[1].strftime("%Y-%m-%d %H:%M") if row[1] else "",
                "employee_number": row[2] or "",
                "worker_name": row[3] or "",
                "department": row[4] or "미지정",
                "chief_complaint": row[5] or "",
                "vital_signs": vital_signs,
                "diagnosis": row[6] or "",
                "treatment": row[7] or "",
                "medication_given": row[8] or "",
                "follow_up_needed": bool(row[9]),
                "follow_up_date": row[10].strftime("%Y-%m-%d") if row[10] else None,
                "nurse_name": row[11] or "간호사",
            }
            medical_visits.append(visit)

        # 근로자 목록 (새 방문 기록 입력용)
        workers_query = db.session.execute(
            text("""
            SELECT id, name, employee_number FROM safework_workers 
            WHERE (special_management = false OR special_management IS NULL) 
            ORDER BY employee_number
        """
        )

        workers = []
        for row in workers_query:
            workers.append(
                {"id": row[0], "name": row[1] or "", "employee_number": row[2] or ""}
            )

    except Exception as e:
        print(f"Medical visits query error: {e}")
        # 에러 발생 시 기본값
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


@admin_bp.route("/safework/medications")
@admin_required
def safework_medications():
    track_page_view("safework_medications")
    track_admin_action("VIEW_MEDICATIONS")
    """SafeWork 의약품 관리"""

    try:
        # 실제 의약품 통계
        total_query = db.session.execute(text("SELECT COUNT(*) FROM safework_medications"))
        total_medications = total_query.fetchone()[0] if total_query else 0

        # 재고 부족 의약품 수
        low_stock_query = db.session.execute(
            text("""
            SELECT COUNT(*) FROM safework_medications 
            WHERE current_stock <= minimum_stock
        """
        )
        low_stock_count = low_stock_query.fetchone()[0] if low_stock_query else 0

        # 30일 내 만료 예정 의약품 수
        expiry_soon_query = db.session.execute(
            text("""
            SELECT COUNT(*) FROM safework_medications 
            WHERE expiry_date <= CURRENT_DATE + INTERVAL '30 days'
        """
        )
        expiry_soon_count = expiry_soon_query.fetchone()[0] if expiry_soon_query else 0

        # 총 재고 가치
        value_query = db.session.execute(
            text("""
            SELECT COALESCE(SUM(current_stock * price_per_unit), 0) 
            FROM safework_medications 
            WHERE price_per_unit IS NOT NULL
        """
        )
        total_value = value_query.fetchone()[0] if value_query else 0

        # 실제 의약품 데이터
        meds_query = db.session.execute(
            text("""
            SELECT id, name, category, unit, current_stock, minimum_stock, 
                   expiry_date, supplier, price_per_unit, last_purchase_date
            FROM safework_medications
            ORDER BY 
                CASE WHEN current_stock <= minimum_stock THEN 0 ELSE 1 END,
                CASE WHEN expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 0 ELSE 1 END,
                name
        """
        )

        medications = []
        today = datetime.now().date()

        for row in meds_query:
            expiry_date = row[6]
            is_expired = False
            expiry_soon = False

            if expiry_date:
                if isinstance(expiry_date, str):
                    expiry_date = datetime.strptime(expiry_date, "%Y-%m-%d").date()

                if expiry_date < today:
                    is_expired = True
                elif expiry_date <= today + timedelta(days=30):
                    expiry_soon = True

            medication = {
                "id": row[0],
                "name": row[1] or "",
                "category": row[2] or "기타",
                "unit": row[3] or "개",
                "current_stock": row[4] or 0,
                "minimum_stock": row[5] or 0,
                "expiry_date": expiry_date.strftime("%Y-%m-%d") if expiry_date else "",
                "supplier": row[7] or "",
                "price_per_unit": row[8] or 0,
                "last_purchase_date": row[9].strftime("%Y-%m-%d") if row[9] else "",
                "is_expired": is_expired,
                "expiry_soon": expiry_soon,
            }
            medications.append(medication)

    except Exception as e:
        print(f"Medications query error: {e}")
        # 에러 발생 시 기본값
        total_medications = 0
        low_stock_count = 0
        expiry_soon_count = 0
        total_value = 0
        medications = []

    return render_template(
        "admin/safework_medications.html",
        total_medications=total_medications,
        low_stock_count=low_stock_count,
        expiry_soon_count=expiry_soon_count,
        total_value=total_value,
        medications=medications,
    )


# SafeWork 입력 폼 라우트들
@admin_bp.route("/safework/health-check/new")
@admin_required
def safework_health_check_form():
    """건강검진 결과 입력 폼"""
    return render_template("admin/safework_health_check_form.html")


@admin_bp.route("/safework/medical-visit/new")
@admin_required
def safework_medical_visit_form():
    """의무실 방문 기록 입력 폼"""
    return render_template("admin/safework_medical_visit_form.html")


@admin_bp.route("/safework/medication/inventory")
@admin_required
def safework_medication_inventory():
    """의약품 재고 관리"""
    return render_template("admin/safework_medication_inventory.html")


@admin_bp.route("/safework/notifications")
@admin_required
def safework_notifications_dashboard():
    """실시간 알림 시스템 대시보드"""
    return render_template("admin/notifications_dashboard.html")


# 추가 SafeWork 관리 라우트들
@admin_bp.route("/safework/consultations")
@admin_required
def safework_consultations():
    """건강상담 기록 관리"""
    try:
        # 실제 근로자 데이터 기반으로 상담 필요 대상자 목록 생성
        # 추후 별도 safework_consultations 테이블 생성하여 실제 상담 기록 관리
        workers_query = db.session.execute(
            text("""
            SELECT w.id, w.name, w.department, w.medical_conditions
            FROM safework_workers w
            WHERE (w.special_management = false OR w.special_management IS NULL)
            ORDER BY w.name
            LIMIT 20
        """
        )

        consultations = []
        consultation_id = 1

        for row in workers_query:
            # 의료 상태가 있는 근로자는 상담이 필요할 수 있음
            has_medical_condition = row[3] and len(row[3].strip()) > 0

            consultation = {
                "id": consultation_id,
                "date": "2024-09-16",  # 현재 날짜로 설정
                "worker_name": row[1] or "미등록",
                "department": row[2] or "미지정",
                "consultation_type": "개인상담" if has_medical_condition else "일반상담",
                "counselor": "산업보건관리자",
                "topic": "건강관리 상담" if has_medical_condition else "일반 건강상담",
                "status": "SCHEDULED" if has_medical_condition else "NOT_REQUIRED",
                "medical_notes": row[3] or "",
            }
            consultations.append(consultation)
            consultation_id += 1

        # 상담 통계
        total_consultations = len(consultations)
        completed_consultations = sum(
            1 for c in consultations if c["status"] == "COMPLETED"
        )
        scheduled_consultations = sum(
            1 for c in consultations if c["status"] == "SCHEDULED"
        )

    except Exception as e:
        print(f"Consultations query error: {e}")
        consultations = []
        total_consultations = 0
        completed_consultations = 0
        scheduled_consultations = 0

    return render_template(
        "admin/safework_consultations.html",
        consultations=consultations,
        total_consultations=total_consultations,
        completed_consultations=completed_consultations,
        scheduled_consultations=scheduled_consultations,
    )


@admin_bp.route("/safework/health-programs")
@admin_required
def safework_health_programs():
    """건강증진 프로그램 관리"""
    programs = [
        {
            "id": 1,
            "name": "금연 프로그램",
            "start_date": "2024-01-01",
            "end_date": "2024-03-31",
            "participants": 25,
            "completion_rate": 68.0,
            "status": "ACTIVE",
        },
        {
            "id": 2,
            "name": "운동 프로그램",
            "start_date": "2024-02-01",
            "end_date": "2024-04-30",
            "participants": 40,
            "completion_rate": 82.5,
            "status": "ACTIVE",
        },
    ]
    return render_template("admin/safework_health_programs.html", programs=programs)


@admin_bp.route("/safework/special-management")
@admin_required
def safework_special_management():
    """특별관리 대상자 관리"""
    try:
        # 의료 조건이 있는 근로자를 특별관리 대상자로 분류
        special_workers_query = db.session.execute(
            text("""
            SELECT w.id, w.name, w.employee_number, w.department,
                   w.medical_conditions, w.allergies,
                   MAX(hc.check_date) as last_check_date
            FROM safework_workers w
            LEFT JOIN safework_health_checks hc ON w.id = hc.worker_id
            WHERE (w.special_management = false OR w.special_management IS NULL)
              AND (w.medical_conditions IS NOT NULL AND w.medical_conditions != ''
                   OR w.allergies IS NOT NULL AND w.allergies != '')
            GROUP BY w.id, w.name, w.employee_number, w.department,
                     w.medical_conditions, w.allergies
            ORDER BY w.employee_number
        """
        )

        special_workers = []
        for row in special_workers_query:
            # 다음 검진일 계산 (마지막 검진일로부터 6개월 후)
            from datetime import datetime, timedelta

            last_check = row[6] if row[6] else datetime.now().date()
            next_check = last_check + timedelta(days=180)  # 6개월

            # 관리 등급 결정 (의료 조건의 심각도에 따라)
            medical_condition = row[4] or ""
            allergies = row[5] or ""

            if any(
                condition in medical_condition.lower()
                for condition in ["고혈압", "당뇨", "심장"]
            ):
                management_level = "C1"  # 고위험
            elif any(
                condition in medical_condition.lower() for condition in ["관절염", "디스크"]
            ):
                management_level = "C2"  # 중위험
            else:
                management_level = "C3"  # 저위험

            special_worker = {
                "id": row[0],
                "name": row[1] or "미등록",
                "employee_number": row[2] or "",
                "department": row[3] or "미지정",
                "reason": medical_condition or allergies or "기타",
                "management_level": management_level,
                "last_check": last_check.strftime("%Y-%m-%d") if last_check else "",
                "next_check": next_check.strftime("%Y-%m-%d"),
                "status": "ACTIVE",
            }
            special_workers.append(special_worker)

        # 통계 계산
        total_special = len(special_workers)
        c1_count = sum(1 for w in special_workers if w["management_level"] == "C1")
        c2_count = sum(1 for w in special_workers if w["management_level"] == "C2")
        c3_count = sum(1 for w in special_workers if w["management_level"] == "C3")

    except Exception as e:
        print(f"Special management query error: {e}")
        special_workers = []
        total_special = c1_count = c2_count = c3_count = 0

    return render_template(
        "admin/safework_special_management.html",
        special_workers=special_workers,
        total_special=total_special,
        c1_count=c1_count,
        c2_count=c2_count,
        c3_count=c3_count,
    )


@admin_bp.route("/safework/environment-measurements")
@admin_required
def safework_environment_measurements():
    """작업환경측정 관리"""
    measurements = [
        {
            "id": 1,
            "measurement_date": "2024-01-15",
            "workplace": "생산라인 A",
            "measurement_type": "소음",
            "result": "82.5 dB",
            "standard": "90 dB",
            "status": "NORMAL",
            "next_measurement": "2024-07-15",
        },
        {
            "id": 2,
            "measurement_date": "2024-01-16",
            "workplace": "화학물질 취급실",
            "measurement_type": "톨루엔",
            "result": "15 ppm",
            "standard": "50 ppm",
            "status": "NORMAL",
            "next_measurement": "2024-07-16",
        },
    ]
    return render_template(
        "admin/safework_environment_measurements.html", measurements=measurements
    )


@admin_bp.route("/safework/risk-assessment")
@admin_required
def safework_risk_assessment():
    """위험성 평가 관리"""
    assessments = [
        {
            "id": 1,
            "workplace": "생산라인 A",
            "hazard": "기계 협착",
            "risk_level": "HIGH",
            "probability": 3,
            "severity": 4,
            "risk_score": 12,
            "control_measures": "안전가드 설치",
            "assessment_date": "2024-01-10",
            "assessor": "안전관리자",
        },
        {
            "id": 2,
            "workplace": "창고",
            "hazard": "추락",
            "risk_level": "MEDIUM",
            "probability": 2,
            "severity": 3,
            "risk_score": 6,
            "control_measures": "안전난간 설치",
            "assessment_date": "2024-01-12",
            "assessor": "안전관리자",
        },
    ]
    return render_template(
        "admin/safework_risk_assessment.html", assessments=assessments
    )


@admin_bp.route("/safework/msds")
@admin_required
def safework_msds():
    """MSDS 관리"""
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


@admin_bp.route("/safework/protective-equipment")
@admin_required
def safework_protective_equipment():
    """보호구 관리"""
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


@admin_bp.route("/safework/education")
@admin_required
def safework_education():
    """교육 이수 현황 관리"""
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


@admin_bp.route("/safework/certifications")
@admin_required
def safework_certifications():
    """자격/면허 관리"""
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

@admin_bp.route("/safework/slack-webhooks")
@admin_required
def safework_slack_webhooks():
    """Slack 웹훅 관리 페이지"""
    track_page_view("safework_slack_webhooks")
    track_admin_action("VIEW_SLACK_WEBHOOKS")
    
    try:
        # Slack 웹훅 설정 목록 조회
        from models import SlackWebhookConfigModel, SlackNotificationLogModel
        
        webhooks = SlackWebhookConfigModel.query.order_by(SlackWebhookConfigModel.created_at.desc()).all()
        
        # 최근 알림 로그 조회
        recent_logs = SlackNotificationLogModel.query.order_by(
            SlackNotificationLogModel.sent_at.desc()
        ).limit(10).all()
        
        # 통계 계산
        total_webhooks = len(webhooks)
        active_webhooks = sum(1 for w in webhooks if w.is_active)
        total_notifications_today = SlackNotificationLogModel.query.filter(
            func.date(SlackNotificationLogModel.sent_at) == datetime.now().date()
        ).count()
        
        # 성공률 계산 (최근 7일)
        week_ago = datetime.now() - timedelta(days=7)
        week_logs = SlackNotificationLogModel.query.filter(
            SlackNotificationLogModel.sent_at >= week_ago
        ).all()
        
        success_rate = 0
        if week_logs:
            success_count = sum(1 for log in week_logs if log.status == 'sent')
            success_rate = round((success_count / len(week_logs)) * 100, 1)
        
        return render_template(
            "admin/safework_slack_webhooks.html",
            webhooks=webhooks,
            recent_logs=recent_logs,
            total_webhooks=total_webhooks,
            active_webhooks=active_webhooks,
            total_notifications_today=total_notifications_today,
            success_rate=success_rate
        )
        
    except Exception as e:
        app.logger.error(f"Slack 웹훅 페이지 로드 오류: {e}")
        flash(f"Slack 웹훅 데이터를 가져오는 중 오류가 발생했습니다: {str(e)}", "danger")
        return render_template(
            "admin/safework_slack_webhooks.html",
            webhooks=[],
            recent_logs=[],
            total_webhooks=0,
            active_webhooks=0,
            total_notifications_today=0,
            success_rate=0
        )


@admin_bp.route("/safework/departments")
@admin_required
def safework_departments():
    """부서별 현황 관리"""
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


@admin_bp.route("/msds")
@admin_required
def msds_dashboard():
    track_page_view("msds_dashboard")
    track_admin_action("VIEW_MSDS_DASHBOARD")
    """MSDS 관리 대시보드"""
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


@admin_bp.route("/msds/list")
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


@admin_bp.route("/msds/create", methods=["GET", "POST"])
@admin_required
def msds_create():
    """MSDS 등록"""
    if request.method == "POST":
        try:
            # 기본 정보 수집
            msds = MSDSModel(
                substance_name=request.form.get("substance_name"),
                cas_number=request.form.get("cas_number"),
                manufacturer=request.form.get("manufacturer"),
                supplier=request.form.get("supplier"),
                msds_number=request.form.get("msds_number"),
                signal_word=request.form.get("signal_word"),
                is_special_management=request.form.get("is_special_management") == "on",
                special_management_type=request.form.get("special_management_type"),
                notes=request.form.get("notes"),
            )

            # 개정일자 처리
            revision_date_str = request.form.get("revision_date")
            if revision_date_str:
                msds.revision_date = datetime.strptime(
                    revision_date_str, "%Y-%m-%d"
                ).date()

            # GHS 그림문자 처리 (체크박스)
            ghs_pictograms = []
            for pictogram in [
                "explosive",
                "flammable",
                "oxidizing",
                "compressed_gas",
                "corrosive",
                "toxic",
                "harmful",
                "health_hazard",
                "environmental_hazard",
            ]:
                if request.form.get(f"ghs_{pictogram}"):
                    ghs_pictograms.append(pictogram)
            msds.ghs_pictograms = ghs_pictograms

            # 유해성 분류 처리
            hazard_classification = []
            hazard_class = request.form.get("hazard_class")
            hazard_category = request.form.get("hazard_category")
            if hazard_class and hazard_category:
                hazard_classification.append(
                    {"class": hazard_class, "category": hazard_category}
                )
            msds.hazard_classification = hazard_classification

            db.session.add(msds)
            db.session.commit()

            # 성분 정보 추가
            component_names = request.form.getlist("component_name[]")
            component_cas = request.form.getlist("component_cas[]")
            component_concentrations = request.form.getlist("component_concentration[]")

            for i, name in enumerate(component_names):
                if name.strip():
                    component = MSDSComponentModel(
                        msds_id=msds.id,
                        component_name=name,
                        cas_number=component_cas[i] if i < len(component_cas) else "",
                        concentration_exact=float(component_concentrations[i])
                        if i < len(component_concentrations)
                        and component_concentrations[i]
                        else None,
                    )
                    db.session.add(component)

            db.session.commit()

            flash("MSDS가 완료되었습니다.", "success")
            return redirect(url_for("admin.msds_list"))

        except Exception as e:
            db.session.rollback()
            flash(f"MSDS 등록 중 오류가 발생했습니다: {str(e)}", "error")

    return render_template("admin/msds_create.html")


@admin_bp.route("/msds/<int:msds_id>")
@admin_required
def msds_detail(msds_id):
    """MSDS 상세 정보"""
    msds = MSDSModel.query.get_or_404(msds_id)
    components = MSDSComponentModel.query.filter_by(msds_id=msds_id).all()
    usage_records = (
        MSDSUsageRecordModel.query.filter_by(msds_id=msds_id)
        .order_by(MSDSUsageRecordModel.usage_date.desc())
        .all()
    )

    return render_template(
        "admin/msds_detail.html",
        msds=msds,
        components=components,
        usage_records=usage_records,
    )


@admin_bp.route("/msds/<int:msds_id>/edit", methods=["GET", "POST"])
@admin_required
def msds_edit(msds_id):
    """MSDS 수정"""
    msds = MSDSModel.query.get_or_404(msds_id)

    if request.method == "POST":
        try:
            # 기본 정보 업데이트
            msds.substance_name = request.form.get("substance_name")
            msds.cas_number = request.form.get("cas_number")
            msds.manufacturer = request.form.get("manufacturer")
            msds.supplier = request.form.get("supplier")
            msds.msds_number = request.form.get("msds_number")
            msds.signal_word = request.form.get("signal_word")
            msds.is_special_management = (
                request.form.get("is_special_management") == "on"
            )
            msds.special_management_type = request.form.get("special_management_type")
            msds.notes = request.form.get("notes")
            msds.status = request.form.get("status", "active")

            # 개정일자 처리
            revision_date_str = request.form.get("revision_date")
            if revision_date_str:
                msds.revision_date = datetime.strptime(
                    revision_date_str, "%Y-%m-%d"
                ).date()

            db.session.commit()
            flash("MSDS가 완료되었습니다.", "success")
            return redirect(url_for("admin.msds_detail", msds_id=msds_id))

        except Exception as e:
            db.session.rollback()
            flash(f"MSDS 수정 중 오류가 발생했습니다: {str(e)}", "error")

    components = MSDSComponentModel.query.filter_by(msds_id=msds_id).all()
    return render_template("admin/msds_edit.html", msds=msds, components=components)


@admin_bp.route("/msds/<int:msds_id>/usage", methods=["POST"])
@admin_required
def msds_add_usage(msds_id):
    """MSDS 사용 기록 추가"""
    msds = MSDSModel.query.get_or_404(msds_id)

    try:
        usage_record = MSDSUsageRecordModel(
            msds_id=msds_id,
            user_id=current_user.id,
            workplace_area=request.form.get("workplace_area"),
            usage_purpose=request.form.get("usage_purpose"),
            quantity_used=float(request.form.get("quantity_used", 0)),
            quantity_unit=request.form.get("quantity_unit"),
            safety_measures=request.form.get("safety_measures"),
            notes=request.form.get("notes"),
        )

        # PPE 사용 정보
        ppe_items = []
        for ppe in ["gloves", "goggles", "mask", "apron", "boots"]:
            if request.form.get(f"ppe_{ppe}"):
                ppe_items.append(ppe)
        usage_record.ppe_used = ppe_items

        db.session.add(usage_record)
        db.session.commit()

        flash("사용 기록이 추가되었습니다.", "success")

    except Exception as e:
        db.session.rollback()
        flash(f"사용 기록 추가 중 오류가 발생했습니다: {str(e)}", "error")

    return redirect(url_for("admin.msds_detail", msds_id=msds_id))


@admin_bp.route("/survey/statistics")
@admin_required
def survey_statistics():
    """설문조사 통계 분석 페이지 - 엑셀과 같은 형태"""
    try:
        # 전체 설문 데이터 조회
        surveys = Survey.query.all()

        # 1. 기본 통계
        total_surveys = len(surveys)
        musculo_surveys = len([s for s in surveys if s.form_type == "001"])
        newbie_surveys = len([s for s in surveys if s.form_type == "002"])

        # 2. 부서별 통계
        dept_stats = {}
        for survey in surveys:
            dept = survey.department or "미분류"
            if dept not in dept_stats:
                dept_stats[dept] = {
                    "응답자수": 0,
                    "평균나이": 0,
                    "남성": 0,
                    "여성": 0,
                    "통증호소자": 0,
                    "관리대상자": 0,
                }
            dept_stats[dept]["응답자수"] += 1
            if survey.age:
                dept_stats[dept]["평균나이"] += survey.age
            if survey.gender == "남성":
                dept_stats[dept]["남성"] += 1
            elif survey.gender == "여성":
                dept_stats[dept]["여성"] += 1
            if survey.has_symptoms:
                dept_stats[dept]["통증호소자"] += 1
                # 관리대상자 판정 로직 (엑셀 기준 적용)
                if is_management_target(survey):
                    dept_stats[dept]["관리대상자"] += 1

        # 평균 나이 계산
        for dept, stats in dept_stats.items():
            if stats["응답자수"] > 0:
                stats["평균나이"] = round(stats["평균나이"] / stats["응답자수"], 1)

        # 3. 신체부위별 통증 분포
        body_parts = ["목", "어깨", "팔/팔꿈치", "손/손목/손가락", "허리", "다리/발"]
        body_part_stats = {}

        for part in body_parts:
            body_part_stats[part] = {
                "통증호소자": 0,
                "약한통증": 0,
                "중간통증": 0,
                "심한통증": 0,
                "매우심한통증": 0,
                "관리대상자": 0,
            }

        # responses 필드에서 근골격계 데이터 분석
        for survey in surveys:
            if survey.responses and survey.form_type == "001":
                analyze_musculo_symptoms(survey, body_part_stats)

        # 4. 작업부하 분포
        workload_stats = {"전혀 힘들지 않음": 0, "견딜만 함": 0, "약간 힘듦": 0, "매우 힘듦": 0}

        for survey in surveys:
            if survey.responses and "work_difficulty" in survey.responses:
                difficulty = survey.responses["work_difficulty"]
                if difficulty in workload_stats:
                    workload_stats[difficulty] += 1

        return render_template(
            "admin/survey_statistics.html",
            total_surveys=total_surveys,
            musculo_surveys=musculo_surveys,
            newbie_surveys=newbie_surveys,
            dept_stats=dept_stats,
            body_part_stats=body_part_stats,
            workload_stats=workload_stats,
        )

    except Exception as e:
        app.logger.error(f"Survey statistics error: {e}")
        flash(f"통계 분석 중 오류가 발생했습니다: {str(e)}", "error")
        return redirect(url_for("admin.survey"))


def is_management_target(survey):
    """관리대상자 판정 - 엑셀 기준 적용"""
    if not survey.responses or not survey.has_symptoms:
        return False

    # 엑셀 기준:
    # 2번 통증기간: 적어도 1주일이상 지속되거나(OR)
    # 4번 통증빈도: 1달에 한번 이상 통증발생되고
    # 3번 통증강도: '중간 정도'인 경우
    # 또는
    # 2번 통증기간: 적어도 1주일이상 지속되고(AND)
    # 4번 통증빈도: 1달에 한번 이상 통증발생되고
    # 3번 통증강도: '심한 통증' 또는 '매우심한 통증'인 경우

    try:
        responses = survey.responses
        musculo_details = responses.get("musculo_details", [])

        for detail in musculo_details:
            duration = detail.get("duration", "")
            frequency = detail.get("frequency", "")
            severity = detail.get("severity", "")

            # 기간 체크: 1주일 이상
            week_or_more = any(period in duration for period in ["1주일", "1달", "6개월"])

            # 빈도 체크: 1달에 1번 이상
            monthly_or_more = any(
                freq in frequency for freq in ["1달에 1번", "1주일에 1번", "매일"]
            )

            # 강도 체크
            moderate_pain = "중간 통증" in severity
            severe_pain = any(level in severity for level in ["심한 통증", "매우 심한 통증"])

            # 관리대상자 조건
            condition1 = week_or_more or (monthly_or_more and moderate_pain)
            condition2 = week_or_more and monthly_or_more and severe_pain

            if condition1 or condition2:
                return True

        return False

    except Exception:
        return False


def analyze_musculo_symptoms(survey, body_part_stats):
    """근골격계 증상 분석"""
    try:
        responses = survey.responses
        musculo_details = responses.get("musculo_details", [])

        for detail in musculo_details:
            part = detail.get("part", "")
            severity = detail.get("severity", "")

            if part in body_part_stats:
                body_part_stats[part]["통증호소자"] += 1

                if "약한 통증" in severity:
                    body_part_stats[part]["약한통증"] += 1
                elif "중간 통증" in severity:
                    body_part_stats[part]["중간통증"] += 1
                elif "심한 통증" in severity:
                    body_part_stats[part]["심한통증"] += 1
                elif "매우 심한 통증" in severity:
                    body_part_stats[part]["매우심한통증"] += 1

                # 관리대상자 판정
                if is_management_target_by_detail(detail):
                    body_part_stats[part]["관리대상자"] += 1

    except Exception as e:
        pass  # 에러 무시하고 계속 진행


def is_management_target_by_detail(detail):
    """개별 부위별 관리대상자 판정"""
    try:
        duration = detail.get("duration", "")
        frequency = detail.get("frequency", "")
        severity = detail.get("severity", "")

        week_or_more = any(period in duration for period in ["1주일", "1달", "6개월"])
        monthly_or_more = any(freq in frequency for freq in ["1달에 1번", "1주일에 1번", "매일"])
        moderate_pain = "중간 통증" in severity
        severe_pain = any(level in severity for level in ["심한 통증", "매우 심한 통증"])

        return (week_or_more or (monthly_or_more and moderate_pain)) or (
            week_or_more and monthly_or_more and severe_pain
        )

    except Exception:
        return False
