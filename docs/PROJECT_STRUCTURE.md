# SafeWork 프로젝트 구조

**마지막 업데이트**: 2025-10-04
**아키텍처**: 100% Cloudflare Native Serverless

---

## 📁 최상위 디렉토리

```
safework/
├── ⚡ workers/                # Cloudflare Workers (Main - 운영 중)
├── 🏢 app/                     # Flask (Legacy)
├── 🗄️ postgres/                # PostgreSQL 설정 (Legacy)
├── 🔄 redis/                   # Redis 설정 (Legacy)
├── 📜 scripts/                 # 배포 및 유틸리티 스크립트
├── 📊 data/                    # 데이터 파일들
├── 📚 docs/                    # 프로젝트 문서
├── 🗂️ archived/                # 사용하지 않는 구형 코드
└── 📋 tests/                   # 테스트 코드
```

---

## ⚡ Cloudflare Workers (Main - 운영 중)

### workers/ 구조

```
workers/
├── src/                        # TypeScript 소스 코드
│   ├── index.ts                # 메인 라우터 (Hono.js)
│   ├── routes/                 # API 라우트 모듈
│   │   ├── survey-d1.ts        # D1 Survey API (001)
│   │   ├── survey-002-d1.ts    # D1 Survey API (002)
│   │   ├── admin-unified.ts    # 통합 관리자 대시보드
│   │   ├── native-api.ts       # R2, AI, Queue 서비스
│   │   ├── warning-sign.ts     # GHS/KOSHA 경고표지판
│   │   ├── health.ts           # Workers 헬스체크
│   │   ├── auth.ts             # JWT 인증
│   │   ├── excel-processor.ts  # Excel 처리
│   │   ├── form-001.ts         # 001 양식
│   │   ├── form-002.ts         # 002 양식
│   │   ├── admin.ts            # 001 관리자
│   │   ├── admin-002.ts        # 002 관리자
│   │   ├── survey.ts           # Legacy Survey API
│   │   └── worker.ts           # 작업자 관리 (JWT)
│   ├── db/                     # D1 데이터베이스
│   │   ├── d1-client.ts        # D1 클라이언트 래퍼
│   │   └── models.ts           # TypeScript 모델 정의
│   ├── services/               # 비즈니스 로직
│   │   ├── r2-storage.ts       # R2 파일 관리
│   │   ├── ai-service.ts       # Workers AI 통합
│   │   └── queue-service.ts    # Queue 작업 처리
│   └── templates/              # HTML 템플릿
│       ├── 001.ts              # 001 양식 템플릿
│       ├── 002.ts              # 002 양식 템플릿
│       ├── 001-complete.ts     # 001 완료 페이지
│       ├── 001-dv06-restore.ts # 001 DV06 복구 버전
│       └── survey-002-form.ts  # 002 설문 양식
├── d1-schema.sql               # D1 데이터베이스 스키마
├── wrangler.toml               # Cloudflare 설정
├── package.json                # Node.js 의존성
├── tsconfig.json               # TypeScript 설정
├── vitest.config.ts            # Vitest 테스트 설정
└── CLOUDFLARE-NATIVE.md        # 네이티브 아키텍처 가이드
```

### 핵심 기능

**API 엔드포인트 (60+)**:
- `/api/health` - Workers 헬스체크
- `/api/native/native/health` - 네이티브 서비스 상태
- `/api/survey/d1/*` - D1 기반 Survey API (001)
- `/api/survey/d1/002/*` - D1 기반 Survey API (002)
- `/admin` - 통합 관리자 대시보드
- `/api/native/files/*` - R2 파일 관리
- `/api/native/ai/*` - Workers AI 서비스
- `/api/warning-sign/*` - 경고표지판 생성

**데이터 바인딩**:
- **D1**: `PRIMARY_DB` → `safework-primary`
- **KV**: `SAFEWORK_KV`, `CACHE_LAYER`, `AUTH_STORE`
- **R2**: `SAFEWORK_STORAGE` → `safework-storage-prod`
- **AI**: Llama 3 모델

---

## 🏢 Flask 애플리케이션 (Legacy)

### app/ 구조

```
app/
├── routes/                     # Blueprint 라우트
│   ├── admin/                  # 관리자 라우트
│   ├── api_safework.py         # SafeWork API
│   ├── auth.py                 # 인증
│   ├── health.py               # 헬스체크
│   ├── main.py                 # 메인 페이지
│   └── survey.py               # 설문조사
├── templates/                  # Jinja2 템플릿
│   ├── admin/                  # 관리자 페이지
│   ├── survey/                 # 설문조사 페이지
│   └── base.html               # 기본 템플릿
├── static/                     # CSS, JS, 이미지
├── models.py                   # SQLAlchemy 모델
├── app.py                      # Flask 앱 팩토리
└── config.py                   # 설정 파일
```

**상태**: Legacy (참고용)
**마이그레이션 완료**: D1로 완전 이전

---

## 🔧 인프라 및 배포

### CI/CD 파이프라인

**GitHub Actions**:
```
.github/workflows/
├── cloudflare-workers-deployment.yml    # Workers 자동 배포 (활성)
├── portainer-deployment.yml.disabled    # Flask 배포 (비활성)
├── cloudflare-workers-deploy.yml.disabled
└── serverless-deploy.yml.disabled
```

**트리거 조건**:
- `workers/**` 파일 변경 → Workers 배포
- `master` 브랜치 push

### 배포 스크립트 (scripts/)

```
scripts/
├── sync-postgres-to-d1.py      # PostgreSQL → D1 마이그레이션
├── deployment_monitor.sh        # 배포 모니터링
└── config/                      # 스크립트 설정
```

### Docker 구성 (Legacy)

- `docker-compose.yml`: Flask + PostgreSQL + Redis
- `app/Dockerfile`: Flask 애플리케이션
- `postgres/Dockerfile`: PostgreSQL 15
- `redis/Dockerfile`: Redis 7.0

**상태**: Legacy (참고용)

---

## 🗃️ 데이터베이스

### D1 Database (Production)

- **Database**: `safework-primary`
- **ID**: `d1db1d92-f598-415e-910f-1af511bc182f`
- **스키마**: `workers/d1-schema.sql`
- **테이블**: users, companies, processes, roles, surveys, audit_logs 등 10개

### PostgreSQL (Legacy)

- **Database**: `safework_db`
- **스키마**: `postgres/migrations/`
- **모델**: `app/models*.py`
- **상태**: Legacy (마이그레이션 완료)

### KV Storage

- **SAFEWORK_KV**: 54cbaf6aeff64ebbab07adb7ac56f5c8 (세션, 폼, 캐시)
- **CACHE_LAYER**: 5a30c645c88644068089f1733b2c81b9 (계산된 데이터)
- **AUTH_STORE**: e6a6466f4c53466087f6fdd2cd6ca001 (JWT, API 키)

### R2 Object Storage

- **Bucket**: `safework-storage-prod`
- **용도**: Excel 파일, 보고서, 첨부파일

---

## 📚 문서 구조

```
docs/
├── API_ENDPOINTS.md                    # API 명세서 (60+ endpoints)
├── CLOUDFLARE_DEPLOYMENT.md            # Cloudflare 배포 가이드
├── PROJECT_STRUCTURE.md                # 프로젝트 구조 (이 파일)
├── MIGRATION-SUMMARY.md                # 마이그레이션 요약
├── URL_ENDPOINTS.md                    # 구 URL 명세 (deprecated)
├── architecture/
│   ├── D1-MIGRATION-COMPLETE.md        # D1 마이그레이션 완료
│   └── MIGRATION-SUCCESS-SUMMARY.md    # 마이그레이션 성공 요약
├── operations/
│   ├── SESSION-OPTIMIZATION.md         # 세션 최적화
│   └── RAW_DATA_CATALOG.md             # 원시 데이터 카탈로그
└── legacy/
    └── README-002.md                   # 002 Legacy 문서
```

---

## 📊 모니터링 및 로그

### Cloudflare 모니터링

```bash
# Workers 로그 스트리밍
wrangler tail --env production

# 배포 이력 확인
wrangler deployments list --env production

# D1 쿼리
wrangler d1 execute PRIMARY_DB --command="SELECT COUNT(*) FROM surveys" --remote

# KV 조회
wrangler kv:key list --binding=SAFEWORK_KV --env=production

# R2 파일 목록
wrangler r2 object list safework-storage-prod
```

### 헬스체크 엔드포인트

- **Workers**: https://safework.jclee.me/api/health
- **Native Services**: https://safework.jclee.me/api/native/native/health
- **GitHub Actions**: https://github.com/qws941/safework/actions

---

## 🎯 기술 스택

### Production (Cloudflare)

| 레이어 | 기술 | 설명 |
|--------|------|------|
| **Edge Runtime** | Cloudflare Workers | 300+ 글로벌 엣지 로케이션 |
| **Framework** | Hono.js | 경량 TypeScript 웹 프레임워크 |
| **Database** | D1 | Serverless SQLite at Edge |
| **Cache** | KV Namespaces | 초고속 키-값 저장소 |
| **Storage** | R2 | S3 호환 객체 저장소 |
| **AI** | Workers AI | Llama 3 모델 |
| **Language** | TypeScript 5.0+ | 타입 안전성 |
| **Build** | Wrangler 4.42.0 | Cloudflare CLI |
| **Testing** | Vitest | 단위 테스트 |
| **CI/CD** | GitHub Actions | 자동 배포 |

### Legacy (참고용)

- **Backend**: Flask 3.0+ (Python)
- **Database**: PostgreSQL 15
- **Cache**: Redis 7.0
- **Container**: Docker + Docker Compose
- **Deployment**: Portainer + Registry

---

## 🚀 빠른 시작

### Workers 개발

```bash
cd workers/
npm install
npm run dev              # http://localhost:8787
npm run type-check       # TypeScript 검증
npm run lint:fix         # ESLint 자동 수정
npm test                 # Vitest 테스트
```

### Workers 배포

```bash
# 자동 배포 (권장)
git add workers/
git commit -m "feat: Update worker"
git push origin master

# 수동 배포
cd workers/
npm run deploy:prod
```

### D1 개발

```bash
# 로컬 D1 스키마 적용
wrangler d1 execute PRIMARY_DB --file=d1-schema.sql --local

# 로컬 개발 서버 (D1 포함)
npm run dev
```

---

## 📈 프로젝트 진화

### Phase 1: Flask + Docker (2024.9)
- Flask 웹 애플리케이션
- PostgreSQL + Redis
- Docker 컨테이너화
- Portainer 배포

### Phase 2: Cloudflare Hybrid (2024.10)
- Cloudflare Workers 추가
- KV Namespace 통합
- Edge API 구현

### Phase 3: Full Serverless (2025.10) ✅ **현재**
- 100% Cloudflare Native
- D1 Database 마이그레이션 완료
- R2 Storage 통합
- Workers AI 통합
- Legacy 시스템 Deprecated

---

## 🔗 관련 문서

- [README.md](../README.md) - 프로젝트 개요
- [CLAUDE.md](../CLAUDE.md) - Claude Code 가이드
- [API_ENDPOINTS.md](API_ENDPOINTS.md) - API 명세서
- [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md) - 배포 가이드

---

**SafeWork는 100% Cloudflare Native Serverless 플랫폼으로 진화했습니다!** ⚡
