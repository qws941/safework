#!/bin/bash
# SafeWork 프로덕션 실행 스크립트 (Watchtower 자동 업데이트 포함)

# 네트워크 생성
docker network create safework-net 2>/dev/null || true

# 1. MySQL 실행
docker run -d \
  --name safework-mysql \
  --network safework-net \
  --restart unless-stopped \
  -v safework-mysql-data:/var/lib/mysql \
  -p 3307:3306 \
  registry.jclee.me/safework/mysql:latest

# 2. Redis 실행
docker run -d \
  --name safework-redis \
  --network safework-net \
  --restart unless-stopped \
  -v safework-redis-data:/data \
  -p 6380:6379 \
  registry.jclee.me/safework/redis:latest

# MySQL이 준비될 때까지 대기
echo "Waiting for MySQL to be ready..."
sleep 30

# 3. App 실행 (포트 4545)
docker run -d \
  --name safework-app \
  --network safework-net \
  --restart unless-stopped \
  -v safework-uploads:/app/uploads \
  -p 4545:4545 \
  registry.jclee.me/safework/app:latest

# 4. Watchtower 실행 (자동 업데이트)
docker run -d \
  --name safework-watchtower \
  --restart unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  --interval 300 \
  --label-enable \
  safework-app safework-mysql safework-redis

echo "✅ SafeWork 서비스가 시작되었습니다!"
echo ""
echo "접속 주소: http://localhost:4545"
echo "관리자 계정: admin / safework2024"
echo ""
echo "컨테이너 상태:"
docker ps | grep safework