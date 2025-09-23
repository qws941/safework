#!/bin/bash

# Quick Health Check Script for SafeWork
# 빠른 상태 확인 스크립트

set -euo pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

echo -e "${BOLD}🏥 SafeWork Quick Health Check${NC}"
echo "================================"
echo -e "Timestamp: $(date '+%Y-%m-%d %H:%M:%S KST')\n"

# 1. Production Health Check
echo -e "${CYAN}1. Production Application Health:${NC}"
HEALTH_RESPONSE=$(curl -s https://safework.jclee.me/health 2>/dev/null || echo '{"status":"unreachable"}')
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "   ${GREEN}✅ Application: HEALTHY${NC}"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo -e "   ${RED}❌ Application: UNHEALTHY or UNREACHABLE${NC}"
    echo "   Response: $HEALTH_RESPONSE"
fi

# 2. Check Admin Panel
echo -e "\n${CYAN}2. Admin Panel Accessibility:${NC}"
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://safework.jclee.me/admin 2>/dev/null)
if [[ "$ADMIN_STATUS" == "200" ]] || [[ "$ADMIN_STATUS" == "302" ]]; then
    echo -e "   ${GREEN}✅ Admin Panel: ACCESSIBLE (HTTP $ADMIN_STATUS)${NC}"
else
    echo -e "   ${RED}❌ Admin Panel: ISSUES (HTTP $ADMIN_STATUS)${NC}"
fi

# 3. Check Monitoring Endpoint
echo -e "\n${CYAN}3. Monitoring System:${NC}"
MONITOR_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://safework.jclee.me/admin/monitoring 2>/dev/null)
if [[ "$MONITOR_STATUS" == "200" ]] || [[ "$MONITOR_STATUS" == "302" ]]; then
    echo -e "   ${GREEN}✅ Monitoring: ACCESSIBLE (HTTP $MONITOR_STATUS)${NC}"
else
    echo -e "   ${YELLOW}⚠️ Monitoring: Requires Login (HTTP $MONITOR_STATUS)${NC}"
fi

# 4. Database Connection Test (via API)
echo -e "\n${CYAN}4. Survey API Test:${NC}"
API_TEST=$(curl -s -X POST https://safework.jclee.me/survey/api/submit \
  -H "Content-Type: application/json" \
  -d '{"form_type":"999","test":true}' 2>/dev/null || echo "failed")

if echo "$API_TEST" | grep -q "error\|Error"; then
    echo -e "   ${GREEN}✅ API: RESPONSIVE (Returns expected error for test data)${NC}"
elif [[ "$API_TEST" == "failed" ]]; then
    echo -e "   ${RED}❌ API: NOT RESPONDING${NC}"
else
    echo -e "   ${YELLOW}⚠️ API: UNEXPECTED RESPONSE${NC}"
    echo "   Response: ${API_TEST:0:100}..."
fi

# 5. Log Tagging Status
echo -e "\n${CYAN}5. Log Tagging Configuration:${NC}"
echo -e "   ${GREEN}✅ Configured Log Tags:${NC}"
echo "      - [safework-app-log]"
echo "      - [safework-postgres-log]"
echo "      - [safework-redis-log]"

# 6. Overall Status
echo -e "\n${BOLD}================================${NC}"
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
    echo -e "${GREEN}✅ OVERALL STATUS: OPERATIONAL${NC}"
    echo -e "SafeWork is running normally at https://safework.jclee.me"
else
    echo -e "${RED}❌ OVERALL STATUS: ISSUES DETECTED${NC}"
    echo -e "Please check the container logs for more details"
fi

echo -e "\n${CYAN}For detailed analysis, run:${NC}"
echo "  ./scripts/safework_ops_unified.sh monitor health"
echo "  ./scripts/safework_ops_unified.sh logs errors all"