#!/bin/bash
# SafeWork 간편 배포 스크립트

set -e

echo "🚀 SafeWork 배포를 시작합니다..."

# 옵션 확인
DEPLOY_TYPE=${1:-auto}

case $DEPLOY_TYPE in
  "tag")
    # Git 태그 기반 배포
    echo "📋 새 태그를 생성하여 배포합니다."
    echo "현재 태그들:"
    git tag -l | tail -5
    echo ""
    read -p "새 버전 태그 (예: v1.2.0): " TAG
    if [[ $TAG =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      git tag $TAG
      git push origin $TAG
      echo "✅ 태그 $TAG 생성 완료. GitHub Actions가 자동으로 빌드합니다."
    else
      echo "❌ 올바른 태그 형식이 아닙니다 (예: v1.2.0)"
      exit 1
    fi
    ;;
  
  "push")
    # 단순 푸시 배포
    echo "📤 현재 코드를 푸시하여 배포합니다."
    git add .
    read -p "커밋 메시지: " COMMIT_MSG
    git commit -m "$COMMIT_MSG" || echo "변경사항이 없습니다."
    git push origin main
    echo "✅ 푸시 완료. GitHub Actions가 자동으로 빌드합니다."
    ;;
  
  "local")
    # 로컬 빌드 및 배포
    echo "🔧 로컬에서 직접 빌드하고 배포합니다."
    VERSION="local-$(date +%Y%m%d-%H%M%S)"
    echo $VERSION > app/VERSION
    
    docker build -t registry.jclee.me/safework/app:$VERSION app/
    docker tag registry.jclee.me/safework/app:$VERSION registry.jclee.me/safework/app:latest
    
    docker rm -f safework-app 2>/dev/null || true
    docker run -d --name safework-app --network safework-net \
      --restart unless-stopped -v safework-uploads:/app/uploads \
      -p 4545:4545 registry.jclee.me/safework/app:latest
    
    echo "✅ 로컬 배포 완료: $VERSION"
    ;;
  
  "auto"|*)
    # 자동 배포 (기본값)
    echo "🤖 자동 배포 모드입니다."
    VERSION="$(date +%Y%m%d).$(date +%H%M)"
    echo $VERSION > app/VERSION
    
    git add app/VERSION
    git commit -m "chore: auto-bump version to $VERSION [skip ci]" 2>/dev/null || true
    git push origin main
    
    echo "✅ 자동 배포 완료. 버전: $VERSION"
    ;;
esac

echo ""
echo "🌐 SafeWork 접속: http://localhost:4545"
echo "👤 관리자 계정: admin / safework2024"
echo ""
echo "📊 GitHub Actions: https://github.com/$(basename $(pwd))/actions"