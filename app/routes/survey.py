from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify, current_app
from flask_login import login_required, current_user
from models import db, Survey, AuditLog
from forms import SurveyForm
from datetime import datetime
import json

survey_bp = Blueprint('survey', __name__)

@survey_bp.route('/new', methods=['GET', 'POST'])
def new():
    """새 증상조사표 작성 - 로그인 불필요"""
    form = SurveyForm()
    
    if form.validate_on_submit():
        survey = Survey(
            user_id=current_user.id if current_user.is_authenticated else None,
            employee_number=form.employee_number.data,
            name=form.name.data,
            department=form.department.data,
            position=form.position.data,
            age=form.age.data,
            gender=form.gender.data,
            work_years=form.work_years.data,
            work_type=form.work_type.data,
            work_hours_per_day=form.work_hours_per_day.data,
            break_time_minutes=form.break_time_minutes.data,
            
            # 통증 정보
            neck_pain=form.neck_pain.data,
            shoulder_pain=form.shoulder_pain.data,
            arm_pain=form.arm_pain.data,
            hand_pain=form.hand_pain.data,
            back_pain=form.back_pain.data,
            waist_pain=form.waist_pain.data,
            leg_pain=form.leg_pain.data,
            
            # 증상 정보
            symptom_start_date=form.symptom_start_date.data,
            symptom_duration_months=form.symptom_duration_months.data,
            medical_treatment=form.medical_treatment.data,
            treatment_details=form.treatment_details.data,
            work_related=form.work_related.data,
            work_related_details=form.work_related_details.data,
            additional_notes=form.additional_notes.data,
            
            ip_address=request.remote_addr,
            status='submitted'
        )
        
        # 추가 증상 데이터를 JSON으로 저장
        symptoms_data = {
            'pain_frequency': form.data.get('pain_frequency'),
            'pain_timing': form.data.get('pain_timing'),
            'pain_characteristics': form.data.get('pain_characteristics'),
        }
        survey.symptoms_data = symptoms_data
        
        db.session.add(survey)
        db.session.commit()
        
        # Redis에 캐시
        if hasattr(current_app, 'redis'):
            cache_key = f"survey:{survey.id}"
            current_app.redis.setex(
                cache_key, 
                3600,  # 1시간 캐시
                json.dumps(survey.to_dict(), default=str)
            )
        
        # 감사 로그
        if current_user.is_authenticated:
            log = AuditLog(
                user_id=current_user.id,
                action='survey_submitted',
                target_type='survey',
                target_id=survey.id,
                details={'name': survey.name},
                ip_address=request.remote_addr,
                user_agent=request.user_agent.string
            )
            db.session.add(log)
            db.session.commit()
        
        flash('증상조사표가 성공적으로 제출되었습니다.', 'success')
        return redirect(url_for('survey.complete', id=survey.id))
    
    return render_template('survey/new.html', form=form)

@survey_bp.route('/complete/<int:id>')
def complete(id):
    """제출 완료 페이지"""
    survey = Survey.query.get_or_404(id)
    return render_template('survey/complete.html', survey=survey)

@survey_bp.route('/my-surveys')
@login_required
def my_surveys():
    """내 제출 이력"""
    page = request.args.get('page', 1, type=int)
    surveys = Survey.query.filter_by(user_id=current_user.id)\
                          .order_by(Survey.submission_date.desc())\
                          .paginate(page=page, per_page=10, error_out=False)
    
    return render_template('survey/my_surveys.html', surveys=surveys)

@survey_bp.route('/view/<int:id>')
@login_required
def view(id):
    """조사표 상세 보기"""
    survey = Survey.query.get_or_404(id)
    
    # 권한 체크: 본인 또는 관리자만 볼 수 있음
    if not current_user.is_admin and survey.user_id != current_user.id:
        flash('접근 권한이 없습니다.', 'danger')
        return redirect(url_for('main.index'))
    
    return render_template('survey/view.html', survey=survey)

@survey_bp.route('/api/submit', methods=['POST'])
def api_submit():
    """API를 통한 제출 (외부 시스템 연동용)"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': '데이터가 없습니다.'}), 400
    
    try:
        survey = Survey(
            user_id=None,  # API 제출은 익명
            employee_number=data.get('employee_number'),
            name=data.get('name'),
            department=data.get('department'),
            position=data.get('position'),
            age=data.get('age'),
            gender=data.get('gender'),
            work_years=data.get('work_years'),
            work_type=data.get('work_type'),
            work_hours_per_day=data.get('work_hours_per_day'),
            break_time_minutes=data.get('break_time_minutes'),
            
            neck_pain=data.get('neck_pain', 0),
            shoulder_pain=data.get('shoulder_pain', 0),
            arm_pain=data.get('arm_pain', 0),
            hand_pain=data.get('hand_pain', 0),
            back_pain=data.get('back_pain', 0),
            waist_pain=data.get('waist_pain', 0),
            leg_pain=data.get('leg_pain', 0),
            
            symptoms_data=data.get('symptoms_data'),
            ip_address=request.remote_addr,
            status='submitted'
        )
        
        db.session.add(survey)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'survey_id': survey.id,
            'message': '제출이 완료되었습니다.'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500