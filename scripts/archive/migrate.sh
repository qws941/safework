#!/bin/bash
# SafeWork 마이그레이션 도우미 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 스크립트 경로 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/app"
MIGRATE_CMD="python $APP_DIR/migrate.py"

# 도움말
show_help() {
    echo "SafeWork 데이터베이스 마이그레이션 도우미"
    echo ""
    echo "사용법: $0 <명령어> [옵션]"
    echo ""
    echo "명령어:"
    echo "  status              마이그레이션 상태 확인"
    echo "  migrate             대기 중인 마이그레이션 실행"
    echo "  create <설명>       새 마이그레이션 파일 생성"
    echo "  rollback [버전]     마이그레이션 롤백"
    echo "  init                데이터베이스 초기화 (개발용)"
    echo "  reset               데이터베이스 리셋 (주의!)"
    echo "  backup              데이터베이스 백업"
    echo "  restore <파일>      백업에서 복원"
    echo "  help                이 도움말 표시"
    echo ""
    echo "예시:"
    echo "  $0 status"
    echo "  $0 migrate"
    echo "  $0 create \"Add user preferences table\""
    echo "  $0 rollback 002"
    echo "  $0 backup"
}

# 환경 확인
check_environment() {
    if [[ ! -d "$APP_DIR" ]]; then
        echo -e "${RED}❌ app 디렉토리를 찾을 수 없습니다: $APP_DIR${NC}"
        exit 1
    fi
    
    if [[ ! -f "$APP_DIR/migrate.py" ]]; then
        echo -e "${RED}❌ 마이그레이션 스크립트를 찾을 수 없습니다: $APP_DIR/migrate.py${NC}"
        exit 1
    fi
    
    # Python 및 필요 패키지 확인
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python3이 설치되지 않았습니다.${NC}"
        exit 1
    fi
}

# 데이터베이스 백업
backup_database() {
    echo -e "${BLUE}💾 데이터베이스 백업 중...${NC}"
    
    local backup_dir="$SCRIPT_DIR/backups"
    mkdir -p "$backup_dir"
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$backup_dir/safework_backup_$timestamp.sql"
    
    # SQLite 백업
    if [[ -f "$SCRIPT_DIR/instance/safework.db" ]]; then
        echo -e "${BLUE}📁 SQLite 데이터베이스 백업...${NC}"
        cp "$SCRIPT_DIR/instance/safework.db" "$backup_dir/safework_backup_$timestamp.db"
        
        # SQL 덤프도 생성
        sqlite3 "$SCRIPT_DIR/instance/safework.db" .dump > "$backup_file"
        
        echo -e "${GREEN}✅ 백업 완료: $backup_file${NC}"
        echo -e "${GREEN}✅ 바이너리 백업: $backup_dir/safework_backup_$timestamp.db${NC}"
    else
        echo -e "${YELLOW}⚠️  데이터베이스 파일이 없습니다. 빈 백업을 생성합니다.${NC}"
        echo "-- SafeWork Database Backup - $timestamp" > "$backup_file"
        echo "-- No database found at backup time" >> "$backup_file"
    fi
    
    # 백업 파일 목록 표시
    echo -e "\n${BLUE}📋 최근 백업 파일:${NC}"
    ls -lt "$backup_dir"/*.sql 2>/dev/null | head -5 || echo "  백업 파일이 없습니다."
}

# 데이터베이스 복원
restore_database() {
    local backup_file="$1"
    
    if [[ -z "$backup_file" ]]; then
        echo -e "${RED}❌ 백업 파일을 지정해주세요.${NC}"
        echo "사용법: $0 restore <백업파일>"
        echo ""
        echo "사용 가능한 백업:"
        ls -lt "$SCRIPT_DIR/backups"/*.sql 2>/dev/null | head -5 || echo "  백업 파일이 없습니다."
        exit 1
    fi
    
    if [[ ! -f "$backup_file" ]]; then
        echo -e "${RED}❌ 백업 파일을 찾을 수 없습니다: $backup_file${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}⚠️  WARNING: 현재 데이터베이스가 덮어써집니다!${NC}"
    read -p "계속하시겠습니까? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}복원이 취소되었습니다.${NC}"
        exit 0
    fi
    
    echo -e "${BLUE}🔄 데이터베이스 복원 중...${NC}"
    
    # 현재 DB 백업 (안전장치)
    if [[ -f "$SCRIPT_DIR/instance/safework.db" ]]; then
        local safety_backup="$SCRIPT_DIR/backups/pre_restore_backup_$(date +%Y%m%d_%H%M%S).db"
        cp "$SCRIPT_DIR/instance/safework.db" "$safety_backup"
        echo -e "${BLUE}💾 안전 백업 생성: $safety_backup${NC}"
    fi
    
    # 데이터베이스 삭제 후 복원
    rm -f "$SCRIPT_DIR/instance/safework.db"
    sqlite3 "$SCRIPT_DIR/instance/safework.db" < "$backup_file"
    
    echo -e "${GREEN}✅ 데이터베이스 복원 완료!${NC}"
}

# 마이그레이션 상태 확인 및 실행 여부 결정
auto_migrate() {
    echo -e "${BLUE}🔍 마이그레이션 상태 확인...${NC}"
    
    cd "$APP_DIR"
    
    # 상태 확인
    if python migrate.py status | grep -q "Pending: 0"; then
        echo -e "${GREEN}✅ 모든 마이그레이션이 적용되었습니다.${NC}"
        return 0
    else
        echo -e "${YELLOW}⏳ 대기 중인 마이그레이션이 있습니다.${NC}"
        read -p "마이그레이션을 실행하시겠습니까? (y/N): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}🚀 마이그레이션 실행 중...${NC}"
            python migrate.py migrate
            return $?
        else
            echo -e "${YELLOW}마이그레이션이 건너뛰어졌습니다.${NC}"
            return 1
        fi
    fi
}

# 메인 함수
main() {
    check_environment
    
    case "${1:-help}" in
        status)
            echo -e "${BLUE}📊 마이그레이션 상태 확인${NC}"
            cd "$APP_DIR" && $MIGRATE_CMD status
            ;;
        
        migrate)
            echo -e "${BLUE}🚀 마이그레이션 실행${NC}"
            cd "$APP_DIR" && $MIGRATE_CMD migrate
            ;;
        
        create)
            if [[ -z "$2" ]]; then
                echo -e "${RED}❌ 마이그레이션 설명을 입력하세요.${NC}"
                echo "사용법: $0 create \"마이그레이션 설명\""
                exit 1
            fi
            echo -e "${BLUE}📝 새 마이그레이션 생성${NC}"
            cd "$APP_DIR" && $MIGRATE_CMD create "$2"
            ;;
        
        rollback)
            echo -e "${YELLOW}⏪ 마이그레이션 롤백${NC}"
            if [[ -n "$2" ]]; then
                cd "$APP_DIR" && $MIGRATE_CMD rollback --version "$2"
            else
                cd "$APP_DIR" && $MIGRATE_CMD rollback
            fi
            ;;
        
        init)
            echo -e "${BLUE}🏗️  데이터베이스 초기화${NC}"
            cd "$APP_DIR" && $MIGRATE_CMD init-db
            ;;
        
        reset)
            echo -e "${RED}🗑️  데이터베이스 리셋${NC}"
            cd "$APP_DIR" && $MIGRATE_CMD reset-db
            ;;
        
        backup)
            backup_database
            ;;
        
        restore)
            restore_database "$2"
            ;;
        
        auto)
            auto_migrate
            ;;
        
        help|--help|-h)
            show_help
            ;;
        
        *)
            echo -e "${RED}❌ 알 수 없는 명령어: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 스크립트 실행
main "$@"