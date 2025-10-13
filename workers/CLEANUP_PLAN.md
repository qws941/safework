# 데이터 현행화 및 불필요 파일 제거 계획

**작성일**: 2025-10-13
**목적**: 프로젝트 정리 및 최신화

---

## 1. 제거 대상 파일 (Root Directory)

### A. 완료된 작업 문서 (이미 달성된 목표) - docs/archive/로 이동
```
✅ 002-IMPLEMENTATION-COMPLETE.md         (9.5K) - 002 구현 완료 보고서
✅ ADMIN-DASHBOARD-FIX-COMPLETE.md        (4.5K) - 관리자 대시보드 수정 완료
✅ ADMIN-PAGE-IMPROVEMENTS.md             (12K)  - 관리자 페이지 개선 완료
✅ ADMIN-UNIFIED-COMPLETE.md              (10K)  - 통합 관리자 완료
✅ ALL-DATA-EXPORT.md                     (7.4K) - 데이터 내보내기 완료
✅ AUTH-SETUP.md                          (6.5K) - 인증 설정 완료
✅ CLOUDFLARE-GIT-INTEGRATION.md          (5.4K) - Git 통합 완료
✅ DEPLOYMENT-LOGS.md                     (4.9K) - 배포 로그 (과거)
✅ DEPLOYMENT-VERIFICATION.md             (4.0K) - 배포 검증 완료
✅ FIELD-VERIFICATION-REPORT.md           (6.2K) - 필드 검증 완료
✅ FINAL_DEPLOYMENT_SOLUTION.md           (2.8K) - 최종 배포 솔루션 완료
✅ GIT-INTEGRATION-STATUS.md              (4.2K) - Git 통합 상태 완료
✅ DEPLOYMENT_LOG.md                      (46B)  - 빈 로그 파일
✅ DEPLOYMENT_REPORT.md                   (9.6K) - 배포 보고서 (과거)
✅ DEPLOYMENT_SUCCESS_SUMMARY.md          (11K)  - 배포 성공 요약 (과거)
```

**총 15개 파일, 약 94KB → docs/archive/ 이동**

### B. 중복/유사 스크립트 - scripts/로 이동
```
🔧 complete-deployment.sh                 (6.9K) - scripts/로 이동
🔧 continuous-monitor.sh                  (2.0K) - scripts/로 이동
🔧 create-safework-token.sh               (4.9K) - scripts/로 이동
🔧 deploy-stable.sh                       (3.2K) - scripts/로 이동
🔧 deploy-with-global-key.sh              (4.6K) - scripts/로 이동
🔧 deployment-dashboard.sh                (3.8K) - scripts/로 이동
🔧 deployment-verify.sh                   (2.7K) - scripts/로 이동
```

**deploy.sh만 root에 남기고 나머지 7개는 scripts/로 이동**

### C. 임시/테스트 파일 - 제거
```
❌ direct-deploy.js                       (3.1K) - 임시 배포 스크립트 (wrangler 사용)
❌ simple-worker.js                       (1.2K) - 테스트용 간단 워커
❌ wrangler-simple.toml                   (440B) - 사용하지 않는 설정
❌ deployment-trigger.txt                 (?)    - 배포 트리거 파일
```

**4개 파일 삭제**

### D. 보관용 문서 - 유지 (docs/로 이동 권장)
```
📄 RESOURCE-ID-UPDATE-GUIDE.md            (5.7K) - docs/operations/로 이동
📄 INTEGRATION-CONFIG-KR.md               (6.1K) - docs/operations/로 이동
📄 cloudflare-token-guide.md              (3.8K) - docs/operations/로 이동
📄 QUICK-START.md                         (1.4K) - docs/로 이동
📄 DEPLOYMENT.md                          (2.2K) - docs/로 이동
📄 IMPROVEMENTS_2025-10-12.md             (4.8K) - docs/로 이동
```

---

## 2. 유지할 파일 (Root Directory)

### Essential Configuration
```
✅ package.json                           - 필수
✅ package-lock.json                      - 필수
✅ tsconfig.json                          - 필수
✅ vitest.config.ts                       - 필수
✅ wrangler.toml                          - 필수 (production 설정)
✅ .eslintrc.js                           - 필수
✅ d1-schema.sql                          - 필수 (D1 스키마)
✅ schema-002.sql                         - 유지 (002 전용 스키마)
✅ schema.sql                             - 유지 (레거시 참조용)
```

### Essential Documentation
```
✅ README.md                              - 필수
✅ CODEBASE_ANALYSIS_REPORT.md            - 최신 (오늘 생성)
```

### Essential Scripts
```
✅ deploy.sh                              - 메인 배포 스크립트 (root 유지)
```

---

## 3. 의존성 업데이트 계획

### Critical Updates (이번 주)
```bash
# ESLint 툴체인 업그레이드 (v8 → v9)
npm install -D eslint@9 @typescript-eslint/parser@8 @typescript-eslint/eslint-plugin@8

# TypeScript 마이너 업데이트
npm install -D typescript@5.9.3

# Cloudflare 도구 업데이트
npm install -D @cloudflare/workers-types@latest wrangler@latest
```

### Production Dependencies (안전)
```
bcryptjs@3.0.2    - ✅ 최신
hono@4.9.11       - ✅ 최신
```

---

## 4. 실행 계획

### Phase 1: 아카이브 (백업)
```bash
# docs/archive/ 디렉토리 생성
mkdir -p docs/archive/2025-10-13

# 완료된 작업 문서 이동
mv 002-IMPLEMENTATION-COMPLETE.md docs/archive/2025-10-13/
mv ADMIN-DASHBOARD-FIX-COMPLETE.md docs/archive/2025-10-13/
mv ADMIN-PAGE-IMPROVEMENTS.md docs/archive/2025-10-13/
mv ADMIN-UNIFIED-COMPLETE.md docs/archive/2025-10-13/
mv ALL-DATA-EXPORT.md docs/archive/2025-10-13/
mv AUTH-SETUP.md docs/archive/2025-10-13/
mv CLOUDFLARE-GIT-INTEGRATION.md docs/archive/2025-10-13/
mv DEPLOYMENT-LOGS.md docs/archive/2025-10-13/
mv DEPLOYMENT-VERIFICATION.md docs/archive/2025-10-13/
mv FIELD-VERIFICATION-REPORT.md docs/archive/2025-10-13/
mv FINAL_DEPLOYMENT_SOLUTION.md docs/archive/2025-10-13/
mv GIT-INTEGRATION-STATUS.md docs/archive/2025-10-13/
mv DEPLOYMENT_LOG.md docs/archive/2025-10-13/
mv DEPLOYMENT_REPORT.md docs/archive/2025-10-13/
mv DEPLOYMENT_SUCCESS_SUMMARY.md docs/archive/2025-10-13/
```

### Phase 2: 스크립트 정리
```bash
# 모든 배포 스크립트를 scripts/deployment/로 이동
mkdir -p scripts/deployment

mv complete-deployment.sh scripts/deployment/
mv continuous-monitor.sh scripts/deployment/
mv create-safework-token.sh scripts/deployment/
mv deploy-stable.sh scripts/deployment/
mv deploy-with-global-key.sh scripts/deployment/
mv deployment-dashboard.sh scripts/deployment/
mv deployment-verify.sh scripts/deployment/

# deploy.sh는 root에 유지 (main deployment script)
```

### Phase 3: 임시 파일 제거
```bash
# 테스트/임시 파일 삭제
rm -f direct-deploy.js
rm -f simple-worker.js
rm -f wrangler-simple.toml
rm -f deployment-trigger.txt
```

### Phase 4: 문서 재구성
```bash
# 운영 가이드를 docs/operations/로 이동
mkdir -p docs/operations

mv RESOURCE-ID-UPDATE-GUIDE.md docs/operations/
mv INTEGRATION-CONFIG-KR.md docs/operations/
mv cloudflare-token-guide.md docs/operations/
mv QUICK-START.md docs/
mv DEPLOYMENT.md docs/
mv IMPROVEMENTS_2025-10-12.md docs/
```

### Phase 5: 의존성 업데이트
```bash
# ESLint 업그레이드
npm install -D eslint@9 @typescript-eslint/parser@8 @typescript-eslint/eslint-plugin@8

# TypeScript 업데이트
npm install -D typescript@5.9.3

# Cloudflare 도구 업데이트
npm install -D @cloudflare/workers-types@latest wrangler@latest

# Audit 실행
npm audit
```

### Phase 6: 검증
```bash
# Type check
npm run type-check

# Lint check
npm run lint

# Tests
npm test

# Build
npm run build
```

---

## 5. 정리 후 Root Directory 구조 (목표)

```
workers/
├── .eslintrc.js                  ✅ Config
├── .github/                      ✅ CI/CD
├── .wrangler/                    ✅ Wrangler cache
├── d1-schema.sql                 ✅ D1 schema
├── deploy.sh                     ✅ Main deployment
├── docs/                         ✅ Documentation
│   ├── N8N_INTEGRATION_GUIDE.md
│   ├── QUICK-START.md            📁 Moved here
│   ├── DEPLOYMENT.md             📁 Moved here
│   ├── IMPROVEMENTS_2025-10-12.md 📁 Moved here
│   ├── archive/
│   │   └── 2025-10-13/           📁 15 archived files
│   ├── operations/               📁 New
│   │   ├── RESOURCE-ID-UPDATE-GUIDE.md
│   │   ├── INTEGRATION-CONFIG-KR.md
│   │   └── cloudflare-token-guide.md
│   └── reports/
├── migrations/                   ✅ DB migrations
├── node_modules/                 ✅ Dependencies
├── package.json                  ✅ Updated deps
├── package-lock.json             ✅ Updated lock
├── public/                       ✅ Static assets
├── README.md                     ✅ Main doc
├── CODEBASE_ANALYSIS_REPORT.md   ✅ Latest analysis
├── schema-002.sql                ✅ Form 002 schema
├── schema.sql                    ✅ Legacy schema
├── scripts/                      ✅ Scripts
│   ├── deployment/               📁 New
│   │   ├── complete-deployment.sh
│   │   ├── continuous-monitor.sh
│   │   ├── create-safework-token.sh
│   │   ├── deploy-stable.sh
│   │   ├── deploy-with-global-key.sh
│   │   ├── deployment-dashboard.sh
│   │   └── deployment-verify.sh
│   └── (existing scripts)
├── src/                          ✅ Application code
├── tests/                        ✅ Tests
├── tsconfig.json                 ✅ TypeScript config
├── vitest.config.ts              ✅ Test config
└── wrangler.toml                 ✅ Cloudflare config
```

**Root 파일 수**: 22개 → 12개 (10개 파일 제거)
**정리 효과**: 더 깔끔하고 탐색하기 쉬운 프로젝트 구조

---

## 6. 예상 효과

### Before (현재)
- Root 디렉토리: 60+ 파일 (복잡)
- 완료된 작업 문서가 root에 산재
- 배포 스크립트 8개가 root에 혼재
- 임시/테스트 파일 방치

### After (정리 후)
- Root 디렉토리: 12개 필수 파일만 (간결)
- 아카이브 문서는 docs/archive/에 보관
- 배포 스크립트는 scripts/deployment/에 집중
- 임시 파일 제거
- 최신 의존성 (보안 강화)

---

## 7. 백업 권장사항

정리 전 백업:
```bash
# 전체 프로젝트 백업
cd /home/jclee/app/safework
tar -czf safework-backup-2025-10-13.tar.gz workers/

# 또는 Git commit
cd workers
git add -A
git commit -m "chore: Backup before cleanup"
```

---

## 8. 롤백 계획

문제 발생 시:
```bash
# Git으로 되돌리기
git reset --hard HEAD~1

# 또는 백업에서 복원
cd /home/jclee/app/safework
tar -xzf safework-backup-2025-10-13.tar.gz
```

---

**작성자**: Claude Code Analysis
**승인 대기**: 사용자 확인 후 실행
