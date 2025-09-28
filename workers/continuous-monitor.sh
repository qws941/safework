#!/bin/bash

# 연속 배포 모니터링 및 자동 검증 시스템
# 5초마다 체크하여 변경사항 감지

echo "🔄 연속 배포 모니터링 시작..."
echo "================================="
echo "5초마다 프로덕션 상태를 확인합니다."
echo "Ctrl+C로 중지할 수 있습니다."
echo ""

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 카운터
CHECK_COUNT=0
SUCCESS_DETECTED=false

# 모니터링 루프
while true; do
    ((CHECK_COUNT++))
    TIMESTAMP=$(date '+%H:%M:%S')

    # 간단한 체크 (타이틀만)
    TITLE=$(curl -s "https://safework.jclee.me/survey/002_musculoskeletal_symptom_program" | grep -E "<title>" | head -1)

    # 진행 표시
    echo -ne "\r${BLUE}[$TIMESTAMP] 체크 #$CHECK_COUNT:${NC} "

    # 성공 감지
    if echo "$TITLE" | grep -q "관리자\|대시보드\|Dashboard\|Admin"; then
        echo -e "\n${GREEN}✅ 배포 성공 감지!!!${NC}"
        echo "변경된 타이틀: $TITLE"
        echo ""
        echo "🎉🎉🎉 완벽 성공 달성! 🎉🎉🎉"
        echo "002가 관리자 대시보드로 성공적으로 변경되었습니다!"

        # 성공 알림음 (가능한 경우)
        echo -e "\a\a\a"  # 비프음 3번

        # 성공 로그
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] DEPLOYMENT SUCCESS DETECTED" >> deployment-monitor.log

        # 상세 검증 실행
        ./deployment-verify.sh

        SUCCESS_DETECTED=true
        break
    else
        # 여전히 구 버전
        if echo "$TITLE" | grep -q "근골격계부담작업"; then
            echo -ne "구 버전 유지 중... "
        else
            echo -ne "${YELLOW}알 수 없는 상태${NC} "
        fi
    fi

    # 5초 대기
    sleep 5
done

# 모니터링 종료
if [ "$SUCCESS_DETECTED" = true ]; then
    echo ""
    echo "================================="
    echo "모니터링 성공적으로 완료"
    exit 0
else
    echo ""
    echo "모니터링 중지됨"
    exit 1
fi