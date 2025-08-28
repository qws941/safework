"""Updated models based on exact PDF form fields"""
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
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    # Relationships
    surveys = db.relationship(
        'Survey',
        foreign_keys='Survey.user_id',
        backref='user',
        lazy='dynamic'
    )
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'


class Survey(db.Model):
    """근골격계 증상조사표 모델 - PDF 기준"""
    __tablename__ = 'surveys'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # I. 기본 정보
    name = db.Column(db.String(100), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.String(10))  # 남/여
    work_years = db.Column(db.Integer)  # 현 직장경력 (년)
    work_months = db.Column(db.Integer)  # 현 직장경력 (개월)
    department = db.Column(db.String(100))  # 작업부서
    line = db.Column(db.String(100))  # 라인
    work_name = db.Column(db.String(200))  # 수행작업
    marriage_status = db.Column(db.String(10))  # 기혼/미혼
    
    # 현재하고 있는 작업
    current_work_details = db.Column(db.Text)  # 작업내용
    current_work_years = db.Column(db.Integer)  # 작업기간(년)
    current_work_months = db.Column(db.Integer)  # 작업기간(개월)
    
    # 1일 근무시간 및 휴식
    work_hours_per_day = db.Column(db.Integer)
    break_time_minutes = db.Column(db.Integer)  # 휴식시간(분)
    break_frequency = db.Column(db.Integer)  # 휴식횟수
    
    # 현작업 하기 전 작업
    previous_work_details = db.Column(db.Text)
    previous_work_years = db.Column(db.Integer)
    previous_work_months = db.Column(db.Integer)
    
    # 1. 여가 및 취미활동 (체크박스)
    hobby_computer = db.Column(db.Boolean, default=False)
    hobby_instrument = db.Column(db.Boolean, default=False)  # 악기연주
    hobby_knitting = db.Column(db.Boolean, default=False)  # 뜨개질/자수/붓글씨
    hobby_racket_sports = db.Column(db.Boolean, default=False)  # 테니스/배드민턴/스쿼시
    hobby_ball_sports = db.Column(db.Boolean, default=False)  # 축구/족구/농구/스키
    hobby_none = db.Column(db.Boolean, default=False)  # 해당사항 없음
    
    # 2. 가사노동시간
    housework_hours = db.Column(db.String(50))  # 거의안함/1시간미만/1-2시간/2-3시간/3시간이상
    
    # 3. 진단받은 질병
    disease_rheumatoid = db.Column(db.Boolean, default=False)  # 류머티스 관절염
    disease_diabetes = db.Column(db.Boolean, default=False)  # 당뇨병
    disease_lupus = db.Column(db.Boolean, default=False)  # 루프스병
    disease_gout = db.Column(db.Boolean, default=False)  # 통풍
    disease_alcoholism = db.Column(db.Boolean, default=False)  # 알코올중독
    disease_status = db.Column(db.String(20))  # 완치/치료나 관찰 중
    
    # 4. 과거 사고 여부
    past_accident = db.Column(db.Boolean, default=False)
    accident_hand = db.Column(db.Boolean, default=False)
    accident_arm = db.Column(db.Boolean, default=False)
    accident_shoulder = db.Column(db.Boolean, default=False)
    accident_neck = db.Column(db.Boolean, default=False)
    accident_waist = db.Column(db.Boolean, default=False)
    accident_leg = db.Column(db.Boolean, default=False)
    
    # 5. 육체적 부담 정도
    physical_burden = db.Column(db.String(30))  # 전혀힘들지않음/견딜만함/약간힘듦/매우힘듦
    
    # II. 근골격계 증상 (지난 1년 동안)
    # 통증 경험 여부
    has_symptoms = db.Column(db.Boolean, default=False)
    
    # 각 부위별 데이터 (JSON으로 상세 정보 저장)
    # 목
    neck_data = db.Column(db.JSON)
    # 어깨  
    shoulder_data = db.Column(db.JSON)
    # 팔/팔꿈치
    arm_data = db.Column(db.JSON)
    # 손/손목/손가락
    hand_data = db.Column(db.JSON)
    # 허리
    waist_data = db.Column(db.JSON)
    # 다리/발
    leg_data = db.Column(db.JSON)
    
    # 각 JSON 필드는 다음 구조를 가짐:
    # {
    #   "side": "오른쪽/왼쪽/양쪽",
    #   "duration": "1일미만/1일-1주일/1주일-1달/1달-6개월/6개월이상",
    #   "severity": "약한통증/중간통증/심한통증/매우심한통증",
    #   "frequency": "6개월에1번/2-3달에1번/1달에1번/1주일에1번/매일",
    #   "last_week": true/false,
    #   "treatment": ["병원치료", "약국치료", "병가산재", "작업전환", "없음"]
    # }
    
    # 메타데이터
    submission_date = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(45))
    status = db.Column(db.String(20), default='submitted')
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    reviewed_at = db.Column(db.DateTime)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
    def __repr__(self):
        return f'<Survey {self.name} - {self.submission_date}>'


class SurveyStatistics(db.Model):
    """통계 데이터 캐싱용 모델"""
    __tablename__ = 'survey_statistics'
    
    id = db.Column(db.Integer, primary_key=True)
    stat_date = db.Column(db.Date, nullable=False, unique=True)
    total_submissions = db.Column(db.Integer, default=0)
    
    # 부위별 증상 있는 인원 수
    neck_count = db.Column(db.Integer, default=0)
    shoulder_count = db.Column(db.Integer, default=0)
    arm_count = db.Column(db.Integer, default=0)
    hand_count = db.Column(db.Integer, default=0)
    waist_count = db.Column(db.Integer, default=0)
    leg_count = db.Column(db.Integer, default=0)
    
    # 심각도별 통계
    severe_count = db.Column(db.Integer, default=0)
    very_severe_count = db.Column(db.Integer, default=0)
    
    # 부서별 통계 (JSON)
    department_stats = db.Column(db.JSON)
    
    # 연령별 통계 (JSON)
    age_group_stats = db.Column(db.JSON)
    
    # 치료 필요 인원
    medical_treatment_count = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    
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