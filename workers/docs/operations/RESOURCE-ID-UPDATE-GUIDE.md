# 🔧 CF Native 리소스 ID 업데이트 가이드

## 🎯 현재 상황

**배포 상태**: GitHub Actions 성공 ✅
**Worker 상태**: 배포 완료, 바인딩 설정 필요 ⚠️
**헬스 체크**: `DEGRADED` (database: not_configured, cache: unhealthy)

---

## 📋 필요한 작업

### 1. Cloudflare 대시보드에서 생성된 리소스 ID 확인

**🔗 대시보드 링크들:**
- **Workers & Pages**: https://dash.cloudflare.com/workers-and-pages
- **D1 데이터베이스**: https://dash.cloudflare.com/d1
- **KV 네임스페이스**: https://dash.cloudflare.com/kv

### 2. 확인해야 할 리소스들

**D1 데이터베이스:**
- `safework-primary` (PRIMARY_DB 바인딩용)
- `safework-analytics` (ANALYTICS_DB 바인딩용)

**KV 네임스페이스:**
- `SESSION_STORE` (세션 데이터)
- `CACHE_LAYER` (캐시 레이어)
- `AUTH_STORE` (인증 저장소)

---

## 🛠️ wrangler.toml 업데이트 방법

### 현재 설정 (placeholder 상태):

```toml
# D1 Database - CF Native Naming Convention
[[d1_databases]]
binding = "PRIMARY_DB"
database_name = "safework-primary"
database_id = "placeholder-primary-db-production"

[[d1_databases]]
binding = "ANALYTICS_DB"
database_name = "safework-analytics"
database_id = "placeholder-analytics-db-production"

# KV Namespaces - CF Native Naming Convention
[[kv_namespaces]]
binding = "SESSION_STORE"
preview_id = "placeholder-session-store-preview"
id = "placeholder-session-store-production"

[[kv_namespaces]]
binding = "CACHE_LAYER"
preview_id = "placeholder-cache-layer-preview"
id = "placeholder-cache-layer-production"

[[kv_namespaces]]
binding = "AUTH_STORE"
preview_id = "placeholder-auth-store-preview"
id = "placeholder-auth-store-production"
```

### 업데이트해야 할 형태:

```toml
# D1 Database - CF Native Naming Convention
[[d1_databases]]
binding = "PRIMARY_DB"
database_name = "safework-primary"
database_id = "실제-생성된-D1-PRIMARY-ID"

[[d1_databases]]
binding = "ANALYTICS_DB"
database_name = "safework-analytics"
database_id = "실제-생성된-D1-ANALYTICS-ID"

# KV Namespaces - CF Native Naming Convention
[[kv_namespaces]]
binding = "SESSION_STORE"
preview_id = "실제-생성된-SESSION-STORE-PREVIEW-ID"
id = "실제-생성된-SESSION-STORE-PRODUCTION-ID"

[[kv_namespaces]]
binding = "CACHE_LAYER"
preview_id = "실제-생성된-CACHE-LAYER-PREVIEW-ID"
id = "실제-생성된-CACHE-LAYER-PRODUCTION-ID"

[[kv_namespaces]]
binding = "AUTH_STORE"
preview_id = "실제-생성된-AUTH-STORE-PREVIEW-ID"
id = "실제-생성된-AUTH-STORE-PRODUCTION-ID"
```

---

## 🚀 단계별 진행 방법

### Step 1: Cloudflare 대시보드 접속
1. https://dash.cloudflare.com/ 로그인
2. Workers & Pages 섹션으로 이동
3. D1, KV 메뉴에서 생성된 리소스 확인

### Step 2: D1 데이터베이스 ID 복사
1. **D1 섹션**: https://dash.cloudflare.com/d1
2. `safework-primary` 데이터베이스 클릭
3. Database ID 복사 (형태: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
4. `safework-analytics` 데이터베이스도 동일하게 진행

### Step 3: KV 네임스페이스 ID 복사
1. **KV 섹션**: https://dash.cloudflare.com/kv
2. 각 네임스페이스 클릭하여 ID 확인:
   - `SESSION_STORE` → Production ID, Preview ID
   - `CACHE_LAYER` → Production ID, Preview ID
   - `AUTH_STORE` → Production ID, Preview ID

### Step 4: wrangler.toml 업데이트
```bash
# 파일 편집
nano workers/wrangler.toml

# 또는 vi 사용
vi workers/wrangler.toml
```

### Step 5: 변경사항 커밋 및 재배포
```bash
git add workers/wrangler.toml
git commit -m "fix: D1 및 KV 리소스 실제 ID로 바인딩 업데이트"
git push origin master
```

---

## 🔍 업데이트 후 검증 방법

### 1. 배포 완료 확인
```bash
# GitHub Actions 상태 확인
curl -s https://api.github.com/repos/qws941/safework/actions/runs?per_page=1 | jq -r '.workflow_runs[0].conclusion'
```

### 2. 헬스 체크 확인
```bash
# 전체 상태 확인
curl -s https://safework.jclee.me/api/health | jq '.'

# 예상 결과 (성공시):
# {
#   "status": "healthy",
#   "checks": {
#     "service": "healthy",
#     "database": "healthy",
#     "cache": "healthy"
#   }
# }
```

### 3. 개별 리소스 테스트
```bash
# D1 데이터베이스 연결 테스트
curl https://safework.jclee.me/api/db/primary/test
curl https://safework.jclee.me/api/db/analytics/test

# KV 네임스페이스 연결 테스트
curl https://safework.jclee.me/api/kv/session/test
curl https://safework.jclee.me/api/kv/cache/test
curl https://safework.jclee.me/api/kv/auth/test
```

---

## 🆘 문제 해결

### 문제: "Database not found" 오류
**원인**: D1 database_id가 잘못됨
**해결**: 대시보드에서 정확한 Database ID 다시 확인

### 문제: "KV namespace not found" 오류
**원인**: KV namespace id가 잘못됨
**해결**: 대시보드에서 정확한 Namespace ID 다시 확인

### 문제: Preview 환경에서만 동작
**원인**: preview_id와 id(production)가 바뀜
**해결**: Production과 Preview ID 위치 확인

---

## 📊 현재 진행 상황

```
✅ 1. CF Native 네이밍 룰 적용
✅ 2. GitHub Actions 배포 성공
✅ 3. Worker 코드 배포 완료
⏳ 4. 리소스 ID 업데이트 (현재 단계)
⏸️ 5. 바인딩 설정 완료
⏸️ 6. 최종 검증 및 테스트
```

---

## 💡 자동화 개선 방안

향후 배포에서는 다음과 같이 개선 가능:
1. **Dynamic ID Extraction**: 배포 시 생성된 ID 자동 추출
2. **Automatic Update**: wrangler.toml 자동 업데이트
3. **Verification Loop**: 바인딩 설정 후 자동 검증

---

**다음 단계**: Cloudflare 대시보드에서 생성된 리소스 ID를 확인하고 wrangler.toml 업데이트 후 재배포

---

*마지막 업데이트: 2025-09-28 07:17:00Z*