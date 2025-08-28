# SafeWork - 근골격계 증상조사표 시스템

PDF 001 근골격계 증상조사표를 정확하게 구현한 온라인 증상조사 시스템 (v1.0.2)

## 🎯 주요 업데이트 (v1.0.2)

- ✅ PDF 001 근골격계 증상조사표 정확 구현
- ✅ 모든 PDF 필드 완벽 반영
- ✅ 비표준 파일명 제거 및 코드 정리
- ✅ 헬스체크 엔드포인트 추가
- ✅ CI/CD 워크플로우 구축

## 🚀 특징

- 📄 **PDF 정확 구현**: 001 근골격계 증상조사표와 100% 일치
- 📱 **모바일 최적화**: 반응형 웹 디자인
- 🚫 **익명 제출**: 로그인 없이 작성 가능
- 📊 **실시간 통계**: 관리자 대시보드
- 📋 **Excel 내보내기**: 데이터 분석 지원
- 🔒 **안전한 데이터 관리**: 개인정보 보호
- 🔄 **Watchtower 자동 배포**: 무중단 업데이트

## 🛠️ 기술 스택

- **Backend**: Python Flask
- **Database**: MySQL 8.0
- **Cache**: Redis
- **Container**: Docker
- **Registry**: registry.jclee.me
- **Auto Deploy**: Watchtower

## 📦 Docker 이미지

```
registry.jclee.me/safework/app:latest     # 포트 4545
registry.jclee.me/safework/mysql:latest   # 포트 3306
registry.jclee.me/safework/redis:latest   # 포트 6379
```

## 🚀 배포

### 1. 자동 배포 (Watchtower)

```bash
# 실행 스크립트 사용
./docker-run.sh
```

Watchtower가 5분마다 이미지 업데이트를 확인하고 자동으로 재배포합니다.

### 2. 수동 빌드 및 배포

```bash
# 이미지 빌드
./build.sh

# 레지스트리 푸시
docker login registry.jclee.me -u admin -p bingogo1
docker push registry.jclee.me/safework/app:latest
docker push registry.jclee.me/safework/mysql:latest
docker push registry.jclee.me/safework/redis:latest
```

## 📱 사용 방법

1. 브라우저에서 `http://서버주소:4545` 접속
2. 증상조사표 작성
3. 관리자는 `/admin`으로 접속하여 데이터 관리

### 기본 계정
- 관리자: `admin` / `safework2024`

## 🗂️ 프로젝트 구조

```
safework/
├── app/                    # Flask 애플리케이션
│   ├── models.py          # 데이터베이스 모델
│   ├── routes/            # 라우트 정의
│   ├── templates/         # HTML 템플릿
│   └── Dockerfile         # App 컨테이너
├── mysql/                 # MySQL 설정
│   └── Dockerfile        
├── redis/                 # Redis 설정
│   └── Dockerfile        
└── .github/workflows/     # CI/CD 파이프라인
    └── deploy.yml
```

## 🔧 환경 변수

모든 환경 변수는 Dockerfile에 정의되어 있습니다:

- `MYSQL_HOST`: safework-mysql
- `MYSQL_DATABASE`: safework_db
- `REDIS_HOST`: safework-redis
- `APP_PORT`: 4545

## 📊 주요 기능

### 사용자
- 증상조사표 온라인 작성
- PDF 양식 다운로드
- 제출 이력 확인

### 관리자
- 제출 데이터 조회/검색
- Excel 다운로드
- 통계 분석
- 고위험군 모니터링

## 🛡️ 보안

- JWT 기반 인증
- 데이터 암호화
- 감사 로그
- IP 기반 접근 제어

## 📈 버전 히스토리

### v1.0.2 (2024-08-28)
- PDF 001 근골격계 증상조사표 정확 구현
- 비표준 파일명 제거 (backup, correct, new_ 등)
- 헬스체크 엔드포인트 추가 (/health)
- GitHub Actions CI/CD 파이프라인 구축

### v1.0.1 (2024-08-27)
- Docker 헬스체크 최적화
- 오류 템플릿 추가 (404, 500)

### v1.0.0 (2024-08-27)
- 초기 릴리즈
- 기본 설문조사 기능 구현

## 📝 라이센스

Proprietary - SafeWork 2024