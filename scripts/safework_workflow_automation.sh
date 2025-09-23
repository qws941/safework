#!/bin/bash
# SafeWork 워크플로우 전용 자동화 시스템
# 로그/백업 정리 + 핵심 워크플로우만 실행

set -euo pipefail

# 환경 설정 로드
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.env"

# ===== 워크플로우 자동화 설정 =====
WORKFLOW_LOG_DIR="$SCRIPT_DIR/../logs"
mkdir -p "$WORKFLOW_LOG_DIR"
WORKFLOW_LOG="$WORKFLOW_LOG_DIR/workflow-$(date +%Y%m%d-%H%M%S).log"

# 개별 스크립트 경로
AUTO_DEPLOY_SCRIPT="$SCRIPT_DIR/auto-deploy-manager.sh"

# 로깅 함수
log_workflow() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$WORKFLOW_LOG"
}

log_info_workflow() { log_workflow "INFO" "$@"; }
log_success_workflow() { log_workflow "SUCCESS" "$@"; }
log_warning_workflow() { log_workflow "WARNING" "$@"; }
log_error_workflow() { log_workflow "ERROR" "$@"; }

# ===== 로그 및 백업 정리 =====
cleanup_logs_and_backups() {
    log_info_workflow "로그 및 백업 파일 정리 시작..."

    local cleanup_summary=""
    local total_cleaned=0

    # 1. 오래된 로그 파일 정리 (7일 이상)
    log_info_workflow "오래된 로그 파일 정리 중..."
    local old_logs=$(find "$WORKFLOW_LOG_DIR" -name "*.log" -type f -mtime +7 2>/dev/null | wc -l)
    find "$WORKFLOW_LOG_DIR" -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
    total_cleaned=$((total_cleaned + old_logs))
    cleanup_summary="${cleanup_summary}\n  - 로그 파일: ${old_logs}개 삭제"
    log_success_workflow "로그 파일 정리 완료: ${old_logs}개"

    # 2. 오래된 백업 파일 정리
    log_info_workflow "오래된 백업 파일 정리 중..."
    local backup_dir="$SCRIPT_DIR/../backups"
    local old_backups=0

    if [ -d "$backup_dir" ]; then
        old_backups=$(find "$backup_dir" -type f -mtime +30 2>/dev/null | wc -l)
        find "$backup_dir" -type f -mtime +30 -delete 2>/dev/null || true
        total_cleaned=$((total_cleaned + old_backups))
    fi
    cleanup_summary="${cleanup_summary}\n  - 백업 파일: ${old_backups}개 삭제"
    log_success_workflow "백업 파일 정리 완료: ${old_backups}개"

    # 3. Docker 시스템 정리
    log_info_workflow "Docker 시스템 정리 중..."
    local docker_cleanup=$(docker system prune -f --volumes 2>/dev/null | grep "Total reclaimed space" || echo "0B")
    cleanup_summary="${cleanup_summary}\n  - Docker 공간: $docker_cleanup"
    log_success_workflow "Docker 시스템 정리 완료"

    # 4. 임시 파일 정리
    log_info_workflow "임시 파일 정리 중..."
    local temp_files=$(find /tmp -name "*safework*" -type f -mtime +1 2>/dev/null | wc -l)
    find /tmp -name "*safework*" -type f -mtime +1 -delete 2>/dev/null || true
    total_cleaned=$((total_cleaned + temp_files))
    cleanup_summary="${cleanup_summary}\n  - 임시 파일: ${temp_files}개 삭제"
    log_success_workflow "임시 파일 정리 완료: ${temp_files}개"

    log_success_workflow "=== 정리 완료 ==="
    echo -e "$cleanup_summary"
    log_success_workflow "총 정리된 항목: ${total_cleaned}개"

    return 0
}

# ===== 핵심 워크플로우 실행 =====
run_core_workflow() {
    log_info_workflow "=== SafeWork 핵심 워크플로우 시작 ==="
    log_info_workflow "워크플로우 로그: $WORKFLOW_LOG"

    local workflow_start_time=$(date +%s)
    local workflow_steps=0
    local successful_steps=0

    # 1. GitHub Actions 자동 빌드 트리거
    workflow_steps=$((workflow_steps + 1))
    log_info_workflow "1단계: GitHub Actions 빌드 트리거..."

    if [ -z "${GITHUB_TOKEN:-}" ]; then
        # GitHub CLI 토큰 사용
        export GITHUB_TOKEN=$(gh auth token 2>/dev/null || echo "")
    fi

    if trigger_github_build; then
        successful_steps=$((successful_steps + 1))
        log_success_workflow "✅ GitHub Actions 빌드 트리거 성공"
    else
        log_error_workflow "❌ GitHub Actions 빌드 트리거 실패"
    fi

    # 2. 빌드 완료 대기
    workflow_steps=$((workflow_steps + 1))
    log_info_workflow "2단계: 빌드 완료 대기..."

    if wait_for_build_completion; then
        successful_steps=$((successful_steps + 1))
        log_success_workflow "✅ 빌드 완료 확인"
    else
        log_error_workflow "❌ 빌드 완료 대기 실패"
    fi

    # 3. Portainer 스택 업데이트
    workflow_steps=$((workflow_steps + 1))
    log_info_workflow "3단계: Portainer 스택 업데이트..."

    if update_portainer_stack; then
        successful_steps=$((successful_steps + 1))
        log_success_workflow "✅ Portainer 스택 업데이트 성공"
    else
        log_error_workflow "❌ Portainer 스택 업데이트 실패"
    fi

    # 4. 서비스 헬스 체크
    workflow_steps=$((workflow_steps + 1))
    log_info_workflow "4단계: 서비스 헬스 체크..."

    sleep 60  # 컨테이너 시작 대기
    if automated_health_check; then
        successful_steps=$((successful_steps + 1))
        log_success_workflow "✅ 서비스 헬스 체크 통과"
    else
        log_error_workflow "❌ 서비스 헬스 체크 실패"
    fi

    local workflow_end_time=$(date +%s)
    local workflow_duration=$((workflow_end_time - workflow_start_time))
    local success_rate=$(echo "scale=1; ($successful_steps * 100) / $workflow_steps" | bc)

    log_info_workflow "=== 핵심 워크플로우 완료 ==="
    log_info_workflow "성공률: $successful_steps/$workflow_steps (${success_rate}%)"
    log_info_workflow "소요 시간: ${workflow_duration}초"
    log_info_workflow "로그 파일: $WORKFLOW_LOG"

    if [ "$successful_steps" -eq "$workflow_steps" ]; then
        log_success_workflow "🎉 모든 워크플로우 단계 성공!"
        return 0
    else
        log_warning_workflow "⚠️ 일부 워크플로우 단계 실패"
        return 1
    fi
}

# ===== GitHub Actions 빌드 트리거 (auto-deploy-manager.sh에서 가져옴) =====
trigger_github_build() {
    local deploy_to_prod=${1:-false}

    log_info_workflow "GitHub Actions 자동 빌드 트리거 중..."

    if [ -z "${GITHUB_TOKEN:-}" ]; then
        log_error_workflow "GITHUB_TOKEN이 설정되지 않았습니다"
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

    if [ "$http_code" = "204" ]; then
        log_success_workflow "GitHub Actions 워크플로우 트리거 성공"
        return 0
    else
        log_error_workflow "GitHub Actions 트리거 실패 (HTTP: $http_code)"
        return 1
    fi
}

# ===== 빌드 완료 대기 =====
wait_for_build_completion() {
    log_info_workflow "빌드 완료 대기 중..."

    local max_wait=600  # 10분 최대 대기
    local waited=0

    while [ $waited -lt $max_wait ]; do
        if command -v gh >/dev/null 2>&1; then
            local latest_run=$(gh run list --workflow="deploy.yml" --limit=1 --json status,conclusion,createdAt 2>/dev/null | jq -r '.[0] // empty')

            if [ -n "$latest_run" ] && [ "$latest_run" != "null" ]; then
                local status=$(echo "$latest_run" | jq -r '.status // empty')
                local conclusion=$(echo "$latest_run" | jq -r '.conclusion // empty')

                log_info_workflow "빌드 상태: $status (대기시간: ${waited}초)"

                if [ "$status" = "completed" ]; then
                    if [ "$conclusion" = "success" ]; then
                        log_success_workflow "GitHub Actions 빌드 완료 (총 대기: ${waited}초)"
                        return 0
                    else
                        log_error_workflow "GitHub Actions 빌드 실패: $conclusion"
                        return 1
                    fi
                fi
            fi
        else
            log_warning_workflow "GitHub CLI가 설치되지 않음 - 빌드 상태 확인 건너뜀"
            return 0
        fi

        sleep 30
        waited=$((waited + 30))
    done

    log_error_workflow "빌드 완료 대기 시간 초과 (${max_wait}초)"
    return 1
}

# ===== Portainer 스택 업데이트 =====
update_portainer_stack() {
    log_info_workflow "Portainer 스택 자동 업데이트 시작..."

    # 현재 스택 정보 조회
    local stack_info=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/stacks" | \
        jq -r '.[] | select(.Name == "safework")' 2>/dev/null || echo "")

    if [ -z "$stack_info" ]; then
        log_error_workflow "SafeWork 스택을 찾을 수 없습니다"
        return 1
    fi

    local stack_id=$(echo "$stack_info" | jq -r '.Id // empty')
    local stack_name=$(echo "$stack_info" | jq -r '.Name // empty')

    log_info_workflow "스택 업데이트 중... (ID: $stack_id, Name: $stack_name)"

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
        log_success_workflow "Portainer 스택 업데이트 성공"
        return 0
    else
        log_error_workflow "Portainer 스택 업데이트 실패 (HTTP: $http_code)"
        return 1
    fi
}

# ===== 자동 헬스 체크 =====
automated_health_check() {
    log_info_workflow "자동 헬스 체크 시작..."

    local retries=0
    local max_retries=10

    while [ $retries -lt $max_retries ]; do
        local health_response=$(curl -s -w "\n%{http_code}" "https://safework.jclee.me/health")
        local http_code=$(echo "$health_response" | tail -n1)
        local body=$(echo "$health_response" | head -n -1)

        if [ "$http_code" = "200" ]; then
            local status=$(echo "$body" | jq -r '.status // empty' 2>/dev/null || echo "unknown")
            if [ "$status" = "healthy" ]; then
                log_success_workflow "헬스 체크 성공 (시도: $((retries + 1))/$max_retries)"
                return 0
            fi
        fi

        retries=$((retries + 1))
        log_warning_workflow "헬스 체크 실패 (시도: $retries/$max_retries) - 30초 후 재시도"

        if [ $retries -lt $max_retries ]; then
            sleep 30
        fi
    done

    log_error_workflow "헬스 체크 최종 실패 ($max_retries회 시도)"
    return 1
}

# ===== 완전 자동화 (정리 + 워크플로우) =====
run_complete_automation() {
    log_info_workflow "=== SafeWork 완전 자동화 (정리 + 워크플로우) 시작 ==="

    # 1단계: 정리 작업
    log_info_workflow "1단계: 시스템 정리 실행..."
    if cleanup_logs_and_backups; then
        log_success_workflow "✅ 시스템 정리 완료"
    else
        log_warning_workflow "⚠️ 시스템 정리 부분 완료"
    fi

    # 2단계: 핵심 워크플로우
    log_info_workflow "2단계: 핵심 워크플로우 실행..."
    if run_core_workflow; then
        log_success_workflow "✅ 핵심 워크플로우 완료"
        log_success_workflow "🎉 완전 자동화 성공!"
        return 0
    else
        log_error_workflow "❌ 핵심 워크플로우 실패"
        return 1
    fi
}

# ===== 워크플로우 상태 확인 =====
check_workflow_status() {
    log_info_workflow "워크플로우 상태 확인..."

    echo "=== SafeWork 워크플로우 상태 ==="
    echo "시간: $(date)"
    echo

    # GitHub Actions 상태
    echo "### GitHub Actions 최근 상태:"
    if command -v gh >/dev/null 2>&1; then
        gh run list --workflow="deploy.yml" --limit=3 --json status,conclusion,createdAt,displayTitle 2>/dev/null | \
            jq -r '.[] | "- \(.displayTitle) (\(.status)/\(.conclusion)) - \(.createdAt)"' || echo "- 상태 조회 실패"
    else
        echo "- GitHub CLI 미설치"
    fi
    echo

    # Portainer 스택 상태
    echo "### Portainer 스택 상태:"
    curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/stacks" 2>/dev/null | \
        jq -r '.[] | select(.Name == "safework") | "- 스택: \(.Name) (ID: \(.Id), Status: \(.Status))"' || echo "- 상태 조회 실패"
    echo

    # 서비스 헬스 상태
    echo "### 서비스 헬스 상태:"
    local health=$(curl -s "https://safework.jclee.me/health" 2>/dev/null | jq -r '.status // "unknown"' || echo "unknown")
    echo "- SafeWork: $health"
    echo

    # 컨테이너 상태
    echo "### 컨테이너 상태:"
    docker ps --filter "name=safework-" --format "- {{.Names}}: {{.State}} ({{.Status}})" 2>/dev/null || echo "- 컨테이너 상태 조회 실패"
}

# ===== 메인 실행 로직 =====
main() {
    case "${1:-help}" in
        "auto"|"complete")
            run_complete_automation
            ;;
        "workflow"|"core")
            run_core_workflow
            ;;
        "cleanup"|"clean")
            cleanup_logs_and_backups
            ;;
        "status"|"check")
            check_workflow_status
            ;;
        "help"|*)
            cat << EOF

SafeWork 워크플로우 전용 자동화 시스템

사용법: $0 [COMMAND]

주요 명령어:
  auto, complete        완전 자동화 (정리 + 워크플로우)
  workflow, core        핵심 워크플로우만 실행
  cleanup, clean        로그 및 백업 정리만 실행
  status, check         워크플로우 상태 확인

핵심 워크플로우 단계:
  1. GitHub Actions 빌드 트리거
  2. 빌드 완료 대기
  3. Portainer 스택 업데이트
  4. 서비스 헬스 체크

정리 작업:
  - 7일 이상 된 로그 파일 삭제
  - 30일 이상 된 백업 파일 삭제
  - Docker 시스템 정리
  - 임시 파일 정리

예제:
  $0 auto                       # 완전 자동화 (정리 + 워크플로우)
  $0 workflow                   # 워크플로우만 실행
  $0 cleanup                    # 정리 작업만 실행
  $0 status                     # 현재 상태 확인

로그: $WORKFLOW_LOG

EOF
            ;;
    esac
}

# 스크립트 실행
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi