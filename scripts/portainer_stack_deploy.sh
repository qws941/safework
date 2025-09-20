#!/bin/bash
# SafeWork Portainer Stack 배포 스크립트 v1.0
# 로컬/운영 환경 통합 스택 배포 관리
# Docker Compose Stack을 Portainer API로 배포
set -euo pipefail

# =============================================================================
# 설정 및 상수 정의
# =============================================================================
readonly SCRIPT_VERSION="1.0.0"
readonly SCRIPT_NAME="SafeWork Portainer Stack Deploy"
readonly LOG_FILE="/tmp/safework_stack_deploy_$(date +%Y%m%d_%H%M%S).log"

# Portainer API 설정
readonly PORTAINER_URL="https://portainer.jclee.me"
readonly PORTAINER_TOKEN="ptr_zdHC0mAdjC7hk7pZ8r2+pJZO+bLxBD/TaB3iPuQwx9Q="

# Endpoint 매핑
readonly ENDPOINT_SYNOLOGY="1"    # 운영 환경 (synology)
readonly ENDPOINT_JCLEE_DEV="2"   # 개발 환경 (jclee-dev)

# 스택 설정
readonly STACK_NAME="safework"
readonly STACK_FILE="docker-compose.yml"
readonly ENV_FILE=".env"

# 환경별 설정
readonly LOCAL_REGISTRY="localhost:5000"
readonly PROD_REGISTRY="registry.jclee.me"

# 서비스 URL 패턴
readonly PROD_URL_PATTERN="{basedir}.jclee.me"       # 운영: safework.jclee.me
readonly DEV_URL_PATTERN="{basedir}-dev.jclee.me"    # 개발: safework-dev.jclee.me

# 환경별 endpoint 매핑 함수
get_endpoint_id() {
    local environment="$1"
    case "$environment" in
        "production"|"prod")
            echo "$ENDPOINT_SYNOLOGY"
            ;;
        "development"|"dev"|"local")
            echo "$ENDPOINT_JCLEE_DEV"
            ;;
        *)
            log "ERROR" "지원하지 않는 환경: $environment"
            return 1
            ;;
    esac
}

# 타임아웃 설정
readonly API_TIMEOUT=30
readonly DEPLOYMENT_TIMEOUT=300
readonly HEALTH_CHECK_TIMEOUT=120

# 색상 코드
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

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
# 스택 설정 생성 함수
# =============================================================================
create_docker_compose() {
    local environment="$1"
    local registry_host="$2"

    log_info "Docker Compose 파일 생성: $environment 환경"

    cat > "$STACK_FILE" << EOF
version: '3.8'

networks:
  safework_network:
    driver: bridge
    name: safework_network

volumes:
  postgres_data:
    name: safework_postgres_data
  redis_data:
    name: safework_redis_data

services:
  safework-postgres:
    image: ${registry_host}/safework/postgres:latest
    container_name: safework-postgres
    hostname: safework-postgres
    environment:
      - TZ=Asia/Seoul
      - POSTGRES_PASSWORD=\${DB_PASSWORD}
      - POSTGRES_DB=\${DB_NAME}
      - POSTGRES_USER=\${DB_USER}
      - POSTGRES_INITDB_ARGS=--encoding=UTF8 --locale=C
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - safework_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${DB_USER} -d \${DB_NAME}"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  safework-redis:
    image: ${registry_host}/safework/redis:latest
    container_name: safework-redis
    hostname: safework-redis
    environment:
      - TZ=Asia/Seoul
    volumes:
      - redis_data:/data
    networks:
      - safework_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 128M
        reservations:
          memory: 64M

  safework-app:
    image: ${registry_host}/safework/app:latest
    container_name: safework-app
    hostname: safework-app
    environment:
      - TZ=Asia/Seoul
      - DB_HOST=safework-postgres
      - DB_NAME=\${DB_NAME}
      - DB_USER=\${DB_USER}
      - DB_PASSWORD=\${DB_PASSWORD}
      - REDIS_HOST=safework-redis
      - FLASK_CONFIG=\${FLASK_CONFIG}
      - SECRET_KEY=\${SECRET_KEY}
      - ADMIN_USERNAME=\${ADMIN_USERNAME}
      - ADMIN_PASSWORD=\${ADMIN_PASSWORD}
    ports:
      - "\${APP_PORT}:4545"
    networks:
      - safework_network
    restart: unless-stopped
    depends_on:
      safework-postgres:
        condition: service_healthy
      safework-redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4545/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
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

    # 스택 배포 데이터 준비
    local stack_data=$(jq -n \
        --arg name "$STACK_NAME" \
        --arg compose "$compose_content" \
        --arg env "$env_content" \
        --argjson endpoint_id "$endpoint_id" \
        '{
            Name: $name,
            SwarmID: "",
            ComposeFile: $compose,
            Env: [
                {name: "COMPOSE_PROJECT_NAME", value: $name}
            ],
            FromAppTemplate: false,
            EndpointId: $endpoint_id
        }')

    # 환경 변수를 스택 데이터에 추가
    while IFS='=' read -r key value; do
        if [[ -n "$key" && ! "$key" =~ ^# && -n "$value" ]]; then
            stack_data=$(echo "$stack_data" | jq --arg key "$key" --arg value "$value" '.Env += [{name: $key, value: $value}]')
        fi
    done < "$ENV_FILE"

    log_info "스택 배포 요청 전송 중..."

    # 스택 생성
    local deploy_response=$(portainer_api_call "POST" "stacks" "$stack_data")

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

    # Docker Compose 및 환경 파일 생성
    create_docker_compose "$environment" "$registry_host"
    create_env_file "$environment"

    # Docker Compose 파일을 문자열로 읽기
    local compose_content=$(cat "$STACK_FILE")

    # 스택 업데이트 데이터 준비
    local update_data=$(jq -n \
        --arg compose "$compose_content" \
        --argjson endpoint_id "$endpoint_id" \
        '{
            StackFileContent: $compose,
            Env: [
                {name: "COMPOSE_PROJECT_NAME", value: "'$STACK_NAME'"}
            ],
            Prune: false,
            PullImage: true,
            EndpointId: $endpoint_id
        }')

    # 환경 변수를 업데이트 데이터에 추가
    while IFS='=' read -r key value; do
        if [[ -n "$key" && ! "$key" =~ ^# && -n "$value" ]]; then
            update_data=$(echo "$update_data" | jq --arg key "$key" --arg value "$value" '.Env += [{name: $key, value: $value}]')
        fi
    done < "$ENV_FILE"

    log_info "스택 업데이트 요청 전송 중..."

    # 스택 업데이트
    local update_response=$(portainer_api_call "PUT" "stacks/$stack_id" "$update_data")

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
                    sleep 10  # 컨테이너 완전 시작 대기
                    check_stack_health
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

        sleep 10
    done
}

check_stack_health() {
    log_info "스택 헬스 체크 시작"

    # 컨테이너 상태 확인
    local containers=$(portainer_api_call "GET" "endpoints/$ENDPOINT_ID/docker/containers/json")
    local healthy_count=0
    local total_count=0

    for container in "safework-postgres" "safework-redis" "safework-app"; do
        total_count=$((total_count + 1))
        local container_info=$(echo "$containers" | jq -r ".[] | select(.Names[] | contains(\"$container\"))")
        
        if [ -n "$container_info" ]; then
            local status=$(echo "$container_info" | jq -r '.State')
            local health=$(echo "$container_info" | jq -r '.Status')
            
            case "$status" in
                "running")
                    log_success "✅ $container: 실행 중 ($health)"
                    healthy_count=$((healthy_count + 1))
                    ;;
                *)
                    log_error "❌ $container: $status ($health)"
                    ;;
            esac
        else
            log_error "⚠️ $container: 컨테이너를 찾을 수 없음"
        fi
    done

    log_info "헬스 체크 결과: $healthy_count/$total_count 컨테이너 정상"

    # 애플리케이션 헬스 체크
    if [ $healthy_count -eq $total_count ]; then
        log_info "애플리케이션 헬스 체크 진행 중..."
        sleep 20  # 애플리케이션 완전 시작 대기
        
        if curl -s -f "http://localhost:4545/health" > /dev/null 2>&1; then
            local health_response=$(curl -s "http://localhost:4545/health" | jq -r '.status' 2>/dev/null || echo "ok")
            log_success "애플리케이션 헬스 체크 성공: $health_response"
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
    check_stack_health
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
    if ! curl -s -f --connect-timeout 5 "$PORTAINER_URL/api/status" > /dev/null 2>&1; then
        log_error "Portainer API에 연결할 수 없습니다: $PORTAINER_URL"
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
            echo "SafeWork Portainer Stack 배포 도구"
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
            echo "  production - 운영 환경"
            echo ""
            echo "예시:"
            echo "  $0 deploy local                    # 로컬 환경 배포"
            echo "  $0 deploy production               # 운영 환경 배포"
            echo "  $0 status                          # 스택 상태 확인"
            echo "  $0 update production               # 운영 환경 업데이트"
            echo "  $0 logs safework-app               # 앱 컨테이너 로그"
            echo ""
            echo "특징:"
            echo "  - Docker Compose 기반 스택 배포"
            echo "  - 환경별 자동 설정 관리"
            echo "  - 헬스 체크 및 상태 모니터링"
            echo "  - 자동 이미지 풀링 및 업데이트"
            echo "  - 롤링 업데이트 지원"
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