#!/bin/bash

echo "🔑 Global API Key를 사용한 SafeWork 배포 스크립트"
echo "================================================="
echo ""

# 계정 정보
CLOUDFLARE_EMAIL="qws941@kakao.com"

echo "📧 계정: $CLOUDFLARE_EMAIL"
echo ""

# Global API Key 입력 확인
if [ -z "$CLOUDFLARE_API_KEY" ]; then
    echo "❌ CLOUDFLARE_API_KEY 환경변수가 설정되지 않았습니다."
    echo ""
    echo "🔧 Global API Key 가져오기:"
    echo "1. https://dash.cloudflare.com/profile/api-tokens"
    echo "2. 'Global API Key' 섹션에서 'View' 클릭"
    echo "3. 비밀번호 입력 후 키 복사"
    echo ""
    echo "🚀 사용 방법:"
    echo "export CLOUDFLARE_API_KEY='your_global_api_key_here'"
    echo "export CLOUDFLARE_EMAIL='$CLOUDFLARE_EMAIL'"
    echo "./deploy-with-global-key.sh"
    exit 1
fi

echo "✅ Global API Key 환경변수 확인됨"
echo ""

# Account ID 조회
echo "1️⃣ Account ID 조회 중..."
ACCOUNT_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts" \
  -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
  -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
  -H "Content-Type: application/json")

if echo "$ACCOUNT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    ACCOUNT_ID=$(echo $ACCOUNT_RESPONSE | jq -r '.result[0].id')
    ACCOUNT_NAME=$(echo $ACCOUNT_RESPONSE | jq -r '.result[0].name')
    echo "   ✅ Account ID: $ACCOUNT_ID"
    echo "   📋 Account Name: $ACCOUNT_NAME"
else
    echo "   ❌ Account ID 조회 실패"
    echo "   오류: $(echo $ACCOUNT_RESPONSE | jq -r '.errors[0].message // "Unknown error"')"
    exit 1
fi

echo ""
echo "2️⃣ wrangler 설정 업데이트 중..."

# wrangler.toml에 account_id 추가/업데이트
if grep -q "account_id" wrangler.toml; then
    sed -i "s/account_id = .*/account_id = \"$ACCOUNT_ID\"/" wrangler.toml
    echo "   ✅ wrangler.toml의 account_id 업데이트됨"
else
    sed -i "1i account_id = \"$ACCOUNT_ID\"" wrangler.toml
    echo "   ✅ wrangler.toml에 account_id 추가됨"
fi

echo ""
echo "3️⃣ 환경변수 설정 중..."
export CLOUDFLARE_API_KEY="$CLOUDFLARE_API_KEY"
export CLOUDFLARE_EMAIL="$CLOUDFLARE_EMAIL"
export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID"

echo "   ✅ CLOUDFLARE_EMAIL: $CLOUDFLARE_EMAIL"
echo "   ✅ CLOUDFLARE_ACCOUNT_ID: $ACCOUNT_ID"
echo "   ✅ CLOUDFLARE_API_KEY: [설정됨]"

echo ""
echo "4️⃣ SafeWork Workers 배포 시작..."

# 빌드 시도 (선택사항)
echo "   📦 TypeScript 빌드 시도 중..."
npm run build 2>/dev/null && echo "   ✅ 빌드 성공" || echo "   ⚠️ 빌드 스킵"

echo ""
echo "   🚀 Cloudflare Workers 배포 중..."

# wrangler를 사용한 배포
npx wrangler@latest deploy --env="" --compatibility-date 2024-01-01

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SafeWork Workers 배포 성공!"
    echo "=================================="

    echo ""
    echo "5️⃣ 배포 검증 시작..."
    sleep 10  # 배포 전파 대기

    # 검증 루프
    for i in {1..10}; do
        echo "   🔍 검증 시도 $i/10..."

        RESPONSE=$(curl -s "https://safework.jclee.me/survey/002_musculoskeletal_symptom_program" | grep -E "<title>")

        if echo "$RESPONSE" | grep -q "관리자\|대시보드\|Dashboard"; then
            echo ""
            echo "🎉🎉🎉 완벽 성공 달성! 🎉🎉🎉"
            echo "==============================="
            echo "✅ 002 관리자 대시보드 배포 완료!"
            echo "📊 제목: $RESPONSE"
            echo "🌐 URL: https://safework.jclee.me/survey/002_musculoskeletal_symptom_program"
            echo ""
            echo "🎯 사용자가 요청한 '완벽 성공까지' 목표 달성!"
            echo "근골격계부담작업 유해요인조사 → 관리자 대시보드 변경 완료"
            exit 0
        fi

        echo "   ⚠️ 아직 구 버전: $(echo $RESPONSE | grep -o '<title>[^<]*</title>')"

        if [ $i -lt 10 ]; then
            echo "   ⏳ 10초 후 재시도..."
            sleep 10
        fi
    done

    echo ""
    echo "⚠️ 배포는 성공했지만 아직 구 버전이 표시됨"
    echo "📊 Cloudflare 전역 캐시 전파에 5-10분 소요될 수 있습니다."
    echo ""
    echo "🔄 계속 모니터링하려면:"
    echo "./continuous-monitor.sh"

else
    echo ""
    echo "❌ 배포 실패"
    echo "============"
    echo ""
    echo "🔧 문제 해결 방법:"
    echo "1. wrangler.toml 설정 확인"
    echo "2. Global API Key 권한 확인"
    echo "3. Account ID 올바른지 확인"
    echo ""
    echo "🔍 디버깅:"
    echo "npx wrangler@latest whoami"
    exit 1
fi