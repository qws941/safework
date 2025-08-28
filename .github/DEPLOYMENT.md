# SafeWork 배포 가이드

## 🚀 자동화된 배포 파이프라인

SafeWork는 GitHub Actions를 통한 완전 자동화된 CI/CD 파이프라인을 제공합니다.

## 📋 워크플로우 개요

### 1. 메인 CI/CD 파이프라인 (`main-deploy.yml`)
- **트리거**: `main`, `develop` 브랜치 푸시
- **단계**:
  1. **코드 품질 검사** - Black 포맷팅, Flake8 린팅
  2. **Docker 이미지 빌드** - App, MySQL, Redis 이미지
  3. **자동 배포** - 환경별 배포 실행

### 2. Pull Request CI (`pull-request.yml`)
- **트리거**: PR 생성/업데이트
- **검사**:
  - 코드 포맷팅 및 린팅
  - 보안 취약점 스캔
  - Docker 빌드 테스트

### 3. 릴리스 관리 (`release.yml`)
- **트리거**: Git 태그 푸시 또는 수동 실행
- **기능**:
  - 릴리스 노트 자동 생성
  - 버전별 Docker 이미지 태깅
  - GitHub Release 생성

## 🌍 환경별 배포 전략

### 개발환경 (Development)
- **브랜치**: `develop`
- **배포**: 자동 배포
- **전략**: Rolling Update
- **승인**: 불필요

### 프로덕션환경 (Production)
- **브랜치**: `main`
- **배포**: 수동 승인 필요
- **전략**: Blue-Green Deployment
- **승인자**: admin, lead-developer

## 🐳 Docker 이미지 관리

### 이미지 태깅 전략
```bash
# 개발 빌드
registry.jclee.me/safework/app:develop-abc1234
registry.jclee.me/safework/app:latest

# 프로덕션 릴리스
registry.jclee.me/safework/app:v1.2.3
registry.jclee.me/safework/app:stable
```

### 빌드된 이미지
- **App**: Flask 애플리케이션 (589MB)
- **MySQL**: 커스텀 스키마 포함 (781MB)
- **Redis**: 캐시 서버 (41.4MB)

## 🔧 배포 실행 방법

### 1. 자동 배포 (권장)
```bash
# 개발환경 배포
git push origin develop

# 프로덕션 배포
git push origin main
```

### 2. 수동 배포
GitHub Actions 탭에서 "SafeWork CI/CD Pipeline" 워크플로우 수동 실행

### 3. 릴리스 생성
```bash
# Git 태그 생성
git tag v1.2.3
git push origin v1.2.3

# 또는 GitHub에서 수동 릴리스 생성
```

## 📊 배포 모니터링

### 헬스체크 엔드포인트
- **URL**: `http://localhost:4545/health`
- **응답**: `{"service":"safework","status":"healthy","timestamp":"..."}`

### 배포 상태 확인
1. GitHub Actions 탭에서 워크플로우 실행 상태 확인
2. 환경별 배포 로그 검토
3. 컨테이너 상태 모니터링

## 🚨 롤백 절차

### 자동 롤백
프로덕션환경에서 다음 조건시 자동 롤백:
- 헬스체크 실패
- 높은 에러율 감지
- 성능 저하 감지

### 수동 롤백
```bash
# 이전 버전으로 롤백
docker-compose down
docker-compose up -d
```

## 🔐 보안 고려사항

### GitHub Secrets 설정 필수
- `REGISTRY_PASSWORD`: Docker 레지스트리 접근 비밀번호
- `PRODUCTION_SECRET_KEY`: 프로덕션 Flask SECRET_KEY

### 환경별 격리
- 개발/프로덕션 데이터베이스 분리
- 환경별 시크릿 관리
- 네트워크 보안 설정

## 📞 문제 해결

### 배포 실패시
1. GitHub Actions 로그 확인
2. Docker 이미지 빌드 상태 점검
3. 환경별 설정 검증
4. 헬스체크 엔드포인트 테스트

### 연락처
- **개발팀**: dev-team@company.com
- **운영팀**: ops-team@company.com
- **긴급상황**: admin@company.com