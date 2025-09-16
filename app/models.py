"""Updated models based on exact PDF form fields"""

from datetime import datetime, timezone, timedelta

# KST timezone
KST = timezone(timedelta(hours=9))


def kst_now():
    """현재 KST 시간 반환"""
    return datetime.now(KST)


from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()

# Import document models
from models_document import (
    Document,
    DocumentAccessLog,
    DocumentCategory,
    DocumentTemplate,
    DocumentVersion,
)


class User(UserMixin, db.Model):
    """사용자 모델"""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=kst_now)
    updated_at = db.Column(db.DateTime, default=kst_now, onupdate=kst_now)

    # Relationships
    surveys = db.relationship(
        "SurveyModel", foreign_keys="SurveyModel.user_id", backref="user", lazy="dynamic"
    )
    audit_logs = db.relationship(
        "AuditLogModel", foreign_keys="AuditLogModel.user_id", backref="user", lazy="dynamic"
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.username}>"


class SurveyModel(db.Model):
    """Minimal Survey Model - Only Essential Database Columns"""

    __tablename__ = "surveys"

    # 필수 필드만 포함 (실제 DB 스키마 기준)
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    
    # 양식 구분 필드
    form_type = db.Column(db.String(50), nullable=False)
    
    # 기본 정보 (확실히 존재하는 컬럼만)
    name = db.Column(db.String(50))
    department = db.Column(db.String(50))
    position = db.Column(db.String(50))
    employee_id = db.Column(db.String(20))
    gender = db.Column(db.String(10))
    age = db.Column(db.Integer)
    years_of_service = db.Column(db.Integer)
    employee_number = db.Column(db.String(50))
    
    # 업무 정보 (기본)
    work_years = db.Column(db.Integer)
    work_months = db.Column(db.Integer)
    has_symptoms = db.Column(db.Boolean, default=False)
    
    # 메타데이터 (최소한)
    status = db.Column(db.String(20), default="submitted")
    submission_date = db.Column(db.DateTime, default=kst_now)
    created_at = db.Column(db.DateTime, default=kst_now)
    updated_at = db.Column(db.DateTime, default=kst_now, onupdate=kst_now)

    # 설문 응답 데이터 (JSON - 모든 추가 데이터 저장)
    responses = db.Column(db.JSON)

    # 추가 필드들은 임시 주석처리 (DB 스키마 확인 후 점진적 추가)
    # height_cm = db.Column(db.Numeric(5, 1))
    # weight_kg = db.Column(db.Numeric(5, 1))
    # blood_type = db.Column(db.String(10))
    # vision_left = db.Column(db.Numeric(3, 1))
    # vision_right = db.Column(db.Numeric(3, 1))
    # hearing_left = db.Column(db.String(20))
    # hearing_right = db.Column(db.String(20))
    # blood_pressure = db.Column(db.String(20))
    # existing_conditions = db.Column(db.Text)
    # medication_history = db.Column(db.Text)
    # allergy_history = db.Column(db.Text)
    # surgery_history = db.Column(db.Text)
    # family_history = db.Column(db.Text)
    # smoking_status = db.Column(db.String(20))
    # smoking_amount = db.Column(db.String(50))
    # drinking_status = db.Column(db.String(20))
    # drinking_amount = db.Column(db.String(50))
    # exercise_habits = db.Column(db.Text)
    # sleep_hours = db.Column(db.String(20))
    # physical_limitations = db.Column(db.Text)
    # emergency_contact = db.Column(db.String(100))
    # special_considerations = db.Column(db.Text)
    # work_area = db.Column(db.String(100))
    # work_hours_per_day = db.Column(db.Integer)
    # weekly_work_days = db.Column(db.Integer)
    # shift_type = db.Column(db.String(20))
    # physical_demand_level = db.Column(db.String(20))
    # job_satisfaction_score = db.Column(db.Integer)
    # stress_level = db.Column(db.String(20))
    # workplace_safety_rating = db.Column(db.Integer)
    # symptoms_data = db.Column(db.JSON)
    # notes = db.Column(db.Text)
    # company_id = db.Column(db.Integer)
    # process_id = db.Column(db.Integer)
    # role_id = db.Column(db.Integer)

    def __repr__(self):
        return f"<Survey {self.name or 'Anonymous'} - {self.form_type}>"



class SurveyStatisticsModel(db.Model):
    """Survey Statistics Caching Model"""

    __tablename__ = "survey_statistics"

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

    # Form 002 - 신규 입사자 건강검진 양식 추가 필드
    height_cm = db.Column(db.Float)  # 신장
    weight_kg = db.Column(db.Float)  # 체중
    blood_type = db.Column(db.String(10))  # 혈액형
    existing_conditions = db.Column(db.Text)  # 기존 질환 (JSON 문자열)
    medication_history = db.Column(db.Text)  # 복용 약물
    allergy_history = db.Column(db.Text)  # 알레르기 이력

    created_at = db.Column(db.DateTime, default=kst_now)
    updated_at = db.Column(db.DateTime, default=kst_now, onupdate=kst_now)

    def __repr__(self):
        return f"<SurveyStatistics {self.stat_date}>"


class AuditLogModel(db.Model):
    """Audit Log Model - Production Compatible"""

    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    action = db.Column(db.String(50), nullable=False)
    # target_type = db.Column(db.String(50))  # 프로덕션 DB에 없음 - 주석처리
    # target_id = db.Column(db.Integer)       # 프로덕션 DB에 없음 - 주석처리
    details = db.Column(db.JSON)
    # ip_address = db.Column(db.String(45))   # 프로덕션 DB에 없음 - 주석처리
    # user_agent = db.Column(db.String(500))  # 프로덕션 DB에 없음 - 주석처리
    created_at = db.Column(db.DateTime, default=kst_now)

    def __repr__(self):
        return f"<AuditLog {self.action} by {self.user_id}>"


# === 건설업 마스터 데이터 모델 === 

class CompanyModel(db.Model):
    """Company Master Table"""
    __tablename__ = "companies"
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)  # 업체명
    is_active = db.Column(db.Boolean, default=True)  # 활성화 상태
    display_order = db.Column(db.Integer, default=0)  # 표시 순서
    
    created_at = db.Column(db.DateTime, default=kst_now)
    updated_at = db.Column(db.DateTime, default=kst_now, onupdate=kst_now)
    
    def __repr__(self):
        return f"<Company {self.name}>"


class ProcessModel(db.Model):
    """Process Master Table"""
    __tablename__ = "processes"
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)  # 공정명
    description = db.Column(db.String(200))  # 공정 설명
    is_active = db.Column(db.Boolean, default=True)  # 활성화 상태
    display_order = db.Column(db.Integer, default=0)  # 표시 순서
    
    created_at = db.Column(db.DateTime, default=kst_now)
    updated_at = db.Column(db.DateTime, default=kst_now, onupdate=kst_now)
    
    def __repr__(self):
        return f"<Process {self.name}>"


class RoleModel(db.Model):
    """Role Master Table"""
    __tablename__ = "roles"
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False, unique=True)  # 직위/역할
    description = db.Column(db.String(200))  # 역할 설명
    is_active = db.Column(db.Boolean, default=True)  # 활성화 상태
    display_order = db.Column(db.Integer, default=0)  # 표시 순서
    
    created_at = db.Column(db.DateTime, default=kst_now)
    updated_at = db.Column(db.DateTime, default=kst_now, onupdate=kst_now)
    
    def __repr__(self):
        return f"<Role {self.title}>"


# === MSDS Management System Models ===

class MSDSModel(db.Model):
    """MSDS (Material Safety Data Sheet) Master Table"""
    __tablename__ = "msds"
    
    id = db.Column(db.Integer, primary_key=True)
    substance_name = db.Column(db.String(200), nullable=False)  # 화학물질명
    cas_number = db.Column(db.String(50))  # CAS 번호
    manufacturer = db.Column(db.String(200))  # 제조업체
    supplier = db.Column(db.String(200))  # 공급업체
    
    # MSDS 문서 정보
    msds_number = db.Column(db.String(100))  # MSDS 문서번호
    revision_date = db.Column(db.Date)  # 개정일자
    
    # 분류 정보
    hazard_classification = db.Column(db.JSON)  # 유해성 분류 (JSON)
    ghs_pictograms = db.Column(db.JSON)  # GHS 그림문자 (JSON)
    signal_word = db.Column(db.String(50))  # 신호어 (위험/경고)
    
    # 특별관리물질 여부
    is_special_management = db.Column(db.Boolean, default=False)
    special_management_type = db.Column(db.String(100))  # 특별관리 유형
    
    # 문서 첨부
    msds_file_path = db.Column(db.String(500))  # MSDS 파일 경로
    msds_image_path = db.Column(db.String(500))  # MSDS 이미지 경로
    ocr_extracted_text = db.Column(db.Text)  # OCR 추출 텍스트
    
    # 메타데이터
    registration_date = db.Column(db.DateTime, default=kst_now)
    last_review_date = db.Column(db.DateTime)
    next_review_date = db.Column(db.DateTime)
    status = db.Column(db.String(20), default="active")  # active/inactive/expired
    notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=kst_now)
    updated_at = db.Column(db.DateTime, default=kst_now, onupdate=kst_now)
    
    # Relationships
    components = db.relationship("MSDSComponentModel", backref="msds", lazy="dynamic", cascade="all, delete-orphan")
    usage_records = db.relationship("MSDSUsageRecordModel", backref="msds", lazy="dynamic")
    
    def __repr__(self):
        return f"<MSDS {self.substance_name}>"


class MSDSComponentModel(db.Model):
    """MSDS Chemical Component Details"""
    __tablename__ = "msds_components"
    
    id = db.Column(db.Integer, primary_key=True)
    msds_id = db.Column(db.Integer, db.ForeignKey("msds.id"), nullable=False)
    
    component_name = db.Column(db.String(200), nullable=False)  # 성분명
    cas_number = db.Column(db.String(50))  # CAS 번호
    concentration_min = db.Column(db.Numeric(5, 2))  # 최소 농도 (%)
    concentration_max = db.Column(db.Numeric(5, 2))  # 최대 농도 (%)
    concentration_exact = db.Column(db.Numeric(5, 2))  # 정확한 농도 (%)
    
    # 유해성 정보
    hazard_statements = db.Column(db.JSON)  # 유해문구 (JSON)
    precautionary_statements = db.Column(db.JSON)  # 예방조치문구 (JSON)
    
    created_at = db.Column(db.DateTime, default=kst_now)
    updated_at = db.Column(db.DateTime, default=kst_now, onupdate=kst_now)
    
    def __repr__(self):
        return f"<MSDSComponent {self.component_name}>"


class MSDSUsageRecordModel(db.Model):
    """MSDS Usage Tracking"""
    __tablename__ = "msds_usage_records"
    
    id = db.Column(db.Integer, primary_key=True)
    msds_id = db.Column(db.Integer, db.ForeignKey("msds.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    
    usage_date = db.Column(db.DateTime, default=kst_now)
    workplace_area = db.Column(db.String(100))  # 사용 작업장
    usage_purpose = db.Column(db.String(200))  # 사용 목적
    quantity_used = db.Column(db.Numeric(10, 2))  # 사용량
    quantity_unit = db.Column(db.String(20))  # 단위 (kg, L, etc.)
    
    # 안전조치 정보
    ppe_used = db.Column(db.JSON)  # 사용한 보호구 (JSON)
    safety_measures = db.Column(db.Text)  # 안전조치사항
    
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=kst_now)
    
    def __repr__(self):
        return f"<MSDSUsage {self.msds_id} on {self.usage_date}>"

# MSDS Model Aliases for import compatibility
MSDS = MSDSModel
MSDSComponent = MSDSComponentModel  
MSDSUsageRecord = MSDSUsageRecordModel

# Core Model Aliases for backward compatibility
Survey = SurveyModel
SurveyStatistics = SurveyStatisticsModel
AuditLog = AuditLogModel
Process = ProcessModel
Company = CompanyModel
Role = RoleModel
