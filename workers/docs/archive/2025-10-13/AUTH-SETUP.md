# Cloudflare Workers Authentication Setup

## 필요한 크리덴셜

### 1. Cloudflare API Token 생성

1. Cloudflare Dashboard 접속: https://dash.cloudflare.com
2. 프로필 아이콘 클릭 → **API Tokens** 선택
3. **Create Token** 버튼 클릭
4. **Edit Cloudflare Workers** 템플릿 선택 (또는 Custom Token)

#### 필수 권한 설정:
```
Account:
  - Workers Scripts: Edit
  - Workers KV Storage: Edit
  - D1: Edit
  - Account Settings: Read

Zone:
  - Workers Routes: Edit
  - DNS: Edit (선택사항)
```

5. **Continue to summary** → **Create Token**
6. 생성된 토큰 복사 (한 번만 표시됨!)

### 2. 환경변수 설정

#### Option A: .env 파일 (로컬 개발)

```bash
cd /home/jclee/app/safework/workers

# .env 파일 생성
cat > .env <<EOF
CLOUDFLARE_API_TOKEN=your-actual-token-here
CLOUDFLARE_ACCOUNT_ID=a8d9c67f586acdd15eebcc65ca3aa5bb
EOF
```

#### Option B: 환경변수 직접 설정

```bash
export CLOUDFLARE_API_TOKEN="your-actual-token-here"
export CLOUDFLARE_ACCOUNT_ID="a8d9c67f586acdd15eebcc65ca3aa5bb"
```

#### Option C: Wrangler 로그인 (브라우저)

```bash
wrangler login
```

브라우저가 열리면 Cloudflare 계정으로 로그인합니다.

### 3. 인증 확인

```bash
wrangler whoami
```

**예상 출력:**
```
 ⛅️ wrangler 4.40.2
───────────────────
Getting User settings...
👋 You are logged in with an API Token, associated with the email 'your-email@example.com'!
┌──────────────────────────┬──────────────────────────────────┐
│ Account Name             │ Account ID                       │
├──────────────────────────┼──────────────────────────────────┤
│ Your Account             │ a8d9c67f586acdd15eebcc65ca3aa5bb │
└──────────────────────────┴──────────────────────────────────┘
```

## D1 Database 설정

### 1. 로컬 D1 초기화 (개발)

```bash
cd /home/jclee/app/safework/workers

# 로컬 D1 스키마 적용
wrangler d1 execute PRIMARY_DB --file=d1-schema.sql --env=production
```

### 2. 리모트 D1 초기화 (프로덕션)

```bash
# API 토큰 설정 확인
echo $CLOUDFLARE_API_TOKEN

# 프로덕션 D1 스키마 적용
wrangler d1 execute PRIMARY_DB --file=d1-schema.sql --remote --env=production
```

**주의:** `--remote` 플래그는 실제 프로덕션 데이터베이스를 수정합니다!

### 3. D1 데이터베이스 확인

```bash
# 데이터베이스 목록 조회
wrangler d1 list

# 특정 데이터베이스 정보
wrangler d1 info PRIMARY_DB --env=production

# 쿼리 실행 테스트
wrangler d1 execute PRIMARY_DB --command="SELECT COUNT(*) FROM users" --remote --env=production
```

## PostgreSQL 데이터 동기화

### 1. 데이터베이스 크리덴셜 설정

```bash
export DB_HOST=safework-postgres
export DB_NAME=safework_db
export DB_USER=safework
export DB_PASSWORD=safework2024
```

### 2. Python 의존성 설치

```bash
pip install psycopg2-binary
```

### 3. 동기화 실행

```bash
cd /home/jclee/app/safework
python3 scripts/sync-postgres-to-d1.py
```

## Workers 배포

### 1. 빌드 확인

```bash
cd /home/jclee/app/safework/workers

# TypeScript 빌드
npm run build

# 타입 체크
npm run type-check
```

### 2. 로컬 테스트

```bash
# 개발 서버 시작 (로컬 D1 사용)
npm run dev

# 브라우저에서 테스트
# http://localhost:8787/api/survey/d1/stats
```

### 3. 프로덕션 배포

```bash
# 프로덕션 배포
npm run deploy:prod

# 또는 직접 wrangler 사용
wrangler deploy --env production
```

### 4. 배포 확인

```bash
# Health check
curl https://safework.jclee.me/api/health

# D1 API 테스트
curl https://safework.jclee.me/api/survey/d1/forms

# 통계 조회
curl https://safework.jclee.me/api/survey/d1/stats
```

## 문제 해결

### "You are not authenticated" 오류

```bash
# 해결 방법 1: API 토큰 재설정
export CLOUDFLARE_API_TOKEN="your-new-token"

# 해결 방법 2: 브라우저 로그인
wrangler login

# 해결 방법 3: Wrangler 재설치
npm install -g wrangler@latest
```

### "Database not found" 오류

```bash
# D1 데이터베이스 목록 확인
wrangler d1 list

# wrangler.toml의 database_id 확인
cat wrangler.toml | grep database_id
```

### "Permission denied" 오류

API 토큰의 권한을 다시 확인하세요:
- D1: Edit ✅
- Workers Scripts: Edit ✅
- Workers KV: Edit ✅

### 동기화 스크립트 오류

```bash
# PostgreSQL 연결 테스트
psql -h safework-postgres -U safework -d safework_db -c "SELECT 1"

# Python 의존성 확인
python3 -c "import psycopg2; print('OK')"
```

## 보안 참고사항

### .env 파일 보안

```bash
# .env 파일을 .gitignore에 추가
echo ".env" >> .gitignore

# 파일 권한 제한
chmod 600 .env
```

### API 토큰 관리

- ❌ GitHub에 절대 커밋하지 마세요
- ❌ 공개 채널에 공유하지 마세요
- ✅ 환경변수 또는 비밀 관리 도구 사용
- ✅ 정기적으로 토큰 로테이션
- ✅ 최소 권한 원칙 적용

### 프로덕션 배포 체크리스트

- [ ] Cloudflare API 토큰 생성 및 설정
- [ ] `wrangler whoami` 인증 확인
- [ ] D1 스키마 초기화 (로컬)
- [ ] D1 스키마 초기화 (리모트)
- [ ] PostgreSQL 데이터 동기화
- [ ] TypeScript 빌드 성공
- [ ] 로컬 개발 서버 테스트
- [ ] 프로덕션 배포
- [ ] API 엔드포인트 테스트
- [ ] 모니터링 설정
- [ ] 백업 전략 수립

## 유용한 명령어

```bash
# Wrangler 버전 확인
wrangler --version

# 로그 확인 (실시간)
wrangler tail --env production

# 환경변수 확인
wrangler secret list --env production

# 환경변수 설정
wrangler secret put ADMIN_PASSWORD --env production

# KV 네임스페이스 목록
wrangler kv:namespace list

# D1 백업
wrangler d1 export PRIMARY_DB --remote --output=backup.sql --env=production
```

## 추가 리소스

- Cloudflare Workers 문서: https://developers.cloudflare.com/workers/
- D1 Database 문서: https://developers.cloudflare.com/d1/
- Wrangler CLI 문서: https://developers.cloudflare.com/workers/wrangler/
- API 토큰 생성: https://dash.cloudflare.com/profile/api-tokens

---

**작성일**: 2025-09-30
**버전**: 1.0.0