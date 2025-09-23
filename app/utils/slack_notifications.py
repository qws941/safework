"""
SafeWork Slack 실시간 알림 시스템
- 애플리케이션 내에서 직접 Slack 알림 발송
- 의약품 재고 부족, 건강검진 임박, 시스템 오류 등 실시간 알림
"""

import requests
import json
from datetime import datetime
from flask import current_app
import os
import pytz


class SafeWorkSlackNotifier:
    def __init__(self, webhook_url=None, oauth_token=None, bot_token=None):
        # 1순위: Webhook URL (가장 안정적)
        self.webhook_url = webhook_url or os.environ.get("SLACK_WEBHOOK_URL")

        # 2순위: OAuth/Bot Token (권한 설정 필요)
        self.oauth_token = oauth_token or os.environ.get("SLACK_OAUTH_TOKEN")
        self.bot_token = bot_token or os.environ.get("SLACK_BOT_TOKEN")

        # 토큰이 없으면 환경변수에서 기본값 사용하지 않음 (보안상 권장)
        # 모든 토큰은 명시적으로 환경변수에서 설정되어야 함

        self.default_channel = "#safework-alerts"

        # 사용 가능한 방법 로깅
        if self.webhook_url:
            print(f"🔗 Slack Webhook URL 설정됨")
        if self.oauth_token:
            print(f"🔑 OAuth Token 설정됨: {self.oauth_token[:20]}...")
        if self.bot_token:
            print(f"🤖 Bot Token 설정됨: {self.bot_token[:20]}...")

    def send_notification(
        self, message_type, title, details, priority="medium", channel=None
    ):
        """SafeWork 특화 Slack 알림 발송"""
        if not self.webhook_url:
            current_app.logger.warning("Slack webhook URL not configured")
            return False

        # 메시지 타입별 이모지와 색상
        type_config = {
            "medication_shortage": {
                "emoji": "💊",
                "color": "danger",
                "channel": "#safework-alerts",
            },
            "health_check_due": {
                "emoji": "🏥",
                "color": "warning",
                "channel": "#safework-health",
            },
            "system_error": {
                "emoji": "🚨",
                "color": "danger",
                "channel": "#safework-alerts",
            },
            "survey_completed": {
                "emoji": "📋",
                "color": "good",
                "channel": "#safework-surveys",
            },
            "deployment": {"emoji": "🚀", "color": "good", "channel": "#safework-dev"},
            "security_alert": {
                "emoji": "🔒",
                "color": "danger",
                "channel": "#safework-security",
            },
        }

        config = type_config.get(
            message_type,
            {"emoji": "ℹ️", "color": "good", "channel": "#safework-general"},
        )

        # 우선순위별 색상 오버라이드
        priority_colors = {
            "critical": "danger",
            "high": "warning",
            "medium": "good",
            "low": "#36a64f",
        }

        color = priority_colors.get(priority, config["color"])
        target_channel = channel or config["channel"]

        payload = {
            "channel": channel or self.default_channel,
            "text": f"{config['emoji']} SafeWork 알림: {title}",
            "attachments": [
                {
                    "color": color,
                    "title": f"{config['emoji']} {title}",
                    "fields": [],
                    "footer": "SafeWork 안전보건 관리시스템",
                    "footer_icon": "https://safework.jclee.me/static/favicon.ico",
                    "ts": int(datetime.now().timestamp()),
                }
            ],
        }

        # 세부 정보 추가
        if isinstance(details, dict):
            for key, value in details.items():
                payload["attachments"][0]["fields"].append(
                    {"title": key, "value": str(value), "short": len(str(value)) < 30}
                )
        else:
            payload["attachments"][0]["text"] = str(details)

        # 시스템 링크 추가
        payload["attachments"][0]["fields"].append(
            {
                "title": "시스템 접속",
                "value": "<https://safework.jclee.me|SafeWork 시스템> | <https://safework.jclee.me/health|상태 확인>",
                "short": False,
            }
        )

        # 긴급한 경우 추가 블록
        if priority == "critical":
            payload["blocks"] = [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"🚨 *긴급 대응 필요* 🚨\n담당팀 즉시 확인 바랍니다.",
                    },
                }
            ]

        return self._send_to_slack(payload)

    def send_medication_alert(self, medication_name, current_stock, minimum_stock):
        """의약품 재고 부족 알림"""
        return self.send_notification(
            "medication_shortage",
            "의약품 재고 부족",
            {
                "의약품명": medication_name,
                "현재 재고": f"{current_stock}개",
                "최소 재고": f"{minimum_stock}개",
                "부족량": f"{minimum_stock - current_stock}개",
                "상태": "즉시 보충 필요",
            },
            priority="high",
        )

    def send_health_check_reminder(self, worker_name, due_date, days_until):
        """건강검진 임박 알림"""
        priority = (
            "critical" if days_until <= 3 else "high" if days_until <= 7 else "medium"
        )

        return self.send_notification(
            "health_check_due",
            "건강검진 일정 임박",
            {
                "대상자": worker_name,
                "검진 예정일": due_date,
                "남은 기간": f"{days_until}일",
                "상태": "일정 확인 필요" if days_until > 3 else "긴급 확인 필요",
            },
            priority=priority,
        )

    def send_survey_completion_summary(
        self, survey_type, completed_count, total_responses_today
    ):
        """설문 완료 요약 알림"""
        return self.send_notification(
            "survey_completed",
            f"{survey_type} 설문 완료 알림",
            {
                "설문 종류": survey_type,
                "금일 완료": f"{completed_count}건",
                "전체 응답": f"{total_responses_today}건",
                "완료율": f"{(completed_count/total_responses_today*100):.1f}%"
                if total_responses_today > 0
                else "0%",
            },
            priority="low",
        )

    def send_system_error(self, error_type, error_message, stack_trace=None):
        """시스템 에러 알림"""
        details = {
            "에러 타입": error_type,
            "에러 메시지": error_message,
            "발생 시간": datetime.now(pytz.timezone('Asia/Seoul')).strftime("%Y-%m-%d %H:%M:%S KST"),
            "서버": "SafeWork Production",
        }

        if stack_trace:
            details["스택 트레이스"] = (
                stack_trace[:200] + "..." if len(stack_trace) > 200 else stack_trace
            )

        return self.send_notification(
            "system_error", "시스템 오류 발생", details, priority="critical"
        )

    def send_deployment_notification(self, version, status, deploy_time=None):
        """배포 알림"""
        return self.send_notification(
            "deployment",
            f"SafeWork 배포 {status}",
            {
                "버전": version,
                "상태": status,
                "배포 시간": deploy_time
                or datetime.now(pytz.timezone('Asia/Seoul')).strftime("%Y-%m-%d %H:%M:%S KST"),
                "환경": "Production",
            },
            priority="medium" if status == "완료" else "high",
        )

    def send_survey_submission_with_raw_data(self, survey_id, survey_data, form_type="001"):
        """설문 제출시 사용자 원데이터를 HTML 형식으로 포함한 Slack 알림"""

        # 설문 유형별 제목 설정
        survey_titles = {
            "001": "근골격계 유해요인 조사",
            "002": "신규입사자 건강검진 설문"
        }

        survey_title = survey_titles.get(form_type, f"설문 {form_type}")

        # HTML 테이블로 사용자 데이터 포맷팅
        html_table = self._format_survey_data_as_html_table(survey_data, form_type)

        # 기본 정보 요약
        basic_info = {
            "설문 ID": survey_id,
            "설문 유형": survey_title,
            "제출자": survey_data.get('name', '익명'),
            "부서": survey_data.get('department', '미지정'),
            "제출 시간": datetime.now(pytz.timezone('Asia/Seoul')).strftime("%Y-%m-%d %H:%M:%S KST")
        }

        # 위험 요소 분석
        risk_level = self._analyze_survey_risk(survey_data, form_type)

        payload = {
            "channel": self.default_channel,
            "text": f"📋 새로운 설문 제출: {survey_title}",
            "attachments": [
                {
                    "color": self._get_color_by_risk(risk_level),
                    "title": f"📋 {survey_title} 설문 제출 완료",
                    "fields": [
                        {"title": key, "value": str(value), "short": True}
                        for key, value in basic_info.items()
                    ],
                    "footer": "SafeWork 안전보건 관리시스템",
                    "ts": int(datetime.now().timestamp()),
                },
                {
                    "color": "#f2c744",
                    "title": "📊 설문 원데이터 (HTML 형식)",
                    "text": html_table,
                    "mrkdwn_in": ["text"],
                    "footer": f"설문 ID: {survey_id} | 위험도: {risk_level}"
                }
            ],
        }

        # 고위험 사례의 경우 긴급 알림 추가
        if risk_level == "HIGH":
            payload["text"] = f"🚨 긴급: 고위험 설문 제출 - {survey_title}"
            payload["attachments"].insert(0, {
                "color": "danger",
                "title": "🚨 즉시 확인 필요",
                "text": f"고위험 요소가 감지된 설문이 제출되었습니다.\n담당자는 즉시 확인하여 주시기 바랍니다.",
                "fields": [
                    {"title": "제출자", "value": survey_data.get('name', '익명'), "short": True},
                    {"title": "부서", "value": survey_data.get('department', '미지정'), "short": True}
                ]
            })

        return self._send_to_slack(payload)

    def _format_survey_data_as_html_table(self, survey_data, form_type):
        """설문 데이터를 HTML 테이블 형식으로 변환"""

        # 필드명을 한국어로 매핑
        field_mapping = {
            # 공통 필드
            "name": "이름",
            "age": "나이",
            "gender": "성별",
            "department": "부서",
            "position": "직급",
            "employee_number": "사번",
            "employee_id": "직원ID",
            "work_years": "근무년수",
            "work_months": "근무개월수",
            "years_of_service": "총 근무년수",

            # 001 근골격계 특화 필드
            "has_symptoms": "증상 유무",
            "symptom_frequency": "증상 빈도",
            "symptom_severity": "증상 심각도",
            "work_posture": "작업 자세",
            "repetitive_work": "반복 작업",
            "heavy_lifting": "중량물 취급",
            "past_accident": "과거 사고 이력",
            "past_accident_details": "과거 사고 상세",

            # 002 신규입사자 특화 필드
            "medical_history": "병력",
            "chronic_disease": "만성질환",
            "medication_use": "복용약물",
            "allergies": "알레르기",
            "smoking": "흡연",
            "drinking": "음주"
        }

        html_rows = []

        # 기본 정보 섹션
        html_rows.append("<tr><td colspan='2'><b>🔍 기본 정보</b></td></tr>")
        for key in ["name", "age", "gender", "department", "position"]:
            if key in survey_data:
                korean_label = field_mapping.get(key, key)
                value = survey_data[key]
                html_rows.append(f"<tr><td><b>{korean_label}</b></td><td>{value}</td></tr>")

        # 근무 정보 섹션
        html_rows.append("<tr><td colspan='2'><b>💼 근무 정보</b></td></tr>")
        for key in ["employee_number", "employee_id", "work_years", "work_months", "years_of_service"]:
            if key in survey_data:
                korean_label = field_mapping.get(key, key)
                value = survey_data[key]
                html_rows.append(f"<tr><td><b>{korean_label}</b></td><td>{value}</td></tr>")

        # 설문별 특화 데이터
        if form_type == "001":
            html_rows.append("<tr><td colspan='2'><b>🦴 근골격계 관련 정보</b></td></tr>")
            specialized_fields = ["has_symptoms", "symptom_frequency", "symptom_severity", "work_posture", "repetitive_work", "heavy_lifting", "past_accident"]
        elif form_type == "002":
            html_rows.append("<tr><td colspan='2'><b>🏥 건강 관련 정보</b></td></tr>")
            specialized_fields = ["medical_history", "chronic_disease", "medication_use", "allergies", "smoking", "drinking"]
        else:
            specialized_fields = []

        for key in specialized_fields:
            if key in survey_data:
                korean_label = field_mapping.get(key, key)
                value = survey_data[key]

                # 복잡한 데이터 처리 (리스트, 딕셔너리 등)
                if isinstance(value, (list, dict)):
                    value = json.dumps(value, ensure_ascii=False, indent=2)
                elif isinstance(value, bool):
                    value = "예" if value else "아니오"

                html_rows.append(f"<tr><td><b>{korean_label}</b></td><td>{value}</td></tr>")

        # 추가 데이터 (data 필드 내부)
        if 'data' in survey_data and isinstance(survey_data['data'], dict):
            html_rows.append("<tr><td colspan='2'><b>📋 상세 응답 데이터</b></td></tr>")
            for key, value in survey_data['data'].items():
                korean_label = field_mapping.get(key, key)
                if isinstance(value, (list, dict)):
                    value = json.dumps(value, ensure_ascii=False, indent=2)
                elif isinstance(value, bool):
                    value = "예" if value else "아니오"
                html_rows.append(f"<tr><td><b>{korean_label}</b></td><td>{value}</td></tr>")

        # HTML 테이블 조립
        html_table = f"""
<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">
{''.join(html_rows)}
</table>
        """

        return html_table.strip()

    def _analyze_survey_risk(self, survey_data, form_type):
        """설문 데이터에서 위험도 분석"""
        risk_score = 0

        if form_type == "001":  # 근골격계
            # 증상 유무
            if survey_data.get('has_symptoms') is True:
                risk_score += 3

            # 과거 사고 이력
            if survey_data.get('past_accident') is True:
                risk_score += 2

            # data 필드 내 위험 요소 확인
            data = survey_data.get('data', {})
            if isinstance(data, dict):
                if data.get('has_symptoms') is True:
                    risk_score += 3
                if data.get('past_accident') is True:
                    risk_score += 2

        elif form_type == "002":  # 신규입사자
            # 만성질환
            if survey_data.get('chronic_disease'):
                risk_score += 2

            # 복용 약물
            if survey_data.get('medication_use'):
                risk_score += 1

        # 위험도 분류
        if risk_score >= 4:
            return "HIGH"
        elif risk_score >= 2:
            return "MEDIUM"
        else:
            return "LOW"

    def _get_color_by_risk(self, risk_level):
        """위험도별 색상 반환"""
        colors = {
            "HIGH": "danger",
            "MEDIUM": "warning",
            "LOW": "good"
        }
        return colors.get(risk_level, "good")

    def send_weekly_report(self, report_data):
        """주간 리포트 발송"""
        payload = {
            "channel": self.default_channel,
            "text": f"📊 SafeWork 주간 리포트 ({datetime.now().strftime('%Y년 %m월 %d일')})",
            "attachments": [
                {
                    "color": "#36a64f",
                    "title": "📈 SafeWork 주간 활동 요약",
                    "fields": [
                        {
                            "title": "📋 설문 응답",
                            "value": f"총 {report_data.get('total_surveys', 0)}건\n• 001 근골격계: {report_data.get('survey_001', 0)}건\n• 002 건강검진: {report_data.get('survey_002', 0)}건",
                            "short": True,
                        },
                        {
                            "title": "🏥 건강검진",
                            "value": f"완료: {report_data.get('health_checks_completed', 0)}건\n예정: {report_data.get('health_checks_scheduled', 0)}건",
                            "short": True,
                        },
                        {
                            "title": "💊 의약품 관리",
                            "value": f"재고 부족: {report_data.get('low_stock_medications', 0)}개\n만료 임박: {report_data.get('expiring_medications', 0)}개",
                            "short": True,
                        },
                        {
                            "title": "🚀 시스템 상태",
                            "value": f"가동률: {report_data.get('uptime_percentage', 99.9)}%\n배포 횟수: {report_data.get('deployments', 0)}회",
                            "short": True,
                        },
                    ],
                    "footer": "SafeWork 안전보건 관리시스템",
                    "ts": int(datetime.now().timestamp()),
                }
            ],
        }

        return self._send_to_slack(payload)

    def _send_to_slack(self, payload):
        """실제 Slack 전송 처리 - 우선순위: Webhook > OAuth Token > Bot Token"""

        # 1순위: Webhook 방식 (가장 안정적)
        if self.webhook_url:
            return self._send_via_webhook(payload)

        # 2순위: OAuth Token 방식
        if self.oauth_token:
            result = self._send_via_api(payload, self.oauth_token, "OAuth")
            if result:
                return True

        # 3순위: Bot Token 방식
        if self.bot_token:
            result = self._send_via_api(payload, self.bot_token, "Bot")
            if result:
                return True

        # 모든 방법 실패
        print("❌ 모든 Slack 전송 방법이 실패했습니다.")
        print("🔧 Slack Webhook URL 또는 적절한 권한을 가진 토큰이 필요합니다.")
        return False

    def _send_via_webhook(self, payload):
        """Webhook을 통한 Slack 전송"""
        try:
            response = requests.post(
                self.webhook_url,
                data=json.dumps(payload),
                headers={"Content-Type": "application/json"},
                timeout=10,
            )

            if response.status_code == 200:
                print(f"✅ Slack 웹훅 전송 성공: {payload.get('text', 'Unknown')}")
                return True
            else:
                print(f"❌ Slack 웹훅 전송 실패: {response.status_code} - {response.text}")
                return False

        except Exception as e:
            print(f"💥 Slack 웹훅 전송 오류: {str(e)}")
            return False

    def _send_via_api(self, payload, token, token_type):
        """API Token을 통한 Slack 전송"""
        try:
            response = requests.post(
                "https://slack.com/api/chat.postMessage",
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                timeout=10,
            )

            if response.status_code == 200:
                response_data = response.json()
                if response_data.get("ok"):
                    print(f"✅ Slack {token_type} API 전송 성공: {payload.get('text', 'Unknown')}")
                    return True
                else:
                    error_msg = response_data.get('error', 'Unknown error')
                    if error_msg == "missing_scope":
                        needed_scope = response_data.get('needed', 'Unknown')
                        print(f"⚠️ {token_type} 토큰 권한 부족: {needed_scope} 스코프 필요")
                    else:
                        print(f"❌ Slack {token_type} API 오류: {error_msg}")
                    return False
            else:
                print(f"❌ Slack {token_type} API HTTP 오류: {response.status_code}")
                return False

        except Exception as e:
            print(f"💥 Slack {token_type} API 전송 오류: {str(e)}")
            return False


# 전역 인스턴스
slack_notifier = SafeWorkSlackNotifier()


def send_slack_alert(message_type, title, details, priority="medium"):
    """편의 함수 - 간단한 Slack 알림 발송"""
    return slack_notifier.send_notification(message_type, title, details, priority)


def test_slack_integration():
    """Slack 통합 테스트 함수 - OAuth 토큰 및 #sadework 채널 검증"""
    test_data = {
        "name": "테스트 사용자",
        "department": "개발팀",
        "age": 30,
        "form_type": "001",
        "has_symptoms": True,
        "data": {
            "past_accident": True,
            "symptom_severity": "심함"
        }
    }

    print("🔧 Slack 통합 테스트 시작...")
    print(f"📱 사용 중인 토큰: {'OAuth' if slack_notifier.oauth_token else 'Bot' if slack_notifier.bot_token else 'Webhook'}")
    print(f"📺 대상 채널: {slack_notifier.default_channel}")

    # 테스트 알림 발송
    result = slack_notifier.send_survey_submission_with_raw_data(
        survey_id=9999,
        survey_data=test_data,
        form_type="001"
    )

    if result:
        print("✅ Slack 테스트 알림 전송 성공!")
        print("📱 #sadework 채널에서 알림을 확인해주세요.")
        return True
    else:
        print("❌ Slack 테스트 알림 전송 실패")
        print("🔍 로그를 확인하여 오류 원인을 파악해주세요.")
        return False
