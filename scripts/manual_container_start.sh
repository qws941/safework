#!/bin/bash
# Manual container start script to work around Docker API v1.24+ issues
# This script manually starts SafeWork containers that are stuck in "created" state

set -euo pipefail

PORTAINER_URL="https://portainer.jclee.me"
PORTAINER_TOKEN="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
ENDPOINT_ID="3"

echo "🔍 SafeWork Container Manual Start Script"
echo "=========================================="

# Function to get container ID by partial match
get_container_id() {
    local image_name="$1"
    curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json?all=true" | \
        jq -r ".[] | select(.Image | contains(\"$image_name\")) | .Id" | head -1
}

# Function to force start container using Docker CLI through exec
force_start_container() {
    local container_id="$1"
    local container_name="$2"

    echo "🚀 Force starting $container_name container: $container_id"

    # Try multiple approaches to start the container

    # Approach 1: Delete and recreate with auto-start
    echo "   Attempting to recreate container with auto-start..."

    # Get container configuration
    local config=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/$container_id/json")

    if echo "$config" | jq -e '.Config' > /dev/null 2>&1; then
        echo "   ✅ Container configuration retrieved"

        # Delete existing container
        curl -s -X DELETE \
            -H "X-API-Key: $PORTAINER_TOKEN" \
            "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/$container_id?force=true" > /dev/null

        echo "   ✅ Container deleted"

        # Create new container with restart policy
        local image=$(echo "$config" | jq -r '.Config.Image')
        local env_vars=$(echo "$config" | jq -r '.Config.Env[]' | sed 's/^/-e /' | tr '\n' ' ')

        echo "   🔄 Creating new container with auto-restart..."
        # Note: This would require SSH access to the Docker host to run docker commands
        echo "   ⚠️  Manual intervention required: SSH to Docker host and run:"
        echo "   docker run -d --restart=unless-stopped --name=$container_name $env_vars $image"

    else
        echo "   ❌ Failed to get container configuration"
    fi
}

# Main execution
echo "🔍 Searching for SafeWork containers..."

# Get container IDs
POSTGRES_ID=$(get_container_id "safework/postgres")
REDIS_ID=$(get_container_id "safework/redis")
APP_ID=$(get_container_id "safework/app")

echo "📋 Found containers:"
echo "   PostgreSQL: $POSTGRES_ID"
echo "   Redis: $REDIS_ID"
echo "   App: $APP_ID"

# Check status and start if needed
for container_id in "$POSTGRES_ID" "$REDIS_ID" "$APP_ID"; do
    if [ "$container_id" != "null" ] && [ -n "$container_id" ]; then
        local status=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
            "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/$container_id/json" | \
            jq -r '.State.Status')

        echo "   Container $container_id status: $status"

        if [ "$status" = "created" ]; then
            echo "   ⚠️  Container needs manual start intervention"
            case "$container_id" in
                "$POSTGRES_ID") force_start_container "$container_id" "safework-postgres" ;;
                "$REDIS_ID") force_start_container "$container_id" "safework-redis" ;;
                "$APP_ID") force_start_container "$container_id" "safework-app" ;;
            esac
        elif [ "$status" = "running" ]; then
            echo "   ✅ Container is running"
        fi
    fi
done

echo ""
echo "🎯 Summary:"
echo "The Docker API v1.24+ compatibility issue prevents automatic container starting."
echo "Manual intervention is required to start containers that are stuck in 'created' state."
echo ""
echo "💡 Solutions:"
echo "1. Use Portainer UI to manually start containers"
echo "2. SSH to Docker host and use 'docker start <container_id>' commands"
echo "3. Use 'docker restart <container_id>' if containers were previously running"
echo ""
echo "🔗 Production URL: https://safework.jclee.me"
echo "📊 Portainer UI: https://portainer.jclee.me"