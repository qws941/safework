#!/bin/bash
# SafeWork GitHub Secrets 자동 설정 스크립트
# GitHub CLI를 사용하여 필요한 모든 secrets을 자동으로 설정합니다.

set -euo pipefail

# 환경 설정 로드
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.env"

log_info "SafeWork GitHub Secrets 자동 설정을 시작합니다..."

# GitHub CLI 인증 확인
if ! gh auth status > /dev/null 2>&1; then
    log_error "GitHub CLI 인증이 필요합니다"
    log_info "다음 명령어로 로그인하세요: gh auth login"
    exit 1
fi

log_success "GitHub CLI 인증 확인됨"

# 현재 저장소 확인
if ! git remote get-url origin > /dev/null 2>&1; then
    log_error "Git 저장소를 찾을 수 없습니다"
    exit 1
fi

REPO_URL=$(git remote get-url origin)
log_info "저장소: $REPO_URL"

# GitHub Secrets 설정 함수
set_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=${3:-""}

    log_info "Setting secret: $secret_name"
    if echo "$secret_value" | gh secret set "$secret_name"; then
        log_success "✅ $secret_name 설정 완료 $description"
    else
        log_error "❌ $secret_name 설정 실패"
        return 1
    fi
}

# 필수 GitHub Secrets 설정
log_info "===== GitHub Secrets 설정 시작 ====="

# Registry 관련
set_secret "REGISTRY_PASSWORD" "$REGISTRY_PASSWORD" "(Docker Registry 비밀번호)"

# Database 관련
set_secret "DB_PASSWORD" "$DB_PASSWORD" "(PostgreSQL 비밀번호)"

# Portainer API 관련
set_secret "PORTAINER_TOKEN" "$PORTAINER_TOKEN" "(Portainer API 토큰)"

# Admin 관련
set_secret "ADMIN_USERNAME" "$ADMIN_USERNAME" "(관리자 사용자명)"
set_secret "ADMIN_PASSWORD" "$ADMIN_PASSWORD" "(관리자 비밀번호)"

# Security 관련
set_secret "SECRET_KEY" "$SECRET_KEY" "(Flask 시크릿 키)"

log_success "===== 모든 GitHub Secrets 설정 완료 ====="

# 설정된 secrets 확인
log_info "===== 설정된 Secrets 목록 ====="
gh secret list

# GitHub Actions 워크플로우 테스트
log_info "===== GitHub Actions 워크플로우 확인 ====="
if gh workflow list | grep -q "SafeWork Docker Build"; then
    log_success "✅ SafeWork Docker Build 워크플로우 발견됨"

    # 워크플로우 상태 확인
    log_info "최근 워크플로우 실행 상태:"
    gh run list --limit 5 --workflow="deploy.yml"
else
    log_warning "⚠️ SafeWork Docker Build 워크플로우를 찾을 수 없습니다"
fi

log_success "🎉 GitHub Secrets 자동 설정이 완료되었습니다!"
log_info "이제 다음 명령어로 배포를 테스트할 수 있습니다:"
log_info "  ./scripts/github_actions_deploy_trigger.sh"
log_info "  또는 GitHub Actions 탭에서 수동으로 실행하세요"