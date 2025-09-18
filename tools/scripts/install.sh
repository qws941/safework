#!/bin/bash

# SafeWork 자동 모니터링 서비스 설치 스크립트

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="safework-monitor"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "🚀 SafeWork 자동 트러블슈팅 모니터링 서비스 설치 중..."

# 1. systemd 서비스 파일 복사
echo "📄 systemd 서비스 파일 설치 중..."
sudo cp "$SCRIPT_DIR/safework-monitor.service" "$SERVICE_FILE"

# 2. 서비스 파일 권한 설정
sudo chmod 644 "$SERVICE_FILE"

# 3. systemd 리로드
echo "🔄 systemd 리로드 중..."
sudo systemctl daemon-reload

# 4. 서비스 활성화 (부팅 시 자동 시작)
echo "⚡ 서비스 활성화 중..."
sudo systemctl enable "$SERVICE_NAME"

# 5. 서비스 시작
echo "▶️ 서비스 시작 중..."
sudo systemctl start "$SERVICE_NAME"

# 6. 서비스 상태 확인
echo "📊 서비스 상태 확인 중..."
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "✅ $SERVICE_NAME 서비스가 성공적으로 시작되었습니다!"
else
    echo "❌ $SERVICE_NAME 서비스 시작 실패"
    sudo systemctl status "$SERVICE_NAME" --no-pager
    exit 1
fi

# 7. 로그 확인 방법 안내
echo ""
echo "📋 사용법:"
echo "  서비스 상태:     sudo systemctl status $SERVICE_NAME"
echo "  서비스 중지:     sudo systemctl stop $SERVICE_NAME"
echo "  서비스 재시작:   sudo systemctl restart $SERVICE_NAME"
echo "  로그 확인:      sudo journalctl -u $SERVICE_NAME -f"
echo "  로그 파일:      /var/log/safework-monitor.log"

echo ""
echo "🎉 SafeWork 자동 트러블슈팅 모니터링 시스템이 성공적으로 설치되었습니다!"
echo "💡 이제 5분마다 자동으로 시스템을 모니터링하고 문제 발생 시 GitHub 이슈를 생성합니다."