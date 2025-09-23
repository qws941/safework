#!/bin/bash

# SafeWork Webhook Deployment Script
# 빠른 배포를 위한 Portainer Webhook 트리거

set -e

# Configuration
WEBHOOK_URL="https://portainer.jclee.me/api/stacks/webhooks/e2abf888-e16d-419b-bdf0-65c206cca913"
SERVICE_URL="https://safework.jclee.me"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 SafeWork Webhook 배포 시작${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Trigger webhook
echo -e "${YELLOW}📡 Webhook 트리거 중...${NC}"
HTTP_STATUS=$(curl -X POST "$WEBHOOK_URL" \
    -o /dev/null -w "%{http_code}" -s)

if [ "$HTTP_STATUS" == "204" ] || [ "$HTTP_STATUS" == "200" ]; then
    echo -e "${GREEN}✅ Webhook 트리거 성공 (HTTP $HTTP_STATUS)${NC}"
else
    echo -e "${RED}❌ Webhook 트리거 실패 (HTTP $HTTP_STATUS)${NC}"
    exit 1
fi

# Step 2: Wait for deployment
echo -e "${YELLOW}⏳ 배포 대기 중 (30초)...${NC}"
sleep 30

# Step 3: Health check
echo -e "${YELLOW}🔍 서비스 상태 확인 중...${NC}"
for i in {1..5}; do
    HEALTH_RESPONSE=$(curl -s "$SERVICE_URL/health" || echo "")
    if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
        echo -e "${GREEN}✅ 서비스 정상 작동 확인${NC}"
        echo "$HEALTH_RESPONSE" | jq . 2>/dev/null || echo "$HEALTH_RESPONSE"
        break
    fi

    if [ $i -lt 5 ]; then
        echo "재시도 $i/5..."
        sleep 10
    else
        echo -e "${RED}❌ 서비스 헬스체크 실패${NC}"
        exit 1
    fi
done

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 배포 완료!${NC}"
echo -e "📍 서비스 URL: $SERVICE_URL"
echo -e "📊 Admin Panel: $SERVICE_URL/admin"
echo -e "🔧 Health Check: $SERVICE_URL/health"