# ⚠️ DEPRECATED - URL Endpoints Documentation

**이 문서는 더 이상 사용되지 않습니다.**

**최신 API 문서를 참조하세요**: [API_ENDPOINTS.md](API_ENDPOINTS.md)

---

## 📌 공지사항

**날짜**: 2025-10-04
**상태**: DEPRECATED

SafeWork는 **100% Cloudflare Native Serverless** 아키텍처로 완전히 마이그레이션되었습니다.

### 변경사항

| 항목 | 이전 (Flask) | 현재 (Cloudflare Workers) |
|------|-------------|--------------------------|
| **문서** | URL_ENDPOINTS.md | API_ENDPOINTS.md |
| **엔드포인트 수** | ~30개 | 60+ 개 |
| **Database** | PostgreSQL | D1 (Serverless SQLite) |
| **Storage** | 로컬 파일 | R2 (Object Storage) |
| **Cache** | Redis | KV Namespaces |

### 새로운 문서

✅ **[API_ENDPOINTS.md](API_ENDPOINTS.md)** - 최신 API 명세서 (60+ endpoints)

---

## Legacy URL 참고 (Historical Reference Only)

<details>
<summary>클릭하여 Legacy URL 목록 보기</summary>

### Survey Routes (`/survey`) - Legacy

- `/survey/001_musculoskeletal_symptom_survey` - 근골격계 증상조사표
- `/survey/002_musculoskeletal_symptom_program` - 근골격계부담작업 유해요인조사

### Admin Routes (`/admin`) - Legacy

- `/admin/safework` - 관리자 대시보드
- `/admin/002` - 002 양식 관리

### API Routes (`/api`) - Legacy

- `/api/survey/submit` - 설문 제출
- `/api/excel/process` - Excel 처리

</details>

---

## 현재 사용 중인 엔드포인트

모든 최신 엔드포인트는 [API_ENDPOINTS.md](API_ENDPOINTS.md)를 참조하세요.

**주요 엔드포인트**:
- `GET /api/health` - Workers 헬스체크
- `GET /api/native/native/health` - 네이티브 서비스 상태
- `GET /api/survey/d1/forms` - D1 기반 설문 양식 목록
- `POST /api/survey/d1/submit` - D1 기반 설문 제출
- `GET /admin` - 통합 관리자 대시보드

---

**SafeWork는 이제 100% Cloudflare Native Serverless 플랫폼입니다.** ⚡
