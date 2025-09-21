#!/bin/bash
# SafeWork 간단한 헬스체크 스크립트

echo "🏥 SafeWork 시스템 헬스체크"
echo "=========================="
echo "시간: $(date '+%Y-%m-%d %H:%M:%S KST')"
echo

# 1. 애플리케이션 상태
echo "1. 애플리케이션 상태:"
if curl -s https://safework.jclee.me/health > /dev/null; then
    echo "   ✅ 정상 (https://safework.jclee.me)"
else
    echo "   ❌ 오류"
fi

# 2. API 기능 테스트
echo "2. API 기능 테스트:"
if curl -s -X POST https://safework.jclee.me/survey/api/submit \
    -H "Content-Type: application/json" \
    -d '{"form_type":"001","name":"헬스체크","age":1}' | grep -q "success"; then
    echo "   ✅ 정상 (데이터베이스 연결 OK)"
else
    echo "   ❌ 오류"
fi

# 3. 스택 상태 (Portainer)
echo "3. Portainer 스택 상태:"
if curl -s -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
    "https://portainer.jclee.me/api/stacks/43" | grep -q '"Status":1'; then
    echo "   ✅ 정상 (스택 활성화)"
else
    echo "   ❌ 오류"
fi

echo
echo "=========================="
echo "헬스체크 완료"