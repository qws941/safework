#!/bin/bash
# SafeWork 안정화된 배포 스크립트 v2.0

set -euo pipefail

# 환경 설정 로드
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.env"

# ===== 메인 함수 =====
main() {
    log_info "SafeWork 배포 시작 (v2.0)"

    # 1. 환경 검증
    validate_environment

    # 2. 기존 스택 확인
    check_existing_stack

    # 3. Docker 이미지 업데이트
    update_images

    # 4. 스택 배포
    deploy_stack

    # 5. 배포 검증
    verify_deployment

    log_success "배포 완료!"
}

# ===== 환경 검증 =====
validate_environment() {
    log_info "환경 검증 중..."

    # 필수 변수 확인
    local required_vars=(
        "PORTAINER_URL"
        "PORTAINER_TOKEN"
        "ENDPOINT_ID"
        "DB_PASSWORD"
        "ADMIN_PASSWORD"
    )

    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            log_error "필수 환경 변수 누락: $var"
            exit 1
        fi
    done

    # Portainer API 연결 확인
    if ! portainer_api GET "endpoints" > /dev/null 2>&1; then
        log_error "Portainer API 연결 실패"
        exit 1
    fi

    log_success "환경 검증 완료"
}

# ===== 기존 스택 확인 =====
check_existing_stack() {
    log_info "기존 스택 확인 중..."

    local stack_id=$(check_stack_exists "safework")

    if [ -n "$stack_id" ]; then
        log_warning "기존 스택 발견 (ID: $stack_id)"

        read -p "기존 스택을 업데이트하시겠습니까? (y/N) " -n 1 -r
        echo

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            update_existing_stack "$stack_id"
            exit 0
        else
            log_info "스택 삭제 중..."
            portainer_api DELETE "stacks/$stack_id?endpointId=$ENDPOINT_ID"
            sleep 5
            log_success "기존 스택 삭제 완료"
        fi
    else
        log_info "기존 스택 없음"
    fi
}

# ===== Docker 이미지 업데이트 =====
update_images() {
    log_info "Docker 이미지 업데이트 중..."

    local images=(
        "safework/app"
        "safework/postgres"
        "safework/redis"
    )

    for image in "${images[@]}"; do
        log_info "이미지 업데이트: $REGISTRY_URL/$image:latest"
        docker pull "$REGISTRY_URL/$image:latest" || {
            log_warning "이미지 풀 실패: $image (계속 진행)"
        }
    done

    log_success "이미지 업데이트 완료"
}

# ===== 스택 배포 =====
deploy_stack() {
    log_info "새 스택 배포 중..."

    # docker-compose.yml 파일 읽기
    local compose_file="$SCRIPT_DIR/../docker-compose.yml"

    if [ ! -f "$compose_file" ]; then
        log_error "docker-compose.yml 파일을 찾을 수 없습니다"
        exit 1
    fi

    # Compose 파일 내용을 JSON으로 변환
    local compose_content=$(cat "$compose_file" | jq -Rs .)

    # 스택 생성 API 호출 (올바른 엔드포인트 사용)
    local response=$(curl -s -X POST \
        -H "X-API-Key: $PORTAINER_TOKEN" \
        -H "Content-Type: application/json" \
        "$PORTAINER_URL/api/stacks/create/standalone/string?endpointId=$ENDPOINT_ID" \
        -d "{\"name\": \"safework\", \"stackFileContent\": $compose_content}")

    if echo "$response" | grep -q '"Id"'; then
        local stack_id=$(echo "$response" | jq -r '.Id')
        log_success "스택 생성 성공! (ID: $stack_id)"
    else
        log_error "스택 생성 실패"
        echo "$response" | jq '.' || echo "$response"
        exit 1
    fi
}

# ===== 기존 스택 업데이트 =====
update_existing_stack() {
    local stack_id=$1
    log_info "스택 업데이트 중 (ID: $stack_id)..."

    # docker-compose.yml 파일 읽기
    local compose_file="$SCRIPT_DIR/../docker-compose.yml"
    local compose_content=$(cat "$compose_file" | jq -Rs .)

    # 스택 업데이트 API 호출
    local response=$(curl -s -X PUT \
        -H "X-API-Key: $PORTAINER_TOKEN" \
        -H "Content-Type: application/json" \
        "$PORTAINER_URL/api/stacks/$stack_id?endpointId=$ENDPOINT_ID" \
        -d "{
            \"StackFileContent\": $compose_content,
            \"Prune\": false,
            \"PullImage\": true
        }")

    if echo "$response" | grep -q '"Id"'; then
        log_success "스택 업데이트 성공!"
    else
        log_error "스택 업데이트 실패"
        echo "$response" | jq '.' || echo "$response"
        exit 1
    fi
}

# ===== 배포 검증 =====
verify_deployment() {
    log_info "배포 검증 중..."

    # 컨테이너 시작 대기
    sleep 10

    # 컨테이너 상태 확인
    log_info "컨테이너 상태 확인..."

    local containers=$(portainer_api GET "endpoints/$ENDPOINT_ID/docker/containers/json")

    echo "$containers" | jq -r '.[] | select(.Names[0] | contains("safework")) |
        "\(.Names[0] | ltrimstr("/")): \(.State) (\(.Status))"' || {
        log_warning "컨테이너 상태 확인 실패"
    }

    # 헬스체크
    if health_check "https://safework.jclee.me/health"; then
        log_success "SafeWork 서비스 정상 작동!"
        curl -s "https://safework.jclee.me/health" | jq '.'
    else
        log_warning "헬스체크 실패 (서비스가 아직 시작 중일 수 있음)"
    fi
}

# ===== 스크립트 실행 =====
main "$@"