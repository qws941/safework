#!/bin/bash
# SafeWork 마스터 관리 스크립트 v3.0
# 모든 SafeWork 운영 기능을 하나로 통합 - 중복 제거 및 최적화
# 통합 기능: 배포, 모니터링, 로그 관리, 헬스 체크, 시스템 최적화

set -euo pipefail

# =============================================================================
# 전역 설정 및 상수
# =============================================================================
readonly SCRIPT_VERSION="3.0.0"
readonly SCRIPT_NAME="SafeWork Master Management Script"
readonly LOG_FILE="/tmp/safework_master_$(date +%Y%m%d_%H%M%S).log"

# Portainer API 설정
readonly PORTAINER_URL="https://portainer.jclee.me"
readonly PORTAINER_TOKEN="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
readonly ENDPOINT_ID="3"

# 컨테이너 및 네트워크 설정
readonly REGISTRY_HOST="registry.jclee.me"
readonly NETWORK_NAME="safework_network"
readonly RESTART_POLICY="unless-stopped"
readonly PROJECT_NAME="safework"

# 환경 설정
readonly DB_PASSWORD="safework2024"
readonly PRODUCTION_URL="https://safework.jclee.me"

# 타임아웃 및 재시도 설정
readonly MAX_RETRIES=5
readonly RETRY_DELAY=10
readonly API_TIMEOUT=30
readonly HEALTH_CHECK_TIMEOUT=120
readonly CONTAINER_START_TIMEOUT=60
readonly DB_READY_TIMEOUT=180

# 성능 및 최적화 설정
readonly PARALLEL_OPERATIONS=true
readonly INTELLIGENT_RETRY=true
readonly AUTO_CLEANUP=true

# 색상 코드
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'
readonly BOLD='\033[1m'

# 컨테이너 목록
readonly CONTAINERS=("safework-postgres" "safework-redis" "safework-app")

# =============================================================================
# 로깅 및 유틸리티 함수
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
    echo "║                SafeWork Master Script v${SCRIPT_VERSION}                ║"
    echo "║          통합 배포/모니터링/관리 자동화 시스템                   ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    log_info "스크립트 시작 - 로그 파일: $LOG_FILE"
}

# =============================================================================
# 전제 조건 및 검증 함수
# =============================================================================
check_prerequisites() {
    log_info "전제 조건 확인 중..."

    # 필수 명령어 확인
    local required_commands=("curl" "jq" "docker")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "$cmd가 설치되지 않았습니다. 설치하세요: sudo apt-get install $cmd"
            return 1
        fi
    done

    # Portainer API 연결 확인
    if ! curl -s -f --connect-timeout 5 "$PORTAINER_URL/api/status" > /dev/null 2>&1; then
        log_error "Portainer API에 연결할 수 없습니다: $PORTAINER_URL"
        return 1
    fi

    # Docker 데몬 확인
    if ! docker version &> /dev/null; then
        log_warn "Docker 데몬에 직접 연결할 수 없습니다. Portainer API만 사용합니다."
    fi

    log_success "전제 조건 확인 완료"
    return 0
}

monitor_system_resources() {
    log_info "시스템 리소스 모니터링"

    # 메모리 사용량
    local mem_usage=$(free | grep Mem | awk '{printf "%.1f", ($3/$2) * 100.0}')
    log_info "메모리 사용률: ${mem_usage}%"

    # 디스크 사용량
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    log_info "디스크 사용률: ${disk_usage}%"

    # 시스템 로드
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local cpu_cores=$(nproc)
    log_info "시스템 로드: $load_avg (CPU 코어: $cpu_cores)"

    # 경고 임계치 확인
    if (( $(echo "$mem_usage > 90" | bc -l) )); then
        log_warn "메모리 사용률이 높습니다: ${mem_usage}%"
    fi

    if (( disk_usage > 90 )); then
        log_warn "디스크 사용률이 높습니다: ${disk_usage}%"
    fi

    if (( $(echo "$load_avg > $cpu_cores" | bc -l 2>/dev/null || echo 0) )); then
        log_warn "시스템 로드가 높습니다. 리소스 사용량을 확인하세요."
    fi
}

# =============================================================================
# Portainer API 통합 함수
# =============================================================================
portainer_api_call() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"
    local retry_count=0
    local response
    local backoff_delay=$RETRY_DELAY

    while [ $retry_count -lt $MAX_RETRIES ]; do
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" \
                --connect-timeout $API_TIMEOUT \
                --max-time $((API_TIMEOUT * 2)) \
                -X "$method" \
                -H "X-API-Key: $PORTAINER_TOKEN" \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/$endpoint" 2>/dev/null)
        else
            response=$(curl -s -w "\n%{http_code}" \
                --connect-timeout $API_TIMEOUT \
                --max-time $((API_TIMEOUT * 2)) \
                -X "$method" \
                -H "X-API-Key: $PORTAINER_TOKEN" \
                "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/$endpoint" 2>/dev/null)
        fi

        local body=$(echo "$response" | head -n -1)
        local status_code=$(echo "$response" | tail -n 1)

        if [[ "$status_code" =~ ^2[0-9][0-9]$ ]]; then
            echo "$body"
            return 0
        else
            log_warn "API 호출 실패 (시도 $((retry_count + 1))/$MAX_RETRIES): HTTP $status_code"

            # 지능형 에러 처리
            if [ "$INTELLIGENT_RETRY" = true ] && [ $retry_count -lt $((MAX_RETRIES - 1)) ]; then
                case "$status_code" in
                    "401"|"403")
                        log_error "인증 실패 - API 키 확인 필요"
                        return 1
                        ;;
                    "409")
                        log_warn "충돌 감지 - 백오프 시간 연장"
                        backoff_delay=$((backoff_delay * 2))
                        ;;
                    "500"|"502"|"503")
                        log_warn "서버 오류 - 지수 백오프 적용"
                        backoff_delay=$((backoff_delay * 2))
                        ;;
                esac
            fi

            if [ $retry_count -eq $((MAX_RETRIES - 1)) ]; then
                log_error "API 호출 최대 재시도 초과: $endpoint (상태: $status_code)"
                return 1
            fi

            retry_count=$((retry_count + 1))
            log_info "재시도 대기 중... (${backoff_delay}초)"
            sleep $backoff_delay
        fi
    done
}

# =============================================================================
# 컨테이너 관리 통합 함수
# =============================================================================
get_container_status() {
    local container_name="$1"
    local containers=$(portainer_api_call "GET" "containers/json?all=true")
    echo "$containers" | jq -r ".[] | select(.Names[] | contains(\"$container_name\")) | .State" 2>/dev/null || echo "not_found"
}

get_container_id() {
    local container_name="$1"
    local containers=$(portainer_api_call "GET" "containers/json?all=true")
    echo "$containers" | jq -r ".[] | select(.Names[] | contains(\"$container_name\")) | .Id" 2>/dev/null || echo ""
}

get_container_info() {
    local container_name="$1"
    local containers=$(portainer_api_call "GET" "containers/json?all=true")
    echo "$containers" | jq -r ".[] | select(.Names[] | contains(\"$container_name\"))" 2>/dev/null || echo ""
}

stop_container() {
    local container_name="$1"
    local container_id=$(get_container_id "$container_name")

    if [ -n "$container_id" ]; then
        log_info "$container_name 컨테이너 중지 중..."
        if portainer_api_call "POST" "containers/$container_id/stop" > /dev/null; then
            log_success "$container_name 컨테이너 중지 완료"
            return 0
        else
            log_error "$container_name 컨테이너 중지 실패"
            return 1
        fi
    else
        log_info "$container_name 컨테이너를 찾을 수 없음"
        return 0
    fi
}

remove_container() {
    local container_name="$1"
    local container_id=$(get_container_id "$container_name")

    if [ -n "$container_id" ]; then
        log_info "$container_name 컨테이너 삭제 중..."
        if portainer_api_call "DELETE" "containers/$container_id?force=true" > /dev/null; then
            log_success "$container_name 컨테이너 삭제 완료"
            return 0
        else
            log_error "$container_name 컨테이너 삭제 실패"
            return 1
        fi
    else
        log_info "$container_name 컨테이너를 찾을 수 없음"
        return 0
    fi
}

pull_image() {
    local image="$1"
    log_info "이미지 풀링: $image"

    local pull_data="{\"fromImage\": \"$image\"}"
    if portainer_api_call "POST" "images/create" "$pull_data" > /dev/null; then
        log_success "이미지 풀링 완료: $image"
        return 0
    else
        log_error "이미지 풀링 실패: $image"
        return 1
    fi
}

create_network() {
    log_info "네트워크 생성 확인: $NETWORK_NAME"

    local networks=$(portainer_api_call "GET" "networks")
    local network_exists=$(echo "$networks" | jq -r ".[] | select(.Name == \"$NETWORK_NAME\") | .Name" 2>/dev/null || echo "")

    if [ -n "$network_exists" ]; then
        log_info "네트워크 $NETWORK_NAME 이미 존재"
        return 0
    fi

    local network_data="{\"Name\": \"$NETWORK_NAME\", \"Driver\": \"bridge\"}"
    if portainer_api_call "POST" "networks/create" "$network_data" > /dev/null; then
        log_success "네트워크 생성 완료: $NETWORK_NAME"
        return 0
    else
        log_error "네트워크 생성 실패: $NETWORK_NAME"
        return 1
    fi
}

# =============================================================================
# 개별 서비스 배포 함수
# =============================================================================
deploy_postgres() {
    log_info "PostgreSQL 컨테이너 배포 시작"

    pull_image "$REGISTRY_HOST/safework/postgres:latest" || return 1
    stop_container "safework-postgres"
    remove_container "safework-postgres"

    local container_config='{
        "Image": "'$REGISTRY_HOST'/safework/postgres:latest",
        "name": "safework-postgres",
        "Env": [
            "TZ=Asia/Seoul",
            "POSTGRES_PASSWORD='$DB_PASSWORD'",
            "POSTGRES_DB=safework_db",
            "POSTGRES_USER=safework",
            "POSTGRES_INITDB_ARGS=--encoding=UTF8 --locale=C"
        ],
        "HostConfig": {
            "NetworkMode": "'$NETWORK_NAME'",
            "RestartPolicy": {"Name": "'$RESTART_POLICY'"},
            "Memory": 536870912,
            "MemorySwap": 1073741824
        },
        "NetworkingConfig": {
            "EndpointsConfig": {
                "'$NETWORK_NAME'": {}
            }
        }
    }'

    log_info "PostgreSQL 컨테이너 생성 중..."
    local create_response=$(portainer_api_call "POST" "containers/create?name=safework-postgres" "$container_config")
    local container_id=$(echo "$create_response" | jq -r '.Id' 2>/dev/null)

    if [ -n "$container_id" ] && [ "$container_id" != "null" ]; then
        log_info "PostgreSQL 컨테이너 시작 중..."
        if portainer_api_call "POST" "containers/$container_id/start" > /dev/null; then
            log_success "PostgreSQL 컨테이너 배포 완료"
            wait_for_postgres_ready
            return $?
        else
            log_error "PostgreSQL 컨테이너 시작 실패"
            return 1
        fi
    else
        log_error "PostgreSQL 컨테이너 생성 실패"
        return 1
    fi
}

deploy_redis() {
    log_info "Redis 컨테이너 배포 시작"

    pull_image "$REGISTRY_HOST/safework/redis:latest" || return 1
    stop_container "safework-redis"
    remove_container "safework-redis"

    local container_config='{
        "Image": "'$REGISTRY_HOST'/safework/redis:latest",
        "name": "safework-redis",
        "Env": [
            "TZ=Asia/Seoul"
        ],
        "HostConfig": {
            "NetworkMode": "'$NETWORK_NAME'",
            "RestartPolicy": {"Name": "'$RESTART_POLICY'"},
            "Memory": 268435456
        },
        "NetworkingConfig": {
            "EndpointsConfig": {
                "'$NETWORK_NAME'": {}
            }
        }
    }'

    log_info "Redis 컨테이너 생성 중..."
    local create_response=$(portainer_api_call "POST" "containers/create?name=safework-redis" "$container_config")
    local container_id=$(echo "$create_response" | jq -r '.Id' 2>/dev/null)

    if [ -n "$container_id" ] && [ "$container_id" != "null" ]; then
        log_info "Redis 컨테이너 시작 중..."
        if portainer_api_call "POST" "containers/$container_id/start" > /dev/null; then
            log_success "Redis 컨테이너 배포 완료"
            return 0
        else
            log_error "Redis 컨테이너 시작 실패"
            return 1
        fi
    else
        log_error "Redis 컨테이너 생성 실패"
        return 1
    fi
}

deploy_app() {
    log_info "SafeWork App 컨테이너 배포 시작"

    pull_image "$REGISTRY_HOST/safework/app:latest" || return 1
    stop_container "safework-app"
    remove_container "safework-app"

    local container_config='{
        "Image": "'$REGISTRY_HOST'/safework/app:latest",
        "name": "safework-app",
        "Env": [
            "TZ=Asia/Seoul",
            "DB_HOST=safework-postgres",
            "DB_NAME=safework_db",
            "DB_USER=safework",
            "DB_PASSWORD='$DB_PASSWORD'",
            "REDIS_HOST=safework-redis"
        ],
        "HostConfig": {
            "NetworkMode": "'$NETWORK_NAME'",
            "PortBindings": {
                "4545/tcp": [{"HostPort": "4545"}]
            },
            "RestartPolicy": {"Name": "'$RESTART_POLICY'"},
            "Memory": 1073741824
        },
        "NetworkingConfig": {
            "EndpointsConfig": {
                "'$NETWORK_NAME'": {}
            }
        }
    }'

    log_info "SafeWork App 컨테이너 생성 중..."
    local create_response=$(portainer_api_call "POST" "containers/create?name=safework-app" "$container_config")
    local container_id=$(echo "$create_response" | jq -r '.Id' 2>/dev/null)

    if [ -n "$container_id" ] && [ "$container_id" != "null" ]; then
        log_info "SafeWork App 컨테이너 시작 중..."
        if portainer_api_call "POST" "containers/$container_id/start" > /dev/null; then
            log_success "SafeWork App 컨테이너 배포 완료"
            return 0
        else
            log_error "SafeWork App 컨테이너 시작 실패"
            return 1
        fi
    else
        log_error "SafeWork App 컨테이너 생성 실패"
        return 1
    fi
}

# =============================================================================
# 헬스 체크 및 모니터링 함수
# =============================================================================
wait_for_postgres_ready() {
    log_info "PostgreSQL 데이터베이스 초기화 대기 중..."
    local start_time=$(date +%s)

    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        if [ $elapsed -ge $DB_READY_TIMEOUT ]; then
            log_error "PostgreSQL 초기화 타임아웃 (${DB_READY_TIMEOUT}초)"
            return 1
        fi

        local container_id=$(get_container_id "safework-postgres")
        if [ -n "$container_id" ]; then
            local exec_config='{
                "AttachStdout": true,
                "AttachStderr": true,
                "Cmd": ["pg_isready", "-U", "safework", "-d", "safework_db"]
            }'

            local exec_response=$(portainer_api_call "POST" "containers/$container_id/exec" "$exec_config")
            local exec_id=$(echo "$exec_response" | jq -r '.Id' 2>/dev/null)

            if [ -n "$exec_id" ] && [ "$exec_id" != "null" ]; then
                local start_exec='{"Detach": false}'
                if portainer_api_call "POST" "exec/$exec_id/start" "$start_exec" > /dev/null 2>&1; then
                    log_success "PostgreSQL 데이터베이스 준비 완료 (${elapsed}초)"
                    return 0
                fi
            fi
        fi

        log_info "PostgreSQL 초기화 진행 중... (${elapsed}s/${DB_READY_TIMEOUT}s)"
        sleep 10
    done
}

wait_for_container_health() {
    local container_name="$1"
    local timeout="$2"
    local start_time=$(date +%s)

    log_info "$container_name 컨테이너 헬스 체크 대기 중..."

    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        if [ $elapsed -ge $timeout ]; then
            log_error "$container_name 헬스 체크 타임아웃 ($timeout초)"
            return 1
        fi

        local status=$(get_container_status "$container_name")
        case "$status" in
            "running")
                log_success "$container_name 컨테이너 정상 실행 중"
                return 0
                ;;
            "exited"|"dead")
                log_error "$container_name 컨테이너가 종료됨"
                return 1
                ;;
            *)
                log_info "$container_name 상태: $status (대기 중... ${elapsed}s/${timeout}s)"
                sleep 5
                ;;
        esac
    done
}

check_app_health() {
    log_info "SafeWork 애플리케이션 헬스 체크"
    local retry_count=0

    while [ $retry_count -lt $MAX_RETRIES ]; do
        if curl -s -f "http://localhost:4545/health" > /dev/null 2>&1; then
            log_success "SafeWork 애플리케이션 헬스 체크 성공"
            local health_response=$(curl -s "http://localhost:4545/health" | jq -r '.status' 2>/dev/null || echo "unknown")
            log_info "애플리케이션 상태: $health_response"
            return 0
        else
            log_warn "헬스 체크 실패 (시도 $((retry_count + 1))/$MAX_RETRIES)"
            retry_count=$((retry_count + 1))
            sleep 10
        fi
    done

    log_error "SafeWork 애플리케이션 헬스 체크 실패"
    return 1
}

# =============================================================================
# 상태 모니터링 및 보고 함수
# =============================================================================
show_deployment_status() {
    log_header "SafeWork 시스템 상태"

    local containers=$(portainer_api_call "GET" "containers/json?all=true")

    for container in "${CONTAINERS[@]}"; do
        local status=$(echo "$containers" | jq -r ".[] | select(.Names[] | contains(\"$container\")) | .State" 2>/dev/null || echo "not_found")
        local uptime=$(echo "$containers" | jq -r ".[] | select(.Names[] | contains(\"$container\")) | .Status" 2>/dev/null || echo "N/A")

        case "$status" in
            "running")
                echo -e "✅ $container: ${GREEN}실행 중${NC} ($uptime)"
                ;;
            "exited")
                echo -e "❌ $container: ${RED}중지됨${NC} ($uptime)"
                ;;
            "not_found")
                echo -e "⚠️  $container: ${YELLOW}존재하지 않음${NC}"
                ;;
            *)
                echo -e "🔄 $container: ${YELLOW}$status${NC} ($uptime)"
                ;;
        esac
    done

    echo ""
}

show_detailed_status() {
    log_header "상세 시스템 상태"

    show_deployment_status
    monitor_system_resources

    # 네트워크 상태 확인
    log_info "네트워크 상태 확인"
    local networks=$(portainer_api_call "GET" "networks")
    local safework_network=$(echo "$networks" | jq -r ".[] | select(.Name == \"$NETWORK_NAME\")" 2>/dev/null)

    if [ -n "$safework_network" ]; then
        local connected_containers=$(echo "$safework_network" | jq -r '.Containers | length' 2>/dev/null || echo "0")
        log_info "네트워크 $NETWORK_NAME: 연결된 컨테이너 $connected_containers개"
    else
        log_warn "네트워크 $NETWORK_NAME이 존재하지 않음"
    fi

    # 프로덕션 헬스 체크
    log_info "프로덕션 서비스 헬스 체크"
    if curl -s -f "$PRODUCTION_URL/health" > /dev/null 2>&1; then
        local prod_health=$(curl -s "$PRODUCTION_URL/health" | jq -r '.status' 2>/dev/null || echo "unknown")
        log_success "프로덕션 서비스 상태: $prod_health"
    else
        log_warn "프로덕션 서비스에 연결할 수 없음"
    fi
}

# =============================================================================
# 로그 관리 함수
# =============================================================================
show_logs() {
    local container_name="${1:-all}"
    local lines="${2:-50}"
    local follow="${3:-false}"

    if [ "$container_name" = "all" ]; then
        log_header "모든 SafeWork 컨테이너 로그"
        for container in "${CONTAINERS[@]}"; do
            echo -e "\n${BLUE}=== $container 로그 (최근 $lines줄) ===${NC}"
            get_container_logs "$container" "$lines" "false"
        done
    else
        log_header "$container_name 컨테이너 로그"
        get_container_logs "$container_name" "$lines" "$follow"
    fi
}

get_container_logs() {
    local container_name="$1"
    local lines="${2:-50}"
    local follow="${3:-false}"

    local container_id=$(get_container_id "$container_name")
    if [ -z "$container_id" ]; then
        log_error "$container_name 컨테이너를 찾을 수 없음"
        return 1
    fi

    if [ "$follow" = "true" ]; then
        log_info "$container_name 실시간 로그 추적 중... (Ctrl+C로 중지)"
        portainer_api_call "GET" "containers/$container_id/logs?follow=true&stdout=true&stderr=true&tail=$lines"
    else
        portainer_api_call "GET" "containers/$container_id/logs?stdout=true&stderr=true&tail=$lines"
    fi
}

show_error_logs() {
    local container_name="${1:-all}"

    if [ "$container_name" = "all" ]; then
        log_header "모든 SafeWork 컨테이너 오류 로그"
        for container in "${CONTAINERS[@]}"; do
            echo -e "\n${RED}=== $container 오류 로그 ===${NC}"
            get_error_logs "$container"
        done
    else
        log_header "$container_name 컨테이너 오류 로그"
        get_error_logs "$container_name"
    fi
}

get_error_logs() {
    local container_name="$1"
    local container_id=$(get_container_id "$container_name")

    if [ -z "$container_id" ]; then
        log_error "$container_name 컨테이너를 찾을 수 없음"
        return 1
    fi

    local logs=$(portainer_api_call "GET" "containers/$container_id/logs?stderr=true&tail=100")
    echo "$logs" | grep -i "error\|exception\|failed\|fatal" || echo "오류 로그가 없습니다."
}

# =============================================================================
# 시스템 최적화 함수
# =============================================================================
optimize_system() {
    log_header "SafeWork 시스템 최적화"

    if [ "$AUTO_CLEANUP" = true ]; then
        cleanup_unused_resources
    fi

    optimize_container_resources
    tune_system_performance

    log_success "시스템 최적화 완료"
}

cleanup_unused_resources() {
    log_info "사용하지 않는 Docker 리소스 정리"

    # 댕글링 이미지 정리
    local images_response=$(portainer_api_call "GET" "images/json?dangling=true")
    if [ -n "$images_response" ] && [ "$images_response" != "[]" ]; then
        log_info "댕글링 이미지 정리 중..."
        echo "$images_response" | jq -r '.[].Id' | while read image_id; do
            if [ -n "$image_id" ]; then
                portainer_api_call "DELETE" "images/$image_id" > /dev/null 2>&1
            fi
        done
    fi

    # 사용하지 않는 네트워크 정리
    local networks_response=$(portainer_api_call "GET" "networks")
    echo "$networks_response" | jq -r '.[] | select(.Driver == "bridge" and .Containers == null and .Name != "bridge" and .Name != "host" and .Name != "none" and .Name != "'$NETWORK_NAME'") | .Id' | while read network_id; do
        if [ -n "$network_id" ]; then
            portainer_api_call "DELETE" "networks/$network_id" > /dev/null 2>&1
        fi
    done

    log_success "리소스 정리 완료"
}

optimize_container_resources() {
    log_info "컨테이너 리소스 최적화"

    local containers=$(portainer_api_call "GET" "containers/json?all=true")
    echo "$containers" | jq -r '.[] | select(.Names[] | contains("safework")) | .Names[0] + " " + .Id' | while read container_name container_id; do
        container_name=$(echo "$container_name" | sed 's/^\///')

        if [ -n "$container_id" ]; then
            local stats=$(portainer_api_call "GET" "containers/$container_id/stats?stream=false" 2>/dev/null)
            if [ -n "$stats" ]; then
                local memory_usage=$(echo "$stats" | jq -r '.memory_stats.usage // 0')
                local memory_limit=$(echo "$stats" | jq -r '.memory_stats.limit // 0')

                if [ "$memory_usage" -gt 0 ] && [ "$memory_limit" -gt 0 ]; then
                    local usage_pct=$(( memory_usage * 100 / memory_limit ))
                    log_info "$container_name 메모리 사용률: ${usage_pct}%"
                fi
            fi
        fi
    done
}

tune_system_performance() {
    log_info "시스템 성능 튜닝"

    local docker_info=$(portainer_api_call "GET" "info")
    if [ -n "$docker_info" ]; then
        local containers_running=$(echo "$docker_info" | jq -r '.ContainersRunning // 0')
        local containers_total=$(echo "$docker_info" | jq -r '.Containers // 0')
        log_info "Docker 컨테이너 상태: 실행 중 $containers_running / 전체 $containers_total"
    fi
}

# =============================================================================
# 메인 배포 및 관리 함수
# =============================================================================
full_deployment() {
    log_header "전체 SafeWork 시스템 배포"

    create_network || {
        log_error "네트워크 생성 실패로 배포 중단"
        return 1
    }

    # PostgreSQL 배포
    deploy_postgres || {
        log_error "PostgreSQL 배포 실패로 전체 배포 중단"
        return 1
    }

    # Redis 배포
    deploy_redis || {
        log_error "Redis 배포 실패로 전체 배포 중단"
        return 1
    }

    wait_for_container_health "safework-redis" $CONTAINER_START_TIMEOUT || {
        log_error "Redis 헬스 체크 실패"
        return 1
    }

    # 데이터베이스 준비 대기
    log_info "데이터베이스 준비 대기 (30초)"
    sleep 30

    # App 배포
    deploy_app || {
        log_error "SafeWork App 배포 실패"
        return 1
    }

    wait_for_container_health "safework-app" $CONTAINER_START_TIMEOUT || {
        log_error "SafeWork App 헬스 체크 실패"
        return 1
    }

    # 애플리케이션 헬스 체크
    sleep 20  # 애플리케이션 완전 시작 대기
    check_app_health || {
        log_error "애플리케이션 헬스 체크 실패"
        return 1
    }

    log_success "전체 SafeWork 시스템 배포 완료"
    return 0
}

restart_system() {
    log_header "SafeWork 시스템 재시작"

    for container in "${CONTAINERS[@]}"; do
        stop_container "$container"
    done

    sleep 10
    full_deployment
}

stop_all_containers() {
    log_header "모든 SafeWork 컨테이너 중지"

    for container in "${CONTAINERS[@]}"; do
        stop_container "$container"
    done
}

# =============================================================================
# 메인 실행 함수
# =============================================================================
show_help() {
    echo "사용법: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "📋 배포 명령어:"
    echo "  deploy, full          전체 시스템 배포 (기본값)"
    echo "  postgres              PostgreSQL만 배포"
    echo "  redis                 Redis만 배포"
    echo "  app                   SafeWork App만 배포"
    echo "  restart               시스템 재시작"
    echo "  stop                  모든 컨테이너 중지"
    echo ""
    echo "📊 모니터링 명령어:"
    echo "  status                배포 상태 확인"
    echo "  monitor               상세 시스템 모니터링"
    echo "  health                애플리케이션 헬스 체크"
    echo ""
    echo "📋 로그 관리 명령어:"
    echo "  logs [container] [lines]     컨테이너 로그 조회"
    echo "  logs-live [container]        실시간 로그 추적"
    echo "  logs-errors [container]      오류 로그만 조회"
    echo ""
    echo "⚡ 최적화 명령어:"
    echo "  optimize              시스템 최적화 실행"
    echo "  cleanup               리소스 정리"
    echo ""
    echo "🔧 고급 기능:"
    echo "  - 지능형 에러 복구 (INTELLIGENT_RETRY=true)"
    echo "  - 병렬 작업 처리 (PARALLEL_OPERATIONS=true)"
    echo "  - 자동 리소스 정리 (AUTO_CLEANUP=true)"
    echo "  - 스마트 데이터베이스 초기화 확인"
    echo "  - 실시간 시스템 리소스 모니터링"
    echo ""
    echo "📝 예시:"
    echo "  $0                           # 전체 배포"
    echo "  $0 status                    # 상태 확인"
    echo "  $0 monitor                   # 상세 모니터링"
    echo "  $0 logs app 100              # App 로그 100줄"
    echo "  $0 logs-live postgres        # PostgreSQL 실시간 로그"
    echo "  $0 optimize                  # 시스템 최적화"
}

main() {
    show_banner

    # 전제 조건 확인
    check_prerequisites || {
        log_error "전제 조건 확인 실패"
        exit 1
    }

    # 명령어 처리
    case "${1:-deploy}" in
        "deploy"|"full")
            monitor_system_resources
            full_deployment
            ;;
        "postgres")
            create_network
            deploy_postgres
            ;;
        "redis")
            create_network
            deploy_redis
            wait_for_container_health "safework-redis" $CONTAINER_START_TIMEOUT
            ;;
        "app")
            create_network
            deploy_app
            wait_for_container_health "safework-app" $CONTAINER_START_TIMEOUT
            check_app_health
            ;;
        "status")
            show_deployment_status
            ;;
        "monitor")
            show_detailed_status
            ;;
        "health")
            check_app_health
            ;;
        "logs")
            show_logs "${2:-all}" "${3:-50}" "false"
            ;;
        "logs-live")
            show_logs "${2:-app}" "50" "true"
            ;;
        "logs-errors")
            show_error_logs "${2:-all}"
            ;;
        "optimize")
            monitor_system_resources
            optimize_system
            ;;
        "cleanup")
            cleanup_unused_resources
            ;;
        "restart")
            restart_system
            ;;
        "stop")
            stop_all_containers
            ;;
        "help"|*)
            show_help
            exit 0
            ;;
    esac

    local exit_code=$?

    echo ""
    show_deployment_status

    if [ $exit_code -eq 0 ]; then
        log_success "작업 완료"
        echo -e "\n${GREEN}SafeWork 시스템 운영 준비 완료${NC}"
        echo "로컬 접속: http://localhost:4545"
        echo "프로덕션: $PRODUCTION_URL"
        echo "헬스 체크: http://localhost:4545/health"
    else
        log_error "작업 중 오류 발생"
        echo -e "\n${RED}작업 중 오류가 발생했습니다. 로그를 확인하세요: $LOG_FILE${NC}"
    fi

    echo ""
    exit $exit_code
}

# 스크립트 실행
main "$@"