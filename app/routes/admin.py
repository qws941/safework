from flask import Blueprint, render_template, redirect, url_for, flash, request, send_file, jsonify
from flask_login import login_required, current_user
from models import db, Survey, User, SurveyStatistics, AuditLog
from forms import AdminFilterForm
from functools import wraps
from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_
import pandas as pd
import io
from openpyxl import Workbook

admin_bp = Blueprint('admin', __name__)

def admin_required(f):
    """관리자 권한 확인 데코레이터"""
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        if not current_user.is_admin:
            flash('관리자 권한이 필요합니다.', 'danger')
            return redirect(url_for('main.index'))
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/dashboard')
@admin_required
def dashboard():
    """관리자 대시보드"""
    # 통계 데이터 수집
    total_surveys = Survey.query.count()
    today_surveys = Survey.query.filter(
        func.date(Survey.submission_date) == func.date(datetime.now())
    ).count()
    
    # 부위별 평균 통증 점수
    avg_pain = db.session.query(
        func.avg(Survey.neck_pain).label('neck'),
        func.avg(Survey.shoulder_pain).label('shoulder'),
        func.avg(Survey.arm_pain).label('arm'),
        func.avg(Survey.hand_pain).label('hand'),
        func.avg(Survey.back_pain).label('back'),
        func.avg(Survey.waist_pain).label('waist'),
        func.avg(Survey.leg_pain).label('leg')
    ).first()
    
    # 고위험군 (통증 7점 이상)
    high_risk = Survey.query.filter(
        or_(
            Survey.neck_pain >= 7,
            Survey.shoulder_pain >= 7,
            Survey.arm_pain >= 7,
            Survey.hand_pain >= 7,
            Survey.back_pain >= 7,
            Survey.waist_pain >= 7,
            Survey.leg_pain >= 7
        )
    ).count()
    
    # 부서별 제출 현황
    dept_stats = db.session.query(
        Survey.department,
        func.count(Survey.id).label('count')
    ).group_by(Survey.department).all()
    
    # 최근 제출 목록
    recent_surveys = Survey.query.order_by(Survey.submission_date.desc()).limit(10).all()
    
    return render_template('admin/dashboard.html',
                         total_surveys=total_surveys,
                         today_surveys=today_surveys,
                         avg_pain=avg_pain,
                         high_risk=high_risk,
                         dept_stats=dept_stats,
                         recent_surveys=recent_surveys)

@admin_bp.route('/surveys')
@admin_required
def surveys():
    """조사표 목록 관리"""
    form = AdminFilterForm()
    page = request.args.get('page', 1, type=int)
    
    # 쿼리 빌드
    query = Survey.query
    
    # 검색 필터
    search = request.args.get('search')
    if search:
        query = query.filter(
            or_(
                Survey.name.contains(search),
                Survey.employee_number.contains(search),
                Survey.department.contains(search)
            )
        )
    
    # 부서 필터
    department = request.args.get('department')
    if department:
        query = query.filter(Survey.department == department)
    
    # 날짜 필터
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    if date_from:
        query = query.filter(Survey.submission_date >= datetime.strptime(date_from, '%Y-%m-%d'))
    if date_to:
        query = query.filter(Survey.submission_date <= datetime.strptime(date_to, '%Y-%m-%d'))
    
    # 상태 필터
    status = request.args.get('status')
    if status:
        query = query.filter(Survey.status == status)
    
    # 통증 수준 필터
    pain_level = request.args.get('pain_level')
    if pain_level == 'low':
        query = query.filter(
            and_(
                Survey.neck_pain <= 3,
                Survey.shoulder_pain <= 3,
                Survey.arm_pain <= 3,
                Survey.hand_pain <= 3,
                Survey.back_pain <= 3,
                Survey.waist_pain <= 3,
                Survey.leg_pain <= 3
            )
        )
    elif pain_level == 'medium':
        query = query.filter(
            or_(
                and_(Survey.neck_pain >= 4, Survey.neck_pain <= 6),
                and_(Survey.shoulder_pain >= 4, Survey.shoulder_pain <= 6),
                and_(Survey.arm_pain >= 4, Survey.arm_pain <= 6),
                and_(Survey.hand_pain >= 4, Survey.hand_pain <= 6),
                and_(Survey.back_pain >= 4, Survey.back_pain <= 6),
                and_(Survey.waist_pain >= 4, Survey.waist_pain <= 6),
                and_(Survey.leg_pain >= 4, Survey.leg_pain <= 6)
            )
        )
    elif pain_level == 'high':
        query = query.filter(
            or_(
                Survey.neck_pain >= 7,
                Survey.shoulder_pain >= 7,
                Survey.arm_pain >= 7,
                Survey.hand_pain >= 7,
                Survey.back_pain >= 7,
                Survey.waist_pain >= 7,
                Survey.leg_pain >= 7
            )
        )
    
    # 페이지네이션
    surveys = query.order_by(Survey.submission_date.desc()).paginate(
        page=page, per_page=20, error_out=False
    )
    
    # 부서 목록 (필터용)
    departments = db.session.query(Survey.department).distinct().all()
    form.department.choices = [('', '전체')] + [(d[0], d[0]) for d in departments if d[0]]
    
    return render_template('admin/surveys.html', surveys=surveys, form=form)

@admin_bp.route('/survey/<int:id>/review', methods=['GET', 'POST'])
@admin_required
def review_survey(id):
    """조사표 검토 및 처리"""
    survey = Survey.query.get_or_404(id)
    
    if request.method == 'POST':
        action = request.form.get('action')
        notes = request.form.get('notes')
        
        if action == 'review':
            survey.status = 'reviewed'
            survey.reviewed_by = current_user.id
            survey.reviewed_at = datetime.utcnow()
        elif action == 'process':
            survey.status = 'processed'
        
        if notes:
            survey.additional_notes = (survey.additional_notes or '') + f"\n[관리자 메모 {datetime.now()}]: {notes}"
        
        db.session.commit()
        
        # 감사 로그
        log = AuditLog(
            user_id=current_user.id,
            action=f'survey_{action}',
            target_type='survey',
            target_id=survey.id,
            details={'notes': notes},
            ip_address=request.remote_addr,
            user_agent=request.user_agent.string
        )
        db.session.add(log)
        db.session.commit()
        
        flash('처리가 완료되었습니다.', 'success')
        return redirect(url_for('admin.surveys'))
    
    return render_template('admin/review_survey.html', survey=survey)

@admin_bp.route('/export/excel')
@admin_required
def export_excel():
    """Excel 파일로 내보내기"""
    # 필터 적용 (URL 파라미터 기반)
    query = Survey.query
    
    # 필터 로직 (surveys 함수와 동일)
    search = request.args.get('search')
    if search:
        query = query.filter(
            or_(
                Survey.name.contains(search),
                Survey.employee_number.contains(search),
                Survey.department.contains(search)
            )
        )
    
    surveys = query.all()
    
    # DataFrame 생성
    data = []
    for s in surveys:
        data.append({
            '제출일시': s.submission_date,
            '사번': s.employee_number,
            '성명': s.name,
            '부서': s.department,
            '직위': s.position,
            '나이': s.age,
            '성별': s.gender,
            '근무년수': s.work_years,
            '작업내용': s.work_type,
            '목_통증': s.neck_pain,
            '어깨_통증': s.shoulder_pain,
            '팔_통증': s.arm_pain,
            '손_통증': s.hand_pain,
            '등_통증': s.back_pain,
            '허리_통증': s.waist_pain,
            '다리_통증': s.leg_pain,
            '치료이력': '있음' if s.medical_treatment else '없음',
            '업무관련성': '있음' if s.work_related else '없음',
            '상태': s.status
        })
    
    df = pd.DataFrame(data)
    
    # Excel 파일 생성
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='증상조사표', index=False)
    
    output.seek(0)
    
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=f'근골격계_증상조사표_{datetime.now().strftime("%Y%m%d")}.xlsx'
    )

@admin_bp.route('/statistics')
@admin_required
def statistics():
    """통계 분석 페이지"""
    # 기간별 통계
    period = request.args.get('period', '30')  # 기본 30일
    
    if period == '7':
        start_date = datetime.now() - timedelta(days=7)
    elif period == '30':
        start_date = datetime.now() - timedelta(days=30)
    elif period == '90':
        start_date = datetime.now() - timedelta(days=90)
    else:
        start_date = datetime.now() - timedelta(days=365)
    
    # 일별 제출 건수
    daily_stats = db.session.query(
        func.date(Survey.submission_date).label('date'),
        func.count(Survey.id).label('count')
    ).filter(Survey.submission_date >= start_date)\
     .group_by(func.date(Survey.submission_date)).all()
    
    # 부위별 평균 통증
    pain_stats = db.session.query(
        func.avg(Survey.neck_pain).label('neck'),
        func.avg(Survey.shoulder_pain).label('shoulder'),
        func.avg(Survey.arm_pain).label('arm'),
        func.avg(Survey.hand_pain).label('hand'),
        func.avg(Survey.back_pain).label('back'),
        func.avg(Survey.waist_pain).label('waist'),
        func.avg(Survey.leg_pain).label('leg')
    ).filter(Survey.submission_date >= start_date).first()
    
    # 부서별 고위험군
    dept_risk = db.session.query(
        Survey.department,
        func.count(Survey.id).label('total'),
        func.sum(
            func.case(
                (or_(
                    Survey.neck_pain >= 7,
                    Survey.shoulder_pain >= 7,
                    Survey.arm_pain >= 7,
                    Survey.hand_pain >= 7,
                    Survey.back_pain >= 7,
                    Survey.waist_pain >= 7,
                    Survey.leg_pain >= 7
                ), 1),
                else_=0
            )
        ).label('high_risk')
    ).filter(Survey.submission_date >= start_date)\
     .group_by(Survey.department).all()
    
    # 연령대별 분포
    age_groups = db.session.query(
        func.case(
            (Survey.age < 30, '20대'),
            (Survey.age < 40, '30대'),
            (Survey.age < 50, '40대'),
            (Survey.age < 60, '50대'),
            else_='60대 이상'
        ).label('age_group'),
        func.count(Survey.id).label('count')
    ).filter(Survey.submission_date >= start_date)\
     .group_by('age_group').all()
    
    return render_template('admin/statistics.html',
                         daily_stats=daily_stats,
                         pain_stats=pain_stats,
                         dept_risk=dept_risk,
                         age_groups=age_groups,
                         period=period)

@admin_bp.route('/users')
@admin_required
def users():
    """사용자 관리"""
    page = request.args.get('page', 1, type=int)
    users = User.query.paginate(page=page, per_page=20, error_out=False)
    
    return render_template('admin/users.html', users=users)