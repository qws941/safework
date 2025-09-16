import io
from datetime import datetime, timedelta, date
from functools import wraps

import pandas as pd
from flask import (Blueprint, flash, jsonify, redirect, render_template,
                   request, send_file, url_for)
from flask_login import current_user, login_required
from openpyxl import Workbook
from sqlalchemy import and_, func, or_, text

from forms import AdminFilterForm
from models import AuditLog, Survey, SurveyStatistics, User, Process, db, MSDSModel, MSDSComponentModel, MSDSUsageRecordModel
try:
    from models_safework_v2 import (
        SafeworkWorker, SafeworkHealthCheck, SafeworkMedicalVisit,
        SafeworkMedication, SafeworkMedicationLog, SafeworkHealthPlan,
        SafeworkTodo
    )
except ImportError:
    # SafeWork 모델이 없는 경우 더미 클래스 생성
    class SafeworkWorker: pass
    class SafeworkHealthCheck: pass
    class SafeworkMedicalVisit: pass
    class SafeworkMedication: pass
    class SafeworkTodo: pass

admin_bp = Blueprint("admin", __name__)


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
    return redirect(url_for('admin.safework_dashboard'))


@admin_bp.route("/survey")
@admin_required
def survey():
    """조사표 목록 관리 - 통합된 라우트"""
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
    form.department.choices = [("", "전체")] + [
        (d[0], d[0]) for d in departments if d[0]
    ]

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
    survey = Survey.query.get_or_404(id)
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
        
        # 템플릿을 사용하여 정상적인 응답 반환
        return render_template("admin/review_survey.html", survey=survey)
        
    except Exception as e:
        flash(f'설문 조회 중 오류가 발생했습니다: {str(e)}', 'error')
        return redirect(url_for('admin.surveys'))


@admin_bp.route("/export/excel")
@admin_required
def export_excel():
    """Excel 파일로 내보내기"""
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
                "추가데이터": str(s.responses) if s.responses else ""
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
            func.count(func.case((Survey.has_symptoms == True, 1), else_=None)).label("with_symptoms"),
            func.count(func.case((Survey.has_symptoms == False, 1), else_=None)).label("without_symptoms"),
            func.count(Survey.id).label("total")
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
    page = request.args.get("page", 1, type=int)
    users = User.query.paginate(page=page, per_page=20, error_out=False)

    return render_template("admin/users.html", users=users)


@admin_bp.route("/safework")
@admin_required
def safework_dashboard():
    """SafeWork 안전보건관리 대시보드"""
    from datetime import datetime, date, timedelta
    
    # 현재 날짜 정보
    today = date.today().strftime("%Y-%m-%d")
    current_year = datetime.now().year
    
    # 실제 SafeWork 데이터베이스에서 통계 가져오기
    try:
        # 근로자 통계 (safework_workers 테이블)
        worker_total_query = db.session.execute(text("SELECT COUNT(*) FROM safework_workers WHERE is_active = 1"))
        worker_total = worker_total_query.fetchone()[0] if worker_total_query else 0
        
        worker_active_query = db.session.execute(text("SELECT COUNT(*) FROM safework_workers WHERE is_active = 1"))
        worker_active = worker_active_query.fetchone()[0] if worker_active_query else 0
        
        worker_leave_query = db.session.execute(text("SELECT COUNT(*) FROM safework_workers WHERE is_active = 0"))
        worker_leave = worker_leave_query.fetchone()[0] if worker_leave_query else 0
        
        # 건강검진 통계
        health_check_total_query = db.session.execute(text("SELECT COUNT(*) FROM safework_health_checks"))
        health_check_completed = health_check_total_query.fetchone()[0] if health_check_total_query else 0
        health_check_target = worker_total
        health_check_rate = round((health_check_completed / health_check_target * 100) if health_check_target > 0 else 0, 1)
        
        # 이번 달 의무실 방문 통계
        month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        medical_visits_query = db.session.execute(
            text("SELECT COUNT(*) FROM safework_medical_visits WHERE visit_date >= :month_start"), 
            {"month_start": month_start}
        )
        medical_visits_month = medical_visits_query.fetchone()[0] if medical_visits_query else 0
        
        # 실제 건강검진 일정 데이터
        health_checks_query = db.session.execute("""
            SELECT sw.name as worker_name, shc.check_type, shc.check_date as scheduled_date, 
                   CASE WHEN shc.result IS NOT NULL THEN 'COMPLETED' ELSE 'SCHEDULED' END as status
            FROM safework_health_checks shc
            JOIN safework_workers sw ON shc.worker_id = sw.id
            ORDER BY shc.check_date DESC
            LIMIT 5
        """)
        health_checks = []
        for row in health_checks_query:
            health_checks.append({
                'scheduled_date': row[2].strftime('%Y-%m-%d') if row[2] else '',
                'worker_name': row[0] or '',
                'check_type': row[1] or '일반',
                'status': row[3] or 'SCHEDULED'
            })
        
        # 실제 의무실 방문 데이터
        medical_visits_query = db.session.execute("""
            SELECT smv.visit_date, sw.name as worker_name, smv.chief_complaint, smv.follow_up_needed
            FROM safework_medical_visits smv
            JOIN safework_workers sw ON smv.worker_id = sw.id
            ORDER BY smv.visit_date DESC
            LIMIT 5
        """)
        medical_visits = []
        for row in medical_visits_query:
            medical_visits.append({
                'visit_date': row[0] if row[0] else datetime.now(),
                'worker_name': row[1] or '',
                'chief_complaint': row[2] or '증상 없음',
                'follow_up_needed': bool(row[3]) if row[3] is not None else False
            })
        
        # 부서별 통계 (실제 데이터)
        dept_stats_query = db.session.execute("""
            SELECT department, COUNT(*) as total_workers,
                   COUNT(CASE WHEN (SELECT COUNT(*) FROM safework_health_checks WHERE worker_id = sw.id) > 0 THEN 1 END) as completed
            FROM safework_workers sw
            WHERE is_active = 1
            GROUP BY department
        """)
        
        department_names = []
        department_completed = []
        department_pending = []
        
        for row in dept_stats_query:
            dept_name = row[0] or '미지정'
            total = row[1] or 0
            completed = row[2] or 0
            pending = total - completed
            
            department_names.append(dept_name)
            department_completed.append(completed)
            department_pending.append(pending)
        
        # 의약품 재고 부족 확인
        low_stock_query = db.session.execute("""
            SELECT COUNT(*) FROM safework_medications 
            WHERE current_stock <= minimum_stock
        """)
        low_stock_count = low_stock_query.fetchone()[0] if low_stock_query else 0
        
        # 곧 만료될 의약품 확인
        expiry_soon_query = db.session.execute("""
            SELECT COUNT(*) FROM safework_medications 
            WHERE expiry_date <= CURRENT_DATE + INTERVAL '30 days'
        """)
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
        department_names = ['데이터 없음']
        department_completed = [0]
        department_pending = [0]
        low_stock_count = 0
        expiry_soon_count = 0
    
    # 기본값들
    medical_change = -5.2
    env_status = '정상'
    next_measurement = '2024-06-15'
    
    # 알림 데이터 (실제 데이터 기반)
    alerts = []
    if health_check_target - health_check_completed > 0:
        alerts.append({
            'type': 'warning', 
            'title': '건강검진 미수검자', 
            'message': f'{health_check_target - health_check_completed}명'
        })
    
    alerts.extend([
        {'type': 'info', 'title': '작업환경측정', 'message': 'D-45'},
        {'type': 'success', 'title': '안전교육 완료율', 'message': '94.2%'}
    ])
    
    if low_stock_count > 0:
        alerts.append({
            'type': 'danger', 
            'title': '의약품 재고부족', 
            'message': f'{low_stock_count}종'
        })
    
    if expiry_soon_count > 0:
        alerts.append({
            'type': 'warning', 
            'title': '의약품 유효기간 임박', 
            'message': f'{expiry_soon_count}종'
        })
    
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
        alerts=alerts
    )


@admin_bp.route("/safework/todos")
@admin_required 
def safework_todos():
    """SafeWork Todo 관리 대시보드"""
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
        pending_todos = SafeworkTodo.query.filter_by(status='Pending').count()
        in_progress_todos = SafeworkTodo.query.filter_by(status='In Progress').count()
        completed_todos = SafeworkTodo.query.filter_by(status='Completed').count()
        high_priority_todos = SafeworkTodo.query.filter_by(priority='High').count()
        
        # 진행률 계산
        if total_todos > 0:
            completion_rate = round((completed_todos / total_todos) * 100, 1)
        else:
            completion_rate = 0
            
        return render_template("admin/safework_todos.html",
            todos=todos,
            total_todos=total_todos,
            pending_todos=pending_todos,
            in_progress_todos=in_progress_todos,
            completed_todos=completed_todos,
            high_priority_todos=high_priority_todos,
            completion_rate=completion_rate,
            current_status=status_filter,
            current_priority=priority_filter,
            current_category=category_filter
        )
    except Exception as e:
        flash(f"Todo 데이터를 가져오는 중 오류가 발생했습니다: {str(e)}", "danger")
        return render_template("admin/safework_todos.html",
            todos=None,
            total_todos=0,
            pending_todos=0,
            in_progress_todos=0,
            completed_todos=0,
            high_priority_todos=0,
            completion_rate=0
        )


@admin_bp.route("/safework/workers")
@admin_required
def safework_workers():
    """SafeWork 근로자 관리"""
    page = request.args.get("page", 1, type=int)
    per_page = 10
    
    try:
        # 실제 근로자 데이터 조회 (페이지네이션 적용)
        workers_query = db.session.execute("""
            SELECT sw.id, sw.employee_number, sw.name, sw.department, sw.position, 
                   sw.hire_date, sw.birth_date, sw.is_active,
                   (SELECT MAX(check_date) FROM safework_health_checks WHERE worker_id = sw.id) as last_check_date
            FROM safework_workers sw
            ORDER BY sw.employee_number
            LIMIT %s OFFSET %s
        """, (per_page, (page - 1) * per_page))
        
        workers = []
        for row in workers_query:
            # 나이 계산
            age = None
            if row[6]:  # birth_date
                from datetime import date
                today = date.today()
                birth_date = row[6] if isinstance(row[6], date) else datetime.strptime(row[6], '%Y-%m-%d').date()
                age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
            
            worker = {
                'id': row[0],
                'employee_number': row[1] or '',
                'name': row[2] or '',
                'department': row[3] or '미지정',
                'position': row[4] or '사원',
                'hire_date': row[5].strftime('%Y-%m-%d') if row[5] else '',
                'age': age,
                'last_check_date': row[8].strftime('%Y-%m-%d') if row[8] else None,
                'is_special_management': False,  # 추후 특별관리 로직 추가
                'status': 'ACTIVE' if row[7] else 'INACTIVE'
            }
            workers.append(worker)
        
        # 총 근로자 수 조회
        total_query = db.session.execute("SELECT COUNT(*) FROM safework_workers")
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
        total_pages=total_pages
    )


@admin_bp.route("/safework/health-checks")
@admin_required
def safework_health_checks():
    """SafeWork 건강검진 관리"""
    
    # 샘플 통계 데이터
    total_targets = 245
    completed_count = 214
    scheduled_count = 31
    completion_rate = round((completed_count / total_targets * 100) if total_targets > 0 else 0, 1)
    
    # 샘플 검진 계획 데이터
    health_plans = [
        {
            'id': 1, 'year': 2024, 'type': 'GENERAL', 'planned_date': '2024-03-15',
            'target_count': 150, 'completed_count': 142, 'status': 'IN_PROGRESS',
            'completion_rate': 94.7
        },
        {
            'id': 2, 'year': 2024, 'type': 'SPECIAL', 'planned_date': '2024-06-15',
            'target_count': 95, 'completed_count': 72, 'status': 'IN_PROGRESS',
            'completion_rate': 75.8
        }
    ]
    
    # 샘플 대상자 데이터
    health_targets = [
        {
            'id': 1, 'employee_number': '2024001', 'name': '김철수',
            'department': '생산부', 'check_type': '일반', 'scheduled_date': '2024-03-20',
            'hospital_name': '서울대학교병원', 'status': 'SCHEDULED'
        },
        {
            'id': 2, 'employee_number': '2024002', 'name': '이영희',
            'department': '품질관리부', 'check_type': '특수', 'scheduled_date': '2024-03-21',
            'hospital_name': '삼성서울병원', 'status': 'COMPLETED'
        }
    ]
    
    # 샘플 검진 결과 데이터
    health_results = [
        {
            'id': 1, 'check_date': '2024-01-15', 'name': '박지성',
            'department': '생산부', 'grade': 'B', 'bmi': 23.5,
            'blood_pressure': '120/80', 'follow_up_required': False
        },
        {
            'id': 2, 'check_date': '2024-01-16', 'name': '김연아',
            'department': '경영지원부', 'grade': 'C', 'bmi': 27.2,
            'blood_pressure': '140/90', 'follow_up_required': True
        }
    ]
    
    return render_template(
        "admin/safework_health_checks.html",
        total_targets=total_targets,
        completed_count=completed_count,
        scheduled_count=scheduled_count,
        completion_rate=completion_rate,
        health_plans=health_plans,
        health_targets=health_targets,
        health_results=health_results
    )


@admin_bp.route("/safework/medical-visits")
@admin_required
def safework_medical_visits():
    """SafeWork 의무실 방문 관리"""
    from datetime import timedelta
    
    try:
        # 실제 통계 데이터
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        month_start = datetime.now().replace(day=1).date()
        
        # 오늘 방문 수
        today_visits_query = db.session.execute("""
            SELECT COUNT(*) FROM safework_medical_visits 
            WHERE visit_date::date = %s
        """, (today,))
        today_visits = today_visits_query.fetchone()[0] if today_visits_query else 0
        
        # 이번 주 방문 수
        week_visits_query = db.session.execute("""
            SELECT COUNT(*) FROM safework_medical_visits 
            WHERE visit_date::date >= %s
        """, (week_ago,))
        week_visits = week_visits_query.fetchone()[0] if week_visits_query else 0
        
        # 이번 달 방문 수
        month_visits_query = db.session.execute("""
            SELECT COUNT(*) FROM safework_medical_visits 
            WHERE visit_date::date >= %s
        """, (month_start,))
        month_visits = month_visits_query.fetchone()[0] if month_visits_query else 0
        
        # 추적관찰 필요한 경우 수
        followup_query = db.session.execute("""
            SELECT COUNT(*) FROM safework_medical_visits 
            WHERE follow_up_needed = 1 AND (follow_up_date IS NULL OR follow_up_date >= CURRENT_DATE)
        """)
        followup_needed = followup_query.fetchone()[0] if followup_query else 0
        
        # 실제 방문 기록 데이터
        visits_query = db.session.execute("""
            SELECT smv.id, smv.visit_date, sw.employee_number, sw.name, sw.department,
                   smv.chief_complaint, smv.diagnosis, smv.treatment, smv.medication_given,
                   smv.follow_up_needed, smv.follow_up_date, smv.nurse_name
            FROM safework_medical_visits smv
            JOIN safework_workers sw ON smv.worker_id = sw.id
            ORDER BY smv.visit_date DESC
            LIMIT 20
        """)
        
        medical_visits = []
        for row in visits_query:
            # vital_signs는 JSON 필드이므로 파싱 필요 (현재는 기본값 사용)
            vital_signs = {'bp': '정상', 'hr': '정상', 'bt': '정상'}
            
            visit = {
                'id': row[0],
                'visit_date': row[1].strftime('%Y-%m-%d %H:%M') if row[1] else '',
                'employee_number': row[2] or '',
                'worker_name': row[3] or '',
                'department': row[4] or '미지정',
                'chief_complaint': row[5] or '',
                'vital_signs': vital_signs,
                'diagnosis': row[6] or '',
                'treatment': row[7] or '',
                'medication_given': row[8] or '',
                'follow_up_needed': bool(row[9]),
                'follow_up_date': row[10].strftime('%Y-%m-%d') if row[10] else None,
                'nurse_name': row[11] or '간호사'
            }
            medical_visits.append(visit)
        
        # 근로자 목록 (새 방문 기록 입력용)
        workers_query = db.session.execute("""
            SELECT id, name, employee_number FROM safework_workers 
            WHERE is_active = 1 
            ORDER BY employee_number
        """)
        
        workers = []
        for row in workers_query:
            workers.append({
                'id': row[0],
                'name': row[1] or '',
                'employee_number': row[2] or ''
            })
            
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
        workers=workers
    )


@admin_bp.route("/safework/medications")
@admin_required
def safework_medications():
    """SafeWork 의약품 관리"""
    
    try:
        # 실제 의약품 통계
        total_query = db.session.execute("SELECT COUNT(*) FROM safework_medications")
        total_medications = total_query.fetchone()[0] if total_query else 0
        
        # 재고 부족 의약품 수
        low_stock_query = db.session.execute("""
            SELECT COUNT(*) FROM safework_medications 
            WHERE current_stock <= minimum_stock
        """)
        low_stock_count = low_stock_query.fetchone()[0] if low_stock_query else 0
        
        # 30일 내 만료 예정 의약품 수
        expiry_soon_query = db.session.execute("""
            SELECT COUNT(*) FROM safework_medications 
            WHERE expiry_date <= CURRENT_DATE + INTERVAL '30 days'
        """)
        expiry_soon_count = expiry_soon_query.fetchone()[0] if expiry_soon_query else 0
        
        # 총 재고 가치
        value_query = db.session.execute("""
            SELECT COALESCE(SUM(current_stock * price_per_unit), 0) 
            FROM safework_medications 
            WHERE price_per_unit IS NOT NULL
        """)
        total_value = value_query.fetchone()[0] if value_query else 0
        
        # 실제 의약품 데이터
        meds_query = db.session.execute("""
            SELECT id, name, category, unit, current_stock, minimum_stock, 
                   expiry_date, supplier, price_per_unit, last_purchase_date
            FROM safework_medications
            ORDER BY 
                CASE WHEN current_stock <= minimum_stock THEN 0 ELSE 1 END,
                CASE WHEN expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 0 ELSE 1 END,
                name
        """)
        
        medications = []
        today = datetime.now().date()
        
        for row in meds_query:
            expiry_date = row[6]
            is_expired = False
            expiry_soon = False
            
            if expiry_date:
                if isinstance(expiry_date, str):
                    expiry_date = datetime.strptime(expiry_date, '%Y-%m-%d').date()
                
                if expiry_date < today:
                    is_expired = True
                elif expiry_date <= today + timedelta(days=30):
                    expiry_soon = True
            
            medication = {
                'id': row[0],
                'name': row[1] or '',
                'category': row[2] or '기타',
                'unit': row[3] or '개',
                'current_stock': row[4] or 0,
                'minimum_stock': row[5] or 0,
                'expiry_date': expiry_date.strftime('%Y-%m-%d') if expiry_date else '',
                'supplier': row[7] or '',
                'price_per_unit': row[8] or 0,
                'last_purchase_date': row[9].strftime('%Y-%m-%d') if row[9] else '',
                'is_expired': is_expired,
                'expiry_soon': expiry_soon
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
        medications=medications
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
    consultations = [
        {
            'id': 1, 'date': '2024-01-15', 'worker_name': '김철수',
            'department': '생산부', 'consultation_type': '개인상담',
            'counselor': '보건관리자', 'topic': '스트레스 관리',
            'status': 'COMPLETED'
        },
        {
            'id': 2, 'date': '2024-01-16', 'worker_name': '이영희',
            'department': '품질관리부', 'consultation_type': '집단상담',
            'counselor': '산업간호사', 'topic': '금연 프로그램',
            'status': 'IN_PROGRESS'
        }
    ]
    return render_template("admin/safework_consultations.html", consultations=consultations)

@admin_bp.route("/safework/health-programs")
@admin_required
def safework_health_programs():
    """건강증진 프로그램 관리"""
    programs = [
        {
            'id': 1, 'name': '금연 프로그램', 'start_date': '2024-01-01',
            'end_date': '2024-03-31', 'participants': 25,
            'completion_rate': 68.0, 'status': 'ACTIVE'
        },
        {
            'id': 2, 'name': '운동 프로그램', 'start_date': '2024-02-01',
            'end_date': '2024-04-30', 'participants': 40,
            'completion_rate': 82.5, 'status': 'ACTIVE'
        }
    ]
    return render_template("admin/safework_health_programs.html", programs=programs)

@admin_bp.route("/safework/special-management")
@admin_required
def safework_special_management():
    """특별관리 대상자 관리"""
    special_workers = [
        {
            'id': 1, 'name': '박지성', 'employee_number': '2024001',
            'department': '생산부', 'reason': '고혈압',
            'management_level': 'C1', 'last_check': '2024-01-10',
            'next_check': '2024-07-10', 'status': 'ACTIVE'
        },
        {
            'id': 2, 'name': '김연아', 'employee_number': '2024002',
            'department': '품질관리부', 'reason': '당뇨',
            'management_level': 'C2', 'last_check': '2024-01-15',
            'next_check': '2024-04-15', 'status': 'ACTIVE'
        }
    ]
    return render_template("admin/safework_special_management.html", special_workers=special_workers)

@admin_bp.route("/safework/environment-measurements")
@admin_required
def safework_environment_measurements():
    """작업환경측정 관리"""
    measurements = [
        {
            'id': 1, 'measurement_date': '2024-01-15', 'workplace': '생산라인 A',
            'measurement_type': '소음', 'result': '82.5 dB',
            'standard': '90 dB', 'status': 'NORMAL', 'next_measurement': '2024-07-15'
        },
        {
            'id': 2, 'measurement_date': '2024-01-16', 'workplace': '화학물질 취급실',
            'measurement_type': '톨루엔', 'result': '15 ppm',
            'standard': '50 ppm', 'status': 'NORMAL', 'next_measurement': '2024-07-16'
        }
    ]
    return render_template("admin/safework_environment_measurements.html", measurements=measurements)

@admin_bp.route("/safework/risk-assessment")
@admin_required
def safework_risk_assessment():
    """위험성 평가 관리"""
    assessments = [
        {
            'id': 1, 'workplace': '생산라인 A', 'hazard': '기계 협착',
            'risk_level': 'HIGH', 'probability': 3, 'severity': 4,
            'risk_score': 12, 'control_measures': '안전가드 설치',
            'assessment_date': '2024-01-10', 'assessor': '안전관리자'
        },
        {
            'id': 2, 'workplace': '창고', 'hazard': '추락',
            'risk_level': 'MEDIUM', 'probability': 2, 'severity': 3,
            'risk_score': 6, 'control_measures': '안전난간 설치',
            'assessment_date': '2024-01-12', 'assessor': '안전관리자'
        }
    ]
    return render_template("admin/safework_risk_assessment.html", assessments=assessments)

@admin_bp.route("/safework/msds")
@admin_required
def safework_msds():
    """MSDS 관리"""
    msds_list = [
        {
            'id': 1, 'chemical_name': '톨루엔', 'cas_number': '108-88-3',
            'supplier': '한국화학', 'last_updated': '2024-01-01',
            'expiry_date': '2027-01-01', 'usage_department': '생산부',
            'hazard_level': 'HIGH', 'storage_location': '화학물질창고 A-1'
        },
        {
            'id': 2, 'chemical_name': '아세톤', 'cas_number': '67-64-1',
            'supplier': '대한케미칼', 'last_updated': '2024-01-15',
            'expiry_date': '2027-01-15', 'usage_department': '품질관리부',
            'hazard_level': 'MEDIUM', 'storage_location': '화학물질창고 B-2'
        }
    ]
    return render_template("admin/safework_msds.html", msds_list=msds_list)

@admin_bp.route("/safework/protective-equipment")
@admin_required
def safework_protective_equipment():
    """보호구 관리"""
    equipment = [
        {
            'id': 1, 'name': '안전헬멧', 'category': '머리보호구',
            'total_quantity': 150, 'distributed': 142, 'available': 8,
            'last_inspection': '2024-01-10', 'next_inspection': '2024-04-10',
            'replacement_cycle': '2년', 'status': 'NORMAL'
        },
        {
            'id': 2, 'name': '안전화', 'category': '발보호구',
            'total_quantity': 200, 'distributed': 195, 'available': 5,
            'last_inspection': '2024-01-15', 'next_inspection': '2024-04-15',
            'replacement_cycle': '1년', 'status': 'LOW_STOCK'
        }
    ]
    return render_template("admin/safework_protective_equipment.html", equipment=equipment)

@admin_bp.route("/safework/education")
@admin_required
def safework_education():
    """교육 이수 현황 관리"""
    education_stats = {
        'total_workers': 245,
        'completed_safety': 230,
        'completed_health': 225,
        'completion_rate_safety': 93.9,
        'completion_rate_health': 91.8
    }
    
    education_records = [
        {
            'id': 1, 'worker_name': '김철수', 'employee_number': '2024001',
            'department': '생산부', 'education_type': '안전교육',
            'completed_date': '2024-01-10', 'valid_until': '2024-12-31',
            'instructor': '안전관리자', 'hours': 4, 'status': 'COMPLETED'
        },
        {
            'id': 2, 'worker_name': '이영희', 'employee_number': '2024002',
            'department': '품질관리부', 'education_type': '보건교육',
            'completed_date': '2024-01-15', 'valid_until': '2024-12-31',
            'instructor': '보건관리자', 'hours': 3, 'status': 'COMPLETED'
        }
    ]
    
    return render_template("admin/safework_education.html", 
                         education_stats=education_stats, 
                         education_records=education_records)

@admin_bp.route("/safework/certifications")
@admin_required
def safework_certifications():
    """자격/면허 관리"""
    certifications = [
        {
            'id': 1, 'worker_name': '박지성', 'employee_number': '2024001',
            'certification_name': '산업안전기사', 'certification_number': 'IS-2023-001',
            'issue_date': '2023-05-15', 'expiry_date': '2028-05-14',
            'issuing_agency': '한국산업인력공단', 'status': 'VALID'
        },
        {
            'id': 2, 'worker_name': '김연아', 'employee_number': '2024002',
            'certification_name': '보건관리자', 'certification_number': 'HM-2022-015',
            'issue_date': '2022-03-20', 'expiry_date': '2025-03-19',
            'issuing_agency': '한국산업인력공단', 'status': 'EXPIRING_SOON'
        }
    ]
    return render_template("admin/safework_certifications.html", certifications=certifications)

@admin_bp.route("/safework/departments")
@admin_required
def safework_departments():
    """부서별 현황 관리"""
    department_stats = [
        {
            'department': '생산부', 'total_workers': 85,
            'health_check_completed': 80, 'education_completed': 82,
            'accident_count': 2, 'high_risk_workers': 5,
            'completion_rate': 94.1
        },
        {
            'department': '품질관리부', 'total_workers': 45,
            'health_check_completed': 44, 'education_completed': 45,
            'accident_count': 0, 'high_risk_workers': 2,
            'completion_rate': 97.8
        },
        {
            'department': '경영지원부', 'total_workers': 35,
            'health_check_completed': 35, 'education_completed': 34,
            'accident_count': 0, 'high_risk_workers': 1,
            'completion_rate': 97.1
        }
    ]
    return render_template("admin/safework_departments.html", department_stats=department_stats)


# === MSDS Management Routes ===

@admin_bp.route("/msds")
@admin_required
def msds_dashboard():
    """MSDS 관리 대시보드"""
    # 통계 데이터
    total_msds = MSDSModel.query.count()
    active_msds = MSDSModel.query.filter_by(status='active').count()
    special_management_count = MSDSModel.query.filter_by(is_special_management=True).count()
    expired_msds = MSDSModel.query.filter(
        MSDSModel.next_review_date < datetime.now()
    ).count()
    
    # 최근 등록된 MSDS
    recent_msds = MSDSModel.query.order_by(MSDSModel.created_at.desc()).limit(10).all()
    
    # 특별관리물질 목록
    special_substances = MSDSModel.query.filter_by(is_special_management=True).all()
    
    stats = {
        'total_msds': total_msds,
        'active_msds': active_msds,
        'special_management_count': special_management_count,
        'expired_msds': expired_msds
    }
    
    return render_template("admin/msds_dashboard.html", 
                         stats=stats, 
                         recent_msds=recent_msds,
                         special_substances=special_substances)


@admin_bp.route("/msds/list")
@admin_required
def msds_list():
    """MSDS 목록 관리"""
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '', type=str)
    status_filter = request.args.get('status', 'all', type=str)
    special_filter = request.args.get('special', 'all', type=str)
    
    query = MSDSModel.query
    
    # 검색 필터
    if search:
        query = query.filter(
            or_(
                MSDSModel.substance_name.ilike(f'%{search}%'),
                MSDSModel.cas_number.ilike(f'%{search}%'),
                MSDSModel.manufacturer.ilike(f'%{search}%')
            )
        )
    
    # 상태 필터
    if status_filter != 'all':
        query = query.filter(MSDSModel.status == status_filter)
    
    # 특별관리물질 필터
    if special_filter == 'yes':
        query = query.filter(MSDSModel.is_special_management == True)
    elif special_filter == 'no':
        query = query.filter(MSDSModel.is_special_management == False)
    
    pagination = query.order_by(MSDSModel.created_at.desc()).paginate(
        page=page, per_page=20, error_out=False
    )
    
    return render_template("admin/msds_list.html", 
                         pagination=pagination,
                         search=search,
                         status_filter=status_filter,
                         special_filter=special_filter)


@admin_bp.route("/msds/create", methods=['GET', 'POST'])
@admin_required
def msds_create():
    """MSDS 등록"""
    if request.method == 'POST':
        try:
            # 기본 정보 수집
            msds = MSDSModel(
                substance_name=request.form.get('substance_name'),
                cas_number=request.form.get('cas_number'),
                manufacturer=request.form.get('manufacturer'),
                supplier=request.form.get('supplier'),
                msds_number=request.form.get('msds_number'),
                signal_word=request.form.get('signal_word'),
                is_special_management=request.form.get('is_special_management') == 'on',
                special_management_type=request.form.get('special_management_type'),
                notes=request.form.get('notes')
            )
            
            # 개정일자 처리
            revision_date_str = request.form.get('revision_date')
            if revision_date_str:
                msds.revision_date = datetime.strptime(revision_date_str, '%Y-%m-%d').date()
            
            # GHS 그림문자 처리 (체크박스)
            ghs_pictograms = []
            for pictogram in ['explosive', 'flammable', 'oxidizing', 'compressed_gas', 'corrosive', 'toxic', 'harmful', 'health_hazard', 'environmental_hazard']:
                if request.form.get(f'ghs_{pictogram}'):
                    ghs_pictograms.append(pictogram)
            msds.ghs_pictograms = ghs_pictograms
            
            # 유해성 분류 처리
            hazard_classification = []
            hazard_class = request.form.get('hazard_class')
            hazard_category = request.form.get('hazard_category')
            if hazard_class and hazard_category:
                hazard_classification.append({
                    'class': hazard_class,
                    'category': hazard_category
                })
            msds.hazard_classification = hazard_classification
            
            db.session.add(msds)
            db.session.commit()
            
            # 성분 정보 추가
            component_names = request.form.getlist('component_name[]')
            component_cas = request.form.getlist('component_cas[]')
            component_concentrations = request.form.getlist('component_concentration[]')
            
            for i, name in enumerate(component_names):
                if name.strip():
                    component = MSDSComponentModel(
                        msds_id=msds.id,
                        component_name=name,
                        cas_number=component_cas[i] if i < len(component_cas) else '',
                        concentration_exact=float(component_concentrations[i]) if i < len(component_concentrations) and component_concentrations[i] else None
                    )
                    db.session.add(component)
            
            db.session.commit()
            
            flash('MSDS가 성공적으로 등록되었습니다.', 'success')
            return redirect(url_for('admin.msds_list'))
            
        except Exception as e:
            db.session.rollback()
            flash(f'MSDS 등록 중 오류가 발생했습니다: {str(e)}', 'error')
    
    return render_template("admin/msds_create.html")


@admin_bp.route("/msds/<int:msds_id>")
@admin_required
def msds_detail(msds_id):
    """MSDS 상세 정보"""
    msds = MSDSModel.query.get_or_404(msds_id)
    components = MSDSComponentModel.query.filter_by(msds_id=msds_id).all()
    usage_records = MSDSUsageRecordModel.query.filter_by(msds_id=msds_id).order_by(MSDSUsageRecordModel.usage_date.desc()).all()
    
    return render_template("admin/msds_detail.html", 
                         msds=msds, 
                         components=components, 
                         usage_records=usage_records)


@admin_bp.route("/msds/<int:msds_id>/edit", methods=['GET', 'POST'])
@admin_required
def msds_edit(msds_id):
    """MSDS 수정"""
    msds = MSDSModel.query.get_or_404(msds_id)
    
    if request.method == 'POST':
        try:
            # 기본 정보 업데이트
            msds.substance_name = request.form.get('substance_name')
            msds.cas_number = request.form.get('cas_number')
            msds.manufacturer = request.form.get('manufacturer')
            msds.supplier = request.form.get('supplier')
            msds.msds_number = request.form.get('msds_number')
            msds.signal_word = request.form.get('signal_word')
            msds.is_special_management = request.form.get('is_special_management') == 'on'
            msds.special_management_type = request.form.get('special_management_type')
            msds.notes = request.form.get('notes')
            msds.status = request.form.get('status', 'active')
            
            # 개정일자 처리
            revision_date_str = request.form.get('revision_date')
            if revision_date_str:
                msds.revision_date = datetime.strptime(revision_date_str, '%Y-%m-%d').date()
            
            db.session.commit()
            flash('MSDS가 성공적으로 수정되었습니다.', 'success')
            return redirect(url_for('admin.msds_detail', msds_id=msds_id))
            
        except Exception as e:
            db.session.rollback()
            flash(f'MSDS 수정 중 오류가 발생했습니다: {str(e)}', 'error')
    
    components = MSDSComponentModel.query.filter_by(msds_id=msds_id).all()
    return render_template("admin/msds_edit.html", msds=msds, components=components)


@admin_bp.route("/msds/<int:msds_id>/usage", methods=['POST'])
@admin_required
def msds_add_usage(msds_id):
    """MSDS 사용 기록 추가"""
    msds = MSDSModel.query.get_or_404(msds_id)
    
    try:
        usage_record = MSDSUsageRecordModel(
            msds_id=msds_id,
            user_id=current_user.id,
            workplace_area=request.form.get('workplace_area'),
            usage_purpose=request.form.get('usage_purpose'),
            quantity_used=float(request.form.get('quantity_used', 0)),
            quantity_unit=request.form.get('quantity_unit'),
            safety_measures=request.form.get('safety_measures'),
            notes=request.form.get('notes')
        )
        
        # PPE 사용 정보
        ppe_items = []
        for ppe in ['gloves', 'goggles', 'mask', 'apron', 'boots']:
            if request.form.get(f'ppe_{ppe}'):
                ppe_items.append(ppe)
        usage_record.ppe_used = ppe_items
        
        db.session.add(usage_record)
        db.session.commit()
        
        flash('사용 기록이 추가되었습니다.', 'success')
        
    except Exception as e:
        db.session.rollback()
        flash(f'사용 기록 추가 중 오류가 발생했습니다: {str(e)}', 'error')
    
    return redirect(url_for('admin.msds_detail', msds_id=msds_id))
