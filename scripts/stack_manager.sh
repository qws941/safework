#!/bin/bash
# SafeWork Stack Manager v1.0
# 통합 스택 관리 도구 - 로컬/운영 환경 지원
# Portainer API + Docker Compose Stack 관리
set -euo pipefail

# =============================================================================
# 설정 및 상수 정의
# =============================================================================
readonly SCRIPT_VERSION="1.0.0"
readonly SCRIPT_NAME="SafeWork Stack Manager"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 로그 설정
readonly LOG_DIR="/tmp/safework_logs"
readonly LOG_FILE="$LOG_DIR/stack_manager_$(date +%Y%m%d_%H%M%S).log"

# 스택 설정
readonly STACK_NAME="safework"
readonly STACK_TEMPLATES_DIR="$SCRIPT_DIR/stack-templates"
readonly TEMP_DIR="/tmp/safework_stack_deploy"

# Portainer 설정
readonly PORTAINER_URL="https://portainer.jclee.me"
readonly PORTAINER_TOKEN="ptr_zdHC0mAdjC7hk7pZ8r2+pJZO+bLxBD/TaB3iPuQwx9Q="

# Endpoint 매핑
readonly ENDPOINT_SYNOLOGY="1"    # 운영 환경 (synology)
readonly ENDPOINT_JCLEE_DEV="2"   # 개발 환경 (jclee-dev)

# 색상 코드
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# =============================================================================
# 초기화 및 전역 변수
# =============================================================================
ENVIRONMENT=""
OPERATION=""
VERBOSE=false
DRY_RUN=false
FORCE=false

# =============================================================================
# 로깅 함수
# =============================================================================
setup_logging() {
    mkdir -p "$LOG_DIR"
    mkdir -p "$TEMP_DIR"
}

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local log_line="${timestamp} [${level}] ${message}"
    
    echo -e "${log_line}" | tee -a "$LOG_FILE"
    
    if [ "$VERBOSE" = true ]; then
        case "$level" in
            "ERROR") echo -e "${RED}${log_line}${NC}" >&2 ;;
            "WARN") echo -e "${YELLOW}${log_line}${NC}" ;;
            "SUCCESS") echo -e "${GREEN}${log_line}${NC}" ;;
            "INFO") echo -e "${CYAN}${log_line}${NC}" ;;
        esac
    fi
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }
log_success() { log "SUCCESS" "$@"; }

show_header() {
    echo -e "${BLUE}"
    echo "============================================"
    echo "$SCRIPT_NAME v$SCRIPT_VERSION"
    echo "============================================"
    echo -e "${NC}"
    log_info "스크립트 시작 - 로그: $LOG_FILE"
}

# =============================================================================
# 유틸리티 함수
# =============================================================================
check_dependencies() {
    log_info "의존성 확인 중..."
    
    local missing_deps=()
    
    for cmd in curl jq docker; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_deps+=("$cmd")
        fi
    done
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "누락된 의존성: ${missing_deps[*]}"
        return 1
    fi
    
    # Portainer API 연결 확인
    if ! curl -s -f --connect-timeout 5 "$PORTAINER_URL/api/status" > /dev/null 2>&1; then
        log_error "Portainer API 연결 실패: $PORTAINER_URL"
        return 1
    fi
    
    log_success "의존성 확인 완료"
    return 0
}

validate_environment() {
    local env="$1"
    
    case "$env" in
        "local"|"development"|"dev")
            ENVIRONMENT="local"
            ;;
        "production"|"prod"|"prd")
            ENVIRONMENT="production"
            ;;
        *)
            log_error "지원하지 않는 환경: $env"
            log_info "지원 환경: local, production"
            return 1
            ;;
    esac
    
    log_info "환경 설정: $ENVIRONMENT"
    return 0
}

# =============================================================================
# Portainer API 함수
# =============================================================================
portainer_api() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"
    local content_type="${4:-application/json}"
    
    local curl_opts=(
        -s -w "\n%{http_code}"
        --connect-timeout 30
        --max-time 60
        -X "$method"
        -H "X-API-Key: $PORTAINER_TOKEN"
    )
    
    if [ "$content_type" != "multipart/form-data" ]; then
        curl_opts+=(-H "Content-Type: $content_type")
    fi
    
    if [ -n "$data" ]; then
        if [ "$content_type" = "multipart/form-data" ]; then
            curl_opts+=($data)
        else
            curl_opts+=(-d "$data")
        fi
    fi
    
    local response
    response=$(curl "${curl_opts[@]}" "$PORTAINER_URL/api/$endpoint" 2>/dev/null)
    
    local body=$(echo "$response" | head -n -1)
    local status_code=$(echo "$response" | tail -n 1)
    
    if [[ "$status_code" =~ ^2[0-9][0-9]$ ]]; then
        echo "$body"
        return 0
    else
        log_error "API 호출 실패: $endpoint (HTTP $status_code)"
        [ -n "$body" ] && log_error "응답: $body"
        return 1
    fi
}

get_stack_info() {
    local stack_name="$1"
    local stacks
    stacks=$(portainer_api "GET" "stacks")
    
    if [ $? -eq 0 ]; then
        echo "$stacks" | jq -r ".[] | select(.Name == \"$stack_name\")"
    fi
}

get_stack_id() {
    local stack_name="$1"
    local stack_info
    stack_info=$(get_stack_info "$stack_name")
    
    if [ -n "$stack_info" ]; then
        echo "$stack_info" | jq -r '.Id'
    fi
}

# =============================================================================
# 스택 구성 생성 함수
# =============================================================================
prepare_stack_config() {
    local environment="$1"
    
    log_info "스택 구성 준비 중: $environment 환경"
    
    # 템플릿 파일 경로
    local compose_template="$STACK_TEMPLATES_DIR/docker-compose.$environment.yml"
    local env_template="$STACK_TEMPLATES_DIR/env.$environment"
    
    # 대상 파일 경로
    local compose_file="$TEMP_DIR/docker-compose.yml"
    local env_file="$TEMP_DIR/.env"
    
    # 템플릿 존재 확인
    if [ ! -f "$compose_template" ]; then
        log_error "Docker Compose 템플릿을 찾을 수 없음: $compose_template"
        return 1
    fi
    
    if [ ! -f "$env_template" ]; then
        log_error "환경 설정 템플릿을 찾을 수 없음: $env_template"
        return 1
    fi
    
    # 템플릿 복사
    cp "$compose_template" "$compose_file"
    cp "$env_template" "$env_file"
    
    # 환경별 추가 설정
    case "$environment" in
        "local")
            configure_local_environment "$compose_file" "$env_file"
            ;;
        "production")
            configure_production_environment "$compose_file" "$env_file"
            ;;
    esac
    
    log_success "스택 구성 준비 완료"
    return 0
}

configure_local_environment() {
    local compose_file="$1"
    local env_file="$2"
    
    log_info "로컬 환경 구성 적용 중..."
    
    # 로컬 환경 특정 설정 추가
    {
        echo ""
        echo "# 로컬 개발 환경 자동 생성 설정"
        echo "LOCAL_DEV_MODE=true"
        echo "COMPOSE_GENERATED_AT=$(date)"
        echo "REGISTRY_HOST=localhost:5000"
    } >> "$env_file"
    
    log_success "로컬 환경 구성 완료"
}

configure_production_environment() {
    local compose_file="$1"
    local env_file="$2"
    
    log_info "운영 환경 구성 적용 중..."
    
    # 운영 환경 보안 강화 설정 추가
    {
        echo ""
        echo "# 운영 환경 자동 생성 설정"
        echo "PRODUCTION_MODE=true"
        echo "COMPOSE_GENERATED_AT=$(date)"
        echo "REGISTRY_HOST=registry.jclee.me"
        echo "SECURITY_ENHANCED=true"
    } >> "$env_file"
    
    # 보안 검증
    if ! validate_production_security "$env_file"; then
        log_error "운영 환경 보안 검증 실패"
        return 1
    fi
    
    log_success "운영 환경 구성 완료"
}

validate_production_security() {
    local env_file="$1"
    
    log_info "운영 환경 보안 검증 중..."
    
    # 필수 시크릿 검증
    local required_secrets=("DB_PASSWORD" "SECRET_KEY" "ADMIN_PASSWORD")
    local missing_secrets=()
    
    for secret in "${required_secrets[@]}"; do
        if ! grep -q "^${secret}=" "$env_file" || grep -q "^${secret}=$" "$env_file"; then
            missing_secrets+=("$secret")
        fi
    done
    
    if [ ${#missing_secrets[@]} -gt 0 ]; then
        log_error "필수 시크릿 누락: ${missing_secrets[*]}"
        log_error "운영 환경에서는 모든 시크릿이 설정되어야 합니다"
        return 1
    fi
    
    # 기본 패스워드 사용 검증
    if grep -q "admin123\|password\|123456" "$env_file"; then
        log_warn "기본 패스워드 사용 감지 - 운영 환경에서는 강력한 패스워드 사용 권장"
    fi
    
    log_success "보안 검증 완료"
    return 0
}

# =============================================================================
# 스택 배포 함수
# =============================================================================
deploy_stack() {
    local environment="$1"
    local update_mode="${2:-false}"
    
    log_info "스택 배포 시작: $environment (업데이트: $update_mode)"
    
    # 스택 구성 준비
    if ! prepare_stack_config "$environment"; then
        log_error "스택 구성 준비 실패"
        return 1
    fi
    
    # 기존 스택 확인
    local stack_id
    stack_id=$(get_stack_id "$STACK_NAME")
    
    if [ -n "$stack_id" ]; then
        if [ "$update_mode" = "true" ]; then
            log_info "기존 스택 업데이트 (ID: $stack_id)"
            update_existing_stack "$stack_id" "$environment"
        else
            log_warn "기존 스택 존재 (ID: $stack_id)"
            if [ "$FORCE" = "true" ]; then
                log_info "강제 모드: 기존 스택 삭제 후 재배포"
                delete_stack_by_id "$stack_id"
                create_new_stack "$environment"
            else
                log_error "기존 스택이 존재합니다. --force 옵션을 사용하거나 update 명령을 사용하세요"
                return 1
            fi
        fi
    else
        log_info "새 스택 생성"
        create_new_stack "$environment"
    fi
}

create_new_stack() {
    local environment="$1"
    
    log_info "새 스택 생성 중..."
    
    local compose_content
    compose_content=$(cat "$TEMP_DIR/docker-compose.yml")
    
    local env_content
    env_content=$(cat "$TEMP_DIR/.env")
    
    # 스택 생성 데이터 구성
    local stack_data
    stack_data=$(jq -n \
        --arg name "$STACK_NAME" \
        --arg compose "$compose_content" \
        --argjson endpoint_id "$ENDPOINT_ID" \
        '{
            Name: $name,
            ComposeFile: $compose,
            Env: [],
            FromAppTemplate: false,
            EndpointId: $endpoint_id
        }')
    
    # 환경 변수 추가
    while IFS='=' read -r key value; do
        if [[ -n "$key" && ! "$key" =~ ^# && -n "$value" ]]; then
            # 특수 문자 이스케이프
            value=$(echo "$value" | sed 's/"/\\"/g')
            stack_data=$(echo "$stack_data" | jq --arg key "$key" --arg value "$value" '.Env += [{name: $key, value: $value}]')
        fi
    done < "$TEMP_DIR/.env"
    
    if [ "$DRY_RUN" = "true" ]; then
        log_info "DRY RUN: 스택 생성 시뮬레이션"
        echo "$stack_data" | jq '.'
        return 0
    fi
    
    # 스택 생성 API 호출
    local response
    response=$(portainer_api "POST" "stacks" "$stack_data")
    
    if [ $? -eq 0 ]; then
        local new_stack_id
        new_stack_id=$(echo "$response" | jq -r '.Id')
        log_success "스택 생성 완료 (ID: $new_stack_id)"
        
        # 배포 상태 모니터링
        monitor_deployment "$new_stack_id"
    else
        log_error "스택 생성 실패"
        return 1
    fi
}

update_existing_stack() {
    local stack_id="$1"
    local environment="$2"
    
    log_info "기존 스택 업데이트 중 (ID: $stack_id)..."
    
    local compose_content
    compose_content=$(cat "$TEMP_DIR/docker-compose.yml")
    
    # 업데이트 데이터 구성
    local update_data
    update_data=$(jq -n \
        --arg compose "$compose_content" \
        --argjson endpoint_id "$ENDPOINT_ID" \
        '{
            StackFileContent: $compose,
            Env: [],
            Prune: false,
            PullImage: true,
            EndpointId: $endpoint_id
        }')
    
    # 환경 변수 추가
    while IFS='=' read -r key value; do
        if [[ -n "$key" && ! "$key" =~ ^# && -n "$value" ]]; then
            value=$(echo "$value" | sed 's/"/\\"/g')
            update_data=$(echo "$update_data" | jq --arg key "$key" --arg value "$value" '.Env += [{name: $key, value: $value}]')
        fi
    done < "$TEMP_DIR/.env"
    
    if [ "$DRY_RUN" = "true" ]; then
        log_info "DRY RUN: 스택 업데이트 시뮬레이션"
        echo "$update_data" | jq '.'
        return 0
    fi
    
    # 스택 업데이트 API 호출
    local response
    response=$(portainer_api "PUT" "stacks/$stack_id" "$update_data")
    
    if [ $? -eq 0 ]; then
        log_success "스택 업데이트 완료"
        
        # 배포 상태 모니터링
        monitor_deployment "$stack_id"
    else
        log_error "스택 업데이트 실패"
        return 1
    fi
}

delete_stack_by_id() {
    local stack_id="$1"
    
    log_info "스택 삭제 중 (ID: $stack_id)..."
    
    local delete_data
    delete_data=$(jq -n --argjson endpoint_id "$ENDPOINT_ID" '{EndpointId: $endpoint_id}')
    
    if [ "$DRY_RUN" = "true" ]; then
        log_info "DRY RUN: 스택 삭제 시뮬레이션"
        return 0
    fi
    
    if portainer_api "DELETE" "stacks/$stack_id" "$delete_data" > /dev/null; then
        log_success "스택 삭제 완료"
    else
        log_error "스택 삭제 실패"
        return 1
    fi
}

# =============================================================================
# 모니터링 함수
# =============================================================================
monitor_deployment() {
    local stack_id="$1"
    local timeout=300  # 5분
    local start_time=$(date +%s)
    
    log_info "배포 상태 모니터링 시작 (ID: $stack_id)"
    
    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [ $elapsed -ge $timeout ]; then
            log_error "배포 모니터링 타임아웃 ($timeout초)"
            return 1
        fi
        
        local stack_info
        stack_info=$(portainer_api "GET" "stacks/$stack_id")
        
        if [ $? -eq 0 ]; then
            local status
            status=$(echo "$stack_info" | jq -r '.Status // "unknown"')
            
            log_info "스택 상태: $status (${elapsed}초 경과)"
            
            case "$status" in
                1|"active")
                    log_success "스택 배포 완료"
                    sleep 10
                    check_services_health
                    return $?
                    ;;
                2|"inactive")
                    log_error "스택이 비활성 상태"
                    return 1
                    ;;
            esac
        fi
        
        sleep 10
    done
}

check_services_health() {
    log_info "서비스 헬스 체크 시작"
    
    # 컨테이너 상태 확인
    local containers
    containers=$(portainer_api "GET" "endpoints/$ENDPOINT_ID/docker/containers/json")
    
    local services=("safework-postgres" "safework-redis" "safework-app")
    local healthy_count=0
    
    for service in "${services[@]}"; do
        local container_info
        container_info=$(echo "$containers" | jq -r ".[] | select(.Names[] | contains(\"$service\"))")
        
        if [ -n "$container_info" ]; then
            local state
            state=$(echo "$container_info" | jq -r '.State')
            local status
            status=$(echo "$container_info" | jq -r '.Status')
            
            case "$state" in
                "running")
                    log_success "✅ $service: 실행 중 ($status)"
                    ((healthy_count++))
                    ;;
                *)
                    log_error "❌ $service: $state ($status)"
                    ;;
            esac
        else
            log_error "⚠️ $service: 컨테이너를 찾을 수 없음"
        fi
    done
    
    log_info "헬스 체크 결과: $healthy_count/${#services[@]} 서비스 정상"
    
    # 애플리케이션 엔드포인트 테스트
    if [ $healthy_count -eq ${#services[@]} ]; then
        sleep 20  # 서비스 완전 시작 대기
        test_application_endpoints
    else
        log_error "일부 서비스가 정상 상태가 아님"
        return 1
    fi
}

test_application_endpoints() {
    log_info "애플리케이션 엔드포인트 테스트"
    
    local endpoints=(
        "http://localhost:4545/health"
        "http://localhost:4545/"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -s -f --max-time 10 "$endpoint" > /dev/null 2>&1; then
            log_success "✅ $endpoint: 응답 정상"
        else
            log_error "❌ $endpoint: 응답 실패"
            return 1
        fi
    done
    
    log_success "모든 엔드포인트 테스트 완료"
    return 0
}

# =============================================================================
# 상태 확인 함수
# =============================================================================
show_stack_status() {
    local stack_name="${1:-$STACK_NAME}"
    
    echo -e "\n${BLUE}=== SafeWork 스택 상태 ===${NC}"
    
    local stack_info
    stack_info=$(get_stack_info "$stack_name")
    
    if [ -z "$stack_info" ]; then
        echo "스택을 찾을 수 없음: $stack_name"
        return 1
    fi
    
    # 스택 기본 정보
    local stack_id status endpoint_id creation_date
    stack_id=$(echo "$stack_info" | jq -r '.Id')
    status=$(echo "$stack_info" | jq -r '.Status')
    endpoint_id=$(echo "$stack_info" | jq -r '.EndpointId')
    creation_date=$(echo "$stack_info" | jq -r '.CreationDate')
    
    echo "스택 ID: $stack_id"
    echo "스택 이름: $stack_name"
    echo "상태: $status"
    echo "엔드포인트: $endpoint_id"
    echo "생성일: $creation_date"
    
    echo ""
    check_services_health
}

list_all_stacks() {
    echo -e "\n${BLUE}=== Portainer 스택 목록 ===${NC}"
    
    local stacks
    stacks=$(portainer_api "GET" "stacks")
    
    if [ $? -eq 0 ] && [ "$stacks" != "[]" ]; then
        echo "$stacks" | jq -r '.[] | "ID: \(.Id) | Name: \(.Name) | Status: \(.Status) | Created: \(.CreationDate)"'
    else
        echo "배포된 스택이 없습니다."
    fi
}

# =============================================================================
# 정리 함수
# =============================================================================
cleanup() {
    log_info "정리 작업 수행 중..."
    
    if [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
        log_info "임시 디렉토리 삭제: $TEMP_DIR"
    fi
}

# =============================================================================
# 도움말 함수
# =============================================================================
show_help() {
    cat << EOF
SafeWork Stack Manager v$SCRIPT_VERSION

사용법: $0 <COMMAND> [OPTIONS]

명령어:
  deploy <ENV>     - 스택 배포 (ENV: local|production)
  update <ENV>     - 기존 스택 업데이트
  delete           - 스택 삭제
  status           - 스택 상태 확인
  list             - 모든 스택 목록
  health           - 서비스 헬스 체크
  logs <SERVICE>   - 서비스 로그 보기

옵션:
  -v, --verbose    - 상세 출력
  -d, --dry-run    - 실행 시뮬레이션
  -f, --force      - 강제 실행
  -h, --help       - 도움말

환경:
  local            - 로컬 개발 환경
  production       - 운영 환경

예시:
  $0 deploy local                 # 로컬 환경 배포
  $0 deploy production            # 운영 환경 배포
  $0 update production            # 운영 환경 업데이트
  $0 status                       # 스택 상태 확인
  $0 delete --force               # 스택 강제 삭제
  $0 logs safework-app            # 앱 로그 보기

특징:
  - Portainer API 기반 스택 관리
  - 환경별 자동 구성 템플릿
  - 실시간 배포 상태 모니터링
  - 서비스 헬스 체크
  - 안전한 운영 환경 배포
EOF
}

# =============================================================================
# 메인 실행 함수
# =============================================================================
main() {
    setup_logging
    show_header
    
    # 인자 파싱
    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                if [ -z "$OPERATION" ]; then
                    OPERATION="$1"
                elif [ -z "$ENVIRONMENT" ] && [[ "$1" =~ ^(local|production|dev|prod)$ ]]; then
                    validate_environment "$1"
                fi
                shift
                ;;
        esac
    done
    
    # 의존성 확인
    if ! check_dependencies; then
        exit 1
    fi
    
    # 명령어 실행
    case "$OPERATION" in
        "deploy")
            if [ -z "$ENVIRONMENT" ]; then
                log_error "환경을 지정해주세요: local 또는 production"
                exit 1
            fi
            deploy_stack "$ENVIRONMENT" false
            ;;
        "update")
            if [ -z "$ENVIRONMENT" ]; then
                log_error "환경을 지정해주세요: local 또는 production"
                exit 1
            fi
            deploy_stack "$ENVIRONMENT" true
            ;;
        "delete")
            local stack_id
            stack_id=$(get_stack_id "$STACK_NAME")
            if [ -n "$stack_id" ]; then
                delete_stack_by_id "$stack_id"
            else
                log_error "삭제할 스택을 찾을 수 없음: $STACK_NAME"
                exit 1
            fi
            ;;
        "status")
            show_stack_status
            ;;
        "list")
            list_all_stacks
            ;;
        "health")
            check_services_health
            ;;
        "logs")
            local service="${2:-safework-app}"
            log_info "$service 로그는 다음 명령으로 확인하세요:"
            echo "docker logs -f $service"
            ;;
        "help"|"")
            show_help
            ;;
        *)
            log_error "알 수 없는 명령어: $OPERATION"
            show_help
            exit 1
            ;;
    esac
    
    local exit_code=$?
    
    # 정리
    cleanup
    
    if [ $exit_code -eq 0 ]; then
        log_success "작업 완료: $OPERATION"
    else
        log_error "작업 실패: $OPERATION"
    fi
    
    exit $exit_code
}

# 스크립트 실행
main "$@"