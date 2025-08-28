#!/bin/bash
# GitHub Actions 파이프라인 트리거 스크립트

set -e

echo "🚀 GitHub Actions 파이프라인을 트리거합니다..."

# Git 상태 확인
if ! git status >/dev/null 2>&1; then
    echo "❌ Git 저장소가 아닙니다."
    exit 1
fi

# 변경사항 확인
if [[ -n $(git status --porcelain) ]]; then
    echo "📝 변경사항이 있습니다. 커밋을 진행합니다."
    git add .
    
    # 커밋 메시지 입력
    read -p "커밋 메시지를 입력하세요 (기본값: deploy): " COMMIT_MSG
    COMMIT_MSG=${COMMIT_MSG:-"deploy: trigger CI/CD pipeline"}
    
    git commit -m "$COMMIT_MSG"
    echo "✅ 커밋 완료: $COMMIT_MSG"
else
    echo "ℹ️  변경사항이 없습니다."
fi

# 현재 브랜치 확인
CURRENT_BRANCH=$(git branch --show-current)
echo "📋 현재 브랜치: $CURRENT_BRANCH"

# main/master 브랜치 확인
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
    read -p "⚠️  main/master 브랜치가 아닙니다. 계속하시겠습니까? (y/N): " CONTINUE
    if [[ "$CONTINUE" != "y" && "$CONTINUE" != "Y" ]]; then
        echo "❌ 배포가 취소되었습니다."
        exit 1
    fi
fi

# 원격 저장소 푸시
echo "📤 원격 저장소에 푸시 중..."
git push origin $CURRENT_BRANCH

echo ""
echo "✅ GitHub Actions 파이프라인이 트리거되었습니다!"
echo ""
echo "📊 진행 상황 확인:"
echo "   GitHub Actions: https://github.com/$(basename $(pwd))/actions"
echo ""
echo "🔍 예상 동작:"
if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
    echo "   - Docker 이미지 자동 빌드"
    echo "   - registry.jclee.me에 푸시"
    echo "   - GitHub Release 자동 생성"
    echo "   - 버전 태그 생성"
else
    echo "   - Docker 이미지 빌드 (테스트용)"
    echo "   - Release 생성하지 않음"
fi

echo ""
echo "⏱️  빌드 완료까지 약 3-5분 소요됩니다."

# GitHub CLI가 있으면 Actions 페이지 열기
if command -v gh &> /dev/null; then
    read -p "🌐 브라우저에서 GitHub Actions를 열까요? (y/N): " OPEN_BROWSER
    if [[ "$OPEN_BROWSER" == "y" || "$OPEN_BROWSER" == "Y" ]]; then
        gh workflow list
        echo ""
        echo "최근 워크플로우 실행:"
        gh run list --limit 3
    fi
fi

echo ""
echo "🎉 파이프라인 트리거 완료!"