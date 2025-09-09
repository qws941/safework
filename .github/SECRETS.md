# GitHub Secrets 설정 가이드

SafeWork 프로젝트의 GitHub Actions가 정상 작동하려면 다음 Secrets를 설정해야 합니다.

## 🔐 필수 Secrets 설정

### 1. Repository Settings → Secrets and variables → Actions로 이동

### 2. 다음 Secrets를 추가:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `ANTHROPIC_API_KEY` | Anthropic API 키 ⭐️ | `sk-ant-...` |
| `REGISTRY_PASSWORD` | Docker 레지스트리 비밀번호 | `bingogo1` |
| `REGISTRY_URL` | Docker 레지스트리 URL (선택사항) | `registry.jclee.me` |
| `REGISTRY_USER` | Docker 레지스트리 사용자명 (선택사항) | `admin` |

### 3. 기본 제공 Secrets (자동 생성됨)

| Secret Name | Description |
|-------------|-------------|
| `GITHUB_TOKEN` | GitHub API 액세스 토큰 (자동 제공) |

## ⚙️ 설정 방법

### GitHub 웹사이트에서:
1. Repository 페이지로 이동
2. **Settings** 탭 클릭
3. 왼쪽 메뉴에서 **Secrets and variables** → **Actions** 클릭
4. **New repository secret** 클릭
5. Secret 이름과 값 입력

### GitHub CLI 사용:
```bash
# 1. Anthropic API 키 설정 (필수!)
gh secret set ANTHROPIC_API_KEY -b "sk-ant-your-api-key-here"

# 2. Docker 레지스트리 설정
gh secret set REGISTRY_PASSWORD -b "bingogo1"

# 선택사항: 다른 레지스트리 사용 시
gh secret set REGISTRY_URL -b "your-registry.com"
gh secret set REGISTRY_USER -b "your-username"
```

### Claude Code 설정 방법:
```bash
# ✅ Anthropic API 키 설정이 필요합니다!
# Anthropic Console에서 API 키를 발급받아 설정하세요

# API 키 확인 방법:
gh secret list | grep ANTHROPIC_API_KEY

# API 키 설정 방법:
# 1. https://console.anthropic.com에서 API 키 생성
# 2. GitHub Settings에서 ANTHROPIC_API_KEY Secret 설정
```

## 🔍 Secrets 검증

설정 후 다음 명령으로 Secrets가 올바르게 설정되었는지 확인:

```bash
# Secrets 목록 확인
gh secret list

# 워크플로우 실행 테스트
git push origin main
```

## ⚠️ 보안 주의사항

1. **절대 하드코딩 금지**: 비밀번호, API 키 등을 코드에 직접 작성하지 마세요
2. **최소 권한 원칙**: 필요한 최소한의 권한만 부여하세요
3. **정기적 로테이션**: 정기적으로 비밀번호를 변경하세요
4. **액세스 로그 모니터링**: Secrets 사용 내역을 정기적으로 확인하세요

## 🚀 워크플로우 트리거

Secrets 설정 후 다음 방법으로 배포 가능:

### 자동 배포
```bash
# 코드 변경 후 푸시
git add .
git commit -m "feat: new feature"
git push origin main
```

### 릴리즈 배포
```bash
# GitHub 웹에서 Release 생성 또는
make release v=1.3.0
```

### 수동 트리거
GitHub Actions 페이지에서 "Run workflow" 버튼 클릭

## 🐛 문제 해결

### Secrets가 인식되지 않는 경우:
1. Secret 이름의 대소문자가 정확한지 확인
2. Repository 설정에서 Actions 권한이 활성화되어 있는지 확인
3. 워크플로우 파일의 문법이 올바른지 확인

### 레지스트리 로그인 실패:
1. `REGISTRY_PASSWORD` Secret 값이 정확한지 확인  
2. `REGISTRY_USER`와 `REGISTRY_URL`이 올바른지 확인
3. 네트워크 연결 상태 확인

## 📞 지원

문제가 지속되면:
1. GitHub Actions 로그 확인
2. Repository Issues에 문제 보고
3. 설정 값 재확인 후 재시도