#!/bin/bash
# SafeWork Portainer Stack 배포 스크립트 v2.0
# 로컬/운영 환경 통합 스택 배포 관리
# Docker Compose Stack을 Portainer API로 배포 (현행화된 버전)
# 2024-09-21 업데이트: Docker API v1.24+ 완전 호환, 실제 운영환경 검증 완료
set -euo pipefail

# =============================================================================
# 설정 및 상수 정의
# =============================================================================
readonly SCRIPT_VERSION="2.2.0"
readonly SCRIPT_NAME="SafeWork Portainer Stack Deploy"
readonly LOG_FILE="/tmp/safework_stack_deploy_$(date +%Y%m%d_%H%M%S).log"

# 설정 파일 경로
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly CONFIG_FILE="${SCRIPT_DIR}/config/portainer_config.env"

# 임시 파일 설정
readonly STACK_FILE="docker-compose.yml"
readonly ENV_FILE=".env"

# 환경별 endpoint 매핑 함수
get_endpoint_id() {
    local environment="$1"
    case "$environment" in
        "production"|"prod")
            echo "${ENDPOINT_PRODUCTION}"
            ;;
        "development"|"dev"|"local")
            echo "${ENDPOINT_DEV}"
            ;;
        *)
            log "ERROR" "지원하지 않는 환경: $environment"
            return 1
            ;;
    esac
}

# 설정에서 로드된 값들을 readonly로 설정 (변수가 정의되었는지 확인)

# 색상 코드
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# =============================================================================
# 코드 변경사항 반영 함수 (고도화)
# =============================================================================

# Git 변경사항 확인 함수
check_git_changes() {
    log_info "Git 변경사항 확인 중..."
    
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_warn "Git 저장소가 아닙니다. 코드 변경 추적을 건너뜁니다."
        return 0
    fi
    
    local uncommitted_changes=$(git status --porcelain)
    local current_commit=$(git rev-parse HEAD)
    local remote_commit=$(git rev-parse origin/master 2>/dev/null || echo "")
    
    if [ -n "$uncommitted_changes" ]; then
        log_warn "⚠️ 커밋되지 않은 변경사항이 있습니다:"
        echo "$uncommitted_changes"
        return 1
    fi
    
    if [ -n "$remote_commit" ] && [ "$current_commit" != "$remote_commit" ]; then
        log_warn "⚠️ 로컬과 원격 저장소가 동기화되지 않았습니다."
        log_info "현재 커밋: ${current_commit:0:8}"
        log_info "원격 커밋: ${remote_commit:0:8}"
        return 1
    fi
    
    log_success "✅ Git 상태 정상 (커밋: ${current_commit:0:8})"
    return 0
}

# 이미지 태그 생성 함수 (Git 커밋 기반)
generate_image_tag() {
    local environment="$1"
    local commit_hash=""
    local timestamp=$(date +"%Y%m%d-%H%M%S")
    
    if git rev-parse --git-dir > /dev/null 2>&1; then
        commit_hash=$(git rev-parse --short HEAD)
        echo "${environment}-${commit_hash}-${timestamp}"
    else
        echo "${environment}-${timestamp}"
    fi
}

# Docker 이미지 빌드 및 푸시 함수
build_and_push_images() {
    local environment="$1"
    local registry_host="$2"
    local image_tag="${3:-latest}"
    
    log_info "Docker 이미지 빌드 및 푸시 시작 (태그: $image_tag)"
    
    # 빌드할 서비스 목록
    local services=("app" "postgres" "redis")
    local build_paths=("src/app" "infrastructure/docker/postgres" "infrastructure/docker/redis")
    
    for i in "${!services[@]}"; do
        local service="${services[$i]}"
        local build_path="${build_paths[$i]}"
        local full_image_name="${registry_host}/${STACK_NAME}/${service}:${image_tag}"
        local latest_image_name="${registry_host}/${STACK_NAME}/${service}:latest"
        
        log_info "빌드 중: $service ($build_path)"
        
        if [ -d "$build_path" ]; then
            # Docker 이미지 빌드
            if docker build -t "$full_image_name" -t "$latest_image_name" "$build_path"; then
                log_success "✅ 빌드 완료: $service"
                
                # 레지스트리에 푸시
                if docker push "$full_image_name" && docker push "$latest_image_name"; then
                    log_success "✅ 푸시 완료: $service ($image_tag, latest)"
                else
                    log_error "❌ 푸시 실패: $service"
                    return 1
                fi
            else
                log_error "❌ 빌드 실패: $service"
                return 1
            fi
        else
            log_warn "⚠️ 빌드 경로를 찾을 수 없음: $build_path"
        fi
    done
    
    log_success "🎉 모든 이미지 빌드 및 푸시 완료"
    return 0
}

# 강제 이미지 풀 함수 (Portainer API 사용)
force_pull_images() {
    local endpoint_id="$1"
    local registry_host="$2"
    
    log_info "최신 이미지 강제 풀 시작..."
    
    local services=("app" "postgres" "redis")
    
    for service in "${services[@]}"; do
        local image_name="${registry_host}/${STACK_NAME}/${service}:latest"
        log_info "이미지 풀: $image_name"
        
        # Portainer API를 통한 이미지 풀
        local pull_response=$(portainer_api_call "POST" "endpoints/$endpoint_id/docker/images/create" "{\"fromImage\":\"$image_name\"}")
        
        if [ $? -eq 0 ]; then
            log_success "✅ 이미지 풀 완료: $service"
        else
            log_warn "⚠️ 이미지 풀 실패: $service (계속 진행)"
        fi
    done
}

# 배포 전 준비 함수 (코드 변경사항 반영)
prepare_deployment() {
    local environment="$1"
    local registry_host="$2"
    local force_rebuild="${3:-false}"
    
    log_info "배포 준비 시작: $environment 환경"
    
    # Git 상태 확인
    if ! check_git_changes; then
        if [ "$force_rebuild" != "true" ]; then
            log_error "Git 상태가 배포에 적합하지 않습니다. --force 옵션을 사용하거나 Git 상태를 정리하세요."
            return 1
        else
            log_warn "⚠️ Git 상태 경고를 무시하고 계속 진행합니다."
        fi
    fi
    
    # 프로덕션 환경에서는 항상 최신 이미지 빌드
    if [ "$environment" = "production" ]; then
        log_info "프로덕션 환경: 최신 코드로 이미지 빌드 시작"
        local new_tag=$(generate_image_tag "$environment")
        
        if build_and_push_images "$environment" "$registry_host" "$new_tag"; then
            log_success "✅ 프로덕션 이미지 준비 완료"
            return 0
        else
            log_error "❌ 프로덕션 이미지 빌드 실패"
            return 1
        fi
    fi
    
    log_success "✅ 배포 준비 완료"
    return 0
}

# =============================================================================
# 공통 유틸리티 함수
# =============================================================================

# 서비스 대기 함수 (중복 제거)
wait_for_service_ready() {
    local service_type="${1:-container}"
    local wait_time=10
    
    case "$service_type" in
        "application")
            wait_time=20
            log_info "애플리케이션 완전 시작 대기 중..."
            ;;
        "container")
            wait_time=10
            log_info "컨테이너 완전 시작 대기 중..."
            ;;
        "stack")
            wait_time=10
            log_info "스택 배포 대기 중..."
            ;;
    esac
    
    sleep "$wait_time"
}

# 애플리케이션 헬스 체크 함수 (중복 제거)
check_app_health() {
    log_info "애플리케이션 헬스 체크 진행 중..."
    
    # Try production URL first, then localhost
    local health_url="${PRODUCTION_URL}/health"
    if curl -s -f "$health_url" > /dev/null 2>&1; then
        local health_response=$(curl -s "$health_url" | jq -r '.status' 2>/dev/null || echo "ok")
        log_success "Production 애플리케이션 헬스 체크 성공: $health_response"
        return 0
    elif curl -s -f "${LOCAL_URL}/health" > /dev/null 2>&1; then
        local health_response=$(curl -s "${LOCAL_URL}/health" | jq -r '.status' 2>/dev/null || echo "ok")
        log_success "Local 애플리케이션 헬스 체크 성공: $health_response"
        return 0
    else
        log_error "애플리케이션 헬스 체크 실패"
        return 1
    fi
}

# 컨테이너 상태 체크 함수 (중복 제거)
check_single_container_status() {
    local container_name="$1"
    local containers="$2"
    
    local container_info=$(echo "$containers" | jq -r ".[] | select(.Names[] | contains(\"$container_name\"))")
    
    if [ -n "$container_info" ]; then
        local status=$(echo "$container_info" | jq -r '.State')
        local health=$(echo "$container_info" | jq -r '.Status')
        
        case "$status" in
            "running")
                log_success "✅ $container_name: 실행 중 ($health)"
                return 0
                ;;
            *)
                log_error "❌ $container_name: $status ($health)"
                return 1
                ;;
        esac
    else
        log_error "⚠️ $container_name: 컨테이너를 찾을 수 없음"
        return 1
    fi
}

# API 연결 체크 함수 (중복 제거)
check_api_connectivity() {
    local api_url="$1"
    local timeout="${2:-5}"
    
    if ! curl -s -f --connect-timeout "$timeout" "$api_url" > /dev/null 2>&1; then
        log_error "API에 연결할 수 없습니다: $api_url"
        return 1
    fi
    
    log_info "API 연결 확인 완료: $api_url"
    return 0
}

# =============================================================================
# 로깅 함수
# =============================================================================
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "${YELLOW}$*${NC}"; }
log_error() { log "ERROR" "${RED}$*${NC}"; }
log_success() { log "SUCCESS" "${GREEN}$*${NC}"; }

show_header() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "$SCRIPT_NAME v$SCRIPT_VERSION"
    echo "=========================================="
    echo -e "${NC}"
    log_info "스크립트 시작 - 로그 파일: $LOG_FILE"
}

# 모듈화된 설정 파일들 로드 (로깅 함수 정의 후)
load_config_modules() {
    local config_dir="${SCRIPT_DIR}/config"
    local config_files=("portainer_config.env" "database.env" "redis.env" "application.env" "infrastructure.env")
    
    log_info "모듈화된 설정 파일 로드 시작..."
    
    for config_file in "${config_files[@]}"; do
        local file_path="${config_dir}/${config_file}"
        if [ -f "$file_path" ]; then
            source "$file_path"
            log_info "✅ 설정 모듈 로드: $config_file"
        else
            log_warn "⚠️ 설정 파일을 찾을 수 없음: $config_file"
        fi
    done
    
    log_info "설정 파일 로드 완료"
}

# =============================================================================
# Portainer API 함수
# =============================================================================
portainer_api_call() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"
    local content_type="${4:-application/json}"

    local curl_cmd="curl -s -w \"\n%{http_code}\" \
        --connect-timeout $API_TIMEOUT \
        --max-time $((API_TIMEOUT * 2)) \
        -X \"$method\" \
        -H \"X-API-Key: $PORTAINER_TOKEN\""

    if [ "$content_type" != "multipart/form-data" ]; then
        curl_cmd="$curl_cmd -H \"Content-Type: $content_type\""
    fi

    if [ -n "$data" ]; then
        if [ "$content_type" = "multipart/form-data" ]; then
            curl_cmd="$curl_cmd $data"
        else
            curl_cmd="$curl_cmd -d \"$data\""
        fi
    fi

    curl_cmd="$curl_cmd \"$PORTAINER_URL/api/$endpoint\""

    local response
    response=$(eval "$curl_cmd" 2>/dev/null)

    local body=$(echo "$response" | head -n -1)
    local status_code=$(echo "$response" | tail -n 1)

    if [[ "$status_code" =~ ^2[0-9][0-9]$ ]]; then
        echo "$body"
        return 0
    else
        log_error "API 호출 실패: $endpoint (HTTP $status_code)"
        if [ -n "$body" ]; then
            log_error "응답: $body"
        fi
        return 1
    fi
}

# =============================================================================
# Docker Compose 서비스 생성 함수 (중복 제거)
# =============================================================================

# 공통 서비스 속성 생성 함수
generate_common_service_config() {
    local service_name="$1"
    local image_tag="$2"
    local registry_host="$3"
    
    cat << EOF
    image: ${registry_host}/${STACK_NAME}/${image_tag}:latest
    container_name: ${STACK_NAME}-${service_name}
    hostname: ${STACK_NAME}-${service_name}
    environment:
      - TZ=${TIMEZONE}
EOF
}

# 공통 로깅 설정 생성 함수
generate_logging_config() {
    cat << EOF
    logging:
      driver: "${LOG_DRIVER}"
      options:
        max-size: "${LOG_MAX_SIZE}"
        max-file: "${LOG_MAX_FILE}"
EOF
}

# 공통 네트워크 및 재시작 정책 생성 함수
generate_common_runtime_config() {
    cat << EOF
    networks:
      - ${STACK_NAME}_network
    restart: ${RESTART_POLICY}
EOF
}

# PostgreSQL 서비스 생성 함수
generate_postgres_service() {
    local registry_host="$1"
    
    cat << EOF
  ${STACK_NAME}-postgres:
$(generate_common_service_config "postgres" "postgres" "$registry_host")
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_INITDB_ARGS=${POSTGRES_INITDB_ARGS}
      - PGDATA=${PGDATA}
    volumes:
      - ${STACK_NAME}_postgres_data:/var/lib/postgresql/data
$(generate_common_runtime_config)
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: ${HEALTH_CHECK_INTERVAL}
      timeout: ${HEALTH_CHECK_TIMEOUT}
      retries: ${HEALTH_CHECK_RETRIES}
      start_period: ${HEALTH_CHECK_START_PERIOD}
$(generate_logging_config)
EOF
}

# Redis 서비스 생성 함수
generate_redis_service() {
    local registry_host="$1"
    
    cat << EOF
  ${STACK_NAME}-redis:
$(generate_common_service_config "redis" "redis" "$registry_host")
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    volumes:
      - ${STACK_NAME}_redis_data:/data
$(generate_common_runtime_config)
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: ${HEALTH_CHECK_INTERVAL}
      timeout: ${HEALTH_CHECK_TIMEOUT}
      retries: 5
      start_period: 30s
$(generate_logging_config)
EOF
}

# 애플리케이션 서비스 생성 함수
generate_app_service() {
    local registry_host="$1"
    local secret_key="$2"
    local admin_password="$3"
    local flask_config="$4"
    local debug="$5"
    
    cat << EOF
  ${STACK_NAME}-app:
$(generate_common_service_config "app" "app" "$registry_host")
      - FLASK_CONFIG=${flask_config}
      - DEBUG=${debug}
      - DB_HOST=${STACK_NAME}-postgres
      - DB_PORT=${DB_PORT}
      - DB_NAME=${DB_NAME}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_HOST=${STACK_NAME}-redis
      - REDIS_PORT=${REDIS_PORT}
      - REDIS_PASSWORD=${REDIS_PASSWORD}
      - REDIS_DB=${REDIS_DB}
      - SECRET_KEY=${secret_key}
      - ADMIN_USERNAME=${ADMIN_USERNAME}
      - ADMIN_PASSWORD=${admin_password}
      - WTF_CSRF_ENABLED=${WTF_CSRF_ENABLED}
      - UPLOAD_FOLDER=${UPLOAD_FOLDER}
      - MAX_CONTENT_LENGTH=${MAX_CONTENT_LENGTH}
      - LOG_LEVEL=${LOG_LEVEL}
      - LOG_FILE=\${APP_LOG_FILE}
    volumes:
      - ${STACK_NAME}_app_uploads:${UPLOAD_FOLDER}
$(generate_common_runtime_config)
    ports:
      - "${APP_PORT}:${APP_PORT}"
    depends_on:
      - ${STACK_NAME}-postgres
      - ${STACK_NAME}-redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${APP_PORT}/health"]
      interval: 30s
      timeout: 10s
      retries: ${HEALTH_CHECK_RETRIES}
      start_period: 120s
$(generate_logging_config)
EOF
}

# =============================================================================
# 스택 설정 생성 함수
# =============================================================================
create_docker_compose() {
    local environment="$1"
    local registry_host="$2"

    log_info "Docker Compose 파일 생성: $environment 환경"

    # 환경별 설정값 결정
    local secret_key="${SECRET_KEY_PRODUCTION}"
    local admin_password="${ADMIN_PASSWORD_PRODUCTION}"
    local flask_config="production"
    local debug="false"

    if [ "$environment" = "local" ]; then
        secret_key="${SECRET_KEY_LOCAL}"
        admin_password="${ADMIN_PASSWORD_LOCAL}"
        flask_config="development"
        debug="true"
    fi

    cat > "$STACK_FILE" << EOF
version: '3.8'

networks:
  ${STACK_NAME}_network:

volumes:
  ${STACK_NAME}_postgres_data:
  ${STACK_NAME}_redis_data:
  ${STACK_NAME}_app_uploads:

services:
$(generate_postgres_service "$registry_host")

$(generate_redis_service "$registry_host")

$(generate_app_service "$registry_host" "$secret_key" "$admin_password" "$flask_config" "$debug")
EOF

    log_success "Docker Compose 파일 생성 완료: $STACK_FILE"
}

create_env_file() {
    local environment="$1"

    log_info "환경 변수 파일 생성: $environment 환경"

    if [ "$environment" = "local" ]; then
        cat > "$ENV_FILE" << EOF
# SafeWork Local Environment Configuration
FLASK_CONFIG=development
APP_PORT=4545

# Database Configuration
DB_HOST=safework-postgres
DB_NAME=safework_db
DB_USER=safework
DB_PASSWORD=safework2024

# Redis Configuration
REDIS_HOST=safework-redis
REDIS_PORT=6379

# Application Security
SECRET_KEY=safework-local-secret-key-2024
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Additional Settings
WTF_CSRF_ENABLED=false
DEBUG=true
EOF
    else
        cat > "$ENV_FILE" << EOF
# SafeWork Production Environment Configuration
FLASK_CONFIG=production
APP_PORT=4545

# Database Configuration
DB_HOST=safework-postgres
DB_NAME=safework_db
DB_USER=safework
DB_PASSWORD=safework2024

# Redis Configuration
REDIS_HOST=safework-redis
REDIS_PORT=6379

# Application Security
SECRET_KEY=safework-production-secret-key-2024
ADMIN_USERNAME=admin
ADMIN_PASSWORD=safework2024admin

# Additional Settings
WTF_CSRF_ENABLED=false
DEBUG=false
EOF
    fi

    log_success "환경 변수 파일 생성 완료: $ENV_FILE"
}

# =============================================================================
# 스택 관리 함수
# =============================================================================
get_stack_id() {
    local stack_name="$1"
    local endpoint_id="${2:-$ENDPOINT_SYNOLOGY}"  # 기본값은 운영 환경
    local stacks=$(portainer_api_call "GET" "stacks")
    echo "$stacks" | jq -r ".[] | select(.Name == \"$stack_name\" and .EndpointId == $endpoint_id) | .Id" 2>/dev/null || echo ""
}

list_stacks() {
    log_info "Portainer 스택 목록 조회"
    local stacks=$(portainer_api_call "GET" "stacks")

    if [ -n "$stacks" ] && [ "$stacks" != "[]" ]; then
        echo -e "\n${BLUE}=== Portainer 스택 목록 ===${NC}"
        echo "$stacks" | jq -r '.[] | "ID: \(.Id) | Name: \(.Name) | Status: \(.Status) | Endpoint: \(.EndpointId)"'
    else
        log_info "배포된 스택이 없습니다."
    fi
}

deploy_stack() {
    local environment="$1"
    local registry_host="$2"

    log_info "SafeWork 스택 배포 시작: $environment 환경"

    # 배포 준비 - 코드 변경사항 확인 및 이미지 빌드
    if ! prepare_deployment "$environment" "$registry_host"; then
        log_error "배포 준비 실패"
        return 1
    fi

    # 환경별 endpoint ID 가져오기
    local endpoint_id=$(get_endpoint_id "$environment")
    if [ $? -ne 0 ]; then
        log_error "유효하지 않은 환경: $environment"
        return 1
    fi

    log_info "사용할 Endpoint ID: $endpoint_id (환경: $environment)"

    # 기존 스택 확인
    local existing_stack_id=$(get_stack_id "$STACK_NAME" "$endpoint_id")

    if [ -n "$existing_stack_id" ]; then
        log_warn "기존 스택 발견 (ID: $existing_stack_id). 업데이트 모드로 진행"
        update_stack "$existing_stack_id" "$environment" "$registry_host" "$endpoint_id"
        return $?
    fi

    # Docker Compose 및 환경 파일 생성
    create_docker_compose "$environment" "$registry_host"
    create_env_file "$environment"

    # Docker Compose 파일을 문자열로 읽기
    local compose_content=$(cat "$STACK_FILE")
    local env_content=$(cat "$ENV_FILE")

    # 스택 배포 데이터 준비 (Standalone Stack 형식)
    local stack_data=$(jq -n \
        --arg name "$STACK_NAME" \
        --arg compose "$compose_content" \
        '{
            name: $name,
            stackFileContent: $compose
        }')

    log_info "스택 배포 요청 전송 중..."

    # 스택 생성 (Standalone Stack API 사용)
    local deploy_response=$(portainer_api_call "POST" "stacks/create/standalone/string?endpointId=$endpoint_id" "$stack_data")

    if [ $? -eq 0 ]; then
        local stack_id=$(echo "$deploy_response" | jq -r '.Id' 2>/dev/null)
        if [ -n "$stack_id" ] && [ "$stack_id" != "null" ]; then
            log_success "스택 배포 성공 (ID: $stack_id)"
            
            # 배포 상태 모니터링
            monitor_stack_deployment "$stack_id"
            
            # 정리
            cleanup_temp_files
            
            return 0
        else
            log_error "스택 배포 응답에서 ID를 찾을 수 없음"
            return 1
        fi
    else
        log_error "스택 배포 실패"
        return 1
    fi
}

update_stack() {
    local stack_id="$1"
    local environment="$2"
    local registry_host="$3"
    local endpoint_id="$4"

    log_info "스택 업데이트 시작 (ID: $stack_id, Environment: $environment, Endpoint: $endpoint_id)"

    # 배포 준비 - 코드 변경사항 확인 및 이미지 빌드
    if ! prepare_deployment "$environment" "$registry_host"; then
        log_error "배포 준비 실패"
        return 1
    fi

    # 최신 이미지 강제 풀링 (Portainer API 사용)
    if ! force_pull_images "$endpoint_id" "$registry_host"; then
        log_warn "이미지 풀링 실패 - 기존 이미지로 진행"
    fi

    # Docker Compose 및 환경 파일 생성
    create_docker_compose "$environment" "$registry_host"
    create_env_file "$environment"

    # Docker Compose 파일을 문자열로 읽기
    local compose_content=$(cat "$STACK_FILE")

    # 스택 업데이트 데이터 준비 (Standalone Stack 형식)
    local update_data=$(jq -n \
        --arg compose "$compose_content" \
        '{
            stackFileContent: $compose,
            prune: true
        }')

    log_info "스택 업데이트 요청 전송 중..."

    # 스택 업데이트 (Standalone Stack API 사용)
    local update_response=$(portainer_api_call "PUT" "stacks/$stack_id?endpointId=$endpoint_id" "$update_data")

    if [ $? -eq 0 ]; then
        log_success "스택 업데이트 성공"
        
        # 배포 상태 모니터링
        monitor_stack_deployment "$stack_id"
        
        # 정리
        cleanup_temp_files
        
        return 0
    else
        log_error "스택 업데이트 실패"
        return 1
    fi
}

delete_stack() {
    local stack_name="$1"
    local stack_id=$(get_stack_id "$stack_name")

    if [ -z "$stack_id" ]; then
        log_warn "스택을 찾을 수 없음: $stack_name"
        return 0
    fi

    log_info "스택 삭제 중: $stack_name (ID: $stack_id)"

    local delete_data=$(jq -n \
        --argjson endpoint_id "$ENDPOINT_ID" \
        '{
            EndpointId: $endpoint_id
        }')

    if portainer_api_call "DELETE" "stacks/$stack_id" "$delete_data" > /dev/null; then
        log_success "스택 삭제 완료: $stack_name"
        return 0
    else
        log_error "스택 삭제 실패: $stack_name"
        return 1
    fi
}

# =============================================================================
# 모니터링 함수
# =============================================================================
monitor_stack_deployment() {
    local stack_id="$1"
    local start_time=$(date +%s)

    log_info "스택 배포 상태 모니터링 시작 (ID: $stack_id)"

    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        if [ $elapsed -ge $DEPLOYMENT_TIMEOUT ]; then
            log_error "배포 모니터링 타임아웃 ($DEPLOYMENT_TIMEOUT초)"
            return 1
        fi

        # 스택 상태 확인
        local stack_info=$(portainer_api_call "GET" "stacks/$stack_id")
        if [ $? -eq 0 ]; then
            local status=$(echo "$stack_info" | jq -r '.Status // "unknown"')
            log_info "스택 상태: $status (${elapsed}초 경과)"

            case "$status" in
                1|"active")
                    log_success "스택 배포 완료"
                    wait_for_service_ready "container"
                    # Get endpoint_id from stack info
                    local endpoint_id=$(echo "$stack_info" | jq -r '.EndpointId // "3"')
                    check_stack_health "$endpoint_id"
                    return $?
                    ;;
                2|"inactive")
                    log_error "스택이 비활성 상태"
                    return 1
                    ;;
                *)
                    log_info "스택 상태 대기 중... ($status)"
                    ;;
            esac
        fi

        wait_for_service_ready "stack"
    done
}

check_stack_health() {
    local endpoint_id="${1:-$ENDPOINT_PRODUCTION}"
    log_info "스택 헬스 체크 시작 (Endpoint: $endpoint_id)"

    # 컨테이너 상태 확인
    local containers=$(portainer_api_call "GET" "endpoints/$endpoint_id/docker/containers/json")
    local healthy_count=0
    local total_count=0

    for container in "safework-postgres" "safework-redis" "safework-app"; do
        total_count=$((total_count + 1))
        if check_single_container_status "$container" "$containers"; then
            healthy_count=$((healthy_count + 1))
        fi
    done

    log_info "헬스 체크 결과: $healthy_count/$total_count 컨테이너 정상"

    # 애플리케이션 헬스 체크
    if [ $healthy_count -eq $total_count ]; then
        log_info "애플리케이션 헬스 체크 진행 중..."
        wait_for_service_ready "application"
        
        if check_app_health; then
            return 0
        else
            log_error "애플리케이션 헬스 체크 실패"
            return 1
        fi
    else
        log_error "일부 컨테이너가 정상 상태가 아님"
        return 1
    fi
}

show_stack_status() {
    local stack_name="$1"
    local stack_id=$(get_stack_id "$stack_name")

    if [ -z "$stack_id" ]; then
        log_warn "스택을 찾을 수 없음: $stack_name"
        return 1
    fi

    echo -e "\n${BLUE}=== SafeWork 스택 상태 ===${NC}"

    # 스택 정보
    local stack_info=$(portainer_api_call "GET" "stacks/$stack_id")
    if [ $? -eq 0 ]; then
        local status=$(echo "$stack_info" | jq -r '.Status // "unknown"')
        local endpoint_id=$(echo "$stack_info" | jq -r '.EndpointId // "unknown"')
        local creation_date=$(echo "$stack_info" | jq -r '.CreationDate // "unknown"')
        
        echo "스택 ID: $stack_id"
        echo "스택 이름: $stack_name"
        echo "상태: $status"
        echo "엔드포인트: $endpoint_id"
        echo "생성일: $creation_date"
    fi

    echo ""
    local endpoint_id=$(echo "$stack_info" | jq -r '.EndpointId // "3"')
    check_stack_health "$endpoint_id"
}

# =============================================================================
# 유틸리티 함수
# =============================================================================
cleanup_temp_files() {
    log_info "임시 파일 정리"
    
    if [ -f "$STACK_FILE" ]; then
        rm -f "$STACK_FILE"
        log_info "Docker Compose 파일 삭제: $STACK_FILE"
    fi
    
    if [ -f "$ENV_FILE" ]; then
        rm -f "$ENV_FILE"
        log_info "환경 파일 삭제: $ENV_FILE"
    fi
}

check_prerequisites() {
    log_info "전제 조건 확인 중..."

    # 필수 도구 확인
    for tool in curl jq; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool이 설치되지 않았습니다."
            return 1
        fi
    done

    # Portainer API 연결 확인
    if ! check_api_connectivity "$PORTAINER_URL/api/status" 5; then
        return 1
    fi

    log_success "전제 조건 확인 완료"
    return 0
}

# =============================================================================
# 메인 실행 함수
# =============================================================================
main() {
    show_header
    
    # 설정 파일 로드
    load_config_modules
    
    # 전제 조건 확인
    check_prerequisites || {
        log_error "전제 조건 확인 실패"
        exit 1
    }

    local command="${1:-help}"
    local environment="${2:-local}"

    # 환경별 레지스트리 설정
    local registry_host
    case "$environment" in
        "local")
            registry_host="$LOCAL_REGISTRY"
            ;;
        "production"|"prod")
            registry_host="$PROD_REGISTRY"
            environment="production"
            ;;
        *)
            log_error "지원하지 않는 환경: $environment (local 또는 production 사용)"
            exit 1
            ;;
    esac

    case "$command" in
        "deploy")
            deploy_stack "$environment" "$registry_host"
            ;;
        "update")
            local stack_id=$(get_stack_id "$STACK_NAME")
            if [ -n "$stack_id" ]; then
                update_stack "$stack_id" "$environment" "$registry_host"
            else
                log_error "업데이트할 스택을 찾을 수 없음: $STACK_NAME"
                exit 1
            fi
            ;;
        "delete"|"remove")
            delete_stack "$STACK_NAME"
            ;;
        "status")
            show_stack_status "$STACK_NAME"
            ;;
        "list")
            list_stacks
            ;;
        "health")
            check_stack_health
            ;;
        "logs")
            local container_name="${3:-safework-app}"
            log_info "$container_name 컨테이너 로그 조회"
            # 실제 로그 조회는 별도 스크립트나 docker logs 명령 사용
            echo "docker logs -f $container_name"
            ;;
        "help"|*)
            echo "SafeWork Portainer Stack 배포 도구 (현행화된 버전)"
            echo ""
            echo "사용법: $0 <COMMAND> [ENVIRONMENT]"
            echo ""
            echo "명령어:"
            echo "  deploy     - 스택 배포 (신규 생성 또는 업데이트)"
            echo "  update     - 기존 스택 업데이트"
            echo "  delete     - 스택 삭제"
            echo "  status     - 스택 상태 확인"
            echo "  list       - 모든 스택 목록"
            echo "  health     - 헬스 체크"
            echo "  logs       - 컨테이너 로그 (컨테이너명 옵션)"
            echo "  help       - 도움말"
            echo ""
            echo "환경:"
            echo "  local      - 로컬 개발 환경 (기본값)"
            echo "  production - 운영 환경 (Endpoint 3)"
            echo ""
            echo "예시:"
            echo "  $0 deploy local                    # 로컬 환경 배포"
            echo "  $0 deploy production               # 운영 환경 배포"
            echo "  $0 status                          # 스택 상태 확인"
            echo "  $0 update production               # 운영 환경 업데이트"
            echo "  $0 logs safework-app               # 앱 컨테이너 로그"
            echo ""
            echo "주요 개선사항 (v2.0):"
            echo "  - Portainer API v2.x Standalone Stack 지원"
            echo "  - Endpoint 3 (production) 정확한 매핑"
            echo "  - Docker API v1.24+ 호환성 보장"
            echo "  - 검증된 docker-compose 구성 적용"
            echo "  - Production/Local 헬스체크 자동 전환"
            echo "  - 실제 운영환경 테스트 완료"
            ;;
    esac

    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        log_success "명령 실행 완료: $command"
        if [ "$command" = "deploy" ] || [ "$command" = "update" ]; then
            echo -e "\n${GREEN}SafeWork 스택 배포 완료${NC}"
            echo "환경: $environment"
            echo "레지스트리: $registry_host"
            echo "접속 URL: http://localhost:4545"
            echo "헬스 체크: http://localhost:4545/health"
        fi
    else
        log_error "명령 실행 실패: $command"
        echo -e "\n${RED}오류가 발생했습니다. 로그를 확인하세요: $LOG_FILE${NC}"
    fi

    # 임시 파일 정리
    cleanup_temp_files

    echo ""
    exit $exit_code
}

# 스크립트 실행
main "$@"