"""
SafeWork 슬랙 알림 시스템
설문지 제출 및 시스템 이벤트에 대한 슬랙 알림 기능 제공
"""

import json
import os
import requests
from datetime import datetime
from flask import current_app
from .structured_logger import safework_logger, survey_logger


class SlackNotifier:
    """슬랙 알림 전송 클래스"""

    def __init__(self, webhook_url=None):
        self.webhook_url = webhook_url or os.getenv('SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/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')

    def send_notification(self, message, color="#36a64f", title="SafeWork 알림", fields=None):
        """
        슬랙 알림 전송

        Args:
            message (str): 메시지 내용
            color (str): 메시지 색상 (#36a64f: 녹색, #ff0000: 빨간색, #ffff00: 노란색)
            title (str): 알림 제목
            fields (list): 추가 필드 정보

        Returns:
            bool: 전송 성공 여부
        """
        if not fields:
            fields = []

        # 기본 필드 추가
        fields.extend([
            {
                "title": "시간",
                "value": datetime.now().strftime('%Y-%m-%d %H:%M:%S KST'),
                "short": True
            },
            {
                "title": "서버",
                "value": "SafeWork Production",
                "short": True
            }
        ])

        payload = {
            "attachments": [
                {
                    "color": color,
                    "title": title,
                    "text": message,
                    "footer": "SafeWork Monitoring System",
                    "ts": int(datetime.now().timestamp()),
                    "fields": fields
                }
            ]
        }

        try:
            response = requests.post(
                self.webhook_url,
                headers={'Content-Type': 'application/json'},
                data=json.dumps(payload),
                timeout=10
            )

            if response.status_code == 200:
                safework_logger.info("Slack notification sent successfully", {
                    "title": title,
                    "webhook_status": "success",
                    "response_code": response.status_code
                })
                return True
            else:
                safework_logger.warning("Slack notification failed", {
                    "title": title,
                    "webhook_status": "failed",
                    "response_code": response.status_code,
                    "response_text": response.text
                })
                return False

        except Exception as e:
            safework_logger.error("Slack notification error", {
                "title": title,
                "webhook_status": "error"
            }, exception=e)
            return False

    def send_notification_with_rate_limit(self, message, color="#36a64f", title="SafeWork 알림", fields=None):
        """
        Rate limiting이 적용된 슬랙 알림 전송
        
        Args:
            message (str): 메시지 내용
            color (str): 메시지 색상
            title (str): 알림 제목
            fields (list): 추가 필드 정보
            
        Returns:
            bool: 전송 성공 여부
        """
        import time
        from datetime import datetime, timedelta
        
        # Rate limiting 체크 (1분당 최대 5개 알림)
        rate_limit_key = f"slack_notification_{int(time.time() // 60)}"
        
        # 간단한 메모리 기반 rate limiting (실제 환경에서는 Redis 사용 권장)
        if not hasattr(self, '_rate_limit_cache'):
            self._rate_limit_cache = {}
        
        current_count = self._rate_limit_cache.get(rate_limit_key, 0)
        if current_count >= 5:
            safework_logger.warning("Slack notification rate limit exceeded", {
                "rate_limit_key": rate_limit_key,
                "current_count": current_count,
                "limit": 5
            })
            return False
        
        # 알림 전송
        success = self.send_notification(message, color, title, fields)
        
        if success:
            self._rate_limit_cache[rate_limit_key] = current_count + 1
            # 오래된 캐시 정리 (10분 이상된 항목)
            current_minute = int(time.time() // 60)
            keys_to_remove = [k for k in self._rate_limit_cache.keys() 
                             if k.startswith('slack_notification_') and 
                             int(k.split('_')[-1]) < current_minute - 10]
            for key in keys_to_remove:
                del self._rate_limit_cache[key]
        
        return success

    def send_survey_notification(self, survey_data):
        """
        설문지 제출 알림 전송

        Args:
            survey_data (dict): 설문지 데이터
        """
        form_type_names = {
            "001": "근골격계 증상조사표",
            "002": "신규 입사자 건강검진표",
            "003": "근골격계 유해요인 조사표"
        }

        form_name = form_type_names.get(survey_data.get('form_type', ''), '알 수 없는 설문')

        message = f"""
🆕 새로운 설문지가 제출되었습니다!

📋 **설문 유형**: {form_name}
👤 **제출자**: {survey_data.get('name', '익명')}
🏢 **부서**: {survey_data.get('department', '미확인')}
💼 **직급**: {survey_data.get('position', '미확인')}

🔍 자세한 내용은 SafeWork 관리자 페이지에서 확인하세요.
📊 관리자 페이지: https://safework.jclee.me/admin
        """.strip()

        fields = [
            {
                "title": "설문 ID",
                "value": str(survey_data.get('id', 'N/A')),
                "short": True
            },
            {
                "title": "나이",
                "value": f"{survey_data.get('age', 'N/A')}세",
                "short": True
            }
        ]

        # 특이사항 감지
        color = "#36a64f"  # 기본 녹색
        if self._detect_anomalies(survey_data):
            color = "#ff9900"  # 주황색 (주의 필요)
            message += "\n\n⚠️ **특이사항이 감지되었습니다. 즉시 확인이 필요합니다.**"

        return self.send_notification(
            message=message,
            color=color,
            title="📋 SafeWork 설문지 제출",
            fields=fields
        )

    def send_system_alert(self, alert_type, message, severity="warning"):
        """
        시스템 알림 전송

        Args:
            alert_type (str): 알림 유형 (database, container, application, etc.)
            message (str): 알림 메시지
            severity (str): 심각도 (info, warning, error, critical)
        """
        severity_colors = {
            "info": "#36a64f",     # 녹색
            "warning": "#ff9900",  # 주황색
            "error": "#ff0000",    # 빨간색
            "critical": "#8b0000"  # 진한 빨간색
        }

        severity_icons = {
            "info": "ℹ️",
            "warning": "⚠️",
            "error": "❌",
            "critical": "🚨"
        }

        color = severity_colors.get(severity, "#ff9900")
        icon = severity_icons.get(severity, "⚠️")

        formatted_message = f"{icon} **{alert_type.upper()} 알림**\n\n{message}"

        return self.send_notification(
            message=formatted_message,
            color=color,
            title=f"🖥️ SafeWork 시스템 알림 ({severity.upper()})",
            fields=[
                {
                    "title": "알림 유형",
                    "value": alert_type,
                    "short": True
                },
                {
                    "title": "심각도",
                    "value": severity.upper(),
                    "short": True
                }
            ]
        )

    def _detect_anomalies(self, survey_data):
        """
        설문 데이터에서 특이사항 감지

        Args:
            survey_data (dict): 설문지 데이터

        Returns:
            bool: 특이사항 발견 여부
        """
        anomalies = []

        # 나이 관련 특이사항
        age = survey_data.get('age')
        if age and (age < 18 or age > 65):
            anomalies.append(f"비정상적인 나이: {age}세")

        # 근무년수 관련 특이사항
        work_years = survey_data.get('work_years')
        if work_years and work_years > 40:
            anomalies.append(f"장기 근무자: {work_years}년")

        # 설문 응답에서 특이사항 감지 (001 근골격계)
        responses = survey_data.get('responses', {})
        if survey_data.get('form_type') == '001':
            # 심각한 증상 감지
            if responses.get('current_symptom') == '예':
                anomalies.append("현재 근골격계 증상 호소")

            if responses.get('past_accident') == '예':
                anomalies.append("과거 산업재해 경험")

        # 설문 응답에서 특이사항 감지 (002 신규 입사자)
        elif survey_data.get('form_type') == '002':
            if responses.get('existing_conditions'):
                anomalies.append("기존 질병 이력 있음")

            if responses.get('allergy_history'):
                anomalies.append("알레르기 이력 있음")

        if anomalies:
            survey_logger.info("Survey anomalies detected", {
                "anomalies": anomalies,
                "anomaly_count": len(anomalies),
                "survey_form_type": survey_data.get('form_type'),
                "survey_name": survey_data.get('name')
            })
            return True

        return False


# 전역 슬랙 알림 인스턴스
slack_notifier = SlackNotifier()


def send_survey_slack_notification(survey_data):
    """설문지 제출 슬랙 알림 전송 (편의 함수)"""
    return slack_notifier.send_survey_notification(survey_data)


def send_system_slack_alert(alert_type, message, severity="warning"):
    """시스템 알림 슬랙 전송 (편의 함수)"""
    return slack_notifier.send_system_alert(alert_type, message, severity)