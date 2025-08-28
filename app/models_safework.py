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
    department = relationship('Department', back_populates='workers')
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