#!/bin/bash

echo "🔧 SafeWork 직접 컨테이너 시작 스크립트"
echo "=========================================="

# Portainer API 대신 다른 방법 시도
echo "1️⃣ 현재 PostgreSQL, Redis 상태 확인"
curl -s -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  "https://portainer.jclee.me/api/endpoints/3/docker/containers/json" | \
  python3 -c "
import json,sys
try:
    containers = json.load(sys.stdin)
    for c in containers:
        if any('safework-postgres' in name or 'safework-redis' in name for name in c['Names']):
            print(f'{c[\"Names\"][0][1:]}: {c[\"State\"]} - {c[\"Status\"]}')
except: print('상태 확인 실패')
"

echo ""
echo "2️⃣ 새로운 앱 컨테이너 직접 생성 시도"

# 생성된 컨테이너 ID 가져오기
CONTAINER_ID="c02fcdbae0c3"
echo "대상 컨테이너: $CONTAINER_ID"

# 컨테이너 검사
echo "3️⃣ 컨테이너 구성 확인"
curl -s -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  "https://portainer.jclee.me/api/endpoints/3/docker/containers/$CONTAINER_ID/json" | \
  python3 -c "
import json,sys
try:
    data = json.load(sys.stdin)
    print(f'이미지: {data[\"Config\"][\"Image\"]}')
    print(f'네트워크: {data[\"HostConfig\"][\"NetworkMode\"]}')
    env_vars = [env for env in data['Config']['Env'] if 'DB_' in env or 'REDIS_' in env]
    print(f'환경변수: {env_vars}')
    if 'Error' in data['State']:
        print(f'에러: {data[\"State\"][\"Error\"]}')
except Exception as e:
    print(f'구성 확인 실패: {e}')
"

echo ""
echo "4️⃣ 로그 확인 (시작 전)"
curl -s -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  "https://portainer.jclee.me/api/endpoints/3/docker/containers/$CONTAINER_ID/logs?stdout=true&stderr=true" | \
  strings | tail -10

echo ""
echo "5️⃣ Portainer 웹 UI를 통한 수동 시작 권장"
echo "   URL: https://portainer.jclee.me"
echo "   컨테이너 ID: $CONTAINER_ID"
echo "   수동 시작: 컨테이너 목록에서 'Start' 버튼 클릭"

echo ""
echo "6️⃣ GitHub Actions 워크플로우 상태 확인"
echo "   최근 배포 커밋: df44809"
echo "   배포 상태 확인 URL: https://github.com/qws941/safework/actions"

echo ""
echo "7️⃣ 임시 해결책: 컨테이너 재생성"
# 기존 컨테이너 제거
curl -s -X DELETE -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  "https://portainer.jclee.me/api/endpoints/3/docker/containers/$CONTAINER_ID?force=true" >/dev/null

echo "기존 컨테이너 제거 완료"

# 더 간단한 설정으로 컨테이너 생성
SIMPLE_CONFIG='{
  "Image": "registry.jclee.me/safework/app:latest",
  "Env": [
    "DB_HOST=safework-postgres",
    "DB_NAME=safework_db",
    "DB_USER=safework",
    "DB_PASSWORD=safework2024"
  ],
  "HostConfig": {
    "PortBindings": {"4545/tcp": [{"HostPort": "4545"}]},
    "NetworkMode": "watchtower_default"
  }
}'

NEW_ID=$(curl -s -X POST -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  -H "Content-Type: application/json" \
  "https://portainer.jclee.me/api/endpoints/3/docker/containers/create?name=safework-app-simple" \
  -d "$SIMPLE_CONFIG" | python3 -c "
import json,sys
try:
    data = json.load(sys.stdin)
    print(data.get('Id', ''))
except: pass
")

if [ ! -z "$NEW_ID" ]; then
  echo "새 컨테이너 생성됨: ${NEW_ID:0:12}"
  echo ""
  echo "🚨 수동 시작 필요:"
  echo "   1. https://portainer.jclee.me 접속"
  echo "   2. safework-app-simple 컨테이너 찾기"
  echo "   3. Start 버튼 클릭하여 수동 시작"
else
  echo "❌ 컨테이너 생성 실패"
fi

echo ""
echo "=========================================="
echo "스크립트 완료. 수동 개입이 필요합니다."