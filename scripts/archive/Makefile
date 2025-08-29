# SafeWork 프로젝트 Makefile

.PHONY: help deploy release local up down logs clean

# 기본값
VERSION ?= $(shell date +%Y%m%d.%H%M)
REGISTRY = registry.jclee.me/safework

help: ## 도움말 표시
	@echo "SafeWork 배포 명령어:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "예시:"
	@echo "  make deploy          # 자동 버전으로 배포"
	@echo "  make release v=1.2.0 # 특정 버전으로 릴리즈"
	@echo "  make local           # 로컬 빌드 및 배포"

deploy: ## 자동 버전으로 GitHub Actions 배포
	@echo "🚀 GitHub Actions 배포 시작..."
	@./trigger-deploy.sh

release: ## 태그 릴리즈 (사용법: make release v=1.2.0)
	@if [ -z "$(v)" ]; then echo "❌ 버전을 지정하세요: make release v=1.2.0"; exit 1; fi
	@echo "🏷️ 릴리즈 태그 생성: v$(v)"
	@echo $(v) > app/VERSION
	@git add app/VERSION
	@git commit -m "chore: bump version to v$(v)" || true
	@git tag v$(v)
	@git push origin main
	@git push origin v$(v)
	@echo "✅ 릴리즈 완료: v$(v)"

local: ## 로컬 빌드 및 배포
	@echo "🔧 로컬 배포 시작..."
	@VERSION_LOCAL=$$(date +%Y%m%d-%H%M%S) && \
	echo local-$$VERSION_LOCAL > app/VERSION && \
	docker build -t $(REGISTRY)/app:local-$$VERSION_LOCAL app/ && \
	docker tag $(REGISTRY)/app:local-$$VERSION_LOCAL $(REGISTRY)/app:latest && \
	docker rm -f safework-app 2>/dev/null || true && \
	docker run -d --name safework-app --network safework-net \
		--restart unless-stopped -v safework-uploads:/app/uploads \
		-p 4545:4545 $(REGISTRY)/app:latest && \
	echo "✅ 로컬 배포 완료: local-$$VERSION_LOCAL"

up: ## Docker Compose 시작
	@echo "🐳 Docker Compose 시작..."
	@./docker-compose-up.sh

down: ## Docker Compose 중지
	@echo "🛑 Docker Compose 중지..."
	@./docker-compose-down.sh

logs: ## 앱 로그 보기
	@docker logs -f safework-app

clean: ## 사용하지 않는 Docker 이미지 정리
	@echo "🧹 Docker 이미지 정리..."
	@docker system prune -f
	@docker rmi $$(docker images -f "dangling=true" -q) 2>/dev/null || true
	@echo "✅ 정리 완료"

status: ## 서비스 상태 확인
	@echo "📊 SafeWork 서비스 상태:"
	@echo ""
	@echo "컨테이너 상태:"
	@docker ps | grep safework || echo "  실행 중인 SafeWork 컨테이너가 없습니다."
	@echo ""
	@echo "앱 상태:"
	@curl -s http://localhost:4545/health 2>/dev/null && echo "" || echo "  앱이 응답하지 않습니다."
	@echo ""
	@echo "현재 버전:"
	@cat app/VERSION 2>/dev/null || echo "  VERSION 파일이 없습니다."

dev: ## 개발 모드 실행
	@echo "💻 개발 모드 시작..."
	@cd app && python app.py

# 브랜치 관리
branch-feature: ## 새 기능 브랜치 생성 (사용법: make branch-feature name=기능명)
	@if [ -z "$(name)" ]; then echo "❌ 기능 이름을 지정하세요: make branch-feature name=mobile-fix"; exit 1; fi
	@./scripts/branch-helper.sh feature $(name)

branch-hotfix: ## 핫픽스 브랜치 생성 (사용법: make branch-hotfix name=버그명)
	@if [ -z "$(name)" ]; then echo "❌ 핫픽스 이름을 지정하세요: make branch-hotfix name=security-patch"; exit 1; fi
	@./scripts/branch-helper.sh hotfix $(name)

branch-release: ## 릴리즈 브랜치 생성 (사용법: make branch-release v=1.3.0)
	@if [ -z "$(v)" ]; then echo "❌ 버전을 지정하세요: make branch-release v=1.3.0"; exit 1; fi
	@./scripts/branch-helper.sh release $(v)

branch-cleanup: ## 병합된 브랜치 정리
	@./scripts/branch-helper.sh cleanup

branch-status: ## 브랜치 상태 확인
	@./scripts/branch-helper.sh status

branch-sync: ## 브랜치 동기화
	@./scripts/branch-helper.sh sync

# 배포 환경별 명령어
deploy-dev: ## 개발 환경 배포 (develop 브랜치)
	@echo "🔧 개발 환경 배포 시작..."
	@git checkout develop || (echo "❌ develop 브랜치가 없습니다. 먼저 생성하세요." && exit 1)
	@git push origin develop
	@echo "✅ 개발 환경 배포 트리거 완료"

deploy-staging: ## 스테이징 환경 배포 (staging 브랜치)
	@echo "🧪 스테이징 환경 배포 시작..."
	@git checkout staging || (echo "❌ staging 브랜치가 없습니다. 먼저 생성하세요." && exit 1)
	@git push origin staging
	@echo "✅ 스테이징 환경 배포 트리거 완료"

deploy-prod: ## 프로덕션 배포 (main 브랜치)
	@echo "🚀 프로덕션 배포 시작..."
	@echo "⚠️  프로덕션 배포는 main 브랜치에서만 가능합니다."
	@read -p "계속하시겠습니까? (y/N): " confirm && [ "$$confirm" = "y" ] || exit 1
	@git checkout main
	@git push origin main
	@echo "✅ 프로덕션 배포 트리거 완료"

# 테스트 관련
test-local: ## 로컬 테스트 실행
	@echo "🧪 로컬 테스트 실행..."
	@cd app && python -m pytest tests/ -v --cov=. --cov-report=term-missing || echo "⚠️ 테스트 실패"

test-docker: ## Docker 환경 테스트
	@echo "🐳 Docker 테스트 시작..."
	@docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit || echo "⚠️ Docker 테스트 실패"

# GitHub 관련
pr-create: ## GitHub PR 생성 도우미
	@echo "📝 GitHub PR 생성 도우미"
	@current_branch=$$(git branch --show-current) && \
	echo "현재 브랜치: $$current_branch" && \
	if [ "$$current_branch" = "main" ] || [ "$$current_branch" = "develop" ] || [ "$$current_branch" = "staging" ]; then \
		echo "❌ 주요 브랜치에서는 PR을 생성할 수 없습니다."; exit 1; \
	fi && \
	if command -v gh >/dev/null 2>&1; then \
		echo "GitHub CLI로 PR 생성..."; \
		if [[ "$$current_branch" == feature/* ]]; then \
			gh pr create --base develop --title "$$(git log -1 --pretty=%B | head -1)" --body "$$(git log -1 --pretty=%B | tail -n +2)"; \
		elif [[ "$$current_branch" == hotfix/* ]]; then \
			gh pr create --base main --title "$$(git log -1 --pretty=%B | head -1)" --body "$$(git log -1 --pretty=%B | tail -n +2)"; \
		elif [[ "$$current_branch" == release/* ]]; then \
			gh pr create --base main --title "$$(git log -1 --pretty=%B | head -1)" --body "$$(git log -1 --pretty=%B | tail -n +2)"; \
		else \
			gh pr create --base develop --title "$$(git log -1 --pretty=%B | head -1)" --body "$$(git log -1 --pretty=%B | tail -n +2)"; \
		fi; \
	else \
		echo "GitHub CLI(gh)가 설치되지 않았습니다."; \
		echo "수동으로 PR을 생성해주세요: https://github.com/$(basename $(pwd))/compare"; \
	fi

# 데이터베이스 마이그레이션
migrate-status: ## 마이그레이션 상태 확인
	@./migrate.sh status

migrate-run: ## 대기 중인 마이그레이션 실행
	@./migrate.sh migrate

migrate-create: ## 새 마이그레이션 생성 (사용법: make migrate-create desc="설명")
	@if [ -z "$(desc)" ]; then echo "❌ 설명을 입력하세요: make migrate-create desc=\"Add new table\""; exit 1; fi
	@./migrate.sh create "$(desc)"

migrate-rollback: ## 마이그레이션 롤백 (사용법: make migrate-rollback [version=002])
	@if [ -n "$(version)" ]; then \
		./migrate.sh rollback $(version); \
	else \
		./migrate.sh rollback; \
	fi

migrate-init: ## 데이터베이스 초기화 (개발용)
	@./migrate.sh init

migrate-reset: ## 데이터베이스 리셋 (주의!)
	@./migrate.sh reset

migrate-backup: ## 데이터베이스 백업
	@./migrate.sh backup

migrate-restore: ## 백업에서 복원 (사용법: make migrate-restore file=backup.sql)
	@if [ -z "$(file)" ]; then echo "❌ 백업 파일을 지정하세요: make migrate-restore file=backup.sql"; exit 1; fi
	@./migrate.sh restore "$(file)"

migrate-auto: ## 자동 마이그레이션 (상태 확인 후 필요시 실행)
	@./migrate.sh auto