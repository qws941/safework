from flask_wtf import FlaskForm
from wtforms import StringField, IntegerField, FloatField, SelectField, TextAreaField, BooleanField, DateField, RadioField, PasswordField, SubmitField
from wtforms.validators import DataRequired, Email, Length, NumberRange, Optional, EqualTo
from datetime import date

class LoginForm(FlaskForm):
    """로그인 폼"""
    username = StringField('아이디', validators=[DataRequired(), Length(min=3, max=20)])
    password = PasswordField('비밀번호', validators=[DataRequired()])
    remember_me = BooleanField('로그인 상태 유지')
    submit = SubmitField('로그인')

class RegisterForm(FlaskForm):
    """회원가입 폼"""
    username = StringField('아이디', validators=[DataRequired(), Length(min=3, max=20)])
    email = StringField('이메일', validators=[DataRequired(), Email()])
    password = PasswordField('비밀번호', validators=[DataRequired(), Length(min=6)])
    password_confirm = PasswordField('비밀번호 확인', validators=[DataRequired(), EqualTo('password', message='비밀번호가 일치하지 않습니다.')])
    submit = SubmitField('회원가입')

class SurveyForm(FlaskForm):
    """근골격계 증상조사표 폼"""
    
    # 1. 기본 정보
    employee_number = StringField('사번', validators=[Optional(), Length(max=50)])
    name = StringField('성명', validators=[DataRequired(), Length(min=2, max=100)])
    department = StringField('부서/공정', validators=[DataRequired(), Length(max=100)])
    position = StringField('직위/직급', validators=[Optional(), Length(max=100)])
    age = IntegerField('나이', validators=[DataRequired(), NumberRange(min=18, max=100)])
    gender = SelectField('성별', choices=[
        ('', '선택하세요'),
        ('남', '남성'),
        ('여', '여성')
    ], validators=[DataRequired()])
    
    # 2. 근무 정보
    work_years = FloatField('현 작업 근무년수', validators=[DataRequired(), NumberRange(min=0, max=50)])
    work_type = StringField('작업내용', validators=[DataRequired(), Length(max=200)])
    work_hours_per_day = FloatField('1일 평균 작업시간(시간)', validators=[DataRequired(), NumberRange(min=1, max=24)])
    break_time_minutes = IntegerField('휴식시간(분)', validators=[Optional(), NumberRange(min=0, max=480)])
    
    # 3. 신체 부위별 증상 (0-10 통증 척도)
    neck_pain = RadioField('목 통증', choices=[
        ('0', '0 - 통증없음'),
        ('1', '1'), ('2', '2'), ('3', '3'),
        ('4', '4'), ('5', '5'), ('6', '6'),
        ('7', '7'), ('8', '8'), ('9', '9'),
        ('10', '10 - 극심한 통증')
    ], default='0', coerce=int)
    
    shoulder_pain = RadioField('어깨 통증', choices=[
        ('0', '0 - 통증없음'),
        ('1', '1'), ('2', '2'), ('3', '3'),
        ('4', '4'), ('5', '5'), ('6', '6'),
        ('7', '7'), ('8', '8'), ('9', '9'),
        ('10', '10 - 극심한 통증')
    ], default='0', coerce=int)
    
    arm_pain = RadioField('팔/팔꿈치 통증', choices=[
        ('0', '0 - 통증없음'),
        ('1', '1'), ('2', '2'), ('3', '3'),
        ('4', '4'), ('5', '5'), ('6', '6'),
        ('7', '7'), ('8', '8'), ('9', '9'),
        ('10', '10 - 극심한 통증')
    ], default='0', coerce=int)
    
    hand_pain = RadioField('손/손목/손가락 통증', choices=[
        ('0', '0 - 통증없음'),
        ('1', '1'), ('2', '2'), ('3', '3'),
        ('4', '4'), ('5', '5'), ('6', '6'),
        ('7', '7'), ('8', '8'), ('9', '9'),
        ('10', '10 - 극심한 통증')
    ], default='0', coerce=int)
    
    back_pain = RadioField('등 통증', choices=[
        ('0', '0 - 통증없음'),
        ('1', '1'), ('2', '2'), ('3', '3'),
        ('4', '4'), ('5', '5'), ('6', '6'),
        ('7', '7'), ('8', '8'), ('9', '9'),
        ('10', '10 - 극심한 통증')
    ], default='0', coerce=int)
    
    waist_pain = RadioField('허리 통증', choices=[
        ('0', '0 - 통증없음'),
        ('1', '1'), ('2', '2'), ('3', '3'),
        ('4', '4'), ('5', '5'), ('6', '6'),
        ('7', '7'), ('8', '8'), ('9', '9'),
        ('10', '10 - 극심한 통증')
    ], default='0', coerce=int)
    
    leg_pain = RadioField('다리/무릎/발 통증', choices=[
        ('0', '0 - 통증없음'),
        ('1', '1'), ('2', '2'), ('3', '3'),
        ('4', '4'), ('5', '5'), ('6', '6'),
        ('7', '7'), ('8', '8'), ('9', '9'),
        ('10', '10 - 극심한 통증')
    ], default='0', coerce=int)
    
    # 4. 증상 특성
    pain_frequency = SelectField('통증 빈도', choices=[
        ('', '선택하세요'),
        ('항상', '항상 아프다'),
        ('자주', '작업 중 자주 아프다'),
        ('가끔', '작업 중 가끔 아프다'),
        ('작업후', '작업이 끝난 후 아프다'),
        ('퇴근후', '퇴근 후 집에서 아프다'),
        ('기타', '기타')
    ])
    
    pain_timing = SelectField('통증 발생 시기', choices=[
        ('', '선택하세요'),
        ('오전', '주로 오전'),
        ('오후', '주로 오후'),
        ('저녁', '주로 저녁'),
        ('항상', '하루 종일'),
        ('불규칙', '불규칙')
    ])
    
    pain_characteristics = SelectField('통증 특징', choices=[
        ('', '선택하세요'),
        ('쑤심', '쑤시는 통증'),
        ('저림', '저리는 통증'),
        ('찌름', '찌르는 통증'),
        ('당김', '당기는 통증'),
        ('화끈', '화끈거리는 통증'),
        ('무감각', '무감각'),
        ('복합', '복합적 증상')
    ])
    
    # 5. 증상 이력
    symptom_start_date = DateField('증상 시작일', validators=[Optional()], format='%Y-%m-%d')
    symptom_duration_months = IntegerField('증상 지속 기간(개월)', validators=[Optional(), NumberRange(min=0, max=600)])
    
    # 6. 치료 이력
    medical_treatment = BooleanField('의학적 치료 받은 경험')
    treatment_details = TextAreaField('치료 내용 (병원명, 치료방법 등)', validators=[Optional(), Length(max=500)])
    
    # 7. 업무 관련성
    work_related = BooleanField('증상이 업무와 관련있다고 생각함')
    work_related_details = TextAreaField('업무 관련성 설명', validators=[Optional(), Length(max=500)])
    
    # 8. 추가 정보
    additional_notes = TextAreaField('기타 특이사항', validators=[Optional(), Length(max=1000)])
    
    # 9. 개인정보 동의
    privacy_consent = BooleanField('개인정보 수집 및 이용에 동의합니다', validators=[DataRequired()])
    
    submit = SubmitField('제출하기')

class AdminFilterForm(FlaskForm):
    """관리자 검색/필터 폼"""
    search = StringField('검색 (이름, 사번, 부서)', validators=[Optional()])
    department = SelectField('부서', choices=[('', '전체')], validators=[Optional()])
    date_from = DateField('시작일', validators=[Optional()], format='%Y-%m-%d')
    date_to = DateField('종료일', validators=[Optional()], format='%Y-%m-%d')
    status = SelectField('상태', choices=[
        ('', '전체'),
        ('submitted', '제출됨'),
        ('reviewed', '검토됨'),
        ('processed', '처리완료')
    ])
    pain_level = SelectField('통증 수준', choices=[
        ('', '전체'),
        ('low', '낮음 (0-3)'),
        ('medium', '중간 (4-6)'),
        ('high', '높음 (7-10)')
    ])
    submit = SubmitField('검색')