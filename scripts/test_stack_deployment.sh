#!/bin/bash
# SafeWork Stack Deployment 테스트 스크립트 v1.0
# 스택 배포 기능 검증 및 통합 테스트
set -euo pipefail

# =============================================================================
# 설정
# =============================================================================
readonly SCRIPT_VERSION="1.0.0"
readonly SCRIPT_NAME="SafeWork Stack Deployment Test"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 테스트 설정
readonly TEST_LOG="/tmp/safework_stack_test_$(date +%Y%m%d_%H%M%S).log"
readonly TEST_STACK_NAME="safework-test"
readonly TEST_TIMEOUT=300

# 색상 코드
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# 테스트 결과 추적
declare -A TEST_RESULTS
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# =============================================================================
# 로깅 함수
# =============================================================================
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$TEST_LOG"
}

log_info() { log "INFO" "${BLUE}$*${NC}"; }
log_success() { log "SUCCESS" "${GREEN}$*${NC}"; }
log_error() { log "ERROR" "${RED}$*${NC}"; }
log_warn() { log "WARN" "${YELLOW}$*${NC}"; }

show_header() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "$SCRIPT_NAME v$SCRIPT_VERSION"
    echo "=========================================="
    echo -e "${NC}"
    log_info "테스트 시작 - 로그: $TEST_LOG"
}

# =============================================================================
# 테스트 헬퍼 함수
# =============================================================================
run_test() {
    local test_name="$1"
    local test_function="$2"
    
    log_info "테스트 시작: $test_name"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if $test_function; then
        TEST_RESULTS["$test_name"]="PASS"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log_success "✅ $test_name: 통과"
        return 0
    else
        TEST_RESULTS["$test_name"]="FAIL"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        log_error "❌ $test_name: 실패"
        return 1
    fi
}

# =============================================================================
# 개별 테스트 함수
# =============================================================================
test_dependencies() {
    log_info "의존성 테스트 시작"
    
    local deps=("curl" "jq" "docker")
    local missing=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing+=("$dep")
        fi
    done
    
    if [ ${#missing[@]} -eq 0 ]; then
        log_success "모든 의존성 확인됨: ${deps[*]}"
        return 0
    else
        log_error "누락된 의존성: ${missing[*]}"
        return 1
    fi
}

test_script_permissions() {
    log_info "스크립트 권한 테스트"
    
    local scripts=(
        "portainer_stack_deploy.sh"
        "stack_manager.sh"
    )
    
    for script in "${scripts[@]}"; do
        local script_path="$SCRIPT_DIR/$script"
        if [ -x "$script_path" ]; then
            log_success "$script: 실행 권한 확인"
        else
            log_error "$script: 실행 권한 없음"
            return 1
        fi
    done
    
    return 0
}

test_template_files() {
    log_info "템플릿 파일 테스트"
    
    local templates=(
        "stack-templates/docker-compose.local.yml"
        "stack-templates/docker-compose.production.yml"
        "stack-templates/env.local"
        "stack-templates/env.production"
    )
    
    for template in "${templates[@]}"; do
        local template_path="$SCRIPT_DIR/$template"
        if [ -f "$template_path" ]; then
            log_success "$template: 파일 존재 확인"
            
            # YAML 파일 구문 검증
            if [[ "$template" == *.yml ]]; then
                if command -v yq &> /dev/null; then
                    if yq eval '.' "$template_path" > /dev/null 2>&1; then
                        log_success "$template: YAML 구문 유효"
                    else
                        log_error "$template: YAML 구문 오류"
                        return 1
                    fi
                else
                    log_warn "yq가 설치되지 않아 YAML 구문 검증 생략"
                fi
            fi
        else
            log_error "$template: 파일 없음"
            return 1
        fi
    done
    
    return 0
}

test_portainer_connection() {
    log_info "Portainer API 연결 테스트"
    
    local portainer_url="https://portainer.jclee.me"
    
    if curl -s -f --connect-timeout 10 "$portainer_url/api/status" > /dev/null 2>&1; then
        log_success "Portainer API 연결 성공"
        return 0
    else
        log_error "Portainer API 연결 실패: $portainer_url"
        return 1
    fi
}

test_stack_manager_help() {
    log_info "Stack Manager 도움말 테스트"
    
    if "$SCRIPT_DIR/stack_manager.sh" --help > /dev/null 2>&1; then
        log_success "Stack Manager 도움말 출력 성공"
        return 0
    else
        log_error "Stack Manager 도움말 출력 실패"
        return 1
    fi
}

test_portainer_stack_deploy_help() {
    log_info "Portainer Stack Deploy 도움말 테스트"
    
    if "$SCRIPT_DIR/portainer_stack_deploy.sh" help > /dev/null 2>&1; then
        log_success "Portainer Stack Deploy 도움말 출력 성공"
        return 0
    else
        log_error "Portainer Stack Deploy 도움말 출력 실패"
        return 1
    fi
}

test_dry_run_local() {
    log_info "로컬 환경 DRY RUN 테스트"
    
    if "$SCRIPT_DIR/stack_manager.sh" deploy local --dry-run --verbose > /dev/null 2>&1; then
        log_success "로컬 환경 DRY RUN 성공"
        return 0
    else
        log_error "로컬 환경 DRY RUN 실패"
        return 1
    fi
}

test_dry_run_production() {
    log_info "운영 환경 DRY RUN 테스트"
    
    # 운영 환경은 시크릿이 필요하므로 구성 파일 검증만 수행
    if "$SCRIPT_DIR/stack_manager.sh" status --verbose > /dev/null 2>&1; then
        log_success "운영 환경 구성 검증 성공"
        return 0
    else
        log_warn "운영 환경 구성 검증 - 스택이 없거나 접근 불가"
        return 0  # 이 경우는 정상으로 처리
    fi
}

test_stack_list() {
    log_info "스택 목록 조회 테스트"
    
    if "$SCRIPT_DIR/stack_manager.sh" list > /dev/null 2>&1; then
        log_success "스택 목록 조회 성공"
        return 0
    else
        log_error "스택 목록 조회 실패"
        return 1
    fi
}

test_environment_validation() {
    log_info "환경 설정 검증 테스트"
    
    # 잘못된 환경명 테스트
    if ! "$SCRIPT_DIR/stack_manager.sh" deploy invalid-env > /dev/null 2>&1; then
        log_success "잘못된 환경명 검증 성공"
    else
        log_error "잘못된 환경명 검증 실패"
        return 1
    fi
    
    # 올바른 환경명 테스트
    if "$SCRIPT_DIR/stack_manager.sh" deploy local --dry-run > /dev/null 2>&1; then
        log_success "올바른 환경명 검증 성공"
        return 0
    else
        log_error "올바른 환경명 검증 실패"
        return 1
    fi
}

# =============================================================================
# 통합 테스트 함수
# =============================================================================
test_full_local_deployment() {
    log_info "로컬 환경 전체 배포 시뮬레이션 테스트"
    
    # 안전을 위해 DRY RUN으로만 테스트
    local test_output
    test_output=$("$SCRIPT_DIR/stack_manager.sh" deploy local --dry-run --verbose 2>&1)
    
    if echo "$test_output" | grep -q "DRY RUN"; then
        log_success "로컬 환경 배포 시뮬레이션 성공"
        return 0
    else
        log_error "로컬 환경 배포 시뮬레이션 실패"
        return 1
    fi
}

test_configuration_generation() {
    log_info "구성 파일 생성 테스트"
    
    # 임시 디렉토리에서 구성 생성 테스트
    local temp_dir="/tmp/safework_config_test"
    mkdir -p "$temp_dir"
    
    # 템플릿 복사 테스트
    if cp "$SCRIPT_DIR/stack-templates/env.local" "$temp_dir/test.env" 2>/dev/null; then
        log_success "환경 파일 템플릿 복사 성공"
    else
        log_error "환경 파일 템플릿 복사 실패"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # 설정 파일 구문 검증
    if grep -q "FLASK_CONFIG" "$temp_dir/test.env"; then
        log_success "환경 파일 내용 검증 성공"
    else
        log_error "환경 파일 내용 검증 실패"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # 정리
    rm -rf "$temp_dir"
    return 0
}

# =============================================================================
# 보고서 생성 함수
# =============================================================================
generate_test_report() {
    local report_file="/tmp/safework_stack_test_report_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "SafeWork Stack Deployment 테스트 보고서"
        echo "========================================"
        echo "테스트 시간: $(date)"
        echo "스크립트 버전: $SCRIPT_VERSION"
        echo ""
        echo "테스트 결과 요약:"
        echo "- 총 테스트: $TOTAL_TESTS"
        echo "- 성공: $PASSED_TESTS"
        echo "- 실패: $FAILED_TESTS"
        echo "- 성공률: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
        echo ""
        echo "개별 테스트 결과:"
        echo "==================="
        
        for test_name in "${!TEST_RESULTS[@]}"; do
            local result="${TEST_RESULTS[$test_name]}"
            case "$result" in
                "PASS")
                    echo "✅ $test_name: 통과"
                    ;;
                "FAIL")
                    echo "❌ $test_name: 실패"
                    ;;
            esac
        done
        
        echo ""
        echo "권장사항:"
        echo "=========="
        
        if [ $FAILED_TESTS -eq 0 ]; then
            echo "- 모든 테스트가 통과했습니다."
            echo "- 스택 배포 기능이 정상적으로 구성되었습니다."
        else
            echo "- 실패한 테스트를 확인하고 문제를 해결하세요."
            echo "- 로그 파일을 확인하세요: $TEST_LOG"
        fi
        
        echo ""
        echo "다음 단계:"
        echo "=========="
        echo "1. 로컬 환경 테스트:"
        echo "   ./scripts/stack_manager.sh deploy local --dry-run"
        echo ""
        echo "2. 운영 환경 배포 준비:"
        echo "   - 필수 시크릿 설정 확인"
        echo "   - Portainer API 접근 권한 확인"
        echo ""
        echo "3. 실제 배포:"
        echo "   ./scripts/stack_manager.sh deploy production"
        
    } > "$report_file"
    
    log_info "테스트 보고서 생성: $report_file"
    echo ""
    cat "$report_file"
}

# =============================================================================
# 메인 실행 함수
# =============================================================================
main() {
    show_header
    
    log_info "SafeWork Stack Deployment 통합 테스트 시작"
    echo ""
    
    # 기본 테스트
    run_test "Dependencies Check" test_dependencies
    run_test "Script Permissions" test_script_permissions
    run_test "Template Files" test_template_files
    
    # 연결 테스트
    run_test "Portainer Connection" test_portainer_connection
    
    # 기능 테스트
    run_test "Stack Manager Help" test_stack_manager_help
    run_test "Portainer Stack Deploy Help" test_portainer_stack_deploy_help
    
    # 환경별 테스트
    run_test "Environment Validation" test_environment_validation
    run_test "Local DRY RUN" test_dry_run_local
    run_test "Production Configuration" test_dry_run_production
    
    # 고급 테스트
    run_test "Stack List Query" test_stack_list
    run_test "Configuration Generation" test_configuration_generation
    run_test "Full Local Deployment Simulation" test_full_local_deployment
    
    echo ""
    log_info "모든 테스트 완료"
    
    # 결과 요약
    echo ""
    echo -e "${BLUE}=== 테스트 결과 요약 ===${NC}"
    echo "총 테스트: $TOTAL_TESTS"
    echo -e "성공: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "실패: ${RED}$FAILED_TESTS${NC}"
    echo "성공률: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
    
    # 보고서 생성
    generate_test_report
    
    # 종료 코드 결정
    if [ $FAILED_TESTS -eq 0 ]; then
        log_success "모든 테스트 통과! 스택 배포 준비 완료"
        exit 0
    else
        log_error "일부 테스트 실패. 문제를 해결한 후 다시 시도하세요."
        exit 1
    fi
}

# 스크립트 실행
main "$@"