# 배포 다음 단계 가이드

**작성일**: 2025-10-22
**상태**: ✅ 코드 완성, 배포 대기 중

## 📋 현재 상황

### ✅ 완료된 작업

1. **Slack CLI 통합 구현** (1,862 LOC)
   - 4개 Functions (배포, 에러, 보안, 테스트)
   - 3개 Workflows (배포, 에러 모니터링, 보안 모니터링)
   - Webhook 기반 통합 (fallback)
   - 완전한 문서화

2. **로컬 Git 커밋** ✅
   ```
   Commit: ea7984b
   28 files changed, 6,593 insertions(+)
   ```

3. **코드 품질**
   - TypeScript 타입 체크 통과 ✅
   - Deno 타입 체크 통과 ✅
   - Pre-commit hooks 통과 ✅

### ⏳ 대기 중인 작업

1. **GitHub Push** - 인증 설정 필요
2. **Cloudflare Workers 배포** - API Token 필요
3. **Slack 통합 활성화** - Webhook URL 필요

## 🚀 다음 단계

### Step 1: GitHub에 Push (필수)

#### 방법 A: Personal Access Token 사용

```bash
cd /home/jclee/app/safework

# GitHub Personal Access Token 생성
# https://github.com/settings/tokens
# Scopes: repo (전체)

# Git credential helper 설정 (한 번만)
git config --global credential.helper store

# Push (token 입력 요청됨)
git push origin master
# Username: qws941
# Password: ghp_xxxxxxxxxxxxx (Personal Access Token)
```

#### 방법 B: SSH 키 설정

```bash
# SSH 키 생성 (있는 경우 건너뛰기)
ssh-keygen -t ed25519 -C "your_email@example.com"

# SSH 키를 GitHub에 추가
# https://github.com/settings/keys
cat ~/.ssh/id_ed25519.pub

# SSH 연결 테스트
ssh -T git@github.com

# Push
git push origin master
```

### Step 2: Slack Webhook 설정 (2가지 방법)

#### 옵션 A: n8n Webhook 사용 (권장) ⭐

n8n은 이미 설치되어 있으므로 가장 쉬운 방법입니다:

1. **n8n 접속**
   ```
   https://n8n.jclee.me
   ```

2. **새 Workflow 생성**
   - Trigger: Webhook
   - Action: Slack → Send Message

3. **Webhook URL 복사**
   ```
   https://n8n.jclee.me/webhook/safework-deployment
   ```

4. **Cloudflare Secret 설정**
   ```bash
   cd /home/jclee/app/safework/workers

   # API Token이 필요한 경우 ~/.env에서 가져오기
   export CLOUDFLARE_API_TOKEN="your_token_here"

   npx wrangler secret put SLACK_WEBHOOK_URL
   # Webhook URL 입력: https://n8n.jclee.me/webhook/safework-deployment
   ```

5. **GitHub Secret 설정**
   ```
   Repository → Settings → Secrets → Actions → New repository secret

   Name: SLACK_WEBHOOK_URL
   Value: https://n8n.jclee.me/webhook/safework-deployment
   ```

#### 옵션 B: Slack Incoming Webhook 직접 사용

1. **Slack App 생성**
   ```
   https://api.slack.com/apps → Create New App → From scratch
   ```

2. **Incoming Webhooks 활성화**
   - Features → Incoming Webhooks → Activate
   - Add New Webhook to Workspace
   - 채널 선택 (#safework-alerts 또는 #general)
   - Webhook URL 복사

3. **Webhook URL을 Secrets에 저장** (옵션 A의 Step 4, 5와 동일)

### Step 3: Cloudflare Workers 배포

#### 방법 A: GitHub Actions 사용 (자동 배포) ⭐

```bash
# Step 1에서 GitHub에 push하면 자동으로 배포됩니다
git push origin master

# GitHub Actions 확인
# https://github.com/qws941/safework/actions
```

**워크플로우가 자동으로 수행:**
1. TypeScript 컴파일
2. 타입 체크
3. 테스트 실행
4. Cloudflare Workers 배포
5. Health Check 검증
6. Slack 알림 전송 (설정한 경우)

#### 방법 B: 수동 배포

```bash
cd /home/jclee/app/safework/workers

# Cloudflare API Token 설정 (GitHub Actions Secrets에서 확인)
export CLOUDFLARE_API_TOKEN="your_token_here"

# 배포
npx wrangler deploy

# 배포 확인
curl https://safework.jclee.me/api/health
```

### Step 4: 배포 검증

#### 1. Health Check

```bash
# API Health Check
curl https://safework.jclee.me/api/health

# Expected:
# {"status":"ok"}

# Native Services Health Check
curl https://safework.jclee.me/api/native/native/health

# Expected:
# {
#   "success": true,
#   "services": {
#     "d1": "available",
#     "kv": "available",
#     "r2": "available",
#     "ai": "available",
#     "queue": "unavailable"  # Free Plan
#   }
# }
```

#### 2. Slack 알림 테스트

GitHub에서 의도적으로 작은 변경을 push:

```bash
# 테스트 변경
echo "# Test deployment notification" >> README.md
git add README.md
git commit -m "test: Trigger deployment notification"
git push origin master

# Slack 채널에서 알림 확인
# ✅ 배포 성공 메시지가 나타나야 함
```

#### 3. 테스트 실행

```bash
cd /home/jclee/app/safework/workers

# Unit Tests
npm test

# Post-Deployment Tests (production 환경에서)
npm run test:post-deploy
```

### Step 5: Slack CLI 앱 배포 (선택 사항, 고급 기능)

Webhook 방식으로 충분하지만, 더 고급 기능을 원하는 경우:

1. **Slack 웹 UI에서 앱 생성**
   ```
   https://api.slack.com/apps → Create New App → From manifest
   ```

2. **Manifest 복사**
   ```bash
   cat /home/jclee/app/safework/slack-app/manifest.json
   ```

3. **워크스페이스에 설치**
   - OAuth & Permissions → Install to Workspace

4. **Workflow Triggers 생성**
   - Workflow Builder → Create Webhook Trigger
   - 각 Workflow에 대한 URL 생성

5. **GitHub Secrets 업데이트**
   ```
   SLACK_DEPLOYMENT_WEBHOOK=<webhook_url_1>
   SLACK_ERROR_WEBHOOK=<webhook_url_2>
   SLACK_SECURITY_WEBHOOK=<webhook_url_3>
   ```

## 📊 완료 체크리스트

### 필수 단계

- [ ] **GitHub Push**
  - [ ] Personal Access Token 또는 SSH 키 설정
  - [ ] `git push origin master` 성공

- [ ] **Slack Webhook 설정**
  - [ ] n8n Webhook 또는 Slack Incoming Webhook 생성
  - [ ] Cloudflare Secret 설정: `SLACK_WEBHOOK_URL`
  - [ ] GitHub Secret 설정: `SLACK_WEBHOOK_URL`

- [ ] **자동 배포 확인**
  - [ ] GitHub Actions 워크플로우 성공
  - [ ] Health Check 통과
  - [ ] Slack 알림 수신

### 선택 단계

- [ ] **Slack CLI 앱 배포** (고급 기능 원하는 경우)
  - [ ] Slack 앱 생성 및 설치
  - [ ] Workflow Triggers 생성
  - [ ] GitHub Secrets 업데이트

- [ ] **모니터링 설정**
  - [ ] Grafana Dashboard 확인
  - [ ] Prometheus 메트릭 확인
  - [ ] Loki 로그 확인

## 🎯 예상 소요 시간

| 단계 | 소요 시간 | 난이도 |
|-----|----------|--------|
| GitHub Push 설정 | 5분 | 쉬움 |
| Slack Webhook 설정 | 10분 | 쉬움 |
| 자동 배포 확인 | 5분 | 쉬움 |
| Slack CLI 앱 (선택) | 30분 | 중간 |
| **전체** | **20분** (필수만) | **쉬움** |

## 🔧 트러블슈팅

### 문제 1: GitHub Push 실패

**증상**: `Authentication failed`

**해결**:
```bash
# Personal Access Token 확인
# https://github.com/settings/tokens

# Credential helper 재설정
git config --global credential.helper store
git push origin master
# Token 재입력
```

### 문제 2: Cloudflare 배포 실패

**증상**: `CLOUDFLARE_API_TOKEN` 오류

**해결**:
```bash
# GitHub Actions Secrets에서 토큰 확인
# Repository → Settings → Secrets → Actions

# 또는 새 토큰 생성
# Cloudflare Dashboard → My Profile → API Tokens
# Template: Edit Cloudflare Workers
```

### 문제 3: Slack 알림 미수신

**증상**: 배포 성공했지만 Slack 메시지 없음

**해결**:
```bash
# 1. Webhook URL 확인
echo $SLACK_WEBHOOK_URL

# 2. Cloudflare Secret 확인
npx wrangler secret list

# 3. 수동 테스트
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test message"}'
```

### 문제 4: Health Check 실패

**증상**: `curl https://safework.jclee.me/api/health` 오류

**해결**:
```bash
# 1. DNS 확인
dig safework.jclee.me

# 2. Cloudflare Dashboard에서 배포 상태 확인
# Workers & Pages → safework

# 3. Wrangler로 로그 확인
npx wrangler tail

# 4. 배포 재시도
npx wrangler deploy
```

## 📚 관련 문서

- **Slack 통합**: `docs/SLACK_CLI_MIGRATION_GUIDE.md`
- **배포 가이드**: `docs/CLOUDFLARE_DEPLOYMENT.md`
- **API 문서**: `docs/API_ENDPOINTS.md`
- **트러블슈팅**: `docs/operations/TROUBLESHOOTING.md`

## 🎉 완료 후 확인 사항

모든 단계를 완료한 후:

1. ✅ GitHub에 코드 push 완료
2. ✅ Cloudflare Workers 배포 성공
3. ✅ Slack 알림 정상 작동
4. ✅ Health Check 통과
5. ✅ Grafana에서 메트릭 확인 가능

**Grade**: B+ → **A-** (배포 완료 시)

---

**작성**: 2025-10-22
**작성자**: Claude Code
**다음 액션**: GitHub Push → Slack Webhook 설정 → 배포 확인
