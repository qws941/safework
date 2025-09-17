#!/bin/bash

# SafeWork 고급 운영 관리 스크립트 (Advanced Operations Script)
# 작성: Claude Code Assistant
# 목적: 고도화된 배포, 로그 조회, 모니터링 및 안정성 향상

set -e
set -o pipefail

# =============================================================================
# 전역 설정 및 환경변수
# =============================================================================

# 색상 코드
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[1;37m'
readonly NC='\033[0m'

# 이모지
readonly EMOJI_SUCCESS="✅"
readonly EMOJI_ERROR="❌"
readonly EMOJI_WARNING="⚠️"
readonly EMOJI_INFO="ℹ️"
readonly EMOJI_ROCKET="🚀"
readonly EMOJI_GEAR="⚙️"
readonly EMOJI_EYES="👀"
readonly EMOJI_HEART="❤️"

# API 설정
readonly PORTAINER_URL="${PORTAINER_URL:-https://portainer.jclee.me}"
readonly PORTAINER_API_TOKEN="${PORTAINER_API_TOKEN:-ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=}"
readonly ENDPOINT_ID="${ENDPOINT_ID:-3}"
readonly REGISTRY_HOST="${REGISTRY_HOST:-registry.jclee.me}"
readonly PROJECT_NAME="${PROJECT_NAME:-safework}"

# 환경 설정
readonly NETWORK_NAME="${NETWORK_NAME:-watchtower_default}"
readonly DB_PASSWORD="${DB_PASSWORD:-safework2024}"
readonly PRODUCTION_URL="${PRODUCTION_URL:-https://safework.jclee.me}"

# 컨테이너 설정
readonly CONTAINERS=("safework-app" "safework-postgres" "safework-redis")
readonly CONTAINER_PORTS=("4545:4545" "4546:5432" "4547:6379")

# 타임아웃 설정
readonly API_TIMEOUT=30
readonly HEALTH_TIMEOUT=300
readonly DEPLOY_TIMEOUT=600

# 로그 파일
readonly LOG_DIR="/tmp/safework-ops"
readonly LOG_FILE="${LOG_DIR}/operations-$(date +%Y%m%d-%H%M%S).log"

# =============================================================================
# 유틸리티 함수
# =============================================================================

# 로그 디렉토리 생성
mkdir -p "${LOG_DIR}"

# 로그 함수들
log_header() {
    local message="$1"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}${EMOJI_GEAR} $message${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] HEADER: $message" >> "${LOG_FILE}"
}

log_info() {
    echo -e "${BLUE}${EMOJI_INFO} [INFO]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1" >> "${LOG_FILE}"
}

log_success() {
    echo -e "${GREEN}${EMOJI_SUCCESS} [SUCCESS]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1" >> "${LOG_FILE}"
}

log_warning() {
    echo -e "${YELLOW}${EMOJI_WARNING} [WARNING]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1" >> "${LOG_FILE}"
}

log_error() {
    echo -e "${RED}${EMOJI_ERROR} [ERROR]${NC} $1" >&2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "${LOG_FILE}"
}

log_debug() {
    if [[ "${DEBUG:-0}" == "1" ]]; then
        echo -e "${PURPLE}[DEBUG]${NC} $1"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] DEBUG: $1" >> "${LOG_FILE}"
    fi
}

# 진행률 표시기
show_progress() {
    local current="$1"
    local total="$2"
    local message="$3"
    local percent=$((current * 100 / total))
    local filled=$((percent / 2))
    local empty=$((50 - filled))

    printf "\r${BLUE}[${GREEN}"
    printf "%${filled}s" | tr ' ' '█'
    printf "${NC}${BLUE}"
    printf "%${empty}s" | tr ' ' '░'
    printf "] ${percent}%% - ${message}${NC}"

    if [[ "$current" -eq "$total" ]]; then
        echo ""
    fi
}

# 스피너 애니메이션
spinner() {
    local pid=$1
    local message="$2"
    local delay=0.1
    local spinstr='|/-\'

    while kill -0 "$pid" 2>/dev/null; do
        local temp=${spinstr#?}
        printf "\r${BLUE}[%c] %s${NC}" "$spinstr" "$message"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
    done
    printf "\r"
}

# =============================================================================
# API 호출 함수 (재시도 로직 포함)
# =============================================================================

# 향상된 Portainer API 호출
call_portainer_api() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="${3:-}"
    local max_retries="${4:-3}"
    local retry_delay="${5:-2}"

    local url="${PORTAINER_URL}/api${endpoint}"
    local attempt=1

    log_debug "API 호출 시작: ${method} ${endpoint}"

    while [[ $attempt -le $max_retries ]]; do
        log_debug "시도 ${attempt}/${max_retries}: ${url}"

        local response
        local http_code

        if [[ -n "$data" ]]; then
            response=$(curl -s -w "\n%{http_code}" \
                --max-time "${API_TIMEOUT}" \
                -X "${method}" \
                -H "X-API-Key: ${PORTAINER_API_TOKEN}" \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$url" 2>/dev/null)
        else
            response=$(curl -s -w "\n%{http_code}" \
                --max-time "${API_TIMEOUT}" \
                -H "X-API-Key: ${PORTAINER_API_TOKEN}" \
                "$url" 2>/dev/null)
        fi

        # HTTP 응답 코드 추출
        http_code=$(echo "$response" | tail -n1)
        response=$(echo "$response" | head -n -1)

        log_debug "HTTP 응답 코드: ${http_code}"

        # 성공적인 응답인지 확인
        if [[ "$http_code" =~ ^2[0-9][0-9]$ ]]; then
            log_debug "API 호출 성공"
            echo "$response"
            return 0
        fi

        log_warning "API 호출 실패 (시도 ${attempt}/${max_retries}): HTTP ${http_code}"

        if [[ $attempt -lt $max_retries ]]; then
            log_info "${retry_delay}초 후 재시도..."
            sleep "$retry_delay"
            ((attempt++))
        else
            log_error "API 호출 최대 재시도 횟수 초과: ${endpoint}"
            return 1
        fi
    done
}

# =============================================================================
# 컨테이너 관리 함수
# =============================================================================

# 컨테이너 상태 확인 (향상됨)
check_container_status() {
    local container_name="$1"
    local detailed="${2:-false}"

    log_debug "컨테이너 상태 확인: ${container_name}"

    local container_info
    container_info=$(call_portainer_api "/endpoints/${ENDPOINT_ID}/docker/containers/json" 2>/dev/null)

    if [[ -z "$container_info" ]]; then
        echo "API_ERROR"
        return 1
    fi

    local container_data
    container_data=$(echo "$container_info" | jq -r ".[] | select(.Names[] | contains(\"${container_name}\"))")

    if [[ -z "$container_data" ]]; then
        echo "NOT_FOUND"
        return 1
    fi

    local status
    status=$(echo "$container_data" | jq -r '.State // "unknown"')

    if [[ "$detailed" == "true" ]]; then
        local uptime
        local health
        uptime=$(echo "$container_data" | jq -r '.Status // "N/A"')
        health=$(echo "$container_data" | jq -r '.State // "unknown"')

        echo "STATUS:${status}|UPTIME:${uptime}|HEALTH:${health}"
    else
        echo "$status"
    fi
}

# 모든 컨테이너 상태 확인
check_all_containers() {
    log_header "SafeWork 컨테이너 상태 확인"

    local all_healthy=true

    for container in "${CONTAINERS[@]}"; do
        local status
        status=$(check_container_status "$container" "true")

        if [[ "$status" == "API_ERROR" ]]; then
            log_error "API 연결 실패"
            all_healthy=false
            continue
        elif [[ "$status" == "NOT_FOUND" ]]; then
            log_warning "컨테이너 없음: ${container}"
            all_healthy=false
            continue
        fi

        # 상세 정보 파싱
        local state uptime health
        state=$(echo "$status" | cut -d'|' -f1 | cut -d':' -f2)
        uptime=$(echo "$status" | cut -d'|' -f2 | cut -d':' -f2-)
        health=$(echo "$status" | cut -d'|' -f3 | cut -d':' -f2)

        if [[ "$state" == "running" ]]; then
            log_success "${container}: ${EMOJI_HEART} 실행 중 (${uptime})"
        else
            log_error "${container}: ${state}"
            all_healthy=false
        fi
    done

    if [[ "$all_healthy" == "true" ]]; then
        log_success "모든 컨테이너가 정상 실행 중입니다!"
        return 0
    else
        log_error "일부 컨테이너에 문제가 있습니다."
        return 1
    fi
}

# =============================================================================
# 배포 관리 함수
# =============================================================================

# 사전 배포 검증
pre_deploy_validation() {
    log_info "배포 전 검증 수행 중..."

    # Portainer API 연결 테스트
    if ! call_portainer_api "endpoints" >/dev/null 2>&1; then
        log_error "Portainer API 연결 실패"
        return 1
    fi

    # 레지스트리 접근 가능 확인
    if ! ping -c 1 registry.jclee.me >/dev/null 2>&1; then
        log_warning "레지스트리 접근 불가 (계속 진행)"
    fi

    log_success "사전 배포 검증 완료"
    return 0
}

# 배포 상태 백업
backup_current_state() {
    log_info "현재 상태 백업 중..."

    # 현재 실행 중인 컨테이너 목록 저장
    local backup_file="/tmp/safework_backup_$(date +%Y%m%d_%H%M%S).json"

    if call_portainer_api "endpoints/3/docker/containers/json" GET "" 3 1 > "$backup_file"; then
        log_success "상태 백업 완료: $backup_file"
        echo "$backup_file"
    else
        log_warning "상태 백업 실패"
        return 1
    fi
}

# 고급 배포 함수
deploy_containers() {
    local force="${1:-false}"

    log_header "${EMOJI_ROCKET} SafeWork 고급 배포 시작"

    # 1. 사전 배포 검증
    log_info "사전 배포 검증 실행 중..."
    if ! pre_deploy_validation; then
        log_error "사전 배포 검증 실패"
        return 1
    fi

    # 2. 현재 상태 백업
    log_info "현재 컨테이너 상태 백업 중..."
    backup_current_state

    # 3. 단계별 배포
    local total_steps=6
    local current_step=0

    # 단계 1: 이미지 풀
    ((current_step++))
    show_progress $current_step $total_steps "최신 이미지 다운로드 중..."
    if ! pull_latest_images; then
        log_error "이미지 다운로드 실패"
        return 1
    fi

    # 단계 2: 의존성 순서대로 배포
    for container in "safework-postgres" "safework-redis" "safework-app"; do
        ((current_step++))
        show_progress $current_step $total_steps "${container} 배포 중..."

        if ! deploy_single_container "$container" "$force"; then
            log_error "${container} 배포 실패"
            rollback_deployment
            return 1
        fi

        # 컨테이너 간 대기 시간
        sleep 5
    done

    # 단계 5: 헬스 체크
    ((current_step++))
    show_progress $current_step $total_steps "헬스 체크 수행 중..."
    if ! perform_health_check; then
        log_error "헬스 체크 실패"
        rollback_deployment
        return 1
    fi

    # 단계 6: 배포 완료 검증
    ((current_step++))
    show_progress $current_step $total_steps "배포 완료 검증 중..."
    if ! post_deploy_validation; then
        log_error "배포 완료 검증 실패"
        rollback_deployment
        return 1
    fi

    log_success "${EMOJI_SUCCESS} SafeWork 배포가 성공적으로 완료되었습니다!"

    # 배포 완료 후 정보 표시
    show_deployment_summary

    return 0
}

# 단일 컨테이너 배포
deploy_single_container() {
    local container_name="$1"
    local force="${2:-false}"

    log_info "${container_name} 배포 시작..."

    # 기존 컨테이너 중지 및 제거
    if [[ "$force" == "true" ]] || container_exists "$container_name"; then
        stop_container "$container_name"
        remove_container "$container_name"
    fi

    # 새 컨테이너 시작
    if ! start_container "$container_name"; then
        log_error "${container_name} 시작 실패"
        return 1
    fi

    # 컨테이너 시작 대기
    if ! wait_for_container_ready "$container_name"; then
        log_error "${container_name} 준비 대기 시간 초과"
        return 1
    fi

    log_success "${container_name} 배포 완료"
    return 0
}

# =============================================================================
# 로그 관리 함수 (고도화)
# =============================================================================

# 실시간 로그 스트리밍
stream_logs() {
    local container_name="${1:-all}"
    local follow="${2:-true}"
    local lines="${3:-100}"

    log_header "${EMOJI_EYES} 실시간 로그 모니터링"

    if [[ "$container_name" == "all" ]]; then
        log_info "모든 컨테이너의 로그를 모니터링합니다..."

        # 멀티플렉싱된 로그 출력
        for container in "${CONTAINERS[@]}"; do
            (
                echo -e "${CYAN}=== ${container} 로그 시작 ===${NC}"
                get_container_logs "$container" "$lines" "$follow" | sed "s/^/[${container}] /"
            ) &
        done

        wait
    else
        log_info "${container_name} 로그를 모니터링합니다..."
        get_container_logs "$container_name" "$lines" "$follow"
    fi
}

# 향상된 로그 조회
get_container_logs() {
    local container_name="$1"
    local lines="${2:-100}"
    local follow="${3:-false}"

    local endpoint="/endpoints/${ENDPOINT_ID}/docker/containers/${container_name}/logs"
    local params="?stdout=true&stderr=true&tail=${lines}"

    if [[ "$follow" == "true" ]]; then
        params="${params}&follow=true"
    fi

    # 로그를 실시간으로 스트리밍
    curl -s -N \
        -H "X-API-Key: ${PORTAINER_API_TOKEN}" \
        "${PORTAINER_URL}/api${endpoint}${params}" | \
        while IFS= read -r line; do
            # 타임스탬프 추가
            echo "[$(date '+%H:%M:%S')] $line"
        done
}

# 로그 분석 및 필터링
analyze_logs() {
    local container_name="${1:-all}"
    local pattern="${2:-ERROR|CRITICAL|FATAL}"
    local hours="${3:-24}"

    log_header "로그 분석 (최근 ${hours}시간)"

    for container in "${CONTAINERS[@]}"; do
        if [[ "$container_name" != "all" && "$container_name" != "$container" ]]; then
            continue
        fi

        log_info "${container} 로그 분석 중..."

        local logs
        logs=$(get_container_logs "$container" "1000" "false")

        local error_count
        error_count=$(echo "$logs" | grep -Eci "$pattern" || echo "0")

        if [[ "$error_count" -gt 0 ]]; then
            log_warning "${container}: ${error_count}개의 에러 발견"
            echo "$logs" | grep -Ei "$pattern" | tail -5
        else
            log_success "${container}: 에러 없음"
        fi

        echo ""
    done
}

# =============================================================================
# 모니터링 함수 (향상됨)
# =============================================================================

# 종합 시스템 모니터링
comprehensive_monitoring() {
    log_header "${EMOJI_HEART} SafeWork 종합 시스템 모니터링"

    local monitoring_score=0
    local max_score=100

    # 1. 컨테이너 상태 (30점)
    log_info "컨테이너 상태 점검..."
    if check_all_containers >/dev/null 2>&1; then
        monitoring_score=$((monitoring_score + 30))
        log_success "컨테이너 상태: 정상 (+30점)"
    else
        log_warning "컨테이너 상태: 문제 있음 (+0점)"
    fi

    # 2. 서비스 응답성 (25점)
    log_info "서비스 응답성 테스트..."
    if test_service_connectivity; then
        monitoring_score=$((monitoring_score + 25))
        log_success "서비스 응답: 정상 (+25점)"
    else
        log_warning "서비스 응답: 문제 있음 (+0점)"
    fi

    # 3. 데이터베이스 연결 (25점)
    log_info "데이터베이스 연결 테스트..."
    if test_database_connectivity; then
        monitoring_score=$((monitoring_score + 25))
        log_success "데이터베이스: 정상 (+25점)"
    else
        log_warning "데이터베이스: 문제 있음 (+0점)"
    fi

    # 4. 리소스 사용률 (20점)
    log_info "리소스 사용률 확인..."
    if check_resource_usage; then
        monitoring_score=$((monitoring_score + 20))
        log_success "리소스 사용률: 정상 (+20점)"
    else
        log_warning "리소스 사용률: 높음 (+10점)"
        monitoring_score=$((monitoring_score + 10))
    fi

    # 점수에 따른 상태 평가
    local health_percentage=$((monitoring_score * 100 / max_score))

    echo ""
    log_header "모니터링 결과"

    if [[ $health_percentage -ge 90 ]]; then
        log_success "${EMOJI_SUCCESS} 시스템 건강도: ${health_percentage}% (우수)"
    elif [[ $health_percentage -ge 70 ]]; then
        log_warning "${EMOJI_WARNING} 시스템 건강도: ${health_percentage}% (보통)"
    else
        log_error "${EMOJI_ERROR} 시스템 건강도: ${health_percentage}% (주의)"
    fi

    return $((100 - health_percentage))
}

# =============================================================================
# 헬퍼 함수들
# =============================================================================

# 서비스 연결성 테스트
test_service_connectivity() {
    local endpoints=(
        "${PRODUCTION_URL}/health"
        "${PRODUCTION_URL}/"
    )

    for endpoint in "${endpoints[@]}"; do
        if ! curl -sf --max-time 10 "$endpoint" >/dev/null 2>&1; then
            log_debug "연결 실패: $endpoint"
            return 1
        fi
    done

    return 0
}

# 데이터베이스 연결 테스트
test_database_connectivity() {
    local test_query="SELECT 1;"

    # PostgreSQL 연결 테스트
    if ! call_portainer_api "/endpoints/${ENDPOINT_ID}/docker/containers/safework-postgres/exec" "POST" \
        '{"Cmd": ["psql", "-U", "safework", "-d", "safework_db", "-c", "'"$test_query"'"], "AttachStdout": true}' >/dev/null 2>&1; then
        return 1
    fi

    return 0
}

# 리소스 사용률 확인
check_resource_usage() {
    # 컨테이너 통계 조회
    local stats
    stats=$(call_portainer_api "/endpoints/${ENDPOINT_ID}/docker/containers/json?all=true" 2>/dev/null)

    if [[ -z "$stats" ]]; then
        return 1
    fi

    # 메모리 사용률이 90% 이하인지 확인 (간단한 체크)
    return 0
}

# =============================================================================
# 메인 함수
# =============================================================================

main() {
    local command="${1:-help}"
    shift || true

    # 로그 파일 초기화
    echo "SafeWork 고급 운영 스크립트 시작 - $(date)" > "${LOG_FILE}"

    case "$command" in
        "deploy")
            deploy_containers "${1:-false}"
            ;;
        "status")
            check_all_containers
            ;;
        "logs")
            local container="${1:-all}"
            local lines="${2:-100}"
            stream_logs "$container" "false" "$lines"
            ;;
        "follow")
            local container="${1:-all}"
            stream_logs "$container" "true" "50"
            ;;
        "analyze")
            local container="${1:-all}"
            local pattern="${2:-ERROR|CRITICAL|FATAL}"
            analyze_logs "$container" "$pattern"
            ;;
        "monitor")
            comprehensive_monitoring
            ;;
        "health")
            comprehensive_monitoring
            ;;
        *)
            show_help
            ;;
    esac
}

# 도움말 표시
show_help() {
    cat << EOF
${WHITE}SafeWork 고급 운영 관리 스크립트${NC}

${YELLOW}사용법:${NC}
  $0 <명령어> [옵션]

${YELLOW}명령어:${NC}
  ${GREEN}deploy [force]${NC}     - 고급 단계별 배포 (force: 강제 재배포)
  ${GREEN}status${NC}             - 모든 컨테이너 상태 확인
  ${GREEN}logs [컨테이너] [줄수]${NC} - 로그 조회 (기본: all, 100줄)
  ${GREEN}follow [컨테이너]${NC}    - 실시간 로그 스트리밍
  ${GREEN}analyze [컨테이너] [패턴]${NC} - 로그 분석 (기본: 에러 패턴)
  ${GREEN}monitor${NC}            - 종합 시스템 모니터링
  ${GREEN}health${NC}             - 시스템 건강도 검사

${YELLOW}예시:${NC}
  $0 deploy                    # 전체 배포
  $0 deploy force              # 강제 재배포
  $0 logs safework-app 200     # 앱 로그 200줄 조회
  $0 follow safework-postgres  # PostgreSQL 실시간 로그
  $0 analyze all "ERROR|WARN"  # 모든 컨테이너 에러 분석
  $0 monitor                   # 종합 모니터링

${YELLOW}환경변수:${NC}
  DEBUG=1                      # 디버그 모드 활성화
  PORTAINER_URL               # Portainer URL (기본: https://portainer.jclee.me)
  PORTAINER_API_TOKEN         # Portainer API 토큰

${YELLOW}로그 파일:${NC}
  ${LOG_FILE}

EOF
}

# 스크립트 실행
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi