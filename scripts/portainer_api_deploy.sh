#!/bin/bash

# SafeWork Portainer API 배포 스크립트 (안정화 버전)
# Version: 2.0.0
# Date: 2025-09-23

set -euo pipefail

# --- 📋 설정 ---
PORTAINER_URL="${PORTAINER_URL:-https://portainer.jclee.me}"
PORTAINER_TOKEN="${PORTAINER_TOKEN}"  # 환경 변수에서 설정 필요
ENDPOINT_ID="${ENDPOINT_ID:-3}"
STACK_NAME="${STACK_NAME:-safework}"
REGISTRY_URL="${REGISTRY_URL:-registry.jclee.me}"

# 보안 강화 모드 사용 시 secure_config.env 로드
if [ "${USE_SECURE_CONFIG:-}" = "true" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ -f "$SCRIPT_DIR/config/secure_config.env" ]; then
        source "$SCRIPT_DIR/config/secure_config.env"
        echo "보안 강화 설정 로드됨"
    fi
fi

# GitHub Actions 환경 감지
if [ -n "${GITHUB_ACTIONS:-}" ]; then
    echo "::group::Portainer API Deployment"
fi

# --- 🎨 색상 정의 ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- 로깅 함수 ---
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    if [ -n "${GITHUB_ACTIONS:-}" ]; then
        echo "::notice::$1"
    fi
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    if [ -n "${GITHUB_ACTIONS:-}" ]; then
        echo "::notice title=Success::$1"
    fi
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    if [ -n "${GITHUB_ACTIONS:-}" ]; then
        echo "::warning::$1"
    fi
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
    if [ -n "${GITHUB_ACTIONS:-}" ]; then
        echo "::error::$1"
    fi
}

# --- 필수 환경 변수 검증 ---
validate_environment() {
    local missing_vars=()

    if [ -z "${PORTAINER_TOKEN:-}" ]; then
        missing_vars+=("PORTAINER_TOKEN")
    fi

    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "다음 필수 환경 변수가 설정되지 않았습니다:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        log_error ""
        log_error "GitHub Actions에서는 secrets를 설정하고,"
        log_error "로컬에서는 다음과 같이 설정하세요:"
        log_error "  export PORTAINER_TOKEN='your-token-here'"
        exit 1
    fi

    log_info "환경 변수 검증 완료"
}

# 환경 변수 검증 실행
validate_environment

# --- Docker Compose 내용 ---
COMPOSE_CONTENT='version: "3.8"

services:
  safework-postgres:
    image: registry.jclee.me/safework/postgres:latest
    container_name: safework-postgres
    environment:
      - POSTGRES_DB=safework_db
      - POSTGRES_USER=safework
      - POSTGRES_PASSWORD=safework2024
      - TZ=Asia/Seoul
    volumes:
      - safework_postgres_data:/var/lib/postgresql/data
    networks:
      - safework_network
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        tag: "[safework-postgres-log] {{.Name}}"
        labels: "service=safework-postgres,env=production,component=database,stack=safework"

  safework-redis:
    image: registry.jclee.me/safework/redis:latest
    container_name: safework-redis
    environment:
      - TZ=Asia/Seoul
    volumes:
      - safework_redis_data:/data
    networks:
      - safework_network
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        tag: "[safework-redis-log] {{.Name}}"
        labels: "service=safework-redis,env=production,component=cache,stack=safework"

  safework-app:
    image: registry.jclee.me/safework/app:latest
    container_name: safework-app
    environment:
      - FLASK_CONFIG=production
      - TZ=Asia/Seoul
      - DB_HOST=safework-postgres
      - DB_PORT=5432
      - DB_NAME=safework_db
      - DB_USER=safework
      - DB_PASSWORD=safework2024
      - REDIS_HOST=safework-redis
      - REDIS_PORT=6379
      - SECRET_KEY=safework-production-secret-key-2024
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=safework2024
    ports:
      - "4545:4545"
    depends_on:
      - safework-postgres
      - safework-redis
    networks:
      - safework_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4545/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        tag: "[safework-app-log] {{.Name}}"
        labels: "service=safework-app,env=production,component=application,stack=safework"

volumes:
  safework_postgres_data:
    external: true
  safework_redis_data:
    external: true

networks:
  safework_network:
    external: true'

# --- 볼륨 생성 함수 ---
create_volume() {
    local volume_name=$1
    log_info "볼륨 확인: $volume_name"

    # 볼륨 존재 확인
    local volume_exists=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/volumes" | \
        jq -r --arg name "$volume_name" '.Volumes[]? | select(.Name == $name) | .Name')

    if [ -z "$volume_exists" ]; then
        log_info "볼륨 생성 중: $volume_name"
        curl -s -X POST \
            -H "X-API-Key: $PORTAINER_TOKEN" \
            -H "Content-Type: application/json" \
            "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/volumes/create" \
            -d "{\"Name\": \"$volume_name\"}" > /dev/null
        log_success "볼륨 생성 완료: $volume_name"
    else
        log_info "볼륨 이미 존재: $volume_name"
    fi
}

# --- 네트워크 생성 함수 ---
create_network() {
    local network_name=$1
    log_info "네트워크 확인: $network_name"

    # 네트워크 존재 확인 (중복 제거)
    local networks=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/networks" | \
        jq -r --arg name "$network_name" '[.[] | select(.Name == $name)] | length')

    if [ "$networks" -eq "0" ]; then
        log_info "네트워크 생성 중: $network_name"
        curl -s -X POST \
            -H "X-API-Key: $PORTAINER_TOKEN" \
            -H "Content-Type: application/json" \
            "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/networks/create" \
            -d "{\"Name\": \"$network_name\", \"Driver\": \"bridge\"}" > /dev/null
        log_success "네트워크 생성 완료: $network_name"
    elif [ "$networks" -gt "1" ]; then
        log_warning "중복 네트워크 발견 ($networks개), 정리 중..."
        # 중복 네트워크 제거 (첫 번째만 남김)
        curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
            "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/networks" | \
            jq -r --arg name "$network_name" '.[] | select(.Name == $name) | .Id' | \
            tail -n +2 | while read network_id; do
                curl -s -X DELETE \
                    -H "X-API-Key: $PORTAINER_TOKEN" \
                    "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/networks/$network_id" > /dev/null
            done
    else
        log_info "네트워크 이미 존재: $network_name"
    fi
}

# --- 스택 확인 함수 ---
check_stack() {
    local stack_info=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/stacks" | \
        jq -r --arg name "$STACK_NAME" '.[] | select(.Name == $name)')

    if [ -n "$stack_info" ]; then
        STACK_ID=$(echo "$stack_info" | jq -r '.Id')
        STACK_STATUS=$(echo "$stack_info" | jq -r '.Status')
        log_info "기존 스택 발견: ID=$STACK_ID, Status=$STACK_STATUS"
        return 0
    else
        log_info "기존 스택을 찾을 수 없습니다"
        return 1
    fi
}

# --- 스택 삭제 함수 ---
delete_stack() {
    local stack_id=$1
    log_warning "기존 스택 삭제 중: ID=$stack_id"

    local response=$(curl -s -w "\n%{http_code}" -X DELETE \
        -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/stacks/$stack_id?endpointId=$ENDPOINT_ID")

    local http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "204" ] || [ "$http_code" = "200" ]; then
        log_success "스택 삭제 완료"
        sleep 5
        return 0
    else
        log_error "스택 삭제 실패: HTTP $http_code"
        return 1
    fi
}

# --- 스택 생성 함수 ---
create_stack() {
    log_info "새 스택 생성 중: $STACK_NAME"

    local response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "X-API-Key: $PORTAINER_TOKEN" \
        -H "Content-Type: application/json" \
        "$PORTAINER_URL/api/stacks/create/standalone/string?endpointId=$ENDPOINT_ID" \
        -d "{
            \"name\": \"$STACK_NAME\",
            \"stackFileContent\": $(echo "$COMPOSE_CONTENT" | jq -Rs .)
        }")

    local http_code=$(echo "$response" | tail -n1)
    local response_body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        STACK_ID=$(echo "$response_body" | jq -r '.Id')
        log_success "스택 생성 완료: ID=$STACK_ID"
        return 0
    else
        log_error "스택 생성 실패: HTTP $http_code"
        echo "$response_body" | jq . 2>/dev/null || echo "$response_body"
        return 1
    fi
}

# --- 스택 업데이트 함수 ---
update_stack() {
    local stack_id=$1
    log_info "스택 업데이트 중: ID=$stack_id"

    # 먼저 현재 스택 정보 가져오기
    local stack_info=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/stacks/$stack_id")

    local env_vars=$(echo "$stack_info" | jq '.Env // []')

    local response=$(curl -s -w "\n%{http_code}" -X PUT \
        -H "X-API-Key: $PORTAINER_TOKEN" \
        -H "Content-Type: application/json" \
        "$PORTAINER_URL/api/stacks/$stack_id?endpointId=$ENDPOINT_ID" \
        -d "{
            \"stackFileContent\": $(echo "$COMPOSE_CONTENT" | jq -Rs .),
            \"env\": $env_vars,
            \"prune\": false,
            \"pullImage\": true
        }")

    local http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "200" ]; then
        log_success "스택 업데이트 완료"
        return 0
    else
        log_warning "스택 업데이트 실패, 재생성 시도..."
        return 1
    fi
}

# --- 헬스 체크 함수 ---
health_check() {
    log_info "헬스 체크 수행 중..."

    local max_attempts=10
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        log_info "헬스체크 시도 $attempt/$max_attempts..."

        # curl 실행
        local response
        response=$(curl -s -m 5 -w "\n%{http_code}" https://safework.jclee.me/health 2>/dev/null || echo "")

        if [ -n "$response" ]; then
            local http_code
            local body
            http_code=$(echo "$response" | tail -n1)
            body=$(echo "$response" | head -n -1)

            if [ "$http_code" = "200" ]; then
                local status
                status=$(echo "$body" | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
                if [ "$status" = "healthy" ]; then
                    log_success "✅ 헬스 체크 성공!"
                    echo "$body" | jq . 2>/dev/null || echo "$body"
                    return 0
                fi
                log_warning "Status: $status"
            else
                log_warning "HTTP $http_code"
            fi
        else
            log_warning "응답 없음"
        fi

        if [ $attempt -eq $max_attempts ]; then
            log_error "❌ 헬스 체크 실패 (최대 시도 횟수 초과)"
            return 1
        fi

        attempt=$((attempt + 1))
        sleep 5
    done
}

# --- 메인 배포 함수 ---
deploy() {
    log_info "========================================="
    log_info "   SafeWork API 배포 시작"
    log_info "========================================="

    # 1. 필수 리소스 생성
    create_volume "safework_postgres_data"
    create_volume "safework_redis_data"
    create_network "safework_network"

    # 2. 스택 확인 및 처리
    if check_stack; then
        # 업데이트 시도
        if ! update_stack "$STACK_ID"; then
            # 업데이트 실패 시 삭제 후 재생성
            delete_stack "$STACK_ID"
            create_stack
        fi
    else
        # 새 스택 생성
        create_stack
    fi

    # 3. 배포 대기
    log_info "컨테이너 시작 대기 중..."
    sleep 20

    # 4. 컨테이너 상태 확인
    log_info "컨테이너 상태 확인..."
    curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json" | \
        jq -r '.[] | select(.Names[] | contains("safework")) | "\(.Names[0]) - \(.State) (\(.Status))"'

    # 5. 헬스 체크
    if health_check; then
        log_success "========================================="
        log_success "   배포 완료!"
        log_success "   URL: https://safework.jclee.me"
        log_success "   Stack ID: $STACK_ID"
        log_success "========================================="

        [ -n "${GITHUB_ACTIONS:-}" ] && echo "::endgroup::"
        return 0
    else
        log_error "배포는 완료되었으나 헬스 체크 실패"
        [ -n "${GITHUB_ACTIONS:-}" ] && echo "::endgroup::"
        return 1
    fi
}

# --- 스크립트 실행 ---
if [ $# -eq 0 ]; then
    deploy
else
    case "$1" in
        deploy)
            deploy
            ;;
        check)
            check_stack && echo "Stack exists: ID=$STACK_ID"
            ;;
        health)
            health_check
            ;;
        *)
            echo "Usage: $0 {deploy|check|health}"
            exit 1
            ;;
    esac
fi