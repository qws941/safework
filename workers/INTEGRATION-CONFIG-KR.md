# 🛠️ SafeWork Cloudflare Workers 통합 정보 설정 및 배포 가이드

## 📋 현재 통합 상태

### ✅ 완료된 설정:
1. **GitHub Actions 워크플로우**: 자동 배포 파이프라인 구성 완료
2. **TypeScript 설정**: 타입 오류 수정 완료
3. **ESLint 설정**: 코드 품질 검사 활성화
4. **GitHub Secrets**: 필요한 모든 비밀 키 설정 완료

### ⚠️ 현재 이슈: Cloudflare API 토큰 권한 부족

## 🔧 통합 정보 설정 (Integration Settings)

### 1. Cloudflare API 토큰 권한 업데이트 필요

**현재 문제점:**
- KV Namespace 생성 권한 부족
- Workers Routes 편집 권한 부족

**해결 방법:**
```bash
# 1. Cloudflare 대시보드 이동
https://dash.cloudflare.com/profile/api-tokens

# 2. 기존 토큰 편집 또는 새 토큰 생성
# 3. 다음 권한 추가:
#    - Workers KV Storage: Edit
#    - Workers Routes: Edit
#    - Workers Scripts: Edit (기존)
#    - Account Settings: Read (기존)
#    - Zone Settings: Read (기존)
#    - DNS: Edit (기존)
```

### 2. GitHub Repository Secrets 확인

**현재 설정된 Secrets:**
```
✅ CLOUDFLARE_API_TOKEN
✅ CLOUDFLARE_ACCOUNT_ID
✅ CLOUDFLARE_ZONE_ID
```

**업데이트 방법:**
```bash
# GitHub 저장소 설정 페이지 이동
https://github.com/qws941/safework/settings/secrets/actions

# CLOUDFLARE_API_TOKEN 업데이트
# (새 권한이 포함된 토큰으로 교체)
```

## 🚀 배포 설정 (Deployment Configuration)

### 자동 배포 트리거

**방법 1: Git Push 자동 배포**
```bash
# workers/ 폴더의 변경사항이 있을 때 자동 배포
git add workers/
git commit -m "feat: 워커 업데이트"
git push origin master
```

**방법 2: 수동 배포 트리거**
```bash
# GitHub Actions UI 사용
# https://github.com/qws941/safework/actions
# "SafeWork Cloudflare Workers Deployment" 선택 후 "Run workflow"

# 또는 CLI 사용
gh workflow run "SafeWork Cloudflare Workers Deployment" --repo qws941/safework
```

**방법 3: 로컬 직접 배포**
```bash
cd workers/
npm run deploy
```

### 배포 파이프라인 단계

| 단계 | 현재 상태 | 설명 |
|------|-----------|------|
| **코드 체크아웃** | ✅ 정상 | GitHub에서 소스코드 가져오기 |
| **Node.js 환경 설정** | ✅ 정상 | Node.js 20 버전 설치 |
| **의존성 설치** | ✅ 정상 | npm ci 실행 |
| **TypeScript 타입 검사** | ✅ 정상 | tsc --noEmit 실행 |
| **ESLint 코드 검사** | ✅ 정상 | eslint 실행 (경고만 존재) |
| **KV Namespace 설정** | ❌ 실패 | API 토큰 권한 부족 |
| **Worker 배포** | ⏸️ 대기 | KV 설정 완료 후 진행 |
| **커스텀 도메인 설정** | ⏸️ 대기 | Worker 배포 완료 후 진행 |
| **Health Check** | ⏸️ 대기 | 배포 완료 후 진행 |

## 🔄 배포 프로세스 상세

### 1단계: 코드 품질 검증
```bash
# TypeScript 컴파일 검사
npm run type-check

# ESLint 코드 스타일 검사
npm run lint

# 빌드 테스트
npm run build
```

### 2단계: Cloudflare 리소스 설정
```bash
# KV Namespace 생성 (자동)
npx wrangler kv:namespace create "SAFEWORK_CACHE"
npx wrangler kv:namespace create "SAFEWORK_CACHE" --preview

# Worker 배포
npx wrangler deploy --env production
```

### 3단계: 도메인 및 라우팅 설정
```bash
# 커스텀 도메인 DNS 레코드 생성
# safework.jclee.me -> safework.jclee.workers.dev

# 라우팅 규칙 적용:
# - safework.jclee.me/api/*
# - safework.jclee.me/survey/*
```

### 4단계: 검증 및 모니터링
```bash
# Health Check
curl https://safework.jclee.me/api/health

# 성능 테스트
curl -w "@curl-format.txt" https://safework.jclee.me/api/health

# Worker 로그 모니터링
npm run tail
```

## 🛠️ 문제 해결 (Troubleshooting)

### 현재 주요 이슈

**1. Authentication error [code: 10000]**
```
원인: Cloudflare API 토큰 권한 부족
해결: API 토큰에 Workers KV Storage: Edit 권한 추가
```

**2. TypeScript 컴파일 오류**
```
상태: ✅ 해결됨
해결: src/worker.ts 제거, 타입 캐스팅 수정
```

**3. ESLint 설정 오류**
```
상태: ✅ 해결됨
해결: @typescript-eslint 플러그인 설치, 설정 수정
```

### 빠른 수정 명령어

**API 토큰 업데이트 후 배포 테스트:**
```bash
# 1. 작은 변경사항 추가하여 배포 트리거
echo "$(date): API token updated" >> workers/deployment.log
git add workers/deployment.log
git commit -m "chore: API 토큰 업데이트 후 배포 테스트"
git push origin master

# 2. 배포 상태 모니터링
gh run watch --repo qws941/safework
```

**로컬에서 직접 배포 테스트:**
```bash
cd workers/
export CLOUDFLARE_API_TOKEN="새로운토큰"
npm run deploy
```

## 📊 모니터링 및 관리

### 배포 상태 확인
```bash
# GitHub Actions 로그
https://github.com/qws941/safework/actions

# Cloudflare Workers 대시보드
https://dash.cloudflare.com/workers-and-pages

# Worker 실시간 로그
npm run tail
```

### 성능 지표
```bash
# 응답 시간 측정
curl -w "Total: %{time_total}s\n" https://safework.jclee.me/api/health

# Edge 위치 확인
curl -I https://safework.jclee.me/api/health | grep -i cf-ray
```

## 🎯 다음 단계 (Next Steps)

### 즉시 해야 할 작업:
1. **Cloudflare API 토큰 권한 업데이트** (최우선)
2. **배포 테스트 실행**
3. **Health Check 확인**

### 향후 개선 사항:
1. **모니터링 알림 설정**
2. **자동 롤백 정책 구성**
3. **성능 최적화**
4. **보안 헤더 강화**

## 📞 지원 및 문서

### 관련 문서:
- **통합 가이드**: `CLOUDFLARE-GIT-INTEGRATION.md`
- **배포 솔루션**: `FINAL_DEPLOYMENT_SOLUTION.md`
- **토큰 가이드**: `cloudflare-token-guide.md`

### 외부 리소스:
- [Cloudflare Workers 문서](https://developers.cloudflare.com/workers/)
- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [Wrangler CLI 문서](https://developers.cloudflare.com/workers/cli-wrangler/)

---

**현재 상태**: 통합 설정 완료 ✅ | API 토큰 권한 업데이트 필요 ⚠️
**최종 업데이트**: 2024-09-28
**예상 해결 시간**: API 토큰 업데이트 후 5분 이내