# GitHub Secrets Configuration Guide

## 필수 Secrets 설정

SafeWork 프로젝트의 원활한 CI/CD 운영을 위해 다음 GitHub Secrets를 설정해야 합니다:

### 🐳 Docker Registry
```
REGISTRY_HOST=registry.jclee.me
REGISTRY_USER=admin  
REGISTRY_PASSWORD=<your-registry-password>
```

### 🛠️ Portainer API
```
PORTAINER_URL=https://portainer.jclee.me
PORTAINER_API_TOKEN=<your-portainer-api-token>
PORTAINER_ENDPOINT_ID=1
```

### 🗄️ PostgreSQL Database
```
POSTGRES_DB=safework_db
POSTGRES_USER=safework
POSTGRES_PASSWORD=<your-postgres-password>
```

### 🔐 Application Security
```
SECRET_KEY=<your-secret-key>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<your-admin-password>
```

### 🤖 Claude Code Integration
```
CLAUDE_CODE_OAUTH_TOKEN=<your-claude-token>
```

## Secrets 설정 방법

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. "New repository secret" 클릭
3. Name과 Value 입력 후 "Add secret" 클릭

## 워크플로우 실패 시 확인사항

### 1. Docker Registry 인증 실패
- `REGISTRY_PASSWORD`가 올바르게 설정되었는지 확인
- registry.jclee.me 접근 권한 확인

### 2. Portainer API 연결 실패
- `PORTAINER_API_TOKEN`이 유효한지 확인
- Portainer API 엔드포인트 접근 가능 여부 확인

### 3. PostgreSQL 연결 실패
- `POSTGRES_PASSWORD` 설정 확인
- 컨테이너 네트워크 설정 확인

## 문제 해결

### 빌드 실패
```bash
# 로컬에서 Docker 빌드 테스트
docker build ./app -t safework-app:test
docker build ./postgres -t safework-postgres:test  
docker build ./redis -t safework-redis:test
```

### API 연결 테스트
```bash
# Portainer API 연결 테스트
curl -f -s https://portainer.jclee.me/api/status
```

### 환경 변수 확인
워크플로우에서 환경 변수가 올바르게 설정되었는지 확인하려면 다음 단계를 워크플로우에 임시로 추가:

```yaml
- name: 🔍 Debug Environment
  run: |
    echo "Registry Host: ${{ env.REGISTRY_HOST }}"
    echo "App Name: ${{ env.APP_NAME }}"
    # 민감한 정보는 출력하지 마세요!
```

## 보안 주의사항

- Secret 값을 워크플로우 로그에 출력하지 마세요
- 정기적으로 토큰과 비밀번호를 교체하세요
- 최소 권한 원칙을 적용하세요