"""
Dashboard Module
메인 대시보드 및 일반 관리 기능
"""
from flask import Blueprint, redirect, url_for
from utils.activity_tracker import track_page_view
from . import admin_required

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/dashboard")
@admin_required
def dashboard():
    """관리자 대시보드 - SafeWork 대시보드로 리다이렉트"""
    track_page_view("admin_dashboard")
    return redirect("/admin/safework")
