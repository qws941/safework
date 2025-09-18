#!/bin/bash

# SafeWork 간단한 운영환경 조회 스크립트
# Portainer API 기반 직접 조회

set -e

PORTAINER_URL="https://portainer.jclee.me"
PORTAINER_TOKEN="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
ENDPOINT_ID="3"

echo "🔍 SafeWork 운영환경 컨테이너 상태 조회"
echo "================================================================================================"

# 1. 컨테이너 목록 조회
echo "📦 컨테이너 상태:"
curl -s -H "X-API-Key: ${PORTAINER_TOKEN}" \
    "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
    jq -r '.[] | select(.Names[] | contains("safework")) |
    "- " + .Names[0][1:] + " | 상태: " + .State + " | " + .Status + " | 이미지: " + .Image'

echo ""

# 2. PostgreSQL 컨테이너 ID 찾기
POSTGRES_ID=$(curl -s -H "X-API-Key: ${PORTAINER_TOKEN}" \
    "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
    jq -r '.[] | select(.Names[] | contains("safework-postgres")) | .Id')

echo "🗄️ PostgreSQL 컨테이너 ID: ${POSTGRES_ID:0:12}"
echo ""

if [ -n "$POSTGRES_ID" ]; then
    echo "📊 데이터베이스 간단 조회 테스트:"

    # 간단한 SQL 실행 테스트
    EXEC_RESPONSE=$(curl -s -X POST \
        -H "X-API-Key: ${PORTAINER_TOKEN}" \
        -H "Content-Type: application/json" \
        "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${POSTGRES_ID}/exec" \
        -d '{
            "Cmd": ["psql", "-U", "safework", "-d", "safework_db", "-c", "SELECT COUNT(*) FROM surveys;"],
            "AttachStdout": true,
            "AttachStderr": true
        }')

    EXEC_ID=$(echo "$EXEC_RESPONSE" | jq -r '.Id')
    echo "Exec ID: $EXEC_ID"

    if [ "$EXEC_ID" != "null" ] && [ -n "$EXEC_ID" ]; then
        echo "🔄 SQL 실행 중..."

        RESULT=$(curl -s -X POST \
            -H "X-API-Key: ${PORTAINER_TOKEN}" \
            -H "Content-Type: application/json" \
            "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/exec/${EXEC_ID}/start" \
            -d '{"Detach": false, "Tty": false}')

        echo "결과:"
        echo "$RESULT" | xxd | head -10  # 바이너리 내용 확인
        echo ""
        echo "텍스트 변환:"
        echo "$RESULT" | tr -d '\000-\037' | tr -d '\177-\377'  # 제어 문자 제거
    else
        echo "❌ Exec 생성 실패"
    fi
else
    echo "❌ PostgreSQL 컨테이너를 찾을 수 없습니다."
fi

echo ""
echo "🌐 웹 서비스 상태 확인:"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://safework.jclee.me/health" || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ https://safework.jclee.me/health - 정상 (HTTP $HTTP_STATUS)"
else
    echo "❌ https://safework.jclee.me/health - 오류 (HTTP $HTTP_STATUS)"
fi