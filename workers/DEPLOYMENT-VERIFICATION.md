# 🔍 SafeWork Worker 배포 검증 가이드

## ✅ Worker 이름 변경 완료

### 변경 사항:
- **이전**: `safework-prod` (production environment)
- **현재**: `safework` (unified naming)
- **설정 파일**: `wrangler.toml` 업데이트 완료

## 📋 현재 배포 설정

### Worker 구성:
```toml
# 기본 Worker 이름
name = "safework"

# Production 환경
[env.production]
name = "safework"  # ← 업데이트됨

# Development 환경
[env.development]
name = "safework-dev"  # ← 유지됨
```

### 라우팅 설정:
```toml
# API 엔드포인트
pattern = "safework.jclee.me/api/*"

# 설문조사 폼
pattern = "safework.jclee.me/survey/001_musculoskeletal_symptom_survey"
pattern = "safework.jclee.me/survey/002_musculoskeletal_symptom_program"
```

## 🚀 배포 명령어

### 방법 1: GitHub Actions 자동 배포
```bash
# 변경사항 푸시하면 자동 배포
git push origin master
```

### 방법 2: 로컬에서 직접 배포
```bash
# Production 환경 배포
npx wrangler deploy --env production

# 또는 기본 환경 배포
npx wrangler deploy
```

### 방법 3: 수동 GitHub Actions 트리거
```bash
gh workflow run "SafeWork Cloudflare Workers Deployment" --repo qws941/safework
```

## ✅ 배포 검증 체크리스트

### 배포 전 검증:
- [ ] TypeScript 컴파일 확인: `npm run type-check`
- [ ] ESLint 검사 확인: `npm run lint`
- [ ] Wrangler 설정 검증: `npx wrangler whoami`
- [ ] KV Namespace 존재 확인: `npx wrangler kv:namespace list`

### 배포 후 검증:
- [ ] Worker 상태 확인: `npx wrangler deployments status`
- [ ] Health Check: `curl https://safework.jclee.me/api/health`
- [ ] API 응답 테스트: `curl https://safework.jclee.me/api/survey/statistics`
- [ ] 설문조사 폼 접근: `curl https://safework.jclee.me/survey/001_musculoskeletal_symptom_survey`

## 🛠️ 문제 해결

### 일반적인 문제들:

**1. Worker 이름 충돌**
```bash
# 기존 worker 삭제 (필요시)
npx wrangler delete safework-prod --force
```

**2. 라우팅 문제**
```bash
# 라우팅 상태 확인
npx wrangler triggers
```

**3. KV Namespace 문제**
```bash
# KV 네임스페이스 생성
npx wrangler kv:namespace create "SAFEWORK_KV"
npx wrangler kv:namespace create "SAFEWORK_KV" --preview
```

## 📊 현재 상태

### ✅ 완료된 작업:
1. Worker 이름 통합 (safework-prod → safework)
2. Wrangler 설정 업데이트
3. GitHub Actions 워크플로우 호환성 확인
4. 라우팅 규칙 유지

### ⚠️ 확인 필요:
1. Cloudflare API 토큰 권한 (Workers KV Storage: Edit)
2. 기존 safework-prod worker 정리 (필요시)
3. DNS 레코드 상태 확인

## 🔄 배포 테스트

### 즉시 실행 가능한 테스트:
```bash
# 1. 로컬 설정 확인
cd workers/
npm run type-check
npm run lint

# 2. Wrangler 인증 확인
npx wrangler whoami

# 3. 설정 파일 검증
npx wrangler deploy --dry-run

# 4. 실제 배포 (API 토큰 권한 있는 경우)
npx wrangler deploy --env production
```

### GitHub Actions 배포 테스트:
```bash
# 작은 변경사항으로 배포 트리거
echo "# Deployment test: $(date)" >> DEPLOYMENT-VERIFICATION.md
git add DEPLOYMENT-VERIFICATION.md
git commit -m "test: worker 이름 변경 후 배포 테스트"
git push origin master

# 배포 상태 모니터링
gh run watch --repo qws941/safework
```

## 📈 성능 및 모니터링

### 배포 후 확인할 지표:
```bash
# 응답 시간 측정
curl -w "Total: %{time_total}s\n" -o /dev/null -s https://safework.jclee.me/api/health

# Edge 위치 확인
curl -I https://safework.jclee.me/api/health | grep cf-ray

# Worker 실시간 로그
npm run tail
```

### 예상 결과:
- **응답 시간**: < 200ms
- **HTTP 상태**: 200 OK
- **Edge 위치**: CF-RAY 헤더 존재
- **Worker 로그**: 정상 요청 로그

---

**상태**: Worker 이름 변경 완료 ✅ | 배포 테스트 준비 완료 🚀
**다음 단계**: API 토큰 권한 확인 후 배포 테스트
**예상 소요 시간**: 5-10분