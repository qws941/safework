#!/bin/bash
# SafeWork 브랜치 관리 도우미 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 도움말 함수
show_help() {
    echo "SafeWork 브랜치 관리 도우미"
    echo ""
    echo "사용법: $0 <명령어> [옵션]"
    echo ""
    echo "명령어:"
    echo "  feature <이름>    새 기능 브랜치 생성"
    echo "  hotfix <이름>     핫픽스 브랜치 생성"  
    echo "  release <버전>    릴리즈 브랜치 생성"
    echo "  cleanup          병합된 브랜치 정리"
    echo "  status           브랜치 상태 확인"
    echo "  sync             로컬 브랜치 동기화"
    echo "  help             이 도움말 표시"
    echo ""
    echo "예시:"
    echo "  $0 feature mobile-fix"
    echo "  $0 hotfix security-patch"
    echo "  $0 release v1.3.0"
}

# Git 저장소 확인
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e "${RED}❌ Git 저장소가 아닙니다.${NC}"
        exit 1
    fi
}

# 깨끗한 작업 공간 확인
check_clean_workspace() {
    if [[ -n $(git status --porcelain) ]]; then
        echo -e "${YELLOW}⚠️ 작업 공간에 변경사항이 있습니다:${NC}"
        git status --short
        read -p "계속하시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}작업이 취소되었습니다.${NC}"
            exit 1
        fi
        
        echo -e "${BLUE}변경사항을 스태시합니다...${NC}"
        git stash push -m "Auto stash before branch operation"
    fi
}

# 브랜치 동기화
sync_branches() {
    echo -e "${BLUE}🔄 브랜치 동기화 중...${NC}"
    
    git fetch origin --prune
    
    # 주요 브랜치들 업데이트
    for branch in main develop staging; do
        if git show-ref --verify --quiet refs/heads/$branch; then
            echo -e "${BLUE}  📥 $branch 브랜치 업데이트...${NC}"
            git checkout $branch
            git pull origin $branch
        fi
    done
    
    echo -e "${GREEN}✅ 브랜치 동기화 완료${NC}"
}

# 기능 브랜치 생성
create_feature_branch() {
    local feature_name="$1"
    
    if [[ -z "$feature_name" ]]; then
        echo -e "${RED}❌ 기능 이름을 입력하세요.${NC}"
        echo "사용법: $0 feature <이름>"
        exit 1
    fi
    
    local branch_name="feature/$feature_name"
    
    echo -e "${BLUE}🌟 기능 브랜치 생성: $branch_name${NC}"
    
    # develop에서 브랜치 생성
    git checkout develop
    git pull origin develop
    
    if git show-ref --verify --quiet refs/heads/$branch_name; then
        echo -e "${YELLOW}⚠️ 브랜치 '$branch_name'가 이미 존재합니다.${NC}"
        read -p "기존 브랜치로 전환하시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git checkout $branch_name
        fi
        exit 0
    fi
    
    git checkout -b $branch_name
    git push -u origin $branch_name
    
    echo -e "${GREEN}✅ 기능 브랜치 '$branch_name' 생성 완료${NC}"
    echo -e "${BLUE}다음 단계:${NC}"
    echo "  1. 기능 개발 진행"
    echo "  2. git add . && git commit -m 'feat: 기능 설명'"
    echo "  3. git push origin $branch_name"
    echo "  4. GitHub에서 develop으로 PR 생성"
}

# 핫픽스 브랜치 생성
create_hotfix_branch() {
    local hotfix_name="$1"
    
    if [[ -z "$hotfix_name" ]]; then
        echo -e "${RED}❌ 핫픽스 이름을 입력하세요.${NC}"
        echo "사용법: $0 hotfix <이름>"
        exit 1
    fi
    
    local branch_name="hotfix/$hotfix_name"
    
    echo -e "${BLUE}🐛 핫픽스 브랜치 생성: $branch_name${NC}"
    
    # main에서 브랜치 생성
    git checkout main
    git pull origin main
    
    if git show-ref --verify --quiet refs/heads/$branch_name; then
        echo -e "${YELLOW}⚠️ 브랜치 '$branch_name'가 이미 존재합니다.${NC}"
        read -p "기존 브랜치로 전환하시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git checkout $branch_name
        fi
        exit 0
    fi
    
    git checkout -b $branch_name
    git push -u origin $branch_name
    
    echo -e "${GREEN}✅ 핫픽스 브랜치 '$branch_name' 생성 완료${NC}"
    echo -e "${RED}⚠️ 핫픽스는 긴급 수정용입니다:${NC}"
    echo "  1. 최소한의 변경으로 문제 해결"
    echo "  2. git add . && git commit -m 'fix: 문제 설명'"
    echo "  3. git push origin $branch_name"
    echo "  4. main과 develop 모두에 PR 생성"
}

# 릴리즈 브랜치 생성
create_release_branch() {
    local version="$1"
    
    if [[ -z "$version" ]]; then
        echo -e "${RED}❌ 릴리즈 버전을 입력하세요.${NC}"
        echo "사용법: $0 release <버전>"
        echo "예시: $0 release v1.3.0"
        exit 1
    fi
    
    # v 접두사 확인
    if [[ "$version" != v* ]]; then
        version="v$version"
    fi
    
    local branch_name="release/$version"
    
    echo -e "${BLUE}🔄 릴리즈 브랜치 생성: $branch_name${NC}"
    
    # develop에서 브랜치 생성
    git checkout develop
    git pull origin develop
    
    if git show-ref --verify --quiet refs/heads/$branch_name; then
        echo -e "${YELLOW}⚠️ 브랜치 '$branch_name'가 이미 존재합니다.${NC}"
        exit 1
    fi
    
    git checkout -b $branch_name
    
    # 버전 파일 업데이트
    local version_number="${version#v}"
    echo "$version_number" > app/VERSION
    
    git add app/VERSION
    git commit -m "chore(release): bump version to $version"
    git push -u origin $branch_name
    
    echo -e "${GREEN}✅ 릴리즈 브랜치 '$branch_name' 생성 완료${NC}"
    echo -e "${BLUE}다음 단계:${NC}"
    echo "  1. 릴리즈 노트 작성"
    echo "  2. 최종 테스트 수행"
    echo "  3. main으로 PR 생성"
    echo "  4. develop으로도 PR 생성 (변경사항 동기화)"
}

# 브랜치 정리
cleanup_branches() {
    echo -e "${BLUE}🧹 브랜치 정리 시작...${NC}"
    
    # 원격 추적 브랜치 정리
    git fetch origin --prune
    
    # 병합된 로컬 브랜치 찾기
    local merged_branches=$(git branch --merged | grep -v "\*\|main\|develop\|staging" || true)
    
    if [[ -n "$merged_branches" ]]; then
        echo -e "${YELLOW}병합된 로컬 브랜치들:${NC}"
        echo "$merged_branches"
        
        read -p "이 브랜치들을 삭제하시겠습니까? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "$merged_branches" | xargs git branch -d
            echo -e "${GREEN}✅ 병합된 브랜치 삭제 완료${NC}"
        fi
    else
        echo -e "${GREEN}삭제할 병합된 브랜치가 없습니다.${NC}"
    fi
    
    # 오래된 브랜치 확인
    echo -e "${YELLOW}📅 30일 이상 오래된 원격 브랜치:${NC}"
    git for-each-ref --format='%(refname:short) %(committerdate)' refs/remotes/origin | \
        awk -v cutoff="$(date -d '30 days ago' '+%Y-%m-%d')" '$2 <= cutoff && $1 !~ /(main|develop|staging)$/' || \
        echo "  없음"
    
    echo -e "${GREEN}✅ 브랜치 정리 완료${NC}"
}

# 브랜치 상태 확인
show_status() {
    echo -e "${BLUE}📊 SafeWork 브랜치 상태${NC}"
    echo ""
    
    # 현재 브랜치
    local current_branch=$(git branch --show-current)
    echo -e "${GREEN}현재 브랜치: $current_branch${NC}"
    echo ""
    
    # 주요 브랜치 상태
    echo -e "${BLUE}주요 브랜치 상태:${NC}"
    for branch in main staging develop; do
        if git show-ref --verify --quiet refs/heads/$branch; then
            local ahead_behind=$(git rev-list --left-right --count origin/$branch...$branch 2>/dev/null || echo "? ?")
            local ahead=$(echo $ahead_behind | cut -d' ' -f1)
            local behind=$(echo $ahead_behind | cut -d' ' -f2)
            
            echo -n "  $branch: "
            if [[ "$ahead" != "0" ]]; then
                echo -n -e "${YELLOW}+$ahead${NC} "
            fi
            if [[ "$behind" != "0" ]]; then
                echo -n -e "${RED}-$behind${NC} "
            fi
            if [[ "$ahead" == "0" && "$behind" == "0" ]]; then
                echo -n -e "${GREEN}동기화됨${NC}"
            fi
            echo ""
        else
            echo "  $branch: 없음"
        fi
    done
    echo ""
    
    # 작업 공간 상태
    echo -e "${BLUE}작업 공간 상태:${NC}"
    if [[ -n $(git status --porcelain) ]]; then
        echo -e "${YELLOW}  변경사항 있음${NC}"
        git status --short | head -5
        local total_changes=$(git status --porcelain | wc -l)
        if [[ $total_changes -gt 5 ]]; then
            echo "  ... 총 $total_changes개 파일 변경"
        fi
    else
        echo -e "${GREEN}  깨끗함${NC}"
    fi
    echo ""
    
    # 최근 커밋
    echo -e "${BLUE}최근 커밋:${NC}"
    git log --oneline -5 --color=always || true
    echo ""
    
    # 스태시 상태
    local stash_count=$(git stash list | wc -l)
    if [[ $stash_count -gt 0 ]]; then
        echo -e "${YELLOW}스태시: ${stash_count}개${NC}"
        git stash list | head -3
        echo ""
    fi
    
    # 브랜치 개수
    local total_branches=$(git branch -a | grep -v HEAD | wc -l)
    local local_branches=$(git branch | wc -l) 
    local remote_branches=$(git branch -r | grep -v HEAD | wc -l)
    echo -e "${BLUE}브랜치 통계:${NC}"
    echo "  로컬: $local_branches개"
    echo "  원격: $remote_branches개"
    echo "  전체: $total_branches개"
}

# 메인 함수
main() {
    check_git_repo
    
    case "${1:-help}" in
        feature)
            check_clean_workspace
            create_feature_branch "$2"
            ;;
        hotfix)
            check_clean_workspace
            create_hotfix_branch "$2"
            ;;
        release)
            check_clean_workspace  
            create_release_branch "$2"
            ;;
        cleanup)
            cleanup_branches
            ;;
        status)
            show_status
            ;;
        sync)
            check_clean_workspace
            sync_branches
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