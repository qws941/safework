#!/bin/bash
# SafeWork 자동 스택 배포 스크립트
# 네트워크 생성부터 스택 배포까지 완전 자동화

set -euo pipefail

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Portainer 설정
PORTAINER_URL="https://portainer.jclee.me"
PORTAINER_TOKEN="ptr_zdHC0mAdjC7hk7pZ8r2+pJZO+bLxBD/TaB3iPuQwx9Q="
ENDPOINT_ID="3"
STACK_NAME="safework"

echo -e "${GREEN}=== SafeWork 자동 스택 배포 시작 ===${NC}"

# 1. 네트워크 확인 및 생성
echo -e "${YELLOW}[1/4] Docker 네트워크 설정${NC}"
if ! docker network ls --format "{{.Name}}" | grep -q "^safework_network$"; then
    echo "네트워크 생성 중..."
    docker network create safework_network
    echo -e "${GREEN}✓ safework_network 생성 완료${NC}"
else
    echo -e "${GREEN}✓ safework_network 이미 존재${NC}"
fi

# 중복 네트워크 제거
echo "중복 네트워크 확인..."
DUPLICATE_NETWORKS=$(docker network ls --format "{{.ID}} {{.Name}}" | grep "safework" | grep -v "^[^ ]* safework_network$" || true)
if [ -n "$DUPLICATE_NETWORKS" ]; then
    echo "$DUPLICATE_NETWORKS" | awk '{print $1}' | while read -r net_id; do
        echo "중복 네트워크 제거: $net_id"
        docker network rm "$net_id" 2>/dev/null || true
    done
fi

# 2. 최신 이미지 풀
echo -e "${YELLOW}[2/4] Docker 이미지 업데이트${NC}"
docker pull registry.jclee.me/safework/app:latest || true
docker pull registry.jclee.me/safework/postgres:latest || true
docker pull registry.jclee.me/safework/redis:latest || true
echo -e "${GREEN}✓ 이미지 업데이트 완료${NC}"

# 3. docker-compose.yml 내용 읽기
echo -e "${YELLOW}[3/4] 스택 구성 준비${NC}"
COMPOSE_FILE="/home/jclee/app/safework/docker-compose.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}❌ docker-compose.yml 파일을 찾을 수 없습니다.${NC}"
    exit 1
fi
COMPOSE_CONTENT=$(cat "$COMPOSE_FILE")

# 4. Portainer API로 스택 배포
echo -e "${YELLOW}[4/4] Portainer 스택 배포${NC}"

# 기존 스택 확인
STACK_EXISTS=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
    "$PORTAINER_URL/api/stacks" | \
    jq -r ".[] | select(.Name == \"$STACK_NAME\") | .Id" || echo "")

if [ -n "$STACK_EXISTS" ]; then
    echo "기존 스택 업데이트 중 (ID: $STACK_EXISTS)..."

    # 스택 업데이트
    UPDATE_RESPONSE=$(curl -s -X PUT \
        -H "X-API-Key: $PORTAINER_TOKEN" \
        -H "Content-Type: application/json" \
        "$PORTAINER_URL/api/stacks/$STACK_EXISTS?endpointId=$ENDPOINT_ID" \
        -d @- <<EOF
{
    "StackFileContent": $(echo "$COMPOSE_CONTENT" | jq -Rs .),
    "Prune": false
}
EOF
    )

    if echo "$UPDATE_RESPONSE" | grep -q "Id"; then
        echo -e "${GREEN}✓ 스택 업데이트 성공!${NC}"
    else
        echo -e "${RED}❌ 스택 업데이트 실패: $UPDATE_RESPONSE${NC}"
        exit 1
    fi
else
    echo "새 스택 생성 중..."

    # 새 스택 생성
    CREATE_RESPONSE=$(curl -s -X POST \
        -H "X-API-Key: $PORTAINER_TOKEN" \
        -H "Content-Type: application/json" \
        "$PORTAINER_URL/api/stacks?type=2&method=string&endpointId=$ENDPOINT_ID" \
        -d @- <<EOF
{
    "Name": "$STACK_NAME",
    "StackFileContent": $(echo "$COMPOSE_CONTENT" | jq -Rs .)
}
EOF
    )

    if echo "$CREATE_RESPONSE" | grep -q "Id"; then
        NEW_ID=$(echo "$CREATE_RESPONSE" | jq -r '.Id')
        echo -e "${GREEN}✓ 스택 생성 성공! (ID: $NEW_ID)${NC}"
    else
        echo -e "${RED}❌ 스택 생성 실패: $CREATE_RESPONSE${NC}"
        exit 1
    fi
fi

# 5. 헬스체크
echo
echo -e "${YELLOW}헬스체크 실행 중...${NC}"
sleep 10

# 컨테이너 상태 확인
echo "컨테이너 상태:"
curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
    "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json" | \
    jq -r '.[] | select(.Names[] | contains("safework")) | "\(.Names[0]): \(.State)"'

# 애플리케이션 헬스체크
echo
echo "애플리케이션 상태:"
if curl -s https://safework.jclee.me/health | jq .; then
    echo -e "${GREEN}✓ SafeWork 정상 작동 중!${NC}"
else
    echo -e "${YELLOW}⚠ 애플리케이션이 아직 시작 중입니다...${NC}"
fi

echo
echo -e "${GREEN}=== 스택 배포 완료 ===${NC}"
echo "URL: https://safework.jclee.me"
echo "Portainer: https://portainer.jclee.me"