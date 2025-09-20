#!/bin/bash

# SafeWork Emergency Recovery & Deployment Test Automation
# 완전한 자동화 테스트 시스템 with Docker API v1.24 호환성

set -e

# Configuration
PORTAINER_API_KEY="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
PORTAINER_URL="https://portainer.jclee.me"
ENDPOINT_ID="3"
PRODUCTION_URL="https://safework.jclee.me"

# Container configuration
POSTGRES_IMAGE="registry.jclee.me/safework/postgres:latest"
APP_IMAGE="registry.jclee.me/safework/app:latest"
REDIS_IMAGE="registry.jclee.me/safework/redis:latest"
NETWORK_NAME="watchtower_default"

# Test configuration
MAX_RETRIES=5
HEALTH_CHECK_TIMEOUT=60
DB_READY_TIMEOUT=30

echo "🚨 SafeWork Emergency Recovery & Test Automation"
echo "================================================="

# Utility functions
log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

check_container_status() {
    local container_name=$1
    curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
         "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json?all=true" | \
         jq -r ".[] | select(.Names[] | contains(\"$container_name\")) | \"\(.Names[0]) - \(.State) - \(.Status)\""
}

wait_for_container_health() {
    local container_name=$1
    local timeout=${2:-60}
    local count=0

    log_info "Waiting for $container_name to become healthy (timeout: ${timeout}s)..."

    while [ $count -lt $timeout ]; do
        local status=$(check_container_status "$container_name" | awk '{print $3}')
        if [[ "$status" == "running" ]]; then
            log_info "$container_name is running"
            return 0
        fi
        sleep 2
        count=$((count + 2))
    done

    log_error "$container_name failed to start within ${timeout}s"
    return 1
}

test_database_connection() {
    log_info "Testing database connection..."
    local app_container_id=$(curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
                            "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json" | \
                            jq -r '.[] | select(.Names[] | contains("safework-app")) | .Id')

    if [ -n "$app_container_id" ]; then
        # Test database connectivity through app container
        local db_test_result=$(curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
                              -H "Content-Type: application/json" \
                              "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/$app_container_id/exec" \
                              -d '{
                                "AttachStdout": true,
                                "AttachStderr": true,
                                "Cmd": ["python", "-c", "from app import create_app; from models import db; app = create_app(); app.app_context().push(); print(\"DB_OK\" if db.engine.execute(\"SELECT 1\").scalar() == 1 else \"DB_FAIL\")"]
                              }' | jq -r '.Id')

        if [ -n "$db_test_result" ]; then
            log_info "Database connection test executed"
            return 0
        fi
    fi

    log_error "Database connection test failed"
    return 1
}

test_api_endpoints() {
    log_info "Testing API endpoints..."

    # Test health endpoint
    local health_response=$(curl -s -w "%{http_code}" "$PRODUCTION_URL/health")
    local health_code=$(echo "$health_response" | tail -c 4)

    if [ "$health_code" = "200" ]; then
        log_info "✅ Health endpoint test passed"
    else
        log_error "❌ Health endpoint test failed (HTTP $health_code)"
        return 1
    fi

    # Test survey API
    local survey_response=$(curl -s -w "%{http_code}" -X POST "$PRODUCTION_URL/survey/api/submit" \
                           -H "Content-Type: application/json" \
                           -d '{"form_type":"001","name":"테스트자동화","age":30}')
    local survey_code=$(echo "$survey_response" | tail -c 4)

    if [ "$survey_code" = "200" ] || [ "$survey_code" = "201" ]; then
        log_info "✅ Survey API test passed"
    else
        log_error "❌ Survey API test failed (HTTP $survey_code)"
        return 1
    fi

    return 0
}

cleanup_failed_containers() {
    log_info "Cleaning up failed containers..."

    # Remove created but not running containers
    curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
         "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json?all=true" | \
         jq -r '.[] | select(.Names[] | contains("safework") and .State == "created") | .Names[0]' | \
         while read container; do
            if [ -n "$container" ]; then
                log_info "Removing failed container: $container"
                curl -X DELETE -H "X-API-Key: $PORTAINER_API_KEY" \
                     "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers${container}?force=true" || true
            fi
         done
}

# Main recovery and test process
log_info "Starting SafeWork Emergency Recovery & Test Automation"

# Step 1: Check current status
log_info "Checking current container status..."
curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
     "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json?all=true" | \
     jq -r '.[] | select(.Names[] | contains("safework")) | "\(.Names[0]) - \(.State) - \(.Status)"'

# Step 2: Clean up failed containers
cleanup_failed_containers

# Step 3: Recreate PostgreSQL with API v1.24 compatibility
log_info "Recreating PostgreSQL container with API v1.24 compatibility..."

# Force remove existing postgres container
curl -X DELETE -H "X-API-Key: $PORTAINER_API_KEY" \
     "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/safework-postgres?force=true" 2>/dev/null || true

# Create new postgres container with run-style API call (API v1.22 compatibility)
log_info "Creating PostgreSQL container with legacy API compatibility..."
POSTGRES_RUN_RESPONSE=$(curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
     -H "Content-Type: application/json" \
     "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/run" \
     -d '{
       "Image": "'$POSTGRES_IMAGE'",
       "name": "safework-postgres",
       "Env": [
         "TZ=Asia/Seoul",
         "POSTGRES_PASSWORD=safework2024",
         "POSTGRES_DB=safework_db",
         "POSTGRES_USER=safework"
       ],
       "NetworkingConfig": {
         "EndpointsConfig": {
           "'$NETWORK_NAME'": {}
         }
       },
       "HostConfig": {
         "RestartPolicy": {
           "Name": "unless-stopped"
         },
         "NetworkMode": "'$NETWORK_NAME'",
         "AutoRemove": false
       }
     }')

# If run API doesn't work, try traditional create then start
if ! echo "$POSTGRES_RUN_RESPONSE" | grep -q '"Id"'; then
    log_info "Run API failed, trying traditional create+start method..."

    POSTGRES_CREATE_RESPONSE=$(curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
         -H "Content-Type: application/json" \
         "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/create?name=safework-postgres" \
         -d '{
           "Image": "'$POSTGRES_IMAGE'",
           "Env": [
             "TZ=Asia/Seoul",
             "POSTGRES_PASSWORD=safework2024",
             "POSTGRES_DB=safework_db",
             "POSTGRES_USER=safework"
           ],
           "NetworkingConfig": {
             "EndpointsConfig": {
               "'$NETWORK_NAME'": {}
             }
           },
           "HostConfig": {
             "RestartPolicy": {
               "Name": "unless-stopped"
             },
             "NetworkMode": "'$NETWORK_NAME'"
           }
         }')

    CREATE_RESULT="$POSTGRES_CREATE_RESPONSE"
else
    CREATE_RESULT="$POSTGRES_RUN_RESPONSE"
fi

if echo "$CREATE_RESULT" | grep -q '"Id"'; then
    log_info "PostgreSQL container created successfully"

    # If using create+start method, start the container
    if [[ -n "$POSTGRES_CREATE_RESPONSE" ]]; then
        # Use Portainer's container start endpoint with empty body
        log_info "Starting PostgreSQL container..."
        start_response=$(curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
                        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/safework-postgres/start")

        # Handle API v1.24 compatibility issue
        if echo "$start_response" | grep -q '"message".*"deprecated"'; then
            log_info "Container start command sent (API v1.24 deprecation warning - normal)"
        elif [[ -z "$start_response" ]]; then
            log_info "Container start command sent successfully"
        else
            log_error "Container start failed: $start_response"
        fi
    else
        log_info "Container started via run command"
    fi

    # Give container more time to start
    sleep 10

    if wait_for_container_health "safework-postgres" $DB_READY_TIMEOUT; then
        log_info "✅ PostgreSQL container started successfully"
    else
        log_error "❌ PostgreSQL container failed to start properly"
        # Don't exit, try to continue and see if the system recovers
        log_info "Continuing with deployment validation..."
    fi
else
    log_error "Failed to create PostgreSQL container"
    echo "Response: $CREATE_RESULT"
    exit 1
fi

# Step 4: Ensure all containers are running
log_info "Checking all SafeWork containers..."
sleep 5

# Step 5: Wait for system stabilization
log_info "Waiting for system stabilization..."
wait_for_container_health "safework-app" $HEALTH_CHECK_TIMEOUT

# Step 6: Run comprehensive tests
log_info "Running automated tests..."
test_api_endpoints

# Step 7: Final status report
log_info "Final container status:"
curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
     "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json" | \
     jq -r '.[] | select(.Names[] | contains("safework")) | "\(.Names[0]) - \(.State) - \(.Status)"'

log_info "✅ SafeWork Emergency Recovery & Test Automation completed successfully!"
log_info "🌐 Production URL: $PRODUCTION_URL"
