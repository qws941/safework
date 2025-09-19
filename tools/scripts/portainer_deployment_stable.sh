#!/bin/bash

#############################################
# SafeWork Portainer 안정화 배포 스크립트
# Watchtower 의존성 제거, Portainer API 전용
#############################################

set -euo pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 환경 변수 설정
PORTAINER_URL="${PORTAINER_URL:-https://portainer.jclee.me}"
PORTAINER_API_KEY="${PORTAINER_API_KEY:-}"
REGISTRY_HOST="${REGISTRY_HOST:-registry.jclee.me}"
APP_NAME="${APP_NAME:-safework}"
PRODUCTION_URL="${PRODUCTION_URL:-https://safework.jclee.me}"
ENDPOINT_ID="${ENDPOINT_ID:-3}"

# 로깅 함수
log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# API 키 검증
check_api_key() {
    if [[ -z "$PORTAINER_API_KEY" ]]; then
        log_error "PORTAINER_API_KEY가 설정되지 않았습니다."
        exit 1
    fi

    log_info "Portainer API 연결 테스트 중..."
    local response=$(curl -s -w "%{http_code}" -H "X-API-Key: $PORTAINER_API_KEY" \
        "$PORTAINER_URL/api/endpoints" -o /dev/null)

    if [[ "$response" == "200" ]]; then
        log_success "Portainer API 연결 성공"
    else
        log_error "Portainer API 연결 실패 (HTTP $response)"
        exit 1
    fi
}

# 컨테이너 상태 확인
check_container_status() {
    local container_name="$1"
    log_info "컨테이너 상태 확인: $container_name"

    local response=$(curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/json" | \
        jq -r ".[] | select(.Names[] | contains(\"$container_name\")) | .State")

    if [[ "$response" == "running" ]]; then
        log_success "$container_name: 실행 중"
        return 0
    else
        log_warning "$container_name: $response"
        return 1
    fi
}

# 이미지 풀 및 컨테이너 업데이트
update_container() {
    local container_name="$1"
    local image_name="$2"

    log_info "컨테이너 업데이트 시작: $container_name"

    # 1. 최신 이미지 풀
    log_info "최신 이미지 풀: $image_name"
    local pull_response=$(curl -s -w "%{http_code}" -X POST \
        -H "X-API-Key: $PORTAINER_API_KEY" \
        -H "Content-Type: application/json" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/images/create" \
        -d "{\"fromImage\": \"$image_name\"}" \
        -o /dev/null)

    if [[ "$pull_response" == "200" ]]; then
        log_success "이미지 풀 성공: $image_name"
    else
        log_warning "이미지 풀 실패 (HTTP $pull_response), 계속 진행..."
    fi

    # 2. 컨테이너 재시작
    log_info "컨테이너 재시작: $container_name"
    local restart_response=$(curl -s -w "%{http_code}" -X POST \
        -H "X-API-Key: $PORTAINER_API_KEY" \
        "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/$container_name/restart" \
        -o /dev/null)

    if [[ "$restart_response" == "204" ]]; then
        log_success "컨테이너 재시작 성공: $container_name"
    else
        log_error "컨테이너 재시작 실패: $container_name (HTTP $restart_response)"
        return 1
    fi

    # 3. 재시작 후 상태 확인 (최대 30초 대기)
    log_info "재시작 후 상태 확인 중..."
    for i in {1..6}; do
        sleep 5
        if check_container_status "$container_name"; then
            log_success "$container_name 업데이트 완료"
            return 0
        fi
        log_info "상태 확인 재시도 ($i/6)..."
    done

    log_warning "$container_name 상태 확인 타임아웃"
    return 1
}

# 헬스 체크
health_check() {
    log_info "프로덕션 헬스 체크 시작..."

    for i in {1..10}; do
        local response=$(curl -s -w "%{http_code}" "$PRODUCTION_URL/health" -o /tmp/health_response)
        local http_code=$(tail -n1 <<< "$response")

        if [[ "$http_code" == "200" ]]; then
            local health_data=$(cat /tmp/health_response)
            if echo "$health_data" | jq -e '.status == "healthy"' &>/dev/null; then
                log_success "헬스 체크 통과"
                return 0
            fi
        fi

        log_info "헬스 체크 재시도 ($i/10)..."
        sleep 30
    done

    log_error "헬스 체크 실패"
    return 1
}

# 데이터베이스 연결 테스트
test_database() {
    log_info "데이터베이스 연결 테스트..."

    local test_payload='{
        "form_type": "001",
        "name": "Deployment Test",
        "age": 30,
        "gender": "Male",
        "years_of_service": 5,
        "employee_number": "DEPLOY001",
        "department": "QA",
        "position": "Tester",
        "employee_id": "QA001",
        "work_years": 3,
        "work_months": 6,
        "data": {"has_symptoms": false}
    }'

    local response=$(curl -s -w "\n%{http_code}" -X POST \
        "$PRODUCTION_URL/survey/api/submit" \
        -H "Content-Type: application/json" \
        -d "$test_payload")

    local http_code=$(echo "$response" | tail -n1)
    local response_body=$(echo "$response" | head -n -1)

    if [[ "$http_code" == "200" || "$http_code" == "201" ]]; then
        if echo "$response_body" | grep -q '"success": true\|"id":\|"message":'; then
            log_success "데이터베이스 연결 테스트 통과"
            return 0
        fi
    fi

    log_warning "데이터베이스 테스트 경고 (HTTP $http_code)"
    log_info "응답: $response_body"
    return 1
}

# 롤백 함수
rollback() {
    log_warning "롤백 시작..."

    # 이전 버전으로 롤백하는 로직 (구현 필요시)
    log_error "롤백 기능은 수동으로 수행해야 합니다."
    log_info "다음 명령어를 사용하여 수동 롤백:"
    echo "  ./scripts/portainer_deployment_stable.sh rollback <previous_tag>"
}

# 메인 배포 함수
deploy() {
    log_info "SafeWork 안정화 배포 시작"
    log_info "Watchtower 의존성 없음 - Portainer API 전용"

    # API 키 검증
    check_api_key

    # 현재 컨테이너 상태 확인
    log_info "배포 전 컨테이너 상태 확인..."
    check_container_status "safework-app" || true
    check_container_status "safework-postgres" || true
    check_container_status "safework-redis" || true

    # 컨테이너 업데이트 (순서 중요: postgres -> redis -> app)
    log_info "순차적 컨테이너 업데이트 시작..."

    if ! update_container "safework-postgres" "$REGISTRY_HOST/$APP_NAME/postgres:latest"; then
        log_error "PostgreSQL 업데이트 실패"
        rollback
        exit 1
    fi

    if ! update_container "safework-redis" "$REGISTRY_HOST/$APP_NAME/redis:latest"; then
        log_error "Redis 업데이트 실패"
        rollback
        exit 1
    fi

    if ! update_container "safework-app" "$REGISTRY_HOST/$APP_NAME/app:latest"; then
        log_error "Application 업데이트 실패"
        rollback
        exit 1
    fi

    # 전체 시스템 안정화 대기
    log_info "시스템 안정화 대기 (60초)..."
    sleep 60

    # 헬스 체크
    if ! health_check; then
        log_error "헬스 체크 실패"
        rollback
        exit 1
    fi

    # 데이터베이스 테스트
    if ! test_database; then
        log_warning "데이터베이스 테스트 경고 - 수동 확인 필요"
    fi

    log_success "SafeWork 배포 완료!"
    log_info "프로덕션 URL: $PRODUCTION_URL"
    log_info "헬스 체크: $PRODUCTION_URL/health"
}

# 상태 확인 함수
status() {
    log_info "SafeWork 시스템 상태 확인"

    check_api_key

    echo -e "\n${CYAN}=== 컨테이너 상태 ===${NC}"
    check_container_status "safework-app"
    check_container_status "safework-postgres"
    check_container_status "safework-redis"

    echo -e "\n${CYAN}=== 서비스 상태 ===${NC}"
    if curl -s "$PRODUCTION_URL/health" | jq -e '.status == "healthy"' &>/dev/null; then
        log_success "프로덕션 서비스: 정상"
    else
        log_error "프로덕션 서비스: 비정상"
    fi
}

# 사용법 출력
usage() {
    echo "SafeWork Portainer 안정화 배포 스크립트"
    echo "Watchtower 의존성 제거, Portainer API 전용"
    echo ""
    echo "사용법: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  deploy    - 안정화된 배포 실행"
    echo "  status    - 시스템 상태 확인"
    echo "  health    - 헬스 체크만 실행"
    echo "  rollback  - 수동 롤백 안내"
    echo "  help      - 도움말 출력"
    echo ""
    echo "환경 변수:"
    echo "  PORTAINER_URL     - Portainer URL (기본값: https://portainer.jclee.me)"
    echo "  PORTAINER_API_KEY - Portainer API 키 (필수)"
    echo "  REGISTRY_HOST     - Docker 레지스트리 호스트"
    echo "  PRODUCTION_URL    - 프로덕션 URL"
}

# 메인 실행 부분
case "${1:-help}" in
    "deploy")
        deploy
        ;;
    "status")
        status
        ;;
    "health")
        check_api_key
        health_check
        ;;
    "rollback")
        rollback
        ;;
    "help"|*)
        usage
        ;;
esac