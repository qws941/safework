#!/bin/bash

# 안정적인 Portainer API 배포 스크립트
# SafeWork 프로덕션 배포 안정화

set -euo pipefail  # 엄격한 오류 처리

# 설정
PORTAINER_URL="https://portainer.jclee.me"
PORTAINER_TOKEN="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
ENDPOINT_ID="3"
REGISTRY_URL="registry.jclee.me"
TIMEOUT=30
MAX_RETRIES=3

# 색상 출력
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# API 호출 함수 (재시도 로직 포함)
api_call() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        local response
        if [ -n "$data" ]; then
            response=$(curl -s -w "%{http_code}" -X "$method" \
                -H "X-API-Key: $PORTAINER_TOKEN" \
                -H "Content-Type: application/json" \
                -d "$data" \
                --connect-timeout $TIMEOUT \
                "$PORTAINER_URL$endpoint" 2>/dev/null || echo "000")
        else
            response=$(curl -s -w "%{http_code}" -X "$method" \
                -H "X-API-Key: $PORTAINER_TOKEN" \
                --connect-timeout $TIMEOUT \
                "$PORTAINER_URL$endpoint" 2>/dev/null || echo "000")
        fi
        
        local http_code="${response: -3}"
        local body="${response%???}"
        
        if [[ "$http_code" =~ ^[2-3][0-9][0-9]$ ]]; then
            echo "$body"
            return 0
        else
            retry_count=$((retry_count + 1))
            log_warn "API 호출 실패 (시도 $retry_count/$MAX_RETRIES): HTTP $http_code"
            [ $retry_count -lt $MAX_RETRIES ] && sleep 2
        fi
    done
    
    log_error "API 호출 최종 실패: $method $endpoint"
    return 1
}

# 컨테이너 상태 확인
check_container_status() {
    local container_name="$1"
    local response
    
    response=$(api_call "GET" "/api/endpoints/$ENDPOINT_ID/docker/containers/json?all=true" || echo "")
    
    if [ -n "$response" ]; then
        echo "$response" | jq -r --arg name "$container_name" \
            '.[] | select(.Names[] | contains($name)) | "\(.State):\(.Status)"' 2>/dev/null || echo "unknown"
    else
        echo "unknown"
    fi
}

# 컨테이너 삭제 (안전)
safe_remove_container() {
    local container_name="$1"
    log_info "컨테이너 정리: $container_name"
    
    # 먼저 중지 시도
    api_call "POST" "/api/endpoints/$ENDPOINT_ID/docker/containers/$container_name/stop" "" >/dev/null 2>&1 || true
    sleep 2
    
    # 삭제 시도
    api_call "DELETE" "/api/endpoints/$ENDPOINT_ID/docker/containers/$container_name?force=true" "" >/dev/null 2>&1 || true
    sleep 1
}

# 이미지 풀
pull_image() {
    local image="$1"
    log_info "이미지 풀링: $image"
    
    local pull_data=$(cat <<EOF
{
    "fromImage": "$image",
    "tag": "latest"
}
EOF
)
    
    if api_call "POST" "/api/endpoints/$ENDPOINT_ID/docker/images/create" "$pull_data" >/dev/null; then
        log_info "이미지 풀 성공: $image"
        return 0
    else
        log_error "이미지 풀 실패: $image"
        return 1
    fi
}

# 컨테이너 생성 및 시작
create_and_start_container() {
    local container_name="$1"
    local image="$2"
    local config="$3"
    
    log_info "컨테이너 생성: $container_name"
    
    # 컨테이너 생성
    local create_response
    if create_response=$(api_call "POST" "/api/endpoints/$ENDPOINT_ID/docker/containers/create?name=$container_name" "$config"); then
        log_info "컨테이너 생성 성공: $container_name"
        
        # 컨테이너 시작
        if api_call "POST" "/api/endpoints/$ENDPOINT_ID/docker/containers/$container_name/start" "" >/dev/null; then
            log_info "컨테이너 시작 성공: $container_name"
            return 0
        else
            log_error "컨테이너 시작 실패: $container_name"
            return 1
        fi
    else
        log_error "컨테이너 생성 실패: $container_name"
        return 1
    fi
}

# PostgreSQL 컨테이너 배포
deploy_postgres() {
    log_info "=== PostgreSQL 배포 시작 ==="
    
    safe_remove_container "safework-postgres"
    
    if ! pull_image "$REGISTRY_URL/safework/postgres:latest"; then
        return 1
    fi
    
    local postgres_config=$(cat <<EOF
{
    "Image": "$REGISTRY_URL/safework/postgres:latest",
    "Env": [
        "TZ=Asia/Seoul",
        "POSTGRES_DB=safework_db",
        "POSTGRES_USER=safework",
        "POSTGRES_PASSWORD=safework2024"
    ],
    "ExposedPorts": {
        "5432/tcp": {}
    },
    "HostConfig": {
        "NetworkMode": "bridge",
        "PortBindings": {
            "5432/tcp": [{"HostPort": "4546"}]
        },
        "RestartPolicy": {
            "Name": "unless-stopped"
        }
    },
    "NetworkingConfig": {
        "EndpointsConfig": {}
    }
}
EOF
)
    
    if create_and_start_container "safework-postgres" "$REGISTRY_URL/safework/postgres:latest" "$postgres_config"; then
        log_info "PostgreSQL 배포 완료"
        return 0
    else
        log_error "PostgreSQL 배포 실패"
        return 1
    fi
}

# Redis 컨테이너 배포
deploy_redis() {
    log_info "=== Redis 배포 시작 ==="
    
    safe_remove_container "safework-redis"
    
    if ! pull_image "$REGISTRY_URL/safework/redis:latest"; then
        return 1
    fi
    
    local redis_config=$(cat <<EOF
{
    "Image": "$REGISTRY_URL/safework/redis:latest",
    "Env": [
        "TZ=Asia/Seoul"
    ],
    "ExposedPorts": {
        "6379/tcp": {}
    },
    "HostConfig": {
        "NetworkMode": "bridge",
        "PortBindings": {
            "6379/tcp": [{"HostPort": "4547"}]
        },
        "RestartPolicy": {
            "Name": "unless-stopped"
        }
    }
}
EOF
)
    
    if create_and_start_container "safework-redis" "$REGISTRY_URL/safework/redis:latest" "$redis_config"; then
        log_info "Redis 배포 완료"
        return 0
    else
        log_error "Redis 배포 실패"
        return 1
    fi
}

# App 컨테이너 배포
deploy_app() {
    log_info "=== SafeWork App 배포 시작 ==="
    
    safe_remove_container "safework-app"
    
    if ! pull_image "$REGISTRY_URL/safework/app:latest"; then
        return 1
    fi
    
    local app_config=$(cat <<EOF
{
    "Image": "$REGISTRY_URL/safework/app:latest",
    "Env": [
        "TZ=Asia/Seoul",
        "DB_HOST=safework-postgres",
        "DB_NAME=safework_db",
        "DB_USER=safework",
        "DB_PASSWORD=safework2024",
        "REDIS_HOST=safework-redis",
        "FLASK_CONFIG=production"
    ],
    "ExposedPorts": {
        "4545/tcp": {}
    },
    "HostConfig": {
        "NetworkMode": "bridge",
        "PortBindings": {
            "4545/tcp": [{"HostPort": "4545"}]
        },
        "RestartPolicy": {
            "Name": "unless-stopped"
        },
        "Links": [
            "safework-postgres:safework-postgres",
            "safework-redis:safework-redis"
        ]
    }
}
EOF
)
    
    # PostgreSQL이 준비될 때까지 대기
    log_info "PostgreSQL 준비 대기 중..."
    sleep 10
    
    if create_and_start_container "safework-app" "$REGISTRY_URL/safework/app:latest" "$app_config"; then
        log_info "SafeWork App 배포 완료"
        return 0
    else
        log_error "SafeWork App 배포 실패"
        return 1
    fi
}

# 헬스 체크
health_check() {
    log_info "=== 헬스 체크 시작 ==="
    
    local max_wait=60
    local wait_time=0
    
    while [ $wait_time -lt $max_wait ]; do
        if curl -s -f "https://safework.jclee.me/health" >/dev/null 2>&1; then
            log_info "✅ SafeWork 서비스 정상 동작 확인"
            return 0
        fi
        
        sleep 5
        wait_time=$((wait_time + 5))
        log_info "헬스 체크 대기 중... ($wait_time/${max_wait}초)"
    done
    
    log_error "❌ 헬스 체크 실패 - 서비스 응답 없음"
    return 1
}

# 상태 확인
status_check() {
    log_info "=== SafeWork 컨테이너 상태 ==="
    
    local containers=("safework-postgres" "safework-redis" "safework-app")
    
    for container in "${containers[@]}"; do
        local status=$(check_container_status "$container")
        if [[ "$status" == "running"* ]]; then
            echo -e "✅ $container: ${GREEN}$status${NC}"
        else
            echo -e "❌ $container: ${RED}$status${NC}"
        fi
    done
    
    echo ""
    log_info "=== 프로덕션 헬스 체크 ==="
    if curl -s -f "https://safework.jclee.me/health" >/dev/null 2>&1; then
        echo -e "✅ Production: ${GREEN}https://safework.jclee.me/health${NC}"
    else
        echo -e "❌ Production: ${RED}서비스 응답 없음${NC}"
    fi
}

# 전체 배포
full_deploy() {
    log_info "🚀 SafeWork 전체 배포 시작"
    
    if deploy_postgres && deploy_redis && deploy_app; then
        log_info "✅ 모든 컨테이너 배포 완료"
        
        if health_check; then
            log_info "🎉 SafeWork 배포 성공!"
            return 0
        else
            log_error "💥 배포 후 헬스 체크 실패"
            return 1
        fi
    else
        log_error "💥 컨테이너 배포 중 오류 발생"
        return 1
    fi
}

# 메인 실행
case "${1:-help}" in
    "deploy")
        full_deploy
        ;;
    "status")
        status_check
        ;;
    "health")
        health_check
        ;;
    "postgres")
        deploy_postgres
        ;;
    "redis")
        deploy_redis
        ;;
    "app")
        deploy_app
        ;;
    "help"|*)
        echo "SafeWork Portainer API 안정 배포 도구"
        echo ""
        echo "사용법: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy    - 전체 SafeWork 스택 배포"
        echo "  status    - 컨테이너 상태 확인"
        echo "  health    - 헬스 체크 실행"
        echo "  postgres  - PostgreSQL만 배포"
        echo "  redis     - Redis만 배포"
        echo "  app       - SafeWork App만 배포"
        echo "  help      - 이 도움말 표시"
        ;;
esac