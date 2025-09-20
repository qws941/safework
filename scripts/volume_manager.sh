#!/bin/bash

# SafeWork Docker Volume Management System
# 데이터 지속성 및 백업을 위한 통합 볼륨 관리 스크립트

set -euo pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로깅 함수
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

# SafeWork 볼륨 설정
POSTGRES_VOLUME="safework-postgres-data-persistent"
REDIS_VOLUME="safework-redis-data-persistent"
UPLOADS_VOLUME="safework-uploads-persistent"

# 백업 디렉토리
BACKUP_DIR="/home/jclee/app/safework/backups"
BACKUP_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# 도움말 함수
show_help() {
    cat << EOF
SafeWork Docker Volume Management System

Usage: $0 [COMMAND] [OPTIONS]

COMMANDS:
    status          Show all SafeWork volumes status
    create          Create all required persistent volumes
    backup          Backup all volume data
    restore [file]  Restore from backup file
    cleanup         Clean up unused volumes
    migrate         Migrate data from old volumes to persistent ones
    verify          Verify volume data integrity
    help            Show this help message

VOLUME COMMANDS:
    postgres-backup     Backup PostgreSQL data
    postgres-restore    Restore PostgreSQL data
    redis-backup        Backup Redis data
    redis-restore       Restore Redis data

EXAMPLES:
    $0 status                           # Show volume status
    $0 create                          # Create persistent volumes
    $0 backup                          # Backup all data
    $0 restore backup_20240918_123456   # Restore specific backup
    $0 postgres-backup                 # Backup only PostgreSQL

BACKUP LOCATION: $BACKUP_DIR

EOF
}

# 볼륨 상태 확인
check_volume_status() {
    log_info "SafeWork 볼륨 상태 확인..."

    echo -e "\n=== Docker Volumes ===\n"

    for volume in "$POSTGRES_VOLUME" "$REDIS_VOLUME" "$UPLOADS_VOLUME"; do
        if docker volume inspect "$volume" >/dev/null 2>&1; then
            log_success "✅ $volume: 존재함"
            # 볼륨 사용량 정보
            size=$(docker run --rm -v "$volume":/data alpine du -sh /data 2>/dev/null | cut -f1 || echo "N/A")
            echo "   크기: $size"
        else
            log_warning "❌ $volume: 존재하지 않음"
        fi
    done

    echo -e "\n=== Container Volume Mounts ===\n"

    # 컨테이너별 볼륨 마운트 상태 확인
    for container in "safework-postgres" "safework-redis" "safework-app"; do
        if docker ps -q -f name="$container" | grep -q .; then
            log_info "Container: $container"
            docker inspect "$container" --format '{{range .Mounts}}  {{.Type}}: {{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'
        else
            log_warning "Container $container is not running"
        fi
    done
}

# 지속적인 볼륨 생성
create_persistent_volumes() {
    log_info "지속적인 볼륨 생성 중..."

    # PostgreSQL 데이터 볼륨
    if ! docker volume inspect "$POSTGRES_VOLUME" >/dev/null 2>&1; then
        docker volume create "$POSTGRES_VOLUME"
        log_success "PostgreSQL 데이터 볼륨 생성: $POSTGRES_VOLUME"
    else
        log_info "PostgreSQL 볼륨이 이미 존재함: $POSTGRES_VOLUME"
    fi

    # Redis 데이터 볼륨
    if ! docker volume inspect "$REDIS_VOLUME" >/dev/null 2>&1; then
        docker volume create "$REDIS_VOLUME"
        log_success "Redis 데이터 볼륨 생성: $REDIS_VOLUME"
    else
        log_info "Redis 볼륨이 이미 존재함: $REDIS_VOLUME"
    fi

    # 업로드 파일 볼륨
    if ! docker volume inspect "$UPLOADS_VOLUME" >/dev/null 2>&1; then
        docker volume create "$UPLOADS_VOLUME"
        log_success "업로드 파일 볼륨 생성: $UPLOADS_VOLUME"
    else
        log_info "업로드 볼륨이 이미 존재함: $UPLOADS_VOLUME"
    fi
}

# 백업 디렉토리 생성
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log_success "백업 디렉토리 생성: $BACKUP_DIR"
    fi
}

# PostgreSQL 백업
backup_postgres() {
    log_info "PostgreSQL 데이터 백업 중..."
    create_backup_dir

    local backup_file="$BACKUP_DIR/postgres_backup_$BACKUP_TIMESTAMP.sql"

    if docker ps -q -f name="safework-postgres" | grep -q .; then
        # 컨테이너가 실행 중인 경우 pg_dump 사용
        docker exec safework-postgres pg_dump -U safework -d safework_db > "$backup_file"
        log_success "PostgreSQL 백업 완료: $backup_file"
    else
        # 컨테이너가 실행 중이 아닌 경우 볼륨 백업
        local volume_backup="$BACKUP_DIR/postgres_volume_$BACKUP_TIMESTAMP.tar.gz"
        docker run --rm -v "$POSTGRES_VOLUME":/data -v "$BACKUP_DIR":/backup alpine tar czf "/backup/$(basename $volume_backup)" -C /data .
        log_success "PostgreSQL 볼륨 백업 완료: $volume_backup"
    fi
}

# Redis 백업
backup_redis() {
    log_info "Redis 데이터 백업 중..."
    create_backup_dir

    local backup_file="$BACKUP_DIR/redis_backup_$BACKUP_TIMESTAMP.tar.gz"

    # Redis RDB 파일 백업
    docker run --rm -v "$REDIS_VOLUME":/data -v "$BACKUP_DIR":/backup alpine tar czf "/backup/$(basename $backup_file)" -C /data .
    log_success "Redis 백업 완료: $backup_file"
}

# 전체 백업
backup_all() {
    log_info "전체 데이터 백업 시작..."
    backup_postgres
    backup_redis

    # 업로드 파일 백업
    if docker volume inspect "$UPLOADS_VOLUME" >/dev/null 2>&1; then
        log_info "업로드 파일 백업 중..."
        local uploads_backup="$BACKUP_DIR/uploads_backup_$BACKUP_TIMESTAMP.tar.gz"
        docker run --rm -v "$UPLOADS_VOLUME":/data -v "$BACKUP_DIR":/backup alpine tar czf "/backup/$(basename $uploads_backup)" -C /data .
        log_success "업로드 파일 백업 완료: $uploads_backup"
    fi

    log_success "전체 백업 완료! 백업 위치: $BACKUP_DIR"
}

# 데이터 무결성 검증
verify_data_integrity() {
    log_info "데이터 무결성 검증 중..."

    # PostgreSQL 연결 테스트
    if docker ps -q -f name="safework-postgres" | grep -q .; then
        if docker exec safework-postgres pg_isready -h localhost -p 5432 -U safework >/dev/null 2>&1; then
            log_success "✅ PostgreSQL 연결 정상"

            # 설문 데이터 개수 확인
            survey_count=$(docker exec safework-postgres psql -U safework -d safework_db -t -c "SELECT COUNT(*) FROM surveys;" | tr -d ' ')
            log_info "설문 데이터 개수: $survey_count개"
        else
            log_error "❌ PostgreSQL 연결 실패"
        fi
    else
        log_warning "PostgreSQL 컨테이너가 실행되지 않음"
    fi

    # Redis 연결 테스트
    if docker ps -q -f name="safework-redis" | grep -q .; then
        if docker exec safework-redis redis-cli ping >/dev/null 2>&1; then
            log_success "✅ Redis 연결 정상"
        else
            log_error "❌ Redis 연결 실패"
        fi
    else
        log_warning "Redis 컨테이너가 실행되지 않음"
    fi
}

# 사용하지 않는 볼륨 정리
cleanup_volumes() {
    log_info "사용하지 않는 볼륨 정리 중..."

    # 시스템 전체 정리 (주의: 다른 프로젝트 볼륨도 포함될 수 있음)
    read -p "모든 사용하지 않는 Docker 볼륨을 삭제하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker volume prune -f
        log_success "사용하지 않는 볼륨 정리 완료"
    else
        log_info "볼륨 정리 취소됨"
    fi
}

# 볼륨 마이그레이션
migrate_volumes() {
    log_info "기존 볼륨에서 지속적인 볼륨으로 데이터 마이그레이션..."

    # 기존 볼륨들 확인
    old_postgres_volumes=("safework-postgres-data" "safework_safework-postgres-data")
    old_redis_volumes=("safework-redis-data" "safework_safework-redis-data")

    # PostgreSQL 데이터 마이그레이션
    for old_vol in "${old_postgres_volumes[@]}"; do
        if docker volume inspect "$old_vol" >/dev/null 2>&1; then
            log_info "마이그레이션: $old_vol -> $POSTGRES_VOLUME"

            # 새 볼륨 생성 (아직 없는 경우)
            docker volume create "$POSTGRES_VOLUME" 2>/dev/null || true

            # 데이터 복사
            docker run --rm -v "$old_vol":/src -v "$POSTGRES_VOLUME":/dst alpine sh -c "cp -a /src/. /dst/"
            log_success "PostgreSQL 데이터 마이그레이션 완료: $old_vol"
            break
        fi
    done

    # Redis 데이터 마이그레이션
    for old_vol in "${old_redis_volumes[@]}"; do
        if docker volume inspect "$old_vol" >/dev/null 2>&1; then
            log_info "마이그레이션: $old_vol -> $REDIS_VOLUME"

            # 새 볼륨 생성 (아직 없는 경우)
            docker volume create "$REDIS_VOLUME" 2>/dev/null || true

            # 데이터 복사
            docker run --rm -v "$old_vol":/src -v "$REDIS_VOLUME":/dst alpine sh -c "cp -a /src/. /dst/"
            log_success "Redis 데이터 마이그레이션 완료: $old_vol"
            break
        fi
    done
}

# 메인 스크립트 로직
case "${1:-help}" in
    "status")
        check_volume_status
        ;;
    "create")
        create_persistent_volumes
        ;;
    "backup")
        backup_all
        ;;
    "postgres-backup")
        backup_postgres
        ;;
    "redis-backup")
        backup_redis
        ;;
    "verify")
        verify_data_integrity
        ;;
    "cleanup")
        cleanup_volumes
        ;;
    "migrate")
        migrate_volumes
        ;;
    "help"|*)
        show_help
        ;;
esac