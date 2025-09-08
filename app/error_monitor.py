"""
SafeWork Error Monitor Integration for Flask App
Flask 애플리케이션용 에러 모니터링 통합 모듈
"""

import os
import json
import logging
import traceback
from datetime import datetime
from flask import request, g
from functools import wraps
import requests

class ErrorMonitor:
    """Flask 애플리케이션 에러 모니터링 클래스"""
    
    def __init__(self, app=None):
        self.app = app
        self.github_token = os.getenv("GITHUB_TOKEN")
        self.github_repo = os.getenv("GITHUB_REPO", "qws941/safework")
        self.monitoring_enabled = os.getenv("ERROR_MONITORING_ENABLED", "true").lower() == "true"
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Flask 앱 초기화"""
        self.app = app
        
        # 로깅 설정 개선
        if not app.debug:
            # 파일 로깅 핸들러
            file_handler = logging.FileHandler('/app/logs/safework-app.log')
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
            ))
            file_handler.setLevel(logging.INFO)
            app.logger.addHandler(file_handler)
            
            # 에러 로깅 핸들러 
            error_handler = logging.FileHandler('/app/logs/safework-errors.log')
            error_handler.setFormatter(logging.Formatter(
                '%(asctime)s %(levelname)s: %(message)s\n%(pathname)s:%(lineno)d\n'
            ))
            error_handler.setLevel(logging.ERROR)
            app.logger.addHandler(error_handler)
            
            app.logger.setLevel(logging.INFO)
        
        # 에러 핸들러 등록
        self.register_error_handlers(app)
        
        # 요청 전후 처리 등록
        app.before_request(self.before_request)
        app.after_request(self.after_request)
        app.teardown_appcontext(self.teardown_request)
    
    def register_error_handlers(self, app):
        """에러 핸들러 등록"""
        
        @app.errorhandler(404)
        def not_found_error(error):
            self.log_error(error, "404_error", severity="low")
            return render_template("errors/404.html"), 404
        
        @app.errorhandler(500) 
        def internal_error(error):
            from models import db
            db.session.rollback()
            self.log_error(error, "500_error", severity="high")
            return render_template("errors/500.html"), 500
        
        @app.errorhandler(Exception)
        def handle_exception(error):
            from models import db
            db.session.rollback()
            self.log_error(error, "unhandled_exception", severity="critical")
            
            # 프로덕션에서는 일반적인 에러 페이지 표시
            if not app.debug:
                return render_template("errors/500.html"), 500
            else:
                # 개발 환경에서는 원래 에러 발생
                raise error
    
    def log_error(self, error, error_type, severity="medium", extra_data=None):
        """에러 로깅 및 GitHub 이슈 생성"""
        if not self.monitoring_enabled:
            return
        
        try:
            error_info = {
                "timestamp": datetime.now().isoformat(),
                "error_type": error_type,
                "severity": severity,
                "message": str(error),
                "traceback": traceback.format_exc() if hasattr(error, "__traceback__") else None,
                "request_info": self.get_request_info(),
                "user_info": self.get_user_info(),
                "extra_data": extra_data or {}
            }
            
            # 로그 파일에 기록
            self.app.logger.error(f"[{severity.upper()}] {error_type}: {str(error)}")
            if error_info["traceback"]:
                self.app.logger.error(f"Traceback: {error_info['traceback']}")
            
            # 심각도가 높은 경우 GitHub 이슈 생성
            if severity in ["high", "critical"] and self.github_token:
                self.create_github_issue_async(error_info)
                
        except Exception as e:
            # 에러 로깅 중 에러가 발생해도 원본 에러가 가려지지 않도록
            self.app.logger.error(f"Error in error monitoring: {str(e)}")
    
    def get_request_info(self):
        """현재 요청 정보 수집"""
        try:
            return {
                "method": request.method if request else None,
                "url": request.url if request else None,
                "endpoint": request.endpoint if request else None,
                "remote_addr": request.remote_addr if request else None,
                "user_agent": request.user_agent.string if request and request.user_agent else None,
                "args": dict(request.args) if request else {},
                "form_keys": list(request.form.keys()) if request and request.form else []
            }
        except:
            return {}
    
    def get_user_info(self):
        """현재 사용자 정보 수집"""
        try:
            from flask_login import current_user
            if current_user and current_user.is_authenticated:
                return {
                    "user_id": current_user.id,
                    "username": getattr(current_user, 'username', None),
                    "is_admin": getattr(current_user, 'is_admin', False)
                }
            return {"user_id": None, "authenticated": False}
        except:
            return {}
    
    def create_github_issue_async(self, error_info):
        """비동기 GitHub 이슈 생성 (백그라운드)"""
        import threading
        thread = threading.Thread(target=self._create_github_issue, args=(error_info,))
        thread.daemon = True
        thread.start()
    
    def _create_github_issue(self, error_info):
        """실제 GitHub 이슈 생성"""
        try:
            # 심각도에 따른 라벨과 제목 설정
            severity_emoji = {
                "low": "⚠️",
                "medium": "🟡", 
                "high": "🔴",
                "critical": "🚨"
            }
            
            emoji = severity_emoji.get(error_info["severity"], "🐛")
            title = f"{emoji} [{error_info['severity'].upper()}] {error_info['error_type']} - SafeWork App"
            
            # 이슈 본문 생성
            body = f"""## {emoji} SafeWork 애플리케이션 에러 보고

### 📋 에러 정보
- **에러 타입**: `{error_info['error_type']}`
- **심각도**: `{error_info['severity']}`
- **발생 시간**: {error_info['timestamp']}
- **메시지**: {error_info['message']}

### 🌐 요청 정보
"""
            
            if error_info["request_info"]:
                req_info = error_info["request_info"]
                body += f"""- **Method**: {req_info.get('method', 'N/A')}
- **URL**: {req_info.get('url', 'N/A')}
- **Endpoint**: {req_info.get('endpoint', 'N/A')}
- **Remote IP**: {req_info.get('remote_addr', 'N/A')}
- **User Agent**: {req_info.get('user_agent', 'N/A')}
"""
            
            # 사용자 정보
            if error_info["user_info"]:
                user_info = error_info["user_info"]
                body += f"""
### 👤 사용자 정보
- **User ID**: {user_info.get('user_id', 'Anonymous')}
- **Username**: {user_info.get('username', 'N/A')}
- **Admin**: {user_info.get('is_admin', False)}
"""
            
            # 트레이스백 정보
            if error_info["traceback"]:
                body += f"""
### 🔍 상세 트레이스백
```python
{error_info['traceback']}
```
"""
            
            # 추가 데이터
            if error_info["extra_data"]:
                body += f"""
### 📊 추가 정보
```json
{json.dumps(error_info['extra_data'], indent=2, ensure_ascii=False)}
```
"""
            
            body += f"""
---
**자동 생성**: SafeWork Error Monitor v1.0  
**환경**: Production  
**컨테이너**: safework-app
"""
            
            # GitHub API 요청
            headers = {
                "Authorization": f"token {self.github_token}",
                "Accept": "application/vnd.github.v3+json"
            }
            
            labels = [
                "🚨 auto-error",
                "bug",
                "container-app",
                f"severity-{error_info['severity']}",
                f"type-{error_info['error_type']}"
            ]
            
            issue_data = {
                "title": title,
                "body": body,
                "labels": labels
            }
            
            url = f"https://api.github.com/repos/{self.github_repo}/issues"
            response = requests.post(url, headers=headers, json=issue_data, timeout=10)
            
            if response.status_code == 201:
                issue_url = response.json()["html_url"]
                self.app.logger.info(f"GitHub 이슈 자동 생성 완료: {issue_url}")
            else:
                self.app.logger.error(f"GitHub 이슈 생성 실패: {response.status_code}")
                
        except Exception as e:
            self.app.logger.error(f"GitHub 이슈 생성 중 오류: {str(e)}")
    
    def before_request(self):
        """요청 시작 시 호출"""
        g.start_time = datetime.now()
    
    def after_request(self, response):
        """요청 완료 시 호출"""
        if hasattr(g, 'start_time'):
            duration = (datetime.now() - g.start_time).total_seconds()
            
            # 느린 요청 감지 (5초 이상)
            if duration > 5.0:
                self.log_error(
                    f"Slow request detected: {duration:.2f}s",
                    "slow_request",
                    severity="medium",
                    extra_data={
                        "duration": duration,
                        "endpoint": request.endpoint,
                        "method": request.method
                    }
                )
        
        return response
    
    def teardown_request(self, exception):
        """요청 종료 시 호출"""
        if exception is not None:
            self.log_error(
                exception,
                "request_teardown_error", 
                severity="high"
            )

def monitor_database_connection(func):
    """데이터베이스 연결 모니터링 데코레이터"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            if "connection" in str(e).lower() or "mysql" in str(e).lower():
                # 데이터베이스 연결 오류로 분류
                from flask import current_app
                if hasattr(current_app, 'error_monitor'):
                    current_app.error_monitor.log_error(
                        e, 
                        "database_connection_error",
                        severity="critical"
                    )
            raise
    return wrapper

def monitor_survey_operations(func):
    """설문 관련 작업 모니터링 데코레이터"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            from flask import current_app
            if hasattr(current_app, 'error_monitor'):
                current_app.error_monitor.log_error(
                    e,
                    "survey_operation_error", 
                    severity="high",
                    extra_data={
                        "function": func.__name__,
                        "args": str(args)[:200],  # 처음 200자만
                        "kwargs": str(kwargs)[:200]
                    }
                )
            raise
    return wrapper