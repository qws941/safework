"""SafeWork 안전보건관리 시스템 모델 (v2.0)
- 기존 MySQL 구조와 호환
- 관계 설정 단순화
"""

from datetime import datetime
from models import db


class SafeworkWorker(db.Model):
    """근로자 정보"""
    __tablename__ = 'safework_workers'
    
    id = db.Column(db.Integer, primary_key=True)
    employee_number = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100))
    position = db.Column(db.String(100))
    birth_date = db.Column(db.Date)
    gender = db.Column(db.String(10))
    phone = db.Column(db.String(50))
    email = db.Column(db.String(100))
    emergency_contact = db.Column(db.String(50))
    emergency_relationship = db.Column(db.String(50))
    address = db.Column(db.Text)
    hire_date = db.Column(db.Date)
    blood_type = db.Column(db.String(10))
    medical_conditions = db.Column(db.Text)
    allergies = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    health_checks = db.relationship('SafeworkHealthCheck', backref='worker', lazy='dynamic')
    medical_visits = db.relationship('SafeworkMedicalVisit', backref='worker', lazy='dynamic')


class SafeworkHealthCheck(db.Model):
    """건강검진 기록"""
    __tablename__ = 'safework_health_checks'
    
    id = db.Column(db.Integer, primary_key=True)
    worker_id = db.Column(db.Integer, db.ForeignKey('safework_workers.id'), nullable=False)
    check_type = db.Column(db.String(50))  # 일반, 특수, 배치전, 수시
    check_date = db.Column(db.Date, nullable=False)
    hospital = db.Column(db.String(200))
    result = db.Column(db.String(50))  # 정상, 관찰필요, 치료필요
    blood_pressure = db.Column(db.String(20))
    blood_sugar = db.Column(db.String(20))
    cholesterol = db.Column(db.String(20))
    bmi = db.Column(db.Float)
    vision_left = db.Column(db.String(10))
    vision_right = db.Column(db.String(10))
    hearing_left = db.Column(db.String(10))
    hearing_right = db.Column(db.String(10))
    chest_xray = db.Column(db.String(100))
    findings = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    next_check_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class SafeworkMedicalVisit(db.Model):
    """의무실 방문 기록"""
    __tablename__ = 'safework_medical_visits'
    
    id = db.Column(db.Integer, primary_key=True)
    worker_id = db.Column(db.Integer, db.ForeignKey('safework_workers.id'), nullable=False)
    visit_date = db.Column(db.DateTime, nullable=False)
    chief_complaint = db.Column(db.Text)
    blood_pressure = db.Column(db.String(20))
    heart_rate = db.Column(db.Integer)
    body_temp = db.Column(db.Float)
    resp_rate = db.Column(db.Integer)
    diagnosis = db.Column(db.Text)
    treatment = db.Column(db.Text)
    medication_given = db.Column(db.Text)
    follow_up_needed = db.Column(db.Boolean, default=False)
    follow_up_date = db.Column(db.Date)
    nurse_name = db.Column(db.String(100))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class SafeworkMedication(db.Model):
    """의약품 재고 관리"""
    __tablename__ = 'safework_medications'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100))
    unit = db.Column(db.String(50))
    current_stock = db.Column(db.Integer, default=0)
    minimum_stock = db.Column(db.Integer, default=0)
    expiry_date = db.Column(db.Date)
    supplier = db.Column(db.String(200))
    price_per_unit = db.Column(db.Float)
    last_purchase_date = db.Column(db.Date)
    location = db.Column(db.String(200))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SafeworkMedicationLog(db.Model):
    """의약품 사용 기록"""
    __tablename__ = 'safework_medication_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    medication_id = db.Column(db.Integer, db.ForeignKey('safework_medications.id'), nullable=False)
    worker_id = db.Column(db.Integer, db.ForeignKey('safework_workers.id'))
    action_type = db.Column(db.String(50))  # 입고, 출고, 사용, 폐기
    quantity = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.Text)
    performed_by = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    medication = db.relationship('SafeworkMedication', backref='logs')
    worker = db.relationship('SafeworkWorker', backref='medication_logs')

class SafeworkNotification(db.Model):
    """SafeWork 알림 테이블"""
    __tablename__ = 'safework_notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)  # 알림 받을 사용자 ID
    notification_type = db.Column(db.String(50), nullable=False)  # medication_low_stock, health_check_reminder, etc.
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(20), default='medium')  # high, medium, low
    is_read = db.Column(db.Boolean, default=False)
    read_at = db.Column(db.DateTime)
    data = db.Column(db.Text)  # JSON 형태의 추가 데이터
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SafeworkNotificationSettings(db.Model):
    """사용자별 알림 설정"""
    __tablename__ = 'safework_notification_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, unique=True, nullable=False)
    email_enabled = db.Column(db.Boolean, default=True)
    browser_enabled = db.Column(db.Boolean, default=True)
    medication_alerts = db.Column(db.Boolean, default=True)
    visit_reminders = db.Column(db.Boolean, default=True) 
    health_check_reminders = db.Column(db.Boolean, default=True)
    alert_threshold_days = db.Column(db.Integer, default=7)  # 사전 알림 일수
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SafeworkHealthPlan(db.Model):
    """건강검진 계획"""
    __tablename__ = 'safework_health_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    year = db.Column(db.Integer, nullable=False)
    plan_type = db.Column(db.String(50))  # 일반, 특수
    department = db.Column(db.String(100))
    target_month = db.Column(db.Integer)
    target_count = db.Column(db.Integer)
    completed_count = db.Column(db.Integer, default=0)
    hospital = db.Column(db.String(200))
    budget = db.Column(db.Float)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)