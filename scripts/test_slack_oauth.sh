#!/bin/bash

# Slack OAuth 토큰 테스트 스크립트
# SafeWork Slack 알림 시스템 검증

set -euo pipefail

# 색상 출력
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Slack 토큰 검증 함수
test_slack_token() {
    local token="$1"
    local token_type="$2"

    log_info "Testing $token_type token: ${token:0:20}..."

    # Slack API auth.test 호출
    local response=$(curl -s -X POST "https://slack.com/api/auth.test" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" || echo '{"ok": false, "error": "network_error"}')

    local ok=$(echo "$response" | jq -r '.ok // false')
    local error=$(echo "$response" | jq -r '.error // "none"')
    local team=$(echo "$response" | jq -r '.team // "unknown"')
    local user=$(echo "$response" | jq -r '.user // "unknown"')

    if [ "$ok" = "true" ]; then
        log_info "✅ $token_type token is valid"
        log_info "   Team: $team"
        log_info "   User: $user"
        return 0
    else
        log_error "❌ $token_type token is invalid: $error"
        return 1
    fi
}

# 채널 목록 확인
test_channel_access() {
    local token="$1"
    local token_type="$2"

    log_info "Testing channel access with $token_type token..."

    local response=$(curl -s -X POST "https://slack.com/api/conversations.list" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d '{"types": "public_channel,private_channel"}' || echo '{"ok": false}')

    local ok=$(echo "$response" | jq -r '.ok // false')

    if [ "$ok" = "true" ]; then
        local channel_count=$(echo "$response" | jq -r '.channels | length')
        log_info "✅ Channel access successful - Found $channel_count channels"

        # 주요 채널 확인
        echo "$response" | jq -r '.channels[] | select(.name | contains("safework") or contains("general")) | "   - #\(.name) (\(.id))"' | head -5
    else
        local error=$(echo "$response" | jq -r '.error // "unknown"')
        log_warn "⚠️ Channel access limited: $error"
    fi
}

# 테스트 메시지 전송
send_test_message() {
    local token="$1"
    local token_type="$2"
    local channel="${3:-#general}"

    log_info "Sending test message to $channel with $token_type token..."

    local message="🔧 SafeWork Slack OAuth 테스트 메시지 ($(date '+%Y-%m-%d %H:%M:%S'))"

    local payload=$(cat <<EOF
{
    "channel": "$channel",
    "text": "$message",
    "username": "SafeWork Bot",
    "icon_emoji": ":hospital:"
}
EOF
)

    local response=$(curl -s -X POST "https://slack.com/api/chat.postMessage" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        -d "$payload" || echo '{"ok": false}')

    local ok=$(echo "$response" | jq -r '.ok // false')

    if [ "$ok" = "true" ]; then
        log_info "✅ Test message sent successfully to $channel"
        return 0
    else
        local error=$(echo "$response" | jq -r '.error // "unknown"')
        log_error "❌ Failed to send test message: $error"
        return 1
    fi
}

# 메인 실행
main() {
    log_header "Slack OAuth 토큰 테스트"

    # 환경변수에서 토큰 확인
    local oauth_token="${SLACK_OAUTH_TOKEN:-}"
    local bot_token="${SLACK_BOT_TOKEN:-}"
    local webhook_url="${SLACK_WEBHOOK_URL:-}"

    if [ -z "$oauth_token" ] && [ -z "$bot_token" ] && [ -z "$webhook_url" ]; then
        log_error "❌ Slack 토큰이 설정되지 않았습니다."
        echo ""
        echo "다음 환경변수 중 하나를 설정해주세요:"
        echo "  - SLACK_OAUTH_TOKEN=xoxp-your-oauth-token"
        echo "  - SLACK_BOT_TOKEN=xoxb-your-bot-token"
        echo "  - SLACK_WEBHOOK_URL=https://hooks.slack.com/..."
        echo ""
        echo "예시:"
        echo "  export SLACK_BOT_TOKEN=xoxb-123456789-abcdefghijk"
        echo "  $0"
        exit 1
    fi

    # Webhook URL 테스트
    if [ -n "$webhook_url" ]; then
        log_header "Webhook URL 테스트"
        log_info "Testing webhook: ${webhook_url:0:50}..."

        local webhook_response=$(curl -s -X POST "$webhook_url" \
            -H "Content-Type: application/json" \
            -d '{
                "text": "🔧 SafeWork Webhook 테스트 메시지 ('$(date '+%Y-%m-%d %H:%M:%S')')",
                "username": "SafeWork Bot",
                "icon_emoji": ":hospital:"
            }' || echo "error")

        if [ "$webhook_response" = "ok" ]; then
            log_info "✅ Webhook test successful"
        else
            log_error "❌ Webhook test failed: $webhook_response"
        fi
    fi

    # OAuth Token 테스트
    if [ -n "$oauth_token" ]; then
        log_header "OAuth Token 테스트"
        if test_slack_token "$oauth_token" "OAuth"; then
            test_channel_access "$oauth_token" "OAuth"
            send_test_message "$oauth_token" "OAuth" "#general"
        fi
    fi

    # Bot Token 테스트
    if [ -n "$bot_token" ]; then
        log_header "Bot Token 테스트"
        if test_slack_token "$bot_token" "Bot"; then
            test_channel_access "$bot_token" "Bot"
            send_test_message "$bot_token" "Bot" "#general"
        fi
    fi

    log_header "테스트 완료"
    log_info "SafeWork 컨테이너에서 Slack 알림을 테스트하려면:"
    echo "docker exec safework-app python -c \"from utils.slack_notifications import test_slack_integration; test_slack_integration()\""
}

# 스크립트 실행
main "$@"