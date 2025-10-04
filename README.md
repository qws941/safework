# SafeWork - 산업안전보건관리시스템

[![Deployment Status](https://img.shields.io/badge/deployment-active-green)](https://safework.jclee.me)
[![Health Check](https://img.shields.io/badge/health-monitoring-blue)](https://safework.jclee.me/api/health)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> 한국 건설/산업 환경을 위한 종합 산업안전보건관리시스템
> **100% Cloudflare Native Serverless** - Workers, D1, KV, R2, AI

## 🌟 주요 기능

- **📋 설문조사 시스템**: D1 기반 근골격계부담작업 유해요인조사 등 전문 설문
- **🔍 Excel 처리**: 자동화된 Excel 파일 분석 및 설문 구조 추출
- **👥 통합 관리자 패널**: 실시간 데이터 관리 및 보고서 생성
- **⚡ Edge API**: Cloudflare Workers 기반 글로벌 성능 최적화
- **🤖 AI 분석**: Workers AI (Llama 3) 기반 설문 검증 및 인사이트
- **📊 실시간 모니터링**: 네이티브 서비스 헬스체크

## 🚀 Quick Start

### ⚡ Cloudflare Workers (Production)

```bash
# Workers 개발 서버
cd workers/
npm run dev              # http://localhost:8787

# 배포
npm run deploy:prod      # Production 배포
npm run deploy:dev       # Development 배포

# 타입 체크
npm run type-check
```

### 🐳 Legacy Docker 환경 (참고용)

```bash
# 컨테이너 시작
docker-compose up -d

# 상태 확인
curl http://localhost:4545/health
```

## 📁 프로젝트 구조

```
safework/
├── ⚡ workers/          # Cloudflare Workers (Main)
│   ├── src/
│   │   ├── index.ts         # 메인 라우터
│   │   ├── routes/          # API 라우트
│   │   │   ├── survey-d1.ts      # D1 Survey API (001)
│   │   │   ├── survey-002-d1.ts  # D1 Survey API (002)
│   │   │   ├── admin-unified.ts  # 통합 관리자
│   │   │   ├── native-api.ts     # R2, AI, Queue
│   │   │   └── warning-sign.ts   # 경고표지판
│   │   ├── db/              # D1 클라이언트
│   │   ├── services/        # R2, AI, Queue 서비스
│   │   └── templates/       # HTML 템플릿
│   ├── d1-schema.sql        # D1 스키마
│   └── wrangler.toml        # Cloudflare 설정
├── 🏢 app/              # Flask (Legacy)
├── 📚 docs/            # 프로젝트 문서
│   ├── API_ENDPOINTS.md            # API 명세 (60+ endpoints)
│   ├── CLOUDFLARE_DEPLOYMENT.md    # 배포 가이드
│   └── architecture/
│       └── D1-MIGRATION-COMPLETE.md
└── 📜 scripts/         # 배포/유틸리티 스크립트
```

## 🏗️ 아키텍처

### ⚡ 100% Cloudflare Native Serverless

```
[Client] → [Cloudflare Workers] → [D1/KV/R2/AI]
              ↓ Edge Computing
           300+ Global Locations
```

**핵심 기술 스택**:
- **Workers**: Hono.js 프레임워크, TypeScript
- **D1 Database**: Serverless SQLite (`safework-primary`)
- **KV Namespaces**: SAFEWORK_KV, CACHE_LAYER, AUTH_STORE (3개)
- **R2 Storage**: `safework-storage-prod` (파일 저장)
- **Workers AI**: Llama 3 모델 (`@cf/meta/llama-3-8b-instruct`)
- **Queues**: 백그라운드 작업 (Paid Plan)

### 🔄 자동 배포 파이프라인

```bash
git push origin master (workers/** 변경)
    ↓
GitHub Actions (자동 트리거)
    ↓
wrangler deploy --env production
    ↓
Health Check 검증
    ↓
300+ Edge Locations 배포 완료
```

## 🚀 배포 및 운영

### 🔄 자동 배포 (GitHub Actions)

```bash
# 자동 배포 (workers/** 파일 변경시)
git add workers/
git commit -m "feat: Update worker"
git push origin master

# 수동 배포
cd workers/
npm run deploy:prod
```

### 📊 모니터링

```bash
# 서비스 상태 확인
curl https://safework.jclee.me/api/health
curl https://safework.jclee.me/api/native/native/health

# Workers 로그 스트리밍
cd workers/
npm run tail
```

### 🛠️ 개발 도구

```bash
# Workers 개발
cd workers/
npm run dev              # 로컬 개발 서버
npm run type-check       # TypeScript 검증
npm run lint:fix         # ESLint 자동 수정
npm test                 # Vitest 테스트

# D1 데이터베이스
wrangler d1 execute PRIMARY_DB --file=d1-schema.sql --local
wrangler d1 execute PRIMARY_DB --command="SELECT COUNT(*) FROM surveys" --remote --env=production
```

## 🔗 Production URLs

| 서비스 | URL | 설명 |
|--------|-----|------|
| 🌐 **메인** | https://safework.jclee.me | 메인 웹 서비스 |
| 🌐 **Workers.dev** | https://safework.jclee.workers.dev | Cloudflare 기본 도메인 |
| 🔧 **API** | https://safework.jclee.me/api | RESTful API |
| 👥 **관리자** | https://safework.jclee.me/admin | 통합 관리자 패널 |
| 📋 **설문 001** | https://safework.jclee.me/survey/001_musculoskeletal_symptom_survey | 근골격계 증상조사표 |
| 📋 **설문 002** | https://safework.jclee.me/survey/002_musculoskeletal_symptom_program | 근골격계부담작업 유해요인조사 |
| 📊 **D1 API** | https://safework.jclee.me/api/survey/d1/* | D1 Survey API |
| ⚡ **Native API** | https://safework.jclee.me/api/native/* | R2, AI, Queue 서비스 |
| 💚 **Health** | https://safework.jclee.me/api/health | Workers 상태 확인 |
| 💚 **Native Health** | https://safework.jclee.me/api/native/native/health | 네이티브 서비스 상태 |

## 🛡️ 환경설정

### 🔑 Cloudflare 환경변수 (wrangler.toml)

```toml
[env.production]
JWT_SECRET = "safework-jwt-secret-2024-production"
ADMIN_USERNAME = "admin"
BACKEND_URL = "https://safework.jclee.me"
ENVIRONMENT = "production"
DEBUG = "false"
```

### 📦 Cloudflare 리소스 바인딩

```toml
# D1 Database
PRIMARY_DB → safework-primary (d1db1d92-f598-415e-910f-1af511bc182f)

# KV Namespaces
SAFEWORK_KV → 54cbaf6aeff64ebbab07adb7ac56f5c8
CACHE_LAYER → 5a30c645c88644068089f1733b2c81b9
AUTH_STORE → e6a6466f4c53466087f6fdd2cd6ca001

# R2 Storage
SAFEWORK_STORAGE → safework-storage-prod

# Workers AI
AI → @cf/meta/llama-3-8b-instruct
```

## 📚 문서

| 문서 | 설명 |
|------|------|
| [📋 CLAUDE.md](CLAUDE.md) | Claude Code 프로젝트 가이드 |
| [🔗 API 엔드포인트](docs/API_ENDPOINTS.md) | 전체 API 명세서 (60+ endpoints) |
| [☁️ Cloudflare 배포](docs/CLOUDFLARE_DEPLOYMENT.md) | Workers 배포 가이드 |
| [🗄️ D1 마이그레이션](docs/architecture/D1-MIGRATION-COMPLETE.md) | D1 마이그레이션 완료 문서 |
| [📁 프로젝트 구조](docs/PROJECT_STRUCTURE.md) | 상세 아키텍처 설명 |

## 🏥 상태 확인

### 🔍 헬스체크

```bash
# Workers 상태
curl https://safework.jclee.me/api/health

# 네이티브 서비스 전체 상태 (D1, KV, R2, AI, Queue)
curl https://safework.jclee.me/api/native/native/health

# 예상 응답
{
  "success": true,
  "services": {
    "d1": { "status": "healthy" },
    "kv": { "status": "healthy" },
    "r2": { "status": "healthy" },
    "ai": { "status": "healthy" },
    "queue": { "status": "unavailable" }  # Paid Plan 필요
  }
}
```

### 📊 성능 특성

- **Edge Response Time**: ~50ms (글로벌 평균)
- **D1 Query Time**: ~10ms (Edge SQLite)
- **KV Read/Write**: ~1ms (Key-Value 저장소)
- **R2 Storage**: Unlimited capacity
- **Global Distribution**: 300+ Cloudflare 엣지 로케이션

## 🚨 문제 해결

### 일반적인 이슈

| 문제 | 해결방법 |
|------|----------|
| 배포 실패 | `cd workers && npm run deploy:prod` |
| TypeScript 에러 | `npm run type-check` 실행 |
| Health check `success: false` | Queue 'unavailable'은 정상 (Paid Plan 필요) |
| D1 테이블 없음 | `wrangler d1 execute PRIMARY_DB --file=d1-schema.sql --remote --env=production` |
| Wrangler 버전 | `npm update wrangler` (현재: 4.42.0) |

### 🔧 주요 명령어

```bash
# Wrangler 인증
wrangler whoami
wrangler login

# D1 관리
wrangler d1 list
wrangler d1 execute PRIMARY_DB --command="SELECT COUNT(*) FROM surveys" --remote

# KV 관리
wrangler kv:namespace list
wrangler kv:key list --binding=SAFEWORK_KV --env=production

# R2 관리
wrangler r2 bucket list
wrangler r2 object list safework-storage-prod

# 로그 스트리밍
wrangler tail --env production
```

### 🆘 지원

- **이슈 리포트**: GitHub Issues
- **문서**: `/docs` 디렉토리 + [API_ENDPOINTS.md](docs/API_ENDPOINTS.md)
- **로그**: `wrangler tail --env production`
- **모니터링**: https://safework.jclee.me/api/native/native/health

## 📈 최근 업데이트

**2025-10-04**:
- ✅ Health check `success: true` 수정 (Queue 'unavailable' 허용)
- ✅ Wrangler 4.42.0 업데이트
- ✅ API 엔드포인트 문서화 완료 (60+ endpoints)
- ✅ Workers.dev 서브도메인 활성화
- ✅ GitHub Actions 자동 배포 활성화

**2025-10-03**:
- ✅ D1 기반 Survey API 완성 (001/002)
- ✅ 통합 관리자 대시보드 구현
- ✅ R2 스토리지 바인딩 활성화
- ✅ Workers AI 통합 (Llama 3)

---

<div align="center">

**⚡ Built with Cloudflare Workers - 100% Serverless at the Edge**

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)
[![D1 Database](https://img.shields.io/badge/D1-Database-blue)](https://developers.cloudflare.com/d1/)
[![Workers AI](https://img.shields.io/badge/Workers-AI-green)](https://developers.cloudflare.com/workers-ai/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![Wrangler](https://img.shields.io/badge/Wrangler-4.42.0-orange)](https://developers.cloudflare.com/workers/wrangler/)

</div>
