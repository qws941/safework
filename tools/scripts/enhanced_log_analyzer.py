#!/usr/bin/env python3
"""
SafeWork 고급 로그 분석 및 자동 복구 시스템
- 실시간 이상 감지
- 자동 알림 및 복구 조치
- 성능 메트릭 분석
- 트렌드 분석
"""

import os
import sys
import json
import time
import requests
import logging
import smtplib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import re
from collections import defaultdict, deque

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/tmp/safework_log_analyzer.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


class SafeWorkLogAnalyzer:
    """SafeWork 시스템 로그 분석 및 자동 복구"""

    # 에러 패턴 정의
    ERROR_PATTERNS = {
        'critical': [
            r'CRITICAL|FATAL|PANIC',
            r'500 Internal Server Error',
            r'Database connection failed',
            r'Redis connection failed',
            r'OutOfMemoryError|MemoryError',
            r'Connection refused',
            r'Segmentation fault'
        ],
        'high': [
            r'ERROR|Exception|Traceback',
            r'Failed to connect',
            r'Timeout|timeout',
            r'Permission denied',
            r'Authentication failed',
            r'404 Not Found',
            r'502 Bad Gateway|503 Service Unavailable'
        ],
        'medium': [
            r'WARNING|WARN',
            r'Deprecated|deprecat',
            r'Slow query',
            r'High CPU|High memory',
            r'Rate limit',
            r'Queue full'
        ]
    }

    # 자동 복구 조치
    RECOVERY_ACTIONS = {
        'database_connection': {
            'pattern': r'Database connection failed|OperationalError',
            'action': 'restart_database',
            'cooldown': 300  # 5분
        },
        'redis_connection': {
            'pattern': r'Redis connection failed|ConnectionError.*redis',
            'action': 'restart_redis',
            'cooldown': 180  # 3분
        },
        'app_crash': {
            'pattern': r'Worker failed to boot|gunicorn.errors.HaltServer',
            'action': 'restart_app',
            'cooldown': 120  # 2분
        },
        'high_memory': {
            'pattern': r'OutOfMemoryError|Memory usage.*9[0-9]%',
            'action': 'restart_container',
            'cooldown': 600  # 10분
        }
    }

    def __init__(self, config_file: str = None):
        """초기화"""
        self.config = self._load_config(config_file)
        self.portainer_url = self.config.get('portainer_url', 'https://portainer.jclee.me')
        self.api_key = self.config.get('portainer_api_key', os.environ.get('PORTAINER_API_KEY'))
        self.endpoint_id = self.config.get('endpoint_id', '3')

        # 알림 설정
        self.slack_webhook = self.config.get('slack_webhook')
        self.email_config = self.config.get('email', {})

        # 상태 추적
        self.last_recovery_times = defaultdict(float)
        self.error_counts = defaultdict(int)
        self.performance_metrics = deque(maxlen=100)  # 최근 100개 메트릭

        if not self.api_key:
            logger.error("Portainer API key not configured")
            sys.exit(1)

    def _load_config(self, config_file: str) -> Dict:
        """설정 파일 로드"""
        default_config = {
            'portainer_url': 'https://portainer.jclee.me',
            'endpoint_id': '3',
            'safework_containers': ['safework-app', 'safework-postgres', 'safework-redis'],
            'monitoring_interval': 60,  # 1분
            'alert_thresholds': {
                'error_rate': 10,  # 분당 에러 수
                'response_time': 5000,  # 5초
                'memory_usage': 85,  # 85%
                'cpu_usage': 80  # 80%
            }
        }

        if config_file and os.path.exists(config_file):
            try:
                with open(config_file, 'r') as f:
                    user_config = json.load(f)
                    default_config.update(user_config)
            except Exception as e:
                logger.warning(f"Failed to load config file: {e}")

        return default_config

    def get_container_logs(self, container_name: str, lines: int = 100) -> List[str]:
        """컨테이너 로그 조회"""
        try:
            # 컨테이너 ID 조회
            containers_url = f"{self.portainer_url}/api/endpoints/{self.endpoint_id}/docker/containers/json"
            headers = {'X-API-Key': self.api_key}

            response = requests.get(containers_url, headers=headers, timeout=10)
            response.raise_for_status()

            containers = response.json()
            container_id = None

            for container in containers:
                if any(container_name in name for name in container.get('Names', [])):
                    container_id = container['Id']
                    break

            if not container_id:
                logger.warning(f"Container {container_name} not found")
                return []

            # 로그 조회
            logs_url = f"{self.portainer_url}/api/endpoints/{self.endpoint_id}/docker/containers/{container_id}/logs"
            params = {
                'stdout': 'true',
                'stderr': 'true',
                'timestamps': 'true',
                'tail': str(lines)
            }

            response = requests.get(logs_url, headers=headers, params=params, timeout=15)
            response.raise_for_status()

            return response.text.split('\n') if response.text else []

        except Exception as e:
            logger.error(f"Failed to get logs for {container_name}: {e}")
            return []

    def analyze_error_patterns(self, logs: List[str]) -> Dict[str, List[str]]:
        """에러 패턴 분석"""
        categorized_errors = {
            'critical': [],
            'high': [],
            'medium': []
        }

        for line in logs:
            if not line.strip():
                continue

            for severity, patterns in self.ERROR_PATTERNS.items():
                for pattern in patterns:
                    if re.search(pattern, line, re.IGNORECASE):
                        categorized_errors[severity].append(line)
                        self.error_counts[severity] += 1
                        break

        return categorized_errors

    def check_recovery_triggers(self, logs: List[str]) -> List[str]:
        """자동 복구 트리거 확인"""
        triggered_actions = []
        current_time = time.time()

        for action_name, config in self.RECOVERY_ACTIONS.items():
            # 쿨다운 확인
            last_recovery = self.last_recovery_times.get(action_name, 0)
            if current_time - last_recovery < config['cooldown']:
                continue

            # 패턴 매칭
            pattern_found = False
            for line in logs:
                if re.search(config['pattern'], line, re.IGNORECASE):
                    pattern_found = True
                    break

            if pattern_found:
                triggered_actions.append(action_name)
                self.last_recovery_times[action_name] = current_time

        return triggered_actions

    def execute_recovery_action(self, action_name: str, container_name: str = None) -> bool:
        """자동 복구 조치 실행"""
        try:
            if action_name == 'restart_database':
                return self._restart_container('safework-postgres')
            elif action_name == 'restart_redis':
                return self._restart_container('safework-redis')
            elif action_name == 'restart_app':
                return self._restart_container('safework-app')
            elif action_name == 'restart_container' and container_name:
                return self._restart_container(container_name)
            else:
                logger.warning(f"Unknown recovery action: {action_name}")
                return False

        except Exception as e:
            logger.error(f"Failed to execute recovery action {action_name}: {e}")
            return False

    def _restart_container(self, container_name: str) -> bool:
        """컨테이너 재시작"""
        try:
            # 컨테이너 ID 조회
            containers_url = f"{self.portainer_url}/api/endpoints/{self.endpoint_id}/docker/containers/json"
            headers = {'X-API-Key': self.api_key}

            response = requests.get(containers_url, headers=headers, timeout=10)
            response.raise_for_status()

            containers = response.json()
            container_id = None

            for container in containers:
                if any(container_name in name for name in container.get('Names', [])):
                    container_id = container['Id']
                    break

            if not container_id:
                logger.error(f"Container {container_name} not found for restart")
                return False

            # 컨테이너 재시작
            restart_url = f"{self.portainer_url}/api/endpoints/{self.endpoint_id}/docker/containers/{container_id}/restart"
            response = requests.post(restart_url, headers=headers, timeout=30)
            response.raise_for_status()

            logger.info(f"Successfully restarted container: {container_name}")

            # 알림 발송
            self.send_alert(
                f"🔄 SafeWork Container Restart",
                f"Container {container_name} has been automatically restarted due to detected issues.",
                "warning"
            )

            return True

        except Exception as e:
            logger.error(f"Failed to restart container {container_name}: {e}")
            return False

    def get_performance_metrics(self) -> Dict:
        """성능 메트릭 수집"""
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'containers': {}
        }

        try:
            # 컨테이너 상태 조회
            containers_url = f"{self.portainer_url}/api/endpoints/{self.endpoint_id}/docker/containers/json"
            headers = {'X-API-Key': self.api_key}

            response = requests.get(containers_url, headers=headers, timeout=10)
            response.raise_for_status()

            containers = response.json()
            safework_containers = [c for c in containers
                                 if any('safework' in name for name in c.get('Names', []))]

            for container in safework_containers:
                container_name = container['Names'][0].lstrip('/')

                # 기본 상태 정보
                metrics['containers'][container_name] = {
                    'state': container['State'],
                    'status': container['Status'],
                    'created': container['Created']
                }

                # 상세 통계 (가능한 경우)
                try:
                    stats_url = f"{self.portainer_url}/api/endpoints/{self.endpoint_id}/docker/containers/{container['Id']}/stats"
                    stats_response = requests.get(stats_url, headers=headers, timeout=5,
                                                params={'stream': 'false'})
                    if stats_response.status_code == 200:
                        stats = stats_response.json()
                        metrics['containers'][container_name]['stats'] = stats
                except:
                    pass  # 통계를 가져올 수 없는 경우 무시

            # 애플리케이션 헬스 체크
            try:
                health_response = requests.get('https://safework.jclee.me/health', timeout=10)
                metrics['app_health'] = {
                    'status_code': health_response.status_code,
                    'response_time': health_response.elapsed.total_seconds(),
                    'content': health_response.json() if health_response.status_code == 200 else None
                }
            except Exception as e:
                metrics['app_health'] = {'error': str(e)}

            self.performance_metrics.append(metrics)
            return metrics

        except Exception as e:
            logger.error(f"Failed to collect performance metrics: {e}")
            return metrics

    def send_alert(self, title: str, message: str, severity: str = "info"):
        """알림 발송 (Slack, Email)"""
        # Slack 알림
        if self.slack_webhook:
            try:
                color_map = {
                    'critical': '#FF0000',
                    'high': '#FF6600',
                    'warning': '#FFAA00',
                    'info': '#00AA00'
                }

                slack_data = {
                    'attachments': [{
                        'color': color_map.get(severity, '#808080'),
                        'title': title,
                        'text': message,
                        'footer': 'SafeWork Log Analyzer',
                        'ts': int(time.time())
                    }]
                }

                response = requests.post(self.slack_webhook, json=slack_data, timeout=10)
                response.raise_for_status()
                logger.info("Slack alert sent successfully")

            except Exception as e:
                logger.error(f"Failed to send Slack alert: {e}")

        # Email 알림 (설정된 경우)
        if self.email_config.get('enabled'):
            try:
                self._send_email_alert(title, message, severity)
            except Exception as e:
                logger.error(f"Failed to send email alert: {e}")

    def _send_email_alert(self, title: str, message: str, severity: str):
        """이메일 알림 발송"""
        smtp_server = self.email_config.get('smtp_server')
        smtp_port = self.email_config.get('smtp_port', 587)
        username = self.email_config.get('username')
        password = self.email_config.get('password')
        recipients = self.email_config.get('recipients', [])

        if not all([smtp_server, username, password, recipients]):
            logger.warning("Email configuration incomplete")
            return

        msg = MimeMultipart()
        msg['From'] = username
        msg['To'] = ', '.join(recipients)
        msg['Subject'] = f"[SafeWork Alert - {severity.upper()}] {title}"

        body = f"""
SafeWork 시스템 알림

제목: {title}
심각도: {severity.upper()}
시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S KST')}

내용:
{message}

---
SafeWork Log Analyzer
https://safework.jclee.me
        """

        msg.attach(MIMEText(body, 'plain', 'utf-8'))

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(username, password)
            server.send_message(msg)

        logger.info(f"Email alert sent to {len(recipients)} recipients")

    def generate_analysis_report(self, time_range_hours: int = 1) -> Dict:
        """분석 보고서 생성"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'time_range_hours': time_range_hours,
            'containers_analyzed': [],
            'error_summary': defaultdict(int),
            'recovery_actions': [],
            'performance_summary': {},
            'recommendations': []
        }

        # 각 컨테이너 분석
        for container_name in self.config.get('safework_containers', []):
            logs = self.get_container_logs(container_name, 200)
            if not logs:
                continue

            report['containers_analyzed'].append(container_name)

            # 에러 분석
            errors = self.analyze_error_patterns(logs)
            for severity, error_list in errors.items():
                report['error_summary'][severity] += len(error_list)

            # 복구 조치 확인
            recovery_actions = self.check_recovery_triggers(logs)
            for action in recovery_actions:
                report['recovery_actions'].append({
                    'container': container_name,
                    'action': action,
                    'timestamp': datetime.now().isoformat()
                })

                # 실제 복구 조치 실행
                if self.config.get('auto_recovery_enabled', False):
                    success = self.execute_recovery_action(action, container_name)
                    if success:
                        logger.info(f"Executed recovery action {action} for {container_name}")

        # 성능 메트릭 수집
        current_metrics = self.get_performance_metrics()
        report['performance_summary'] = current_metrics

        # 권장사항 생성
        self._generate_recommendations(report)

        # 알림 발송 (심각한 문제가 있는 경우)
        if report['error_summary']['critical'] > 0:
            self.send_alert(
                "🚨 Critical Issues Detected",
                f"Found {report['error_summary']['critical']} critical errors. Check SafeWork system immediately.",
                "critical"
            )
        elif report['error_summary']['high'] > 5:
            self.send_alert(
                "⚠️ High Error Rate Detected",
                f"Found {report['error_summary']['high']} high-priority errors in the last hour.",
                "high"
            )

        return report

    def _generate_recommendations(self, report: Dict):
        """권장사항 생성"""
        recommendations = []

        # 에러율 기반 권장사항
        total_errors = sum(report['error_summary'].values())
        if total_errors > 20:
            recommendations.append("High error rate detected. Consider investigating root causes.")

        if report['error_summary']['critical'] > 0:
            recommendations.append("Critical errors found. Immediate attention required.")

        # 성능 기반 권장사항
        app_health = report['performance_summary'].get('app_health', {})
        if app_health.get('response_time', 0) > 3:
            recommendations.append("Application response time is high. Check server resources.")

        # 컨테이너 상태 기반 권장사항
        containers = report['performance_summary'].get('containers', {})
        for name, info in containers.items():
            if info['state'] != 'running':
                recommendations.append(f"Container {name} is not running. Check container status.")

        report['recommendations'] = recommendations

    def start_monitoring(self):
        """지속적 모니터링 시작"""
        logger.info("Starting SafeWork log monitoring...")
        interval = self.config.get('monitoring_interval', 60)

        try:
            while True:
                logger.info("Running log analysis cycle...")
                report = self.generate_analysis_report()

                # 보고서 저장
                report_file = f"/tmp/safework_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                with open(report_file, 'w', encoding='utf-8') as f:
                    json.dump(report, f, indent=2, ensure_ascii=False)

                logger.info(f"Analysis report saved to {report_file}")

                time.sleep(interval)

        except KeyboardInterrupt:
            logger.info("Monitoring stopped by user")
        except Exception as e:
            logger.error(f"Monitoring error: {e}")


def main():
    import argparse

    parser = argparse.ArgumentParser(description='SafeWork 고급 로그 분석 시스템')
    parser.add_argument('--config', help='설정 파일 경로')
    parser.add_argument('--monitor', action='store_true', help='지속적 모니터링 시작')
    parser.add_argument('--analyze', action='store_true', help='일회성 분석 실행')
    parser.add_argument('--container', help='특정 컨테이너 분석')

    args = parser.parse_args()

    analyzer = SafeWorkLogAnalyzer(args.config)

    if args.monitor:
        analyzer.start_monitoring()
    elif args.analyze:
        report = analyzer.generate_analysis_report()
        print(json.dumps(report, indent=2, ensure_ascii=False))
    elif args.container:
        logs = analyzer.get_container_logs(args.container)
        errors = analyzer.analyze_error_patterns(logs)
        print(f"Error analysis for {args.container}:")
        for severity, error_list in errors.items():
            print(f"  {severity}: {len(error_list)} errors")
            if error_list:
                print(f"  Latest: {error_list[-1]}")
    else:
        parser.print_help()


if __name__ == '__main__':
    main()