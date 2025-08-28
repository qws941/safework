from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(UserMixin, db.Model):
    """사용자 모델"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    surveys = db.relationship('Survey', 
                             foreign_keys='Survey.user_id',
                             backref='user', 
                             lazy='dynamic')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'

class Survey(db.Model):
    """근골격계 증상조사표 모델"""
    __tablename__ = 'surveys'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # 기본 정보
    employee_number = db.Column(db.String(50))
    name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100))
    position = db.Column(db.String(100))
    age = db.Column(db.Integer)
    gender = db.Column(db.String(10))
    work_years = db.Column(db.Float)
    work_months = db.Column(db.Integer)  # 현 작업 근무 개월
    
    # 작업 정보
    work_type = db.Column(db.String(200))
    work_hours_per_day = db.Column(db.Float)
    break_time_minutes = db.Column(db.Integer)
    overtime_hours_per_week = db.Column(db.Float)  # 주당 초과근무 시간
    
    # 작업 형태 (복수 선택 가능 - JSON)
    work_posture = db.Column(db.JSON)  # 서서, 앉아서, 무릎/쪼그려, 불편한 자세 등
    repetitive_motion = db.Column(db.JSON)  # 반복 동작 유형
    heavy_lifting = db.Column(db.Boolean, default=False)  # 중량물 취급 여부
    lifting_weight_kg = db.Column(db.Float)  # 취급 중량
    
    # 증상 정보 (JSON 형태로 저장)
    symptoms_data = db.Column(db.JSON)
    
    # === 신체 부위별 상세 증상 ===
    # 목
    neck_pain = db.Column(db.Integer, default=0)  # 0-10 scale
    neck_symptoms = db.Column(db.JSON)  # 통증, 저림, 뻣뻣함, 화끈거림, 무감각
    neck_frequency = db.Column(db.String(50))  # 항상, 자주, 가끔, 없음
    neck_duration = db.Column(db.String(50))  # 1주일미만, 1주-1개월, 1-6개월, 6개월이상
    neck_severity = db.Column(db.String(20))  # 약함, 중간, 심함, 매우심함
    neck_work_impact = db.Column(db.String(50))  # 업무 지장 정도
    neck_last_year = db.Column(db.Boolean, default=False)  # 최근 1년간 경험
    neck_last_week = db.Column(db.Boolean, default=False)  # 최근 1주일간 경험
    
    # 어깨
    shoulder_pain = db.Column(db.Integer, default=0)
    shoulder_left = db.Column(db.Boolean, default=False)  # 왼쪽
    shoulder_right = db.Column(db.Boolean, default=False)  # 오른쪽
    shoulder_both = db.Column(db.Boolean, default=False)  # 양쪽
    shoulder_symptoms = db.Column(db.JSON)
    shoulder_frequency = db.Column(db.String(50))
    shoulder_duration = db.Column(db.String(50))
    shoulder_severity = db.Column(db.String(20))
    shoulder_work_impact = db.Column(db.String(50))
    shoulder_last_year = db.Column(db.Boolean, default=False)
    shoulder_last_week = db.Column(db.Boolean, default=False)
    
    # 팔/팔꿈치
    arm_pain = db.Column(db.Integer, default=0)
    arm_left = db.Column(db.Boolean, default=False)
    arm_right = db.Column(db.Boolean, default=False)
    arm_both = db.Column(db.Boolean, default=False)
    arm_symptoms = db.Column(db.JSON)
    arm_frequency = db.Column(db.String(50))
    arm_duration = db.Column(db.String(50))
    arm_severity = db.Column(db.String(20))
    arm_work_impact = db.Column(db.String(50))
    arm_last_year = db.Column(db.Boolean, default=False)
    arm_last_week = db.Column(db.Boolean, default=False)
    
    # 손/손목/손가락
    hand_pain = db.Column(db.Integer, default=0)
    hand_left = db.Column(db.Boolean, default=False)
    hand_right = db.Column(db.Boolean, default=False)
    hand_both = db.Column(db.Boolean, default=False)
    hand_symptoms = db.Column(db.JSON)
    hand_frequency = db.Column(db.String(50))
    hand_duration = db.Column(db.String(50))
    hand_severity = db.Column(db.String(20))
    hand_work_impact = db.Column(db.String(50))
    hand_last_year = db.Column(db.Boolean, default=False)
    hand_last_week = db.Column(db.Boolean, default=False)
    
    # 등(upper back)
    back_pain = db.Column(db.Integer, default=0)
    back_symptoms = db.Column(db.JSON)
    back_frequency = db.Column(db.String(50))
    back_duration = db.Column(db.String(50))
    back_severity = db.Column(db.String(20))
    back_work_impact = db.Column(db.String(50))
    back_last_year = db.Column(db.Boolean, default=False)
    back_last_week = db.Column(db.Boolean, default=False)
    
    # 허리
    waist_pain = db.Column(db.Integer, default=0)
    waist_symptoms = db.Column(db.JSON)
    waist_frequency = db.Column(db.String(50))
    waist_duration = db.Column(db.String(50))
    waist_severity = db.Column(db.String(20))
    waist_work_impact = db.Column(db.String(50))
    waist_last_year = db.Column(db.Boolean, default=False)
    waist_last_week = db.Column(db.Boolean, default=False)
    
    # 다리/무릎/발
    leg_pain = db.Column(db.Integer, default=0)
    leg_left = db.Column(db.Boolean, default=False)
    leg_right = db.Column(db.Boolean, default=False)
    leg_both = db.Column(db.Boolean, default=False)
    leg_symptoms = db.Column(db.JSON)
    leg_frequency = db.Column(db.String(50))
    leg_duration = db.Column(db.String(50))
    leg_severity = db.Column(db.String(20))
    leg_work_impact = db.Column(db.String(50))
    leg_last_year = db.Column(db.Boolean, default=False)
    leg_last_week = db.Column(db.Boolean, default=False)
    
    # 증상 발생 시기
    symptom_start_date = db.Column(db.Date)
    symptom_duration_months = db.Column(db.Integer)
    symptom_cause = db.Column(db.Text)  # 증상 발생 원인
    
    # 치료 이력
    medical_treatment = db.Column(db.Boolean, default=False)
    treatment_details = db.Column(db.Text)
    treatment_duration_days = db.Column(db.Integer)  # 치료/휴업 일수
    current_treatment = db.Column(db.Boolean, default=False)  # 현재 치료 중
    
    # 작업 관련성
    work_related = db.Column(db.Boolean, default=False)
    work_related_details = db.Column(db.Text)
    accident_related = db.Column(db.Boolean, default=False)  # 사고 관련 여부
    accident_date = db.Column(db.Date)  # 사고 발생일
    
    # 기타 정보
    additional_notes = db.Column(db.Text)
    
    # 메타데이터
    submission_date = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(45))
    status = db.Column(db.String(20), default='submitted')  # submitted, reviewed, processed
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    reviewed_at = db.Column(db.DateTime)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Survey {self.name} - {self.submission_date}>'
    
    def to_dict(self):
        """Convert to dictionary for JSON response"""
        return {
            'id': self.id,
            'employee_number': self.employee_number,
            'name': self.name,
            'department': self.department,
            'position': self.position,
            'age': self.age,
            'gender': self.gender,
            'work_years': self.work_years,
            'work_type': self.work_type,
            'symptoms': {
                'neck': self.neck_pain,
                'shoulder': self.shoulder_pain,
                'arm': self.arm_pain,
                'hand': self.hand_pain,
                'back': self.back_pain,
                'waist': self.waist_pain,
                'leg': self.leg_pain
            },
            'medical_treatment': self.medical_treatment,
            'work_related': self.work_related,
            'submission_date': self.submission_date.isoformat() if self.submission_date else None,
            'status': self.status
        }

class SurveyStatistics(db.Model):
    """통계 데이터 캐싱용 모델"""
    __tablename__ = 'survey_statistics'
    
    id = db.Column(db.Integer, primary_key=True)
    stat_date = db.Column(db.Date, nullable=False, unique=True)
    total_submissions = db.Column(db.Integer, default=0)
    
    # 부위별 평균 통증 점수
    avg_neck_pain = db.Column(db.Float, default=0)
    avg_shoulder_pain = db.Column(db.Float, default=0)
    avg_arm_pain = db.Column(db.Float, default=0)
    avg_hand_pain = db.Column(db.Float, default=0)
    avg_back_pain = db.Column(db.Float, default=0)
    avg_waist_pain = db.Column(db.Float, default=0)
    avg_leg_pain = db.Column(db.Float, default=0)
    
    # 부서별 통계 (JSON)
    department_stats = db.Column(db.JSON)
    
    # 연령별 통계 (JSON)
    age_group_stats = db.Column(db.JSON)
    
    # 치료 필요 인원
    medical_treatment_count = db.Column(db.Integer, default=0)
    work_related_count = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<SurveyStatistics {self.stat_date}>'

class AuditLog(db.Model):
    """감사 로그"""
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    action = db.Column(db.String(50), nullable=False)
    target_type = db.Column(db.String(50))
    target_id = db.Column(db.Integer)
    details = db.Column(db.JSON)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<AuditLog {self.action} by {self.user_id}>'