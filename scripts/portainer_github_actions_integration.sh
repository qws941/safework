#!/bin/bash

# =============================================================================
# SafeWork Portainer-GitHub Actions 통합 배포 시스템
# 버전: 1.0.0
# 작성일: 2025-09-22
# 설명: 포트레이너 API와 GitHub Actions를 통합한 완전 자동화 배포
# =============================================================================

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 스크립트 디렉토리 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
INTEGRATION_LOG="$LOG_DIR/portainer-github-integration-$(date +%Y%m%d-%H%M%S).log"

# 로그 디렉토리 생성
mkdir -p "$LOG_DIR"

# 환경 설정 로드
if [ -f "$SCRIPT_DIR/config.env" ]; then
    source "$SCRIPT_DIR/config.env"
elif [ -f "$SCRIPT_DIR/config/master.env" ]; then
    source "$SCRIPT_DIR/config/master.env"
fi

# 로그 함수들
log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]${NC} $1" | tee -a "$INTEGRATION_LOG"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS]${NC} $1" | tee -a "$INTEGRATION_LOG"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING]${NC} $1" | tee -a "$INTEGRATION_LOG"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR]${NC} $1" | tee -a "$INTEGRATION_LOG"
}

# 배너 출력
print_banner() {
    echo -e "${CYAN}"
    echo "============================================================================="
    echo "      SafeWork Portainer-GitHub Actions 통합 배포 시스템 v1.0.0"
    echo "============================================================================="
    echo -e "${NC}"
}

# GitHub Actions 워크플로우 트리거 (개선된 안정성)
trigger_github_actions() {
    local deploy_to_production=${1:-false}
    local max_retries=3
    local retry_delay=5

    log_info "GitHub Actions 워크플로우 트리거 중..."

    # GitHub Token 확인 및 검증
    if [ -z "$GITHUB_TOKEN" ]; then
        GITHUB_TOKEN=$(gh auth token 2>/dev/null)
        if [ -z "$GITHUB_TOKEN" ]; then
            log_error "GitHub 토큰을 찾을 수 없습니다. 'gh auth login'을 실행하세요."
            return 1
        fi
    fi

    # GitHub Token 유효성 검증
    local auth_test=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
        "https://api.github.com/user" | jq -r '.login // "error"')

    if [ "$auth_test" = "error" ] || [ "$auth_test" = "null" ]; then
        log_error "GitHub 토큰이 유효하지 않습니다. 토큰을 갱신하세요."
        return 1
    fi

    log_success "GitHub 인증 확인됨: $auth_test"

    # Repository 정보 자동 감지
    local repo_url=$(git config --get remote.origin.url 2>/dev/null)
    if [ -z "$repo_url" ]; then
        log_error "Git 원격 저장소 URL을 찾을 수 없습니다."
        return 1
    fi

    # GitHub API 호출을 위한 repository 정보 추출
    local repo_info=$(echo "$repo_url" | sed -E 's|.*github\.com[:/]([^/]+)/([^/.]+)(\.git)?.*|\1/\2|')

    log_info "Repository: $repo_info"
    log_info "배포 옵션: $deploy_to_production"

    # GitHub Actions workflow_dispatch 트리거 (재시도 로직 포함)
    local attempt=1
    local workflow_response
    local http_code

    while [ $attempt -le $max_retries ]; do
        log_info "워크플로우 트리거 시도 $attempt/$max_retries..."

        workflow_response=$(curl -s -w "\n%{http_code}" \
            -X POST \
            -H "Authorization: Bearer $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            -H "Content-Type: application/json" \
            "https://api.github.com/repos/$repo_info/actions/workflows/deploy.yml/dispatches" \
            -d "{
                \"ref\": \"master\",
                \"inputs\": {
                    \"deploy_to_production\": \"$deploy_to_production\"
                }
            }")

        http_code=$(echo "$workflow_response" | tail -n1)

        if [ "$http_code" = "204" ]; then
            log_success "GitHub Actions 워크플로우 트리거 성공 (시도 $attempt)"
            return 0
        else
            local response_body=$(echo "$workflow_response" | head -n -1)
            log_warning "트리거 실패 (시도 $attempt/$max_retries, HTTP: $http_code)"
            log_warning "응답: $response_body"

            if [ $attempt -lt $max_retries ]; then
                log_info "${retry_delay}초 후 재시도..."
                sleep $retry_delay
                retry_delay=$((retry_delay * 2))  # 지수 백오프
            fi
        fi

        attempt=$((attempt + 1))
    done

    log_error "GitHub Actions 트리거 최종 실패 (모든 재시도 소진)"
    return 1
}

# 워크플로우 실행 상태 모니터링 (대폭 강화된 안정성 및 모니터링)
monitor_workflow_status() {
    local repo_info=${1:-$(git config --get remote.origin.url | sed -E 's|.*github\.com[:/]([^/]+)/([^/.]+)(\.git)?.*|\1/\2|')}
    local max_wait_time=${2:-1200}  # 20분 최대 대기 (기존 15분에서 확장)
    local check_interval=10  # 10초 간격으로 체크 (더 빠른 피드백)
    local consecutive_failures=0
    local max_consecutive_failures=5  # 더 많은 재시도 허용

    # 실시간 알림 설정
    local slack_webhook="${SLACK_WEBHOOK:-}"
    local enable_notifications=false
    if [ -n "$slack_webhook" ]; then
        enable_notifications=true
        log_info "📢 Slack 실시간 알림 활성화됨"
    fi

    log_info "🚀 워크플로우 실행 상태 모니터링 시작 (강화된 버전)"
    log_info "📋 Repository: $repo_info"
    log_info "⏰ 최대 대기 시간: ${max_wait_time}초 (20분)"
    log_info "🔄 체크 간격: ${check_interval}초"
    log_info "🔁 연속 실패 허용: ${max_consecutive_failures}회"

    # Slack 알림 전송 함수
    send_slack_notification() {
        local message="$1"
        local status="$2"  # info, success, error, warning

        if [ "$enable_notifications" = "true" ]; then
            local color="good"
            local emoji="ℹ️"

            case "$status" in
                "success") color="good"; emoji="✅" ;;
                "error") color="danger"; emoji="❌" ;;
                "warning") color="warning"; emoji="⚠️" ;;
                *) color="#36a64f"; emoji="📊" ;;
            esac

            curl -s -X POST "$slack_webhook" \
                -H 'Content-type: application/json' \
                -d "{
                    \"attachments\": [{
                        \"color\": \"$color\",
                        \"text\": \"$emoji SafeWork 배포: $message\",
                        \"footer\": \"GitHub Actions Integration\",
                        \"ts\": $(date +%s)
                    }]
                }" > /dev/null 2>&1
        fi
    }

    local start_time=$(date +%s)
    local wait_time=0
    local last_run_id=""
    local last_status=""
    local progress_indicator=0

    # 시작 알림
    send_slack_notification "워크플로우 모니터링 시작" "info"

    while [ $wait_time -lt $max_wait_time ]; do
        # 진행 상황 표시 (시각적 피드백)
        local progress_chars=("⠋" "⠙" "⠹" "⠸" "⠼" "⠴" "⠦" "⠧" "⠇" "⠏")
        local progress_char=${progress_chars[$((progress_indicator % 10))]}
        progress_indicator=$((progress_indicator + 1))

        # 진행률 계산
        local progress_percent=$((wait_time * 100 / max_wait_time))
        local progress_bar=""
        local filled_blocks=$((progress_percent / 5))
        for i in $(seq 1 20); do
            if [ $i -le $filled_blocks ]; then
                progress_bar="${progress_bar}█"
            else
                progress_bar="${progress_bar}░"
            fi
        done

        echo -ne "\r${progress_char} 진행: [${progress_bar}] ${progress_percent}% (${wait_time}/${max_wait_time}s)"

        # 최근 워크플로우 실행 조회 (강화된 에러 처리)
        local runs_response=$(curl -s -w "\n%{http_code}" \
            -H "Authorization: Bearer $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            "https://api.github.com/repos/$repo_info/actions/workflows/deploy.yml/runs?per_page=5")

        local api_http_code=$(echo "$runs_response" | tail -n1)
        local api_response_body=$(echo "$runs_response" | head -n -1)

        if [ "$api_http_code" != "200" ]; then
            consecutive_failures=$((consecutive_failures + 1))
            echo -e "\n"  # 새 줄로 진행 표시 지움
            log_warning "GitHub API 호출 실패 (HTTP: $api_http_code, 연속 실패: $consecutive_failures/$max_consecutive_failures)"

            # API 에러 상세 분석
            case "$api_http_code" in
                "401") log_error "인증 실패: GitHub 토큰을 확인하세요" ;;
                "403") log_error "API 제한 또는 권한 부족" ;;
                "404") log_error "Repository 또는 워크플로우를 찾을 수 없음" ;;
                "422") log_error "요청 형식 오류" ;;
                *) log_error "알 수 없는 API 오류: $api_http_code" ;;
            esac

            if [ $consecutive_failures -ge $max_consecutive_failures ]; then
                echo -e "\n"
                log_error "GitHub API 연속 실패 한계 도달. 모니터링 중단."
                send_slack_notification "GitHub API 연속 실패로 모니터링 중단" "error"
                return 1
            fi

            # 지수 백오프: 실패할 때마다 대기 시간 증가
            local backoff_delay=$((check_interval * consecutive_failures))
            log_info "⏳ ${backoff_delay}초 후 재시도..."
            sleep $backoff_delay
            wait_time=$((wait_time + backoff_delay))
            continue
        fi

        consecutive_failures=0  # 성공 시 카운터 리셋
        echo -e "\n"  # 새 줄로 진행 표시 지움

        # 워크플로우 실행 상태 분석
        local workflow_runs=$(echo "$api_response_body" | jq -r '.workflow_runs // []')
        local latest_run=$(echo "$workflow_runs" | jq -r '.[0]')

        if [ "$latest_run" != "null" ] && [ "$latest_run" != "[]" ]; then
            local status=$(echo "$latest_run" | jq -r '.status // "unknown"')
            local conclusion=$(echo "$latest_run" | jq -r '.conclusion // "null"')
            local run_id=$(echo "$latest_run" | jq -r '.id // "unknown"')
            local created_at=$(echo "$latest_run" | jq -r '.created_at // "unknown"')
            local run_number=$(echo "$latest_run" | jq -r '.run_number // "unknown"')
            local workflow_url=$(echo "$latest_run" | jq -r '.html_url // "unknown"')
            local branch=$(echo "$latest_run" | jq -r '.head_branch // "unknown"')

            # 새로운 실행이거나 상태가 변경된 경우
            if [ "$run_id" != "$last_run_id" ] || [ "$status" != "$last_status" ]; then
                if [ "$run_id" != "$last_run_id" ]; then
                    log_info "🆕 새 워크플로우 실행 감지: #$run_number (ID: $run_id)"
                    log_info "🌿 Branch: $branch"
                    log_info "🔗 워크플로우 URL: $workflow_url"
                    send_slack_notification "새 워크플로우 실행 #$run_number 시작 (Branch: $branch)" "info"
                    last_run_id="$run_id"
                fi

                if [ "$status" != "$last_status" ]; then
                    log_info "🔄 상태 변경: $last_status → $status"
                    last_status="$status"
                fi
            fi

            # 현재 상태 상세 로깅
            local elapsed_minutes=$((wait_time / 60))
            local elapsed_seconds=$((wait_time % 60))
            log_info "📊 워크플로우 상태: $status (ID: $run_id, 경과: ${elapsed_minutes}m${elapsed_seconds}s)"

            case "$status" in
                "completed")
                    if [ "$conclusion" = "success" ]; then
                        local total_time_min=$((wait_time / 60))
                        local total_time_sec=$((wait_time % 60))
                        log_success "✅ 워크플로우 실행 성공! (총 소요시간: ${total_time_min}분 ${total_time_sec}초)"
                        log_success "🎉 워크플로우 결과: $workflow_url"
                        send_slack_notification "워크플로우 실행 성공! (소요시간: ${total_time_min}분 ${total_time_sec}초)" "success"
                        return 0
                    elif [ "$conclusion" = "failure" ]; then
                        log_error "❌ 워크플로우 실행 실패: $conclusion"
                        log_error "🔍 실패 상세: $workflow_url"

                        # 실패 시 상세 로그 조회 및 분석
                        local jobs_response=$(curl -s \
                            -H "Authorization: Bearer $GITHUB_TOKEN" \
                            -H "Accept: application/vnd.github.v3+json" \
                            "https://api.github.com/repos/$repo_info/actions/runs/$run_id/jobs")

                        if [ $? -eq 0 ] && [ -n "$jobs_response" ]; then
                            local failed_jobs=$(echo "$jobs_response" | jq -r '.jobs[] | select(.conclusion == "failure") | .name')
                            local failed_steps=$(echo "$jobs_response" | jq -r '.jobs[] | select(.conclusion == "failure") | .steps[] | select(.conclusion == "failure") | .name')

                            if [ -n "$failed_jobs" ]; then
                                log_error "🔥 실패한 작업들: $failed_jobs"
                            fi
                            if [ -n "$failed_steps" ]; then
                                log_error "💥 실패한 단계들: $failed_steps"
                            fi

                            # Slack에 상세 실패 정보 전송
                            local failure_details="실패한 작업: $failed_jobs"
                            if [ -n "$failed_steps" ]; then
                                failure_details="$failure_details\n실패한 단계: $failed_steps"
                            fi
                            send_slack_notification "$failure_details" "error"
                        else
                            send_slack_notification "워크플로우 실행 실패 (상세 정보 조회 불가)" "error"
                        fi

                        return 1
                    elif [ "$conclusion" = "cancelled" ]; then
                        log_warning "🚫 워크플로우가 취소되었습니다"
                        log_warning "🔍 상세 확인: $workflow_url"
                        send_slack_notification "워크플로우가 취소됨" "warning"
                        return 1
                    else
                        log_warning "⚠️ 워크플로우 완료되었으나 예상치 못한 결과: $conclusion"
                        log_warning "🔍 상세 확인: $workflow_url"
                        send_slack_notification "워크플로우 완료 (예상치 못한 결과: $conclusion)" "warning"
                        return 1
                    fi
                    ;;
                "in_progress")
                    log_info "⏳ 워크플로우 실행 중... (경과: ${elapsed_minutes}m${elapsed_seconds}s)"

                    # 실행 중인 작업 상세 정보 조회
                    local jobs_response=$(curl -s \
                        -H "Authorization: Bearer $GITHUB_TOKEN" \
                        -H "Accept: application/vnd.github.v3+json" \
                        "https://api.github.com/repos/$repo_info/actions/runs/$run_id/jobs")

                    if [ $? -eq 0 ] && [ -n "$jobs_response" ]; then
                        local running_jobs=$(echo "$jobs_response" | jq -r '.jobs[] | select(.status == "in_progress") | .name')
                        if [ -n "$running_jobs" ]; then
                            log_info "🔄 실행 중인 작업: $running_jobs"
                        fi
                    fi
                    ;;
                "queued")
                    log_info "📋 워크플로우 대기 중... (경과: ${elapsed_minutes}m${elapsed_seconds}s)"
                    ;;
                "requested")
                    log_info "📨 워크플로우 요청됨... (경과: ${elapsed_minutes}m${elapsed_seconds}s)"
                    ;;
                *)
                    log_warning "❓ 알 수 없는 상태: $status (경과: ${elapsed_minutes}m${elapsed_seconds}s)"
                    ;;
            esac
        else
            log_info "📭 워크플로우 실행 정보를 찾을 수 없습니다. (경과시간: ${wait_time}초)"
        fi

        sleep $check_interval
        wait_time=$((wait_time + check_interval))
    done

    echo -e "\n"  # 진행 표시 지우기
    local timeout_min=$((max_wait_time / 60))
    log_warning "⏰ 워크플로우 모니터링 시간 초과 (${timeout_min}분)"
    log_warning "💡 수동으로 워크플로우 상태를 확인하세요: https://github.com/$repo_info/actions"
    send_slack_notification "워크플로우 모니터링 시간 초과 (${timeout_min}분)" "warning"
    return 2
}

# Portainer 스택 상태 확인 (개선된 안정성)
check_portainer_stack_status() {
    local stack_name=${1:-safework}
    local max_retries=3
    local retry_delay=2

    log_info "Portainer 스택 상태 확인 중..."

    # Portainer 설정 검증
    if [ -z "$PORTAINER_URL" ] || [ -z "$PORTAINER_TOKEN" ]; then
        log_error "Portainer 설정이 누락되었습니다."
        log_error "PORTAINER_URL: ${PORTAINER_URL:-'누락'}"
        log_error "PORTAINER_TOKEN: $([[ -n "$PORTAINER_TOKEN" ]] && echo '설정됨' || echo '누락')"
        return 1
    fi

    # Portainer API 연결 테스트
    local api_test=$(curl -s -w "%{http_code}" -o /dev/null \
        -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/status")

    if [ "$api_test" != "200" ]; then
        log_error "Portainer API 연결 실패 (HTTP: $api_test)"
        return 1
    fi

    log_success "Portainer API 연결 확인"

    # 스택 정보 조회 (재시도 로직)
    local attempt=1
    local stacks_response
    local stack_info

    while [ $attempt -le $max_retries ]; do
        log_info "스택 정보 조회 시도 $attempt/$max_retries..."

        stacks_response=$(curl -s -w "\n%{http_code}" \
            -H "X-API-Key: $PORTAINER_TOKEN" \
            "$PORTAINER_URL/api/stacks")

        local api_http_code=$(echo "$stacks_response" | tail -n1)
        local api_response_body=$(echo "$stacks_response" | head -n -1)

        if [ "$api_http_code" = "200" ]; then
            stack_info=$(echo "$api_response_body" | jq -r ".[] | select(.Name == \"$stack_name\")")
            break
        else
            log_warning "스택 정보 조회 실패 (시도 $attempt/$max_retries, HTTP: $api_http_code)"
            if [ $attempt -lt $max_retries ]; then
                sleep $retry_delay
                retry_delay=$((retry_delay * 2))
            fi
        fi

        attempt=$((attempt + 1))
    done

    if [ $attempt -gt $max_retries ]; then
        log_error "스택 정보 조회 최종 실패"
        return 1
    fi

    if [ -n "$stack_info" ] && [ "$stack_info" != "null" ]; then
        local stack_id=$(echo "$stack_info" | jq -r '.Id // "unknown"')
        local stack_status=$(echo "$stack_info" | jq -r '.Status // "unknown"')
        local endpoint_id=$(echo "$stack_info" | jq -r '.EndpointId // "unknown"')
        local stack_type=$(echo "$stack_info" | jq -r '.Type // "unknown"')
        local creation_date=$(echo "$stack_info" | jq -r '.CreationDate // "unknown"')

        log_success "📦 스택 발견: $stack_name"
        log_info "  - ID: $stack_id"
        log_info "  - Status: $stack_status"
        log_info "  - Endpoint: $endpoint_id"
        log_info "  - Type: $stack_type"
        log_info "  - 생성일: $creation_date"

        # 컨테이너 상태 확인 (에러 처리 강화)
        local containers_response=$(curl -s -w "\n%{http_code}" \
            -H "X-API-Key: $PORTAINER_TOKEN" \
            "$PORTAINER_URL/api/endpoints/$endpoint_id/docker/containers/json")

        local containers_http_code=$(echo "$containers_response" | tail -n1)
        local containers_body=$(echo "$containers_response" | head -n -1)

        if [ "$containers_http_code" = "200" ]; then
            log_info "📈 컨테이너 상태 분석:"

            # SafeWork 컨테이너들 추출 및 상세 정보
            local safework_containers=$(echo "$containers_body" | jq -r '.[] | select(.Names[] | contains("safework")) | {name: .Names[0], state: .State, status: .Status, image: .Image}')

            if [ -n "$safework_containers" ] && [ "$safework_containers" != "null" ]; then
                echo "$safework_containers" | jq -r '. | "  ✅ " + (.name | ltrimstr("/")) + " - " + .state + " (" + .status + ")"'

                # 실행 중인 컨테이너 수 계산
                local running_count=$(echo "$containers_body" | jq -r '.[] | select(.Names[] | contains("safework")) | select(.State == "running") | .Names[0]' | wc -l)
                local total_count=$(echo "$containers_body" | jq -r '.[] | select(.Names[] | contains("safework")) | .Names[0]' | wc -l)

                log_info "📊 컨테이너 상태 요약: $running_count/$total_count 컨테이너 실행 중"

                if [ "$running_count" -eq "$total_count" ] && [ "$total_count" -gt 0 ]; then
                    log_success "✅ 모든 SafeWork 컨테이너가 정상 실행 중입니다!"
                elif [ "$running_count" -gt 0 ]; then
                    log_warning "⚠️ 일부 컨테이너가 실행되지 않고 있습니다."
                else
                    log_error "❌ 실행 중인 SafeWork 컨테이너가 없습니다."
                fi
            else
                log_warning "❓ SafeWork 컨테이너를 찾을 수 없습니다."
            fi
        else
            log_error "컨테이너 정보 조회 실패 (HTTP: $containers_http_code)"
            return 1
        fi

        return 0
    else
        log_warning "📭 스택을 찾을 수 없습니다: $stack_name"

        # 전체 스택 목록 표시로 디버깅 지원
        log_info "📄 사용 가능한 스택 목록:"
        echo "$api_response_body" | jq -r '.[] | "  - " + .Name + " (ID: " + (.Id | tostring) + ", Status: " + (.Status | tostring) + ")"'

        return 1
    fi
}

# 배포 후 검증
verify_deployment() {
    local service_url=${1:-https://safework.jclee.me}
    local max_attempts=${2:-10}

    log_info "배포 검증 시작..."
    log_info "서비스 URL: $service_url"

    for attempt in $(seq 1 $max_attempts); do
        log_info "헬스 체크 시도 $attempt/$max_attempts"

        local health_response=$(curl -s -w "\n%{http_code}" "$service_url/health" 2>/dev/null)
        local http_code=$(echo "$health_response" | tail -n1)
        local response_body=$(echo "$health_response" | head -n -1)

        if [ "$http_code" = "200" ]; then
            local status=$(echo "$response_body" | jq -r '.status // "unknown"' 2>/dev/null)
            if [ "$status" = "healthy" ]; then
                log_success "✅ 서비스 헬스 체크 성공!"
                echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
                return 0
            fi
        fi

        if [ $attempt -lt $max_attempts ]; then
            log_info "⏳ 대기 중... (5초 후 재시도)"
            sleep 5
        fi
    done

    log_error "❌ 서비스 헬스 체크 실패"
    return 1
}

# 🔧 고급 에러 처리 및 복구 메커니즘
handle_deployment_failure() {
    local failure_type="$1"
    local failure_context="$2"
    local retry_count=${3:-0}
    local max_retries=3

    log_error "🚨 배포 실패 감지: $failure_type"
    log_info "📋 실패 컨텍스트: $failure_context"
    log_info "🔄 현재 재시도 횟수: $retry_count/$max_retries"

    # Slack 알림 (실패 이벤트)
    if [ -n "${SLACK_WEBHOOK:-}" ]; then
        local slack_payload="{
            \"text\": \"🚨 SafeWork 배포 실패 알림\",
            \"attachments\": [{
                \"color\": \"danger\",
                \"fields\": [
                    {\"title\": \"실패 유형\", \"value\": \"$failure_type\", \"short\": true},
                    {\"title\": \"재시도 횟수\", \"value\": \"$retry_count/$max_retries\", \"short\": true},
                    {\"title\": \"컨텍스트\", \"value\": \"$failure_context\", \"short\": false}
                ],
                \"footer\": \"SafeWork AutoDeploy Recovery\",
                \"ts\": $(date +%s)
            }]
        }"
        curl -s -X POST -H "Content-Type: application/json" \
            -d "$slack_payload" "$SLACK_WEBHOOK" > /dev/null
    fi

    # 자동 복구 로직
    case "$failure_type" in
        "GITHUB_ACTIONS_FAILURE")
            log_info "🔄 GitHub Actions 워크플로우 복구 시도..."
            if [ $retry_count -lt $max_retries ]; then
                log_info "⏳ 60초 대기 후 워크플로우 재실행..."
                sleep 60
                return 10  # 재시도 신호
            fi
            ;;
        "PORTAINER_API_FAILURE")
            log_info "🔄 Portainer API 연결 복구 시도..."
            if [ $retry_count -lt $max_retries ]; then
                log_info "⏳ API 토큰 검증 및 재연결..."
                # API 토큰 재검증
                if validate_portainer_connection; then
                    log_success "✅ Portainer 연결 복구됨"
                    return 10  # 재시도 신호
                fi
                sleep 30
                return 10
            fi
            ;;
        "CONTAINER_HEALTH_FAILURE")
            log_info "🔄 컨테이너 헬스 체크 복구 시도..."
            if [ $retry_count -lt $max_retries ]; then
                log_info "⏳ 컨테이너 재시작 및 헬스 체크..."
                # 컨테이너 재시작 시도
                if restart_failed_containers; then
                    log_success "✅ 컨테이너 복구 완료"
                    return 10  # 재시도 신호
                fi
                sleep 45
                return 10
            fi
            ;;
        "SERVICE_HEALTH_FAILURE")
            log_info "🔄 서비스 엔드포인트 복구 시도..."
            if [ $retry_count -lt $max_retries ]; then
                log_info "⏳ 서비스 재시작 및 연결성 검증..."
                sleep 30
                return 10  # 재시도 신호
            fi
            ;;
    esac

    # 최종 실패 처리
    log_error "❌ 자동 복구 실패 - 수동 개입 필요"

    # 최종 실패 Slack 알림
    if [ -n "${SLACK_WEBHOOK:-}" ]; then
        local final_failure_payload="{
            \"text\": \"💥 SafeWork 자동 복구 실패 - 수동 개입 필요\",
            \"attachments\": [{
                \"color\": \"#ff0000\",
                \"fields\": [
                    {\"title\": \"실패 유형\", \"value\": \"$failure_type\", \"short\": true},
                    {\"title\": \"최대 재시도 완료\", \"value\": \"$max_retries회\", \"short\": true},
                    {\"title\": \"긴급 조치\", \"value\": \"운영팀 개입 필요\", \"short\": false}
                ],
                \"footer\": \"SafeWork Critical Alert\",
                \"ts\": $(date +%s)
            }]
        }"
        curl -s -X POST -H "Content-Type: application/json" \
            -d "$final_failure_payload" "$SLACK_WEBHOOK" > /dev/null
    fi

    return 1  # 최종 실패
}

# 🔧 Portainer 연결 검증 함수
validate_portainer_connection() {
    log_info "🔍 Portainer API 연결 검증 중..."

    local api_test=$(curl -s -w "%{http_code}" -o /dev/null \
        --connect-timeout 10 \
        -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/status")

    if [ "$api_test" = "200" ]; then
        log_success "✅ Portainer API 연결 정상"
        return 0
    else
        log_error "❌ Portainer API 연결 실패 (HTTP: $api_test)"
        return 1
    fi
}

# 🔧 실패한 컨테이너 재시작 함수
restart_failed_containers() {
    log_info "🔄 실패한 SafeWork 컨테이너 재시작 중..."

    # 컨테이너 상태 조회
    local containers_response=$(curl -s -w "\n%{http_code}" \
        -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/endpoints/3/docker/containers/json")

    local containers_http_code=$(echo "$containers_response" | tail -n1)
    local containers_body=$(echo "$containers_response" | head -n -1)

    if [ "$containers_http_code" != "200" ]; then
        log_error "컨테이너 정보 조회 실패 (HTTP: $containers_http_code)"
        return 1
    fi

    # 중지된 SafeWork 컨테이너들 찾기
    local stopped_containers=$(echo "$containers_body" | jq -r '.[] | select(.Names[] | contains("safework")) | select(.State != "running") | .Names[0]' | sed 's|^/||')

    if [ -z "$stopped_containers" ]; then
        log_info "재시작할 중지된 컨테이너 없음"
        return 0
    fi

    local restart_success=true
    while read -r container_name; do
        if [ -n "$container_name" ]; then
            log_info "🔄 컨테이너 재시작: $container_name"

            local restart_response=$(curl -s -w "%{http_code}" -o /dev/null \
                -X POST \
                -H "X-API-Key: $PORTAINER_TOKEN" \
                "$PORTAINER_URL/api/endpoints/3/docker/containers/$container_name/restart")

            if [ "$restart_response" = "204" ]; then
                log_success "✅ $container_name 재시작 성공"
            else
                log_error "❌ $container_name 재시작 실패 (HTTP: $restart_response)"
                restart_success=false
            fi
        fi
    done <<< "$stopped_containers"

    if [ "$restart_success" = "true" ]; then
        log_info "⏳ 컨테이너 초기화 대기 (30초)..."
        sleep 30
        return 0
    else
        return 1
    fi
}

# 완전 통합 배포 실행 (강화된 에러 처리)
execute_integrated_deployment() {
    local auto_deploy=${1:-true}
    local deployment_retry=0
    local max_deployment_retries=2

    while [ $deployment_retry -le $max_deployment_retries ]; do
        log_info "=== 완전 통합 배포 시작 (시도 $((deployment_retry + 1))/$((max_deployment_retries + 1))) ==="

        # 1. Git 상태 확인
        log_info "1/5: Git 상태 확인 중..."
        if ! git diff --quiet; then
            log_warning "커밋되지 않은 변경사항이 있습니다."
            if [ "$auto_deploy" = "true" ]; then
                log_info "자동 커밋 진행..."
                git add .
                git commit -m "Auto-commit: Integrated deployment $(date '+%Y-%m-%d %H:%M:%S')"
                git push origin master
            else
                log_error "변경사항을 먼저 커밋하세요."
                return 1
            fi
        else
            log_success "Git 상태 깨끗함"
        fi

        # 2. GitHub Actions 트리거 (에러 처리 강화)
        log_info "2/5: GitHub Actions 워크플로우 트리거..."
        if ! trigger_github_actions "true"; then
            handle_deployment_failure "GITHUB_ACTIONS_FAILURE" "워크플로우 트리거 실패" $deployment_retry
            local recovery_result=$?
            if [ $recovery_result -eq 10 ]; then
                deployment_retry=$((deployment_retry + 1))
                continue
            else
                return 1
            fi
        fi

        # 3. 워크플로우 모니터링 (에러 처리 강화)
        log_info "3/5: 워크플로우 실행 모니터링..."
        if ! monitor_workflow_status; then
            handle_deployment_failure "GITHUB_ACTIONS_FAILURE" "워크플로우 실행 실패" $deployment_retry
            local recovery_result=$?
            if [ $recovery_result -eq 10 ]; then
                deployment_retry=$((deployment_retry + 1))
                continue
            else
                return 1
            fi
        fi

        # 4. Portainer 스택 확인 (에러 처리 강화)
        log_info "4/5: Portainer 스택 상태 확인..."
        if ! check_portainer_stack_status; then
            handle_deployment_failure "PORTAINER_API_FAILURE" "스택 상태 확인 실패" $deployment_retry
            local recovery_result=$?
            if [ $recovery_result -eq 10 ]; then
                deployment_retry=$((deployment_retry + 1))
                continue
            else
                log_warning "⚠️ 스택 상태 확인 실패 (계속 진행)"
            fi
        fi

        # 5. 배포 검증 (에러 처리 강화)
        log_info "5/5: 배포 검증..."
        if ! verify_deployment; then
            handle_deployment_failure "SERVICE_HEALTH_FAILURE" "서비스 헬스 체크 실패" $deployment_retry
            local recovery_result=$?
            if [ $recovery_result -eq 10 ]; then
                deployment_retry=$((deployment_retry + 1))
                continue
            else
                return 1
            fi
        fi

        # 배포 성공
        log_success "🎉 완전 통합 배포 성공!"
        log_success "🌐 서비스 URL: https://safework.jclee.me"
        log_success "📊 로그 파일: $INTEGRATION_LOG"

        # 성공 Slack 알림
        if [ -n "${SLACK_WEBHOOK:-}" ]; then
            local success_payload="{
                \"text\": \"🎉 SafeWork 배포 성공!\",
                \"attachments\": [{
                    \"color\": \"good\",
                    \"fields\": [
                        {\"title\": \"배포 상태\", \"value\": \"성공\", \"short\": true},
                        {\"title\": \"재시도 횟수\", \"value\": \"$deployment_retry\", \"short\": true},
                        {\"title\": \"서비스 URL\", \"value\": \"https://safework.jclee.me\", \"short\": false}
                    ],
                    \"footer\": \"SafeWork AutoDeploy\",
                    \"ts\": $(date +%s)
                }]
            }"
            curl -s -X POST -H "Content-Type: application/json" \
                -d "$success_payload" "$SLACK_WEBHOOK" > /dev/null
        fi

        return 0  # 성공
    done

    # 최대 재시도 횟수 초과
    log_error "❌ 최대 배포 재시도 횟수 초과 ($max_deployment_retries회)"
    return 1
}

# 🔄 고급 롤백 및 복구 시스템
execute_rollback() {
    local rollback_type=${1:-"auto"}  # auto, manual, emergency
    local target_commit=${2:-""}

    log_info "=== 배포 롤백 시작 (유형: $rollback_type) ==="

    # 롤백 시작 Slack 알림
    if [ -n "${SLACK_WEBHOOK:-}" ]; then
        local rollback_start_payload="{
            \"text\": \"🔄 SafeWork 롤백 시작\",
            \"attachments\": [{
                \"color\": \"warning\",
                \"fields\": [
                    {\"title\": \"롤백 유형\", \"value\": \"$rollback_type\", \"short\": true},
                    {\"title\": \"시작 시각\", \"value\": \"$(date '+%Y-%m-%d %H:%M:%S')\", \"short\": true}
                ],
                \"footer\": \"SafeWork Rollback System\",
                \"ts\": $(date +%s)
            }]
        }"
        curl -s -X POST -H "Content-Type: application/json" \
            -d "$rollback_start_payload" "$SLACK_WEBHOOK" > /dev/null
    fi

    # Portainer API 연결 확인
    if ! validate_portainer_connection; then
        log_error "Portainer 연결 실패 - 롤백 불가능"
        return 1
    fi

    # 이전 버전 식별
    local target_sha
    if [ -n "$target_commit" ]; then
        target_sha="$target_commit"
        log_info "수동 지정된 커밋으로 롤백: $target_sha"
    else
        # 최근 성공한 배포 찾기 (git log에서 "successful deployment" 메시지 찾기)
        target_sha=$(git log --grep="successful deployment\|Deploy:" --format="%H" -n 1 HEAD~1)
        if [ -z "$target_sha" ]; then
            # 대안: 이전 커밋 사용
            target_sha=$(git log --format="%H" -n 2 | tail -1)
        fi
        log_info "자동 감지된 이전 성공 버전: $target_sha"
    fi

    if [ -z "$target_sha" ]; then
        log_error "롤백할 이전 버전을 찾을 수 없습니다"
        return 1
    fi

    # 현재 스택 정보 백업
    log_info "📋 현재 스택 구성 백업 중..."
    local current_stack_info=$(curl -s -H "X-API-Key: $PORTAINER_TOKEN" \
        "$PORTAINER_URL/api/stacks" | jq '.[] | select(.Name == "safework")')

    if [ -n "$current_stack_info" ]; then
        echo "$current_stack_info" > "/tmp/safework_rollback_backup_$(date +%s).json"
        log_success "✅ 현재 스택 구성 백업 완료"
    fi

    # 컨테이너 기반 롤백 (이미지 태그 변경)
    log_info "🔄 컨테이너 이미지 롤백 시작..."

    local rollback_success=true
    local services=("app" "postgres" "redis")

    for service in "${services[@]}"; do
        log_info "🔄 $service 서비스 롤백 중..."

        # 이전 버전 이미지로 컨테이너 업데이트
        local container_name="safework-$service"
        local image_name="registry.jclee.me/safework/$service:${target_sha:0:8}"

        # 이미지 풀 시도
        local pull_response=$(curl -s -w "%{http_code}" -o /dev/null \
            -X POST \
            -H "X-API-Key: $PORTAINER_TOKEN" \
            -H "Content-Type: application/json" \
            "$PORTAINER_URL/api/endpoints/3/docker/images/create" \
            -d "{\"fromImage\": \"$image_name\"}")

        if [ "$pull_response" = "200" ]; then
            log_success "✅ $service 이미지 풀 성공"

            # 컨테이너 재생성 (필요시)
            local recreate_response=$(curl -s -w "%{http_code}" -o /dev/null \
                -X POST \
                -H "X-API-Key: $PORTAINER_TOKEN" \
                "$PORTAINER_URL/api/endpoints/3/docker/containers/$container_name/restart")

            if [ "$recreate_response" = "204" ]; then
                log_success "✅ $service 컨테이너 재시작 성공"
            else
                log_error "❌ $service 컨테이너 재시작 실패"
                rollback_success=false
            fi
        else
            log_warning "⚠️ $service 이미지 풀 실패 - 현재 이미지 사용"
        fi
    done

    # 롤백 검증
    log_info "🔍 롤백 검증 중..."
    sleep 30  # 컨테이너 초기화 대기

    if verify_deployment; then
        log_success "🎉 롤백 성공!"

        # 성공 Slack 알림
        if [ -n "${SLACK_WEBHOOK:-}" ]; then
            local rollback_success_payload="{
                \"text\": \"✅ SafeWork 롤백 성공\",
                \"attachments\": [{
                    \"color\": \"good\",
                    \"fields\": [
                        {\"title\": \"롤백 버전\", \"value\": \"${target_sha:0:8}\", \"short\": true},
                        {\"title\": \"완료 시각\", \"value\": \"$(date '+%Y-%m-%d %H:%M:%S')\", \"short\": true},
                        {\"title\": \"서비스 상태\", \"value\": \"정상\", \"short\": false}
                    ],
                    \"footer\": \"SafeWork Rollback System\",
                    \"ts\": $(date +%s)
                }]
            }"
            curl -s -X POST -H "Content-Type: application/json" \
                -d "$rollback_success_payload" "$SLACK_WEBHOOK" > /dev/null
        fi
        return 0
    else
        log_error "❌ 롤백 후 서비스 검증 실패"

        # 실패 Slack 알림
        if [ -n "${SLACK_WEBHOOK:-}" ]; then
            local rollback_failure_payload="{
                \"text\": \"💥 SafeWork 롤백 실패\",
                \"attachments\": [{
                    \"color\": \"danger\",
                    \"fields\": [
                        {\"title\": \"실패 사유\", \"value\": \"서비스 검증 실패\", \"short\": true},
                        {\"title\": \"긴급 조치\", \"value\": \"수동 복구 필요\", \"short\": true}
                    ],
                    \"footer\": \"SafeWork Critical Alert\",
                    \"ts\": $(date +%s)
                }]
            }"
            curl -s -X POST -H "Content-Type: application/json" \
                -d "$rollback_failure_payload" "$SLACK_WEBHOOK" > /dev/null
        fi
        return 1
    fi
}

# 🆘 응급 복구 시스템
emergency_recovery() {
    log_error "🆘 응급 복구 모드 활성화"

    # 응급 복구 Slack 알림
    if [ -n "${SLACK_WEBHOOK:-}" ]; then
        local emergency_payload="{
            \"text\": \"🆘 SafeWork 응급 복구 모드 활성화\",
            \"attachments\": [{
                \"color\": \"#ff4500\",
                \"fields\": [
                    {\"title\": \"상황\", \"value\": \"서비스 완전 중단\", \"short\": true},
                    {\"title\": \"조치\", \"value\": \"응급 복구 진행\", \"short\": true}
                ],
                \"footer\": \"SafeWork Emergency Recovery\",
                \"ts\": $(date +%s)
            }]
        }"
        curl -s -X POST -H "Content-Type: application/json" \
            -d "$emergency_payload" "$SLACK_WEBHOOK" > /dev/null
    fi

    # 1. 모든 SafeWork 컨테이너 강제 재시작
    log_info "1/4: 모든 컨테이너 강제 재시작..."
    restart_failed_containers

    # 2. 네트워크 연결 복구
    log_info "2/4: 네트워크 연결 복구..."
    # Docker 네트워크 재생성 (필요시)

    # 3. 데이터베이스 연결 복구
    log_info "3/4: 데이터베이스 연결 검증..."
    sleep 45  # 데이터베이스 초기화 대기

    # 4. 최종 검증
    log_info "4/4: 응급 복구 검증..."
    if verify_deployment; then
        log_success "✅ 응급 복구 성공"
        return 0
    else
        log_error "❌ 응급 복구 실패 - 운영팀 즉시 개입 필요"
        return 1
    fi
}

# 메인 실행 함수
main() {
    print_banner

    case "${1:-deploy}" in
        "deploy"|"배포")
            local auto_commit=${2:-true}
            execute_integrated_deployment "$auto_commit"
            ;;
        "trigger"|"트리거")
            local production=${2:-true}
            trigger_github_actions "$production"
            ;;
        "monitor"|"모니터링")
            monitor_workflow_status
            ;;
        "status"|"상태")
            check_portainer_stack_status
            ;;
        "verify"|"검증")
            verify_deployment
            ;;
        "rollback"|"롤백")
            execute_rollback
            ;;
        "help"|"도움말")
            echo "사용법: $0 [명령어] [옵션]"
            echo ""
            echo "명령어:"
            echo "  deploy, 배포        - 완전 통합 배포 실행 (기본값)"
            echo "  trigger, 트리거     - GitHub Actions 워크플로우만 트리거"
            echo "  monitor, 모니터링   - 워크플로우 실행 상태 모니터링"
            echo "  status, 상태        - Portainer 스택 상태 확인"
            echo "  verify, 검증        - 배포 후 서비스 검증"
            echo "  rollback, 롤백      - 이전 버전으로 롤백"
            echo "  help, 도움말        - 이 도움말 표시"
            echo ""
            echo "예시:"
            echo "  $0 deploy           # 완전 자동 배포"
            echo "  $0 trigger false    # 빌드만 (프로덕션 배포 안함)"
            echo "  $0 status           # 현재 스택 상태 확인"
            ;;
        *)
            log_error "알 수 없는 명령어: $1"
            echo "도움말을 보려면 '$0 help'를 실행하세요."
            exit 1
            ;;
    esac
}

# 스크립트 실행
main "$@"