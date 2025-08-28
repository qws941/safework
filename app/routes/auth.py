from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required, login_user, logout_user
from werkzeug.security import generate_password_hash

from forms import LoginForm, RegisterForm
from models import User, db

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    """로그인"""
    if current_user.is_authenticated:
        return redirect(url_for("main.index"))

    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and user.check_password(form.password.data):
            login_user(user, remember=form.remember_me.data)
            next_page = request.args.get("next")
            if next_page:
                return redirect(next_page)
            return redirect(
                url_for("admin.dashboard" if user.is_admin else "survey.new")
            )
        else:
            flash("아이디 또는 비밀번호가 올바르지 않습니다.", "danger")

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
    logout_user()
    flash("로그아웃되었습니다.", "info")
    return redirect(url_for("main.index"))
