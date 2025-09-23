#!/bin/bash

# SafeWork 지능형 배포 전략 스크립트
# Version: 1.0.0
# Date: 2025-09-23

set -euo pipefail

# 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="https://safework.jclee.me"
PORTAINER_URL="https://portainer.jclee.me"
WEBHOOK_TIMEOUT=30
API_TIMEOUT=120

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 로깅 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') - $1"
}

log_strategy() {
    echo -e "${CYAN}[STRATEGY]${NC} $(date '+%H:%M:%S') - $1"
}

# 도움말
show_help() {
    cat << EOF
SafeWork 지능형 배포 전략 스크립트

사용법:
    $0 [OPTIONS] STRATEGY

전략 (STRATEGY):
    auto        자동 전략 선택 (권장)
    webhook     Webhook 우선 전략
    api         API 우선 전략
    hybrid      하이브리드 전략 (Webhook + API 검증)

옵션:
    -h, --help              이 도움말 표시
    -v, --verbose           자세한 출력
    -t, --timeout SECONDS   타임아웃 설정 (기본: 30초)
    --skip-health           헬스체크 건너뛰기
    --force-fallback        강제 Fallback 사용

예시:
    $0 auto                    # 자동 전략 선택
    $0 webhook --verbose      # Webhook 전략, 자세한 출력
    $0 hybrid -t 60           # 하이브리드 전략, 60초 타임아웃

EOF
}

# 환경 검증
check_environment() {
    log_info "배포 환경 검증 중..."

    local missing_vars=()

    # Webhook 전략 확인
    if [ -z "${PORTAINER_WEBHOOK_URL:-}" ]; then
        missing_vars+=("PORTAINER_WEBHOOK_URL")
    fi

    # API 전략 확인
    if [ -z "${PORTAINER_TOKEN:-}" ] && [ -z "${PORTAINER_API_KEY:-}" ]; then
        missing_vars+=("PORTAINER_TOKEN or PORTAINER_API_KEY")
    fi

    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_warning "일부 환경변수가 설정되지 않았습니다:"
        printf ' - %s\n' "${missing_vars[@]}"
        log_warning "사용 가능한 배포 전략이 제한될 수 있습니다."
        return 1
    fi

    log_success "환경 검증 완료"
    return 0
}

# 서비스 상태 확인
check_service_status() {
    log_info "현재 서비스 상태 확인 중..."

    local response
    response=$(curl -s -m 10 -w "\n%{http_code}" "$BASE_URL/health" 2>/dev/null || echo "")

    if [ -n "$response" ]; then
        local http_code
        http_code=$(echo "$response" | tail -n1)

        if [ "$http_code" = "200" ]; then
            local body
            body=$(echo "$response" | head -n -1)
            local status
            status=$(echo "$body" | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")

            if [ "$status" = "healthy" ]; then
                log_success "서비스가 정상 작동 중입니다"
                return 0
            else
                log_warning "서비스가 비정상 상태입니다: $status"
                return 1
            fi
        else
            log_warning "서비스 응답 오류: HTTP $http_code"
            return 1
        fi
    else
        log_warning "서비스에 연결할 수 없습니다"
        return 1
    fi
}

# Portainer API 연결 확인
check_portainer_api() {
    log_info "Portainer API 연결 확인 중..."

    if [ -z "${PORTAINER_TOKEN:-}" ] && [ -z "${PORTAINER_API_KEY:-}" ]; then
        log_warning "Portainer API 토큰이 설정되지 않았습니다"
        return 1
    fi

    local api_key="${PORTAINER_API_KEY:-$PORTAINER_TOKEN}"
    local response
    response=$(curl -s -m 10 -w "\n%{http_code}" \
        -H "X-API-Key: $api_key" \
        "$PORTAINER_URL/api/status" 2>/dev/null || echo "")

    if [ -n "$response" ]; then
        local http_code
        http_code=$(echo "$response" | tail -n1)

        if [ "$http_code" = "200" ]; then
            log_success "Portainer API 연결 정상"
            return 0
        else
            log_warning "Portainer API 응답 오류: HTTP $http_code"
            return 1
        fi
    else
        log_warning "Portainer API에 연결할 수 없습니다"
        return 1
    fi
}

# Webhook 배포 전략
deploy_webhook() {
    log_strategy "Webhook 배포 전략 실행 중..."

    if [ -z "${PORTAINER_WEBHOOK_URL:-}" ]; then
        log_error "PORTAINER_WEBHOOK_URL이 설정되지 않았습니다"
        return 1
    fi

    log_info "Webhook 호출 중..."
    local response
    response=$(timeout "$WEBHOOK_TIMEOUT" curl -s -w "\n%{http_code}" -X POST "$PORTAINER_WEBHOOK_URL" 2>/dev/null || echo "")

    if [ -n "$response" ]; then
        local http_code
        http_code=$(echo "$response" | tail -n1)
        local body
        body=$(echo "$response" | head -n -1)

        log_info "Webhook 응답: HTTP $http_code"

        if [ "$http_code" = "200" ] || [ "$http_code" = "204" ]; then
            log_success "Webhook 배포 요청 성공!"
            return 0
        else
            log_error "Webhook 배포 실패: HTTP $http_code"
            [ -n "$body" ] && echo "응답: $body"
            return 1
        fi
    else
        log_error "Webhook 호출 타임아웃 또는 연결 실패"
        return 1
    fi
}

# API 배포 전략
deploy_api() {
    log_strategy "API 배포 전략 실행 중..."

    if [ ! -f "$SCRIPT_DIR/backup/portainer_api_deploy_v2.0.0.sh" ]; then
        log_error "API 배포 스크립트를 찾을 수 없습니다"
        return 1
    fi

    log_info "API 스크립트 실행 중..."
    if timeout "$API_TIMEOUT" "$SCRIPT_DIR/backup/portainer_api_deploy_v2.0.0.sh" deploy; then
        log_success "API 배포 성공!"
        return 0
    else
        log_error "API 배포 실패"
        return 1
    fi
}

# 배포 전략 선택
select_strategy() {
    local requested_strategy="$1"
    local force_fallback="${2:-false}"

    log_info "배포 전략 분석 중..."

    # 강제 Fallback
    if [ "$force_fallback" = "true" ]; then
        log_strategy "강제 Fallback 모드 - API 전략 선택"
        echo "api"
        return 0
    fi

    # 환경 상태 확인
    local webhook_available=false
    local api_available=false
    local service_healthy=false

    if [ -n "${PORTAINER_WEBHOOK_URL:-}" ]; then
        webhook_available=true
    fi

    if check_portainer_api; then
        api_available=true
    fi

    if check_service_status; then
        service_healthy=true
    fi

    log_info "환경 분석 결과:"
    log_info "  - Webhook 사용 가능: $webhook_available"
    log_info "  - API 사용 가능: $api_available"
    log_info "  - 서비스 상태: $service_healthy"

    # 전략 결정
    case "$requested_strategy" in
        auto)
            if [ "$webhook_available" = true ] && [ "$service_healthy" = true ]; then
                log_strategy "자동 전략: Webhook 선택 (서비스 정상)"
                echo "webhook"
            elif [ "$webhook_available" = true ]; then
                log_strategy "자동 전략: Webhook 선택 (기본)"
                echo "webhook"
            elif [ "$api_available" = true ]; then
                log_strategy "자동 전략: API 선택 (Webhook 불가)"
                echo "api"
            else
                log_error "사용 가능한 배포 전략이 없습니다"
                return 1
            fi
            ;;
        webhook)
            if [ "$webhook_available" = true ]; then
                log_strategy "요청된 전략: Webhook"
                echo "webhook"
            else
                log_error "Webhook 전략을 사용할 수 없습니다"
                return 1
            fi
            ;;
        api)
            if [ "$api_available" = true ]; then
                log_strategy "요청된 전략: API"
                echo "api"
            else
                log_error "API 전략을 사용할 수 없습니다"
                return 1
            fi
            ;;
        hybrid)
            if [ "$webhook_available" = true ] && [ "$api_available" = true ]; then
                log_strategy "요청된 전략: Hybrid"
                echo "hybrid"
            else
                log_error "Hybrid 전략을 사용할 수 없습니다 (Webhook과 API 모두 필요)"
                return 1
            fi
            ;;
        *)
            log_error "알 수 없는 전략: $requested_strategy"
            return 1
            ;;
    esac
}

# Hybrid 배포 전략
deploy_hybrid() {
    log_strategy "Hybrid 배포 전략 실행 중..."

    # 1단계: Webhook 시도
    log_info "1단계: Webhook 배포 시도..."
    if deploy_webhook; then
        log_success "Webhook 배포 성공"

        # 2단계: API로 검증
        log_info "2단계: API를 통한 상태 검증..."
        sleep 10

        if check_portainer_api && check_service_status; then
            log_success "Hybrid 배포 완료 - Webhook 성공, API 검증 완료"
            return 0
        else
            log_warning "Webhook은 성공했으나 검증에서 문제 발견"
            return 1
        fi
    else
        log_warning "Webhook 실패 - API 배포로 전환"
        return deploy_api
    fi
}

# 메인 배포 실행
execute_deployment() {
    local strategy="$1"
    local skip_health="${2:-false}"

    log_info "배포 실행 시작: $strategy 전략"

    case "$strategy" in
        webhook)
            if deploy_webhook; then
                deployment_success=true
            else
                deployment_success=false
            fi
            ;;
        api)
            if deploy_api; then
                deployment_success=true
            else
                deployment_success=false
            fi
            ;;
        hybrid)
            if deploy_hybrid; then
                deployment_success=true
            else
                deployment_success=false
            fi
            ;;
        *)
            log_error "지원되지 않는 전략: $strategy"
            return 1
            ;;
    esac

    if [ "$deployment_success" = true ]; then
        log_success "배포 완료!"

        if [ "$skip_health" = false ]; then
            log_info "최종 헬스체크 실행 중..."
            sleep 20

            if [ -f "$SCRIPT_DIR/deployment_health_validator.sh" ]; then
                if "$SCRIPT_DIR/deployment_health_validator.sh" --max-attempts 10; then
                    log_success "모든 검증 완료!"
                    return 0
                else
                    log_warning "배포는 성공했으나 헬스체크에서 문제 감지"
                    return 1
                fi
            else
                log_info "헬스체크 스크립트를 찾을 수 없습니다 - 기본 확인만 수행"
                if check_service_status; then
                    log_success "기본 헬스체크 통과!"
                    return 0
                else
                    log_warning "기본 헬스체크 실패"
                    return 1
                fi
            fi
        else
            log_info "헬스체크 건너뛰기"
            return 0
        fi
    else
        log_error "배포 실패"
        return 1
    fi
}

# 명령행 인수 파싱
VERBOSE=false
SKIP_HEALTH=false
FORCE_FALLBACK=false
TIMEOUT=30
STRATEGY=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            WEBHOOK_TIMEOUT="$2"
            shift 2
            ;;
        --skip-health)
            SKIP_HEALTH=true
            shift
            ;;
        --force-fallback)
            FORCE_FALLBACK=true
            shift
            ;;
        auto|webhook|api|hybrid)
            STRATEGY="$1"
            shift
            ;;
        *)
            log_error "알 수 없는 옵션: $1"
            show_help
            exit 1
            ;;
    esac
done

# 전략이 지정되지 않은 경우 기본값
if [ -z "$STRATEGY" ]; then
    STRATEGY="auto"
fi

# 메인 실행
main() {
    log_info "SafeWork 지능형 배포 시스템 v1.0"
    log_info "요청된 전략: $STRATEGY"

    # 환경 검증
    check_environment || log_warning "환경 검증에서 경고 발생"

    # 전략 선택
    local selected_strategy
    if ! selected_strategy=$(select_strategy "$STRATEGY" "$FORCE_FALLBACK"); then
        log_error "적합한 배포 전략을 선택할 수 없습니다"
        exit 1
    fi

    log_info "선택된 전략: $selected_strategy"

    # 배포 실행
    if execute_deployment "$selected_strategy" "$SKIP_HEALTH"; then
        log_success "SafeWork 지능형 배포 성공!"
        log_success "🌐 서비스 URL: $BASE_URL"
        exit 0
    else
        log_error "SafeWork 지능형 배포 실패!"
        exit 1
    fi
}

# 스크립트가 직접 실행된 경우에만 main 함수 호출
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi