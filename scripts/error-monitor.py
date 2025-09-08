#!/usr/bin/env python3
"""
SafeWork Error Monitoring and GitHub Issue Auto-Creation System
실시간 에러 로그 모니터링 및 자동 GitHub 이슈 등록
"""

import os
import sys
import time
import json
import logging
import subprocess
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from pathlib import Path

# 설정
GITHUB_API_URL = "https://api.github.com"
GITHUB_REPO = os.getenv("GITHUB_REPO", "qws941/safework")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
ERROR_MONITORING_ENABLED = os.getenv("ERROR_MONITORING_ENABLED", "true").lower() == "true"

# 로그 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/error-monitor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class SafeWorkErrorMonitor:
    """SafeWork 에러 모니터링 클래스"""
    
    def __init__(self):
        self.github_headers = {
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json"
        }
        self.last_check_time = datetime.now() - timedelta(minutes=5)
        self.known_errors = set()
        self.error_patterns = {
            "database_connection": [
                "Connection refused",
                "mysql.*Connection.*failed",
                "Database connection error",
                "OperationalError.*MySQL",
                "Can't connect to MySQL server"
            ],
            "redis_connection": [
                "Redis.*ConnectionError",
                "Connection refused.*redis",
                "redis.*timeout",
                "Redis server connection failed"
            ],
            "application_error": [
                "Internal Server Error",
                "500 Internal Server Error",
                "Exception in",
                "Traceback",
                "CRITICAL.*Error"
            ],
            "survey_system": [
                "Survey.*error",
                "설문.*오류",
                "Form submission.*failed",
                "Invalid survey data"
            ],
            "authentication": [
                "Login.*failed",
                "Authentication.*error",
                "CSRF.*token.*invalid",
                "Unauthorized access"
            ]
        }
    
    def get_container_logs(self, container_name: str, since_time: str) -> List[str]:
        """컨테이너 로그 가져오기"""
        try:
            cmd = [
                "docker", "logs", container_name,
                "--since", since_time,
                "--timestamps"
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                return result.stdout.split('\n')
            else:
                logger.error(f"Failed to get logs from {container_name}: {result.stderr}")
                return []
        except subprocess.TimeoutExpired:
            logger.warning(f"Timeout getting logs from {container_name}")
            return []
        except Exception as e:
            logger.error(f"Error getting logs from {container_name}: {str(e)}")
            return []
    
    def analyze_error(self, log_line: str) -> Optional[Dict]:
        """로그 라인 분석 및 에러 분류"""
        for error_type, patterns in self.error_patterns.items():
            for pattern in patterns:
                if pattern.lower() in log_line.lower():
                    return {
                        "type": error_type,
                        "pattern": pattern,
                        "message": log_line.strip(),
                        "timestamp": datetime.now().isoformat()
                    }
        return None
    
    def create_github_issue(self, error_info: Dict, container_name: str) -> bool:
        """GitHub 이슈 자동 생성"""
        if not GITHUB_TOKEN:
            logger.warning("GitHub token not configured, skipping issue creation")
            return False
        
        # 이슈 제목 생성
        error_type = error_info["type"].replace("_", " ").title()
        title = f"🚨 [{container_name.upper()}] {error_type} - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        # 이슈 본문 생성
        body = f"""## 🚨 SafeWork 에러 자동 감지

### 에러 정보
- **컨테이너**: `{container_name}`
- **에러 타입**: `{error_info["type"]}`
- **발생 시간**: {error_info["timestamp"]}
- **패턴**: `{error_info["pattern"]}`

### 에러 메시지
```
{error_info["message"]}
```

### 추천 조치사항

"""
        
        # 에러 타입별 조치사항 추가
        if error_info["type"] == "database_connection":
            body += """
#### 데이터베이스 연결 오류
1. MySQL 컨테이너 상태 확인: `docker ps | grep mysql`
2. 네트워크 연결 확인: `docker network ls`
3. 데이터베이스 로그 확인: `docker logs safework-mysql --tail 50`
4. 연결 설정 검증: 환경변수 확인
"""
        elif error_info["type"] == "redis_connection":
            body += """
#### Redis 연결 오류
1. Redis 컨테이너 상태 확인: `docker ps | grep redis`
2. Redis 접속 테스트: `docker exec safework-redis redis-cli ping`
3. Redis 로그 확인: `docker logs safework-redis --tail 50`
"""
        elif error_info["type"] == "application_error":
            body += """
#### 애플리케이션 에러
1. Flask 로그 분석: 상세 에러 메시지 확인
2. Python 의존성 확인: requirements.txt 검증
3. 설정 파일 검증: config.py 및 환경변수
4. 메모리/CPU 사용량 확인
"""
        elif error_info["type"] == "survey_system":
            body += """
#### 설문 시스템 오류
1. 설문 데이터 구조 확인: JSON validation
2. 데이터베이스 스키마 검증: surveys 테이블
3. 프론트엔드 JavaScript 오류 확인
"""
        
        body += f"""

### 시스템 정보
- **모니터링 시간**: {datetime.now().isoformat()}
- **자동 생성**: SafeWork Error Monitor v1.0

---
*이 이슈는 SafeWork 에러 모니터링 시스템에 의해 자동으로 생성되었습니다.*
"""
        
        # GitHub API 요청
        issue_data = {
            "title": title,
            "body": body,
            "labels": ["🚨 auto-error", "bug", f"container-{container_name}", f"type-{error_info['type']}"]
        }
        
        try:
            url = f"{GITHUB_API_URL}/repos/{GITHUB_REPO}/issues"
            response = requests.post(url, headers=self.github_headers, json=issue_data)
            
            if response.status_code == 201:
                issue_url = response.json()["html_url"]
                logger.info(f"GitHub 이슈 생성 완료: {issue_url}")
                return True
            else:
                logger.error(f"GitHub 이슈 생성 실패: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"GitHub API 요청 오류: {str(e)}")
            return False
    
    def check_container_health(self, container_name: str) -> Dict:
        """컨테이너 헬스 체크"""
        try:
            cmd = ["docker", "inspect", container_name, "--format", "{{.State.Health.Status}}"]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                health_status = result.stdout.strip()
                return {"status": health_status, "healthy": health_status == "healthy"}
            else:
                return {"status": "unknown", "healthy": False}
                
        except Exception as e:
            logger.error(f"Health check failed for {container_name}: {str(e)}")
            return {"status": "error", "healthy": False}
    
    def monitor_containers(self):
        """컨테이너 모니터링 메인 루프"""
        containers = ["safework-app", "safework-mysql", "safework-redis"]
        
        while True:
            try:
                if not ERROR_MONITORING_ENABLED:
                    logger.info("Error monitoring is disabled")
                    time.sleep(60)
                    continue
                
                since_time = self.last_check_time.strftime("%Y-%m-%dT%H:%M:%S")
                current_time = datetime.now()
                
                for container in containers:
                    # 헬스 체크
                    health = self.check_container_health(container)
                    if not health["healthy"]:
                        logger.warning(f"{container} is not healthy: {health['status']}")
                    
                    # 로그 분석
                    logs = self.get_container_logs(container, since_time)
                    
                    for log_line in logs:
                        if not log_line.strip():
                            continue
                            
                        error_info = self.analyze_error(log_line)
                        if error_info:
                            error_key = f"{container}:{error_info['type']}:{hash(error_info['message'])}"
                            
                            # 중복 에러 방지 (1시간 내 같은 에러는 무시)
                            if error_key not in self.known_errors:
                                logger.warning(f"Error detected in {container}: {error_info['type']}")
                                
                                if self.create_github_issue(error_info, container):
                                    self.known_errors.add(error_key)
                                    
                                    # 1시간 후 재등록 가능하도록 스케줄링
                                    # (실제로는 별도 스레드나 Redis를 사용해 관리해야 함)
                
                self.last_check_time = current_time
                time.sleep(30)  # 30초마다 체크
                
            except KeyboardInterrupt:
                logger.info("Error monitoring stopped by user")
                break
            except Exception as e:
                logger.error(f"Error in monitoring loop: {str(e)}")
                time.sleep(60)

def main():
    """메인 함수"""
    if not ERROR_MONITORING_ENABLED:
        logger.info("Error monitoring is disabled via environment variable")
        return
    
    if not GITHUB_TOKEN:
        logger.warning("GITHUB_TOKEN not set, GitHub issue creation will be disabled")
    
    logger.info("Starting SafeWork Error Monitor...")
    logger.info(f"Monitoring repository: {GITHUB_REPO}")
    
    monitor = SafeWorkErrorMonitor()
    monitor.monitor_containers()

if __name__ == "__main__":
    main()