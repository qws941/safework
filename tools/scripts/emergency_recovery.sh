#!/bin/bash

# SafeWork 긴급 복구 스크립트
# 서비스 중단 시 즉시 실행하는 자동 복구 시스템

set -e

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 파일
LOG_FILE="/tmp/safework_emergency_recovery_$(date +%Y%m%d_%H%M%S).log"

# 설정
PORTAINER_URL="https://portainer.jclee.me"
PORTAINER_TOKEN="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
ENDPOINT_ID="3"
SAFEWORK_URL="https://safework.jclee.me"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"

# 로그 함수
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() {
    log "INFO" "$*"
    echo -e "${BLUE}ℹ️  $*${NC}"
}

log_warn() {
    log "WARN" "$*"
    echo -e "${YELLOW}⚠️  $*${NC}"
}

log_error() {
    log "ERROR" "$*"
    echo -e "${RED}❌ $*${NC}"
}

log_success() {
    log "SUCCESS" "$*"
    echo -e "${GREEN}✅ $*${NC}"
}

# Slack 알림
send_slack_alert() {
    local title="$1"
    local message="$2"
    local color="${3:-#FF0000}"

    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"🚨 SafeWork Emergency Recovery\",
                    \"fields\": [{
                        \"title\": \"$title\",
                        \"value\": \"$message\",
                        \"short\": false
                    }],
                    \"footer\": \"SafeWork Emergency Recovery System\",
                    \"ts\": $(date +%s)
                }]
            }" >/dev/null 2>&1
    fi
}

# 헤더 출력
print_header() {
    echo -e "${RED}"
    echo "🚨 ======================================================"
    echo "   SafeWork 긴급 복구 시스템"
    echo "   Emergency Recovery System"
    echo "====================================================== 🚨"
    echo -e "${NC}"
    echo "시작 시간: $(date '+%Y-%m-%d %H:%M:%S KST')"
    echo "로그 파일: $LOG_FILE"
    echo ""
}

# 시스템 상태 확인
check_system_status() {
    log_info "시스템 상태 확인 중..."

    # 웹사이트 접근성 확인
    local http_status
    http_status=$(curl -s -o /dev/null -w "%{http_code}" "$SAFEWORK_URL/health" --connect-timeout 10 || echo "000")

    if [ "$http_status" = "200" ]; then
        log_success "웹사이트 접근 가능 (HTTP $http_status)"
        return 0
    else
        log_error "웹사이트 접근 불가 (HTTP $http_status)"
        return 1
    fi
}

# 컨테이너 상태 확인
check_containers() {
    log_info "컨테이너 상태 확인 중..."

    local containers_json
    containers_json=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json" || echo "[]")

    if [ "$containers_json" = "[]" ]; then
        log_error "Portainer API 연결 실패"
        return 1
    fi

    local container_count
    container_count=$(echo "$containers_json" | jq -r '.[] | select(.Names[0] | contains("safework")) | .Names[0]' | wc -l)

    if [ "$container_count" -eq 0 ]; then
        log_error "SafeWork 컨테이너를 찾을 수 없음"
        return 1
    fi

    log_info "발견된 SafeWork 컨테이너: $container_count개"

    # 각 컨테이너 상태 확인
    local all_running=true
    echo "$containers_json" | jq -r '.[] | select(.Names[0] | contains("safework")) | .Names[0] + ":" + .State' | while read -r container_status; do
        local name="${container_status%:*}"
        local state="${container_status#*:}"

        if [ "$state" = "running" ]; then
            log_success "$name: 실행 중"
        else
            log_error "$name: $state"
            all_running=false
        fi
    done

    return 0
}

# 컨테이너 재시작
restart_container() {
    local container_name="$1"
    log_info "$container_name 재시작 중..."

    # 컨테이너 ID 조회
    local container_id
    container_id=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json" | \
        jq -r --arg name "$container_name" '.[] | select(.Names[] | contains($name)) | .Id')

    if [ -z "$container_id" ] || [ "$container_id" = "null" ]; then
        log_error "$container_name 컨테이너를 찾을 수 없음"
        return 1
    fi

    # 컨테이너 재시작
    local restart_response
    restart_response=$(curl -s -X POST -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/$container_id/restart" \
        -w "%{http_code}")

    if [[ "$restart_response" =~ 204$ ]]; then
        log_success "$container_name 재시작 성공"
        return 0
    else
        log_error "$container_name 재시작 실패 (HTTP: ${restart_response: -3})"
        return 1
    fi
}

# 모든 SafeWork 컨테이너 재시작
restart_all_containers() {
    log_info "모든 SafeWork 컨테이너 재시작 중..."

    local containers=("safework-postgres" "safework-redis" "safework-app")
    local failed_restarts=0

    for container in "${containers[@]}"; do
        if restart_container "$container"; then
            # 컨테이너 시작 대기
            sleep 10
        else
            ((failed_restarts++))
        fi
    done

    if [ $failed_restarts -eq 0 ]; then
        log_success "모든 컨테이너 재시작 완료"
        return 0
    else
        log_error "$failed_restarts개 컨테이너 재시작 실패"
        return 1
    fi
}

# 데이터베이스 연결 테스트
test_database() {
    log_info "데이터베이스 연결 테스트 중..."

    # PostgreSQL 연결 테스트
    local db_test
    db_test=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json" | \
        jq -r '.[] | select(.Names[] | contains("safework-postgres")) | .Id' | head -1)

    if [ -n "$db_test" ] && [ "$db_test" != "null" ]; then
        # pg_isready 명령 실행
        local exec_config='{"AttachStdout":true,"AttachStderr":true,"Cmd":["pg_isready","-U","safework"]}'
        local exec_id
        exec_id=$(curl -s -X POST -H "X-API-Key: $PORTAINER_TOKEN" \
            -H "Content-Type: application/json" \
            "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/$db_test/exec" \
            -d "$exec_config" | jq -r '.Id')

        if [ -n "$exec_id" ] && [ "$exec_id" != "null" ]; then
            curl -s -X POST -H "X-API-Key: $PORTAINER_TOKEN" \
                "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/exec/$exec_id/start" \
                -d '{"Detach":false,"Tty":false}' >/dev/null 2>&1

            log_success "데이터베이스 연결 테스트 완료"
            return 0
        fi
    fi

    log_warn "데이터베이스 연결 테스트 실패"
    return 1
}

# Redis 연결 테스트
test_redis() {
    log_info "Redis 연결 테스트 중..."

    local redis_test
    redis_test=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json" | \
        jq -r '.[] | select(.Names[] | contains("safework-redis")) | .Id' | head -1)

    if [ -n "$redis_test" ] && [ "$redis_test" != "null" ]; then
        local exec_config='{"AttachStdout":true,"AttachStderr":true,"Cmd":["redis-cli","ping"]}'
        local exec_id
        exec_id=$(curl -s -X POST -H "X-API-Key: $PORTAINER_TOKEN" \
            -H "Content-Type: application/json" \
            "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/$redis_test/exec" \
            -d "$exec_config" | jq -r '.Id')

        if [ -n "$exec_id" ] && [ "$exec_id" != "null" ]; then
            curl -s -X POST -H "X-API-Key: $PORTAINER_TOKEN" \
                "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/exec/$exec_id/start" \
                -d '{"Detach":false,"Tty":false}' >/dev/null 2>&1

            log_success "Redis 연결 테스트 완료"
            return 0
        fi
    fi

    log_warn "Redis 연결 테스트 실패"
    return 1
}

# 애플리케이션 헬스 체크
health_check() {
    log_info "애플리케이션 헬스 체크 중..."

    local attempts=0
    local max_attempts=6
    local wait_time=10

    while [ $attempts -lt $max_attempts ]; do
        local http_status
        http_status=$(curl -s -o /dev/null -w "%{http_code}" "$SAFEWORK_URL/health" --connect-timeout 10 || echo "000")

        if [ "$http_status" = "200" ]; then
            log_success "애플리케이션 헬스 체크 통과 (시도: $((attempts + 1)))"
            return 0
        fi

        log_warn "헬스 체크 실패 (HTTP $http_status), $wait_time초 후 재시도... (시도: $((attempts + 1))/$max_attempts)"
        sleep $wait_time
        ((attempts++))
    done

    log_error "애플리케이션 헬스 체크 최종 실패"
    return 1
}

# 로그 수집
collect_logs() {
    log_info "긴급 상황 로그 수집 중..."

    local log_dir="/tmp/safework_emergency_logs_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$log_dir"

    # 각 컨테이너 로그 수집
    local containers=("safework-app" "safework-postgres" "safework-redis")

    for container in "${containers[@]}"; do
        log_info "$container 로그 수집 중..."

        local container_id
        container_id=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
            "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json" | \
            jq -r --arg name "$container" '.[] | select(.Names[] | contains($name)) | .Id' | head -1)

        if [ -n "$container_id" ] && [ "$container_id" != "null" ]; then
            curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
                "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/$container_id/logs?stdout=true&stderr=true&tail=200&timestamps=true" \
                > "$log_dir/${container}_logs.txt" 2>/dev/null || true
        fi
    done

    # 시스템 정보 수집
    echo "Emergency recovery timestamp: $(date)" > "$log_dir/system_info.txt"
    echo "Recovery log: $LOG_FILE" >> "$log_dir/system_info.txt"
    curl -s "$SAFEWORK_URL/health" >> "$log_dir/health_check.json" 2>/dev/null || echo "Health check failed" >> "$log_dir/health_check.json"

    log_success "로그 수집 완료: $log_dir"
    echo "$log_dir"
}

# 복구 후 검증
verify_recovery() {
    log_info "복구 상태 검증 중..."

    local verification_passed=true

    # 1. 웹사이트 접근성
    if check_system_status; then
        log_success "✓ 웹사이트 접근성 확인"
    else
        log_error "✗ 웹사이트 접근 불가"
        verification_passed=false
    fi

    # 2. 데이터베이스 연결
    if test_database; then
        log_success "✓ 데이터베이스 연결 확인"
    else
        log_error "✗ 데이터베이스 연결 실패"
        verification_passed=false
    fi

    # 3. Redis 연결
    if test_redis; then
        log_success "✓ Redis 연결 확인"
    else
        log_error "✗ Redis 연결 실패"
        verification_passed=false
    fi

    # 4. 헬스 체크
    if health_check; then
        log_success "✓ 애플리케이션 헬스 체크 통과"
    else
        log_error "✗ 애플리케이션 헬스 체크 실패"
        verification_passed=false
    fi

    if [ "$verification_passed" = true ]; then
        log_success "✅ 모든 검증 통과 - 시스템 복구 완료"
        return 0
    else
        log_error "❌ 일부 검증 실패 - 추가 조치 필요"
        return 1
    fi
}

# 메인 복구 프로세스
main_recovery() {
    print_header

    local start_time=$(date +%s)
    local recovery_success=false
    local log_dir=""

    # Slack 알림 - 복구 시작
    send_slack_alert "Emergency Recovery Started" "SafeWork emergency recovery process has been initiated." "#FF6600"

    # 1단계: 초기 상태 확인
    log_info "=== 1단계: 초기 상태 확인 ==="
    if check_system_status; then
        log_warn "시스템이 정상 상태입니다. 복구가 필요하지 않을 수 있습니다."
        if [ "${1:-}" != "--force" ]; then
            echo "강제 실행하려면 --force 옵션을 사용하세요."
            exit 0
        fi
    fi

    check_containers

    # 2단계: 로그 수집
    log_info "=== 2단계: 로그 수집 ==="
    log_dir=$(collect_logs)

    # 3단계: 컨테이너 재시작
    log_info "=== 3단계: 컨테이너 재시작 ==="
    if restart_all_containers; then
        log_success "컨테이너 재시작 완료"
    else
        log_error "컨테이너 재시작 중 일부 실패"
    fi

    # 4단계: 서비스 검증
    log_info "=== 4단계: 서비스 검증 ==="
    log_info "서비스 안정화를 위해 30초 대기..."
    sleep 30

    if verify_recovery; then
        recovery_success=true
        log_success "✅ 긴급 복구 성공!"
    else
        log_error "❌ 긴급 복구 실패 - 수동 개입 필요"
    fi

    # 복구 결과 요약
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    echo "=================================================================="
    echo "긴급 복구 결과 요약"
    echo "=================================================================="
    echo "시작 시간: $(date -d @$start_time '+%Y-%m-%d %H:%M:%S')"
    echo "종료 시간: $(date -d @$end_time '+%Y-%m-%d %H:%M:%S')"
    echo "소요 시간: ${duration}초"
    echo "복구 상태: $([ "$recovery_success" = true ] && echo "성공" || echo "실패")"
    echo "로그 위치: $LOG_FILE"
    echo "수집 로그: $log_dir"
    echo "=================================================================="

    # Slack 알림 - 복구 완료
    if [ "$recovery_success" = true ]; then
        send_slack_alert "Emergency Recovery Completed" "SafeWork system has been successfully recovered. Duration: ${duration}s" "#00AA00"
    else
        send_slack_alert "Emergency Recovery Failed" "SafeWork emergency recovery failed. Manual intervention required. Check logs: $LOG_FILE" "#FF0000"
    fi

    # 종료 코드 반환
    [ "$recovery_success" = true ] && exit 0 || exit 1
}

# 스크립트 실행
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    # 직접 실행된 경우
    if [ "$#" -eq 0 ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        echo "SafeWork 긴급 복구 스크립트"
        echo ""
        echo "사용법:"
        echo "  $0                   # 긴급 복구 실행"
        echo "  $0 --force           # 강제 복구 실행"
        echo "  $0 --check           # 상태 확인만"
        echo "  $0 --help            # 도움말"
        echo ""
        echo "환경변수:"
        echo "  SLACK_WEBHOOK_URL    # Slack 알림 웹훅"
        echo ""
        exit 0
    elif [ "$1" = "--check" ]; then
        print_header
        check_system_status
        check_containers
        verify_recovery
    else
        main_recovery "$@"
    fi
fi