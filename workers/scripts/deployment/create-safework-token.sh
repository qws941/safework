#!/bin/bash

echo "🔑 SafeWork 전용 Cloudflare API 토큰 생성 스크립트"
echo "=================================================="
echo ""

# 기존 토큰 확인
EXISTING_TOKEN="tSkF6AcuybaS_SJe2YwTcWv9eeeK0Dao19w76bUT"

echo "1️⃣ 기존 토큰으로 계정 정보 확인 중..."

# 계정 ID 확인
ACCOUNT_INFO=$(curl -s -H "Authorization: Bearer $EXISTING_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts")

echo "   응답: $(echo $ACCOUNT_INFO | jq -r '.success // "failed"')"

if echo "$ACCOUNT_INFO" | jq -e '.success' > /dev/null 2>&1; then
    ACCOUNT_ID=$(echo $ACCOUNT_INFO | jq -r '.result[0].id')
    ACCOUNT_NAME=$(echo $ACCOUNT_INFO | jq -r '.result[0].name')
    echo "   ✅ 계정 확인: $ACCOUNT_NAME (ID: $ACCOUNT_ID)"
else
    echo "   ❌ 기존 토큰으로 계정 정보 조회 실패"
    echo "   오류: $(echo $ACCOUNT_INFO | jq -r '.errors[0].message // "Unknown error"')"
    echo ""
    echo "🔧 대안 방법:"
    echo "1. Cloudflare Dashboard에서 수동으로 토큰 생성"
    echo "2. https://dash.cloudflare.com/profile/api-tokens"
    echo "3. 'Create Token' > 'Custom token'"
    echo "4. 다음 권한 설정:"
    echo "   - Zone:Zone:Read"
    echo "   - Zone:Page Rules:Edit"
    echo "   - Account:Cloudflare Workers:Edit"
    echo "   - Account:Account:Read"
    echo "5. Account Resources: Include All accounts"
    echo "6. Zone Resources: Include All zones"
    exit 1
fi

echo ""
echo "2️⃣ SafeWork 전용 토큰 생성 중..."

# 새 토큰 생성을 위한 페이로드
TOKEN_PAYLOAD=$(cat <<EOF
{
  "name": "SafeWork-Workers-Token-$(date +%Y%m%d-%H%M%S)",
  "policies": [
    {
      "effect": "allow",
      "resources": {
        "com.cloudflare.api.account.$ACCOUNT_ID": "*"
      },
      "permission_groups": [
        {
          "id": "c8fed203ed3043cba015a93ad1616f1f",
          "name": "Zone:Zone:Read"
        },
        {
          "id": "ed07f6c337da4607a5a1b01396be4b04",
          "name": "Zone:Page Rules:Edit"
        },
        {
          "id": "f7f0ced18f4e4b9bbc2eeaf5b8456161",
          "name": "Account:Cloudflare Workers:Edit"
        },
        {
          "id": "05dd72a6e4924877b79d531a3b6b9a01",
          "name": "Account:Account:Read"
        }
      ]
    }
  ],
  "condition": {
    "request.ip": {
      "is_not_in": []
    }
  },
  "ttl": 315360000
}
EOF
)

# API 토큰 생성 요청
TOKEN_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $EXISTING_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$TOKEN_PAYLOAD" \
  "https://api.cloudflare.com/client/v4/user/tokens")

echo "   토큰 생성 응답: $(echo $TOKEN_RESPONSE | jq -r '.success // "failed"')"

if echo "$TOKEN_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
    NEW_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.result.value')
    TOKEN_ID=$(echo $TOKEN_RESPONSE | jq -r '.result.id')

    echo "   ✅ 새 토큰 생성 성공!"
    echo "   Token ID: $TOKEN_ID"
    echo ""
    echo "🎉 SafeWork 전용 토큰 생성 완료!"
    echo "=================================================="
    echo "새 토큰: $NEW_TOKEN"
    echo "=================================================="
    echo ""
    echo "🔧 사용 방법:"
    echo "1. GitHub Secrets 설정:"
    echo "   - https://github.com/qws941/safework/settings/secrets/actions"
    echo "   - Name: CLOUDFLARE_API_TOKEN"
    echo "   - Value: $NEW_TOKEN"
    echo ""
    echo "2. 수동 배포:"
    echo "   export CLOUDFLARE_API_TOKEN='$NEW_TOKEN'"
    echo "   ./complete-deployment.sh"
    echo ""
    echo "3. 토큰 테스트:"
    echo "   export CLOUDFLARE_API_TOKEN='$NEW_TOKEN'"
    echo "   npx wrangler@latest deploy --env='' --compatibility-date 2024-01-01"
    echo ""

    # DB에 토큰 저장 (선택사항)
    echo "💾 DB에 토큰 정보 저장 중..."
    psql -h localhost -U metamcp_user -d metamcp_db -c \
      "INSERT INTO api_keys (name, key, user_id) VALUES ('SafeWork-CF-Workers-$(date +%Y%m%d)', '$NEW_TOKEN', 'system');" \
      2>/dev/null && echo "   ✅ DB 저장 완료" || echo "   ⚠️ DB 저장 실패 (선택사항)"

else
    echo "   ❌ 토큰 생성 실패"
    echo "   오류: $(echo $TOKEN_RESPONSE | jq -r '.errors[0].message // "Unknown error"')"
    echo ""
    echo "🔧 수동 생성 방법:"
    echo "1. https://dash.cloudflare.com/profile/api-tokens"
    echo "2. 'Create Token' 클릭"
    echo "3. 'Custom token' 선택"
    echo "4. Token name: SafeWork-Workers-Token"
    echo "5. Permissions:"
    echo "   - Account | Cloudflare Workers:Edit | All accounts"
    echo "   - Zone | Zone:Read | All zones"
    echo "   - Account | Account:Read | All accounts"
    echo "6. Account Resources: Include All accounts"
    echo "7. Zone Resources: Include All zones"
    echo "8. Continue to summary > Create Token"
    exit 1
fi

echo ""
echo "🚀 다음 단계: GitHub Secrets 설정 후 배포 실행"
echo "   ./complete-deployment.sh 또는 git push로 자동 배포"