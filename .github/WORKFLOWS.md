# SafeWork GitHub Actions Workflows

## 🏗️ 최적화된 워크플로우 구조

### 🚀 Core Workflows

#### 1. `deploy.yml` - 메인 배포 파이프라인
- **트리거**: `push` to `main/master/develop` (앱/DB/인프라 변경 시만)
- **기능**: Docker 빌드 → 레지스트리 푸시 → Portainer API 배포
- **Concurrency**: `deploy-{branch}`
- **타임아웃**: PostgreSQL:15분, Redis:10분, App:20분

#### 2. `claude.yml` - 통합 AI 어시스턴트
- **트리거**: 이슈, PR, 코멘트, 워크플로우 완료, 수동 실행
- **기능**: 이슈 분석, PR 리뷰, 코드 개선, 문제 해결
- **통합**: 기존 `issue-handler.yml`, `pr-review.yml` 기능 포함
- **Concurrency**: `claude-{branch}-{event}`

#### 3. `ci-auto-fix.yml` - 코드 품질 자동 수정
- **트리거**: PR 생성/업데이트, 주간 스케줄 (월요일 2AM)
- **기능**: 코드 포맷팅, 린팅, 보안 스캔, 의존성 정리
- **Concurrency**: `ci-auto-fix-{branch}`

### 🔧 Utility Workflows

#### 4. `operational-log-analysis.yml` - 운영 로그 분석
- **트리거**: 일 2회 (6AM, 6PM KST), 수동 실행
- **기능**: Portainer 로그 수집, 에러 패턴 분석, Claude 분석
- **Concurrency**: `log-analysis-{branch}`

#### 5. `build-test.yml` - 빌드 테스트
- **트리거**: 수동 실행만
- **기능**: 개별 Docker 이미지 빌드 테스트
- **용도**: 빌드 문제 진단

#### 6. `debug.yml` - 디버깅 도구
- **트리거**: 수동 실행만
- **기능**: 환경변수, 연결성, 빌드 컨텍스트, 시크릿 진단
- **용도**: 워크플로우 실패 원인 분석

## 🔄 워크플로우 트리거 분리

### Push 이벤트 처리
- **`deploy.yml`**: 실제 배포 (path 필터링 적용)
- **`ci-auto-fix.yml`**: PR에서만 실행 (push 트리거 제거)

### Issue 이벤트 처리
- **`claude.yml`**: 모든 이슈 관련 이벤트 통합 처리

### Pull Request 이벤트 처리
- **`claude.yml`**: PR 리뷰 및 분석
- **`ci-auto-fix.yml`**: 코드 품질 검사

## 🚫 제거된 중복 워크플로우

1. **`issue-handler.yml`** → `claude.yml`로 통합
2. **`pr-review.yml`** → `claude.yml`로 통합
3. **`independent-build.yml`** → `deploy.yml`로 통합
4. **`log-monitoring.yml`** → `operational-log-analysis.yml`로 통합
5. **`renovate.json`** → `dependabot.yml` 사용

## ⚡ 성능 최적화

### Concurrency 제어
```yaml
concurrency:
  group: workflow-name-{contextual-key}
  cancel-in-progress: true/false
```

### 타임아웃 설정
- Docker 빌드: 10-20분
- API 배포: 기본값
- 로그 분석: 25분
- 디버깅: 10분

### 조건부 실행
- 이벤트 타입별 세분화된 조건
- 파일 경로 필터링
- 댓글 패턴 매칭 (`@claude`)

## 🎯 Best Practices

1. **단일 책임 원칙**: 각 워크플로우는 명확한 단일 목적
2. **이벤트 분리**: 충돌하지 않는 트리거 설정
3. **재사용성**: 공통 기능은 단일 워크플로우에서 처리
4. **디버깅 지원**: 문제 진단을 위한 전용 도구 제공
5. **성능 최적화**: Concurrency 제어 및 적절한 타임아웃

## 🔍 문제 해결

### 워크플로우 실패 시
1. `debug.yml` 실행으로 환경 진단
2. `build-test.yml`로 빌드 문제 확인
3. `.github/SECRETS.md` 참조하여 시크릿 확인

### 충돌 방지
- 동일 브랜치에서 동시 실행되는 워크플로우 없음
- 각 워크플로우별 고유한 concurrency 그룹
- 명확한 트리거 조건 설정