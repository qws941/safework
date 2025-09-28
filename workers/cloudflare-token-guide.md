# 🔑 SafeWork용 Cloudflare API 토큰 생성 가이드

**계정**: qws941@kakao.com
**목적**: SafeWork Workers 배포를 위한 전용 토큰 생성

## 📋 빠른 실행 단계

### 1단계: Cloudflare Dashboard 접속
1. 브라우저에서 https://dash.cloudflare.com/profile/api-tokens 접속
2. **qws941@kakao.com** 계정으로 로그인

### 2단계: 새 토큰 생성
1. **"Create Token"** 버튼 클릭
2. **"Custom token"** 선택 (맨 아래)

### 3단계: 토큰 설정
**Token name**: `SafeWork-Workers-Token-2024`

**Permissions** (총 4개 권한):
```
✅ Account | Cloudflare Workers:Edit | All accounts
✅ Zone | Zone:Read | All zones
✅ Account | Account:Read | All accounts
✅ Zone | Page Rules:Edit | All zones
```

**Account Resources**: `Include | All accounts`
**Zone Resources**: `Include | All zones`

**Client IP Address Filtering**: 비워두기 (제한 없음)
**TTL**: `Custom` → `1 year` (365일)

### 4단계: 토큰 생성 및 복사
1. **"Continue to summary"** 클릭
2. 권한 확인 후 **"Create Token"** 클릭
3. **🔥 중요**: 생성된 토큰을 즉시 복사하여 안전한 곳에 저장
   - 형태: `cftoken_xxxxxxxxxxxxxxxxxxxxxxxxx`
   - 이 화면을 벗어나면 다시 볼 수 없음!

## 🚀 토큰 사용 방법

### A. GitHub Secrets 설정 (권장)
1. https://github.com/qws941/safework/settings/secrets/actions 접속
2. **"New repository secret"** 클릭
3. **Name**: `CLOUDFLARE_API_TOKEN`
4. **Value**: 복사한 토큰값 입력
5. **"Add secret"** 클릭

### B. 수동 배포
```bash
# 토큰 환경변수 설정
export CLOUDFLARE_API_TOKEN='복사한_토큰값'

# 자동 배포 스크립트 실행
./complete-deployment.sh
```

### C. 직접 wrangler 배포
```bash
export CLOUDFLARE_API_TOKEN='복사한_토큰값'
cd /home/jclee/app/safework/workers
npx wrangler@latest deploy --env="" --compatibility-date 2024-01-01
```

## ✅ 토큰 테스트

토큰이 올바르게 생성되었는지 확인:

```bash
# 토큰 설정
export CLOUDFLARE_API_TOKEN='복사한_토큰값'

# 계정 정보 확인
curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts" | jq '.success'

# 성공 시 "true" 반환됨
```

## 🎯 완벽 성공까지의 최종 경로

1. ✅ **토큰 생성**: 위 가이드 따라 토큰 생성
2. ✅ **GitHub Secrets 설정**: Repository에 `CLOUDFLARE_API_TOKEN` 추가
3. ✅ **자동 배포**: GitHub Actions가 자동으로 트리거됨
4. ✅ **실시간 모니터링**: 현재 백그라운드에서 5초마다 체크 중
5. ✅ **성공 확인**: "근골격계부담작업 유해요인조사" → "관리자 대시보드"로 변경됨

## 🔧 추가 도구

### 실시간 모니터링 확인
```bash
# 현재 모니터링 상태 확인
tail -f /home/jclee/app/safework/workers/monitoring.log

# 수동으로 현재 상태 확인
curl -s "https://safework.jclee.me/survey/002_musculoskeletal_symptom_program" | grep "<title>"
```

### 완전 자동 배포 + 모니터링
```bash
# 토큰 설정 후 완전 자동화
export CLOUDFLARE_API_TOKEN='복사한_토큰값'
./complete-deployment.sh && echo "🎉 완벽 성공!"
```

## 🚨 중요 주의사항

1. **토큰 보안**: 생성된 토큰은 외부에 노출되지 않도록 주의
2. **1회성**: 토큰은 생성 시에만 볼 수 있으므로 즉시 복사
3. **권한 확인**: 4개 권한이 모두 설정되었는지 반드시 확인
4. **백업**: 토큰을 안전한 곳에 저장 (패스워드 매니저 권장)

---

**💡 문의**: 토큰 생성 중 문제가 발생하면 Cloudflare 지원팀에 문의하거나, qws941@kakao.com 계정의 권한을 확인하세요.

**🎯 목표**: 이 토큰으로 002 페이지가 "관리자 대시보드"로 성공적으로 변경되어 완벽 성공 달성!