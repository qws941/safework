#!/bin/bash

# SafeWork 파이프라인 검증기 (Pipeline Validator)
# 목적: GitHub Actions 파이프라인 및 전체 CI/CD 검증
# 
# DEPRECATED: 이 스크립트는 더 이상 사용되지 않습니다.
# 새로운 통합 검증 시스템을 사용하세요: ./tools/scripts/safework_validator_v2.sh
# 
# 마이그레이션 가이드:
# - 기존: ./tools/scripts/pipeline_validator.sh
# - 신규: ./tools/scripts/safework_validator_v2.sh

set -e

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 로그 함수
log_info() { echo -e "${BLUE}[PIPELINE-INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[PIPELINE-SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[PIPELINE-WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[PIPELINE-ERROR]${NC} $1"; }

# 검증 결과 추적
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
CHECK_RESULTS=()

# 검증 결과 기록
record_check() {
    local check_name="$1"
    local status="$2"
    local message="$3"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if [ "$status" = "PASS" ]; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        log_success "✅ $check_name: $message"
    else
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        log_error "❌ $check_name: $message"
    fi

    CHECK_RESULTS+=("$check_name: $status - $message")
}

# 1. GitHub Actions 워크플로우 검증
validate_github_workflows() {
    log_info "GitHub Actions 워크플로우 검증 시작..."

    # 워크플로우 파일 존재 확인
    local workflows_dir=".github/workflows"
    if [ -d "$workflows_dir" ]; then
        record_check "워크플로우 디렉토리" "PASS" "디렉토리 존재"

        # 주요 워크플로우 파일 확인
        local required_workflows=("deploy.yml" "claude-mcp-assistant.yml" "maintenance-automation.yml")
        for workflow in "${required_workflows[@]}"; do
            if [ -f "$workflows_dir/$workflow" ]; then
                record_check "워크플로우: $workflow" "PASS" "파일 존재"
            else
                record_check "워크플로우: $workflow" "FAIL" "파일 없음"
            fi
        done

        # YAML 구문 검증
        if command -v yamllint &> /dev/null; then
            if yamllint "$workflows_dir"/*.yml &>/dev/null; then
                record_check "YAML 구문 검증" "PASS" "모든 워크플로우 파일 구문 정상"
            else
                record_check "YAML 구문 검증" "FAIL" "YAML 구문 오류 발견"
            fi
        else
            record_check "YAML 구문 검증" "SKIP" "yamllint가 설치되지 않음"
        fi

    else
        record_check "워크플로우 디렉토리" "FAIL" "디렉토리 없음"
    fi
}

# 2. 스크립트 파일 검증
validate_scripts() {
    log_info "스크립트 파일 검증 시작..."

    local scripts_dir="scripts"
    if [ -d "$scripts_dir" ]; then
        record_check "스크립트 디렉토리" "PASS" "디렉토리 존재"

        # 주요 스크립트 파일 확인
        local required_scripts=(
            "integrated_build_deploy.sh"
            "test_runner.sh"
            "pipeline_validator.sh"
            "portainer_simple.sh"
            "emergency_deploy.sh"
            "system_status_report.sh"
        )

        for script in "${required_scripts[@]}"; do
            if [ -f "$scripts_dir/$script" ]; then
                if [ -x "$scripts_dir/$script" ]; then
                    record_check "스크립트: $script" "PASS" "파일 존재하고 실행 가능"
                else
                    record_check "스크립트: $script" "FAIL" "파일 존재하지만 실행 권한 없음"
                fi
            else
                record_check "스크립트: $script" "FAIL" "파일 없음"
            fi
        done

        # 셸 스크립트 구문 검증
        local shell_scripts=$(find "$scripts_dir" -name "*.sh")
        local syntax_errors=0

        for script in $shell_scripts; do
            if ! bash -n "$script" &>/dev/null; then
                syntax_errors=$((syntax_errors + 1))
                log_error "구문 오류: $script"
            fi
        done

        if [ $syntax_errors -eq 0 ]; then
            record_check "셸 스크립트 구문" "PASS" "모든 스크립트 구문 정상"
        else
            record_check "셸 스크립트 구문" "FAIL" "$syntax_errors개 스크립트에 구문 오류"
        fi

    else
        record_check "스크립트 디렉토리" "FAIL" "디렉토리 없음"
    fi
}

# 3. Docker 설정 검증
validate_docker_configuration() {
    log_info "Docker 설정 검증 시작..."

    # Dockerfile 존재 확인
    local dockerfiles=("app/Dockerfile" "postgres/Dockerfile" "redis/Dockerfile")
    for dockerfile in "${dockerfiles[@]}"; do
        if [ -f "$dockerfile" ]; then
            record_check "Dockerfile: $dockerfile" "PASS" "파일 존재"

            # 기본 Docker 구문 검증
            if docker build -f "$dockerfile" --dry-run . &>/dev/null; then
                record_check "Docker 구문: $dockerfile" "PASS" "구문 정상"
            else
                record_check "Docker 구문: $dockerfile" "FAIL" "구문 오류"
            fi
        else
            record_check "Dockerfile: $dockerfile" "FAIL" "파일 없음"
        fi
    done

    # .dockerignore 파일 확인
    local dockerignores=("app/.dockerignore" "postgres/.dockerignore" "redis/.dockerignore")
    for dockerignore in "${dockerignores[@]}"; do
        if [ -f "$dockerignore" ]; then
            record_check ".dockerignore: $dockerignore" "PASS" "파일 존재"
        else
            record_check ".dockerignore: $dockerignore" "FAIL" "파일 없음"
        fi
    done
}

# 4. 환경 설정 검증
validate_environment_configuration() {
    log_info "환경 설정 검증 시작..."

    # 필수 환경 변수 확인 (GitHub Secrets)
    local required_secrets=(
        "REGISTRY_PASSWORD"
        "PORTAINER_API_KEY"
        "WATCHTOWER_HTTP_API_TOKEN"
        "POSTGRES_PASSWORD"
        "SECRET_KEY"
    )

    log_info "GitHub Secrets 설정 필요 목록:"
    for secret in "${required_secrets[@]}"; do
        log_info "  - $secret"
    done

    record_check "GitHub Secrets 목록" "PASS" "${#required_secrets[@]}개 시크릿 설정 필요"

    # config.py 파일 확인
    if [ -f "app/config.py" ]; then
        record_check "Flask 설정 파일" "PASS" "config.py 존재"
    else
        record_check "Flask 설정 파일" "FAIL" "config.py 없음"
    fi

    # requirements.txt 확인
    if [ -f "app/requirements.txt" ]; then
        record_check "Python 의존성" "PASS" "requirements.txt 존재"
    else
        record_check "Python 의존성" "FAIL" "requirements.txt 없음"
    fi
}

# 5. 네트워크 및 포트 설정 검증
validate_network_configuration() {
    log_info "네트워크 및 포트 설정 검증 시작..."

    # 포트 충돌 검사
    local used_ports=(4545 4546 4547)
    for port in "${used_ports[@]}"; do
        if command -v netstat &> /dev/null; then
            if netstat -tuln | grep -q ":$port "; then
                record_check "포트 $port" "WARNING" "포트가 이미 사용 중"
            else
                record_check "포트 $port" "PASS" "포트 사용 가능"
            fi
        else
            record_check "포트 검사" "SKIP" "netstat이 설치되지 않음"
            break
        fi
    done

    # Docker 네트워크 설정 확인
    if command -v docker &> /dev/null; then
        if docker network ls | grep -q "safework_network"; then
            record_check "Docker 네트워크" "PASS" "safework_network 네트워크 존재"
        else
            record_check "Docker 네트워크" "WARNING" "safework_network 네트워크 없음 (자동 생성됨)"
        fi
    else
        record_check "Docker 환경" "FAIL" "Docker가 설치되지 않음"
    fi
}

# 6. 프로덕션 엔드포인트 검증
validate_production_endpoints() {
    log_info "프로덕션 엔드포인트 검증 시작..."

    local endpoints=(
        "https://safework.jclee.me/health"
        "https://safework.jclee.me/"
        "https://portainer.jclee.me/api/endpoints"
        "https://registry.jclee.me"
    )

    for endpoint in "${endpoints[@]}"; do
        if curl -f "$endpoint" &>/dev/null; then
            record_check "엔드포인트: $endpoint" "PASS" "접근 가능"
        else
            record_check "엔드포인트: $endpoint" "FAIL" "접근 불가"
        fi
    done
}

# 7. 데이터베이스 스키마 검증
validate_database_schema() {
    log_info "데이터베이스 스키마 검증 시작..."

    # PostgreSQL 초기화 스크립트 확인
    if [ -f "postgres/init.sql" ]; then
        record_check "PostgreSQL 초기화 스크립트" "PASS" "init.sql 존재"
    else
        record_check "PostgreSQL 초기화 스크립트" "FAIL" "init.sql 없음"
    fi

    # 마이그레이션 스크립트 확인
    if [ -d "app/db" ]; then
        local migration_count=$(find app/db -name "*.py" | wc -l)
        if [ $migration_count -gt 0 ]; then
            record_check "데이터베이스 마이그레이션" "PASS" "$migration_count개 마이그레이션 파일"
        else
            record_check "데이터베이스 마이그레이션" "FAIL" "마이그레이션 파일 없음"
        fi
    else
        record_check "마이그레이션 디렉토리" "FAIL" "app/db 디렉토리 없음"
    fi
}

# 8. 보안 설정 검증
validate_security_configuration() {
    log_info "보안 설정 검증 시작..."

    # 하드코딩된 시크릿 검사
    if ! grep -r "password.*=" . --include="*.py" --include="*.yml" | grep -v "environ.get\|secrets\|\{\{.*\}\}\|config"; then
        record_check "하드코딩된 비밀번호" "PASS" "하드코딩된 비밀번호 없음"
    else
        record_check "하드코딩된 비밀번호" "FAIL" "하드코딩된 비밀번호 발견"
    fi

    # Git ignore 설정 확인
    if [ -f ".gitignore" ]; then
        if grep -q "\.env\|secrets\|\.key" .gitignore; then
            record_check "Git 보안 설정" "PASS" ".gitignore에 보안 파일 제외 설정"
        else
            record_check "Git 보안 설정" "WARNING" ".gitignore에 보안 설정 추가 권장"
        fi
    else
        record_check ".gitignore 파일" "FAIL" ".gitignore 파일 없음"
    fi

    # SSL/TLS 설정 확인
    if curl -I https://safework.jclee.me 2>/dev/null | grep -q "HTTP/2 200\|HTTP/1.1 200"; then
        record_check "HTTPS 설정" "PASS" "HTTPS 정상 작동"
    else
        record_check "HTTPS 설정" "FAIL" "HTTPS 연결 문제"
    fi
}

# 전체 검증 결과 요약
show_validation_summary() {
    echo ""
    echo "================================================="
    echo "        SafeWork2 파이프라인 검증 결과"
    echo "================================================="
    echo ""

    log_info "총 검증 항목: $TOTAL_CHECKS"
    log_success "통과: $PASSED_CHECKS"
    log_error "실패: $FAILED_CHECKS"

    # 성공률 계산
    local success_rate=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    echo ""
    log_info "파이프라인 준비도: ${success_rate}%"

    if [ $success_rate -ge 90 ]; then
        log_success "🎉 파이프라인 배포 준비 완료!"
        echo ""
        log_info "권장 다음 단계:"
        echo "  1. ./scripts/test_runner.sh - 종합 테스트 실행"
        echo "  2. ./scripts/integrated_build_deploy.sh full - 전체 배포"
        echo "  3. git push origin master - GitHub Actions 트리거"
        return 0
    elif [ $success_rate -ge 70 ]; then
        log_warning "⚠️ 파이프라인 부분적 준비 완료 (주의사항 있음)"
        echo ""
        log_info "해결 필요한 주요 이슈:"
        for result in "${CHECK_RESULTS[@]}"; do
            if [[ $result == *"FAIL"* ]]; then
                echo "  - $result"
            fi
        done
        return 1
    else
        log_error "❌ 파이프라인 준비 미완료. 주요 문제 해결 필요"
        echo ""
        log_info "실패한 검증 항목:"
        for result in "${CHECK_RESULTS[@]}"; do
            if [[ $result == *"FAIL"* ]]; then
                echo "  - $result"
            fi
        done
        return 1
    fi
}

# 메인 실행 함수
main() {
    echo "================================================="
    echo "       SafeWork2 파이프라인 검증기"
    echo "================================================="
    echo ""

    # 모든 검증 실행
    validate_github_workflows
    validate_scripts
    validate_docker_configuration
    validate_environment_configuration
    validate_network_configuration
    validate_production_endpoints
    validate_database_schema
    validate_security_configuration

    # 결과 요약
    show_validation_summary
}

# 스크립트 실행
main "$@"