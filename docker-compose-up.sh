#!/bin/bash
# SafeWork Docker Compose 시작 스크립트

echo "🚀 SafeWork 시스템을 시작합니다..."
echo ""

# .env 파일 확인
if [ ! -f .env ]; then
    echo "⚠️  .env 파일이 없습니다. .env.example을 복사하여 .env를 생성하세요."
    echo "   cp .env.example .env"
    echo ""
fi

# Docker Compose로 서비스 시작
docker-compose up -d

echo ""
echo "⏳ 서비스가 시작되는 동안 잠시 기다려주세요..."
sleep 30

echo ""
echo "📋 서비스 상태 확인:"
docker-compose ps

echo ""
echo "🔍 애플리케이션 상태 확인:"
curl -s http://localhost:4545/health | jq . 2>/dev/null || curl -s http://localhost:4545/health

echo ""
echo "✅ SafeWork 서비스가 시작되었습니다!"
echo ""
echo "🌐 접속 주소: http://localhost:4545"
echo "👤 관리자 계정: admin / safework2024"
echo ""
echo "📊 관리자 대시보드: http://localhost:4545/auth/login (관리자 로그인 후)"
echo "📝 조사표 작성: http://localhost:4545/survey/new"
echo ""
echo "🔧 로그 확인: docker-compose logs -f [서비스명]"
echo "🛑 중지: docker-compose down"