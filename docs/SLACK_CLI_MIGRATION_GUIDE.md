# Slack CLI 마이그레이션 가이드

SafeWork Slack 통합을 Webhook 방식에서 Slack CLI 기반 앱으로 마이그레이션하는 가이드입니다.

## 📋 목차

1. [마이그레이션 개요](#마이그레이션-개요)
2. [Slack CLI 설치](#slack-cli-설치)
3. [앱 개발 및 테스트](#앱-개발-및-테스트)
4. [프로덕션 배포](#프로덕션-배포)
5. [GitHub Actions 통합](#github-actions-통합)
6. [Webhook 방식과 비교](#webhook-방식과-비교)

## 마이그레이션 개요

### 🎯 마이그레이션 목표

- **기존**: Incoming Webhook을 사용한 단방향 알림
- **신규**: Slack CLI + Deno를 사용한 양방향 통합 앱
  - Functions: 재사용 가능한 알림 로직
  - Workflows: 복잡한 알림 흐름 관리
  - Triggers: 다양한 이벤트 소스 지원

### ✨ 주요 이점

| 기능 | Webhook 방식 | Slack CLI 방식 |
|-----|-------------|--------------|
| **알림 전송** | ✅ 가능 | ✅ 가능 |
| **양방향 통신** | ❌ 불가능 | ✅ 가능 (버튼, 폼) |
| **워크플로우** | ❌ 없음 | ✅ 복잡한 흐름 관리 |
| **재사용성** | ❌ 낮음 | ✅ Function 재사용 |
| **타입 안전성** | ❌ 없음 | ✅ TypeScript |
| **로컬 테스트** | ❌ 어려움 | ✅ `slack run` |
| **버전 관리** | ❌ 어려움 | ✅ Git 기반 |
| **슬래시 커맨드** | ❌ 불가능 | ✅ 가능 |

## Slack CLI 설치

### 1. Slack CLI 설치

```bash
# macOS (Homebrew)
brew install --cask slack-cli

# Linux
curl -fsSL https://downloads.slack-edge.com/slack-cli/install.sh | bash

# Windows (PowerShell)
irm https://downloads.slack-edge.com/slack-cli/install.ps1 | iex
```

### 2. 설치 확인

```bash
slack --version
# Expected: v3.8.1 or higher
```

### 3. Slack 워크스페이스 인증

```bash
slack auth login
```

브라우저에서 Slack 워크스페이스 선택 후 권한 승인.

## 앱 개발 및 테스트

### 1. 프로젝트 구조 확인

```bash
cd /home/jclee/app/safework/slack-app
tree -L 2
```

```
slack-app/
├── manifest.ts                    # 메인 매니페스트 (TypeScript)
├── manifest.json                  # 레거시 JSON 매니페스트
├── slack.json                     # Slack CLI 설정
├── deno.json                      # Deno 설정
├── import_map.json                # Import map
├── README.md                      # 사용 가이드
├── functions/                     # Slack Functions
│   ├── send_deployment_notification.ts
│   ├── send_error_notification.ts
│   ├── send_security_alert.ts
│   └── send_test_result.ts
└── workflows/                     # Slack Workflows
    ├── deployment_workflow.ts
    ├── error_monitoring_workflow.ts
    └── security_monitoring_workflow.ts
```

### 2. 로컬 개발 서버 실행

```bash
cd slack-app
slack run
```

출력 예시:
```
? Choose a local development workspace:
  Your Company Workspace (T01234567)

✓ Connected to workspace

📱 SafeWork Notifier is running
   Logs: http://localhost:3000
   Functions: 4
   Workflows: 3
```

### 3. Function 테스트

개별 Function을 테스트할 수 있습니다:

```bash
# Deployment notification 테스트
slack function run send_deployment_notification

# 대화형 프롬프트에서 입력값 제공:
? channel: C123456789
? success: true
? environment: production
? version: abc1234
? deployer: github-actions
? duration: 45
? url: https://safework.jclee.me
```

### 4. Workflow 테스트

```bash
# Deployment workflow 전체 테스트
slack workflow run deployment_workflow

# 입력값 제공 후 각 step 실행 확인
```

### 5. 타입 체크

```bash
# 전체 타입 체크
deno check manifest.ts

# 특정 파일 체크
deno check functions/send_deployment_notification.ts
deno check workflows/deployment_workflow.ts
```

## 프로덕션 배포

### 1. 앱 배포

```bash
cd slack-app
slack deploy
```

배포 과정:
```
📦 Building SafeWork Notifier...
✓ Functions compiled (4)
✓ Workflows compiled (3)
✓ Manifest validated

🚀 Deploying to production...
✓ Deployed successfully

📱 Install the app in your workspace:
   https://slack.com/apps/A123456789
```

### 2. 워크스페이스에 앱 설치

1. 배포 후 제공된 URL 방문
2. "Install to Workspace" 클릭
3. 권한 승인 (OAuth Scopes):
   - `commands`
   - `chat:write`
   - `chat:write.public`
   - `channels:read`
   - `channels:history`
   - `users:read`

### 3. Workflow Trigger 생성

Slack에서 각 워크플로우에 대한 Webhook Trigger를 생성합니다:

#### 방법 1: Slack UI에서 생성

1. Slack 워크스페이스 → **Workflow Builder** 열기
2. **SafeWork Notifier** 앱 선택
3. 각 워크플로우에 대해:
   - **Deployment Workflow** → "Create Trigger" → "Webhook"
   - **Error Monitoring Workflow** → "Create Trigger" → "Webhook"
   - **Security Monitoring Workflow** → "Create Trigger" → "Webhook"
4. 생성된 Webhook URL을 복사

#### 방법 2: Slack CLI로 생성

```bash
# Deployment workflow trigger
slack trigger create --workflow deployment_workflow

# Error monitoring workflow trigger
slack trigger create --workflow error_monitoring_workflow

# Security monitoring workflow trigger
slack trigger create --workflow security_monitoring_workflow
```

Webhook URL 예시:
```
https://hooks.slack.com/triggers/T01234567/5678901234567/abc123def456
```

### 4. Webhook URL 저장

생성된 3개의 Webhook URL을 안전하게 저장:

1. **GitHub Secrets**에 저장 (CI/CD용)
2. **Cloudflare Workers Secrets**에 저장 (런타임용)
3. **비밀 관리 시스템**에 백업

## GitHub Actions 통합

### 1. GitHub Secrets 설정

GitHub 리포지토리 → Settings → Secrets → Actions:

```bash
# Workflow별 Webhook URL
SLACK_DEPLOYMENT_WEBHOOK=https://hooks.slack.com/triggers/.../deployment
SLACK_ERROR_WEBHOOK=https://hooks.slack.com/triggers/.../error
SLACK_SECURITY_WEBHOOK=https://hooks.slack.com/triggers/.../security

# 기본 채널 ID (optional)
SLACK_CHANNEL_ID=C123456789
```

### 2. GitHub Actions Workflow 업데이트

`.github/workflows/cloudflare-workers-deployment.yml`:

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [master]
    paths:
      - 'workers/**'

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: workers
        run: npm ci

      - name: Run tests
        id: test
        working-directory: workers
        run: |
          npm test > test-output.txt 2>&1 || true
          cat test-output.txt

          # Extract test results
          TOTAL=$(grep -oP '\d+(?= tests?)' test-output.txt | head -1 || echo "0")
          PASSED=$(grep -oP '\d+(?= passed)' test-output.txt | head -1 || echo "0")
          FAILED=$(grep -oP '\d+(?= failed)' test-output.txt | head -1 || echo "0")

          echo "total=$TOTAL" >> $GITHUB_OUTPUT
          echo "passed=$PASSED" >> $GITHUB_OUTPUT
          echo "failed=$FAILED" >> $GITHUB_OUTPUT

      - name: 📢 Slack - Test Results
        if: always()
        run: |
          curl -X POST "${{ secrets.SLACK_DEPLOYMENT_WEBHOOK }}" \
            -H "Content-Type: application/json" \
            -d '{
              "channel": "${{ secrets.SLACK_CHANNEL_ID }}",
              "deployment_success": ${{ steps.test.outcome == 'success' }},
              "environment": "production",
              "version": "${{ github.sha }}",
              "deployer": "${{ github.actor }}",
              "duration": 0,
              "url": "https://safework.jclee.me",
              "test_total": ${{ steps.test.outputs.total }},
              "test_passed": ${{ steps.test.outputs.passed }},
              "test_failed": ${{ steps.test.outputs.failed }},
              "test_coverage": 3.95
            }'

      - name: Deploy to Cloudflare Workers
        id: deploy
        working-directory: workers
        run: |
          START_TIME=$(date +%s)
          npx wrangler deploy --env production
          END_TIME=$(date +%s)
          DURATION=$((END_TIME - START_TIME))
          echo "duration=$DURATION" >> $GITHUB_OUTPUT
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: 📢 Slack - Deployment Success
        if: success()
        run: |
          curl -X POST "${{ secrets.SLACK_DEPLOYMENT_WEBHOOK }}" \
            -H "Content-Type: application/json" \
            -d '{
              "channel": "${{ secrets.SLACK_CHANNEL_ID }}",
              "deployment_success": true,
              "environment": "production",
              "version": "${{ github.sha }}",
              "deployer": "${{ github.actor }}",
              "duration": ${{ steps.deploy.outputs.duration }},
              "url": "https://safework.jclee.me",
              "test_total": ${{ steps.test.outputs.total }},
              "test_passed": ${{ steps.test.outputs.passed }},
              "test_failed": ${{ steps.test.outputs.failed }},
              "test_coverage": 3.95
            }'

      - name: 📢 Slack - Deployment Failed
        if: failure()
        run: |
          curl -X POST "${{ secrets.SLACK_DEPLOYMENT_WEBHOOK }}" \
            -H "Content-Type: application/json" \
            -d '{
              "channel": "${{ secrets.SLACK_CHANNEL_ID }}",
              "deployment_success": false,
              "environment": "production",
              "version": "${{ github.sha }}",
              "deployer": "${{ github.actor }}",
              "duration": ${{ steps.deploy.outputs.duration || 0 }},
              "url": "https://safework.jclee.me",
              "error_message": "Deployment failed. Check GitHub Actions logs for details."
            }'
```

## Webhook 방식과 비교

### 이전 방식 (Incoming Webhook)

**장점:**
- ✅ 간단한 설정
- ✅ 빠른 구현

**단점:**
- ❌ 단방향 통신만 가능
- ❌ 복잡한 로직 구현 어려움
- ❌ 타입 안전성 없음
- ❌ 로컬 테스트 어려움
- ❌ 재사용성 낮음

**코드 예시:**

```typescript
// workers/src/utils/slack-client.ts
export async function sendSlackWebhook(
  webhookUrl: string,
  message: SlackMessage
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to send Slack webhook:', error);
    return false;
  }
}
```

### 신규 방식 (Slack CLI App)

**장점:**
- ✅ 양방향 통신 (버튼, 폼)
- ✅ 워크플로우 관리
- ✅ TypeScript 타입 안전성
- ✅ 로컬 테스트 (`slack run`)
- ✅ Function 재사용
- ✅ 슬래시 커맨드 지원
- ✅ Git 기반 버전 관리

**단점:**
- ⚠️ 초기 설정 복잡
- ⚠️ Slack CLI 학습 필요
- ⚠️ Deno 런타임 의존성

**코드 예시:**

```typescript
// slack-app/functions/send_deployment_notification.ts
export const SendDeploymentNotificationFunction = DefineFunction({
  callback_id: "send_deployment_notification",
  title: "Send Deployment Notification",
  input_parameters: {
    properties: {
      channel: { type: Schema.slack.types.channel_id },
      success: { type: Schema.types.boolean },
      environment: { type: Schema.types.string },
      // ... 타입 안전한 파라미터 정의
    },
    required: ["channel", "success", "environment"],
  },
  // ... 핸들러 구현
});
```

## 마이그레이션 체크리스트

### Phase 1: 준비 (완료됨 ✅)

- [x] Slack CLI 설치 확인 (v3.8.1)
- [x] Deno 설치 확인 (v2.5.4)
- [x] Slack 워크스페이스 인증
- [x] Functions 구현 (4개)
- [x] Workflows 구현 (3개)
- [x] Manifest 작성

### Phase 2: 로컬 테스트

- [ ] `slack run`으로 로컬 서버 실행
- [ ] 각 Function 개별 테스트
- [ ] Workflow 전체 흐름 테스트
- [ ] 타입 체크 (`deno check`)
- [ ] 오류 수정

### Phase 3: 프로덕션 배포

- [ ] `slack deploy` 실행
- [ ] 워크스페이스에 앱 설치
- [ ] Workflow Webhook Triggers 생성
- [ ] Webhook URL 저장 (GitHub Secrets)
- [ ] GitHub Actions 워크플로우 업데이트

### Phase 4: 검증

- [ ] GitHub Actions에서 테스트 결과 알림 수신
- [ ] 배포 성공/실패 알림 수신
- [ ] 에러 알림 수신 (의도적 에러 발생)
- [ ] 보안 알림 수신 (테스트)
- [ ] 모든 Slack 메시지 포맷 확인

### Phase 5: 레거시 제거

- [ ] Incoming Webhook 방식 코드 제거
- [ ] `workers/src/utils/slack-client.ts` 아카이브
- [ ] `workers/src/middleware/slack-notifications.ts` 아카이브
- [ ] `docs/SLACK_INTEGRATION_GUIDE.md` 아카이브
- [ ] 환경 변수 정리 (SLACK_WEBHOOK_URL 제거)

## 트러블슈팅

### 1. `slack run` 실행 시 오류

**증상:**
```
Error: Failed to start local development server
```

**해결:**
```bash
# Deno 캐시 클리어
rm -rf ~/.cache/deno

# Slack CLI 재인증
slack auth logout
slack auth login

# 다시 실행
slack run
```

### 2. Workflow Trigger 생성 실패

**증상:**
```
Error: Workflow not found
```

**해결:**
1. 앱이 배포되었는지 확인: `slack apps list`
2. 워크스페이스에 설치되었는지 확인
3. Workflow ID 확인: `slack workflow list`

### 3. GitHub Actions에서 Webhook 호출 실패

**증상:**
```
curl: (22) The requested URL returned error: 404
```

**해결:**
1. Webhook URL이 올바른지 확인 (만료되었을 수 있음)
2. Trigger 재생성: `slack trigger create`
3. GitHub Secrets 업데이트

### 4. Deno 타입 오류

**증상:**
```
error: TS2307: Cannot find module 'deno-slack-sdk/mod.ts'
```

**해결:**
```bash
# Import map 확인
cat import_map.json

# Deno 캐시 재생성
deno cache --reload manifest.ts
```

## 다음 단계

1. **로컬 테스트 완료** → Phase 2 체크리스트 항목 완료
2. **프로덕션 배포** → Slack 워크스페이스에 앱 배포
3. **GitHub Actions 통합** → CI/CD 파이프라인 업데이트
4. **레거시 제거** → Webhook 방식 코드 아카이브
5. **문서화** → 사용 가이드 작성 완료

## 참고 자료

- [Slack CLI 공식 문서](https://api.slack.com/automation/cli)
- [Deno Slack SDK](https://deno.land/x/deno_slack_sdk)
- [Slack Functions 가이드](https://api.slack.com/automation/functions)
- [Slack Workflows 가이드](https://api.slack.com/workflows)
- [SafeWork GitHub 리포지토리](https://github.com/qws941/safework)

---

**작성일**: 2025-10-22
**작성자**: Claude Code
**버전**: 1.0
