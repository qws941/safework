#!/bin/bash
# SafeWork 통합 자동화 관리 시스템
# 모든 자동화 스크립트를 통합 관리하는 중앙 제어 시스템

set -euo pipefail

# 환경 설정 로드
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.env"

# ===== 통합 자동화 설정 =====
AUTOMATION_ENABLED=${AUTOMATION_ENABLED:-true}
AUTOMATION_LOG_DIR="$SCRIPT_DIR/../logs"
mkdir -p "$AUTOMATION_LOG_DIR"
AUTOMATION_LOG="$AUTOMATION_LOG_DIR/unified-automation-$(date +%Y%m%d-%H%M%S).log"

# 개별 자동화 스크립트 경로
AUTO_DEPLOY_SCRIPT="$SCRIPT_DIR/auto-deploy-manager.sh"
MONITORING_SCRIPT="$SCRIPT_DIR/monitoring-automation.sh"
TESTING_SCRIPT="$SCRIPT_DIR/automated-testing-pipeline.sh"
BACKUP_SCRIPT="$SCRIPT_DIR/automated-backup-recovery.sh"

# 로깅 함수
log_unified() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$AUTOMATION_LOG"
}

log_info_unified() { log_unified "INFO" "$@"; }
log_success_unified() { log_unified "SUCCESS" "$@"; }
log_warning_unified() { log_unified "WARNING" "$@"; }
log_error_unified() { log_unified "ERROR" "$@"; }

# ===== 시스템 상태 확인 =====
check_system_health() {
    log_info_unified "전체 시스템 상태 확인 중..."

    local health_score=0
    local max_score=100

    # 1. 서비스 상태 확인 (25점)
    local health_response=$(curl -s -w "\n%{http_code}" "https://safework.jclee.me/health" || echo "connection_failed\n000")
    local http_code=$(echo "$health_response" | tail -n1)

    if [ "$http_code" = "200" ]; then
        local status=$(echo "$health_response" | head -n -1 | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
        if [ "$status" = "healthy" ]; then
            health_score=$((health_score + 25))
            log_success_unified "✅ 서비스 상태: 정상 (+25점)"
        else
            log_warning_unified "⚠️ 서비스 상태: $status (+10점)"
            health_score=$((health_score + 10))
        fi
    else
        log_error_unified "❌ 서비스 상태: 응답 없음 (HTTP: $http_code) (+0점)"
    fi

    # 2. 데이터베이스 연결 확인 (25점)
    if docker exec safework-postgres pg_isready -U safework >/dev/null 2>&1; then
        health_score=$((health_score + 25))
        log_success_unified "✅ 데이터베이스: 정상 (+25점)"
    else
        log_error_unified "❌ 데이터베이스: 연결 실패 (+0점)"
    fi

    # 3. 컨테이너 상태 확인 (25점)
    local running_containers=$(docker ps --filter "name=safework-" --format "{{.Names}}" | wc -l)
    if [ "$running_containers" -ge 3 ]; then
        health_score=$((health_score + 25))
        log_success_unified "✅ 컨테이너: $running_containers개 실행 중 (+25점)"
    elif [ "$running_containers" -ge 1 ]; then
        health_score=$((health_score + 15))
        log_warning_unified "⚠️ 컨테이너: $running_containers개 실행 중 (+15점)"
    else
        log_error_unified "❌ 컨테이너: 실행 중인 컨테이너 없음 (+0점)"
    fi

    # 4. 디스크 공간 확인 (25점)
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 80 ]; then
        health_score=$((health_score + 25))
        log_success_unified "✅ 디스크 공간: ${disk_usage}% 사용 (+25점)"
    elif [ "$disk_usage" -lt 90 ]; then
        health_score=$((health_score + 15))
        log_warning_unified "⚠️ 디스크 공간: ${disk_usage}% 사용 (+15점)"
    else
        health_score=$((health_score + 5))
        log_error_unified "❌ 디스크 공간: ${disk_usage}% 사용 - 위험 (+5점)"
    fi

    echo "$health_score"
}

# ===== 자동화 스크립트 상태 확인 =====
check_automation_scripts() {
    log_info_unified "자동화 스크립트 상태 확인..."

    local scripts_status=0
    local total_scripts=4

    # 배포 자동화 스크립트
    if [ -x "$AUTO_DEPLOY_SCRIPT" ]; then
        scripts_status=$((scripts_status + 1))
        log_success_unified "✅ 배포 자동화: 사용 가능"
    else
        log_error_unified "❌ 배포 자동화: 사용 불가"
    fi

    # 모니터링 자동화 스크립트
    if [ -x "$MONITORING_SCRIPT" ]; then
        scripts_status=$((scripts_status + 1))
        log_success_unified "✅ 모니터링 자동화: 사용 가능"
    else
        log_error_unified "❌ 모니터링 자동화: 사용 불가"
    fi

    # 테스팅 자동화 스크립트
    if [ -x "$TESTING_SCRIPT" ]; then
        scripts_status=$((scripts_status + 1))
        log_success_unified "✅ 테스팅 자동화: 사용 가능"
    else
        log_error_unified "❌ 테스팅 자동화: 사용 불가"
    fi

    # 백업 자동화 스크립트
    if [ -x "$BACKUP_SCRIPT" ]; then
        scripts_status=$((scripts_status + 1))
        log_success_unified "✅ 백업 자동화: 사용 가능"
    else
        log_error_unified "❌ 백업 자동화: 사용 불가"
    fi

    echo "$scripts_status/$total_scripts"
}

# ===== 통합 자동화 실행 =====
run_full_automation() {
    log_info_unified "=== SafeWork 통합 자동화 시작 ==="
    log_info_unified "자동화 로그: $AUTOMATION_LOG"

    local automation_start_time=$(date +%s)
    local total_operations=4
    local successful_operations=0

    # 1. 배포 자동화
    log_info_unified "1/4: 자동 배포 실행 중..."
    if "$AUTO_DEPLOY_SCRIPT" auto; then
        successful_operations=$((successful_operations + 1))
        log_success_unified "✅ 자동 배포 완료"
    else
        log_error_unified "❌ 자동 배포 실패"
    fi

    # 2. 테스팅 자동화
    log_info_unified "2/4: 자동 테스트 실행 중..."
    if "$TESTING_SCRIPT" comprehensive; then
        successful_operations=$((successful_operations + 1))
        log_success_unified "✅ 자동 테스트 완료"
    else
        log_error_unified "❌ 자동 테스트 실패"
    fi

    # 3. 백업 자동화
    log_info_unified "3/4: 자동 백업 실행 중..."
    if "$BACKUP_SCRIPT" full; then
        successful_operations=$((successful_operations + 1))
        log_success_unified "✅ 자동 백업 완료"
    else
        log_error_unified "❌ 자동 백업 실패"
    fi

    # 4. 모니터링 시작
    log_info_unified "4/4: 모니터링 시스템 확인 중..."
    if "$MONITORING_SCRIPT" health; then
        successful_operations=$((successful_operations + 1))
        log_success_unified "✅ 모니터링 시스템 정상"
    else
        log_error_unified "❌ 모니터링 시스템 문제"
    fi

    local automation_end_time=$(date +%s)
    local automation_duration=$((automation_end_time - automation_start_time))
    local success_rate=$(echo "scale=1; ($successful_operations * 100) / $total_operations" | bc)

    log_info_unified "=== 통합 자동화 완료 ==="
    log_info_unified "성공률: $successful_operations/$total_operations (${success_rate}%)"
    log_info_unified "소요 시간: ${automation_duration}초"
    log_info_unified "로그 파일: $AUTOMATION_LOG"

    if [ "$successful_operations" -eq "$total_operations" ]; then
        log_success_unified "🎉 모든 자동화 작업 성공!"
        return 0
    else
        log_warning_unified "⚠️ 일부 자동화 작업 실패"
        return 1
    fi
}

# ===== 스케줄된 자동화 =====
schedule_automation() {
    local schedule_type=${1:-"daily"}

    log_info_unified "스케줄된 자동화 설정: $schedule_type"

    case $schedule_type in
        "hourly")
            log_info_unified "매시간 자동화 스케줄 설정 중..."
            # crontab 설정: 매시간 실행
            (crontab -l 2>/dev/null; echo "0 * * * * $SCRIPT_DIR/unified-automation-manager.sh quick") | crontab -
            log_success_unified "매시간 자동화 스케줄 설정 완료"
            ;;
        "daily")
            log_info_unified "일일 자동화 스케줄 설정 중..."
            # crontab 설정: 매일 새벽 2시 실행
            (crontab -l 2>/dev/null; echo "0 2 * * * $SCRIPT_DIR/unified-automation-manager.sh full") | crontab -
            log_success_unified "일일 자동화 스케줄 설정 완료"
            ;;
        "weekly")
            log_info_unified "주간 자동화 스케줄 설정 중..."
            # crontab 설정: 매주 일요일 새벽 3시 실행
            (crontab -l 2>/dev/null; echo "0 3 * * 0 $SCRIPT_DIR/unified-automation-manager.sh full") | crontab -
            log_success_unified "주간 자동화 스케줄 설정 완료"
            ;;
        *)
            log_error_unified "지원되지 않는 스케줄 타입: $schedule_type"
            return 1
            ;;
    esac
}

# ===== 빠른 자동화 (핵심 기능만) =====
run_quick_automation() {
    log_info_unified "=== SafeWork 빠른 자동화 시작 ==="

    local quick_operations=0
    local total_quick_operations=2

    # 1. 헬스 체크
    log_info_unified "1/2: 시스템 헬스 체크..."
    if "$MONITORING_SCRIPT" health >/dev/null 2>&1; then
        quick_operations=$((quick_operations + 1))
        log_success_unified "✅ 시스템 정상"
    else
        log_warning_unified "⚠️ 시스템 상태 확인 필요"
    fi

    # 2. 백업 상태 확인
    log_info_unified "2/2: 백업 상태 확인..."
    if "$BACKUP_SCRIPT" status >/dev/null 2>&1; then
        quick_operations=$((quick_operations + 1))
        log_success_unified "✅ 백업 시스템 정상"
    else
        log_warning_unified "⚠️ 백업 시스템 확인 필요"
    fi

    local quick_success_rate=$(echo "scale=1; ($quick_operations * 100) / $total_quick_operations" | bc)
    log_info_unified "빠른 자동화 완료 - 성공률: $quick_operations/$total_quick_operations (${quick_success_rate}%)"

    return 0
}

# ===== 대시보드 표시 =====
show_dashboard() {
    clear
    echo "=== SafeWork 통합 자동화 대시보드 ==="
    echo "업데이트 시간: $(date '+%Y-%m-%d %H:%M:%S KST')"
    echo

    # 시스템 상태
    echo "🏥 시스템 건강 상태:"
    local health_score=$(check_system_health)
    echo "  전체 점수: $health_score/100"

    if [ "$health_score" -ge 90 ]; then
        echo "  상태: 🟢 우수"
    elif [ "$health_score" -ge 70 ]; then
        echo "  상태: 🟡 양호"
    elif [ "$health_score" -ge 50 ]; then
        echo "  상태: 🟠 주의"
    else
        echo "  상태: 🔴 위험"
    fi
    echo

    # 자동화 스크립트 상태
    echo "🤖 자동화 시스템:"
    local scripts_status=$(check_automation_scripts)
    echo "  사용 가능한 스크립트: $scripts_status"
    echo

    # 최근 로그
    echo "📋 최근 활동:"
    if [ -f "$AUTOMATION_LOG" ]; then
        tail -n 5 "$AUTOMATION_LOG" | while read line; do
            echo "  $line"
        done
    else
        echo "  로그 파일 없음"
    fi
    echo

    # 스케줄 정보
    echo "⏰ 스케줄된 작업:"
    crontab -l 2>/dev/null | grep "unified-automation-manager.sh" || echo "  설정된 스케줄 없음"
    echo
}

# ===== 실시간 모니터링 =====
real_time_monitoring() {
    log_info_unified "실시간 모니터링 시작..."

    while true; do
        show_dashboard
        echo "실시간 모니터링 중... (Ctrl+C로 종료)"
        sleep 30
    done
}

# ===== 메인 실행 로직 =====
main() {
    case "${1:-help}" in
        "full"|"complete")
            run_full_automation
            ;;
        "quick"|"fast")
            run_quick_automation
            ;;
        "deploy")
            log_info_unified "배포 자동화 실행..."
            "$AUTO_DEPLOY_SCRIPT" auto
            ;;
        "monitor")
            log_info_unified "모니터링 시스템 실행..."
            "$MONITORING_SCRIPT" dashboard
            ;;
        "test")
            log_info_unified "테스팅 자동화 실행..."
            "$TESTING_SCRIPT" comprehensive
            ;;
        "backup")
            log_info_unified "백업 자동화 실행..."
            "$BACKUP_SCRIPT" full
            ;;
        "dashboard")
            show_dashboard
            ;;
        "watch"|"realtime")
            real_time_monitoring
            ;;
        "schedule")
            schedule_automation "${2:-daily}"
            ;;
        "health"|"status")
            echo "시스템 상태: $(check_system_health)/100"
            echo "자동화 스크립트: $(check_automation_scripts)"
            ;;
        "help"|*)
            cat << EOF

SafeWork 통합 자동화 관리 시스템

사용법: $0 [COMMAND] [OPTIONS]

통합 명령어:
  full, complete         전체 자동화 실행 (배포+테스트+백업+모니터링)
  quick, fast           빠른 자동화 (헬스체크+백업상태)
  dashboard             실시간 대시보드 표시
  watch, realtime       실시간 모니터링 (30초 간격)

개별 자동화:
  deploy                배포 자동화만 실행
  monitor               모니터링 시스템 실행
  test                  테스팅 자동화만 실행
  backup                백업 자동화만 실행

스케줄링:
  schedule [TYPE]       자동화 스케줄 설정 (hourly/daily/weekly)

상태 확인:
  health, status        시스템 및 자동화 상태 확인

설정:
  AUTOMATION_ENABLED=$AUTOMATION_ENABLED

자동화 구성 요소:
  ✅ 배포 자동화: $AUTO_DEPLOY_SCRIPT
  ✅ 모니터링 자동화: $MONITORING_SCRIPT
  ✅ 테스팅 자동화: $TESTING_SCRIPT
  ✅ 백업 자동화: $BACKUP_SCRIPT

예제:
  $0 full                    # 전체 자동화 실행
  $0 quick                   # 빠른 시스템 체크
  $0 dashboard               # 대시보드 표시
  $0 schedule daily          # 매일 자동화 스케줄 설정
  $0 watch                   # 실시간 모니터링

로그: $AUTOMATION_LOG

EOF
            ;;
    esac
}

# 스크립트 실행
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi