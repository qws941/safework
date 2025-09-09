# GitHub Secrets 인증정보 고도화 가이드

## 현재 사용 중인 GitHub Secrets

### 🔑 필수 Secrets (배포 관련)
1. **`REGISTRY_PASSWORD`** 
   - **용도**: Docker registry.jclee.me 접근 인증
   - **사용 위치**: main_deploy.yml, performance-monitoring.yml, security-monitoring.yml
   - **값**: `bingogo1`
   - **보안 등급**: P1-HIGH

2. **`WATCHTOWER_HTTP_API_TOKEN`**
   - **용도**: Watchtower API 호출을 통한 자동 배포 트리거
   - **사용 위치**: main_deploy.yml
   - **값**: `wt_k8Jm4nX9pL2vQ7rB5sT6yH3fG1dA0`
   - **보안 등급**: P0-CRITICAL

### 🤖 AI 자동화 Secrets
3. **`CLAUDE_CODE_OAUTH_TOKEN`**
   - **용도**: Claude Code Action v1 OAuth 인증
   - **사용 위치**: claude-code-action.yml, main_deploy.yml
   - **설정 방법**: Claude Code 터미널에서 `/install-github-app` 실행
   - **보안 등급**: P0-CRITICAL

4. **`SLACK_BOT_TOKEN`**
   - **용도**: Slack 알림 전송 (safework-alerts 채널)
   - **사용 위치**: performance-monitoring.yml, security-monitoring.yml
   - **형식**: `xoxb-*` 형태의 Bot Token
   - **보안 등급**: P2-MEDIUM

### 🔧 시스템 기본 Secrets
5. **`GITHUB_TOKEN`**
   - **용도**: GitHub Actions 기본 토큰 (자동 제공)
   - **사용 위치**: claude-code-review.yml
   - **관리**: GitHub에서 자동 생성/관리
   - **보안 등급**: 시스템 관리

## 🚨 보안 고도화 요구사항

### 즉시 적용 필요
- [ ] **Registry 패스워드 변경**: `bingogo1` → 복잡한 패스워드로 교체
- [ ] **Watchtower API 토큰 순환**: 주기적 토큰 갱신 정책 수립
- [ ] **Slack Bot Token 검증**: 권한 최소화 및 만료일 확인

### 2-Factor 인증 강화
- [ ] **GitHub 계정 2FA**: TOTP 앱 또는 보안 키 사용
- [ ] **Docker Registry 2FA**: registry.jclee.me에 2FA 적용
- [ ] **Slack Workspace 2FA**: Bot 토큰 접근 강화

## 🔒 권장 보안 설정

### 1. GitHub Repository Settings
```yaml
# 보안 설정 권장사항
Security:
  - Vulnerability alerts: ✅ 활성화
  - Dependabot alerts: ✅ 활성화  
  - Code scanning alerts: ✅ 활성화
  - Secret scanning alerts: ✅ 활성화

Branch Protection Rules (master):
  - Require status checks: ✅
  - Require branches to be up to date: ✅
  - Restrict pushes that create files: ✅
```

### 2. Secrets 관리 정책
```bash
# 토큰 순환 주기
CLAUDE_CODE_OAUTH_TOKEN: 90일마다 갱신
WATCHTOWER_HTTP_API_TOKEN: 30일마다 갱신
SLACK_BOT_TOKEN: 180일마다 갱신
REGISTRY_PASSWORD: 60일마다 갱신

# 접근 제한
- 최소 권한 원칙 적용
- IP 화이트리스트 설정 (가능한 경우)
- API 호출 레이트 리미팅
```

### 3. 모니터링 및 알림
```yaml
# 보안 이벤트 모니터링
Events:
  - 인증 실패 시도
  - 비정상적인 API 호출 패턴
  - 토큰 사용량 급증
  - 새로운 IP에서의 접근

Notifications:
  - Slack #safework-alerts 채널
  - 이메일 알림 (critical 등급)
  - GitHub Issues 자동 생성
```

## 🛠️ 즉시 실행 가능한 보안 강화 스크립트

### Registry 패스워드 강화
```bash
#!/bin/bash
# generate-secure-password.sh

# 32자 복잡한 패스워드 생성
NEW_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
echo "새로운 Registry 패스워드: $NEW_PASSWORD"

# GitHub Secrets 업데이트 명령어 출력
echo ""
echo "GitHub에서 다음과 같이 업데이트하세요:"
echo "1. Repository Settings → Secrets and variables → Actions"
echo "2. REGISTRY_PASSWORD → Update"
echo "3. 새 값: $NEW_PASSWORD"
```

### Watchtower API 토큰 갱신
```bash
#!/bin/bash
# rotate-watchtower-token.sh

# 새로운 API 토큰 생성 (예시)
NEW_TOKEN="wt_$(openssl rand -hex 16)"
echo "새로운 Watchtower API 토큰: $NEW_TOKEN"

# Watchtower 서버에 새 토큰 등록 필요
echo "Watchtower 설정에서 새 토큰으로 업데이트 필요"
```

## 📋 체크리스트: 인증정보 고도화

### Phase 1: 즉시 적용 (P0-CRITICAL)
- [ ] GitHub 계정 2FA 활성화
- [ ] CLAUDE_CODE_OAUTH_TOKEN 유효성 확인
- [ ] WATCHTOWER_HTTP_API_TOKEN 액세스 테스트
- [ ] REGISTRY_PASSWORD 복잡도 강화

### Phase 2: 중기 적용 (P1-HIGH)
- [ ] 모든 토큰 순환 일정 수립
- [ ] Slack Bot 권한 최소화
- [ ] IP 화이트리스트 적용 (가능 서비스)
- [ ] 보안 모니터링 강화

### Phase 3: 장기 적용 (P2-MEDIUM)  
- [ ] Zero-trust 아키텍처 도입
- [ ] 암호화 키 관리 시스템 구축
- [ ] 자동 보안 감사 시스템
- [ ] 침입 탐지 및 대응 체계

## 🚀 자동화된 보안 검증

```bash
# secrets-health-check.sh
#!/bin/bash

echo "🔍 GitHub Secrets 상태 검증..."

# 필수 secrets 존재 여부 확인
REQUIRED_SECRETS=(
    "CLAUDE_CODE_OAUTH_TOKEN"
    "REGISTRY_PASSWORD" 
    "WATCHTOWER_HTTP_API_TOKEN"
    "SLACK_BOT_TOKEN"
)

for secret in "${REQUIRED_SECRETS[@]}"; do
    if gh secret list | grep -q "$secret"; then
        echo "✅ $secret: 존재함"
    else
        echo "❌ $secret: 누락 - 즉시 설정 필요"
    fi
done

echo ""
echo "🔐 보안 강화 권장사항:"
echo "1. 모든 패스워드를 복잡한 문자열로 변경"
echo "2. 토큰 만료일 설정 및 순환 정책 수립"
echo "3. 2FA 활성화 및 접근 제한 강화"
```