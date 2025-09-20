#!/bin/bash
# SafeWork 통합 스택 배포 스크립트 v2.0
# 스택 기반 배포 - 없으면 생성, 있으면 업데이트
# 전체 파이프라인 변동사항 마이그레이션 및 중복제거
set -euo pipefail

# =============================================================================
# 설정 및 상수 정의
# =============================================================================
readonly SCRIPT_VERSION="2.0.0"
readonly SCRIPT_NAME="SafeWork 통합 스택 배포"
readonly LOG_FILE="/tmp/safework_unified_deploy_$(date +%Y%m%d_%H%M%S).log"

# Portainer API 설정
readonly PORTAINER_URL="https://portainer.jclee.me"
readonly PORTAINER_TOKEN="ptr_zdHC0mAdjC7hk7pZ8r2+pJZO+bLxBD/TaB3iPuQwx9Q="

# Endpoint 매핑
readonly ENDPOINT_SYNOLOGY="3"    # 운영 환경 (synology)
readonly ENDPOINT_JCLEE_DEV="4"   # 개발 환경 (jclee-dev)

# 스택 설정
readonly STACK_NAME="safework"
readonly STACK_TEMPLATES_DIR="$(dirname "$(realpath "$0")")/stack-templates"

# 서비스 URL 패턴
readonly PROD_URL="safework.jclee.me"       # 운영: safework.jclee.me
readonly DEV_URL="safework-dev.jclee.me"    # 개발: safework-dev.jclee.me

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

log_info() { log "INFO" "${BLUE}$*${NC}"; }
log_success() { log "SUCCESS" "${GREEN}$*${NC}"; }
log_warn() { log "WARN" "${YELLOW}$*${NC}"; }
log_error() { log "ERROR" "${RED}$*${NC}"; }

# =============================================================================
# 유틸리티 함수
# =============================================================================
portainer_api_call() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"
    local content_type="${4:-application/json}"

    local curl_args=(
        -s
        -w "HTTP_STATUS:%{http_code}"
        -X "$method"
        -H "X-API-Key: $PORTAINER_TOKEN"
    )

    if [ "$content_type" != "multipart/form-data" ]; then
        curl_args+=(-H "Content-Type: $content_type")
    fi

    if [ -n "$data" ]; then
        if [ "$content_type" = "multipart/form-data" ]; then
            curl_args+=($data)  # $data contains form fields for multipart
        else
            curl_args+=(-d "$data")
        fi
    fi

    local response=$(curl "${curl_args[@]}" "$PORTAINER_URL/api/$endpoint")
    local http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    local body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')

    if [ "$http_status" != "200" ] && [ "$http_status" != "201" ]; then
        log_error "HTTP Error $http_status: $body"
    fi

    echo "$body"
}

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
            log_error "지원하지 않는 환경: $environment (production|development)"
            return 1
            ;;
    esac
}

get_service_url() {
    local environment="$1"
    case "$environment" in
        "production"|"prod")
            echo "$PROD_URL"
            ;;
        "development"|"dev"|"local")
            echo "$DEV_URL"
            ;;
        *)
            log_error "지원하지 않는 환경: $environment"
            return 1
            ;;
    esac
}

# =============================================================================
# 스택 관리 함수
# =============================================================================
get_stack_info() {
    local stack_name="$1"
    local endpoint_id="$2"

    local stacks=$(portainer_api_call "GET" "stacks")
    echo "$stacks" | jq -r ".[] | select(.Name == \"$stack_name\" and .EndpointId == $endpoint_id)"
}

check_stack_exists() {
    local stack_name="$1"
    local endpoint_id="$2"

    local stack_info=$(get_stack_info "$stack_name" "$endpoint_id")
    if [ -n "$stack_info" ] && [ "$stack_info" != "null" ]; then
        echo "true"
    else
        echo "false"
    fi
}

create_docker_compose() {
    local environment="$1"

    log_info "Docker Compose 파일 생성: $environment 환경"

    # 환경별 템플릿 파일 매핑
    local template_file
    case "$environment" in
        "production"|"prod")
            template_file="$STACK_TEMPLATES_DIR/docker-compose.production.yml"
            ;;
        "development"|"dev"|"local")
            template_file="$STACK_TEMPLATES_DIR/docker-compose.local.yml"
            ;;
        *)
            log_error "지원하지 않는 환경: $environment"
            return 1
            ;;
    esac

    if [ ! -f "$template_file" ]; then
        log_error "템플릿 파일이 존재하지 않음: $template_file"
        return 1
    fi

    # 서비스 URL 치환
    local service_url=$(get_service_url "$environment")
    cp "$template_file" "docker-compose.yml"

    log_success "Docker Compose 파일 생성 완료: docker-compose.yml"
    log_info "서비스 URL: $service_url"
}

create_env_file() {
    local environment="$1"

    log_info "환경 변수 파일 생성: $environment 환경"

    # 환경별 템플릿 파일 매핑
    local template_file
    case "$environment" in
        "production"|"prod")
            template_file="$STACK_TEMPLATES_DIR/env.production"
            ;;
        "development"|"dev"|"local")
            template_file="$STACK_TEMPLATES_DIR/env.local"
            ;;
        *)
            log_error "지원하지 않는 환경: $environment"
            return 1
            ;;
    esac

    if [ ! -f "$template_file" ]; then
        log_error "환경 템플릿이 존재하지 않음: $template_file"
        return 1
    fi

    cp "$template_file" ".env"

    # 동적 환경 변수 추가
    {
        echo ""
        echo "# 배포 메타데이터"
        echo "DEPLOYMENT_TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S %Z')"
        echo "DEPLOYMENT_ENVIRONMENT=$environment"
        echo "SERVICE_URL=$(get_service_url "$environment")"
        echo "SCRIPT_VERSION=$SCRIPT_VERSION"
    } >> ".env"

    log_success "환경 변수 파일 생성 완료: .env"
}

# =============================================================================
# 스택 배포 함수 (통합)
# =============================================================================
deploy_or_update_stack() {
    local environment="$1"

    log_info "$SCRIPT_NAME 시작: $environment 환경"

    # 환경별 endpoint ID 가져오기
    local endpoint_id=$(get_endpoint_id "$environment")
    if [ $? -ne 0 ]; then
        return 1
    fi

    log_info "사용할 Endpoint: $endpoint_id (환경: $environment)"

    # 임시 작업 디렉토리 생성
    local work_dir="/tmp/safework_deploy_$$"
    mkdir -p "$work_dir"
    cd "$work_dir"

    # Docker Compose 및 환경 파일 생성
    create_docker_compose "$environment"
    create_env_file "$environment"

    # 스택 존재 여부 확인
    local stack_exists=$(check_stack_exists "$STACK_NAME" "$endpoint_id")

    if [ "$stack_exists" = "true" ]; then
        log_info "기존 스택 발견: 업데이트 모드로 진행"
        update_existing_stack "$environment" "$endpoint_id"
    else
        log_info "새 스택 생성 모드로 진행"
        create_new_stack "$environment" "$endpoint_id"
    fi

    # 정리
    cd - > /dev/null
    rm -rf "$work_dir"
}

# 컨테이너 직접 배포 함수 (스택 API 실패 시 폴백)
deploy_containers_directly() {
    local endpoint_id="$1"
    local compose_content="$2"
    local env_vars="$3"

    log_info "컨테이너 직접 배포 시작 (endpoint: $endpoint_id)"

    # SafeWork 네트워크 생성
    log_info "SafeWork 네트워크 생성"
    local network_data='{
        "Name": "safework_network",
        "Driver": "bridge",
        "IPAM": {
            "Driver": "default",
            "Config": [{"Subnet": "172.20.0.0/16"}]
        }
    }'

    local network_response=$(portainer_api_call "POST" "endpoints/$endpoint_id/docker/networks/create" "$network_data")
    if echo "$network_response" | grep -q '"Id"'; then
        log_success "SafeWork 네트워크 생성 성공"
    elif echo "$network_response" | grep -q "already exists"; then
        log_info "SafeWork 네트워크가 이미 존재함"
    else
        log_warn "네트워크 생성 실패, 계속 진행: $network_response"
    fi

    # 볼륨 생성
    for volume in "safework_postgres_data" "safework_redis_data" "safework_app_uploads"; do
        log_info "볼륨 생성: $volume"
        local volume_data="{\"Name\": \"$volume\", \"Driver\": \"local\"}"
        local volume_response=$(portainer_api_call "POST" "endpoints/$endpoint_id/docker/volumes/create" "$volume_data")
        if echo "$volume_response" | grep -q '"Name"'; then
            log_success "볼륨 생성 성공: $volume"
        elif echo "$volume_response" | grep -q "already exists"; then
            log_info "볼륨이 이미 존재함: $volume"
        else
            log_warn "볼륨 생성 실패: $volume - $volume_response"
        fi
    done

    # 이미지 pull
    pull_required_images "$endpoint_id"

    # 컨테이너 배포 순서: postgres -> redis -> app
    deploy_postgres_container "$endpoint_id"
    deploy_redis_container "$endpoint_id"
    deploy_app_container "$endpoint_id"

    log_success "컨테이너 직접 배포 완료"
    return 0
}

# 필요한 이미지들을 pull
pull_required_images() {
    local endpoint_id="$1"
    log_info "SafeWork 이미지들을 pull 중..."

    local images=("registry.jclee.me/safework/postgres:latest" "registry.jclee.me/safework/redis:latest" "registry.jclee.me/safework/app:latest")

    for image in "${images[@]}"; do
        log_info "이미지 pull 중: $image"
        # Docker API expects fromImage as query parameter, not in body
        local encoded_image=$(echo "$image" | sed 's/:/%3A/g; s/\//%2F/g')

        # Add registry authentication for private registry
        local auth_config='{
            "username": "admin",
            "password": "bingogo1",
            "serveraddress": "registry.jclee.me"
        }'
        local encoded_auth=$(echo "$auth_config" | base64 -w 0)

        # Use custom curl for registry auth
        local response=$(curl -s -w "HTTP_STATUS:%{http_code}" \
            -X POST \
            -H "X-API-Key: $PORTAINER_TOKEN" \
            -H "Content-Type: application/json" \
            -H "X-Registry-Auth: $encoded_auth" \
            "$PORTAINER_URL/api/endpoints/$endpoint_id/docker/images/create?fromImage=$encoded_image")

        local http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
        local body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')

        if [ "$http_status" != "200" ] && [ "$http_status" != "201" ]; then
            log_warn "이미지 pull 실패: $image - HTTP $http_status: $body"
        else
            log_success "이미지 pull 성공: $image"
        fi
    done
}

# PostgreSQL 컨테이너 배포
deploy_postgres_container() {
    local endpoint_id="$1"
    log_info "PostgreSQL 컨테이너 배포"

    local postgres_config='{
        "Image": "registry.jclee.me/safework/postgres:latest",
        "Name": "safework-postgres",
        "Hostname": "safework-postgres",
        "Env": [
            "TZ=Asia/Seoul",
            "POSTGRES_PASSWORD=safework2024",
            "POSTGRES_DB=safework_db",
            "POSTGRES_USER=safework",
            "POSTGRES_INITDB_ARGS=--encoding=UTF8 --locale=C",
            "PGDATA=/var/lib/postgresql/data/pgdata"
        ],
        "HostConfig": {
            "NetworkMode": "safework_network",
            "Mounts": [
                {
                    "Type": "volume",
                    "Source": "safework_postgres_data",
                    "Target": "/var/lib/postgresql/data"
                }
            ],
            "RestartPolicy": {"Name": "always"}
        },
        "NetworkingConfig": {
            "EndpointsConfig": {
                "safework_network": {
                    "IPAMConfig": {"IPv4Address": "172.20.0.10"}
                }
            }
        }
    }'

    local postgres_response=$(portainer_api_call "POST" "endpoints/$endpoint_id/docker/containers/create" "$postgres_config")
    if echo "$postgres_response" | grep -q '"Id"'; then
        local container_id=$(echo "$postgres_response" | jq -r '.Id')
        log_success "PostgreSQL 컨테이너 생성 성공: $container_id"

        # 컨테이너 시작 (Docker API v1.24+ 호환성을 위해 빈 request body 사용)
        echo "   🚀 Starting container with empty request body (Docker API v1.24+ compliance)..."
        start_response=$(curl -s -w "%{http_code}" -X POST \
            -H "X-API-Key: $PORTAINER_TOKEN" \
            -H "Content-Type: application/json" \
            -d "" \
            "$PORTAINER_URL/api/endpoints/$endpoint_id/docker/containers/$container_id/start")

        http_code="${start_response: -3}"
        if [ "$http_code" = "204" ] || [ "$http_code" = "304" ]; then
            echo "   ✅ Container started successfully (HTTP $http_code)"
        else
            echo "   ⚠️  Container start returned HTTP $http_code, checking status..."
            # 컨테이너 상태 확인
            status=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
                "$PORTAINER_URL/api/endpoints/$endpoint_id/docker/containers/$container_id/json" | \
                jq -r '.State.Status' 2>/dev/null)
            echo "   📊 Container status: $status"
        fi
        log_success "PostgreSQL 컨테이너 시작됨"
    else
        log_error "PostgreSQL 컨테이너 생성 실패: $postgres_response"
        return 1
    fi
}

# Redis 컨테이너 배포
deploy_redis_container() {
    local endpoint_id="$1"
    log_info "Redis 컨테이너 배포"

    local redis_config='{
        "Image": "registry.jclee.me/safework/redis:latest",
        "Name": "safework-redis",
        "Hostname": "safework-redis",
        "Env": [
            "TZ=Asia/Seoul",
            "REDIS_PASSWORD="
        ],
        "HostConfig": {
            "NetworkMode": "safework_network",
            "Mounts": [
                {
                    "Type": "volume",
                    "Source": "safework_redis_data",
                    "Target": "/data"
                }
            ],
            "RestartPolicy": {"Name": "always"}
        },
        "NetworkingConfig": {
            "EndpointsConfig": {
                "safework_network": {
                    "IPAMConfig": {"IPv4Address": "172.20.0.11"}
                }
            }
        }
    }'

    local redis_response=$(portainer_api_call "POST" "endpoints/$endpoint_id/docker/containers/create" "$redis_config")
    if echo "$redis_response" | grep -q '"Id"'; then
        local container_id=$(echo "$redis_response" | jq -r '.Id')
        log_success "Redis 컨테이너 생성 성공: $container_id"

        # 컨테이너 시작 (Docker API v1.24+ 호환성을 위해 빈 request body 사용)
        echo "   🚀 Starting container with empty request body (Docker API v1.24+ compliance)..."
        start_response=$(curl -s -w "%{http_code}" -X POST \
            -H "X-API-Key: $PORTAINER_TOKEN" \
            -H "Content-Type: application/json" \
            -d "" \
            "$PORTAINER_URL/api/endpoints/$endpoint_id/docker/containers/$container_id/start")

        http_code="${start_response: -3}"
        if [ "$http_code" = "204" ] || [ "$http_code" = "304" ]; then
            echo "   ✅ Container started successfully (HTTP $http_code)"
        else
            echo "   ⚠️  Container start returned HTTP $http_code, checking status..."
            # 컨테이너 상태 확인
            status=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
                "$PORTAINER_URL/api/endpoints/$endpoint_id/docker/containers/$container_id/json" | \
                jq -r '.State.Status' 2>/dev/null)
            echo "   📊 Container status: $status"
        fi
        log_success "Redis 컨테이너 시작됨"
    else
        log_error "Redis 컨테이너 생성 실패: $redis_response"
        return 1
    fi
}

# 애플리케이션 컨테이너 배포
deploy_app_container() {
    local endpoint_id="$1"
    log_info "SafeWork 애플리케이션 컨테이너 배포"

    local app_config='{
        "Image": "registry.jclee.me/safework/app:latest",
        "Name": "safework-app",
        "Hostname": "safework-app",
        "Env": [
            "TZ=Asia/Seoul",
            "FLASK_CONFIG=development",
            "DEBUG=true",
            "DB_HOST=safework-postgres",
            "DB_PORT=5432",
            "DB_NAME=safework_db",
            "DB_USER=safework",
            "DB_PASSWORD=safework2024",
            "REDIS_HOST=safework-redis",
            "REDIS_PORT=6379",
            "REDIS_PASSWORD=",
            "REDIS_DB=0",
            "SECRET_KEY=safework-local-secret-key-2024",
            "ADMIN_USERNAME=admin",
            "ADMIN_PASSWORD=admin123",
            "WTF_CSRF_ENABLED=false",
            "UPLOAD_FOLDER=/app/uploads",
            "MAX_CONTENT_LENGTH=52428800",
            "LOG_LEVEL=DEBUG",
            "LOG_FILE=/app/logs/app.log"
        ],
        "HostConfig": {
            "NetworkMode": "safework_network",
            "PortBindings": {
                "4545/tcp": [{"HostPort": "4545"}]
            },
            "Mounts": [
                {
                    "Type": "volume",
                    "Source": "safework_app_uploads",
                    "Target": "/app/uploads"
                }
            ],
            "RestartPolicy": {"Name": "always"}
        },
        "NetworkingConfig": {
            "EndpointsConfig": {
                "safework_network": {
                    "IPAMConfig": {"IPv4Address": "172.20.0.12"}
                }
            }
        }
    }'

    local app_response=$(portainer_api_call "POST" "endpoints/$endpoint_id/docker/containers/create" "$app_config")
    if echo "$app_response" | grep -q '"Id"'; then
        local container_id=$(echo "$app_response" | jq -r '.Id')
        log_success "SafeWork 애플리케이션 컨테이너 생성 성공: $container_id"

        # 컨테이너 시작 (Docker API v1.24+ 호환성을 위해 빈 request body 사용)
        echo "   🚀 Starting container with empty request body (Docker API v1.24+ compliance)..."
        start_response=$(curl -s -w "%{http_code}" -X POST \
            -H "X-API-Key: $PORTAINER_TOKEN" \
            -H "Content-Type: application/json" \
            -d "" \
            "$PORTAINER_URL/api/endpoints/$endpoint_id/docker/containers/$container_id/start")

        http_code="${start_response: -3}"
        if [ "$http_code" = "204" ] || [ "$http_code" = "304" ]; then
            echo "   ✅ Container started successfully (HTTP $http_code)"
        else
            echo "   ⚠️  Container start returned HTTP $http_code, checking status..."
            # 컨테이너 상태 확인
            status=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
                "$PORTAINER_URL/api/endpoints/$endpoint_id/docker/containers/$container_id/json" | \
                jq -r '.State.Status' 2>/dev/null)
            echo "   📊 Container status: $status"
        fi
        log_success "SafeWork 애플리케이션 컨테이너 시작됨"
    else
        log_error "SafeWork 애플리케이션 컨테이너 생성 실패: $app_response"
        return 1
    fi
}

create_new_stack() {
    local environment="$1"
    local endpoint_id="$2"

    log_info "새 스택 생성 중..."

    # Docker Compose 파일을 문자열로 읽기
    local compose_content=$(cat "docker-compose.yml")

    # 환경 변수 배열 생성
    local env_vars="[]"
    if [ -f ".env" ]; then
        while IFS='=' read -r key value; do
            if [[ -n "$key" && ! "$key" =~ ^# && -n "$value" ]]; then
                # 값에서 따옴표 제거
                value=$(echo "$value" | sed 's/^"//;s/"$//')
                env_vars=$(echo "$env_vars" | jq --arg key "$key" --arg value "$value" '. += [{name: $key, value: $value}]')
            fi
        done < ".env"
    fi

    # 스택 생성 데이터 준비 - Try different payload formats
    local stack_data_string=$(jq -n \
        --arg name "$STACK_NAME" \
        --arg compose "$compose_content" \
        --argjson endpoint_id "$endpoint_id" \
        --argjson env "$env_vars" \
        '{
            Name: $name,
            StackFileContent: $compose,
            Env: $env
        }')

    local stack_data_repo=$(jq -n \
        --arg name "$STACK_NAME" \
        --arg compose "$compose_content" \
        --argjson endpoint_id "$endpoint_id" \
        --argjson env "$env_vars" \
        '{
            Name: $name,
            ComposeFile: $compose,
            Env: $env
        }')

    local stack_data_file=$(jq -n \
        --arg name "$STACK_NAME" \
        --arg compose "$compose_content" \
        --argjson endpoint_id "$endpoint_id" \
        --argjson env "$env_vars" \
        '{
            Name: $name,
            StackFileContent: $compose,
            Env: $env
        }')

    local stack_data="$stack_data_string"

    # API 호출 - Portainer Stack Creation
    log_info "API 호출 데이터: $(echo "$stack_data" | head -c 200)..."

    # Try Portainer v2.x API - Docker Compose Stack Creation using multipart form data
    log_info "시도 1: Multipart form data (standard Portainer approach)"

    # Create temporary file for compose content
    local compose_file="/tmp/docker-compose-${STACK_NAME}.yml"
    echo "$compose_content" > "$compose_file"

    # Prepare form data for multipart upload
    local form_data="-F Name=$STACK_NAME -F file=@$compose_file"
    if [ "$env_vars" != "[]" ]; then
        # Add environment variables as form fields
        echo "$env_vars" | jq -r '.[] | "-F env[\(.name)]=\(.value)"' | while read -r env_field; do
            form_data="$form_data $env_field"
        done
    fi

    local response=$(portainer_api_call "POST" "stacks?type=2&method=file&endpointId=$endpoint_id" "$form_data" "multipart/form-data")

    if echo "$response" | grep -q '"Id"'; then
        log_success "Multipart form data 성공"
    else
        log_warn "Multipart form data 실패: $response"
        log_info "시도 2: Standard JSON POST to compose endpoint"
        response=$(portainer_api_call "POST" "stacks?type=2&method=string&endpointId=$endpoint_id" "$stack_data_string")

        if echo "$response" | grep -q '"Id"'; then
            log_success "JSON POST 성공"
        else
            log_warn "JSON POST 실패: $response"
            log_info "시도 3: Try /endpoints/{id}/docker/compose endpoint"
            response=$(portainer_api_call "POST" "endpoints/$endpoint_id/docker/compose?action=create" "$stack_data_string")

            if ! echo "$response" | grep -q '"Id"'; then
                log_error "스택 API 생성 실패. 컨테이너 직접 배포 시도"
                log_info "폴백: 컨테이너 직접 관리 모드로 전환"
                deploy_containers_directly "$endpoint_id" "$compose_content" "$env_vars"
                return $?
            fi
        fi
    fi

    # Cleanup temporary file
    rm -f "$compose_file"

    log_info "API 응답 길이: ${#response}"

    # 응답 확인
    local stack_id=$(echo "$response" | jq -r '.Id // empty')
    if [ -n "$stack_id" ]; then
        log_success "스택 생성 성공 (ID: $stack_id)"
        verify_deployment "$stack_id" "$endpoint_id"
    else
        log_error "스택 생성 실패"
        log_error "응답: $response"
        log_error "jq 파싱 결과: $(echo "$response" | jq . 2>&1 || echo "Invalid JSON")"
        return 1
    fi
}

update_existing_stack() {
    local environment="$1"
    local endpoint_id="$2"

    # 기존 스택 정보 가져오기
    local stack_info=$(get_stack_info "$STACK_NAME" "$endpoint_id")
    local stack_id=$(echo "$stack_info" | jq -r '.Id')

    if [ -z "$stack_id" ] || [ "$stack_id" = "null" ]; then
        log_error "스택 ID를 찾을 수 없음"
        return 1
    fi

    log_info "기존 스택 업데이트 중 (ID: $stack_id)..."

    # Docker Compose 파일을 문자열로 읽기
    local compose_content=$(cat "docker-compose.yml")

    # 환경 변수 배열 생성
    local env_vars="[]"
    if [ -f ".env" ]; then
        while IFS='=' read -r key value; do
            if [[ -n "$key" && ! "$key" =~ ^# && -n "$value" ]]; then
                # 값에서 따옴표 제거
                value=$(echo "$value" | sed 's/^"//;s/"$//')
                env_vars=$(echo "$env_vars" | jq --arg key "$key" --arg value "$value" '. += [{name: $key, value: $value}]')
            fi
        done < ".env"
    fi

    # 스택 업데이트 데이터 준비
    local update_data=$(jq -n \
        --arg compose "$compose_content" \
        --argjson endpoint_id "$endpoint_id" \
        --argjson env "$env_vars" \
        '{
            StackFileContent: $compose,
            Env: $env,
            Prune: false,
            PullImage: true,
            EndpointId: $endpoint_id
        }')

    # API 호출
    local response=$(portainer_api_call "PUT" "stacks/$stack_id" "$update_data")

    # 응답 확인
    if [ $? -eq 0 ]; then
        log_success "스택 업데이트 성공 (ID: $stack_id)"
        verify_deployment "$stack_id" "$endpoint_id"
    else
        log_error "스택 업데이트 실패"
        log_error "응답: $response"
        return 1
    fi
}

# =============================================================================
# 배포 검증 함수
# =============================================================================
verify_deployment() {
    local stack_id="$1"
    local endpoint_id="$2"

    log_info "배포 검증 시작..."

    # 스택 상태 확인
    local stack_info=$(portainer_api_call "GET" "stacks/$stack_id")
    local stack_status=$(echo "$stack_info" | jq -r '.Status // "unknown"')

    log_info "스택 상태: $stack_status"

    # 컨테이너 상태 확인
    sleep 10  # 컨테이너 시작 대기
    check_container_health "$endpoint_id"
}

check_container_health() {
    local endpoint_id="$1"

    log_info "컨테이너 상태 확인..."

    local containers=$(portainer_api_call "GET" "endpoints/$endpoint_id/docker/containers/json")
    local safework_containers=$(echo "$containers" | jq -r '.[] | select(.Names[0] | contains("safework")) | "\(.Names[0]): \(.State)"')

    if [ -n "$safework_containers" ]; then
        log_success "SafeWork 컨테이너 상태:"
        echo "$safework_containers" | while read -r line; do
            log_info "  $line"
        done
    else
        log_warn "SafeWork 컨테이너를 찾을 수 없음"
    fi
}

# =============================================================================
# 헬프 및 메인 함수
# =============================================================================
show_help() {
    cat << EOF
$SCRIPT_NAME v$SCRIPT_VERSION

사용법: $0 <ENVIRONMENT>

환경:
  production, prod    - 운영 환경 (synology endpoint)
  development, dev    - 개발 환경 (jclee-dev endpoint)
  local              - 로컬 개발 환경 (jclee-dev endpoint)

예시:
  $0 production      # 운영 환경 배포
  $0 development     # 개발 환경 배포
  $0 local           # 로컬 환경 배포

특징:
  - 스택 기반 배포 (없으면 생성, 있으면 업데이트)
  - 환경별 자동 endpoint 매핑
  - 변동사항 마이그레이션 및 중복제거
  - 자동 배포 검증 및 헬스체크
  - 서비스 URL 자동 설정

서비스 URL:
  - 운영: $PROD_URL
  - 개발: $DEV_URL

EOF
}

main() {
    # 헤더 출력
    echo -e "${BLUE}"
    echo "========================================"
    echo "$SCRIPT_NAME v$SCRIPT_VERSION"
    echo "========================================"
    echo -e "${NC}"

    # 파라미터 확인
    if [ $# -eq 0 ]; then
        show_help
        exit 1
    fi

    local environment="$1"

    # 로그 시작
    log_info "스크립트 시작 - 로그: $LOG_FILE"
    log_info "환경: $environment"

    # 전제 조건 확인
    if ! command -v curl &> /dev/null; then
        log_error "curl이 설치되지 않음"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        log_error "jq가 설치되지 않음"
        exit 1
    fi

    # 배포 실행
    deploy_or_update_stack "$environment"

    if [ $? -eq 0 ]; then
        log_success "배포 완료: $environment 환경"
        log_info "서비스 URL: $(get_service_url "$environment")"
    else
        log_error "배포 실패: $environment 환경"
        exit 1
    fi
}

# 스크립트 실행
main "$@"