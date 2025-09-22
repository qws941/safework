#!/bin/bash
# SafeWork 컨테이너 로그 개선 스크립트
# 컨테이너 ID 해결 문제 해결 및 에러 처리 강화

set -euo pipefail

# =============================================================================
# 설정 및 초기화
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/config/master.env" 2>/dev/null || {
    echo "⚠️ 설정 파일을 불러올 수 없습니다. 기본값을 사용합니다."
    PORTAINER_URL="https://portainer.jclee.me"
    PORTAINER_TOKEN="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
    ENDPOINT_PRODUCTION="3"
}

# 색상 코드
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# 로깅 함수
log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }

# =============================================================================
# 핵심 함수들
# =============================================================================

# Portainer API 호출 (에러 처리 강화)
call_portainer_api() {
    local endpoint="$1"
    local method="${2:-GET}"
    local timeout="${3:-10}"
    
    local response
    local http_code
    
    # Use shorter timeout for faster fallback to local Docker
    response=$(timeout 3 curl -s -w "\n%{http_code}" \
        --connect-timeout 2 \
        --max-time 3 \
        -X "$method" \
        -H "X-API-Key: ${PORTAINER_TOKEN}" \
        -H "Content-Type: application/json" \
        "${PORTAINER_URL}/api${endpoint}" 2>/dev/null)
    
    if [[ $? -ne 0 ]]; then
        log_error "API 호출 실패: ${endpoint}"
        return 1
    fi
    
    http_code=$(echo "$response" | tail -n 1)
    response=$(echo "$response" | head -n -1)
    
    if [[ ! "$http_code" =~ ^2[0-9][0-9]$ ]]; then
        log_error "API 호출 실패: HTTP $http_code (${endpoint})"
        return 1
    fi
    
    echo "$response"
}

# 컨테이너 이름을 ID로 변환 (새로운 방식)
resolve_container_id() {
    local container_name="$1"
    local endpoint_id="${ENDPOINT_PRODUCTION}"

    # 정확한 이름 매치를 위한 패턴
    local patterns=(
        "^${container_name}$"
        "^safework-${container_name}$"
        "${container_name}"
    )

    local containers_json
    containers_json=$(call_portainer_api "/endpoints/${endpoint_id}/docker/containers/json?all=true" "GET" 2)

    if [[ $? -eq 0 ]] && [[ -n "$containers_json" ]] && echo "$containers_json" | jq empty 2>/dev/null; then
        # Use Portainer API response
        for pattern in "${patterns[@]}"; do
            local container_id
            container_id=$(echo "$containers_json" | jq -r \
                ".[] | select(.Names[]? | test(\"/$pattern\"; \"i\")) | .Id" 2>/dev/null | head -1)

            if [[ -n "$container_id" && "$container_id" != "null" ]]; then
                echo "$container_id"
                return 0
            fi
        done
    else
        # Fallback to local Docker API
        log_warn "Portainer API 접근 실패, 로컬 Docker 사용"
        for pattern in "${patterns[@]}"; do
            local container_id
            # Use docker ps with format to get container ID by name
            container_id=$(docker ps -a --format "{{.ID}} {{.Names}}" 2>/dev/null | \
                awk -v pattern="$pattern" 'tolower($2) ~ tolower(pattern) {print $1; exit}')

            if [[ -n "$container_id" ]]; then
                echo "$container_id"
                return 0
            fi
        done
    fi

    log_error "컨테이너를 찾을 수 없습니다: $container_name"
    return 1
}

# 사용 가능한 SafeWork 컨테이너 목록
list_safework_containers() {
    local endpoint_id="${ENDPOINT_PRODUCTION}"
    local containers_json

    # Try Portainer API first
    containers_json=$(call_portainer_api "/endpoints/${endpoint_id}/docker/containers/json" "GET" 2)

    if [[ $? -eq 0 ]] && [[ -n "$containers_json" ]] && echo "$containers_json" | jq empty 2>/dev/null; then
        # Use Portainer API response
        echo "$containers_json" | jq -r \
            '.[] | select(.Names[]? | test("/safework"; "i")) | .Names[0]' 2>/dev/null | \
            sed 's|^/||' | sort
    else
        # Fallback to local Docker API
        log_warn "Portainer API 접근 실패, 로컬 Docker 사용"
        docker ps --format "{{.Names}}" 2>/dev/null | grep -i safework | sort || {
            log_error "컨테이너 목록을 가져올 수 없습니다"
            return 1
        }
    fi
}

# 개선된 컨테이너 로그 조회
get_container_logs() {
    local container_name="$1"
    local lines="${2:-100}"
    local follow="${3:-false}"
    local endpoint_id="${ENDPOINT_PRODUCTION}"
    
    log_info "컨테이너 로그 조회: $container_name"
    
    # 컨테이너 ID 해결
    local container_id
    container_id=$(resolve_container_id "$container_name")
    
    if [[ $? -ne 0 ]]; then
        log_warn "사용 가능한 SafeWork 컨테이너:"
        list_safework_containers | sed 's/^/  - /'
        return 1
    fi
    
    log_success "컨테이너 발견: $container_name (ID: ${container_id:0:12})"
    
    # 로그 매개변수 설정
    local log_params="stdout=true&stderr=true&tail=${lines}&timestamps=true"
    if [[ "$follow" == "true" ]]; then
        log_params="${log_params}&follow=true"
    fi
    
    # 로그 조회
    local logs

    # Try Portainer API first
    logs=$(call_portainer_api "/endpoints/${endpoint_id}/docker/containers/${container_id}/logs?${log_params}" "GET" 15)

    if [[ $? -eq 0 ]] && [[ -n "$logs" ]]; then
        echo "$logs"
    else
        # Fallback to local Docker
        log_warn "Portainer API 로그 조회 실패, 로컬 Docker 사용"

        local docker_opts="--timestamps"
        if [[ "$follow" == "true" ]]; then
            docker_opts="$docker_opts --follow"
        fi
        docker_opts="$docker_opts --tail $lines"

        logs=$(docker logs $docker_opts "$container_id" 2>&1)

        if [[ $? -ne 0 ]]; then
            log_error "로그를 가져올 수 없습니다: $container_name"
            return 1
        fi

        if [[ -z "$logs" ]]; then
            log_warn "로그가 비어있습니다: $container_name"
            return 0
        fi

        echo "$logs"
    fi
}

# 에러 로그 필터링
filter_error_logs() {
    local logs="$1"
    
    echo "$logs" | grep -i -E "(error|exception|critical|fatal|traceback|warning)" | \
        grep -v -E "(INFO|DEBUG)" || {
        log_info "필터링된 에러 로그가 없습니다"
        return 0
    }
}

# 실시간 로그 모니터링
monitor_live_logs() {
    local container_name="$1"
    local lines="${2:-50}"
    
    log_info "실시간 로그 모니터링 시작: $container_name (Ctrl+C로 중단)"
    echo ""
    
    # 컨테이너 ID 해결
    local container_id
    container_id=$(resolve_container_id "$container_name")
    
    if [[ $? -ne 0 ]]; then
        return 1
    fi
    
    # 실시간 로그 스트리밍
    while true; do
        local logs
        logs=$(get_container_logs "$container_name" "$lines" "false")
        
        if [[ $? -eq 0 && -n "$logs" ]]; then
            clear
            echo -e "${CYAN}=== $container_name 실시간 로그 ($(date)) ===${NC}"
            echo ""
            echo "$logs" | tail -"$lines"
        fi
        
        sleep 2
    done
}

# =============================================================================
# 메인 실행 함수
# =============================================================================

show_usage() {
    echo "SafeWork 컨테이너 로그 개선 도구"
    echo ""
    echo "사용법: $0 <COMMAND> [CONTAINER] [OPTIONS]"
    echo ""
    echo "명령어:"
    echo "  list              - 사용 가능한 컨테이너 목록"
    echo "  logs <container>  - 컨테이너 로그 조회 (기본: 100줄)"
    echo "  errors <container>- 에러 로그만 필터링"
    echo "  live <container>  - 실시간 로그 모니터링"
    echo "  all               - 모든 SafeWork 컨테이너 로그"
    echo ""
    echo "옵션:"
    echo "  --lines N         - 조회할 로그 줄 수 (기본: 100)"
    echo ""
    echo "예시:"
    echo "  $0 list"
    echo "  $0 logs safework-app"
    echo "  $0 logs app --lines 200"
    echo "  $0 errors postgres"
    echo "  $0 live redis"
    echo "  $0 all"
}

main() {
    local command="${1:-help}"
    local container="${2:-}"
    local lines="100"
    
    # 옵션 파싱
    while [[ $# -gt 0 ]]; do
        case $1 in
            --lines)
                lines="$2"
                shift 2
                ;;
            *)
                shift
                ;;
        esac
    done
    
    case "$command" in
        "list")
            echo -e "${BLUE}=== 사용 가능한 SafeWork 컨테이너 ===${NC}"
            list_safework_containers || {
                log_error "컨테이너 목록을 가져올 수 없습니다"
                exit 1
            }
            ;;
        "logs")
            if [[ -z "$container" ]]; then
                log_error "컨테이너 이름을 지정해주세요"
                show_usage
                exit 1
            fi
            
            echo -e "${BLUE}=== $container 로그 (최근 ${lines}줄) ===${NC}"
            get_container_logs "$container" "$lines" "false"
            ;;
        "errors")
            if [[ -z "$container" ]]; then
                log_error "컨테이너 이름을 지정해주세요"
                show_usage
                exit 1
            fi
            
            echo -e "${RED}=== $container 에러 로그 ===${NC}"
            local logs
            logs=$(get_container_logs "$container" "$lines" "false")
            if [[ $? -eq 0 ]]; then
                filter_error_logs "$logs"
            fi
            ;;
        "live")
            if [[ -z "$container" ]]; then
                log_error "컨테이너 이름을 지정해주세요"
                show_usage
                exit 1
            fi
            
            monitor_live_logs "$container" "$lines"
            ;;
        "all")
            echo -e "${BLUE}=== 모든 SafeWork 컨테이너 로그 ===${NC}"
            local containers
            containers=$(list_safework_containers)
            
            while IFS= read -r cont; do
                [[ -z "$cont" ]] && continue
                echo ""
                echo -e "${YELLOW}📋 $cont 로그:${NC}"
                echo "────────────────────────────────────"
                get_container_logs "$cont" "20" "false"
            done <<< "$containers"
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# 스크립트가 직접 실행될 때만 main 함수 호출
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi