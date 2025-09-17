#!/bin/bash

# SafeWork2 종합 테스트 실행기 (Comprehensive Test Runner)
# 목적: 배포 전 전체 시스템 테스트 자동화

set -e

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 로그 함수
log_info() { echo -e "${BLUE}[TEST-INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[TEST-SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[TEST-WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[TEST-ERROR]${NC} $1"; }

# 테스트 결과 추적
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
TEST_RESULTS=()

# 테스트 결과 기록
record_test() {
    local test_name="$1"
    local status="$2"
    local message="$3"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status" = "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log_success "✅ $test_name: $message"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        log_error "❌ $test_name: $message"
    fi

    TEST_RESULTS+=("$test_name: $status - $message")
}

# 1. 코드 품질 테스트
test_code_quality() {
    log_info "코드 품질 테스트 시작..."

    cd app

    # Python 구문 검사
    if python -m py_compile *.py; then
        record_test "Python 구문 검사" "PASS" "모든 Python 파일 구문 오류 없음"
    else
        record_test "Python 구문 검사" "FAIL" "Python 구문 오류 발견"
    fi

    # Black 코드 포매팅 검사
    if command -v black &> /dev/null; then
        if black --check . 2>/dev/null; then
            record_test "Black 포매팅" "PASS" "코드 포매팅 규칙 준수"
        else
            record_test "Black 포매팅" "FAIL" "코드 포매팅 수정 필요"
        fi
    else
        record_test "Black 포매팅" "SKIP" "Black이 설치되지 않음"
    fi

    # Flake8 린트 검사
    if command -v flake8 &> /dev/null; then
        if flake8 --max-line-length=88 --ignore=E203,W503 . 2>/dev/null; then
            record_test "Flake8 린트" "PASS" "린트 규칙 준수"
        else
            record_test "Flake8 린트" "FAIL" "린트 오류 발견"
        fi
    else
        record_test "Flake8 린트" "SKIP" "Flake8이 설치되지 않음"
    fi

    cd ..
}

# 2. Docker 이미지 빌드 테스트
test_docker_build() {
    log_info "Docker 이미지 빌드 테스트 시작..."

    # PostgreSQL 이미지 빌드 테스트
    if docker build -t safework2-postgres-test ./postgres --quiet; then
        record_test "PostgreSQL 이미지 빌드" "PASS" "이미지 빌드 성공"
        docker rmi safework2-postgres-test >/dev/null 2>&1 || true
    else
        record_test "PostgreSQL 이미지 빌드" "FAIL" "이미지 빌드 실패"
    fi

    # Redis 이미지 빌드 테스트
    if docker build -t safework2-redis-test ./redis --quiet; then
        record_test "Redis 이미지 빌드" "PASS" "이미지 빌드 성공"
        docker rmi safework2-redis-test >/dev/null 2>&1 || true
    else
        record_test "Redis 이미지 빌드" "FAIL" "이미지 빌드 실패"
    fi

    # Flask App 이미지 빌드 테스트
    if docker build -t safework2-app-test ./app --quiet; then
        record_test "Flask App 이미지 빌드" "PASS" "이미지 빌드 성공"
        docker rmi safework2-app-test >/dev/null 2>&1 || true
    else
        record_test "Flask App 이미지 빌드" "FAIL" "이미지 빌드 실패"
    fi
}

# 3. 컨테이너 실행 테스트
test_container_startup() {
    log_info "컨테이너 실행 테스트 시작..."

    # 테스트 네트워크 생성
    docker network create safework2-test-network >/dev/null 2>&1 || true

    # PostgreSQL 테스트 컨테이너 실행
    if docker run -d --name safework2-postgres-test --network safework2-test-network \
        -e POSTGRES_PASSWORD=test123 -e POSTGRES_DB=test_db -e POSTGRES_USER=test \
        registry.jclee.me/safework2/postgres:latest >/dev/null 2>&1; then

        # PostgreSQL 준비 대기
        sleep 5
        if docker exec safework2-postgres-test pg_isready -U test >/dev/null 2>&1; then
            record_test "PostgreSQL 컨테이너 실행" "PASS" "컨테이너 정상 실행 및 연결 가능"
        else
            record_test "PostgreSQL 컨테이너 실행" "FAIL" "컨테이너 실행되지만 연결 불가"
        fi

        docker stop safework2-postgres-test >/dev/null 2>&1 || true
        docker rm safework2-postgres-test >/dev/null 2>&1 || true
    else
        record_test "PostgreSQL 컨테이너 실행" "FAIL" "컨테이너 실행 실패"
    fi

    # Redis 테스트 컨테이너 실행
    if docker run -d --name safework2-redis-test --network safework2-test-network \
        registry.jclee.me/safework2/redis:latest >/dev/null 2>&1; then

        sleep 3
        if docker exec safework2-redis-test redis-cli ping >/dev/null 2>&1; then
            record_test "Redis 컨테이너 실행" "PASS" "컨테이너 정상 실행 및 연결 가능"
        else
            record_test "Redis 컨테이너 실행" "FAIL" "컨테이너 실행되지만 연결 불가"
        fi

        docker stop safework2-redis-test >/dev/null 2>&1 || true
        docker rm safework2-redis-test >/dev/null 2>&1 || true
    else
        record_test "Redis 컨테이너 실행" "FAIL" "컨테이너 실행 실패"
    fi

    # 테스트 네트워크 정리
    docker network rm safework2-test-network >/dev/null 2>&1 || true
}

# 4. API 엔드포인트 테스트
test_api_endpoints() {
    log_info "API 엔드포인트 테스트 시작..."

    # 현재 실행 중인 애플리케이션이 있는지 확인
    if curl -f http://localhost:4545/health >/dev/null 2>&1; then
        record_test "Health 엔드포인트" "PASS" "정상 응답"

        # 홈페이지 테스트
        if curl -f http://localhost:4545/ >/dev/null 2>&1; then
            record_test "홈페이지" "PASS" "정상 응답"
        else
            record_test "홈페이지" "FAIL" "응답 없음"
        fi

        # 설문 페이지 테스트
        if curl -f http://localhost:4545/survey/001_musculoskeletal_symptom_survey >/dev/null 2>&1; then
            record_test "001 설문 페이지" "PASS" "정상 응답"
        else
            record_test "001 설문 페이지" "FAIL" "응답 없음"
        fi

        if curl -f http://localhost:4545/survey/002_new_employee_health_checkup_form >/dev/null 2>&1; then
            record_test "002 설문 페이지" "PASS" "정상 응답"
        else
            record_test "002 설문 페이지" "FAIL" "응답 없음"
        fi

    else
        record_test "애플리케이션 실행 상태" "FAIL" "애플리케이션이 실행되지 않음"
    fi
}

# 5. 데이터베이스 연결 테스트
test_database_connection() {
    log_info "데이터베이스 연결 테스트 시작..."

    if docker exec safework2-postgres psql -U safework -d safework_db -c "SELECT 1;" >/dev/null 2>&1; then
        record_test "PostgreSQL 연결" "PASS" "데이터베이스 연결 성공"

        # 테이블 존재 확인
        if docker exec safework2-postgres psql -U safework -d safework_db -c "\dt" | grep -q surveys; then
            record_test "surveys 테이블 존재" "PASS" "테이블 존재 확인"
        else
            record_test "surveys 테이블 존재" "FAIL" "테이블 존재하지 않음"
        fi

        # 기본 쿼리 테스트
        if docker exec safework2-postgres psql -U safework -d safework_db -c "SELECT COUNT(*) FROM surveys;" >/dev/null 2>&1; then
            record_test "데이터베이스 쿼리" "PASS" "쿼리 실행 성공"
        else
            record_test "데이터베이스 쿼리" "FAIL" "쿼리 실행 실패"
        fi

    else
        record_test "PostgreSQL 연결" "FAIL" "데이터베이스 연결 실패"
    fi
}

# 6. 보안 테스트
test_security() {
    log_info "보안 테스트 시작..."

    # 환경 변수 검사 (민감한 정보 노출 확인)
    if ! grep -r "password.*=" app/ --include="*.py" | grep -v "environ.get\|config"; then
        record_test "하드코딩된 비밀번호" "PASS" "하드코딩된 비밀번호 없음"
    else
        record_test "하드코딩된 비밀번호" "FAIL" "하드코딩된 비밀번호 발견"
    fi

    # API 키 검사
    if ! grep -r "api.*key.*=" app/ --include="*.py" | grep -v "environ.get\|config"; then
        record_test "하드코딩된 API 키" "PASS" "하드코딩된 API 키 없음"
    else
        record_test "하드코딩된 API 키" "FAIL" "하드코딩된 API 키 발견"
    fi

    # SQL 인젝션 취약점 기본 검사
    if ! grep -r "% " app/ --include="*.py" | grep -i sql; then
        record_test "SQL 인젝션 기본 검사" "PASS" "기본적인 SQL 인젝션 패턴 없음"
    else
        record_test "SQL 인젝션 기본 검사" "FAIL" "잠재적 SQL 인젝션 패턴 발견"
    fi
}

# 7. 성능 테스트
test_performance() {
    log_info "성능 테스트 시작..."

    if curl -f http://localhost:4545/health >/dev/null 2>&1; then
        # 응답 시간 테스트
        RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:4545/health)

        if (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
            record_test "Health 엔드포인트 응답 시간" "PASS" "응답 시간: ${RESPONSE_TIME}초"
        else
            record_test "Health 엔드포인트 응답 시간" "FAIL" "응답 시간 너무 느림: ${RESPONSE_TIME}초"
        fi

        # 동시 접속 테스트 (간단한 버전)
        if for i in {1..5}; do curl -f http://localhost:4545/health >/dev/null 2>&1 & done; wait; then
            record_test "동시 접속 테스트" "PASS" "5개 동시 요청 처리 성공"
        else
            record_test "동시 접속 테스트" "FAIL" "동시 요청 처리 실패"
        fi
    else
        record_test "성능 테스트" "SKIP" "애플리케이션이 실행되지 않음"
    fi
}

# 테스트 결과 요약
show_test_summary() {
    echo ""
    echo "================================================="
    echo "           SafeWork2 테스트 결과 요약"
    echo "================================================="
    echo ""

    log_info "총 테스트: $TOTAL_TESTS"
    log_success "통과: $PASSED_TESTS"
    log_error "실패: $FAILED_TESTS"

    if [ $FAILED_TESTS -eq 0 ]; then
        log_success "🎉 모든 테스트 통과! 배포 준비 완료"
        echo ""
        log_info "다음 단계: ./scripts/integrated_build_deploy.sh full"
        return 0
    else
        log_error "❌ $FAILED_TESTS개 테스트 실패. 문제 해결 후 재시도 필요"
        echo ""
        log_info "실패한 테스트 목록:"
        for result in "${TEST_RESULTS[@]}"; do
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
    echo "        SafeWork2 종합 테스트 실행기"
    echo "================================================="
    echo ""

    # 테스트 실행
    test_code_quality
    test_docker_build
    test_container_startup
    test_api_endpoints
    test_database_connection
    test_security
    test_performance

    # 결과 요약
    show_test_summary
}

# 스크립트 실행
main "$@"