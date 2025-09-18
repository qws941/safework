#!/bin/bash

# SafeWork 운영 컨테이너 로그 조회 스크립트
PORTAINER_URL="https://portainer.jclee.me"
PORTAINER_TOKEN="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
ENDPOINT_ID="3"

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 헤더 출력
print_header() {
    echo -e "${BLUE}🚀 SafeWork 운영 컨테이너 로그 조회 시스템${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo "📅 조회 시간: $(date '+%Y-%m-%d %H:%M:%S KST')"
    echo ""
}

# SafeWork 컨테이너 목록 조회
get_safework_containers() {
    echo -e "${YELLOW}🔍 SafeWork 컨테이너 검색 중...${NC}"

    CONTAINERS=$(curl -s -H "X-API-Key:${PORTAINER_TOKEN}" \
        "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
        jq -r '.[] | select(.Names[] | contains("safework")) | {
            id: .Id[0:12],
            name: .Names[0] | ltrimstr("/"),
            state: .State,
            status: .Status,
            image: .Image
        }')

    if [ -z "${CONTAINERS}" ] || [ "${CONTAINERS}" = "null" ]; then
        echo -e "${RED}❌ SafeWork 컨테이너를 찾을 수 없습니다${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ 발견된 SafeWork 컨테이너:${NC}"
    echo "${CONTAINERS}" | jq -r '"📦 " + .name + " (" + .state + ")"'
    echo ""
}

# 특정 컨테이너 로그 조회
get_container_logs() {
    local container_name=$1
    local lines=${2:-50}

    echo -e "${BLUE}📋 ${container_name} 로그 (최근 ${lines}줄):${NC}"
    echo "================================================"

    # 컨테이너 ID 조회
    CONTAINER_ID=$(curl -s -H "X-API-Key:${PORTAINER_TOKEN}" \
        "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
        jq -r --arg name "${container_name}" '.[] | select(.Names[] | contains($name)) | .Id')

    if [ -z "${CONTAINER_ID}" ] || [ "${CONTAINER_ID}" = "null" ]; then
        echo -e "${RED}❌ 컨테이너 '${container_name}'를 찾을 수 없습니다${NC}"
        return 1
    fi

    # 로그 조회
    LOGS=$(curl -s -H "X-API-Key:${PORTAINER_TOKEN}" \
        "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${CONTAINER_ID}/logs?stdout=true&stderr=true&tail=${lines}&timestamps=true")

    if [ $? -eq 0 ] && [ -n "${LOGS}" ]; then
        echo "${LOGS}" | head -n ${lines}
    else
        echo -e "${RED}❌ 로그 조회에 실패했습니다${NC}"
    fi

    echo ""
}

# 컨테이너 상태 상세 조회
get_container_status() {
    local container_name=$1

    echo -e "${BLUE}📊 ${container_name} 상태 정보:${NC}"
    echo "================================"

    CONTAINER_INFO=$(curl -s -H "X-API-Key:${PORTAINER_TOKEN}" \
        "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
        jq -r --arg name "${container_name}" '.[] | select(.Names[] | contains($name)) | {
            name: .Names[0] | ltrimstr("/"),
            state: .State,
            status: .Status,
            created: .Created,
            image: .Image,
            ports: .Ports
        }')

    if [ -n "${CONTAINER_INFO}" ] && [ "${CONTAINER_INFO}" != "null" ]; then
        echo "${CONTAINER_INFO}" | jq .
    else
        echo -e "${RED}❌ 컨테이너 정보를 조회할 수 없습니다${NC}"
    fi

    echo ""
}

# 에러 로그 필터링
get_error_logs() {
    local container_name=$1
    local lines=${2:-100}

    echo -e "${RED}🚨 ${container_name} 에러 로그 (최근 ${lines}줄에서 필터링):${NC}"
    echo "================================================"

    CONTAINER_ID=$(curl -s -H "X-API-Key:${PORTAINER_TOKEN}" \
        "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
        jq -r --arg name "${container_name}" '.[] | select(.Names[] | contains($name)) | .Id')

    if [ -z "${CONTAINER_ID}" ] || [ "${CONTAINER_ID}" = "null" ]; then
        echo -e "${RED}❌ 컨테이너를 찾을 수 없습니다${NC}"
        return 1
    fi

    LOGS=$(curl -s -H "X-API-Key:${PORTAINER_TOKEN}" \
        "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${CONTAINER_ID}/logs?stdout=true&stderr=true&tail=${lines}&timestamps=true")

    # 에러 패턴 필터링
    ERROR_LOGS=$(echo "${LOGS}" | grep -i -E "(error|exception|failed|fatal|critical|traceback|500|404)" || echo "에러 로그가 발견되지 않았습니다")

    if [ "${ERROR_LOGS}" = "에러 로그가 발견되지 않았습니다" ]; then
        echo -e "${GREEN}✅ ${ERROR_LOGS}${NC}"
    else
        echo "${ERROR_LOGS}"
    fi

    echo ""
}

# 전체 SafeWork 시스템 건강성 체크
health_check() {
    echo -e "${YELLOW}🏥 SafeWork 시스템 건강성 체크${NC}"
    echo "============================="

    # 프로덕션 URL 체크
    PROD_URL="https://safework.jclee.me"
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/health" --connect-timeout 10 || echo "000")

    if [ "${HTTP_STATUS}" = "200" ]; then
        echo -e "${GREEN}✅ 프로덕션 사이트 접근 가능: ${PROD_URL} (HTTP ${HTTP_STATUS})${NC}"
    else
        echo -e "${RED}❌ 프로덕션 사이트 접근 불가: ${PROD_URL} (HTTP ${HTTP_STATUS})${NC}"
    fi

    # 각 컨테이너 상태 체크
    CONTAINERS=$(curl -s -H "X-API-Key:${PORTAINER_TOKEN}" \
        "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
        jq -r '.[] | select(.Names[] | contains("safework")) | .Names[0] | ltrimstr("/")')

    for container in ${CONTAINERS}; do
        STATE=$(curl -s -H "X-API-Key:${PORTAINER_TOKEN}" \
            "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
            jq -r --arg name "${container}" '.[] | select(.Names[] | contains($name)) | .State')

        if [ "${STATE}" = "running" ]; then
            echo -e "${GREEN}✅ ${container}: 실행 중${NC}"
        else
            echo -e "${RED}❌ ${container}: ${STATE}${NC}"
        fi
    done

    echo ""
}

# 실시간 로그 모니터링 (5초마다 업데이트)
real_time_monitor() {
    local container_name=$1

    echo -e "${YELLOW}📺 ${container_name} 실시간 로그 모니터링 (Ctrl+C로 종료)${NC}"
    echo "================================================"

    CONTAINER_ID=$(curl -s -H "X-API-Key:${PORTAINER_TOKEN}" \
        "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
        jq -r --arg name "${container_name}" '.[] | select(.Names[] | contains($name)) | .Id')

    if [ -z "${CONTAINER_ID}" ] || [ "${CONTAINER_ID}" = "null" ]; then
        echo -e "${RED}❌ 컨테이너를 찾을 수 없습니다${NC}"
        return 1
    fi

    while true; do
        clear
        echo -e "${YELLOW}📺 ${container_name} 실시간 로그 ($(date '+%H:%M:%S'))${NC}"
        echo "================================================"

        curl -s -H "X-API-Key:${PORTAINER_TOKEN}" \
            "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${CONTAINER_ID}/logs?stdout=true&stderr=true&tail=20&timestamps=true" | \
            tail -20

        sleep 5
    done
}

# 사용법 출력
usage() {
    echo "SafeWork 운영 컨테이너 로그 조회 스크립트"
    echo ""
    echo "사용법:"
    echo "  $0 list                     # SafeWork 컨테이너 목록 조회"
    echo "  $0 logs <컨테이너명> [줄수]  # 특정 컨테이너 로그 조회 (기본 50줄)"
    echo "  $0 status <컨테이너명>       # 컨테이너 상태 상세 조회"
    echo "  $0 errors <컨테이너명> [줄수] # 에러 로그만 필터링 (기본 100줄)"
    echo "  $0 health                   # 전체 시스템 건강성 체크"
    echo "  $0 monitor <컨테이너명>      # 실시간 로그 모니터링"
    echo "  $0 all                      # 모든 SafeWork 컨테이너 로그 조회"
    echo ""
    echo "예시:"
    echo "  $0 list"
    echo "  $0 logs safework-app 100"
    echo "  $0 errors safework-app"
    echo "  $0 health"
    echo "  $0 monitor safework-app"
}

# 메인 실행 로직
case "${1}" in
    "list"|"l")
        print_header
        get_safework_containers
        ;;
    "logs"|"log")
        if [ -z "${2}" ]; then
            echo "컨테이너명을 입력해주세요"
            usage
            exit 1
        fi
        print_header
        get_container_logs "${2}" "${3:-50}"
        ;;
    "status"|"s")
        if [ -z "${2}" ]; then
            echo "컨테이너명을 입력해주세요"
            usage
            exit 1
        fi
        print_header
        get_container_status "${2}"
        ;;
    "errors"|"error"|"e")
        if [ -z "${2}" ]; then
            echo "컨테이너명을 입력해주세요"
            usage
            exit 1
        fi
        print_header
        get_error_logs "${2}" "${3:-100}"
        ;;
    "health"|"h")
        print_header
        health_check
        ;;
    "monitor"|"m")
        if [ -z "${2}" ]; then
            echo "컨테이너명을 입력해주세요"
            usage
            exit 1
        fi
        real_time_monitor "${2}"
        ;;
    "all"|"a")
        print_header
        get_safework_containers

        CONTAINERS=$(curl -s -H "X-API-Key:${PORTAINER_TOKEN}" \
            "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
            jq -r '.[] | select(.Names[] | contains("safework")) | .Names[0] | ltrimstr("/")')

        for container in ${CONTAINERS}; do
            get_container_logs "${container}" 30
            echo "================================================"
        done
        ;;
    *)
        usage
        ;;
esac