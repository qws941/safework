#!/bin/bash
# SafeWork 빠른 배포 스크립트 (완전 자동화)

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 SafeWork 자동 배포 시작...${NC}\n"

# 프로젝트 루트로 이동
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

# 1. TypeScript 타입 체크
echo -e "${BLUE}1. TypeScript 타입 체크...${NC}"
cd workers/
if npm run type-check > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 타입 체크 통과${NC}\n"
else
    echo -e "${RED}❌ 타입 에러 발견${NC}"
    npm run type-check
    exit 1
fi

# 2. Cloudflare API 토큰 확인
echo -e "${BLUE}2. Cloudflare 인증 확인...${NC}"

# ~/.wrangler/config/ 디렉토리 확인
WRANGLER_CONFIG_DIR="$HOME/.wrangler/config"
WRANGLER_TOKEN_FILE="$WRANGLER_CONFIG_DIR/default.toml"

if [ -f "$WRANGLER_TOKEN_FILE" ]; then
    echo -e "${GREEN}✅ Wrangler 인증 설정 발견${NC}\n"
    npx wrangler deploy --env production
    DEPLOY_SUCCESS=$?
elif [ ! -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${GREEN}✅ 환경 변수에서 API 토큰 발견${NC}\n"
    npx wrangler deploy --env production
    DEPLOY_SUCCESS=$?
else
    echo -e "${YELLOW}⚠️  Cloudflare 인증이 필요합니다${NC}\n"
    echo -e "다음 중 하나를 선택하세요:\n"
    echo -e "${BLUE}옵션 1: 인터랙티브 로그인${NC}"
    echo "  npx wrangler login"
    echo ""
    echo -e "${BLUE}옵션 2: API 토큰 사용${NC}"
    echo "  1. https://dash.cloudflare.com/profile/api-tokens 에서 토큰 생성"
    echo "  2. 템플릿: 'Edit Cloudflare Workers'"
    echo "  3. 토큰을 ~/.bashrc 또는 ~/.zshrc에 추가:"
    echo "     export CLOUDFLARE_API_TOKEN='your-token-here'"
    echo ""
    echo -e "${YELLOW}설정 후 다시 실행하세요: ./quick-deploy.sh${NC}"
    exit 1
fi

# 3. 배포 결과 확인
if [ $DEPLOY_SUCCESS -eq 0 ]; then
    echo -e "\n${GREEN}✅ 배포 성공!${NC}\n"

    # Health Check
    echo -e "${BLUE}3. Health Check 진행 중...${NC}"
    sleep 3

    HEALTH=$(curl -s https://safework.jclee.me/api/health)
    if echo "$HEALTH" | grep -q "healthy"; then
        echo -e "${GREEN}✅ 서비스 정상 작동${NC}"
        echo "$HEALTH" | jq '.' 2>/dev/null || echo "$HEALTH"
    else
        echo -e "${YELLOW}⚠️  Health check 응답:${NC}"
        echo "$HEALTH"
    fi

    echo -e "\n${GREEN}🎉 배포 완료!${NC}"
    echo -e "${BLUE}📍 URL: https://safework.jclee.me${NC}"
    echo -e "${BLUE}📍 Workers.dev: https://safework.jclee.workers.dev${NC}"
else
    echo -e "\n${RED}❌ 배포 실패${NC}"
    exit 1
fi
