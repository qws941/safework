"""
SafeWork 구조화된 로깅 시스템
JSON 형태의 구조화된 로그 출력 및 로그 레벨 관리
"""

import json
import logging
import sys
from datetime import datetime
from typing import Any, Dict, Optional
from flask import request, g, current_app
from functools import wraps


class StructuredLogger:
    """구조화된 로깅을 위한 클래스"""
    
    def __init__(self, name: str, level: int = logging.INFO):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)
        
        # JSON 포매터 설정
        if not self.logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            handler.setFormatter(JsonFormatter())
            self.logger.addHandler(handler)
    
    def _get_context(self) -> Dict[str, Any]:
        """현재 요청 컨텍스트 정보 수집"""
        context = {
            "timestamp": datetime.now().isoformat(),
            "service": "safework",
            "environment": current_app.config.get("FLASK_CONFIG", "development") if current_app else "unknown"
        }
        
        # Flask 요청 컨텍스트가 있는 경우
        try:
            if request:
                context.update({
                    "request_id": getattr(g, "request_id", None),
                    "method": request.method,
                    "path": request.path,
                    "user_agent": request.headers.get("User-Agent"),
                    "remote_addr": request.remote_addr
                })
        except RuntimeError:
            # 요청 컨텍스트 외부에서 호출된 경우
            pass
        
        return context
    
    def info(self, message: str, extra: Optional[Dict[str, Any]] = None, **kwargs):
        """INFO 레벨 로그"""
        self._log(logging.INFO, message, extra, **kwargs)
    
    def warning(self, message: str, extra: Optional[Dict[str, Any]] = None, **kwargs):
        """WARNING 레벨 로그"""
        self._log(logging.WARNING, message, extra, **kwargs)
    
    def error(self, message: str, extra: Optional[Dict[str, Any]] = None, exception: Optional[Exception] = None, **kwargs):
        """ERROR 레벨 로그"""
        if exception:
            if not extra:
                extra = {}
            extra["exception"] = {
                "type": type(exception).__name__,
                "message": str(exception),
                "traceback": self._get_traceback(exception)
            }
        self._log(logging.ERROR, message, extra, **kwargs)
    
    def critical(self, message: str, extra: Optional[Dict[str, Any]] = None, **kwargs):
        """CRITICAL 레벨 로그"""
        self._log(logging.CRITICAL, message, extra, **kwargs)
    
    def _log(self, level: int, message: str, extra: Optional[Dict[str, Any]] = None, **kwargs):
        """내부 로그 메서드"""
        log_data = self._get_context()
        log_data["message"] = message
        log_data["level"] = logging.getLevelName(level)
        
        if extra:
            log_data.update(extra)
        
        if kwargs:
            log_data.update(kwargs)
        
        self.logger.log(level, json.dumps(log_data, ensure_ascii=False, default=str))
    
    def _get_traceback(self, exception: Exception) -> Optional[str]:
        """예외의 traceback 정보 추출"""
        import traceback
        try:
            return ''.join(traceback.format_exception(type(exception), exception, exception.__traceback__))
        except:
            return None


class JsonFormatter(logging.Formatter):
    """JSON 형태로 로그를 포매팅하는 클래스"""
    
    def format(self, record):
        # 이미 JSON 형태의 메시지인 경우 그대로 반환
        if record.getMessage().startswith('{'):
            return record.getMessage()
        
        # 일반 로그 메시지를 JSON 형태로 변환
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data, ensure_ascii=False, default=str)


def log_request_response(logger: StructuredLogger):
    """요청/응답 로깅 데코레이터"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # 요청 시작 로그
            start_time = datetime.now()
            logger.info("Request started", {
                "endpoint": f.__name__,
                "args": str(args) if args else None,
                "kwargs": str(kwargs) if kwargs else None
            })
            
            try:
                # 함수 실행
                result = f(*args, **kwargs)
                
                # 성공 로그
                end_time = datetime.now()
                duration = (end_time - start_time).total_seconds()
                logger.info("Request completed successfully", {
                    "endpoint": f.__name__,
                    "duration_seconds": duration,
                    "status": "success"
                })
                
                return result
                
            except Exception as e:
                # 에러 로그
                end_time = datetime.now()
                duration = (end_time - start_time).total_seconds()
                logger.error("Request failed", {
                    "endpoint": f.__name__,
                    "duration_seconds": duration,
                    "status": "error"
                }, exception=e)
                raise
        
        return decorated_function
    return decorator


def log_survey_submission(logger: StructuredLogger, survey_data: Dict[str, Any]):
    """설문 제출 전용 로깅"""
    logger.info("Survey submission received", {
        "event_type": "survey_submission",
        "form_type": survey_data.get("form_type"),
        "user_name": survey_data.get("name"),
        "department": survey_data.get("department"),
        "has_anomalies": _detect_survey_anomalies(survey_data),
        "submission_method": "api" if request.is_json else "form"
    })


def log_system_event(logger: StructuredLogger, event_type: str, details: Dict[str, Any]):
    """시스템 이벤트 전용 로깅"""
    logger.info("System event occurred", {
        "event_type": event_type,
        "details": details,
        "category": "system"
    })


def _detect_survey_anomalies(survey_data: Dict[str, Any]) -> bool:
    """설문 데이터 이상징후 감지"""
    anomalies = []
    
    # 나이 관련 이상징후
    age = survey_data.get('age')
    if age and (age < 18 or age > 65):
        anomalies.append("unusual_age")
    
    # 근무년수 관련 이상징후
    work_years = survey_data.get('work_years')
    if work_years and work_years > 40:
        anomalies.append("long_service")
    
    # 건강 관련 이상징후
    responses = survey_data.get('responses', {})
    if responses.get('current_symptom') == '예':
        anomalies.append("current_symptoms")
    
    return len(anomalies) > 0


# 전역 로거 인스턴스
safework_logger = StructuredLogger("safework")
survey_logger = StructuredLogger("safework.survey")
system_logger = StructuredLogger("safework.system")