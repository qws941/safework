#!/bin/bash

# SafeWork 모니터링 스크립트 스케줄링 설정

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITOR_SCRIPT="$SCRIPT_DIR/issue-tracker.sh"
INSTALL_SCRIPT="$SCRIPT_DIR/install.sh"
SERVICE_SCRIPT="$SCRIPT_DIR/daemon.sh"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SCHEDULE] $1"
}

# 스케줄링 설정
setup_cron() {
    log "⏰ Cron 스케줄링 설정 중..."
    
    # 기존 cron 설정 백업
    crontab -l > /tmp/crontab_backup_$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    
    # SafeWork 모니터링 cron 추가
    (crontab -l 2>/dev/null; echo "# SafeWork 자동 모니터링") | crontab -
    (crontab -l 2>/dev/null; echo "*/5 * * * * $MONITOR_SCRIPT >> /var/log/safework-monitor.log 2>&1") | crontab -
    (crontab -l 2>/dev/null; echo "0 */6 * * * $INSTALL_SCRIPT >> /var/log/safework-install.log 2>&1") | crontab -
    
    log "✅ Cron 스케줄링 설정 완료"
}

# systemd 서비스 설정
setup_systemd() {
    log "🔧 SystemD 서비스 설정 중..."
    
    # 서비스 파일이 있는지 확인
    if [[ -f "$SCRIPT_DIR/safework-monitor.service" ]]; then
        sudo cp "$SCRIPT_DIR/safework-monitor.service" /etc/systemd/system/
        sudo systemctl daemon-reload
        sudo systemctl enable safework-monitor
        sudo systemctl start safework-monitor
        log "✅ SystemD 서비스 설정 완료"
    else
        log "⚠️ SystemD 서비스 파일을 찾을 수 없습니다"
    fi
}

# 로그 rotation 설정
setup_logrotate() {
    log "📋 로그 rotation 설정 중..."
    
    cat << EOF | sudo tee /etc/logrotate.d/safework-monitor
/var/log/safework-monitor.log
/var/log/safework-install.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    create 644 $(whoami) $(whoami)
}
EOF
    
    log "✅ 로그 rotation 설정 완료"
}

# 권한 설정
setup_permissions() {
    log "🔐 스크립트 권한 설정 중..."
    
    chmod +x "$MONITOR_SCRIPT"
    chmod +x "$INSTALL_SCRIPT"
    chmod +x "$SERVICE_SCRIPT"
    
    # 로그 파일 생성
    sudo touch /var/log/safework-monitor.log
    sudo touch /var/log/safework-install.log
    sudo chown $(whoami):$(whoami) /var/log/safework-monitor.log
    sudo chown $(whoami):$(whoami) /var/log/safework-install.log
    
    log "✅ 권한 설정 완료"
}

# 상태 확인
check_status() {
    log "📊 모니터링 시스템 상태 확인..."
    
    echo "=== Cron Jobs ==="
    crontab -l | grep -E "safework|monitor" || echo "Cron 설정이 없습니다"
    echo
    
    echo "=== SystemD Service ==="
    if systemctl is-active --quiet safework-monitor; then
        echo "✅ safework-monitor 서비스가 실행 중입니다"
        systemctl status safework-monitor --no-pager -l
    else
        echo "❌ safework-monitor 서비스가 실행되지 않습니다"
    fi
    echo
    
    echo "=== Log Files ==="
    if [[ -f /var/log/safework-monitor.log ]]; then
        echo "Monitor Log (최근 5줄):"
        tail -5 /var/log/safework-monitor.log
    else
        echo "Monitor log 파일이 없습니다"
    fi
    echo
    
    echo "=== Docker Containers ==="
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "safework|blacklist|fortinet" || echo "SafeWork 컨테이너가 실행되지 않습니다"
}

# 메인 실행
main() {
    log "🚀 SafeWork 모니터링 스케줄링 설정 시작"
    
    setup_permissions
    setup_logrotate
    setup_cron
    setup_systemd
    
    echo
    check_status
    
    log "✅ SafeWork 모니터링 스케줄링 설정 완료"
    log "📊 모니터링이 5분마다 자동 실행됩니다"
    log "📋 로그 파일: /var/log/safework-monitor.log"
}

# 스크립트 실행
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi