# SafeWork 워크플로우 통합 분석 및 전략

## 현재 워크플로우 현황 (10개)

### 1. 🚀 deploy.yml - Deploy Pipeline
- **트리거**: push(master), workflow_dispatch
- **기능**: 컨테이너 빌드/배포, Watchtower 연동
- **Claude 사용**: ✅ (라인 436)
- **중복도**: 낮음 (핵심 배포 기능)

### 2. 🤖 ci-auto-fix.yml - CI Auto-Fix Pipeline
- **트리거**: workflow_run(Deploy 완료시), workflow_dispatch
- **기능**: 배포 실패시 자동 수정 시도
- **Claude 사용**: ✅ (라인 72)
- **중복도**: 보통 (자동 복구 기능)

### 3. 🤖 claude.yml - Claude Code Assistant
- **트리거**: issues, issue_comment, pull_request, workflow_dispatch
- **기능**: 범용 Claude 지원 (멘션 기반)
- **Claude 사용**: ✅ (라인 79)
- **중복도**: 높음 (다른 워크플로우와 기능 중복)

### 4. 🔄 dependency-auto-update.yml - Dependency Auto-Update
- **트리거**: schedule(주간), workflow_dispatch
- **기능**: 의존성 자동 업데이트
- **Claude 사용**: ❌ (Claude CLI 사용)
- **중복도**: 낮음 (고유 기능)

### 5. 🎯 issue-handler.yml - Issue Handler
- **트리거**: issues(opened/labeled), issue_comment
- **기능**: 이슈 자동 라벨링 및 트리아지
- **Claude 사용**: ✅ (라인 66)
- **중복도**: 높음 (claude.yml과 중복)

### 6. 🔧 maintenance-automation.yml - Maintenance Automation
- **트리거**: schedule(주간/월간), workflow_dispatch
- **기능**: 시스템 유지보수 및 건강성 검사
- **Claude 사용**: ✅ (라인 170)
- **중복도**: 보통 (유지보수 특화)

### 7. 📊 operational-log-analysis.yml - Log Analysis
- **트리거**: schedule(5분마다), workflow_dispatch
- **기능**: Portainer API 로그 감시
- **Claude 사용**: ❌ (Claude CLI 사용)
- **중복도**: 낮음 (모니터링 특화)

### 8. 🔍 pr-auto-review.yml - PR Auto Review
- **트리거**: pull_request, schedule(일간)
- **기능**: PR 자동 검토
- **Claude 사용**: ❌ (Claude CLI 사용)
- **중복도**: 높음 (pr-review.yml과 명백한 중복)

### 9. 🔍 pr-review.yml - PR Review
- **트리거**: pull_request, issue_comment
- **기능**: PR 검토 및 분석
- **Claude 사용**: ✅ (라인 83)
- **중복도**: 높음 (pr-auto-review.yml과 명백한 중복)

### 10. 🛡️ security-auto-triage.yml - Security Auto-Triage
- **트리거**: issues(security 라벨), schedule(일간), workflow_dispatch
- **기능**: 보안 이슈 자동 분류
- **Claude 사용**: ✅ (라인 62)
- **중복도**: 보통 (보안 특화)

## 중복 분석 결과

### Claude Code Action 사용 현황 (7개 워크플로우)
1. **deploy.yml** - 배포 실패시 분석
2. **ci-auto-fix.yml** - 자동 수정 분석
3. **claude.yml** - 범용 Claude 지원
4. **issue-handler.yml** - 이슈 분석
5. **maintenance-automation.yml** - 유지보수 분석
6. **pr-review.yml** - PR 검토
7. **security-auto-triage.yml** - 보안 분석

### 명백한 중복 (즉시 통합 필요)
- **PR 관련**: pr-review.yml ↔ pr-auto-review.yml
- **Claude 멘션**: claude.yml이 범용이지만 다른 워크플로우에서도 중복 구현
- **이슈 처리**: issue-handler.yml과 claude.yml에서 유사 기능

## 통합 전략: 3개 핵심 워크플로우

### 1. 🤖 main-automation.yml (통합 자동화 허브)
**통합 대상**: claude.yml + issue-handler.yml + pr-review.yml + security-auto-triage.yml
**트리거**: issues, issue_comment, pull_request, workflow_dispatch
**기능**:
- 통합된 Claude Code Action 호출
- 이슈/PR 자동 분류 및 처리
- 보안 이슈 트리아지
- MCP 도구 통합 활용

### 2. 🚀 deploy-pipeline.yml (배포 전용)
**통합 대상**: deploy.yml + ci-auto-fix.yml
**트리거**: push(master), workflow_dispatch
**기능**:
- 컨테이너 빌드 및 배포
- 실패시 자동 복구 시스템
- 배포 상태 모니터링

### 3. 🔧 monitoring-maintenance.yml (모니터링 & 유지보수)
**통합 대상**: operational-log-analysis.yml + maintenance-automation.yml + dependency-auto-update.yml
**트리거**: schedule, workflow_dispatch
**기능**:
- 실시간 로그 모니터링
- 정기 유지보수 작업
- 의존성 자동 업데이트

## Claude API 호출 최적화 방안

### 현재 문제점
- 7개 워크플로우에서 중복 호출 (비용 및 성능 문제)
- 동일한 분석 작업 반복 수행
- 일관성 없는 프롬프트 및 파라미터

### 최적화 전략
1. **중앙집중화**: main-automation.yml에서 통합 관리
2. **컨텍스트 공유**: 분석 결과를 artifact로 공유
3. **지능적 라우팅**: 작업 유형별 최적화된 프롬프트
4. **MCP 도구 활용**: Sequential Thinking, Shrimp, Serena 통합

## MCP 도구 통합 방안

### Sequential Thinking 활용
- 복잡한 에러 분석에 다단계 사고 적용
- 워크플로우 의사결정 트리에 통합

### Shrimp Task Manager 활용
- 자동화 작업 계획 수립 및 추적
- 실패한 작업의 재시도 전략 수립

### Serena 활용
- 실시간 코드베이스 분석
- 자동 수정 제안 및 적용

## 자동 실패 복구 시스템

### 3단계 복구 파이프라인
1. **Detection**: 실패 감지 및 패턴 분석
2. **Analysis**: MCP 도구를 활용한 원인 분석
3. **Recovery**: 자동 수정 및 재배포

### 에러 패턴별 복구 전략
- **Import 오류**: 자동 의존성 설치
- **설정 오류**: 환경변수 검증 및 수정
- **컨테이너 오류**: 자동 재시작 및 로그 분석
- **배포 실패**: 롤백 후 재배포

## 성능 개선 예상 효과

### 현재 → 통합 후
- **워크플로우 수**: 10개 → 3개 (70% 감소)
- **Claude API 호출**: 중복 제거로 50% 감소
- **실행 시간**: 병렬화로 30% 단축
- **유지보수 비용**: 통합으로 60% 감소

## 구현 우선순위

### Phase 1 (즉시 적용)
1. PR 중복 워크플로우 통합 (pr-review.yml + pr-auto-review.yml)
2. main-automation.yml 기본 구조 생성
3. Claude API 호출 중앙집중화

### Phase 2 (1주 내)
1. 나머지 워크플로우 통합
2. MCP 도구 완전 통합
3. 자동 복구 시스템 구현

### Phase 3 (2주 내)
1. 성능 최적화 및 모니터링
2. 완전 자동화 테스트
3. 문서화 및 교육

---

**결론**: 현재 10개 워크플로우를 3개로 통합하여 Claude API 호출을 최적화하고, MCP 도구를 활용한 지능적 자동화 시스템을 구축함으로써 "실패하면 알아서 수정하고 배포되는" 완전 자동화 DevOps 파이프라인을 달성할 수 있습니다.