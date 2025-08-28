#!/bin/bash
# SafeWork Docker Image Build Script

# 설정
REGISTRY="registry.jclee.me"
PROJECT="safework"
VERSION=$(date +%Y%m%d-%H%M%S)
LATEST="latest"

echo "🚀 SafeWork Docker 이미지 빌드 시작..."
echo "Registry: $REGISTRY"
echo "Version: $VERSION"

# 1. App 이미지 빌드
echo "📦 Building App Image..."
docker build -t $REGISTRY/$PROJECT/app:$VERSION -t $REGISTRY/$PROJECT/app:$LATEST ./app
if [ $? -ne 0 ]; then
    echo "❌ App 이미지 빌드 실패"
    exit 1
fi

# 2. MySQL 이미지 빌드
echo "📦 Building MySQL Image..."
docker build -t $REGISTRY/$PROJECT/mysql:$VERSION -t $REGISTRY/$PROJECT/mysql:$LATEST ./mysql
if [ $? -ne 0 ]; then
    echo "❌ MySQL 이미지 빌드 실패"
    exit 1
fi

# 3. Redis 이미지 빌드
echo "📦 Building Redis Image..."
docker build -t $REGISTRY/$PROJECT/redis:$VERSION -t $REGISTRY/$PROJECT/redis:$LATEST ./redis
if [ $? -ne 0 ]; then
    echo "❌ Redis 이미지 빌드 실패"
    exit 1
fi

echo "✅ 모든 이미지 빌드 완료!"

# 레지스트리 푸시 (옵션)
read -p "레지스트리에 푸시하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 레지스트리 푸시 시작..."
    
    docker push $REGISTRY/$PROJECT/app:$VERSION
    docker push $REGISTRY/$PROJECT/app:$LATEST
    
    docker push $REGISTRY/$PROJECT/mysql:$VERSION
    docker push $REGISTRY/$PROJECT/mysql:$LATEST
    
    docker push $REGISTRY/$PROJECT/redis:$VERSION
    docker push $REGISTRY/$PROJECT/redis:$LATEST
    
    echo "✅ 푸시 완료!"
    echo ""
    echo "배포된 이미지:"
    echo "- $REGISTRY/$PROJECT/app:$VERSION"
    echo "- $REGISTRY/$PROJECT/mysql:$VERSION"
    echo "- $REGISTRY/$PROJECT/redis:$VERSION"
fi