# SafeWork 개발 워크플로우 가이드

## 🚀 빠른 시작

```bash
# 브랜치 전략 초기 설정 (최초 한번만)
./branch-setup.sh

# 새 기능 개발
make branch-feature name=모바일-최적화
# 개발 진행...
make pr-create

# 배포
make deploy-staging  # 스테이징 먼저
make deploy-prod     # 최종 프로덕션
```

## 🌿 브랜치 전략

| 브랜치 | 용도 | 배포 환경 | 자동 배포 |
|--------|------|-----------|----------|
| `main` | 프로덕션 릴리즈 | Production | ✅ |
| `staging` | 배포 전 최종 테스트 | Staging | ✅ |
| `develop` | 기능 통합 | Development | ✅ |
| `feature/*` | 기능 개발 | 없음 | 🚫 |
| `hotfix/*` | 긴급 수정 | Production | ⚡ |

## 📋 워크플로우 패턴

### 1. 일반 기능 개발

```bash
# 1. 기능 브랜치 생성
make branch-feature name=새기능

# 2. 개발 작업
git add .
git commit -m "feat: 새 기능 구현"
git push

# 3. PR 생성
make pr-create  # develop으로 자동 PR

# 4. 리뷰 → 승인 → 병합 → 자동 배포
```

### 2. 스테이징 → 프로덕션 배포

```bash
# 1. 스테이징 배포
make deploy-staging

# 2. 테스트 완료 후 프로덕션 배포  
make deploy-prod
```

### 3. 긴급 수정 (핫픽스)

```bash
# 1. 핫픽스 브랜치 생성
make branch-hotfix name=보안패치

# 2. 긴급 수정
git add .
git commit -m "fix: 보안 취약점 수정"
git push

# 3. main과 develop에 각각 PR 생성
make pr-create
```

## 🔧 개발 환경 설정

### 필수 도구
- Python 3.9+
- Docker & Docker Compose
- Git
- GitHub CLI (권장)

### 초기 설정
```bash
# 1. 저장소 클론
git clone <repository-url>
cd safework2

# 2. 브랜치 전략 설정
./branch-setup.sh

# 3. 개발 환경 구성
cd app
pip install -r requirements.txt

# 4. 로컬 테스트
make test-local
```

## 🧪 테스트 전략

### 자동 테스트
- **PR 생성 시**: 전체 테스트 스위트 실행
- **Push 시**: 브랜치별 테스트 실행
- **로컬**: `make test-local`

### 테스트 커버리지
- 목표: 80% 이상
- 보고서: `pytest --cov=. --cov-report=html`

### 보안 검사
- `bandit`: Python 보안 스캔
- `flake8`: 코드 스타일 검사
- GitHub Security Advisories: 의존성 취약점

## 🚀 배포 전략

### 환경별 배포

```bash
# 개발 환경 (자동)
git push origin develop

# 스테이징 환경 (수동 트리거)
make deploy-staging

# 프로덕션 환경 (승인 후)
make deploy-prod
```

### 버전 관리
- **자동 버전**: `1.YYYYMMDD.HHMM`
- **태그 릴리즈**: `make release v=1.3.0`
- **환경별 접미사**: `-staging`, `-development`

### 롤백 전략
- **자동 롤백**: 배포 실패 시 자동 실행
- **수동 롤백**: 이전 태그로 재배포

## 🛡️ 코드 품질 관리

### 브랜치 보호
- **Main**: PR 승인 + 모든 테스트 통과 필수
- **Staging**: PR 승인 + 기본 테스트 통과
- **Develop**: 테스트 통과만 필수

### 커밋 메시지 규칙
```
feat(scope): 새 기능 추가
fix(scope): 버그 수정
docs(scope): 문서 변경
style(scope): 코드 포맷팅
refactor(scope): 리팩토링
test(scope): 테스트 추가
chore(scope): 빌드/설정 변경
```

### PR 체크리스트
- [ ] 테스트 추가/업데이트
- [ ] 문서 업데이트 (필요시)
- [ ] Breaking changes 명시
- [ ] 보안 영향도 검토

## 🔗 유용한 명령어

### 브랜치 관리
```bash
make branch-status           # 브랜치 상태 확인
make branch-cleanup          # 병합된 브랜치 정리
make branch-sync            # 브랜치 동기화
```

### 배포 관리
```bash
make deploy                 # 기본 배포 (기존 방식)
make deploy-dev            # 개발 환경 배포
make deploy-staging        # 스테이징 배포
make deploy-prod           # 프로덕션 배포
```

### 개발 도구
```bash
make dev                   # 개발 서버 시작
make test-local           # 로컬 테스트
make test-docker          # Docker 테스트
make clean               # Docker 정리
```

## 🚨 문제 해결

### 자주 발생하는 문제

#### 1. 테스트 실패
```bash
# 로컬에서 확인
make test-local

# 특정 테스트 실행
cd app && python -m pytest tests/test_specific.py -v
```

#### 2. 브랜치 충돌
```bash
# develop의 변경사항을 feature 브랜치에 적용
git checkout feature/my-feature
git rebase origin/develop
```

#### 3. 배포 실패
```bash
# GitHub Actions 로그 확인
gh run list --limit 5
gh run view <run-id>

# 로컬에서 Docker 빌드 테스트
make test-docker
```

## 📚 추가 문서

- [브랜치 전략 상세 가이드](.github/BRANCH_STRATEGY.md)
- [GitHub Secrets 설정](.github/SECRETS.md)
- [브랜치 보호 설정](.github/branch-protection-setup.md)
- [워크플로우 검증](./check-workflow.sh)

## 🎯 모니터링 및 알림

### 배포 상태 확인
- **GitHub Actions**: 자동 빌드 및 배포 상태
- **Docker Registry**: `registry.jclee.me`에서 이미지 확인
- **애플리케이션**: http://localhost:4545/health

### 알림 설정
- GitHub 알림: PR, 배포 상태
- Slack 연동 (선택사항)
- 이메일 알림 (중요한 이벤트만)

---

> 💡 **팁**: 이 워크플로우는 SafeWork 프로젝트의 안정적이고 효율적인 개발을 위해 설계되었습니다. 팀의 요구사항에 따라 지속적으로 개선해 나가겠습니다.