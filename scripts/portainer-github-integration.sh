#!/bin/bash

# =============================================================================
# SafeWork Portainer-GitHub Actions 통합 배포 시스템
# 버전: 1.0.0
# 작성일: 2025-09-22
# 설명: 포트레이너 API와 GitHub Actions를 통합한 완전 자동화 배포
# =============================================================================

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 스크립트 디렉토리 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
INTEGRATION_LOG="$LOG_DIR/portainer-github-integration-$(date +%Y%m%d-%H%M%S).log"

# 로그 디렉토리 생성
mkdir -p "$LOG_DIR"

# 환경 설정 로드
if [ -f "$SCRIPT_DIR/config.env" ]; then
    source "$SCRIPT_DIR/config.env"
elif [ -f "$SCRIPT_DIR/config/master.env" ]; then
    source "$SCRIPT_DIR/config/master.env"
fi

# 로그 함수들
log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]${NC} $1" | tee -a "$INTEGRATION_LOG"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS]${NC} $1" | tee -a "$INTEGRATION_LOG"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING]${NC} $1" | tee -a "$INTEGRATION_LOG"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR]${NC} $1" | tee -a "$INTEGRATION_LOG"
}

# 배너 출력
print_banner() {
    echo -e "${CYAN}"
    echo "============================================================================="
    echo "      SafeWork Portainer-GitHub Actions 통합 배포 시스템 v1.0.0"
    echo "============================================================================="
    echo -e "${NC}"
}

# GitHub Actions 워크플로우 트리거
trigger_github_actions() {
    local deploy_to_production=${1:-false}

    log_info "GitHub Actions 워크플로우 트리거 중..."

    # GitHub Token 확인
    if [ -z "$GITHUB_TOKEN" ]; then
        GITHUB_TOKEN=$(gh auth token 2>/dev/null)
        if [ -z "$GITHUB_TOKEN" ]; then
            log_error "GitHub 토큰을 찾을 수 없습니다. 'gh auth login'을 실행하세요."
            return 1
        fi
    fi

    # Repository 정보 자동 감지
    local repo_url=$(git config --get remote.origin.url 2>/dev/null)
    if [ -z "$repo_url" ]; then
        log_error "Git 원격 저장소 URL을 찾을 수 없습니다."
        return 1
    fi

    # GitHub API 호출을 위한 repository 정보 추출
    local repo_info=$(echo "$repo_url" | sed -E 's|.*github\.com[:/]([^/]+)/([^/.]+)(\.git)?.*|\1/\2|')

    log_info "Repository: $repo_info"
    log_info "배포 옵션: $deploy_to_production"

    # GitHub Actions workflow_dispatch 트리거
    local workflow_response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/repos/$repo_info/actions/workflows/deploy.yml/dispatches" \
        -d "{
            \"ref\": \"master\",
            \"inputs\": {
                \"deploy_to_production\": \"$deploy_to_production\"
            }
        }")

    local http_code=$(echo "$workflow_response" | tail -n1)
    local response_body=$(echo "$workflow_response" | head -n -1)

    if [ "$http_code" = "204" ]; then
        log_success "GitHub Actions 워크플로우 트리거 성공"
        return 0
    else
        log_error "GitHub Actions 트리거 실패 (HTTP: $http_code)"
        log_error "응답: $response_body"
        return 1
    fi
}

# 워크플로우 실행 상태 모니터링
monitor_workflow_status() {
    local repo_info=${1:-$(git config --get remote.origin.url | sed -E 's|.*github\.com[:/]([^/]+)/([^/.]+)(\.git)?.*|\1/\2|')}
    local max_wait_time=${2:-600}  # 10분 최대 대기

    log_info "워크플로우 실행 상태 모니터링 시작..."
    log_info "최대 대기 시간: ${max_wait_time}초"

    local start_time=$(date +%s)
    local wait_time=0

    while [ $wait_time -lt $max_wait_time ]; do
        # 최근 워크플로우 실행 조회
        local runs_response=$(curl -s \
            -H "Authorization: Bearer $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            "https://api.github.com/repos/$repo_info/actions/workflows/deploy.yml/runs?per_page=1")

        local latest_run=$(echo "$runs_response" | jq -r '.workflow_runs[0]')

        if [ "$latest_run" != "null" ]; then
            local status=$(echo "$latest_run" | jq -r '.status')
            local conclusion=$(echo "$latest_run" | jq -r '.conclusion')
            local run_id=$(echo "$latest_run" | jq -r '.id')
            local created_at=$(echo "$latest_run" | jq -r '.created_at')

            log_info "워크플로우 상태: $status (ID: $run_id)"

            case "$status" in
                "completed")
                    if [ "$conclusion" = "success" ]; then
                        log_success "✅ 워크플로우 실행 성공!"
                        return 0
                    else
                        log_error "❌ 워크플로우 실행 실패: $conclusion"
                        return 1
                    fi
                    ;;
                "in_progress"|"queued")
                    log_info "⏳ 워크플로우 실행 중... (대기시간: ${wait_time}초)"
                    ;;
                *)
                    log_warning "알 수 없는 상태: $status"
                    ;;
            esac
        else
            log_info "워크플로우 실행 정보를 찾을 수 없습니다."
        fi

        sleep 10
        wait_time=$((wait_time + 10))
    done

    log_warning "⏰ 워크플로우 모니터링 시간 초과 (${max_wait_time}초)"
    return 2
}

# Portainer 스택 상태 확인
check_portainer_stack_status() {
    local stack_name=${1:-safework}

    log_info "Portainer 스택 상태 확인 중..."

    if [ -z "$PORTAINER_URL" ] || [ -z "$PORTAINER_TOKEN" ]; then
        log_error "Portainer 설정이 없습니다."
        return 1
    fi

    local stacks_response=$(curl -s \
        -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/stacks")

    local stack_info=$(echo "$stacks_response" | jq -r ".[] | select(.Name == \"$stack_name\")")

    if [ -n "$stack_info" ] && [ "$stack_info" != "null" ]; then
        local stack_id=$(echo "$stack_info" | jq -r '.Id')
        local stack_status=$(echo "$stack_info" | jq -r '.Status')
        local endpoint_id=$(echo "$stack_info" | jq -r '.EndpointId')

        log_success "스택 발견: $stack_name (ID: $stack_id, Status: $stack_status)"

        # 컨테이너 상태 확인
        local containers_response=$(curl -s \
            -H "X-API-Key: $PORTAINER_TOKEN" \
            "$PORTAINER_URL/api/endpoints/$endpoint_id/docker/containers/json")

        local safework_containers=$(echo "$containers_response" | jq -r '.[] | select(.Names[] | contains("safework")) | .Names[0] + " - " + .State')

        echo "컨테이너 상태:"
        echo "$safework_containers" | while read -r container_info; do
            echo "  $container_info"
        done

        return 0
    else
        log_warning "스택을 찾을 수 없습니다: $stack_name"
        return 1
    fi
}

# 배포 후 검증
verify_deployment() {
    local service_url=${1:-https://safework.jclee.me}
    local max_attempts=${2:-10}

    log_info "배포 검증 시작..."
    log_info "서비스 URL: $service_url"

    for attempt in $(seq 1 $max_attempts); do
        log_info "헬스 체크 시도 $attempt/$max_attempts"

        local health_response=$(curl -s -w "\n%{http_code}" "$service_url/health" 2>/dev/null)
        local http_code=$(echo "$health_response" | tail -n1)
        local response_body=$(echo "$health_response" | head -n -1)

        if [ "$http_code" = "200" ]; then
            local status=$(echo "$response_body" | jq -r '.status // "unknown"' 2>/dev/null)
            if [ "$status" = "healthy" ]; then
                log_success "✅ 서비스 헬스 체크 성공!"
                echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
                return 0
            fi
        fi

        if [ $attempt -lt $max_attempts ]; then
            log_info "⏳ 대기 중... (5초 후 재시도)"
            sleep 5
        fi
    done

    log_error "❌ 서비스 헬스 체크 실패"
    return 1
}

# 완전 통합 배포 실행
execute_integrated_deployment() {
    local auto_deploy=${1:-true}

    log_info "=== 완전 통합 배포 시작 ==="

    # 1. Git 상태 확인
    log_info "1/5: Git 상태 확인 중..."
    if ! git diff --quiet; then
        log_warning "커밋되지 않은 변경사항이 있습니다."
        if [ "$auto_deploy" = "true" ]; then
            log_info "자동 커밋 진행..."
            git add .
            git commit -m "Auto-commit: Integrated deployment $(date '+%Y-%m-%d %H:%M:%S')"
            git push origin master
        else
            log_error "변경사항을 먼저 커밋하세요."
            return 1
        fi
    else
        log_success "Git 상태 깨끗함"
    fi

    # 2. GitHub Actions 트리거
    log_info "2/5: GitHub Actions 워크플로우 트리거..."
    if ! trigger_github_actions "true"; then
        log_error "GitHub Actions 트리거 실패"
        return 1
    fi

    # 3. 워크플로우 모니터링
    log_info "3/5: 워크플로우 실행 모니터링..."
    if ! monitor_workflow_status; then
        log_error "워크플로우 실행 실패"
        return 1
    fi

    # 4. Portainer 스택 확인
    log_info "4/5: Portainer 스택 상태 확인..."
    if ! check_portainer_stack_status; then
        log_warning "스택 상태 확인 실패 (계속 진행)"
    fi

    # 5. 배포 검증
    log_info "5/5: 배포 검증..."
    if ! verify_deployment; then
        log_error "배포 검증 실패"
        return 1
    fi

    log_success "🎉 완전 통합 배포 성공!"
    log_success "🌐 서비스 URL: https://safework.jclee.me"
    log_success "📊 로그 파일: $INTEGRATION_LOG"
}

# 롤백 실행
execute_rollback() {
    log_info "=== 배포 롤백 시작 ==="

    # Portainer를 통한 이전 버전으로 롤백
    if [ -n "$PORTAINER_URL" ] && [ -n "$PORTAINER_TOKEN" ]; then
        log_info "Portainer를 통한 롤백 시도..."

        # 최근 성공한 이미지 태그 찾기
        local previous_sha=$(git log --format="%H" -n 2 | tail -1)

        log_info "이전 커밋으로 롤백: $previous_sha"

        # TODO: Portainer API를 통한 실제 롤백 구현
        log_warning "롤백 기능은 향후 구현 예정"
    else
        log_error "Portainer 설정이 없어 롤백할 수 없습니다."
        return 1
    fi
}

# 메인 실행 함수
main() {
    print_banner

    case "${1:-deploy}" in
        "deploy"|"배포")
            local auto_commit=${2:-true}
            execute_integrated_deployment "$auto_commit"
            ;;
        "trigger"|"트리거")
            local production=${2:-true}
            trigger_github_actions "$production"
            ;;
        "monitor"|"모니터링")
            monitor_workflow_status
            ;;
        "status"|"상태")
            check_portainer_stack_status
            ;;
        "verify"|"검증")
            verify_deployment
            ;;
        "rollback"|"롤백")
            execute_rollback
            ;;
        "help"|"도움말")
            echo "사용법: $0 [명령어] [옵션]"
            echo ""
            echo "명령어:"
            echo "  deploy, 배포        - 완전 통합 배포 실행 (기본값)"
            echo "  trigger, 트리거     - GitHub Actions 워크플로우만 트리거"
            echo "  monitor, 모니터링   - 워크플로우 실행 상태 모니터링"
            echo "  status, 상태        - Portainer 스택 상태 확인"
            echo "  verify, 검증        - 배포 후 서비스 검증"
            echo "  rollback, 롤백      - 이전 버전으로 롤백"
            echo "  help, 도움말        - 이 도움말 표시"
            echo ""
            echo "예시:"
            echo "  $0 deploy           # 완전 자동 배포"
            echo "  $0 trigger false    # 빌드만 (프로덕션 배포 안함)"
            echo "  $0 status           # 현재 스택 상태 확인"
            ;;
        *)
            log_error "알 수 없는 명령어: $1"
            echo "도움말을 보려면 '$0 help'를 실행하세요."
            exit 1
            ;;
    esac
}

# 스크립트 실행
main "$@"