# SafeWork Portainer GitOps 설정 가이드

## 파이프라인 아키텍처

```
코드 수정 → 로컬 테스트 → git push → GitHub Actions (이미지 빌드+푸시) → Portainer GitOps (자동 배포)
```

## 1. GitHub Actions (이미지 빌드+푸시만)

GitHub Actions는 다음 작업만 수행:
- Docker 이미지 빌드 (app, postgres, redis)
- registry.jclee.me에 이미지 푸시
- 배포는 Portainer GitOps가 담당

## 2. Portainer GitOps 설정

### Portainer Stack 생성/수정

1. **Portainer 대시보드 접속**
   - URL: https://portainer.jclee.me
   - 로그인 후 Endpoint 3 (Production) 선택

2. **GitOps Stack 생성**
   ```
   Stack Name: safework-gitops
   Repository URL: https://github.com/qws941/safework.git
   Repository Reference: refs/heads/master
   Compose Path: docker-compose.yml
   ```

3. **Environment Variables 설정**
   ```
   POSTGRES_PASSWORD=<production-password>
   SECRET_KEY=<production-secret>
   ADMIN_PASSWORD=<admin-password>
   POSTGRES_DB=safework_db
   POSTGRES_USER=safework
   ADMIN_USERNAME=admin
   FLASK_ENV=production
   ```

4. **Auto-update 설정**
   - ✅ Enable automatic updates
   - ✅ Re-pull image and redeploy
   - Fetch interval: 5m (5분마다 Git repository 확인)

### GitOps 워크플로우

1. **코드 변경**
   ```bash
   # 로컬에서 수정 후 테스트
   make test
   make health
   ```

2. **Git Push**
   ```bash
   git add .
   git commit -m "feat: 새로운 기능 추가"
   git push origin master
   ```

3. **자동 빌드** (GitHub Actions)
   - 이미지 빌드: registry.jclee.me/safework/{app,postgres,redis}:latest
   - 이미지 푸시 완료

4. **자동 배포** (Portainer GitOps)
   - 5분 이내에 Git repository 변경 감지
   - docker-compose.yml 기반으로 자동 배포
   - 최신 이미지 자동 pull 및 재시작

## 3. 환경변수 관리

### .env.example 참조
프로젝트 루트의 `.env.example` 파일 참조하여 Portainer에서 환경변수 설정

### 보안 변수
- `POSTGRES_PASSWORD`: 데이터베이스 비밀번호
- `SECRET_KEY`: Flask 보안 키
- `ADMIN_PASSWORD`: 관리자 비밀번호

## 4. 모니터링

### 배포 확인
```bash
# 헬스 체크
curl https://safework.jclee.me/health

# 컨테이너 상태 확인 (Portainer UI)
# 로그 확인 (Portainer Logs)
```

### 롤백
문제 발생 시 Portainer UI에서 이전 스택 설정으로 롤백 가능

## 5. 장점

- **완전 자동화**: 코드 푸시 후 5분 이내 자동 배포
- **하드코딩 제거**: 모든 설정은 환경변수로 관리
- **GitOps 원칙**: Git이 유일한 진실의 소스
- **간단한 롤백**: Portainer UI에서 쉬운 버전 관리
- **보안**: 민감한 정보는 Portainer 환경변수로 안전 관리