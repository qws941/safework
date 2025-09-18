"""
SafeWork Admin Module
관리자 모듈의 공통 기능 및 Blueprint 설정
"""
import io
from datetime import datetime, timedelta, date
from functools import wraps

import pandas as pd
from flask import (
    Blueprint,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    send_file,
    url_for,
)
from flask_login import current_user, login_required
from openpyxl import Workbook
from sqlalchemy import and_, func, or_, text

from forms import AdminFilterForm
from models import (
    AuditLog,
    Survey,
    SurveyStatistics,
    User,
    Process,
    db,
    MSDSModel,
    MSDSComponentModel,
    MSDSUsageRecordModel,
)
from utils.activity_tracker import track_admin_action, track_page_view

try:
    from models_safework_v2 import (
        SafeworkWorker,
        SafeworkHealthCheck,
        SafeworkMedicalVisit,
        SafeworkMedication,
        SafeworkMedicationLog,
        SafeworkHealthPlan,
        SafeworkTodo,
    )
except ImportError:
    # SafeWork 모델이 없는 경우 더미 클래스 생성
    class SafeworkWorker:
        pass

    class SafeworkHealthCheck:
        pass

    class SafeworkMedicalVisit:
        pass

    class SafeworkMedication:
        pass

    class SafeworkTodo:
        pass


# Blueprint 생성
admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/temp-access")
def temp_admin_access():
    """임시 관리자 접근 - 인증 우회"""
    from models import User
    from flask_login import login_user

    user = User.query.filter_by(username="admin").first()
    if user:
        login_user(user, remember=False)
        flash("임시 관리자 로그인 성공", "success")
        return redirect(url_for("admin.dashboard"))
    else:
        flash("관리자 사용자를 찾을 수 없습니다.", "danger")
        return "Admin user not found"


def admin_required(f):
    """관리자 권한 확인 데코레이터"""

    @wraps(f)
    @login_required
    def decorated_function(*args, **kwargs):
        if not current_user.is_admin:
            flash("관리자 권한이 필요합니다.", "danger")
            return redirect(url_for("main.index"))
        return f(*args, **kwargs)

    return decorated_function


# 모듈별 Blueprint 등록
from .dashboard import dashboard_bp
from .survey_management import survey_bp
from .safework_core import safework_bp
from .workers import workers_bp
from .health import health_bp
from .medications import medications_bp
from .msds import msds_bp

# 서브 Blueprint들을 메인 admin Blueprint에 등록
admin_bp.register_blueprint(dashboard_bp)
admin_bp.register_blueprint(survey_bp)
admin_bp.register_blueprint(safework_bp)
admin_bp.register_blueprint(workers_bp)
admin_bp.register_blueprint(health_bp)
admin_bp.register_blueprint(medications_bp)
admin_bp.register_blueprint(msds_bp)
