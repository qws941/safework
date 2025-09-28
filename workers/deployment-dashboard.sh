#!/bin/bash

# SafeWork 배포 대시보드 - 종합 상태 모니터링

clear
echo "📊 SafeWork 배포 검증 대시보드"
echo "================================="
echo "$(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 1. GitHub Actions 파이프라인 상태
echo -e "${CYAN}📦 GitHub Actions 파이프라인 상태:${NC}"
echo "--------------------------------"

# 최근 3개 워크플로우 실행 상태
WORKFLOWS=$(curl -s "https://api.github.com/repos/qws941/safework/actions/runs?per_page=3" | \
    jq -r '.workflow_runs[] | "\(.name)|\(.status)|\(.conclusion)|\(.created_at)"')

while IFS='|' read -r name status conclusion created_at; do
    # 상태 아이콘
    if [ "$status" = "in_progress" ]; then
        STATUS_ICON="🔄"
        STATUS_COLOR="${YELLOW}"
    elif [ "$conclusion" = "success" ]; then
        STATUS_ICON="✅"
        STATUS_COLOR="${GREEN}"
    elif [ "$conclusion" = "failure" ]; then
        STATUS_ICON="❌"
        STATUS_COLOR="${RED}"
    else
        STATUS_ICON="⏸️"
        STATUS_COLOR="${NC}"
    fi

    # 시간 형식 정리
    TIME=$(echo "$created_at" | cut -d'T' -f2 | cut -d'Z' -f1)

    # 이름 단축
    SHORT_NAME=$(echo "$name" | sed 's/SafeWork //' | cut -c1-30)

    echo -e "${STATUS_ICON} ${STATUS_COLOR}${SHORT_NAME}${NC}"
    echo -e "   상태: ${status} | 결과: ${conclusion}"
    echo -e "   시작: ${TIME}"
    echo ""
done <<< "$WORKFLOWS"

# 2. 프로덕션 엔드포인트 상태
echo -e "${CYAN}🌐 프로덕션 엔드포인트 상태:${NC}"
echo "--------------------------------"

# 002 관리자 대시보드 체크
echo -n "002 관리자 대시보드: "
RESPONSE_002=$(curl -s "https://safework.jclee.me/survey/002_musculoskeletal_symptom_program")
if echo "$RESPONSE_002" | grep -q "관리자\|대시보드\|Dashboard\|Admin"; then
    echo -e "${GREEN}✅ 신버전 (관리자 대시보드)${NC}"
else
    echo -e "${RED}❌ 구버전 (유해요인조사)${NC}"
fi

# 001 사용자 설문 체크
echo -n "001 사용자 설문:     "
RESPONSE_001=$(curl -s "https://safework.jclee.me/survey/001_musculoskeletal_symptom_survey")
if echo "$RESPONSE_001" | grep -q "근골격계 증상조사표"; then
    echo -e "${GREEN}✅ 정상${NC}"
else
    echo -e "${YELLOW}⚠️ 확인 필요${NC}"
fi

# Health Check
echo -n "Health Check:        "
HEALTH=$(curl -s -w "\n%{http_code}" "https://safework.jclee.me/health" | tail -n 1)
if [ "$HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ 정상 (200)${NC}"
else
    echo -e "${RED}❌ 비정상 ($HEALTH)${NC}"
fi

# 3. 현재 타이틀 확인
echo ""
echo -e "${CYAN}📝 현재 002 페이지 타이틀:${NC}"
echo "--------------------------------"
CURRENT_TITLE=$(echo "$RESPONSE_002" | grep -E "<title>" | head -1 | sed 's/.*<title>//;s/<\/title>.*//')
echo "$CURRENT_TITLE"

# 4. 배포 성공 판정
echo ""
echo -e "${CYAN}📊 최종 판정:${NC}"
echo "================================="

if echo "$RESPONSE_002" | grep -q "관리자\|대시보드"; then
    echo -e "${GREEN}✅✅✅ 배포 성공! 완벽 성공 달성! ✅✅✅${NC}"
    echo "002가 관리자 대시보드로 성공적으로 변경되었습니다!"
    echo ""
    echo "🎉 축하합니다! 목표 달성! 🎉"
else
    echo -e "${YELLOW}⏳ 배포 대기 중...${NC}"
    echo "002가 아직 구 버전을 표시하고 있습니다."
    echo ""
    echo "💡 다음 단계:"
    echo "1. GitHub Actions 재실행: https://github.com/qws941/safework/actions"
    echo "2. 연속 모니터링 실행: ./continuous-monitor.sh"
    echo "3. 수동 배포: Cloudflare 대시보드 접속"
fi

echo ""
echo "================================="
echo "다시 확인: ./deployment-dashboard.sh"
echo "연속 모니터링: ./continuous-monitor.sh"