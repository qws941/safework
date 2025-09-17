import os
import time as time_module
from datetime import datetime, timezone, timedelta

import redis
from flask import Flask, flash, redirect, render_template, request, url_for
from flask_login import LoginManager, current_user, login_required, login_user, logout_user
from flask_migrate import Migrate
# from flask_wtf.csrf import CSRFProtect  # DISABLED FOR SURVEY TESTING

from config import config
from migration_manager import MigrationManager
from models import AuditLog, Survey, SurveyStatistics, User, db


def create_app(config_name=None):
    """Application factory - Fixed Portainer API deployment"""
    app = Flask(__name__)

    # 시스템 시작 시간 저장
    app.start_time = time_module.time()

    # Load configuration
    config_name = config_name or os.environ.get("FLASK_CONFIG", "production")
    app.config.from_object(config[config_name])

    # Fix APP_VERSION property object issue
    config_obj = config[config_name]()
    app.config['APP_VERSION'] = config_obj.APP_VERSION

    # CSRF 보호 완전 비활성화 - SURVEY TESTING (config 로드 후 강제 적용)
    # 환경변수와 상관없이 무조건 CSRF 비활성화
    app.config['WTF_CSRF_ENABLED'] = False
    app.config['WTF_CSRF_CHECK_DEFAULT'] = False
    app.config['WTF_CSRF_TIME_LIMIT'] = None
    app.config['SECRET_KEY_FALLBACK'] = app.config.get('SECRET_KEY', 'fallback-key')
    
    # Flask-WTF CSRF 설정 강제 적용
    import flask_wtf
    if hasattr(flask_wtf, 'CSRFProtect'):
        app.extensions = getattr(app, 'extensions', {})
        app.extensions.pop('csrf', None)  # 기존 CSRF 확장 제거

    # Initialize extensions
    db.init_app(app)
    migrate = Migrate(app, db)

    # Initialize CSRF Protection - TEMPORARILY DISABLED FOR SURVEY TESTING
    # csrf = CSRFProtect(app)
    
    # Add CSRF token to template context - DISABLED BUT PROVIDE EMPTY TOKEN FOR COMPATIBILITY
    @app.context_processor
    def inject_csrf_token():
        # CSRF는 비활성화되었지만 템플릿 호환성을 위해 빈 함수 제공
        return dict(csrf_token=lambda: "")

    # Initialize migration manager
    migration_manager = MigrationManager(app)
    app.migration_manager = migration_manager

    # Initialize Login Manager
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"
    login_manager.login_message = "이 페이지에 접근하려면 로그인이 필요합니다."

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Initialize Redis
    redis_client = redis.Redis(
        host=app.config["REDIS_HOST"],
        port=app.config["REDIS_PORT"],
        password=app.config["REDIS_PASSWORD"],
        db=app.config["REDIS_DB"],
        decode_responses=True,
    )
    app.redis = redis_client

    # Register blueprints
    from routes.admin import admin_bp
    from routes.auth import auth_bp
    from routes.document import document_bp
    from routes.document_admin import document_admin_bp
    from routes.health import health_bp
    from routes.main import main_bp
    from routes.migration import migration_bp
    from routes.monitoring import monitoring_bp
    from routes.survey import survey_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(survey_bp, url_prefix="/survey")
    app.register_blueprint(admin_bp, url_prefix="/admin")
    app.register_blueprint(migration_bp, url_prefix="/admin")
    app.register_blueprint(health_bp)
    app.register_blueprint(document_bp, url_prefix="/documents")
    app.register_blueprint(document_admin_bp, url_prefix="/admin/documents")
    app.register_blueprint(monitoring_bp, url_prefix="/admin")
    
    # CSRF 특정 경로 면제 설정 - TEMPORARILY DISABLED
    # from routes.survey import musculoskeletal_symptom_survey
    # csrf.exempt(musculoskeletal_symptom_survey)

    # SafeWork API routes (v2.0)
    try:
        from routes.api_safework_v2 import api_safework_bp

        app.register_blueprint(api_safework_bp, url_prefix="/api/safework")
        app.logger.info("SafeWork API v2.0 loaded successfully")
    except ImportError as e:
        app.logger.warning(f"SafeWork API v2.0 not loaded: {e}")

    # Database initialization moved to start.sh script for better container startup handling
    # The database connection check and user creation is now handled in start.sh
    # This prevents Flask app creation from failing during container initialization

    # Error handlers
    @app.errorhandler(404)
    def not_found_error(error):
        return render_template("errors/404.html"), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return render_template("errors/500.html"), 500

    # Context processors
    @app.context_processor
    def inject_config():
        config_obj = app.config
        
        # URL 정보 추가
        url_info = {
            "current_url": config_obj.get('DEV_URL') if config_obj.get('FLASK_CONFIG') == 'development' else 
                          config_obj.get('PRD_URL') if config_obj.get('FLASK_CONFIG') == 'production' else 
                          config_obj.get('LOCAL_URL', 'http://localhost:4545'),
            "dev_url": config_obj.get('DEV_URL', 'https://safework-dev.jclee.me'),
            "prd_url": config_obj.get('PRD_URL', 'https://safework.jclee.me'),
            "local_url": config_obj.get('LOCAL_URL', 'http://localhost:4545'),
            "environment": config_obj.get('FLASK_CONFIG', 'development')
        }
        
        # 워크플로우에서 생성된 Git 태그 기반 버전 표시
        try:
            import subprocess
            # 워크플로우에서 생성한 최신 태그 조회
            result = subprocess.run([
                "git", "describe", "--tags", "--exact-match"
            ], capture_output=True, text=True, timeout=2)
            
            if result.returncode == 0:
                app_version = result.stdout.strip()
                version_info = {
                    "version": app_version,
                    "source": "workflow-tag",
                    "note": "Version from GitHub Actions workflow tag"
                }
            else:
                # 태그가 없으면 현재 커밋의 Git SHA로 임시 버전 생성
                result = subprocess.run([
                    "git", "rev-parse", "--short", "HEAD"
                ], capture_output=True, text=True, timeout=2)
                if result.returncode == 0:
                    timestamp = datetime.now().strftime('%Y%m%d-%H%M')
                    app_version = f"v3.0.{timestamp}-{result.stdout.strip()}"
                    version_info = {
                        "version": app_version,
                        "source": "git-sha",
                        "note": "Temporary version from Git SHA (waiting for workflow tag)"
                    }
                else:
                    raise Exception("Git command failed")
        except Exception:
            # Git 명령 실패시 fallback - property object 문제 해결
            app_version = "3.0.0"  # 직접 하드코딩
            version_info = {
                "version": app_version,
                "source": "config-fallback",
                "note": "Fallback static version"
            }

        # 시스템 업타임 계산
        uptime_seconds = time_module.time() - app.start_time
        uptime_days = int(uptime_seconds // 86400)
        uptime_hours = int((uptime_seconds % 86400) // 3600)
        uptime_minutes = int((uptime_seconds % 3600) // 60)

        if uptime_days > 0:
            uptime_str = f"{uptime_days}일 {uptime_hours}시간 {uptime_minutes}분"
        elif uptime_hours > 0:
            uptime_str = f"{uptime_hours}시간 {uptime_minutes}분"
        else:
            uptime_str = f"{uptime_minutes}분"

        return {
            "app_name": app.config["APP_NAME"],
            "app_version": app_version,
            "version_info": version_info,  # Enhanced version info
            "system_uptime": uptime_str,
            "start_time": datetime.fromtimestamp(
                app.start_time, tz=timezone(timedelta(hours=9))
            ).strftime("%Y-%m-%d %H:%M:%S KST"),
            # URL 정보 템플릿에서 사용 가능
            "url_info": url_info,
        }

    # Audit logging
    @app.before_request
    def log_request():
        if current_user.is_authenticated:
            # Log important actions
            if request.endpoint and "admin" in request.endpoint:
                # 임시로 감사 로그 비활성화 - 프로덕션 스키마 호환성 문제로 인함
                pass
                # log = AuditLog(
                #     user_id=current_user.id,
                #     action="page_access",
                #     details={"endpoint": request.endpoint, "method": request.method},
                # )
                # db.session.add(log)
                # db.session.commit()

    return app


# Create application instance for gunicorn
app = create_app()

if __name__ == "__main__":
    # Run directly in development - use APP_PORT environment variable
    port = int(os.environ.get('APP_PORT', 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
