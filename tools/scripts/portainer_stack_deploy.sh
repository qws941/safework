#!/bin/bash

# Portainer Stack Deployment for SafeWork
# Docker API v1.24 호환성 문제 해결을 위한 Stack 기반 배포

set -e

PORTAINER_API_KEY="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
PORTAINER_URL="https://portainer.jclee.me"
ENDPOINT_ID="3"
STACK_NAME="safework-production"

echo "🚀 Deploying SafeWork via Portainer Stack"
echo "=========================================="

# Remove existing stack if exists
echo "🗑️ Removing existing stack..."
curl -s -X DELETE -H "X-API-Key: $PORTAINER_API_KEY" \
     "$PORTAINER_URL/api/stacks/1" 2>/dev/null || true

curl -s -X DELETE -H "X-API-Key: $PORTAINER_API_KEY" \
     "$PORTAINER_URL/api/stacks/2" 2>/dev/null || true

# Wait for cleanup
sleep 10

# Create stack with Docker Compose content
echo "📦 Creating new SafeWork stack..."

# Prepare stack file content
STACK_CONTENT='version: '\''3.8'\''

networks:
  safework_network:
    external: true

services:
  safework-postgres:
    image: registry.jclee.me/safework/postgres:latest
    container_name: safework-postgres
    environment:
      - TZ=Asia/Seoul
      - POSTGRES_PASSWORD=safework2024
      - POSTGRES_DB=safework_db
      - POSTGRES_USER=safework
    networks:
      - safework_network
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U safework -d safework_db"]
      interval: 30s
      timeout: 10s
      retries: 3

  safework-redis:
    image: registry.jclee.me/safework/redis:latest
    container_name: safework-redis
    environment:
      - TZ=Asia/Seoul
    networks:
      - safework_network
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  safework-app:
    image: registry.jclee.me/safework/app:latest
    container_name: safework-app
    environment:
      - TZ=Asia/Seoul
      - DB_HOST=safework-postgres
      - DB_NAME=safework_db
      - DB_USER=safework
      - DB_PASSWORD=safework2024
      - REDIS_HOST=safework-redis
      - FLASK_CONFIG=production
    ports:
      - "4545:4545"
    networks:
      - safework_network
    restart: unless-stopped
    depends_on:
      - safework-postgres
      - safework-redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4545/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

volumes:
  postgres_data:
  redis_data:'

# Create JSON payload
cat > /tmp/stack_payload.json << EOF
{
  "name": "$STACK_NAME",
  "stackFileContent": $(echo "$STACK_CONTENT" | jq -Rs .),
  "endpointId": $ENDPOINT_ID,
  "type": 2
}
EOF

# Deploy stack
DEPLOY_RESPONSE=$(curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
                  -H "Content-Type: application/json" \
                  "$PORTAINER_URL/api/stacks" \
                  -d @/tmp/stack_payload.json)

echo "📋 Deploy Response: $DEPLOY_RESPONSE"

if echo "$DEPLOY_RESPONSE" | grep -q '"Id"'; then
    echo "✅ Stack deployed successfully"
else
    echo "❌ Stack deployment failed"
    echo "Response: $DEPLOY_RESPONSE"
    exit 1
fi

# Wait for containers to start
echo "⏳ Waiting for containers to start..."
sleep 30

# Check container status
echo "🔍 Checking container status..."
curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
     "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json" | \
     jq -r '.[] | select(.Names[] | contains("safework")) | "\(.Names[0]) - \(.State) - \(.Status)"'

# Test production health
echo "🏥 Testing production health..."
sleep 30

for i in {1..5}; do
    if curl -f -s "https://safework.jclee.me/health" > /dev/null 2>&1; then
        echo "✅ Production health check passed"
        curl -s "https://safework.jclee.me/health"
        break
    fi
    echo "⏳ Waiting for production health... ($i/5)"
    sleep 15
done

echo "🎉 SafeWork Stack deployment completed!"

# Cleanup
rm -f /tmp/stack_payload.json