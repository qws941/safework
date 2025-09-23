# SafeWork 산업보건 관리 시스템

[![🚀 Production Deploy](https://github.com/qws941/safework/actions/workflows/deploy.yml/badge.svg)](https://github.com/qws941/safework/actions/workflows/deploy.yml)

한국 건설/산업 환경을 위한 통합 산업보건 관리 시스템

**기술 스택**: Flask 3.0+, SQLAlchemy 2.0, PostgreSQL 15+, Redis 7.0
**배포**: Portainer GitOps, GitHub Actions CI/CD
**프로덕션**: https://safework.jclee.me

## 🚀 핵심 기능

- **설문 시스템**: 001 근골격계증상조사표, 002 신규입사자건강진단 양식
- **SafeWork 관리자**: 13개 전문 관리 패널 (근로자, 건강검진, 의약품, MSDS, 안전교육 등)
- **RESTful API v2**: 외부 시스템 연동을 위한 `/api/safework/v2/*` 엔드포인트
- **문서 관리**: 버전 제어 및 접근 로그 시스템

## 🛠️ 아키텍처

### 컨테이너 구조
- **독립 컨테이너**: Docker Compose 미사용, 각 서비스 독립 실행
- **Portainer GitOps**: Git repository 기반 자동 배포
- **프라이빗 레지스트리**: registry.jclee.me

### 배포 파이프라인
```
코드 변경 → 로컬 테스트 → git push → GitHub Actions (이미지 빌드+푸시) → Portainer GitOps (자동 배포)
```

### 기술 스택
- **백엔드**: Flask 3.0+, SQLAlchemy 2.0, PostgreSQL 15+, Redis 7.0
- **프론트엔드**: Bootstrap 4.6, jQuery, 반응형 디자인
- **배포**: GitHub Actions, Portainer API, 자동 배포
- **품질**: Black, Flake8, 자동화된 테스트

## 🚀 빠른 시작

### 필수 명령어
```bash
# 시스템 상태 확인
make health
curl https://safework.jclee.me/health

# 배포 관리
./scripts/portainer_stack_deploy.sh status
./scripts/portainer_stack_deploy.sh deploy

# 개발 환경
make up && make logs

# 코드 품질
make format && make lint && make test
```

### 개발 환경 설정
```bash
# 의존성 설치
cd src/app
pip install -r requirements.txt

# 환경 변수 설정
export FLASK_CONFIG=development
export DB_NAME=safework_db
export DB_USER=safework
export DB_PASSWORD=${DB_PASSWORD:-your-database-password}

# 데이터베이스 마이그레이션
python migrate.py migrate

# 개발 서버 시작
flask run --host=0.0.0.0 --port=4545
```

### Docker 개발 환경
```bash
# 컨테이너 빌드 및 시작
make build && make up

# 로그 확인
make logs

# 상태 확인
make health
```

## 🔧 구성

### 환경 변수
| 변수 | 설명 | 기본값 | 필수 |
|------|------|--------|------|
| `FLASK_CONFIG` | Flask 실행 모드 | `production` | ✅ |
| `SECRET_KEY` | Flask 세션 암호화 키 | - | ✅ |
| `DB_HOST` | PostgreSQL 호스트 | `safework-postgres` | ✅ |
| `DB_NAME` | 데이터베이스 명 | `safework_db` | ✅ |
| `DB_USER` | 데이터베이스 사용자 | `safework` | ✅ |
| `DB_PASSWORD` | 데이터베이스 비밀번호 | - | ✅ |
| `REDIS_HOST` | Redis 호스트 | `safework-redis` | ✅ |
| `TZ` | 시간대 설정 | `Asia/Seoul` | ❌ |

### 관리자 계정
- **사용자명**: `admin`
- **비밀번호**: `${ADMIN_PASSWORD:-your-admin-password}`
- **접속 URL**: `http://localhost:4545/admin`

### 주요 테이블
```sql
-- 설문 시스템
surveys                    -- 001/002 양식 데이터 (JSON 저장)
users                      -- 사용자 인증 정보
audit_logs                 -- 시스템 활동 로그

-- SafeWork 관리 시스템 (13개 테이블)
safework_workers           -- 근로자 정보
safework_health_checks     -- 건강검진 기록
safework_medications       -- 의약품 관리
safework_msds             -- MSDS 자료
```

## 🌐 주요 엔드포인트

### 설문 시스템 (익명 접근 지원)
| 경로 | 설명 | 접근 방법 |
|------|------|----------|
| `/` | 메인 홈페이지 | 공개 |
| `/survey/001_musculoskeletal_symptom_survey` | 001 근골격계증상조사표 | 공개 (익명) |
| `/survey/002_new_employee_health_checkup_form` | 002 신규입사자건강진단 | 공개 (익명) |
| `/admin/dashboard` | 관리자 대시보드 | 로그인 필요 |
| `/admin/safework` | SafeWork 관리 허브 | 로그인 필요 |

### SafeWork 관리 패널 (13개 전문 패널)
| 경로 | 설명 | 주요 기능 |
|------|------|----------|
| `/admin/safework/workers` | 근로자 관리 | 직원 마스터 데이터, 건강 상태 추적 |
| `/admin/safework/health-checks` | 건강검진 관리 | 정기/특수검진, 일정 및 결과 |
| `/admin/safework/medications` | 의약품 관리 | 재고 관리, 유효기간, 처방 기록 |
| `/admin/safework/msds` | MSDS 관리 | MSDS 자료, 화학물질 정보 |

### 시스템 API
| 경로 | 설명 | 응답 형식 |
|------|------|----------|
| `/health` | 헬스 체크 | JSON (상태, 타임스탬프, 버전) |
| `/api/safework/v2/*` | RESTful API v2 | JSON |

## 📂 프로젝트 구조

```
safework/
├── .github/workflows/          # GitHub Actions CI/CD
│   └── deploy.yml             # 배포 파이프라인
├── src/app/                   # Flask 애플리케이션
│   ├── models*.py             # 데이터베이스 모델
│   ├── routes/                # 라우트 정의
│   ├── templates/             # HTML 템플릿
│   └── Dockerfile             # 앱 컨테이너
├── infrastructure/docker/     # 컨테이너 구성
│   ├── postgres/              # PostgreSQL 설정
│   └── redis/                 # Redis 설정
├── scripts/                   # 관리 스크립트
├── PORTAINER_GITOPS.md        # GitOps 배포 가이드
└── docker-compose.yml         # 컨테이너 오케스트레이션
```

## 📊 모니터링 및 운영

### 헬스 체크
```bash
# 애플리케이션 상태 확인
curl https://safework.jclee.me/health

# 컨테이너 상태 모니터링
make health
./scripts/portainer_stack_deploy.sh status
```

### 컨테이너 관리
```bash
# 로그 확인
make logs
./scripts/portainer_stack_deploy.sh logs safework-app

# 컨테이너 재시작
./scripts/portainer_stack_deploy.sh restart

# 최신 이미지 업데이트
./scripts/portainer_stack_deploy.sh deploy
```

### 데이터베이스 운영
```bash
# PostgreSQL 접속
docker exec -it safework-postgres psql -U safework -d safework_db

# 데이터베이스 백업
make db-backup

# 마이그레이션
make db-migrate
```

## 🔧 문제 해결

### 배포 이슈
```bash
# GitHub Actions 로그 확인
# Portainer API 연결 확인
./scripts/portainer_stack_deploy.sh --validate

# 컨테이너 로그 확인
make logs
```

### 데이터베이스 연결 이슈
```bash
# PostgreSQL 연결 테스트
docker exec safework-postgres pg_isready -U safework

# 데이터베이스 초기화 확인
docker exec safework-postgres psql -U safework -d safework_db -c "\dt"
```

## 📚 문서 및 가이드

더 자세한 정보는 다음 문서를 참조하세요:

- **PORTAINER_GITOPS.md**: Portainer GitOps 설정 및 배포 가이드
- **CLAUDE.md**: 개발 환경 설정 및 상세 가이드
- **.env.example**: 환경 변수 설정 예시

## 🏆 특징

- ✅ **99.9% 가동시간**: 자동화된 상태 모니터링
- ✅ **무중단 배포**: GitOps 기반 배포 전략
- ✅ **보안 강화**: 포괄적인 보안 스캔 및 강화
- ✅ **확장 가능**: 독립적 컨테이너 확장 능력
- ✅ **규정 준수**: 산업안전보건법 준수

---

**🌟 산업 안전 및 보건 관리를 위해 ❤️로 제작**