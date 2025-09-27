# SafeWork - 산업안전보건관리시스템

[![Deployment Status](https://img.shields.io/badge/deployment-active-green)](https://safework.jclee.me)
[![Health Check](https://img.shields.io/badge/health-monitoring-blue)](https://safework.jclee.me/health)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> 한국 건설/산업 환경을 위한 종합 산업안전보건관리시스템  
> Flask 3.0+, PostgreSQL 15+, Redis 7.0, Cloudflare Workers 기반

## 🌟 주요 기능

- **📋 설문조사 시스템**: 근골격계부담작업 유해요인조사 등 전문 설문
- **🔍 Excel 처리**: 자동화된 Excel 파일 분석 및 설문 구조 추출
- **👥 관리자 패널**: 실시간 데이터 관리 및 보고서 생성
- **🌐 Edge API**: Cloudflare Workers 기반 글로벌 성능 최적화
- **📊 실시간 모니터링**: 헬스체크 및 성능 대시보드

## 🚀 Quick Start

### 🐳 Docker 환경 (추천)
```bash
# 컨테이너 시작
docker-compose up -d

# 상태 확인
curl http://localhost:4545/health

# 로그 확인
docker-compose logs -f safework-app
```

### 🔧 로컬 개발
```bash
# Flask 앱 실행
cd app/
python app.py

# Workers 개발 서버
cd workers/
npm run dev
```

## 📁 프로젝트 구조

```
safework/
├── 🏢 app/              # Flask 웹 애플리케이션
│   ├── routes/          # API 라우트 (Blueprint 패턴)
│   ├── models/          # 데이터베이스 모델
│   ├── templates/       # Jinja2 템플릿
│   └── static/          # 정적 파일
├── ⚡ workers/          # Cloudflare Workers
│   ├── src/routes/      # Edge API 핸들러
│   └── wrangler.toml    # Cloudflare 설정
├── 🗄️ postgres/        # PostgreSQL 설정
├── 🔄 redis/           # Redis 캐시 설정
├── 📜 scripts/         # 배포/유틸리티 스크립트
├── 📊 data/            # 설문조사 양식 데이터
└── 📚 docs/            # 프로젝트 문서
```

## 🏗️ 아키텍처

### 🌐 하이브리드 아키텍처
```
[Client] → [Cloudflare Workers] → [Flask Backend] → [PostgreSQL/Redis]
            ↓
         [KV Storage]
```

- **Frontend**: Cloudflare Workers (Edge Processing)
- **Backend**: Flask 3.0+ (Python)
- **Database**: PostgreSQL 15+ (Primary), Redis 7.0 (Cache)
- **Deployment**: Docker + GitHub Actions + Portainer

### 🔄 배포 파이프라인 (2024.9)
```bash
git push origin master
    ↓
GitHub Actions (병렬 빌드)
    ↓
registry.jclee.me (이미지 저장)
    ↓
Portainer Webhook (자동 배포)
    ↓
Health Check (15회 검증)
```

## 🚀 배포 및 운영

### 🔄 자동 배포
```bash
# GitHub Actions 자동 배포 (추천)
git push origin master

# 수동 배포 스크립트
./scripts/intelligent_deployment.sh auto
./scripts/deployment_monitor.sh check --verbose
```

### 📊 모니터링
```bash
# 서비스 상태 확인
curl https://safework.jclee.me/health

# 실시간 모니터링
./scripts/deployment_monitor.sh monitor
```

### 🛠️ 개발 도구
```bash
# 코드 품질
cd app/
black . --line-length 88    # 코드 포맷팅
flake8 .                     # 린팅

# Workers 개발
cd workers/
npm run lint:fix             # ESLint 자동 수정
npm test                     # 테스트 실행
npm run deploy               # 배포
```

## 🔗 Production URLs

| 서비스 | URL | 설명 |
|--------|-----|------|
| 🌐 **메인** | https://safework.jclee.me | 메인 웹 서비스 |
| 🔧 **API** | https://safework.jclee.me/api | RESTful API |
| 👥 **관리자** | https://safework.jclee.me/admin | 관리자 패널 |
| 📋 **설문** | https://safework.jclee.me/survey/002_* | 설문조사 |
| 📊 **Excel API** | https://safework.jclee.me/api/excel | Excel 처리 API |
| 💚 **Health** | https://safework.jclee.me/health | 상태 확인 |

## 🛡️ 보안 및 환경설정

### 🔑 필수 환경변수
```bash
FLASK_CONFIG=production
DB_NAME=safework_db          # 중요: safework_db (safework 아님)
DB_PASSWORD=<secure-password>
SECRET_KEY=<strong-random-key>
TZ=Asia/Seoul               # 한국 시간대
```

### 🔐 GitHub Secrets
- `PORTAINER_USERNAME`, `PORTAINER_PASSWORD`
- `REGISTRY_PASSWORD`, `DB_PASSWORD`
- `SECRET_KEY`, `ADMIN_PASSWORD`

## 📚 문서

| 문서 | 설명 |
|------|------|
| [📋 프로젝트 구조](docs/PROJECT_STRUCTURE.md) | 상세 아키텍처 설명 |
| [🔗 API 엔드포인트](docs/URL_ENDPOINTS.md) | API 명세서 |
| [☁️ Cloudflare 배포](docs/CLOUDFLARE_DEPLOYMENT.md) | Workers 배포 가이드 |
| [🔄 마이그레이션](docs/MIGRATION-SUMMARY.md) | 시스템 마이그레이션 히스토리 |

## 🏥 상태 확인

### 🔍 헬스체크
```bash
# 전체 시스템 상태
curl https://safework.jclee.me/health

# 개별 컴포넌트 확인
curl https://safework.jclee.me/api/auth/health  # Workers
docker-compose ps                                # 컨테이너
```

### 📊 성능 모니터링
- **Database**: 60회 재시도 로직, 연결 풀링
- **Cache**: Redis 헬스체크, 우아한 성능 저하
- **Edge**: Cloudflare Workers 글로벌 성능
- **Logging**: JSON 구조화 로그, Loki 호환

## 🚨 문제 해결

### 일반적인 이슈
| 문제 | 해결방법 |
|------|----------|
| DB 연결 실패 | `DB_NAME=safework_db` 확인 |
| 관리자 패널 404 | `/admin/safework` 리다이렉트 확인 |
| 배포 실패 | Webhook URL 또는 `./scripts/webhook-deploy.sh` |
| 컨테이너 시작 실패 | DB/Redis 연결성, `docker-compose logs app` |

### 🆘 지원
- **이슈 리포트**: GitHub Issues
- **문서**: `/docs` 디렉토리
- **로그**: `docker-compose logs -f`
- **모니터링**: https://safework.jclee.me/health

---

<div align="center">

**🏗️ Built with ❤️ for Korean Industrial Safety**

[![Flask](https://img.shields.io/badge/Flask-3.0+-green)](https://flask.palletsprojects.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-blue)](https://www.docker.com/)

</div>