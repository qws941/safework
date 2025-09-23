# SafeWork 자동 트러블슈팅 모니터링 시스템

## 시스템 개요

SafeWork 프로젝트의 모든 트러블(에러로그, CI/CD 실패, 운영 이미지 문제 등)을 자동으로 감지하고 GitHub 이슈로 등록하여 Claude Code가 처리할 수 있게 하는 자동화 시스템입니다.

## 설치된 구성요소

### 1. 핵심 스크립트
- **scripts/auto-issue-creator.sh**: 메인 모니터링 스크립트 (755줄)
- **scripts/monitor-daemon.sh**: 데몬 래퍼 스크립트 (5분 간격 실행)
- **scripts/install-monitor.sh**: systemd 서비스 설치 스크립트
- **scripts/safework-monitor.service**: systemd 서비스 설정

### 2. 모니터링 범위

#### 🐳 Docker 컨테이너 오류
- 중지된 컨테이너 감지
- 메모리 사용률 90% 초과
- CPU 사용률 90% 초과
- 컨테이너 재시작 감지

#### 🔄 CI/CD 파이프라인 실패
- GitHub Actions 워크플로우 실패 감지
- 최근 24시간 내 실패한 워크플로우 자동 이슈 생성
- 실패 원인 및 로그 포함

#### 📱 애플리케이션 오류
- Flask 애플리케이션 에러 로그
- Python 예외 추적
- 데이터베이스 연결 오류
- Redis 연결 문제

#### 🔐 보안 문제
- 보안 취약점 감지
- 의심스러운 로그인 시도
- 권한 오류

#### 🖼️ 운영 이미지 문제
- Docker 이미지 빌드 실패
- Registry 업로드 문제
- Watchtower 배포 실패

## 설치 및 설정

### 자동 설치
```bash
cd /home/jclee/app/safework2
chmod +x scripts/install-monitor.sh
sudo ./scripts/install-monitor.sh
```

### 수동 설치
```bash
# 1. 스크립트 실행 권한 설정
chmod +x scripts/*.sh

# 2. systemd 서비스 파일 복사
sudo cp scripts/safework-monitor.service /etc/systemd/system/

# 3. systemd 설정 리로드
sudo systemctl daemon-reload

# 4. 서비스 활성화 및 시작
sudo systemctl enable safework-monitor
sudo systemctl start safework-monitor

# 5. 로그 파일 권한 설정
sudo touch /var/log/safework-monitor.log
sudo chown jclee:jclee /var/log/safework-monitor.log
```

## 사용법

### 서비스 관리
```bash
# 서비스 상태 확인
sudo systemctl status safework-monitor

# 서비스 시작/중지/재시작
sudo systemctl start safework-monitor
sudo systemctl stop safework-monitor
sudo systemctl restart safework-monitor

# 실시간 로그 모니터링
tail -f /var/log/safework-monitor.log
sudo journalctl -u safework-monitor -f
```

### 수동 실행
```bash
# 단일 실행 (테스트용)
./scripts/auto-issue-creator.sh

# 백그라운드 데몬 실행
./scripts/monitor-daemon.sh &
```

## 자동 이슈 생성 기능

### 이슈 생성 조건
1. **Docker 컨테이너 문제**: 중지, 높은 리소스 사용률, 재시작
2. **CI/CD 실패**: GitHub Actions 워크플로우 실패
3. **애플리케이션 오류**: 로그에서 ERROR, CRITICAL 레벨 감지
4. **보안 문제**: 의심스러운 활동 감지
5. **이미지 문제**: Docker 이미지 빌드/배포 실패

### 이슈 템플릿
각 이슈는 다음 형식으로 생성됩니다:
- **제목**: 🚨 [AUTO] 문제 유형: 상세 설명
- **레이블**: bug, 긴급도, claude-ready
- **내용**: @claude 멘션, 문제 상세 정보, 해결 요청
- **중복 방지**: 24시간 내 동일 문제 이슈 생성 방지

### 생성된 이슈 예시
- **Issue #82**: CI/CD 파이프라인 실패 (최초 테스트)
- **Issue #83**: CI/CD 파이프라인 실패 (자동 모니터링)

## 시스템 상태 모니터링

### 실행 상태 확인
```bash
# 서비스 상태
systemctl is-active safework-monitor

# 프로세스 확인
ps aux | grep -E "(monitor-daemon|auto-issue-creator)"

# 메모리 사용량
systemctl show safework-monitor --property=MemoryCurrent
```

### 로그 분석
```bash
# 최근 로그 확인
tail -20 /var/log/safework-monitor.log

# 에러 로그만 필터링
grep ERROR /var/log/safework-monitor.log

# 이슈 생성 로그 확인
grep "이슈 생성" /var/log/safework-monitor.log
```

## 설정 변경

### 모니터링 간격 조정
`scripts/monitor-daemon.sh`에서 `sleep 300` 값을 변경 (초 단위)

### 감지 조건 설정
`scripts/auto-issue-creator.sh`의 다음 값들을 조정:
```bash
MEMORY_THRESHOLD=90    # 메모리 사용률 임계값 (%)
CPU_THRESHOLD=90       # CPU 사용률 임계값 (%)
CACHE_HOURS=24         # 중복 방지 캐시 시간 (시간)
```

### 알림 대상 변경
GitHub 이슈 템플릿에서 `@claude` 멘션을 다른 사용자로 변경 가능

## 문제 해결

### 일반적인 문제

#### 1. 서비스 시작 실패
```bash
# 로그 확인
sudo journalctl -u safework-monitor -n 50

# 권한 확인
ls -la /var/log/safework-monitor.log
sudo chown jclee:jclee /var/log/safework-monitor.log
```

#### 2. GitHub CLI 인증 오류
```bash
# GitHub CLI 로그인 상태 확인
gh auth status

# 재인증
gh auth login
```

#### 3. Docker 접근 권한 오류
```bash
# 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER
newgrp docker
```

### 로그 파일 관리
```bash
# 로그 파일 크기 확인
du -h /var/log/safework-monitor.log

# 로그 로테이션 설정
sudo logrotate -d /etc/logrotate.conf
```

## 성능 최적화

### 리소스 사용량
- **메모리**: ~716KB (경량)
- **CPU**: 최소 사용 (5분 간격 실행)
- **디스크**: 로그 파일만 사용

### 최적화 권장사항
1. 로그 로테이션 설정으로 디스크 사용량 관리
2. 모니터링 간격을 필요에 따라 조정
3. 불필요한 검사 항목 비활성화

## 확장 가능성

### 새로운 모니터링 항목 추가
1. `scripts/auto-issue-creator.sh`에 새 함수 추가
2. 메인 루프에서 함수 호출
3. 적절한 이슈 템플릿 생성

### 알림 채널 확장
- Slack 웹훅 연동
- 이메일 알림
- Discord 봇 연동
- PagerDuty 통합

## 보안 고려사항

### 접근 권한
- 스크립트는 `jclee` 사용자 권한으로 실행
- systemd 서비스로 안전한 실행 환경 보장
- GitHub Token은 환경변수로 안전하게 관리

### 로그 보안
- 민감한 정보 로깅 방지
- 로그 파일 권한 적절히 설정
- 정기적인 로그 정리

## 시스템 요구사항

### 소프트웨어
- Linux systemd 지원
- GitHub CLI (gh) 설치
- Docker 접근 권한
- Bash 4.0+

### 권한
- systemd 서비스 관리 권한
- Docker 컨테이너 조회 권한
- 로그 파일 생성/수정 권한
- GitHub 이슈 생성 권한

## 업데이트 및 유지보수

### 스크립트 업데이트
```bash
# 새 버전 배포 시
sudo systemctl stop safework-monitor
git pull origin master
sudo systemctl start safework-monitor
```

### 정기 점검 항목
- [ ] 이슈 생성 정상 작동 확인
- [ ] 로그 파일 크기 점검
- [ ] GitHub CLI 인증 상태 확인
- [ ] Docker 연결 상태 확인

## 연락처 및 지원

문제 발생 시 GitHub 이슈를 통해 보고하거나, 시스템이 자동으로 생성한 이슈에 @claude를 멘션하여 Claude Code의 자동 처리를 요청할 수 있습니다.

---

*이 문서는 SafeWork 자동 트러블슈팅 모니터링 시스템 v1.0 기준으로 작성되었습니다.*