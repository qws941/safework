# GitHub 브랜치 보호 규칙 설정 가이드

SafeWork 프로젝트의 브랜치 보호 규칙을 GitHub에서 설정하는 방법을 안내합니다.

## 🛡️ 브랜치 보호 설정 위치

1. GitHub 저장소 페이지로 이동
2. **Settings** 탭 클릭
3. 왼쪽 메뉴에서 **Branches** 클릭
4. **Add rule** 버튼 클릭

## 📋 브랜치별 보호 규칙

### 1. Main 브랜치 보호 (최고 수준)

**Branch name pattern**: `main`

#### Required settings:
- ✅ **Require a pull request before merging**
  - ✅ **Require approvals**: 1
  - ✅ **Dismiss stale reviews when new commits are pushed**
  - ✅ **Require review from code owners** (선택사항)
- ✅ **Require status checks to pass before merging**
  - ✅ **Require branches to be up to date before merging**
  - **Required status checks**:
    - `test (3.11)` - Python 3.11 테스트
    - `test (3.10)` - Python 3.10 테스트  
    - `test (3.9)` - Python 3.9 테스트
    - `docker-build-test` - Docker 빌드 테스트
- ✅ **Require linear history**
- ✅ **Include administrators** 
- 🚫 **Allow force pushes** (비활성화)
- 🚫 **Allow deletions** (비활성화)

### 2. Staging 브랜치 보호 (높음 수준)

**Branch name pattern**: `staging`

#### Required settings:
- ✅ **Require a pull request before merging**
  - ✅ **Require approvals**: 1
  - ✅ **Dismiss stale reviews when new commits are pushed**
- ✅ **Require status checks to pass before merging**
  - ✅ **Require branches to be up to date before merging**
  - **Required status checks**:
    - `test (3.11)` - Python 3.11 테스트
    - `docker-build-test` - Docker 빌드 테스트
- 🚫 **Allow force pushes** (비활성화)

### 3. Develop 브랜치 보호 (중간 수준)

**Branch name pattern**: `develop`

#### Required settings:
- ✅ **Require status checks to pass before merging**
  - **Required status checks**:
    - `test (3.11)` - Python 3.11 테스트
- ⚠️ **Require a pull request before merging** (팀 정책에 따라 선택)
  - **Require approvals**: 0 (자동 머지 허용)

## 🤖 GitHub CLI를 사용한 자동 설정

GitHub CLI(gh)가 있다면 다음 명령으로 자동 설정 가능:

```bash
# Main 브랜치 보호 설정
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"checks":[{"context":"test (3.11)"},{"context":"test (3.10)"},{"context":"test (3.9)"},{"context":"docker-build-test"}]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false

# Staging 브랜치 보호 설정
gh api repos/:owner/:repo/branches/staging/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"checks":[{"context":"test (3.11)"},{"context":"docker-build-test"}]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null \
  --field required_linear_history=false \
  --field allow_force_pushes=false \
  --field allow_deletions=false

# Develop 브랜치 보호 설정
gh api repos/:owner/:repo/branches/develop/protection \
  --method PUT \
  --field required_status_checks='{"strict":false,"checks":[{"context":"test (3.11)"}]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews=null \
  --field restrictions=null \
  --field required_linear_history=false \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

## 📝 자동 설정 스크립트

브랜치 보호 규칙을 자동으로 설정하는 스크립트:

```bash
#!/bin/bash
# setup-branch-protection.sh

set -e

REPO_OWNER=$(gh repo view --json owner --jq .owner.login)
REPO_NAME=$(gh repo view --json name --jq .name)

echo "🛡️ SafeWork 브랜치 보호 규칙 설정 중..."
echo "저장소: $REPO_OWNER/$REPO_NAME"

# Main 브랜치가 존재하는지 확인
if gh api repos/$REPO_OWNER/$REPO_NAME/branches/main > /dev/null 2>&1; then
    echo "📋 Main 브랜치 보호 설정 중..."
    gh api repos/$REPO_OWNER/$REPO_NAME/branches/main/protection \
        --method PUT \
        --field required_status_checks='{"strict":true,"checks":[{"context":"test (3.11)"},{"context":"test (3.10)"},{"context":"test (3.9)"},{"context":"docker-build-test"}]}' \
        --field enforce_admins=true \
        --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
        --field restrictions=null \
        --field required_linear_history=true \
        --field allow_force_pushes=false \
        --field allow_deletions=false \
        > /dev/null && echo "✅ Main 브랜치 보호 설정 완료"
else
    echo "⚠️ Main 브랜치가 없습니다."
fi

# Staging 브랜치 보호 설정 (존재하는 경우에만)
if gh api repos/$REPO_OWNER/$REPO_NAME/branches/staging > /dev/null 2>&1; then
    echo "📋 Staging 브랜치 보호 설정 중..."
    gh api repos/$REPO_OWNER/$REPO_NAME/branches/staging/protection \
        --method PUT \
        --field required_status_checks='{"strict":true,"checks":[{"context":"test (3.11)"},{"context":"docker-build-test"}]}' \
        --field enforce_admins=false \
        --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
        --field restrictions=null \
        --field required_linear_history=false \
        --field allow_force_pushes=false \
        --field allow_deletions=false \
        > /dev/null && echo "✅ Staging 브랜치 보호 설정 완료"
else
    echo "⚠️ Staging 브랜치가 없습니다. 나중에 생성 후 설정하세요."
fi

# Develop 브랜치 보호 설정 (존재하는 경우에만)
if gh api repos/$REPO_OWNER/$REPO_NAME/branches/develop > /dev/null 2>&1; then
    echo "📋 Develop 브랜치 보호 설정 중..."
    gh api repos/$REPO_OWNER/$REPO_NAME/branches/develop/protection \
        --method PUT \
        --field required_status_checks='{"strict":false,"checks":[{"context":"test (3.11)"}]}' \
        --field enforce_admins=false \
        --field required_pull_request_reviews=null \
        --field restrictions=null \
        --field required_linear_history=false \
        --field allow_force_pushes=false \
        --field allow_deletions=false \
        > /dev/null && echo "✅ Develop 브랜치 보호 설정 완료"
else
    echo "⚠️ Develop 브랜치가 없습니다. 나중에 생성 후 설정하세요."
fi

echo ""
echo "🎉 브랜치 보호 규칙 설정 완료!"
echo ""
echo "📋 확인 방법:"
echo "  GitHub에서 Settings > Branches에서 확인"
echo "  또는: gh api repos/$REPO_OWNER/$REPO_NAME/branches/main/protection"
```

## 🔍 설정 확인 방법

### GitHub 웹에서 확인:
1. 저장소 > Settings > Branches
2. 각 브랜치 규칙의 "Edit" 버튼으로 세부사항 확인

### GitHub CLI로 확인:
```bash
# Main 브랜치 보호 상태 확인
gh api repos/:owner/:repo/branches/main/protection

# 모든 보호된 브랜치 확인
gh api repos/:owner/:repo/branches --paginate | jq '.[] | select(.protected == true) | {name: .name, protected: .protected}'
```

## ⚠️ 주의사항

1. **브랜치가 먼저 존재해야 함**: 보호 규칙을 설정하기 전에 해당 브랜치가 생성되어 있어야 합니다.

2. **Status Check 이름 확인**: 워크플로우의 job 이름과 정확히 일치해야 합니다.

3. **권한 확인**: 저장소 admin 권한이 있어야 브랜치 보호 규칙을 설정할 수 있습니다.

4. **테스트 워크플로우 실행**: 브랜치 보호 설정 전에 테스트 워크플로우를 한번 실행하여 status check 이름을 확인하세요.

## 🚨 문제 해결

### Status Check가 인식되지 않는 경우:
1. `.github/workflows/test.yml`에서 job 이름 확인
2. 해당 워크플로우를 한번 실행하여 GitHub에 등록
3. 브랜치 보호 설정에서 정확한 이름 입력

### 브랜치 보호가 작동하지 않는 경우:
1. 브랜치 패턴이 정확한지 확인 (`main`, `staging`, `develop`)
2. Required status checks가 올바르게 설정되었는지 확인
3. 권한 설정 확인 (Include administrators 설정)

이 설정을 통해 SafeWork 프로젝트의 코드 품질과 배포 안정성을 크게 향상시킬 수 있습니다.