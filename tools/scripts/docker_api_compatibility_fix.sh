#!/bin/bash

# Docker API v1.24 Compatibility Fix for SafeWork Containers
# 완전한 호환성 해결책: Direct Docker 명령어를 사용하여 API 제한 우회

set -e

echo "🔧 Docker API v1.24 Compatibility Fix for SafeWork"
echo "=================================================="

# Configuration
PORTAINER_API_KEY="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
PORTAINER_URL="https://portainer.jclee.me"
ENDPOINT_ID="3"
PRODUCTION_URL="https://safework.jclee.me"

# Container images
POSTGRES_IMAGE="registry.jclee.me/safework/postgres:latest"
APP_IMAGE="registry.jclee.me/safework/app:latest"
REDIS_IMAGE="registry.jclee.me/safework/redis:latest"

log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# Function to execute Docker commands directly via Portainer exec
execute_docker_command() {
    local command="$1"
    local description="$2"

    log_info "$description"

    # Try to find a running container to execute Docker commands from
    local host_container=$(curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
                          "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json" | \
                          jq -r '.[] | select(.State == "running" and (.Image | contains("docker") or .Image | contains("portainer"))) | .Id' | head -1)

    if [ -n "$host_container" ]; then
        # Execute Docker command through the host container
        local exec_config='{
            "AttachStdout": true,
            "AttachStderr": true,
            "Cmd": ["sh", "-c", "'"$command"'"]
        }'

        local exec_id=$(curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
                       -H "Content-Type: application/json" \
                       "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/$host_container/exec" \
                       -d "$exec_config" | jq -r '.Id')

        if [ -n "$exec_id" ] && [ "$exec_id" != "null" ]; then
            curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
                 "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/exec/$exec_id/start" \
                 -d '{"Detach": false}'
            return 0
        fi
    fi

    log_error "Could not execute Docker command: $command"
    return 1
}

# Step 1: Stop and remove all SafeWork containers
log_info "Stopping and removing all SafeWork containers..."

containers=("safework-postgres" "safework-app" "safework-redis")

for container in "${containers[@]}"; do
    log_info "Removing container: $container"
    curl -s -X DELETE -H "X-API-Key: $PORTAINER_API_KEY" \
         "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/$container?force=true" 2>/dev/null || true
done

sleep 5

# Step 2: Create network if not exists
log_info "Ensuring network exists..."
execute_docker_command "docker network create watchtower_default 2>/dev/null || echo 'Network already exists'" \
                       "Creating Docker network"

# Step 3: Pull latest images
log_info "Pulling latest images..."
for image in "$POSTGRES_IMAGE" "$APP_IMAGE" "$REDIS_IMAGE"; do
    log_info "Pulling image: $image"
    curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
         -H "Content-Type: application/json" \
         "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/images/create" \
         -d '{"fromImage": "'$image'"}' > /dev/null &
done

# Wait for image pulls to complete
sleep 30

# Step 4: Create and start containers using direct Docker commands via exec
log_info "Creating SafeWork containers using direct Docker commands..."

# PostgreSQL
postgres_cmd="docker run -d --name safework-postgres --network watchtower_default \
  -e TZ=Asia/Seoul \
  -e POSTGRES_PASSWORD=safework2024 \
  -e POSTGRES_DB=safework_db \
  -e POSTGRES_USER=safework \
  --restart unless-stopped \
  $POSTGRES_IMAGE"

execute_docker_command "$postgres_cmd" "Creating PostgreSQL container"

sleep 10

# Redis
redis_cmd="docker run -d --name safework-redis --network watchtower_default \
  -e TZ=Asia/Seoul \
  --restart unless-stopped \
  $REDIS_IMAGE"

execute_docker_command "$redis_cmd" "Creating Redis container"

sleep 5

# Application
app_cmd="docker run -d --name safework-app --network watchtower_default \
  -e TZ=Asia/Seoul \
  -e DB_HOST=safework-postgres \
  -e DB_NAME=safework_db \
  -e DB_USER=safework \
  -e DB_PASSWORD=safework2024 \
  -e REDIS_HOST=safework-redis \
  --restart unless-stopped \
  $APP_IMAGE"

execute_docker_command "$app_cmd" "Creating Application container"

# Step 5: Wait for system stabilization
log_info "Waiting for system stabilization..."
sleep 30

# Step 6: Verify container status
log_info "Verifying container status..."
curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
     "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json" | \
     jq -r '.[] | select(.Names[] | contains("safework")) | "\(.Names[0]) - \(.State) - \(.Status)"'

# Step 7: Test production health
log_info "Testing production health..."
for i in {1..10}; do
    if curl -f -s "$PRODUCTION_URL/health" > /dev/null 2>&1; then
        log_info "✅ Production health check passed"
        curl -s "$PRODUCTION_URL/health"
        break
    fi
    log_info "⏳ Waiting for production health... ($i/10)"
    sleep 15
done

# Step 8: Final validation
log_info "Running final validation tests..."

# Test survey API
survey_test=$(curl -s -w "%{http_code}" -X POST "$PRODUCTION_URL/survey/api/submit" \
              -H "Content-Type: application/json" \
              -d '{"form_type":"001","name":"자동화테스트","age":30}')

survey_code=$(echo "$survey_test" | tail -c 4)

if [ "$survey_code" = "200" ] || [ "$survey_code" = "201" ]; then
    log_info "✅ Survey API test passed"
else
    log_error "❌ Survey API test failed (HTTP $survey_code)"
fi

log_info "🎉 Docker API v1.24 Compatibility Fix completed!"
log_info "🌐 Production URL: $PRODUCTION_URL"
log_info "🏥 Health Check: $PRODUCTION_URL/health"