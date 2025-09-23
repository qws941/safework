import os
from flask import Blueprint, flash, redirect, render_template, request, url_for
from datetime import datetime
from flask_login import current_user, login_required, login_user, logout_user
from werkzeug.security import generate_password_hash

from forms import LoginForm, RegisterForm
from models import User, db, kst_now
from utils.activity_tracker import track_login_attempt, track_logout, track_page_view

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    """로그인"""
    if current_user.is_authenticated:
        return redirect("/admin/safework")

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        # 관리자 계정 환경변수 처리
        admin_username = os.environ.get("ADMIN_USERNAME", "admin")
        admin_password = os.environ.get("ADMIN_PASSWORD", "safework2024")

        if username == admin_username and password == admin_password:
            user = User.query.filter_by(username=admin_username).first()
            if user:
                # Update last login time
                user.last_login = kst_now()
                db.session.commit()
                
                login_user(user, remember=False)

                # 로그인 성공 추적
                track_login_attempt(username, success=True)

                return redirect("/admin/safework")

        # 로그인 실패 추적
        track_login_attempt(username, success=False)

        flash("아이디 또는 비밀번호가 올바르지 않습니다.", "danger")

    form = LoginForm()

    # GET 요청시 페이지 조회 추적
    if request.method == "GET":
        track_page_view("admin_login")

    return render_template("auth/login.html", form=form)


@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    """회원가입"""
    if current_user.is_authenticated:
        return redirect(url_for("main.index"))

    form = RegisterForm()
    if form.validate_on_submit():
        # 사용자명 중복 체크
        existing_user = User.query.filter_by(username=form.username.data).first()
        if existing_user:
            flash("이미 사용중인 아이디입니다.", "danger")
            return render_template("auth/register.html", form=form)

        # 이메일 중복 체크
        existing_email = User.query.filter_by(email=form.email.data).first()
        if existing_email:
            flash("이미 등록된 이메일입니다.", "danger")
            return render_template("auth/register.html", form=form)

        # 새 사용자 생성
        user = User(username=form.username.data, email=form.email.data)
        user.set_password(form.password.data)

        db.session.add(user)
        db.session.commit()

        flash("회원가입이 완료되었습니다. 로그인해주세요.", "success")
        return redirect(url_for("auth.login"))

    return render_template("auth/register.html", form=form)


@auth_bp.route("/logout")
@login_required
def logout():
    """로그아웃"""
    # 로그아웃 추적
    track_logout()

    logout_user()
    flash("로그아웃되었습니다.", "info")
    return redirect(url_for("main.index"))



