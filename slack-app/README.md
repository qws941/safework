# SafeWork Slack Notifier

SafeWork 산업안전보건 관리 시스템을 위한 Slack 통합 알림 봇입니다.

## 📋 기능

### 알림 타입

1. **배포 알림** (`send_deployment_notification`)
   - 배포 성공/실패 상태
   - 환경, 버전, 배포자 정보
   - 소요 시간 및 URL
   - Health check 통과 여부

2. **에러 알림** (`send_error_notification`)
   - 에러 심각도 (critical, warning, info)
   - 에러 메시지 및 스택 트레이스
   - HTTP 상태 코드, 경로, 메소드
   - 클라이언트 IP 및 User Agent

3. **보안 알림** (`send_security_alert`)
   - 보안 이벤트 유형
   - 심각도 레벨 (critical, high, medium, low)
   - 소스 IP 및 사용자 정보
   - 취해진 조치 사항

4. **테스트 결과** (`send_test_result`)
   - 전체/성공/실패 테스트 수
   - 코드 커버리지
   - Git 커밋 정보
   - 실패한 테스트 상세 정보

### 워크플로우

1. **배포 워크플로우** (`deployment_workflow`)
   - 테스트 결과 알림 → 배포 결과 알림

2. **에러 모니터링 워크플로우** (`error_monitoring_workflow`)
   - 프로덕션 에러 실시간 모니터링

3. **보안 모니터링 워크플로우** (`security_monitoring_workflow`)
   - 보안 이벤트 실시간 모니터링

## 🚀 설치 및 배포

### 1. Slack CLI 설치 확인

```bash
slack --version
# v3.8.1 이상 필요
```

### 2. 로컬 개발 서버 실행

```bash
cd slack-app
slack run
```

브라우저에서 자동으로 Slack 워크스페이스 연결 페이지가 열립니다.

### 3. 프로덕션 배포

```bash
cd slack-app
slack deploy
```

배포 후 워크스페이스에 앱을 설치하라는 메시지가 표시됩니다.

### 4. 워크플로우 트리거 설정

배포 후 Slack 워크스페이스에서:
1. 앱 설정 → Workflow Builder
2. 트리거 생성 (Webhook URL 생성)
3. Webhook URL을 GitHub Actions Secrets에 저장

## 🔧 GitHub Actions 통합

### Secrets 설정

GitHub 리포지토리 Settings → Secrets에 다음 추가:

```bash
SLACK_DEPLOYMENT_WEBHOOK=<deployment_workflow webhook URL>
SLACK_ERROR_WEBHOOK=<error_monitoring_workflow webhook URL>
SLACK_SECURITY_WEBHOOK=<security_monitoring_workflow webhook URL>
```

### GitHub Actions 예시

```yaml
- name: 📢 Slack - Deployment Success
  if: success()
  run: |
    curl -X POST "${{ secrets.SLACK_DEPLOYMENT_WEBHOOK }}" \
      -H "Content-Type: application/json" \
      -d '{
        "channel": "C123456789",
        "deployment_success": true,
        "environment": "production",
        "version": "${{ github.sha }}",
        "deployer": "${{ github.actor }}",
        "duration": 45,
        "url": "https://safework.jclee.me"
      }'
```

## 📦 파일 구조

```
slack-app/
├── manifest.ts                    # 앱 매니페스트 (메인)
├── manifest.json                  # 레거시 JSON 매니페스트
├── slack.json                     # Slack CLI 설정
├── deno.json                      # Deno 설정
├── import_map.json                # Import map
├── README.md                      # 이 파일
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

## 🧪 로컬 테스트

### Function 테스트

```bash
# Deployment notification 테스트
slack function run send_deployment_notification

# Error notification 테스트
slack function run send_error_notification

# Security alert 테스트
slack function run send_security_alert

# Test result 테스트
slack function run send_test_result
```

### Workflow 테스트

```bash
# Deployment workflow 테스트
slack workflow run deployment_workflow

# Error monitoring workflow 테스트
slack workflow run error_monitoring_workflow

# Security monitoring workflow 테스트
slack workflow run security_monitoring_workflow
```

## 📝 사용 예시

### 1. Cloudflare Workers에서 에러 알림

```typescript
// workers/src/index.ts
import { Hono } from 'hono';

const app = new Hono<{ Bindings: Env }>();

app.onError(async (err, c) => {
  // Slack 에러 알림 전송
  const webhookUrl = c.env.SLACK_ERROR_WEBHOOK;
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'C123456789',
        severity: 'critical',
        error_message: err.message,
        path: c.req.path,
        method: c.req.method,
        status_code: 500,
        ip: c.req.header('CF-Connecting-IP'),
        stack_trace: err.stack,
      }),
    });
  }

  return c.json({ error: 'Internal Server Error' }, 500);
});
```

### 2. GitHub Actions에서 테스트 결과 알림

```yaml
- name: Run tests
  id: test
  run: npm test

- name: 📢 Slack - Test Results
  if: always()
  run: |
    curl -X POST "${{ secrets.SLACK_DEPLOYMENT_WEBHOOK }}" \
      -H "Content-Type: application/json" \
      -d '{
        "channel": "C123456789",
        "success": ${{ steps.test.outcome == 'success' }},
        "total_tests": 181,
        "passed_tests": 156,
        "failed_tests": 25,
        "coverage": 3.95,
        "commit_sha": "${{ github.sha }}",
        "branch": "${{ github.ref_name }}",
        "author": "${{ github.actor }}"
      }'
```

## 🔍 트러블슈팅

### 앱이 실행되지 않는 경우

```bash
# Deno 버전 확인 (1.37.0 이상)
deno --version

# 의존성 재설치
rm -rf ~/.cache/deno
slack run
```

### 워크플로우가 트리거되지 않는 경우

1. Slack 워크스페이스에서 앱이 설치되었는지 확인
2. Workflow Builder에서 트리거가 활성화되어 있는지 확인
3. Webhook URL이 올바른지 확인

### 권한 오류

앱 설정에서 필요한 OAuth Scopes 확인:
- `commands`
- `chat:write`
- `chat:write.public`
- `channels:read`
- `channels:history`
- `users:read`

## 📚 참고 자료

- [Slack CLI 공식 문서](https://api.slack.com/automation/cli)
- [Deno Slack SDK](https://deno.land/x/deno_slack_sdk)
- [Slack Workflow Builder](https://api.slack.com/workflows)
- [SafeWork 프로젝트](https://github.com/qws941/safework)

## 📄 라이선스

SafeWork 프로젝트와 동일한 라이선스를 따릅니다.
