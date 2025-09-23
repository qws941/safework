#!/bin/bash

# SafeWork GitHub Secrets 검증 스크립트
# 로컬 환경 및 GitHub Actions에서 필수 시크릿 검증

set -euo pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로깅 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# 필수 시크릿 목록
REQUIRED_SECRETS=(
    "PORTAINER_TOKEN"
    "REGISTRY_PASSWORD"
    "DB_PASSWORD"
    "SECRET_KEY"
    "ADMIN_USERNAME"
    "ADMIN_PASSWORD"
)

# 선택적 시크릿 목록
OPTIONAL_SECRETS=(
    "SLACK_WEBHOOK_URL"
    "SLACK_BOT_TOKEN"
)

validate_secret() {
    local secret_name=$1
    local secret_value="${!secret_name:-}"

    if [ -z "$secret_value" ]; then
        return 1
    fi

    # 길이 검증 (특정 시크릿 제외)
    case $secret_name in
        "ADMIN_USERNAME")
            # ADMIN_USERNAME은 별도 검증
            ;;
        *)
            if [ ${#secret_value} -lt 8 ]; then
                log_warning "$secret_name: 너무 짧음 (8자 이상 권장)"
                return 1
            fi
            ;;
    esac

    # 특정 시크릿 검증
    case $secret_name in
        "PORTAINER_TOKEN")
            if [[ ! $secret_value =~ ^ptr_ ]]; then
                log_warning "$secret_name: Portainer 토큰 형식이 아님 (ptr_로 시작해야 함)"
                return 1
            fi
            ;;
        "SECRET_KEY")
            if [ ${#secret_value} -lt 32 ]; then
                log_warning "$secret_name: Flask SECRET_KEY는 32자 이상 권장"
                return 1
            fi
            ;;
        "ADMIN_USERNAME")
            # Admin username은 표준 이름 허용
            if [ ${#secret_value} -lt 4 ]; then
                log_warning "$secret_name: 사용자명이 너무 짧음 (4자 이상 권장)"
                return 1
            fi
            ;;
    esac

    return 0
}

test_portainer_connection() {
    if [ -z "${PORTAINER_TOKEN:-}" ]; then
        log_error "PORTAINER_TOKEN이 설정되지 않아 연결 테스트를 건너뜁니다"
        return 1
    fi

    log_info "Portainer API 연결 테스트 중..."

    local response
    response=$(curl -s -w "\n%{http_code}" \
        -H "X-API-Key: $PORTAINER_TOKEN" \
        "https://portainer.jclee.me/api/status" 2>/dev/null || echo "")

    if [ -n "$response" ]; then
        local http_code
        http_code=$(echo "$response" | tail -n1)
        local body
        body=$(echo "$response" | head -n -1)

        if [ "$http_code" = "200" ]; then
            log_success "Portainer API 연결 성공"
            return 0
        else
            log_error "Portainer API 연결 실패: HTTP $http_code"
            return 1
        fi
    else
        log_error "Portainer API 응답 없음"
        return 1
    fi
}

# 메인 검증 함수
main() {
    log_info "========================================="
    log_info "   SafeWork GitHub Secrets 검증"
    log_info "========================================="

    local missing_required=()
    local invalid_secrets=()
    local missing_optional=()

    # 필수 시크릿 검증
    log_info "필수 시크릿 검증 중..."
    for secret in "${REQUIRED_SECRETS[@]}"; do
        if [ -z "${!secret:-}" ]; then
            missing_required+=("$secret")
            log_error "❌ $secret: 설정되지 않음"
        elif validate_secret "$secret"; then
            log_success "✅ $secret: 정상"
        else
            invalid_secrets+=("$secret")
            log_warning "⚠️  $secret: 형식 문제"
        fi
    done

    # 선택적 시크릿 검증
    log_info "선택적 시크릿 검증 중..."
    for secret in "${OPTIONAL_SECRETS[@]}"; do
        if [ -z "${!secret:-}" ]; then
            missing_optional+=("$secret")
            log_warning "⚠️  $secret: 설정되지 않음 (선택사항)"
        elif validate_secret "$secret"; then
            log_success "✅ $secret: 정상"
        else
            log_warning "⚠️  $secret: 형식 문제"
        fi
    done

    # Portainer 연결 테스트
    log_info "Portainer 연결 테스트..."
    if test_portainer_connection; then
        log_success "✅ Portainer API 연결 성공"
    else
        log_error "❌ Portainer API 연결 실패"
    fi

    # 결과 요약
    log_info "========================================="
    log_info "   검증 결과 요약"
    log_info "========================================="

    if [ ${#missing_required[@]} -eq 0 ] && [ ${#invalid_secrets[@]} -eq 0 ]; then
        log_success "🎉 모든 필수 시크릿이 정상적으로 설정되었습니다!"

        if [ ${#missing_optional[@]} -gt 0 ]; then
            log_info "선택적 시크릿 ${#missing_optional[@]}개가 설정되지 않았지만 문제없습니다."
        fi

        return 0
    else
        log_error "❌ 시크릿 설정에 문제가 있습니다:"

        if [ ${#missing_required[@]} -gt 0 ]; then
            log_error "  누락된 필수 시크릿: ${missing_required[*]}"
        fi

        if [ ${#invalid_secrets[@]} -gt 0 ]; then
            log_error "  형식 문제가 있는 시크릿: ${invalid_secrets[*]}"
        fi

        log_error ""
        log_error "GitHub Actions Secrets 설정 방법:"
        log_error "1. GitHub 리포지토리 → Settings → Secrets and variables → Actions"
        log_error "2. 'New repository secret' 클릭"
        log_error "3. 누락된 시크릿들을 추가"

        return 1
    fi
}

# 스크립트 실행
main "$@"