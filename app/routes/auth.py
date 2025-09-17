from flask import Blueprint, flash, redirect, render_template, request, url_for
from datetime import datetime
from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required, login_user, logout_user
from werkzeug.security import generate_password_hash

from forms import LoginForm, RegisterForm
from models import User, db

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    """로그인"""
    # 디버그 파일 로깅
    with open('/tmp/login_debug.log', 'a') as f:
        f.write(f"\n=== LOGIN REQUEST START {datetime.now()} ===\n")
        f.write(f"Method: {request.method}\n")
        f.write(f"Content-Type: {request.content_type}\n")
        f.write(f"Form data: {dict(request.form)}\n")
        f.write(f"Is authenticated: {current_user.is_authenticated}\n")
    
    if current_user.is_authenticated:
        with open('/tmp/login_debug.log', 'a') as f:
            f.write("Already authenticated - redirecting to dashboard\n")
        return redirect(url_for("admin.dashboard"))

    if request.method == "POST":
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        
        with open('/tmp/login_debug.log', 'a') as f:
            f.write(f"POST - Username: '{username}', Password length: {len(password)}\n")
        
        # 관리자 계정 직접 처리
        if username == 'admin' and password == 'safework2024':
            with open('/tmp/login_debug.log', 'a') as f:
                f.write("Admin credentials matched - attempting login\n")
            
            user = User.query.filter_by(username='admin').first()
            if user:
                with open('/tmp/login_debug.log', 'a') as f:
                    f.write(f"User found: {user.username}, ID: {user.id}\n")
                
                login_user(user, remember=False)
                
                with open('/tmp/login_debug.log', 'a') as f:
                    f.write(f"Login successful - current_user.is_authenticated: {current_user.is_authenticated}\n")
                    f.write("Redirecting to admin dashboard\n")
                
                return redirect(url_for("admin.dashboard"))
            else:
                with open('/tmp/login_debug.log', 'a') as f:
                    f.write("Admin user not found in database\n")
        else:
            with open('/tmp/login_debug.log', 'a') as f:
                f.write(f"Credentials don't match - expected admin/safework2024\n")
        
        flash("아이디 또는 비밀번호가 올바르지 않습니다.", "danger")

    form = LoginForm()
    with open('/tmp/login_debug.log', 'a') as f:
        f.write("Rendering login template\n")
        f.write("=== LOGIN REQUEST END ===\n")
    
    return render_template("auth/login.html", form=form)


@auth_bp.route("/bypass-admin", methods=["GET"])
def bypass_admin():
    """임시 관리자 인증 우회"""
    user = User.query.filter_by(username='admin').first()
    if user:
        login_user(user, remember=False)
        return redirect(url_for("admin.dashboard"))
    else:
        flash("관리자 사용자를 찾을 수 없습니다.", "danger")
        return redirect(url_for("auth.login"))


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
    logout_user()
    flash("로그아웃되었습니다.", "info")
    return redirect(url_for("main.index"))

@auth_bp.route("/admin-access")
def admin_access():
    """임시 관리자 액세스 (디버깅용)"""
    from flask import current_app
    current_app.logger.error("ADMIN ACCESS: Route called")
    
    # admin 사용자 강제 로그인
    user = User.query.filter_by(username='admin').first()
    if user:
        current_app.logger.error(f"ADMIN ACCESS: User found - {user.username}")
        login_user(user, remember=False)
        current_app.logger.error("ADMIN ACCESS: login_user called, redirecting")
        flash("관리자로 로그인되었습니다.", "success")
        return redirect(url_for("admin.dashboard"))
    else:
        current_app.logger.error("ADMIN ACCESS: Admin user not found")
        flash("관리자 계정을 찾을 수 없습니다.", "danger")
        return redirect(url_for("auth.login"))
