#!/bin/bash
# SafeWork 스택 관리 통합 스크립트

set -euo pipefail

# 환경 설정 로드
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.env"

# ===== 명령어 도움말 =====
show_help() {
    cat << EOF
SafeWork 스택 관리 도구

사용법: $0 [명령] [옵션]

명령어:
    deploy      새 스택 배포 또는 업데이트
    status      스택 및 컨테이너 상태 확인
    logs        컨테이너 로그 보기
    restart     스택 재시작
    stop        스택 중지
    start       스택 시작
    remove      스택 완전 삭제
    health      헬스체크 수행
    update      이미지 업데이트 후 재배포
    backup      설정 백업
    restore     설정 복원

예제:
    $0 deploy               # 스택 배포
    $0 status              # 상태 확인
    $0 logs safework-app   # 앱 로그 보기
    $0 health              # 헬스체크
EOF
}

# ===== 스택 상태 확인 =====
check_status() {
    log_info "스택 상태 확인 중..."

    # 스택 정보
    local stack_id=$(check_stack_exists "safework")

    if [ -n "$stack_id" ]; then
        log_success "스택 발견 (ID: $stack_id)"

        # 스택 상세 정보
        local stack_info=$(portainer_api GET "stacks/$stack_id")
        echo "$stack_info" | jq '{
            Name: .Name,
            Status: .Status,
            CreatedAt: .CreationDate,
            CreatedBy: .CreatedBy
        }'

        # 컨테이너 상태
        log_info "컨테이너 상태:"
        local containers=$(portainer_api GET "endpoints/$ENDPOINT_ID/docker/containers/json")
        echo "$containers" | jq -r '.[] | select(.Names[0] | contains("safework")) |
            "  - \(.Names[0] | ltrimstr("/")): \(.State) (\(.Status))"'
    else
        log_warning "스택이 존재하지 않습니다"
    fi

    # 헬스체크
    if curl -s "https://safework.jclee.me/health" > /dev/null 2>&1; then
        log_success "서비스 상태: 정상"
        curl -s "https://safework.jclee.me/health" | jq '.'
    else
        log_warning "서비스 상태: 응답 없음"
    fi
}

# ===== 컨테이너 로그 보기 =====
view_logs() {
    local container_name=${1:-"safework-app"}
    log_info "$container_name 로그 조회 중..."

    # 컨테이너 ID 찾기
    local container_id=$(portainer_api GET "endpoints/$ENDPOINT_ID/docker/containers/json" | \
        jq -r ".[] | select(.Names[0] == \"/$container_name\") | .Id")

    if [ -n "$container_id" ]; then
        # 로그 조회
        curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
            "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/containers/$container_id/logs?stdout=true&stderr=true&tail=100&timestamps=true"
    else
        log_error "컨테이너를 찾을 수 없습니다: $container_name"
    fi
}

# ===== 스택 재시작 =====
restart_stack() {
    log_info "스택 재시작 중..."

    local containers=(
        "safework-app"
        "safework-postgres"
        "safework-redis"
    )

    for container in "${containers[@]}"; do
        log_info "$container 재시작 중..."

        # 컨테이너 ID 찾기
        local container_id=$(portainer_api GET "endpoints/$ENDPOINT_ID/docker/containers/json" | \
            jq -r ".[] | select(.Names[0] == \"/$container\") | .Id")

        if [ -n "$container_id" ]; then
            portainer_api POST "endpoints/$ENDPOINT_ID/docker/containers/$container_id/restart"
            log_success "$container 재시작 완료"
        else
            log_warning "$container를 찾을 수 없습니다"
        fi
    done

    # 헬스체크
    sleep 10
    health_check "https://safework.jclee.me/health"
}

# ===== 이미지 업데이트 및 재배포 =====
update_and_deploy() {
    log_info "이미지 업데이트 및 재배포 시작..."

    # 1. 최신 이미지 풀
    local images=(
        "safework/app"
        "safework/postgres"
        "safework/redis"
    )

    for image in "${images[@]}"; do
        log_info "이미지 풀: $REGISTRY_URL/$image:latest"
        docker pull "$REGISTRY_URL/$image:latest"
    done

    # 2. 스택 ID 확인
    local stack_id=$(check_stack_exists "safework")

    if [ -n "$stack_id" ]; then
        # 기존 스택 업데이트
        log_info "스택 업데이트 중..."

        local compose_file="$SCRIPT_DIR/../docker-compose.yml"
        local compose_content=$(cat "$compose_file" | jq -Rs .)

        portainer_api PUT "stacks/$stack_id?endpointId=$ENDPOINT_ID" "{
            \"StackFileContent\": $compose_content,
            \"Prune\": true,
            \"PullImage\": true
        }"

        log_success "스택 업데이트 완료"
    else
        # 새 스택 생성
        "$SCRIPT_DIR/deploy-stable.sh"
    fi
}

# ===== 스택 삭제 =====
remove_stack() {
    log_warning "스택을 완전히 삭제합니다!"

    read -p "정말로 삭제하시겠습니까? (yes/no) " -r
    if [ "$REPLY" != "yes" ]; then
        log_info "취소됨"
        exit 0
    fi

    local stack_id=$(check_stack_exists "safework")

    if [ -n "$stack_id" ]; then
        log_info "스택 삭제 중 (ID: $stack_id)..."
        portainer_api DELETE "stacks/$stack_id?endpointId=$ENDPOINT_ID"
        log_success "스택 삭제 완료"
    else
        log_info "삭제할 스택이 없습니다"
    fi
}

# ===== 설정 백업 =====
backup_config() {
    local backup_dir="$SCRIPT_DIR/backups"
    mkdir -p "$backup_dir"

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$backup_dir/safework_backup_$timestamp.tar.gz"

    log_info "설정 백업 중..."

    tar -czf "$backup_file" \
        -C "$SCRIPT_DIR/.." \
        docker-compose.yml \
        scripts/config.env \
        .env 2>/dev/null || true

    log_success "백업 완료: $backup_file"
}

# ===== 메인 처리 =====
case "${1:-help}" in
    deploy)
        "$SCRIPT_DIR/deploy-stable.sh"
        ;;
    status)
        check_status
        ;;
    logs)
        view_logs "${2:-safework-app}"
        ;;
    restart)
        restart_stack
        ;;
    stop)
        log_info "스택 중지 기능은 Portainer UI에서 수행하세요"
        ;;
    start)
        log_info "스택 시작 기능은 Portainer UI에서 수행하세요"
        ;;
    remove)
        remove_stack
        ;;
    health)
        health_check "https://safework.jclee.me/health"
        ;;
    update)
        update_and_deploy
        ;;
    backup)
        backup_config
        ;;
    restore)
        log_info "복원 기능은 수동으로 수행하세요"
        ;;
    help|*)
        show_help
        ;;
esac