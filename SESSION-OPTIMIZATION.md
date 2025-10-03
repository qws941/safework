# SafeWork 세션 최적화 완료 ✅

## 최적화 날짜
2025-10-03 09:00

## 프로젝트 정보
- **타입**: Cloudflare Workers (TypeScript) + Docker Backend
- **경로**: `/home/jclee/app/safework`
- **세션명**: `safework`
- **소켓**: `/home/jclee/.tmux/sockets/safework`
- **서비스**: safework-app, safework-postgres, safework-redis

## 최적화된 윈도우 레이아웃

### Window 1: main
- **용도**: 메인 작업 영역 (Claude, 편집기)
- **경로**: `/home/jclee/app/safework`
- **Panes**: 1

### Window 2: services
- **용도**: Docker 서비스 관리
- **경로**: `/home/jclee/app/safework`
- **Panes**: 1
- **추천 명령어**:
  ```bash
  docker-compose up -d        # 서비스 시작
  docker-compose ps           # 서비스 상태 확인
  docker-compose restart      # 서비스 재시작
  docker-compose down         # 서비스 중지
  ```

### Window 3: logs
- **용도**: 서비스 로그 모니터링 (멀티 pane)
- **경로**: `/home/jclee/app/safework`
- **Panes**: 3 (tiled layout)
- **추천 명령어**:
  ```bash
  # Pane 1
  docker-compose logs -f safework-app

  # Pane 2
  docker-compose logs -f safework-postgres

  # Pane 3
  docker-compose logs -f safework-redis
  ```

### Window 4: workers
- **용도**: Cloudflare Workers 개발
- **경로**: `/home/jclee/app/safework`
- **Panes**: 1
- **추천 명령어**:
  ```bash
  npm install                 # 의존성 설치
  npm run dev                 # Wrangler dev 서버 (로컬 테스트)
  npm run deploy              # Cloudflare 배포
  npx wrangler d1 migrations list --database=safework_db  # D1 마이그레이션
  ```

## 자동화 기능

### 레이아웃 자동 저장/복원
- ✅ 현재 레이아웃 저장됨: `~/.config/ts/layouts/safework.layout`
- ✅ Detach 시 자동 저장
- ✅ Attach 시 자동 복원

### 세션 메타데이터
```json
{
  "name": "safework",
  "path": "/home/jclee/app/safework",
  "description": "SafeWork - Cloudflare Workers + Docker Backend",
  "tags": "cloudflare,workers,typescript,docker,d1,postgres",
  "auto_claude": true,
  "status": "active"
}
```

## 빠른 명령어

### 세션 관리
```bash
# 세션 연결
ts safework

# 윈도우 이동
Ctrl+b 1  # main
Ctrl+b 2  # services
Ctrl+b 3  # logs
Ctrl+b 4  # workers

# Pane 이동 (logs window)
Ctrl+b o  # 다음 pane
Ctrl+b ;  # 이전 pane
```

### Docker 서비스 관리
```bash
# 전체 서비스 시작
docker-compose up -d

# 특정 서비스 재시작
docker-compose restart safework-api

# 로그 스트리밍
docker-compose logs -f

# 서비스 상태
docker-compose ps

# 리소스 사용량
docker stats
```

### Cloudflare Workers 개발
```bash
npm run dev        # Wrangler dev (로컬)
npm run deploy     # Cloudflare 배포
npm run build      # TypeScript 빌드
npx wrangler dev   # Wrangler CLI 직접 실행
npx wrangler tail  # 실시간 로그
```

## 프로젝트 구조

```
/home/jclee/app/safework/
├── docker-compose.yml     # Docker Backend (Postgres, Redis)
├── wrangler.toml         # Cloudflare Workers 설정
├── package.json          # Node.js 의존성
├── src/                  # Workers 소스 코드 (TypeScript)
├── public/               # 정적 파일
├── migrations/           # D1 데이터베이스 마이그레이션
├── scripts/              # 배포/유틸리티 스크립트
└── tests/                # 테스트
```

## 모니터링

### Grafana 통합
- **Job**: `safework`
- **메트릭**: Docker 컨테이너 상태, API 응답시간, Worker 처리량
- **로그**: Loki를 통한 중앙 집중식 로그 수집

### 헬스 체크
```bash
# Docker 서비스 상태
docker-compose ps

# API 헬스 체크
curl http://localhost:3000/health

# 데이터베이스 연결
docker-compose exec postgres psql -U safework -c "SELECT 1"
```

## 문제 해결

### 서비스가 시작되지 않는 경우
```bash
# 로그 확인
docker-compose logs

# 컨테이너 재생성
docker-compose down
docker-compose up -d --force-recreate

# 볼륨 정리 (주의: 데이터 삭제됨)
docker-compose down -v
```

### 레이아웃이 복원되지 않는 경우
```bash
# 수동 레이아웃 복원
~/.config/ts/auto-session-restore.sh restore safework /home/jclee/.tmux/sockets/safework

# 레이아웃 재저장
~/.config/ts/auto-session-restore.sh save safework /home/jclee/.tmux/sockets/safework
```

### Cloudflare Workers 배포 실패 시
```bash
npm install      # 의존성 재설치
rm -rf node_modules/.cache  # 캐시 정리
npm run build    # TypeScript 빌드
npx wrangler whoami  # Cloudflare 인증 확인
npx wrangler deploy  # 재배포
```

## 참고 문서

- Docker Compose: `/home/jclee/app/safework/docker-compose.yml`
- Wrangler Config: `/home/jclee/app/safework/wrangler.toml`
- 메인 README: `/home/jclee/app/safework/README.md`
- CLAUDE.md: `/home/jclee/app/safework/CLAUDE.md`
- D1 Schema: `/home/jclee/app/safework/d1-schema.sql`

## 다음 단계

1. **Docker 백엔드 시작**: Window 2에서 `docker-compose up -d` 실행
2. **로그 모니터링**: Window 3의 각 pane에서 서비스별 로그 확인
3. **Cloudflare Workers 개발**: Window 4에서 `npm run dev` (Wrangler) 실행
4. **배포**: `npm run deploy` 또는 GitHub push (자동 배포)
5. **Grafana 대시보드**: grafana.jclee.me에서 safework 메트릭 확인

---

**최적화 상태**: ✅ 완료
**자동화 활성화**: ✅ 레이아웃 저장/복원
**권장 레이아웃**: Tiled (로그 윈도우)
