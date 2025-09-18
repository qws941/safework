"""
SafeWork Core Models
산업안전보건 관리 시스템 핵심 모델
"""

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import JSON, Enum, Index
from sqlalchemy.orm import relationship
from models import db

# ========================================
# 부서 및 근로자 관리 모델
# ========================================

class Department(db.Model):
    """부서 정보"""
    __tablename__ = 'departments_extended'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('departments_extended.id'))
    manager_id = db.Column(db.Integer, db.ForeignKey('workers.id'))
    risk_level = db.Column(db.Enum('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'), default='LOW')
    location = db.Column(db.String(200))
    employee_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    workers = relationship('Worker', back_populates='department', foreign_keys='Worker.department_id')
    parent = relationship('Department', remote_side=[id])
    manager = relationship('Worker', foreign_keys=[manager_id], post_update=True)
    
    def __repr__(self):
        return f'<Department {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'risk_level': self.risk_level,
            'location': self.location,
            'employee_count': self.employee_count
        }


class Worker(db.Model):
    """근로자 정보"""
    __tablename__ = 'workers'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_number = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments_extended.id'))
    position = db.Column(db.String(100))
    hire_date = db.Column(db.Date)
    birth_date = db.Column(db.Date)
    gender = db.Column(db.Enum('M', 'F'))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    address = db.Column(db.Text)
    emergency_contact = db.Column(db.String(100))
    emergency_phone = db.Column(db.String(20))
    blood_type = db.Column(db.String(5))
    is_special_management = db.Column(db.Boolean, default=False)
    special_management_reason = db.Column(db.Text)
    status = db.Column(db.Enum('ACTIVE', 'LEAVE', 'RETIRED'), default='ACTIVE')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    department = relationship('Department', back_populates='workers', foreign_keys=[department_id])
    health_check_targets = relationship('HealthCheckTarget', back_populates='worker')
    health_check_results = relationship('HealthCheckResult', back_populates='worker')
    medical_visits = relationship('MedicalVisit', back_populates='worker')
    
    def __repr__(self):
        return f'<Worker {self.name} ({self.employee_number})>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'employee_number': self.employee_number,
            'name': self.name,
            'department': self.department.name if self.department else None,
            'position': self.position,
            'hire_date': self.hire_date.isoformat() if self.hire_date else None,
            'status': self.status,
            'is_special_management': self.is_special_management
        }


# ========================================
# 건강검진 관리 모델
# ========================================

class HealthCheckPlan(db.Model):
    """건강검진 계획"""
    __tablename__ = 'health_check_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    year = db.Column(db.Integer, nullable=False)
    type = db.Column(db.Enum('GENERAL', 'SPECIAL', 'PLACEMENT', 'RETURN'), nullable=False)
    planned_date = db.Column(db.Date)
    target_count = db.Column(db.Integer, default=0)
    completed_count = db.Column(db.Integer, default=0)
    status = db.Column(db.Enum('PLANNED', 'IN_PROGRESS', 'COMPLETED'), default='PLANNED')
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    targets = relationship('HealthCheckTarget', back_populates='plan', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<HealthCheckPlan {self.year} {self.type}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'year': self.year,
            'type': self.type,
            'planned_date': self.planned_date.isoformat() if self.planned_date else None,
            'target_count': self.target_count,
            'completed_count': self.completed_count,
            'status': self.status,
            'completion_rate': round((self.completed_count / self.target_count * 100) if self.target_count > 0 else 0, 1)
        }


class HealthCheckTarget(db.Model):
    """건강검진 대상자"""
    __tablename__ = 'health_check_targets'
    
    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('health_check_plans.id'), nullable=False)
    worker_id = db.Column(db.Integer, db.ForeignKey('workers.id'), nullable=False)
    scheduled_date = db.Column(db.Date)
    actual_date = db.Column(db.Date)
    hospital_name = db.Column(db.String(200))
    status = db.Column(db.Enum('SCHEDULED', 'NOTIFIED', 'COMPLETED', 'MISSED', 'EXEMPTED'), default='SCHEDULED')
    notification_sent_at = db.Column(db.DateTime)
    remarks = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    plan = relationship('HealthCheckPlan', back_populates='targets')
    worker = relationship('Worker', back_populates='health_check_targets')
    result = relationship('HealthCheckResult', uselist=False, back_populates='target')
    
    # Unique constraint
    __table_args__ = (
        db.UniqueConstraint('plan_id', 'worker_id', name='unique_plan_worker'),
    )
    
    def __repr__(self):
        return f'<HealthCheckTarget {self.worker.name if self.worker else "Unknown"}>'


class HealthCheckResult(db.Model):
    """건강검진 결과"""
    __tablename__ = 'health_check_results'
    
    id = db.Column(db.Integer, primary_key=True)
    target_id = db.Column(db.Integer, db.ForeignKey('health_check_targets.id'), nullable=False)
    worker_id = db.Column(db.Integer, db.ForeignKey('workers.id'), nullable=False)
    check_date = db.Column(db.Date, nullable=False)
    
    # 신체 계측
    height = db.Column(db.Numeric(5, 2))
    weight = db.Column(db.Numeric(5, 2))
    bmi = db.Column(db.Numeric(4, 2))
    waist = db.Column(db.Numeric(5, 2))
    
    # 혈압 및 맥박
    blood_pressure_sys = db.Column(db.Integer)
    blood_pressure_dia = db.Column(db.Integer)
    pulse_rate = db.Column(db.Integer)
    
    # 시력 및 청력
    vision_left = db.Column(db.Numeric(3, 2))
    vision_right = db.Column(db.Numeric(3, 2))
    hearing_left = db.Column(db.Enum('NORMAL', 'ABNORMAL'))
    hearing_right = db.Column(db.Enum('NORMAL', 'ABNORMAL'))
    
    # 검사 결과
    chest_xray = db.Column(db.String(100))
    ecg = db.Column(db.String(100))
    blood_test = db.Column(JSON)
    urine_test = db.Column(JSON)
    special_tests = db.Column(JSON)
    
    # 판정
    overall_opinion = db.Column(db.Text)
    grade = db.Column(db.Enum('A', 'B', 'C', 'D1', 'D2', 'R'), nullable=False)
    follow_up_required = db.Column(db.Boolean, default=False)
    follow_up_items = db.Column(db.Text)
    work_restriction = db.Column(db.String(200))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    target = relationship('HealthCheckTarget', back_populates='result')
    worker = relationship('Worker', back_populates='health_check_results')
    
    def __repr__(self):
        return f'<HealthCheckResult {self.worker.name if self.worker else "Unknown"} - Grade {self.grade}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'worker_name': self.worker.name if self.worker else None,
            'check_date': self.check_date.isoformat() if self.check_date else None,
            'grade': self.grade,
            'bmi': float(self.bmi) if self.bmi else None,
            'blood_pressure': f"{self.blood_pressure_sys}/{self.blood_pressure_dia}" if self.blood_pressure_sys else None,
            'follow_up_required': self.follow_up_required
        }


# ========================================
# 보건관리 모델
# ========================================

class MedicalVisit(db.Model):
    """의무실 방문 기록"""
    __tablename__ = 'medical_visits'
    
    id = db.Column(db.Integer, primary_key=True)
    worker_id = db.Column(db.Integer, db.ForeignKey('workers.id'), nullable=False)
    visit_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    chief_complaint = db.Column(db.Text)
    vital_signs = db.Column(JSON)
    diagnosis = db.Column(db.Text)
    treatment = db.Column(db.Text)
    medication_given = db.Column(db.Text)
    follow_up_needed = db.Column(db.Boolean, default=False)
    follow_up_date = db.Column(db.Date)
    nurse_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    worker = relationship('Worker', back_populates='medical_visits')
    
    def __repr__(self):
        return f'<MedicalVisit {self.visit_date} - {self.worker.name if self.worker else "Unknown"}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'worker_name': self.worker.name if self.worker else None,
            'visit_date': self.visit_date.isoformat() if self.visit_date else None,
            'chief_complaint': self.chief_complaint,
            'diagnosis': self.diagnosis,
            'treatment': self.treatment,
            'follow_up_needed': self.follow_up_needed
        }


class Medication(db.Model):
    """의약품 관리"""
    __tablename__ = 'medications'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100))
    unit = db.Column(db.String(50))
    current_stock = db.Column(db.Integer, default=0)
    minimum_stock = db.Column(db.Integer, default=0)
    expiry_date = db.Column(db.Date)
    supplier = db.Column(db.String(200))
    last_purchase_date = db.Column(db.Date)
    price_per_unit = db.Column(db.Numeric(10, 2))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Medication {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'current_stock': self.current_stock,
            'minimum_stock': self.minimum_stock,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'is_low_stock': self.current_stock <= self.minimum_stock,
            'is_expired': self.expiry_date < datetime.now().date() if self.expiry_date else False
        }


# ========================================
# 작업환경 관리 모델
# ========================================

class EnvironmentMeasurementPlan(db.Model):
    """작업환경측정 계획"""
    __tablename__ = 'environment_measurement_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    year = db.Column(db.Integer, nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    measurement_agency = db.Column(db.String(200))
    planned_date = db.Column(db.Date)
    status = db.Column(db.Enum('PLANNED', 'IN_PROGRESS', 'COMPLETED'), default='PLANNED')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    measurements = relationship('EnvironmentMeasurement', back_populates='plan')
    
    def __repr__(self):
        return f'<EnvironmentMeasurementPlan {self.year}-{self.semester}>'


class EnvironmentMeasurement(db.Model):
    """작업환경측정 결과"""
    __tablename__ = 'environment_measurements'
    
    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('environment_measurement_plans.id'))
    department_id = db.Column(db.Integer, db.ForeignKey('departments_extended.id'))
    measurement_date = db.Column(db.Date)
    factor_type = db.Column(db.Enum('DUST', 'NOISE', 'CHEMICAL', 'ILLUMINATION', 'TEMPERATURE'))
    factor_name = db.Column(db.String(200))
    measurement_value = db.Column(db.Numeric(10, 4))
    unit = db.Column(db.String(50))
    exposure_limit = db.Column(db.Numeric(10, 4))
    result = db.Column(db.Enum('SUITABLE', 'EXCEEDED', 'ACTION_REQUIRED'))
    improvement_measures = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    plan = relationship('EnvironmentMeasurementPlan', back_populates='measurements')
    
    def __repr__(self):
        return f'<EnvironmentMeasurement {self.factor_name} - {self.result}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'measurement_date': self.measurement_date.isoformat() if self.measurement_date else None,
            'factor_type': self.factor_type,
            'factor_name': self.factor_name,
            'value': float(self.measurement_value) if self.measurement_value else None,
            'limit': float(self.exposure_limit) if self.exposure_limit else None,
            'result': self.result,
            'is_exceeded': self.result in ['EXCEEDED', 'ACTION_REQUIRED']
        }


# ========================================
# MSDS (물질안전보건자료) 관리 모델
# ========================================

class SafeworkMsds(db.Model):
    """물질안전보건자료 (MSDS) 관리"""
    __tablename__ = 'safework_msds'
    
    id = db.Column(db.Integer, primary_key=True)
    chemical_name = db.Column(db.String(200), nullable=False)  # 화학물질명
    cas_number = db.Column(db.String(50))  # CAS 번호
    product_name = db.Column(db.String(200))  # 제품명
    supplier = db.Column(db.String(200))  # 공급업체
    supplier_contact = db.Column(db.String(100))  # 공급업체 연락처
    
    # 위험성 정보
    hazard_classification = db.Column(db.Text)  # 위험성 분류
    signal_word = db.Column(db.Enum('DANGER', 'WARNING', 'CAUTION'), default='WARNING')  # 신호어
    hazard_statements = db.Column(db.Text)  # 유해성 문구
    precautionary_statements = db.Column(db.Text)  # 예방조치 문구
    
    # 물리화학적 특성
    appearance = db.Column(db.String(200))  # 외관
    odor = db.Column(db.String(200))  # 냄새
    ph_value = db.Column(db.String(50))  # pH
    melting_point = db.Column(db.String(50))  # 녹는점
    boiling_point = db.Column(db.String(50))  # 끓는점
    flash_point = db.Column(db.String(50))  # 인화점
    auto_ignition_temp = db.Column(db.String(50))  # 자연발화온도
    
    # 사용 및 관리 정보
    usage_department = db.Column(db.String(100))  # 사용부서
    usage_purpose = db.Column(db.Text)  # 사용목적
    storage_location = db.Column(db.String(200))  # 보관장소
    storage_conditions = db.Column(db.Text)  # 보관조건
    handling_precautions = db.Column(db.Text)  # 취급주의사항
    
    # 응급조치 정보
    first_aid_inhalation = db.Column(db.Text)  # 흡입시 응급조치
    first_aid_skin = db.Column(db.Text)  # 피부접촉시 응급조치
    first_aid_eye = db.Column(db.Text)  # 눈 접촉시 응급조치
    first_aid_ingestion = db.Column(db.Text)  # 섭취시 응급조치
    
    # 소화 정보
    extinguishing_media = db.Column(db.Text)  # 적합한 소화제
    unsuitable_extinguishing_media = db.Column(db.Text)  # 부적합한 소화제
    fire_fighting_measures = db.Column(db.Text)  # 화재진압방법
    
    # 누출사고시 대처방법
    personal_precautions = db.Column(db.Text)  # 개인적 예방조치
    environmental_precautions = db.Column(db.Text)  # 환경적 예방조치
    containment_cleanup = db.Column(db.Text)  # 정화 및 제거방법
    
    # 노출방지 및 개인보호구
    exposure_limits = db.Column(db.Text)  # 노출기준
    engineering_controls = db.Column(db.Text)  # 공학적 대책
    personal_protective_equipment = db.Column(db.Text)  # 개인보호장비
    
    # 안정성 및 반응성
    chemical_stability = db.Column(db.Text)  # 화학적 안정성
    reactivity = db.Column(db.Text)  # 반응성
    incompatible_materials = db.Column(db.Text)  # 피해야 할 물질
    
    # 독성학적 정보
    acute_toxicity = db.Column(db.Text)  # 급성독성
    skin_corrosion = db.Column(db.Text)  # 피부부식성/자극성
    eye_damage = db.Column(db.Text)  # 심한 눈 손상/자극성
    respiratory_sensitisation = db.Column(db.Text)  # 호흡기 과민성
    skin_sensitisation = db.Column(db.Text)  # 피부 과민성
    carcinogenicity = db.Column(db.Text)  # 발암성
    reproductive_toxicity = db.Column(db.Text)  # 생식독성
    
    # 생태독성 정보
    aquatic_toxicity = db.Column(db.Text)  # 수생환경 유해성
    persistence_degradability = db.Column(db.Text)  # 잔류성 및 분해성
    bioaccumulation = db.Column(db.Text)  # 생체축적성
    mobility = db.Column(db.Text)  # 토양이동성
    
    # 폐기 정보
    waste_disposal = db.Column(db.Text)  # 폐기방법
    contaminated_packaging = db.Column(db.Text)  # 오염된 포장재 폐기방법
    
    # 운송 정보
    un_number = db.Column(db.String(20))  # UN 번호
    proper_shipping_name = db.Column(db.String(200))  # 적정선적명
    transport_hazard_class = db.Column(db.String(50))  # 운송시 위험등급
    packing_group = db.Column(db.String(20))  # 포장등급
    
    # 법적 규제현황
    industrial_safety_act = db.Column(db.Text)  # 산업안전보건법
    chemical_control_act = db.Column(db.Text)  # 화학물질관리법
    dangerous_goods_act = db.Column(db.Text)  # 위험물안전관리법
    
    # 문서 관리 정보
    msds_version = db.Column(db.String(20))  # MSDS 버전
    revision_date = db.Column(db.Date)  # 개정일자
    prepared_by = db.Column(db.String(100))  # 작성자
    last_updated = db.Column(db.Date)  # 최종수정일
    expiry_date = db.Column(db.Date)  # 유효기간
    document_path = db.Column(db.String(500))  # MSDS 문서 파일 경로
    
    # 상태 및 메타데이터
    status = db.Column(db.Enum('ACTIVE', 'EXPIRED', 'UNDER_REVIEW'), default='ACTIVE')
    approval_status = db.Column(db.Enum('PENDING', 'APPROVED', 'REJECTED'), default='PENDING')
    approved_by = db.Column(db.String(100))  # 승인자
    approved_date = db.Column(db.Date)  # 승인일자
    
    # 위험도 평가
    hazard_level = db.Column(db.Enum('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'), default='MEDIUM')
    risk_assessment_score = db.Column(db.Integer)  # 위험도 점수 (1-100)
    
    # 사용량 추적
    annual_usage_amount = db.Column(db.Numeric(10, 2))  # 연간 사용량
    usage_unit = db.Column(db.String(20))  # 사용량 단위 (kg, L, etc.)
    inventory_amount = db.Column(db.Numeric(10, 2))  # 보관량
    
    # 감사 정보
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.String(100))
    updated_by = db.Column(db.String(100))
    
    # 인덱스
    __table_args__ = (
        Index('idx_msds_chemical_name', 'chemical_name'),
        Index('idx_msds_cas_number', 'cas_number'),
        Index('idx_msds_hazard_level', 'hazard_level'),
        Index('idx_msds_status', 'status'),
        Index('idx_msds_usage_dept', 'usage_department'),
        Index('idx_msds_expiry', 'expiry_date'),
    )
    
    def __repr__(self):
        return f'<SafeworkMsds {self.chemical_name} ({self.cas_number})>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'chemical_name': self.chemical_name,
            'cas_number': self.cas_number,
            'product_name': self.product_name,
            'supplier': self.supplier,
            'supplier_contact': self.supplier_contact,
            'hazard_classification': self.hazard_classification,
            'signal_word': self.signal_word,
            'hazard_level': self.hazard_level,
            'usage_department': self.usage_department,
            'storage_location': self.storage_location,
            'status': self.status,
            'approval_status': self.approval_status,
            'revision_date': self.revision_date.isoformat() if self.revision_date else None,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'msds_version': self.msds_version,
            'risk_assessment_score': self.risk_assessment_score,
            'annual_usage_amount': float(self.annual_usage_amount) if self.annual_usage_amount else None,
            'inventory_amount': float(self.inventory_amount) if self.inventory_amount else None,
            'usage_unit': self.usage_unit
        }
    
    def to_summary_dict(self):
        """간단한 요약 정보만 반환"""
        return {
            'id': self.id,
            'chemical_name': self.chemical_name,
            'cas_number': self.cas_number,
            'hazard_level': self.hazard_level,
            'usage_department': self.usage_department,
            'status': self.status,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None
        }
    
    @property
    def is_expired(self):
        """MSDS가 만료되었는지 확인"""
        if not self.expiry_date:
            return False
        return datetime.now().date() > self.expiry_date
    
    @property
    def is_expiring_soon(self, days=30):
        """만료 예정인지 확인 (기본 30일 전)"""
        if not self.expiry_date:
            return False
        from datetime import timedelta
        warning_date = datetime.now().date() + timedelta(days=days)
        return self.expiry_date <= warning_date