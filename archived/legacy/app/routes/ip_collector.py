from flask import Blueprint, request, jsonify, render_template
from datetime import datetime
import json
import os
from models import db

ip_collector_bp = Blueprint("ip_collector", __name__)

# IP 로그 파일 경로
IP_LOG_FILE = "/tmp/safework_ip_logs.json"

def get_client_ip():
    """실제 클라이언트 IP 주소 획득"""
    # Cloudflare/프록시 환경에서 실제 IP 확인
    if request.headers.get('CF-Connecting-IP'):
        return request.headers.get('CF-Connecting-IP')
    elif request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    elif request.headers.get('X-Real-IP'):
        return request.headers.get('X-Real-IP')
    else:
        return request.remote_addr

def log_ip_access(route, ip_address, user_agent=None, extra_info=None):
    """IP 접근 로그 기록"""
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "route": route,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "extra_info": extra_info or {}
    }
    
    # JSON 파일에 로그 저장
    try:
        if os.path.exists(IP_LOG_FILE):
            with open(IP_LOG_FILE, 'r') as f:
                logs = json.load(f)
        else:
            logs = []
        
        logs.append(log_entry)
        
        # 최근 1000개만 보관
        if len(logs) > 1000:
            logs = logs[-1000:]
        
        with open(IP_LOG_FILE, 'w') as f:
            json.dump(logs, f, indent=2, ensure_ascii=False)
            
    except Exception as e:
        print(f"IP 로그 저장 오류: {e}")

@ip_collector_bp.route("/collect-ip")
def collect_ip():
    """IP 수집 페이지"""
    client_ip = get_client_ip()
    user_agent = request.headers.get('User-Agent', '')
    
    # 접근 정보 로깅
    log_ip_access(
        route="/collect-ip",
        ip_address=client_ip,
        user_agent=user_agent,
        extra_info={
            "method": request.method,
            "referrer": request.referrer,
            "country": request.headers.get('CF-IPCountry', 'Unknown')
        }
    )
    
    return render_template('ip_collector/collect.html', 
                         client_ip=client_ip,
                         user_agent=user_agent)

@ip_collector_bp.route("/api/log-access", methods=["POST"])
def api_log_access():
    """API를 통한 접근 로깅"""
    client_ip = get_client_ip()
    user_agent = request.headers.get('User-Agent', '')
    
    # POST 데이터 수집
    data = request.get_json() or {}
    
    log_ip_access(
        route=data.get('route', '/api/log-access'),
        ip_address=client_ip,
        user_agent=user_agent,
        extra_info={
            "post_data": data,
            "method": request.method,
            "country": request.headers.get('CF-IPCountry', 'Unknown'),
            "city": request.headers.get('CF-IPCity', 'Unknown')
        }
    )
    
    return jsonify({
        "success": True,
        "logged_ip": client_ip,
        "timestamp": datetime.now().isoformat()
    })

@ip_collector_bp.route("/admin/ip-logs")
def view_ip_logs():
    """IP 로그 확인 (어드민 전용)"""
    try:
        if os.path.exists(IP_LOG_FILE):
            with open(IP_LOG_FILE, 'r') as f:
                logs = json.load(f)
            
            # 최근 100개만 표시
            recent_logs = logs[-100:]
            recent_logs.reverse()  # 최신순
            
            return render_template('ip_collector/logs.html', logs=recent_logs)
        else:
            return render_template('ip_collector/logs.html', logs=[])
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@ip_collector_bp.route("/admin/ip-stats")
def ip_statistics():
    """IP 통계 정보"""
    try:
        if not os.path.exists(IP_LOG_FILE):
            return jsonify({"total_visits": 0, "unique_ips": 0, "top_ips": []})
        
        with open(IP_LOG_FILE, 'r') as f:
            logs = json.load(f)
        
        # 통계 계산
        total_visits = len(logs)
        unique_ips = len(set(log['ip_address'] for log in logs))
        
        # 가장 많이 접근한 IP
        ip_counts = {}
        for log in logs:
            ip = log['ip_address']
            ip_counts[ip] = ip_counts.get(ip, 0) + 1
        
        top_ips = sorted(ip_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return jsonify({
            "total_visits": total_visits,
            "unique_ips": unique_ips,
            "top_ips": [{"ip": ip, "count": count} for ip, count in top_ips]
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 자동 IP 로깅 미들웨어
@ip_collector_bp.before_app_request
def log_all_requests():
    """모든 요청의 IP 자동 로깅"""
    # 특정 경로만 로깅 (선택적)
    skip_routes = ['/static', '/favicon.ico', '/health']
    
    if not any(request.path.startswith(route) for route in skip_routes):
        client_ip = get_client_ip()
        user_agent = request.headers.get('User-Agent', '')
        
        log_ip_access(
            route=request.path,
            ip_address=client_ip,
            user_agent=user_agent,
            extra_info={
                "method": request.method,
                "country": request.headers.get('CF-IPCountry', 'Unknown')
            }
        )