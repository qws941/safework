# SafeWork Portainer 고급 사용 가이드

## 개요

이 가이드는 SafeWork 프로젝트의 **고도화된 Portainer 관리 시스템**에 대한 완전한 사용법을 제공합니다. 새로운 모듈화 구조와 함께 강력한 컨테이너 관리, 모니터링, 자동화 기능을 활용할 수 있습니다.

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [빠른 시작 가이드](#빠른-시작-가이드)
3. [고급 스크립트 사용법](#고급-스크립트-사용법)
4. [Makefile 통합 사용법](#makefile-통합-사용법)
5. [설정 관리](#설정-관리)
6. [실무 사용 시나리오](#실무-사용-시나리오)
7. [문제 해결](#문제-해결)
8. [최적화 팁](#최적화-팁)

## 시스템 개요

### 🚀 새로운 고도화 기능

**1. 통합 스크립트 시스템**
```bash
# 기존: 개별 스크립트들의 분산된 관리
./scripts/portainer_simple.sh
./scripts/safework_ops_unified.sh

# 신규: 고도화된 통합 관리 시스템
./tools/scripts/portainer_advanced.sh          # 고급 대화형 관리
./tools/scripts/portainer_config_manager.sh    # YAML 기반 설정 관리
```

**2. Makefile 통합**
```bash
# 모든 Portainer 작업이 make 명령어로 통합
make portainer              # 대화형 고급 관리 도구
make portainer-status       # 컨테이너 상태 확인
make portainer-logs         # 로그 조회
make portainer-monitor      # 리소스 모니터링
make portainer-health       # 건강 상태 체크
```

**3. YAML 기반 설정 관리**
```yaml
# deployment/portainer/portainer-config.yaml
# 모든 컨테이너 설정을 중앙 집중식으로 관리
containers:
  safework-app:
    image: "registry.jclee.me/safework/app:latest"
    environment: ["TZ=Asia/Seoul", "DB_HOST=safework-postgres"]
```

## 빠른 시작 가이드

### 1단계: 환경 확인
```bash
# 프로젝트 루트 디렉토리에서
cd /home/jclee/app/safework

# 스크립트 실행 권한 확인
ls -la tools/scripts/portainer_*
```

### 2단계: 기본 상태 확인
```bash
# Makefile을 통한 빠른 상태 확인
make portainer-status

# 또는 직접 스크립트 실행
./tools/scripts/portainer_advanced.sh status
```

### 3단계: 대화형 관리 도구 실행
```bash
# 고급 관리 도구 (추천)
make portainer

# 메뉴가 표시되면 원하는 작업 선택
```

## 고급 스크립트 사용법

### portainer_advanced.sh - 핵심 관리 도구

**🎯 대화형 메뉴 모드 (추천)**
```bash
# 대화형 메뉴 실행
./tools/scripts/portainer_advanced.sh

# 메뉴 예시:
====================================
    SafeWork Portainer 고급 관리 도구
====================================

1) 📊 컨테이너 상태 조회
2) 📋 컨테이너 로그 조회
3) 🔄 컨테이너 재시작
4) 📈 리소스 모니터링
5) 🏥 건강 상태 체크
6) 🌐 네트워크 정보
7) 🖼️ 이미지 관리
8) 📄 시스템 보고서
9) 💾 백업 실행
0) 종료

선택하세요 [0-9]:
```

**📊 개별 명령어 실행**
```bash
# 컨테이너 상태 확인
./tools/scripts/portainer_advanced.sh status

# 특정 컨테이너 로그 조회 (색상 코딩)
./tools/scripts/portainer_advanced.sh logs safework-app

# 리소스 모니터링
./tools/scripts/portainer_advanced.sh monitor

# 시스템 건강 상태 체크
./tools/scripts/portainer_advanced.sh health

# 네트워크 정보 조회
./tools/scripts/portainer_advanced.sh network

# 컨테이너 재시작
./tools/scripts/portainer_advanced.sh restart safework-app

# 전체 시스템 보고서 생성
./tools/scripts/portainer_advanced.sh report

# 이미지 관리 (pull, cleanup)
./tools/scripts/portainer_advanced.sh images

# 시스템 백업
./tools/scripts/portainer_advanced.sh backup
```

### portainer_config_manager.sh - 설정 관리 도구

**🔧 설정 기반 관리**
```bash
# 설정 파일 검증
./tools/scripts/portainer_config_manager.sh validate

# Portainer API 연결 테스트
./tools/scripts/portainer_config_manager.sh test

# 설정 기반 전체 배포
./tools/scripts/portainer_config_manager.sh deploy

# 개별 컨테이너 배포
./tools/scripts/portainer_config_manager.sh container safework-app

# 시스템 건강 상태 체크
./tools/scripts/portainer_config_manager.sh health

# 설정 정보 표시
./tools/scripts/portainer_config_manager.sh info

# 설정 및 컨테이너 정보 백업
./tools/scripts/portainer_config_manager.sh backup
```

## Makefile 통합 사용법

### 🚀 Portainer 전용 명령어

**기본 작업**
```bash
# 📱 대화형 고급 관리 도구 (가장 편리함)
make portainer

# 📊 컨테이너 상태 확인
make portainer-status

# 📋 로그 조회 (대화형)
make portainer-logs

# 📈 리소스 모니터링
make portainer-monitor

# 📄 시스템 보고서 생성
make portainer-report
```

**건강 상태 및 유지보수**
```bash
# 🏥 건강 상태 종합 체크
make portainer-health

# 🔄 전체 SafeWork 컨테이너 재시작
make portainer-restart
```

### 🔗 기존 명령어와의 연계

**통합 워크플로우 예시**
```bash
# 1. 전체 시스템 상태 확인
make status
make portainer-status

# 2. 문제 발생시 상세 분석
make portainer-logs
make logs-errors

# 3. 필요시 컨테이너 재시작
make portainer-restart

# 4. 배포 후 건강 상태 확인
make deploy
make portainer-health

# 5. 정기 백업
make backup
./tools/scripts/portainer_advanced.sh backup
```

## 설정 관리

### YAML 설정 파일 구조

**deployment/portainer/portainer-config.yaml**
```yaml
# Portainer 연결 설정
portainer:
  url: "https://portainer.jclee.me"
  api_key: "ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8="
  endpoint_id: 3

# SafeWork 컨테이너 정의
containers:
  safework-app:
    image: "registry.jclee.me/safework/app:latest"
    ports: ["4545:4545"]
    environment:
      - "TZ=Asia/Seoul"
      - "DB_HOST=safework-postgres"
    health_check:
      endpoint: "/health"
      expected_status: 200

# 모니터링 설정
monitoring:
  thresholds:
    cpu_percent: 80
    memory_percent: 85
    disk_percent: 90

# 보안 설정
security:
  resource_limits:
    safework-app:
      cpu: "1.0"
      memory: "1g"
```

### 환경별 설정 관리

**개발 환경**
```bash
# 개발 환경 설정 적용
export SAFEWORK_ENV=development
./tools/scripts/portainer_config_manager.sh deploy
```

**프로덕션 환경**
```bash
# 프로덕션 환경 설정 적용
export SAFEWORK_ENV=production
./tools/scripts/portainer_config_manager.sh deploy
```

## 실무 사용 시나리오

### 🎯 시나리오 1: 일상적인 시스템 모니터링

**매일 아침 시스템 체크**
```bash
# 1. 빠른 상태 확인
make portainer-status

# 2. 건강 상태 체크
make portainer-health

# 3. 에러 로그 확인
make logs-errors

# 4. 리소스 사용률 확인
make portainer-monitor
```

### 🚨 시나리오 2: 긴급 문제 해결

**서비스 장애 발생시**
```bash
# 1. 즉시 상태 확인
make portainer-status

# 2. 상세 로그 분석
make portainer-logs  # 대화형으로 문제 컨테이너 선택

# 3. 리소스 상태 확인
make portainer-monitor

# 4. 필요시 컨테이너 재시작
make portainer-restart

# 5. 시스템 보고서 생성 (사후 분석용)
make portainer-report
```

### 🔄 시나리오 3: 정기 배포 및 업데이트

**주간 배포 프로세스**
```bash
# 1. 배포 전 백업
./tools/scripts/portainer_advanced.sh backup

# 2. 현재 상태 확인
make portainer-health

# 3. 새 버전 배포
make deploy

# 4. 배포 후 건강 상태 확인
make portainer-health

# 5. 성능 모니터링
make portainer-monitor

# 6. 시스템 보고서 생성
make portainer-report
```

### 📊 시나리오 4: 성능 최적화 분석

**성능 이슈 분석**
```bash
# 1. 리소스 사용률 모니터링
make portainer-monitor

# 2. 상세 로그 분석 (성능 관련 로그)
./tools/scripts/portainer_advanced.sh logs safework-app | grep -E "(slow|timeout|performance)"

# 3. 네트워크 상태 확인
./tools/scripts/portainer_advanced.sh network

# 4. 시스템 보고서로 전체 상황 파악
make portainer-report
```

## 문제 해결

### ❌ 일반적인 문제와 해결책

**1. Portainer API 연결 실패**
```bash
# 문제 확인
./tools/scripts/portainer_config_manager.sh test

# 해결책: API 키 재확인
# deployment/portainer/portainer-config.yaml에서 api_key 확인
```

**2. 컨테이너 상태 조회 실패**
```bash
# 문제 확인
make portainer-status

# 해결책: 네트워크 및 권한 확인
curl -H "X-API-Key: ptr_lejbr5d8IuYiEQCNpg2VdjFLZqRIEfQiJ7t0adnYQi8=" \
  "https://portainer.jclee.me/api/system/status"
```

**3. 로그 조회 시 한글 깨짐**
```bash
# 해결책: 인코딩 설정
export LANG=ko_KR.UTF-8
export LC_ALL=ko_KR.UTF-8
make portainer-logs
```

**4. 스크립트 실행 권한 오류**
```bash
# 해결책: 실행 권한 부여
chmod +x tools/scripts/portainer_*.sh
```

### 🔧 고급 디버깅

**상세 디버그 모드**
```bash
# 디버그 정보와 함께 실행
DEBUG=1 ./tools/scripts/portainer_advanced.sh status

# API 호출 상세 로그
VERBOSE=1 ./tools/scripts/portainer_config_manager.sh test
```

## 최적화 팁

### 🚀 성능 최적화

**1. 로그 조회 최적화**
```bash
# 특정 시간대 로그만 조회
./tools/scripts/portainer_advanced.sh logs safework-app --since "2024-01-01T00:00:00"

# 로그 레벨 필터링
./tools/scripts/portainer_advanced.sh logs safework-app | grep ERROR
```

**2. 모니터링 자동화**
```bash
# cron을 통한 정기 건강 상태 체크
# /etc/crontab에 추가:
0 * * * * cd /home/jclee/app/safework && make portainer-health >> /var/log/safework-health.log
```

**3. 알림 설정**
```bash
# Slack 알림과 연계
./tools/scripts/portainer_advanced.sh health | \
  grep -q "❌" && curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"SafeWork 시스템 경고!"}' $SLACK_WEBHOOK_URL
```

### 💡 사용성 개선

**1. 별칭(Alias) 설정**
```bash
# ~/.bashrc에 추가
alias sw-status='cd /home/jclee/app/safework && make portainer-status'
alias sw-logs='cd /home/jclee/app/safework && make portainer-logs'
alias sw-health='cd /home/jclee/app/safework && make portainer-health'
alias sw-monitor='cd /home/jclee/app/safework && make portainer-monitor'
```

**2. 빠른 액세스 스크립트**
```bash
# ~/bin/safework-portainer 생성
#!/bin/bash
cd /home/jclee/app/safework
./tools/scripts/portainer_advanced.sh "$@"
```

**3. 통합 대시보드**
```bash
# 모든 정보를 한 번에 보는 대시보드
make portainer-status && echo "" && \
make portainer-health && echo "" && \
make portainer-monitor
```

## 고급 활용 방법

### 🔄 CI/CD 통합

**GitHub Actions와 연계**
```yaml
# .github/workflows/deployment-health-check.yml
- name: 배포 후 건강 상태 체크
  run: |
    cd /home/jclee/app/safework
    make portainer-health
    make portainer-monitor
```

### 📊 메트릭 수집

**시스템 메트릭 자동 수집**
```bash
# 정기적인 메트릭 수집 스크립트
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
make portainer-monitor > "metrics/safework_metrics_$TIMESTAMP.log"
make portainer-report > "reports/safework_report_$TIMESTAMP.md"
```

### 🔒 보안 강화

**접근 로그 모니터링**
```bash
# 의심스러운 접근 패턴 감지
./tools/scripts/portainer_advanced.sh logs safework-app | \
  grep -E "(401|403|failed)" | \
  awk '{print $1, $4, $7}' | sort | uniq -c | sort -nr
```

## 결론

이 고도화된 Portainer 관리 시스템은 SafeWork 프로젝트의 운영 효율성을 크게 향상시킵니다:

✅ **통합된 관리**: 모든 컨테이너 작업이 일관된 인터페이스로 통합
✅ **자동화**: 반복적인 작업의 자동화로 운영 부담 감소
✅ **가시성**: 실시간 모니터링과 상세한 로그 분석
✅ **안정성**: 설정 기반 관리로 오류 가능성 최소화
✅ **확장성**: 모듈화된 구조로 기능 확장 용이

정기적인 사용과 모니터링을 통해 안정적인 SafeWork 서비스 운영을 보장할 수 있습니다.