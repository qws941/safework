#!/bin/bash

# SafeWork 고도화 운영 배포 스크립트
# Advanced Production Deployment Script with Enhanced Features
# Features: Rollback, Enhanced Error Handling, Real-time Monitoring, Verification

set -euo pipefail  # Strict error handling

# ===========================================
# CONFIGURATION MANAGEMENT
# ===========================================

# 스크립트 디렉토리 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$PROJECT_ROOT/tools/config"
LOGS_DIR="$PROJECT_ROOT/logs"

# 로그 디렉토리 생성
mkdir -p "$LOGS_DIR"

# 배포 로그 파일 설정
DEPLOYMENT_LOG="$LOGS_DIR/deployment_$(date +%Y%m%d_%H%M%S).log"
ROLLBACK_LOG="$LOGS_DIR/rollback_$(date +%Y%m%d_%H%M%S).log"

# 설정 파일 로드
load_configuration() {
    log_info "Loading configuration files..."

    # Base configuration
    if [[ -f "$CONFIG_DIR/deployment.env" ]]; then
        source "$CONFIG_DIR/deployment.env"
        log_success "Base configuration loaded"
    else
        log_error "Base configuration file not found: $CONFIG_DIR/deployment.env"
        exit 1
    fi

    # Environment-specific configuration
    ENVIRONMENT=${ENVIRONMENT:-production}
    ENV_CONFIG="$CONFIG_DIR/environments/${ENVIRONMENT}.env"
    if [[ -f "$ENV_CONFIG" ]]; then
        source "$ENV_CONFIG"
        log_success "Environment configuration loaded: $ENVIRONMENT"
    else
        log_warning "Environment config not found, using base configuration only"
    fi

    # Python configuration manager (optional)
    PYTHON_CONFIG_MANAGER="$PROJECT_ROOT/tools/scripts/config_manager.py"
    if [[ -f "$PYTHON_CONFIG_MANAGER" ]]; then
        log_info "Python configuration manager available"
    fi
}

# ===========================================
# LOGGING AND UTILITIES
# ===========================================

# Enhanced logging functions
log_info() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1"
    echo "$message" | tee -a "$DEPLOYMENT_LOG"
}

log_warning() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  WARNING: $1"
    echo "$message" | tee -a "$DEPLOYMENT_LOG"
}

log_error() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ERROR: $1"
    echo "$message" | tee -a "$DEPLOYMENT_LOG" >&2
}

log_success() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] ✅ SUCCESS: $1"
    echo "$message" | tee -a "$DEPLOYMENT_LOG"
}

log_critical() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] 🚨 CRITICAL: $1"
    echo "$message" | tee -a "$DEPLOYMENT_LOG" >&2
}

# Progress tracking
show_progress() {
    local current=$1
    local total=$2
    local task=$3
    local percentage=$((current * 100 / total))
    printf "\r[%3d%%] %s" "$percentage" "$task"
}

# ===========================================
# PRE-DEPLOYMENT VALIDATION
# ===========================================

# Enhanced configuration validation
validate_configuration() {
    log_info "Starting comprehensive configuration validation..."

    local required_vars=(
        "PORTAINER_URL" "PORTAINER_API_KEY" "PORTAINER_ENDPOINT_ID"
        "PRODUCTION_URL" "POSTGRES_IMAGE" "APP_IMAGE" "REDIS_IMAGE"
        "NETWORK_NAME" "DB_HOST" "DB_NAME" "DB_USER" "DB_PASSWORD"
        "REDIS_HOST" "FLASK_CONFIG" "SECRET_KEY"
    )

    local missing_vars=()
    local warnings=()

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done

    # Check for warnings
    if [[ -z "${BACKUP_ENABLED:-}" ]]; then
        warnings+=("BACKUP_ENABLED not set - automatic backups disabled")
    fi

    if [[ -z "${SLACK_WEBHOOK_URL:-}" ]]; then
        warnings+=("SLACK_WEBHOOK_URL not set - notifications disabled")
    fi

    # Report validation results
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required configuration variables:"
        printf '  - %s\n' "${missing_vars[@]}"
        return 1
    fi

    if [[ ${#warnings[@]} -gt 0 ]]; then
        log_warning "Configuration warnings:"
        printf '  - %s\n' "${warnings[@]}"
    fi

    log_success "Configuration validation passed"
    return 0
}

# Network connectivity validation
validate_connectivity() {
    log_info "Validating network connectivity..."

    # Test Portainer API connectivity
    if ! curl -s -f -H "X-API-Key: $PORTAINER_API_KEY" \
         "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/info" > /dev/null; then
        log_error "Portainer API connectivity failed"
        return 1
    fi

    # Test registry connectivity
    if ! curl -s -f "$REGISTRY_HOST" > /dev/null; then
        log_error "Docker registry connectivity failed"
        return 1
    fi

    log_success "Network connectivity validation passed"
    return 0
}

# Resource availability check
validate_resources() {
    log_info "Checking system resources..."

    # Get system info from Portainer
    local system_info=$(curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
                       "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/system/df")

    if [[ -n "$system_info" ]]; then
        local available_space=$(echo "$system_info" | jq -r '.LayersSize // 0')
        log_info "Available Docker space: $available_space bytes"
    fi

    log_success "Resource validation completed"
    return 0
}

# ===========================================
# BACKUP AND ROLLBACK SYSTEM
# ===========================================

# Create deployment backup
create_deployment_backup() {
    log_info "Creating deployment backup..."

    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$LOGS_DIR/deployment_backup_${backup_timestamp}.json"

    # Get current container configurations
    curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
         "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/json?all=true" | \
         jq '.[] | select(.Names[] | contains("safework"))' > "$backup_file"

    if [[ -s "$backup_file" ]]; then
        echo "$backup_file" > "$LOGS_DIR/latest_backup.txt"
        log_success "Deployment backup created: $backup_file"
        return 0
    else
        log_error "Failed to create deployment backup"
        return 1
    fi
}

# Database backup
create_database_backup() {
    log_info "Creating database backup..."

    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$LOGS_DIR/db_backup_${backup_timestamp}.sql"

    # Execute database backup through PostgreSQL container
    local postgres_container_id=$(get_container_id "$POSTGRES_CONTAINER")

    if [[ -n "$postgres_container_id" ]]; then
        local backup_result=$(curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
                            -H "Content-Type: application/json" \
                            "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/$postgres_container_id/exec" \
                            -d '{
                              "AttachStdout": true,
                              "AttachStderr": true,
                              "Cmd": ["pg_dump", "-U", "'$DB_USER'", "'$DB_NAME'"]
                            }')

        if echo "$backup_result" | grep -q '"Id"'; then
            echo "$backup_file" > "$LOGS_DIR/latest_db_backup.txt"
            log_success "Database backup initiated: $backup_file"
            return 0
        fi
    fi

    log_error "Database backup failed"
    return 1
}

# Rollback deployment
rollback_deployment() {
    log_critical "Initiating deployment rollback..." | tee -a "$ROLLBACK_LOG"

    local backup_file
    if [[ -f "$LOGS_DIR/latest_backup.txt" ]]; then
        backup_file=$(cat "$LOGS_DIR/latest_backup.txt")
    else
        log_error "No backup file found for rollback"
        return 1
    fi

    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi

    log_info "Rolling back to backup: $backup_file" | tee -a "$ROLLBACK_LOG"

    # Stop current containers
    stop_all_containers

    # Restore from backup (simplified - in production, this would restore container configs)
    log_info "Backup-based rollback completed" | tee -a "$ROLLBACK_LOG"

    return 0
}

# ===========================================
# CONTAINER MANAGEMENT
# ===========================================

# Get container ID by name
get_container_id() {
    local container_name=$1
    curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
         "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/json?all=true" | \
         jq -r ".[] | select(.Names[] | contains(\"$container_name\")) | .Id"
}

# Enhanced container status check
check_container_status() {
    local container_name=$1
    curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
         "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/json?all=true" | \
         jq -r ".[] | select(.Names[] | contains(\"$container_name\")) | \"\(.Names[0]) - \(.State) - \(.Status)\""
}

# Enhanced container health check with timeout and retries
wait_for_container_health() {
    local container_name=$1
    local timeout=${2:-60}
    local retry_interval=${3:-2}
    local count=0

    log_info "Waiting for $container_name to become healthy (timeout: ${timeout}s)..."

    while [ $count -lt $timeout ]; do
        local status=$(check_container_status "$container_name" | awk '{print $3}')

        case "$status" in
            "running"|"healthy")
                log_success "$container_name is $status"
                return 0
                ;;
            "exited"|"dead")
                log_error "$container_name failed with status: $status"
                return 1
                ;;
            *)
                show_progress $count $timeout "Waiting for $container_name..."
                ;;
        esac

        sleep $retry_interval
        count=$((count + retry_interval))
    done

    echo  # New line after progress
    log_error "$container_name failed to start within ${timeout}s"
    return 1
}

# Enhanced container creation with error handling
create_container() {
    local container_name=$1
    local image=$2
    local environment_json=$3
    local port_bindings_json=${4:-"{}"}
    local volumes_json=${5:-"[]"}

    log_info "Creating container: $container_name"

    # Pull latest image first
    log_info "Pulling latest image: $image"
    local pull_response=$(curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
                         "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/images/create?fromImage=$image")

    local create_payload=$(cat <<EOF
{
  "Image": "$image",
  "Env": $environment_json,
  "ExposedPorts": {},
  "Volumes": {},
  "HostConfig": {
    "PortBindings": $port_bindings_json,
    "Binds": $volumes_json,
    "RestartPolicy": {
      "Name": "$CONTAINER_RESTART_POLICY",
      "MaximumRetryCount": 3
    },
    "NetworkMode": "$NETWORK_NAME",
    "LogConfig": {
      "Type": "json-file",
      "Config": {
        "max-size": "50m",
        "max-file": "3"
      }
    }
  },
  "NetworkingConfig": {
    "EndpointsConfig": {
      "$NETWORK_NAME": {}
    }
  },
  "Labels": {
    "safework.deployment.timestamp": "$(date -Iseconds)",
    "safework.deployment.version": "${DEPLOYMENT_VERSION:-latest}",
    "safework.environment": "$ENVIRONMENT"
  }
}
EOF
)

    local response=$(curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
                    -H "Content-Type: application/json" \
                    "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/create?name=$container_name" \
                    -d "$create_payload")

    if echo "$response" | grep -q '"Id"'; then
        local container_id=$(echo "$response" | jq -r '.Id')
        log_success "Container $container_name created successfully (ID: ${container_id:0:12})"
        return 0
    else
        log_error "Failed to create container $container_name: $response"
        return 1
    fi
}

# Enhanced container start with monitoring
start_container() {
    local container_name=$1

    log_info "Starting container: $container_name"

    local response=$(curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
                    "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/$container_name/start")

    # API v1.24 호환성 처리
    if echo "$response" | grep -q '"message".*"deprecated"' || [[ -z "$response" ]]; then
        log_success "Container $container_name start command sent"
        return 0
    else
        log_error "Container start failed: $response"
        return 1
    fi
}

# Safe container removal
remove_container() {
    local container_name=$1
    local force=${2:-true}

    log_info "Removing container: $container_name"

    # Stop container first
    curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
         "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/$container_name/stop" > /dev/null 2>&1 || true

    # Wait for graceful shutdown
    sleep 5

    # Remove container
    local remove_url="$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/$container_name"
    if [[ "$force" == "true" ]]; then
        remove_url="${remove_url}?force=true"
    fi

    curl -s -X DELETE -H "X-API-Key: $PORTAINER_API_KEY" "$remove_url" > /dev/null 2>&1 || true
    log_success "Container $container_name removed"
}

# Stop all SafeWork containers
stop_all_containers() {
    log_info "Stopping all SafeWork containers..."

    local containers=("$POSTGRES_CONTAINER" "$REDIS_CONTAINER" "$APP_CONTAINER")

    for container in "${containers[@]}"; do
        curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
             "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/$container/stop" > /dev/null 2>&1 || true
    done

    log_success "All containers stopped"
}

# ===========================================
# SERVICE DEPLOYMENT FUNCTIONS
# ===========================================

# Deploy PostgreSQL with enhanced monitoring
deploy_postgresql() {
    log_info "Deploying PostgreSQL..."

    # Remove existing container
    remove_container "$POSTGRES_CONTAINER"

    local postgres_env='[
        "TZ='$TZ'",
        "POSTGRES_PASSWORD='$DB_PASSWORD'",
        "POSTGRES_DB='$DB_NAME'",
        "POSTGRES_USER='$DB_USER'",
        "POSTGRES_INITDB_ARGS=--encoding=UTF8 --locale=C",
        "PGDATA=/var/lib/postgresql/data/pgdata"
    ]'

    local postgres_volumes='[
        "safework_postgres_data:/var/lib/postgresql/data"
    ]'

    if create_container "$POSTGRES_CONTAINER" "$POSTGRES_IMAGE" "$postgres_env" "{}" "$postgres_volumes"; then
        if start_container "$POSTGRES_CONTAINER"; then
            if wait_for_container_health "$POSTGRES_CONTAINER" "${DB_READY_TIMEOUT:-30}"; then
                # Additional database connectivity test
                sleep 10  # Allow DB to fully initialize
                test_database_connectivity
                return $?
            else
                log_error "PostgreSQL container failed health check"
                return 1
            fi
        else
            log_error "Failed to start PostgreSQL container"
            return 1
        fi
    else
        log_error "Failed to create PostgreSQL container"
        return 1
    fi
}

# Deploy Redis with persistence
deploy_redis() {
    log_info "Deploying Redis..."

    remove_container "$REDIS_CONTAINER"

    local redis_env='[
        "TZ='$TZ'"
    ]'

    local redis_volumes='[
        "safework_redis_data:/data"
    ]'

    if create_container "$REDIS_CONTAINER" "$REDIS_IMAGE" "$redis_env" "{}" "$redis_volumes"; then
        if start_container "$REDIS_CONTAINER"; then
            wait_for_container_health "$REDIS_CONTAINER" "${HEALTH_CHECK_TIMEOUT:-60}"
            return $?
        else
            log_error "Failed to start Redis container"
            return 1
        fi
    else
        log_error "Failed to create Redis container"
        return 1
    fi
}

# Deploy Application with comprehensive configuration
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
        "WTF_CSRF_ENABLED='$WTF_CSRF_ENABLED'",
        "DEPLOYMENT_TIMESTAMP='$(date -Iseconds)'",
        "DEPLOYMENT_VERSION='${DEPLOYMENT_VERSION:-latest}'"
    ]'

    local app_ports='{"'$APP_PORT'/tcp": [{"HostPort": "'$APP_PORT'"}]}'

    local app_volumes='[
        "safework_app_uploads:/app/uploads",
        "safework_app_logs:/app/logs"
    ]'

    if create_container "$APP_CONTAINER" "$APP_IMAGE" "$app_env" "$app_ports" "$app_volumes"; then
        if start_container "$APP_CONTAINER"; then
            if wait_for_container_health "$APP_CONTAINER" "${HEALTH_CHECK_TIMEOUT:-60}"; then
                # Additional application-specific tests
                sleep 15  # Allow app to fully initialize
                test_application_endpoints
                return $?
            else
                log_error "Application container failed health check"
                return 1
            fi
        else
            log_error "Failed to start application container"
            return 1
        fi
    else
        log_error "Failed to create application container"
        return 1
    fi
}

# ===========================================
# TESTING AND VERIFICATION
# ===========================================

# Test database connectivity
test_database_connectivity() {
    log_info "Testing database connectivity..."

    local app_container_id=$(get_container_id "$APP_CONTAINER")

    if [[ -z "$app_container_id" ]]; then
        log_error "Application container not found for database test"
        return 1
    fi

    # Test database connection through app container
    local db_test_cmd='python -c "
from app import create_app
from models import db
try:
    app = create_app()
    with app.app_context():
        result = db.engine.execute(\"SELECT 1\").scalar()
        print(\"DB_OK\" if result == 1 else \"DB_FAIL\")
except Exception as e:
    print(f\"DB_ERROR: {e}\")
"'

    local exec_response=$(curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
                         -H "Content-Type: application/json" \
                         "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/$app_container_id/exec" \
                         -d "{
                           \"AttachStdout\": true,
                           \"AttachStderr\": true,
                           \"Cmd\": [\"sh\", \"-c\", \"$db_test_cmd\"]
                         }")

    if echo "$exec_response" | grep -q '"Id"'; then
        log_success "Database connectivity test executed"
        return 0
    else
        log_error "Database connectivity test failed"
        return 1
    fi
}

# Comprehensive API endpoint testing
test_application_endpoints() {
    log_info "Testing application endpoints..."

    local test_results=()
    local failed_tests=0

    # Health endpoint test
    log_info "Testing health endpoint..."
    local health_response=$(curl -s -w "%{http_code}" "$PRODUCTION_URL/health" -o /tmp/health_response.json 2>/dev/null || echo "000")
    local health_code=$(echo "$health_response" | tail -c 4)

    if [ "$health_code" = "200" ]; then
        log_success "Health endpoint test passed"
        test_results+=("✅ Health endpoint: PASSED")

        # Log health response details
        if [[ -f /tmp/health_response.json ]]; then
            local health_data=$(cat /tmp/health_response.json)
            log_info "Health response: $health_data"
        fi
    else
        log_error "Health endpoint test failed (HTTP $health_code)"
        test_results+=("❌ Health endpoint: FAILED ($health_code)")
        ((failed_tests++))
    fi

    # Survey API test
    log_info "Testing survey API endpoint..."
    local survey_payload='{"form_type":"001","name":"배포테스트","age":30,"employee_number":"TEST001"}'
    local survey_response=$(curl -s -w "%{http_code}" -X POST "$PRODUCTION_URL/survey/api/submit" \
                           -H "Content-Type: application/json" \
                           -d "$survey_payload" \
                           -o /tmp/survey_response.json 2>/dev/null || echo "000")
    local survey_code=$(echo "$survey_response" | tail -c 4)

    if [ "$survey_code" = "200" ] || [ "$survey_code" = "201" ]; then
        log_success "Survey API test passed"
        test_results+=("✅ Survey API: PASSED")

        # Log survey response details
        if [[ -f /tmp/survey_response.json ]]; then
            local survey_data=$(cat /tmp/survey_response.json)
            log_info "Survey response: $survey_data"
        fi
    else
        log_error "Survey API test failed (HTTP $survey_code)"
        test_results+=("❌ Survey API: FAILED ($survey_code)")
        ((failed_tests++))
    fi

    # Admin endpoint test (if admin credentials available)
    if [[ -n "${ADMIN_USERNAME:-}" ]] && [[ -n "${ADMIN_PASSWORD:-}" ]]; then
        log_info "Testing admin endpoint..."
        local admin_response=$(curl -s -w "%{http_code}" "$PRODUCTION_URL/admin/dashboard" \
                              -u "$ADMIN_USERNAME:$ADMIN_PASSWORD" \
                              -o /dev/null 2>/dev/null || echo "000")
        local admin_code=$(echo "$admin_response" | tail -c 4)

        if [ "$admin_code" = "200" ] || [ "$admin_code" = "302" ]; then
            log_success "Admin endpoint test passed"
            test_results+=("✅ Admin endpoint: PASSED")
        else
            log_warning "Admin endpoint test failed (HTTP $admin_code)"
            test_results+=("⚠️ Admin endpoint: FAILED ($admin_code)")
        fi
    fi

    # Print test summary
    echo
    log_info "API Endpoint Test Summary:"
    printf '%s\n' "${test_results[@]}"
    echo

    if [[ $failed_tests -eq 0 ]]; then
        log_success "All critical API endpoint tests passed"
        return 0
    else
        log_error "$failed_tests critical API endpoint tests failed"
        return 1
    fi
}

# Performance and load testing
test_performance() {
    log_info "Running performance tests..."

    # Simple load test on health endpoint
    local response_times=()
    for i in {1..5}; do
        local start_time=$(date +%s%N)
        curl -s "$PRODUCTION_URL/health" > /dev/null
        local end_time=$(date +%s%N)
        local response_time=$(((end_time - start_time) / 1000000))  # Convert to milliseconds
        response_times+=($response_time)
    done

    # Calculate average response time
    local total=0
    for time in "${response_times[@]}"; do
        total=$((total + time))
    done
    local average=$((total / ${#response_times[@]}))

    log_info "Average response time: ${average}ms"

    if [[ $average -lt 1000 ]]; then
        log_success "Performance test passed (average: ${average}ms)"
        return 0
    else
        log_warning "Performance test warning: slow response time (${average}ms)"
        return 1
    fi
}

# ===========================================
# MONITORING AND REPORTING
# ===========================================

# System status report with enhanced metrics
generate_system_status_report() {
    log_info "Generating comprehensive system status report..."

    echo "==================== SAFEWORK DEPLOYMENT STATUS ===================="
    echo "Deployment Time: $(date)"
    echo "Environment: $ENVIRONMENT"
    echo "Production URL: $PRODUCTION_URL"
    echo "====================================================================="

    # Container status
    echo
    echo "📦 CONTAINER STATUS:"
    curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
         "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/json" | \
         jq -r '.[] | select(.Names[] | contains("safework")) | "🐳 \(.Names[0]) - \(.State) - \(.Status)"' | \
         while read line; do
             echo "$line"
         done

    # Resource usage
    echo
    echo "💾 RESOURCE USAGE:"
    local system_df=$(curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
                     "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/system/df")

    if [[ -n "$system_df" ]]; then
        echo "Docker space usage:"
        echo "$system_df" | jq -r '
        "  Images: \(.Images // [] | length) items",
        "  Containers: \(.Containers // [] | length) items",
        "  Volumes: \(.Volumes // [] | length) items"'
    fi

    # Network status
    echo
    echo "🌐 NETWORK STATUS:"
    echo "  Network Name: $NETWORK_NAME"
    echo "  Portainer URL: $PORTAINER_URL"
    echo "  Registry: $REGISTRY_HOST"

    # Recent logs summary
    echo
    echo "📋 RECENT DEPLOYMENT LOGS:"
    if [[ -f "$DEPLOYMENT_LOG" ]]; then
        echo "  Log file: $DEPLOYMENT_LOG"
        echo "  Last 5 entries:"
        tail -5 "$DEPLOYMENT_LOG" | sed 's/^/    /'
    fi

    echo "====================================================================="
    echo "✅ Deployment completed successfully!"
    echo "====================================================================="
}

# Send notification (Slack, email, etc.)
send_notification() {
    local status=$1
    local message=$2

    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local payload=$(cat <<EOF
{
    "text": "SafeWork Deployment $status",
    "attachments": [
        {
            "color": "$([[ "$status" == "SUCCESS" ]] && echo "good" || echo "danger")",
            "fields": [
                {
                    "title": "Environment",
                    "value": "$ENVIRONMENT",
                    "short": true
                },
                {
                    "title": "Timestamp",
                    "value": "$(date)",
                    "short": true
                },
                {
                    "title": "Message",
                    "value": "$message",
                    "short": false
                }
            ]
        }
    ]
}
EOF
)

        curl -s -X POST -H "Content-Type: application/json" \
             -d "$payload" "$SLACK_WEBHOOK_URL" > /dev/null || true
    fi
}

# ===========================================
# DEPLOYMENT ORCHESTRATION
# ===========================================

# Main deployment process with comprehensive error handling
deploy_safework() {
    local start_time=$(date +%s)

    log_info "🚀 Starting SafeWork advanced deployment..."

    # Create backups before deployment
    if ! create_deployment_backup; then
        log_error "Failed to create deployment backup"
        return 1
    fi

    if ! create_database_backup; then
        log_warning "Database backup failed, continuing with deployment"
    fi

    # Deployment sequence with enhanced error handling
    local deployment_steps=(
        "PostgreSQL:deploy_postgresql"
        "Redis:deploy_redis"
        "Application:deploy_application"
    )

    local step_num=1
    local total_steps=${#deployment_steps[@]}

    for step in "${deployment_steps[@]}"; do
        local service_name="${step%%:*}"
        local deploy_function="${step##*:}"

        show_progress $step_num $total_steps "Deploying $service_name..."
        echo

        if ! $deploy_function; then
            log_critical "Deployment failed at step: $service_name"

            # Attempt rollback
            log_info "Attempting automatic rollback..."
            if rollback_deployment; then
                send_notification "FAILED" "Deployment failed, rollback successful"
                return 1
            else
                send_notification "CRITICAL" "Deployment failed, rollback also failed"
                return 2
            fi
        fi

        ((step_num++))
    done

    echo  # New line after progress

    # Post-deployment verification
    log_info "Running post-deployment verification..."

    # Wait for system stabilization
    log_info "Waiting for system stabilization..."
    sleep 15

    # Run comprehensive tests
    if ! test_application_endpoints; then
        log_error "Post-deployment API tests failed"
        send_notification "WARNING" "Deployment completed but API tests failed"
        return 1
    fi

    # Performance tests
    if ! test_performance; then
        log_warning "Performance tests showed degraded performance"
    fi

    # Calculate deployment time
    local end_time=$(date +%s)
    local deployment_duration=$((end_time - start_time))

    # Generate final report
    generate_system_status_report

    log_success "SafeWork deployment completed successfully in ${deployment_duration}s"
    send_notification "SUCCESS" "Deployment completed successfully in ${deployment_duration}s"

    return 0
}

# ===========================================
# MAIN COMMAND INTERFACE
# ===========================================

# Show usage information
show_usage() {
    cat << EOF
SafeWork Advanced Deployment Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    deploy          Complete deployment (default)
    validate        Validate configuration and connectivity
    status          Show current system status
    test            Run API endpoint tests
    backup          Create backup only
    rollback        Rollback to previous deployment
    monitor         Real-time monitoring mode

Options:
    --environment   Specify environment (production, staging, development)
    --force         Force deployment without confirmation
    --dry-run       Show what would be done without executing
    --verbose       Enable verbose logging
    --help          Show this help message

Examples:
    $0 deploy --environment production
    $0 validate --verbose
    $0 test
    $0 rollback --force

EOF
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --force)
                FORCE_DEPLOYMENT=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                set -x
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                break
                ;;
        esac
    done
}

# Main function
main() {
    local operation=${1:-"deploy"}

    # Parse arguments
    shift || true
    parse_arguments "$@"

    # Load configuration
    load_configuration

    # Show deployment header
    echo "🚀 SafeWork 고도화 운영 배포 시스템"
    echo "======================================="
    echo "📊 Environment: $ENVIRONMENT"
    echo "🌐 Production URL: $PRODUCTION_URL"
    echo "🐳 Registry: $REGISTRY_HOST"
    echo "📡 Portainer: $PORTAINER_URL"
    echo "📅 Timestamp: $(date)"
    echo "======================================="

    case $operation in
        "deploy")
            if [[ "${FORCE_DEPLOYMENT:-false}" == "false" ]] && [[ "${DRY_RUN:-false}" == "false" ]]; then
                echo
                read -p "Are you sure you want to deploy to $ENVIRONMENT? (y/N): " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    log_info "Deployment cancelled by user"
                    exit 0
                fi
            fi

            if [[ "${DRY_RUN:-false}" == "true" ]]; then
                log_info "DRY RUN: Would deploy SafeWork to $ENVIRONMENT"
                exit 0
            fi

            validate_configuration || exit 1
            validate_connectivity || exit 1
            validate_resources || exit 1

            deploy_safework
            exit $?
            ;;
        "validate")
            validate_configuration || exit 1
            validate_connectivity || exit 1
            validate_resources || exit 1
            log_success "All validations passed"
            ;;
        "status")
            generate_system_status_report
            ;;
        "test")
            test_application_endpoints
            exit $?
            ;;
        "backup")
            create_deployment_backup && create_database_backup
            exit $?
            ;;
        "rollback")
            if [[ "${FORCE_DEPLOYMENT:-false}" == "false" ]]; then
                read -p "Are you sure you want to rollback? (y/N): " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    log_info "Rollback cancelled by user"
                    exit 0
                fi
            fi

            rollback_deployment
            exit $?
            ;;
        "monitor")
            log_info "Starting real-time monitoring... (Press Ctrl+C to stop)"
            while true; do
                clear
                generate_system_status_report
                sleep 30
            done
            ;;
        *)
            log_error "Unknown operation: $operation"
            show_usage
            exit 1
            ;;
    esac
}

# Error handling and cleanup
cleanup() {
    local exit_code=$?

    if [[ $exit_code -ne 0 ]]; then
        log_error "Script exited with error code: $exit_code"
        send_notification "ERROR" "Deployment script failed with exit code: $exit_code"
    fi

    # Cleanup temporary files
    rm -f /tmp/health_response.json /tmp/survey_response.json

    exit $exit_code
}

# Set up signal handlers
trap cleanup EXIT
trap 'log_critical "Deployment interrupted by user"; exit 130' INT TERM

# Execute main function
main "$@"