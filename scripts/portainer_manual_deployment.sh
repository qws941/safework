#!/bin/bash
# Portainer 수동 배포 가이드

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== SafeWork Portainer 수동 배포 가이드 ===${NC}"
echo

# 1. 네트워크 생성
echo -e "${YELLOW}[Step 1] Docker 네트워크 확인${NC}"
if ! docker network ls --format "{{.Name}}" | grep -q "^safework_network$"; then
    docker network create safework_network
    echo -e "${GREEN}✓ safework_network 생성 완료${NC}"
else
    echo -e "${GREEN}✓ safework_network 이미 존재${NC}"
fi

# 2. 이미지 업데이트
echo -e "${YELLOW}[Step 2] Docker 이미지 풀${NC}"
docker pull registry.jclee.me/safework/app:latest
docker pull registry.jclee.me/safework/postgres:latest
docker pull registry.jclee.me/safework/redis:latest
echo -e "${GREEN}✓ 이미지 업데이트 완료${NC}"

# 3. docker-compose.yml 내용 출력
echo
echo -e "${YELLOW}[Step 3] Portainer 웹 UI에서 스택 생성${NC}"
echo "1. https://portainer.jclee.me 접속"
echo "2. Endpoint: Synology (ID: 3) 선택"
echo "3. Stacks 메뉴 클릭"
echo "4. Add stack 버튼 클릭"
echo "5. Name: safework"
echo "6. Web editor에 아래 내용 붙여넣기:"
echo
echo -e "${BLUE}--- docker-compose.yml 내용 시작 ---${NC}"
cat /home/jclee/app/safework/docker-compose.yml
echo -e "${BLUE}--- docker-compose.yml 내용 끝 ---${NC}"
echo
echo "7. Deploy the stack 클릭"
echo
echo -e "${GREEN}완료 후 확인:${NC}"
echo "- https://safework.jclee.me/health"
echo "- Portainer에서 컨테이너 상태 확인"