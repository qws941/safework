# Smart PR Review

## Purpose
SafeWork 프로젝트의 Pull Request를 자동으로 검토하고 품질 보증을 수행

## Usage
```bash
/smart-pr-review [pr-number]
```

## Description
Pull Request의 코드 품질, 보안, 성능을 종합적으로 검토:

1. **코드 품질 검사**: PEP8, Flask 모범사례 준수 여부
2. **보안 검토**: SQL 인젝션, CSRF 보호, 인증 로직
3. **성능 분석**: 데이터베이스 쿼리, 메모리 사용량
4. **테스트 커버리지**: 새 코드에 대한 테스트 존재 여부
5. **SafeWork 표준 준수**: 프로젝트 특화 가이드라인

## Arguments
- `pr-number` (optional): 검토할 PR 번호. 생략시 현재 브랜치의 PR

## Implementation

**SafeWork PR 스마트 검토를 시작합니다** 🔍

**1단계: PR 정보 수집**
```bash
gh pr view $ARGUMENTS --json number,title,body,files,additions,deletions
gh pr diff $ARGUMENTS
```

**2단계: 파일별 상세 분석**

### Flask 애플리케이션 파일
- **routes/*.py**: 라우트 핸들러 로직 검토
- **models*.py**: 데이터베이스 모델 변경사항
- **forms*.py**: 폼 검증 로직
- **templates/**: Jinja2 템플릿 보안 검사

### 코드 품질 검사
```python
# 자동 검사 항목
- 함수 크기 (100줄 이하)
- 파일 크기 (500줄 이하) 
- 중복 코드 제거
- 주석 및 문서화
- 타입 힌트 사용
```

### 보안 검토
```python
# 보안 체크리스트
- SQL 쿼리 파라미터화
- CSRF 토큰 사용
- XSS 방지 (escape 처리)
- 파일 업로드 검증
- 인증/권한 검사
```

**3단계: 데이터베이스 변경사항 검토**
```sql
-- 마이그레이션 검토
- 스키마 변경 영향도
- 인덱스 최적화
- 데이터 호환성
- 롤백 가능성
```

**4단계: 테스트 실행 및 커버리지**
```bash
docker exec safework-app python3 -m pytest tests/ -v --cov=. --cov-report=term-missing
```

**5단계: 종합 검토 보고서**

### ✅ 통과 항목
- 코드 스타일 준수
- 보안 가이드라인 준수  
- 테스트 커버리지 80% 이상
- Docker 환경 호환성

### ⚠️ 주의 항목
- 성능 최적화 필요
- 추가 테스트 권장
- 문서 업데이트 필요

### ❌ 수정 필요
- 보안 취약점
- 코드 품질 이슈
- 테스트 실패

## SafeWork 특화 검토 기준

### 001/002 설문 시스템
- 폼 유효성 검증
- JSON 데이터 구조
- 조건부 필드 로직
- 반응형 UI 구현

### 관리자 대시보드
- 권한 검사 (@admin_required)
- 데이터 내보내기 기능
- Bootstrap 일관성
- CRUD 연산 안전성

### 데이터베이스 통합성
- 외래 키 제약조건
- 트랜잭션 처리
- 마이그레이션 안전성
- 백업/복구 고려사항

**검토 완료 시 자동으로 PR에 종합 리뷰 댓글을 추가합니다.**