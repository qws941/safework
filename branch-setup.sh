#!/bin/bash
# SafeWork 브랜치 전략 초기 설정 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🌿 SafeWork 브랜치 전략 초기 설정${NC}"
echo "=================================================="

# Git 저장소 확인
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Git 저장소가 아닙니다.${NC}"
    exit 1
fi

# 현재 상태 확인
echo -e "${BLUE}📊 현재 상태 확인${NC}"
current_branch=$(git branch --show-current)
echo "현재 브랜치: $current_branch"

# 원격 저장소 확인
if ! git remote get-url origin > /dev/null 2>&1; then
    echo -e "${RED}❌ 원격 저장소가 설정되지 않았습니다.${NC}"
    exit 1
fi

remote_url=$(git remote get-url origin)
echo "원격 저장소: $remote_url"

# 주요 브랜치 생성
echo -e "\n${BLUE}🔧 주요 브랜치 생성${NC}"

# Main/Master 브랜치 확인
if git show-ref --verify --quiet refs/heads/main; then
    echo "✅ main 브랜치 존재"
elif git show-ref --verify --quiet refs/heads/master; then
    echo "✅ master 브랜치 존재 (main으로 이름 변경 권장)"
    read -p "master를 main으로 이름을 변경하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git branch -m master main
        git push -u origin main
        git push origin --delete master || true
        echo "✅ master → main 이름 변경 완료"
    fi
else
    echo -e "${RED}❌ main 또는 master 브랜치가 없습니다.${NC}"
    exit 1
fi

# Develop 브랜치 생성
if ! git show-ref --verify --quiet refs/heads/develop; then
    echo "🔧 develop 브랜치 생성 중..."
    git checkout -b develop
    
    # 초기 커밋 (필요한 경우)
    if [[ ! -f ".gitignore" ]] || ! grep -q "# SafeWork" .gitignore; then
        echo -e "\n# SafeWork 프로젝트\n__pycache__/\n*.pyc\n.env\ninstance/\nuploads/\n.coverage\n.pytest_cache/" >> .gitignore
        git add .gitignore
        git commit -m "feat: setup develop branch with improved .gitignore" || true
    fi
    
    git push -u origin develop
    echo "✅ develop 브랜치 생성 완료"
else
    echo "✅ develop 브랜치 존재"
fi

# Staging 브랜치 생성
if ! git show-ref --verify --quiet refs/heads/staging; then
    echo "🔧 staging 브랜치 생성 중..."
    git checkout develop
    git checkout -b staging
    git push -u origin staging
    echo "✅ staging 브랜치 생성 완료"
else
    echo "✅ staging 브랜치 존재"
fi

# 버전 파일 확인 및 생성
echo -e "\n${BLUE}📦 버전 관리 설정${NC}"
if [[ ! -f "app/VERSION" ]]; then
    echo "1.0.0" > app/VERSION
    git add app/VERSION
    git commit -m "feat: add VERSION file for automated versioning" || true
    echo "✅ VERSION 파일 생성"
else
    echo "✅ VERSION 파일 존재 ($(cat app/VERSION))"
fi

# GitHub Actions 워크플로우 확인
echo -e "\n${BLUE}🚀 CI/CD 파이프라인 확인${NC}"
if [[ -f ".github/workflows/deploy.yml" ]]; then
    echo "✅ 배포 워크플로우 설정됨"
else
    echo -e "${YELLOW}⚠️ 배포 워크플로우가 없습니다.${NC}"
fi

if [[ -f ".github/workflows/test.yml" ]]; then
    echo "✅ 테스트 워크플로우 설정됨"
else
    echo -e "${YELLOW}⚠️ 테스트 워크플로우가 없습니다.${NC}"
fi

# GitHub Secrets 확인
echo -e "\n${BLUE}🔐 GitHub Secrets 확인${NC}"
if command -v gh &> /dev/null; then
    echo "📋 설정된 Secrets:"
    gh secret list 2>/dev/null | head -5 || echo "  Secrets 목록을 가져올 수 없습니다."
    
    echo -e "\n${YELLOW}필수 Secrets 확인:${NC}"
    required_secrets=("REGISTRY_PASSWORD" "GITHUB_TOKEN")
    for secret in "${required_secrets[@]}"; do
        if gh secret list | grep -q "$secret"; then
            echo "  ✅ $secret"
        else
            echo -e "  ${RED}❌ $secret${NC} - .github/SECRETS.md 참조"
        fi
    done
else
    echo -e "${YELLOW}⚠️ GitHub CLI가 없어서 Secrets 확인을 건너뜁니다.${NC}"
fi

# 브랜치 보호 규칙 안내
echo -e "\n${BLUE}🛡️ 브랜치 보호 설정 안내${NC}"
echo "다음 단계로 브랜치 보호 규칙을 설정하세요:"
echo "  1. GitHub 저장소 > Settings > Branches"
echo "  2. .github/branch-protection-setup.md 파일 참조"
echo "  3. 또는 scripts/setup-branch-protection.sh 실행"

# 사용 가능한 명령어 안내
echo -e "\n${GREEN}🎉 브랜치 전략 설정 완료!${NC}"
echo ""
echo -e "${BLUE}📝 사용 가능한 명령어:${NC}"
echo ""
echo "브랜치 관리:"
echo "  make branch-feature name=기능명     # 새 기능 브랜치 생성"
echo "  make branch-hotfix name=버그명      # 핫픽스 브랜치 생성"
echo "  make branch-release v=1.3.0        # 릴리즈 브랜치 생성"
echo "  make branch-status                  # 브랜치 상태 확인"
echo "  make branch-cleanup                 # 브랜치 정리"
echo ""
echo "배포 관리:"
echo "  make deploy-dev                     # 개발 환경 배포"
echo "  make deploy-staging                 # 스테이징 환경 배포"  
echo "  make deploy-prod                    # 프로덕션 배포"
echo ""
echo "테스트 및 PR:"
echo "  make test-local                     # 로컬 테스트"
echo "  make pr-create                      # GitHub PR 생성"
echo ""
echo "일반 배포 (기존 방식):"
echo "  make deploy                         # 자동 배포"
echo "  make release v=1.3.0               # 태그 릴리즈"

# 다음 단계 안내
echo -e "\n${YELLOW}📋 다음 단계:${NC}"
echo "1. GitHub Secrets 설정: .github/SECRETS.md 참조"
echo "2. 브랜치 보호 규칙 설정: .github/branch-protection-setup.md 참조"
echo "3. 테스트 워크플로우 실행: git push origin develop"
echo "4. 첫 번째 기능 브랜치: make branch-feature name=first-feature"
echo ""
echo -e "${GREEN}✨ SafeWork 브랜치 전략이 준비되었습니다!${NC}"

# main 브랜치로 복귀
git checkout main 2>/dev/null || git checkout master 2>/dev/null || true