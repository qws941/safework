#!/bin/bash

# SafeWork 보안 강화 설정 스크립트
# Docker Compose 환경변수 기반 인증정보 고도화

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"
ENV_EXAMPLE="$PROJECT_ROOT/.env.example"

# 색상 출력 함수
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SECURITY] $1"
}

log_success() {
    echo -e "\033[32m✅ $1\033[0m"
}

log_warning() {
    echo -e "\033[33m⚠️  $1\033[0m"
}

log_error() {
    echo -e "\033[31m❌ $1\033[0m"
}

# 강력한 패스워드 생성 함수
generate_password() {
    local length=${1:-24}
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-$length
}

# 무작위 토큰 생성 함수
generate_token() {
    local prefix=${1:-"tk"}
    local length=${2:-32}
    echo "${prefix}_$(openssl rand -hex $length)"
}

# .env 파일 초기화
initialize_env_file() {
    log "🔧 .env 파일 초기화 중..."
    
    if [[ -f "$ENV_FILE" ]]; then
        log_warning ".env 파일이 이미 존재합니다. 백업을 생성합니다."
        cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    if [[ -f "$ENV_EXAMPLE" ]]; then
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        log_success ".env.example에서 .env 파일을 생성했습니다."
    else
        log_error ".env.example 파일을 찾을 수 없습니다."
        return 1
    fi
}

# 보안 강화된 패스워드 자동 생성
generate_secure_credentials() {
    log "🔐 보안 강화된 인증 정보 생성 중..."
    
    # 패스워드 생성
    MYSQL_ROOT_PASS="SafeWork$(generate_password 16)Root@"
    MYSQL_USER_PASS="SafeWork$(generate_password 16)User@"
    REDIS_PASS="SafeWork$(generate_password 20)Redis@"
    SECRET_KEY="SafeWork-Production-Secret-$(generate_password 32)-2024"
    ADMIN_PASS="SafeWork$(generate_password 16)Admin@"
    REGISTRY_PASS="SafeWork$(generate_password 20)Registry@"
    
    # 토큰 생성
    WATCHTOWER_TOKEN=$(generate_token "wt" 24)
    
    log_success "모든 보안 인증 정보가 생성되었습니다."
    
    # .env 파일 업데이트
    sed -i.bak \
        -e "s|MYSQL_ROOT_PASSWORD=.*|MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASS|" \
        -e "s|MYSQL_PASSWORD=.*|MYSQL_PASSWORD=$MYSQL_USER_PASS|" \
        -e "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=$REDIS_PASS|" \
        -e "s|SECRET_KEY=.*|SECRET_KEY=$SECRET_KEY|" \
        -e "s|ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$ADMIN_PASS|" \
        -e "s|REGISTRY_PASSWORD=.*|REGISTRY_PASSWORD=$REGISTRY_PASS|" \
        -e "s|WATCHTOWER_HTTP_API_TOKEN=.*|WATCHTOWER_HTTP_API_TOKEN=$WATCHTOWER_TOKEN|" \
        "$ENV_FILE"
    
    log_success ".env 파일이 보안 강화된 인증정보로 업데이트되었습니다."
}

# GitHub Secrets 업데이트 가이드 생성
generate_github_secrets_guide() {
    log "📋 GitHub Secrets 업데이트 가이드 생성 중..."
    
    # 현재 .env에서 값들 읽기
    source "$ENV_FILE"
    
    cat << EOF > "$PROJECT_ROOT/docs/github-secrets-update.md"
# GitHub Secrets 업데이트 가이드

## 🔑 필수 업데이트 항목

### 1. Repository Settings → Secrets and variables → Actions

다음 항목들을 업데이트하세요:

\`\`\`bash
# 인프라 인증 정보
REGISTRY_PASSWORD: $REGISTRY_PASSWORD
WATCHTOWER_HTTP_API_TOKEN: $WATCHTOWER_TOKEN

# AI 자동화 토큰 (수동 설정 필요)
CLAUDE_CODE_OAUTH_TOKEN: [Claude Code 터미널에서 /install-github-app 실행]
SLACK_BOT_TOKEN: [Slack App 설정에서 Bot Token 복사]
\`\`\`

### 2. 환경변수 동기화 검증

\`\`\`bash
# 현재 설정된 값들 확인
echo "MySQL Root Password: $MYSQL_ROOT_PASS"
echo "Registry Password: $REGISTRY_PASS"
echo "Watchtower Token: $WATCHTOWER_TOKEN"
\`\`\`

### 3. 배포 후 검증 명령어

\`\`\`bash
# Docker Compose 재시작
docker-compose down
docker-compose up -d

# 서비스 상태 확인
docker-compose ps
curl -s http://localhost:4545/health
\`\`\`

## 📊 보안 체크리스트

- [x] 모든 패스워드가 24자 이상으로 설정됨
- [x] 특수문자, 대소문자, 숫자 조합 사용
- [ ] GitHub 2FA 활성화 
- [ ] Docker Registry 2FA 설정
- [ ] Slack Bot 권한 최소화
- [ ] Watchtower API 접근 제한

---
*생성 시간: $(date '+%Y-%m-%d %H:%M:%S KST')*
EOF

    log_success "GitHub Secrets 업데이트 가이드가 생성되었습니다: docs/github-secrets-update.md"
}

# Docker Compose 설정 검증
validate_docker_compose() {
    log "🐳 Docker Compose 설정 검증 중..."
    
    # docker-compose.yml 문법 검증
    if docker-compose config > /dev/null 2>&1; then
        log_success "Docker Compose 설정 문법이 유효합니다."
    else
        log_error "Docker Compose 설정에 오류가 있습니다."
        docker-compose config
        return 1
    fi
    
    # 환경변수 로딩 테스트
    if docker-compose config | grep -q "MYSQL_ROOT_PASSWORD"; then
        log_success "환경변수가 올바르게 로드되었습니다."
    else
        log_error "환경변수 로딩에 문제가 있습니다."
        return 1
    fi
}

# 2FA 설정 가이드 생성
generate_2fa_guide() {
    log "🔐 2단계 인증(2FA) 설정 가이드 생성 중..."
    
    cat << 'EOF' > "$PROJECT_ROOT/docs/2fa-setup-guide.md"
# 2단계 인증(2FA) 설정 가이드

## 🔐 GitHub 2FA 설정

1. **GitHub 계정 설정**
   - GitHub.com → Settings → Password and authentication
   - Two-factor authentication → Enable two-factor authentication
   - Authenticator app (Google Authenticator, Authy 추천)

2. **Personal Access Token 생성**
   ```bash
   # 2FA 활성화 후 PAT 필요
   # Settings → Developer settings → Personal access tokens
   # Scopes: repo, workflow, admin:org
   ```

## 🐳 Docker Registry 2FA

1. **registry.jclee.me 2FA 활성화**
   - Registry 관리 페이지 접속
   - Security → Two-Factor Authentication
   - TOTP 앱 연동

2. **API Key 생성**
   ```bash
   # 2FA 후 API Key 사용 권장
   # Username: admin
   # API Key: [registry에서 생성]
   ```

## 📱 Slack 보안 강화

1. **Slack Workspace 2FA**
   - Workspace Settings → Security
   - Two-factor authentication → Required for all members

2. **Bot Token 권한 최소화**
   ```bash
   # 필요한 권한만 부여
   Scopes:
   - chat:write (메시지 전송)
   - channels:read (채널 읽기)
   - files:write (파일 업로드)
   ```

## 🔒 보안 모니터링 설정

1. **실패한 로그인 알림**
   ```bash
   # GitHub → Settings → Security log
   # 비정상적 활동 모니터링 활성화
   ```

2. **API 사용량 모니터링**
   ```bash
   # Docker Registry API 호출량 추적
   # Slack Bot API 사용량 모니터링
   ```

## ✅ 체크리스트

- [ ] GitHub 계정 2FA 활성화
- [ ] GitHub PAT 생성 및 GitHub Secrets 업데이트
- [ ] Docker Registry 2FA 설정
- [ ] Slack Workspace 2FA 활성화
- [ ] Bot Token 권한 최소화
- [ ] 모든 서비스 보안 로그 모니터링 활성화
- [ ] 정기적 토큰 순환 일정 수립 (30-90일)

## 🚨 응급 복구 절차

1. **토큰 분실시**
   ```bash
   # GitHub Recovery Codes 사용
   # Docker Registry Admin 계정으로 복구
   # Slack Workspace Owner 권한으로 Bot 재생성
   ```

2. **서비스 복구**
   ```bash
   # 임시 토큰으로 서비스 재시작
   # 새 토큰 생성 후 업데이트
   # 모든 의존 서비스 연결 확인
   ```
EOF

    log_success "2FA 설정 가이드가 생성되었습니다: docs/2fa-setup-guide.md"
}

# 보안 상태 검증
security_health_check() {
    log "🔍 보안 상태 종합 검증 중..."
    
    echo "===================="
    echo "📊 SafeWork 보안 현황"
    echo "===================="
    
    # .env 파일 존재 확인
    if [[ -f "$ENV_FILE" ]]; then
        log_success ".env 파일이 존재합니다."
    else
        log_error ".env 파일이 없습니다."
    fi
    
    # 패스워드 복잡도 검증
    if grep -q "SafeWork.*@" "$ENV_FILE" 2>/dev/null; then
        log_success "강화된 패스워드가 설정되어 있습니다."
    else
        log_warning "기본 패스워드가 감지되었습니다. 보안 강화가 필요합니다."
    fi
    
    # Docker Compose 서비스 확인
    if command -v docker-compose >/dev/null 2>&1; then
        log_success "Docker Compose가 설치되어 있습니다."
    else
        log_error "Docker Compose가 설치되지 않았습니다."
    fi
    
    # GitHub CLI 확인
    if command -v gh >/dev/null 2>&1; then
        log_success "GitHub CLI가 설치되어 있습니다."
        if gh auth status >/dev/null 2>&1; then
            log_success "GitHub CLI 인증이 완료되었습니다."
        else
            log_warning "GitHub CLI 인증이 필요합니다."
        fi
    else
        log_error "GitHub CLI가 설치되지 않았습니다."
    fi
    
    echo "===================="
    echo "📋 다음 단계 권장사항"
    echo "===================="
    echo "1. GitHub Secrets 업데이트: docs/github-secrets-update.md 참조"
    echo "2. 2FA 설정: docs/2fa-setup-guide.md 참조" 
    echo "3. Docker Compose 재시작: docker-compose down && docker-compose up -d"
    echo "4. 서비스 상태 확인: curl -s http://localhost:4545/health"
}

# 메인 실행 함수
main() {
    log "🚀 SafeWork 보안 강화 설정 시작"
    
    # 실행 전 확인
    read -p "보안 강화 설정을 시작하시겠습니까? 기존 .env 파일은 백업됩니다. (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log "사용자가 취소했습니다."
        exit 0
    fi
    
    # 단계별 실행
    initialize_env_file
    generate_secure_credentials
    generate_github_secrets_guide
    generate_2fa_guide
    validate_docker_compose
    security_health_check
    
    log_success "🎉 SafeWork 보안 강화 설정이 완료되었습니다!"
    log "📝 생성된 문서들을 확인하고 GitHub Secrets를 업데이트하세요."
}

# 스크립트 실행
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi