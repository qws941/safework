#!/bin/bash
# SafeWork Portainer API 직접 배포

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PORTAINER_URL="https://portainer.jclee.me"
PORTAINER_TOKEN="ptr_zdHC0mAdjC7hk7pZ8r2+pJZO+bLxBD/TaB3iPuQwx9Q="
ENDPOINT_ID="3"

echo -e "${GREEN}=== SafeWork Portainer API 배포 ===${NC}"

# 1. 스택 확인 및 삭제
echo -e "${YELLOW}기존 safework 스택 확인...${NC}"
EXISTING_STACK=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
    "$PORTAINER_URL/api/stacks" | \
    jq -r '.[] | select(.Name == "safework") | .Id' || echo "")

if [ -n "$EXISTING_STACK" ]; then
    echo "기존 스택 발견 (ID: $EXISTING_STACK). 삭제 중..."
    curl -X DELETE -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/stacks/$EXISTING_STACK?endpointId=$ENDPOINT_ID" > /dev/null 2>&1
    echo "기존 스택 삭제 완료"
    sleep 5
fi

# 2. docker-compose 내용 준비
echo -e "${YELLOW}스택 구성 준비...${NC}"
COMPOSE_CONTENT='version: "3.8"

services:
  safework-postgres:
    image: registry.jclee.me/safework/postgres:latest
    container_name: safework-postgres
    environment:
      - POSTGRES_DB=safework_db
      - POSTGRES_USER=safework
      - POSTGRES_PASSWORD=safework2024
      - TZ=Asia/Seoul
    ports:
      - "4546:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - safework_network
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  safework-redis:
    image: registry.jclee.me/safework/redis:latest
    container_name: safework-redis
    environment:
      - TZ=Asia/Seoul
    ports:
      - "4547:6379"
    volumes:
      - redis_data:/data
    networks:
      - safework_network
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  safework-app:
    image: registry.jclee.me/safework/app:latest
    container_name: safework-app
    environment:
      - FLASK_CONFIG=production
      - TZ=Asia/Seoul
      - DB_HOST=safework-postgres
      - DB_PORT=5432
      - DB_NAME=safework_db
      - DB_USER=safework
      - DB_PASSWORD=safework2024
      - REDIS_HOST=safework-redis
      - REDIS_PORT=6379
      - SECRET_KEY=safework-production-secret-key-2024
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=safework2024
    ports:
      - "4545:4545"
    depends_on:
      - safework-postgres
      - safework-redis
    networks:
      - safework_network
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  postgres_data:
    name: safework_postgres_data
  redis_data:
    name: safework_redis_data

networks:
  safework_network:
    external: true'

# 3. JSON으로 변환하여 스택 생성
echo -e "${YELLOW}스택 생성 중...${NC}"
JSON_PAYLOAD=$(jq -n \
  --arg name "safework" \
  --arg content "$COMPOSE_CONTENT" \
  '{Name: $name, StackFileContent: $content}')

RESPONSE=$(curl -s -X POST \
  -H "X-API-Key: $PORTAINER_TOKEN" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/stacks?type=2&method=string&endpointId=$ENDPOINT_ID" \
  -d "$JSON_PAYLOAD")

# 4. 결과 확인
if echo "$RESPONSE" | grep -q '"Id"'; then
    STACK_ID=$(echo "$RESPONSE" | jq -r '.Id')
    echo -e "${GREEN}✓ 스택 생성 성공! (ID: $STACK_ID)${NC}"
else
    echo -e "${RED}스택 생성 실패${NC}"
    echo "응답: $RESPONSE"
    exit 1
fi

# 5. 컨테이너 확인
echo -e "${YELLOW}컨테이너 상태 확인 중...${NC}"
sleep 10

curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
    "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json" | \
    jq -r '.[] | select(.Names[] | contains("safework")) | "\(.Names[0]): \(.State)"'

# 6. 헬스체크
echo -e "${YELLOW}헬스체크...${NC}"
if curl -s https://safework.jclee.me/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ SafeWork 정상 작동!${NC}"
    curl -s https://safework.jclee.me/health | jq '.'
else
    echo -e "${YELLOW}⚠ 애플리케이션 시작 중...${NC}"
fi

echo -e "${GREEN}=== 배포 완료 ===${NC}"