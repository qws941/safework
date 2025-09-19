#!/bin/bash

# SafeWork 고도화된 재시작 스크립트
# 작성자: Claude Code Assistant
# 버전: 2.0
# 날짜: 2025-09-19

set -euo pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 설정
PORTAINER_URL="https://portainer.jclee.me"
PORTAINER_API_KEY="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
ENDPOINT_ID="3"
CONTAINERS=("safework-postgres" "safework-redis" "safework-app")
HEALTH_CHECK_URL="https://safework.jclee.me/health"
MAX_WAIT_TIME=180
HEALTH_CHECK_INTERVAL=5

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# 헬프 함수
show_help() {
    echo -e "${CYAN}SafeWork 고도화된 재시작 스크립트${NC}"
    echo ""
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  restart           모든 SafeWork 컨테이너 재시작 (기본값)"
    echo "  restart-app       App 컨테이너만 재시작"
    echo "  restart-db        PostgreSQL 컨테이너만 재시작"
    echo "  restart-redis     Redis 컨테이너만 재시작"
    echo "  status            현재 컨테이너 상태 확인"
    echo "  health            상세 건강 상태 점검"
    echo "  logs [container]  컨테이너 로그 확인"
    echo "  emergency         긴급 복구 모드"
    echo "  --help, -h        이 도움말 표시"
    echo ""
    echo "예시:"
    echo "  $0                     # 모든 컨테이너 재시작"
    echo "  $0 restart-app         # App 컨테이너만 재시작"
    echo "  $0 logs safework-app   # App 컨테이너 로그 확인"
    echo "  $0 emergency           # 긴급 복구 실행"
}

# API 요청 함수
call_portainer_api() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="${3:-}"

    local curl_opts=(-s -H "X-API-Key: $PORTAINER_API_KEY")

    if [[ "$method" != "GET" ]]; then
        curl_opts+=(-X "$method")
    fi

    if [[ -n "$data" ]]; then
        curl_opts+=(-H "Content-Type: application/json" -d "$data")
    fi

    curl "${curl_opts[@]}" "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/$endpoint"
}

# 컨테이너 상태 확인
get_container_status() {
    local container_name="$1"
    call_portainer_api "containers/json" | \
        jq -r ".[] | select(.Names[] | contains(\"$container_name\")) | .State + \"|\" + .Status"
}

# 컨테이너 재시작
restart_container() {
    local container_name="$1"
    log_step "🔄 $container_name 컨테이너 재시작 중..."

    if call_portainer_api "containers/$container_name/restart" "POST" >/dev/null 2>&1; then
        log_success "✅ $container_name 재시작 완료"
        return 0
    else
        log_error "❌ $container_name 재시작 실패"
        return 1
    fi
}

# 건강 상태 대기
wait_for_health() {
    local container_name="$1"
    local max_wait="${2:-$MAX_WAIT_TIME}"
    local wait_time=0

    log_step "⏳ $container_name 건강 상태 대기 중... (최대 ${max_wait}초)"

    while [[ $wait_time -lt $max_wait ]]; do
        local status=$(get_container_status "$container_name")
        local state=$(echo "$status" | cut -d'|' -f1)
        local health=$(echo "$status" | cut -d'|' -f2)

        if [[ "$state" == "running" ]]; then
            if [[ "$health" == *"healthy"* ]]; then
                log_success "🟢 $container_name: 건강 상태 확인됨"
                return 0
            elif [[ "$health" == *"health: starting"* ]]; then
                echo -n "."
            else
                log_warning "🟡 $container_name: $health"
            fi
        else
            log_error "🔴 $container_name: $state"
        fi

        sleep $HEALTH_CHECK_INTERVAL
        wait_time=$((wait_time + HEALTH_CHECK_INTERVAL))
    done

    echo ""
    log_warning "⚠️ $container_name: 건강 상태 확인 시간 초과"
    return 1
}

# 전체 상태 확인
check_all_status() {
    log_step "📊 SafeWork 컨테이너 상태 확인"
    echo ""

    for container in "${CONTAINERS[@]}"; do
        local status=$(get_container_status "$container")
        local state=$(echo "$status" | cut -d'|' -f1)
        local health=$(echo "$status" | cut -d'|' -f2)

        case "$state" in
            "running")
                if [[ "$health" == *"healthy"* ]]; then
                    echo -e "🟢 $container: ${GREEN}$health${NC}"
                elif [[ "$health" == *"starting"* ]]; then
                    echo -e "🟡 $container: ${YELLOW}$health${NC}"
                else
                    echo -e "🟠 $container: ${YELLOW}$health${NC}"
                fi
                ;;
            "created")
                echo -e "🔵 $container: ${BLUE}$health${NC}"
                ;;
            "exited")
                echo -e "🔴 $container: ${RED}$health${NC}"
                ;;
            *)
                echo -e "❓ $container: ${PURPLE}$state - $health${NC}"
                ;;
        esac
    done

    echo ""
}

# 상세 건강 상태 점검
detailed_health_check() {
    log_step "🏥 상세 건강 상태 점검 시작"

    # 컨테이너 상태 확인
    check_all_status

    # SafeWork 사이트 접속 테스트
    log_step "🌐 SafeWork 사이트 접속 테스트"
    if curl -s --max-time 10 "$HEALTH_CHECK_URL" | grep -q "healthy"; then
        log_success "✅ SafeWork 사이트 정상 접속 가능"
    else
        log_error "❌ SafeWork 사이트 접속 실패"
    fi

    # 네트워크 연결 테스트
    log_step "🔗 내부 네트워크 연결 테스트"
    local app_ip=$(call_portainer_api "containers/json" | \
        jq -r '.[] | select(.Names[] | contains("safework-app")) | .NetworkSettings.Networks.bridge.IPAddress')

    if [[ -n "$app_ip" && "$app_ip" != "null" ]]; then
        log_success "✅ App 컨테이너 IP: $app_ip"
    else
        log_warning "⚠️ App 컨테이너 IP 확인 불가"
    fi
}

# 컨테이너 로그 확인
show_logs() {
    local container_name="${1:-safework-app}"
    local lines="${2:-50}"

    log_step "📋 $container_name 로그 확인 (최근 $lines 라인)"
    echo ""

    call_portainer_api "containers/$container_name/logs?stdout=1&stderr=1&tail=$lines" | \
        sed 's/\x1b\[[0-9;]*m//g' | \
        tail -n "$lines"
}

# 긴급 복구 모드
emergency_recovery() {
    log_error "🚨 긴급 복구 모드 시작"

    # 1. 모든 컨테이너 강제 중지
    log_step "1️⃣ 모든 SafeWork 컨테이너 강제 중지"
    for container in "${CONTAINERS[@]}"; do
        call_portainer_api "containers/$container/kill" "POST" >/dev/null 2>&1 || true
        log_info "🛑 $container 강제 중지"
    done

    sleep 5

    # 2. PostgreSQL 우선 시작
    log_step "2️⃣ PostgreSQL 우선 시작"
    restart_container "safework-postgres"
    wait_for_health "safework-postgres" 60

    # 3. Redis 시작
    log_step "3️⃣ Redis 시작"
    restart_container "safework-redis"
    wait_for_health "safework-redis" 30

    # 4. App 시작
    log_step "4️⃣ App 시작"
    restart_container "safework-app"
    wait_for_health "safework-app" 90

    # 5. 최종 확인
    log_step "5️⃣ 복구 완료 확인"
    detailed_health_check
}

# 순차적 재시작
sequential_restart() {
    log_step "🔄 SafeWork 순차적 재시작 시작"

    # PostgreSQL 먼저 재시작 (데이터베이스 우선)
    restart_container "safework-postgres"
    wait_for_health "safework-postgres" 60

    # Redis 재시작
    restart_container "safework-redis"
    wait_for_health "safework-redis" 30

    # App 마지막 재시작 (DB 연결 필요)
    restart_container "safework-app"
    wait_for_health "safework-app" 90

    log_success "🎉 모든 컨테이너 재시작 완료"

    # 최종 상태 확인
    sleep 10
    detailed_health_check
}

# 메인 실행 로직
main() {
    local action="${1:-restart}"

    case "$action" in
        "restart")
            sequential_restart
            ;;
        "restart-app")
            restart_container "safework-app"
            wait_for_health "safework-app"
            ;;
        "restart-db")
            restart_container "safework-postgres"
            wait_for_health "safework-postgres"
            ;;
        "restart-redis")
            restart_container "safework-redis"
            wait_for_health "safework-redis"
            ;;
        "status")
            check_all_status
            ;;
        "health")
            detailed_health_check
            ;;
        "logs")
            show_logs "${2:-safework-app}" "${3:-50}"
            ;;
        "emergency")
            emergency_recovery
            ;;
        "--help"|"-h"|"help")
            show_help
            ;;
        *)
            log_error "알 수 없는 명령어: $action"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 스크립트 시작
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${CYAN}    SafeWork 고도화 재시작 스크립트 v2.0    ${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo ""

# 메인 함수 실행
main "$@"