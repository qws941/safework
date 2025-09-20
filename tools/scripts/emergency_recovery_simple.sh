#!/bin/bash

#############################################
# SafeWork 긴급 복구 - 단순하고 확실한 방법
# 근본 원인 해결 및 안정화
#############################################

set -euo pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 환경 변수 설정
PORTAINER_URL="https://portainer.jclee.me"
PORTAINER_API_KEY="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
PRODUCTION_URL="https://safework.jclee.me"
ENDPOINT_ID="3"

# 1. 컨테이너 강제 재생성
force_recreate_containers() {
    log_info "컨테이너 강제 재생성 시작..."

    # 앱 컨테이너 정지 및 삭제
    log_info "SafeWork 앱 컨테이너 정지..."
    curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/safework-app/stop"

    sleep 5

    log_info "SafeWork 앱 컨테이너 삭제..."
    curl -s -X DELETE -H "X-API-Key: $PORTAINER_API_KEY" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/safework-app"

    sleep 5

    # 새 컨테이너 생성 (기본 설정으로)
    log_info "새 SafeWork 앱 컨테이너 생성..."

    local container_config='{
        "Image": "registry.jclee.me/safework/app:latest",
        "name": "safework-app",
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
            "PortBindings": {
                "4545/tcp": [{"HostPort": "4545"}]
            },
            "RestartPolicy": {
                "Name": "unless-stopped"
            }
        },
        "NetworkingConfig": {
            "EndpointsConfig": {
                "safework_network": {}
            }
        }
    }'

    curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
        -H "Content-Type: application/json" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/create?name=safework-app" \
        -d "$container_config"

    # 컨테이너 시작
    log_info "새 컨테이너 시작..."
    curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/safework-app/start"

    log_success "컨테이너 재생성 완료"
}

# 2. 네트워크 재설정
reset_network() {
    log_info "네트워크 재설정..."

    # safework_network 재생성
    curl -s -X DELETE -H "X-API-Key: $PORTAINER_API_KEY" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/networks/safework_network" || true

    sleep 3

    local network_config='{
        "Name": "safework_network",
        "Driver": "bridge",
        "EnableIPv6": false,
        "IPAM": {
            "Driver": "default",
            "Config": [{"Subnet": "172.18.0.0/16"}]
        }
    }'

    curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
        -H "Content-Type: application/json" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/networks/create" \
        -d "$network_config"

    log_success "네트워크 재설정 완료"
}

# 3. 순차적 서비스 시작
start_services_sequentially() {
    log_info "순차적 서비스 시작..."

    # PostgreSQL 재시작
    log_info "PostgreSQL 재시작..."
    curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/safework-postgres/restart"
    sleep 20

    # Redis 재시작
    log_info "Redis 재시작..."
    curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/safework-redis/restart"
    sleep 10

    # App 시작 (이미 위에서 새로 생성됨)
    log_info "Application 연결 대기..."
    sleep 30

    log_success "순차적 서비스 시작 완료"
}

# 4. 헬스 체크
comprehensive_health_check() {
    log_info "종합 헬스 체크 시작..."

    for i in {1..15}; do
        log_info "헬스 체크 시도 $i/15..."

        local response=$(curl -s -w "%{http_code}" "$PRODUCTION_URL/health" -o /tmp/health_check)
        local http_code=$(tail -n1 <<< "$response")

        if [[ "$http_code" == "200" ]]; then
            local health_data=$(cat /tmp/health_check)
            log_success "헬스 체크 성공!"
            log_info "응답: $health_data"
            return 0
        fi

        log_warning "헬스 체크 실패 (HTTP $http_code), 재시도..."
        sleep 30
    done

    log_error "헬스 체크 최종 실패"
    return 1
}

# 5. 기본 기능 테스트
test_basic_functionality() {
    log_info "기본 기능 테스트..."

    # 홈페이지 테스트
    if curl -s -f "$PRODUCTION_URL/" > /dev/null; then
        log_success "홈페이지: 정상"
    else
        log_warning "홈페이지: 접근 불가"
    fi

    # 설문 페이지 테스트
    if curl -s -f "$PRODUCTION_URL/survey/001_musculoskeletal_symptom_survey" > /dev/null; then
        log_success "설문 001: 정상"
    else
        log_warning "설문 001: 접근 불가"
    fi
}

# 메인 복구 실행
main_recovery() {
    log_info "=== SafeWork 긴급 복구 시작 ==="
    log_info "근본 원인 해결 및 안정화"

    reset_network
    force_recreate_containers
    start_services_sequentially

    if comprehensive_health_check; then
        test_basic_functionality
        log_success "=== 복구 완료! ==="
        log_info "프로덕션 URL: $PRODUCTION_URL"
    else
        log_error "=== 복구 실패 ==="
        log_info "수동 개입 필요"
        return 1
    fi
}

# 실행
case "${1:-recovery}" in
    "recovery"|"main")
        main_recovery
        ;;
    "health")
        comprehensive_health_check
        ;;
    "test")
        test_basic_functionality
        ;;
    *)
        echo "사용법: $0 [recovery|health|test]"
        echo "  recovery - 전체 복구 실행"
        echo "  health   - 헬스 체크만"
        echo "  test     - 기능 테스트만"
        ;;
esac