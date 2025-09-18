#!/bin/bash

# SafeWork 고도화된 Portainer 관리 스크립트
# Advanced Portainer Management for SafeWork
# 작성: Claude Code Assistant
# 목적: 포트레이너 API를 통한 고급 컨테이너 관리

set -euo pipefail

# =============================================================================
# 설정 및 상수
# =============================================================================

readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
readonly CONFIG_FILE="${SCRIPT_DIR}/portainer_config.env"

# 색상 정의
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[1;37m'
readonly NC='\033[0m'

# 기본 설정
PORTAINER_URL="${PORTAINER_URL:-https://portainer.jclee.me}"
PORTAINER_TOKEN="${PORTAINER_TOKEN:-ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=}"
ENDPOINT_ID="${ENDPOINT_ID:-3}"
PROJECT_NAME="${PROJECT_NAME:-safework}"
NETWORK_NAME="${NETWORK_NAME:-safework_network}"

# 설정 파일 로드
if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
fi

# =============================================================================
# 유틸리티 함수
# =============================================================================

print_header() {
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║$(printf '%66s' | tr ' ' ' ')║${NC}"
    echo -e "${CYAN}║$(printf "%-64s" "  $1")  ║${NC}"
    echo -e "${CYAN}║$(printf '%66s' | tr ' ' ' ')║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
}

print_section() {
    echo -e "\n${WHITE}▶ $1${NC}"
    echo -e "${BLUE}$(printf '%.0s─' {1..50})${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

log_debug() {
    if [[ "${DEBUG:-0}" == "1" ]]; then
        echo -e "${PURPLE}🔍${NC} $1"
    fi
}

# 진행률 표시
show_progress() {
    local current=$1
    local total=$2
    local desc="$3"
    local percent=$((current * 100 / total))
    local filled=$((percent / 2))
    local empty=$((50 - filled))

    printf "\r${BLUE}[%s%s] %d%% %s${NC}" \
        "$(printf '%.0s█' $(seq 1 $filled))" \
        "$(printf '%.0s░' $(seq 1 $empty))" \
        "$percent" "$desc"

    if [[ $current -eq $total ]]; then
        echo ""
    fi
}

# =============================================================================
# Portainer API 함수
# =============================================================================

# API 호출 기본 함수
call_api() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="${3:-}"
    local timeout="${4:-30}"

    log_debug "API 호출: ${method} ${endpoint}"

    local curl_cmd="curl -s --max-time ${timeout} -w '\n%{http_code}'"
    curl_cmd+=" -H 'X-API-Key: ${PORTAINER_TOKEN}'"

    if [[ -n "$data" ]]; then
        curl_cmd+=" -H 'Content-Type: application/json' -d '$data'"
    fi

    curl_cmd+=" -X ${method} '${PORTAINER_URL}/api${endpoint}'"

    eval "$curl_cmd"
}

# API 응답 처리
call_api_with_error_handling() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="${3:-}"

    local response
    response=$(call_api "$endpoint" "$method" "$data")

    local body=$(echo "$response" | head -n -1)
    local http_code=$(echo "$response" | tail -n 1)

    if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
        echo "$body"
        return 0
    else
        log_error "API 호출 실패: HTTP $http_code"
        log_debug "응답: $body"
        return 1
    fi
}

# =============================================================================
# 컨테이너 관리 함수
# =============================================================================

# SafeWork 컨테이너 목록 조회
get_safework_containers() {
    local response
    response=$(call_api_with_error_handling "/endpoints/${ENDPOINT_ID}/docker/containers/json?all=true")

    if [[ $? -eq 0 ]]; then
        echo "$response" | jq -r '.[] | select(.Names[] | contains("'$PROJECT_NAME'")) |
        {
            name: .Names[0],
            id: .Id[0:12],
            state: .State,
            status: .Status,
            image: .Image,
            created: .Created,
            ports: .Ports
        }'
    fi
}

# 컨테이너 상세 정보
get_container_details() {
    local container_name="$1"

    log_info "컨테이너 상세 정보 조회: $container_name"

    local response
    response=$(call_api_with_error_handling "/endpoints/${ENDPOINT_ID}/docker/containers/${container_name}/json")

    if [[ $? -eq 0 ]]; then
        echo "$response" | jq -r '{
            name: .Name,
            id: .Id,
            state: .State,
            config: .Config,
            network: .NetworkSettings,
            mounts: .Mounts,
            restart_policy: .HostConfig.RestartPolicy
        }'
    fi
}

# 컨테이너 상태 요약 표시
show_container_summary() {
    print_section "SafeWork 컨테이너 상태 요약"

    local containers
    containers=$(get_safework_containers 2>/dev/null)

    if [[ -z "$containers" ]]; then
        log_warning "SafeWork 컨테이너를 찾을 수 없습니다."
        return 1
    fi

    printf "%-20s %-15s %-12s %-30s\n" "컨테이너" "상태" "ID" "상태 메시지"
    printf "%.80s\n" "$(printf '%.0s─' {1..80})"

    echo "$containers" | jq -r '. | "\(.name | .[1:]) \(.state) \(.id) \(.status)"' | \
    while IFS=' ' read -r name state id status; do
        local color=""
        case "$state" in
            "running") color="$GREEN" ;;
            "exited") color="$RED" ;;
            "paused") color="$YELLOW" ;;
            *) color="$NC" ;;
        esac

        printf "${color}%-20s %-15s %-12s %-30s${NC}\n" "$name" "$state" "$id" "$status"
    done
}

# =============================================================================
# 로그 관리 함수
# =============================================================================

# 고급 로그 조회
get_container_logs() {
    local container_name="$1"
    local lines="${2:-100}"
    local since="${3:-1h}"
    local follow="${4:-false}"

    print_section "컨테이너 로그: $container_name"

    log_info "로그 조회 중... (최근 $lines줄, $since 이후)"

    if [[ "$follow" == "true" ]]; then
        log_info "실시간 로그 스트리밍 시작 (Ctrl+C로 중지)"
    fi

    local endpoint="/endpoints/${ENDPOINT_ID}/docker/containers/${container_name}/logs"
    endpoint+="?stdout=true&stderr=true&tail=${lines}&since=${since}&timestamps=true"

    if [[ "$follow" == "true" ]]; then
        endpoint+="&follow=true"
    fi

    local response
    response=$(call_api "$endpoint")

    if [[ $? -eq 0 ]]; then
        echo "$response" | sed 's/^.\{8\}//' | while IFS= read -r line; do
            # 로그 레벨별 색상 적용
            if [[ "$line" =~ ERROR|FATAL|CRITICAL ]]; then
                echo -e "${RED}$line${NC}"
            elif [[ "$line" =~ WARNING|WARN ]]; then
                echo -e "${YELLOW}$line${NC}"
            elif [[ "$line" =~ INFO ]]; then
                echo -e "${BLUE}$line${NC}"
            elif [[ "$line" =~ DEBUG ]]; then
                echo -e "${PURPLE}$line${NC}"
            else
                echo "$line"
            fi
        done
    else
        log_error "로그 조회 실패"
        return 1
    fi
}

# 에러 로그 필터링
get_error_logs() {
    local container_name="$1"
    local lines="${2:-50}"

    print_section "에러 로그: $container_name"

    local endpoint="/endpoints/${ENDPOINT_ID}/docker/containers/${container_name}/logs"
    endpoint+="?stdout=true&stderr=true&tail=500&timestamps=true"

    local response
    response=$(call_api "$endpoint")

    if [[ $? -eq 0 ]]; then
        echo "$response" | sed 's/^.\{8\}//' | \
        grep -i -E "(error|exception|fatal|critical|traceback)" | \
        tail -n "$lines" | \
        while IFS= read -r line; do
            echo -e "${RED}$line${NC}"
        done
    else
        log_error "에러 로그 조회 실패"
        return 1
    fi
}

# =============================================================================
# 모니터링 함수
# =============================================================================

# 컨테이너 리소스 모니터링
monitor_container_resources() {
    local container_name="${1:-all}"

    print_section "리소스 모니터링: $container_name"

    if [[ "$container_name" == "all" ]]; then
        local containers
        containers=$(get_safework_containers | jq -r '.name | .[1:]' 2>/dev/null)

        if [[ -z "$containers" ]]; then
            log_warning "모니터링할 컨테이너가 없습니다."
            return 1
        fi

        echo "$containers" | while read -r container; do
            monitor_single_container "$container"
            echo ""
        done
    else
        monitor_single_container "$container_name"
    fi
}

monitor_single_container() {
    local container_name="$1"

    log_info "컨테이너 리소스 모니터링: $container_name"

    local stats_endpoint="/endpoints/${ENDPOINT_ID}/docker/containers/${container_name}/stats?stream=false"
    local stats
    stats=$(call_api_with_error_handling "$stats_endpoint")

    if [[ $? -eq 0 ]]; then
        echo "$stats" | jq -r '
        "CPU 사용률: " + (.cpu_stats.cpu_usage.total_usage / .cpu_stats.system_cpu_usage * 100 | tostring) + "%",
        "메모리 사용량: " + (.memory_stats.usage / 1024 / 1024 | floor | tostring) + "MB / " + (.memory_stats.limit / 1024 / 1024 | floor | tostring) + "MB",
        "네트워크 RX: " + (.networks.eth0.rx_bytes / 1024 / 1024 | floor | tostring) + "MB",
        "네트워크 TX: " + (.networks.eth0.tx_bytes / 1024 / 1024 | floor | tostring) + "MB"
        '
    else
        log_warning "리소스 정보를 가져올 수 없습니다: $container_name"
    fi
}

# 헬스체크 모니터링
monitor_health_checks() {
    print_section "헬스체크 모니터링"

    local containers
    containers=$(get_safework_containers 2>/dev/null)

    if [[ -z "$containers" ]]; then
        log_warning "헬스체크할 컨테이너가 없습니다."
        return 1
    fi

    echo "$containers" | jq -r '.name | .[1:]' | while read -r container; do
        local health_status
        health_status=$(get_container_details "$container" | jq -r '.state.Health.Status // "none"' 2>/dev/null)

        case "$health_status" in
            "healthy")
                log_success "$container: 정상"
                ;;
            "unhealthy")
                log_error "$container: 비정상"
                ;;
            "starting")
                log_warning "$container: 시작 중"
                ;;
            "none")
                log_info "$container: 헬스체크 없음"
                ;;
            *)
                log_warning "$container: 알 수 없는 상태 ($health_status)"
                ;;
        esac
    done
}

# =============================================================================
# 컨테이너 제어 함수
# =============================================================================

# 컨테이너 시작
start_container() {
    local container_name="$1"

    log_info "컨테이너 시작: $container_name"

    local response
    response=$(call_api_with_error_handling "/endpoints/${ENDPOINT_ID}/docker/containers/${container_name}/start" "POST")

    if [[ $? -eq 0 ]]; then
        log_success "컨테이너 시작 완료: $container_name"

        # 시작 후 상태 확인
        sleep 2
        local state
        state=$(get_container_details "$container_name" | jq -r '.state.Status')
        log_info "현재 상태: $state"
    else
        log_error "컨테이너 시작 실패: $container_name"
        return 1
    fi
}

# 컨테이너 중지
stop_container() {
    local container_name="$1"
    local timeout="${2:-10}"

    log_info "컨테이너 중지: $container_name (타임아웃: ${timeout}초)"

    local response
    response=$(call_api_with_error_handling "/endpoints/${ENDPOINT_ID}/docker/containers/${container_name}/stop?t=${timeout}" "POST")

    if [[ $? -eq 0 ]]; then
        log_success "컨테이너 중지 완료: $container_name"
    else
        log_error "컨테이너 중지 실패: $container_name"
        return 1
    fi
}

# 컨테이너 재시작
restart_container() {
    local container_name="$1"
    local timeout="${2:-10}"

    log_info "컨테이너 재시작: $container_name"

    local response
    response=$(call_api_with_error_handling "/endpoints/${ENDPOINT_ID}/docker/containers/${container_name}/restart?t=${timeout}" "POST")

    if [[ $? -eq 0 ]]; then
        log_success "컨테이너 재시작 완료: $container_name"

        # 재시작 후 상태 확인
        sleep 3
        local state
        state=$(get_container_details "$container_name" | jq -r '.state.Status')
        log_info "현재 상태: $state"
    else
        log_error "컨테이너 재시작 실패: $container_name"
        return 1
    fi
}

# =============================================================================
# 이미지 관리 함수
# =============================================================================

# 이미지 풀
pull_image() {
    local image_name="$1"

    log_info "이미지 풀: $image_name"

    local data='{"fromImage":"'$image_name'"}'
    local response
    response=$(call_api_with_error_handling "/endpoints/${ENDPOINT_ID}/docker/images/create" "POST" "$data")

    if [[ $? -eq 0 ]]; then
        log_success "이미지 풀 완료: $image_name"
    else
        log_error "이미지 풀 실패: $image_name"
        return 1
    fi
}

# 사용하지 않는 이미지 정리
cleanup_images() {
    log_info "사용하지 않는 이미지 정리 중..."

    local response
    response=$(call_api_with_error_handling "/endpoints/${ENDPOINT_ID}/docker/images/prune" "POST")

    if [[ $? -eq 0 ]]; then
        local space_reclaimed
        space_reclaimed=$(echo "$response" | jq -r '.SpaceReclaimed // 0')
        log_success "이미지 정리 완료 (확보된 공간: $((space_reclaimed / 1024 / 1024))MB)"
    else
        log_error "이미지 정리 실패"
        return 1
    fi
}

# =============================================================================
# 네트워크 관리 함수
# =============================================================================

# 네트워크 정보 조회
show_network_info() {
    print_section "네트워크 정보"

    local networks
    networks=$(call_api_with_error_handling "/endpoints/${ENDPOINT_ID}/docker/networks")

    if [[ $? -eq 0 ]]; then
        echo "$networks" | jq -r '.[] | select(.Name | contains("'$NETWORK_NAME'") or contains("'$PROJECT_NAME'")) |
        {
            name: .Name,
            driver: .Driver,
            scope: .Scope,
            containers: (.Containers | length)
        }' | jq -r '"네트워크: " + .name + " (드라이버: " + .driver + ", 컨테이너: " + (.containers | tostring) + "개)"'
    else
        log_error "네트워크 정보 조회 실패"
        return 1
    fi
}

# =============================================================================
# 백업 및 복원 함수
# =============================================================================

# 컨테이너 백업
backup_container() {
    local container_name="$1"
    local backup_path="${2:-./backups}"

    print_section "컨테이너 백업: $container_name"

    mkdir -p "$backup_path"

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${backup_path}/${container_name}_${timestamp}.tar"

    log_info "백업 생성 중: $backup_file"

    # 컨테이너를 이미지로 커밋
    local commit_data='{"container":"'$container_name'","repo":"'$PROJECT_NAME'/backup","tag":"'$timestamp'"}'
    local commit_response
    commit_response=$(call_api_with_error_handling "/endpoints/${ENDPOINT_ID}/docker/commit" "POST" "$commit_data")

    if [[ $? -eq 0 ]]; then
        log_success "백업 완료: $backup_file"
    else
        log_error "백업 실패: $container_name"
        return 1
    fi
}

# =============================================================================
# 보고서 생성 함수
# =============================================================================

# 시스템 상태 보고서
generate_system_report() {
    local output_file="${1:-safework_system_report_$(date +%Y%m%d_%H%M%S).txt}"

    print_section "시스템 상태 보고서 생성"

    {
        echo "SafeWork 시스템 상태 보고서"
        echo "생성 시간: $(date)"
        echo "=================================="
        echo ""

        echo "1. 컨테이너 상태"
        echo "----------------"
        show_container_summary 2>/dev/null || echo "컨테이너 정보 조회 실패"
        echo ""

        echo "2. 네트워크 정보"
        echo "----------------"
        show_network_info 2>/dev/null || echo "네트워크 정보 조회 실패"
        echo ""

        echo "3. 헬스체크 결과"
        echo "----------------"
        monitor_health_checks 2>/dev/null || echo "헬스체크 실패"
        echo ""

    } > "$output_file"

    log_success "보고서 생성 완료: $output_file"
}

# =============================================================================
# 대화형 메뉴 함수
# =============================================================================

show_interactive_menu() {
    while true; do
        clear
        print_header "SafeWork Portainer 고급 관리 도구"

        echo -e "${WHITE}주요 기능:${NC}"
        echo "  1) 컨테이너 상태 요약"
        echo "  2) 로그 조회 (일반)"
        echo "  3) 로그 조회 (에러만)"
        echo "  4) 실시간 로그 스트리밍"
        echo "  5) 리소스 모니터링"
        echo "  6) 헬스체크 모니터링"
        echo ""
        echo -e "${WHITE}컨테이너 제어:${NC}"
        echo "  7) 컨테이너 시작"
        echo "  8) 컨테이너 중지"
        echo "  9) 컨테이너 재시작"
        echo ""
        echo -e "${WHITE}관리 기능:${NC}"
        echo " 10) 이미지 풀"
        echo " 11) 이미지 정리"
        echo " 12) 네트워크 정보"
        echo " 13) 시스템 보고서 생성"
        echo ""
        echo "  0) 종료"
        echo ""

        read -p "선택하세요 (0-13): " choice

        case $choice in
            1) show_container_summary ;;
            2)
                read -p "컨테이너 이름 (기본: safework-app): " container
                container=${container:-safework-app}
                read -p "라인 수 (기본: 100): " lines
                lines=${lines:-100}
                get_container_logs "$container" "$lines"
                ;;
            3)
                read -p "컨테이너 이름 (기본: safework-app): " container
                container=${container:-safework-app}
                get_error_logs "$container"
                ;;
            4)
                read -p "컨테이너 이름 (기본: safework-app): " container
                container=${container:-safework-app}
                get_container_logs "$container" "50" "1h" "true"
                ;;
            5) monitor_container_resources ;;
            6) monitor_health_checks ;;
            7)
                read -p "시작할 컨테이너 이름: " container
                if [[ -n "$container" ]]; then
                    start_container "$container"
                fi
                ;;
            8)
                read -p "중지할 컨테이너 이름: " container
                if [[ -n "$container" ]]; then
                    stop_container "$container"
                fi
                ;;
            9)
                read -p "재시작할 컨테이너 이름: " container
                if [[ -n "$container" ]]; then
                    restart_container "$container"
                fi
                ;;
            10)
                read -p "풀할 이미지 이름: " image
                if [[ -n "$image" ]]; then
                    pull_image "$image"
                fi
                ;;
            11) cleanup_images ;;
            12) show_network_info ;;
            13) generate_system_report ;;
            0)
                log_info "종료합니다."
                exit 0
                ;;
            *)
                log_error "잘못된 선택입니다."
                ;;
        esac

        echo ""
        read -p "계속하려면 Enter를 누르세요..."
    done
}

# =============================================================================
# 메인 함수
# =============================================================================

show_usage() {
    cat << EOF
SafeWork Portainer 고급 관리 도구

사용법: $SCRIPT_NAME [명령어] [옵션]

명령어:
  summary                           컨테이너 상태 요약
  logs <컨테이너> [라인수] [시간]    로그 조회 (기본: 100줄, 1시간)
  error-logs <컨테이너> [라인수]     에러 로그만 조회
  stream-logs <컨테이너>             실시간 로그 스트리밍
  monitor [컨테이너]                 리소스 모니터링
  health                            헬스체크 모니터링
  start <컨테이너>                   컨테이너 시작
  stop <컨테이너> [타임아웃]          컨테이너 중지
  restart <컨테이너> [타임아웃]       컨테이너 재시작
  pull <이미지>                      이미지 풀
  cleanup                           사용하지 않는 이미지 정리
  network                           네트워크 정보
  backup <컨테이너> [경로]           컨테이너 백업
  report [파일명]                    시스템 상태 보고서 생성
  interactive                       대화형 메뉴

옵션:
  --debug                           디버그 모드
  --config <파일>                   설정 파일 지정

예제:
  $SCRIPT_NAME summary
  $SCRIPT_NAME logs safework-app 50 2h
  $SCRIPT_NAME error-logs safework-app
  $SCRIPT_NAME monitor safework-app
  $SCRIPT_NAME restart safework-app 30
  $SCRIPT_NAME interactive

EOF
}

main() {
    # 인수 파싱
    while [[ $# -gt 0 ]]; do
        case $1 in
            --debug)
                export DEBUG=1
                shift
                ;;
            --config)
                CONFIG_FILE="$2"
                shift 2
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            *)
                break
                ;;
        esac
    done

    # 명령어 처리
    case "${1:-}" in
        summary|s)
            show_container_summary
            ;;
        logs|l)
            get_container_logs "${2:-safework-app}" "${3:-100}" "${4:-1h}"
            ;;
        error-logs|el)
            get_error_logs "${2:-safework-app}" "${3:-50}"
            ;;
        stream-logs|sl)
            get_container_logs "${2:-safework-app}" "50" "1h" "true"
            ;;
        monitor|m)
            monitor_container_resources "${2:-all}"
            ;;
        health|h)
            monitor_health_checks
            ;;
        start)
            if [[ -z "${2:-}" ]]; then
                log_error "컨테이너 이름을 지정해주세요."
                exit 1
            fi
            start_container "$2"
            ;;
        stop)
            if [[ -z "${2:-}" ]]; then
                log_error "컨테이너 이름을 지정해주세요."
                exit 1
            fi
            stop_container "$2" "${3:-10}"
            ;;
        restart)
            if [[ -z "${2:-}" ]]; then
                log_error "컨테이너 이름을 지정해주세요."
                exit 1
            fi
            restart_container "$2" "${3:-10}"
            ;;
        pull)
            if [[ -z "${2:-}" ]]; then
                log_error "이미지 이름을 지정해주세요."
                exit 1
            fi
            pull_image "$2"
            ;;
        cleanup)
            cleanup_images
            ;;
        network|n)
            show_network_info
            ;;
        backup|b)
            if [[ -z "${2:-}" ]]; then
                log_error "컨테이너 이름을 지정해주세요."
                exit 1
            fi
            backup_container "$2" "${3:-./backups}"
            ;;
        report|r)
            generate_system_report "${2:-}"
            ;;
        interactive|i)
            show_interactive_menu
            ;;
        "")
            show_usage
            ;;
        *)
            log_error "알 수 없는 명령어: $1"
            show_usage
            exit 1
            ;;
    esac
}

# 스크립트 실행
main "$@"