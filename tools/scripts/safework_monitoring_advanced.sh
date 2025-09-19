#!/bin/bash

# SafeWork 고도화된 모니터링 시스템
# 작성자: Claude Code Assistant
# 버전: 1.0
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
PORTAINER_API_KEY="${PORTAINER_API_KEY:-ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=}"
ENDPOINT_ID="3"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL}"

CONTAINERS=("safework-postgres" "safework-redis" "safework-app")
HEALTH_CHECK_URL="https://safework.jclee.me/health"
MONITOR_INTERVAL=30
LOG_FILE="/home/jclee/app/safework/logs/safework_monitor.log"

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1" >> "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SUCCESS] $1" >> "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARNING] $1" >> "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" >> "$LOG_FILE"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [STEP] $1" >> "$LOG_FILE"
}

# 슬랙 알림 전송 함수
send_slack_notification() {
    local message="$1"
    local color="${2:-#36a64f}"  # 기본값: 녹색
    local title="${3:-SafeWork 모니터링 알림}"

    local payload=$(cat <<EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "$title",
            "text": "$message",
            "footer": "SafeWork Monitoring System",
            "ts": $(date +%s),
            "fields": [
                {
                    "title": "시간",
                    "value": "$(date '+%Y-%m-%d %H:%M:%S KST')",
                    "short": true
                },
                {
                    "title": "서버",
                    "value": "SafeWork Production",
                    "short": true
                }
            ]
        }
    ]
}
EOF
)

    curl -X POST -H 'Content-type: application/json' \
        --data "$payload" \
        "$SLACK_WEBHOOK_URL" >/dev/null 2>&1
}

# 헬프 함수
show_help() {
    echo -e "${CYAN}SafeWork 고도화된 모니터링 시스템${NC}"
    echo ""
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  monitor           실시간 모니터링 시작 (기본값)"
    echo "  status            현재 시스템 상태 확인"
    echo "  health            상세 건강 상태 점검"
    echo "  performance       성능 메트릭 확인"
    echo "  logs [container]  컨테이너 로그 분석"
    echo "  test-slack        슬랙 알림 테스트"
    echo "  emergency         긴급 상황 알림"
    echo "  --help, -h        이 도움말 표시"
    echo ""
    echo "예시:"
    echo "  $0                      # 실시간 모니터링 시작"
    echo "  $0 status               # 현재 상태 확인"
    echo "  $0 test-slack           # 슬랙 알림 테스트"
    echo "  $0 emergency            # 긴급 상황 알림 발송"
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
        jq -r ".[] | select(.Names[] | contains(\"$container_name\")) | .State + \"|\" + .Status + \"|\" + (.NetworkSettings.Networks.bridge.IPAddress // \"none\")"
}

# 컨테이너 메트릭 확인
get_container_metrics() {
    local container_name="$1"
    local stats=$(call_portainer_api "containers/$container_name/stats?stream=false")

    if [[ -n "$stats" && "$stats" != "null" ]]; then
        echo "$stats" | jq -r '
            if .memory_stats and .cpu_stats then
                (.memory_stats.usage // 0 | tostring) + "|" +
                (.memory_stats.limit // 0 | tostring) + "|" +
                (.cpu_stats.cpu_usage.total_usage // 0 | tostring)
            else
                "0|0|0"
            end'
    else
        echo "0|0|0"
    fi
}

# 시스템 상태 확인
check_system_status() {
    log_step "📊 SafeWork 시스템 상태 확인"
    echo ""

    local all_healthy=true
    local status_report=""

    for container in "${CONTAINERS[@]}"; do
        local status=$(get_container_status "$container")
        local state=$(echo "$status" | cut -d'|' -f1)
        local health=$(echo "$status" | cut -d'|' -f2)
        local ip=$(echo "$status" | cut -d'|' -f3)

        case "$state" in
            "running")
                if [[ "$health" == *"healthy"* ]]; then
                    echo -e "🟢 $container: ${GREEN}$health${NC} (IP: $ip)"
                    status_report+="✅ $container: 정상 작동\\n"
                elif [[ "$health" == *"starting"* ]]; then
                    echo -e "🟡 $container: ${YELLOW}$health${NC} (IP: $ip)"
                    status_report+="⚠️ $container: 시작 중\\n"
                    all_healthy=false
                else
                    echo -e "🟠 $container: ${YELLOW}$health${NC} (IP: $ip)"
                    status_report+="⚠️ $container: 상태 확인 필요\\n"
                    all_healthy=false
                fi
                ;;
            "exited")
                echo -e "🔴 $container: ${RED}$health${NC}"
                status_report+="❌ $container: 중지됨\\n"
                all_healthy=false
                ;;
            *)
                echo -e "❓ $container: ${PURPLE}$state - $health${NC}"
                status_report+="❓ $container: 알 수 없는 상태\\n"
                all_healthy=false
                ;;
        esac
    done

    echo ""

    # SafeWork 사이트 접속 테스트
    log_step "🌐 SafeWork 사이트 접속 테스트"
    if curl -s --max-time 10 "$HEALTH_CHECK_URL" | grep -q "healthy"; then
        log_success "✅ SafeWork 사이트 정상 접속 가능"
        status_report+="✅ 웹사이트: 정상 접속 가능\\n"
    else
        log_error "❌ SafeWork 사이트 접속 실패"
        status_report+="❌ 웹사이트: 접속 불가\\n"
        all_healthy=false
    fi

    if [[ "$all_healthy" == true ]]; then
        echo -e "\n${GREEN}🎉 모든 시스템이 정상 작동 중입니다!${NC}"
        return 0
    else
        echo -e "\n${RED}⚠️ 일부 시스템에 문제가 있습니다.${NC}"
        return 1
    fi
}

# 성능 메트릭 확인
check_performance_metrics() {
    log_step "📈 SafeWork 성능 메트릭 확인"
    echo ""

    for container in "${CONTAINERS[@]}"; do
        echo -e "${CYAN}=== $container 메트릭 ===${NC}"

        local metrics=$(get_container_metrics "$container")
        local memory_usage=$(echo "$metrics" | cut -d'|' -f1)
        local memory_limit=$(echo "$metrics" | cut -d'|' -f2)
        local cpu_usage=$(echo "$metrics" | cut -d'|' -f3)

        if [[ "$memory_usage" != "0" && "$memory_limit" != "0" ]]; then
            local memory_percent=$(( memory_usage * 100 / memory_limit ))
            local memory_mb=$(( memory_usage / 1024 / 1024 ))
            local limit_mb=$(( memory_limit / 1024 / 1024 ))

            echo "메모리: ${memory_mb}MB / ${limit_mb}MB (${memory_percent}%)"
            echo "CPU: ${cpu_usage} nanoseconds"

            # 메모리 사용률 경고
            if [[ $memory_percent -gt 80 ]]; then
                log_warning "⚠️ $container 메모리 사용률 높음: ${memory_percent}%"
            fi
        else
            echo "메트릭 정보 없음"
        fi
        echo ""
    done
}

# 로그 분석
analyze_logs() {
    local container_name="${1:-safework-app}"
    local lines="${2:-50}"

    log_step "📋 $container_name 로그 분석 (최근 $lines 라인)"
    echo ""

    local logs=$(call_portainer_api "containers/$container_name/logs?stdout=1&stderr=1&tail=$lines")

    # 에러 패턴 검색
    local error_patterns=(
        "ERROR"
        "CRITICAL"
        "FATAL"
        "Exception"
        "Traceback"
        "could not translate host name"
        "connection refused"
        "Database connection"
    )

    local errors_found=false
    for pattern in "${error_patterns[@]}"; do
        if echo "$logs" | grep -i "$pattern" >/dev/null 2>&1; then
            errors_found=true
            break
        fi
    done

    if [[ "$errors_found" == true ]]; then
        log_warning "⚠️ $container_name에서 에러 패턴 발견"
        echo "$logs" | grep -i -E "(ERROR|CRITICAL|FATAL|Exception|Traceback)" | tail -10
    else
        log_success "✅ $container_name 로그에서 심각한 에러 없음"
    fi

    echo ""
    echo -e "${CYAN}최근 로그 (마지막 10라인):${NC}"
    echo "$logs" | sed 's/\x1b\[[0-9;]*m//g' | tail -10
}

# 실시간 모니터링
start_monitoring() {
    log_info "🚀 SafeWork 실시간 모니터링 시작"
    send_slack_notification "SafeWork 실시간 모니터링을 시작합니다." "#36a64f" "모니터링 시작"

    local last_status=""
    local alert_sent=false

    while true; do
        echo -e "\n${CYAN}======= $(date '+%Y-%m-%d %H:%M:%S') =======${NC}"

        if check_system_status; then
            current_status="healthy"
            if [[ "$last_status" != "healthy" ]]; then
                log_success "🎉 시스템이 정상 상태로 복구되었습니다!"
                send_slack_notification "SafeWork 시스템이 정상 상태로 복구되었습니다! 🎉" "#36a64f" "시스템 복구"
                alert_sent=false
            fi
        else
            current_status="unhealthy"
            if [[ "$alert_sent" == false ]]; then
                log_error "⚠️ 시스템 문제 감지 - 슬랙 알림 발송"
                send_slack_notification "SafeWork 시스템에 문제가 감지되었습니다. 즉시 확인이 필요합니다." "#ff0000" "시스템 경고"
                alert_sent=true
            fi
        fi

        last_status="$current_status"

        echo -e "\n${YELLOW}다음 체크까지 ${MONITOR_INTERVAL}초 대기...${NC}"
        sleep $MONITOR_INTERVAL
    done
}

# 슬랙 알림 테스트
test_slack_notification() {
    log_step "📱 슬랙 알림 테스트"

    send_slack_notification "SafeWork 모니터링 시스템 테스트 메시지입니다. 🧪" "#36a64f" "테스트 알림"

    if [[ $? -eq 0 ]]; then
        log_success "✅ 슬랙 알림 전송 성공"
    else
        log_error "❌ 슬랙 알림 전송 실패"
    fi
}

# 긴급 상황 알림
send_emergency_alert() {
    log_error "🚨 긴급 상황 알림 발송"

    local emergency_message=$(cat <<EOF
🚨 SafeWork 긴급 상황 발생!

시스템 상태를 즉시 확인해주세요.

현재 시간: $(date '+%Y-%m-%d %H:%M:%S KST')
모니터링 URL: https://portainer.jclee.me
사이트 URL: https://safework.jclee.me

즉시 조치가 필요합니다! 🆘
EOF
)

    send_slack_notification "$emergency_message" "#ff0000" "🚨 SafeWork 긴급 알림"

    log_error "긴급 알림이 슬랙으로 전송되었습니다."
}

# 메인 실행 로직
main() {
    local action="${1:-monitor}"

    # 로그 디렉토리 생성
    mkdir -p "$(dirname "$LOG_FILE")"

    case "$action" in
        "monitor")
            start_monitoring
            ;;
        "status")
            check_system_status
            ;;
        "health")
            check_system_status
            check_performance_metrics
            ;;
        "performance")
            check_performance_metrics
            ;;
        "logs")
            analyze_logs "${2:-safework-app}" "${3:-50}"
            ;;
        "test-slack")
            test_slack_notification
            ;;
        "emergency")
            send_emergency_alert
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
echo -e "${CYAN}    SafeWork 고도화 모니터링 시스템 v1.0    ${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo ""

# 메인 함수 실행
main "$@"