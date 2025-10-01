"""
Warning Sign Models for SafeWork
Modern chemical warning sign generator with GHS and KOSHA support
"""
from datetime import datetime
from app import db
from sqlalchemy.dialects.postgresql import JSON, ARRAY


class WarningSign(db.Model):
    """
    Warning sign design storage
    Supports GHS (Globally Harmonized System) and Korean KOSHA standards
    """
    __tablename__ = 'warning_signs'

    id = db.Column(db.Integer, primary_key=True)

    # User tracking
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_by_name = db.Column(db.String(200))  # For anonymous users

    # Basic information
    title = db.Column(db.String(500), nullable=False)  # Product/Chemical name
    description = db.Column(db.Text)

    # Design specifications
    aspect_ratio = db.Column(db.String(20), default='1:1')  # e.g., "1:1", "1:1.2", "1:1.5"
    width_mm = db.Column(db.Integer, default=200)
    height_mm = db.Column(db.Integer, default=200)

    # GHS Elements (stored as JSON for flexibility)
    pictograms = db.Column(ARRAY(db.String), default=[])  # e.g., ['GHS01', 'GHS07']
    signal_word = db.Column(db.String(50))  # 'Danger' or 'Warning' (Korean: 위험/경고)

    # Hazard and precautionary statements
    hazard_statements = db.Column(JSON, default=[])  # [{code: 'H200', text_ko: '...', text_en: '...'}]
    precautionary_statements = db.Column(JSON, default=[])

    # Supplier information
    supplier_name = db.Column(db.String(500))
    supplier_address = db.Column(db.Text)
    supplier_phone = db.Column(db.String(100))
    emergency_phone = db.Column(db.String(100))

    # Styling
    font_size_title = db.Column(db.Integer, default=24)
    font_size_statements = db.Column(db.Integer, default=14)
    font_size_supplier = db.Column(db.Integer, default=12)
    background_color = db.Column(db.String(20), default='#FFFFFF')
    border_color = db.Column(db.String(20), default='#FF0000')
    border_width = db.Column(db.Integer, default=3)

    # Language
    language = db.Column(db.String(10), default='ko')  # 'ko' or 'en'

    # Export format preferences
    export_format = db.Column(db.String(10), default='png')  # png, pdf, svg, jpeg

    # Generated files (stored paths or URLs)
    generated_image_url = db.Column(db.String(500))
    generated_pdf_url = db.Column(db.String(500))
    generated_svg_url = db.Column(db.String(500))

    # Compliance tracking
    kosha_compliant = db.Column(db.Boolean, default=False)
    ghs_compliant = db.Column(db.Boolean, default=False)
    compliance_notes = db.Column(db.Text)

    # Metadata
    is_template = db.Column(db.Boolean, default=False)  # Public templates
    is_public = db.Column(db.Boolean, default=False)
    usage_count = db.Column(db.Integer, default=0)  # How many times downloaded

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='warning_signs')

    def __repr__(self):
        return f'<WarningSign {self.id}: {self.title}>'

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'created_by_name': self.created_by_name,
            'title': self.title,
            'description': self.description,
            'aspect_ratio': self.aspect_ratio,
            'dimensions': {
                'width_mm': self.width_mm,
                'height_mm': self.height_mm
            },
            'ghs_elements': {
                'pictograms': self.pictograms or [],
                'signal_word': self.signal_word,
                'hazard_statements': self.hazard_statements or [],
                'precautionary_statements': self.precautionary_statements or []
            },
            'supplier': {
                'name': self.supplier_name,
                'address': self.supplier_address,
                'phone': self.supplier_phone,
                'emergency_phone': self.emergency_phone
            },
            'styling': {
                'font_size_title': self.font_size_title,
                'font_size_statements': self.font_size_statements,
                'font_size_supplier': self.font_size_supplier,
                'background_color': self.background_color,
                'border_color': self.border_color,
                'border_width': self.border_width
            },
            'language': self.language,
            'export_format': self.export_format,
            'generated_files': {
                'image': self.generated_image_url,
                'pdf': self.generated_pdf_url,
                'svg': self.generated_svg_url
            },
            'compliance': {
                'kosha_compliant': self.kosha_compliant,
                'ghs_compliant': self.ghs_compliant,
                'notes': self.compliance_notes
            },
            'metadata': {
                'is_template': self.is_template,
                'is_public': self.is_public,
                'usage_count': self.usage_count
            },
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class WarningSignTemplate(db.Model):
    """
    Pre-configured templates for common chemicals and scenarios
    """
    __tablename__ = 'warning_sign_templates'

    id = db.Column(db.Integer, primary_key=True)
    name_ko = db.Column(db.String(200), nullable=False)
    name_en = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100))  # e.g., 'acids', 'bases', 'flammable', 'toxic'

    # Template configuration (JSON)
    template_config = db.Column(JSON, nullable=False)

    # Preview image
    preview_image_url = db.Column(db.String(500))

    # Metadata
    is_active = db.Column(db.Boolean, default=True)
    usage_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<WarningSignTemplate {self.id}: {self.name_ko}>'

    def to_dict(self):
        return {
            'id': self.id,
            'name_ko': self.name_ko,
            'name_en': self.name_en,
            'category': self.category,
            'config': self.template_config,
            'preview_image': self.preview_image_url,
            'usage_count': self.usage_count
        }


class GHSPictogram(db.Model):
    """
    Reference table for GHS pictograms
    """
    __tablename__ = 'ghs_pictograms'

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)  # e.g., 'GHS01'
    name_ko = db.Column(db.String(200), nullable=False)
    name_en = db.Column(db.String(200), nullable=False)
    description_ko = db.Column(db.Text)
    description_en = db.Column(db.Text)

    # SVG path or image URL
    svg_path = db.Column(db.String(500))
    image_url = db.Column(db.String(500))

    # Classification
    hazard_class = db.Column(db.String(200))  # e.g., 'Physical hazards', 'Health hazards'

    is_active = db.Column(db.Boolean, default=True)
    display_order = db.Column(db.Integer, default=0)

    def __repr__(self):
        return f'<GHSPictogram {self.code}: {self.name_ko}>'

    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'name_ko': self.name_ko,
            'name_en': self.name_en,
            'description_ko': self.description_ko,
            'description_en': self.description_en,
            'svg_path': self.svg_path,
            'image_url': self.image_url,
            'hazard_class': self.hazard_class
        }


class HazardStatement(db.Model):
    """
    Reference table for GHS hazard statements (H-codes)
    """
    __tablename__ = 'hazard_statements'

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)  # e.g., 'H200'
    text_ko = db.Column(db.Text, nullable=False)
    text_en = db.Column(db.Text, nullable=False)

    # Related pictograms
    related_pictograms = db.Column(ARRAY(db.String), default=[])

    # Classification
    hazard_class = db.Column(db.String(200))
    signal_word = db.Column(db.String(50))  # 'Danger' or 'Warning'

    is_active = db.Column(db.Boolean, default=True)

    def __repr__(self):
        return f'<HazardStatement {self.code}: {self.text_ko[:50]}>'

    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'text_ko': self.text_ko,
            'text_en': self.text_en,
            'related_pictograms': self.related_pictograms or [],
            'hazard_class': self.hazard_class,
            'signal_word': self.signal_word
        }


class PrecautionaryStatement(db.Model):
    """
    Reference table for GHS precautionary statements (P-codes)
    """
    __tablename__ = 'precautionary_statements'

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)  # e.g., 'P201'
    text_ko = db.Column(db.Text, nullable=False)
    text_en = db.Column(db.Text, nullable=False)

    # Category
    category = db.Column(db.String(100))  # 'Prevention', 'Response', 'Storage', 'Disposal'

    is_active = db.Column(db.Boolean, default=True)

    def __repr__(self):
        return f'<PrecautionaryStatement {self.code}: {self.text_ko[:50]}>'

    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'text_ko': self.text_ko,
            'text_en': self.text_en,
            'category': self.category
        }
