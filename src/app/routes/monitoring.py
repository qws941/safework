"""
SafeWork 실시간 모니터링 대시보드
- 컨테이너 상태 모니터링
- 로그 실시간 조회
- 성능 메트릭 표시
- 알림 관리
"""

import os
import json
import requests
from datetime import datetime, timedelta
from flask import Blueprint, render_template, jsonify, request, flash
from flask_login import login_required
import redis

from app import db
from models import AuditLog

monitoring_bp = Blueprint("monitoring", __name__, url_prefix="/admin/monitoring")

# Portainer API 설정
PORTAINER_URL = os.environ.get("PORTAINER_URL", "https://portainer.jclee.me")
PORTAINER_API_KEY = os.environ.get(
    "PORTAINER_API_KEY", "ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
)
ENDPOINT_ID = os.environ.get("PORTAINER_ENDPOINT_ID", "3")

# Redis 연결
try:
    redis_client = redis.Redis(
        host=os.environ.get("REDIS_HOST", "safework-redis"),
        port=int(os.environ.get("REDIS_PORT", 6379)),
        decode_responses=True,
    )
except:
    redis_client = None


def get_portainer_headers():
    """Portainer API 헤더"""
    return {"X-API-Key": PORTAINER_API_KEY, "Content-Type": "application/json"}


def get_safework_containers():
    """SafeWork 컨테이너 목록 조회"""
    try:
        url = f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/docker/containers/json"
        response = requests.get(url, headers=get_portainer_headers(), timeout=10)
        response.raise_for_status()

        containers = response.json()
        safework_containers = []

        for container in containers:
            container_names = container.get("Names", [])
            if any("safework" in name for name in container_names):
                safework_containers.append(
                    {
                        "id": container["Id"][:12],
                        "name": container_names[0].lstrip("/"),
                        "state": container["State"],
                        "status": container["Status"],
                        "image": container["Image"],
                        "created": container["Created"],
                        "ports": container.get("Ports", []),
                    }
                )

        return safework_containers
    except Exception as e:
        print(f"Error fetching containers: {e}")
        return []


def get_container_logs(container_id, lines=50):
    """컨테이너 로그 조회"""
    try:
        url = f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/docker/containers/{container_id}/logs"
        params = {
            "stdout": "true",
            "stderr": "true",
            "timestamps": "true",
            "tail": str(lines),
        }

        response = requests.get(
            url, headers=get_portainer_headers(), params=params, timeout=15
        )
        response.raise_for_status()

        logs = response.text.split("\n") if response.text else []
        return [line for line in logs if line.strip()]
    except Exception as e:
        print(f"Error fetching logs for {container_id}: {e}")
        return []


def get_system_health():
    """시스템 전체 건강도 확인"""
    health_data = {
        "timestamp": datetime.now().isoformat(),
        "overall_status": "healthy",
        "components": {},
    }

    try:
        # 애플리케이션 헬스 체크
        app_response = requests.get("https://safework.jclee.me/health", timeout=10)
        if app_response.status_code == 200:
            app_health = app_response.json()
            health_data["components"]["application"] = {
                "status": "healthy",
                "response_time": app_response.elapsed.total_seconds(),
                "details": app_health,
            }
        else:
            health_data["components"]["application"] = {
                "status": "unhealthy",
                "error": f"HTTP {app_response.status_code}",
            }
            health_data["overall_status"] = "unhealthy"
    except Exception as e:
        health_data["components"]["application"] = {
            "status": "unhealthy",
            "error": str(e),
        }
        health_data["overall_status"] = "unhealthy"

    # 컨테이너 상태
    containers = get_safework_containers()
    running_containers = sum(1 for c in containers if c["state"] == "running")
    total_containers = len(containers)

    health_data["components"]["containers"] = {
        "status": "healthy" if running_containers == total_containers else "degraded",
        "running": running_containers,
        "total": total_containers,
        "details": containers,
    }

    if running_containers < total_containers:
        health_data["overall_status"] = "degraded"

    # Redis 상태 확인
    try:
        if redis_client and redis_client.ping():
            redis_info = redis_client.info()
            health_data["components"]["redis"] = {
                "status": "healthy",
                "connected_clients": redis_info.get("connected_clients", 0),
                "used_memory_human": redis_info.get("used_memory_human", "N/A"),
                "uptime_in_seconds": redis_info.get("uptime_in_seconds", 0),
            }
        else:
            health_data["components"]["redis"] = {"status": "unhealthy"}
            health_data["overall_status"] = "unhealthy"
    except Exception as e:
        health_data["components"]["redis"] = {"status": "unhealthy", "error": str(e)}
        health_data["overall_status"] = "unhealthy"

    return health_data


@monitoring_bp.route("/")
@login_required
def dashboard():
    """모니터링 대시보드 메인 페이지"""
    containers = get_safework_containers()
    health = get_system_health()

    return render_template(
        "admin/monitoring/dashboard.html",
        containers=containers,
        health=health,
        page_title="시스템 모니터링",
    )


@monitoring_bp.route("/api/health")
@login_required
def api_health():
    """시스템 건강도 API"""
    return jsonify(get_system_health())


@monitoring_bp.route("/api/containers")
@login_required
def api_containers():
    """컨테이너 상태 API"""
    return jsonify(get_safework_containers())


@monitoring_bp.route("/api/logs/<container_id>")
@login_required
def api_logs(container_id):
    """컨테이너 로그 API"""
    lines = request.args.get("lines", 50, type=int)
    logs = get_container_logs(container_id, lines)

    return jsonify(
        {
            "container_id": container_id,
            "lines": lines,
            "logs": logs,
            "timestamp": datetime.now().isoformat(),
        }
    )


@monitoring_bp.route("/api/metrics")
@login_required
def api_metrics():
    """성능 메트릭 API"""
    try:
        # 기본 메트릭 수집
        containers = get_safework_containers()
        health = get_system_health()

        # Redis에서 캐시된 메트릭 조회 (선택적)
        cached_metrics = {}
        if redis_client:
            try:
                cached_data = redis_client.get("safework:metrics")
                if cached_data:
                    cached_metrics = json.loads(cached_data)
            except:
                pass

        metrics = {
            "timestamp": datetime.now().isoformat(),
            "containers": {
                "total": len(containers),
                "running": sum(1 for c in containers if c["state"] == "running"),
                "stopped": sum(1 for c in containers if c["state"] == "exited"),
            },
            "application": {
                "status": health["components"].get("application", {}).get("status"),
                "response_time": health["components"]
                .get("application", {})
                .get("response_time", 0),
            },
            "redis": health["components"].get("redis", {}),
            "cached_metrics": cached_metrics,
        }

        # 메트릭 캐시 저장 (5분 TTL)
        if redis_client:
            try:
                redis_client.setex("safework:metrics", 300, json.dumps(metrics))
            except:
                pass

        return jsonify(metrics)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@monitoring_bp.route("/api/restart/<container_name>", methods=["POST"])
@login_required
def api_restart_container(container_name):
    """컨테이너 재시작 API"""
    try:
        # 컨테이너 ID 조회
        containers = get_safework_containers()
        container_id = None

        for container in containers:
            if container_name in container["name"]:
                container_id = container["id"]
                break

        if not container_id:
            return jsonify({"error": f"Container {container_name} not found"}), 404

        # 컨테이너 재시작
        url = f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/docker/containers/{container_id}/restart"
        response = requests.post(url, headers=get_portainer_headers(), timeout=30)
        response.raise_for_status()

        # 감사 로그 기록
        try:
            audit_log = AuditLog(
                user_id=1,  # 관리자 ID
                action="container_restart",
                details=f"Container {container_name} ({container_id}) restarted via monitoring dashboard",
                ip_address=request.remote_addr,
            )
            db.session.add(audit_log)
            db.session.commit()
        except:
            pass  # 감사 로그 실패해도 재시작은 성공

        return jsonify(
            {
                "success": True,
                "message": f"Container {container_name} restarted successfully",
                "container_id": container_id,
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@monitoring_bp.route("/logs")
@login_required
def logs_page():
    """로그 조회 페이지"""
    containers = get_safework_containers()
    return render_template(
        "admin/monitoring/logs.html", containers=containers, page_title="로그 조회"
    )


@monitoring_bp.route("/alerts")
@login_required
def alerts_page():
    """알림 관리 페이지"""
    # 최근 감사 로그에서 시스템 이벤트 조회
    recent_events = []
    try:
        events = (
            AuditLog.query.filter(
                AuditLog.created_at >= datetime.now() - timedelta(hours=24)
            )
            .order_by(AuditLog.created_at.desc())
            .limit(50)
            .all()
        )

        for event in events:
            recent_events.append(
                {
                    "timestamp": event.created_at.isoformat(),
                    "action": event.action,
                    "details": event.details,
                    "user_id": event.user_id,
                    "ip_address": event.ip_address,
                }
            )
    except:
        pass

    return render_template(
        "admin/monitoring/alerts.html", recent_events=recent_events, page_title="알림 관리"
    )


@monitoring_bp.route("/performance")
@login_required
def performance_page():
    """성능 모니터링 페이지"""
    health = get_system_health()
    containers = get_safework_containers()

    # 성능 데이터 수집
    performance_data = {
        "system_overview": health,
        "container_metrics": containers,
        "trends": [],  # 추후 확장 가능
    }

    return render_template(
        "admin/monitoring/performance.html",
        performance_data=performance_data,
        page_title="성능 모니터링",
    )
