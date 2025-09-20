import os
import os
from datetime import timedelta


class Config:
    """Base configuration"""

    SECRET_KEY = os.environ.get(
        "SECRET_KEY",
        # WARNING: Change this in production! Use a strong random key
        "dev-only-key-CHANGE-IN-PRODUCTION-" + str(hash("safework"))[:16],
    )

    # Database (PostgreSQL) - Enhanced with environment variable support
    DB_HOST = os.environ.get("DB_HOST", "safework-postgres")
    DB_PORT = int(os.environ.get("DB_PORT", 5432))
    DB_USER = os.environ.get("DB_USER", "safework")
    DB_PASSWORD = os.environ.get("DB_PASSWORD")  # No default - must be set
    DB_NAME = os.environ.get("DB_NAME", "safework_db")

    # Database pool settings from environment
    DB_POOL_SIZE = int(os.environ.get("DB_POOL_SIZE", 10))
    DB_POOL_TIMEOUT = int(os.environ.get("DB_POOL_TIMEOUT", 30))
    DB_POOL_RECYCLE = int(os.environ.get("DB_POOL_RECYCLE", 3600))
    DB_POOL_PRE_PING = os.environ.get("DB_POOL_PRE_PING", "true").lower() == "true"
    DB_ECHO = os.environ.get("DB_ECHO", "false").lower() == "true"

    SQLALCHEMY_DATABASE_URI = (
        f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": DB_POOL_SIZE,
        "pool_recycle": DB_POOL_RECYCLE,
        "pool_pre_ping": DB_POOL_PRE_PING,
        "pool_timeout": DB_POOL_TIMEOUT,
        "echo": DB_ECHO,
    }

    # Redis - Enhanced with environment variable support
    REDIS_HOST = os.environ.get("REDIS_HOST", "safework-redis")
    REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))
    REDIS_PASSWORD = os.environ.get("REDIS_PASSWORD", "")
    REDIS_DB = int(os.environ.get("REDIS_DB", 0))
    REDIS_TIMEOUT = int(os.environ.get("REDIS_TIMEOUT", 10))
    REDIS_SOCKET_CONNECT_TIMEOUT = int(
        os.environ.get("REDIS_SOCKET_CONNECT_TIMEOUT", 5)
    )
    REDIS_SOCKET_KEEPALIVE = (
        os.environ.get("REDIS_SOCKET_KEEPALIVE", "true").lower() == "true"
    )

    # Session - Enhanced with environment variable support
    PERMANENT_SESSION_LIFETIME = timedelta(
        seconds=int(os.environ.get("PERMANENT_SESSION_LIFETIME", 86400))
    )
    SESSION_COOKIE_SECURE = (
        os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true"
    )
    SESSION_COOKIE_HTTPONLY = (
        os.environ.get("SESSION_COOKIE_HTTPONLY", "true").lower() == "true"
    )
    SESSION_COOKIE_SAMESITE = os.environ.get("SESSION_COOKIE_SAMESITE", "Lax")

    # File upload
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB
    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", "/app/uploads")
    ALLOWED_EXTENSIONS = {"pdf", "xlsx", "xls", "csv"}

    # Application
    APP_NAME = "SafeWork 안전보건 관리시스템"
    ITEMS_PER_PAGE = 20

    # Environment URLs
    DEV_URL = os.environ.get("DEV_URL", "https://safework-dev.jclee.me")
    PRD_URL = os.environ.get("PRD_URL", "https://safework.jclee.me")
    LOCAL_URL = os.environ.get("LOCAL_URL", "http://localhost:4545")

    # Simple version (managed by workflow only)
    @property
    def APP_VERSION(self):
        """단순 버전 표시 (워크플로우에서만 관리)"""
        return "3.0.0"

    @property
    def APP_VERSION_INFO(self):
        """단순 버전 정보"""
        return {
            "version": self.APP_VERSION,
            "source": "static",
            "note": "Version managed by GitHub Actions workflow only",
        }

    def get_current_url(self):
        """현재 환경에 맞는 URL 반환"""
        env = os.environ.get("FLASK_CONFIG", "development")
        if env == "production":
            return self.PRD_URL
        elif env == "development":
            return self.DEV_URL
        else:
            return self.LOCAL_URL

    def get_health_check_url(self):
        """헬스체크 URL 반환"""
        return f"{self.get_current_url()}/health"

    def get_api_base_url(self):
        """API 베이스 URL 반환"""
        return f"{self.get_current_url()}/api/safework/v2"

    # Admin
    ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")  # No default - must be set

    # PDF Form
    PDF_TEMPLATE_PATH = "/app/forms/근골격계_증상조사표.pdf"

    # Email (optional)
    MAIL_SERVER = os.environ.get("MAIL_SERVER", "")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", 587))
    MAIL_USE_TLS = os.environ.get("MAIL_USE_TLS", "true").lower() == "true"
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD", "")


class DevelopmentConfig(Config):
    """Development configuration"""

    DEBUG = True
    TESTING = False

    # Use PostgreSQL for development with environment variables
    DB_HOST = os.environ.get("DB_HOST", "safework-postgres")
    DB_PORT = int(os.environ.get("DB_PORT", 5432))
    DB_USER = os.environ.get("DB_USER", "safework")
    DB_PASSWORD = os.environ.get("DB_PASSWORD")  # No default - must be set
    DB_NAME = os.environ.get("DB_NAME", "safework_db")

    SQLALCHEMY_DATABASE_URI = (
        f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    # Inherit SQLALCHEMY_ENGINE_OPTIONS from base Config class
    # This includes DB_POOL_SIZE and other pool settings

    # CSRF 완전 비활성화 - 설문 테스트용 (환경변수에서 읽기)
    WTF_CSRF_ENABLED = os.environ.get("WTF_CSRF_ENABLED", "false").lower() == "true"
    WTF_CSRF_CHECK_DEFAULT = (
        os.environ.get("WTF_CSRF_CHECK_DEFAULT", "false").lower() == "true"
    )


class ProductionConfig(Config):
    """Production configuration"""

    DEBUG = False
    TESTING = False

    # Use PostgreSQL for production with environment variables
    DB_HOST = os.environ.get("DB_HOST", "safework-postgres")
    DB_PORT = int(os.environ.get("DB_PORT", 5432))
    DB_USER = os.environ.get("DB_USER", "safework")
    DB_PASSWORD = os.environ.get("DB_PASSWORD")  # No default - must be set
    DB_NAME = os.environ.get("DB_NAME", "safework_db")

    SQLALCHEMY_DATABASE_URI = (
        f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    # Inherit SQLALCHEMY_ENGINE_OPTIONS from base Config class
    # This includes DB_POOL_SIZE and other pool settings

    # Override with production values
    SECRET_KEY = os.environ.get("SECRET_KEY", "fallback-key-for-testing")
    # Validation moved to runtime instead of import time
    # if not SECRET_KEY:
    #     raise ValueError("SECRET_KEY must be set in production")

    # CSRF 완전 비활성화 - 설문 테스트용 (환경변수에서 읽기)
    WTF_CSRF_ENABLED = os.environ.get("WTF_CSRF_ENABLED", "false").lower() == "true"
    WTF_CSRF_CHECK_DEFAULT = (
        os.environ.get("WTF_CSRF_CHECK_DEFAULT", "false").lower() == "true"
    )


class TestingConfig(Config):
    """Testing configuration"""

    TESTING = True
    # Use PostgreSQL for testing with environment variables or fallback
    DB_HOST = os.environ.get("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.environ.get("DB_PORT", 5432))
    DB_USER = os.environ.get("DB_USER", "safework_test")
    DB_PASSWORD = os.environ.get("DB_PASSWORD", "safework_test_password")
    DB_NAME = os.environ.get("DB_NAME", "safework_test")

    SQLALCHEMY_DATABASE_URI = (
        f"postgresql+psycopg2://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    WTF_CSRF_ENABLED = False

    # PostgreSQL connection options for testing
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 5,
        "pool_recycle": 1800,
        "pool_pre_ping": True,
    }


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}
