# SafeWork Workers 배포 가이드

## 🚀 빠른 배포 (Quick Deploy)

### 방법 1: 로컬 터미널에서 직접 배포 (권장)

```bash
cd /home/jclee/app/safework/workers

# 1회만 실행: Cloudflare 로그인
npx wrangler login

# 배포 실행
./deploy.sh
```

### 방법 2: API 토큰을 사용한 자동 배포

#### 1단계: Cloudflare API 토큰 생성

1. Cloudflare 대시보드 접속: https://dash.cloudflare.com/profile/api-tokens
2. "Create Token" 클릭
3. "Edit Cloudflare Workers" 템플릿 선택
4. 다음 권한 설정:
   - Account > Workers Scripts > Edit
   - Account > Workers KV Storage > Edit
   - Account > D1 > Edit
   - Zone > Workers Routes > Edit
5. "Continue to summary" → "Create Token"
6. 생성된 토큰 복사 (한 번만 표시됨)

#### 2단계: 환경 변수 설정

```bash
# 현재 세션에서만 유효
export CLOUDFLARE_API_TOKEN='your_token_here'

# 또는 ~/.bashrc나 ~/.zshrc에 추가 (영구 설정)
echo 'export CLOUDFLARE_API_TOKEN="your_token_here"' >> ~/.bashrc
source ~/.bashrc
```

#### 3단계: 배포 실행

```bash
cd /home/jclee/app/safework/workers
./deploy.sh
```

---

## 📋 배포된 API 엔드포인트

### Form 004: 산업재해 실태조사표 ✨ 신규
- 6개 섹션, 33개 필드
- 재해 유형, 피재자 정보, 원인 분석, 예방대책

### Form 005: 유해요인 기본조사표 ✨ 신규
- 7개 섹션, 36개 필드
- 위험성 평가 매트릭스 자동 검증

### Form 006: 고령근로자 작업투입 승인요청서 ✨ 신규
- 6개 섹션, 31개 필드
- 건강상태 평가, 작업 적합성 검토

---

## 🎯 배포 후 확인

```bash
# Health Check
curl https://safework.jclee.me/api/health

# Form 구조 확인
curl https://safework.jclee.me/api/form/004/structure
curl https://safework.jclee.me/api/form/005/structure
curl https://safework.jclee.me/api/form/006/structure
```

---

**마지막 업데이트**: 2025-10-09
**빌드 상태**: ✅ 준비 완료
**Forms**: 001-006 (전체 구현 완료)
