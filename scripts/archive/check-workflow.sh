#!/bin/bash
# GitHub Actions 워크플로우 검증 스크립트

set -e

echo "🔍 GitHub Actions 워크플로우 검증을 시작합니다..."

# YAML 문법 검사 (yq가 있다면)
if command -v yq &> /dev/null; then
    echo "📋 YAML 문법 검사..."
    for workflow in .github/workflows/*.yml; do
        echo "  - $(basename $workflow)"
        yq eval . "$workflow" > /dev/null && echo "    ✅ 문법 OK" || echo "    ❌ 문법 오류"
    done
else
    echo "ℹ️  yq가 없어서 YAML 문법 검사를 건너뜁니다."
fi

echo ""
echo "📦 필요한 Secrets 확인..."

# 필요한 Secrets 목록
REQUIRED_SECRETS=(
    "REGISTRY_PASSWORD"
    "GITHUB_TOKEN"
)

OPTIONAL_SECRETS=(
    "REGISTRY_URL"  
    "REGISTRY_USER"
)

echo "필수 Secrets:"
for secret in "${REQUIRED_SECRETS[@]}"; do
    echo "  - $secret (필수)"
done

echo "선택적 Secrets:"
for secret in "${OPTIONAL_SECRETS[@]}"; do
    echo "  - $secret (선택사항)"
done

echo ""
echo "🔧 워크플로우 트리거 조건:"
echo "  - Push to main/master 브랜치"
echo "  - PR to main/master 브랜치"
echo "  - 수동 트리거 (workflow_dispatch)"
echo "  - Release 생성"

echo ""
echo "📁 트리거 경로:"
echo "  - app/ 디렉토리 변경"
echo "  - mysql/ 디렉토리 변경"
echo "  - redis/ 디렉토리 변경"
echo "  - docker-compose.yml 변경"
echo "  - .github/workflows/ 변경"
echo "  - Makefile 변경"

echo ""
echo "🚀 테스트 방법:"
echo ""
echo "1. 자동 배포:"
echo "   make deploy"
echo "   또는"
echo "   ./trigger-deploy.sh"
echo ""
echo "2. 수동 트리거:"
echo "   - GitHub Actions 페이지에서 'Run workflow' 클릭"
echo "   - 버전과 환경 선택"
echo ""
echo "3. 릴리즈 배포:"
echo "   make release v=1.3.0"
echo ""
echo "4. 로컬 테스트:"
echo "   make local"

echo ""
echo "📋 GitHub Secrets 설정 가이드:"
echo "   cat .github/SECRETS.md"

echo ""
echo "🔗 유용한 링크:"
if git remote get-url origin >/dev/null 2>&1; then
    REPO_URL=$(git remote get-url origin | sed 's/\.git$//')
    if [[ $REPO_URL == https://* ]]; then
        echo "  - GitHub Repository: $REPO_URL"
        echo "  - GitHub Actions: $REPO_URL/actions"
        echo "  - Settings > Secrets: $REPO_URL/settings/secrets/actions"
    fi
fi

echo ""
echo "✅ 워크플로우 검증 완료!"
echo ""
echo "💡 다음 단계:"
echo "1. GitHub에 Secrets 설정"
echo "2. 코드 변경 후 푸시"
echo "3. GitHub Actions에서 빌드 확인"