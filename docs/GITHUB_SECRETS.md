# GitHub Secrets 설정 가이드

SafeWork 프로젝트의 GitHub Actions를 위한 필수 Secrets 설정 가이드입니다.

## 📌 필수 GitHub Secrets

GitHub 저장소의 Settings → Secrets and variables → Actions에서 설정하세요.

### 1. Registry 관련
```bash
REGISTRY_PASSWORD=bingogo1
```
Docker Registry (registry.jclee.me) 접근용 비밀번호

### 2. Database 관련
```bash
DB_PASSWORD=safework2024
```
PostgreSQL 데이터베이스 비밀번호

### 3. Portainer API 관련
```bash
PORTAINER_TOKEN=ptr_zdHC0mAdjC7hk7pZ8r2+pJZO+bLxBD/TaB3iPuQwx9Q=
```
Portainer API 접근 토큰 (스택 자동 배포용)

### 4. Admin 관련
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=safework2024
```
SafeWork 관리자 계정 정보

### 5. Security 관련
```bash
SECRET_KEY=safework-production-secret-key-2024
```
Flask 애플리케이션 시크릿 키

## 🔧 GitHub Secrets 설정 방법

### 방법 1: GitHub UI를 통한 설정
1. GitHub 저장소로 이동
2. Settings → Secrets and variables → Actions
3. "New repository secret" 버튼 클릭
4. Name과 Secret 값 입력
5. "Add secret" 버튼 클릭

### 방법 2: GitHub CLI를 통한 설정
```bash
# GitHub CLI 설치 필요 (gh)
gh secret set REGISTRY_PASSWORD --body "bingogo1"
gh secret set DB_PASSWORD --body "safework2024"
gh secret set PORTAINER_TOKEN --body "ptr_zdHC0mAdjC7hk7pZ8r2+pJZO+bLxBD/TaB3iPuQwx9Q="
gh secret set ADMIN_USERNAME --body "admin"
gh secret set ADMIN_PASSWORD --body "safework2024"
gh secret set SECRET_KEY --body "safework-production-secret-key-2024"
```

## 🚀 GitHub Actions 워크플로우

### 자동 빌드 및 푸시 (Push to master)
```yaml
# master 브랜치에 푸시 시 자동 실행
git push origin master
```
- Docker 이미지 빌드
- registry.jclee.me에 푸시
- latest 태그와 commit SHA 태그 생성

### 수동 배포 (Workflow Dispatch)
```yaml
# GitHub Actions 탭에서 수동 실행
# "Run workflow" → deploy_to_production: true 선택
```
- Docker 이미지 빌드 및 푸시
- Portainer API를 통한 스택 배포
- 헬스체크 및 검증

## 📋 환경 변수 매핑

| GitHub Secret | 환경 변수 | 용도 |
|--------------|----------|------|
| REGISTRY_PASSWORD | REGISTRY_PASSWORD | Docker Registry 인증 |
| DB_PASSWORD | DB_PASSWORD | PostgreSQL 비밀번호 |
| PORTAINER_TOKEN | PORTAINER_TOKEN | Portainer API 인증 |
| ADMIN_USERNAME | ADMIN_USERNAME | 관리자 사용자명 |
| ADMIN_PASSWORD | ADMIN_PASSWORD | 관리자 비밀번호 |
| SECRET_KEY | SECRET_KEY | Flask 시크릿 키 |

## 🔐 보안 주의사항

1. **Secrets는 절대 코드에 하드코딩하지 마세요**
2. **`.env` 파일은 `.gitignore`에 포함되어야 합니다**
3. **Secrets 값은 정기적으로 갱신하세요**
4. **Production 환경의 Secrets는 별도로 관리하세요**

## 🧪 Secrets 검증

GitHub Actions 워크플로우에서 Secrets가 올바르게 설정되었는지 확인:

```yaml
- name: Verify Secrets
  run: |
    if [ -z "${{ secrets.REGISTRY_PASSWORD }}" ]; then
      echo "❌ REGISTRY_PASSWORD is not set"
      exit 1
    fi
    echo "✅ All secrets are configured"
```

## 📝 로컬 개발 환경 설정

로컬 개발 시 `.env` 파일 생성:

```bash
# .env.example을 복사하여 .env 생성
cp .env.example .env

# .env 파일 편집
vim .env
```

`.env` 파일 예시:
```env
FLASK_CONFIG=development
DB_PASSWORD=local-password
ADMIN_PASSWORD=local-admin-password
SECRET_KEY=local-secret-key
```

## 🆘 문제 해결

### Secret 값이 비어있는 경우
- GitHub Settings에서 Secret이 올바르게 설정되었는지 확인
- Secret 이름이 정확한지 확인 (대소문자 구분)

### 워크플로우 실행 실패
- Actions 탭에서 로그 확인
- Secrets 권한 확인
- Repository 설정에서 Actions 권한 확인

### Portainer API 토큰 갱신
```bash
# Portainer에서 새 토큰 생성 후 업데이트
gh secret set PORTAINER_TOKEN --body "새로운_토큰_값"
```