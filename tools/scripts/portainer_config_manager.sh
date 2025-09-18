#!/bin/bash
# SafeWork Portainer 설정 관리자
# Portainer 설정 파일 기반 컨테이너 관리 및 배포

set -euo pipefail

# 스크립트 디렉토리 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/deployment/portainer/portainer-config.yaml"

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 로깅 함수
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# 헤더 출력
print_header() {
    echo -e "${PURPLE}=====================================${NC}"
    echo -e "${PURPLE}    SafeWork Portainer 설정 관리자    ${NC}"
    echo -e "${PURPLE}=====================================${NC}"
}

# YAML 파서 (yq가 없는 경우를 위한 간단한 파서)
parse_yaml() {
    local file="$1"
    local prefix="$2"

    if command -v yq &> /dev/null; then
        # yq가 있는 경우 사용
        yq eval "$prefix" "$file" 2>/dev/null || echo ""
    else
        # 간단한 grep 기반 파서
        grep -E "^\s*${prefix//./\\.}:" "$file" | sed "s/^.*: //" | tr -d '"' 2>/dev/null || echo ""
    fi
}

# 설정 파일 검증
validate_config() {
    log "🔍 Portainer 설정 파일 검증 중..."

    if [[ ! -f "$CONFIG_FILE" ]]; then
        error "설정 파일을 찾을 수 없습니다: $CONFIG_FILE"
    fi

    # 필수 설정 확인
    local portainer_url=$(parse_yaml "$CONFIG_FILE" ".portainer.url")
    local api_key=$(parse_yaml "$CONFIG_FILE" ".portainer.api_key")

    if [[ -z "$portainer_url" || -z "$api_key" ]]; then
        error "Portainer URL 또는 API Key가 설정되지 않았습니다"
    fi

    log "✅ 설정 파일 검증 완료"
}

# Portainer API 연결 테스트
test_portainer_connection() {
    log "🔗 Portainer API 연결 테스트..."

    local portainer_url=$(parse_yaml "$CONFIG_FILE" ".portainer.url")
    local api_key=$(parse_yaml "$CONFIG_FILE" ".portainer.api_key")

    local response=$(curl -s -w "%{http_code}" -H "X-API-Key: $api_key" \
        "$portainer_url/api/system/status" -o /tmp/portainer_test.json)

    if [[ "$response" == "200" ]]; then
        log "✅ Portainer API 연결 성공"
        local version=$(jq -r '.Version // "Unknown"' /tmp/portainer_test.json 2>/dev/null || echo "Unknown")
        info "Portainer 버전: $version"
    else
        error "Portainer API 연결 실패 (HTTP $response)"
    fi

    rm -f /tmp/portainer_test.json
}

# 컨테이너 생성/업데이트
deploy_container() {
    local container_name="$1"
    log "🚀 컨테이너 배포: $container_name"

    local portainer_url=$(parse_yaml "$CONFIG_FILE" ".portainer.url")
    local api_key=$(parse_yaml "$CONFIG_FILE" ".portainer.api_key")
    local endpoint_id=$(parse_yaml "$CONFIG_FILE" ".portainer.endpoint_id")

    # 설정에서 컨테이너 정보 추출
    local image=$(parse_yaml "$CONFIG_FILE" ".containers.$container_name.image")
    local network=$(parse_yaml "$CONFIG_FILE" ".containers.$container_name.network")

    if [[ -z "$image" ]]; then
        error "컨테이너 '$container_name'의 이미지가 설정되지 않았습니다"
    fi

    # 기존 컨테이너 확인
    local existing_container=$(curl -s -H "X-API-Key: $api_key" \
        "$portainer_url/api/endpoints/$endpoint_id/docker/containers/json?all=true" | \
        jq -r ".[] | select(.Names[] | contains(\"$container_name\")) | .Id" 2>/dev/null || echo "")

    if [[ -n "$existing_container" ]]; then
        info "기존 컨테이너 발견, 업데이트 진행..."

        # 컨테이너 중지
        curl -s -X POST -H "X-API-Key: $api_key" \
            "$portainer_url/api/endpoints/$endpoint_id/docker/containers/$existing_container/stop" > /dev/null

        # 컨테이너 제거
        curl -s -X DELETE -H "X-API-Key: $api_key" \
            "$portainer_url/api/endpoints/$endpoint_id/docker/containers/$existing_container" > /dev/null
    fi

    # 새 컨테이너 생성 (간단한 구현)
    local create_data=$(cat <<EOF
{
    "Image": "$image",
    "name": "$container_name",
    "HostConfig": {
        "NetworkMode": "$network",
        "RestartPolicy": {"Name": "unless-stopped"}
    },
    "Labels": {
        "com.safework.managed": "true",
        "com.safework.deployed": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    }
}
EOF
)

    local create_response=$(curl -s -X POST -H "X-API-Key: $api_key" \
        -H "Content-Type: application/json" \
        -d "$create_data" \
        "$portainer_url/api/endpoints/$endpoint_id/docker/containers/create?name=$container_name")

    local container_id=$(echo "$create_response" | jq -r '.Id // empty' 2>/dev/null)

    if [[ -n "$container_id" ]]; then
        # 컨테이너 시작
        curl -s -X POST -H "X-API-Key: $api_key" \
            "$portainer_url/api/endpoints/$endpoint_id/docker/containers/$container_id/start" > /dev/null

        log "✅ 컨테이너 '$container_name' 배포 완료"
    else
        error "컨테이너 '$container_name' 생성 실패"
    fi
}

# 모든 SafeWork 컨테이너 배포
deploy_all_containers() {
    log "🚀 모든 SafeWork 컨테이너 배포 시작..."

    # 컨테이너 목록 (의존성 순서)
    local containers=("safework-postgres" "safework-redis" "safework-app")

    for container in "${containers[@]}"; do
        deploy_container "$container"
        sleep 5  # 컨테이너 간 시작 간격
    done

    log "✅ 모든 컨테이너 배포 완료"
}

# 건강 상태 체크
health_check_all() {
    log "🏥 전체 시스템 건강 상태 체크..."

    local portainer_url=$(parse_yaml "$CONFIG_FILE" ".portainer.url")
    local api_key=$(parse_yaml "$CONFIG_FILE" ".portainer.api_key")
    local endpoint_id=$(parse_yaml "$CONFIG_FILE" ".portainer.endpoint_id")

    # SafeWork 컨테이너 상태 확인
    local containers=$(curl -s -H "X-API-Key: $api_key" \
        "$portainer_url/api/endpoints/$endpoint_id/docker/containers/json" | \
        jq -r '.[] | select(.Names[] | contains("safework")) | .Names[0] + ":" + .State' 2>/dev/null)

    echo -e "${CYAN}📊 컨테이너 상태:${NC}"
    while IFS=':' read -r name state; do
        local clean_name=${name#/}
        if [[ "$state" == "running" ]]; then
            echo -e "  ${GREEN}✅ $clean_name: $state${NC}"
        else
            echo -e "  ${RED}❌ $clean_name: $state${NC}"
        fi
    done <<< "$containers"

    # 애플리케이션 건강 상태 체크
    echo -e "\n${CYAN}🌐 애플리케이션 건강 상태:${NC}"
    if curl -s -f "https://safework.jclee.me/health" > /dev/null; then
        echo -e "  ${GREEN}✅ Production API: 정상${NC}"
    else
        echo -e "  ${RED}❌ Production API: 오류${NC}"
    fi

    if curl -s -f "http://localhost:4545/health" > /dev/null; then
        echo -e "  ${GREEN}✅ Local API: 정상${NC}"
    else
        echo -e "  ${YELLOW}⚠️ Local API: 접근 불가${NC}"
    fi
}

# 설정 정보 표시
show_config_info() {
    log "📋 Portainer 설정 정보"

    local portainer_url=$(parse_yaml "$CONFIG_FILE" ".portainer.url")
    local endpoint_id=$(parse_yaml "$CONFIG_FILE" ".portainer.endpoint_id")

    echo -e "${CYAN}🔧 Portainer 연결 정보:${NC}"
    echo -e "  URL: $portainer_url"
    echo -e "  Endpoint ID: $endpoint_id"
    echo -e "  설정 파일: $CONFIG_FILE"

    echo -e "\n${CYAN}🐳 관리 대상 컨테이너:${NC}"
    local containers=("safework-app" "safework-postgres" "safework-redis")
    for container in "${containers[@]}"; do
        local image=$(parse_yaml "$CONFIG_FILE" ".containers.$container.image")
        echo -e "  $container: $image"
    done
}

# 백업 실행
backup_containers() {
    log "💾 컨테이너 설정 백업..."

    local backup_dir="$PROJECT_ROOT/backup/portainer/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"

    # 설정 파일 백업
    cp "$CONFIG_FILE" "$backup_dir/"

    # 컨테이너 정보 백업
    local portainer_url=$(parse_yaml "$CONFIG_FILE" ".portainer.url")
    local api_key=$(parse_yaml "$CONFIG_FILE" ".portainer.api_key")
    local endpoint_id=$(parse_yaml "$CONFIG_FILE" ".portainer.endpoint_id")

    curl -s -H "X-API-Key: $api_key" \
        "$portainer_url/api/endpoints/$endpoint_id/docker/containers/json?all=true" > \
        "$backup_dir/containers.json"

    curl -s -H "X-API-Key: $api_key" \
        "$portainer_url/api/endpoints/$endpoint_id/docker/images/json" > \
        "$backup_dir/images.json"

    log "✅ 백업 완료: $backup_dir"
}

# 메인 메뉴
show_menu() {
    print_header
    echo -e "${CYAN}사용 가능한 명령어:${NC}"
    echo -e "  ${GREEN}validate${NC}     - 설정 파일 검증"
    echo -e "  ${GREEN}test${NC}         - Portainer API 연결 테스트"
    echo -e "  ${GREEN}deploy${NC}       - 모든 컨테이너 배포"
    echo -e "  ${GREEN}health${NC}       - 시스템 건강 상태 체크"
    echo -e "  ${GREEN}info${NC}         - 설정 정보 표시"
    echo -e "  ${GREEN}backup${NC}       - 설정 및 컨테이너 정보 백업"
    echo -e "  ${GREEN}container${NC}    - 개별 컨테이너 배포"
    echo ""
}

# 메인 실행 로직
main() {
    local command=${1:-"menu"}

    case $command in
        "validate")
            validate_config
            ;;
        "test")
            validate_config
            test_portainer_connection
            ;;
        "deploy")
            validate_config
            test_portainer_connection
            deploy_all_containers
            ;;
        "health")
            validate_config
            health_check_all
            ;;
        "info")
            validate_config
            show_config_info
            ;;
        "backup")
            validate_config
            backup_containers
            ;;
        "container")
            if [[ -z "${2:-}" ]]; then
                error "컨테이너 이름을 지정해주세요 (예: container safework-app)"
            fi
            validate_config
            deploy_container "$2"
            ;;
        "menu"|*)
            show_menu
            ;;
    esac
}

# 스크립트 실행
main "$@"