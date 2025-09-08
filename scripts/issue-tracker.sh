#!/bin/bash

# SafeWork 이슈 추적기
# 시스템 에러를 GitHub 이슈로 등록

set -e

LOG_FILE="/tmp/safework-monitor.log"
ISSUE_CACHE="/tmp/issued-problems.cache"

# 로그 함수
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [TRACKER] $1" | tee -a "$LOG_FILE"
}

# GitHub 이슈 생성 함수
create_issue() {
    local title="$1"
    local body="$2"
    local labels="$3"
    local priority="$4"
    
    # 중복 방지 - 같은 문제로 24시간 내 이슈 생성했는지 확인
    local hash=$(echo "$title" | sha256sum | cut -d' ' -f1)
    local cache_file="$ISSUE_CACHE.$hash"
    
    if [[ -f "$cache_file" && $(($(date +%s) - $(stat -c %Y "$cache_file"))) -lt 86400 ]]; then
        log "🔄 중복 방지: 같은 문제로 24시간 내 이슈 이미 생성됨"
        return 0
    fi
    
    log "🎯 GitHub 이슈 생성 중: $title"
    
    # Claude Code가 처리할 수 있도록 특별한 형식으로 이슈 생성
    local issue_body="## 🤖 자동 감지된 문제

**우선순위**: $priority
**감지 시간**: $(date '+%Y-%m-%d %H:%M:%S KST')
**시스템**: SafeWork 산업안전보건 관리시스템

### 📋 문제 상세
$body

### 🔧 Claude 처리 요청
@claude 이 문제를 자동으로 분석하고 해결해주세요.

**요청 사항**:
1. 로그 분석 및 원인 파악
2. 자동 수정 가능한 경우 즉시 수정
3. 수동 개입 필요시 상세한 해결 가이드 제공
4. 재발 방지 대책 수립

### 🏷️ 자동 태그
- 자동 감지된 문제
- 운영 환경 이슈  
- Claude 자동 처리 대상

---
*🤖 이 이슈는 SafeWork 자동 모니터링 시스템에 의해 생성되었습니다.*"

    # 이슈 생성 (에러 발생해도 계속 진행)
    log "🔍 이슈 생성 시도: gh issue create --title '🚨 [AUTO] $title' --label '$labels'"
    
    if gh issue create \
        --title "🚨 [AUTO] $title" \
        --body "$issue_body" \
        --label "$labels"; then
        
        touch "$cache_file"
        log "✅ 이슈 생성 완료: $title"
        
        # Slack/Discord 알림 (옵션)
        if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"🚨 SafeWork 자동 이슈 생성: $title\"}" \
                "$SLACK_WEBHOOK_URL" 2>/dev/null || true
        fi
    else
        log "❌ 이슈 생성 실패: $title"
    fi
}

# Docker 상태 검사
check_docker_errors() {
    log "🐳 Docker 컨테이너 에러 검사 중..."
    
    # 비정상 종료된 컨테이너 검사
    local failed_containers=$(docker ps -a --filter "status=exited" --filter "status=dead" --format "{{.Names}}" | grep -E "safework|blacklist|fortinet" || true)
    
    if [[ -n "$failed_containers" ]]; then
        local container_list=$(echo "$failed_containers" | tr '\n' ', ' | sed 's/,$//')
        local logs=""
        
        for container in $failed_containers; do
            logs="$logs\n\n**$container 로그:**\n\`\`\`\n$(docker logs "$container" --tail 20 2>&1)\n\`\`\`"
        done
        
        create_issue \
            "Docker 컨테이너 실행 실패: $container_list" \
            "다음 컨테이너들이 비정상 종료되었습니다:\n- $container_list\n\n**에러 로그:**$logs" \
            "bug,🚨 긴급,claude-ready" \
            "P0-CRITICAL"
    fi
    
    # 메모리 부족 또는 리소스 문제 검사
    for container in $(docker ps --format "{{.Names}}" | grep -E "safework|blacklist|fortinet"); do
        local memory_usage=$(docker stats "$container" --no-stream --format "{{.MemPerc}}" | sed 's/%//' 2>/dev/null || echo "0")
        if [[ -n "$memory_usage" && "$memory_usage" != "0" ]] && (( $(echo "$memory_usage > 90" | bc 2>/dev/null || echo 0) )); then
            create_issue \
                "컨테이너 메모리 사용률 경고: $container" \
                "**컨테이너**: $container\n**메모리 사용률**: ${memory_usage}%\n\n메모리 사용률이 90%를 초과했습니다. 성능 저하 및 OOM Kill 위험이 있습니다." \
                "performance,claude-ready" \
                "P1-HIGH"
        fi
    done
}

# CI/CD 상태 검사
check_cicd_failures() {
    log "⚙️ CI/CD 실패 검사 중..."
    
    # 최근 실패한 워크플로 검사
    local failed_runs=$(gh run list --limit 10 --json conclusion,workflowName,url,headBranch,createdAt \
        --jq '.[] | select(.conclusion == "failure") | "\(.workflowName)|\(.url)|\(.headBranch)|\(.createdAt)"')
    
    if [[ -n "$failed_runs" ]]; then
        while IFS='|' read -r workflow_name url branch created_at; do
            # 1시간 내 실패만 처리
            local created_timestamp=$(date -d "$created_at" +%s 2>/dev/null || echo 0)
            local current_timestamp=$(date +%s)
            local time_diff=$((current_timestamp - created_timestamp))
            
            if [[ $time_diff -lt 3600 ]]; then
                # 워크플로 실패 로그 가져오기
                local run_id=$(echo "$url" | grep -o '[0-9]*$')
                local failure_log=$(gh run view "$run_id" --log 2>/dev/null | tail -20 || echo "로그 조회 실패")
                
                create_issue \
                    "CI/CD 파이프라인 실패: $workflow_name" \
                    "**워크플로**: $workflow_name\n**브랜치**: $branch\n**실패 시간**: $created_at\n**URL**: $url\n\n**실패 로그 (최근 20줄):**\n\`\`\`\n$failure_log\n\`\`\`" \
                    "bug,P0-urgent,claude-ready" \
                    "P1-HIGH"
            fi
        done <<< "$failed_runs"
    fi
}

# 애플리케이션 로그 검사
check_app_errors() {
    log "📱 애플리케이션 에러 로그 검사 중..."
    
    # SafeWork 앱 에러 로그 검사
    local app_errors=$(docker logs safework-app --since 1h 2>&1 | grep -i -E "error|exception|traceback|failed" | tail -10 || true)
    
    if [[ -n "$app_errors" ]]; then
        create_issue \
            "SafeWork 애플리케이션 런타임 에러 감지" \
            "최근 1시간 내 SafeWork 애플리케이션에서 에러가 감지되었습니다.\n\n**에러 로그:**\n\`\`\`\n$app_errors\n\`\`\`" \
            "bug,runtime-error,claude-ready" \
            "P2-MEDIUM"
    fi
    
    # 데이터베이스 연결 에러 검사
    local db_errors=$(docker logs safework-mysql --since 30m 2>&1 | grep -i -E "error|failed|denied|timeout" | tail -5 || true)
    
    if [[ -n "$db_errors" ]]; then
        create_issue \
            "MySQL 데이터베이스 에러 감지" \
            "SafeWork MySQL 데이터베이스에서 에러가 감지되었습니다.\n\n**DB 에러 로그:**\n\`\`\`\n$db_errors\n\`\`\`" \
            "database,bug,urgent,claude-ready" \
            "P1-HIGH"
    fi
    
    # Redis 캐시 에러 검사
    local redis_errors=$(docker logs safework-redis --since 30m 2>&1 | grep -i -E "error|failed|timeout|connection.*lost" | tail -5 || true)
    
    if [[ -n "$redis_errors" ]]; then
        create_issue \
            "Redis 캐시 시스템 에러 감지" \
            "SafeWork Redis 캐시에서 에러가 감지되었습니다.\n\n**Redis 에러 로그:**\n\`\`\`\n$redis_errors\n\`\`\`" \
            "cache,bug,performance,claude-ready" \
            "P2-MEDIUM"
    fi
    
    # Redis 메모리 사용량 검사
    if docker ps --format "{{.Names}}" | grep -q "safework-redis"; then
        local redis_memory=$(docker exec safework-redis redis-cli info memory 2>/dev/null | grep used_memory_human || echo "")
        if [[ -n "$redis_memory" ]]; then
            local memory_mb=$(echo "$redis_memory" | grep -o '[0-9]\+' | head -1)
            if [[ -n "$memory_mb" && $memory_mb -gt 500 ]]; then  # 500MB 초과시
                create_issue \
                    "Redis 메모리 사용량 경고" \
                    "Redis 캐시 메모리 사용량이 ${memory_mb}MB를 넘었습니다.\n\n캐시 최적화가 필요합니다." \
                    "cache,performance,claude-ready" \
                    "P2-MEDIUM"
            fi
        fi
    fi
}

# 보안 상태 검사
check_security_issues() {
    log "🔐 보안 문제 검사 중..."
    
    # 비정상적인 접근 시도 검사 (nginx 로그가 있다면)
    if docker ps --format "{{.Names}}" | grep -q nginx; then
        local suspicious_access=$(docker logs nginx --since 30m 2>&1 | grep -E " 40[1-4] | 50[0-5] " | wc -l || echo 0)
        
        if [[ $suspicious_access -gt 50 ]]; then
            create_issue \
                "비정상적인 HTTP 접근 시도 급증" \
                "최근 30분간 HTTP 4xx/5xx 에러가 $suspicious_access 회 발생했습니다.\n\nDDoS 공격이나 보안 위협 가능성을 검토해주세요." \
                "security,warning,claude-ready" \
                "P1-HIGH"
        fi
    fi
}

# Docker 이미지 검사
check_image_issues() {
    log "🖼️ 운영 이미지 문제 검사 중..."
    
    # 이미지 크기 비정상 증가 검사
    local large_images=$(docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep -E "safework|blacklist|fortinet" | awk '$2 ~ /GB/ && $2+0 > 2 {print $1}' || true)
    
    if [[ -n "$large_images" ]]; then
        create_issue \
            "Docker 이미지 크기 비정상 증가" \
            "다음 이미지들이 2GB를 초과했습니다:\n$large_images\n\n이미지 최적화가 필요합니다." \
            "docker,performance,claude-ready" \
            "P2-MEDIUM"
    fi
    
    # 사용하지 않는 이미지 정리 필요 검사
    local dangling_images=$(docker images -f "dangling=true" -q | wc -l)
    
    if [[ $dangling_images -gt 10 ]]; then
        create_issue \
            "Docker dangling 이미지 정리 필요" \
            "사용하지 않는 Docker 이미지가 ${dangling_images}개 있습니다.\n\n디스크 공간 절약을 위해 정리가 필요합니다.\n\n**정리 명령어**: \`docker image prune -f\`" \
            "maintenance,docker,claude-ready" \
            "P3-LOW"
    fi
}

# 시스템 리소스 검사
check_system_resources() {
    log "📊 시스템 리소스 모니터링 중..."
    
    # 디스크 사용량 검사 (80% 이상)
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 80 ]]; then
        create_issue \
            "디스크 공간 부족 경고" \
            "루트 파티션 디스크 사용률이 ${disk_usage}%입니다.\\n\\n**현재 상태:**\\n$(df -h /)\\n\\n**권장 조치:**\\n1. 임시 파일 정리\\n2. Docker 이미지 정리\\n3. 로그 파일 rotation 확인" \
            "system,storage,claude-ready" \
            "P1-HIGH"
    fi
    
    # 메모리 사용량 검사 (85% 이상)
    local memory_info=$(free | grep Mem)
    local total_memory=$(echo $memory_info | awk '{print $2}')
    local used_memory=$(echo $memory_info | awk '{print $3}')
    local memory_usage=$((used_memory * 100 / total_memory))
    
    if [[ $memory_usage -gt 85 ]]; then
        create_issue \
            "메모리 사용량 경고" \
            "시스템 메모리 사용률이 ${memory_usage}%입니다.\\n\\n**메모리 상태:**\\n$(free -h)\\n\\n**프로세스 메모리 사용률 Top 10:**\\n$(ps aux --sort=-%mem | head -11)" \
            "system,memory,claude-ready" \
            "P1-HIGH"
    fi
    
    # CPU 부하 검사 (1분 평균 로드가 CPU 코어 수의 2배 이상)
    local cpu_cores=$(nproc)
    local load_1min=$(uptime | awk -F'load average:' '{print $2}' | awk -F',' '{print $1}' | tr -d ' ')
    local load_threshold=$((cpu_cores * 2))
    
    if (( $(echo "$load_1min > $load_threshold" | bc 2>/dev/null || echo 0) )); then
        create_issue \
            "CPU 부하 경고" \
            "1분 평균 CPU 로드가 ${load_1min}입니다 (임계값: $load_threshold).\\n\\n**시스템 상태:**\\n$(uptime)\\n\\n**CPU 사용률 Top 10 프로세스:**\\n$(ps aux --sort=-%cpu | head -11)" \
            "system,cpu,performance,claude-ready" \
            "P1-HIGH"
    fi
    
    # 스왑 사용량 검사 (50% 이상)
    local swap_info=$(free | grep Swap)
    local total_swap=$(echo $swap_info | awk '{print $2}')
    if [[ $total_swap -gt 0 ]]; then
        local used_swap=$(echo $swap_info | awk '{print $3}')
        local swap_usage=$((used_swap * 100 / total_swap))
        
        if [[ $swap_usage -gt 50 ]]; then
            create_issue \
                "스왑 메모리 사용량 경고" \
                "스왑 메모리 사용률이 ${swap_usage}%입니다.\\n\\n**메모리 상태:**\\n$(free -h)\\n\\n시스템 성능 저하가 예상됩니다." \
                "system,memory,performance,claude-ready" \
                "P2-MEDIUM"
        fi
    fi
    
    # inode 사용량 검사 (85% 이상)
    local inode_usage=$(df -i / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ $inode_usage -gt 85 ]]; then
        create_issue \
            "inode 부족 경고" \
            "루트 파티션 inode 사용률이 ${inode_usage}%입니다.\\n\\n**현재 상태:**\\n$(df -i /)\\n\\n파일 생성이 불가능해질 수 있습니다." \
            "system,filesystem,claude-ready" \
            "P1-HIGH"
    fi
    
    # 네트워크 연결 상태 검사 (Docker 컨테이너 간 통신)
    if ! docker exec safework-app ping -c 2 safework-mysql >/dev/null 2>&1; then
        create_issue \
            "컨테이너 간 네트워크 연결 실패" \
            "SafeWork App에서 MySQL 컨테이너로 네트워크 연결에 실패했습니다.\\n\\n**네트워크 상태 점검이 필요합니다.**" \
            "network,docker,bug,claude-ready" \
            "P0-CRITICAL"
    fi
    
    if ! docker exec safework-app ping -c 2 safework-redis >/dev/null 2>&1; then
        create_issue \
            "컨테이너 간 네트워크 연결 실패" \
            "SafeWork App에서 Redis 컨테이너로 네트워크 연결에 실패했습니다.\\n\\n**캐시 서비스 장애 위험이 있습니다.**" \
            "network,docker,cache,claude-ready" \
            "P1-HIGH"
    fi
}

# 메인 실행
main() {
    log "🚀 SafeWork 이슈 추적 시작"
    
    # GitHub CLI 인증 확인
    if ! gh auth status >/dev/null 2>&1; then
        log "❌ GitHub CLI 인증 필요"
        exit 1
    fi
    
    # 캐시 디렉토리 생성
    mkdir -p "$(dirname "$ISSUE_CACHE")"
    
    # 각종 검사 실행
    check_docker_errors
    check_cicd_failures
    check_app_errors
    check_security_issues  
    check_image_issues
    check_system_resources
    
    log "✅ 이슈 추적 완료"
}

# 스크립트 실행
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi