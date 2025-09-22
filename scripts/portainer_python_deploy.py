#!/usr/bin/env python3
"""
SafeWork Portainer Python 배포 스크립트
환경변수 기반 자동 배포 시스템
"""

import requests
import json
import os
import sys
import time
from datetime import datetime

# --- 📜 SafeWork 설정 변수 ---
# Portainer 접속 정보 (기존 설정 파일에서 가져오기)
PORTAINER_URL = os.getenv("PORTAINER_URL", "https://portainer.jclee.me")
PORTAINER_TOKEN = os.getenv("PORTAINER_TOKEN", "ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=")

# SafeWork 배포 대상 정보
ENDPOINT_ID = int(os.getenv("ENDPOINT_PRODUCTION", "3"))  # Production endpoint
STACK_NAME = os.getenv("STACK_NAME", "safework")

# 데이터베이스 설정
DB_PASSWORD = os.getenv("DB_PASSWORD", "safework2024")
DB_NAME = os.getenv("DB_NAME", "safework_db")
DB_USER = os.getenv("DB_USER", "safework")

# 애플리케이션 설정
SECRET_KEY = os.getenv("SECRET_KEY", "safework-production-secret-key-2024")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "safework2024")

# SSL 인증서 검증 설정
VERIFY_SSL = True

# SafeWork docker-compose.yml 템플릿
STACK_FILE_CONTENT = f"""
version: '3.8'

services:
  safework-app:
    image: registry.jclee.me/safework/app:latest
    container_name: safework-app
    ports:
      - "4545:4545"
    environment:
      - TZ=Asia/Seoul
      - DB_HOST=safework-postgres
      - DB_NAME={DB_NAME}
      - DB_USER={DB_USER}
      - DB_PASSWORD={DB_PASSWORD}
      - REDIS_HOST=safework-redis
      - SECRET_KEY={SECRET_KEY}
      - ADMIN_USERNAME={ADMIN_USERNAME}
      - ADMIN_PASSWORD={ADMIN_PASSWORD}
      - FLASK_CONFIG=production
    depends_on:
      - safework-postgres
      - safework-redis
    restart: unless-stopped
    networks:
      - safework_network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        tag: "[safework-app-log] {{{{.Name}}}}"
        labels: "service=safework-app,env=production,component=application,stack=safework"

  safework-postgres:
    image: registry.jclee.me/safework/postgres:latest
    container_name: safework-postgres
    ports:
      - "4546:5432"
    environment:
      - TZ=Asia/Seoul
      - POSTGRES_DB={DB_NAME}
      - POSTGRES_USER={DB_USER}
      - POSTGRES_PASSWORD={DB_PASSWORD}
    volumes:
      - safework_postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    networks:
      - safework_network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        tag: "[safework-postgres-log] {{{{.Name}}}}"
        labels: "service=safework-postgres,env=production,component=database,stack=safework"

  safework-redis:
    image: registry.jclee.me/safework/redis:latest
    container_name: safework-redis
    ports:
      - "4547:6379"
    environment:
      - TZ=Asia/Seoul
    volumes:
      - safework_redis_data:/data
    restart: unless-stopped
    networks:
      - safework_network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        tag: "[safework-redis-log] {{{{.Name}}}}"
        labels: "service=safework-redis,env=production,component=database,stack=safework"

volumes:
  safework_postgres_data:
    external: true
  safework_redis_data:
    external: true

networks:
  safework_network:
    external: true
"""

# --- 로깅 함수 ---
def log_info(message):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"\\033[0;34m[{timestamp}] [INFO]\\033[0m {message}")

def log_success(message):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"\\033[0;32m[{timestamp}] [SUCCESS]\\033[0m {message}")

def log_error(message):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"\\033[0;31m[{timestamp}] [ERROR]\\033[0m {message}")

def log_warning(message):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"\\033[1;33m[{timestamp}] [WARNING]\\033[0m {message}")

# --- API 요청 함수들 ---
def test_portainer_connection():
    """Portainer API 연결 테스트"""
    try:
        status_url = f"{PORTAINER_URL}/api/status"
        headers = {"X-API-Key": PORTAINER_TOKEN}
        response = requests.get(status_url, headers=headers, verify=VERIFY_SSL, timeout=10)
        response.raise_for_status()
        log_success("Portainer API 연결 성공")
        return True
    except requests.exceptions.RequestException as e:
        log_error(f"Portainer API 연결 실패: {e}")
        return False

def get_existing_stack():
    """기존 스택 조회"""
    try:
        stacks_url = f"{PORTAINER_URL}/api/stacks"
        headers = {"X-API-Key": PORTAINER_TOKEN}
        response = requests.get(stacks_url, headers=headers, verify=VERIFY_SSL)
        response.raise_for_status()

        # SafeWork 스택 찾기
        for stack in response.json():
            if stack.get('Name') == STACK_NAME and stack.get('EndpointId') == ENDPOINT_ID:
                return stack
        return None
    except requests.exceptions.RequestException as e:
        log_error(f"기존 스택 조회 실패: {e}")
        return None

def create_stack():
    """새 스택 생성"""
    log_info(f"새 스택 '{STACK_NAME}' 생성 중...")

    create_url = f"{PORTAINER_URL}/api/stacks/create/standalone/string"
    headers = {
        "X-API-Key": PORTAINER_TOKEN,
        "Content-Type": "application/json"
    }

    payload = {
        "name": STACK_NAME,
        "stackFileContent": STACK_FILE_CONTENT,
        "endpointId": ENDPOINT_ID
    }

    try:
        response = requests.post(
            f"{create_url}?endpointId={ENDPOINT_ID}",
            headers=headers,
            json=payload,
            verify=VERIFY_SSL
        )
        response.raise_for_status()
        log_success("✅ 스택이 성공적으로 생성되었습니다")
        return True
    except requests.exceptions.RequestException as e:
        log_error(f"❌ 스택 생성 실패: {e}")
        if hasattr(e, 'response') and e.response:
            log_error(f"응답 내용: {e.response.text}")
        return False

def update_stack(stack_id):
    """기존 스택 업데이트"""
    log_info(f"스택 '{STACK_NAME}' (ID: {stack_id}) 업데이트 중...")

    update_url = f"{PORTAINER_URL}/api/stacks/{stack_id}"
    headers = {
        "X-API-Key": PORTAINER_TOKEN,
        "Content-Type": "application/json"
    }

    payload = {
        "StackFileContent": STACK_FILE_CONTENT,
        "PullImage": True,
        "Prune": False
    }

    try:
        response = requests.put(
            f"{update_url}?endpointId={ENDPOINT_ID}",
            headers=headers,
            json=payload,
            verify=VERIFY_SSL
        )
        response.raise_for_status()
        log_success("✅ 스택이 성공적으로 업데이트되었습니다")
        return True
    except requests.exceptions.RequestException as e:
        log_error(f"❌ 스택 업데이트 실패: {e}")
        if hasattr(e, 'response') and e.response:
            log_error(f"응답 내용: {e.response.text}")
        return False

def check_container_status():
    """컨테이너 상태 확인"""
    log_info("컨테이너 상태 확인 중...")

    try:
        containers_url = f"{PORTAINER_URL}/api/endpoints/{ENDPOINT_ID}/docker/containers/json"
        headers = {"X-API-Key": PORTAINER_TOKEN}
        response = requests.get(containers_url, headers=headers, verify=VERIFY_SSL)
        response.raise_for_status()

        safework_containers = []
        for container in response.json():
            for name in container.get('Names', []):
                if 'safework' in name:
                    safework_containers.append({
                        'name': name.lstrip('/'),
                        'state': container.get('State'),
                        'status': container.get('Status')
                    })

        log_info("SafeWork 컨테이너 상태:")
        for container in safework_containers:
            status_emoji = "✅" if container['state'] == 'running' else "❌"
            print(f"  {status_emoji} {container['name']} - {container['state']} ({container['status']})")

        running_count = sum(1 for c in safework_containers if c['state'] == 'running')
        if running_count >= 3:
            log_success(f"모든 SafeWork 컨테이너가 정상 실행 중입니다 ({running_count}/3)")
            return True
        else:
            log_warning(f"일부 컨테이너가 실행되지 않고 있습니다 ({running_count}/3)")
            return False

    except requests.exceptions.RequestException as e:
        log_error(f"컨테이너 상태 확인 실패: {e}")
        return False

def verify_service():
    """서비스 헬스 체크"""
    log_info("서비스 헬스 체크 시작...")

    service_url = "https://safework.jclee.me/health"
    max_attempts = 10

    for attempt in range(1, max_attempts + 1):
        log_info(f"헬스 체크 시도 {attempt}/{max_attempts}")

        try:
            response = requests.get(service_url, timeout=10)
            if response.status_code == 200:
                try:
                    health_data = response.json()
                    if health_data.get('status') == 'healthy':
                        log_success("✅ 서비스 헬스 체크 성공!")
                        print(json.dumps(health_data, indent=2, ensure_ascii=False))
                        return True
                except json.JSONDecodeError:
                    pass
        except requests.exceptions.RequestException:
            pass

        if attempt < max_attempts:
            log_info("⏳ 5초 후 재시도...")
            time.sleep(5)

    log_error("❌ 서비스 헬스 체크 실패")
    return False

# --- 🚀 메인 배포 로직 ---
def deploy_safework():
    """SafeWork 배포 메인 함수"""
    print("\\033[0;36m")
    print("=" * 80)
    print("      SafeWork Portainer Python 배포 시스템 v1.0.0")
    print("=" * 80)
    print("\\033[0m")

    # 1. Portainer 연결 테스트
    log_info("1/5: Portainer API 연결 테스트...")
    if not test_portainer_connection():
        log_error("Portainer 연결 실패. 배포를 중단합니다.")
        return False

    # 2. 기존 스택 확인
    log_info("2/5: 기존 스택 확인...")
    existing_stack = get_existing_stack()

    # 3. 스택 배포
    log_info("3/5: 스택 배포...")
    if existing_stack:
        stack_id = existing_stack.get('Id')
        log_info(f"기존 스택 발견 (ID: {stack_id}). 업데이트를 진행합니다.")
        if not update_stack(stack_id):
            return False
    else:
        log_info("기존 스택을 찾을 수 없습니다. 새 스택을 생성합니다.")
        if not create_stack():
            return False

    # 4. 컨테이너 상태 확인 (잠시 대기 후)
    log_info("4/5: 컨테이너 상태 확인...")
    time.sleep(15)  # 컨테이너 시작 대기
    check_container_status()

    # 5. 서비스 검증
    log_info("5/5: 서비스 검증...")
    if verify_service():
        log_success("🎉 SafeWork 배포가 성공적으로 완료되었습니다!")
        log_success("🌐 서비스 URL: https://safework.jclee.me")
        return True
    else:
        log_error("서비스 검증 실패")
        return False

def show_config():
    """현재 설정 표시"""
    print("\\033[1;33m현재 배포 설정:\\033[0m")
    print(f"  Portainer URL: {PORTAINER_URL}")
    print(f"  Endpoint ID: {ENDPOINT_ID}")
    print(f"  Stack Name: {STACK_NAME}")
    print(f"  Database: {DB_NAME} (user: {DB_USER})")
    print(f"  Admin User: {ADMIN_USERNAME}")
    print("")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command == "config":
            show_config()
        elif command == "test":
            test_portainer_connection()
        elif command == "status":
            check_container_status()
        elif command == "health":
            verify_service()
        elif command == "deploy":
            deploy_safework()
        else:
            print("사용법: python portainer_python_deploy.py [deploy|config|test|status|health]")
    else:
        deploy_safework()