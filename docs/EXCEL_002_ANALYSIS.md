# 002 Excel 파일 분석 보고서

**작성일**: 2025-10-05
**대상**: `002_musculoskeletal_symptom_program.xls` (근골격계질환 증상조사표)

---

## 📊 Excel 파일 개요

### 기본 정보
- **파일명**: `data/002_musculoskeletal_symptom_program.xls`
- **파일 크기**: 1.8MB
- **구조**: 606 rows × 66 columns
- **용도**: 근골격계부담작업 유해요인조사 설문 데이터

### 설문 구조
**8개 주요 섹션, 60+ 필드**

1. **기본 정보** (6개 필드)
   - 번호, 성명, 연령, 성별, 현 직장 경력, 결혼여부

2. **작업 정보** (14개 필드)
   - 부서, 라인, 작업 종류, 작업 내용, 작업 기간
   - 1일 근무시간, 휴식시간, 이전 작업 기간
   - 여가활동, 가사노동, 의사진단, 육체적 부담정도

3. **신체 부위별 통증 평가** (6개 부위 × 6개 문항 = 36개 필드)
   - 목, 어깨, 팔꿈치, 손목/손, 허리, 다리/발
   - 각 부위당: 통증 여부, 기간, 강도, 빈도, 증상 심화, 기타

---

## 🔧 현재 구현 상태

### ✅ 구현된 기능

#### 1. Python Excel 처리 스크립트
**파일**: `scripts/excel_processor.py`

```bash
# 로컬 처리
python3 scripts/excel_processor.py data/002_musculoskeletal_symptom_program.xls --local

# Workers 전송
python3 scripts/excel_processor.py data/002_musculoskeletal_symptom_program.xls --worker
```

**기능**:
- ✅ Excel 파일 읽기 (pandas, openpyxl/xlrd)
- ✅ 구조 분석 및 JSON 변환
- ✅ Cloudflare Worker API 전송
- ✅ 로컬 JSON 저장

**실행 결과**:
```
✅ Successfully read Excel file
📊 Dimensions: 606 rows x 66 columns
✅ Survey structure saved to: /tmp/002_analysis.json
📝 Summary:
   Title: 근골격계부담작업 유해요인조사
   Sections: 1  ⚠️ (예상: 8개 섹션)
   Fields: 1    ⚠️ (예상: 60+ 필드)
```

#### 2. TypeScript Workers 라우트
**파일**: `workers/src/routes/excel-processor.ts`

**엔드포인트**:
```typescript
POST /api/excel/process-excel              // Excel 파일 처리
GET  /api/excel/form-structure/:formId     // 설문 구조 조회
POST /api/excel/export-to-excel            // Excel 내보내기
GET  /api/excel/download/:fileId           // Excel 다운로드
POST /api/excel/validate-excel             // Excel 검증
```

**상태**: ⚠️ **부분 구현** (라우트만 정의, helper 함수 미구현)

#### 3. JSON 구조 파일들

| 파일 | 크기 | 용도 | 상태 |
|------|------|------|------|
| `002_complete_structure.json` | 17KB | 완전한 설문 구조 (60+ 필드) | ✅ 완성 |
| `002_correct_structure.json` | 13KB | 검증된 구조 | ✅ 완성 |
| `002_real_structure.json` | 7.5KB | 실제 사용 구조 | ✅ 완성 |
| `002_musculoskeletal_symptom_program_structure.json` | 455B | 기본 구조 | ⚠️ 간소화 |

#### 4. D1 데이터베이스 통합
**테이블**: `surveys_002`

```sql
CREATE TABLE surveys_002 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id TEXT UNIQUE,
  form_version TEXT,
  -- 기본 정보 (6개)
  number INTEGER,
  name TEXT,
  age INTEGER,
  gender TEXT,
  work_experience INTEGER,
  married TEXT,
  -- 작업 정보 (14개)
  department TEXT,
  line TEXT,
  work_type TEXT,
  -- ... (생략)
  -- 신체 부위별 통증 (36개 컬럼)
  neck_pain_exists TEXT,
  neck_pain_duration TEXT,
  neck_pain_intensity TEXT,
  -- ... (생략)
  -- JSON 응답
  responses TEXT,  -- 전체 응답 JSON
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**상태**: ✅ 완전 구현

#### 5. API 엔드포인트
```bash
# 설문 제출
POST /api/survey/d1/002/submit

# 응답 조회
GET /api/survey/d1/002/responses?page=1&limit=20

# 통계
GET /api/survey/d1/002/stats

# 단일 응답
GET /api/survey/d1/002/response/:surveyId
DELETE /api/survey/d1/002/response/:surveyId
```

**상태**: ✅ 완전 구현

---

## ❌ 미구현 기능 및 문제점

### 1. **Excel 자동 파싱 실패**

**문제**:
```python
# 현재 결과
Sections: 1  # 예상: 8
Fields: 1    # 예상: 60+
```

**원인**:
- `excel_processor.py`의 `extract_survey_structure()` 로직이 단순함
- Excel 병합 셀, 복잡한 레이아웃 처리 미흡
- 섹션 인식 알고리즘이 부정확

**영향**:
- Excel 파일을 자동으로 파싱할 수 없음
- 수동으로 JSON 구조를 작성해야 함

### 2. **TypeScript Helper 함수 미구현**

**미구현 함수들**:
```typescript
// workers/src/routes/excel-processor.ts
async function parseExcelToSurveyStructure(fileData: string)  // ❌ 하드코딩된 더미 데이터 반환
async function getSurveyResponses(db, formType)               // ❌ 미정의
async function convertResponsesToExcel(responses, format)     // ❌ 미정의
async function validateExcelStructure(fileData, fields)       // ❌ 미정의
```

**문제**:
- Excel 처리 API는 정의되어 있지만 실제 작동하지 않음
- 클라이언트 호출 시 500 에러 발생 가능

### 3. **Excel 내보내기 기능 부재**

**현재 상태**: 라우트만 존재, 실제 구현 없음

**필요 기능**:
```typescript
POST /api/excel/export-to-excel
- D1에서 설문 응답 조회
- Excel 형식으로 변환
- R2에 저장
- 다운로드 URL 반환
```

**문제**:
- Cloudflare Workers에서 Excel 파일 생성 불가 (Node.js 라이브러리 의존)
- 대안: CSV 내보내기 또는 R2 + Queue 조합

### 4. **구조 불일치**

**하드코딩된 구조** (`excel-processor.ts`):
```typescript
sections: [
  'basic_info',
  'work_environment',    // ❌ 실제 Excel에는 없음
  'health_assessment',   // ❌ 실제 Excel에는 없음
  'risk_factors',        // ❌ 실제 Excel에는 없음
  'recommendations'      // ❌ 실제 Excel에는 없음
]
```

**실제 Excel 구조** (`002_complete_structure.json`):
```json
{
  "sections": [
    "basic_info",       // ✅
    "work_info",        // ✅
    "pain_목",          // ✅
    "pain_어깨",        // ✅
    "pain_팔꿈치",      // ✅
    "pain_손목",        // ✅
    "pain_허리",        // ✅
    "pain_다리"         // ✅
  ]
}
```

**영향**:
- API와 실제 데이터 구조 불일치
- 설문 렌더링 오류 가능

---

## 🔄 현재 워크플로우

### 실제 작동하는 플로우

```
1. [수동] Excel 분석 → JSON 구조 작성 (002_complete_structure.json)
                ↓
2. [수동] TypeScript 템플릿 작성 (survey-002-form.ts)
                ↓
3. [자동] 웹 폼 렌더링 (GET /survey/002_musculoskeletal_symptom_program)
                ↓
4. [자동] 사용자 제출 (POST /api/survey/d1/002/submit)
                ↓
5. [자동] D1 저장 (surveys_002 테이블)
                ↓
6. [수동] 관리자 조회 (GET /api/survey/d1/002/responses)
                ↓
7. [미구현] Excel 내보내기 ❌
```

### 이상적인 플로우 (목표)

```
1. [자동] Excel 업로드 (POST /api/excel/process-excel)
                ↓
2. [자동] 구조 자동 파싱 → JSON 생성
                ↓
3. [자동] KV 저장 (form_002_musculoskeletal_symptom_program)
                ↓
4. [자동] 동적 폼 렌더링 (JSON 기반)
                ↓
5. [자동] 사용자 제출 → D1 저장
                ↓
6. [자동] 관리자 조회
                ↓
7. [자동] Excel 내보내기 (R2 + Queue) ✅
```

---

## 💡 권장 개선 사항

### 우선순위 1: Excel 파싱 개선

**작업**: `scripts/excel_processor.py` 리팩토링

```python
# 개선 포인트
1. 병합 셀 처리 (openpyxl.worksheet.merged_cells)
2. 섹션 헤더 인식 (폰트, 배경색, 병합 여부)
3. 필드 타입 자동 인식 (드롭다운, 텍스트, 숫자)
4. 컬럼 번호 매핑 (Excel 컬럼 → JSON 필드 ID)
```

**예상 결과**:
```
✅ Sections: 8 (목표 달성)
✅ Fields: 60+ (목표 달성)
```

### 우선순위 2: TypeScript Helper 함수 구현

**작업**: `workers/src/routes/excel-processor.ts` 완성

```typescript
// 1. 실제 구조 사용
async function parseExcelToSurveyStructure() {
  const structure = await import('../data/002_complete_structure.json');
  return structure;
}

// 2. D1 응답 조회
async function getSurveyResponses(db: D1Database, formType: string) {
  const result = await db.prepare(
    'SELECT * FROM surveys_002 WHERE form_version = ?'
  ).bind('v1.0_2025-09-30').all();
  return result.results;
}

// 3. CSV 내보내기 (Excel 대신)
async function convertResponsesToCSV(responses: any[]) {
  const csv = responses.map(r =>
    [r.name, r.age, r.gender, /* ... */].join(',')
  ).join('\n');
  return csv;
}
```

### 우선순위 3: Excel 내보내기 (CSV 방식)

**작업**: CSV 내보내기로 대체

```typescript
POST /api/excel/export-csv
- D1에서 설문 응답 조회
- CSV 형식 변환
- R2에 저장
- 임시 다운로드 URL 반환 (1시간 TTL)
```

**이유**:
- Cloudflare Workers는 Node.js Excel 라이브러리 사용 불가
- CSV는 순수 JavaScript로 생성 가능
- Excel로 CSV 열기 가능 (호환성)

### 우선순위 4: 구조 통합

**작업**: 하드코딩된 구조 제거, JSON 파일 사용

```typescript
// Before (하드코딩)
const structure = {
  sections: [
    { id: 'basic_info', ... },
    { id: 'work_environment', ... }  // ❌ 실제와 다름
  ]
};

// After (JSON import)
import structure002 from '../data/002_complete_structure.json';

excelProcessorRoutes.get('/form-structure/002', async (c) => {
  return c.json(structure002);
});
```

---

## 🧪 테스트 가이드

### Excel 파싱 테스트

```bash
# 1. Python 스크립트 테스트
cd /home/jclee/app/safework
python3 scripts/excel_processor.py data/002_musculoskeletal_symptom_program.xls --local

# 2. 출력 JSON 검증
cat /tmp/002_analysis.json | jq '.sections | length'  # 기대값: 8
cat /tmp/002_analysis.json | jq '.fields | length'    # 기대값: 60+

# 3. Worker 전송 테스트
python3 scripts/test_excel_worker.py
```

### API 엔드포인트 테스트

```bash
# 1. 구조 조회
curl https://safework.jclee.me/api/excel/form-structure/002_musculoskeletal_symptom_program

# 2. 설문 제출
curl -X POST https://safework.jclee.me/api/survey/d1/002/submit \
  -H "Content-Type: application/json" \
  -d '{"name":"테스트","age":30,"gender":"남","department":"생산1팀"}'

# 3. 응답 조회
curl https://safework.jclee.me/api/survey/d1/002/responses?page=1&limit=10

# 4. 통계
curl https://safework.jclee.me/api/survey/d1/002/stats
```

---

## 📈 마이그레이션 현황

| 기능 | 상태 | 비고 |
|------|------|------|
| Excel 파일 읽기 | ✅ 완료 | pandas + openpyxl |
| 구조 자동 파싱 | ⚠️ 부분 | 1 section, 1 field만 인식 |
| JSON 구조 생성 | ✅ 완료 | 수동 작성 |
| D1 스키마 | ✅ 완료 | surveys_002 테이블 |
| 웹 폼 렌더링 | ✅ 완료 | TypeScript 템플릿 |
| 설문 제출 API | ✅ 완료 | POST /api/survey/d1/002/submit |
| 응답 조회 API | ✅ 완료 | GET /api/survey/d1/002/responses |
| Excel 내보내기 | ❌ 미구현 | CSV 대체 권장 |
| TypeScript Helper | ❌ 미구현 | 함수 선언만 존재 |

**전체 진행률**: 65% (13/20 작업 완료)

---

## 🎯 다음 단계

### 즉시 수행 가능
1. ✅ Python Excel 파싱 개선 (병합 셀 처리)
2. ✅ TypeScript Helper 함수 구현
3. ✅ CSV 내보내기 기능 추가

### 중기 계획
4. ⏳ 동적 폼 렌더링 (JSON 기반)
5. ⏳ Excel 업로드 UI 추가
6. ⏳ R2 스토리지 활용 (임시 파일)

### 장기 계획
7. 🔮 Queue 기반 백그라운드 처리
8. 🔮 AI 기반 필드 자동 인식
9. 🔮 다중 Excel 형식 지원

---

## 📚 참고 파일

- **Excel 원본**: `data/002_musculoskeletal_symptom_program.xls`
- **Python 스크립트**: `scripts/excel_processor.py`
- **TypeScript 라우트**: `workers/src/routes/excel-processor.ts`
- **JSON 구조**: `data/002_complete_structure.json`
- **D1 스키마**: `workers/d1-schema.sql`
- **설문 폼 템플릿**: `workers/src/templates/survey-002-form.ts`

---

**작성자**: Claude Code
**최종 업데이트**: 2025-10-05
