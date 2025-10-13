#!/bin/bash

# SafeWork Cloudflare Workers 배포 검증 자동화 스크립트
# 목적: 002가 관리자 대시보드로 변경되었는지 자동 검증

echo "🔍 SafeWork 배포 검증 시작..."
echo "================================="

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 검증 대상
TARGET_URL="https://safework.jclee.me/survey/002_musculoskeletal_symptom_program"
SUCCESS_KEYWORDS=("관리자" "대시보드" "Dashboard" "Admin" "설문 결과 목록")
FAILURE_KEYWORDS=("근골격계부담작업" "유해요인조사" "Musculoskeletal Disorder Risk Assessment")

# 타임스탬프
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# 1. 현재 프로덕션 상태 확인
echo "🔍 프로덕션 상태 확인 중..."
RESPONSE=$(curl -s "$TARGET_URL")

# 2. 성공 키워드 검증
SUCCESS_COUNT=0
echo ""
echo "✅ 성공 지표 검증:"
for keyword in "${SUCCESS_KEYWORDS[@]}"; do
    if echo "$RESPONSE" | grep -q "$keyword"; then
        echo -e "${GREEN}  ✓ '$keyword' 발견됨${NC}"
        ((SUCCESS_COUNT++))
    else
        echo -e "${RED}  ✗ '$keyword' 없음${NC}"
    fi
done

# 3. 실패 키워드 검증
FAILURE_COUNT=0
echo ""
echo "❌ 구 버전 지표 검증:"
for keyword in "${FAILURE_KEYWORDS[@]}"; do
    if echo "$RESPONSE" | grep -q "$keyword"; then
        echo -e "${RED}  ✓ 구 버전 키워드 '$keyword' 여전히 존재${NC}"
        ((FAILURE_COUNT++))
    else
        echo -e "${GREEN}  ✗ 구 버전 키워드 '$keyword' 제거됨${NC}"
    fi
done

# 4. 최종 판정
echo ""
echo "================================="
echo "📊 배포 검증 결과 ($TIMESTAMP)"
echo "================================="

if [ $SUCCESS_COUNT -gt 0 ] && [ $FAILURE_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ 배포 성공!${NC}"
    echo "002가 관리자 대시보드로 성공적으로 변경되었습니다!"
    echo ""
    echo "🎯 완벽 성공 달성!"

    # 성공 알림 (시스템 알림)
    echo "🔔 배포 성공 알림 전송..."

    # 성공 로그 기록
    echo "[$TIMESTAMP] DEPLOYMENT SUCCESS - 002 Admin Dashboard Active" >> deployment-success.log

    exit 0
else
    echo -e "${RED}❌ 배포 실패 또는 미완료${NC}"
    echo "002가 여전히 구 버전을 표시하고 있습니다."
    echo ""
    echo "현재 타이틀:"
    echo "$RESPONSE" | grep -E "<title>" | head -1
    echo ""
    echo "다음 시도 방법:"
    echo "1. GitHub Actions 재실행"
    echo "2. Cloudflare 대시보드 수동 배포"
    echo "3. wrangler CLI 직접 사용"

    # 실패 로그 기록
    echo "[$TIMESTAMP] DEPLOYMENT PENDING - Old template still active" >> deployment-failure.log

    exit 1
fi