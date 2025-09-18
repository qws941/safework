#!/bin/bash

# Portainer API 설정
PORTAINER_URL="https://portainer.jclee.me"
PORTAINER_TOKEN="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
ENDPOINT_ID="3"

# 기본 헤더
HEADERS="-H X-API-Key:${PORTAINER_TOKEN}"

echo "🚀 SafeWork Portainer API 쿼리 스크립트"
echo "================================================"

# 1. SafeWork 컨테이너 목록 조회
echo "📋 SafeWork 컨테이너 목록:"
curl -s ${HEADERS} "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
jq -r '.[] | select(.Names[] | contains("safework")) | "- " + .Names[0] + " (" + .State + ")"'

echo ""

# 2. SafeWork 컨테이너 상세 정보
echo "📊 SafeWork 컨테이너 상세 정보:"
curl -s ${HEADERS} "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
jq -r '.[] | select(.Names[] | contains("safework")) | {
  name: .Names[0],
  state: .State,
  status: .Status,
  image: .Image,
  ports: .Ports
}'

echo ""

# 3. SafeWork 컨테이너 헬스체크
echo "🏥 SafeWork 컨테이너 헬스체크:"
for container in $(curl -s ${HEADERS} "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
jq -r '.[] | select(.Names[] | contains("safework")) | .Names[0]' | sed 's|^/||'); do
    echo "🔍 ${container}:"

    # 컨테이너 상세 정보
    container_info=$(curl -s ${HEADERS} "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${container}/json")

    state=$(echo "${container_info}" | jq -r '.State.Status')
    health=$(echo "${container_info}" | jq -r '.State.Health.Status // "no-healthcheck"')
    restart_count=$(echo "${container_info}" | jq -r '.RestartCount')

    echo "   상태: ${state}"
    echo "   헬스: ${health}"
    echo "   재시작횟수: ${restart_count}"
    echo ""
done

# 4. SafeWork 컨테이너 로그 (최근 20줄)
echo "📝 SafeWork 컨테이너 최근 로그:"
for container in $(curl -s ${HEADERS} "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json" | \
jq -r '.[] | select(.Names[] | contains("safework")) | .Names[0]' | sed 's|^/||'); do
    echo "📋 ${container} 로그:"
    curl -s ${HEADERS} "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/${container}/logs?stdout=true&stderr=true&tail=5&timestamps=true" | \
    head -5
    echo "---"
done

echo "✅ 쿼리 완료"