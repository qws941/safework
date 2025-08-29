#!/bin/bash

###############################################################################
# SafeWork Production Deploy Script
# 
# 운영서버용 자동 배포 스크립트
# - Git에서 최신 docker-compose.yml 자동 pull
# - Docker 이미지 최신 버전 자동 pull & 재시작
# - 롤링 업데이트로 무중단 배포
#
# Usage: ./deploy.sh
###############################################################################

set -e  # 에러 발생시 즉시 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ${GREEN}INFO:${NC} $1"
}

log_warn() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ${YELLOW}WARN:${NC} $1"
}

log_error() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} ${RED}ERROR:${NC} $1"
}

# 배포 시작
log_info "========================================="
log_info "SafeWork Production Deploy Starting..."
log_info "========================================="

# 1. 현재 설정 백업
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
if [ -f docker-compose.yml ]; then
    cp docker-compose.yml $BACKUP_DIR/
    log_info "Backed up current files to $BACKUP_DIR"
fi

# 2. Git에서 최신 코드 가져오기
log_info "Fetching latest code from Git repository..."

# 현재 브랜치 확인
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "master")
log_info "Current branch: $CURRENT_BRANCH"

# Git 상태 확인
if [ -d .git ]; then
    # Stash any local changes
    git stash -q 2>/dev/null || true
    
    # Fetch latest changes
    log_info "Pulling latest changes from origin/$CURRENT_BRANCH..."
    git fetch origin $CURRENT_BRANCH
    
    # Pull latest docker-compose.yml and related files
    git checkout origin/$CURRENT_BRANCH -- docker-compose.yml 2>/dev/null || {
        log_warn "Could not checkout docker-compose.yml from Git"
    }
    
    # Optional: Pull other deployment files if needed
    git checkout origin/$CURRENT_BRANCH -- .env.example 2>/dev/null || true
    
    log_info "Git pull completed"
else
    log_warn "Not a Git repository, skipping Git pull"
fi

# 3. Docker 이미지 최신 버전 확인 및 pull
log_info "Pulling latest Docker images..."
docker-compose pull --quiet 2>/dev/null || {
    log_warn "Some images failed to pull, continuing with existing images"
}

# 4. 현재 실행 중인 컨테이너 확인
log_info "Checking current container status..."
docker-compose ps

# 5. 헬스체크 함수
health_check() {
    local max_attempts=30
    local attempt=1
    
    log_info "Starting health check..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:4545/health >/dev/null 2>&1; then
            log_info "Health check passed! Application is ready."
            return 0
        fi
        
        log_warn "Health check attempt $attempt/$max_attempts failed, waiting..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# 6. 롤링 업데이트 실행
log_info "Starting rolling update..."

# Redis 먼저 업데이트 (상태 저장소)
log_info "Updating Redis container..."
docker-compose up -d safework-redis

# MySQL 업데이트
log_info "Updating MySQL container..."
docker-compose up -d safework-mysql

# MySQL이 완전히 준비될 때까지 대기
log_info "Waiting for MySQL to be ready..."
sleep 10

# 애플리케이션 업데이트
log_info "Updating application container..."
docker-compose up -d safework-app

# 7. 헬스체크 실행
if health_check; then
    log_info "Deployment successful!"
    
    # 8. 이전 이미지 정리 (선택사항)
    log_info "Cleaning up old images..."
    docker image prune -f --filter "until=24h" >/dev/null 2>&1
    
    # 9. 배포 완료 상태 확인
    log_info "Final container status:"
    docker-compose ps
    
    log_info "========================================="
    log_info "SafeWork Production Update Complete!"
    log_info "========================================="
    
    # 10. 로그 확인 (최근 10줄)
    log_info "Recent application logs:"
    docker-compose logs --tail=10 safework-app
    
else
    log_error "Deployment failed! Rolling back..."
    
    # 롤백 실행
    if [ -d "$BACKUP_DIR" ]; then
        log_warn "Restoring previous configuration from $BACKUP_DIR..."
        cp $BACKUP_DIR/docker-compose.yml . 2>/dev/null || true
        
        log_warn "Restarting with previous configuration..."
        docker-compose up -d
        
        if health_check; then
            log_info "Rollback successful"
        else
            log_error "Rollback failed! Manual intervention required!"
            exit 1
        fi
    fi
    
    exit 1
fi

# 11. 성능 메트릭 출력
log_info "Container resource usage:"
docker stats --no-stream safework-app safework-mysql safework-redis

exit 0