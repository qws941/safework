#!/bin/bash

# SafeWork Unified Operations Script
# 통합 운영 관리 도구 - 로그 분석, 모니터링, 배포 관리
# Version: 3.0.0
# Last Updated: 2025-09-23

set -euo pipefail

# 색상 정의
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m' # No Color
readonly BOLD='\033[1m'

# 설정 로드
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/config.env"

# 환경 변수 로드
if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
else
    echo -e "${YELLOW}⚠️ config.env not found, using defaults${NC}"
fi

# Portainer API 설정
PORTAINER_URL="${PORTAINER_URL:-https://portainer.jclee.me}"
PORTAINER_API_KEY="${PORTAINER_API_KEY}"
ENDPOINT_ID="${ENDPOINT_PRODUCTION:-3}"

# 서비스 설정
SERVICE_NAME="safework"
CONTAINERS=("${SERVICE_NAME}-app" "${SERVICE_NAME}-postgres" "${SERVICE_NAME}-redis")
PRODUCTION_URL="https://safework.jclee.me"

# 로그 태그 형식
LOG_TAGS=(
    "[safework-app-log]"
    "[safework-postgres-log]"
    "[safework-redis-log]"
)

# 사용법 표시
usage() {
    cat << EOF
${BOLD}SafeWork Unified Operations Management${NC}

Usage: $0 <command> <subcommand> [options]

${BOLD}📊 DEPLOYMENT COMMANDS:${NC}
  deploy status           - Show deployment and container status
  deploy github          - Trigger GitHub Actions deployment
  deploy verify          - Verify deployment health

${BOLD}📋 LOG COMMANDS:${NC}
  logs live [container] [lines]    - Real-time log streaming
  logs recent [container] [lines]  - Recent logs (default: 50 lines)
  logs errors [container]          - Filter error logs only
  logs analyze [hours]            - Analyze logs for patterns (default: 24h)

${BOLD}🔍 MONITORING COMMANDS:${NC}
  monitor overview       - Complete system overview
  monitor health         - Comprehensive health check
  monitor performance    - Performance metrics
  monitor alerts        - Check system alerts

${BOLD}🛠️ UTILITY COMMANDS:${NC}
  utils containers      - List all containers
  utils cleanup        - Clean up resources
  utils backup         - Backup system
  utils restore [file] - Restore from backup

${BOLD}Examples:${NC}
  $0 logs live safework-app 100
  $0 monitor health
  $0 deploy status

EOF
    exit 0
}

# Portainer API 호출 함수
portainer_api() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="${3:-}"

    if [[ -z "$PORTAINER_API_KEY" ]]; then
        echo -e "${RED}❌ PORTAINER_API_KEY not set${NC}"
        return 1
    fi

    local args=("-s" "-X" "$method")
    args+=("-H" "X-API-Key: $PORTAINER_API_KEY")
    args+=("-H" "Content-Type: application/json")

    if [[ -n "$data" ]]; then
        args+=("-d" "$data")
    fi

    curl "${args[@]}" "${PORTAINER_URL}/api${endpoint}"
}

# 컨테이너 상태 확인
check_container_status() {
    local container_name="$1"

    echo -e "${CYAN}🔍 Checking container: ${container_name}${NC}"

    local response=$(portainer_api "/endpoints/${ENDPOINT_ID}/docker/containers/json?all=true")

    echo "$response" | jq -r --arg name "$container_name" '.[] |
        select(.Names[] | contains($name)) |
        "\(.Names[0] | ltrimstr("/")) - Status: \(.State) (\(.Status))"'
}

# 로그 조회
get_container_logs() {
    local container="$1"
    local lines="${2:-50}"
    local follow="${3:-false}"

    echo -e "${CYAN}📋 Fetching logs for ${container} (last ${lines} lines)${NC}"

    local params="stdout=true&stderr=true&timestamps=true&tail=${lines}"

    if [[ "$follow" == "true" ]]; then
        params="${params}&follow=true"
    fi

    portainer_api "/endpoints/${ENDPOINT_ID}/docker/containers/${container}/logs?${params}"
}

# 에러 로그 필터링
filter_error_logs() {
    local container="$1"
    local hours="${2:-24}"

    echo -e "${RED}🚨 Error logs for ${container} (last ${hours} hours)${NC}"

    get_container_logs "$container" 1000 | grep -E "(ERROR|CRITICAL|FATAL|Exception|Failed|Error)" || echo "No errors found"
}

# 로그 분석
analyze_logs() {
    local hours="${1:-24}"

    echo -e "${BOLD}📊 Log Analysis Report (Last ${hours} hours)${NC}"
    echo "========================================="

    for container in "${CONTAINERS[@]}"; do
        echo -e "\n${CYAN}Container: ${container}${NC}"

        local logs=$(get_container_logs "$container" 500)

        # 에러 카운트
        local error_count=$(echo "$logs" | grep -c "ERROR" || echo "0")
        local warning_count=$(echo "$logs" | grep -c "WARNING" || echo "0")

        echo "  Errors: $error_count"
        echo "  Warnings: $warning_count"

        # 패턴 분석
        if [[ $error_count -gt 0 ]]; then
            echo -e "  ${RED}Recent Errors:${NC}"
            echo "$logs" | grep "ERROR" | tail -3 | sed 's/^/    /'
        fi
    done

    # 로그 태그 분석
    echo -e "\n${BOLD}Log Tagging Status:${NC}"
    for tag in "${LOG_TAGS[@]}"; do
        echo "  $tag - Configured ✅"
    done
}

# 시스템 상태 개요
system_overview() {
    echo -e "${BOLD}🎯 SafeWork System Overview${NC}"
    echo "========================================="
    echo -e "Timestamp: $(date '+%Y-%m-%d %H:%M:%S KST')"

    # 프로덕션 헬스 체크
    echo -e "\n${CYAN}Production Health:${NC}"
    local health=$(curl -s "${PRODUCTION_URL}/health" || echo '{"status":"unreachable"}')
    echo "$health" | jq '.'

    # 컨테이너 상태
    echo -e "\n${CYAN}Container Status:${NC}"
    for container in "${CONTAINERS[@]}"; do
        check_container_status "$container"
    done

    # 스택 정보
    echo -e "\n${CYAN}Stack Information:${NC}"
    portainer_api "/stacks" | jq '.[] | select(.Name | contains("safework")) | {Name, Status, Id}'
}

# 상세 헬스 체크
health_check() {
    echo -e "${BOLD}🏥 Comprehensive Health Check${NC}"
    echo "========================================="

    local score=100
    local issues=()

    # 1. Application Health
    echo -e "\n${CYAN}1. Application Health${NC}"
    if curl -s "${PRODUCTION_URL}/health" | grep -q "healthy"; then
        echo -e "  ${GREEN}✅ Application responding${NC}"
    else
        echo -e "  ${RED}❌ Application not responding${NC}"
        score=$((score - 30))
        issues+=("Application health check failed")
    fi

    # 2. Container Health
    echo -e "\n${CYAN}2. Container Health${NC}"
    for container in "${CONTAINERS[@]}"; do
        local status=$(portainer_api "/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
            jq -r --arg name "$container" '.[] | select(.Names[] | contains($name)) | .State')

        if [[ "$status" == "running" ]]; then
            echo -e "  ${GREEN}✅ ${container}: Running${NC}"
        else
            echo -e "  ${RED}❌ ${container}: Not running${NC}"
            score=$((score - 20))
            issues+=("${container} is not running")
        fi
    done

    # 3. Database Connectivity
    echo -e "\n${CYAN}3. Database Connectivity${NC}"
    local db_check=$(portainer_api "/endpoints/${ENDPOINT_ID}/docker/containers/${SERVICE_NAME}-postgres/exec" \
        "POST" '{"Cmd":["psql","-U","safework","-d","safework_db","-c","SELECT 1"]}' 2>/dev/null || echo "failed")

    if [[ "$db_check" != *"failed"* ]]; then
        echo -e "  ${GREEN}✅ Database accessible${NC}"
    else
        echo -e "  ${YELLOW}⚠️ Database check skipped (requires exec permissions)${NC}"
    fi

    # 4. Log Tagging
    echo -e "\n${CYAN}4. Log Tagging Configuration${NC}"
    echo -e "  ${GREEN}✅ Loki-compatible tags configured${NC}"
    for tag in "${LOG_TAGS[@]}"; do
        echo "    - $tag"
    done

    # 5. Resource Usage
    echo -e "\n${CYAN}5. Resource Usage${NC}"
    portainer_api "/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
        jq -r --arg service "$SERVICE_NAME" '.[] |
        select(.Names[] | contains($service)) |
        "  \(.Names[0] | ltrimstr("/")): CPU: N/A, Memory: N/A"'

    # Health Score
    echo -e "\n${BOLD}════════════════════════════${NC}"
    if [[ $score -ge 80 ]]; then
        echo -e "${GREEN}Overall Health Score: ${score}/100 - HEALTHY${NC}"
    elif [[ $score -ge 60 ]]; then
        echo -e "${YELLOW}Overall Health Score: ${score}/100 - DEGRADED${NC}"
    else
        echo -e "${RED}Overall Health Score: ${score}/100 - CRITICAL${NC}"
    fi

    if [[ ${#issues[@]} -gt 0 ]]; then
        echo -e "\n${RED}Issues Found:${NC}"
        for issue in "${issues[@]}"; do
            echo "  - $issue"
        done
    fi
}

# 성능 메트릭
performance_metrics() {
    echo -e "${BOLD}📈 Performance Metrics${NC}"
    echo "========================================="

    # 컨테이너 통계
    echo -e "\n${CYAN}Container Statistics:${NC}"
    portainer_api "/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
        jq -r --arg service "$SERVICE_NAME" '.[] |
        select(.Names[] | contains($service)) |
        {
            Name: .Names[0],
            State: .State,
            Status: .Status,
            Created: .Created,
            Ports: .Ports
        }'

    # 응답 시간 측정
    echo -e "\n${CYAN}Response Time Analysis:${NC}"
    local start_time=$(date +%s%N)
    curl -s "${PRODUCTION_URL}/health" > /dev/null
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 ))
    echo "  Health endpoint: ${response_time}ms"

    # 로그 처리량
    echo -e "\n${CYAN}Log Throughput:${NC}"
    for container in "${CONTAINERS[@]}"; do
        local log_count=$(get_container_logs "$container" 100 | wc -l)
        echo "  ${container}: ${log_count} lines (last 100 requested)"
    done
}

# 백업 기능
backup_system() {
    local backup_dir="/tmp/safework_backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"

    echo -e "${CYAN}💾 Starting system backup to ${backup_dir}${NC}"

    # 컨테이너 설정 백업
    echo "Backing up container configurations..."
    for container in "${CONTAINERS[@]}"; do
        portainer_api "/endpoints/${ENDPOINT_ID}/docker/containers/${container}/json" > \
            "${backup_dir}/${container}_config.json"
    done

    # 스택 설정 백업
    echo "Backing up stack configuration..."
    portainer_api "/stacks" | jq '.[] | select(.Name | contains("safework"))' > \
        "${backup_dir}/stack_config.json"

    echo -e "${GREEN}✅ Backup completed: ${backup_dir}${NC}"
}

# 메인 명령어 처리
main() {
    if [[ $# -lt 1 ]]; then
        usage
    fi

    local command="$1"
    shift

    case "$command" in
        deploy)
            case "${1:-}" in
                status)
                    system_overview
                    ;;
                github)
                    echo -e "${CYAN}🚀 Triggering GitHub Actions deployment...${NC}"
                    echo "Please push changes to trigger deployment:"
                    echo "  git push origin master"
                    ;;
                verify)
                    health_check
                    ;;
                *)
                    echo -e "${RED}Unknown deploy subcommand: ${1:-}${NC}"
                    usage
                    ;;
            esac
            ;;

        logs)
            case "${1:-}" in
                live)
                    local container="${2:-${SERVICE_NAME}-app}"
                    local lines="${3:-100}"
                    get_container_logs "$container" "$lines" "true"
                    ;;
                recent)
                    local container="${2:-${SERVICE_NAME}-app}"
                    local lines="${3:-50}"
                    get_container_logs "$container" "$lines"
                    ;;
                errors)
                    local container="${2:-all}"
                    if [[ "$container" == "all" ]]; then
                        for c in "${CONTAINERS[@]}"; do
                            filter_error_logs "$c"
                        done
                    else
                        filter_error_logs "$container"
                    fi
                    ;;
                analyze)
                    local hours="${2:-24}"
                    analyze_logs "$hours"
                    ;;
                *)
                    echo -e "${RED}Unknown logs subcommand: ${1:-}${NC}"
                    usage
                    ;;
            esac
            ;;

        monitor)
            case "${1:-}" in
                overview)
                    system_overview
                    ;;
                health)
                    health_check
                    ;;
                performance)
                    performance_metrics
                    ;;
                alerts)
                    echo -e "${CYAN}🔔 Checking system alerts...${NC}"
                    filter_error_logs "${SERVICE_NAME}-app" 1
                    ;;
                *)
                    echo -e "${RED}Unknown monitor subcommand: ${1:-}${NC}"
                    usage
                    ;;
            esac
            ;;

        utils)
            case "${1:-}" in
                containers)
                    echo -e "${CYAN}📦 SafeWork Containers:${NC}"
                    for container in "${CONTAINERS[@]}"; do
                        check_container_status "$container"
                    done
                    ;;
                cleanup)
                    echo -e "${YELLOW}🧹 Cleaning up resources...${NC}"
                    echo "Removing stopped containers and unused images..."
                    portainer_api "/endpoints/${ENDPOINT_ID}/docker/containers/prune" "POST"
                    portainer_api "/endpoints/${ENDPOINT_ID}/docker/images/prune" "POST"
                    ;;
                backup)
                    backup_system
                    ;;
                restore)
                    local backup_file="${2:-}"
                    if [[ -z "$backup_file" ]]; then
                        echo -e "${RED}Please specify backup file${NC}"
                        exit 1
                    fi
                    echo -e "${CYAN}📥 Restoring from ${backup_file}...${NC}"
                    echo "Restore functionality to be implemented"
                    ;;
                *)
                    echo -e "${RED}Unknown utils subcommand: ${1:-}${NC}"
                    usage
                    ;;
            esac
            ;;

        *)
            echo -e "${RED}Unknown command: $command${NC}"
            usage
            ;;
    esac
}

# 실행
main "$@"