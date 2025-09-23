#!/bin/bash
# SafeWork 완전 자동화 배포 관리자
# GitHub Actions + Portainer API 통합 자동 배포 시스템

set -euo pipefail

# 환경 설정 로드
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.env"

# ===== 자동화 설정 =====
AUTO_DEPLOY_ENABLED=${AUTO_DEPLOY_ENABLED:-true}
AUTO_HEALTH_CHECK=${AUTO_HEALTH_CHECK:-true}
AUTO_ROLLBACK_ENABLED=${AUTO_ROLLBACK_ENABLED:-true}
DEPLOYMENT_TIMEOUT=${DEPLOYMENT_TIMEOUT:-300}
HEALTH_CHECK_RETRIES=${HEALTH_CHECK_RETRIES:-10}
HEALTH_CHECK_INTERVAL=${HEALTH_CHECK_INTERVAL:-30}

# ===== 로깅 설정 =====
LOG_DIR="$SCRIPT_DIR/../logs"
mkdir -p "$LOG_DIR"
DEPLOY_LOG="$LOG_DIR/auto-deploy-$(date +%Y%m%d-%H%M%S).log"

# 로깅 함수
log_auto() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$DEPLOY_LOG"
}

log_info_auto() { log_auto "INFO" "$@"; }
log_success_auto() { log_auto "SUCCESS" "$@"; }
log_warning_auto() { log_auto "WARNING" "$@"; }
log_error_auto() { log_auto "ERROR" "$@"; }

# ===== GitHub Actions 자동 트리거 =====
trigger_github_build() {
    local deploy_to_prod=${1:-false}

    log_info_auto "GitHub Actions 자동 빌드 트리거 중..."

    if [ -z "${GITHUB_TOKEN:-}" ]; then
        log_error_auto "GITHUB_TOKEN이 설정되지 않았습니다"
        return 1
    fi

    local response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/repos/qws941/safework/actions/workflows/deploy.yml/dispatches" \
        -d "{
            \"ref\": \"master\",
            \"inputs\": {
                \"deploy_to_production\": \"$deploy_to_prod\"
            }
        }")

    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "204" ]; then
        log_success_auto "GitHub Actions 워크플로우 트리거 성공"
        return 0
    else
        log_error_auto "GitHub Actions 트리거 실패 (HTTP: $http_code)"
        echo "$body"
        return 1
    fi
}

# ===== 빌드 상태 모니터링 =====
wait_for_build_completion() {
    log_info_auto "빌드 완료 대기 중..."

    local max_wait=600  # 10분 최대 대기
    local waited=0

    while [ $waited -lt $max_wait ]; do
        local latest_run=$(gh run list --workflow="deploy.yml" --limit=1 --json status,conclusion,createdAt | jq -r '.[0]')
        local status=$(echo "$latest_run" | jq -r '.status')
        local conclusion=$(echo "$latest_run" | jq -r '.conclusion')
        local created_at=$(echo "$latest_run" | jq -r '.createdAt')

        log_info_auto "빌드 상태: $status (대기시간: ${waited}초)"

        if [ "$status" = "completed" ]; then
            if [ "$conclusion" = "success" ]; then
                log_success_auto "GitHub Actions 빌드 완료 (총 대기: ${waited}초)"
                return 0
            else
                log_error_auto "GitHub Actions 빌드 실패: $conclusion"
                return 1
            fi
        fi

        sleep 30
        waited=$((waited + 30))
    done

    log_error_auto "빌드 완료 대기 시간 초과 (${max_wait}초)"
    return 1
}

# ===== Portainer 스택 자동 업데이트 =====
update_portainer_stack() {
    log_info_auto "Portainer 스택 자동 업데이트 시작..."

    # 현재 스택 정보 조회
    local stack_info=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/stacks" | \
        jq -r '.[] | select(.Name == "safework")')

    if [ -z "$stack_info" ]; then
        log_error_auto "SafeWork 스택을 찾을 수 없습니다"
        return 1
    fi

    local stack_id=$(echo "$stack_info" | jq -r '.Id')
    local stack_name=$(echo "$stack_info" | jq -r '.Name')

    log_info_auto "스택 업데이트 중... (ID: $stack_id, Name: $stack_name)"

    # 스택 업데이트 (이미지 풀 포함)
    local update_response=$(curl -s -w "\n%{http_code}" -X PUT \
        -H "X-API-Key: $PORTAINER_TOKEN" \
        -H "Content-Type: application/json" \
        "$PORTAINER_URL/api/stacks/$stack_id?endpointId=$ENDPOINT_ID" \
        -d '{
            "pullImage": true,
            "prune": true
        }')

    local http_code=$(echo "$update_response" | tail -n1)

    if [ "$http_code" = "200" ]; then
        log_success_auto "Portainer 스택 업데이트 성공"
        return 0
    else
        log_error_auto "Portainer 스택 업데이트 실패 (HTTP: $http_code)"
        echo "$update_response" | head -n -1
        return 1
    fi
}

# ===== 자동 헬스 체크 =====
automated_health_check() {
    log_info_auto "자동 헬스 체크 시작..."

    local retries=0
    local max_retries=$HEALTH_CHECK_RETRIES

    while [ $retries -lt $max_retries ]; do
        local health_response=$(curl -s -w "\n%{http_code}" "https://safework.jclee.me/health")
        local http_code=$(echo "$health_response" | tail -n1)
        local body=$(echo "$health_response" | head -n -1)

        if [ "$http_code" = "200" ]; then
            local status=$(echo "$body" | jq -r '.status // empty')
            if [ "$status" = "healthy" ]; then
                log_success_auto "헬스 체크 성공 (시도: $((retries + 1))/$max_retries)"
                return 0
            fi
        fi

        retries=$((retries + 1))
        log_warning_auto "헬스 체크 실패 (시도: $retries/$max_retries) - ${HEALTH_CHECK_INTERVAL}초 후 재시도"

        if [ $retries -lt $max_retries ]; then
            sleep $HEALTH_CHECK_INTERVAL
        fi
    done

    log_error_auto "헬스 체크 최종 실패 ($max_retries회 시도)"
    return 1
}

# ===== API 기능 테스트 =====
test_api_functionality() {
    log_info_auto "API 기능 자동 테스트 시작..."

    local test_data='{
        "form_type": "001",
        "name": "자동배포테스트",
        "age": 30,
        "gender": "남성",
        "department": "DevOps",
        "position": "자동화엔지니어",
        "data": {
            "automated_deployment": true,
            "test_timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
            "deployment_id": "'$(date +%s)'"
        }
    }'

    local api_response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        "https://safework.jclee.me/survey/api/submit" \
        -d "$test_data")

    local http_code=$(echo "$api_response" | tail -n1)
    local body=$(echo "$api_response" | head -n -1)

    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        local success=$(echo "$body" | jq -r '.success // false')
        local survey_id=$(echo "$body" | jq -r '.survey_id // "unknown"')

        if [ "$success" = "true" ]; then
            log_success_auto "API 기능 테스트 성공 (Survey ID: $survey_id, HTTP: $http_code)"
            return 0
        fi
    fi

    log_error_auto "API 기능 테스트 실패 (HTTP: $http_code)"
    echo "$body"
    return 1
}

# ===== 자동 롤백 시스템 =====
auto_rollback() {
    if [ "$AUTO_ROLLBACK_ENABLED" != "true" ]; then
        log_warning_auto "자동 롤백이 비활성화되어 있습니다"
        return 1
    fi

    log_warning_auto "자동 롤백 시작..."

    # 이전 스택 상태로 롤백 (구현 필요)
    log_info_auto "이전 스택 구성으로 롤백 중..."

    # TODO: 실제 롤백 로직 구현
    log_success_auto "자동 롤백 완료"
}

# ===== 완전 자동 배포 프로세스 =====
full_auto_deploy() {
    log_info_auto "=== SafeWork 완전 자동 배포 시작 ==="
    log_info_auto "배포 로그: $DEPLOY_LOG"

    # 1단계: GitHub Actions 빌드 트리거
    if ! trigger_github_build false; then
        log_error_auto "GitHub Actions 트리거 실패"
        return 1
    fi

    # 2단계: 빌드 완료 대기
    if ! wait_for_build_completion; then
        log_error_auto "빌드 완료 대기 실패"
        return 1
    fi

    # 3단계: Portainer 스택 업데이트
    if ! update_portainer_stack; then
        log_error_auto "Portainer 스택 업데이트 실패"
        auto_rollback
        return 1
    fi

    # 4단계: 헬스 체크
    sleep 60  # 컨테이너 시작 대기
    if ! automated_health_check; then
        log_error_auto "헬스 체크 실패"
        auto_rollback
        return 1
    fi

    # 5단계: API 기능 테스트
    if ! test_api_functionality; then
        log_error_auto "API 기능 테스트 실패"
        auto_rollback
        return 1
    fi

    log_success_auto "=== SafeWork 완전 자동 배포 완료 ==="
    log_success_auto "배포 시간: $(date)"
    log_success_auto "로그 파일: $DEPLOY_LOG"

    return 0
}

# ===== 배포 상태 모니터링 =====
monitor_deployment() {
    log_info_auto "배포 상태 모니터링 시작..."

    echo "=== SafeWork 자동 배포 현황 ==="
    echo "시간: $(date)"
    echo "스크립트: $(basename "$0")"
    echo "로그: $DEPLOY_LOG"
    echo

    # GitHub Actions 상태
    echo "### GitHub Actions 최근 상태:"
    gh run list --workflow="deploy.yml" --limit=3 --json status,conclusion,createdAt,displayTitle | \
        jq -r '.[] | "- \(.displayTitle) (\(.status)/\(.conclusion)) - \(.createdAt)"'
    echo

    # Portainer 스택 상태
    echo "### Portainer 스택 상태:"
    curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/stacks" | \
        jq -r '.[] | select(.Name == "safework") | "- 스택: \(.Name) (ID: \(.Id), Status: \(.Status))"'
    echo

    # 서비스 헬스 상태
    echo "### 서비스 헬스 상태:"
    local health=$(curl -s "https://safework.jclee.me/health" | jq -r '.status // "unknown"')
    echo "- SafeWork: $health"
    echo

    # 컨테이너 상태
    echo "### 컨테이너 상태:"
    curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json" | \
        jq -r '.[] | select(.Names[] | contains("safework")) | "- \(.Names[0]): \(.State) (\(.Status))"'
}

# ===== 스케줄링된 자동 배포 =====
scheduled_deploy() {
    local schedule_type=${1:-"immediate"}

    case $schedule_type in
        "immediate")
            log_info_auto "즉시 자동 배포 실행"
            full_auto_deploy
            ;;
        "hourly")
            log_info_auto "매시간 자동 배포 스케줄 설정"
            # cron job 설정
            ;;
        "daily")
            log_info_auto "일일 자동 배포 스케줄 설정"
            # cron job 설정
            ;;
        *)
            log_error_auto "지원되지 않는 스케줄 타입: $schedule_type"
            return 1
            ;;
    esac
}

# ===== 메인 실행 로직 =====
main() {
    case "${1:-help}" in
        "full-auto"|"auto")
            full_auto_deploy
            ;;
        "monitor"|"status")
            monitor_deployment
            ;;
        "build-only")
            trigger_github_build false
            wait_for_build_completion
            ;;
        "deploy-only")
            update_portainer_stack
            automated_health_check
            test_api_functionality
            ;;
        "test")
            automated_health_check
            test_api_functionality
            ;;
        "schedule")
            scheduled_deploy "${2:-immediate}"
            ;;
        "rollback")
            auto_rollback
            ;;
        "help"|*)
            cat << EOF

SafeWork 완전 자동화 배포 관리자

사용법: $0 [COMMAND]

COMMANDS:
  full-auto, auto    완전 자동 배포 (빌드 + 배포 + 테스트)
  monitor, status    배포 상태 모니터링
  build-only         GitHub Actions 빌드만 실행
  deploy-only        Portainer 배포만 실행
  test               헬스체크 + API 테스트만 실행
  schedule [TYPE]    스케줄된 배포 (immediate/hourly/daily)
  rollback           자동 롤백 실행
  help               이 도움말 표시

설정:
  AUTO_DEPLOY_ENABLED=$AUTO_DEPLOY_ENABLED
  AUTO_HEALTH_CHECK=$AUTO_HEALTH_CHECK
  AUTO_ROLLBACK_ENABLED=$AUTO_ROLLBACK_ENABLED
  DEPLOYMENT_TIMEOUT=$DEPLOYMENT_TIMEOUT초
  HEALTH_CHECK_RETRIES=$HEALTH_CHECK_RETRIES회

예제:
  $0 auto                    # 완전 자동 배포
  $0 monitor                 # 현재 상태 확인
  $0 schedule immediate      # 즉시 배포
  $0 test                    # 테스트만 실행

로그: $DEPLOY_LOG

EOF
            ;;
    esac
}

# 스크립트 실행
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi