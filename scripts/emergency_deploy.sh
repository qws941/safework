#!/bin/bash

echo "🚨 SafeWork 긴급 배포 스크립트 실행"
echo "실행 시간: $(date)"
echo "=========================================="

# 1단계: 모든 기존 컨테이너 강제 제거
echo "1️⃣ 기존 SafeWork 앱 컨테이너 정리"
for container_id in $(curl -s -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  "https://portainer.jclee.me/api/endpoints/3/docker/containers/json?all=true" | \
  python3 -c "
import json,sys
try:
    containers = json.load(sys.stdin)
    app_containers = [c['Id'] for c in containers if any('safework-app' in name for name in c['Names'])]
    for cid in app_containers: print(cid)
except: pass
" 2>/dev/null); do
  if [ ! -z "$container_id" ]; then
    curl -s -X DELETE -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
      "https://portainer.jclee.me/api/endpoints/3/docker/containers/$container_id?force=true" >/dev/null
    echo "  삭제됨: $container_id"
  fi
done

sleep 5

# 2단계: 최신 이미지 pull
echo "2️⃣ 최신 이미지 가져오기"
curl -s -X POST -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  "https://portainer.jclee.me/api/endpoints/3/docker/images/create?fromImage=registry.jclee.me/safework/app&tag=latest" >/dev/null
echo "  이미지 pull 완료"

sleep 10

# 3단계: 새 컨테이너 생성 및 시작
echo "3️⃣ 새 SafeWork 앱 컨테이너 생성"
CONTAINER_CONFIG='{
  "Image": "registry.jclee.me/safework/app:latest",
  "Env": [
    "TZ=Asia/Seoul",
    "FLASK_CONFIG=production",
    "DB_HOST=safework-postgres",
    "DB_NAME=safework_db",
    "DB_USER=safework",
    "DB_PASSWORD=safework2024",
    "REDIS_HOST=safework-redis",
    "SECRET_KEY=safework-production-secret-key-2024"
  ],
  "Labels": {
    "com.centurylinklabs.watchtower.enable": "true"
  },
  "HostConfig": {
    "PortBindings": {"4545/tcp": [{"HostPort": "4545"}]},
    "NetworkMode": "watchtower_default",
    "RestartPolicy": {"Name": "unless-stopped"}
  }
}'

NEW_CONTAINER=$(curl -s -X POST -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  -H "Content-Type: application/json" \
  "https://portainer.jclee.me/api/endpoints/3/docker/containers/create?name=safework-app" \
  -d "$CONTAINER_CONFIG" | python3 -c "
import json,sys
try:
    data = json.load(sys.stdin)
    print(data.get('Id', ''))
except: pass
" 2>/dev/null)

if [ ! -z "$NEW_CONTAINER" ]; then
  echo "  컨테이너 생성됨: ${NEW_CONTAINER:0:12}"

  # 4단계: 컨테이너 시작 (여러 방법 시도)
  echo "4️⃣ 컨테이너 시작 시도"

  # 방법 1: 표준 API 호출
  START_RESPONSE=$(curl -s -X POST -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
    "https://portainer.jclee.me/api/endpoints/3/docker/containers/$NEW_CONTAINER/start" \
    -w "%{http_code}" -o /tmp/start_response.txt)

  echo "  시작 시도 결과: HTTP $START_RESPONSE"

  sleep 15

  # 5단계: 상태 확인
  echo "5️⃣ 컨테이너 상태 최종 확인"
  CONTAINER_STATUS=$(curl -s -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
    "https://portainer.jclee.me/api/endpoints/3/docker/containers/$NEW_CONTAINER/json" | \
    python3 -c "
import json,sys
try:
    data = json.load(sys.stdin)
    print(f'{data[\"State\"][\"Status\"]}|{data[\"State\"][\"Running\"]}')
except: print('unknown|false')
" 2>/dev/null)

  STATUS=$(echo $CONTAINER_STATUS | cut -d'|' -f1)
  RUNNING=$(echo $CONTAINER_STATUS | cut -d'|' -f2)

  echo "  컨테이너 상태: $STATUS (실행중: $RUNNING)"

  # 6단계: 서비스 테스트
  echo "6️⃣ 서비스 접근성 테스트"
  sleep 10

  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://safework.jclee.me/health")
  echo "  Health 엔드포인트: HTTP $HTTP_STATUS"

  if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo "✅ SafeWork 서비스 복구 성공!"
    echo "🔑 관리자 로그인: admin / safework2024"
  else
    echo "❌ 서비스가 아직 완전히 복구되지 않음 (HTTP $HTTP_STATUS)"
  fi

else
  echo "❌ 컨테이너 생성 실패"
fi

echo ""
echo "=========================================="
echo "긴급 배포 스크립트 완료: $(date)"