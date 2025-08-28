"""Admin document management routes for SafeWork"""

import os
import shutil
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import (Blueprint, current_app, flash, jsonify, redirect, 
                   render_template, request, url_for, abort)
from flask_login import current_user, login_required
from sqlalchemy import func, desc
from functools import wraps

from models import db, User
from models_document import (Document, DocumentCategory, DocumentAccessLog, 
                            DocumentVersion, DocumentTemplate)

document_admin_bp = Blueprint('document_admin', __name__)

def admin_required(f):
    """Admin권한 확인 데코레이터"""
    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        if not current_user.is_admin:
            abort(403)
        return f(*args, **kwargs)
    return decorated_function


# Placeholder routes to prevent template errors
@document_admin_bp.route('/')
@admin_required
def index():
    """문서 관리 대시보드 (임시)"""
    return render_template('admin/dashboard.html')

@document_admin_bp.route('/upload')
@admin_required
def upload():
    """문서 업로드 페이지 (임시)"""
    return render_template('admin/dashboard.html')

@document_admin_bp.route('/categories')
@admin_required
def categories():
    """카테고리 관리 페이지 (임시)"""
    return render_template('admin/dashboard.html')