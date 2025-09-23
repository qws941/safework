# GitHub Secrets 설정 가이드

## 필수 Secrets 설정

GitHub Repository Settings → Secrets and variables → Actions 에서 다음 secrets를 추가하세요:

### 1. PORTAINER_WEBHOOK_URL
```
Name: PORTAINER_WEBHOOK_URL
Value: https://portainer.jclee.me/api/stacks/webhooks/e2abf888-e16d-419b-bdf0-65c206cca913
```

### 2. PORTAINER_API_KEY
```
Name: PORTAINER_API_KEY
Value: ptr_zdHC0mAdjC7hk7pZ8r2+pJZO+bLxBD/TaB3iPuQwx9Q=
```

### 3. REGISTRY_PASSWORD
```
Name: REGISTRY_PASSWORD
Value: bingogo1
```

### 4. DB_PASSWORD
```
Name: DB_PASSWORD
Value: safework2024
```

### 5. ADMIN_USERNAME
```
Name: ADMIN_USERNAME
Value: admin
```

### 6. ADMIN_PASSWORD
```
Name: ADMIN_PASSWORD
Value: safework2024
```

## GitHub CLI를 사용한 자동 설정

```bash
# GitHub CLI가 설치되어 있다면:
gh secret set PORTAINER_WEBHOOK_URL --body="https://portainer.jclee.me/api/stacks/webhooks/e2abf888-e16d-419b-bdf0-65c206cca913"
gh secret set PORTAINER_API_KEY --body="ptr_zdHC0mAdjC7hk7pZ8r2+pJZO+bLxBD/TaB3iPuQwx9Q="
gh secret set REGISTRY_PASSWORD --body="bingogo1"
gh secret set DB_PASSWORD --body="safework2024"
gh secret set ADMIN_USERNAME --body="admin"
gh secret set ADMIN_PASSWORD --body="safework2024"
```

## 배포 트리거 방법

### 1. Git Push (자동)
```bash
git push origin master
```

### 2. Manual Webhook Trigger
```bash
./scripts/webhook-deploy.sh
```

### 3. Direct Webhook Call
```bash
curl -X POST https://portainer.jclee.me/api/stacks/webhooks/e2abf888-e16d-419b-bdf0-65c206cca913
```

## 배포 확인

1. GitHub Actions: https://github.com/qws941/safework/actions
2. Service Health: https://safework.jclee.me/health
3. Admin Panel: https://safework.jclee.me/admin