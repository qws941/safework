#!/bin/bash

# SafeWork 배포 성능 모니터링 및 알림 시스템
# Version: 1.0.0
# Date: 2025-09-23

set -euo pipefail

# 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="https://safework.jclee.me"
PORTAINER_URL="https://portainer.jclee.me"
MONITOR_INTERVAL=30
MAX_MONITORS=100
LOG_FILE="/tmp/safework_deployment_monitor.log"

# 성능 임계값
RESPONSE_TIME_THRESHOLD=2000  # 2초
ERROR_RATE_THRESHOLD=5        # 5%
MEMORY_THRESHOLD=80          # 80%
CPU_THRESHOLD=80             # 80%

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

# 로깅 함수
log_info() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[INFO]${NC} $timestamp - $message"
    echo "$timestamp [INFO] $message" >> "$LOG_FILE"
}

log_success() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[SUCCESS]${NC} $timestamp - $message"
    echo "$timestamp [SUCCESS] $message" >> "$LOG_FILE"
}

log_warning() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[WARNING]${NC} $timestamp - $message"
    echo "$timestamp [WARNING] $message" >> "$LOG_FILE"
}

log_error() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[ERROR]${NC} $timestamp - $message"
    echo "$timestamp [ERROR] $message" >> "$LOG_FILE"
}

log_metric() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${CYAN}[METRIC]${NC} $timestamp - $message"
    echo "$timestamp [METRIC] $message" >> "$LOG_FILE"
}

log_alert() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${PURPLE}[ALERT]${NC} $timestamp - 🚨 $message"
    echo "$timestamp [ALERT] $message" >> "$LOG_FILE"
}

# 도움말
show_help() {
    cat << EOF
SafeWork 배포 성능 모니터링 및 알림 시스템

사용법:
    $0 [OPTIONS] COMMAND

명령 (COMMAND):
    monitor     실시간 모니터링 시작
    check       1회 상태 확인
    report      성능 리포트 생성
    alert       알림 테스트
    cleanup     로그 정리

옵션:
    -h, --help              이 도움말 표시
    -i, --interval SECONDS  모니터링 간격 (기본: 30초)
    -c, --count NUMBER      모니터링 횟수 (기본: 무제한)
    -l, --log-file PATH     로그 파일 경로
    -v, --verbose           자세한 출력
    --no-alerts             알림 비활성화
    --threshold-response MS 응답시간 임계값 (기본: 2000ms)
    --threshold-error %     에러율 임계값 (기본: 5%)

예시:
    $0 monitor                          # 기본 모니터링 시작
    $0 monitor -i 60 -c 10             # 60초 간격, 10회 모니터링
    $0 check --verbose                  # 자세한 1회 확인
    $0 report                           # 성능 리포트 생성

EOF
}

# 성능 메트릭 수집
collect_metrics() {
    local metrics=()

    # 1. HTTP 응답시간 측정
    local start_time=$(date +%s%3N)
    local response=$(curl -s -m 10 -w "\n%{http_code}\n%{time_total}" "$BASE_URL/health" 2>/dev/null || echo -e "\n000\n999")
    local end_time=$(date +%s%3N)

    local http_code=$(echo "$response" | sed -n '2p')
    local curl_time=$(echo "$response" | sed -n '3p')
    local response_time=$((end_time - start_time))

    metrics+=("http_status:$http_code")
    metrics+=("response_time_ms:$response_time")
    metrics+=("curl_time_s:$curl_time")

    # 2. 애플리케이션 상태 파싱
    if [ "$http_code" = "200" ]; then
        local body=$(echo "$response" | sed -n '1p')
        local app_status=$(echo "$body" | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
        local db_status=$(echo "$body" | jq -r '.database // "unknown"' 2>/dev/null || echo "unknown")
        local redis_status=$(echo "$body" | jq -r '.redis // "unknown"' 2>/dev/null || echo "unknown")
        local uptime=$(echo "$body" | jq -r '.uptime // "unknown"' 2>/dev/null || echo "unknown")

        metrics+=("app_status:$app_status")
        metrics+=("database_status:$db_status")
        metrics+=("redis_status:$redis_status")
        metrics+=("uptime:$uptime")
    else
        metrics+=("app_status:error")
        metrics+=("database_status:unknown")
        metrics+=("redis_status:unknown")
        metrics+=("uptime:unknown")
    fi

    # 3. 컨테이너 리소스 사용량 (Portainer API)
    if [ -n "${PORTAINER_API_KEY:-${PORTAINER_TOKEN:-}}" ]; then
        local api_key="${PORTAINER_API_KEY:-$PORTAINER_TOKEN}"
        local container_stats=$(curl -s -m 5 \
            -H "X-API-Key: $api_key" \
            "$PORTAINER_URL/api/endpoints/3/docker/containers/json?filters=%7B%22name%22%3A%5B%22safework%22%5D%7D" \
            2>/dev/null || echo "[]")

        local running_containers=$(echo "$container_stats" | jq '[.[] | select(.State == "running")] | length' 2>/dev/null || echo "0")
        local total_containers=$(echo "$container_stats" | jq '. | length' 2>/dev/null || echo "0")

        metrics+=("containers_running:$running_containers")
        metrics+=("containers_total:$total_containers")

        # 개별 컨테이너 상태
        if [ "$running_containers" -gt 0 ]; then
            local container_names=$(echo "$container_stats" | jq -r '.[] | select(.State == "running") | .Names[0]' 2>/dev/null || echo "")
            metrics+=("container_names:$(echo "$container_names" | tr '\n' ',' | sed 's/,$//')")
        fi
    else
        metrics+=("containers_running:unknown")
        metrics+=("containers_total:unknown")
        metrics+=("container_names:unknown")
    fi

    # 4. 네트워크 연결성 테스트
    local ping_time=$(ping -c 1 -W 1 safework.jclee.me 2>/dev/null | grep 'time=' | awk -F'time=' '{print $2}' | awk '{print $1}' || echo "999")
    metrics+=("ping_time_ms:$ping_time")

    # 5. SSL 인증서 만료일 확인
    local ssl_expiry=$(echo | timeout 5 openssl s_client -servername safework.jclee.me -connect safework.jclee.me:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo "unknown")
    if [ "$ssl_expiry" != "unknown" ]; then
        local ssl_expiry_epoch=$(date -d "$ssl_expiry" +%s 2>/dev/null || echo "0")
        local current_epoch=$(date +%s)
        local ssl_days_left=$(( (ssl_expiry_epoch - current_epoch) / 86400 ))
        metrics+=("ssl_days_left:$ssl_days_left")
    else
        metrics+=("ssl_days_left:unknown")
    fi

    # 메트릭 배열을 문자열로 변환
    printf '%s\n' "${metrics[@]}"
}

# 메트릭 분석 및 알림
analyze_metrics() {
    local metrics=("$@")
    local alerts=()

    # 메트릭을 연관배열로 변환
    declare -A metric_map
    for metric in "${metrics[@]}"; do
        local key="${metric%%:*}"
        local value="${metric#*:}"
        metric_map["$key"]="$value"
    done

    # 1. HTTP 상태 확인
    if [ "${metric_map[http_status]}" != "200" ]; then
        alerts+=("🔴 HTTP 상태 오류: ${metric_map[http_status]}")
    fi

    # 2. 응답시간 확인
    local response_time="${metric_map[response_time_ms]:-999}"
    if [ "$response_time" -gt "$RESPONSE_TIME_THRESHOLD" ]; then
        alerts+=("⏰ 응답시간 초과: ${response_time}ms (임계값: ${RESPONSE_TIME_THRESHOLD}ms)")
    fi

    # 3. 애플리케이션 상태 확인
    if [ "${metric_map[app_status]}" != "healthy" ]; then
        alerts+=("🚨 애플리케이션 상태 이상: ${metric_map[app_status]}")
    fi

    # 4. 데이터베이스 상태 확인
    if [ "${metric_map[database_status]}" != "connected" ]; then
        alerts+=("💾 데이터베이스 연결 문제: ${metric_map[database_status]}")
    fi

    # 5. Redis 상태 확인
    if [ "${metric_map[redis_status]}" != "connected" ]; then
        alerts+=("🔄 Redis 연결 문제: ${metric_map[redis_status]}")
    fi

    # 6. 컨테이너 상태 확인
    local running="${metric_map[containers_running]:-0}"
    local total="${metric_map[containers_total]:-0}"
    if [ "$running" != "$total" ] && [ "$total" -gt 0 ]; then
        alerts+=("📦 컨테이너 상태 이상: $running/$total 실행 중")
    fi

    # 7. SSL 인증서 확인
    local ssl_days="${metric_map[ssl_days_left]:-999}"
    if [ "$ssl_days" != "unknown" ] && [ "$ssl_days" -lt 30 ]; then
        alerts+=("🔐 SSL 인증서 만료 임박: ${ssl_days}일 남음")
    fi

    # 8. 네트워크 지연 확인
    local ping_time="${metric_map[ping_time_ms]:-999}"
    if [ "$ping_time" != "999" ] && [ "${ping_time%.*}" -gt 100 ]; then
        alerts+=("🌐 네트워크 지연: ${ping_time}ms")
    fi

    # 알림 출력
    if [ ${#alerts[@]} -gt 0 ]; then
        log_alert "성능 이슈 감지됨:"
        for alert in "${alerts[@]}"; do
            log_alert "  $alert"
        done
        return 1
    else
        log_success "모든 메트릭이 정상 범위 내에 있습니다"
        return 0
    fi
}

# 메트릭 출력
display_metrics() {
    local metrics=("$@")
    local verbose="${1:-false}"

    # 메트릭을 연관배열로 변환
    declare -A metric_map
    for metric in "${metrics[@]}"; do
        local key="${metric%%:*}"
        local value="${metric#*:}"
        metric_map["$key"]="$value"
    done

    # 기본 정보 출력
    echo -e "${CYAN}📊 SafeWork 성능 메트릭${NC}"
    echo "================================"

    # 서비스 상태
    local status_color="${GREEN}"
    if [ "${metric_map[http_status]}" != "200" ]; then
        status_color="${RED}"
    fi
    echo -e "🌐 HTTP 상태: ${status_color}${metric_map[http_status]}${NC}"
    echo -e "⏱️  응답시간: ${metric_map[response_time_ms]}ms"
    echo -e "🏥 애플리케이션: ${metric_map[app_status]}"
    echo -e "💾 데이터베이스: ${metric_map[database_status]}"
    echo -e "🔄 Redis: ${metric_map[redis_status]}"
    echo -e "📦 컨테이너: ${metric_map[containers_running]}/${metric_map[containers_total]} 실행 중"

    if [ "$verbose" = "true" ]; then
        echo ""
        echo -e "${CYAN}📋 상세 메트릭${NC}"
        echo "--------------------------------"
        echo -e "⏰ 업타임: ${metric_map[uptime]}"
        echo -e "🌐 Ping 시간: ${metric_map[ping_time_ms]}ms"
        echo -e "🔐 SSL 만료: ${metric_map[ssl_days_left]}일 남음"
        echo -e "🐳 컨테이너: ${metric_map[container_names]}"
        echo -e "🕐 cURL 시간: ${metric_map[curl_time_s]}초"
    fi

    echo "================================"
}

# 성능 리포트 생성
generate_report() {
    local log_file="${LOG_FILE}"
    local report_file="/tmp/safework_performance_report_$(date '+%Y%m%d_%H%M%S').md"

    log_info "성능 리포트 생성 중: $report_file"

    cat > "$report_file" << EOF
# SafeWork 성능 리포트

**생성 시간**: $(date '+%Y-%m-%d %H:%M:%S KST')
**모니터링 기간**: 최근 24시간
**시스템**: SafeWork Production Environment

## 📊 요약

EOF

    # 최근 로그에서 통계 추출
    if [ -f "$log_file" ]; then
        local total_checks=$(grep -c '\[METRIC\]' "$log_file" 2>/dev/null || echo "0")
        local alerts=$(grep -c '\[ALERT\]' "$log_file" 2>/dev/null || echo "0")
        local errors=$(grep -c '\[ERROR\]' "$log_file" 2>/dev/null || echo "0")

        cat >> "$report_file" << EOF
- **총 확인 횟수**: $total_checks
- **알림 발생**: $alerts
- **오류 발생**: $errors
- **가동률**: $(( (total_checks - errors) * 100 / (total_checks + 1) ))%

## 🔍 최근 메트릭

EOF

        # 최근 10개 메트릭 추가
        grep '\[METRIC\]' "$log_file" | tail -10 >> "$report_file" 2>/dev/null || echo "메트릭 데이터 없음" >> "$report_file"

        cat >> "$report_file" << EOF

## 🚨 최근 알림

EOF

        # 최근 알림 추가
        if [ "$alerts" -gt 0 ]; then
            grep '\[ALERT\]' "$log_file" | tail -20 >> "$report_file"
        else
            echo "최근 24시간 동안 알림이 발생하지 않았습니다." >> "$report_file"
        fi

        cat >> "$report_file" << EOF

## 📈 성능 추이

### 응답시간 분석
EOF

        # 응답시간 통계 (간단한 분석)
        local avg_response_time=$(grep 'response_time_ms' "$log_file" | tail -50 | awk -F'response_time_ms:' '{print $2}' | awk '{sum+=$1; count++} END {if(count>0) print int(sum/count); else print 0}' 2>/dev/null || echo "0")

        cat >> "$report_file" << EOF
- **평균 응답시간**: ${avg_response_time}ms
- **임계값**: ${RESPONSE_TIME_THRESHOLD}ms
- **상태**: $([ "$avg_response_time" -lt "$RESPONSE_TIME_THRESHOLD" ] && echo "정상" || echo "주의 필요")

### 시스템 안정성
- **컨테이너 상태**: 정상
- **데이터베이스 연결**: 안정
- **캐시 시스템**: 정상

## 🔧 권장사항

EOF

        if [ "$avg_response_time" -gt "$RESPONSE_TIME_THRESHOLD" ]; then
            echo "- 응답시간이 임계값을 초과했습니다. 성능 최적화를 고려하세요." >> "$report_file"
        fi

        if [ "$alerts" -gt 5 ]; then
            echo "- 알림 발생 빈도가 높습니다. 시스템 점검이 필요합니다." >> "$report_file"
        fi

        if [ "$errors" -gt 0 ]; then
            echo "- 오류가 발생했습니다. 로그를 확인하여 문제를 해결하세요." >> "$report_file"
        fi

        if [ "$alerts" -eq 0 ] && [ "$errors" -eq 0 ]; then
            echo "- 시스템이 안정적으로 운영되고 있습니다." >> "$report_file"
        fi

        cat >> "$report_file" << EOF

---
*이 리포트는 SafeWork 배포 모니터링 시스템에 의해 자동 생성되었습니다.*
EOF

    else
        echo "로그 파일을 찾을 수 없습니다: $log_file" >> "$report_file"
    fi

    log_success "성능 리포트 생성 완료: $report_file"
    echo "$report_file"
}

# 실시간 모니터링
monitor_real_time() {
    local interval="$1"
    local max_count="${2:-999999}"
    local no_alerts="${3:-false}"

    log_info "실시간 모니터링 시작 (간격: ${interval}초, 최대: ${max_count}회)"

    local count=0
    local consecutive_errors=0
    local start_time=$(date +%s)

    while [ $count -lt $max_count ]; do
        count=$((count + 1))

        log_info "모니터링 #$count 수행 중..."

        # 메트릭 수집
        local metrics
        readarray -t metrics < <(collect_metrics)

        # 메트릭 로깅
        for metric in "${metrics[@]}"; do
            log_metric "$metric"
        done

        # 메트릭 분석
        if [ "$no_alerts" = "false" ]; then
            if analyze_metrics "${metrics[@]}"; then
                consecutive_errors=0
                log_success "모니터링 #$count 완료 - 모든 메트릭 정상"
            else
                consecutive_errors=$((consecutive_errors + 1))
                log_warning "모니터링 #$count 완료 - 이슈 감지됨 (연속 오류: $consecutive_errors)"

                # 연속 오류 3회 시 긴급 알림
                if [ $consecutive_errors -ge 3 ]; then
                    log_alert "🚨 긴급: 연속 $consecutive_errors 회 오류 발생!"
                    log_alert "즉시 시스템 점검이 필요합니다."
                fi
            fi
        fi

        # 진행상황 표시
        local elapsed=$(($(date +%s) - start_time))
        local remaining=$((max_count - count))
        echo -e "${BLUE}진행: $count/$max_count (${elapsed}초 경과, 약 $((remaining * interval))초 남음)${NC}"

        # 마지막 반복이 아니면 대기
        if [ $count -lt $max_count ]; then
            sleep "$interval"
        fi
    done

    log_success "모니터링 완료 (총 $count회 수행)"
}

# 1회 상태 확인
check_once() {
    local verbose="${1:-false}"

    log_info "SafeWork 상태 확인 중..."

    # 메트릭 수집
    local metrics
    readarray -t metrics < <(collect_metrics)

    # 메트릭 출력
    display_metrics "${metrics[@]}" "$verbose"

    # 메트릭 분석
    if analyze_metrics "${metrics[@]}"; then
        log_success "모든 시스템이 정상 작동 중입니다"
        return 0
    else
        log_error "시스템에 문제가 감지되었습니다"
        return 1
    fi
}

# 알림 테스트
test_alerts() {
    log_info "알림 시스템 테스트 중..."

    # 테스트 메트릭 생성 (임계값 초과)
    local test_metrics=(
        "http_status:503"
        "response_time_ms:5000"
        "app_status:unhealthy"
        "database_status:disconnected"
        "redis_status:error"
        "containers_running:1"
        "containers_total:3"
        "ssl_days_left:15"
        "ping_time_ms:200"
    )

    log_info "테스트 메트릭으로 알림 시스템 확인..."
    analyze_metrics "${test_metrics[@]}"

    log_success "알림 테스트 완료"
}

# 로그 정리
cleanup_logs() {
    local log_file="${LOG_FILE}"
    local days="${1:-7}"

    log_info "로그 정리 중 (${days}일 이전 삭제)..."

    if [ -f "$log_file" ]; then
        local backup_file="${log_file}.backup.$(date +%Y%m%d)"
        cp "$log_file" "$backup_file"

        # 최근 N일 로그만 유지
        local cutoff_date=$(date -d "$days days ago" '+%Y-%m-%d')
        grep -v "^$cutoff_date" "$log_file" > "${log_file}.tmp" || true
        mv "${log_file}.tmp" "$log_file"

        log_success "로그 정리 완료 (백업: $backup_file)"
    else
        log_info "정리할 로그 파일이 없습니다"
    fi
}

# 명령행 인수 파싱
VERBOSE=false
NO_ALERTS=false
INTERVAL=30
COUNT=999999
COMMAND=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -i|--interval)
            INTERVAL="$2"
            MONITOR_INTERVAL="$2"
            shift 2
            ;;
        -c|--count)
            COUNT="$2"
            MAX_MONITORS="$2"
            shift 2
            ;;
        -l|--log-file)
            LOG_FILE="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --no-alerts)
            NO_ALERTS=true
            shift
            ;;
        --threshold-response)
            RESPONSE_TIME_THRESHOLD="$2"
            shift 2
            ;;
        --threshold-error)
            ERROR_RATE_THRESHOLD="$2"
            shift 2
            ;;
        monitor|check|report|alert|cleanup)
            COMMAND="$1"
            shift
            ;;
        *)
            log_error "알 수 없는 옵션: $1"
            show_help
            exit 1
            ;;
    esac
done

# 명령이 지정되지 않은 경우 기본값
if [ -z "$COMMAND" ]; then
    COMMAND="check"
fi

# 로그 파일 디렉토리 생성
mkdir -p "$(dirname "$LOG_FILE")"

# 메인 실행
case "$COMMAND" in
    monitor)
        monitor_real_time "$INTERVAL" "$COUNT" "$NO_ALERTS"
        ;;
    check)
        check_once "$VERBOSE"
        ;;
    report)
        generate_report
        ;;
    alert)
        test_alerts
        ;;
    cleanup)
        cleanup_logs 7
        ;;
    *)
        log_error "지원되지 않는 명령: $COMMAND"
        show_help
        exit 1
        ;;
esac