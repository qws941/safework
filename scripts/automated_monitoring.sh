#!/bin/bash
# SafeWork 자동화된 시스템 모니터링 스크립트
# 시스템 안정성과 운영 상태를 지속적으로 모니터링

set -euo pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 설정
PORTAINER_URL="https://portainer.jclee.me"
PORTAINER_TOKEN="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
PRODUCTION_URL="https://safework.jclee.me"
ENDPOINT_ID="3"
STACK_ID="43"

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Portainer API 호출 함수
portainer_api() {
    local endpoint="$1"
    curl -s -H "X-API-Key: $PORTAINER_TOKEN" "$PORTAINER_URL/api$endpoint"
}

# 애플리케이션 헬스체크
check_application_health() {
    log_info "애플리케이션 헬스체크 시작..."

    local response
    response=$(curl -s -o /dev/null -w "%{http_code}:%{time_total}" "$PRODUCTION_URL/health")
    local http_code="${response%:*}"
    local response_time="${response#*:}"

    if [[ "$http_code" == "200" ]]; then
        log_success "애플리케이션 정상 (HTTP: $http_code, 응답시간: ${response_time}초)"
        return 0
    else
        log_error "애플리케이션 오류 (HTTP: $http_code)"
        return 1
    fi
}

# 컨테이너 상태 확인
check_container_status() {
    log_info "컨테이너 상태 확인 시작..."

    local containers
    containers=$(portainer_api "/endpoints/$ENDPOINT_ID/docker/containers/json" | \
        jq -r '.[] | select(.Names[] | contains("safework")) | {name: .Names[0], state: .State, status: .Status}')

    local all_healthy=true

    while IFS= read -r container; do
        if [[ -n "$container" ]]; then
            local name=$(echo "$container" | jq -r '.name')
            local state=$(echo "$container" | jq -r '.state')
            local status=$(echo "$container" | jq -r '.status')

            if [[ "$state" == "running" ]] && [[ "$status" == *"healthy"* ]]; then
                log_success "컨테이너 정상: $name ($status)"
            else
                log_warning "컨테이너 상태 확인: $name - $state ($status)"
                all_healthy=false
            fi
        fi
    done <<< "$containers"

    return $([[ "$all_healthy" == "true" ]] && echo 0 || echo 1)
}

# 데이터베이스 연결 테스트
test_database_connectivity() {
    log_info "데이터베이스 연결 테스트 시작..."

    local response
    response=$(curl -s -X POST "$PRODUCTION_URL/survey/api/submit" \
        -H "Content-Type: application/json" \
        -d '{"form_type":"001","name":"자동모니터링테스트","age":1}')

    if echo "$response" | jq -e '.success' >/dev/null 2>&1; then
        local survey_id=$(echo "$response" | jq -r '.survey_id // "N/A"')
        log_success "데이터베이스 연결 정상 (설문 ID: $survey_id)"
        return 0
    else
        log_error "데이터베이스 연결 실패: $response"
        return 1
    fi
}

# 스택 상태 확인
check_stack_status() {
    log_info "Portainer 스택 상태 확인 시작..."

    local stack_info
    stack_info=$(portainer_api "/stacks/$STACK_ID")

    local status=$(echo "$stack_info" | jq -r '.Status // 0')
    local name=$(echo "$stack_info" | jq -r '.Name // "unknown"')

    if [[ "$status" == "1" ]]; then
        log_success "스택 정상: $name (활성화)"
        return 0
    else
        log_error "스택 상태 이상: $name (상태: $status)"
        return 1
    fi
}

# 시스템 전체 상태 요약
generate_status_summary() {
    log_info "시스템 상태 요약 생성 중..."

    echo "========================================"
    echo "SafeWork 시스템 모니터링 요약"
    echo "생성시간: $(date '+%Y-%m-%d %H:%M:%S KST')"
    echo "========================================"

    # 각 체크 실행
    local checks=("애플리케이션" "컨테이너" "데이터베이스" "스택")
    local results=()

    check_application_health && results+=("✅") || results+=("❌")
    check_container_status && results+=("✅") || results+=("❌")
    test_database_connectivity && results+=("✅") || results+=("❌")
    check_stack_status && results+=("✅") || results+=("❌")

    echo
    for i in "${!checks[@]}"; do
        echo "${results[$i]} ${checks[$i]} 상태"
    done

    echo
    echo "URL: $PRODUCTION_URL"
    echo "스택 ID: $STACK_ID"
    echo "엔드포인트: $ENDPOINT_ID"
    echo "========================================"
}

# 자동 복구 시도 (기본적인 것만)
attempt_auto_recovery() {
    log_info "자동 복구 시도 중..."

    # 간단한 헬스체크 재시도
    sleep 5
    if check_application_health; then
        log_success "자동 복구 성공"
        return 0
    else
        log_warning "자동 복구 실패 - 수동 개입 필요"
        return 1
    fi
}

# 메인 함수
main() {
    local mode="${1:-summary}"

    case "$mode" in
        "summary"|"status")
            generate_status_summary
            ;;
        "health")
            check_application_health
            ;;
        "containers")
            check_container_status
            ;;
        "database")
            test_database_connectivity
            ;;
        "stack")
            check_stack_status
            ;;
        "recovery")
            attempt_auto_recovery
            ;;
        "continuous")
            log_info "지속적 모니터링 모드 시작 (Ctrl+C로 중지)"
            while true; do
                generate_status_summary
                echo "다음 체크: 60초 후..."
                sleep 60
            done
            ;;
        *)
            echo "사용법: $0 [summary|health|containers|database|stack|recovery|continuous]"
            echo "  summary    - 전체 시스템 상태 요약 (기본값)"
            echo "  health     - 애플리케이션 헬스체크만"
            echo "  containers - 컨테이너 상태만"
            echo "  database   - 데이터베이스 연결 테스트만"
            echo "  stack      - Portainer 스택 상태만"
            echo "  recovery   - 자동 복구 시도"
            echo "  continuous - 지속적 모니터링 (60초 간격)"
            exit 1
            ;;
    esac
}

# 스크립트 실행
main "$@"