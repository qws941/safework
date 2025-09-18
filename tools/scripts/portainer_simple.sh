#!/bin/bash

# 간단한 Portainer API 쿼리 함수들
PORTAINER_URL="https://portainer.jclee.me"
PORTAINER_TOKEN="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
ENDPOINT_ID="3"

# 1. SafeWork 컨테이너만 간단히 조회
safework_containers() {
    echo "🐳 SafeWork 컨테이너:"
    curl -s -H "X-API-Key:${PORTAINER_TOKEN}" \
        "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
        jq -r '.[] | select(.Names[] | contains("safework")) | .Names[0] + " - " + .State'
}

# 2. 실행 중인 SafeWork 컨테이너만
safework_running() {
    echo "✅ 실행 중인 SafeWork 컨테이너:"
    curl -s -H "X-API-Key:${PORTAINER_TOKEN}" \
        "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
        jq -r '.[] | select(.Names[] | contains("safework") and .State == "running") | .Names[0]'
}

# 3. SafeWork 컨테이너 간단한 상태
safework_status() {
    echo "📊 SafeWork 상태:"
    curl -s -H "X-API-Key:${PORTAINER_TOKEN}" \
        "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
        jq -r '.[] | select(.Names[] | contains("safework")) |
        .Names[0] + ": " + .State + " (" + .Status + ")"'
}

# 4. 특정 컨테이너 로그 (인자로 컨테이너명 받음)
safework_logs() {
    local container_name=${1:-"safework-app"}
    echo "📝 ${container_name} 최근 로그:"
    curl -s -H "X-API-Key:${PORTAINER_TOKEN}" \
        "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${container_name}/logs?stdout=true&stderr=true&tail=10&timestamps=true"
}

# 5. SafeWork 네트워크 정보
safework_network() {
    echo "🌐 SafeWork 네트워크:"
    curl -s -H "X-API-Key:${PORTAINER_TOKEN}" \
        "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
        jq -r '.[] | select(.Names[] | contains("safework")) |
        .Names[0] + " - " + (.NetworkSettings.Networks | keys[0])'
}

# 사용법
case "${1}" in
    "containers"|"c")
        safework_containers
        ;;
    "running"|"r")
        safework_running
        ;;
    "status"|"s")
        safework_status
        ;;
    "logs"|"l")
        safework_logs "${2}"
        ;;
    "network"|"n")
        safework_network
        ;;
    "all"|"")
        safework_containers
        echo ""
        safework_status
        echo ""
        safework_network
        ;;
    *)
        echo "사용법: $0 [containers|running|status|logs|network|all]"
        echo "또는: $0 logs <컨테이너명>"
        ;;
esac