#!/bin/bash
# Enhanced SafeWork Deployment Script
# 고도화된 SafeWork 배포 스크립트

set -euo pipefail

# Configuration
PROJECT_NAME="safework"
REGISTRY_HOST="registry.jclee.me"
COMPOSE_FILE="infrastructure/docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Pre-deployment checks
pre_deployment_checks() {
    log "🔍 Running pre-deployment checks..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed or not in PATH"
    fi

    # Check registry access
    log "Checking registry access..."
    if ! docker login ${REGISTRY_HOST} --username ${REGISTRY_USER} --password ${REGISTRY_PASSWORD} &> /dev/null; then
        error "Cannot login to registry ${REGISTRY_HOST}"
    fi

    # Check required environment variables
    local required_vars=("REGISTRY_USER" "REGISTRY_PASSWORD" "DB_PASSWORD" "SECRET_KEY")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done

    log "✅ Pre-deployment checks passed"
}

# Build containers with enhanced options
build_containers() {
    log "🔨 Building containers with enhanced options..."

    # Build app container
    log "Building app container..."
    docker build \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VCS_REF="$(git rev-parse HEAD)" \
        --build-arg VCS_URL="$(git remote get-url origin)" \
        --tag ${REGISTRY_HOST}/${PROJECT_NAME}/app:latest \
        --tag ${REGISTRY_HOST}/${PROJECT_NAME}/app:$(git rev-parse --short HEAD) \
        ./src/app

    # Build postgres container
    log "Building postgres container..."
    docker build \
        --tag ${REGISTRY_HOST}/${PROJECT_NAME}/postgres:latest \
        --tag ${REGISTRY_HOST}/${PROJECT_NAME}/postgres:$(git rev-parse --short HEAD) \
        ./infrastructure/docker/postgres

    # Build redis container
    log "Building redis container..."
    docker build \
        --tag ${REGISTRY_HOST}/${PROJECT_NAME}/redis:latest \
        --tag ${REGISTRY_HOST}/${PROJECT_NAME}/redis:$(git rev-parse --short HEAD) \
        ./infrastructure/docker/redis

    log "✅ Container build completed"
}

# Push containers to registry
push_containers() {
    log "📤 Pushing containers to registry..."

    # Push all tags
    docker push ${REGISTRY_HOST}/${PROJECT_NAME}/app:latest
    docker push ${REGISTRY_HOST}/${PROJECT_NAME}/app:$(git rev-parse --short HEAD)
    docker push ${REGISTRY_HOST}/${PROJECT_NAME}/postgres:latest
    docker push ${REGISTRY_HOST}/${PROJECT_NAME}/postgres:$(git rev-parse --short HEAD)
    docker push ${REGISTRY_HOST}/${PROJECT_NAME}/redis:latest
    docker push ${REGISTRY_HOST}/${PROJECT_NAME}/redis:$(git rev-parse --short HEAD)

    log "✅ Container push completed"
}

# Deploy to target environment
deploy_environment() {
    local env_name=${1:-development}
    log "🚀 Deploying to ${env_name} environment..."

    # Load environment-specific configuration
    if [[ -f "deployment/environments/${env_name}/.env" ]]; then
        log "Loading environment configuration for ${env_name}..."
        export $(cat deployment/environments/${env_name}/.env | grep -v '^#' | xargs)
    else
        warn "No environment configuration found for ${env_name}"
    fi

    # Deploy using docker-compose
    cd infrastructure
    docker-compose pull
    docker-compose up -d --remove-orphans
    cd ..

    log "✅ Deployment to ${env_name} completed"
}

# Health checks with retry logic
health_checks() {
    log "🏥 Running health checks..."

    local max_attempts=30
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        log "Health check attempt $attempt/$max_attempts..."

        if curl -f -s http://localhost:4545/health > /dev/null; then
            log "✅ Health check passed"
            return 0
        fi

        if [[ $attempt -eq $max_attempts ]]; then
            error "Health check failed after $max_attempts attempts"
        fi

        log "Health check failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
}

# Rollback function
rollback() {
    log "🔄 Rolling back to previous version..."

    # Get previous image tags
    local prev_commit=$(git rev-parse HEAD~1 | cut -c1-7)

    # Update containers to previous version
    docker pull ${REGISTRY_HOST}/${PROJECT_NAME}/app:${prev_commit}
    docker pull ${REGISTRY_HOST}/${PROJECT_NAME}/postgres:${prev_commit}
    docker pull ${REGISTRY_HOST}/${PROJECT_NAME}/redis:${prev_commit}

    # Restart with previous versions
    cd infrastructure
    SAFEWORK_VERSION=${prev_commit} docker-compose up -d
    cd ..

    log "✅ Rollback completed"
}

# Cleanup function
cleanup() {
    log "🧹 Running cleanup..."

    # Remove old images (keep last 3 versions)
    docker image prune -f

    # Remove unused volumes
    docker volume prune -f

    log "✅ Cleanup completed"
}

# Performance monitoring
monitor_performance() {
    log "📊 Running performance monitoring..."

    # Monitor key metrics
    local app_memory=$(docker stats safework-app --no-stream --format "{{.MemUsage}}")
    local db_memory=$(docker stats safework-postgres --no-stream --format "{{.MemUsage}}")
    local redis_memory=$(docker stats safework-redis --no-stream --format "{{.MemUsage}}")

    log "App Memory Usage: ${app_memory}"
    log "DB Memory Usage: ${db_memory}"
    log "Redis Memory Usage: ${redis_memory}"

    # Check response times
    local response_time=$(curl -o /dev/null -s -w '%{time_total}\n' http://localhost:4545/health)
    log "Health endpoint response time: ${response_time}s"

    if (( $(echo "$response_time > 1.0" | bc -l) )); then
        warn "Response time is high: ${response_time}s"
    fi

    log "✅ Performance monitoring completed"
}

# Main deployment function
main() {
    local command=${1:-deploy}
    local environment=${2:-development}

    case $command in
        "build")
            pre_deployment_checks
            build_containers
            ;;
        "deploy")
            pre_deployment_checks
            build_containers
            push_containers
            deploy_environment $environment
            health_checks
            monitor_performance
            ;;
        "rollback")
            rollback
            health_checks
            ;;
        "health")
            health_checks
            monitor_performance
            ;;
        "cleanup")
            cleanup
            ;;
        *)
            echo "Usage: $0 [build|deploy|rollback|health|cleanup] [environment]"
            echo "Environments: development, staging, production"
            exit 1
            ;;
    esac

    log "🎉 Operation completed successfully!"
}

# Run main function with all arguments
main "$@"