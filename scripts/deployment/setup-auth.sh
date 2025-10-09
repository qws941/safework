#!/bin/bash
# SafeWork 인증 설정 스크립트

set -e

echo "🔐 SafeWork 인증 설정"

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "\n${BLUE}=== 1. Wrangler (Cloudflare) 인증 ===${NC}"
echo "브라우저가 열리면 Cloudflare 계정으로 로그인하세요..."
cd workers/
npx wrangler login
echo -e "${GREEN}✅ Wrangler 인증 완료${NC}"

echo -e "\n${BLUE}=== 2. SSH 키 설정 (선택사항) ===${NC}"
echo "GitHub SSH 키를 등록하려면 아래 public key를 복사하세요:"
echo -e "${YELLOW}"
cat ~/.ssh/id_ed25519.pub
echo -e "${NC}"
echo ""
echo "GitHub 설정 페이지에서 등록:"
echo "https://github.com/settings/keys"
echo ""
read -p "SSH 키를 GitHub에 등록했습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "SSH 연결 테스트 중..."
    if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
        echo -e "${GREEN}✅ SSH 인증 성공${NC}"
    else
        echo -e "${YELLOW}⚠️  SSH 인증 실패. GitHub에 키를 등록했는지 확인하세요.${NC}"
    fi
fi

echo -e "\n${GREEN}🎉 설정 완료!${NC}"
echo ""
echo "이제 다음 명령으로 배포할 수 있습니다:"
echo -e "${BLUE}  ./deploy.sh${NC}"
