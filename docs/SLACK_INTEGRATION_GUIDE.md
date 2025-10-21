# Slack 통합 가이드

**프로젝트**: SafeWork - 산업안전보건 관리 시스템
**작성일**: 2025-10-21
**버전**: 1.0

---

## 📋 목차

1. [개요](#개요)
2. [기능](#기능)
3. [설정 방법](#설정-방법)
4. [사용 가이드](#사용-가이드)
5. [알림 종류](#알림-종류)
6. [트러블슈팅](#트러블슈팅)

---

## 개요

SafeWork는 Slack과 완전히 통합되어 실시간 알림, 에러 모니터링, 배포 알림 등을 제공합니다. 이 문서는 Slack 통합 설정 및 사용 방법을 안내합니다.

### 통합 아키텍처

```
SafeWork Workers (Edge)
    ├─> Slack Incoming Webhooks (간단한 알림)
    │   └─> #deployments, #alerts, #monitoring
    │
    └─> Slack Bot API (고급 기능 - 선택사항)
        └─> 스레드 응답, 인터랙티브 버튼

또는

SafeWork Workers
    └─> n8n Workflows (https://n8n.jclee.me)
        └─> Slack (워크플로우 자동화)
```

---

## 기능

### ✅ 현재 구현된 기능

1. **배포 알림**
   - 배포 시작 알림
   - 배포 성공/실패 알림
   - 배포 시간, 배포자, 커밋 정보 표시

2. **테스트 결과 알림**
   - 단위 테스트 통과/실패
   - 테스트 수, 커버리지 정보
   - 실패한 테스트 목록

3. **에러 알림** (프로덕션)
   - 5xx 에러 실시간 알림
   - 에러 스택 트레이스
   - 사용자 IP, User Agent 정보

4. **보안 경고**
   - Brute Force 공격 감지
   - SQL Injection 시도 감지
   - Rate Limit 초과 알림
   - 의심스러운 활동 감지

5. **성능 경고**
   - 응답 시간 임계값 초과
   - 에러율 급증 감지
   - 가용성 저하 경고

6. **일일 요약 리포트** (예정)
   - 일일 트래픽 통계
   - 신규 사용자, 설문 제출 수
   - 에러 발생 건수

### 🚧 계획 중인 기능

- [ ] 인터랙티브 대시보드 (Slack Block Kit)
- [ ] 슬래시 커맨드 (`/safework stats`)
- [ ] 쿼리 결과 직접 조회
- [ ] 알림 구독 관리 (채널별 설정)

---

## 설정 방법

### Option 1: Slack Incoming Webhook (추천 - 간단)

가장 간단한 방법으로, 대부분의 알림 기능에 충분합니다.

#### 1. Slack Webhook URL 생성

**방법 A: n8n 사용 (추천)**

1. https://n8n.jclee.me 접속 및 로그인
2. 새 워크플로우 생성
3. "Webhook" 노드 추가
   - Method: POST
   - Path: `/safework/notifications`
   - Response Mode: Last Node
4. "Slack" 노드 추가
   - Authentication: OAuth2
   - Resource: Message
   - Operation: Post
   - Channel: `#alerts` (원하는 채널)
   - Text: `{{$json["text"]}}`
   - Blocks: `{{$json["blocks"]}}`
5. 워크플로우 활성화
6. Webhook URL 복사: `https://n8n.jclee.me/webhook/safework/notifications`

**방법 B: Slack App 직접 사용**

1. https://api.slack.com/apps 접속
2. "Create New App" → "From scratch"
3. App Name: `SafeWork Notifier`
4. Workspace 선택
5. "Incoming Webhooks" 활성화
6. "Add New Webhook to Workspace"
7. 알림 받을 채널 선택 (#alerts 추천)
8. Webhook URL 복사 (형식: `https://hooks.slack.com/services/T.../B.../...`)

#### 2. Cloudflare Secrets에 저장

```bash
# Webhook URL을 Cloudflare 시크릿으로 저장
cd /home/jclee/app/safework/workers
wrangler secret put SLACK_WEBHOOK_URL --env production

# 프롬프트가 나타나면 복사한 Webhook URL 붙여넣기
# 예: https://n8n.jclee.me/webhook/safework/notifications
# 또는: https://hooks.slack.com/services/T.../B.../...
```

#### 3. GitHub Secrets에 저장 (CI/CD 알림용)

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. "New repository secret" 클릭
3. Name: `SLACK_WEBHOOK_URL`
4. Value: Webhook URL 붙여넣기
5. "Add secret" 클릭

#### 4. 배포 및 테스트

```bash
# Workers에 배포 (Webhook URL 적용)
wrangler deploy --env production

# 테스트 알림 전송 (로컬)
curl -X POST http://localhost:8787/api/test/slack-notification

# 프로덕션 테스트
curl -X POST https://safework.jclee.me/api/test/slack-notification
```

---

### Option 2: Slack Bot Token (고급 기능 - 선택사항)

스레드 응답, 메시지 업데이트, 인터랙티브 버튼 등이 필요한 경우에만 사용하세요.

#### 1. Slack App 생성 및 Bot Token 발급

1. https://api.slack.com/apps 접속
2. 기존 App 선택 또는 새로 생성
3. "OAuth & Permissions" 메뉴
4. "Bot Token Scopes" 섹션에서 다음 권한 추가:
   - `chat:write` - 메시지 전송
   - `chat:write.public` - 공개 채널에 메시지 전송
   - `channels:read` - 채널 목록 읽기
5. "Install to Workspace" 클릭
6. "Bot User OAuth Token" 복사 (형식: `xoxb-...`)

#### 2. Cloudflare Secrets에 저장

```bash
wrangler secret put SLACK_BOT_TOKEN --env production
# 프롬프트에 Bot Token 붙여넣기
```

#### 3. 코드에서 사용

```typescript
// workers/src/utils/slack-client.ts 사용 예시
import { sendSlackMessage } from '../utils/slack-client';

const result = await sendSlackMessage(
  c.env.SLACK_BOT_TOKEN!,
  '#alerts',
  {
    text: '🚨 긴급 알림',
    blocks: [/* Slack Block Kit JSON */]
  }
);

if (result.ok) {
  console.log('Message sent, thread_ts:', result.ts);
}
```

---

## 사용 가이드

### 프로그래밍 방식으로 알림 보내기

#### 1. 배포 알림 (자동)

GitHub Actions가 자동으로 처리합니다. 별도 설정 불필요.

```yaml
# .github/workflows/cloudflare-workers-deployment.yml (이미 설정됨)
- name: 📢 Slack - Deployment Success
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      { "text": "✅ 배포 성공", ... }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

#### 2. 에러 알림 (자동)

Workers 코드에서 5xx 에러 발생 시 자동 전송.

```typescript
// workers/src/middleware/slack-notifications.ts (이미 구현됨)
import { slackErrorMonitoring } from './middleware/slack-notifications';

// index.ts에 미들웨어 추가
app.use('*', slackErrorMonitoring);

// 5xx 에러 발생 시 자동으로 Slack 알림 전송
```

#### 3. 보안 경고 (수동)

의심스러운 활동 감지 시 호출.

```typescript
import { notifySecurityEvent } from './middleware/slack-notifications';

// Rate limit 초과 시
if (requestCount > RATE_LIMIT) {
  await notifySecurityEvent(c, 'rate_limit', {
    description: `IP ${ip}에서 ${requestCount}회 요청 시도`,
    attempts: requestCount
  });
}

// SQL Injection 시도 감지 시
if (isSqlInjectionAttempt(query)) {
  await notifySecurityEvent(c, 'sql_injection', {
    description: `SQL Injection 시도 감지: ${query}`
  });
}
```

#### 4. 커스텀 알림

```typescript
import { sendSlackWebhook, createErrorAlertMessage } from './utils/slack-client';

// 커스텀 에러 알림
const message = createErrorAlertMessage({
  severity: 'high',
  error: '데이터베이스 연결 실패',
  path: '/api/survey/submit',
  method: 'POST',
  ip: '1.2.3.4'
});

await sendSlackWebhook(c.env.SLACK_WEBHOOK_URL!, message);
```

---

## 알림 종류

### 1. 배포 알림

#### 배포 시작
```
🚀 SafeWork 배포 시작

환경: Production
배포자: jclee
브랜치: master
커밋: da33650

📝 메시지: feat: Add Slack integration
```

#### 배포 성공
```
✅ 배포 성공

환경: Production
배포자: jclee
브랜치: master
커밋: da33650

URL: https://safework.jclee.me

🎉 Health check 통과 | ⏱️ 배포 완료
```

#### 배포 실패
```
❌ 배포 실패

환경: Production
배포자: @jclee
브랜치: master
워크플로우: [실패 로그 확인]

⚠️ 즉시 확인이 필요합니다!
```

---

### 2. 테스트 결과

```
✅ 테스트 통과

브랜치: master
커밋: da33650
트리거: push
작성자: jclee

[워크플로우 로그 보기]
```

---

### 3. 에러 알림

```
🚨 프로덕션 에러 발생

심각도: HIGH
경로: POST /api/survey/d1/submit
사용자: user@example.com
IP: 1.2.3.4

에러 메시지:
Database connection failed: timeout after 5s

🔍 Stack Trace
at submitSurvey (survey-d1.ts:125)
at POST /api/survey/d1/submit (survey-d1.ts:85)
...
```

---

### 4. 보안 경고

```
🚨 보안 경고: BRUTE_FORCE

IP 주소: 192.168.1.100
시도 횟수: 15
경로: /api/auth/login
User Agent: curl/7.68.0

설명: 15회 연속 로그인 실패 감지

⚡️ 자동으로 IP를 블록 리스트에 추가했습니다.
```

---

### 5. 성능 경고

```
📉 성능 경고

지표: 응답 시간
현재값: 2500 ms
임계값: 2000 ms
초과율: 25.0%

[📊 Grafana 대시보드에서 확인]
```

---

### 6. 일일 요약 (예정)

```
📊 일일 요약 - 2025-10-21

트래픽 & 성능
총 요청: 15,234
성공률: 99.85%
평균 응답시간: 450ms
에러: 23

사용자 활동
신규 가입: 12명
설문 제출: 89건

[📊 상세 대시보드 보기]
```

---

## 트러블슈팅

### 문제 1: Slack 알림이 오지 않음

**증상**: 배포나 에러가 발생했는데 Slack 알림이 오지 않음

**해결 방법**:

1. **Webhook URL 확인**
   ```bash
   # Cloudflare Secret 확인
   wrangler secret list --env production
   # SLACK_WEBHOOK_URL이 있는지 확인
   ```

2. **Webhook URL 유효성 테스트**
   ```bash
   curl -X POST <YOUR_WEBHOOK_URL> \
     -H 'Content-Type: application/json' \
     -d '{"text":"테스트 메시지"}'
   ```
   → Slack 채널에 "테스트 메시지"가 나타나야 함

3. **GitHub Secret 확인** (CI/CD 알림용)
   - Repository → Settings → Secrets → Actions
   - `SLACK_WEBHOOK_URL`이 존재하는지 확인

4. **Workers 로그 확인**
   ```bash
   wrangler tail --env production
   # 에러 발생 시 Slack 전송 시도 로그 확인
   ```

---

### 문제 2: n8n Webhook이 작동하지 않음

**증상**: n8n Webhook URL로 요청을 보냈는데 Slack에 메시지가 안 옴

**해결 방법**:

1. **n8n 워크플로우 활성화 확인**
   - https://n8n.jclee.me 접속
   - 워크플로우가 "Active" 상태인지 확인

2. **Webhook URL 형식 확인**
   - 올바른 형식: `https://n8n.jclee.me/webhook/safework/notifications`
   - 잘못된 형식: `https://n8n.jclee.me/webhook-test/safework/notifications`

3. **n8n 실행 로그 확인**
   - n8n 워크플로우 → Executions 탭
   - 에러 메시지 확인

4. **Slack 연결 재인증**
   - n8n → Credentials → Slack OAuth2
   - "Test Credential" 클릭
   - 실패 시 재인증

---

### 문제 3: GitHub Actions에서 Slack 알림 실패

**증상**: GitHub Actions 워크플로우에서 Slack 알림 단계 실패

**해결 방법**:

1. **GitHub Actions 로그 확인**
   ```
   Repository → Actions → 실패한 워크플로우 → "Slack - Deployment Success" 단계
   ```

2. **Secret 이름 확인**
   - Actions Secret 이름이 정확히 `SLACK_WEBHOOK_URL`인지 확인
   - 대소문자 구분됨!

3. **Webhook URL에 특수문자 없는지 확인**
   - URL 끝에 공백이나 줄바꿈이 없어야 함
   - URL을 다시 복사해서 붙여넣기

4. **slackapi/slack-github-action 버전 확인**
   ```yaml
   - uses: slackapi/slack-github-action@v1
   ```
   → 최신 버전(v1) 사용 중인지 확인

---

### 문제 4: 에러 알림이 너무 많이 옴 (Spam)

**증상**: 같은 에러가 수십 번 반복해서 Slack에 알림이 옴

**해결 방법**:

1. **Rate Limiting 추가** (코드 수정 필요)
   ```typescript
   // workers/src/middleware/slack-notifications.ts
   const ERROR_NOTIFICATION_COOLDOWN = 300; // 5분

   async function shouldNotifyError(c: Context, errorHash: string): Promise<boolean> {
     const key = `slack_error_notified:${errorHash}`;
     const alreadyNotified = await c.env.CACHE_LAYER.get(key);

     if (alreadyNotified) {
       return false; // 5분 내 같은 에러는 알림 안 보냄
     }

     await c.env.CACHE_LAYER.put(key, 'true', { expirationTtl: ERROR_NOTIFICATION_COOLDOWN });
     return true;
   }
   ```

2. **알림 심각도 필터링**
   ```typescript
   // CRITICAL과 HIGH만 알림
   if (severity === 'critical' || severity === 'high') {
     await sendSlackWebhook(webhookUrl, message);
   }
   ```

3. **n8n에서 필터 추가**
   - n8n 워크플로우에 "IF" 노드 추가
   - 조건: `{{$json["severity"]}}` equals `critical`

---

### 문제 5: Slack Block Kit 형식 오류

**증상**: Slack에서 "invalid_blocks" 에러 발생

**해결 방법**:

1. **Block Kit Builder 사용**
   - https://app.slack.com/block-kit-builder 접속
   - JSON 붙여넣기 및 미리보기
   - 유효성 검사

2. **일반적인 실수**
   ```json
   // ❌ 잘못된 형식
   {
     "type": "section",
     "text": "Plain text" // 객체여야 함!
   }

   // ✅ 올바른 형식
   {
     "type": "section",
     "text": {
       "type": "mrkdwn",
       "text": "Plain text"
     }
   }
   ```

3. **필수 필드 확인**
   - 모든 블록은 `type` 필드 필요
   - `text` 블록은 `type`과 `text` 필드 필요

---

## 추가 참고 자료

### Slack API 문서
- Incoming Webhooks: https://api.slack.com/messaging/webhooks
- Block Kit: https://api.slack.com/block-kit
- Block Kit Builder: https://app.slack.com/block-kit-builder

### n8n 문서
- Slack Node: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.slack/
- Webhook Node: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/

### SafeWork 관련 문서
- `workers/src/utils/slack-client.ts` - Slack 클라이언트 구현
- `workers/src/middleware/slack-notifications.ts` - 미들웨어 구현
- `.github/workflows/cloudflare-workers-deployment.yml` - CI/CD 통합

---

## 지원 및 문의

Slack 통합 관련 문제가 발생하면:
1. 이 문서의 [트러블슈팅](#트러블슈팅) 섹션 확인
2. GitHub Issues: https://github.com/qws941/safework/issues
3. Slack `#dev-support` 채널에 문의

---

**문서 버전**: 1.0
**최종 업데이트**: 2025-10-21
**작성자**: SafeWork 개발팀
