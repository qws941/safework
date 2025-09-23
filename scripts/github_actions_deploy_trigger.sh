#!/bin/bash
# GitHub Actions 연동 배포 스크립트

set -euo pipefail

# 환경 설정 로드
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.env"

# ===== 함수 정의 =====
trigger_workflow() {
    local deploy_to_prod=${1:-false}

    log_info "GitHub Actions 워크플로우 트리거 중..."

    # GitHub API를 통한 워크플로우 트리거
    if [ -z "${GITHUB_TOKEN:-}" ]; then
        log_error "GITHUB_TOKEN이 설정되지 않았습니다"
        log_info "수동으로 GitHub Actions 탭에서 실행하세요"
        exit 1
    fi

    local response=$(curl -s -X POST \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/repos/qws941/safework/actions/workflows/deploy.yml/dispatches" \
        -d "{
            \"ref\": \"master\",
            \"inputs\": {
                \"deploy_to_production\": \"$deploy_to_prod\"
            }
        }")

    if [ -z "$response" ]; then
        log_success "워크플로우 트리거 성공!"
        log_info "GitHub Actions에서 진행 상황을 확인하세요:"
        log_info "https://github.com/qws941/safework/actions"
    else
        log_error "워크플로우 트리거 실패"
        echo "$response"
        exit 1
    fi
}

check_workflow_status() {
    log_info "최근 워크플로우 상태 확인 중..."

    if [ -z "${GITHUB_TOKEN:-}" ]; then
        log_warning "GITHUB_TOKEN이 없어 상태를 확인할 수 없습니다"
        return
    fi

    local runs=$(curl -s \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/repos/qws941/safework/actions/workflows/deploy.yml/runs?per_page=5")

    echo "$runs" | jq -r '.workflow_runs[] |
        "\(.created_at | split("T")[0]) - \(.status) - \(.conclusion // "running") - \(.head_commit.message | split("\n")[0])"' || {
        log_warning "워크플로우 상태를 파싱할 수 없습니다"
    }
}

setup_secrets() {
    log_info "GitHub Secrets 설정 가이드"

    cat << EOF

필수 GitHub Secrets:
1. REGISTRY_PASSWORD - Docker Registry 비밀번호
2. DB_PASSWORD - PostgreSQL 비밀번호
3. PORTAINER_TOKEN - Portainer API 토큰
4. ADMIN_USERNAME - 관리자 사용자명
5. ADMIN_PASSWORD - 관리자 비밀번호
6. SECRET_KEY - Flask 시크릿 키

GitHub CLI로 설정:
    gh secret set REGISTRY_PASSWORD --body "$REGISTRY_PASSWORD"
    gh secret set DB_PASSWORD --body "$DB_PASSWORD"
    gh secret set PORTAINER_TOKEN --body "$PORTAINER_TOKEN"
    gh secret set ADMIN_USERNAME --body "$ADMIN_USERNAME"
    gh secret set ADMIN_PASSWORD --body "$ADMIN_PASSWORD"
    gh secret set SECRET_KEY --body "$SECRET_KEY"

또는 GitHub UI에서 설정:
    https://github.com/qws941/safework/settings/secrets/actions

EOF
}

sync_env() {
    log_info "환경 변수 동기화 중..."

    # .env 파일 생성/업데이트
    cat > "$SCRIPT_DIR/../.env" << EOF
# Auto-generated from config.env
# $(date)

FLASK_CONFIG=production
APP_PORT=$APP_PORT
SECRET_KEY=$SECRET_KEY
TZ=$TZ

DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

REDIS_HOST=$REDIS_HOST
REDIS_PORT=$REDIS_PORT

ADMIN_USERNAME=$ADMIN_USERNAME
ADMIN_PASSWORD=$ADMIN_PASSWORD

REGISTRY_HOST=$REGISTRY_URL
REGISTRY_USER=$REGISTRY_USER
REGISTRY_PASSWORD=$REGISTRY_PASSWORD

PORTAINER_URL=$PORTAINER_URL
PORTAINER_TOKEN=$PORTAINER_TOKEN
PORTAINER_ENDPOINT=$ENDPOINT_ID
EOF

    log_success ".env 파일 동기화 완료"
}

# ===== 메인 처리 =====
show_menu() {
    echo
    echo "SafeWork GitHub Actions 배포 관리"
    echo "================================="
    echo "1. 빌드만 실행 (이미지 빌드 및 푸시)"
    echo "2. 빌드 + 프로덕션 배포"
    echo "3. 워크플로우 상태 확인"
    echo "4. GitHub Secrets 설정 가이드"
    echo "5. 환경 변수 동기화"
    echo "0. 종료"
    echo
    read -p "선택: " choice

    case $choice in
        1)
            trigger_workflow "false"
            ;;
        2)
            log_warning "프로덕션 배포를 진행합니다!"
            read -p "계속하시겠습니까? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                trigger_workflow "true"
            else
                log_info "취소되었습니다"
            fi
            ;;
        3)
            check_workflow_status
            ;;
        4)
            setup_secrets
            ;;
        5)
            sync_env
            ;;
        0)
            exit 0
            ;;
        *)
            log_error "잘못된 선택입니다"
            ;;
    esac
}

# 인자가 있으면 직접 실행, 없으면 메뉴 표시
if [ $# -gt 0 ]; then
    case "$1" in
        build)
            trigger_workflow "false"
            ;;
        deploy)
            trigger_workflow "true"
            ;;
        status)
            check_workflow_status
            ;;
        secrets)
            setup_secrets
            ;;
        sync)
            sync_env
            ;;
        *)
            log_error "사용법: $0 [build|deploy|status|secrets|sync]"
            exit 1
            ;;
    esac
else
    while true; do
        show_menu
    done
fi