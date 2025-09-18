"""
SafeWork 강화된 로깅 시스템

특징:
- 구조화된 로깅 (JSON 형태)
- 사용자 작업 추적
- 에러 상세 분석
- 성능 메트릭 수집
- 보안 이벤트 모니터링
"""

import logging
import json
import traceback
from datetime import datetime
from functools import wraps
from flask import request, g, current_app
from flask_login import current_user
import time
import psutil
import os


class StructuredLogger:
    """구조화된 로깅을 위한 클래스"""

    def __init__(self, logger_name="safework"):
        self.logger = logging.getLogger(logger_name)
        self._setup_structured_logging()

    def _setup_structured_logging(self):
        """구조화된 로깅 설정"""
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)

    def _get_context(self):
        """현재 컨텍스트 정보 수집"""
        context = {
            "timestamp": datetime.now().isoformat(),
            "process_id": os.getpid(),
            "memory_usage_mb": round(
                psutil.Process().memory_info().rss / (1024**2), 2
            ),
        }

        # 요청 컨텍스트가 있는 경우
        if request:
            context.update(
                {
                    "request_id": getattr(g, "request_id", None),
                    "method": request.method,
                    "url": request.url,
                    "remote_addr": request.remote_addr,
                    "user_agent": request.headers.get("User-Agent", ""),
                }
            )

        # 사용자 정보
        if current_user and current_user.is_authenticated:
            context["user_id"] = current_user.id
            context["username"] = getattr(current_user, "username", "unknown")
        else:
            context["user_id"] = "anonymous"

        return context

    def log_event(self, level, event_type, message, **kwargs):
        """구조화된 이벤트 로깅"""
        log_data = {
            "event_type": event_type,
            "message": message,
            "context": self._get_context(),
            "data": kwargs,
        }

        log_message = json.dumps(log_data, ensure_ascii=False, default=str)

        if level == "error":
            self.logger.error(log_message)
        elif level == "warning":
            self.logger.warning(log_message)
        elif level == "info":
            self.logger.info(log_message)
        elif level == "debug":
            self.logger.debug(log_message)

    def log_survey_submission(self, survey_id, form_type, success=True, **kwargs):
        """설문 제출 이벤트 로깅"""
        self.log_event(
            "info",
            "survey_submission",
            f"Survey {survey_id} submitted",
            survey_id=survey_id,
            form_type=form_type,
            success=success,
            **kwargs,
        )

    def log_raw_data_export(self, survey_id, files_created, success=True, **kwargs):
        """Raw data 내보내기 이벤트 로깅"""
        self.log_event(
            "info" if success else "error",
            "raw_data_export",
            f"Raw data export for survey {survey_id}",
            survey_id=survey_id,
            files_created=files_created,
            success=success,
            **kwargs,
        )

    def log_error(self, error, context_info=None):
        """에러 상세 로깅"""
        error_data = {
            "error_type": type(error).__name__,
            "error_message": str(error),
            "traceback": traceback.format_exc(),
        }

        if context_info:
            error_data.update(context_info)

        self.log_event(
            "error",
            "application_error",
            f"Application error: {str(error)}",
            **error_data,
        )

    def log_performance(self, operation, duration_ms, **kwargs):
        """성능 메트릭 로깅"""
        self.log_event(
            "info",
            "performance_metric",
            f"Operation {operation} completed",
            operation=operation,
            duration_ms=duration_ms,
            **kwargs,
        )

    def log_security_event(self, event_type, description, severity="medium", **kwargs):
        """보안 이벤트 로깅"""
        self.log_event(
            "warning" if severity in ["medium", "high"] else "info",
            "security_event",
            description,
            security_event_type=event_type,
            severity=severity,
            **kwargs,
        )


def performance_monitor(operation_name):
    """성능 모니터링 데코레이터"""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            logger = StructuredLogger()
            start_time = time.time()

            try:
                result = func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000

                logger.log_performance(
                    operation=operation_name,
                    duration_ms=duration_ms,
                    function=func.__name__,
                    success=True,
                )

                return result

            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000

                logger.log_performance(
                    operation=operation_name,
                    duration_ms=duration_ms,
                    function=func.__name__,
                    success=False,
                    error=str(e),
                )

                logger.log_error(
                    e, {"function": func.__name__, "operation": operation_name}
                )

                raise

        return wrapper

    return decorator


def error_handler(error_type="general"):
    """에러 처리 데코레이터"""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            logger = StructuredLogger()

            try:
                return func(*args, **kwargs)

            except Exception as e:
                logger.log_error(
                    e,
                    {
                        "function": func.__name__,
                        "error_type": error_type,
                        "args": str(args)[:200],  # 인수 정보 (200자 제한)
                        "kwargs": str(kwargs)[:200],  # 키워드 인수 정보 (200자 제한)
                    },
                )

                # 에러를 다시 발생시켜 정상적인 에러 처리 흐름 유지
                raise

        return wrapper

    return decorator


class SecurityMonitor:
    """보안 모니터링 클래스"""

    def __init__(self):
        self.logger = StructuredLogger()

    def log_login_attempt(self, username, success, ip_address):
        """로그인 시도 모니터링"""
        severity = "low" if success else "medium"

        self.logger.log_security_event(
            "login_attempt",
            f"Login attempt for user {username}",
            severity=severity,
            username=username,
            success=success,
            ip_address=ip_address,
        )

    def log_suspicious_activity(self, activity_type, description, **kwargs):
        """의심스러운 활동 모니터링"""
        self.logger.log_security_event(
            "suspicious_activity",
            description,
            severity="high",
            activity_type=activity_type,
            **kwargs,
        )

    def log_data_access(self, resource_type, resource_id, action):
        """데이터 접근 모니터링"""
        self.logger.log_security_event(
            "data_access",
            f"{action} on {resource_type} {resource_id}",
            severity="low",
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
        )


# 전역 로거 인스턴스
safework_logger = StructuredLogger()
security_monitor = SecurityMonitor()


def init_logging(app):
    """Flask 앱에 강화된 로깅 시스템 초기화"""

    @app.before_request
    def before_request():
        """요청 시작 시 로깅"""
        g.request_start_time = time.time()
        g.request_id = f"{int(time.time())}-{os.getpid()}"

        # 요청 로깅
        safework_logger.log_event(
            "info",
            "request_start",
            f"{request.method} {request.path}",
            request_id=g.request_id,
            method=request.method,
            path=request.path,
            remote_addr=request.remote_addr,
        )

    @app.after_request
    def after_request(response):
        """요청 완료 시 로깅"""
        if hasattr(g, "request_start_time"):
            duration_ms = (time.time() - g.request_start_time) * 1000

            safework_logger.log_event(
                "info",
                "request_complete",
                f"{request.method} {request.path} - {response.status_code}",
                request_id=getattr(g, "request_id", None),
                method=request.method,
                path=request.path,
                status_code=response.status_code,
                duration_ms=duration_ms,
            )

        return response

    @app.errorhandler(404)
    def not_found_error(error):
        """404 에러 핸들링"""
        safework_logger.log_security_event(
            "404_error",
            f"Page not found: {request.path}",
            severity="low",
            path=request.path,
            remote_addr=request.remote_addr,
        )
        return render_template("errors/404.html"), 404

    @app.errorhandler(500)
    def internal_error(error):
        """500 에러 핸들링"""
        safework_logger.log_error(
            error,
            {
                "error_type": "500_internal_error",
                "path": request.path,
                "method": request.method,
            },
        )
        return render_template("errors/500.html"), 500
