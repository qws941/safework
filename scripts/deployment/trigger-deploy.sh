#!/bin/bash
# GitHub Actions를 통한 자동 배포 트리거

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 GitHub Actions 배포 트리거${NC}\n"

cd "$(dirname "$0")"

# Git 상태 확인
echo -e "${BLUE}1. Git 상태 확인...${NC}"
if [ -n "$(git status -s)" ]; then
    echo -e "${YELLOW}변경사항:${NC}"
    git status -s
    echo ""
else
    echo -e "${GREEN}✅ 변경사항 없음${NC}\n"
fi

# 빈 커밋으로 배포 트리거
echo -e "${BLUE}2. 배포 트리거 (빈 커밋)...${NC}"
git commit --allow-empty -m "chore: Trigger deployment [skip ci]"

echo -e "${BLUE}3. GitHub에 Push...${NC}"

# SSH 시도
if git push origin master 2>/dev/null; then
    echo -e "${GREEN}✅ Push 성공 (SSH)${NC}\n"
    PUSH_SUCCESS=true
else
    echo -e "${YELLOW}⚠️  SSH push 실패, HTTPS 시도...${NC}"

    # 임시로 HTTPS로 변경
    git remote set-url origin https://github.com/qws941/safework.git

    if [ ! -z "$GITHUB_TOKEN" ]; then
        # GitHub Token 사용
        git remote set-url origin "https://${GITHUB_TOKEN}@github.com/qws941/safework.git"
        git push origin master
        PUSH_SUCCESS=true
        echo -e "${GREEN}✅ Push 성공 (HTTPS + Token)${NC}\n"
    else
        echo -e "${RED}❌ Push 실패${NC}"
        echo ""
        echo "Git push를 위해 다음 중 하나를 설정하세요:"
        echo ""
        echo -e "${BLUE}옵션 1: SSH 키 등록${NC}"
        echo "  cat ~/.ssh/id_ed25519.pub"
        echo "  위 키를 https://github.com/settings/keys 에 등록"
        echo ""
        echo -e "${BLUE}옵션 2: GitHub Personal Access Token${NC}"
        echo "  1. https://github.com/settings/tokens 에서 토큰 생성"
        echo "  2. Scopes: repo (모든 권한)"
        echo "  3. ~/.bashrc 또는 ~/.zshrc에 추가:"
        echo "     export GITHUB_TOKEN='your_token_here'"
        echo ""
        PUSH_SUCCESS=false
    fi

    # SSH로 되돌리기
    git remote set-url origin git@github.com:qws941/safework.git
fi

if [ "$PUSH_SUCCESS" = true ]; then
    echo -e "${GREEN}✅ GitHub Actions 배포가 시작되었습니다!${NC}\n"
    echo "배포 진행상황 확인:"
    echo -e "${BLUE}https://github.com/qws941/safework/actions${NC}\n"

    echo "약 2분 후 배포가 완료됩니다."
    echo ""

    # 2분 대기 후 Health Check
    read -p "배포 완료를 기다리시겠습니까? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}배포 대기 중... (2분)${NC}"
        sleep 120

        echo -e "\n${BLUE}Health Check...${NC}"
        HEALTH=$(curl -s https://safework.jclee.me/api/health)
        if echo "$HEALTH" | grep -q "healthy"; then
            echo -e "${GREEN}✅ 배포 성공! 서비스 정상 작동${NC}"
            echo "$HEALTH" | jq '.' 2>/dev/null || echo "$HEALTH"
        else
            echo -e "${YELLOW}⚠️  Health check 응답:${NC}"
            echo "$HEALTH"
        fi
    fi
else
    exit 1
fi
