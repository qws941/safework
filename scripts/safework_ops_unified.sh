#!/bin/bash

# SafeWork 운영 관리 통합 스크립트 (Unified Operations Script)
# 작성: Claude Code Assistant
# 목적: 배포, 로그 조회, 모니터링을 하나의 스크립트로 통합

set -e

# =============================================================================
# 전역 설정
# =============================================================================

# 색상 코드
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# API 설정
readonly PORTAINER_URL="https://portainer.jclee.me"
readonly PORTAINER_API_TOKEN="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
readonly ENDPOINT_ID="3"
readonly REGISTRY_HOST="registry.jclee.me"
readonly PROJECT_NAME="safework"

# 환경 설정
readonly NETWORK_NAME="safework_network"
readonly DB_PASSWORD="safework2024"
readonly PRODUCTION_URL="https://safework.jclee.me"

# =============================================================================
# 유틸리티 함수
# =============================================================================

log_header() {
    echo -e "${CYAN}=================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}=================================${NC}"
}

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

log_debug() {
    if [[ "${DEBUG:-}" == "1" ]]; then
        echo -e "${PURPLE}[DEBUG]${NC} $1"
    fi
}

# Portainer API 호출
call_portainer_api() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="${3:-}"
    
    log_debug "API 호출: ${method} ${endpoint}"
    
    if [[ -n "$data" ]]; then
        curl -s -X "${method}" \
            -H "X-API-Key: ${PORTAINER_API_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "${PORTAINER_URL}/api${endpoint}"
    else
        curl -s -H "X-API-Key: ${PORTAINER_API_TOKEN}" \
            "${PORTAINER_URL}/api${endpoint}"
    fi
}

# 컨테이너 상태 확인
check_container_health() {
    local container_name="$1"
    local container_info

    container_info=$(call_portainer_api "/endpoints/${ENDPOINT_ID}/docker/containers/${container_name}/json" 2>/dev/null)

    if [[ -z "$container_info" ]]; then
        echo "unknown"
        return 1
    fi

    echo "$container_info" | jq -r '.State.Status // "unknown"'
}

# SafeWork 컨테이너 목록 가져오기
get_safework_containers() {
    local response
    response=$(call_portainer_api "/endpoints/${ENDPOINT_ID}/docker/containers/json" 2>/dev/null)

    if [[ -z "$response" ]]; then
        return 1
    fi

    # JSON 유효성 검사
    if ! echo "$response" | jq empty 2>/dev/null; then
        log_debug "Invalid JSON response from Portainer API"
        return 1
    fi

    echo "$response" | jq -r '.[] | select(.Names[]? | contains("safework")) | .Names[0]' 2>/dev/null | \
        sed 's|^/||' | head -20
}

# =============================================================================
# 배포 관련 함수
# =============================================================================

deploy_status() {
    log_header "SafeWork 배포 상태"
    
    local containers
    containers=$(get_safework_containers)
    
    if [[ -z "$containers" ]]; then
        log_warning "실행 중인 SafeWork 컨테이너가 없습니다."
        return 1
    fi
    
    echo -e "${GREEN}📊 컨테이너 상태:${NC}"
    while IFS= read -r container; do
        local status
        status=$(check_container_health "$container")
        local status_icon
        case "$status" in
            "running") status_icon="✅" ;;
            "exited") status_icon="❌" ;;
            "paused") status_icon="⏸️" ;;
            *) status_icon="❓" ;;
        esac
        echo "  ${status_icon} ${container}: ${status}"
    done <<< "$containers"
    
    # 프로덕션 건강 상태 확인
    echo ""
    echo -e "${GREEN}🌐 프로덕션 상태:${NC}"
    if curl -sf "${PRODUCTION_URL}/health" >/dev/null 2>&1; then
        echo "  ✅ 프로덕션 서비스: 정상"
        # 건강 상태 상세 정보
        local health_data
        health_data=$(curl -s "${PRODUCTION_URL}/health" 2>/dev/null || echo '{}')
        echo "     $(echo "$health_data" | jq -r '.timestamp // "정보 없음"')"
    else
        echo "  ❌ 프로덕션 서비스: 비정상"
    fi
}

deploy_trigger_github() {
    log_header "GitHub Actions 배포 트리거"
    
    # Git 상태 확인
    if ! git status >/dev/null 2>&1; then
        log_error "Git 저장소가 아닙니다."
        return 1
    fi
    
    local current_branch
    current_branch=$(git branch --show-current)
    log_info "현재 브랜치: ${current_branch}"
    
    # 변경사항 확인
    if git status --porcelain | grep -q .; then
        log_warning "커밋되지 않은 변경사항이 있습니다."
        git status --short
        echo ""
        read -p "계속 진행하시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "배포가 취소되었습니다."
            return 0
        fi
    fi
    
    # 배포 커밋 생성
    local deploy_message="Deploy: Trigger production deployment $(date '+%Y-%m-%d %H:%M:%S')"
    log_info "배포 커밋 생성: ${deploy_message}"
    
    git commit --allow-empty -m "$deploy_message"
    git push origin "$current_branch"
    
    log_success "GitHub Actions 배포가 트리거되었습니다."
    log_info "배포 진행 상황: https://github.com/qws941/safework/actions"
    log_info "약 5-10분 후 프로덕션에 반영됩니다."
}

deploy_local() {
    log_header "로컬 배포 실행"
    
    # 기존 integrated_build_deploy.sh 호출
    if [[ -f "scripts/integrated_build_deploy.sh" ]]; then
        log_info "기존 배포 스크립트를 실행합니다..."
        bash scripts/integrated_build_deploy.sh full
    else
        log_error "배포 스크립트를 찾을 수 없습니다."
        return 1
    fi
}

# =============================================================================
# 로그 관련 함수
# =============================================================================

logs_live() {
    local container="${1:-safework-app}"
    local lines="${2:-50}"
    
    log_header "실시간 로그 조회: ${container}"
    
    # 컨테이너 존재 확인
    if ! get_safework_containers | grep -q "^${container}$"; then
        log_error "컨테이너를 찾을 수 없습니다: ${container}"
        log_info "사용 가능한 컨테이너:"
        get_safework_containers | sed 's/^/  - /'
        return 1
    fi
    
    log_info "실시간 로그를 조회합니다 (Ctrl+C로 중단)"
    echo ""
    
    # Portainer API를 통한 실시간 로그 스트림
    while true; do
        local logs
        logs=$(call_portainer_api "/endpoints/${ENDPOINT_ID}/docker/containers/${container}/logs?stdout=true&stderr=true&tail=${lines}&timestamps=true" 2>/dev/null)
        
        if [[ -n "$logs" ]]; then
            echo "$logs" | tail -20
        fi
        
        sleep 2
        clear
        echo -e "${CYAN}실시간 로그: ${container} ($(date))${NC}"
        echo "================================="
    done
}

logs_recent() {
    local container="${1:-all}"
    local lines="${2:-20}"
    
    if [[ "$container" == "all" ]]; then
        log_header "모든 SafeWork 컨테이너 최근 로그"
        
        local containers
        containers=$(get_safework_containers)
        
        while IFS= read -r cont; do
            echo ""
            echo -e "${YELLOW}📋 ${cont} 로그 (최근 ${lines}줄):${NC}"
            echo "─────────────────────────────────"
            
            local logs
            logs=$(call_portainer_api "/endpoints/${ENDPOINT_ID}/docker/containers/${cont}/logs?stdout=true&stderr=true&tail=${lines}&timestamps=true" 2>/dev/null)
            
            if [[ -n "$logs" ]]; then
                echo "$logs" | tail -"$lines"
            else
                echo "로그를 가져올 수 없습니다."
            fi
        done <<< "$containers"
    else
        log_header "컨테이너 로그: ${container}"
        
        if ! get_safework_containers | grep -q "^${container}$"; then
            log_error "컨테이너를 찾을 수 없습니다: ${container}"
            return 1
        fi
        
        local logs
        logs=$(call_portainer_api "/endpoints/${ENDPOINT_ID}/docker/containers/${container}/logs?stdout=true&stderr=true&tail=${lines}&timestamps=true")
        
        if [[ -n "$logs" ]]; then
            echo "$logs"
        else
            log_error "로그를 가져올 수 없습니다."
        fi
    fi
}

logs_errors() {
    local container="${1:-all}"
    
    log_header "에러 로그 조회"
    
    if [[ "$container" == "all" ]]; then
        local containers
        containers=$(get_safework_containers)
        
        while IFS= read -r cont; do
            echo ""
            echo -e "${RED}🚨 ${cont} 에러 로그:${NC}"
            echo "─────────────────────────────────"
            
            local logs
            logs=$(call_portainer_api "/endpoints/${ENDPOINT_ID}/docker/containers/${cont}/logs?stdout=true&stderr=true&tail=100&timestamps=true" 2>/dev/null)
            
            if [[ -n "$logs" ]]; then
                echo "$logs" | grep -i -E "(error|exception|critical|fatal|traceback)" || echo "에러 로그가 없습니다."
            else
                echo "로그를 가져올 수 없습니다."
            fi
        done <<< "$containers"
    else
        local logs
        logs=$(call_portainer_api "/endpoints/${ENDPOINT_ID}/docker/containers/${container}/logs?stdout=true&stderr=true&tail=100&timestamps=true")
        
        if [[ -n "$logs" ]]; then
            echo "$logs" | grep -i -E "(error|exception|critical|fatal|traceback)" || echo "에러 로그가 없습니다."
        else
            log_error "로그를 가져올 수 없습니다."
        fi
    fi
}

# =============================================================================
# 모니터링 관련 함수
# =============================================================================

monitor_overview() {
    log_header "SafeWork 시스템 개요"
    
    # 시스템 정보
    echo -e "${BLUE}🖥️  시스템 정보:${NC}"
    echo "  • 프로젝트: ${PROJECT_NAME}"
    echo "  • 레지스트리: ${REGISTRY_HOST}"
    echo "  • 프로덕션: ${PRODUCTION_URL}"
    echo "  • 네트워크: ${NETWORK_NAME}"
    echo ""
    
    # 컨테이너 상태
    deploy_status
    
    # 최근 활동
    echo ""
    echo -e "${BLUE}📈 최근 활동:${NC}"
    local containers
    containers=$(get_safework_containers)
    
    while IFS= read -r container; do
        local container_info
        container_info=$(call_portainer_api "/endpoints/${ENDPOINT_ID}/docker/containers/${container}/json" 2>/dev/null)
        
        if [[ -n "$container_info" ]]; then
            local started_at
            started_at=$(echo "$container_info" | jq -r '.State.StartedAt' | cut -d'T' -f1)
            local restart_count
            restart_count=$(echo "$container_info" | jq -r '.RestartCount')
            echo "  • ${container}: 시작 ${started_at}, 재시작 ${restart_count}회"
        fi
    done <<< "$containers"
}

monitor_health() {
    log_header "SafeWork 건강 상태 점검"

    local health_score=0
    local total_checks=0

    # 컨테이너 상태 점검 - deploy_status 함수 활용
    echo -e "${BLUE}🔍 컨테이너 상태:${NC}"
    local containers
    containers=$(get_safework_containers)

    if [[ -n "$containers" ]]; then
        while IFS= read -r container; do
            [[ -z "$container" ]] && continue
            ((total_checks++))

            local status
            status=$(check_container_health "$container")

            if [[ "$status" == "running" ]]; then
                echo "  ✅ ${container}: 정상"
                ((health_score++))
            else
                echo "  ❌ ${container}: ${status}"
            fi
        done <<< "$containers"
    else
        echo "  ❓ 컨테이너 상태 확인 불가"
        ((total_checks++))
    fi

    echo ""
    echo -e "${BLUE}🌐 프로덕션 서비스 점검:${NC}"

    # Health API 점검
    ((total_checks++))
    if curl -sf "${PRODUCTION_URL}/health" >/dev/null 2>&1; then
        echo "  ✅ Health API: 정상"
        ((health_score++))
    else
        echo "  ❌ Health API: 비정상"
    fi

    # 메인 페이지 점검
    ((total_checks++))
    local main_status
    main_status=$(curl -s -o /dev/null -w "%{http_code}" "${PRODUCTION_URL}/" 2>/dev/null)

    if [[ "$main_status" == "200" ]]; then
        echo "  ✅ 메인 페이지: 정상"
        ((health_score++))
    else
        echo "  ❌ 메인 페이지: 비정상 (${main_status:-error})"
    fi

    # 전체 건강 점수 계산
    echo ""
    if [[ $total_checks -gt 0 ]]; then
        local health_percentage
        health_percentage=$((health_score * 100 / total_checks))

        echo -e "${GREEN}📊 전체 건강 점수: ${health_percentage}% (${health_score}/${total_checks})${NC}"

        if [[ $health_percentage -ge 67 ]]; then
            echo -e "${GREEN}🎉 시스템 상태: 정상${NC}"
        elif [[ $health_percentage -ge 34 ]]; then
            echo -e "${YELLOW}⚠️  시스템 상태: 주의${NC}"
        else
            echo -e "${RED}🚨 시스템 상태: 문제${NC}"
        fi
    else
        echo -e "${RED}❌ 건강 점검 실패${NC}"
    fi
}

# =============================================================================
# 메인 메뉴 및 사용법
# =============================================================================

show_usage() {
    cat << 'EOF'
SafeWork 운영 관리 통합 스크립트

사용법: ./safework_ops_unified.sh [카테고리] [작업] [옵션]

카테고리:
  deploy    - 배포 관련 작업
  logs      - 로그 조회 작업  
  monitor   - 모니터링 작업

배포 작업:
  deploy status              - 현재 배포 상태 확인
  deploy github              - GitHub Actions 배포 트리거
  deploy local               - 로컬 배포 실행

로그 작업:
  logs recent [컨테이너] [줄수]  - 최근 로그 조회 (기본: all, 20줄)
  logs live [컨테이너] [줄수]    - 실시간 로그 조회 (기본: safework-app, 50줄)
  logs errors [컨테이너]         - 에러 로그만 조회 (기본: all)

모니터링 작업:
  monitor overview           - 시스템 전체 개요
  monitor health             - 건강 상태 점검

예시:
  ./safework_ops_unified.sh deploy status
  ./safework_ops_unified.sh logs recent safework-app 50
  ./safework_ops_unified.sh logs live safework-postgres
  ./safework_ops_unified.sh monitor health

환경 변수:
  DEBUG=1                    - 디버그 모드 활성화

기존 스크립트 호환:
  ./safework_ops_unified.sh                    # 전체 개요 (monitor overview)
  ./safework_ops_unified.sh status             # 배포 상태 (deploy status)
  ./safework_ops_unified.sh logs               # 최근 로그 (logs recent)
EOF
}

# 메인 실행 함수
main() {
    local category="${1:-monitor}"
    local action="${2:-overview}"
    local param1="${3:-}"
    local param2="${4:-}"
    
    # 기존 스크립트와의 호환성 유지
    case "$category" in
        "status")
            category="deploy"
            action="status"
            ;;
        "logs")
            if [[ -z "$action" || "$action" == "overview" ]]; then
                category="logs"
                action="recent"
            fi
            ;;
        "help"|"-h"|"--help")
            show_usage
            return 0
            ;;
    esac
    
    case "$category" in
        "deploy")
            case "$action" in
                "status") deploy_status ;;
                "github") deploy_trigger_github ;;
                "local") deploy_local ;;
                *) 
                    log_error "알 수 없는 배포 작업: $action"
                    echo "사용 가능한 작업: status, github, local"
                    return 1
                    ;;
            esac
            ;;
        "logs")
            case "$action" in
                "recent") logs_recent "$param1" "$param2" ;;
                "live") logs_live "$param1" "$param2" ;;
                "errors") logs_errors "$param1" ;;
                *)
                    log_error "알 수 없는 로그 작업: $action"
                    echo "사용 가능한 작업: recent, live, errors"
                    return 1
                    ;;
            esac
            ;;
        "monitor")
            case "$action" in
                "overview") monitor_overview ;;
                "health") monitor_health ;;
                *)
                    log_error "알 수 없는 모니터링 작업: $action"
                    echo "사용 가능한 작업: overview, health"
                    return 1
                    ;;
            esac
            ;;
        *)
            log_error "알 수 없는 카테고리: $category"
            echo ""
            show_usage
            return 1
            ;;
    esac
}

# 스크립트 진입점
echo -e "${CYAN}🚀 SafeWork 운영 관리 통합 스크립트${NC}"
echo -e "${CYAN}====================================${NC}"
echo ""

# 필수 도구 확인
if ! command -v curl >/dev/null 2>&1; then
    log_error "curl이 설치되어 있지 않습니다."
    exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
    log_error "jq가 설치되어 있지 않습니다."
    exit 1
fi

# 메인 함수 실행
main "$@"

log_success "작업이 완료되었습니다."