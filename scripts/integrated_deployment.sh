#!/bin/bash

# SafeWork 통합 배포 스크립트 - 하드코딩 제거, 환경 기반 설정
# Integrated Deployment Script with Configuration Management

set -e

# 스크립트 디렉토리 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$PROJECT_ROOT/tools/config"

# 설정 파일 로드
if [[ -f "$CONFIG_DIR/deployment.env" ]]; then
    source "$CONFIG_DIR/deployment.env"
    echo "✅ Base configuration loaded from $CONFIG_DIR/deployment.env"
else
    echo "❌ Base configuration file not found: $CONFIG_DIR/deployment.env"
    exit 1
fi

# 환경별 설정 로드 (기본: production)
ENVIRONMENT=${ENVIRONMENT:-production}
ENV_CONFIG="$CONFIG_DIR/environments/${ENVIRONMENT}.env"
if [[ -f "$ENV_CONFIG" ]]; then
    source "$ENV_CONFIG"
    echo "✅ Environment configuration loaded: $ENVIRONMENT"
else
    echo "⚠️ Environment config not found, using base configuration only"
fi

# Python 설정 관리자 사용 (optional)
PYTHON_CONFIG_MANAGER="$PROJECT_ROOT/tools/scripts/config_manager.py"
if [[ -f "$PYTHON_CONFIG_MANAGER" ]]; then
    echo "🐍 Python configuration manager available"
fi

echo "🚀 SafeWork 통합 배포 시스템"
echo "==============================="
echo "📊 Environment: $ENVIRONMENT"
echo "🌐 Production URL: $PRODUCTION_URL"
echo "🐳 Registry: $REGISTRY_HOST"
echo "📡 Portainer: $PORTAINER_URL"
echo "==============================="

# 유틸리티 함수들
log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

log_success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ SUCCESS: $1"
}

# 필수 환경변수 검증
validate_configuration() {
    log_info "Configuration validation..."

    local required_vars=(
        "PORTAINER_URL"
        "PORTAINER_API_KEY"
        "PORTAINER_ENDPOINT_ID"
        "PRODUCTION_URL"
        "POSTGRES_IMAGE"
        "APP_IMAGE"
        "REDIS_IMAGE"
        "NETWORK_NAME"
    )

    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done

    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required configuration variables:"
        printf '  - %s\n' "${missing_vars[@]}"
        return 1
    fi

    log_success "Configuration validation passed"
    return 0
}

# 컨테이너 상태 확인
check_container_status() {
    local container_name=$1
    curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
         "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/json?all=true" | \
         jq -r ".[] | select(.Names[] | contains(\"$container_name\")) | \"\(.Names[0]) - \(.State) - \(.Status)\""
}

# 컨테이너 헬스체크 대기
wait_for_container_health() {
    local container_name=$1
    local timeout=${2:-60}
    local count=0

    log_info "Waiting for $container_name to become healthy (timeout: ${timeout}s)..."

    while [ $count -lt $timeout ]; do
        local status=$(check_container_status "$container_name" | awk '{print $3}')
        if [[ "$status" == "healthy" ]] || [[ "$status" == "running" ]]; then
            log_success "$container_name is $status"
            return 0
        fi
        sleep 2
        count=$((count + 2))
    done

    log_error "$container_name failed to start within ${timeout}s"
    return 1
}

# 컨테이너 생성 함수
create_container() {
    local container_name=$1
    local image=$2
    local environment_json=$3
    local port_bindings_json=${4:-"{}"}

    log_info "Creating container: $container_name"

    local create_payload=$(cat <<EOF
{
  "Image": "$image",
  "Env": $environment_json,
  "ExposedPorts": {},
  "HostConfig": {
    "PortBindings": $port_bindings_json,
    "RestartPolicy": {
      "Name": "$CONTAINER_RESTART_POLICY"
    },
    "NetworkMode": "$NETWORK_NAME"
  },
  "NetworkingConfig": {
    "EndpointsConfig": {
      "$NETWORK_NAME": {}
    }
  }
}
EOF
)

    local response=$(curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
         -H "Content-Type: application/json" \
         "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/create?name=$container_name" \
         -d "$create_payload")

    if echo "$response" | grep -q '"Id"'; then
        log_success "Container $container_name created successfully"
        return 0
    else
        log_error "Failed to create container $container_name: $response"
        return 1
    fi
}

# 컨테이너 시작 함수
start_container() {
    local container_name=$1

    log_info "Starting container: $container_name"

    local response=$(curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
         "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/$container_name/restart")

    # API v1.24 호환성 처리
    if echo "$response" | grep -q '"message".*"deprecated"' || [[ -z "$response" ]]; then
        log_info "Container $container_name start command sent (API v1.24 compatible)"
        return 0
    else
        log_error "Container start failed: $response"
        return 1
    fi
}

# 컨테이너 제거 함수
remove_container() {
    local container_name=$1

    log_info "Removing container: $container_name"
    curl -s -X DELETE -H "X-API-Key: $PORTAINER_API_KEY" \
         "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/$container_name?force=true" > /dev/null 2>&1 || true
}

# PostgreSQL 배포
deploy_postgresql() {
    log_info "Deploying PostgreSQL..."

    remove_container "$POSTGRES_CONTAINER"

    local postgres_env='[
        "TZ='$TZ'",
        "POSTGRES_PASSWORD='$DB_PASSWORD'",
        "POSTGRES_DB='$DB_NAME'",
        "POSTGRES_USER='$DB_USER'"
    ]'

    if create_container "$POSTGRES_CONTAINER" "$POSTGRES_IMAGE" "$postgres_env"; then
        start_container "$POSTGRES_CONTAINER"
        wait_for_container_health "$POSTGRES_CONTAINER" "${DB_READY_TIMEOUT:-30}"
    else
        return 1
    fi
}

# Redis 배포
deploy_redis() {
    log_info "Deploying Redis..."

    remove_container "$REDIS_CONTAINER"

    local redis_env='[
        "TZ='$TZ'"
    ]'

    if create_container "$REDIS_CONTAINER" "$REDIS_IMAGE" "$redis_env"; then
        start_container "$REDIS_CONTAINER"
        wait_for_container_health "$REDIS_CONTAINER" "${HEALTH_CHECK_TIMEOUT:-60}"
    else
        return 1
    fi
}

# 애플리케이션 배포
deploy_application() {
    log_info "Deploying Application..."

    remove_container "$APP_CONTAINER"

    local app_env='[
        "TZ='$TZ'",
        "DB_HOST='$DB_HOST'",
        "DB_NAME='$DB_NAME'",
        "DB_USER='$DB_USER'",
        "DB_PASSWORD='$DB_PASSWORD'",
        "REDIS_HOST='$REDIS_HOST'",
        "FLASK_CONFIG='$FLASK_CONFIG'",
        "SECRET_KEY='$SECRET_KEY'",
        "WTF_CSRF_ENABLED='$WTF_CSRF_ENABLED'"
    ]'

    local app_ports='{"'$APP_PORT'/tcp": [{"HostPort": "'$APP_PORT'"}]}'

    if create_container "$APP_CONTAINER" "$APP_IMAGE" "$app_env" "$app_ports"; then
        start_container "$APP_CONTAINER"
        wait_for_container_health "$APP_CONTAINER" "${HEALTH_CHECK_TIMEOUT:-60}"
    else
        return 1
    fi
}

# API 엔드포인트 테스트
test_api_endpoints() {
    log_info "Testing API endpoints..."

    # Health endpoint test
    local health_response=$(curl -s -w "%{http_code}" "$PRODUCTION_URL/health" -o /tmp/health_response.json)
    local health_code=$(echo "$health_response" | tail -c 4)

    if [ "$health_code" = "200" ]; then
        log_success "Health endpoint test passed"
        log_info "Health response: $(cat /tmp/health_response.json)"
    else
        log_error "Health endpoint test failed (HTTP $health_code)"
        return 1
    fi

    # Survey API test
    local survey_response=$(curl -s -w "%{http_code}" -X POST "$PRODUCTION_URL/survey/api/submit" \
                           -H "Content-Type: application/json" \
                           -d '{"form_type":"001","name":"배포테스트","age":30}' \
                           -o /tmp/survey_response.json)
    local survey_code=$(echo "$survey_response" | tail -c 4)

    if [ "$survey_code" = "200" ] || [ "$survey_code" = "201" ]; then
        log_success "Survey API test passed"
    else
        log_error "Survey API test failed (HTTP $survey_code)"
        return 1
    fi

    return 0
}

# 시스템 상태 보고
system_status_report() {
    log_info "System Status Report"
    echo "===================="

    curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
         "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/json" | \
         jq -r '.[] | select(.Names[] | contains("safework")) | "\(.Names[0]) - \(.State) - \(.Status)"' | \
         while read line; do
             echo "🐳 $line"
         done

    echo "===================="
    echo "🌐 Production URL: $PRODUCTION_URL"
    echo "📊 Environment: $ENVIRONMENT"
    echo "✅ Deployment completed successfully!"
}

# 메인 배포 프로세스
main() {
    local operation=${1:-"deploy"}

    case $operation in
        "validate")
            validate_configuration
            ;;
        "status")
            system_status_report
            ;;
        "test")
            test_api_endpoints
            ;;
        "deploy")
            log_info "Starting SafeWork integrated deployment..."

            validate_configuration || exit 1

            # 배포 순서: PostgreSQL -> Redis -> Application
            deploy_postgresql || exit 1
            deploy_redis || exit 1

            # 데이터베이스 안정화 대기
            sleep 10

            deploy_application || exit 1

            # 시스템 안정화 대기
            sleep 5

            # API 테스트
            test_api_endpoints || exit 1

            # 최종 상태 보고
            system_status_report
            ;;
        *)
            echo "Usage: $0 [deploy|validate|status|test]"
            echo "  deploy   - Complete deployment (default)"
            echo "  validate - Validate configuration"
            echo "  status   - Show system status"
            echo "  test     - Test API endpoints"
            exit 1
            ;;
    esac
}

# 스크립트 실행
main "$@"