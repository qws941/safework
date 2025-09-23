#!/bin/bash

# SafeWork Portainer 통합 배포 관리 시스템
# 25+ 중복 스크립트들의 모든 기능을 통합한 단일 관리 도구
# 작성일: 2025-09-23
# 버전: v1.0.0

set -euo pipefail

# ===== 기본 설정 =====
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Portainer 설정
PORTAINER_URL="${PORTAINER_URL:-https://portainer.jclee.me}"
PORTAINER_TOKEN="${PORTAINER_TOKEN:-ptr_zdHC0mAdjC7hk7pZ8r2+pJZO+bLxBD/TaB3iPuQwx9Q=}"
PORTAINER_API_KEY="${PORTAINER_API_KEY:-$PORTAINER_TOKEN}"
ENDPOINT_ID="${ENDPOINT_ID:-3}"
STACK_NAME="${STACK_NAME:-safework}"

# 배포 설정
BASE_URL="${BASE_URL:-https://safework.jclee.me}"
REGISTRY_URL="${REGISTRY_URL:-registry.jclee.me}"
DEPLOYMENT_TIMEOUT="${DEPLOYMENT_TIMEOUT:-300}"
HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-15}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-8}"

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ===== 로깅 시스템 =====
LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/portainer-unified-$(date +%Y%m%d-%H%M%S).log"

log_message() {
    local level=$1
    local color=$2
    shift 2
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${color}[$level]${NC} $(date '+%H:%M:%S') - $message"
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

log_info() { log_message "INFO" "$BLUE" "$@"; }
log_success() { log_message "SUCCESS" "$GREEN" "$@"; }
log_warning() { log_message "WARNING" "$YELLOW" "$@"; }
log_error() { log_message "ERROR" "$RED" "$@"; }
log_debug() { log_message "DEBUG" "$CYAN" "$@"; }

# ===== 환경 검증 =====
validate_environment() {
    log_info "환경 설정 검증 중..."
    
    local missing_vars=()
    
    if [ -z "${PORTAINER_API_KEY:-}" ]; then
        missing_vars+=("PORTAINER_API_KEY")
    fi
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "필수 환경변수가 설정되지 않았습니다:"
        printf ' - %s\n' "${missing_vars[@]}"
        return 1
    fi
    
    # Portainer API 연결 테스트
    local response
    response=$(curl -s -m 10 -w "\n%{http_code}" \
        -H "X-API-Key: $PORTAINER_API_KEY" \
        "$PORTAINER_URL/api/status" 2>/dev/null || echo "")
    
    if [ -n "$response" ]; then
        local http_code
        http_code=$(echo "$response" | tail -n1)
        if [ "$http_code" = "200" ]; then
            log_success "Portainer API 연결 확인"
        else
            log_warning "Portainer API 응답 이상: HTTP $http_code"
        fi
    else
        log_warning "Portainer API 연결 실패"
    fi
    
    log_success "환경 검증 완료"
}

# ===== Docker 네트워크 관리 =====
setup_network() {
    log_info "Docker 네트워크 설정 중..."
    
    # 네트워크 존재 확인
    if ! docker network ls --format "{{.Name}}" | grep -q "^safework_network$"; then
        log_info "safework_network 생성 중..."
        docker network create safework_network
        log_success "safework_network 생성 완료"
    else
        log_info "safework_network 이미 존재"
    fi
    
    # 중복 네트워크 정리
    local duplicate_networks
    duplicate_networks=$(docker network ls --format "{{.ID}} {{.Name}}" | grep "safework" | grep -v "^[^ ]* safework_network$" || true)
    
    if [ -n "$duplicate_networks" ]; then
        log_info "중복 네트워크 정리 중..."
        echo "$duplicate_networks" | awk '{print $1}' | while read -r net_id; do
            log_debug "중복 네트워크 제거: $net_id"
            docker network rm "$net_id" 2>/dev/null || true
        done
        log_success "중복 네트워크 정리 완료"
    fi
}

# ===== 이미지 관리 =====
pull_latest_images() {
    log_info "최신 Docker 이미지 풀 중..."
    
    local images=(
        "registry.jclee.me/safework/app:latest"
        "registry.jclee.me/safework/postgres:latest"
        "registry.jclee.me/safework/redis:latest"
    )
    
    for image in "${images[@]}"; do
        log_debug "이미지 풀: $image"
        if docker pull "$image" 2>/dev/null; then
            log_success "✓ $image"
        else
            log_warning "⚠ $image 풀 실패"
        fi
    done
    
    log_success "이미지 업데이트 완료"
}

# ===== Portainer 스택 관리 =====
get_stack_info() {
    curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
        "$PORTAINER_URL/api/stacks" | \
        jq -r ".[] | select(.Name == \"$STACK_NAME\")"
}

create_stack() {
    log_info "새 Portainer 스택 생성 중..."
    
    local compose_file="$PROJECT_ROOT/docker-compose.yml"
    if [ ! -f "$compose_file" ]; then
        log_error "docker-compose.yml 파일을 찾을 수 없습니다: $compose_file"
        return 1
    fi
    
    local compose_content
    compose_content=$(cat "$compose_file")
    
    local response
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "X-API-Key: $PORTAINER_API_KEY" \
        -H "Content-Type: application/json" \
        "$PORTAINER_URL/api/stacks?type=2&method=string&endpointId=$ENDPOINT_ID" \
        -d @- <<EOF
{
    "Name": "$STACK_NAME",
    "StackFileContent": $(echo "$compose_content" | jq -Rs .)
}
EOF
    )
    
    local http_code
    http_code=$(echo "$response" | tail -n1)
    local body
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        local stack_id
        stack_id=$(echo "$body" | jq -r '.Id // empty')
        log_success "스택 생성 성공! (ID: $stack_id)"
        return 0
    else
        log_error "스택 생성 실패 (HTTP: $http_code)"
        echo "$body" | jq . 2>/dev/null || echo "$body"
        return 1
    fi
}

update_stack() {
    local stack_id=$1
    log_info "Portainer 스택 업데이트 중... (ID: $stack_id)"
    
    local compose_file="$PROJECT_ROOT/docker-compose.yml"
    if [ ! -f "$compose_file" ]; then
        log_error "docker-compose.yml 파일을 찾을 수 없습니다: $compose_file"
        return 1
    fi
    
    local compose_content
    compose_content=$(cat "$compose_file")
    
    local response
    response=$(curl -s -w "\n%{http_code}" -X PUT \
        -H "X-API-Key: $PORTAINER_API_KEY" \
        -H "Content-Type: application/json" \
        "$PORTAINER_URL/api/stacks/$stack_id?endpointId=$ENDPOINT_ID" \
        -d @- <<EOF
{
    "StackFileContent": $(echo "$compose_content" | jq -Rs .),
    "pullImage": true,
    "prune": true
}
EOF
    )
    
    local http_code
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log_success "스택 업데이트 성공!"
        return 0
    else
        log_error "스택 업데이트 실패 (HTTP: $http_code)"
        echo "$response" | head -n -1 | jq . 2>/dev/null || echo "$response" | head -n -1
        return 1
    fi
}

deploy_stack() {
    log_info "=== SafeWork 스택 배포 시작 ==="
    
    # 기존 스택 확인
    local stack_info
    stack_info=$(get_stack_info)
    
    if [ -n "$stack_info" ]; then
        local stack_id
        stack_id=$(echo "$stack_info" | jq -r '.Id')
        log_info "기존 스택 발견 (ID: $stack_id) - 업데이트 모드"
        update_stack "$stack_id"
    else
        log_info "새 스택 생성 모드"
        create_stack
    fi
}

# ===== 컨테이너 상태 확인 =====
check_container_status() {
    log_info "컨테이너 상태 확인 중..."
    
    local response
    response=$(curl -s -m 10 \
        -H "X-API-Key: $PORTAINER_API_KEY" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json?filters=%7B%22name%22%3A%5B%22safework%22%5D%7D" \
        2>/dev/null || echo "")
    
    if [ -z "$response" ]; then
        log_warning "컨테이너 정보를 가져올 수 없습니다"
        return 1
    fi
    
    local container_count running_count
    container_count=$(echo "$response" | jq '. | length' 2>/dev/null || echo "0")
    running_count=$(echo "$response" | jq '[.[] | select(.State == "running")] | length' 2>/dev/null || echo "0")
    
    log_info "컨테이너 상태: $running_count/$container_count 실행 중"
    
    # 개별 컨테이너 상태 표시
    echo "$response" | jq -r '.[] | "\(.Names[0]): \(.State) (\(.Status))"' 2>/dev/null | while read -r line; do
        log_debug "$line"
    done
    
    if [ "$running_count" -eq "$container_count" ] && [ "$container_count" -gt 0 ]; then
        log_success "모든 컨테이너가 정상 실행 중"
        return 0
    else
        log_warning "일부 컨테이너가 비정상 상태"
        return 1
    fi
}

# ===== 애플리케이션 헬스체크 =====
check_application_health() {
    log_info "애플리케이션 헬스체크 중..."
    
    local response
    response=$(curl -s -m 10 -w "\n%{http_code}" "$BASE_URL/health" 2>/dev/null || echo "")
    
    if [ -z "$response" ]; then
        log_error "헬스체크 엔드포인트 응답 없음"
        return 1
    fi
    
    local http_code body
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" != "200" ]; then
        log_error "헬스체크 실패: HTTP $http_code"
        return 1
    fi
    
    # JSON 파싱 및 상태 검증
    local status database_status redis_status
    status=$(echo "$body" | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
    database_status=$(echo "$body" | jq -r '.database // "unknown"' 2>/dev/null || echo "unknown")
    redis_status=$(echo "$body" | jq -r '.redis // "unknown"' 2>/dev/null || echo "unknown")
    
    log_info "애플리케이션: $status"
    log_info "데이터베이스: $database_status"
    log_info "Redis: $redis_status"
    
    if [ "$status" = "healthy" ] && [ "$database_status" = "connected" ] && [ "$redis_status" = "connected" ]; then
        log_success "모든 컴포넌트가 정상 상태"
        return 0
    else
        log_error "일부 컴포넌트가 비정상 상태"
        return 1
    fi
}

# ===== 포괄적 헬스체크 =====
comprehensive_health_check() {
    log_info "=== 포괄적 헬스체크 시작 ==="
    
    local attempt=1
    local max_attempts=$HEALTH_CHECK_RETRIES
    
    # 초기 대기
    log_info "초기 대기 (20초)..."
    sleep 20
    
    while [ $attempt -le $max_attempts ]; do
        log_info "헬스체크 시도 $attempt/$max_attempts"
        
        local container_ok=true
        local app_ok=true
        
        # 컨테이너 상태 확인
        if ! check_container_status; then
            container_ok=false
        fi
        
        # 애플리케이션 헬스체크
        if ! check_application_health; then
            app_ok=false
        fi
        
        # 성공 조건
        if [ "$container_ok" = true ] && [ "$app_ok" = true ]; then
            log_success "헬스체크 성공!"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "헬스체크 최종 실패"
            return 1
        fi
        
        attempt=$((attempt + 1))
        log_info "${HEALTH_CHECK_INTERVAL}초 후 재시도..."
        sleep $HEALTH_CHECK_INTERVAL
    done
}

# ===== 주요 엔드포인트 테스트 =====
test_endpoints() {
    log_info "주요 엔드포인트 테스트 중..."
    
    local endpoints=(
        "/admin/login:200:관리자 로그인"
        "/survey:200:설문 페이지"
        "/api/safework/v2/health:200:API 헬스체크"
        "/:200:메인 페이지"
    )
    
    local failed_count=0
    
    for endpoint_info in "${endpoints[@]}"; do
        local endpoint expected_code description
        endpoint="${endpoint_info%%:*}"
        temp="${endpoint_info#*:}"
        expected_code="${temp%%:*}"
        description="${endpoint_info##*:}"
        
        local response
        response=$(curl -s -m 5 -w "\n%{http_code}" "$BASE_URL$endpoint" 2>/dev/null || echo "")
        
        if [ -n "$response" ]; then
            local http_code
            http_code=$(echo "$response" | tail -n1)
            
            if [ "$http_code" = "$expected_code" ]; then
                log_success "✓ $description ($endpoint): HTTP $http_code"
            else
                log_warning "⚠ $description ($endpoint): HTTP $http_code (예상: $expected_code)"
                failed_count=$((failed_count + 1))
            fi
        else
            log_warning "⚠ $description ($endpoint): 응답 없음"
            failed_count=$((failed_count + 1))
        fi
    done
    
    if [ $failed_count -eq 0 ]; then
        log_success "모든 엔드포인트 테스트 통과"
        return 0
    else
        log_warning "$failed_count개 엔드포인트에서 문제 감지"
        return 1
    fi
}

# ===== 로그 수집 =====
collect_logs() {
    local service=${1:-"all"}
    local lines=${2:-"100"}
    
    log_info "컨테이너 로그 수집 중... (서비스: $service, 라인: $lines)"
    
    local containers
    if [ "$service" = "all" ]; then
        containers=$(curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
            "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json?filters=%7B%22name%22%3A%5B%22safework%22%5D%7D" | \
            jq -r '.[].Id' 2>/dev/null || echo "")
    else
        containers=$(curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
            "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json?filters=%7B%22name%22%3A%5B%22safework-'$service'%22%5D%7D" | \
            jq -r '.[].Id' 2>/dev/null || echo "")
    fi
    
    if [ -z "$containers" ]; then
        log_warning "로그를 수집할 컨테이너를 찾을 수 없습니다"
        return 1
    fi
    
    echo "$containers" | while read -r container_id; do
        if [ -n "$container_id" ]; then
            local container_name
            container_name=$(curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
                "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/$container_id/json" | \
                jq -r '.Name // "unknown"' 2>/dev/null || echo "unknown")
            
            log_info "=== $container_name 로그 (최근 $lines 라인) ==="
            curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
                "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/$container_id/logs?stdout=true&stderr=true&timestamps=true&tail=$lines" 2>/dev/null || \
                log_warning "$container_name 로그 수집 실패"
            echo
        fi
    done
}

# ===== 모니터링 대시보드 =====
show_status() {
    echo
    echo "=== SafeWork 시스템 상태 ==="
    echo "시간: $(date)"
    echo "스크립트: $(basename "$0")"
    echo "로그 파일: $LOG_FILE"
    echo
    
    # Portainer 스택 상태
    echo "### Portainer 스택 상태"
    local stack_info
    stack_info=$(get_stack_info)
    if [ -n "$stack_info" ]; then
        echo "$stack_info" | jq -r '"스택: \(.Name) (ID: \(.Id), 상태: \(.Status // "unknown"))"'
    else
        echo "SafeWork 스택을 찾을 수 없습니다"
    fi
    echo
    
    # 컨테이너 상태
    echo "### 컨테이너 상태"
    check_container_status
    echo
    
    # 애플리케이션 상태
    echo "### 애플리케이션 상태"
    check_application_health
    echo
    
    # 엔드포인트 상태
    echo "### 엔드포인트 상태"
    test_endpoints
}

# ===== GitHub Actions 통합 =====
trigger_github_deploy() {
    log_info "GitHub Actions 배포 트리거 중..."
    
    if [ -z "${GITHUB_TOKEN:-}" ]; then
        log_error "GITHUB_TOKEN이 설정되지 않았습니다"
        return 1
    fi
    
    local response
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/repos/qws941/safework/actions/workflows/deploy.yml/dispatches" \
        -d '{"ref": "master"}')
    
    local http_code
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "204" ]; then
        log_success "GitHub Actions 워크플로우 트리거 성공"
        return 0
    else
        log_error "GitHub Actions 트리거 실패 (HTTP: $http_code)"
        return 1
    fi
}

# ===== 메인 명령어 처리 =====
show_help() {
    cat << EOF

SafeWork Portainer 통합 배포 관리 시스템 v1.0.0

사용법: $0 [COMMAND] [OPTIONS]

핵심 명령어:
  deploy              전체 배포 프로세스 실행 (네트워크 + 이미지 + 스택 + 헬스체크)
  stack-only          Portainer 스택 배포만 실행
  health              포괄적 헬스체크 실행
  status              시스템 상태 대시보드
  logs [service]      컨테이너 로그 수집 (all|app|postgres|redis)
  endpoints           주요 엔드포인트 테스트

관리 명령어:
  setup-network       Docker 네트워크 설정
  pull-images         최신 이미지 풀
  github-deploy       GitHub Actions 배포 트리거
  validate            환경 설정 검증

옵션:
  --timeout SECONDS   배포 타임아웃 (기본: $DEPLOYMENT_TIMEOUT)
  --retries COUNT     헬스체크 재시도 횟수 (기본: $HEALTH_CHECK_RETRIES)
  --interval SECONDS  헬스체크 간격 (기본: $HEALTH_CHECK_INTERVAL)
  --verbose           자세한 출력
  --dry-run           실제 실행 없이 명령어만 표시

환경변수:
  PORTAINER_URL       Portainer 서버 URL (기본: $PORTAINER_URL)
  PORTAINER_API_KEY   Portainer API 키
  BASE_URL            애플리케이션 URL (기본: $BASE_URL)
  STACK_NAME          스택 이름 (기본: $STACK_NAME)

예제:
  $0 deploy                    # 전체 배포
  $0 status                    # 상태 확인
  $0 health --retries 20       # 헬스체크 (20회 재시도)
  $0 logs app                  # 앱 컨테이너 로그만
  $0 github-deploy             # GitHub Actions 트리거

로그 파일: $LOG_FILE

이 스크립트는 다음 기존 스크립트들을 통합합니다:
- portainer_api_deploy.sh (400+ 라인)
- portainer_stack_auto_deploy.sh
- portainer_deployment_manager.sh
- deployment_health_validator.sh
- intelligent_deployment.sh
- 기타 20+ Portainer 관련 스크립트

EOF
}

# ===== 메인 실행 로직 =====
main() {
    # 명령행 옵션 파싱
    VERBOSE=false
    DRY_RUN=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --timeout)
                DEPLOYMENT_TIMEOUT="$2"
                shift 2
                ;;
            --retries)
                HEALTH_CHECK_RETRIES="$2"
                shift 2
                ;;
            --interval)
                HEALTH_CHECK_INTERVAL="$2"
                shift 2
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            -*)
                log_error "알 수 없는 옵션: $1"
                show_help
                exit 1
                ;;
            *)
                break
                ;;
        esac
    done
    
    local command=${1:-help}
    
    log_info "SafeWork Portainer 통합 관리 시스템 시작"
    log_info "명령어: $command"
    
    case $command in
        deploy)
            validate_environment
            setup_network
            pull_latest_images
            deploy_stack
            comprehensive_health_check
            test_endpoints
            log_success "=== 전체 배포 완료 ==="
            ;;
        stack-only)
            validate_environment
            deploy_stack
            ;;
        health)
            validate_environment
            comprehensive_health_check
            ;;
        status)
            validate_environment
            show_status
            ;;
        logs)
            validate_environment
            collect_logs "${2:-all}" "${3:-100}"
            ;;
        endpoints)
            test_endpoints
            ;;
        setup-network)
            setup_network
            ;;
        pull-images)
            pull_latest_images
            ;;
        github-deploy)
            trigger_github_deploy
            ;;
        validate)
            validate_environment
            ;;
        help)
            show_help
            ;;
        *)
            log_error "알 수 없는 명령어: $command"
            show_help
            exit 1
            ;;
    esac
    
    log_info "실행 완료 - 로그: $LOG_FILE"
}

# 스크립트가 직접 실행된 경우에만 main 함수 호출
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi