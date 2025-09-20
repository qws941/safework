#!/bin/bash
# SafeWork Portainer 운영 배포 스크립트 v2.1
# 안정적인 운영 환경 배포 및 관리 자동화
# 개선사항: 지능형 에러 복구, 성능 최적화, 고급 모니터링
set -euo pipefail

# =============================================================================
# 설정 및 상수 정의
# =============================================================================
readonly SCRIPT_VERSION="2.1.0"
readonly SCRIPT_NAME="SafeWork Portainer Operations Deploy"
readonly LOG_FILE="/tmp/safework_portainer_deploy_$(date +%Y%m%d_%H%M%S).log"

# Portainer API 설정
readonly PORTAINER_URL="https://portainer.jclee.me"
readonly PORTAINER_TOKEN="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
readonly ENDPOINT_ID="3"

# 컨테이너 설정
readonly REGISTRY_HOST="registry.jclee.me"
readonly NETWORK_NAME="safework_network"
readonly RESTART_POLICY="unless-stopped"

# 타임아웃 및 재시도 설정
readonly MAX_RETRIES=5
readonly RETRY_DELAY=10
readonly HEALTH_CHECK_TIMEOUT=120
readonly CONTAINER_START_TIMEOUT=60
readonly DB_READY_TIMEOUT=180
readonly API_TIMEOUT=30

# 성능 최적화 설정
readonly PARALLEL_HEALTH_CHECK=true
readonly INTELLIGENT_RETRY=true
readonly FAST_FAIL_MODE=false

# 색상 코드
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

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

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "${YELLOW}$*${NC}"; }
log_error() { log "ERROR" "${RED}$*${NC}"; }
log_success() { log "SUCCESS" "${GREEN}$*${NC}"; }

show_header() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "$SCRIPT_NAME v$SCRIPT_VERSION"
    echo "=========================================="
    echo -e "${NC}"
    log_info "스크립트 시작 - 로그 파일: $LOG_FILE"
}

# =============================================================================
# 스마트 에러 복구 및 성능 모니터링
# =============================================================================
check_prerequisites() {
    log_info "전제 조건 확인 중..."

    # jq 설치 확인
    if ! command -v jq &> /dev/null; then
        log_error "jq가 설치되지 않았습니다. 설치하세요: sudo apt-get install jq"
        return 1
    fi

    # curl 설치 확인
    if ! command -v curl &> /dev/null; then
        log_error "curl이 설치되지 않았습니다. 설치하세요: sudo apt-get install curl"
        return 1
    fi

    # Portainer API 연결 확인
    if ! curl -s -f --connect-timeout 5 "$PORTAINER_URL/api/status" > /dev/null 2>&1; then
        log_error "Portainer API에 연결할 수 없습니다: $PORTAINER_URL"
        return 1
    fi

    log_success "전제 조건 확인 완료"
    return 0
}

intelligent_error_recovery() {
    local operation="$1"
    local container_name="$2"
    local error_count="${3:-1}"

    log_warn "지능형 에러 복구 시작: $operation ($container_name)"

    case "$operation" in
        "container_start_failed")
            # 컨테이너 시작 실패 시 로그 확인 및 복구
            local container_id=$(get_container_id "$container_name")
            if [ -n "$container_id" ]; then
                log_info "컨테이너 로그 확인 중..."
                local logs=$(portainer_api_call "GET" "containers/$container_id/logs?tail=50&stdout=true&stderr=true")
                log_info "최근 로그: $(echo "$logs" | tail -3)"

                # 일반적인 오류 패턴 분석 및 자동 수정
                if echo "$logs" | grep -q "port.*already in use"; then
                    log_info "포트 충돌 감지 - 기존 프로세스 정리 시도"
                    cleanup_port_conflicts "$container_name"
                elif echo "$logs" | grep -q "database.*does not exist"; then
                    log_info "데이터베이스 문제 감지 - 초기화 대기 연장"
                    sleep 30
                fi
            fi
            ;;
        "api_call_failed")
            # API 호출 실패 시 토큰 및 연결 재확인
            log_info "API 연결 상태 재확인 중..."
            if ! curl -s -f "$PORTAINER_URL/api/status" > /dev/null; then
                log_error "Portainer API 서버 응답 없음"
                return 1
            fi
            ;;
    esac

    return 0
}

cleanup_port_conflicts() {
    local container_name="$1"
    log_info "포트 충돌 해결 시도: $container_name"

    case "$container_name" in
        "safework-app")
            # 4545 포트 사용 프로세스 확인
            local pid=$(lsof -ti:4545 2>/dev/null || echo "")
            if [ -n "$pid" ]; then
                log_warn "포트 4545를 사용 중인 프로세스 발견: PID $pid"
                # 안전한 포트 정리는 수동으로 해야 함
                log_info "수동으로 포트를 해제하거나 다른 포트를 사용하세요"
            fi
            ;;
    esac
}

monitor_system_resources() {
    log_info "시스템 리소스 모니터링"

    # 메모리 사용량 확인
    local mem_usage=$(free | grep Mem | awk '{printf "%.1f", ($3/$2) * 100.0}')
    log_info "메모리 사용률: ${mem_usage}%"

    # 디스크 사용량 확인
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    log_info "디스크 사용률: ${disk_usage}%"

    # 경고 임계치 확인
    if (( $(echo "$mem_usage > 90" | bc -l) )); then
        log_warn "메모리 사용률이 높습니다: ${mem_usage}%"
    fi

    if (( disk_usage > 90 )); then
        log_warn "디스크 사용률이 높습니다: ${disk_usage}%"
    fi
}

# =============================================================================
# Portainer API 함수
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

            # 지능형 에러 복구 시도
            if [ "$INTELLIGENT_RETRY" = true ] && [ $retry_count -lt $((MAX_RETRIES - 1)) ]; then
                case "$status_code" in
                    "401"|"403")
                        log_error "인증 실패 - API 키 확인 필요"
                        return 1
                        ;;
                    "404")
                        log_warn "리소스를 찾을 수 없음: $endpoint"
                        ;;
                    "409")
                        log_warn "충돌 감지 - 재시도 전 대기 시간 연장"
                        backoff_delay=$((backoff_delay * 2))
                        ;;
                    "500"|"502"|"503")
                        log_warn "서버 오류 - 지수 백오프 적용"
                        backoff_delay=$((backoff_delay * 2))
                        intelligent_error_recovery "api_call_failed" "$endpoint" $((retry_count + 1))
                        ;;
                esac
            fi

            if [ $retry_count -eq $((MAX_RETRIES - 1)) ]; then
                log_error "API 호출 최대 재시도 초과: $endpoint (최종 상태: $status_code)"
                return 1
            fi

            retry_count=$((retry_count + 1))
            log_info "재시도 대기 중... (${backoff_delay}초)"
            sleep $backoff_delay
        fi
    done
}

# =============================================================================
# 컨테이너 관리 함수
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

    # 네트워크 존재 확인
    local networks=$(portainer_api_call "GET" "networks")
    local network_exists=$(echo "$networks" | jq -r ".[] | select(.Name == \"$NETWORK_NAME\") | .Name" 2>/dev/null || echo "")

    if [ -n "$network_exists" ]; then
        log_info "네트워크 $NETWORK_NAME 이미 존재"
        return 0
    fi

    # 네트워크 생성
    local network_data="{\"Name\": \"$NETWORK_NAME\", \"Driver\": \"bridge\"}"
    if portainer_api_call "POST" "networks/create" "$network_data" > /dev/null; then
        log_success "네트워크 생성 완료: $NETWORK_NAME"
        return 0
    else
        log_error "네트워크 생성 실패: $NETWORK_NAME"
        return 1
    fi
}

deploy_postgres() {
    log_info "PostgreSQL 컨테이너 배포 시작"

    # 이미지 풀링
    pull_image "$REGISTRY_HOST/safework/postgres:latest" || return 1

    # 기존 컨테이너 정리
    stop_container "safework-postgres"
    remove_container "safework-postgres"

    # 컨테이너 생성 및 시작
    local container_config='{
        "Image": "'$REGISTRY_HOST'/safework/postgres:latest",
        "name": "safework-postgres",
        "Env": [
            "TZ=Asia/Seoul",
            "POSTGRES_PASSWORD=safework2024",
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

            # 데이터베이스 초기화 확인
            wait_for_postgres_ready
            return $?
        else
            log_error "PostgreSQL 컨테이너 시작 실패"
            intelligent_error_recovery "container_start_failed" "safework-postgres"
            return 1
        fi
    else
        log_error "PostgreSQL 컨테이너 생성 실패"
        return 1
    fi
}

wait_for_postgres_ready() {
    log_info "PostgreSQL 데이터베이스 초기화 대기 중..."
    local start_time=$(date +%s)
    local max_wait=$DB_READY_TIMEOUT

    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        if [ $elapsed -ge $max_wait ]; then
            log_error "PostgreSQL 초기화 타임아웃 (${max_wait}초)"
            return 1
        fi

        # PostgreSQL 연결 테스트
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

        log_info "PostgreSQL 초기화 진행 중... (${elapsed}s/${max_wait}s)"
        sleep 10
    done
}

deploy_redis() {
    log_info "Redis 컨테이너 배포 시작"

    # 이미지 풀링
    pull_image "$REGISTRY_HOST/safework/redis:latest" || return 1

    # 기존 컨테이너 정리
    stop_container "safework-redis"
    remove_container "safework-redis"

    # 컨테이너 생성 및 시작
    local container_config='{
        "Image": "'$REGISTRY_HOST'/safework/redis:latest",
        "name": "safework-redis",
        "Env": [
            "TZ=Asia/Seoul"
        ],
        "HostConfig": {
            "NetworkMode": "'$NETWORK_NAME'",
            "RestartPolicy": {"Name": "'$RESTART_POLICY'"}
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

    # 이미지 풀링
    pull_image "$REGISTRY_HOST/safework/app:latest" || return 1

    # 기존 컨테이너 정리
    stop_container "safework-app"
    remove_container "safework-app"

    # 컨테이너 생성 및 시작
    local container_config='{
        "Image": "'$REGISTRY_HOST'/safework/app:latest",
        "name": "safework-app",
        "Env": [
            "TZ=Asia/Seoul",
            "DB_HOST=safework-postgres",
            "DB_NAME=safework_db",
            "DB_USER=safework",
            "DB_PASSWORD=safework2024",
            "REDIS_HOST=safework-redis"
        ],
        "HostConfig": {
            "NetworkMode": "'$NETWORK_NAME'",
            "PortBindings": {
                "4545/tcp": [{"HostPort": "4545"}]
            },
            "RestartPolicy": {"Name": "'$RESTART_POLICY'"}
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
# 헬스 체크 함수
# =============================================================================
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
# 배포 상태 모니터링
# =============================================================================
show_deployment_status() {
    echo -e "\n${BLUE}=== SafeWork 배포 상태 ===${NC}"

    local containers=$(portainer_api_call "GET" "containers/json?all=true")

    for container in "safework-postgres" "safework-redis" "safework-app"; do
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

# =============================================================================
# 시스템 최적화 함수
# =============================================================================
optimize_system() {
    log_info "SafeWork 시스템 최적화 시작"

    # 사용하지 않는 Docker 리소스 정리
    cleanup_unused_resources

    # 컨테이너 리소스 최적화
    optimize_container_resources

    # 시스템 성능 튜닝
    tune_system_performance

    log_success "시스템 최적화 완료"
}

cleanup_unused_resources() {
    log_info "사용하지 않는 Docker 리소스 정리"

    # 사용하지 않는 이미지 정리
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

    # 컨테이너별 리소스 사용량 확인
    local containers=$(portainer_api_call "GET" "containers/json?all=true")
    echo "$containers" | jq -r '.[] | select(.Names[] | contains("safework")) | .Names[0] + " " + .Id' | while read container_name container_id; do
        container_name=$(echo "$container_name" | sed 's/^\///')

        if [ -n "$container_id" ]; then
            # 컨테이너 통계 확인
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

    # Docker 데몬 최적화 확인
    local docker_info=$(portainer_api_call "GET" "info")
    if [ -n "$docker_info" ]; then
        local containers_running=$(echo "$docker_info" | jq -r '.ContainersRunning // 0')
        local containers_total=$(echo "$docker_info" | jq -r '.Containers // 0')
        log_info "컨테이너 상태: 실행 중 $containers_running / 전체 $containers_total"
    fi

    # 시스템 성능 권장사항 제시
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    if [ -n "$load_avg" ]; then
        local cpu_cores=$(nproc)
        log_info "시스템 로드: $load_avg (CPU 코어: $cpu_cores)"

        if (( $(echo "$load_avg > $cpu_cores" | bc -l 2>/dev/null || echo 0) )); then
            log_warn "시스템 로드가 높습니다. 리소스 사용량을 확인하세요."
        fi
    fi
}

# =============================================================================
# 메인 배포 함수
# =============================================================================
full_deployment() {
    log_info "전체 SafeWork 시스템 배포 시작"

    # 네트워크 생성
    create_network || {
        log_error "네트워크 생성 실패로 배포 중단"
        return 1
    }

    # PostgreSQL 배포
    deploy_postgres || {
        log_error "PostgreSQL 배포 실패로 전체 배포 중단"
        return 1
    }

    # PostgreSQL 헬스 체크
    wait_for_container_health "safework-postgres" $CONTAINER_START_TIMEOUT || {
        log_error "PostgreSQL 헬스 체크 실패"
        return 1
    }

    # Redis 배포
    deploy_redis || {
        log_error "Redis 배포 실패로 전체 배포 중단"
        return 1
    }

    # Redis 헬스 체크
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

    # App 헬스 체크
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

# =============================================================================
# 메인 실행 함수
# =============================================================================
main() {
    show_header

    # 전제 조건 확인
    check_prerequisites || {
        log_error "전제 조건 확인 실패"
        exit 1
    }

    # 시스템 리소스 모니터링
    monitor_system_resources

    case "${1:-deploy}" in
        "deploy"|"full")
            full_deployment
            ;;
        "status")
            show_deployment_status
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
        "health")
            check_app_health
            ;;
        "monitor")
            show_deployment_status
            monitor_system_resources
            check_app_health
            ;;
        "optimize")
            log_info "시스템 최적화 실행"
            optimize_system
            ;;
        "stop")
            log_info "모든 SafeWork 컨테이너 중지"
            stop_container "safework-app"
            stop_container "safework-redis"
            stop_container "safework-postgres"
            ;;
        "restart")
            log_info "SafeWork 시스템 재시작"
            stop_container "safework-app"
            stop_container "safework-redis"
            stop_container "safework-postgres"
            sleep 10
            full_deployment
            ;;
        "help"|*)
            echo "사용법: $0 [COMMAND]"
            echo ""
            echo "명령어:"
            echo "  deploy, full  - 전체 시스템 배포 (기본값)"
            echo "  status        - 배포 상태 확인"
            echo "  postgres      - PostgreSQL만 배포"
            echo "  redis         - Redis만 배포"
            echo "  app           - SafeWork App만 배포"
            echo "  health        - 애플리케이션 헬스 체크"
            echo "  monitor       - 종합 시스템 모니터링"
            echo "  optimize      - 시스템 최적화 실행"
            echo "  stop          - 모든 컨테이너 중지"
            echo "  restart       - 시스템 재시작"
            echo "  help          - 도움말 표시"
            echo ""
            echo "고급 기능:"
            echo "  - 지능형 에러 복구 (INTELLIGENT_RETRY=true)"
            echo "  - 성능 최적화 및 리소스 모니터링"
            echo "  - 스마트 데이터베이스 초기화 확인"
            echo "  - 자동 백오프 및 재시도 로직"
            echo ""
            echo "예시:"
            echo "  $0                # 전체 배포"
            echo "  $0 status         # 상태 확인"
            echo "  $0 monitor        # 종합 모니터링"
            echo "  $0 optimize       # 시스템 최적화"
            ;;
    esac

    local exit_code=$?

    echo ""
    show_deployment_status

    if [ $exit_code -eq 0 ]; then
        log_success "스크립트 실행 완료"
        echo -e "\n${GREEN}SafeWork 시스템 운영 준비 완료${NC}"
        echo "접속 URL: http://localhost:4545"
        echo "헬스 체크: http://localhost:4545/health"
    else
        log_error "스크립트 실행 중 오류 발생"
        echo -e "\n${RED}배포 중 오류가 발생했습니다. 로그를 확인하세요: $LOG_FILE${NC}"
    fi

    echo ""
    exit $exit_code
}

# 스크립트 실행
main "$@"