"""Database migration tracking model"""
from datetime import datetime
from .models import db


class Migration(db.Model):
    """마이그레이션 실행 기록 추적"""
    __tablename__ = 'migrations'
    
    id = db.Column(db.Integer, primary_key=True)
    version = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(200), nullable=False)
    filename = db.Column(db.String(100), nullable=False)
    checksum = db.Column(db.String(64), nullable=False)  # SHA-256 해시
    executed_at = db.Column(db.DateTime, default=datetime.utcnow)
    execution_time = db.Column(db.Float)  # 실행 시간 (초)
    success = db.Column(db.Boolean, default=True)
    error_message = db.Column(db.Text)
    
    def __repr__(self):
        return f'<Migration {self.version}: {self.description}>'