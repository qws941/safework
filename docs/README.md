# SafeWork 문서 통합 가이드

이 디렉토리는 SafeWork 프로젝트의 통합 문서 시스템입니다.

## 📚 문서 구조

### 핵심 문서
- **[메인 README.md](../README.md)** - 프로젝트 개요 및 빠른 시작
- **[CLAUDE.md](../CLAUDE.md)** - 개발 환경 설정 및 가이드
- **[PORTAINER_GITOPS.md](../PORTAINER_GITOPS.md)** - GitOps 배포 가이드

### 개발 가이드
- **[개발 가이드](development/README.md)** - 개발 환경 설정 및 패턴
- **[배포 가이드](deployment/README.md)** - 배포 절차 및 관리
- **[프로젝트 구조](development/project-structure.md)** - 코드 구조 설명
- **[변경 로그](development/CHANGELOG.md)** - 프로젝트 변경 이력

### 시스템 아키텍처
- **[시스템 개요](architecture/system-overview.md)** - 전체 시스템 아키텍처
- **[Portainer 통합](portainer/)** - 컨테이너 관리 가이드
- **[검증 시스템](validation/)** - 자동화된 검증 절차

### 운영 가이드
- **[환경 변수](ENVIRONMENT_VARIABLES.md)** - 설정 관리
- **[로깅](development/logging.md)** - 로그 관리 및 모니터링
- **[GitHub 비밀](development/github-secrets-setup.md)** - CI/CD 설정

## 🎯 빠른 참조

### 개발자용
```bash
# 개발 환경 설정
make setup
make up
make health

# 코드 품질 검사
make format
make lint
make test
```

### 운영자용
```bash
# 배포 상태 확인
./scripts/portainer_stack_deploy.sh status
curl https://safework.jclee.me/health

# 배포 실행
./scripts/portainer_stack_deploy.sh deploy
```

## 📖 추가 정보

상세한 정보는 각 문서를 참조하세요:
- 기술적 세부사항: [CLAUDE.md](../CLAUDE.md)
- GitOps 워크플로우: [PORTAINER_GITOPS.md](../PORTAINER_GITOPS.md)
- API 문서: 메인 README.md의 엔드포인트 섹션
