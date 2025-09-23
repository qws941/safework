#!/bin/bash

# SafeWork 배포 헬스체크 검증 도구
# 사용법: ./deployment_health_validator.sh [options]

set -euo pipefail

# 설정
BASE_URL="https://safework.jclee.me"
PORTAINER_URL="https://portainer.jclee.me"
MAX_ATTEMPTS=15
INITIAL_WAIT=20
RETRY_INTERVAL=8
TIMEOUT=10

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로깅 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
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

# 도움말
show_help() {
    cat << EOF
SafeWork 배포 헬스체크 검증 도구

사용법:
    $0 [OPTIONS]

옵션:
    -h, --help          이 도움말 표시
    -w, --wait TIME     초기 대기 시간 (기본: 20초)
    -m, --max-attempts  최대 시도 횟수 (기본: 15회)
    -i, --interval      재시도 간격 (기본: 8초)
    -t, --timeout       HTTP 타임아웃 (기본: 10초)
    -v, --verbose       자세한 출력
    --skip-container    컨테이너 상태 확인 건너뛰기
    --skip-endpoints    엔드포인트 검증 건너뛰기

예시:
    $0                                    # 기본 설정으로 헬스체크
    $0 -w 30 -m 20                       # 30초 대기, 최대 20회 시도
    $0 --skip-container --verbose        # 컨테이너 확인 생략, 자세한 출력

EOF
}

# 명령행 인수 파싱
VERBOSE=false
SKIP_CONTAINER=false
SKIP_ENDPOINTS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -w|--wait)
            INITIAL_WAIT="$2"
            shift 2
            ;;
        -m|--max-attempts)
            MAX_ATTEMPTS="$2"
            shift 2
            ;;
        -i|--interval)
            RETRY_INTERVAL="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --skip-container)
            SKIP_CONTAINER=true
            shift
            ;;
        --skip-endpoints)
            SKIP_ENDPOINTS=true
            shift
            ;;
        *)
            log_error "알 수 없는 옵션: $1"
            show_help
            exit 1
            ;;
    esac
done

# 환경변수 검증
check_environment() {
    log_info "환경변수 검증 중..."

    local missing_vars=()

    if [ -z "${PORTAINER_API_KEY:-}" ] && [ "$SKIP_CONTAINER" = false ]; then
        missing_vars+=("PORTAINER_API_KEY")
    fi

    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "필수 환경변수가 설정되지 않았습니다:"
        printf ' - %s\n' "${missing_vars[@]}"
        return 1
    fi

    log_success "환경변수 검증 완료"
}

# 컨테이너 상태 확인
check_container_status() {
    if [ "$SKIP_CONTAINER" = true ]; then
        log_info "컨테이너 상태 확인을 건너뜁니다."
        return 0
    fi

    log_info "컨테이너 상태 확인 중..."

    local response
    response=$(curl -s -m "$TIMEOUT" \
        -H "X-API-Key: ${PORTAINER_API_KEY}" \
        "$PORTAINER_URL/api/endpoints/3/docker/containers/json?filters=%7B%22name%22%3A%5B%22safework%22%5D%7D" \
        2>/dev/null || echo "")

    if [ -z "$response" ]; then
        log_warning "컨테이너 상태를 가져올 수 없습니다."
        return 1
    fi

    local container_count
    container_count=$(echo "$response" | jq '. | length' 2>/dev/null || echo "0")

    if [ "$container_count" -eq 0 ]; then
        log_warning "SafeWork 컨테이너를 찾을 수 없습니다."
        return 1
    fi

    local running_count
    running_count=$(echo "$response" | jq '[.[] | select(.State == "running")] | length' 2>/dev/null || echo "0")

    log_info "총 컨테이너: $container_count, 실행 중: $running_count"

    if [ "$running_count" -lt "$container_count" ]; then
        log_warning "일부 컨테이너가 실행되지 않고 있습니다."
        if [ "$VERBOSE" = true ]; then
            echo "$response" | jq '.[] | {Name: .Names[0], State, Status}' 2>/dev/null || true
        fi
        return 1
    fi

    log_success "모든 SafeWork 컨테이너가 정상 실행 중입니다."
    return 0
}

# 애플리케이션 헬스체크
check_application_health() {
    log_info "애플리케이션 헬스체크 중..."

    local response
    response=$(curl -s -m "$TIMEOUT" -w "\n%{http_code}" "$BASE_URL/health" 2>/dev/null || echo "")

    if [ -z "$response" ]; then
        log_error "헬스체크 엔드포인트에서 응답이 없습니다."
        return 1
    fi

    local http_code
    http_code=$(echo "$response" | tail -n1)
    local body
    body=$(echo "$response" | head -n -1)

    if [ "$VERBOSE" = true ]; then
        log_info "HTTP Status: $http_code"
        log_info "Response: $body"
    fi

    if [ "$http_code" != "200" ]; then
        log_error "헬스체크 실패: HTTP $http_code"
        return 1
    fi

    # JSON 파싱 및 상태 검증
    local status database_status redis_status
    status=$(echo "$body" | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
    database_status=$(echo "$body" | jq -r '.database // "unknown"' 2>/dev/null || echo "unknown")
    redis_status=$(echo "$body" | jq -r '.redis // "unknown"' 2>/dev/null || echo "unknown")

    log_info "Application: $status"
    log_info "Database: $database_status"
    log_info "Redis: $redis_status"

    if [ "$status" != "healthy" ] || [ "$database_status" != "connected" ] || [ "$redis_status" != "connected" ]; then
        log_error "컴포넌트 상태 이상 감지"
        return 1
    fi

    log_success "모든 컴포넌트가 정상 상태입니다."
    return 0
}

# 주요 엔드포인트 검증
check_endpoints() {
    if [ "$SKIP_ENDPOINTS" = true ]; then
        log_info "엔드포인트 검증을 건너뜁니다."
        return 0
    fi

    log_info "주요 엔드포인트 검증 중..."

    local endpoints=(
        "/admin/login:200"
        "/survey:200"
        "/api/safework/v2/health:200"
    )

    local failed_endpoints=()

    for endpoint_info in "${endpoints[@]}"; do
        local endpoint expected_code
        endpoint="${endpoint_info%:*}"
        expected_code="${endpoint_info#*:}"

        local response
        response=$(curl -s -m 5 -w "\n%{http_code}" "$BASE_URL$endpoint" 2>/dev/null || echo "")

        if [ -n "$response" ]; then
            local http_code
            http_code=$(echo "$response" | tail -n1)

            if [ "$http_code" = "$expected_code" ]; then
                if [ "$VERBOSE" = true ]; then
                    log_success "$endpoint: HTTP $http_code"
                fi
            else
                log_warning "$endpoint: HTTP $http_code (예상: $expected_code)"
                failed_endpoints+=("$endpoint")
            fi
        else
            log_warning "$endpoint: 응답 없음"
            failed_endpoints+=("$endpoint")
        fi
    done

    if [ ${#failed_endpoints[@]} -gt 0 ]; then
        log_warning "일부 엔드포인트에서 문제가 감지되었습니다:"
        printf ' - %s\n' "${failed_endpoints[@]}"
        return 1
    fi

    log_success "모든 엔드포인트가 정상입니다."
    return 0
}

# 디버그 정보 수집
collect_debug_info() {
    log_info "디버그 정보 수집 중..."

    # Portainer 스택 상태
    if [ "$SKIP_CONTAINER" = false ] && [ -n "${PORTAINER_API_KEY:-}" ]; then
        log_info "Portainer 스택 정보:"
        curl -s -m "$TIMEOUT" \
            -H "X-API-Key: ${PORTAINER_API_KEY}" \
            "$PORTAINER_URL/api/stacks" \
            | jq '.[] | select(.Name | contains("safework")) | {Name, Status, CreationDate}' 2>/dev/null || \
            log_warning "스택 정보 조회 실패"
    fi

    # 기본 연결성 테스트
    log_info "기본 연결성 테스트:"
    if curl -s -m 5 "$BASE_URL" >/dev/null 2>&1; then
        log_info "✅ 기본 연결 가능"
    else
        log_warning "❌ 기본 연결 실패"
    fi
}

# 메인 검증 루프
main_validation() {
    log_info "SafeWork 배포 검증 시작..."
    log_info "설정: 최대 $MAX_ATTEMPTS회 시도, $RETRY_INTERVAL초 간격, $TIMEOUT초 타임아웃"

    # 초기 대기
    log_info "초기 대기 중 ($INITIAL_WAIT초)..."
    sleep "$INITIAL_WAIT"

    local attempt=1
    local last_error=""

    while [ $attempt -le $MAX_ATTEMPTS ]; do
        log_info "검증 시도 $attempt/$MAX_ATTEMPTS..."

        local container_ok=true
        local app_ok=true
        local endpoints_ok=true

        # 컨테이너 상태 확인
        if ! check_container_status; then
            container_ok=false
            last_error="컨테이너 상태 이상"
        fi

        # 애플리케이션 헬스체크
        if ! check_application_health; then
            app_ok=false
            last_error="애플리케이션 헬스체크 실패"
        fi

        # 엔드포인트 검증
        if ! check_endpoints; then
            endpoints_ok=false
            # 엔드포인트 실패는 치명적이지 않음
            if [ "$container_ok" = true ] && [ "$app_ok" = true ]; then
                log_warning "엔드포인트 일부 문제 있지만 헬스체크는 성공"
            fi
        fi

        # 성공 조건: 컨테이너와 애플리케이션이 모두 정상
        if [ "$container_ok" = true ] && [ "$app_ok" = true ]; then
            log_success "배포 검증 완료!"
            log_success "🌐 서비스 URL: $BASE_URL"
            log_success "📊 모든 컴포넌트가 정상 작동 중입니다."
            return 0
        fi

        log_error "검증 실패: $last_error"

        if [ $attempt -eq $MAX_ATTEMPTS ]; then
            log_error "최대 시도 횟수 초과 - 배포 검증 실패"
            log_error "최종 오류: $last_error"
            collect_debug_info
            return 1
        fi

        attempt=$((attempt + 1))
        log_info "${RETRY_INTERVAL}초 후 재시도..."
        sleep "$RETRY_INTERVAL"
    done
}

# 메인 실행
main() {
    log_info "SafeWork 배포 헬스체크 검증 도구 v1.0"

    if ! check_environment; then
        exit 1
    fi

    if main_validation; then
        log_success "모든 검증이 완료되었습니다."
        exit 0
    else
        log_error "배포 검증에 실패했습니다."
        exit 1
    fi
}

# 스크립트가 직접 실행된 경우에만 main 함수 호출
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi