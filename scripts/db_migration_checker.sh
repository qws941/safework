#!/bin/bash
# SafeWork DB 마이그레이션 점검 및 운영 로그 분석 스크립트
# 데이터베이스 상태 확인, 마이그레이션 검증, 로그 특이사항 분석

set -euo pipefail

# =============================================================================
# 설정 및 상수
# =============================================================================
readonly SCRIPT_VERSION="1.0.0"
readonly SCRIPT_NAME="SafeWork DB Migration Checker & Log Analyzer"
readonly LOG_FILE="/tmp/safework_db_check_$(date +%Y%m%d_%H%M%S).log"

# Portainer API 설정
readonly PORTAINER_URL="https://portainer.jclee.me"
readonly PORTAINER_TOKEN="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
readonly ENDPOINT_ID="3"

# 데이터베이스 설정
readonly DB_HOST="safework-postgres"
readonly DB_NAME="safework_db"
readonly DB_USER="safework"
readonly DB_PASSWORD="safework2024"

# 색상 코드
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'
readonly BOLD='\033[1m'

# =============================================================================
# 로깅 함수
# =============================================================================
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_header() { echo -e "\n${CYAN}${BOLD}=== $* ===${NC}"; }
log_info() { log "INFO" "${BLUE}$*${NC}"; }
log_success() { log "SUCCESS" "${GREEN}$*${NC}"; }
log_warn() { log "WARN" "${YELLOW}$*${NC}"; }
log_error() { log "ERROR" "${RED}$*${NC}"; }

show_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║           SafeWork DB Migration & Log Checker               ║"
    echo "║              데이터베이스 점검 및 로그 분석 도구                ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    log_info "점검 시작 - 로그 파일: $LOG_FILE"
}

# =============================================================================
# Portainer API 함수
# =============================================================================
portainer_api_call() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"

    if [ -n "$data" ]; then
        curl -s -X "$method" \
            -H "X-API-Key: $PORTAINER_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/$endpoint" 2>/dev/null
    else
        curl -s -X "$method" \
            -H "X-API-Key: $PORTAINER_TOKEN" \
            "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/$endpoint" 2>/dev/null
    fi
}

get_container_id() {
    local container_name="$1"
    local containers=$(portainer_api_call "GET" "containers/json?all=true")
    echo "$containers" | jq -r ".[] | select(.Names[] | contains(\"$container_name\")) | .Id" 2>/dev/null || echo ""
}

execute_in_container() {
    local container_name="$1"
    local command="$2"

    local container_id=$(get_container_id "$container_name")
    if [ -z "$container_id" ]; then
        log_error "$container_name 컨테이너를 찾을 수 없음"
        return 1
    fi

    local exec_config=$(jq -n --arg cmd "$command" '{
        "AttachStdout": true,
        "AttachStderr": true,
        "Cmd": ["sh", "-c", $cmd]
    }')

    local exec_response=$(portainer_api_call "POST" "containers/$container_id/exec" "$exec_config")
    local exec_id=$(echo "$exec_response" | jq -r '.Id' 2>/dev/null)

    if [ -n "$exec_id" ] && [ "$exec_id" != "null" ]; then
        local start_exec='{"Detach": false}'
        portainer_api_call "POST" "exec/$exec_id/start" "$start_exec"
    else
        log_error "컨테이너 명령 실행 실패: $container_name"
        return 1
    fi
}

# =============================================================================
# 데이터베이스 연결 및 상태 점검
# =============================================================================
check_db_connection() {
    log_header "데이터베이스 연결 상태 점검"

    # PostgreSQL 컨테이너 상태 확인
    local postgres_status=$(portainer_api_call "GET" "containers/json?all=true" | \
        jq -r '.[] | select(.Names[] | contains("safework-postgres")) | .State' 2>/dev/null || echo "not_found")

    case "$postgres_status" in
        "running")
            log_success "PostgreSQL 컨테이너 정상 실행 중"
            ;;
        "exited"|"dead")
            log_error "PostgreSQL 컨테이너가 중지됨"
            return 1
            ;;
        "not_found")
            log_error "PostgreSQL 컨테이너를 찾을 수 없음"
            return 1
            ;;
        *)
            log_warn "PostgreSQL 컨테이너 상태: $postgres_status"
            ;;
    esac

    # 데이터베이스 연결 테스트
    log_info "데이터베이스 연결 테스트 중..."
    local connection_test=$(execute_in_container "safework-postgres" "pg_isready -U $DB_USER -d $DB_NAME")

    if echo "$connection_test" | grep -q "accepting connections"; then
        log_success "데이터베이스 연결 성공"
        return 0
    else
        log_error "데이터베이스 연결 실패"
        echo "$connection_test"
        return 1
    fi
}

# =============================================================================
# 데이터베이스 스키마 및 테이블 점검
# =============================================================================
check_database_schema() {
    log_header "데이터베이스 스키마 점검"

    # 데이터베이스 목록 확인
    log_info "데이터베이스 목록 조회"
    local databases=$(execute_in_container "safework-postgres" "psql -U $DB_USER -l -t" | grep -v "template" | grep -v "postgres" | awk '{print $1}' | grep -v "^$")
    echo "데이터베이스 목록:"
    echo "$databases"

    # 테이블 목록 확인
    log_info "테이블 목록 조회"
    local tables=$(execute_in_container "safework-postgres" "psql -U $DB_USER -d $DB_NAME -c \"\\dt;\"")
    echo "테이블 목록:"
    echo "$tables"

    # 중요 테이블 존재 확인
    local required_tables=("users" "surveys" "safework_workers" "safework_health_checks")

    for table in "${required_tables[@]}"; do
        log_info "$table 테이블 존재 확인"
        local table_exists=$(execute_in_container "safework-postgres" \
            "psql -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');\"")

        if echo "$table_exists" | grep -q "t"; then
            log_success "$table 테이블 존재"
        else
            log_warn "$table 테이블이 존재하지 않음"
        fi
    done
}

# =============================================================================
# 마이그레이션 상태 점검
# =============================================================================
check_migration_status() {
    log_header "마이그레이션 상태 점검"

    # 마이그레이션 테이블 확인
    log_info "마이그레이션 히스토리 테이블 확인"
    local migration_table_exists=$(execute_in_container "safework-postgres" \
        "psql -U $DB_USER -d $DB_NAME -c \"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alembic_version');\"")

    if echo "$migration_table_exists" | grep -q "t"; then
        log_success "마이그레이션 히스토리 테이블 존재"

        # 현재 마이그레이션 버전 확인
        log_info "현재 마이그레이션 버전 조회"
        local current_version=$(execute_in_container "safework-postgres" \
            "psql -U $DB_USER -d $DB_NAME -c \"SELECT version_num FROM alembic_version;\" -t")

        if [ -n "$current_version" ]; then
            log_success "현재 마이그레이션 버전: $(echo $current_version | xargs)"
        else
            log_warn "마이그레이션 버전 정보가 없음"
        fi
    else
        log_warn "마이그레이션 히스토리 테이블이 존재하지 않음"
    fi

    # 테이블 무결성 검사
    check_table_integrity

    # 인덱스 상태 확인
    check_indexes_status
}

check_table_integrity() {
    log_info "테이블 무결성 검사"

    # surveys 테이블 구조 확인
    log_info "surveys 테이블 구조 확인"
    local surveys_structure=$(execute_in_container "safework-postgres" \
        "psql -U $DB_USER -d $DB_NAME -c \"\\d surveys;\"")
    echo "surveys 테이블 구조:"
    echo "$surveys_structure"

    # submission_date 컬럼 존재 확인 (최근 추가된 컬럼)
    local submission_date_exists=$(execute_in_container "safework-postgres" \
        "psql -U $DB_USER -d $DB_NAME -c \"SELECT column_name FROM information_schema.columns WHERE table_name = 'surveys' AND column_name = 'submission_date';\" -t")

    if [ -n "$submission_date_exists" ] && [ "$(echo $submission_date_exists | xargs)" = "submission_date" ]; then
        log_success "submission_date 컬럼 존재 확인"
    else
        log_error "submission_date 컬럼이 존재하지 않음 - 마이그레이션 필요"
    fi

    # 데이터 개수 확인
    local survey_count=$(execute_in_container "safework-postgres" \
        "psql -U $DB_USER -d $DB_NAME -c \"SELECT COUNT(*) FROM surveys;\" -t")
    log_info "설문조사 데이터 개수: $(echo $survey_count | xargs)"

    local user_count=$(execute_in_container "safework-postgres" \
        "psql -U $DB_USER -d $DB_NAME -c \"SELECT COUNT(*) FROM users;\" -t")
    log_info "사용자 데이터 개수: $(echo $user_count | xargs)"
}

check_indexes_status() {
    log_info "인덱스 상태 확인"

    local indexes=$(execute_in_container "safework-postgres" \
        "psql -U $DB_USER -d $DB_NAME -c \"SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes WHERE tablename IN ('surveys', 'users', 'safework_workers') ORDER BY tablename, indexname;\"")

    echo "인덱스 정보:"
    echo "$indexes"
}

# =============================================================================
# 운영 로그 분석
# =============================================================================
analyze_operational_logs() {
    log_header "운영 로그 분석 및 특이사항 조회"

    # 각 컨테이너의 로그 분석
    analyze_postgres_logs
    analyze_app_logs
    analyze_redis_logs
}

analyze_postgres_logs() {
    log_info "PostgreSQL 로그 분석"

    local postgres_logs=$(portainer_api_call "GET" "containers/$(get_container_id "safework-postgres")/logs?stderr=true&stdout=true&tail=500")

    # 오류 패턴 검색
    echo "=== PostgreSQL 오류 패턴 분석 ==="
    echo "$postgres_logs" | grep -i "error\|fatal\|panic\|warning" | tail -10

    # 연결 관련 로그
    echo -e "\n=== PostgreSQL 연결 관련 로그 ==="
    echo "$postgres_logs" | grep -i "connection\|connect\|disconnect" | tail -10

    # 데이터베이스 초기화 관련
    echo -e "\n=== PostgreSQL 초기화 관련 로그 ==="
    echo "$postgres_logs" | grep -i "database\|initdb\|ready" | tail -10

    # 성능 관련 경고
    echo -e "\n=== PostgreSQL 성능 관련 경고 ==="
    echo "$postgres_logs" | grep -i "slow\|lock\|deadlock\|timeout" | tail -5
}

analyze_app_logs() {
    log_info "SafeWork Application 로그 분석"

    local app_logs=$(portainer_api_call "GET" "containers/$(get_container_id "safework-app")/logs?stderr=true&stdout=true&tail=500")

    # Flask 애플리케이션 오류
    echo "=== SafeWork App 오류 패턴 분석 ==="
    echo "$app_logs" | grep -i "error\|exception\|traceback\|failed" | tail -10

    # 데이터베이스 연결 오류
    echo -e "\n=== 데이터베이스 연결 관련 로그 ==="
    echo "$app_logs" | grep -i "database\|sqlalchemy\|postgres\|connection" | tail -10

    # HTTP 요청 관련
    echo -e "\n=== HTTP 요청 관련 로그 ==="
    echo "$app_logs" | grep -E "GET|POST|PUT|DELETE" | tail -10

    # 보안 관련 경고
    echo -e "\n=== 보안 관련 로그 ==="
    echo "$app_logs" | grep -i "unauthorized\|forbidden\|csrf\|auth" | tail -5
}

analyze_redis_logs() {
    log_info "Redis 로그 분석"

    local redis_logs=$(portainer_api_call "GET" "containers/$(get_container_id "safework-redis")/logs?stderr=true&stdout=true&tail=300")

    # Redis 오류 및 경고
    echo "=== Redis 오류 및 경고 ==="
    echo "$redis_logs" | grep -i "error\|warning\|critical" | tail -10

    # 메모리 관련
    echo -e "\n=== Redis 메모리 관련 로그 ==="
    echo "$redis_logs" | grep -i "memory\|oom\|maxmemory" | tail -5

    # 연결 관련
    echo -e "\n=== Redis 연결 관련 로그 ==="
    echo "$redis_logs" | grep -i "client\|connection\|connect" | tail -10
}

# =============================================================================
# 시스템 성능 분석
# =============================================================================
analyze_system_performance() {
    log_header "시스템 성능 분석"

    # 컨테이너 리소스 사용량
    analyze_container_resources

    # 네트워크 상태
    analyze_network_status

    # 볼륨 및 스토리지 상태
    analyze_storage_status
}

analyze_container_resources() {
    log_info "컨테이너 리소스 사용량 분석"

    local containers=("safework-postgres" "safework-redis" "safework-app")

    for container in "${containers[@]}"; do
        local container_id=$(get_container_id "$container")
        if [ -n "$container_id" ]; then
            echo -e "\n=== $container 리소스 사용량 ==="
            local stats=$(portainer_api_call "GET" "containers/$container_id/stats?stream=false")

            if [ -n "$stats" ]; then
                local memory_usage=$(echo "$stats" | jq -r '.memory_stats.usage // 0')
                local memory_limit=$(echo "$stats" | jq -r '.memory_stats.limit // 0')
                local cpu_usage=$(echo "$stats" | jq -r '.cpu_stats.cpu_usage.total_usage // 0')

                if [ "$memory_usage" -gt 0 ] && [ "$memory_limit" -gt 0 ]; then
                    local memory_pct=$(( memory_usage * 100 / memory_limit ))
                    echo "메모리 사용률: ${memory_pct}% ($(( memory_usage / 1024 / 1024 ))MB / $(( memory_limit / 1024 / 1024 ))MB)"
                fi

                echo "CPU 사용량: $cpu_usage (누적)"
            fi
        fi
    done
}

analyze_network_status() {
    log_info "네트워크 상태 분석"

    local networks=$(portainer_api_call "GET" "networks")
    local safework_network=$(echo "$networks" | jq -r '.[] | select(.Name == "safework_network")')

    if [ -n "$safework_network" ]; then
        echo "SafeWork 네트워크 정보:"
        echo "$safework_network" | jq -r '.Name, .Driver, .Scope'

        local connected_containers=$(echo "$safework_network" | jq -r '.Containers | length')
        echo "연결된 컨테이너 수: $connected_containers"
    else
        log_warn "SafeWork 네트워크를 찾을 수 없음"
    fi
}

analyze_storage_status() {
    log_info "스토리지 상태 분석"

    # 볼륨 정보 조회
    local volumes=$(portainer_api_call "GET" "volumes")
    echo "Docker 볼륨 정보:"
    echo "$volumes" | jq -r '.Volumes[]? | .Name + " (" + .Driver + ")"'

    # 이미지 정보
    local images=$(portainer_api_call "GET" "images/json")
    echo -e "\nSafeWork 관련 이미지:"
    echo "$images" | jq -r '.[] | select(.RepoTags[]? | contains("safework")) | .RepoTags[]'
}

# =============================================================================
# 종합 보고서 생성
# =============================================================================
generate_summary_report() {
    log_header "종합 점검 보고서"

    echo -e "${BOLD}SafeWork 시스템 점검 요약${NC}"
    echo "점검 일시: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "로그 파일: $LOG_FILE"
    echo ""

    # 전체 상태 요약
    echo -e "${BLUE}🔍 시스템 상태 요약${NC}"
    local containers=$(portainer_api_call "GET" "containers/json?all=true")

    for container in "safework-postgres" "safework-redis" "safework-app"; do
        local status=$(echo "$containers" | jq -r ".[] | select(.Names[] | contains(\"$container\")) | .State" 2>/dev/null || echo "not_found")
        case "$status" in
            "running") echo "✅ $container: 정상 실행 중" ;;
            "exited") echo "❌ $container: 중지됨" ;;
            "not_found") echo "⚠️ $container: 존재하지 않음" ;;
            *) echo "🔄 $container: $status" ;;
        esac
    done

    echo ""
    echo -e "${BLUE}📊 데이터베이스 상태${NC}"
    if check_db_connection > /dev/null 2>&1; then
        echo "✅ 데이터베이스 연결: 정상"
    else
        echo "❌ 데이터베이스 연결: 실패"
    fi

    # 권장사항
    echo ""
    echo -e "${YELLOW}💡 권장사항${NC}"
    echo "• 정기적인 데이터베이스 백업 수행"
    echo "• 로그 모니터링 및 이상 징후 감시"
    echo "• 시스템 리소스 사용량 정기 점검"
    echo "• 마이그레이션 상태 주기적 확인"

    log_success "종합 점검 완료"
}

# =============================================================================
# 메인 실행 함수
# =============================================================================
show_help() {
    echo "사용법: $0 [COMMAND]"
    echo ""
    echo "명령어:"
    echo "  check-all         전체 점검 실행 (기본값)"
    echo "  db-connection     데이터베이스 연결 점검"
    echo "  db-schema         데이터베이스 스키마 점검"
    echo "  migration         마이그레이션 상태 점검"
    echo "  logs              운영 로그 분석"
    echo "  performance       시스템 성능 분석"
    echo "  report            종합 보고서 생성"
    echo "  help              도움말 표시"
    echo ""
    echo "예시:"
    echo "  $0                # 전체 점검"
    echo "  $0 db-connection  # DB 연결만 점검"
    echo "  $0 logs           # 로그 분석만 실행"
}

main() {
    show_banner

    case "${1:-check-all}" in
        "check-all")
            check_db_connection
            check_database_schema
            check_migration_status
            analyze_operational_logs
            analyze_system_performance
            generate_summary_report
            ;;
        "db-connection")
            check_db_connection
            ;;
        "db-schema")
            check_database_schema
            ;;
        "migration")
            check_migration_status
            ;;
        "logs")
            analyze_operational_logs
            ;;
        "performance")
            analyze_system_performance
            ;;
        "report")
            generate_summary_report
            ;;
        "help"|*)
            show_help
            exit 0
            ;;
    esac

    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        log_success "점검 작업 완료"
    else
        log_error "점검 중 오류 발생"
    fi

    echo ""
    exit $exit_code
}

# 스크립트 실행
main "$@"