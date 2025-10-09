#!/bin/bash
# SafeWork Cloudflare Workers 자동 배포 스크립트
# Auto-deployment script for SafeWork Workers

set -e  # 에러 발생 시 즉시 중단

echo "🚀 SafeWork Workers 배포 시작..."
echo "================================"

# 현재 디렉토리 확인
if [ ! -f "wrangler.toml" ]; then
  echo "❌ 오류: wrangler.toml 파일을 찾을 수 없습니다."
  echo "   올바른 디렉토리에서 실행해주세요."
  exit 1
fi

# 1. Dependencies 확인 및 설치
echo ""
echo "📦 1단계: Dependencies 확인 중..."
if [ ! -d "node_modules" ]; then
  echo "   ⏳ node_modules가 없습니다. 설치 중..."
  npm install
else
  echo "   ✅ node_modules 존재"
fi

# 2. TypeScript 빌드
echo ""
echo "🔨 2단계: TypeScript 빌드 중..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ 빌드 실패"
  exit 1
fi
echo "   ✅ 빌드 완료"

# 3. Cloudflare 인증 확인
echo ""
echo "🔐 3단계: Cloudflare 인증 확인 중..."

# wrangler whoami 실행 (인증 확인)
if npx wrangler whoami &>/dev/null; then
  echo "   ✅ Cloudflare 인증 완료"
  AUTHENTICATED=true
else
  echo "   ⚠️  Cloudflare 인증 필요"
  AUTHENTICATED=false
fi

# 4. 배포 실행
echo ""
echo "☁️  4단계: Cloudflare Workers 배포 중..."

if [ "$AUTHENTICATED" = true ]; then
  # 인증된 경우 바로 배포
  npx wrangler deploy --env production

  if [ $? -eq 0 ]; then
    echo ""
    echo "================================"
    echo "✅ 배포 성공!"
    echo "================================"
    echo ""
    echo "🌐 서비스 URL: https://safework.jclee.me"
    echo ""
    echo "📋 배포된 API 엔드포인트:"
    echo "   - Form 001: https://safework.jclee.me/api/form/001/*"
    echo "   - Form 002: https://safework.jclee.me/api/form/002/*"
    echo "   - Form 003: https://safework.jclee.me/api/form/003/*"
    echo "   - Form 004: https://safework.jclee.me/api/form/004/*"
    echo "   - Form 005: https://safework.jclee.me/api/form/005/*"
    echo "   - Form 006: https://safework.jclee.me/api/form/006/*"
    echo ""
    echo "🔍 배포 확인: https://dash.cloudflare.com"
    echo ""
  else
    echo "❌ 배포 실패"
    exit 1
  fi
else
  # 인증되지 않은 경우 안내
  echo ""
  echo "================================"
  echo "⚠️  인증 필요"
  echo "================================"
  echo ""
  echo "다음 명령어를 실행하여 Cloudflare에 로그인하세요:"
  echo ""
  echo "  npx wrangler login"
  echo ""
  echo "로그인 후 다시 이 스크립트를 실행하세요:"
  echo ""
  echo "  ./deploy.sh"
  echo ""
  echo "또는 API 토큰을 사용하려면:"
  echo ""
  echo "  export CLOUDFLARE_API_TOKEN='your_token_here'"
  echo "  ./deploy.sh"
  echo ""
  exit 1
fi
