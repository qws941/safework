#!/bin/bash

# 🤖 SafeWork 모니터링 데몬
# 5분마다 시스템 상태를 체크하고 문제 발생시 자동으로 GitHub 이슈 생성

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUTO_ISSUE_SCRIPT="$SCRIPT_DIR/auto-issue-creator.sh"
LOG_FILE="/var/log/safework-monitor.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [MONITOR-DAEMON] $1" | tee -a "$LOG_FILE"
}

# 데몬 시작
log "🚀 SafeWork 모니터링 데몬 시작"

# 무한 루프로 5분마다 모니터링
while true; do
    log "🔍 시스템 상태 검사 실행 중..."
    
    # 자동 이슈 생성 스크립트 실행
    if [[ -x "$AUTO_ISSUE_SCRIPT" ]]; then
        if "$AUTO_ISSUE_SCRIPT"; then
            log "✅ 모니터링 검사 완료"
        else
            log "❌ 모니터링 검사 실패"
        fi
    else
        log "❌ 자동 이슈 생성 스크립트를 찾을 수 없음: $AUTO_ISSUE_SCRIPT"
    fi
    
    log "😴 5분 대기 중..."
    sleep 300  # 5분 대기
done