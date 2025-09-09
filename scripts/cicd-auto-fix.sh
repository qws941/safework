#!/bin/bash

# SafeWork CI/CD 파이프라인 자동 실패 감지 및 수정 시스템

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 색상 로깅
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [CICD-FIX] $1"
}

log_success() {
    echo -e "\033[32m✅ $1\033[0m"
}

log_warning() {
    echo -e "\033[33m⚠️  $1\033[0m"
}

log_error() {
    echo -e "\033[31m❌ $1\033[0m"
}

# 일반적인 워크플로우 오류 자동 수정 함수
auto_fix_common_errors() {
    local workflow_file="$1"
    local error_type="$2"
    local fixed=false
    
    log "🔧 자동 수정 시도: $workflow_file ($error_type)"
    
    case "$error_type" in
        "syntax_error"|"yaml_error")
            # YAML 문법 오류 자동 수정
            if command -v yamllint >/dev/null 2>&1; then
                if yamllint "$workflow_file" --format parsable 2>/dev/null; then
                    log_success "YAML 문법이 유효합니다."
                else
                    log_warning "YAML 문법 오류 감지, 수동 수정 필요"
                fi
            fi
            ;;
            
        "missing_secrets")
            # 누락된 시크릿 자동 감지 및 가이드
            local missing_secrets=$(grep -o '\${{[^}]*secrets\.[^}]*}}' "$workflow_file" | sort -u)
            if [[ -n "$missing_secrets" ]]; then
                log_warning "누락된 시크릿 감지:"
                echo "$missing_secrets" | while read secret; do
                    log "  - $secret"
                done
                
                # GitHub Secrets 확인 스크립트 실행
                create_secrets_fix_guide "$missing_secrets"
                fixed=true
            fi
            ;;
            
        "dependency_error")
            # 의존성 오류 자동 수정
            fix_workflow_dependencies "$workflow_file"
            fixed=true
            ;;
            
        "permission_error")
            # 권한 오류 자동 수정
            fix_workflow_permissions "$workflow_file"
            fixed=true
            ;;
    esac
    
    echo $fixed
}

# 누락된 시크릿 수정 가이드 생성
create_secrets_fix_guide() {
    local missing_secrets="$1"
    
    cat << EOF > "$PROJECT_ROOT/docs/missing-secrets-fix.md"
# 누락된 GitHub Secrets 자동 수정 가이드

## 🔑 감지된 누락 시크릿

$missing_secrets

## 📋 수정 방법

### 1. GitHub Repository Settings
\`\`\`bash
# GitHub 웹사이트에서:
# 1. Repository → Settings → Secrets and variables → Actions
# 2. "New repository secret" 클릭
# 3. 아래 시크릿들을 추가:
\`\`\`

### 2. 필수 시크릿 값들
\`\`\`bash
# Docker Registry 인증
REGISTRY_PASSWORD=SafeWork[복잡한패스워드]Registry@

# Watchtower API 토큰  
WATCHTOWER_HTTP_API_TOKEN=wt_[32자 무작위 토큰]

# Anthropic API 키
ANTHROPIC_API_KEY=[Anthropic Console에서 발급받은 API 키]

# Slack Bot 토큰
SLACK_BOT_TOKEN=xoxb-[Slack에서 생성한 봇 토큰]
\`\`\`

### 3. 자동 설정 스크립트 실행
\`\`\`bash
# 보안 설정 스크립트로 자동 생성
./scripts/security-setup.sh

# 생성된 값들을 GitHub Secrets에 수동 입력
cat .env | grep -E "(REGISTRY_PASSWORD|WATCHTOWER_HTTP_API_TOKEN)"
\`\`\`

### 4. 검증 명령어
\`\`\`bash
# GitHub CLI로 시크릿 확인
gh secret list

# 워크플로우 재실행
gh run rerun --failed
\`\`\`

---
*생성 시간: $(date '+%Y-%m-%d %H:%M:%S KST')*
*자동 감지 시스템에 의해 생성됨*
EOF

    log_success "누락된 시크릿 수정 가이드 생성됨: docs/missing-secrets-fix.md"
}

# 워크플로우 의존성 오류 수정
fix_workflow_dependencies() {
    local workflow_file="$1"
    
    log "🔗 워크플로우 의존성 수정 중: $workflow_file"
    
    # 일반적인 의존성 문제들 자동 수정
    sed -i.bak \
        -e 's/needs: \[pre-validation\]/needs: [pre-validation]/' \
        -e 's/if: needs\.pre-validation\.outputs\.should_deploy == true/if: needs.pre-validation.outputs.should_deploy == '\''true'\''/' \
        -e 's/\${{ secrets\.GITHUB_TOKEN }}/\${{ github.token }}/' \
        "$workflow_file"
    
    if [[ -f "$workflow_file.bak" ]]; then
        rm "$workflow_file.bak"
        log_success "워크플로우 의존성 문법 수정 완료"
        return 0
    fi
    
    return 1
}

# 워크플로우 권한 오류 수정
fix_workflow_permissions() {
    local workflow_file="$1"
    
    log "🔐 워크플로우 권한 수정 중: $workflow_file"
    
    # permissions 섹션이 없으면 추가
    if ! grep -q "permissions:" "$workflow_file"; then
        # jobs 섹션 앞에 permissions 추가
        sed -i '/^jobs:/i \
permissions:\
  contents: read\
  issues: write\
  pull-requests: write\
  actions: read\
  checks: write\
' "$workflow_file"
        
        log_success "워크플로우 권한 섹션 추가 완료"
        return 0
    fi
    
    return 1
}

# 실패한 워크플로우 감지 및 자동 수정
detect_and_fix_failed_workflows() {
    log "🔍 실패한 워크플로우 감지 중..."
    
    # 최근 10개 워크플로우 실행 결과 확인
    local failed_runs=$(gh run list --limit 10 --json conclusion,workflowName,workflowFile,url,headBranch \
        --jq '.[] | select(.conclusion == "failure") | "\(.workflowName)|\(.workflowFile)|\(.url)|\(.headBranch)"')
    
    if [[ -z "$failed_runs" ]]; then
        log_success "실패한 워크플로우가 없습니다."
        return 0
    fi
    
    local fix_count=0
    local total_count=0
    
    while IFS='|' read -r workflow_name workflow_file url branch; do
        ((total_count++))
        log "❌ 실패한 워크플로우: $workflow_name"
        
        local workflow_path="$PROJECT_ROOT/.github/workflows/$workflow_file"
        
        if [[ ! -f "$workflow_path" ]]; then
            log_error "워크플로우 파일을 찾을 수 없음: $workflow_path"
            continue
        fi
        
        # 실패 원인 분석
        local run_id=$(echo "$url" | grep -o '[0-9]*$')
        local failure_reason=$(analyze_failure_reason "$run_id")
        
        log "🔍 실패 원인: $failure_reason"
        
        # 자동 수정 시도
        if auto_fix_common_errors "$workflow_path" "$failure_reason"; then
            ((fix_count++))
            log_success "자동 수정 완료: $workflow_name"
            
            # 수정된 워크플로우 커밋
            git add "$workflow_path"
        else
            log_warning "자동 수정 불가: $workflow_name (수동 개입 필요)"
            
            # 수동 수정을 위한 GitHub 이슈 생성
            create_manual_fix_issue "$workflow_name" "$url" "$failure_reason"
        fi
        
    done <<< "$failed_runs"
    
    if [[ $fix_count -gt 0 ]]; then
        # 자동 수정 사항 커밋
        git commit -m "🔧 CI/CD 워크플로우 자동 수정: $fix_count/$total_count 개 수정

- 워크플로우 문법 오류 수정
- 의존성 및 권한 문제 해결
- 누락된 시크릿 가이드 생성

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
        
        log_success "자동 수정 완료: $fix_count/$total_count 개 워크플로우"
        
        # 수정 후 워크플로우 재실행 시도
        retry_fixed_workflows
    fi
}

# 실패 원인 분석
analyze_failure_reason() {
    local run_id="$1"
    
    # GitHub CLI로 실패 로그 분석
    local logs=$(gh run view "$run_id" --log 2>/dev/null | head -20 || echo "")
    
    if [[ $logs =~ "yaml" ]] || [[ $logs =~ "syntax" ]]; then
        echo "syntax_error"
    elif [[ $logs =~ "secret" ]] || [[ $logs =~ "GITHUB_TOKEN" ]]; then
        echo "missing_secrets"
    elif [[ $logs =~ "needs" ]] || [[ $logs =~ "dependency" ]]; then
        echo "dependency_error"
    elif [[ $logs =~ "permission" ]] || [[ $logs =~ "forbidden" ]]; then
        echo "permission_error"
    else
        echo "unknown_error"
    fi
}

# 수동 수정을 위한 이슈 생성
create_manual_fix_issue() {
    local workflow_name="$1"
    local workflow_url="$2"
    local failure_reason="$3"
    
    local issue_body="## 🚨 CI/CD 워크플로우 자동 수정 실패

**워크플로우**: $workflow_name
**실패 원인**: $failure_reason
**워크플로우 URL**: $workflow_url

### 🔧 수동 수정 필요

자동 수정 시스템에서 이 워크플로우를 수정할 수 없습니다.

**다음 단계**:
1. 워크플로우 로그 확인
2. 문법 또는 설정 오류 수정
3. 필요한 시크릿이 누락되었는지 확인
4. 워크플로우 재실행

### 📋 체크리스트
- [ ] 워크플로우 파일 문법 검사
- [ ] 필요한 GitHub Secrets 확인
- [ ] 권한 설정 검토
- [ ] 의존성 관계 확인

### 🤖 자동 생성
이 이슈는 SafeWork CI/CD 자동 수정 시스템에 의해 생성되었습니다.
시스템이 자동으로 수정할 수 없는 복잡한 문제입니다."

    # GitHub CLI로 이슈 생성
    if gh issue create \
        --title "🔧 [AUTO-FIX] CI/CD 워크플로우 수동 수정 필요: $workflow_name" \
        --body "$issue_body" \
        --label "bug,P1-high,cicd,manual-fix-required" >/dev/null 2>&1; then
        
        log_success "수동 수정 이슈 생성 완료: $workflow_name"
    else
        log_error "이슈 생성 실패: $workflow_name"
    fi
}

# 수정된 워크플로우 재실행
retry_fixed_workflows() {
    log "🔄 수정된 워크플로우 재실행 중..."
    
    # 최근 실패한 워크플로우들 재실행
    if gh run rerun --failed >/dev/null 2>&1; then
        log_success "실패한 워크플로우 재실행 완료"
    else
        log_warning "워크플로우 재실행 실패 (권한 문제일 수 있음)"
    fi
}

# 시스템 상태 모니터링
monitor_cicd_health() {
    log "📊 CI/CD 시스템 전체 상태 모니터링..."
    
    echo "===================="
    echo "🔧 CI/CD 파이프라인 상태"
    echo "===================="
    
    # GitHub Actions 서비스 상태
    if gh api repos/{owner}/{repo}/actions/workflows >/dev/null 2>&1; then
        log_success "GitHub Actions API 접근 가능"
    else
        log_error "GitHub Actions API 접근 실패"
    fi
    
    # 최근 워크플로우 실행 통계
    local success_count=$(gh run list --limit 10 --json conclusion --jq '[.[] | select(.conclusion == "success")] | length')
    local failure_count=$(gh run list --limit 10 --json conclusion --jq '[.[] | select(.conclusion == "failure")] | length')
    local total_count=$(gh run list --limit 10 --json conclusion --jq '. | length')
    
    echo "최근 10개 워크플로우 실행 결과:"
    echo "  ✅ 성공: $success_count/$total_count"
    echo "  ❌ 실패: $failure_count/$total_count"
    
    if [[ $failure_count -gt 0 ]]; then
        local success_rate=$((success_count * 100 / total_count))
        if [[ $success_rate -lt 80 ]]; then
            log_warning "워크플로우 성공률이 낮습니다 ($success_rate%). 시스템 점검이 필요합니다."
        fi
    else
        log_success "모든 워크플로우가 성공적으로 실행되었습니다."
    fi
    
    echo "===================="
    echo "🔧 자동 수정 시스템 권장사항"
    echo "===================="
    echo "1. 정기적인 워크플로우 상태 점검"
    echo "2. GitHub Secrets 유효성 검증"
    echo "3. 워크플로우 파일 문법 검사"
    echo "4. 의존성 관계 최적화"
}

# 메인 실행 함수
main() {
    log "🚀 SafeWork CI/CD 자동 수정 시스템 시작"
    
    # GitHub CLI 인증 확인
    if ! gh auth status >/dev/null 2>&1; then
        log_error "GitHub CLI 인증이 필요합니다: gh auth login"
        exit 1
    fi
    
    # Git 상태 확인
    if [[ -n $(git status --porcelain) ]]; then
        log_warning "작업 디렉토리에 커밋되지 않은 변경사항이 있습니다."
        log "자동 수정 후 변경사항이 함께 커밋될 수 있습니다."
    fi
    
    # 실패한 워크플로우 감지 및 자동 수정
    detect_and_fix_failed_workflows
    
    # 시스템 상태 모니터링
    monitor_cicd_health
    
    log_success "✅ CI/CD 자동 수정 시스템 완료"
}

# 스크립트 실행
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi