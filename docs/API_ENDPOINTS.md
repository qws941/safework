# SafeWork API 엔드포인트 정리

**마지막 업데이트**: 2025-10-04
**프로젝트**: SafeWork - Cloudflare Workers 서버리스 애플리케이션
**아키텍처**: 100% Edge-native (Cloudflare Workers + D1 + KV + R2 + AI)

---

## 📋 목차

1. [시스템 상태](#1-시스템-상태)
2. [인증 (Authentication)](#2-인증-authentication)
3. [설문조사 (Survey)](#3-설문조사-survey)
4. [관리자 (Admin)](#4-관리자-admin)
5. [네이티브 서비스](#5-네이티브-서비스)
6. [경고표지판](#6-경고표지판)
7. [Excel 처리](#7-excel-처리)
8. [작업자 관리](#8-작업자-관리)
9. [UI 라우트](#9-ui-라우트)

---

## 1. 시스템 상태

### GET `/api/health`
- **설명**: Workers 헬스 체크
- **응답**: `{ status: "healthy", timestamp: "ISO8601" }`
- **인증**: 불필요

### GET `/api/native/native/health`
- **설명**: 네이티브 서비스 전체 헬스 체크 (D1, KV, R2, AI, Queue)
- **응답**:
```json
{
  "status": "healthy",
  "services": {
    "d1": { "status": "healthy", "database": "safework-primary" },
    "kv": { "status": "healthy", "namespaces": 3 },
    "r2": { "status": "healthy", "bucket": "safework-storage-prod" },
    "ai": { "status": "healthy", "model": "@cf/meta/llama-3-8b-instruct" },
    "queue": { "status": "unavailable", "reason": "Paid plan required" }
  }
}
```
- **인증**: 불필요

### GET `/api/analytics/dashboard`
- **설명**: Cloudflare Native Analytics 대시보드
- **응답**: 캐시된 분석 데이터 또는 기본 메트릭
- **캐싱**: 5분 (CACHE_LAYER KV)
- **인증**: 불필요

---

## 2. 인증 (Authentication)

### POST `/api/auth/login`
- **설명**: 사용자 로그인
- **요청**: `{ username: string, password: string }`
- **응답**: `{ success: boolean, token: string, user: {...}, redirect: string }`
- **JWT**: 발급

### POST `/api/auth/register`
- **설명**: 사용자 회원가입
- **요청**: `{ username, password, email, ... }`
- **응답**: `{ success: boolean, user: {...} }`

### GET `/api/auth/logout`
- **설명**: 로그아웃
- **응답**: `{ success: true }`

---

## 3. 설문조사 (Survey)

### 3.1 D1 기반 Survey API (001 - 근골격계 증상조사표)

#### GET `/api/survey/d1/forms`
- **설명**: 사용 가능한 설문 양식 목록
- **응답**: `[{ form_id, title, description }, ...]`

#### POST `/api/survey/d1/submit`
- **설명**: 설문 응답 제출
- **요청**:
```json
{
  "form_type": "001_musculoskeletal_symptom_survey",
  "name": "이름",
  "company_id": 1,
  "process_id": 1,
  "role_id": 1,
  "responses": { ... }
}
```
- **응답**: `{ success: true, survey_id: number }`

#### GET `/api/survey/d1/responses/:formType`
- **설명**: 설문 응답 목록 조회 (페이지네이션)
- **쿼리 파라미터**: `?page=1&limit=20`
- **응답**: `{ data: [...], pagination: {...} }`

#### GET `/api/survey/d1/response/:surveyId`
- **설명**: 개별 설문 응답 상세 조회
- **응답**: `{ survey_id, form_type, name, responses, created_at }`

#### DELETE `/api/survey/d1/response/:surveyId`
- **설명**: 설문 응답 삭제
- **응답**: `{ success: true }`

#### GET `/api/survey/d1/stats`
- **설명**: 전체 통계
- **응답**:
```json
{
  "total_surveys": number,
  "by_form_type": {...},
  "recent_submissions": [...]
}
```

#### GET `/api/survey/d1/stats/daily`
- **설명**: 일별 통계
- **응답**: `{ date: "YYYY-MM-DD", count: number }[]`

#### GET `/api/survey/d1/master-data`
- **설명**: 마스터 데이터 (회사, 공정, 역할)
- **응답**:
```json
{
  "companies": [{ id, name, industry }],
  "processes": [{ id, name, company_id }],
  "roles": [{ id, name, department }]
}
```

### 3.2 D1 기반 Survey API (002 - 신규 입사자 건강검진)

#### GET `/api/survey/d1/002/forms`
- **설명**: 002 양식 목록

#### POST `/api/survey/d1/002/submit`
- **설명**: 002 설문 제출

#### GET `/api/survey/d1/002/responses`
- **설명**: 002 응답 목록

#### GET `/api/survey/d1/002/stats`
- **설명**: 002 통계

### 3.3 Legacy Survey API (KV 기반)

#### POST `/api/survey/submit`
- **설명**: Legacy 설문 제출 (KV 저장)
- **상태**: Deprecated (D1 API 사용 권장)

#### GET `/api/survey/responses`
- **설명**: Legacy 응답 조회
- **상태**: Deprecated

---

## 4. 관리자 (Admin)

### 4.1 통합 관리자 대시보드

#### GET `/admin`
- **설명**: 통합 관리자 대시보드 UI
- **기능**: 001/002 통합 관리 인터페이스

#### GET `/api/admin/unified/dashboard`
- **설명**: 대시보드 데이터 API
- **응답**: 전체 통계, 최근 제출 현황

#### GET `/api/admin/unified/responses/:formType`
- **설명**: 양식별 응답 목록

#### DELETE `/api/admin/unified/response/:surveyId`
- **설명**: 응답 삭제

#### GET `/api/admin/unified/export/:formType`
- **설명**: Excel 내보내기

### 4.2 001 관리자 (근골격계 증상조사표)

#### GET `/admin/001`
- **설명**: 001 전용 관리 대시보드

#### GET `/api/admin/001/responses`
- **설명**: 001 응답 목록

#### DELETE `/api/admin/001/response/:id`
- **설명**: 001 응답 삭제

#### GET `/api/admin/001/stats`
- **설명**: 001 통계

#### GET `/api/admin/001/export`
- **설명**: 001 Excel 내보내기

### 4.3 002 관리자 (신규 입사자 건강검진)

#### GET `/admin/002`
- **설명**: 002 전용 관리 대시보드

#### GET `/api/admin/002/responses`
- **설명**: 002 응답 목록

#### DELETE `/api/admin/002/response/:id`
- **설명**: 002 응답 삭제

#### GET `/api/admin/002/stats`
- **설명**: 002 통계

#### GET `/api/admin/002/export`
- **설명**: 002 Excel 내보내기

---

## 5. 네이티브 서비스

### 5.1 R2 파일 관리

#### GET `/api/native/files`
- **설명**: R2 버킷 파일 목록
- **쿼리**: `?prefix=exports/&limit=100`
- **응답**: `{ files: [{ key, size, uploaded }] }`

#### POST `/api/native/files/upload`
- **설명**: 파일 업로드
- **요청**: `multipart/form-data`
- **응답**: `{ success: true, url: string }`

#### GET `/api/native/files/:key`
- **설명**: 파일 다운로드
- **응답**: 파일 바이너리 스트림

#### DELETE `/api/native/files/:key`
- **설명**: 파일 삭제
- **응답**: `{ success: true }`

### 5.2 Queue 작업 (Paid Plan)

#### POST `/api/native/jobs/submit`
- **설명**: Queue 작업 제출
- **요청**: `{ type: "export", payload: {...} }`
- **응답**: `{ job_id: string, status: "queued" }`
- **상태**: Paid Plan 필요

#### GET `/api/native/jobs/:jobId`
- **설명**: 작업 상태 조회
- **상태**: Paid Plan 필요

### 5.3 AI 서비스

#### POST `/api/native/ai/validate`
- **설명**: AI 기반 설문 응답 검증
- **요청**: `{ responses: {...} }`
- **응답**: `{ valid: boolean, suggestions: [...] }`
- **모델**: Llama 3 (Workers AI)

#### POST `/api/native/ai/insights`
- **설명**: AI 기반 인사이트 생성
- **요청**: `{ survey_data: [...] }`
- **응답**: `{ insights: [...], recommendations: [...] }`

### 5.4 Export 생성

#### POST `/api/native/export/excel`
- **설명**: Excel 파일 생성 및 R2 저장
- **요청**: `{ form_type: string, data: [...] }`
- **응답**: `{ file_url: string, expires_at: timestamp }`

---

## 6. 경고표지판

### GET `/api/warning-sign/generate`
- **설명**: GHS/KOSHA 화학물질 경고표지 생성
- **쿼리**: `?chemical=벤젠&type=GHS&format=png`
- **응답**: PNG 이미지 바이너리

### GET `/api/warning-sign/preview/:chemicalId`
- **설명**: 경고표지 미리보기
- **응답**: HTML 페이지

---

## 7. Excel 처리

### POST `/api/excel/parse`
- **설명**: Excel 파일 파싱
- **요청**: `multipart/form-data` (Excel 파일)
- **응답**: `{ data: [...], headers: [...] }`

### POST `/api/excel/generate`
- **설명**: JSON 데이터를 Excel로 변환
- **요청**: `{ data: [...], template: "001" }`
- **응답**: Excel 파일 바이너리

---

## 8. 작업자 관리

### GET `/api/workers/list`
- **설명**: 작업자 목록
- **인증**: JWT 필요
- **응답**: `[{ id, name, company, role }]`

### POST `/api/workers/create`
- **설명**: 작업자 등록
- **인증**: JWT 필요

### PUT `/api/workers/:id`
- **설명**: 작업자 정보 수정
- **인증**: JWT 필요

### DELETE `/api/workers/:id`
- **설명**: 작업자 삭제
- **인증**: JWT 필요

---

## 9. UI 라우트

### GET `/`
- **설명**: 메인 홈페이지
- **기능**: 설문 양식 목록, 로그인/회원가입

### GET `/survey/:surveyType`
- **설명**: 설문 양식 페이지
- **예시**: `/survey/001_musculoskeletal_symptom_survey`
- **템플릿**:
  - 001: `form001Dv06Template` (복구 버전)
  - 002: `survey002FormTemplate` (56 필드)

### GET `/auth/login`
- **설명**: 로그인 페이지

### GET `/auth/register`
- **설명**: 회원가입 페이지

### 404 핸들러
- **모든 매칭되지 않는 경로**: Custom 404 페이지

---

## 📊 엔드포인트 통계

| 카테고리 | 엔드포인트 수 | 인증 필요 | 주요 기능 |
|---------|--------------|----------|----------|
| 시스템 상태 | 3 | ❌ | Health check, Analytics |
| 인증 | 3 | ❌ | Login, Register, Logout |
| Survey (D1) | 15+ | ❌ | 001/002 설문 CRUD, 통계 |
| 관리자 | 20+ | 🔜 | 통합 대시보드, 양식별 관리 |
| 네이티브 서비스 | 10+ | ❌ | R2, AI, Queue, Export |
| 경고표지판 | 2 | ❌ | GHS/KOSHA 생성 |
| Excel | 2 | ❌ | 파싱, 생성 |
| 작업자 | 4 | ✅ | CRUD 작업 |
| UI | 5 | ❌ | 홈, 설문, 인증 |

**총 엔드포인트**: 60+ 개

---

## 🔐 인증 정책

### Public 엔드포인트 (JWT 불필요)
- 모든 `/api/survey/*` - 공개 설문 제출
- `/api/health` - 헬스 체크
- `/api/auth/*` - 인증 관련
- `/api/native/*` - 네이티브 서비스

### Protected 엔드포인트 (JWT 필요)
- `/api/workers/*` - 작업자 관리
- 향후 `/api/admin/*` - 관리자 기능 (현재는 임시 공개)

### JWT 검증
```typescript
app.use('/api/workers/*', async (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env?.JWT_SECRET || 'fallback-secret',
  });
  return jwtMiddleware(c, next);
});
```

---

## 🌐 접속 URL

### Production
- **Custom Domain**: https://safework.jclee.me
- **Workers.dev**: https://safework.jclee.workers.dev

### 양쪽 도메인 모두 동일하게 작동

---

## 📦 데이터 저장소

| 엔드포인트 | 저장소 | 바인딩 |
|-----------|--------|--------|
| `/api/survey/d1/*` | D1 Database | PRIMARY_DB |
| `/api/survey/*` (legacy) | KV Namespace | SAFEWORK_KV |
| `/api/native/files/*` | R2 Bucket | SAFEWORK_STORAGE |
| `/api/admin/*` | D1 + KV | PRIMARY_DB + CACHE_LAYER |
| `/api/native/ai/*` | Workers AI | AI |

---

## 🚀 최근 변경사항

**2025-10-04**:
- ✅ Workers.dev 서브도메인 활성화 (`workers_dev = true`)
- ✅ GitHub Actions 자동 배포 재활성화
- ✅ R2 스토리지 바인딩 활성화
- ✅ AI 바인딩 추가 (Llama 3)

**2025-10-03**:
- ✅ D1 기반 Survey API 완성 (001/002)
- ✅ 통합 관리자 대시보드 구현
- ✅ Native API 엔드포인트 추가

---

## 📝 참고 문서

- [CLAUDE.md](/home/jclee/app/safework/CLAUDE.md) - 프로젝트 가이드
- [CLOUDFLARE-NATIVE.md](/home/jclee/app/safework/workers/CLOUDFLARE-NATIVE.md) - 네이티브 아키텍처
- [D1-MIGRATION-COMPLETE.md](/home/jclee/app/safework/docs/architecture/D1-MIGRATION-COMPLETE.md) - D1 마이그레이션
- [wrangler.toml](/home/jclee/app/safework/workers/wrangler.toml) - Cloudflare 설정

---

**문서 버전**: v1.0
**마지막 검증**: 2025-10-04
**상태**: ✅ 모든 엔드포인트 운영 중
