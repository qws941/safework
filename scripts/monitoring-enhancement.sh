#!/bin/bash

# SafeWork 시스템 안정화 및 모니터링 강화 스크립트
# Version: 1.0.0
# Date: 2025-09-23

set -euo pipefail

# --- 📋 설정 변수 ---
PORTAINER_URL="https://portainer.jclee.me"
PORTAINER_TOKEN="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
ENDPOINT_ID=3
SERVICE_URL="https://safework.jclee.me"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

# --- 📊 모니터링 지표 ---
declare -A METRICS=(
    [container_restarts]=0
    [health_check_failures]=0
    [response_time_ms]=0
    [memory_usage_mb]=0
    [cpu_usage_percent]=0
    [disk_usage_percent]=0
)

# --- 🎨 색상 정의 ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- 로깅 함수 ---
log_info() { echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"; }

# --- Slack 알림 ---
send_slack_alert() {
    local level=$1
    local message=$2
    local emoji=""

    case $level in
        "error") emoji="🚨" ;;
        "warning") emoji="⚠️" ;;
        "success") emoji="✅" ;;
        "info") emoji="ℹ️" ;;
    esac

    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -s -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\": \"$emoji SafeWork Alert: $message\"}" >/dev/null 2>&1
    fi
}

# --- 📈 컨테이너 상태 모니터링 ---
monitor_containers() {
    log_info "컨테이너 상태 모니터링 시작..."

    local response=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json")

    local safework_containers=$(echo "$response" | jq -r '.[] | select(.Names[] | contains("safework"))')

    echo "$safework_containers" | jq -r '.Names[0], .State, .Status' | while read -r name && read -r state && read -r status; do
        name=${name#/}

        # 재시작 횟수 확인
        local restart_count=$(echo "$safework_containers" | jq -r --arg name "/$name" \
            '.[] | select(.Names[] == $name) | .RestartCount // 0')

        if [ "$state" != "running" ]; then
            log_error "컨테이너 $name 상태 이상: $state"
            send_slack_alert "error" "Container $name is not running: $state"
            METRICS[health_check_failures]=$((METRICS[health_check_failures] + 1))
        else
            log_success "✅ $name - $state ($status) - 재시작: $restart_count회"
        fi

        if [ "$restart_count" -gt 5 ]; then
            log_warning "컨테이너 $name 재시작 횟수 과다: $restart_count회"
            send_slack_alert "warning" "Container $name has restarted $restart_count times"
        fi
    done
}

# --- 🏥 헬스체크 강화 ---
enhanced_health_check() {
    log_info "강화된 헬스체크 시작..."

    # 1. HTTP 응답 시간 측정
    local start_time=$(date +%s%N)
    local health_response=$(curl -s -w "\n%{http_code}" "$SERVICE_URL/health" 2>/dev/null || echo "000")
    local end_time=$(date +%s%N)

    local http_code=$(echo "$health_response" | tail -n1)
    local response_body=$(echo "$health_response" | head -n-1)
    local response_time=$(( (end_time - start_time) / 1000000 )) # ms 단위

    METRICS[response_time_ms]=$response_time

    if [ "$http_code" = "200" ]; then
        local status=$(echo "$response_body" | jq -r '.status // "unknown"' 2>/dev/null)
        if [ "$status" = "healthy" ]; then
            log_success "✅ 서비스 헬스체크 성공 (응답시간: ${response_time}ms)"
        else
            log_warning "서비스 상태 이상: $status"
            METRICS[health_check_failures]=$((METRICS[health_check_failures] + 1))
        fi
    else
        log_error "❌ 서비스 헬스체크 실패 (HTTP $http_code)"
        send_slack_alert "error" "Health check failed with HTTP $http_code"
        METRICS[health_check_failures]=$((METRICS[health_check_failures] + 1))
    fi

    # 2. 데이터베이스 연결 확인
    check_database_connection

    # 3. Redis 연결 확인
    check_redis_connection
}

# --- 🗄️ 데이터베이스 연결 체크 ---
check_database_connection() {
    log_info "PostgreSQL 연결 확인..."

    local db_check=$(docker exec safework-postgres psql -U safework -d safework_db -c "SELECT 1;" 2>&1)
    if echo "$db_check" | grep -q "1"; then
        log_success "✅ PostgreSQL 연결 정상"
    else
        log_error "❌ PostgreSQL 연결 실패"
        send_slack_alert "error" "PostgreSQL connection failed"
        METRICS[health_check_failures]=$((METRICS[health_check_failures] + 1))
    fi
}

# --- 💾 Redis 연결 체크 ---
check_redis_connection() {
    log_info "Redis 연결 확인..."

    local redis_check=$(docker exec safework-redis redis-cli ping 2>&1)
    if [ "$redis_check" = "PONG" ]; then
        log_success "✅ Redis 연결 정상"
    else
        log_error "❌ Redis 연결 실패"
        send_slack_alert "error" "Redis connection failed"
        METRICS[health_check_failures]=$((METRICS[health_check_failures] + 1))
    fi
}

# --- 📊 리소스 사용량 모니터링 ---
monitor_resources() {
    log_info "리소스 사용량 모니터링..."

    # 컨테이너별 리소스 사용량
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep safework || true

    # 디스크 사용량
    local disk_usage=$(df -h /var/lib/docker | awk 'NR==2 {print $5}' | tr -d '%')
    METRICS[disk_usage_percent]=$disk_usage

    if [ "$disk_usage" -gt 80 ]; then
        log_warning "디스크 사용량 경고: $disk_usage%"
        send_slack_alert "warning" "Disk usage is high: $disk_usage%"
    fi
}

# --- 🔄 자동 복구 메커니즘 ---
auto_recovery() {
    log_info "자동 복구 체크..."

    if [ "${METRICS[health_check_failures]}" -gt 3 ]; then
        log_warning "헬스체크 실패 누적: ${METRICS[health_check_failures]}회"
        log_info "자동 복구 시작..."

        # 스택 재시작
        curl -s -X POST \
            -H "X-API-Key: $PORTAINER_TOKEN" \
            "$PORTAINER_URL/api/stacks/96/restart?endpointId=$ENDPOINT_ID" \
            >/dev/null 2>&1

        send_slack_alert "warning" "Auto-recovery triggered due to health check failures"

        # 30초 대기 후 재확인
        sleep 30
        enhanced_health_check
    fi
}

# --- 📈 모니터링 리포트 생성 ---
generate_report() {
    log_info "모니터링 리포트 생성..."

    cat <<EOF

========================================
    SafeWork 시스템 안정성 리포트
========================================
시간: $(date '+%Y-%m-%d %H:%M:%S')
----------------------------------------
📊 시스템 지표:
  - 헬스체크 실패: ${METRICS[health_check_failures]}회
  - 응답 시간: ${METRICS[response_time_ms]}ms
  - 디스크 사용률: ${METRICS[disk_usage_percent]}%
  - 컨테이너 재시작: ${METRICS[container_restarts]}회
----------------------------------------
🔗 서비스 URL: $SERVICE_URL
📦 Stack ID: 96
🖥️ Endpoint: $ENDPOINT_ID
========================================

EOF
}

# --- 🚀 메인 실행 ---
main() {
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}   SafeWork 시스템 안정화 모니터링${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"

    # 연속 모니터링 모드
    if [ "${1:-}" = "watch" ]; then
        while true; do
            monitor_containers
            enhanced_health_check
            monitor_resources
            auto_recovery
            generate_report

            log_info "다음 체크까지 60초 대기..."
            sleep 60
        done
    else
        # 단일 실행
        monitor_containers
        enhanced_health_check
        monitor_resources
        auto_recovery
        generate_report
    fi

    # 최종 상태 평가
    if [ "${METRICS[health_check_failures]}" -eq 0 ]; then
        log_success "✅ 시스템 완전 정상 상태"
        exit 0
    else
        log_warning "⚠️ 일부 문제 감지됨"
        exit 1
    fi
}

# 스크립트 실행
main "$@"