# SafeWork 파일 용도별 정리

**작성일**: 2025-10-11
**목적**: 프로젝트 내 모든 파일의 용도와 역할을 카테고리별로 정리

---

## 📂 디렉토리 구조 개요

```
/home/jclee/app/safework/
├── workers/              # ⭐ 메인 프로젝트 (Cloudflare Workers)
├── app/                  # 🗄️ 레거시 코드 (비활성화)
├── docs/                 # 📚 문서화
├── .github/              # 🔄 CI/CD 설정
└── [루트 파일들]         # 프로젝트 설정
```

---

## ⭐ **1. 메인 애플리케이션 (workers/)**

### 🎯 핵심 진입점
| 파일 | 용도 | 중요도 |
|------|------|--------|
| `workers/src/index.ts` | **메인 엔트리 포인트**, 모든 라우트와 미들웨어 설정 | ⭐⭐⭐ |
| `workers/wrangler.toml` | Cloudflare Workers 배포 설정 (환경 변수, 바인딩) | ⭐⭐⭐ |
| `workers/package.json` | 의존성 관리, 스크립트 정의 | ⭐⭐⭐ |

### 🛣️ 라우트 파일들 (workers/src/routes/)
**설문 양식 API (6개)**
```
form-001.ts  → 근골격계 증상조사표 (GET /survey/001_*)
form-002.ts  → 근골격계부담작업 유해요인조사
form-003.ts  → 근골격계질환 예방관리 프로그램
form-004.ts  → 산업재해 실태조사표
form-005.ts  → 유해요인 기본조사표
form-006.ts  → 고령근로자 작업투입 승인요청서
```

**설문 데이터 API (D1 기반)**
```
survey-d1.ts        → 설문 CRUD API (Form 001)
survey-002-d1.ts    → Form 002 전용 API
```

**관리자 대시보드**
```
admin-unified.ts    → 통합 관리자 대시보드 (최신)
admin-002.ts        → Form 002 전용 관리 페이지
admin.ts            → 레거시 관리 페이지
```

**유틸리티 API**
```
native-api.ts       → 네이티브 서비스 (R2, AI, Queue) API
health.ts           → 헬스 체크 엔드포인트
auth.ts             → JWT 인증 (선택적 기능)
excel-processor.ts  → Excel 파일 처리
warning-sign.ts     → 경고 표지판 생성기
```

### 📋 설문 양식 구조 정의 (workers/src/config/)
```
form-001-structure.ts  → Form 001 필드 정의
form-002-structure.ts  → Form 002 필드 정의
form-003-structure.ts  → Form 003 필드 정의
form-004-structure.ts  → Form 004 필드 정의
form-005-structure.ts  → Form 005 필드 정의
form-006-structure.ts  → Form 006 필드 정의
```

**용도**: 각 설문 양식의 섹션, 질문, 옵션을 정의
**형식**: TypeScript 객체 (title, sections, questions)

### 🎨 HTML 템플릿 (workers/src/templates/)
```
001.ts  → Form 001 HTML 템플릿 (Bootstrap 5 기반)
002.ts  → Form 002 HTML 템플릿
003.ts  → Form 003 HTML 템플릿
004.ts  → Form 004 HTML 템플릿
005.ts  → Form 005 HTML 템플릿
006.ts  → Form 006 HTML 템플릿
```

**특징**:
- 모든 템플릿이 Bootstrap 5 + jQuery 사용
- 클라이언트 사이드 유효성 검사 포함
- 반응형 디자인 (모바일 대응)

### 🛡️ 미들웨어 (workers/src/middleware/)
```
securityHeaders.ts  → CSP, HSTS, X-Frame-Options 등 보안 헤더
rateLimiter.ts      → 요청 속도 제한 (KV 기반)
```

**적용 순서** (index.ts):
1. Analytics (비활성화)
2. Logger
3. Security Headers
4. CORS (API 전용)
5. Rate Limiting
6. JWT Authentication (선택)

### 🗄️ 데이터베이스 (workers/)
```
d1-schema.sql       → D1 데이터베이스 스키마 (SQLite)
```

**주요 테이블**:
- `users` - 사용자 관리
- `companies`, `processes`, `roles` - 마스터 데이터
- `surveys` - 설문 응답 (JSON 저장)
- `survey_statistics` - 집계 통계
- `audit_logs` - 감사 로그

### 🧪 테스트 파일들 (workers/tests/, workers/e2e/)

**단위 테스트**
```
tests/worker.test.ts        → Worker 기본 기능 테스트 (7 tests)
tests/ui-automation.test.ts → UI/UX 자동화 테스트 (19 tests)
tests/post-deployment.test.ts → 배포 후 통합 테스트 (14 tests)
```

**E2E 테스트 (Playwright)**
```
e2e/ui-ux-automation.spec.ts → 브라우저 자동화 테스트 (20 tests)
```

**테스트 구성**
```
vitest.config.ts    → Vitest 설정 (단위 테스트)
playwright.config.ts → Playwright 설정 (E2E 테스트)
```

---

## 🔄 **2. CI/CD 및 자동화 (.github/)**

### GitHub Actions 워크플로우
```
.github/workflows/cloudflare-workers-deployment.yml
```

**5단계 파이프라인**:
1. 🤖 AI Code Review (PR 시)
2. 🏗️ Build & Test (단위 테스트)
3. 🚀 Deploy to Production
4. 📚 AI Release Notes
5. 🔍 Post-Deployment Tests (통합 테스트)

**트리거**:
- `push` to master (workers/** 변경 시)
- `pull_request` to master
- `workflow_dispatch` (수동 실행)

---

## 📚 **3. 문서화 (docs/, workers/docs/)**

### 프로젝트 문서
```
README.md                           → 프로젝트 개요 및 퀵스타트
CLAUDE.md                           → 프로젝트별 작업 지침 (Claude용)
FILE_ORGANIZATION_GUIDE.md          → 이 문서 (파일 정리)
```

### 기술 문서 (docs/)
```
docs/API_ENDPOINTS.md               → API 레퍼런스 (60+ 엔드포인트)
docs/CLOUDFLARE_DEPLOYMENT.md       → 배포 가이드
docs/PROJECT_STRUCTURE.md           → 아키텍처 문서
docs/architecture/D1-MIGRATION-COMPLETE.md  → D1 마이그레이션 내역
```

### 배포 관련 문서 (workers/)
```
workers/DEPLOYMENT_REPORT.md                → 상세 테스트 결과 보고서
workers/DEPLOYMENT_SUCCESS_SUMMARY.md       → 배포 성공 요약
workers/docs/N8N_INTEGRATION_GUIDE.md       → n8n 워크플로우 자동화 가이드
```

---

## 🗄️ **4. 레거시 코드 (app/) - 비활성화**

```
app/                    → Flask 기반 구 버전 (사용 안 함)
├── main.py            → Flask 메인 앱
├── models/            → SQLAlchemy 모델
├── routes/            → Flask 라우트
└── templates/         → Jinja2 템플릿
```

**⚠️ 주의**: 이 디렉토리는 **사용되지 않습니다**.
- 모든 기능이 `workers/`로 이전 완료
- PostgreSQL → D1으로 마이그레이션 완료
- Flask → Hono.js로 전환 완료

---

## ⚙️ **5. 설정 파일들**

### TypeScript 설정
```
workers/tsconfig.json   → TypeScript 컴파일러 설정
```

### 린팅 설정
```
workers/.eslintrc.json  → ESLint 규칙 (코드 품질)
```

### 테스트 설정
```
workers/vitest.config.ts      → Vitest 설정 (단위 테스트)
workers/playwright.config.ts  → Playwright 설정 (E2E)
```

### Git 설정
```
.gitignore              → Git 제외 파일 목록
```

---

## 📊 **6. 파일 중요도 분류**

### ⭐⭐⭐ 핵심 파일 (절대 삭제 금지)
```
workers/src/index.ts                  → 메인 엔트리 포인트
workers/wrangler.toml                 → 배포 설정
workers/package.json                  → 의존성 관리
workers/d1-schema.sql                 → 데이터베이스 스키마
.github/workflows/*.yml               → CI/CD 파이프라인
```

### ⭐⭐ 중요 파일 (수정 시 주의)
```
workers/src/routes/*.ts               → API 라우트
workers/src/middleware/*.ts           → 보안/인증 미들웨어
workers/src/config/*.ts               → 설문 양식 정의
workers/src/templates/*.ts            → HTML 템플릿
```

### ⭐ 보조 파일 (수정 가능)
```
workers/tests/*.ts                    → 테스트 파일
docs/*.md                             → 문서
README.md, CLAUDE.md                  → 프로젝트 문서
```

### 🗑️ 삭제 가능 파일
```
app/**/*                              → 레거시 Flask 코드
workers/test-results/                 → 테스트 결과 캐시
workers/node_modules/                 → 의존성 (재설치 가능)
```

---

## 🎯 **7. 파일별 수정 가이드**

### 새 설문 양식 추가 시
```
1. workers/src/config/form-00X-structure.ts  → 양식 구조 정의
2. workers/src/templates/00X.ts              → HTML 템플릿 작성
3. workers/src/routes/form-00X.ts            → API 라우트 생성
4. workers/src/routes/survey-00X-d1.ts       → D1 CRUD API 생성
5. workers/src/index.ts                      → 라우트 등록
6. workers/d1-schema.sql                     → 필요 시 테이블 추가
```

### API 엔드포인트 추가 시
```
1. workers/src/routes/[적절한파일].ts        → 핸들러 함수 작성
2. workers/src/index.ts                      → app.route() 등록
3. docs/API_ENDPOINTS.md                     → 문서 업데이트
4. workers/tests/*.test.ts                   → 테스트 추가
```

### 보안 설정 변경 시
```
1. workers/src/middleware/securityHeaders.ts → CSP, HSTS 등
2. workers/src/middleware/rateLimiter.ts     → 속도 제한 규칙
3. workers/wrangler.toml                     → 환경 변수 확인
```

### 배포 설정 변경 시
```
1. workers/wrangler.toml                     → 바인딩, 환경 변수
2. .github/workflows/*.yml                   → CI/CD 파이프라인
3. workers/package.json                      → 빌드 스크립트
```

---

## 🔍 **8. 파일 찾기 팁**

### 특정 기능 찾기
```bash
# 설문 응답 저장 로직
grep -r "INSERT INTO surveys" workers/src/

# 관리자 대시보드 렌더링
grep -r "관리자 대시보드" workers/src/

# 헬스 체크 엔드포인트
grep -r "/api/health" workers/src/

# CSP 설정
grep -r "Content-Security-Policy" workers/src/
```

### 파일 트리 보기
```bash
# 전체 구조 (레거시 제외)
tree workers/ -I "node_modules|dist"

# 라우트 파일만
ls -la workers/src/routes/

# 테스트 파일만
ls -la workers/tests/ workers/e2e/
```

---

## 📦 **9. 빌드 결과물**

### 컴파일 결과
```
workers/dist/           → TypeScript → JavaScript 컴파일 결과
workers/.wrangler/      → Wrangler 빌드 캐시
```

**용도**: Cloudflare Workers 배포 시 자동 생성
**Git 추적**: ❌ (gitignore에 포함)

---

## 🔗 **10. 외부 의존성**

### 런타임 의존성 (package.json)
```json
{
  "hono": "^3.12.0",           // 웹 프레임워크
  "bcryptjs": "^2.4.3"         // 비밀번호 해싱
}
```

### 개발 의존성
```json
{
  "@cloudflare/workers-types": "^4.20240117.0",  // TypeScript 타입
  "@playwright/test": "^1.56.0",                 // E2E 테스트
  "typescript": "^5.3.3",                         // 컴파일러
  "vitest": "^1.2.0",                            // 단위 테스트
  "wrangler": "^4.40.2"                          // 배포 CLI
}
```

### 외부 CDN 리소스 (HTML 템플릿)
```
https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/     → Bootstrap CSS/JS
https://code.jquery.com/jquery-3.6.0.min.js       → jQuery
https://cdnjs.cloudflare.com/ajax/libs/font-awesome/ → Font Awesome
```

---

## 📈 **11. 코드 메트릭스**

### 프로젝트 규모
```
총 파일 수: ~100개
TypeScript 파일: ~50개
테스트 파일: 4개
문서 파일: ~15개

코드 라인 수:
- workers/src/: ~8,000 lines
- workers/tests/: ~1,000 lines
- 문서: ~5,000 lines
```

### API 엔드포인트
```
총 60+ 엔드포인트:
- 설문 관련: 30+
- 관리자: 15+
- 유틸리티: 10+
- 헬스체크: 5+
```

---

## 🎓 **12. 학습 경로**

### 초급 개발자
1. `README.md` → 프로젝트 개요
2. `workers/src/index.ts` → 메인 구조
3. `workers/src/routes/form-001.ts` → 간단한 라우트 예제
4. `docs/API_ENDPOINTS.md` → API 사용법

### 중급 개발자
1. `workers/wrangler.toml` → 배포 설정
2. `workers/src/middleware/` → 미들웨어 구조
3. `workers/d1-schema.sql` → 데이터베이스 설계
4. `.github/workflows/` → CI/CD 파이프라인

### 고급 개발자
1. `workers/src/routes/native-api.ts` → 네이티브 서비스 통합
2. `workers/src/middleware/rateLimiter.ts` → 분산 속도 제한
3. `workers/e2e/` → E2E 테스트 전략
4. `docs/architecture/` → 아키텍처 패턴

---

## 🚀 **13. 자주 수정하는 파일**

### 매일 변경
```
workers/src/routes/*.ts         → 새 기능 추가
workers/tests/*.test.ts         → 테스트 작성
docs/*.md                       → 문서 업데이트
```

### 주간 변경
```
workers/package.json            → 의존성 업데이트
workers/wrangler.toml           → 환경 설정 조정
.github/workflows/*.yml         → CI/CD 개선
```

### 월간 변경
```
workers/d1-schema.sql           → 스키마 마이그레이션
workers/src/middleware/*.ts     → 보안 정책 업데이트
README.md                       → 주요 업데이트 문서화
```

---

## 📞 **14. 파일 관련 문제 해결**

### 문제: 파일을 수정했는데 반영 안 됨
```bash
# TypeScript 재컴파일
cd workers && npm run build

# Wrangler 캐시 정리
wrangler dev --local-protocol=https

# 브라우저 캐시 강제 새로고침
Ctrl + Shift + R (또는 Cmd + Shift + R)
```

### 문제: 테스트가 실패함
```bash
# 단위 테스트만 실행
npm run test:unit

# E2E 테스트만 실행
npx playwright test

# 특정 테스트 파일만 실행
npm test -- worker.test.ts
```

### 문제: 배포가 실패함
```bash
# 로컬에서 배포 테스트
cd workers && wrangler deploy --dry-run

# 타입 체크
npm run type-check

# 린트 체크
npm run lint
```

---

## ✅ **15. 파일 관리 체크리스트**

### 새 기능 개발 시
- [ ] 관련 라우트 파일 생성/수정
- [ ] 테스트 파일 작성
- [ ] API 문서 업데이트
- [ ] TypeScript 컴파일 확인
- [ ] 린트 에러 없음 확인

### 배포 전
- [ ] 모든 테스트 통과 확인
- [ ] wrangler.toml 검증
- [ ] 환경 변수 설정 확인
- [ ] 문서 최신화
- [ ] GitHub Actions 워크플로우 테스트

### 정기 유지보수
- [ ] 의존성 업데이트 (npm audit)
- [ ] 사용하지 않는 파일 정리
- [ ] 레거시 코드 제거
- [ ] 테스트 커버리지 확인
- [ ] 문서 검토 및 업데이트

---

**작성일**: 2025-10-11
**마지막 업데이트**: 2025-10-11
**문서 버전**: 1.0
**담당자**: Claude Code (Autonomous Cognitive System Guardian)
