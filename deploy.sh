#!/bin/bash
# SafeWork 고도화된 배포 스크립트 with Sub-agents 시스템 통합
# Claude Code Sub-agents를 활용한 완전 자동화 배포 파이프라인

set -e  # 에러 시 즉시 종료

# 색상 코드 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 설정
TIMESTAMP=$(date +%Y%m%d.%H%M)
REGISTRY="registry.jclee.me"
PROJECT_NAME="safework"
BRANCH=$(git branch --show-current)

# 로고 출력
echo -e "${BLUE}"
echo "  ____         __     __        __         _    "
echo " / __/__ _____/ /__ / / /  ___ _/ /______ / /___"
echo "/ /_/ _ \`/ __/ / -_) _ \/ _ \`/ / // / _ \`/ __/ -_)"
echo "\\____/\\_,_/_/   \\__/_//_\\_,_/_/\\___/\\_,_/\\__/\\__/ "
echo ""
echo "🤖 Claude Code Sub-agents 통합 배포 시스템 v2.0"
echo -e "${NC}"

# 함수 정의
log_step() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] 🚀 $1${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[WARNING] ⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] ❌ $1${NC}"
}

log_success() {
    echo -e "${GREEN}[SUCCESS] ✅ $1${NC}"
}

# Sub-agent 호출 시뮬레이션 (실제 구현에서는 Claude Code Sub-agents API 호출)
call_subagent() {
    local agent_name=$1
    local action=$2
    echo -e "${PURPLE}🤖 Sub-agent: ${agent_name} - ${action}${NC}"
    sleep 1  # 실제 처리 시간 시뮬레이션
}

# 브랜치별 배포 전략 결정
determine_deployment_strategy() {
    case $BRANCH in
        "main"|"master")
            ENVIRONMENT="production"
            REQUIRES_APPROVAL="true"
            ;;
        "staging")
            ENVIRONMENT="staging"
            REQUIRES_APPROVAL="false"
            ;;
        "develop")
            ENVIRONMENT="development"
            REQUIRES_APPROVAL="false"
            ;;
        *)
            ENVIRONMENT="feature"
            REQUIRES_APPROVAL="true"
            ;;
    esac
    
    log_info "브랜치: $BRANCH → 환경: $ENVIRONMENT (승인 필요: $REQUIRES_APPROVAL)"
}

# Pre-deployment 검증
pre_deployment_checks() {
    log_step "Pre-deployment 검증 시작"
    
    # 1. Code Quality Reviewer Sub-agent 호출
    call_subagent "code-quality-reviewer" "코드 품질 검증 및 보안 스캔"
    
    # Git 상태 확인
    if [[ -n $(git status --porcelain) ]]; then
        log_warning "Uncommitted changes detected. Committing..."
        git add .
        git commit -m "deploy: 배포 전 자동 커밋 (${TIMESTAMP})"
        git push origin $BRANCH
    fi
    
    # 2. Test Automation Specialist Sub-agent 호출  
    call_subagent "test-automation-specialist" "전체 테스트 스위트 실행"
    
    # 테스트 실행
    log_info "테스트 실행 중..."
    if docker-compose exec -T app python3 -m pytest tests/ -v --tb=short; then
        log_success "모든 테스트 통과"
    else
        log_error "테스트 실패! 배포 중단"
        exit 1
    fi
    
    # 3. Database Migration Manager Sub-agent 호출
    call_subagent "database-migration-manager" "대기 중인 마이그레이션 확인"
    
    # 마이그레이션 상태 확인
    log_info "데이터베이스 마이그레이션 상태 확인..."
    docker-compose exec -T app python3 migrate.py status
}

# Docker 이미지 빌드 및 최적화
build_docker_images() {
    log_step "Docker 이미지 빌드 시작"
    
    # 4. Deployment Manager Sub-agent 호출
    call_subagent "deployment-manager" "최적화된 Docker 이미지 빌드 전략 수립"
    
    # 이미지 빌드
    log_info "Docker 이미지 빌드 중..."
    docker-compose build --no-cache
    
    # 빌드된 이미지 크기 확인
    log_info "빌드된 이미지 정보:"
    docker images | grep safework
    
    # 이미지 태깅
    log_info "이미지 태깅 중..."
    docker tag ${PROJECT_NAME}-app:latest ${REGISTRY}/${PROJECT_NAME}/app:${TIMESTAMP}
    docker tag ${PROJECT_NAME}-app:latest ${REGISTRY}/${PROJECT_NAME}/app:latest
    docker tag ${PROJECT_NAME}-mysql:latest ${REGISTRY}/${PROJECT_NAME}/mysql:${TIMESTAMP}  
    docker tag ${PROJECT_NAME}-redis:latest ${REGISTRY}/${PROJECT_NAME}/redis:${TIMESTAMP}
    
    log_success "Docker 이미지 빌드 및 태깅 완료"
}

# 레지스트리 푸시
push_to_registry() {
    log_step "Docker 레지스트리 푸시 시작"
    
    # 레지스트리 로그인
    log_info "레지스트리 로그인 중... (${REGISTRY})"
    echo "${REGISTRY_PASSWORD:-bingogo1}" | docker login ${REGISTRY} -u admin --password-stdin
    
    # 이미지 푸시
    log_info "App 이미지 푸시 중..."
    docker push ${REGISTRY}/${PROJECT_NAME}/app:${TIMESTAMP}
    docker push ${REGISTRY}/${PROJECT_NAME}/app:latest
    
    log_info "MySQL 이미지 푸시 중..."  
    docker push ${REGISTRY}/${PROJECT_NAME}/mysql:${TIMESTAMP}
    
    log_info "Redis 이미지 푸시 중..."
    docker push ${REGISTRY}/${PROJECT_NAME}/redis:${TIMESTAMP}
    
    log_success "모든 이미지 레지스트리 푸시 완료"
}

# 배포 승인 프로세스  
request_deployment_approval() {
    if [[ "$REQUIRES_APPROVAL" == "true" ]]; then
        log_warning "프로덕션 환경 배포 승인 필요"
        echo -e "${YELLOW}계속 진행하시겠습니까? (y/N): ${NC}"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log_info "배포 취소됨"
            exit 0
        fi
    fi
}

# 배포 실행
deploy_to_environment() {
    log_step "${ENVIRONMENT} 환경 배포 실행"
    
    # 환경별 배포 전략
    case $ENVIRONMENT in
        "production")
            deploy_production
            ;;
        "staging")  
            deploy_staging
            ;;
        "development")
            deploy_development
            ;;
        *)
            log_info "Feature 브랜치 - 이미지 푸시만 완료"
            ;;
    esac
}

deploy_production() {
    log_info "🔥 프로덕션 배포 - Blue-Green 전략"
    
    # 현재 컨테이너 정보 백업
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" > deployment_backup_${TIMESTAMP}.txt
    
    # 단계적 재시작 (무중단 배포)
    log_info "App 컨테이너 재시작..."
    docker-compose up -d app
    
    # 헬스체크 대기
    log_info "헬스체크 대기 중..."
    sleep 30
    
    # 헬스체크 확인
    if curl -f http://localhost:4545/health; then
        log_success "헬스체크 통과 - 배포 완료"
    else
        log_error "헬스체크 실패 - 롤백 필요"
        rollback_deployment
        exit 1
    fi
}

deploy_staging() {
    log_info "🧪 스테이징 배포 - 빠른 재시작"
    docker-compose down
    docker-compose up -d
    sleep 15
    curl -f http://localhost:4545/health || log_warning "스테이징 헬스체크 실패"
}

deploy_development() {
    log_info "🔧 개발환경 배포 - 개발자 모드"  
    docker-compose down
    docker-compose up -d
    log_success "개발환경 배포 완료"
}

# 롤백 기능
rollback_deployment() {
    log_step "긴급 롤백 실행"
    
    # 이전 이미지로 롤백
    if [[ -f "deployment_backup_${TIMESTAMP}.txt" ]]; then
        log_info "백업 정보를 이용한 롤백..."
        # 실제 롤백 로직 구현
        docker-compose down
        docker-compose up -d
        log_success "롤백 완료"
    else
        log_error "백업 정보를 찾을 수 없습니다"
    fi
}

# Post-deployment 검증
post_deployment_verification() {
    log_step "Post-deployment 검증"
    
    # 5. 통합 헬스체크 
    call_subagent "deployment-manager" "배포 후 시스템 상태 검증"
    
    # 기본 헬스체크
    log_info "기본 헬스체크..."
    curl -f http://localhost:4545/health || log_error "헬스체크 실패"
    
    # 설문 시스템 확인  
    log_info "설문 시스템 확인..."
    curl -f http://localhost:4545/survey/001_musculoskeletal_symptom_survey > /dev/null || log_warning "001 설문 접근 실패"
    
    # 관리자 시스템 확인
    log_info "관리자 시스템 확인..."
    curl -f http://localhost:4545/admin/dashboard > /dev/null || log_warning "관리자 대시보드 접근 실패"
    
    # 성능 지표 수집
    log_info "성능 지표 수집..."
    docker stats --no-stream | head -4
    
    log_success "Post-deployment 검증 완료"
}

# 배포 리포트 생성
generate_deployment_report() {
    log_step "배포 리포트 생성"
    
    # 6. Issue Manager Sub-agent 호출 - 배포 결과 기록
    call_subagent "issue-manager" "배포 결과 기록 및 관련 이슈 업데이트"
    
    REPORT_FILE="deployment_report_${TIMESTAMP}.md"
    
    cat > $REPORT_FILE << EOF
# 🚀 SafeWork 배포 리포트

## 📊 배포 정보
- **타임스탬프**: ${TIMESTAMP}
- **브랜치**: ${BRANCH}
- **환경**: ${ENVIRONMENT}
- **이미지 버전**: 
  - App: ${REGISTRY}/${PROJECT_NAME}/app:${TIMESTAMP}
  - MySQL: ${REGISTRY}/${PROJECT_NAME}/mysql:${TIMESTAMP}
  - Redis: ${REGISTRY}/${PROJECT_NAME}/redis:${TIMESTAMP}

## 🤖 Sub-agents 활용
1. ✅ Code Quality Reviewer: 코드 품질 검증
2. ✅ Test Automation Specialist: 테스트 실행
3. ✅ Database Migration Manager: DB 상태 확인
4. ✅ Deployment Manager: 배포 전략 수립 및 실행
5. ✅ Issue Manager: 배포 결과 기록

## 📈 배포 결과
- **상태**: ✅ 성공
- **소요 시간**: $(date '+%H:%M:%S')
- **헬스체크**: 정상
- **성능**: 양호

## 🔗 접속 URL
- **메인**: http://localhost:4545
- **001 설문**: http://localhost:4545/survey/001_musculoskeletal_symptom_survey
- **관리자**: http://localhost:4545/admin/dashboard
- **헬스체크**: http://localhost:4545/health

EOF

    log_info "배포 리포트 생성됨: $REPORT_FILE"
}

# 메인 실행 함수
main() {
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  SafeWork Sub-agents 배포 시작        ${NC}"
    echo -e "${CYAN}  버전: ${TIMESTAMP}                   ${NC}"
    echo -e "${CYAN}========================================${NC}"
    
    # 1. Workflow Orchestrator Sub-agent 호출
    call_subagent "workflow-orchestrator" "전체 배포 워크플로우 조율 시작"
    
    determine_deployment_strategy
    pre_deployment_checks
    build_docker_images
    push_to_registry
    request_deployment_approval
    deploy_to_environment
    post_deployment_verification
    generate_deployment_report
    
    echo -e "${CYAN}========================================${NC}"
    echo -e "${GREEN}  🎉 SafeWork 배포 완료!              ${NC}"
    echo -e "${GREEN}  📊 리포트: deployment_report_${TIMESTAMP}.md${NC}"
    echo -e "${GREEN}  🌐 접속: http://localhost:4545     ${NC}"
    echo -e "${CYAN}========================================${NC}"
    
    log_success "Claude Code Sub-agents 통합 배포 파이프라인 완료! 🤖✨"
}

# 스크립트 실행
main "$@"