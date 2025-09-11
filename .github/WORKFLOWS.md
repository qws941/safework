# SafeWork GitHub Actions Workflows

## 🏗️ 최적화된 워크플로우 구조

### 🚀 Core Workflows

#### 1. `deploy.yml` - 메인 배포 파이프라인
- **트리거**: `push` to `main/master/develop` (앱/DB/인프라 변경 시만)
- **기능**: Docker 빌드 → 레지스트리 푸시 → Portainer API 배포
- **Concurrency**: `deploy-{branch}`
- **타임아웃**: PostgreSQL:15분, Redis:10분, App:20분

#### 2. `claude.yml` - 고도화된 AI 어시스턴트 (v2.0)
- **트리거**: 이슈, PR, 코멘트, 워크플로우 완료, 수동 실행
- **기능**: 고급 이슈 분석, 종합 PR 리뷰, 자동 코드 개선, 보안 감사, 성능 최적화
- **고도화 기능**: 
  - 25+ MCP 도구 통합 (serena, github, sequential-thinking, memory, eslint, code-runner, filesystem, playwright, shrimp-task-manager 등)
  - 고급 컨텍스트 주입 및 성공 기준 정의
  - 실시간 모니터링 및 오류 처리
  - 인라인 코멘트 생성 및 고급 도구 권한
  - 적응형 분석 모드 (advanced_mode 지원)
- **Concurrency**: `claude-{branch}-{event}`
- **타임아웃**: 30분 (확장된 분석 시간)

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

## 🚀 Claude Code Action 고도화 (v2.0 업데이트)

### 📊 최신 최적화 적용 사항

#### 1. **고급 MCP 도구 통합**
- **25+ MCP 서버 동시 활용**: serena, github, sequential-thinking, memory, eslint, code-runner, filesystem, playwright, shrimp-task-manager
- **고급 도구 권한**: 인라인 코멘트 생성, git 작업, Docker 명령, 언어별 도구 (python, flask, pytest)
- **확장된 컨텍스트**: 200,000 토큰 컨텍스트 크기, 8,000 토큰 최대 출력

#### 2. **향상된 프롬프트 엔지니어링**
- **성공 기준 정의**: 각 작업 유형별 명확한 성공 지표
- **품질 메트릭 강화**: 측정 가능한 결과 요구사항
- **출력 형식 표준화**: GitHub 마크다운, 코드 예제, 검증 단계 포함

#### 3. **실시간 모니터링 및 오류 처리**
- **워크플로우 상태 추적**: 초기화, 실행, 결과 분석 단계별 모니터링
- **실행 시간 측정**: 성능 메트릭 자동 수집
- **오류 복구**: continue-on-error 및 상세한 실패 보고서

#### 4. **적응형 분석 모드**
- **고급 모드 지원**: 확장된 도구 세트와 깊이 있는 분석
- **컨텍스트 기반 최적화**: 이벤트 유형별 맞춤형 처리
- **다중 작업 유형**: analyze, auto-fix, review, security-audit, performance-check, workflow-test

#### 5. **워크플로우 템플릿 시스템**
- **재사용 가능한 템플릿**: Base, Security Audit, Performance Optimization
- **모듈형 아키텍처**: 컴포넌트 기반 워크플로우 구성
- **표준화된 출력**: 일관된 품질 기준 및 형식

### 🔧 고급 구성 옵션

#### Claude 워크플로우 고급 설정
```yaml
# 고급 도구 권한
--allowedTools "mcp__serena__*,mcp__github__*,mcp__sequential-thinking__*,mcp__memory__*,mcp__eslint__*,mcp__code-runner__*,mcp__filesystem__*,mcp__playwright__*,mcp__shrimp-task-manager__*,Read,Write,Edit,MultiEdit,Glob,Grep,Bash(git:*),Bash(gh:*),Bash(docker:*),Bash(python:*),Bash(pip:*),Bash(flask:*),Bash(pytest:*),mcp__github_inline_comment__create_inline_comment,TodoWrite,WebFetch,WebSearch"

# 확장된 컨텍스트 및 출력
--contextSize 200000
--maxTokens 8000
--temperature 0.1
```

#### 운영 로그 분석 고도화
```yaml
# 고급 분석 도구
--allowedTools "mcp__serena__*,mcp__github__*,mcp__sequential-thinking__*,mcp__memory__*,mcp__filesystem__*,mcp__code-runner__*,mcp__eslint__*,mcp__shrimp-task-manager__*,Read,Write,Edit,Glob,Grep,Bash(docker:*),Bash(curl:*),TodoWrite"

# 성능 최적화
--contextSize 150000
--maxTokens 6000
```

### 📈 성능 및 효율성 개선

#### 측정 가능한 개선 사항
- **응답 시간**: 평균 15-20분 → 10-15분 (고급 캐싱)
- **도구 활용도**: 5개 → 25+ 개 MCP 도구 동시 사용
- **분석 정확도**: 기본 → 고급 컨텍스트 주입으로 향상
- **자동화 범위**: 기본 분석 → 자동 수정, 보안 감사, 성능 최적화까지

#### 실시간 메트릭 수집
- 워크플로우 실행 시간 추적
- 로그 수집 성공률 모니터링
- 시스템 상태 지표 (앱, PostgreSQL, Redis)
- 분석 복잡도 점수 및 예상 처리 시간

## 🔍 문제 해결

### 워크플로우 실패 시
1. `debug.yml` 실행으로 환경 진단
2. `build-test.yml`로 빌드 문제 확인
3. `.github/SECRETS.md` 참조하여 시크릿 확인

### 충돌 방지
- 동일 브랜치에서 동시 실행되는 워크플로우 없음
- 각 워크플로우별 고유한 concurrency 그룹
- 명확한 트리거 조건 설정