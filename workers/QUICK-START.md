# SafeWork D1 Migration - Quick Start Guide

## 즉시 실행 가능한 단계

### 1. Cloudflare API 토큰 생성 (필수)

**브라우저에서 진행:**
1. https://dash.cloudflare.com/profile/api-tokens 접속
2. **Create Token** 클릭
3. **Edit Cloudflare Workers** 템플릿 선택
4. 다음 권한 확인:
   - ✅ Workers Scripts: Edit
   - ✅ Workers KV Storage: Edit
   - ✅ D1: Edit
5. **Create Token** → 토큰 복사 (한 번만 표시됨!)

### 2. 토큰 설정

```bash
cd /home/jclee/app/safework/workers

# .env 파일 편집
nano .env

# 다음으로 수정:
CLOUDFLARE_API_TOKEN=your-actual-token-here  # <-- 실제 토큰으로 교체
CLOUDFLARE_ACCOUNT_ID=a8d9c67f586acdd15eebcc65ca3aa5bb
```

### 3. 인증 확인

```bash
export CLOUDFLARE_API_TOKEN="your-actual-token-here"
wrangler whoami
```

**성공 시 출력:**
```
👋 You are logged in with an API Token!
Account: Your Account (a8d9c67f586acdd15eebcc65ca3aa5bb)
```

### 4. D1 데이터베이스 초기화

```bash
cd /home/jclee/app/safework/workers

# 로컬 D1 (개발용)
wrangler d1 execute PRIMARY_DB --file=d1-schema.sql --env=production

# 리모트 D1 (프로덕션) - 주의: 실제 DB 수정!
wrangler d1 execute PRIMARY_DB --file=d1-schema.sql --remote --env=production
```

### 5. PostgreSQL 데이터 동기화

```bash
cd /home/jclee/app/safework

# 환경변수 설정
export DB_HOST=safework-postgres
export DB_NAME=safework_db
export DB_USER=safework
export DB_PASSWORD=safework2024

# 동기화 실행
python3 scripts/sync-postgres-to-d1.py
```

### 6. Workers 배포

```bash
cd /home/jclee/app/safework/workers

# 빌드
npm run build

# 배포
npm run deploy:prod
```

### 7. 테스트

```bash
# Health check
curl https://safework.jclee.me/api/health

# D1 API 테스트
curl https://safework.jclee.me/api/survey/d1/forms
curl https://safework.jclee.me/api/survey/d1/stats
curl https://safework.jclee.me/api/survey/d1/master-data
```

## 현재 상태

✅ D1 스키마 생성 완료
✅ D1 클라이언트 구현 완료
✅ Survey API (D1) 구현 완료
✅ PostgreSQL 동기화 스크립트 완료
✅ TypeScript 빌드 성공

⏳ **필요한 작업:**
1. Cloudflare API 토큰 생성 및 설정
2. D1 프로덕션 초기화
3. 데이터 동기화
4. Workers 배포

## 문제 해결

### "You are not authenticated"
```bash
# API 토큰 확인
echo $CLOUDFLARE_API_TOKEN

# 토큰이 없다면:
export CLOUDFLARE_API_TOKEN="your-token-here"
```

### "bash: No such file or directory"
```bash
# sh 사용
sh -c 'wrangler login'
```

### D1 초기화 실패
```bash
# 데이터베이스 확인
wrangler d1 list

# 데이터베이스 정보
wrangler d1 info PRIMARY_DB --env=production
```

## 다음 단계

1. ✅ API 토큰 설정
2. ✅ D1 초기화
3. ✅ 데이터 동기화
4. ✅ Workers 배포
5. ⏳ 모니터링 설정
6. ⏳ 백업 전략 수립

---

**작성일**: 2025-09-30
**현재 위치**: `/home/jclee/app/safework/workers`