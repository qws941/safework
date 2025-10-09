#!/bin/bash
# SafeWork 자동 배포 스크립트

set -e

echo "🚀 SafeWork 자동 배포 시작..."

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 현재 디렉토리 확인
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}📁 작업 디렉토리: $SCRIPT_DIR${NC}"

# Git 상태 확인
echo -e "\n${BLUE}1. Git 변경사항 확인...${NC}"
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}변경된 파일:${NC}"
    git status -s

    read -p "변경사항을 커밋하시겠습니까? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "커밋 메시지를 입력하세요: " commit_msg
        git add .
        git commit -m "$commit_msg"
        echo -e "${GREEN}✅ Git 커밋 완료${NC}"
    fi
else
    echo -e "${GREEN}✅ 변경사항 없음${NC}"
fi

# TypeScript 타입 체크
echo -e "\n${BLUE}2. TypeScript 타입 체크...${NC}"
cd workers/
npm run type-check
echo -e "${GREEN}✅ 타입 체크 통과${NC}"

# Wrangler 인증 확인
echo -e "\n${BLUE}3. Wrangler 인증 확인...${NC}"
if npx wrangler whoami > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Wrangler 인증 완료${NC}"
else
    echo -e "${YELLOW}⚠️  Wrangler 인증이 필요합니다${NC}"
    echo -e "${BLUE}브라우저가 열리면 Cloudflare 계정으로 로그인하세요...${NC}"
    npx wrangler login
fi

# 배포
echo -e "\n${BLUE}4. Cloudflare Workers 배포 중...${NC}"
npx wrangler deploy --env production

echo -e "\n${GREEN}✅ 배포 완료!${NC}"

# Health Check
echo -e "\n${BLUE}5. Health Check...${NC}"
sleep 3  # 배포 전파 대기
HEALTH_CHECK=$(curl -s https://safework.jclee.me/api/health)
if [[ $HEALTH_CHECK == *"healthy"* ]]; then
    echo -e "${GREEN}✅ 서비스 정상 작동${NC}"
    echo "$HEALTH_CHECK" | jq '.' 2>/dev/null || echo "$HEALTH_CHECK"
else
    echo -e "${RED}❌ Health Check 실패${NC}"
    echo "$HEALTH_CHECK"
fi

echo -e "\n${GREEN}🎉 배포 완료! https://safework.jclee.me${NC}"
