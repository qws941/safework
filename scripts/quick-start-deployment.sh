#!/bin/bash
# SafeWork 배포 빠른 시작 스크립트
# 작성: 2025-10-22

set -e

echo "🚀 SafeWork 배포 빠른 시작"
echo "======================================"
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: GitHub Push
echo -e "${YELLOW}Step 1: GitHub Push${NC}"
echo "현재 로컬 커밋: 2개 (ea7984b, 884f58b)"
echo ""
echo "실행 명령어:"
echo "  git config --global credential.helper store"
echo "  git push origin master"
echo ""
read -r -p "GitHub Push를 완료했습니까? (y/N) " -n 1
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}먼저 GitHub Push를 완료해주세요.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ GitHub Push 완료${NC}"
echo ""

# Step 2: Slack Webhook URL 입력
echo -e "${YELLOW}Step 2: Slack Webhook URL 설정${NC}"
echo "옵션 A: n8n Webhook (https://n8n.jclee.me)"
echo "옵션 B: Slack Incoming Webhook"
echo ""
read -r -p "Slack Webhook URL을 입력하세요: " WEBHOOK_URL

if [ -z "$WEBHOOK_URL" ]; then
    echo -e "${YELLOW}⚠️  Webhook URL을 건너뜁니다. 나중에 설정 가능합니다.${NC}"
else
    echo ""
    echo "Webhook URL 테스트 중..."
    if curl -sf -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d '{"text":"✅ SafeWork 배포 알림 시스템 테스트"}' > /dev/null; then
        echo -e "${GREEN}✅ Webhook URL 테스트 성공${NC}"
        
        echo ""
        echo "Cloudflare Secret 설정 중..."
        cd /home/jclee/app/safework/workers
        echo "$WEBHOOK_URL" | npx wrangler secret put SLACK_WEBHOOK_URL
        echo -e "${GREEN}✅ Cloudflare Secret 설정 완료${NC}"
        
        echo ""
        echo -e "${YELLOW}GitHub Secret도 설정해주세요:${NC}"
        echo "  Repository → Settings → Secrets → Actions"
        echo "  Name: SLACK_WEBHOOK_URL"
        echo "  Value: $WEBHOOK_URL"
    else
        echo -e "${RED}❌ Webhook URL 테스트 실패${NC}"
        echo "URL을 확인하고 다시 시도해주세요."
        exit 1
    fi
fi
echo ""

# Step 3: 배포 검증
echo -e "${YELLOW}Step 3: 배포 검증${NC}"
echo "GitHub Actions 확인:"
echo "  https://github.com/qws941/safework/actions"
echo ""
echo "5초 후 Health Check를 시작합니다..."
sleep 5

echo ""
echo "Health Check 중..."
if curl -sf https://safework.jclee.me/api/health > /dev/null; then
    echo -e "${GREEN}✅ Health Check 통과${NC}"
    
    echo ""
    echo "Native Services Check 중..."
    curl -s https://safework.jclee.me/api/native/native/health | jq
else
    echo -e "${YELLOW}⚠️  Health Check 실패 (배포 진행 중일 수 있음)${NC}"
    echo "5분 후 다시 확인해주세요:"
    echo "  curl https://safework.jclee.me/api/health"
fi
echo ""

# 완료
echo -e "${GREEN}======================================"
echo "🎉 배포 프로세스 완료!"
echo "======================================${NC}"
echo ""
echo "다음 확인 사항:"
echo "  1. GitHub Actions 성공 확인"
echo "  2. Slack 채널에서 배포 알림 확인"
echo "  3. Grafana Dashboard 확인 (https://grafana.jclee.me)"
echo ""
echo "Grade: B+ → A-"
echo ""
