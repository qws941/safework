# SafeWork Portainer 빠른 참조 가이드

## 🚀 일일 작업 명령어

### 📊 상태 확인
```bash
make portainer-status        # 컨테이너 상태
make portainer-health        # 건강 상태 체크
make status                  # 전체 시스템 상태
```

### 📋 로그 확인
```bash
make portainer-logs          # 대화형 로그 조회
make logs-errors            # 에러 로그만
make logs                   # 통합 로그
```

### 🔄 컨테이너 관리
```bash
make portainer-restart       # 전체 재시작
make portainer              # 대화형 관리 도구
```

### 📈 모니터링
```bash
make portainer-monitor       # 리소스 모니터링
make monitor                # 시스템 모니터링
```

## 🎯 직접 스크립트 사용

### 고급 관리 도구
```bash
./tools/scripts/portainer_advanced.sh           # 대화형 메뉴
./tools/scripts/portainer_advanced.sh status    # 상태 확인
./tools/scripts/portainer_advanced.sh logs      # 로그 조회
./tools/scripts/portainer_advanced.sh monitor   # 모니터링
./tools/scripts/portainer_advanced.sh health    # 건강 체크
./tools/scripts/portainer_advanced.sh restart   # 재시작
./tools/scripts/portainer_advanced.sh report    # 보고서
./tools/scripts/portainer_advanced.sh backup    # 백업
```

### 설정 관리 도구
```bash
./tools/scripts/portainer_config_manager.sh validate    # 설정 검증
./tools/scripts/portainer_config_manager.sh test        # 연결 테스트
./tools/scripts/portainer_config_manager.sh deploy      # 배포
./tools/scripts/portainer_config_manager.sh health      # 건강 체크
```

## 🚨 긴급 상황 대응

### 서비스 장애시
```bash
# 1. 즉시 상태 확인
make portainer-status

# 2. 에러 로그 확인
make logs-errors

# 3. 컨테이너 재시작
make portainer-restart

# 4. 건강 상태 재확인
make portainer-health
```

### 성능 이슈시
```bash
# 1. 리소스 사용률 확인
make portainer-monitor

# 2. 상세 로그 분석
make portainer-logs

# 3. 시스템 보고서 생성
make portainer-report
```

## 📋 주요 파일 위치

- **설정 파일**: `deployment/portainer/portainer-config.yaml`
- **고급 스크립트**: `tools/scripts/portainer_advanced.sh`
- **설정 관리**: `tools/scripts/portainer_config_manager.sh`
- **사용 가이드**: `docs/portainer/PORTAINER_USAGE_GUIDE.md`

## 🔧 환경 설정

### API 키 확인
```bash
# 설정 파일에서 API 키 확인
grep "api_key" deployment/portainer/portainer-config.yaml
```

### 연결 테스트
```bash
# Portainer API 연결 테스트
./tools/scripts/portainer_config_manager.sh test
```

## 📊 모니터링 체크리스트

- [ ] 컨테이너 상태 (running)
- [ ] CPU 사용률 (<80%)
- [ ] 메모리 사용률 (<85%)
- [ ] 디스크 사용률 (<90%)
- [ ] 네트워크 연결성
- [ ] 애플리케이션 건강 상태
- [ ] 에러 로그 확인

## 🎨 색상 코드 의미

- 🟢 **녹색**: 정상 상태
- 🟡 **노란색**: 경고 (주의 필요)
- 🔴 **빨간색**: 오류 (즉시 조치 필요)
- 🔵 **파란색**: 정보 메시지
- 🟣 **보라색**: 헤더/제목

## 💡 팁

1. **별칭 설정**: `alias sw='cd /home/jclee/app/safework && make portainer'`
2. **정기 모니터링**: cron으로 시간당 건강 체크 설정
3. **로그 필터링**: `make portainer-logs | grep ERROR`
4. **백업 자동화**: 주간 백업 스케줄 설정