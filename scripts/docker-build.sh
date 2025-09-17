#!/bin/bash

# SafeWork Docker Build Script
# 모든 SafeWork 컨테이너 이미지를 빌드하고 registry.jclee.me에 푸시합니다.

set -e  # 에러 발생시 스크립트 중단

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

# 환경 변수 설정
REGISTRY_HOST=${REGISTRY_HOST:-"registry.jclee.me"}
APP_NAME=${APP_NAME:-"safework"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT=${GITHUB_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")}

log_info "SafeWork Docker Build 시작"
log_info "Registry: ${REGISTRY_HOST}"
log_info "App Name: ${APP_NAME}"
log_info "Tag: ${IMAGE_TAG}"
log_info "Build Date: ${BUILD_DATE}"
log_info "Git Commit: ${GIT_COMMIT}"

# 빌드할 이미지 목록
declare -A IMAGES=(
    ["app"]="app"
    ["postgres"]="postgres"
    ["redis"]="redis"
)

# 각 이미지 빌드 및 푸시
for service in "${!IMAGES[@]}"; do
    image_name="${REGISTRY_HOST}/${APP_NAME}/${service}:${IMAGE_TAG}"
    context_dir="${IMAGES[$service]}"
    
    log_info "빌드 시작: ${service} (${context_dir})"
    
    # 이미지 빌드
    if docker build \
        --build-arg BUILD_DATE="${BUILD_DATE}" \
        --build-arg GIT_COMMIT="${GIT_COMMIT}" \
        --build-arg VERSION="${IMAGE_TAG}" \
        -t "${image_name}" \
        "${context_dir}"; then
        log_success "빌드 완료: ${image_name}"
    else
        log_error "빌드 실패: ${service}"
        exit 1
    fi
    
    # 이미지 푸시
    log_info "푸시 시작: ${image_name}"
    if docker push "${image_name}"; then
        log_success "푸시 완료: ${image_name}"
    else
        log_error "푸시 실패: ${service}"
        exit 1
    fi
done

# 빌드 완료 후 정리
log_info "이미지 정리 중..."
docker image prune -f || log_warning "이미지 정리 실패 (무시됨)"

log_success "모든 SafeWork 이미지 빌드 및 푸시 완료!"
log_info "빌드된 이미지:"
for service in "${!IMAGES[@]}"; do
    echo "  - ${REGISTRY_HOST}/${APP_NAME}/${service}:${IMAGE_TAG}"
done

# Watchtower HTTP API 호출 (선택사항)
if [ -n "${WATCHTOWER_URL}" ] && [ -n "${WATCHTOWER_HTTP_API_TOKEN}" ]; then
    log_info "Watchtower 업데이트 트리거 중..."
    if curl -X POST \
        -H "Authorization: Bearer ${WATCHTOWER_HTTP_API_TOKEN}" \
        "${WATCHTOWER_URL}/v1/update" \
        --max-time 10 \
        --retry 3; then
        log_success "Watchtower 업데이트 트리거 완료"
    else
        log_warning "Watchtower 업데이트 트리거 실패 (배포는 자동으로 진행됩니다)"
    fi
fi

log_success "SafeWork Docker Build 스크립트 완료!"