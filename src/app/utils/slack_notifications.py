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


class SafeWorkSlackNotifier:
    def __init__(self, webhook_url=None):
        self.webhook_url = webhook_url or os.environ.get('SLACK_WEBHOOK_URL')
    
    def send_notification(self, message_type, title, details, priority='medium', channel=None):
        """SafeWork 특화 Slack 알림 발송"""
        if not self.webhook_url:
            current_app.logger.warning("Slack webhook URL not configured")
            return False
        
        # 메시지 타입별 이모지와 색상
        type_config = {
            'medication_shortage': {'emoji': '💊', 'color': 'danger', 'channel': '#safework-alerts'},
            'health_check_due': {'emoji': '🏥', 'color': 'warning', 'channel': '#safework-health'},
            'system_error': {'emoji': '🚨', 'color': 'danger', 'channel': '#safework-alerts'},
            'survey_completed': {'emoji': '📋', 'color': 'good', 'channel': '#safework-surveys'},
            'deployment': {'emoji': '🚀', 'color': 'good', 'channel': '#safework-dev'},
            'security_alert': {'emoji': '🔒', 'color': 'danger', 'channel': '#safework-security'}
        }
        
        config = type_config.get(message_type, {'emoji': 'ℹ️', 'color': 'good', 'channel': '#safework-general'})
        
        # 우선순위별 색상 오버라이드
        priority_colors = {
            'critical': 'danger',
            'high': 'warning', 
            'medium': 'good',
            'low': '#36a64f'
        }
        
        color = priority_colors.get(priority, config['color'])
        target_channel = channel or config['channel']
        
        payload = {
            'channel': target_channel,
            'text': f"{config['emoji']} SafeWork 알림: {title}",
            'attachments': [{
                'color': color,
                'title': f"{config['emoji']} {title}",
                'fields': [],
                'footer': 'SafeWork 안전보건 관리시스템',
                'footer_icon': 'https://safework.jclee.me/static/favicon.ico',
                'ts': int(datetime.now().timestamp())
            }]
        }
        
        # 세부 정보 추가
        if isinstance(details, dict):
            for key, value in details.items():
                payload['attachments'][0]['fields'].append({
                    'title': key,
                    'value': str(value),
                    'short': len(str(value)) < 30
                })
        else:
            payload['attachments'][0]['text'] = str(details)
        
        # 시스템 링크 추가
        payload['attachments'][0]['fields'].append({
            'title': '시스템 접속',
            'value': '<https://safework.jclee.me|SafeWork 시스템> | <https://safework.jclee.me/health|상태 확인>',
            'short': False
        })
        
        # 긴급한 경우 추가 블록
        if priority == 'critical':
            payload['blocks'] = [{
                'type': 'section',
                'text': {
                    'type': 'mrkdwn',
                    'text': f'🚨 *긴급 대응 필요* 🚨\n담당팀 즉시 확인 바랍니다.'
                }
            }]
        
        return self._send_to_slack(payload)
    
    def send_medication_alert(self, medication_name, current_stock, minimum_stock):
        """의약품 재고 부족 알림"""
        return self.send_notification(
            'medication_shortage',
            '의약품 재고 부족',
            {
                '의약품명': medication_name,
                '현재 재고': f'{current_stock}개',
                '최소 재고': f'{minimum_stock}개',
                '부족량': f'{minimum_stock - current_stock}개',
                '상태': '즉시 보충 필요'
            },
            priority='high'
        )
    
    def send_health_check_reminder(self, worker_name, due_date, days_until):
        """건강검진 임박 알림"""
        priority = 'critical' if days_until <= 3 else 'high' if days_until <= 7 else 'medium'
        
        return self.send_notification(
            'health_check_due',
            '건강검진 일정 임박',
            {
                '대상자': worker_name,
                '검진 예정일': due_date,
                '남은 기간': f'{days_until}일',
                '상태': '일정 확인 필요' if days_until > 3 else '긴급 확인 필요'
            },
            priority=priority
        )
    
    def send_survey_completion_summary(self, survey_type, completed_count, total_responses_today):
        """설문 완료 요약 알림"""
        return self.send_notification(
            'survey_completed',
            f'{survey_type} 설문 완료 알림',
            {
                '설문 종류': survey_type,
                '금일 완료': f'{completed_count}건',
                '전체 응답': f'{total_responses_today}건',
                '완료율': f'{(completed_count/total_responses_today*100):.1f}%' if total_responses_today > 0 else '0%'
            },
            priority='low'
        )
    
    def send_system_error(self, error_type, error_message, stack_trace=None):
        """시스템 에러 알림"""
        details = {
            '에러 타입': error_type,
            '에러 메시지': error_message,
            '발생 시간': datetime.now().strftime('%Y-%m-%d %H:%M:%S KST'),
            '서버': 'SafeWork Production'
        }
        
        if stack_trace:
            details['스택 트레이스'] = stack_trace[:200] + '...' if len(stack_trace) > 200 else stack_trace
        
        return self.send_notification(
            'system_error',
            '시스템 오류 발생',
            details,
            priority='critical'
        )
    
    def send_deployment_notification(self, version, status, deploy_time=None):
        """배포 알림"""
        return self.send_notification(
            'deployment',
            f'SafeWork 배포 {status}',
            {
                '버전': version,
                '상태': status,
                '배포 시간': deploy_time or datetime.now().strftime('%Y-%m-%d %H:%M:%S KST'),
                '환경': 'Production'
            },
            priority='medium' if status == '완료' else 'high'
        )
    
    def send_weekly_report(self, report_data):
        """주간 리포트 발송"""
        payload = {
            'channel': '#safework-weekly',
            'text': f"📊 SafeWork 주간 리포트 ({datetime.now().strftime('%Y년 %m월 %d일')})",
            'attachments': [{
                'color': '#36a64f',
                'title': '📈 SafeWork 주간 활동 요약',
                'fields': [
                    {
                        'title': '📋 설문 응답',
                        'value': f"총 {report_data.get('total_surveys', 0)}건\n• 001 근골격계: {report_data.get('survey_001', 0)}건\n• 002 건강검진: {report_data.get('survey_002', 0)}건",
                        'short': True
                    },
                    {
                        'title': '🏥 건강검진',
                        'value': f"완료: {report_data.get('health_checks_completed', 0)}건\n예정: {report_data.get('health_checks_scheduled', 0)}건",
                        'short': True
                    },
                    {
                        'title': '💊 의약품 관리',
                        'value': f"재고 부족: {report_data.get('low_stock_medications', 0)}개\n만료 임박: {report_data.get('expiring_medications', 0)}개",
                        'short': True
                    },
                    {
                        'title': '🚀 시스템 상태',
                        'value': f"가동률: {report_data.get('uptime_percentage', 99.9)}%\n배포 횟수: {report_data.get('deployments', 0)}회",
                        'short': True
                    }
                ],
                'footer': 'SafeWork 안전보건 관리시스템',
                'ts': int(datetime.now().timestamp())
            }]
        }
        
        return self._send_to_slack(payload)
    
    def _send_to_slack(self, payload):
        """실제 Slack 전송 처리"""
        try:
            response = requests.post(
                self.webhook_url,
                data=json.dumps(payload),
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                current_app.logger.info(f"Slack notification sent successfully: {payload.get('text', 'Unknown')}")
                return True
            else:
                current_app.logger.error(f"Failed to send Slack notification: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            current_app.logger.error(f"Error sending Slack notification: {str(e)}")
            return False


# 전역 인스턴스
slack_notifier = SafeWorkSlackNotifier()


def send_slack_alert(message_type, title, details, priority='medium'):
    """편의 함수 - 간단한 Slack 알림 발송"""
    return slack_notifier.send_notification(message_type, title, details, priority)