# SafeWork 배포 가이드

## 📋 목차
- [배포 방법](#배포-방법)
- [초기 설정](#초기-설정)
- [배포 확인](#배포-확인)
- [문제 해결](#문제-해결)

---

## 🚀 배포 방법

SafeWork는 **100% Cloudflare Workers** 기반 프로젝트입니다. 3가지 배포 방법을 제공합니다.

### 방법 1: GitHub Actions 자동 배포 (권장) ⭐

가장 안전하고 검증된 방법입니다.

```bash
# 1. 변경사항 커밋 및 푸시
git add .
git commit -m "feat: Update feature"
git push origin master

# 2. GitHub Actions가 자동으로 실행됨
# - Gemini AI 코드 리뷰 (PR 시)
# - TypeScript 타입 체크
# - 프로덕션 배포
# - Health check 검증
```

**필요 사항:**
- Git push 권한 (SSH 키 또는 GitHub Token)
- GitHub Actions가 활성화된 저장소

**배포 진행 상황 확인:**
https://github.com/qws941/safework/actions

---

### 방법 2: 빠른 배포 스크립트 ⚡

로컬에서 직접 배포하는 가장 빠른 방법입니다.

```bash
./scripts/deployment/quick-deploy.sh
```

**자동 수행 작업:**
1. TypeScript 타입 체크
2. Wrangler 인증 확인
3. Cloudflare Workers 배포
4. Health check 검증

**필요 사항:**
- Cloudflare API Token (또는 `wrangler login`)
- 프로젝트 루트에서 실행

**예상 소요 시간:** ~30초

---

### 방법 3: 수동 배포

단계별로 직접 배포하는 방법입니다.

```bash
cd workers/

# 1. TypeScript 타입 체크
npm run type-check

# 2. 배포
npx wrangler deploy --env production

# 3. Health check
curl https://safework.jclee.me/api/health
```

**필요 사항:**
- Cloudflare 인증 (`wrangler login` 또는 API Token)

---

## 🔐 초기 설정 (최초 1회만)

### A. GitHub 연결 (방법 1용)

**옵션 A1: SSH 키 등록 (권장)**
```bash
# 1. SSH 공개키 확인
cat ~/.ssh/id_ed25519.pub

# 2. 출력된 키를 복사하여 GitHub에 등록
# https://github.com/settings/keys

# 3. SSH 연결 테스트
ssh -T git@github.com
```

**옵션 A2: GitHub Personal Access Token**
```bash
# 1. GitHub에서 토큰 생성
# https://github.com/settings/tokens
# Scopes: repo (전체)

# 2. 환경 변수 설정
export GITHUB_TOKEN='your_token_here'

# 3. ~/.bashrc에 추가 (영구 설정)
echo 'export GITHUB_TOKEN="your_token_here"' >> ~/.bashrc
```

---

### B. Cloudflare 연결 (방법 2, 3용)

**옵션 B1: 인터랙티브 로그인 (권장)**
```bash
cd workers/
npx wrangler login
# 브라우저가 열리면 Cloudflare 계정으로 로그인
```

**옵션 B2: API Token**
```bash
# 1. Cloudflare 대시보드에서 API 토큰 생성
# https://dash.cloudflare.com/profile/api-tokens
# 템플릿: "Edit Cloudflare Workers"

# 2. 환경 변수 설정
export CLOUDFLARE_API_TOKEN='your_token_here'

# 3. ~/.bashrc에 추가 (영구 설정)
echo 'export CLOUDFLARE_API_TOKEN="your_token_here"' >> ~/.bashrc
```

**인증 설정 스크립트:**
```bash
./scripts/deployment/setup-auth.sh
```

---

## 📊 배포 확인

### Health Check

```bash
# 서비스 상태 확인
curl https://safework.jclee.me/api/health

# 예상 응답:
# {"status":"healthy","checks":{"service":"healthy","kv_storage":"healthy","backend":"skipped"},...}
```

### Native Services Health Check

```bash
# 모든 네이티브 서비스 확인 (D1, KV, R2, AI)
curl https://safework.jclee.me/api/native/native/health
```

### 실시간 로그 확인

```bash
cd workers/
npx wrangler tail --env production
```

### 배포 버전 확인

```bash
cd workers/
npx wrangler deployments list --env production
```

---

## 🔧 문제 해결

### 1. TypeScript 타입 에러

```bash
cd workers/
npm run type-check

# 에러 수정 후
npm run lint:fix
```

### 2. Wrangler 인증 실패

```bash
# 로그인 초기화
npx wrangler logout
npx wrangler login

# 또는 API Token 재설정
export CLOUDFLARE_API_TOKEN='new_token_here'
```

### 3. 배포 실패

```bash
# 로컬 개발 서버로 테스트
cd workers/
npm run dev

# 브라우저에서 http://localhost:8787 접속

# 정상 동작하면 다시 배포
npx wrangler deploy --env production
```

### 4. Health Check 실패

```bash
# 서비스 상태 확인
curl -v https://safework.jclee.me/api/health

# D1 데이터베이스 확인
npx wrangler d1 execute PRIMARY_DB --command="SELECT COUNT(*) FROM surveys" --remote --env=production

# KV 스토리지 확인
npx wrangler kv:key list --binding=SAFEWORK_KV --env=production
```

### 5. GitHub Actions 실패

```bash
# Actions 로그 확인
# https://github.com/qws941/safework/actions

# 로컬에서 동일한 체크 실행
cd workers/
npm run type-check
npm run lint
npm test
```

### 6. Git Push 권한 문제

```bash
# SSH 연결 확인
ssh -T git@github.com

# HTTPS → SSH로 변경
git remote set-url origin git@github.com:qws941/safework.git

# SSH 키 재생성 (필요시)
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# 출력된 키를 https://github.com/settings/keys 에 등록
```

---

## 📚 추가 자료

- **API 문서**: `/docs/API_ENDPOINTS.md`
- **프로젝트 구조**: `/docs/PROJECT_STRUCTURE.md`
- **D1 마이그레이션**: `/docs/architecture/D1-MIGRATION-COMPLETE.md`
- **CI/CD 파이프라인**: `/docs/CLOUDFLARE_DEPLOYMENT.md`

---

## 🎯 빠른 참조

| 작업 | 명령어 |
|------|--------|
| GitHub Actions 배포 | `git push origin master` |
| 빠른 로컬 배포 | `./scripts/deployment/quick-deploy.sh` |
| 수동 배포 | `cd workers && npx wrangler deploy --env production` |
| Health Check | `curl https://safework.jclee.me/api/health` |
| 실시간 로그 | `npx wrangler tail --env production` |
| 타입 체크 | `cd workers && npm run type-check` |
| 로컬 개발 서버 | `cd workers && npm run dev` |

---

**프로덕션 URL:**
- Custom Domain: https://safework.jclee.me
- Workers.dev: https://safework.jclee.workers.dev

**Architecture:** 100% Cloudflare Workers (D1, KV, R2, AI)
