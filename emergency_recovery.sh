#!/bin/bash
# 🚨 SafeWork 긴급 복구 스크립트
# 운영서버 safework.jclee.me 다운 시 즉시 복구

set -e

echo "🚨 SafeWork 긴급 복구 시작..."

# Portainer API 설정
PORTAINER_URL="https://portainer.jclee.me"
API_KEY="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
ENDPOINT_ID="3"

echo "📋 현재 컨테이너 상태 확인..."
curl -s -H "X-API-Key: ${API_KEY}" \
    "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
    jq -r '.[] | select(.Names[] | contains("safework")) | "\(.Names[0][1:]): \(.State)"'

echo "🔄 safework-app 컨테이너 강제 재생성..."

# 기존 앱 컨테이너 찾기 및 제거
APP_CONTAINER_ID=$(curl -s -H "X-API-Key: ${API_KEY}" \
    "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
    jq -r '.[] | select(.Names[] | contains("safework-app")) | .Id' | head -1)

if [ ! -z "$APP_CONTAINER_ID" ]; then
    echo "🗑️ 기존 컨테이너 제거: $APP_CONTAINER_ID"
    curl -X DELETE -s -H "X-API-Key: ${API_KEY}" \
        "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${APP_CONTAINER_ID}?force=true"
fi

# 새 컨테이너 생성
echo "🆕 새 safework-app 컨테이너 생성..."
NEW_CONTAINER=$(curl -X POST -s -H "X-API-Key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/create?name=safework-app" \
    -d '{
        "Image": "registry.jclee.me/safework/app:latest",
        "Env": [
            "TZ=Asia/Seoul",
            "DB_HOST=safework-postgres", 
            "DB_NAME=safework_db",
            "DB_USER=safework",
            "DB_PASSWORD=safework2024",
            "REDIS_HOST=safework-redis",
            "SECRET_KEY=safework-production-secret-key-2024",
            "ADMIN_USERNAME=admin",
            "ADMIN_PASSWORD=safework2024",
            "FLASK_CONFIG=production"
        ],
        "Labels": {
            "com.centurylinklabs.watchtower.enable": "true"
        },
        "HostConfig": {
            "PortBindings": {"4545/tcp": [{"HostPort": "4545"}]},
            "NetworkMode": "watchtower_default",
            "RestartPolicy": {"Name": "unless-stopped"}
        }
    }')

NEW_CONTAINER_ID=$(echo $NEW_CONTAINER | jq -r '.Id')
echo "✅ 새 컨테이너 생성됨: $NEW_CONTAINER_ID"

# 컨테이너 시작
echo "🚀 컨테이너 시작..."
sleep 3

# 직접 Docker 명령어 시도
echo "🔧 Docker 직접 시작 시도..."
docker start safework-app 2>/dev/null || echo "Docker 명령어 실패"

echo "⏱️ 컨테이너 시작 대기 (30초)..."
sleep 30

# 상태 확인
echo "📊 복구 후 상태 확인..."
curl -s -H "X-API-Key: ${API_KEY}" \
    "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
    jq -r '.[] | select(.Names[] | contains("safework")) | "\(.Names[0][1:]): \(.State) - \(.Status)"'

# 서비스 테스트
echo "🔍 서비스 접근성 테스트..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://safework.jclee.me/health)
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ 서비스 복구 완료! (HTTP $HTTP_STATUS)"
else
    echo "⚠️ 서비스 여전히 문제 있음 (HTTP $HTTP_STATUS)"
fi

echo "🏁 긴급 복구 스크립트 완료"