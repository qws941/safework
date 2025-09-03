# SafeWork Deploy

## Purpose
SafeWork 프로젝트의 안전하고 자동화된 배포 프로세스

## Usage
```bash
/safework-deploy [environment]
```

## Description
SafeWork 프로젝트를 위한 GitOps 기반 자동 배포:

1. **사전 검증**: 코드 품질, 테스트, 보안 검사
2. **Docker 빌드**: Multi-stage 빌드 최적화
3. **레지스트리 푸시**: registry.jclee.me 업로드
4. **헬스체크**: 배포 후 서비스 상태 확인
5. **롤백 준비**: 문제 발생시 자동 롤백

## Arguments
- `environment` (optional): 배포 환경 (develop/production). 기본값: develop

## Implementation

**SafeWork 안전 배포 프로세스를 시작합니다** 🚀

**1단계: 사전 검증**
```bash
# 코드 품질 검사
python3 -m black --line-length 100 app/ --check
python3 -m flake8 --max-line-length=100 --ignore=E501,W503 app/

# 테스트 실행
docker exec safework-app python3 -m pytest tests/ -v --cov=. --cov-report=term-missing

# 보안 검사
docker exec safework-app python3 -m safety check --short-report
```

**2단계: Docker 환경 준비**
```bash
# 컨테이너 중지 및 정리
docker-compose down
docker system prune -f

# 새 이미지 빌드
docker-compose build --no-cache
```

**3단계: 서비스 헬스체크**
```bash
# 서비스 시작
docker-compose up -d

# 헬스체크 대기 (최대 60초)
timeout 60 bash -c 'until curl -f http://localhost:4545/health; do sleep 2; done'

# 데이터베이스 연결 확인
docker exec safework-mysql mysql -u safework -psafework2024 -e "SELECT 1"

# Redis 연결 확인  
docker exec safework-redis redis-cli ping
```

**4단계: 기능 테스트**
```bash
# 핵심 기능 테스트
curl -s http://localhost:4545/survey/001_musculoskeletal_symptom_survey | grep -q "근골격계 증상조사표"
curl -s http://localhost:4545/survey/002_new_employee_health_checkup_form | grep -q "신규 근로자"
```

**5단계: GitOps 배포 트리거**

### Development 배포
```bash
git add .
git commit -m "deploy: SafeWork $(date +'%Y-%m-%d %H:%M') - automated deployment"
git push origin develop
```

### Production 배포
```bash
# 프로덕션은 수동 승인 필요
git push origin main
echo "🔒 Production 배포는 GitHub Actions에서 수동 승인이 필요합니다"
echo "📍 배포 상태: https://github.com/qws941/safework/actions"
```

**6단계: 배포 후 검증**
```bash
# CI/CD 파이프라인 상태 확인
gh run list --limit 3

# 배포 로그 모니터링
docker-compose logs -f app --tail 50
```

**7단계: 롤백 준비**
```bash
# 이전 버전 태그 저장
PREVIOUS_TAG=$(git describe --tags --abbrev=0 HEAD~1)
echo "🔄 롤백 명령어: git revert HEAD && git push origin $(git branch --show-current)"
echo "📦 이전 버전: $PREVIOUS_TAG"
```

## SafeWork 특화 배포 체크리스트

### 🔍 사전 검증 항목
- [ ] 001/002 설문 폼 정상 작동
- [ ] 관리자 대시보드 접근 가능  
- [ ] 데이터베이스 마이그레이션 완료
- [ ] Redis 세션 캐싱 정상
- [ ] 파일 업로드 기능 테스트

### 🐳 Docker 서비스 확인
- [ ] safework-app (4545 포트)
- [ ] safework-mysql (3307 포트)
- [ ] safework-redis (6380 포트)
- [ ] Docker 네트워크 연결성
- [ ] 볼륨 마운트 정상

### 📊 성능 모니터링
- [ ] 응답 시간 < 2초
- [ ] 메모리 사용량 < 1GB
- [ ] CPU 사용률 < 70%
- [ ] 디스크 여유 공간 > 20%

### 🚨 알림 및 모니터링
```bash
# 배포 완료 알림
echo "✅ SafeWork 배포 완료: $(date)"
echo "🌐 서비스 URL: https://safework.jclee.me"
echo "📊 헬스체크: https://safework.jclee.me/health"
echo "🔧 관리자: https://safework.jclee.me/admin"
```

**문제 발생시 즉시 롤백하고 이슈를 생성합니다.**