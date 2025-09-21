#!/bin/bash
# SafeWork Portainer API 공통 라이브러리
# Common Portainer API Library for SafeWork Scripts

# 스크립트 디렉토리 및 로깅 라이브러리 로드
SCRIPT_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_LIB_DIR/logging.sh"

# Portainer 설정 로드
load_portainer_config() {
    local config_file="${1:-../config/portainer_config.env}"
    local config_path="$SCRIPT_LIB_DIR/$config_file"

    if [[ -f "$config_path" ]]; then
        source "$config_path"
        log_debug "Portainer configuration loaded from: $config_path"
    else
        log_error "Portainer configuration file not found: $config_path"
        return 1
    fi
}

# Portainer API 호출 공통 함수
portainer_api_call() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"
    local timeout="${4:-30}"

    local url="$PORTAINER_URL/api$endpoint"
    local curl_opts=(-s -X "$method" -H "X-API-Key: $PORTAINER_TOKEN" --max-time "$timeout")

    if [[ -n "$data" ]]; then
        curl_opts+=(-H "Content-Type: application/json" -d "$data")
    fi

    log_debug "Portainer API call: $method $url"

    local response
    response=$(curl "${curl_opts[@]}" "$url" 2>/dev/null)
    local exit_code=$?

    if [[ $exit_code -ne 0 ]]; then
        log_error "Portainer API call failed (curl exit code: $exit_code)"
        return 1
    fi

    echo "$response"
}

# 컨테이너 상태 확인
check_container_status() {
    local container_name="$1"
    local endpoint_id="${2:-$ENDPOINT_PRODUCTION}"

    log_debug "Checking container status: $container_name on endpoint $endpoint_id"

    local response
    response=$(portainer_api_call "GET" "/endpoints/$endpoint_id/docker/containers/json")

    if [[ -z "$response" ]]; then
        log_error "Failed to get container list"
        return 1
    fi

    local container_info
    container_info=$(echo "$response" | jq -r ".[] | select(.Names[] | contains(\"$container_name\"))")

    if [[ -z "$container_info" ]]; then
        log_warning "Container not found: $container_name"
        return 2
    fi

    local state
    state=$(echo "$container_info" | jq -r '.State')

    case "$state" in
        "running")
            log_success "Container $container_name is running"
            return 0
            ;;
        "exited")
            log_warning "Container $container_name is stopped"
            return 3
            ;;
        *)
            log_warning "Container $container_name state: $state"
            return 4
            ;;
    esac
}

# 컨테이너 재시작
restart_container() {
    local container_name="$1"
    local endpoint_id="${2:-$ENDPOINT_PRODUCTION}"

    log_info "Restarting container: $container_name"

    local response
    response=$(portainer_api_call "POST" "/endpoints/$endpoint_id/docker/containers/$container_name/restart")

    if [[ -z "$response" ]] || ! echo "$response" | grep -q '"message"'; then
        log_success "Container restart command sent: $container_name"

        # 재시작 확인을 위해 대기
        sleep 15

        if check_container_status "$container_name" "$endpoint_id"; then
            log_success "Container $container_name restarted successfully"
            return 0
        else
            log_error "Container $container_name failed to start after restart"
            return 1
        fi
    else
        log_error "Failed to restart container $container_name: $response"
        return 1
    fi
}

# 스택 상태 확인
check_stack_status() {
    local stack_name="$1"
    local endpoint_id="${2:-$ENDPOINT_PRODUCTION}"

    log_debug "Checking stack status: $stack_name on endpoint $endpoint_id"

    local response
    response=$(portainer_api_call "GET" "/stacks")

    if [[ -z "$response" ]]; then
        log_error "Failed to get stack list"
        return 1
    fi

    local stack_info
    stack_info=$(echo "$response" | jq -r ".[] | select(.Name == \"$stack_name\" and .EndpointId == $endpoint_id)")

    if [[ -z "$stack_info" ]]; then
        log_warning "Stack not found: $stack_name"
        return 2
    fi

    local status
    status=$(echo "$stack_info" | jq -r '.Status')

    case "$status" in
        1)
            log_success "Stack $stack_name is active"
            return 0
            ;;
        2)
            log_warning "Stack $stack_name is inactive"
            return 3
            ;;
        *)
            log_warning "Stack $stack_name status: $status"
            return 4
            ;;
    esac
}

# 스택 배포
deploy_stack() {
    local stack_name="$1"
    local compose_content="$2"
    local endpoint_id="${3:-$ENDPOINT_PRODUCTION}"

    log_info "Deploying stack: $stack_name"

    # 스택 존재 여부 확인
    if check_stack_status "$stack_name" "$endpoint_id" >/dev/null 2>&1; then
        log_info "Updating existing stack: $stack_name"
        update_stack "$stack_name" "$compose_content" "$endpoint_id"
    else
        log_info "Creating new stack: $stack_name"
        create_stack "$stack_name" "$compose_content" "$endpoint_id"
    fi
}

# 새 스택 생성
create_stack() {
    local stack_name="$1"
    local compose_content="$2"
    local endpoint_id="${3:-$ENDPOINT_PRODUCTION}"

    local payload
    payload=$(jq -n \
        --arg name "$stack_name" \
        --arg content "$compose_content" \
        --argjson endpoint "$endpoint_id" \
        '{
            Name: $name,
            StackFileContent: $content,
            EndpointId: $endpoint,
            Env: []
        }')

    local response
    response=$(portainer_api_call "POST" "/stacks" "$payload")

    if echo "$response" | jq -e '.Id' >/dev/null 2>&1; then
        local stack_id
        stack_id=$(echo "$response" | jq -r '.Id')
        log_success "Stack created successfully: $stack_name (ID: $stack_id)"
        return 0
    else
        log_error "Failed to create stack: $response"
        return 1
    fi
}

# 기존 스택 업데이트
update_stack() {
    local stack_name="$1"
    local compose_content="$2"
    local endpoint_id="${3:-$ENDPOINT_PRODUCTION}"

    # 스택 ID 찾기
    local stacks_response
    stacks_response=$(portainer_api_call "GET" "/stacks")

    local stack_id
    stack_id=$(echo "$stacks_response" | jq -r ".[] | select(.Name == \"$stack_name\" and .EndpointId == $endpoint_id) | .Id")

    if [[ -z "$stack_id" || "$stack_id" == "null" ]]; then
        log_error "Stack not found for update: $stack_name"
        return 1
    fi

    local payload
    payload=$(jq -n \
        --arg content "$compose_content" \
        '{
            StackFileContent: $content,
            Env: []
        }')

    local response
    response=$(portainer_api_call "PUT" "/stacks/$stack_id" "$payload")

    if [[ -z "$response" ]] || ! echo "$response" | grep -q '"message".*"error"'; then
        log_success "Stack updated successfully: $stack_name"
        return 0
    else
        log_error "Failed to update stack: $response"
        return 1
    fi
}

# Portainer 연결 테스트
test_portainer_connection() {
    log_info "Testing Portainer connection..."

    local response
    response=$(portainer_api_call "GET" "/status")

    if echo "$response" | jq -e '.Version' >/dev/null 2>&1; then
        local version
        version=$(echo "$response" | jq -r '.Version')
        log_success "Portainer connection successful (Version: $version)"
        return 0
    else
        log_error "Portainer connection failed: $response"
        return 1
    fi
}

# 사용 예시 함수
portainer_usage_example() {
    echo "SafeWork Portainer 라이브러리 사용법:"
    echo "source \"\$(dirname \"\${BASH_SOURCE[0]}\")/lib/portainer.sh\""
    echo ""
    echo "# 설정 로드"
    echo "load_portainer_config"
    echo ""
    echo "# 연결 테스트"
    echo "test_portainer_connection"
    echo ""
    echo "# 컨테이너 상태 확인"
    echo "check_container_status \"safework-app\""
    echo ""
    echo "# 컨테이너 재시작"
    echo "restart_container \"safework-app\""
    echo ""
    echo "# 스택 상태 확인"
    echo "check_stack_status \"safework-stack\""
}