"""Models for 002 survey form"""
from models import db
from datetime import datetime

class Survey002(db.Model):
    """작업환경 평가 설문 (002)"""
    __tablename__ = 'survey_002'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # 기본 정보
    name = db.Column(db.String(100), nullable=False)
    employee_number = db.Column(db.String(50))
    department = db.Column(db.String(100), nullable=False)
    position = db.Column(db.String(50))
    age = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.String(10), nullable=False)
    
    # 작업환경 평가
    workspace_temperature = db.Column(db.Integer)  # 작업장 온도 적절성 (1-10)
    workspace_humidity = db.Column(db.Integer)  # 작업장 습도 적절성 (1-10)
    workspace_lighting = db.Column(db.Integer)  # 작업장 조명 적절성 (1-10)
    workspace_noise = db.Column(db.Integer)  # 작업장 소음 수준 (1-10)
    workspace_ventilation = db.Column(db.Integer)  # 작업장 환기 상태 (1-10)
    workspace_cleanliness = db.Column(db.Integer)  # 작업장 청결도 (1-10)
    
    # 작업 도구 및 장비
    equipment_condition = db.Column(db.Integer)  # 장비 상태 (1-10)
    equipment_maintenance = db.Column(db.Integer)  # 장비 정비 상태 (1-10)
    equipment_safety = db.Column(db.Integer)  # 안전장비 지급 (1-10)
    equipment_ergonomics = db.Column(db.Integer)  # 인체공학적 설계 (1-10)
    
    # 작업 부담
    physical_burden = db.Column(db.Integer)  # 신체적 부담 정도 (1-10)
    mental_burden = db.Column(db.Integer)  # 정신적 부담 정도 (1-10)
    work_pace = db.Column(db.Integer)  # 작업 속도 적절성 (1-10)
    work_repetition = db.Column(db.Integer)  # 반복 작업 정도 (1-10)
    break_adequacy = db.Column(db.Integer)  # 휴식시간 적절성 (1-10)
    
    # 안전 관리
    safety_education = db.Column(db.Boolean, default=False)  # 안전교육 이수 여부
    safety_procedures = db.Column(db.Integer)  # 안전절차 준수도 (1-10)
    safety_equipment_usage = db.Column(db.Integer)  # 안전장비 사용률 (1-10)
    accident_risk = db.Column(db.Integer)  # 사고위험도 인식 (1-10)
    
    # 건강 상태
    overall_health = db.Column(db.Integer)  # 전반적 건강상태 (1-10)
    fatigue_level = db.Column(db.Integer)  # 피로도 (1-10)
    stress_level = db.Column(db.Integer)  # 스트레스 수준 (1-10)
    sleep_quality = db.Column(db.Integer)  # 수면 질 (1-10)
    
    # 개선 요구사항
    improvement_requests = db.Column(db.Text)  # 개선 요구사항
    additional_comments = db.Column(db.Text)  # 추가 의견
    
    # 메타데이터
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    
    def __repr__(self):
        return f'<Survey002 {self.id}: {self.name}>'