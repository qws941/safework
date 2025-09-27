# SafeWork 프로젝트 구조

## 📁 최상위 디렉토리

```
safework/
├── app/                     # Flask 메인 애플리케이션
├── archived/                # 사용하지 않는 구형 코드 아카이브
├── cloudflare-workers/      # Cloudflare Workers 프로젝트
├── config/                  # 환경 설정 파일들
├── data/                    # 데이터 파일들
├── postgres/                # PostgreSQL 관련 설정
├── redis/                   # Redis 관련 설정
├── scripts/                 # 배포 및 관리 스크립트
├── tests/                   # 테스트 코드
├── workers/                 # 현재 사용 중인 Workers 프로젝트
└── logs/                    # 로그 파일들
```

## 🏗️ 핵심 애플리케이션 구조 (app/)

```
app/
├── routes/                  # 라우트 모듈들
│   ├── admin/              # 관리자 관련 라우트
│   ├── api_safework.py     # SafeWork API
│   ├── api_safework_v2.py  # SafeWork API v2
│   ├── auth.py             # 인증 관련
│   ├── health.py           # 헬스체크
│   ├── main.py             # 메인 페이지
│   ├── survey.py           # 설문조사
│   └── ...
├── templates/              # Jinja2 템플릿
│   ├── admin/              # 관리자 페이지 템플릿
│   ├── auth/               # 인증 페이지 템플릿
│   ├── errors/             # 에러 페이지 템플릿
│   ├── survey/             # 설문조사 템플릿
│   └── base.html           # 기본 템플릿
├── static/                 # 정적 파일 (CSS, JS, 이미지)
├── utils/                  # 유틸리티 함수들
├── cache/                  # 캐시 파일들
├── uploads/                # 업로드된 파일들
├── app.py                  # Flask 애플리케이션 팩토리
├── config.py               # 설정 파일
├── models.py               # 데이터베이스 모델
├── models_safework.py      # SafeWork 전용 모델
├── models_document.py      # 문서 관련 모델
└── forms.py                # Flask-WTF 폼
```

## 🔧 인프라 및 배포

### Docker 구성
- `docker-compose.yml`: 메인 컨테이너 오케스트레이션
- `app/Dockerfile`: Flask 애플리케이션 컨테이너
- `postgres/Dockerfile`: PostgreSQL 컨테이너
- `redis/Dockerfile`: Redis 컨테이너

### 배포 스크립트 (scripts/)
```
scripts/
├── safework_portainer_deployment.sh    # 통합 배포 스크립트
├── webhook-deploy.sh                    # Webhook 배포
├── deployment_health_validator.sh       # 헬스체크 검증
├── cloudflare-*.sh                     # Cloudflare 관련 스크립트
└── config/                             # 스크립트 설정 파일
```

### CI/CD (.github/workflows/)
- `portainer-deployment.yml`: 메인 배포 파이프라인
- `cloudflare-workers-deploy.yml`: Cloudflare Workers 배포
- `serverless-deploy.yml`: 서버리스 배포 (아카이브됨)

## 🌐 Cloudflare Workers

### 메인 Workers (workers/)
- 현재 사용 중인 Workers 프로젝트
- TypeScript 기반
- 설문조사 및 API 기능

### 레거시 Workers (cloudflare-workers/)
- 이전 버전의 Workers 프로젝트
- 마이그레이션 도구 및 백업 데이터 포함

## 🗃️ 데이터베이스

### PostgreSQL
- 메인 데이터베이스: `safework_db`
- 스키마: `postgres/migrations/`
- 모델: `app/models*.py`

### Redis
- 캐시 및 세션 저장소
- 설정: `redis/redis.conf`

## 📊 모니터링 및 로그

### 로그 관리
- 애플리케이션 로그: `logs/`
- 컨테이너 로그: Docker logs
- 배포 로그: Portainer/GitHub Actions

### 헬스체크
- `/health`: 기본 헬스체크
- `/health/detailed`: 상세 헬스체크
- 컴포넌트별 상태 모니터링

## 🔐 보안 및 설정

### 환경 변수
- 프로덕션: GitHub Secrets
- 개발: `.env` 파일 (gitignore됨)
- 설정: `config/environments/`

### 인증
- Flask-Login 기반
- 모바일 PIN 인증
- Admin 패널 접근 제어

## 📝 문서화

### 주요 문서
- `README.md`: 프로젝트 개요 및 설정 가이드
- `CLAUDE.md`: Claude Code 작업 가이드
- `CLOUDFLARE_DEPLOYMENT.md`: Cloudflare 배포 가이드
- `URL_ENDPOINTS.md`: API 엔드포인트 문서
- `PROJECT_STRUCTURE.md`: 이 파일

### 아카이브
- `archived/`: 더 이상 사용하지 않는 코드
- `MIGRATION-SUMMARY.md`: 마이그레이션 기록

## 🧹 유지보수

### 자동 정리 대상 (.gitignore)
- Python 캐시: `__pycache__/`, `*.pyc`
- Node.js: `node_modules/`
- Cloudflare: `.wrangler/`
- 로그 파일: `*.log`, `logs/`
- 백업 파일: `*backup*`, `*.bak`
- 임시 파일: `*.tmp`, `temp/`

### 정기 정리 권장사항
1. 로그 파일 로테이션
2. 캐시 디렉토리 정리
3. 미사용 컨테이너 이미지 정리
4. 아카이브 디렉토리 검토

---

**최종 업데이트**: 2025-09-27
**관리 도구**: Claude Code, Portainer, GitHub Actions