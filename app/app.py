import os
import time as time_module
from datetime import datetime, timezone, timedelta

import redis
import pytz
from flask import Flask, flash, redirect, render_template, request, url_for
from flask_login import (
    LoginManager,
    current_user,
    login_required,
    login_user,
    logout_user,
)
from flask_migrate import Migrate

# from flask_wtf.csrf import CSRFProtect  # DISABLED FOR SURVEY TESTING

from config import config
from migration_manager import MigrationManager
from models import AuditLog, Survey, SurveyStatistics, User, db


def create_app(config_name=None):
    """Application factory with robust connection retry logic"""
    app = Flask(__name__)

    # KST 시간대 설정 (Asia/Seoul)
    kst_timezone = pytz.timezone('Asia/Seoul')
    app.config['TIMEZONE'] = kst_timezone
    app.config['DEFAULT_TIMEZONE'] = kst_timezone
    
    # 시스템 시작 시간 저장 (KST)
    app.start_time = time_module.time()

    # Load configuration
    config_name = config_name or os.environ.get("FLASK_CONFIG", "production")
    app.config.from_object(config[config_name])

    # Fix APP_VERSION property object issue
    config_obj = config[config_name]()
    app.config["APP_VERSION"] = config_obj.APP_VERSION

    # CSRF 보호 완전 비활성화 - SURVEY TESTING
    app.config["WTF_CSRF_ENABLED"] = False
    app.config["WTF_CSRF_CHECK_DEFAULT"] = False
    app.config["WTF_CSRF_TIME_LIMIT"] = None
    app.config["SECRET_KEY_FALLBACK"] = app.config.get("SECRET_KEY", "fallback-key")

    # Flask-WTF CSRF 설정 강제 적용
    import flask_wtf

    if hasattr(flask_wtf, "CSRFProtect"):
        app.extensions = getattr(app, "extensions", {})
        app.extensions.pop("csrf", None)

    # Enhanced database connection with retry and transaction handling
    def init_database_with_retry():
        """데이터베이스 연결 재시도 로직 및 트랜잭션 안정성 강화"""
        max_retries = int(os.environ.get("DB_CONNECTION_RETRIES", 60))
        retry_delay = int(os.environ.get("DB_CONNECTION_DELAY", 3))

        # Initialize DB and migration only once, outside the retry loop
        db.init_app(app)
        migrate = Migrate(app, db)

        # Enhanced SQLAlchemy pool configuration for transaction stability
        app.config["SQLALCHEMY_ENGINE_OPTIONS"].update({
            "pool_size": int(os.environ.get("DB_POOL_SIZE", 20)),  # Increased from 10
            "max_overflow": int(os.environ.get("DB_MAX_OVERFLOW", 30)),  # Add overflow
            "pool_timeout": int(os.environ.get("DB_POOL_TIMEOUT", 30)),
            "pool_recycle": int(os.environ.get("DB_POOL_RECYCLE", 1800)),  # 30 min recycle
            "pool_pre_ping": True,  # Always enable pre-ping
            "connect_args": {
                "connect_timeout": 10,
                "application_name": "safework_app",
                "options": "-c default_transaction_isolation=read_committed"
            }
        })

        for attempt in range(max_retries):
            try:
                # Test connection with transaction handling
                with app.app_context():
                    connection = db.engine.connect()
                    # Test transaction capability
                    transaction = connection.begin()
                    try:
                        connection.execute(db.text("SELECT 1"))
                        transaction.commit()
                    except Exception as tx_error:
                        transaction.rollback()
                        app.logger.warning(f"Transaction test failed: {tx_error}")
                        raise
                    finally:
                        connection.close()

                    app.logger.info(
                        f"✅ Database connected with transaction support on attempt {attempt + 1}"
                    )
                    return True

            except Exception as e:
                if attempt < max_retries - 1:
                    app.logger.warning(
                        f"⚠️ Database connection attempt {attempt + 1} 오류: {e}"
                    )
                    app.logger.info(f"🔄 Retrying in {retry_delay} seconds...")
                    time_module.sleep(retry_delay)
                else:
                    app.logger.error(
                        f"❌ Database connection 오류 after {max_retries} attempts: {e}"
                    )
                    raise
        return False

    # Redis connection with retry logic
    def init_redis_with_retry():
        """Redis 연결 재시도 로직"""
        max_retries = int(os.environ.get("REDIS_CONNECTION_RETRIES", 10))
        retry_delay = int(os.environ.get("REDIS_CONNECTION_DELAY", 1))

        for attempt in range(max_retries):
            try:
                redis_client = redis.Redis(
                    host=app.config["REDIS_HOST"],
                    port=app.config["REDIS_PORT"],
                    password=app.config["REDIS_PASSWORD"],
                    db=app.config["REDIS_DB"],
                    decode_responses=True,
                    socket_connect_timeout=app.config.get(
                        "REDIS_SOCKET_CONNECT_TIMEOUT", 5
                    ),
                    socket_keepalive=app.config.get("REDIS_SOCKET_KEEPALIVE", True),
                    retry_on_timeout=True,
                    health_check_interval=30,
                )

                # Test connection
                redis_client.ping()
                app.redis = redis_client
                app.logger.info(
                    f"✅ Redis connected 상태정상 on attempt {attempt + 1}"
                )
                return True

            except Exception as e:
                if attempt < max_retries - 1:
                    app.logger.warning(
                        f"⚠️ Redis connection attempt {attempt + 1} 오류: {e}"
                    )
                    app.logger.info(f"🔄 Retrying in {retry_delay} seconds...")
                    time_module.sleep(retry_delay)
                else:
                    app.logger.error(
                        f"❌ Redis connection 오류 after {max_retries} attempts: {e}"
                    )
                    # Redis 실패는 치명적이지 않음 - 캐시 없이 동작
                    app.redis = None
                    app.logger.warning("⚠️ Redis unavailable - running without cache")
                    return False
        return False

    # 의존성 순서대로 초기화
    app.logger.info("🚀 SafeWork 초기화 시작...")

    # 1. Database 초기화 (최우선)
    app.logger.info("1️⃣ Database 연결 중...")
    init_database_with_retry()

    # 2. Redis 초기화 (선택적)
    app.logger.info("2️⃣ Redis 연결 중...")
    init_redis_with_retry()

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
        return db.session.get(User, int(user_id))

    # Add CSRF token to template context - DISABLED BUT PROVIDE EMPTY TOKEN FOR COMPATIBILITY
    @app.context_processor
    def inject_csrf_token():
        return dict(csrf_token=lambda: "")

    # Graceful connection check functions
    def check_database_health():
        """데이터베이스 헬스체크"""
        try:
            with app.app_context():
                db.engine.connect()
                return True
        except Exception as e:
            app.logger.error(f"Database health check 오류: {e}")
            return False

    def check_redis_health():
        """Redis 헬스체크"""
        try:
            if app.redis:
                app.redis.ping()
                return True
            return False
        except Exception as e:
            app.logger.error(f"Redis health check 오류: {e}")
            return False

    # Add health check functions to app
    app.check_database_health = check_database_health
    app.check_redis_health = check_redis_health

    # Register blueprints
    from routes.admin import admin_bp
    from routes.auth import auth_bp
    from routes.document import document_bp
    from routes.document_admin import document_admin_bp
    from routes.health import health_bp
    from routes.main import main_bp
    from routes.migration import migration_bp
    from routes.survey import survey_bp
    from routes.pdf_export import pdf_export_bp
    from routes.mobile_auth import mobile_auth_bp
    from routes.simple_ip import simple_ip_bp
    from routes.warning_sign import warning_sign_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(survey_bp, url_prefix="/survey")
    app.register_blueprint(admin_bp, url_prefix="/admin")
    app.register_blueprint(pdf_export_bp)
    app.register_blueprint(migration_bp, url_prefix="/admin")
    app.register_blueprint(mobile_auth_bp, url_prefix="/mobile")
    app.register_blueprint(simple_ip_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(document_bp, url_prefix="/documents")
    app.register_blueprint(document_admin_bp, url_prefix="/admin/documents")
    app.register_blueprint(warning_sign_bp, url_prefix="/warning-sign")

    # SafeWork API routes (v2.0)
    try:
        from routes.api_safework_v2 import api_safework_bp

        app.register_blueprint(api_safework_bp, url_prefix="/api/safework/v2")
        app.logger.info("✅ SafeWork API v2.0 loaded 상태정상")
    except ImportError as e:
        app.logger.warning(f"⚠️ SafeWork API v2.0 not loaded: {e}")

    # Enhanced error handlers with PostgreSQL transaction recovery
    @app.errorhandler(404)
    def not_found_error(error):
        return render_template("errors/404.html"), 404

    @app.errorhandler(500)
    def internal_error(error):
        """Enhanced 500 error handler with PostgreSQL transaction recovery"""
        try:
            # Check for PostgreSQL transaction errors
            error_msg = str(error) if error else ""
            if "InFailedSqlTransaction" in error_msg or "current transaction is aborted" in error_msg:
                app.logger.warning("PostgreSQL transaction error detected - performing recovery")
                # Force rollback and close connection
                try:
                    db.session.rollback()
                    db.session.close()
                    # Remove session to force new connection
                    db.session.remove()
                    app.logger.info("PostgreSQL transaction recovery completed")
                except Exception as recovery_error:
                    app.logger.error(f"Transaction recovery failed: {recovery_error}")
            else:
                # Standard rollback for other errors
                db.session.rollback()
        except Exception as rollback_error:
            app.logger.warning(f"Cannot rollback database session: {rollback_error}")

        return render_template("errors/500.html"), 500

    # Add database error handling middleware
    @app.before_request
    def handle_database_recovery():
        """Pre-request PostgreSQL connection health check"""
        try:
            # Check if we have a healthy database session
            if hasattr(db.session, 'is_active') and not db.session.is_active:
                db.session.close()
                db.session.remove()
        except Exception as e:
            app.logger.warning(f"Database health check warning: {e}")
            try:
                db.session.rollback()
                db.session.remove()
            except Exception:
                pass

    # 세션 중복 방지 검증 미들웨어
    @app.before_request
    def validate_session():
        """세션 중복 방지를 위한 검증"""
        from flask_login import current_user
        from flask import session as flask_session, request
        from utils.session_manager import session_manager

        # 로그인이 필요하지 않은 엔드포인트는 건너뛰기
        if request.endpoint in ['auth.login', 'auth.register', 'main.index', 'health.health', 'static']:
            return

        # 헬스체크 엔드포인트도 건너뛰기
        if request.path.startswith('/health') or request.path.startswith('/api/health'):
            return

        # 현재 사용자가 인증된 상태인지 확인
        if current_user.is_authenticated:
            safework_session_id = flask_session.get('safework_session_id')

            # SafeWork 세션 ID가 없거나 유효하지 않은 경우
            if not safework_session_id or not session_manager.validate_session(current_user.id, safework_session_id):
                app.logger.warning(f"Invalid session detected for user {current_user.id}, logging out")

                # 강제 로그아웃
                from flask_login import logout_user
                logout_user()
                flask_session.clear()

                from flask import flash, redirect, url_for
                flash("세션이 만료되었거나 다른 곳에서 로그인하여 자동 로그아웃되었습니다.", "warning")
                return redirect(url_for('auth.login'))

    # Enhanced health endpoint
    @app.route("/health/detailed")
    def detailed_health():
        """상세 헬스체크 엔드포인트"""
        health_status = {
            "service": "safework",
            "status": "healthy",
            "timestamp": datetime.now(app.config['TIMEZONE']).isoformat(),
            "components": {
                "database": check_database_health(),
                "redis": check_redis_health(),
                "application": True,
            },
        }

        # 하나라도 실패하면 전체 상태를 unhealthy로 변경
        if not all(
            [
                health_status["components"]["database"],
                health_status["components"]["application"],
            ]
        ):
            health_status["status"] = "unhealthy"

        return health_status, 200 if health_status["status"] == "healthy" else 503

    # Context processors
    @app.context_processor
    def inject_config():
        config_obj = app.config
        kst_timezone = app.config['TIMEZONE']

        # URL 정보 추가
        url_info = {
            "current_url": config_obj.get("DEV_URL")
            if config_obj.get("FLASK_CONFIG") == "development"
            else config_obj.get("PRD_URL")
            if config_obj.get("FLASK_CONFIG") == "production"
            else config_obj.get("LOCAL_URL", "http://localhost:4545"),
            "dev_url": config_obj.get("DEV_URL", "https://safework-dev.jclee.me"),
            "prd_url": config_obj.get("PRD_URL", "https://safework.jclee.me"),
            "local_url": config_obj.get("LOCAL_URL", "http://localhost:4545"),
            "environment": config_obj.get("FLASK_CONFIG", "development"),
        }

        # 워크플로우에서 생성된 Git 태그 기반 버전 표시
        try:
            import subprocess

            result = subprocess.run(
                ["git", "describe", "--tags", "--exact-match"],
                capture_output=True,
                text=True,
                timeout=2,
            )

            if result.returncode == 0:
                app_version = result.stdout.strip()
                version_info = {
                    "version": app_version,
                    "source": "workflow-tag",
                    "note": "Version from GitHub Actions workflow tag",
                }
            else:
                result = subprocess.run(
                    ["git", "rev-parse", "--short", "HEAD"],
                    capture_output=True,
                    text=True,
                    timeout=2,
                )
                if result.returncode == 0:
                    timestamp = datetime.now(kst_timezone).strftime("%Y%m%d-%H%M")
                    app_version = f"v3.0.{timestamp}-{result.stdout.strip()}"
                    version_info = {
                        "version": app_version,
                        "source": "git-sha",
                        "note": "Temporary version from Git SHA",
                    }
                else:
                    raise Exception("Git command 오류")
        except Exception:
            app_version = "3.0.0"
            version_info = {
                "version": app_version,
                "source": "config-fallback",
                "note": "Fallback static version",
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
            "version_info": version_info,
            "system_uptime": uptime_str,
            "start_time": datetime.fromtimestamp(
                app.start_time, tz=kst_timezone
            ).strftime("%Y-%m-%d %H:%M:%S KST"),
            "url_info": url_info,
        }

    # Audit logging with error handling
    @app.before_request
    def log_request():
        if current_user.is_authenticated:
            if request.endpoint and "admin" in request.endpoint:
                # 임시로 감사 로그 비활성화 - 프로덕션 스키마 호환성 문제
                pass

    app.logger.info("✅ SafeWork 초기화 완료!")
    return app


# Create application instance for gunicorn
app = create_app()

if __name__ == "__main__":
    # Run directly in development - use APP_PORT environment variable
    port = int(os.environ.get("APP_PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
