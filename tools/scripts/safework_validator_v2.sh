#!/bin/bash
# SafeWork Enhanced Validation System v2.0
# Watchtower 독립 아키텍처 대응 통합 검증 시스템

set -e

# 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VALIDATION_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_DIR="$PROJECT_ROOT/validation_results"

# 네트워크 및 컨테이너 설정
NETWORK_NAME="safework_network"
OLD_NETWORK_NAME="watchtower_default"
EXPECTED_CONTAINERS=("safework-app" "safework-postgres" "safework-redis")
REGISTRY_BASE="registry.jclee.me/safework"

# 색상 및 이모지 정의
declare -A COLORS=(
    ["RED"]='\033[0;31m'
    ["GREEN"]='\033[0;32m'
    ["YELLOW"]='\033[1;33m'
    ["BLUE"]='\033[0;34m'
    ["PURPLE"]='\033[0;35m'
    ["CYAN"]='\033[0;36m'
    ["WHITE"]='\033[1;37m'
    ["NC"]='\033[0m'
)

declare -A ICONS=(
    ["SUCCESS"]="✅"
    ["ERROR"]="❌"
    ["WARNING"]="⚠️"
    ["INFO"]="ℹ️"
    ["RUNNING"]="🔄"
    ["NETWORK"]="🌐"
    ["CONTAINER"]="🐳"
    ["DATABASE"]="🗄️"
    ["API"]="🔗"
    ["SECURITY"]="🔒"
    ["PERFORMANCE"]="⚡"
)

# 로깅 함수들
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "SUCCESS") echo -e "${COLORS[GREEN]}${ICONS[SUCCESS]} [$timestamp]${COLORS[NC]} $message" ;;
        "ERROR")   echo -e "${COLORS[RED]}${ICONS[ERROR]} [$timestamp]${COLORS[NC]} $message" ;;
        "WARNING") echo -e "${COLORS[YELLOW]}${ICONS[WARNING]} [$timestamp]${COLORS[NC]} $message" ;;
        "INFO")    echo -e "${COLORS[BLUE]}${ICONS[INFO]} [$timestamp]${COLORS[NC]} $message" ;;
        "RUNNING") echo -e "${COLORS[CYAN]}${ICONS[RUNNING]} [$timestamp]${COLORS[NC]} $message" ;;
        *)         echo -e "${COLORS[WHITE]}[$timestamp]${COLORS[NC]} $message" ;;
    esac
}

# 결과 추적
declare -A VALIDATION_RESULTS
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

# 결과 기록 함수
record_result() {
    local category="$1"
    local test_name="$2"
    local status="$3"  # PASS, FAIL, WARNING
    local details="$4"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    case "$status" in
        "PASS") PASSED_TESTS=$((PASSED_TESTS + 1)) ;;
        "FAIL") FAILED_TESTS=$((FAILED_TESTS + 1)) ;;
        "WARNING") WARNING_TESTS=$((WARNING_TESTS + 1)) ;;
    esac
    
    VALIDATION_RESULTS["${category}_${test_name}"]="$status:$details"
}

# 헤더 출력
print_header() {
    echo -e "${COLORS[WHITE]}"
    echo "═══════════════════════════════════════════════════════════════"
    echo "🔍 SafeWork Enhanced Validation System v2.0"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🕒 실행 시간: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "📁 프로젝트 루트: $PROJECT_ROOT"
    echo "🌐 타겟 네트워크: $NETWORK_NAME"
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "${COLORS[NC]}"
}

# 1. 기본 환경 검증
validate_environment() {
    log "RUNNING" "기본 환경 검증 시작..."
    
    # Docker 설치 확인
    if command -v docker >/dev/null 2>&1; then
        local docker_version=$(docker --version 2>/dev/null | cut -d' ' -f3 | cut -d',' -f1)
        record_result "environment" "docker_installed" "PASS" "Docker $docker_version 설치됨"
        log "SUCCESS" "Docker 설치 확인: $docker_version"
    else
        record_result "environment" "docker_installed" "FAIL" "Docker가 설치되지 않음"
        log "ERROR" "Docker가 설치되지 않았습니다"
        return 1
    fi
    
    # Docker 서비스 상태 확인
    if docker info >/dev/null 2>&1; then
        record_result "environment" "docker_service" "PASS" "Docker 서비스 정상 실행 중"
        log "SUCCESS" "Docker 서비스 정상 동작"
    else
        record_result "environment" "docker_service" "FAIL" "Docker 서비스 접근 불가"
        log "ERROR" "Docker 서비스에 접근할 수 없습니다"
        return 1
    fi
    
    # 필수 명령어 확인
    local required_commands=("curl" "jq" "git")
    for cmd in "${required_commands[@]}"; do
        if command -v "$cmd" >/dev/null 2>&1; then
            record_result "environment" "${cmd}_available" "PASS" "$cmd 명령어 사용 가능"
        else
            record_result "environment" "${cmd}_available" "FAIL" "$cmd 명령어 누락"
            log "WARNING" "$cmd 명령어가 설치되지 않았습니다"
        fi
    done
}

# 2. 네트워크 아키텍처 검증
validate_network_architecture() {
    log "RUNNING" "네트워크 아키텍처 검증 시작..."
    
    # 신규 네트워크 존재 확인
    if docker network ls | grep -q "$NETWORK_NAME"; then
        local network_driver=$(docker network inspect "$NETWORK_NAME" --format '{{.Driver}}' 2>/dev/null)
        record_result "network" "safework_network_exists" "PASS" "safework_network 존재 (driver: $network_driver)"
        log "SUCCESS" "SafeWork 네트워크 존재 확인: $NETWORK_NAME ($network_driver)"
    else
        record_result "network" "safework_network_exists" "WARNING" "safework_network 미존재 (자동 생성 가능)"
        log "WARNING" "SafeWork 네트워크가 존재하지 않습니다 (자동 생성 가능)"
    fi
    
    # 기존 네트워크 상태 확인
    if docker network ls | grep -q "$OLD_NETWORK_NAME"; then
        local containers_on_old=$(docker network inspect "$OLD_NETWORK_NAME" --format '{{len .Containers}}' 2>/dev/null || echo "0")
        record_result "network" "watchtower_network_status" "WARNING" "watchtower_default 여전히 존재 (컨테이너: $containers_on_old개)"
        log "WARNING" "기존 Watchtower 네트워크가 여전히 존재합니다 (컨테이너: $containers_on_old개)"
    else
        record_result "network" "watchtower_network_status" "PASS" "watchtower_default 정리됨"
        log "SUCCESS" "기존 Watchtower 네트워크가 정리되었습니다"
    fi
    
    # 네트워크 연결성 테스트
    if docker network ls | grep -q "$NETWORK_NAME"; then
        local subnet=$(docker network inspect "$NETWORK_NAME" --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null)
        record_result "network" "network_configuration" "PASS" "네트워크 설정 확인 (subnet: $subnet)"
        log "SUCCESS" "네트워크 설정 정상: $subnet"
    fi
}

# 3. 컨테이너 상태 및 라벨 검증
validate_containers() {
    log "RUNNING" "컨테이너 상태 및 라벨 검증 시작..."
    
    for container in "${EXPECTED_CONTAINERS[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            # 컨테이너 상태 확인
            local status=$(docker inspect "$container" --format '{{.State.Status}}' 2>/dev/null)
            local health=$(docker inspect "$container" --format '{{.State.Health.Status}}' 2>/dev/null || echo "no-healthcheck")
            
            if [ "$status" = "running" ]; then
                record_result "containers" "${container}_status" "PASS" "실행 중 (health: $health)"
                log "SUCCESS" "$container 컨테이너 정상 실행 중 (health: $health)"
            else
                record_result "containers" "${container}_status" "FAIL" "비정상 상태: $status"
                log "ERROR" "$container 컨테이너 비정상 상태: $status"
            fi
            
            # 새로운 라벨 시스템 확인
            local deployment_label=$(docker inspect "$container" --format '{{index .Config.Labels "safework.deployment.auto"}}' 2>/dev/null || echo "not-set")
            local service_type=$(docker inspect "$container" --format '{{index .Config.Labels "safework.service.type"}}' 2>/dev/null || echo "not-set")
            
            if [ "$deployment_label" = "true" ]; then
                record_result "containers" "${container}_labels" "PASS" "새 라벨 시스템 적용됨 (type: $service_type)"
                log "SUCCESS" "$container - 새로운 라벨 시스템 적용 (type: $service_type)"
            else
                record_result "containers" "${container}_labels" "WARNING" "구 라벨 시스템 사용 중"
                log "WARNING" "$container - 아직 구 라벨 시스템 사용 중"
            fi
            
            # 네트워크 연결 확인
            local network=$(docker inspect "$container" --format '{{range $net, $conf := .NetworkSettings.Networks}}{{$net}}{{end}}' 2>/dev/null)
            if [[ "$network" == *"$NETWORK_NAME"* ]]; then
                record_result "containers" "${container}_network" "PASS" "새 네트워크 연결됨"
                log "SUCCESS" "$container - 새 네트워크에 연결됨"
            elif [[ "$network" == *"$OLD_NETWORK_NAME"* ]]; then
                record_result "containers" "${container}_network" "WARNING" "구 네트워크 사용 중"
                log "WARNING" "$container - 아직 구 네트워크 사용 중"
            else
                record_result "containers" "${container}_network" "FAIL" "알 수 없는 네트워크"
                log "ERROR" "$container - 알 수 없는 네트워크: $network"
            fi
        else
            record_result "containers" "${container}_status" "FAIL" "컨테이너 없음"
            log "ERROR" "$container 컨테이너를 찾을 수 없습니다"
        fi
    done
}

# 4. 서비스 기능 검증
validate_services() {
    log "RUNNING" "서비스 기능 검증 시작..."
    
    # API 헬스체크
    local health_response=$(curl -s --max-time 10 http://localhost:4545/health 2>/dev/null || echo "ERROR")
    if [[ "$health_response" == *"healthy"* ]]; then
        record_result "services" "api_health" "PASS" "API 헬스체크 성공"
        log "SUCCESS" "API 헬스체크 성공"
    else
        record_result "services" "api_health" "FAIL" "API 헬스체크 실패"
        log "ERROR" "API 헬스체크 실패: $health_response"
    fi
    
    # 데이터베이스 연결 확인
    if docker exec safework-postgres pg_isready -U safework -d safework_db >/dev/null 2>&1; then
        record_result "services" "database_connection" "PASS" "PostgreSQL 연결 성공"
        log "SUCCESS" "PostgreSQL 연결 확인"
        
        # 데이터베이스 내용 확인
        local survey_count=$(docker exec safework-postgres psql -U safework -d safework_db -tAc "SELECT COUNT(*) FROM surveys;" 2>/dev/null || echo "0")
        record_result "services" "database_data" "PASS" "설문 데이터 $survey_count 건 확인"
        log "SUCCESS" "데이터베이스 데이터 확인: $survey_count 건"
    else
        record_result "services" "database_connection" "FAIL" "PostgreSQL 연결 실패"
        log "ERROR" "PostgreSQL 연결 실패"
    fi
    
    # Redis 연결 확인
    if docker exec safework-redis redis-cli ping >/dev/null 2>&1; then
        record_result "services" "redis_connection" "PASS" "Redis 연결 성공"
        log "SUCCESS" "Redis 연결 확인"
    else
        record_result "services" "redis_connection" "FAIL" "Redis 연결 실패"
        log "ERROR" "Redis 연결 실패"
    fi
    
    # API 기능 테스트
    local api_test=$(curl -s -X POST http://localhost:4545/survey/api/submit \
        -H "Content-Type: application/json" \
        -d '{"form_type": "001", "name": "검증테스트", "age": 30}' 2>/dev/null || echo "ERROR")
    
    if [[ "$api_test" == *"success"* ]]; then
        record_result "services" "api_functionality" "PASS" "API 기능 테스트 성공"
        log "SUCCESS" "API 기능 테스트 성공"
    else
        record_result "services" "api_functionality" "FAIL" "API 기능 테스트 실패"
        log "ERROR" "API 기능 테스트 실패"
    fi
}

# 5. 배포 시스템 검증
validate_deployment_system() {
    log "RUNNING" "배포 시스템 검증 시작..."
    
    # 새로운 배포 스크립트 존재 확인
    if [ -f "$PROJECT_ROOT/tools/scripts/safework_direct_deploy.sh" ]; then
        if [ -x "$PROJECT_ROOT/tools/scripts/safework_direct_deploy.sh" ]; then
            record_result "deployment" "direct_deploy_script" "PASS" "새 배포 스크립트 사용 가능"
            log "SUCCESS" "새로운 직접 배포 스크립트 확인"
        else
            record_result "deployment" "direct_deploy_script" "WARNING" "스크립트 존재하나 실행 권한 없음"
            log "WARNING" "배포 스크립트에 실행 권한이 없습니다"
        fi
    else
        record_result "deployment" "direct_deploy_script" "FAIL" "새 배포 스크립트 없음"
        log "ERROR" "새로운 배포 스크립트가 없습니다"
    fi
    
    # 기존 Watchtower 관련 워크플로우 정리 확인
    local watchtower_workflows=$(find "$PROJECT_ROOT/.github/workflows" -name "*watchtower*" 2>/dev/null | wc -l)
    if [ "$watchtower_workflows" -eq 0 ]; then
        record_result "deployment" "watchtower_cleanup" "PASS" "Watchtower 워크플로우 정리됨"
        log "SUCCESS" "Watchtower 관련 워크플로우가 정리되었습니다"
    else
        record_result "deployment" "watchtower_cleanup" "WARNING" "Watchtower 워크플로우 잔존"
        log "WARNING" "Watchtower 관련 워크플로우가 $watchtower_workflows 개 남아있습니다"
    fi
    
    # GitHub Actions 워크플로우 확인
    local workflows_count=$(find "$PROJECT_ROOT/.github/workflows" -name "*.yml" | wc -l)
    record_result "deployment" "github_workflows" "PASS" "GitHub Actions 워크플로우 $workflows_count 개 확인"
    log "SUCCESS" "GitHub Actions 워크플로우 $workflows_count 개 확인"
}

# 6. 보안 및 설정 검증
validate_security() {
    log "RUNNING" "보안 및 설정 검증 시작..."
    
    # 환경 변수 설정 확인
    local env_vars=("DB_HOST" "DB_NAME" "SECRET_KEY" "ADMIN_PASSWORD")
    for var in "${env_vars[@]}"; do
        if docker exec safework-app printenv "$var" >/dev/null 2>&1; then
            record_result "security" "${var}_set" "PASS" "환경 변수 설정됨"
        else
            record_result "security" "${var}_set" "WARNING" "환경 변수 미설정"
            log "WARNING" "환경 변수 $var 가 설정되지 않았습니다"
        fi
    done
    
    # 포트 바인딩 확인
    local exposed_ports=("4545" "4546" "4547")
    for port in "${exposed_ports[@]}"; do
        if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            record_result "security" "port_${port}_binding" "PASS" "포트 $port 바인딩됨"
        else
            record_result "security" "port_${port}_binding" "WARNING" "포트 $port 바인딩 안됨"
        fi
    done
    
    # 컨테이너 재시작 정책 확인
    for container in "${EXPECTED_CONTAINERS[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            local restart_policy=$(docker inspect "$container" --format '{{.HostConfig.RestartPolicy.Name}}' 2>/dev/null)
            if [ "$restart_policy" = "unless-stopped" ] || [ "$restart_policy" = "always" ]; then
                record_result "security" "${container}_restart_policy" "PASS" "재시작 정책: $restart_policy"
            else
                record_result "security" "${container}_restart_policy" "WARNING" "재시작 정책 미설정"
            fi
        fi
    done
}

# 7. 성능 및 최적화 검증
validate_performance() {
    log "RUNNING" "성능 및 최적화 검증 시작..."
    
    # API 응답 시간 측정
    local start_time=$(date +%s%N)
    curl -s --max-time 5 http://localhost:4545/health >/dev/null 2>&1
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 ))
    
    if [ "$response_time" -lt 500 ]; then
        record_result "performance" "api_response_time" "PASS" "응답 시간: ${response_time}ms"
        log "SUCCESS" "API 응답 시간 양호: ${response_time}ms"
    elif [ "$response_time" -lt 1000 ]; then
        record_result "performance" "api_response_time" "WARNING" "응답 시간: ${response_time}ms (느림)"
        log "WARNING" "API 응답 시간 느림: ${response_time}ms"
    else
        record_result "performance" "api_response_time" "FAIL" "응답 시간: ${response_time}ms (매우 느림)"
        log "ERROR" "API 응답 시간 매우 느림: ${response_time}ms"
    fi
    
    # 메모리 사용량 확인
    for container in "${EXPECTED_CONTAINERS[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            local memory_usage=$(docker stats "$container" --no-stream --format "{{.MemUsage}}" 2>/dev/null | cut -d'/' -f1 | sed 's/[^0-9.]//g')
            if [ -n "$memory_usage" ]; then
                record_result "performance" "${container}_memory" "PASS" "메모리 사용량: ${memory_usage}MB"
            fi
        fi
    done
}

# 결과 요약 출력
print_summary() {
    echo -e "\n${COLORS[WHITE]}"
    echo "═══════════════════════════════════════════════════════════════"
    echo "📊 SafeWork 검증 결과 요약"
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "${COLORS[NC]}"
    
    echo -e "${COLORS[GREEN]}${ICONS[SUCCESS]} 성공: $PASSED_TESTS${COLORS[NC]}"
    echo -e "${COLORS[YELLOW]}${ICONS[WARNING]} 경고: $WARNING_TESTS${COLORS[NC]}"
    echo -e "${COLORS[RED]}${ICONS[ERROR]} 실패: $FAILED_TESTS${COLORS[NC]}"
    echo -e "${COLORS[BLUE]}${ICONS[INFO]} 총 테스트: $TOTAL_TESTS${COLORS[NC]}"
    
    local success_rate=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
    echo -e "\n${COLORS[CYAN]}${ICONS[PERFORMANCE]} 성공률: ${success_rate}%${COLORS[NC]}"
    
    # 상세 결과
    echo -e "\n${COLORS[WHITE]}상세 결과:${COLORS[NC]}"
    echo "----------------------------------------"
    
    for key in "${!VALIDATION_RESULTS[@]}"; do
        IFS=':' read -r status details <<< "${VALIDATION_RESULTS[$key]}"
        local category=$(echo "$key" | cut -d'_' -f1)
        local test_name=$(echo "$key" | cut -d'_' -f2-)
        
        case "$status" in
            "PASS") echo -e "${COLORS[GREEN]}✓${COLORS[NC]} [$category] $test_name: $details" ;;
            "FAIL") echo -e "${COLORS[RED]}✗${COLORS[NC]} [$category] $test_name: $details" ;;
            "WARNING") echo -e "${COLORS[YELLOW]}!${COLORS[NC]} [$category] $test_name: $details" ;;
        esac
    done
    
    # 권장사항
    echo -e "\n${COLORS[WHITE]}권장사항:${COLORS[NC]}"
    echo "----------------------------------------"
    
    if [ "$WARNING_TESTS" -gt 0 ] || [ "$FAILED_TESTS" -gt 0 ]; then
        echo "• 경고나 실패 항목들을 검토하여 시스템을 개선하세요"
        if docker network ls | grep -q "$OLD_NETWORK_NAME"; then
            echo "• 기존 watchtower_default 네트워크에서 safework_network로 마이그레이션을 고려하세요"
        fi
        echo "• 새로운 배포 스크립트를 사용하여 시스템을 업데이트하세요"
    else
        echo "• 모든 검증이 성공적으로 완료되었습니다!"
        echo "• 시스템이 최적 상태로 운영되고 있습니다"
    fi
    
    echo -e "\n${COLORS[BLUE]}${ICONS[INFO]} 검증 완료 시간: $(date '+%Y-%m-%d %H:%M:%S')${COLORS[NC]}"
}

# 메인 실행 함수
main() {
    print_header
    
    # 결과 디렉토리 생성
    mkdir -p "$RESULTS_DIR"
    
    # 검증 단계별 실행
    validate_environment || { log "ERROR" "환경 검증 실패"; exit 1; }
    validate_network_architecture
    validate_containers
    validate_services
    validate_deployment_system
    validate_security
    validate_performance
    
    # 결과 요약
    print_summary
    
    # 결과 파일 저장
    local result_file="$RESULTS_DIR/validation_${VALIDATION_TIMESTAMP}.txt"
    {
        echo "SafeWork Enhanced Validation Results - $VALIDATION_TIMESTAMP"
        echo "=================================================="
        echo "총 테스트: $TOTAL_TESTS"
        echo "성공: $PASSED_TESTS"
        echo "경고: $WARNING_TESTS"
        echo "실패: $FAILED_TESTS"
        echo "성공률: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
        echo ""
        echo "상세 결과:"
        for key in "${!VALIDATION_RESULTS[@]}"; do
            echo "$key: ${VALIDATION_RESULTS[$key]}"
        done
    } > "$result_file"
    
    log "SUCCESS" "검증 결과가 저장되었습니다: $result_file"
    
    # 종료 코드 결정
    if [ "$FAILED_TESTS" -gt 0 ]; then
        exit 1
    elif [ "$WARNING_TESTS" -gt 0 ]; then
        exit 2
    else
        exit 0
    fi
}

# 도움말
show_help() {
    echo "SafeWork Enhanced Validation System v2.0"
    echo ""
    echo "사용법: $0 [옵션]"
    echo ""
    echo "옵션:"
    echo "  -h, --help     이 도움말 표시"
    echo "  -v, --verbose  상세 출력 모드"
    echo "  -q, --quiet    최소 출력 모드"
    echo ""
    echo "종료 코드:"
    echo "  0  모든 검증 성공"
    echo "  1  하나 이상의 검증 실패"
    echo "  2  경고 사항 존재"
}

# 명령행 인수 처리
case "${1:-}" in
    "-h"|"--help")
        show_help
        exit 0
        ;;
    "-v"|"--verbose")
        set -x
        main
        ;;
    "-q"|"--quiet")
        main >/dev/null 2>&1
        ;;
    "")
        main
        ;;
    *)
        echo "알 수 없는 옵션: $1"
        show_help
        exit 1
        ;;
esac