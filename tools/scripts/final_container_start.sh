#!/bin/bash

# Final Container Start Method - 모든 방법을 시도
# Portainer API v1.24 호환성 문제에 대한 최종 해결책

set -e

PORTAINER_API_KEY="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
PORTAINER_URL="https://portainer.jclee.me"
ENDPOINT_ID="3"

echo "🔧 Final Container Start - All Methods"
echo "======================================"

# Method 1: Try to start via container actions
echo "📋 Method 1: Using container actions API..."

# Get container IDs
POSTGRES_ID=$(curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
             "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json?all=true" | \
             jq -r '.[] | select(.Names[] | contains("safework-postgres")) | .Id')

REDIS_ID=$(curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
          "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json?all=true" | \
          jq -r '.[] | select(.Names[] | contains("safework-redis")) | .Id')

APP_ID=$(curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json?all=true" | \
        jq -r '.[] | select(.Names[] | contains("safework-app")) | .Id')

echo "Container IDs:"
echo "PostgreSQL: $POSTGRES_ID"
echo "Redis: $REDIS_ID"
echo "App: $APP_ID"

# Method 2: Use Portainer's container management API
echo ""
echo "📋 Method 2: Using Portainer container management..."

if [ -n "$POSTGRES_ID" ]; then
    echo "Starting PostgreSQL container..."
    curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
         "$PORTAINER_URL/api/docker/containers/$POSTGRES_ID/start" || echo "PostgreSQL start attempted"
fi

sleep 5

if [ -n "$REDIS_ID" ]; then
    echo "Starting Redis container..."
    curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
         "$PORTAINER_URL/api/docker/containers/$REDIS_ID/start" || echo "Redis start attempted"
fi

sleep 5

if [ -n "$APP_ID" ]; then
    echo "Starting App container..."
    curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
         "$PORTAINER_URL/api/docker/containers/$APP_ID/start" || echo "App start attempted"
fi

# Method 3: Force restart all containers
echo ""
echo "📋 Method 3: Force restart all containers..."

for container_id in "$POSTGRES_ID" "$REDIS_ID" "$APP_ID"; do
    if [ -n "$container_id" ]; then
        echo "Force restarting container: $container_id"
        curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
             "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/$container_id/restart" || echo "Restart attempted"
    fi
done

# Wait for stabilization
echo ""
echo "⏳ Waiting for container stabilization..."
sleep 30

# Check final status
echo ""
echo "🔍 Final container status check..."
curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
     "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json" | \
     jq -r '.[] | select(.Names[] | contains("safework")) | "\(.Names[0]) - \(.State) - \(.Status)"'

# Test production if any container is running
echo ""
echo "🏥 Testing production health..."

if curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
   "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json" | \
   grep -q '"State":"running".*safework'; then

    echo "Some containers are running, testing production..."

    for i in {1..5}; do
        if curl -f -s "https://safework.jclee.me/health" > /dev/null 2>&1; then
            echo "✅ Production health check passed"
            curl -s "https://safework.jclee.me/health"
            break
        fi
        echo "⏳ Waiting for production health... ($i/5)"
        sleep 15
    done
else
    echo "❌ No containers are running"
fi

echo ""
echo "🎯 Manual intervention may be required via Portainer web interface:"
echo "https://portainer.jclee.me - Navigate to Containers and start manually"