#!/bin/bash
# SafeWork Docker Compose 중지 스크립트

echo "🛑 SafeWork 시스템을 중지합니다..."

# 서비스 중지 및 제거
docker-compose down

echo ""
echo "📋 정리된 컨테이너:"
docker ps -a | grep safework || echo "safework 관련 컨테이너가 없습니다."

echo ""
echo "💾 데이터 볼륨 (보존됨):"
docker volume ls | grep safework || echo "safework 관련 볼륨이 없습니다."

echo ""
echo "✅ SafeWork 서비스가 중지되었습니다!"
echo ""
echo "🔄 다시 시작하려면: ./docker-compose-up.sh"
echo "🗑️  데이터까지 완전 삭제: docker-compose down -v"