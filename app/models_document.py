"""Document management models for SafeWork system"""

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from models import db

# Note: Using string references for User model to avoid circular import issues

class DocumentCategory(db.Model):
    """문서 카테고리 모델"""
    __tablename__ = "document_categories"
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text)
    icon = db.Column(db.String(50))  # Font Awesome icon class
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    documents = db.relationship('Document', backref='category', lazy='dynamic')
    
    def __repr__(self):
        return f'<DocumentCategory {self.name}>'


class Document(db.Model):
    """문서 모델"""
    __tablename__ = "documents"
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Basic Information
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)  # Size in bytes
    file_type = db.Column(db.String(50))  # MIME type
    
    # Document metadata
    document_number = db.Column(db.String(50), unique=True)  # 문서번호
    version = db.Column(db.String(20), default='1.0')
    language = db.Column(db.String(10), default='ko')
    tags = db.Column(db.JSON)  # Array of tags
    
    # Categorization
    category_id = db.Column(db.Integer, db.ForeignKey('document_categories.id'))
    document_type = db.Column(db.String(50))  # 'policy', 'guideline', 'report', 'form', 'educational'
    
    # Access Control
    is_public = db.Column(db.Boolean, default=False)  # Public or requires login
    requires_admin = db.Column(db.Boolean, default=False)  # Admin only
    department_access = db.Column(db.JSON)  # List of departments with access
    
    # Upload information
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)

    # Status and validity
    is_active = db.Column(db.Boolean, default=True)
    is_archived = db.Column(db.Boolean, default=False)
    valid_from = db.Column(db.Date)
    valid_until = db.Column(db.Date)

    # Statistics
    download_count = db.Column(db.Integer, default=0)
    view_count = db.Column(db.Integer, default=0)
    last_accessed = db.Column(db.DateTime)

    # Audit fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = db.Column(db.DateTime)  # Soft delete

    # Relationships - Use string reference to avoid circular import
    uploader = db.relationship('User', foreign_keys=[uploaded_by], backref='uploaded_documents')
    access_logs = db.relationship('DocumentAccessLog', backref='document', lazy='dynamic')
    versions = db.relationship('DocumentVersion', backref='document', lazy='dynamic')
    
    def __repr__(self):
        return f'<Document {self.title}>'
    
    def increment_download_count(self):
        """Increment download counter"""
        self.download_count = (self.download_count or 0) + 1
        self.last_accessed = datetime.utcnow()
        
    def increment_view_count(self):
        """Increment view counter"""
        self.view_count = (self.view_count or 0) + 1
        self.last_accessed = datetime.utcnow()


class DocumentVersion(db.Model):
    """문서 버전 관리 모델"""
    __tablename__ = "document_versions"
    
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)
    
    version_number = db.Column(db.String(20), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)
    
    change_description = db.Column(db.Text)
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    is_current = db.Column(db.Boolean, default=False)
    
    # Relationships
    uploader = db.relationship('User', foreign_keys=[uploaded_by])
    
    def __repr__(self):
        return f'<DocumentVersion {self.version_number} for Document {self.document_id}>'


class DocumentAccessLog(db.Model):
    """문서 접근 로그 모델"""
    __tablename__ = "document_access_logs"
    
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    action = db.Column(db.String(50))  # 'view', 'download', 'print', 'share'
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    
    accessed_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id])
    
    def __repr__(self):
        return f'<DocumentAccessLog {self.action} by User {self.user_id}>'


class DocumentTemplate(db.Model):
    """문서 템플릿 모델 (양식)"""
    __tablename__ = "document_templates"
    
    id = db.Column(db.Integer, primary_key=True)
    
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    template_code = db.Column(db.String(50), unique=True)
    
    file_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(50))
    
    category = db.Column(db.String(50))  # 'safety', 'health', 'incident', 'inspection'
    
    # Template metadata
    fields = db.Column(db.JSON)  # Fillable fields definition
    instructions = db.Column(db.Text)
    
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<DocumentTemplate {self.name}>'