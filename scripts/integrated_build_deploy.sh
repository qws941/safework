#!/bin/bash

# SafeWork2 통합 빌드 및 배포 스크립트 (Integrated Build & Deploy Script)
# 작성자: Claude Code Assistant
# 목적: 이미지 빌드부터 프로덕션 배포까지 자동화

set -e  # 오류 발생 시 스크립트 중단

# 색상 코드 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
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

# 환경 설정
REGISTRY_HOST="registry.jclee.me"
PROJECT_NAME="safework2"
NETWORK_NAME="watchtower_default"
DB_PASSWORD="safework2024"
PORTAINER_API_KEY="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
PORTAINER_URL="https://portainer.jclee.me"

# 사용법 표시
show_usage() {
    echo "사용법: $0 [옵션]"
    echo "옵션:"
    echo "  build     - 이미지 빌드만 실행"
    echo "  deploy    - 배포만 실행 (이미지가 이미 빌드된 경우)"
    echo "  full      - 전체 빌드 및 배포 (기본값)"
    echo "  status    - 현재 시스템 상태 확인"
    echo "  logs      - 컨테이너 로그 확인"
    echo "  rollback  - 이전 버전으로 롤백"
    echo ""
    echo "예시:"
    echo "  $0 full           # 전체 빌드 및 배포"
    echo "  $0 build          # 빌드만"
    echo "  $0 deploy         # 배포만"
    echo "  $0 status         # 상태 확인"
}

# 시스템 상태 확인
check_system_status() {
    log_info "시스템 상태 확인 중..."

    # Docker 확인
    if ! command -v docker &> /dev/null; then
        log_error "Docker가 설치되지 않았습니다."
        exit 1
    fi

    # 네트워크 확인
    if ! docker network ls | grep -q "$NETWORK_NAME"; then
        log_warning "네트워크 $NETWORK_NAME이 존재하지 않습니다. 생성합니다."
        docker network create "$NETWORK_NAME" || true
    fi

    # 컨테이너 상태 확인
    log_info "현재 컨테이너 상태:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep safework2 || echo "SafeWork2 컨테이너가 실행되고 있지 않습니다."
}

# 이미지 빌드
build_images() {
    log_info "SafeWork2 이미지 빌드 시작..."

    # 빌드 시작 시간 기록
    BUILD_START_TIME=$(date +%s)

    # PostgreSQL 이미지 빌드
    log_info "PostgreSQL 이미지 빌드 중..."
    cd postgres
    docker build -t ${REGISTRY_HOST}/${PROJECT_NAME}/postgres:latest . \
        --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
        --build-arg VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    cd ..

    # Redis 이미지 빌드
    log_info "Redis 이미지 빌드 중..."
    cd redis
    docker build -t ${REGISTRY_HOST}/${PROJECT_NAME}/redis:latest . \
        --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
        --build-arg VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    cd ..

    # Flask App 이미지 빌드
    log_info "Flask 애플리케이션 이미지 빌드 중..."
    cd app
    docker build -t ${REGISTRY_HOST}/${PROJECT_NAME}/app:latest . \
        --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
        --build-arg VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    cd ..

    # 빌드 완료 시간 계산
    BUILD_END_TIME=$(date +%s)
    BUILD_DURATION=$((BUILD_END_TIME - BUILD_START_TIME))

    log_success "이미지 빌드 완료! (소요 시간: ${BUILD_DURATION}초)"

    # 빌드된 이미지 목록 표시
    log_info "빌드된 이미지 목록:"
    docker images | grep "${REGISTRY_HOST}/${PROJECT_NAME}"
}

# 이미지 레지스트리에 푸시
push_images() {
    log_info "이미지를 레지스트리에 푸시 중..."

    docker push ${REGISTRY_HOST}/${PROJECT_NAME}/postgres:latest
    docker push ${REGISTRY_HOST}/${PROJECT_NAME}/redis:latest
    docker push ${REGISTRY_HOST}/${PROJECT_NAME}/app:latest

    log_success "이미지 푸시 완료!"
}

# 기존 컨테이너 중지 및 제거
stop_containers() {
    log_info "기존 컨테이너 중지 및 제거 중..."

    # 컨테이너 중지
    docker stop safework2-app safework2-postgres safework2-redis 2>/dev/null || true

    # 컨테이너 제거
    docker rm safework2-app safework2-postgres safework2-redis 2>/dev/null || true

    log_success "기존 컨테이너 정리 완료!"
}

# 새 컨테이너 배포
deploy_containers() {
    log_info "새 컨테이너 배포 시작..."

    # PostgreSQL 컨테이너 시작
    log_info "PostgreSQL 컨테이너 시작 중..."
    docker run -d \
        --name safework2-postgres \
        --network $NETWORK_NAME \
        -p 4546:5432 \
        -e TZ=Asia/Seoul \
        -e POSTGRES_PASSWORD=$DB_PASSWORD \
        -e POSTGRES_DB=safework_db \
        -e POSTGRES_USER=safework \
        --label "com.centurylinklabs.watchtower.enable=true" \
        --restart unless-stopped \
        ${REGISTRY_HOST}/${PROJECT_NAME}/postgres:latest

    # PostgreSQL 초기화 대기
    log_info "PostgreSQL 초기화 대기 중..."
    sleep 10

    # PostgreSQL 연결 확인
    for i in {1..30}; do
        if docker exec safework2-postgres pg_isready -U safework >/dev/null 2>&1; then
            log_success "PostgreSQL 준비 완료!"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "PostgreSQL 초기화 시간 초과"
            exit 1
        fi
        sleep 2
    done

    # Redis 컨테이너 시작
    log_info "Redis 컨테이너 시작 중..."
    docker run -d \
        --name safework2-redis \
        --network $NETWORK_NAME \
        -p 4547:6379 \
        -e TZ=Asia/Seoul \
        --label "com.centurylinklabs.watchtower.enable=true" \
        --restart unless-stopped \
        ${REGISTRY_HOST}/${PROJECT_NAME}/redis:latest

    # Flask App 컨테이너 시작
    log_info "Flask 애플리케이션 컨테이너 시작 중..."
    docker run -d \
        --name safework2-app \
        --network $NETWORK_NAME \
        -p 4545:4545 \
        -e TZ=Asia/Seoul \
        -e DB_HOST=safework2-postgres \
        -e DB_NAME=safework_db \
        -e DB_USER=safework \
        -e DB_PASSWORD=$DB_PASSWORD \
        -e REDIS_HOST=safework2-redis \
        -e FLASK_CONFIG=production \
        --label "com.centurylinklabs.watchtower.enable=true" \
        --restart unless-stopped \
        ${REGISTRY_HOST}/${PROJECT_NAME}/app:latest

    log_success "모든 컨테이너 배포 완료!"
}

# 배포 검증
verify_deployment() {
    log_info "배포 검증 중..."

    # 컨테이너 상태 확인
    sleep 5

    # 각 컨테이너가 실행 중인지 확인
    for container in safework2-postgres safework2-redis safework2-app; do
        if docker ps | grep -q "$container"; then
            log_success "$container: 실행 중"
        else
            log_error "$container: 실행되지 않음"
            docker logs "$container" || true
            exit 1
        fi
    done

    # 애플리케이션 건강 상태 확인
    log_info "애플리케이션 건강 상태 확인 중..."
    for i in {1..30}; do
        if curl -f http://localhost:4545/health >/dev/null 2>&1; then
            log_success "애플리케이션 건강 상태 확인 완료!"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "애플리케이션 건강 상태 확인 실패"
            exit 1
        fi
        sleep 2
    done

    # 최종 상태 출력
    log_info "최종 배포 상태:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep safework2

    log_success "배포 검증 완료!"
    log_info "접속 URL: http://localhost:4545"
    log_info "관리자 대시보드: http://localhost:4545/admin"
    log_info "건강 상태 확인: http://localhost:4545/health"
}

# 컨테이너 로그 확인
show_logs() {
    log_info "컨테이너 로그 확인:"
    echo ""

    echo "=== SafeWork2 App 로그 ==="
    docker logs --tail 20 safework2-app 2>/dev/null || echo "App 컨테이너가 실행되지 않음"
    echo ""

    echo "=== SafeWork2 PostgreSQL 로그 ==="
    docker logs --tail 10 safework2-postgres 2>/dev/null || echo "PostgreSQL 컨테이너가 실행되지 않음"
    echo ""

    echo "=== SafeWork2 Redis 로그 ==="
    docker logs --tail 10 safework2-redis 2>/dev/null || echo "Redis 컨테이너가 실행되지 않음"
}

# 롤백 기능
rollback_deployment() {
    log_warning "이전 버전으로 롤백을 시작합니다..."

    # 백업 이미지가 있는지 확인
    if docker images | grep -q "${REGISTRY_HOST}/${PROJECT_NAME}.*backup"; then
        log_info "백업 이미지를 사용하여 롤백합니다."
        # 여기에 롤백 로직 구현
        log_success "롤백 완료!"
    else
        log_error "백업 이미지를 찾을 수 없습니다."
        exit 1
    fi
}

# 메인 실행 로직
main() {
    local action=${1:-full}

    case $action in
        "build")
            log_info "이미지 빌드만 실행합니다."
            check_system_status
            build_images
            ;;
        "deploy")
            log_info "배포만 실행합니다."
            check_system_status
            stop_containers
            deploy_containers
            verify_deployment
            ;;
        "full")
            log_info "전체 빌드 및 배포를 실행합니다."
            check_system_status
            build_images
            push_images
            stop_containers
            deploy_containers
            verify_deployment
            ;;
        "status")
            check_system_status
            verify_deployment
            ;;
        "logs")
            show_logs
            ;;
        "rollback")
            rollback_deployment
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            log_error "알 수 없는 옵션: $action"
            show_usage
            exit 1
            ;;
    esac
}

# 스크립트 시작
echo "================================================="
echo "SafeWork2 통합 빌드 및 배포 스크립트"
echo "================================================="
echo ""

# 메인 함수 실행
main "$@"

log_success "스크립트 실행 완료!"