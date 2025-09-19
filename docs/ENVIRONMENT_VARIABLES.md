# SafeWork 환경변수 설정 가이드

## 개요
SafeWork 시스템의 보안 강화를 위해 중요한 설정값들을 환경변수로 관리합니다.

## 필수 환경변수

### 1. Slack 알림 설정
```bash
# Slack 웹훅 URL (필수)
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

**설정 방법:**
1. Slack에서 Incoming Webhooks 앱 설치
2. 채널 선택 후 웹훅 URL 생성
3. 환경변수에 URL 설정

### 2. Portainer API 설정
```bash
# Portainer API 키 (선택사항 - 기본값 사용 가능)
export PORTAINER_API_KEY="ptr_your_api_key_here"
```

### 3. 데이터베이스 설정
```bash
# PostgreSQL 연결 정보
export DB_HOST="safework-postgres"
export DB_NAME="safework_db"
export DB_USER="safework"
export DB_PASSWORD="your_secure_password"
```

### 4. Redis 설정
```bash
# Redis 연결 정보
export REDIS_HOST="safework-redis"
export REDIS_PORT="6379"
export REDIS_PASSWORD=""  # 선택사항
```

### 5. Flask 애플리케이션 설정
```bash
# Flask 환경 설정
export FLASK_CONFIG="production"
export SECRET_KEY="your-super-secret-key-here"
export TZ="Asia/Seoul"
```

## Docker 환경에서 환경변수 설정

### Docker Run 명령어 예시
```bash
docker run -d --name safework-app \
  -e SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL" \
  -e PORTAINER_API_KEY="ptr_your_api_key_here" \
  -e DB_HOST="safework-postgres" \
  -e DB_NAME="safework_db" \
  -e DB_USER="safework" \
  -e DB_PASSWORD="your_secure_password" \
  -e REDIS_HOST="safework-redis" \
  -e FLASK_CONFIG="production" \
  -e SECRET_KEY="your-super-secret-key-here" \
  -e TZ="Asia/Seoul" \
  registry.jclee.me/safework/app:latest
```

### .env 파일 사용 (로컬 개발)
```bash
# .env 파일 생성
cat > .env << EOF
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
PORTAINER_API_KEY=ptr_your_api_key_here
DB_HOST=safework-postgres
DB_NAME=safework_db
DB_USER=safework
DB_PASSWORD=your_secure_password
REDIS_HOST=safework-redis
FLASK_CONFIG=development
SECRET_KEY=your-super-secret-key-here
TZ=Asia/Seoul
EOF

# Docker에서 .env 파일 사용
docker run --env-file .env registry.jclee.me/safework/app:latest
```

## GitHub Actions 시크릿 설정

GitHub 저장소의 Settings > Secrets and variables > Actions에서 다음 시크릿을 설정:

```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
PORTAINER_API_KEY=ptr_your_api_key_here
POSTGRES_PASSWORD=your_secure_password
SECRET_KEY=your-super-secret-key-here
```

## 보안 권장사항

### 1. 강력한 패스워드 사용
```bash
# 안전한 랜덤 패스워드 생성
openssl rand -base64 32
```

### 2. 환경변수 검증
```bash
# 환경변수 설정 확인 스크립트
#!/bin/bash
echo "=== SafeWork 환경변수 검증 ==="

required_vars=(
    "SLACK_WEBHOOK_URL"
    "DB_HOST"
    "DB_NAME" 
    "DB_USER"
    "DB_PASSWORD"
    "SECRET_KEY"
)

for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo "❌ $var: 설정되지 않음"
    else
        echo "✅ $var: 설정됨"
    fi
done
```

### 3. 로그에서 민감정보 제외
구조화된 로깅 시스템은 자동으로 민감한 정보를 마스킹합니다:
- 패스워드, API 키, 토큰은 로그에 기록되지 않음
- 웹훅 URL은 마지막 4자리만 표시

## 모니터링 스크립트 환경변수

### safework_monitoring_advanced.sh
```bash
# 스크립트에서 사용하는 환경변수
export SLACK_WEBHOOK_URL="your_webhook_url"
export PORTAINER_API_KEY="your_api_key" 
export PORTAINER_URL="https://portainer.jclee.me"
```

### safework_restart_advanced.sh
```bash
# 동일한 환경변수 사용
export PORTAINER_API_KEY="your_api_key"
export PORTAINER_URL="https://portainer.jclee.me"
```

## 문제 해결

### 1. Slack 알림이 전송되지 않는 경우
```bash
# 웹훅 URL 테스트
curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"테스트 메시지"}' \
    "$SLACK_WEBHOOK_URL"
```

### 2. 환경변수가 인식되지 않는 경우
```bash
# 컨테이너 내부에서 환경변수 확인
docker exec -it safework-app printenv | grep SLACK
```

### 3. 기본값 사용 확인
애플리케이션은 환경변수가 설정되지 않은 경우 안전한 기본값을 사용합니다:
- Slack 웹훅: 개발용 기본 URL
- Portainer API: 개발용 기본 키
- 데이터베이스: 로컬 개발 설정

## 업데이트 내역

- **2024-09-19**: 환경변수 보안 강화 구현
- **2024-09-19**: Slack 웹훅 URL 환경변수화
- **2024-09-19**: Portainer API 키 환경변수화
- **2024-09-19**: 구조화된 로깅 시스템 도입