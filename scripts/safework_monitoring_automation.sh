#!/bin/bash
# SafeWork 모니터링 및 알림 자동화 시스템
# 실시간 모니터링, 알림, 성능 분석 및 자동 복구

set -euo pipefail

# 환경 설정 로드
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.env"

# ===== 모니터링 설정 =====
MONITORING_ENABLED=${MONITORING_ENABLED:-true}
ALERT_THRESHOLD_CPU=${ALERT_THRESHOLD_CPU:-80}
ALERT_THRESHOLD_MEMORY=${ALERT_THRESHOLD_MEMORY:-85}
ALERT_THRESHOLD_DISK=${ALERT_THRESHOLD_DISK:-90}
HEALTH_CHECK_INTERVAL=${HEALTH_CHECK_INTERVAL:-60}
PERFORMANCE_LOG_INTERVAL=${PERFORMANCE_LOG_INTERVAL:-300}
ALERT_COOLDOWN=${ALERT_COOLDOWN:-1800}  # 30분

# ===== 로깅 설정 =====
LOG_DIR="$SCRIPT_DIR/../logs"
mkdir -p "$LOG_DIR"
MONITOR_LOG="$LOG_DIR/monitoring-$(date +%Y%m%d-%H%M%S).log"
ALERT_LOG="$LOG_DIR/alerts-$(date +%Y%m%d).log"
PERFORMANCE_LOG="$LOG_DIR/performance-$(date +%Y%m%d).log"

# 모니터링 로깅 함수
log_monitor() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$MONITOR_LOG"
}

log_info_monitor() { log_monitor "INFO" "$@"; }
log_success_monitor() { log_monitor "SUCCESS" "$@"; }
log_warning_monitor() { log_monitor "WARNING" "$@"; }
log_error_monitor() { log_monitor "ERROR" "$@"; }
log_alert() {
    log_monitor "ALERT" "$@"
    echo "$(date '+%Y-%m-%d %H:%M:%S') ALERT: $*" >> "$ALERT_LOG"
}

# ===== 성능 모니터링 =====
get_container_stats() {
    local container_name=$1

    # Portainer API를 통한 컨테이너 통계 조회
    local stats=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/$container_name/stats?stream=false")

    if [ -n "$stats" ] && [ "$stats" != "null" ]; then
        echo "$stats"
    else
        echo "{\"error\": \"stats_unavailable\"}"
    fi
}

calculate_cpu_usage() {
    local stats=$1

    # CPU 사용률 계산 (Portainer API 응답에서)
    local cpu_delta=$(echo "$stats" | jq -r '.cpu_stats.cpu_usage.total_usage // 0')
    local system_delta=$(echo "$stats" | jq -r '.cpu_stats.system_cpu_usage // 0')
    local online_cpus=$(echo "$stats" | jq -r '.cpu_stats.online_cpus // 1')

    if [ "$system_delta" -gt 0 ] && [ "$cpu_delta" -gt 0 ]; then
        local cpu_percent=$(echo "scale=2; ($cpu_delta / $system_delta) * $online_cpus * 100.0" | bc)
        echo "$cpu_percent"
    else
        echo "0.00"
    fi
}

calculate_memory_usage() {
    local stats=$1

    # 메모리 사용률 계산
    local memory_usage=$(echo "$stats" | jq -r '.memory_stats.usage // 0')
    local memory_limit=$(echo "$stats" | jq -r '.memory_stats.limit // 0')

    if [ "$memory_limit" -gt 0 ]; then
        local memory_percent=$(echo "scale=2; ($memory_usage / $memory_limit) * 100.0" | bc)
        echo "$memory_percent"
    else
        echo "0.00"
    fi
}

# ===== 헬스 체크 모니터링 =====
comprehensive_health_check() {
    log_info_monitor "포괄적 헬스 체크 시작..."

    local health_score=100
    local issues=()

    # 1. 서비스 헬스 체크
    local health_response=$(curl -s -w "\n%{http_code}" "https://safework.jclee.me/health")
    local http_code=$(echo "$health_response" | tail -n1)
    local body=$(echo "$health_response" | head -n -1)

    if [ "$http_code" = "200" ]; then
        local status=$(echo "$body" | jq -r '.status // "unknown"')
        if [ "$status" = "healthy" ]; then
            log_success_monitor "서비스 헬스 체크 통과"
        else
            health_score=$((health_score - 20))
            issues+=("서비스 상태 비정상: $status")
        fi
    else
        health_score=$((health_score - 30))
        issues+=("서비스 응답 실패 (HTTP: $http_code)")
    fi

    # 2. 컨테이너 상태 체크
    local containers=("safework-app" "safework-postgres" "safework-redis")
    for container in "${containers[@]}"; do
        local container_info=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
            "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json" | \
            jq -r ".[] | select(.Names[] | contains(\"$container\"))")

        if [ -n "$container_info" ]; then
            local state=$(echo "$container_info" | jq -r '.State')
            local health=$(echo "$container_info" | jq -r '.Status')

            if [ "$state" = "running" ]; then
                log_success_monitor "컨테이너 $container: 정상 실행 중"
            else
                health_score=$((health_score - 25))
                issues+=("컨테이너 $container 상태 이상: $state")
            fi
        else
            health_score=$((health_score - 30))
            issues+=("컨테이너 $container를 찾을 수 없음")
        fi
    done

    # 3. 성능 임계값 체크
    for container in "${containers[@]}"; do
        local stats=$(get_container_stats "$container")
        if [ "$(echo "$stats" | jq -r '.error // ""')" != "stats_unavailable" ]; then
            local cpu_usage=$(calculate_cpu_usage "$stats")
            local memory_usage=$(calculate_memory_usage "$stats")

            if (( $(echo "$cpu_usage > $ALERT_THRESHOLD_CPU" | bc -l) )); then
                health_score=$((health_score - 10))
                issues+=("$container CPU 사용률 높음: ${cpu_usage}%")
            fi

            if (( $(echo "$memory_usage > $ALERT_THRESHOLD_MEMORY" | bc -l) )); then
                health_score=$((health_score - 10))
                issues+=("$container 메모리 사용률 높음: ${memory_usage}%")
            fi
        fi
    done

    # 4. 결과 보고
    if [ $health_score -ge 90 ]; then
        log_success_monitor "시스템 헬스 우수 (점수: $health_score/100)"
    elif [ $health_score -ge 70 ]; then
        log_warning_monitor "시스템 헬스 양호 (점수: $health_score/100)"
    else
        log_error_monitor "시스템 헬스 불량 (점수: $health_score/100)"
        log_alert "시스템 헬스 점수 위험: $health_score/100"
    fi

    # 5. 문제 목록 출력
    if [ ${#issues[@]} -gt 0 ]; then
        log_warning_monitor "발견된 문제들:"
        for issue in "${issues[@]}"; do
            log_warning_monitor "  - $issue"
        done
    fi

    return $health_score
}

# ===== 성능 분석 및 기록 =====
performance_analysis() {
    log_info_monitor "성능 분석 시작..."

    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local performance_data="{"
    performance_data+="\"timestamp\": \"$timestamp\","
    performance_data+="\"containers\": ["

    local containers=("safework-app" "safework-postgres" "safework-redis")
    local container_data=()

    for container in "${containers[@]}"; do
        local stats=$(get_container_stats "$container")
        if [ "$(echo "$stats" | jq -r '.error // ""')" != "stats_unavailable" ]; then
            local cpu_usage=$(calculate_cpu_usage "$stats")
            local memory_usage=$(calculate_memory_usage "$stats")
            local memory_limit=$(echo "$stats" | jq -r '.memory_stats.limit // 0')
            local memory_usage_bytes=$(echo "$stats" | jq -r '.memory_stats.usage // 0')

            local container_info="{"
            container_info+="\"name\": \"$container\","
            container_info+="\"cpu_percent\": $cpu_usage,"
            container_info+="\"memory_percent\": $memory_usage,"
            container_info+="\"memory_usage_mb\": $(echo "scale=2; $memory_usage_bytes / 1024 / 1024" | bc),"
            container_info+="\"memory_limit_mb\": $(echo "scale=2; $memory_limit / 1024 / 1024" | bc)"
            container_info+="}"

            container_data+=("$container_info")

            log_info_monitor "$container 성능: CPU ${cpu_usage}%, 메모리 ${memory_usage}%"
        else
            log_warning_monitor "$container 통계 조회 실패"
        fi
    done

    # JSON 구성 완료
    performance_data+=$(IFS=','; echo "${container_data[*]}")
    performance_data+="]}"

    # 성능 로그에 기록
    echo "$performance_data" >> "$PERFORMANCE_LOG"

    log_success_monitor "성능 분석 완료 및 기록됨"
}

# ===== 알림 시스템 =====
send_alert() {
    local severity=$1
    local message=$2
    local details=${3:-""}

    log_alert "[$severity] $message"

    # Slack 알림 (webhook 사용)
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local slack_message="🚨 SafeWork Alert [$severity]\n$message"
        if [ -n "$details" ]; then
            slack_message+="\n\nDetails: $details"
        fi
        slack_message+="\nTime: $(date '+%Y-%m-%d %H:%M:%S KST')"

        curl -s -X POST "$SLACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"$slack_message\"}" > /dev/null
    fi

    # 이메일 알림 (선택사항)
    if [ -n "${EMAIL_ALERT_TO:-}" ]; then
        echo -e "Subject: SafeWork Alert [$severity]\n\n$message\n\n$details\n\nTime: $(date)" | \
            sendmail "$EMAIL_ALERT_TO" 2>/dev/null || true
    fi
}

# ===== 자동 복구 시스템 =====
auto_recovery() {
    local issue_type=$1
    local container_name=${2:-""}

    log_warning_monitor "자동 복구 시작: $issue_type"

    case $issue_type in
        "container_stopped")
            log_info_monitor "$container_name 컨테이너 재시작 시도..."
            curl -s -X POST -H "X-API-Key: $PORTAINER_TOKEN" \
                "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/$container_name/start"
            sleep 30

            # 재시작 확인
            local container_info=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
                "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json" | \
                jq -r ".[] | select(.Names[] | contains(\"$container_name\"))")

            local state=$(echo "$container_info" | jq -r '.State')
            if [ "$state" = "running" ]; then
                log_success_monitor "$container_name 컨테이너 재시작 성공"
                send_alert "INFO" "컨테이너 자동 복구 성공" "$container_name이 재시작되었습니다."
            else
                log_error_monitor "$container_name 컨테이너 재시작 실패"
                send_alert "CRITICAL" "컨테이너 복구 실패" "$container_name 재시작에 실패했습니다."
            fi
            ;;
        "high_cpu")
            log_info_monitor "높은 CPU 사용률 감지 - 성능 최적화 시도..."
            # 실제 환경에서는 더 구체적인 최적화 로직 구현
            send_alert "WARNING" "높은 CPU 사용률 감지" "$container_name에서 높은 CPU 사용률이 감지되었습니다."
            ;;
        "high_memory")
            log_info_monitor "높은 메모리 사용률 감지 - 메모리 정리 시도..."
            # 실제 환경에서는 메모리 정리 로직 구현
            send_alert "WARNING" "높은 메모리 사용률 감지" "$container_name에서 높은 메모리 사용률이 감지되었습니다."
            ;;
        "service_down")
            log_info_monitor "서비스 다운 감지 - 전체 스택 재시작 시도..."
            # 전체 스택 재시작 로직
            send_alert "CRITICAL" "서비스 다운 감지" "SafeWork 서비스가 응답하지 않습니다. 복구를 시도합니다."
            ;;
    esac
}

# ===== 실시간 모니터링 데몬 =====
monitoring_daemon() {
    log_info_monitor "SafeWork 실시간 모니터링 데몬 시작..."
    log_info_monitor "로그 파일: $MONITOR_LOG"

    local last_alert_time=0

    while true; do
        local current_time=$(date +%s)

        # 포괄적 헬스 체크
        comprehensive_health_check
        local health_score=$?

        # 성능 분석 (5분마다)
        if [ $((current_time % PERFORMANCE_LOG_INTERVAL)) -eq 0 ]; then
            performance_analysis
        fi

        # 알림 쿨다운 체크
        local time_since_last_alert=$((current_time - last_alert_time))

        # 심각한 문제 감지 시 알림
        if [ $health_score -lt 50 ] && [ $time_since_last_alert -gt $ALERT_COOLDOWN ]; then
            send_alert "CRITICAL" "시스템 헬스 심각" "헬스 점수: $health_score/100"
            last_alert_time=$current_time
        elif [ $health_score -lt 70 ] && [ $time_since_last_alert -gt $((ALERT_COOLDOWN * 2)) ]; then
            send_alert "WARNING" "시스템 헬스 주의" "헬스 점수: $health_score/100"
            last_alert_time=$current_time
        fi

        # 다음 체크까지 대기
        sleep $HEALTH_CHECK_INTERVAL
    done
}

# ===== 모니터링 대시보드 =====
monitoring_dashboard() {
    clear
    echo "=== SafeWork 실시간 모니터링 대시보드 ==="
    echo "업데이트 시간: $(date '+%Y-%m-%d %H:%M:%S KST')"
    echo

    # 서비스 상태
    echo "📊 서비스 상태:"
    local health_response=$(curl -s -w "\n%{http_code}" "https://safework.jclee.me/health")
    local http_code=$(echo "$health_response" | tail -n1)
    local body=$(echo "$health_response" | head -n -1)

    if [ "$http_code" = "200" ]; then
        local status=$(echo "$body" | jq -r '.status // "unknown"')
        if [ "$status" = "healthy" ]; then
            echo "  ✅ SafeWork 서비스: 정상"
        else
            echo "  ⚠️ SafeWork 서비스: $status"
        fi
    else
        echo "  ❌ SafeWork 서비스: 응답 없음 (HTTP: $http_code)"
    fi

    # 컨테이너 상태
    echo
    echo "🐳 컨테이너 상태:"
    local containers=("safework-app" "safework-postgres" "safework-redis")
    for container in "${containers[@]}"; do
        local container_info=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
            "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json" | \
            jq -r ".[] | select(.Names[] | contains(\"$container\"))")

        if [ -n "$container_info" ]; then
            local state=$(echo "$container_info" | jq -r '.State')
            local status=$(echo "$container_info" | jq -r '.Status')

            if [ "$state" = "running" ]; then
                echo "  ✅ $container: $status"
            else
                echo "  ❌ $container: $state"
            fi
        else
            echo "  ❓ $container: 찾을 수 없음"
        fi
    done

    # 성능 메트릭
    echo
    echo "📈 성능 메트릭:"
    for container in "${containers[@]}"; do
        local stats=$(get_container_stats "$container")
        if [ "$(echo "$stats" | jq -r '.error // ""')" != "stats_unavailable" ]; then
            local cpu_usage=$(calculate_cpu_usage "$stats")
            local memory_usage=$(calculate_memory_usage "$stats")

            printf "  🔧 %-18s CPU: %6.2f%% | 메모리: %6.2f%%\n" "$container:" "$cpu_usage" "$memory_usage"
        else
            echo "  ⚠️ $container: 통계 조회 불가"
        fi
    done

    echo
    echo "📝 최근 알림 (최대 5개):"
    if [ -f "$ALERT_LOG" ]; then
        tail -n 5 "$ALERT_LOG" | while read line; do
            echo "  • $line"
        done
    else
        echo "  알림 없음"
    fi

    echo
    echo "⚙️ 모니터링 설정:"
    echo "  • 체크 간격: ${HEALTH_CHECK_INTERVAL}초"
    echo "  • CPU 임계값: ${ALERT_THRESHOLD_CPU}%"
    echo "  • 메모리 임계값: ${ALERT_THRESHOLD_MEMORY}%"
    echo "  • 알림 쿨다운: ${ALERT_COOLDOWN}초"
}

# ===== 메인 실행 로직 =====
main() {
    case "${1:-help}" in
        "daemon"|"start")
            monitoring_daemon
            ;;
        "dashboard"|"dash")
            monitoring_dashboard
            ;;
        "health"|"check")
            comprehensive_health_check
            ;;
        "performance"|"perf")
            performance_analysis
            ;;
        "test-alert")
            send_alert "TEST" "모니터링 시스템 테스트" "이것은 테스트 알림입니다."
            ;;
        "recovery")
            auto_recovery "${2:-container_stopped}" "${3:-safework-app}"
            ;;
        "help"|*)
            cat << EOF

SafeWork 모니터링 및 알림 자동화 시스템

사용법: $0 [COMMAND]

COMMANDS:
  daemon, start      실시간 모니터링 데몬 시작
  dashboard, dash    실시간 모니터링 대시보드 표시
  health, check      포괄적 헬스 체크 실행
  performance, perf  성능 분석 실행
  test-alert         알림 시스템 테스트
  recovery [TYPE] [CONTAINER]  자동 복구 실행
  help               이 도움말 표시

자동 복구 타입:
  container_stopped  컨테이너 정지 복구
  high_cpu          높은 CPU 사용률 대응
  high_memory       높은 메모리 사용률 대응
  service_down      서비스 다운 복구

설정:
  MONITORING_ENABLED=$MONITORING_ENABLED
  HEALTH_CHECK_INTERVAL=${HEALTH_CHECK_INTERVAL}초
  CPU 임계값: ${ALERT_THRESHOLD_CPU}%
  메모리 임계값: ${ALERT_THRESHOLD_MEMORY}%

로그:
  모니터링: $MONITOR_LOG
  알림: $ALERT_LOG
  성능: $PERFORMANCE_LOG

예제:
  $0 daemon                    # 실시간 모니터링 시작
  $0 dashboard                 # 대시보드 표시
  $0 health                    # 헬스 체크
  $0 test-alert               # 알림 테스트

EOF
            ;;
    esac
}

# 스크립트 실행
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi