#!/bin/bash

# SafeWork Watchtower 수동 업데이트 스크립트
# 표준 Watchtower는 priority 라벨을 지원하지 않으므로 수동 순서 제어

set -e

PORTAINER_API_KEY="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
PORTAINER_URL="https://portainer.jclee.me/api/endpoints/3/docker"

echo "🔄 SafeWork 컨테이너 순차적 업데이트 시작"

# 1. Redis 먼저 업데이트 (의존성 없음)
echo "1️⃣ Redis 업데이트 중..."
curl -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
  "$PORTAINER_URL/images/create?fromImage=registry.jclee.me/safework/redis:latest"
sleep 5

curl -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
  "$PORTAINER_URL/containers/safework-redis/restart"
sleep 15

echo "✅ Redis 업데이트 완료"

# 2. PostgreSQL 업데이트 (Redis 이후)
echo "2️⃣ PostgreSQL 업데이트 중..."
curl -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
  "$PORTAINER_URL/images/create?fromImage=registry.jclee.me/safework/postgres:latest"
sleep 5

curl -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
  "$PORTAINER_URL/containers/safework-postgres/restart"
sleep 30

echo "✅ PostgreSQL 업데이트 완료"

# 3. Flask App 마지막 업데이트 (모든 의존성 이후)
echo "3️⃣ Flask App 업데이트 중..."
curl -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
  "$PORTAINER_URL/images/create?fromImage=registry.jclee.me/safework/app:latest"
sleep 5

curl -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
  "$PORTAINER_URL/containers/safework-app/restart"
sleep 60

echo "✅ Flask App 업데이트 완료"

# 4. 시스템 헬스체크
echo "🔍 시스템 상태 확인..."
sleep 30

HEALTH_CHECK=$(curl -s https://safework.jclee.me/health | jq -r '.status // "unhealthy"')
if [ "$HEALTH_CHECK" = "healthy" ]; then
    echo "✅ 모든 업데이트 완료 - 시스템 정상"
else
    echo "❌ 업데이트 후 시스템 이상 - 확인 필요"
    exit 1
fi

echo "🎉 SafeWork 순차적 업데이트 성공 완료!"