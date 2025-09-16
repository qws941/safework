"""Document management models for SafeWork system"""

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from models import db

# Note: Using string references for User model to avoid circular import issues

# DocumentCategory removed - not in actual database schema


class Document(db.Model):
    """문서 모델"""
    __tablename__ = "documents"
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Basic Information
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.BigInteger)  # Size in bytes
    mime_type = db.Column(db.String(100))  # MIME type
    
    # Document metadata - simplified to match actual DB
    
    # No category_id - category is a simple string field
    # No document_type - not in actual DB schema
    # No access control fields - using access_level instead
    
    # Upload information
    upload_user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Additional fields from actual DB schema
    category = db.Column(db.String(100))
    tags = db.Column(db.ARRAY(db.Text))
    access_level = db.Column(db.String(20), default='public')
    download_count = db.Column(db.Integer, default=0)
    view_count = db.Column(db.Integer, default=0)
    is_template = db.Column(db.Boolean, default=False)

    # Relationships - Use string reference to avoid circular import
    uploader = db.relationship('User', foreign_keys=[upload_user_id], backref='uploaded_documents')
    
    def __repr__(self):
        return f'<Document {self.title}>'
    
    def increment_download_count(self):
        """Increment download counter"""
        self.download_count = (self.download_count or 0) + 1

    def increment_view_count(self):
        """Increment view counter"""
        self.view_count = (self.view_count or 0) + 1


class DocumentVersion(db.Model):
    """문서 버전 관리 모델"""
    __tablename__ = "document_versions"

    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False)
    version_number = db.Column(db.Integer, nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.BigInteger)
    change_description = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    uploader = db.relationship('User', foreign_keys=[created_by])

    def __repr__(self):
        return f'<DocumentVersion {self.version_number} for Document {self.document_id}>'


class DocumentAccessLog(db.Model):
    """문서 접근 로그 모델"""
    __tablename__ = "document_access_logs"

    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    access_type = db.Column(db.String(20), nullable=False)  # 'view', 'download'
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id])

    def __repr__(self):
        return f'<DocumentAccessLog {self.access_type} by User {self.user_id}>'


# DocumentTemplate removed - not in actual database schema