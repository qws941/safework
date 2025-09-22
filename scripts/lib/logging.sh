#!/bin/bash
# SafeWork 공통 로깅 라이브러리
# Common Logging Library for SafeWork Scripts

# 색상 정의 (중복 선언 방지)
if [[ -z "${RED:-}" ]]; then
    declare -r RED='\033[0;31m'
    declare -r GREEN='\033[0;32m'
    declare -r YELLOW='\033[1;33m'
    declare -r BLUE='\033[0;34m'
    declare -r CYAN='\033[0;36m'
    declare -r NC='\033[0m' # No Color
fi

# 로그 레벨 정의 (중복 선언 방지)
if [[ -z "${LOG_LEVEL_DEBUG:-}" ]]; then
    declare -r LOG_LEVEL_DEBUG=0
    declare -r LOG_LEVEL_INFO=1
    declare -r LOG_LEVEL_WARN=2
    declare -r LOG_LEVEL_ERROR=3
    declare -r LOG_LEVEL_CRITICAL=4
fi

# 기본 로그 레벨 (환경변수로 오버라이드 가능)
declare -g CURRENT_LOG_LEVEL=${LOG_LEVEL:-$LOG_LEVEL_INFO}

# 로그 파일 설정 (각 스크립트에서 오버라이드 가능)
declare -g LOG_FILE="${LOG_FILE:-}"

# 공통 로그 함수
log() {
    local level="$1"
    local message="$2"
    local color="$3"
    local timestamp="[$(date '+%Y-%m-%d %H:%M:%S')]"
    local log_entry="${timestamp} ${level}: ${message}"

    # 콘솔 출력 (색상 포함)
    echo -e "${color}${log_entry}${NC}"

    # 파일 출력 (색상 제외)
    if [[ -n "$LOG_FILE" ]]; then
        echo "$log_entry" >> "$LOG_FILE"
    fi
}

# 개별 로그 레벨 함수들
log_debug() {
    [[ $CURRENT_LOG_LEVEL -le $LOG_LEVEL_DEBUG ]] && log "DEBUG" "$1" "$CYAN"
}

log_info() {
    [[ $CURRENT_LOG_LEVEL -le $LOG_LEVEL_INFO ]] && log "INFO" "$1" "$NC"
}

log_warning() {
    [[ $CURRENT_LOG_LEVEL -le $LOG_LEVEL_WARN ]] && log "⚠️  WARNING" "$1" "$YELLOW"
}

log_error() {
    [[ $CURRENT_LOG_LEVEL -le $LOG_LEVEL_ERROR ]] && log "❌ ERROR" "$1" "$RED" >&2
}

log_success() {
    [[ $CURRENT_LOG_LEVEL -le $LOG_LEVEL_INFO ]] && log "✅ SUCCESS" "$1" "$GREEN"
}

log_critical() {
    [[ $CURRENT_LOG_LEVEL -le $LOG_LEVEL_CRITICAL ]] && log "🚨 CRITICAL" "$1" "$RED" >&2
}

# 로그 레벨 설정 함수
set_log_level() {
    case "$1" in
        "DEBUG"|"debug") CURRENT_LOG_LEVEL=$LOG_LEVEL_DEBUG ;;
        "INFO"|"info") CURRENT_LOG_LEVEL=$LOG_LEVEL_INFO ;;
        "WARN"|"warn"|"WARNING"|"warning") CURRENT_LOG_LEVEL=$LOG_LEVEL_WARN ;;
        "ERROR"|"error") CURRENT_LOG_LEVEL=$LOG_LEVEL_ERROR ;;
        "CRITICAL"|"critical") CURRENT_LOG_LEVEL=$LOG_LEVEL_CRITICAL ;;
        *) log_error "Unknown log level: $1" ;;
    esac
}

# 로그 파일 설정 함수
set_log_file() {
    LOG_FILE="$1"
    # 로그 디렉토리 생성
    local log_dir="$(dirname "$LOG_FILE")"
    [[ ! -d "$log_dir" ]] && mkdir -p "$log_dir"
}

# 헤더 출력 함수
show_header() {
    local title="$1"
    local width=${2:-50}

    echo -e "\n${BLUE}$(printf '=%.0s' $(seq 1 $width))${NC}"
    echo -e "${BLUE}$(printf '%*s' $(((${#title} + $width) / 2)) "$title")${NC}"
    echo -e "${BLUE}$(printf '=%.0s' $(seq 1 $width))${NC}\n"
}

# 진행률 표시 함수
show_progress() {
    local current="$1"
    local total="$2"
    local message="${3:-Processing}"
    local width=50

    local progress=$((current * width / total))
    local remaining=$((width - progress))

    printf "\r${message}: ["
    printf "%*s" $progress | tr ' ' '='
    printf "%*s" $remaining | tr ' ' '-'
    printf "] %d/%d (%d%%)" $current $total $((current * 100 / total))

    [[ $current -eq $total ]] && echo ""
}

# 스크립트 사용 예시 함수
logging_usage_example() {
    echo "SafeWork 로깅 라이브러리 사용법:"
    echo "source \"\$(dirname \"\${BASH_SOURCE[0]}\")/lib/logging.sh\""
    echo ""
    echo "# 로그 파일 설정 (선택사항)"
    echo "set_log_file \"/path/to/logfile.log\""
    echo ""
    echo "# 로그 레벨 설정 (선택사항)"
    echo "set_log_level \"INFO\""
    echo ""
    echo "# 로그 출력"
    echo "log_info \"정보 메시지\""
    echo "log_warning \"경고 메시지\""
    echo "log_error \"오류 메시지\""
    echo "log_success \"성공 메시지\""
    echo "log_critical \"중요 메시지\""
}