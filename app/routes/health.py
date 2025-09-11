"""Health check endpoint"""

import os
from datetime import datetime, timezone, timedelta
from flask import Blueprint, current_app, jsonify
import redis
from sqlalchemy import text

# KST timezone
KST = timezone(timedelta(hours=9))

health_bp = Blueprint("health", __name__)


@health_bp.route("/health")
def health_check():
    """Health check endpoint for Docker with environment info and service connectivity"""
    
    # 현재 환경 정보
    flask_config = os.environ.get("FLASK_CONFIG", "development")
    
    # URL 정보
    if flask_config == "production":
        current_url = current_app.config.get('PRD_URL', 'https://safework.jclee.me')
        environment = "production"
    elif flask_config == "development":
        current_url = current_app.config.get('DEV_URL', 'https://safework-dev.jclee.me')
        environment = "development"
    else:
        current_url = current_app.config.get('LOCAL_URL', 'http://localhost:4545')
        environment = "local"
    
    # 서비스 연결 상태 체크 (독립 컨테이너 실행을 위한 체크)
    services_status = {
        "database": "unknown",
        "redis": "unknown"
    }
    
    # Database 연결 체크
    try:
        from app import db
        with db.engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        services_status["database"] = "connected"
    except Exception as e:
        services_status["database"] = f"error: {str(e)[:50]}"
        current_app.logger.error(f"Database health check failed: {e}")
    
    # Redis 연결 체크
    try:
        redis_host = os.environ.get("REDIS_HOST", "safework-redis")
        redis_port = int(os.environ.get("REDIS_PORT", 6379))
        redis_password = os.environ.get("REDIS_PASSWORD", None)
        
        r = redis.Redis(
            host=redis_host, 
            port=redis_port, 
            password=redis_password if redis_password else None,
            decode_responses=True,
            socket_connect_timeout=3
        )
        r.ping()
        services_status["redis"] = "connected"
    except Exception as e:
        services_status["redis"] = f"error: {str(e)[:50]}"
        current_app.logger.error(f"Redis health check failed: {e}")
    
    # 전체 상태 평가
    overall_status = "healthy"
    if "error:" in services_status["database"] or "error:" in services_status["redis"]:
        overall_status = "degraded"
    
    return jsonify({
        "status": overall_status, 
        "service": "safework",
        "timestamp": datetime.now(KST).isoformat(),
        "environment": environment,
        "current_url": current_url,
        "config": flask_config,
        "version": current_app.config.get('APP_VERSION', '3.0.0'),
        "services": services_status,
        "independent_deployment": {
            "postgres_container": services_status["database"] == "connected",
            "redis_container": services_status["redis"] == "connected", 
            "app_container": True,
            "watchtower_enabled": True
        }
    }), 200
