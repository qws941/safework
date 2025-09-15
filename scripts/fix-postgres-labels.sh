#!/bin/bash

# PostgreSQL 컨테이너에 Watchtower 라벨 추가하는 스크립트
# Portainer API를 사용합니다

set -e

# 설정
PORTAINER_URL="https://portainer.jclee.me"
PORTAINER_API_KEY="${PORTAINER_API_KEY:-ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=}"

if [ -z "$PORTAINER_API_KEY" ]; then
    echo "❌ PORTAINER_API_KEY 환경변수가 설정되지 않았습니다"
    exit 1
fi

echo "🔍 PostgreSQL 컨테이너 검색 중..."

# 함수: 특정 엔드포인트에서 컨테이너 정보 가져오기
get_containers() {
    local endpoint=$1
    echo "엔드포인트 $endpoint 확인 중..."
    curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
        "$PORTAINER_URL/api/endpoints/$endpoint/docker/containers/json?all=true" 2>/dev/null || echo "[]"
}

# 여러 엔드포인트에서 PostgreSQL 컨테이너 찾기
POSTGRES_CONTAINER=""
ENDPOINT_FOUND=""

for endpoint in 3 1 2; do
    containers=$(get_containers "$endpoint")

    if [ "$containers" != "[]" ]; then
        # PostgreSQL 컨테이너 찾기 (이름에 postgres, safework, pg 포함)
        postgres_info=$(echo "$containers" | jq -r '.[] | select(.Names[]? | test("postgres|safework.*postgres|pg"; "i")) | @base64' 2>/dev/null | head -n1)

        if [ -n "$postgres_info" ]; then
            echo "✅ 엔드포인트 $endpoint에서 PostgreSQL 컨테이너 발견!"
            POSTGRES_CONTAINER="$postgres_info"
            ENDPOINT_FOUND="$endpoint"
            break
        fi
    fi
done

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "❌ PostgreSQL 컨테이너를 찾을 수 없습니다"
    echo "🔍 사용 가능한 모든 컨테이너 목록:"
    for endpoint in 1 2 3; do
        containers=$(get_containers "$endpoint")
        if [ "$containers" != "[]" ]; then
            echo "=== 엔드포인트 $endpoint ==="
            echo "$containers" | jq -r '.[]?.Names[]? // "unnamed"' 2>/dev/null | head -10
        fi
    done
    exit 1
fi

# 컨테이너 정보 디코딩
container_info=$(echo "$POSTGRES_CONTAINER" | base64 -d)
container_name=$(echo "$container_info" | jq -r '.Names[0] // "unknown"' | sed 's|^/||')
container_id=$(echo "$container_info" | jq -r '.Id // "unknown"')
container_image=$(echo "$container_info" | jq -r '.Image // "unknown"')
container_state=$(echo "$container_info" | jq -r '.State // "unknown"')

echo "📋 찾은 PostgreSQL 컨테이너:"
echo "   이름: $container_name"
echo "   ID: ${container_id:0:12}"
echo "   이미지: $container_image"
echo "   상태: $container_state"

# 현재 라벨 확인
current_labels=$(echo "$container_info" | jq -r '.Labels // {}')
watchtower_enabled=$(echo "$current_labels" | jq -r '."com.centurylinklabs.watchtower.enable" // "not-set"')

echo "🏷️ 현재 Watchtower 라벨: $watchtower_enabled"

if [ "$watchtower_enabled" = "true" ]; then
    echo "✅ 이미 Watchtower 라벨이 설정되어 있습니다!"
    exit 0
fi

echo "🔧 PostgreSQL 컨테이너에 Watchtower 라벨 추가 중..."

# 컨테이너 전체 설정 가져오기
echo "📋 컨테이너 설정 가져오는 중..."
container_config=$(curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
    "$PORTAINER_URL/api/endpoints/$ENDPOINT_FOUND/docker/containers/$container_id/json")

if [ $? -ne 0 ]; then
    echo "❌ 컨테이너 설정을 가져올 수 없습니다"
    exit 1
fi

# 설정 정보 추출
image=$(echo "$container_config" | jq -r '.Config.Image')
env_vars=$(echo "$container_config" | jq -r '.Config.Env // []')
cmd=$(echo "$container_config" | jq -r '.Config.Cmd // []')
entrypoint=$(echo "$container_config" | jq -r '.Config.Entrypoint // []')
working_dir=$(echo "$container_config" | jq -r '.Config.WorkingDir // ""')
user=$(echo "$container_config" | jq -r '.Config.User // ""')

# 마운트 정보
mounts=$(echo "$container_config" | jq -r '.Mounts // []')

# 네트워크 설정
networks=$(echo "$container_config" | jq -r '.NetworkSettings.Networks // {}')

# 포트 바인딩
port_bindings=$(echo "$container_config" | jq -r '.HostConfig.PortBindings // {}')

# 호스트 설정
restart_policy=$(echo "$container_config" | jq -r '.HostConfig.RestartPolicy // {}')
binds=$(echo "$container_config" | jq -r '.HostConfig.Binds // []')

echo "📊 컨테이너 설정 정보:"
echo "   이미지: $image"
echo "   환경변수: $(echo "$env_vars" | jq length) 개"
echo "   마운트: $(echo "$mounts" | jq length) 개"
echo "   네트워크: $(echo "$networks" | jq 'keys | length') 개"

# 기존 라벨에 Watchtower 라벨 추가
existing_labels=$(echo "$container_config" | jq -r '.Config.Labels // {}')
new_labels=$(echo "$existing_labels" | jq '. + {"com.centurylinklabs.watchtower.enable": "true"}')

echo "🔄 컨테이너 재생성 중 (Watchtower 라벨 포함)..."

# 새 컨테이너 생성을 위한 설정 파일 만들기
cat > /tmp/postgres_new_config.json << EOF
{
  "Image": $image,
  "Env": $env_vars,
  "Cmd": $cmd,
  "Entrypoint": $entrypoint,
  "WorkingDir": $working_dir,
  "User": $user,
  "Labels": $new_labels,
  "HostConfig": {
    "Binds": $binds,
    "PortBindings": $port_bindings,
    "RestartPolicy": $restart_policy
  }
}
EOF

echo "⏸️ 기존 컨테이너 중지 중..."
curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
    "$PORTAINER_URL/api/endpoints/$ENDPOINT_FOUND/docker/containers/$container_id/stop" > /dev/null

sleep 5

echo "🗑️ 기존 컨테이너 제거 중..."
curl -s -X DELETE -H "X-API-Key: $PORTAINER_API_KEY" \
    "$PORTAINER_URL/api/endpoints/$ENDPOINT_FOUND/docker/containers/$container_id" > /dev/null

sleep 2

echo "🆕 Watchtower 라벨이 포함된 새 컨테이너 생성 중..."
new_container_response=$(curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
    -H "Content-Type: application/json" \
    -d @/tmp/postgres_new_config.json \
    "$PORTAINER_URL/api/endpoints/$ENDPOINT_FOUND/docker/containers/create?name=$container_name")

new_container_id=$(echo "$new_container_response" | jq -r '.Id // "null"')

if [ "$new_container_id" = "null" ] || [ -z "$new_container_id" ]; then
    echo "❌ 새 컨테이너 생성 실패"
    echo "응답: $new_container_response"
    exit 1
fi

echo "✅ 새 컨테이너 생성 완료: ${new_container_id:0:12}"

echo "▶️ 새 컨테이너 시작 중..."
start_response=$(curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
    "$PORTAINER_URL/api/endpoints/$ENDPOINT_FOUND/docker/containers/$new_container_id/start")

sleep 10

# 새 컨테이너 상태 확인
echo "🔍 새 컨테이너 상태 확인 중..."
new_container_status=$(curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
    "$PORTAINER_URL/api/endpoints/$ENDPOINT_FOUND/docker/containers/$new_container_id/json")

new_state=$(echo "$new_container_status" | jq -r '.State.Status')
new_watchtower_label=$(echo "$new_container_status" | jq -r '.Config.Labels."com.centurylinklabs.watchtower.enable" // "not-found"')

echo "📊 결과:"
echo "   새 컨테이너 상태: $new_state"
echo "   Watchtower 라벨: $new_watchtower_label"

# 임시 파일 정리
rm -f /tmp/postgres_new_config.json

if [ "$new_state" = "running" ] && [ "$new_watchtower_label" = "true" ]; then
    echo "🎉 성공! PostgreSQL 컨테이너에 Watchtower 라벨이 추가되었고 정상 실행 중입니다!"
    echo "Watchtower가 이제 이 컨테이너를 자동으로 모니터링하고 업데이트할 것입니다."
else
    echo "⚠️ 경고: 컨테이너가 예상대로 실행되지 않을 수 있습니다"
    echo "컨테이너 상태: $new_state"
    echo "Watchtower 라벨: $new_watchtower_label"
fi