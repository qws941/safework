# -*- coding: utf-8 -*-
"""
SafeWork Activity Tracker
모든 웹 행동을 추적하고 로깅하는 시스템
"""

from flask import request, session, g
from flask_login import current_user
from datetime import datetime
import json
import logging
from functools import wraps
from models import db, AuditLogModel, kst_now

# 로깅 설정
logger = logging.getLogger(__name__)


class ActivityTracker:
    """SafeWork 웹 활동 추적 클래스"""

    @staticmethod
    def get_client_info():
        """클라이언트 정보 수집"""
        return {
            "ip_address": request.environ.get(
                "HTTP_X_FORWARDED_FOR", request.remote_addr
            ),
            "user_agent": request.headers.get("User-Agent", ""),
            "referrer": request.headers.get("Referer", ""),
            "method": request.method,
            "endpoint": request.endpoint,
            "url": request.url,
            "args": dict(request.args),
            "timestamp": kst_now().isoformat(),
        }

    @staticmethod
    def get_user_info():
        """사용자 정보 수집"""
        if current_user.is_authenticated:
            return {
                "user_id": current_user.id,
                "username": getattr(current_user, "username", "admin"),
                "is_authenticated": True,
            }
        else:
            return {
                "user_id": 1,  # 익명 사용자
                "username": "anonymous",
                "is_authenticated": False,
                "session_id": session.get("csrf_token", "")[:8]
                if session.get("csrf_token")
                else "no_session",
            }

    @staticmethod
    def log_activity(action, details=None, target_type=None, target_id=None):
        """활동 로그 저장"""
        try:
            user_info = ActivityTracker.get_user_info()
            client_info = ActivityTracker.get_client_info()

            # 로그 데이터 구성
            log_details = {
                "user_info": user_info,
                "client_info": client_info,
                "action_details": details or {},
                "target": {"type": target_type, "id": target_id}
                if target_type
                else None,
            }

            # AuditLog에 저장
            audit_log = AuditLogModel(
                user_id=user_info["user_id"],
                action=action,
                details=log_details,
                created_at=kst_now(),
            )

            db.session.add(audit_log)
            db.session.commit()

            # 콘솔 로그 출력 (개발용)
            logger.info(
                f"[ACTIVITY] {action} by {user_info['username']} from {client_info['ip_address']}"
            )

        except Exception as e:
            logger.error(f"Activity tracking error: {e}")
            db.session.rollback()


def track_activity(action, target_type=None):
    """데코레이터: 함수 실행을 자동으로 추적"""

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 함수 실행 전 추적
            ActivityTracker.log_activity(
                action=f"{action}_START",
                details={"function": func.__name__, "args_count": len(args)},
                target_type=target_type,
            )

            try:
                # 원본 함수 실행
                result = func(*args, **kwargs)

                # 성공 시 추적
                ActivityTracker.log_activity(
                    action=f"{action}_SUCCESS",
                    details={"function": func.__name__, "result": "success"},
                    target_type=target_type,
                )

                return result

            except Exception as e:
                # 실패 시 추적
                ActivityTracker.log_activity(
                    action=f"{action}_ERROR",
                    details={"function": func.__name__, "error": str(e)},
                    target_type=target_type,
                )
                raise

        return wrapper

    return decorator


def track_survey_submission(form_type, survey_id, form_data):
    """설문 제출 추적"""
    ActivityTracker.log_activity(
        action="SURVEY_SUBMIT",
        details={
            "form_type": form_type,
            "survey_id": survey_id,
            "field_count": len(form_data),
            "form_fields": list(form_data.keys())[:10],  # 처음 10개 필드만
            "submission_method": "web_form",
        },
        target_type="survey",
        target_id=survey_id,
    )


def track_admin_action(action, details=None):
    """관리자 액션 추적"""
    ActivityTracker.log_activity(
        action=f"ADMIN_{action}", details=details or {}, target_type="admin"
    )


def track_page_view(page_name):
    """페이지 조회 추적"""
    ActivityTracker.log_activity(
        action="PAGE_VIEW", details={"page": page_name}, target_type="page"
    )


def track_api_call(endpoint, method, payload_size=0):
    """API 호출 추적"""
    ActivityTracker.log_activity(
        action="API_CALL",
        details={"endpoint": endpoint, "method": method, "payload_size": payload_size},
        target_type="api",
    )


def track_login_attempt(username, success=True):
    """로그인 시도 추적"""
    ActivityTracker.log_activity(
        action="LOGIN_SUCCESS" if success else "LOGIN_FAILED",
        details={"username": username, "success": success},
        target_type="auth",
    )


def track_logout():
    """로그아웃 추적"""
    ActivityTracker.log_activity(action="LOGOUT", details={}, target_type="auth")
