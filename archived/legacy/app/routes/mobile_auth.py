from flask import Blueprint, flash, redirect, render_template, request, url_for, jsonify, session
from datetime import datetime, timedelta
from flask_login import login_user, logout_user, current_user
import secrets
# import qrcode  # Temporarily disabled for deployment
import io
import base64
import os
from werkzeug.security import generate_password_hash

from models import User, db, kst_now
from utils.session_manager import session_manager

mobile_auth_bp = Blueprint("mobile_auth", __name__)

# 임시 토큰 저장소 (프로덕션에서는 Redis 사용 권장)
mobile_tokens = {}

@mobile_auth_bp.route("/mobile/generate-token", methods=["POST"])
def generate_mobile_token():
    """모바일 접근용 임시 토큰 생성"""
    if not current_user.is_authenticated:
        return jsonify({"error": "인증이 필요합니다"}), 401
    
    # 6자리 숫자 토큰 생성
    token = secrets.token_urlsafe(8)[:8].upper()
    expires_at = datetime.now() + timedelta(minutes=30)  # 30분 유효
    
    mobile_tokens[token] = {
        "user_id": current_user.id,
        "expires_at": expires_at,
        "created_at": datetime.now()
    }
    
    # QR 코드 생성 (temporarily disabled)
    mobile_url = f"https://safework.jclee.me/mobile/auth?token={token}"
    # qr = qrcode.QRCode(version=1, box_size=10, border=5)
    # qr.add_data(mobile_url)
    # qr.make(fit=True)
    #
    # img = qr.make_image(fill_color="black", back_color="white")
    # img_io = io.BytesIO()
    # img.save(img_io, 'PNG')
    # img_io.seek(0)
    # img_b64 = base64.b64encode(img_io.getvalue()).decode()
    img_b64 = ""  # Temporary placeholder
    
    return jsonify({
        "token": token,
        "expires_at": expires_at.isoformat(),
        "mobile_url": mobile_url,
        "qr_code": f"data:image/png;base64,{img_b64}"
    })

@mobile_auth_bp.route("/mobile/auth", methods=["GET", "POST"])
def mobile_auth():
    """모바일 토큰 기반 인증"""
    token = request.args.get("token") or request.form.get("token")
    
    if not token:
        return render_template("mobile_auth/token_form.html")
    
    # 토큰 검증
    token_data = mobile_tokens.get(token)
    if not token_data:
        flash("유효하지 않은 토큰입니다.", "danger")
        return render_template("mobile_auth/token_form.html")
    
    # 만료 확인
    if datetime.now() > token_data["expires_at"]:
        del mobile_tokens[token]
        flash("토큰이 만료되었습니다.", "danger")
        return render_template("mobile_auth/token_form.html")
    
    # 사용자 로그인
    user = User.query.get(token_data["user_id"])
    if user:
        # 기존 세션 중복 체크 및 제거
        active_sessions = session_manager.get_user_active_sessions(user.id)
        if active_sessions:
            revoked_count = session_manager.revoke_user_sessions(user.id)
            if revoked_count > 0:
                flash(f"기존 로그인 세션 {revoked_count}개가 종료되었습니다.", "warning")

        # 새 세션 생성
        new_session_id = session_manager.create_user_session(user.id, force_single=True)

        # Flask-Login 세션 시작
        login_user(user, remember=False)

        # 세션에 SafeWork 세션 ID 저장
        if new_session_id:
            session['safework_session_id'] = new_session_id

        # 토큰 삭제 (일회용)
        del mobile_tokens[token]

        flash("모바일 인증 성공!", "success")
        return redirect("/admin/safework")
    
    flash("사용자를 찾을 수 없습니다.", "danger")
    return render_template("mobile_auth/token_form.html")

@mobile_auth_bp.route("/mobile/quick-pin", methods=["GET", "POST"])
def quick_pin():
    """빠른 PIN 코드 인증 (4자리)"""
    if request.method == "POST":
        pin = request.form.get("pin")
        
        # 환경변수나 설정에서 PIN 확인
        import os
        admin_pin = os.environ.get("ADMIN_MOBILE_PIN", "1234")
        
        if pin == admin_pin:
            # 관리자 계정으로 로그인
            admin_username = os.environ.get("ADMIN_USERNAME", "admin")
            user = User.query.filter_by(username=admin_username).first()
            
            if user:
                # 기존 세션 중복 체크 및 제거
                active_sessions = session_manager.get_user_active_sessions(user.id)
                if active_sessions:
                    revoked_count = session_manager.revoke_user_sessions(user.id)
                    if revoked_count > 0:
                        flash(f"기존 로그인 세션 {revoked_count}개가 종료되었습니다.", "warning")

                # 새 세션 생성
                new_session_id = session_manager.create_user_session(user.id, force_single=True)

                # Flask-Login 세션 시작
                login_user(user, remember=False)

                # 세션에 SafeWork 세션 ID 저장
                if new_session_id:
                    session['safework_session_id'] = new_session_id

                user.last_login = kst_now()
                db.session.commit()

                flash("PIN 인증 성공!", "success")
                return redirect("/admin/safework")
        
        flash("잘못된 PIN입니다.", "danger")
    
    return render_template("mobile_auth/pin_form.html")

@mobile_auth_bp.route("/mobile/status")
def mobile_status():
    """모바일 인증 상태 확인"""
    active_tokens = []
    now = datetime.now()
    
    # 만료된 토큰 정리
    expired_tokens = [token for token, data in mobile_tokens.items() 
                     if now > data["expires_at"]]
    for token in expired_tokens:
        del mobile_tokens[token]
    
    # 활성 토큰 정보
    for token, data in mobile_tokens.items():
        active_tokens.append({
            "token": token[:4] + "****",  # 일부만 표시
            "expires_in": int((data["expires_at"] - now).total_seconds() / 60),
            "created_at": data["created_at"].strftime("%H:%M:%S")
        })
    
    return jsonify({
        "active_tokens": len(mobile_tokens),
        "tokens": active_tokens
    })