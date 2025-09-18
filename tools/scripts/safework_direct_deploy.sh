#!/bin/bash
# SafeWork Direct Deployment Script
# Watchtower 의존성 없는 직접 배포 시스템

set -e

# 설정
PORTAINER_URL="https://portainer.jclee.me"
API_KEY="ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
ENDPOINT_ID="3"
NETWORK_NAME="safework_network"
REGISTRY_BASE="registry.jclee.me/safework"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 로깅 함수
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# 네트워크 생성
create_network() {
    log "네트워크 '$NETWORK_NAME' 확인 중..."
    
    # 네트워크 존재 확인
    if docker network ls | grep -q "$NETWORK_NAME"; then
        success "네트워크 '$NETWORK_NAME' 이미 존재"
    else
        log "네트워크 '$NETWORK_NAME' 생성 중..."
        docker network create --driver bridge "$NETWORK_NAME"
        success "네트워크 '$NETWORK_NAME' 생성 완료"
    fi
}

# 컨테이너 배포
deploy_container() {
    local service_name=$1
    local image_name=$2
    local port_mapping=$3
    local env_vars=$4
    local container_name="safework-${service_name}"
    
    log "서비스 '$service_name' 배포 시작..."
    
    # 기존 컨테이너 중지 및 제거
    if docker ps -a --format '{{.Names}}' | grep -q "^${container_name}$"; then
        log "기존 '$container_name' 컨테이너 중지 및 제거..."
        docker stop "$container_name" 2>/dev/null || true
        docker rm "$container_name" 2>/dev/null || true
    fi
    
    # 새 이미지 풀
    log "최신 이미지 풀: $image_name"
    docker pull "$image_name"
    
    # 새 컨테이너 시작
    log "새 컨테이너 시작: $container_name"
    eval "docker run -d --name $container_name \
        --network $NETWORK_NAME \
        $port_mapping \
        $env_vars \
        --restart unless-stopped \
        --label 'safework.deployment.auto=true' \
        --label 'safework.service.name=$service_name' \
        $image_name"
    
    # 헬스체크 대기
    log "컨테이너 헬스체크 대기..."
    sleep 15
    
    if docker ps --format '{{.Names}}\t{{.Status}}' | grep "$container_name" | grep -q "healthy\|Up"; then
        success "서비스 '$service_name' 배포 성공"
    else
        error "서비스 '$service_name' 배포 실패"
        docker logs "$container_name" --tail 20
        return 1
    fi
}

# PostgreSQL 배포
deploy_postgres() {
    deploy_container "postgres" \
        "${REGISTRY_BASE}/postgres:latest" \
        "-p 4546:5432" \
        "-e POSTGRES_DB=safework_db -e POSTGRES_USER=safework -e POSTGRES_PASSWORD=safework2024 -e TZ=Asia/Seoul"
}

# Redis 배포
deploy_redis() {
    deploy_container "redis" \
        "${REGISTRY_BASE}/redis:latest" \
        "-p 4547:6379" \
        "-e TZ=Asia/Seoul"
}

# App 배포
deploy_app() {
    deploy_container "app" \
        "${REGISTRY_BASE}/app:latest" \
        "-p 4545:4545" \
        "-e TZ=Asia/Seoul -e DB_HOST=safework-postgres -e DB_NAME=safework_db -e DB_USER=safework -e DB_PASSWORD=safework2024 -e REDIS_HOST=safework-redis -e SECRET_KEY=safework-production-secret-key-2024 -e ADMIN_USERNAME=admin -e ADMIN_PASSWORD=safework2024 -e FLASK_CONFIG=production"
}

# 전체 시스템 배포
deploy_all() {
    log "SafeWork 전체 시스템 배포 시작"
    
    create_network
    
    # 순서대로 배포 (의존성 고려)
    deploy_postgres
    deploy_redis  
    deploy_app
    
    success "전체 시스템 배포 완료"
    
    # 최종 상태 확인
    log "시스템 상태 확인..."
    docker ps --filter "label=safework.deployment.auto=true" \
        --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# 헬스체크
health_check() {
    log "시스템 헬스체크 실행..."
    
    # API 헬스체크
    if curl -s --max-time 10 http://localhost:4545/health > /dev/null; then
        success "API 헬스체크 통과"
    else
        warning "API 헬스체크 실패"
    fi
    
    # 데이터베이스 연결 확인
    if docker exec safework-postgres pg_isready -U safework -d safework_db > /dev/null 2>&1; then
        success "PostgreSQL 연결 확인"
    else
        warning "PostgreSQL 연결 실패"
    fi
    
    # Redis 연결 확인
    if docker exec safework-redis redis-cli ping > /dev/null 2>&1; then
        success "Redis 연결 확인"
    else
        warning "Redis 연결 실패"
    fi
}

# 도움말
show_help() {
    echo "SafeWork Direct Deployment Script"
    echo ""
    echo "사용법:"
    echo "  $0 [명령어]"
    echo ""
    echo "명령어:"
    echo "  all        - 전체 시스템 배포"
    echo "  postgres   - PostgreSQL 배포"
    echo "  redis      - Redis 배포"
    echo "  app        - Application 배포"
    echo "  network    - 네트워크 생성"
    echo "  health     - 헬스체크"
    echo "  help       - 도움말"
}

# 메인 실행
case "${1:-all}" in
    "all")
        deploy_all
        health_check
        ;;
    "postgres")
        create_network
        deploy_postgres
        ;;
    "redis")
        create_network
        deploy_redis
        ;;
    "app")
        create_network
        deploy_app
        ;;
    "network")
        create_network
        ;;
    "health")
        health_check
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        error "알 수 없는 명령어: $1"
        show_help
        exit 1
        ;;
esac