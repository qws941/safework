# SafeWork Portainer 통합 사용 예시

## 실제 운영 시나리오 예시

### 시나리오 1: 월요일 아침 시스템 점검

```bash
#!/bin/bash
# 매주 월요일 아침 시스템 점검 스크립트

echo "🌅 SafeWork 월요일 시스템 점검 시작..."

# 1. 전체 시스템 상태 확인
echo "📊 시스템 상태 확인"
make portainer-status
make status

# 2. 주말 동안의 에러 로그 확인
echo "🚨 주말 에러 로그 검토"
make logs-errors

# 3. 리소스 사용률 확인
echo "📈 리소스 사용률 모니터링"
make portainer-monitor

# 4. 건강 상태 종합 점검
echo "🏥 건강 상태 종합 점검"
make portainer-health

# 5. 주간 보고서 생성
echo "📄 주간 보고서 생성"
make portainer-report

echo "✅ 월요일 시스템 점검 완료!"
```

### 시나리오 2: 배포 후 검증 프로세스

```bash
#!/bin/bash
# GitHub Actions 배포 후 검증 스크립트

echo "🚀 배포 후 검증 프로세스 시작..."

# 배포 완료까지 대기
sleep 60

# 1. 컨테이너 상태 확인
echo "📊 컨테이너 상태 확인"
./tools/scripts/portainer_advanced.sh summary

# 2. 애플리케이션 건강 상태 체크
echo "🏥 애플리케이션 건강 상태 체크"
for i in {1..5}; do
    if curl -s -f "https://safework.jclee.me/health" > /dev/null; then
        echo "✅ Production Health Check: PASS (attempt $i)"
        break
    else
        echo "⏳ Health Check: RETRY ($i/5)"
        sleep 15
    fi
done

# 3. 로그에서 배포 관련 에러 확인
echo "🔍 배포 관련 에러 확인"
./tools/scripts/portainer_advanced.sh error-logs safework-app 20

# 4. 리소스 사용률 확인
echo "📈 리소스 사용률 확인"
./tools/scripts/portainer_advanced.sh monitor

# 5. 배포 성공 알림
if curl -s -f "https://safework.jclee.me/health" > /dev/null; then
    echo "🎉 배포 검증 완료: 성공"
    # Slack 알림 (옵션)
    # curl -X POST -H 'Content-type: application/json' \
    #   --data '{"text":"✅ SafeWork 배포 성공!"}' $SLACK_WEBHOOK_URL
else
    echo "❌ 배포 검증 실패: 긴급 확인 필요"
    # 긴급 알림
    # curl -X POST -H 'Content-type: application/json' \
    #   --data '{"text":"🚨 SafeWork 배포 실패! 긴급 확인 필요"}' $SLACK_WEBHOOK_URL
fi
```

### 시나리오 3: 성능 문제 진단

```bash
#!/bin/bash
# 성능 문제 발생시 진단 스크립트

echo "🔍 SafeWork 성능 문제 진단 시작..."

# 1. 현재 리소스 상태 스냅샷
echo "📸 현재 시스템 스냅샷"
./tools/scripts/portainer_advanced.sh monitor > "performance_snapshot_$(date +%Y%m%d_%H%M%S).log"

# 2. 응답시간 측정
echo "⏱️ 응답시간 측정"
echo "Health Endpoint:"
time curl -s "https://safework.jclee.me/health" > /dev/null
echo "Main Page:"
time curl -s "https://safework.jclee.me/" > /dev/null

# 3. 데이터베이스 연결 상태 확인
echo "🗄️ 데이터베이스 연결 상태"
./tools/scripts/portainer_advanced.sh logs safework-postgres 50 | grep -E "(connection|error|slow)"

# 4. 애플리케이션 로그에서 성능 관련 이슈 검색
echo "📋 성능 관련 로그 분석"
./tools/scripts/portainer_advanced.sh logs safework-app 100 | grep -E "(slow|timeout|performance|memory|cpu)"

# 5. 컨테이너 재시작이 필요한지 판단
echo "🔄 재시작 필요성 판단"
CPU_USAGE=$(docker stats safework-app --no-stream --format "{{.CPUPerc}}" | sed 's/%//')
MEMORY_USAGE=$(docker stats safework-app --no-stream --format "{{.MemPerc}}" | sed 's/%//')

if (( $(echo "$CPU_USAGE > 90" | bc -l) )) || (( $(echo "$MEMORY_USAGE > 90" | bc -l) )); then
    echo "⚠️ 높은 리소스 사용률 감지: CPU=${CPU_USAGE}%, Memory=${MEMORY_USAGE}%"
    echo "🔄 컨테이너 재시작 권장"

    read -p "컨테이너를 재시작하시겠습니까? (y/n): " restart_choice
    if [[ "$restart_choice" == "y" ]]; then
        make portainer-restart
    fi
else
    echo "✅ 리소스 사용률 정상: CPU=${CPU_USAGE}%, Memory=${MEMORY_USAGE}%"
fi

echo "📄 진단 보고서 생성"
./tools/scripts/portainer_advanced.sh report
```

### 시나리오 4: 야간 자동 백업 및 점검

```bash
#!/bin/bash
# 야간 자동 백업 및 시스템 점검 (cron: 0 2 * * *)

echo "🌙 야간 자동 백업 및 점검 시작..."

# 1. 데이터베이스 백업
echo "💾 데이터베이스 백업"
make db-backup

# 2. 컨테이너 설정 백업
echo "🐳 컨테이너 설정 백업"
./tools/scripts/portainer_advanced.sh backup safework-app "./backups/nightly"
./tools/scripts/portainer_config_manager.sh backup

# 3. 시스템 상태 체크
echo "📊 시스템 상태 체크"
./tools/scripts/portainer_advanced.sh summary > "./reports/nightly_status_$(date +%Y%m%d).log"

# 4. 로그 파일 정리 (7일 이상 된 파일 삭제)
echo "🧹 로그 파일 정리"
find ./logs -name "*.log" -mtime +7 -delete
find ./backups -name "*.sql" -mtime +7 -delete

# 5. 디스크 사용률 확인
echo "💽 디스크 사용률 확인"
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if (( DISK_USAGE > 85 )); then
    echo "⚠️ 디스크 사용률 높음: ${DISK_USAGE}%"
    # 긴급 알림
    # curl -X POST -H 'Content-type: application/json' \
    #   --data "{\"text\":\"⚠️ SafeWork 서버 디스크 사용률 ${DISK_USAGE}%\"}" $SLACK_WEBHOOK_URL
fi

# 6. 시스템 보고서 생성
echo "📄 야간 점검 보고서 생성"
./tools/scripts/portainer_advanced.sh report "./reports/nightly_report_$(date +%Y%m%d).md"

echo "✅ 야간 자동 백업 및 점검 완료"
```

## 알림 통합 예시

### Slack 알림 함수

```bash
# ~/.bashrc 또는 스크립트에 추가
send_slack_notification() {
    local message="$1"
    local color="${2:-good}"  # good, warning, danger

    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"fields\": [{
                        \"title\": \"SafeWork 시스템 알림\",
                        \"value\": \"$message\",
                        \"short\": false
                    }]
                }]
            }" "$SLACK_WEBHOOK_URL"
    fi
}

# 사용 예시
make portainer-health
if [[ $? -eq 0 ]]; then
    send_slack_notification "✅ SafeWork 시스템 정상 운영 중" "good"
else
    send_slack_notification "🚨 SafeWork 시스템 문제 발생!" "danger"
fi
```

### 이메일 알림 (sendmail 사용)

```bash
send_email_notification() {
    local subject="$1"
    local body="$2"
    local to="${3:-admin@safework.com}"

    echo "Subject: $subject" > /tmp/email_notification
    echo "" >> /tmp/email_notification
    echo "$body" >> /tmp/email_notification

    if command -v sendmail &> /dev/null; then
        sendmail "$to" < /tmp/email_notification
    fi

    rm -f /tmp/email_notification
}

# 사용 예시
ERROR_COUNT=$(make logs-errors | wc -l)
if (( ERROR_COUNT > 10 )); then
    send_email_notification "SafeWork 에러 증가 알림" "최근 에러 로그 $ERROR_COUNT 건 발생"
fi
```

## CI/CD 파이프라인 통합

### GitHub Actions에서 Portainer 스크립트 사용

```yaml
# .github/workflows/deployment-verification.yml
name: 배포 후 검증

on:
  workflow_run:
    workflows: ["🚀 Enhanced SafeWork Deployment"]
    types:
      - completed

jobs:
  post-deployment-verification:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}

    steps:
      - name: 📂 Checkout Repository
        uses: actions/checkout@v4

      - name: 📊 컨테이너 상태 확인
        run: |
          # SSH를 통해 서버에서 상태 확인
          ssh -o StrictHostKeyChecking=no ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} \
            "cd /path/to/safework && ./tools/scripts/portainer_advanced.sh summary"

      - name: 🏥 건강 상태 체크
        run: |
          ssh ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} \
            "cd /path/to/safework && make portainer-health"

      - name: 📄 배포 보고서 생성
        run: |
          ssh ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} \
            "cd /path/to/safework && ./tools/scripts/portainer_advanced.sh report"
```

## 모니터링 대시보드 스크립트

```bash
#!/bin/bash
# 실시간 모니터링 대시보드

create_monitoring_dashboard() {
    while true; do
        clear
        echo "╔══════════════════════════════════════════════════════════════════╗"
        echo "║                    SafeWork 실시간 모니터링                      ║"
        echo "║                    $(date +'%Y-%m-%d %H:%M:%S')                       ║"
        echo "╚══════════════════════════════════════════════════════════════════╝"
        echo ""

        # 컨테이너 상태
        echo "📊 컨테이너 상태:"
        ./tools/scripts/portainer_advanced.sh summary
        echo ""

        # 리소스 사용률
        echo "📈 리소스 사용률:"
        ./tools/scripts/portainer_advanced.sh monitor
        echo ""

        # 최근 에러 로그
        echo "🚨 최근 에러 (5분 이내):"
        ./tools/scripts/portainer_advanced.sh error-logs safework-app 5 | tail -n 5
        echo ""

        # 애플리케이션 응답 상태
        echo "🌐 애플리케이션 응답:"
        if curl -s -f --max-time 5 "https://safework.jclee.me/health" > /dev/null; then
            echo "✅ Production: 정상"
        else
            echo "❌ Production: 응답 없음"
        fi

        if curl -s -f --max-time 5 "http://localhost:4545/health" > /dev/null; then
            echo "✅ Local: 정상"
        else
            echo "⚠️ Local: 응답 없음"
        fi

        echo ""
        echo "Press Ctrl+C to exit, refreshing in 30 seconds..."
        sleep 30
    done
}

# 대시보드 실행
create_monitoring_dashboard
```

이러한 통합 예시들을 통해 SafeWork 시스템을 효율적으로 운영하고 모니터링할 수 있습니다.