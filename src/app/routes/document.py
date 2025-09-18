"""Document management routes for SafeWork"""

import os
import mimetypes
from datetime import datetime
from werkzeug.utils import secure_filename
from werkzeug.exceptions import NotFound, Forbidden
from flask import (
    Blueprint,
    current_app,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    send_file,
    url_for,
    abort,
)
from flask_login import current_user, login_required
from sqlalchemy import or_, and_, desc

from models import db
from models_document import Document, DocumentAccessLog, DocumentVersion
from forms_document import DocumentUploadForm, DocumentSearchForm

document_bp = Blueprint("document", __name__)

# Allowed file extensions
ALLOWED_EXTENSIONS = {
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "txt",
    "png",
    "jpg",
    "jpeg",
    "gif",
}


def allowed_file(filename):
    """Check if file extension is allowed"""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def generate_document_number():
    """Generate unique document number"""
    now = datetime.now()
    prefix = f"DOC-{now.strftime('%Y%m')}"

    # Get the latest document number for this month
    latest = (
        Document.query.filter(Document.document_number.like(f"{prefix}%"))
        .order_by(Document.document_number.desc())
        .first()
    )

    if latest:
        last_num = int(latest.document_number.split("-")[-1])
        new_num = last_num + 1
    else:
        new_num = 1

    return f"{prefix}-{new_num:04d}"


@document_bp.route("/form/<document_name>")
def document_form(document_name):
    """Handle document forms by name (form_001, form_002, etc.)"""
    # Validate document name format
    if not document_name or not document_name.startswith("form_"):
        abort(404)

    # Map document names to their templates and data
    form_templates = {
        "form_001": {
            "template": "forms/form_001_initial.html",
            "title": "초기 안전 점검 보고서",
            "description": "작업 시작 전 초기 안전 상태를 점검하는 문서",
        },
        "form_002": {
            "template": "forms/form_002_daily.html",
            "title": "일일 안전 점검 보고서",
            "description": "매일 수행하는 정기 안전 점검 문서",
        },
    }

    # Check if the requested form exists
    if document_name not in form_templates:
        flash(f"문서 '{document_name}'을 찾을 수 없습니다.", "error")
        abort(404)

    form_info = form_templates[document_name]

    # Create document template using Document model with is_template=True
    template = Document.query.filter_by(
        title=form_info["title"], is_template=True
    ).first()
    if not template:
        template = Document(
            title=form_info["title"],
            description=form_info["description"],
            filename=f"{document_name}.html",
            file_path=f"templates/{form_info['template']}",
            mime_type="text/html",
            category="form_template",
            access_level="public",
            is_template=True,
        )
        db.session.add(template)
        db.session.commit()

    # Return simple HTML response for now
    return f"""<!DOCTYPE html>
<html>
<head><title>{form_info['title']} - SafeWork</title></head>
<body>
<h1>{form_info['title']}</h1>
<p>{form_info['description']}</p>
<p>문서 ID: {document_name}</p>
<p>이 페이지는 임시 페이지입니다. 실제 폼 기능은 추후 구현될 예정입니다.</p>
<a href="/documents/">문서 목록으로 돌아가기</a>
</body>
</html>"""


@document_bp.route("/")
def index():
    """문서 목록 메인 페이지 (사용자용)"""
    # Get filter parameters
    category_id = request.args.get("category", type=int)
    doc_type = request.args.get("type")
    search_query = request.args.get("q")

    # Base query - only get documents (simplified to match actual DB schema)
    query = Document.query

    # Apply access control - simplified to use access_level field
    if not current_user.is_authenticated:
        query = query.filter(Document.access_level == "public")
    elif not current_user.is_admin:
        query = query.filter(
            or_(
                Document.access_level == "public",
                Document.upload_user_id == current_user.id,
            )
        )

    # Apply filters - use actual database fields
    if category_id:
        # Note: category is a string field, not an ID
        pass  # Skip category filtering for now

    if doc_type:
        # Note: document_type doesn't exist in DB, skip for now
        pass

    if search_query:
        query = query.filter(
            or_(
                Document.title.contains(search_query),
                Document.description.contains(search_query),
            )
        )

    # Paginate results
    page = request.args.get("page", 1, type=int)
    documents = query.order_by(Document.created_at.desc()).paginate(
        page=page, per_page=12, error_out=False
    )

    # Get categories for filter (simplified - using distinct categories from documents)
    categories = (
        db.session.query(Document.category)
        .filter(Document.category.isnot(None), Document.access_level == "public")
        .distinct()
        .all()
    )
    categories = [{"name": cat[0]} for cat in categories if cat[0]]

    return render_template(
        "document/index.html",
        documents=documents,
        categories=categories,
        current_category=category_id,
        current_type=doc_type,
        search_query=search_query,
    )


@document_bp.route("/view/<int:id>")
def view(id):
    """문서 상세 보기"""
    document = Document.query.get_or_404(id)

    # Check access permissions
    if not document.is_public and not current_user.is_authenticated:
        flash("이 문서를 보려면 로그인이 필요합니다.", "warning")
        return redirect(url_for("auth.login", next=request.url))

    if document.requires_admin and not current_user.is_admin:
        abort(403)

    # Log access
    if current_user.is_authenticated:
        log = DocumentAccessLog(
            document_id=document.id,
            user_id=current_user.id,
            action="view",
            ip_address=request.remote_addr,
            user_agent=request.user_agent.string,
        )
        db.session.add(log)
        document.increment_view_count()
        db.session.commit()

    # Get document versions
    versions = (
        DocumentVersion.query.filter_by(document_id=document.id)
        .order_by(DocumentVersion.upload_date.desc())
        .all()
    )

    # Get related documents
    related = (
        Document.query.filter(
            Document.category_id == document.category_id,
            Document.id != document.id,
            Document.is_active == True,
        )
        .limit(5)
        .all()
    )

    return render_template(
        "document/view.html", document=document, versions=versions, related=related
    )


@document_bp.route("/download/<int:id>")
def download(id):
    """문서 다운로드"""
    document = Document.query.get_or_404(id)

    # Check access permissions
    if not document.is_public and not current_user.is_authenticated:
        flash("이 문서를 다운로드하려면 로그인이 필요합니다.", "warning")
        return redirect(url_for("auth.login", next=request.url))

    if document.requires_admin and not current_user.is_admin:
        abort(403)

    # Log download
    if current_user.is_authenticated:
        log = DocumentAccessLog(
            document_id=document.id,
            user_id=current_user.id,
            action="download",
            ip_address=request.remote_addr,
            user_agent=request.user_agent.string,
        )
        db.session.add(log)
        document.increment_download_count()
        db.session.commit()

    # Send file
    try:
        return send_file(
            document.file_path, as_attachment=True, download_name=document.file_name
        )
    except FileNotFoundError:
        flash("파일을 찾을 수 없습니다.", "danger")
        return redirect(url_for("document.view", id=id))


@document_bp.route("/search")
def search():
    """문서 검색"""
    form = DocumentSearchForm()
    query = request.args.get("q", "")
    category = request.args.get("category")
    doc_type = request.args.get("type")
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")

    # Build search query - simplified to match actual DB schema
    documents_query = Document.query

    # Apply search filters
    if query:
        documents_query = documents_query.filter(
            or_(Document.title.contains(query), Document.description.contains(query))
        )

    if category:
        # Category is a string field, not ID
        documents_query = documents_query.filter(Document.category == category)

    if doc_type:
        # Skip document_type filter - doesn't exist in DB
        pass

    if date_from:
        documents_query = documents_query.filter(Document.created_at >= date_from)

    if date_to:
        documents_query = documents_query.filter(Document.created_at <= date_to)

    # Apply access control - use access_level field
    if not current_user.is_authenticated:
        documents_query = documents_query.filter(Document.access_level == "public")
    elif not current_user.is_admin:
        documents_query = documents_query.filter(
            or_(
                Document.access_level == "public",
                Document.upload_user_id == current_user.id,
            )
        )

    # Paginate results
    page = request.args.get("page", 1, type=int)
    documents = documents_query.order_by(Document.created_at.desc()).paginate(
        page=page, per_page=20, error_out=False
    )

    return render_template(
        "document/search.html", form=form, documents=documents, query=query
    )


@document_bp.route("/templates")
def templates():
    """문서 템플릿(양식) 목록"""
    category = request.args.get("category")

    # Use Document table with is_template=True instead of DocumentTemplate
    query = Document.query.filter_by(is_template=True)

    if category:
        query = query.filter_by(category=category)

    templates = query.order_by(Document.title).all()

    return render_template("document/templates.html", templates=templates)


@document_bp.route("/template/download/<int:id>")
@login_required
def download_template(id):
    """템플릿 다운로드"""
    template = Document.query.filter_by(id=id, is_template=True).first_or_404()

    try:
        return send_file(
            template.file_path, as_attachment=True, download_name=template.filename
        )
    except FileNotFoundError:
        flash("템플릿 파일을 찾을 수 없습니다.", "danger")
        return redirect(url_for("document.templates"))


# API endpoints for AJAX operations
@document_bp.route("/api/recent")
def api_recent_documents():
    """최근 문서 목록 API"""
    limit = request.args.get("limit", 10, type=int)

    query = Document.query.filter(
        Document.is_active == True, Document.is_archived == False
    )

    # Apply access control
    if not current_user.is_authenticated:
        query = query.filter(Document.is_public == True)
    elif not current_user.is_admin:
        query = query.filter(Document.requires_admin == False)

    documents = query.order_by(Document.created_at.desc()).limit(limit).all()

    return jsonify(
        [
            {
                "id": doc.id,
                "title": doc.title,
                "document_number": doc.document_number,
                "category": doc.category.name if doc.category else None,
                "created_at": doc.created_at.isoformat(),
                "file_type": doc.file_type,
            }
            for doc in documents
        ]
    )


@document_bp.route("/api/popular")
def api_popular_documents():
    """인기 문서 목록 API"""
    limit = request.args.get("limit", 10, type=int)

    query = Document.query.filter(
        Document.is_active == True, Document.is_archived == False
    )

    # Apply access control
    if not current_user.is_authenticated:
        query = query.filter(Document.is_public == True)
    elif not current_user.is_admin:
        query = query.filter(Document.requires_admin == False)

    documents = query.order_by(Document.download_count.desc()).limit(limit).all()

    return jsonify(
        [
            {
                "id": doc.id,
                "title": doc.title,
                "document_number": doc.document_number,
                "download_count": doc.download_count,
                "view_count": doc.view_count,
            }
            for doc in documents
        ]
    )


@document_bp.route("/api/categories")
def api_categories():
    """문서 카테고리 목록 API"""
    # Get distinct categories from documents
    categories = (
        db.session.query(Document.category)
        .filter(Document.category.isnot(None), Document.access_level == "public")
        .distinct()
        .all()
    )

    return jsonify(
        [
            {
                "id": idx,
                "name": cat[0],
                "description": f"{cat[0]} documents",
                "icon": "fa-folder",
                "document_count": 0,  # Simplified for now
            }
            for idx, cat in enumerate(categories)
            if cat[0]
        ]
    )
