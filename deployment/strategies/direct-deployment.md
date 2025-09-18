# SafeWork Direct Deployment Strategy
# Watchtower 의존성 제거 후 대체 배포 전략

## 🎯 새로운 배포 아키텍처

### 1. GitHub Actions 기반 직접 배포
- GitHub Actions에서 Portainer API 직접 호출
- 컨테이너 재생성 및 이미지 업데이트 자동화
- 단계별 배포 및 롤백 지원

### 2. 독립적인 네트워크 구성
- `watchtower_default` → `safework_network`로 변경
- 더 명확한 네트워킹 구조
- 외부 의존성 최소화

### 3. 스크립트 기반 배포 관리
- 통합 배포 스크립트 개선
- Portainer API 직접 제어
- 상태 모니터링 및 헬스체크 통합

## 🔧 구현 계획

### Phase 1: Docker 라벨 정리
```bash
# 기존 Watchtower 라벨 제거
- com.centurylinklabs.watchtower.enable=true
- com.centurylinklabs.watchtower.priority=*
- com.centurylinklabs.watchtower.stop-timeout=*

# 새로운 SafeWork 라벨 추가
+ safework.deployment.auto=true
+ safework.service.priority=high|medium|low
+ safework.health.check.enabled=true
```

### Phase 2: 네트워크 표준화
```bash
# 네트워크 이름 변경
watchtower_default → safework_network

# 컨테이너별 네트워크 설정 업데이트
- 모든 Dockerfile 및 스크립트 업데이트
- Portainer 설정 파일 업데이트
```

### Phase 3: 배포 자동화 개선
```bash
# GitHub Actions 워크플로우 개선
1. 이미지 빌드 → 레지스트리 푸시
2. Portainer API로 컨테이너 중지
3. 새 이미지로 컨테이너 재생성
4. 헬스체크 및 롤백 메커니즘
```

### Phase 4: 모니터링 및 관리 도구
```bash
# 새로운 관리 도구
- safework_deploy.sh: 직접 배포 스크립트
- safework_health.sh: 종합 헬스체크
- safework_rollback.sh: 안전한 롤백
```

## 🚀 마이그레이션 순서

1. **백업**: 현재 운영 환경 백업
2. **라벨 정리**: Dockerfile들의 Watchtower 라벨 제거
3. **네트워크 변경**: safework_network 생성 및 마이그레이션
4. **스크립트 업데이트**: 모든 운영 스크립트 업데이트
5. **배포 테스트**: 새로운 배포 플로우 검증
6. **프로덕션 적용**: 단계별 프로덕션 마이그레이션

## 🔒 안전성 보장

- 롤백 메커니즘 내장
- 단계별 검증 프로세스
- 기존 데이터 100% 보존
- 서비스 다운타임 최소화