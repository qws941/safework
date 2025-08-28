#!/bin/bash
# SafeWork 버전 업그레이드 스크립트

set -e

CURRENT_VERSION=$(cat app/VERSION)
echo "현재 버전: $CURRENT_VERSION"

# 버전 타입 확인 (patch, minor, major)
VERSION_TYPE=${1:-patch}

# 버전을 배열로 분리
IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR=${VERSION_PARTS[0]}
MINOR=${VERSION_PARTS[1]}
PATCH=${VERSION_PARTS[2]}

case $VERSION_TYPE in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch|*)
    PATCH=$((PATCH + 1))
    ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"

echo "새 버전: $NEW_VERSION"
echo ""

# VERSION 파일 업데이트
echo $NEW_VERSION > app/VERSION
echo "✅ app/VERSION 파일 업데이트: $NEW_VERSION"

# 루트 VERSION 파일도 업데이트 (있다면)
if [ -f VERSION ]; then
    echo $NEW_VERSION > VERSION
    echo "✅ VERSION 파일 업데이트: $NEW_VERSION"
fi

# README 버전 업데이트
if [ -f README.md ]; then
    sed -i.backup "s/v$CURRENT_VERSION/v$NEW_VERSION/g" README.md 2>/dev/null || true
    sed -i.backup "s/($CURRENT_VERSION)/($NEW_VERSION)/g" README.md 2>/dev/null || true
    rm -f README.md.backup 2>/dev/null || true
    echo "✅ README.md 버전 업데이트: v$NEW_VERSION"
fi

echo ""
echo "🎉 버전 업그레이드 완료: $CURRENT_VERSION → $NEW_VERSION"
echo ""
echo "다음 단계:"
echo "1. git add ."
echo "2. git commit -m \"chore: bump version to v$NEW_VERSION\""
echo "3. git push origin main"
echo ""
echo "GitHub Actions가 자동으로 v$NEW_VERSION 이미지를 빌드하고 배포합니다."