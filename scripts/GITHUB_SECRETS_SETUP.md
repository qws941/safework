# SafeWork GitHub Secrets 설정 가이드

## 개요
SafeWork 프로젝트의 안전한 배포를 위해 GitHub Actions에서 사용할 민감한 정보들을 GitHub Secrets으로 관리합니다.

## 필수 GitHub Secrets

### 1. Portainer API 설정
```
PORTAINER_TOKEN=ptr_zdHC0mAdjC7hk7pZ8r2+pJZO+bLxBD/TaB3iPuQwx9Q=
```
- Portainer API 인증에 사용
- `ptr_` 접두사로 시작해야 함

### 2. Docker Registry 인증
```
REGISTRY_PASSWORD=bingogo1
```
- registry.jclee.me 접근을 위한 패스워드

### 3. 데이터베이스 설정
```
DB_PASSWORD=safework2024
```
- PostgreSQL 데이터베이스 패스워드

### 4. 애플리케이션 보안
```
SECRET_KEY=safework-production-secret-key-2024
ADMIN_PASSWORD=safework2024
```
- Flask SECRET_KEY (32자 이상 권장)
- 관리자 계정 패스워드

### 5. 선택적 Secrets (알림 기능)
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_BOT_TOKEN=xoxb-...
```

## GitHub Secrets 설정 방법

1. **GitHub 리포지토리로 이동**
   - https://github.com/your-username/safework 페이지 접근

2. **Settings 메뉴 클릭**
   - 리포지토리 상단의 Settings 탭 클릭

3. **Secrets and variables 접근**
   - 왼쪽 사이드바에서 'Secrets and variables' → 'Actions' 클릭

4. **New repository secret 버튼 클릭**
   - 'New repository secret' 버튼 클릭

5. **각 Secret 추가**
   - Name: Secret 이름 (예: PORTAINER_TOKEN)
   - Secret: 실제 값 입력
   - Add secret 버튼 클릭

## 검증 방법

### 1. 로컬 검증 (개발환경)
```bash
# 환경 변수 설정
export PORTAINER_TOKEN="ptr_zdHC0mAdjC7hk7pZ8r2+pJZO+bLxBD/TaB3iPuQwx9Q="
export REGISTRY_PASSWORD="bingogo1"
export DB_PASSWORD="safework2024"
export SECRET_KEY="safework-production-secret-key-2024"
export ADMIN_PASSWORD="safework2024"

# 검증 스크립트 실행
./scripts/github_secrets_validator.sh
```

### 2. GitHub Actions 검증
```bash
# 보안 강화된 설정 테스트
source scripts/config/secure_config.env
./scripts/portainer_api_deploy.sh health
```

## 보안 모범 사례

### ✅ 권장사항
- 모든 민감한 정보는 GitHub Secrets 사용
- 정기적인 토큰 로테이션
- 최소 권한 원칙 적용
- 스크립트에서 환경 변수 검증

### ❌ 금지사항
- 코드에 하드코딩된 비밀번호/토큰
- `.env` 파일을 Git에 커밋
- 로그에 민감한 정보 출력

## 문제 해결

### 자주 발생하는 오류

1. **`PORTAINER_TOKEN: 설정되지 않음`**
   - GitHub Secrets에 PORTAINER_TOKEN 추가 확인
   - 토큰이 `ptr_`로 시작하는지 확인

2. **`Portainer API 연결 실패`**
   - 토큰이 유효한지 확인
   - Portainer 서버 상태 확인

3. **`형식 문제가 있는 시크릿`**
   - SECRET_KEY가 32자 이상인지 확인
   - PORTAINER_TOKEN이 올바른 형식인지 확인

### 검증 명령어
```bash
# 전체 시크릿 검증
./scripts/github_secrets_validator.sh

# Portainer 연결 테스트
./scripts/portainer_api_deploy.sh health

# 배포 전 사전 검증
./scripts/portainer_api_deploy.sh check
```

## 자동화 스크립트

### github_secrets_validator.sh
- 모든 필수/선택적 시크릿 검증
- Portainer API 연결 테스트
- 시크릿 형식 및 길이 검증

### portainer_api_deploy.sh
- 환경 변수 자동 검증
- 안전한 API 배포 수행
- 헬스체크 및 상태 모니터링

## 업데이트 히스토리

### 2025-09-23
- ✅ 초기 GitHub Secrets 설정 가이드 작성
- ✅ 보안 강화된 설정 파일 생성
- ✅ 시크릿 검증 스크립트 완성
- ✅ Portainer API 연결 테스트 완료