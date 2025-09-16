import os
from datetime import timedelta


class Config:
    """Base configuration"""

    SECRET_KEY = os.environ.get(
        "SECRET_KEY", 
        # WARNING: Change this in production! Use a strong random key
        "dev-only-key-CHANGE-IN-PRODUCTION-" + str(hash("safework"))[:16]
    )

    # Database (MySQL)
    DB_HOST = os.environ.get("DB_HOST", "safework-mysql")
    DB_PORT = int(os.environ.get("DB_PORT", 3306))
    DB_USER = os.environ.get("DB_USER", "safework")
    DB_PASSWORD = os.environ.get("DB_PASSWORD", "safework2024")
    DB_NAME = os.environ.get("DB_NAME", "safework_db")

    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 10,
        "pool_recycle": 3600,
        "pool_pre_ping": True,
        "client_encoding": "utf8",
    }

    # Redis
    REDIS_HOST = os.environ.get("REDIS_HOST", "safework-redis")
    REDIS_PORT = int(os.environ.get("REDIS_PORT", 6379))
    REDIS_PASSWORD = os.environ.get("REDIS_PASSWORD", "")
    REDIS_DB = int(os.environ.get("REDIS_DB", 0))

    # Session
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

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
            "note": "Version managed by GitHub Actions workflow only"
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
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "CHANGE_ME_ADMIN_PASSWORD")

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
    
    # CSRF 완전 비활성화 - 설문 테스트용 (환경변수에서 읽기)
    WTF_CSRF_ENABLED = os.environ.get("WTF_CSRF_ENABLED", "false").lower() == "true"
    WTF_CSRF_CHECK_DEFAULT = os.environ.get("WTF_CSRF_CHECK_DEFAULT", "false").lower() == "true"


class ProductionConfig(Config):
    """Production configuration"""

    DEBUG = False
    TESTING = False

    # Override with production values
    SECRET_KEY = os.environ.get("SECRET_KEY", "fallback-key-for-testing")
    # Validation moved to runtime instead of import time
    # if not SECRET_KEY:
    #     raise ValueError("SECRET_KEY must be set in production")
    
    # CSRF 완전 비활성화 - 설문 테스트용 (환경변수에서 읽기)
    WTF_CSRF_ENABLED = os.environ.get("WTF_CSRF_ENABLED", "false").lower() == "true"
    WTF_CSRF_CHECK_DEFAULT = os.environ.get("WTF_CSRF_CHECK_DEFAULT", "false").lower() == "true"


class TestingConfig(Config):
    """Testing configuration"""

    TESTING = True
    # Use MySQL for testing with environment variables or fallback
    DB_HOST = os.environ.get("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.environ.get("DB_PORT", 3306))
    DB_USER = os.environ.get("DB_USER", "safework_test")
    DB_PASSWORD = os.environ.get("DB_PASSWORD", "safework_test_password")
    DB_NAME = os.environ.get("DB_NAME", "safework_test")

    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    WTF_CSRF_ENABLED = False
    
    # MySQL connection options for testing
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
