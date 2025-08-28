# SafeWork - 근골격계 증상조사표 시스템

PDF 001 근골격계 증상조사표를 정확하게 구현한 온라인 증상조사 시스템 (v1.2.0)

## 🎯 최신 업데이트 (v1.2.0)

- ✅ **고급 CI/CD 파이프라인**: 보안 스캔, 품질 검사, 다단계 배포 자동화
- ✅ **데이터베이스 마이그레이션 시스템**: 웹 관리 인터페이스와 CLI 도구
- ✅ **보안 강화**: Trivy, Bandit, Safety를 통한 취약점 스캔 자동화
- ✅ **품질 관리**: Black, Flake8, Pylint를 통한 코드 품질 자동 검사
- ✅ **다중 환경 지원**: Development, Staging, Production 환경 자동 관리
- ✅ **모니터링 & 알림**: Slack/Discord 통합 및 실시간 상태 모니터링
- ✅ **파일 구조 최적화**: 영문 파일명 적용 및 중복 파일 정리

## 🚀 특징

- 📄 **PDF 정확 구현**: 001 근골격계 증상조사표와 100% 일치
- 📱 **모바일 최적화**: 반응형 웹 디자인
- 🚫 **익명 제출**: 로그인 없이 작성 가능
- 📊 **실시간 통계**: 관리자 대시보드
- 📋 **Excel 내보내기**: 데이터 분석 지원
- 🔒 **안전한 데이터 관리**: 개인정보 보호
- 🗂️ **마이그레이션 시스템**: 데이터베이스 스키마 버전 관리
- 🛡️ **보안 스캔**: 자동 취약점 검사 및 보안 모니터링

## 🛠️ 기술 스택

- **Backend**: Python Flask 3.0+
- **Database**: MySQL 8.0 with Migration System
- **Cache**: Redis 7.0
- **Container**: Docker with Multi-platform Support
- **Registry**: registry.jclee.me (Private Registry)
- **CI/CD**: GitHub Actions with Advanced Pipelines
- **Security**: Trivy, Bandit, Safety, Semgrep
- **Quality**: Black, Flake8, Pylint, MyPy
- **Monitoring**: Health Checks, Performance Testing

## 📦 Docker 이미지

```
registry.jclee.me/safework/app:latest     # 메인 애플리케이션 (포트 4545)
registry.jclee.me/safework/mysql:latest   # MySQL 데이터베이스 (포트 3306)
registry.jclee.me/safework/redis:latest   # Redis 캐시 (포트 6379)
```

## 🚀 배포 방법

SafeWork는 3가지 배포 방법을 지원합니다. 프로덕션 환경에서는 **GitOps 자동 배포**를 권장합니다.

### 1. GitOps 자동 배포 (프로덕션 권장) 🎯

GitHub Actions를 통한 완전 자동화된 엔터프라이즈급 배포 시스템입니다.

#### 🔄 간단한 배포 과정

```bash
# 1. 코드 변경 및 푸시
git add .
git commit -m "feat: 새로운 기능 추가"
git push origin main

# 2. 자동으로 다음이 실행됩니다:
✅ 보안 스캔 (취약점 검사)
✅ 코드 품질 검사 (포매팅, 린팅)  
✅ 자동 테스트 (단위/통합 테스트)
✅ Docker 이미지 빌드 및 푸시
✅ 스테이징 환경 자동 배포
✅ 프로덕션 수동 승인 대기
✅ 프로덕션 배포 및 모니터링
✅ Slack/Discord 알림 발송

# 3. 결과 확인
# GitHub Actions 탭에서 배포 진행 상황 실시간 모니터링
# 배포 완료 후 자동 알림 수신
```

#### 🎯 브랜치별 배포 전략

| 브랜치/태그 | 배포 환경 | 배포 방식 | 승인 필요 | URL |
|-------------|-----------|-----------|-----------|-----|
| `main` | Production | 자동 빌드 → 수동 승인 | ✅ 필요 | https://safework.jclee.me |
| `staging` | Staging | 완전 자동 | ❌ 불필요 | https://staging.safework.jclee.me |  
| `develop` | Development | 완전 자동 | ❌ 불필요 | https://dev.safework.jclee.me |
| `v*` (릴리스 태그) | Production | 자동 빌드 → 수동 승인 | ✅ 필요 | https://safework.jclee.me |

#### 📢 배포 알림 설정

실시간 배포 알림을 받으려면 GitHub Secrets에 웹훅을 설정하세요:

```bash
# Repository Settings > Secrets and variables > Actions에서 설정

# Slack 알림
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Discord 알림  
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK/URL

# 설정 후 배포 성공/실패 시 자동 알림 수신
```

#### 📋 배포 파이프라인 단계

1. **준비 단계** (`prepare`)
   - 환경 결정 (main→production, staging→staging, develop→development)
   - 버전 생성 (태그 기반 또는 타임스탬프)
   - 배포 권한 확인

2. **빌드 및 테스트** (`build-and-test`)
   - Docker 이미지 빌드 (AMD64, ARM64)
   - 통합 테스트 실행
   - 보안 스캔 (Trivy)

3. **스테이징 배포** (`deploy-staging`)
   - 스테이징 환경 자동 배포
   - 스모크 테스트 실행
   - 배포 알림

4. **프로덕션 승인** (`production-approval`)
   - 수동 승인 대기 (GitHub Environment Protection)
   - 체크리스트 검토

5. **프로덕션 배포** (`deploy-production`)
   - 배포 전 백업
   - Blue-Green 배포
   - 배포 후 검증
   - GitHub Release 생성

6. **모니터링** (`post-deployment`)
   - 5분간 헬스 모니터링
   - 성능 기준선 설정
   - 알림 발송

#### 🎯 브랜치별 배포 전략

| 브랜치 | 환경 | 배포 방식 | 승인 |
|--------|------|-----------|------|
| `main` | Production | 자동 → 수동 승인 | 필요 |
| `staging` | Staging | 완전 자동 | 불필요 |
| `develop` | Development | 완전 자동 | 불필요 |
| `v*` (태그) | Production | 자동 → 수동 승인 | 필요 |

#### 📢 알림 설정

배포 성공/실패 시 자동 알림을 받으려면 GitHub Secrets에 웹훅 URL을 설정하세요:

```bash
# Slack 알림
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Discord 알림
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK/URL
```

### 2. 로컬 개발 환경 (개발자용) 🛠️

로컬에서 SafeWork를 실행하고 개발하는 방법입니다.

#### Docker Compose 사용 (권장)

```bash
# 1. 환경 설정
cp .env.example .env

# 2. 서비스 시작
./docker-compose-up.sh
# 또는
make up

# 3. 서비스 중지
./docker-compose-down.sh
# 또는
make down

# 4. 로그 확인
make logs

# 5. 상태 확인
make status
```

#### 개발 도구 사용

```bash
# 마이그레이션 관리
make migrate-status              # 마이그레이션 상태 확인
make migrate-run                 # 대기 중인 마이그레이션 실행
make migrate-create desc="설명"   # 새 마이그레이션 생성
make migrate-rollback            # 마이그레이션 롤백

# 개발 도구
make test                        # 테스트 실행
make lint                        # 코드 품질 검사
make build                       # 이미지 빌드
make push                        # Registry 푸시

# 백업/복원
make migrate-backup              # 데이터베이스 백업
make migrate-restore file=backup.sql  # 백업에서 복원
```

### 3. 수동 배포 (긴급용) ⚠️

**⚠️ 주의**: 수동 배포는 긴급 상황에서만 사용하세요. 보안 검사와 품질 검사를 건너뛰므로 위험합니다.

```bash
# 🚨 긴급 상황에서만 사용!

# 1. 이미지 빌드
./build.sh

# 2. Registry 로그인 (관리자만)
docker login registry.jclee.me -u admin
# 비밀번호는 별도 관리 (보안상 README에 노출 금지)

# 3. 이미지 푸시
docker push registry.jclee.me/safework/app:latest
docker push registry.jclee.me/safework/mysql:latest  
docker push registry.jclee.me/safework/redis:latest

# 4. 배포 트리거
./trigger-deploy.sh
```

**수동 배포 시 주의사항:**
- 보안 스캔 없이 배포되므로 취약점 위험 존재
- 코드 품질 검사 생략으로 버그 발생 가능성 증가
- 배포 후 수동으로 헬스체크 및 모니터링 필요
- 가능한 한 빨리 GitOps 워크플로로 재배포 권장

## 🗂️ 프로젝트 구조

```
safework/
├── .github/                    # GitHub Actions 워크플로
│   ├── workflows/
│   │   ├── deployment.yml      # 다단계 배포 파이프라인
│   │   ├── security.yml        # 보안 스캔 파이프라인
│   │   ├── quality.yml         # 코드 품질 파이프라인
│   │   └── test.yml           # 테스트 파이프라인
│   ├── BRANCH_STRATEGY.md     # 브랜치 전략 가이드
│   └── SECRETS.md             # Secrets 설정 가이드
├── app/                       # Flask 애플리케이션
│   ├── models.py             # 데이터베이스 모델
│   ├── routes/               # 라우트 정의
│   ├── templates/            # HTML 템플릿
│   ├── migrations/           # 데이터베이스 마이그레이션
│   ├── migration_manager.py  # 마이그레이션 관리자
│   ├── migrate.py           # 마이그레이션 CLI
│   └── Dockerfile           # App 컨테이너
├── mysql/                    # MySQL 설정
├── redis/                    # Redis 설정
├── forms/                    # 증상조사표 폼 파일
│   ├── 001_musculoskeletal_symptom_survey.pdf
│   └── 002_new_employee_health_checkup_form.docx
├── scripts/                  # 배포 및 관리 스크립트
├── MIGRATION_GUIDE.md        # 마이그레이션 가이드
├── WORKFLOW.md              # 워크플로 가이드
├── Makefile                 # 통합 명령어 인터페이스
└── docker-compose.yml       # 로컬 개발 환경
```

## 🔧 환경 변수

### 애플리케이션 설정
- `FLASK_CONFIG`: 환경 설정 (development/staging/production)
- `SECRET_KEY`: Flask 시크릿 키
- `APP_NAME`: SafeWork
- `ADMIN_USERNAME`: admin
- `ADMIN_PASSWORD`: safework2024

### 데이터베이스 설정
- `MYSQL_HOST`: safework-mysql
- `MYSQL_PORT`: 3306
- `MYSQL_DATABASE`: safework_db
- `MYSQL_USER`: safework
- `MYSQL_PASSWORD`: safework123

### 캐시 설정
- `REDIS_HOST`: safework-redis
- `REDIS_PORT`: 6379
- `REDIS_PASSWORD`: (옵션)

### CI/CD 설정 (GitHub Secrets)
- `REGISTRY_URL`: registry.jclee.me
- `REGISTRY_USER`: admin
- `REGISTRY_PASSWORD`: bingogo1
- `SLACK_WEBHOOK_URL`: Slack 알림용 웹훅 URL
- `DISCORD_WEBHOOK_URL`: Discord 알림용 웹훅 URL

## 📊 주요 기능

### 사용자 기능
- 🖊️ 증상조사표 온라인 작성
- 📄 PDF 양식 다운로드 (`/forms/001_musculoskeletal_symptom_survey.pdf`)
- 📝 제출 이력 확인
- 📱 모바일 반응형 인터페이스

### 관리자 기능
- 📊 실시간 대시보드 (`/admin/dashboard`)
- 📋 제출 데이터 조회/검색 (`/admin/surveys`)
- 📥 Excel 다운로드
- 📈 통계 분석 및 고위험군 모니터링
- 🗂️ 마이그레이션 관리 (`/admin/migrations`)

### 시스템 기능
- 🔍 헬스 체크 (`/health`)
- 🗂️ 데이터베이스 마이그레이션 시스템
- 🛡️ 자동 보안 스캔
- 📊 성능 모니터링
- 🔔 실시간 알림

## 🛡️ 보안

### 자동 보안 스캔
- **취약점 스캔**: Safety (Python 패키지), Bandit (코드 분석)
- **컨테이너 보안**: Trivy, Snyk
- **비밀 정보 탐지**: TruffleHog, GitLeaks, detect-secrets
- **정적 분석**: Semgrep (SAST)

### 보안 기능
- 🔐 JWT 기반 인증
- 🔒 데이터 암호화
- 📝 감사 로그
- 🌐 IP 기반 접근 제어
- 🛡️ 보안 헤더 설정

### 컴플라이언스
- 📋 GDPR 컴플라이언스 확인
- 📜 라이선스 컴플라이언스 체크
- 🔍 보안 헤더 검증

## 📈 품질 관리

### 자동 코드 품질 검사
- **포매팅**: Black (Python 코드 포매터)
- **린팅**: Flake8, Pylint
- **타입 체킹**: MyPy
- **복잡도 분석**: Radon
- **Import 정렬**: isort

### 테스트
- **단위 테스트**: pytest
- **통합 테스트**: Docker Compose 기반
- **성능 테스트**: 벤치마크 및 부하 테스트
- **접근성 테스트**: axe, pa11y, Lighthouse

### 품질 게이트
- 📊 복잡도 임계값: 최대 5개 복잡한 함수
- 📚 문서화 커버리지: 최소 60%
- 🧪 테스트 커버리지: 목표 80%

## 🔄 데이터베이스 마이그레이션

SafeWork는 강력한 마이그레이션 시스템을 제공합니다:

### CLI 사용
```bash
# 상태 확인
python app/migrate.py status

# 마이그레이션 실행
python app/migrate.py migrate

# 새 마이그레이션 생성
python app/migrate.py create "Add new feature"

# 롤백
python app/migrate.py rollback --version 002
```

### 웹 인터페이스
- URL: `http://localhost:4545/admin/migrations`
- 마이그레이션 상태 시각화
- 웹에서 마이그레이션 실행/롤백
- 실시간 진행 상황 모니터링

자세한 내용은 [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)를 참조하세요.

## 📊 모니터링 & 로깅

### 헬스 체크
```bash
curl http://localhost:4545/health
```

### 로그 확인
```bash
# 애플리케이션 로그
docker logs safework-app

# 마이그레이션 로그
docker logs safework-app | grep "🗂️"

# 실시간 로그
docker logs -f safework-app
```

### 성능 모니터링
- 응답 시간 추적
- 데이터베이스 성능 모니터링
- 메모리 및 CPU 사용량 추적
- 사용자 접근 패턴 분석

## 🚨 문제 해결

### 배포 실패 시
1. GitHub Actions 로그 확인
2. Discord/Slack 알림 확인
3. 자동 생성된 GitHub Issue 확인
4. 필요 시 이전 버전으로 롤백

### 마이그레이션 문제 시
```bash
# 마이그레이션 상태 확인
make migrate-status

# 백업 생성
make migrate-backup

# 문제 해결 후 재시도
make migrate-rollback
make migrate-run
```

### 컨테이너 문제 시
```bash
# 컨테이너 상태 확인
make status

# 로그 확인
make logs

# 재시작
make restart
```

## 📈 버전 히스토리

### v1.2.0 (2024-08-28) 🚀
- **고급 CI/CD 파이프라인**: 보안, 품질, 배포 자동화 완성
- **데이터베이스 마이그레이션**: 웹 인터페이스와 CLI 도구 완성
- **보안 강화**: Trivy, Bandit, Safety, Semgrep 통합
- **품질 관리**: Black, Flake8, Pylint, MyPy 자동 검사
- **다중 환경**: Development, Staging, Production 지원
- **모니터링**: Slack/Discord 알림, 실시간 헬스체크
- **파일 정리**: 영문 파일명 적용, 중복 제거

### v1.1.1 (2024-08-28)
- 모바일 오버플로 수정: CSS flex-wrap, 반응형 버튼 크기 최적화
- 관리자 시스템 완성: 대시보드, 조사표 목록, 통계 분석, Excel 내보내기
- Docker Compose 지원: docker-compose.yml 및 관리 스크립트 추가
- 네트워크 연결 문제 해결: safework-net 설정 개선

### v1.1.0 (2024-08-28)
- 관리자 기능 구현: /admin/dashboard, /admin/surveys
- 감사 로그 시스템 추가
- 권한 기반 접근 제어 강화

### v1.0.2 (2024-08-28)
- PDF 001 근골격계 증상조사표 정확 구현
- 비표준 파일명 제거 (backup, correct, new_ 등)
- 헬스체크 엔드포인트 추가 (/health)
- GitHub Actions CI/CD 파이프라인 구축

## 📞 지원

- 📧 이메일: admin@safework.com
- 🐛 버그 리포트: GitHub Issues
- 📖 문서: [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md), [WORKFLOW.md](WORKFLOW.md)
- 🔧 기술 지원: Docker, Flask, MySQL 전문 지원

## 📝 라이센스

Proprietary - SafeWork 2024

---

> 💡 **팁**: GitOps 워크플로를 통해 안전하고 자동화된 배포를 경험해보세요. 코드 품질과 보안이 자동으로 관리됩니다!