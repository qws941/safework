import os
from datetime import datetime

from flask import Blueprint, current_app, render_template, send_file
from flask_login import current_user

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def index():
    """메인 페이지"""
    return render_template("index.html")


@main_bp.route("/about")
def about():
    """서비스 소개"""
    return render_template("about.html")


@main_bp.route("/health")
def health():
    """헬스체크 엔드포인트"""
    return {
        "status": "healthy", 
        "service": "safework",
        "timestamp": datetime.utcnow().isoformat()
    }, 200
