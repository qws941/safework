# SafeWork 개발 시스템자동 Makefile
# 한국 산업안전보건관리시스템

.PHONY: help setup build test lint format clean deploy logs health

# 기본 설정
SHELL := /bin/bash
PYTHON := python3
PIP := pip3
DOCKER := docker
COMPOSE := docker-compose

# 색상 출력을 위한 설정
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color
BOLD := \033[1m

# 프로젝트 정보
PROJECT_NAME := safework
VERSION := $(shell grep "version" app/config.py | head -1 | cut -d'"' -f2)
REGISTRY := registry.jclee.me

##@ Help
help: ## 사용 가능한 명령어 목록 표시
	@echo "$(BOLD)SafeWork 개발 도구$(NC)"
	@echo "$(GREEN)사용법: make [명령어]$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "\n사용 가능한 명령어:\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BOLD)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ 개발 환경 설정
setup: ## 개발 환경 초기 설정
	@echo "$(GREEN)🚀 SafeWork 개발 환경 설정 시작$(NC)"
	@echo "$(YELLOW)Python 가상환경 생성...$(NC)"
	cd src/app && python3 -m venv venv
	cd src/app && source venv/bin/activate && pip install --upgrade pip
	cd src/app && source venv/bin/activate && pip install -r requirements.txt
	@echo "$(GREEN)✅ 개발 환경 설정 완료$(NC)"

install: ## Python 의존성 설치
	@echo "$(GREEN)📦 의존성 설치 중...$(NC)"
	cd src/app && source venv/bin/activate && pip install -r requirements.txt
	@echo "$(GREEN)✅ 의존성 설치 완료$(NC)"

upgrade: ## 의존성 업그레이드
	@echo "$(YELLOW)📦 의존성 업그레이드 중...$(NC)"
	cd src/app && source venv/bin/activate && pip install --upgrade -r requirements.txt
	@echo "$(GREEN)✅ 의존성 업그레이드 완료$(NC)"

##@ 코드 품질
format: ## 코드 포매팅 (Black + isort)
	@echo "$(GREEN)🎨 코드 포매팅 실행...$(NC)"
	cd src/app && source venv/bin/activate && black . --line-length 88
	@echo "$(GREEN)✅ 코드 포매팅 완료$(NC)"

lint: ## 코드 린트 검사 (Flake8)
	@echo "$(GREEN)🔍 코드 린트 검사 실행...$(NC)"
	cd src/app && source venv/bin/activate && flake8 . --max-line-length=88 --extend-ignore=E203,W503
	@echo "$(GREEN)✅ 코드 린트 검사 완료$(NC)"

check: format lint ## 코드 품질 전체 검사
	@echo "$(GREEN)✅ 모든 코드 품질 검사 통과$(NC)"

##@ 테스트
test: ## 전체 테스트 실행
	@echo "$(GREEN)🧪 테스트 실행...$(NC)"
	./scripts/test_runner.sh

test-integration: ## 통합 테스트 실행
	@echo "$(GREEN)🔗 통합 테스트 실행...$(NC)"
	curl -s $${LOCAL_URL:-http://localhost:4545}/health || echo "$(RED)❌ 서버가 실행되지 않음$(NC)"

test-api: ## API 엔드포인트 테스트
	@echo "$(GREEN)🌐 API 테스트 실행...$(NC)"
	@echo "Production Health Check:"
	@curl -s $${PRD_URL:-https://safework.jclee.me}/health | jq '.' || echo "$(RED)Production API 접근 불가$(NC)"
	@echo "Local Health Check:"
	@curl -s $${LOCAL_URL:-http://localhost:4545}/health | jq '.' || echo "$(RED)Local API 접근 불가$(NC)"

##@ Docker & 컨테이너
build: ## Docker 이미지 빌드
	@echo "$(GREEN)🐳 Docker 이미지 빌드...$(NC)"
	$(DOCKER) build -t $(PROJECT_NAME)/app:latest ./src/app
	$(DOCKER) build -t $(PROJECT_NAME)/postgres:latest ./infrastructure/docker/postgres
	$(DOCKER) build -t $(PROJECT_NAME)/redis:latest ./infrastructure/docker/redis
	@echo "$(GREEN)✅ Docker 이미지 빌드 완료$(NC)"

up: ## 개발 서버 시작 (Docker Compose)
	@echo "$(GREEN)🚀 개발 서버 시작...$(NC)"
	cd infrastructure && $(COMPOSE) up -d
	@echo "$(GREEN)✅ 서버 시작됨 - $${LOCAL_URL:-http://localhost:4545}$(NC)"

down: ## 개발 서버 중지
	@echo "$(YELLOW)🛑 개발 서버 중지...$(NC)"
	cd infrastructure && $(COMPOSE) down
	@echo "$(GREEN)✅ 서버 중지 완료$(NC)"

restart: ## 고도화된 SafeWork 컨테이너 재시작 (건강 상태 모니터링 포함)
	@echo "$(GREEN)🔄 SafeWork 고도화 재시작...$(NC)"
	./tools/scripts/safework_restart_advanced.sh restart

restart-simple: down up ## 기본 개발 서버 재시작

logs: ## 애플리케이션 로그 확인
	@echo "$(GREEN)📋 로그 확인 중...$(NC)"
	./scripts/safework_ops_unified.sh logs live

logs-errors: ## 에러 로그만 확인
	@echo "$(GREEN)🚨 에러 로그 확인 중...$(NC)"
	./scripts/safework_ops_unified.sh logs errors all

##@ 데이터베이스
db-migrate: ## 데이터베이스 마이그레이션 실행
	@echo "$(GREEN)🗄️ 데이터베이스 마이그레이션...$(NC)"
	$(DOCKER) exec -it safework-app python migrate.py migrate
	@echo "$(GREEN)✅ 마이그레이션 완료$(NC)"

db-status: ## 마이그레이션 상태 확인
	@echo "$(GREEN)📊 마이그레이션 상태 확인...$(NC)"
	$(DOCKER) exec -it safework-app python migrate.py status

db-shell: ## PostgreSQL 셸 접속
	@echo "$(GREEN)🐘 PostgreSQL 셸 접속...$(NC)"
	$(DOCKER) exec -it safework-postgres psql -U safework -d safework_db

db-backup: ## 데이터베이스 백업
	@echo "$(GREEN)💾 데이터베이스 백업...$(NC)"
	$(DOCKER) exec safework-postgres pg_dump -U safework -d safework_db > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✅ 백업 완료$(NC)"

##@ 배포 & 운영 (근본 해결책 적용)
deploy: ## Production 배포 (환경별 구성 기반, 하드코딩 제거)
	@echo "$(GREEN)🚀 SafeWork 근본 해결책 배포...$(NC)"
	@echo "$(YELLOW)📋 환경별 구성 기반 시스템자동 배포$(NC)"
	cd scripts && python3 safework_root_solution.py deploy --environment production

deploy-dev: ## Development 환경 배포
	@echo "$(GREEN)🏠 Development 환경 배포...$(NC)"
	cd scripts && python3 safework_root_solution.py deploy --environment development

deploy-force: ## 강제 재생성 배포
	@echo "$(GREEN)🔄 강제 재생성 배포...$(NC)"
	cd scripts && python3 safework_root_solution.py deploy --environment production --force

deploy-validate: ## 배포 전 환경 검증
	@echo "$(GREEN)🔍 배포 환경 검증...$(NC)"
	cd scripts && python3 safework_root_solution.py validate --environment production

deploy-local: ## 로컬 배포 실행
	@echo "$(GREEN)🏠 로컬 배포 실행...$(NC)"
	./scripts/safework_ops_unified.sh deploy local

deploy-github: ## GitHub Actions 배포 트리거
	@echo "$(GREEN)🐙 GitHub Actions 배포 트리거...$(NC)"
	git add . && git commit -m "Deploy: Trigger production deployment via GitHub Actions" && git push origin master

deploy-status: ## 배포 상태 확인 (Portainer API)
	@echo "$(GREEN)📊 배포 상태 확인...$(NC)"
	./scripts/portainer_deployment_stable.sh status

deploy-health: ## 프로덕션 헬스 체크
	@echo "$(GREEN)🏥 프로덕션 헬스 체크...$(NC)"
	./scripts/portainer_deployment_stable.sh health

deploy-ops: ## 포테이너 운영 배포 (전체 시스템)
	@echo "$(GREEN)🚀 포테이너 운영 배포 실행...$(NC)"
	./scripts/portainer_operations_deploy.sh deploy

deploy-ops-status: ## 포테이너 운영 배포 상태 확인
	@echo "$(GREEN)📊 운영 배포 상태 확인...$(NC)"
	./scripts/portainer_operations_deploy.sh status

deploy-ops-restart: ## 포테이너 운영 시스템 재시작
	@echo "$(GREEN)🔄 운영 시스템 재시작...$(NC)"
	./scripts/portainer_operations_deploy.sh restart

deploy-ops-stop: ## 포테이너 운영 시스템 중지
	@echo "$(YELLOW)🛑 운영 시스템 중지...$(NC)"
	./scripts/portainer_operations_deploy.sh stop

deploy-ops-postgres: ## PostgreSQL만 운영 배포
	@echo "$(GREEN)🐘 PostgreSQL 운영 배포...$(NC)"
	./scripts/portainer_operations_deploy.sh postgres

deploy-ops-redis: ## Redis만 운영 배포
	@echo "$(GREEN)🔴 Redis 운영 배포...$(NC)"
	./scripts/portainer_operations_deploy.sh redis

deploy-ops-app: ## SafeWork App만 운영 배포
	@echo "$(GREEN)📱 SafeWork App 운영 배포...$(NC)"
	./scripts/portainer_operations_deploy.sh app

deploy-ops-monitor: ## 포테이너 운영 시스템 종합 모니터링
	@echo "$(GREEN)📊 포테이너 운영 시스템 모니터링...$(NC)"
	./scripts/portainer_operations_deploy.sh monitor

deploy-ops-optimize: ## 포테이너 운영 시스템 최적화
	@echo "$(GREEN)⚡ 포테이너 운영 시스템 최적화...$(NC)"
	./scripts/portainer_operations_deploy.sh optimize

deploy-ops-health: ## SafeWork 애플리케이션 헬스 체크
	@echo "$(GREEN)🏥 SafeWork 애플리케이션 헬스 체크...$(NC)"
	./scripts/portainer_operations_deploy.sh health

status: ## 시스템 상태 확인
	@echo "$(GREEN)📊 시스템 상태 확인...$(NC)"
	./scripts/safework_ops_unified.sh deploy status

health: ## 시스템 건강 상태 체크
	@echo "$(GREEN)🏥 건강 상태 체크...$(NC)"
	./scripts/safework_ops_unified.sh monitor health

monitor: ## 시스템 모니터링
	@echo "$(GREEN)👀 시스템 모니터링...$(NC)"
	./scripts/safework_ops_unified.sh monitor overview

##@ Portainer 고급 관리
portainer: ## Portainer 고급 관리 도구 실행 (대화형 메뉴)
	@echo "$(GREEN)🐳 Portainer 고급 관리 도구$(NC)"
	./tools/scripts/portainer_advanced.sh

portainer-status: ## Portainer 컨테이너 상태 확인
	@echo "$(GREEN)📊 Portainer 컨테이너 상태$(NC)"
	./tools/scripts/portainer_advanced.sh summary

portainer-logs: ## Portainer 로그 조회 (대화형)
	@echo "$(GREEN)📋 Portainer 로그 조회$(NC)"
	./tools/scripts/portainer_advanced.sh logs

portainer-monitor: ## Portainer 리소스 모니터링
	@echo "$(GREEN)📈 Portainer 리소스 모니터링$(NC)"
	./tools/scripts/portainer_advanced.sh monitor

portainer-report: ## Portainer 시스템 보고서 생성
	@echo "$(GREEN)📄 Portainer 시스템 보고서$(NC)"
	./tools/scripts/portainer_advanced.sh report

portainer-health: ## Portainer 건강 상태 종합 체크
	@echo "$(GREEN)🏥 Portainer 건강 상태 체크$(NC)"
	./tools/scripts/portainer_advanced.sh health

portainer-restart: ## SafeWork 컨테이너 재시작 (Portainer API)
	@echo "$(GREEN)🔄 SafeWork 컨테이너 재시작$(NC)"
	./tools/scripts/portainer_advanced.sh restart safework-app
	./tools/scripts/portainer_advanced.sh restart safework-postgres
	./tools/scripts/portainer_advanced.sh restart safework-redis

##@ 고도화된 재시작 시스템
restart-app: ## App 컨테이너만 재시작 (건강 상태 모니터링)
	@echo "$(GREEN)🔄 App 컨테이너 재시작...$(NC)"
	./tools/scripts/safework_restart_advanced.sh restart-app

restart-db: ## PostgreSQL 컨테이너만 재시작 (건강 상태 모니터링)
	@echo "$(GREEN)🔄 PostgreSQL 컨테이너 재시작...$(NC)"
	./tools/scripts/safework_restart_advanced.sh restart-db

restart-redis: ## Redis 컨테이너만 재시작 (건강 상태 모니터링)
	@echo "$(GREEN)🔄 Redis 컨테이너 재시작...$(NC)"
	./tools/scripts/safework_restart_advanced.sh restart-redis

restart-emergency: ## 긴급 복구 재시작 (전체 시스템 복구)
	@echo "$(RED)🚨 긴급 복구 재시작...$(NC)"
	./tools/scripts/safework_restart_advanced.sh emergency

restart-status: ## 재시작 후 상태 확인
	@echo "$(GREEN)📊 재시작 상태 확인...$(NC)"
	./tools/scripts/safework_restart_advanced.sh status

restart-health: ## 재시작 후 상세 건강 상태 체크
	@echo "$(GREEN)🏥 재시작 건강 상태 체크...$(NC)"
	./tools/scripts/safework_restart_advanced.sh health

restart-logs: ## 재시작 관련 로그 확인
	@echo "$(GREEN)📋 재시작 로그 확인...$(NC)"
	./tools/scripts/safework_restart_advanced.sh logs

##@ 모니터링 시스템
monitoring: ## 실시간 모니터링 시작 (Portainer 기반)
	@echo "$(GREEN)👀 SafeWork 실시간 모니터링 시작...$(NC)"
	./tools/scripts/safework_monitoring_advanced.sh monitor

monitoring-status: ## 현재 시스템 상태 확인
	@echo "$(GREEN)📊 시스템 상태 확인...$(NC)"
	./tools/scripts/safework_monitoring_advanced.sh status

monitoring-health: ## 상세 건강 상태 및 성능 점검
	@echo "$(GREEN)🏥 상세 건강 상태 점검...$(NC)"
	./tools/scripts/safework_monitoring_advanced.sh health

monitoring-performance: ## 성능 메트릭 확인
	@echo "$(GREEN)📈 성능 메트릭 확인...$(NC)"
	./tools/scripts/safework_monitoring_advanced.sh performance

monitoring-logs: ## 컨테이너 로그 분석
	@echo "$(GREEN)📋 컨테이너 로그 분석...$(NC)"
	./tools/scripts/safework_monitoring_advanced.sh logs

test-slack: ## 슬랙 알림 테스트
	@echo "$(GREEN)📱 슬랙 알림 테스트...$(NC)"
	./tools/scripts/safework_monitoring_advanced.sh test-slack

emergency-alert: ## 긴급 상황 슬랙 알림 발송
	@echo "$(RED)🚨 긴급 상황 알림 발송...$(NC)"
	./tools/scripts/safework_monitoring_advanced.sh emergency

##@ 개발 도구
shell: ## Flask 애플리케이션 셸 실행
	@echo "$(GREEN)🐍 Flask 셸 실행...$(NC)"
	cd src/app && source venv/bin/activate && flask shell

routes: ## Flask 라우트 목록 확인
	@echo "$(GREEN)🛣️ Flask 라우트 확인...$(NC)"
	cd src/app && source venv/bin/activate && flask routes

validate: ## 프로젝트 구조 검증
	@echo "$(GREEN)🔍 프로젝트 구조 검증...$(NC)"
	./scripts/pipeline_validator.sh

##@ 청소 & 유지보수
clean: ## 빌드 아티팩트 및 캐시 정리
	@echo "$(GREEN)🧹 프로젝트 정리...$(NC)"
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	$(DOCKER) system prune -f
	@echo "$(GREEN)✅ 정리 완료$(NC)"

clean-all: clean ## 전체 정리 (이미지 포함)
	@echo "$(YELLOW)🧹 전체 정리 (Docker 이미지 포함)...$(NC)"
	$(DOCKER) image prune -a -f
	$(DOCKER) volume prune -f
	@echo "$(GREEN)✅ 전체 정리 완료$(NC)"

backup: ## 전체 시스템 백업
	@echo "$(GREEN)💾 시스템 백업...$(NC)"
	./scripts/safework_ops_unified.sh utils backup

##@ 정보 표시
info: ## 프로젝트 정보 표시
	@echo "$(BOLD)SafeWork 프로젝트 정보$(NC)"
	@echo "프로젝트명: $(PROJECT_NAME)"
	@echo "버전: $(VERSION)"
	@echo "레지스트리: $(REGISTRY)"
	@echo "Python 버전: $(shell python3 --version)"
	@echo "Docker 버전: $(shell docker --version)"
	@echo ""
	@echo "$(GREEN)주요 URL:$(NC)"
	@echo "  로컬 개발: $${LOCAL_URL:-http://localhost:4545}"
	@echo "  프로덕션: $${PRD_URL:-https://safework.jclee.me}"
	@echo "  헬스 체크: $${PRD_URL:-https://safework.jclee.me}/health"

##@ 개발자 도구
dev-setup: setup ## 개발자를 위한 전체 환경 설정
	@echo "$(GREEN)👨‍💻 개발자 환경 설정...$(NC)"
	@echo "$(YELLOW)Git hooks 설정...$(NC)"
	cp tools/git-hooks/pre-commit .git/hooks/pre-commit
	chmod +x .git/hooks/pre-commit
	@echo "$(GREEN)✅ 개발자 환경 설정 완료$(NC)"

pre-commit: check test ## 커밋 전 검사 실행
	@echo "$(GREEN)✅ 커밋 준비 완료$(NC)"

# 기본 타겟
.DEFAULT_GOAL := help