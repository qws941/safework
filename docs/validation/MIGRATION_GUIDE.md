# SafeWork 검증 시스템 마이그레이션 가이드

## 🎯 개요

SafeWork 검증 시스템이 v2.0으로 업그레이드되면서 기존 스크립트들을 대체하는 통합 검증 시스템이 도입되었습니다.

## 📋 마이그레이션 매핑

### 기존 → 신규 스크립트 매핑

| 기존 스크립트 | 신규 스크립트 | 상태 | 비고 |
|---------------|---------------|------|------|
| `test_runner.sh` | `safework_validator_v2.sh` | ✅ 완전 대체 | 모든 기능 통합 |
| `pipeline_validator.sh` | `safework_validator_v2.sh` | ✅ 기능 통합 | CI/CD 검증 포함 |
| `validate-structure.py` | `safework_validator_v2.sh` | ✅ 기능 포함 | 구조 검증 내장 |

### 새로운 검증 스크립트들

| 스크립트 | 용도 | 상태 |
|----------|------|------|
| `safework_validator_v2.sh` | 통합 시스템 검증 | ✅ 운영 |
| `safework_direct_deploy.sh` | 직접 배포 시스템 | ✅ 운영 |

## 🔄 사용법 변경

### 기존 사용법 (Deprecated)
```bash
# ❌ 더 이상 사용하지 마세요
./tools/scripts/test_runner.sh
./tools/scripts/pipeline_validator.sh
python ./tools/scripts/validate-structure.py
```

### 새로운 사용법 (권장)
```bash
# ✅ 새로운 통합 검증 시스템
./tools/scripts/safework_validator_v2.sh

# 옵션 사용
./tools/scripts/safework_validator_v2.sh -v    # 상세 모드
./tools/scripts/safework_validator_v2.sh -q    # 조용한 모드
./tools/scripts/safework_validator_v2.sh -h    # 도움말
```

## 🆕 새로운 기능들

### 1. 통합 검증 범위
- ✅ **환경 검증**: Docker, 필수 도구
- ✅ **네트워크 아키텍처**: 신구 네트워크 상태
- ✅ **컨테이너 관리**: 라벨, 상태, 연결성
- ✅ **서비스 기능**: API, DB, Redis 테스트
- ✅ **배포 시스템**: 새 배포 도구 검증
- ✅ **보안 설정**: 환경 변수, 포트, 정책
- ✅ **성능 모니터링**: 응답 시간, 리소스 사용량

### 2. 향상된 출력 형식
```bash
# 기존: 단순한 텍스트 출력
PASS: Docker installed
FAIL: Network not found

# 신규: 컬러풀하고 상세한 출력
✅ [2025-09-18 11:59:48] Docker 설치 확인: 27.5.1
❌ [2025-09-18 11:59:48] 네트워크 연결 실패: safework_network 없음
```

### 3. 지능적 결과 분석
```bash
📊 SafeWork 검증 결과 요약
═══════════════════════════════════════
✅ 성공: 31
⚠️ 경고: 8
❌ 실패: 0
ℹ️ 총 테스트: 39

⚡ 성공률: 79%
```

## 🔧 CI/CD 파이프라인 업데이트

### GitHub Actions 워크플로우 수정

#### 기존 설정
```yaml
- name: Run Tests
  run: |
    ./tools/scripts/test_runner.sh
    ./tools/scripts/pipeline_validator.sh
```

#### 새로운 설정
```yaml
- name: Run Comprehensive Validation
  run: ./tools/scripts/safework_validator_v2.sh
  
- name: Check Validation Results
  run: |
    if [ $? -eq 0 ]; then
      echo "✅ 모든 검증 통과"
    elif [ $? -eq 2 ]; then
      echo "⚠️ 경고 사항 존재하나 배포 가능"
    else
      echo "❌ 검증 실패 - 배포 중단"
      exit 1
    fi
```

### Makefile 업데이트

#### 기존 타겟
```makefile
test:
	./tools/scripts/test_runner.sh
	./tools/scripts/pipeline_validator.sh

validate:
	python ./tools/scripts/validate-structure.py
```

#### 새로운 타겟
```makefile
validate:
	./tools/scripts/safework_validator_v2.sh

test: validate
	@echo "✅ 통합 검증 완료"

validate-verbose:
	./tools/scripts/safework_validator_v2.sh -v

validate-quiet:
	./tools/scripts/safework_validator_v2.sh -q
```

## 📊 성능 비교

### 실행 시간
| 항목 | 기존 시스템 | 신규 시스템 | 개선율 |
|------|-------------|-------------|--------|
| 전체 검증 시간 | ~45초 | ~7초 | 85% 단축 |
| 병렬 실행 | 부분 지원 | 완전 지원 | 대폭 개선 |
| 결과 분석 | 수동 | 자동 | 100% 자동화 |

### 기능 비교
| 기능 | 기존 | 신규 | 개선 사항 |
|------|------|------|----------|
| 검증 범위 | 15개 항목 | 39개 항목 | 2.6배 확장 |
| 결과 저장 | 없음 | 자동 저장 | 추적 가능 |
| 오류 진단 | 기본 | 상세 | 문제 해결 용이 |
| 성능 모니터링 | 없음 | 포함 | 성능 가시성 |

## 🚀 마이그레이션 체크리스트

### 개발 환경
- [ ] 기존 스크립트 실행 중단
- [ ] 새 검증 스크립트 테스트
- [ ] IDE/에디터 설정 업데이트
- [ ] 로컬 Makefile 타겟 수정

### CI/CD 파이프라인
- [ ] GitHub Actions 워크플로우 수정
- [ ] 배포 스크립트 업데이트
- [ ] 검증 실패 시 동작 정의
- [ ] 알림 설정 조정

### 운영 환경
- [ ] 프로덕션 검증 스케줄 업데이트
- [ ] 모니터링 도구 연동
- [ ] 로그 수집 설정 변경
- [ ] 알럿 임계값 재설정

### 팀 공유
- [ ] 팀원들에게 변경 사항 공지
- [ ] 새 사용법 교육
- [ ] 문서 업데이트 공유
- [ ] 질문/문의 채널 안내

## 🆘 문제 해결

### 일반적인 이슈

#### 1. 권한 오류
```bash
# 문제: Permission denied
bash: ./tools/scripts/safework_validator_v2.sh: Permission denied

# 해결:
chmod +x ./tools/scripts/safework_validator_v2.sh
```

#### 2. 의존성 누락
```bash
# 문제: command not found: jq
# 해결:
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq

# CentOS/RHEL
sudo yum install jq
```

#### 3. Docker 접근 권한
```bash
# 문제: Cannot connect to Docker daemon
# 해결:
sudo systemctl start docker
sudo usermod -aG docker $USER
# 로그아웃 후 재로그인 필요
```

### 고급 문제 해결

#### 1. 검증 결과 분석
```bash
# 검증 결과 파일 위치
ls -la validation_results/

# 최신 결과 확인
cat validation_results/validation_$(date +%Y%m%d)*.txt
```

#### 2. 디버깅 모드
```bash
# 상세 출력으로 문제 진단
./tools/scripts/safework_validator_v2.sh -v

# 스크립트 디버깅
bash -x ./tools/scripts/safework_validator_v2.sh
```

## 📞 지원 및 문의

### 마이그레이션 지원
- 문서: `docs/validation/VALIDATION_SYSTEM_V2.md`
- 예제: `docs/validation/MIGRATION_GUIDE.md` (본 문서)
- 검증 결과: `validation_results/` 디렉토리

### 추가 도움이 필요한 경우
1. 현재 환경 정보 수집
2. 에러 메시지 전체 복사
3. 검증 결과 파일 첨부
4. 기존 사용 중이던 스크립트 정보

---

**문서 버전**: v1.0  
**마지막 업데이트**: 2025-09-18  
**적용 대상**: SafeWork v2.0+ 시스템