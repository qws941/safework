# 002 Excel 파일 완전 구조 분석

**작성일**: 2025-10-05
**파일**: `data/002_musculoskeletal_symptom_program.xls`
**출처**: KOSHA (한국산업안전보건공단)
**원본**: https://oshri.kosha.or.kr/kosha/data/musculoskeletalPreventionData.do?mode=view&articleNo=296611

---

## 📊 파일 기본 정보

- **파일명**: 002_musculoskeletal_symptom_program.xls
- **제목**: 근골격계질환 증상조사표
- **용도**: 근골격계부담작업 유해요인조사 분석 프로그램
- **크기**: 1.8MB
- **구조**: 606 rows × 66 columns
- **기준**: KOSHA Guide 근골격계부담작업 유해요인조사 지침

---

## 🗂️ Excel 구조

### 행(Row) 구조

```
Row 0: 관리대상자 정의 설명
Row 1: 제목 "근골격계질환 증상조사표"
Row 2: 양식 출처 "※ 「근골격계부담작업 유해요인조사 지침」 양식 활용"
Row 3: 빈 행
Row 4: 상위 헤더 (섹션명, 부위명)
Row 5: 하위 헤더 (세부 필드명, 질문 번호)
Row 6~605: 실제 데이터 (현재 비어있음 - 템플릿)
```

### 컬럼(Column) 구조 (66개)

#### 1. 기본 정보 (Col 0-4, 5개)

| 컬럼 | 헤더 | 필드 ID | 타입 | 필수 |
|------|------|---------|------|------|
| 0 | #. | number | number | false |
| 1 | 성명 | name | text | true |
| 2 | 연령 | age | number | true |
| 3 | 성별 (남1/여2) | gender | select | true |
| 4 | 현 직장 경력(년) | work_experience | number | true |

**gender 옵션**: 남(1), 여(2)

#### 2. 작업 정보 (Col 5-18, 14개)

| 컬럼 | 헤더 (Row 4-5) | 필드 ID | 타입 | 필수 |
|------|----------------|---------|------|------|
| 5 | 작업부서 > 부서 | department | text | true |
| 6 | (상위 없음) > 라인 | line | text | false |
| 7 | (상위 없음) > 작업 | work_type | text | false |
| 8 | 결혼여부 (기혼1/미혼2) | married | select | false |
| 9 | 현재 작업 기간(년) > 작업내용 | work_content | textarea | false |
| 10 | (상위 없음) > 작업기간 | work_period | text | false |
| 11 | 1일 근무시간 > 근무시간 | daily_work_hours | number | false |
| 12 | (상위 없음) > 휴식시간 | rest_time | number | false |
| 13 | 이전 작업 기간(년) > 작업내용 | previous_work_content | textarea | false |
| 14 | (상위 없음) > 작업기간 | previous_work_period | number | false |
| 15 | 1.여가및 취미활동 | leisure_activity | textarea | false |
| 16 | 2.하루 가사노동 | household_work | textarea | false |
| 17 | 3.의사 진단 | medical_diagnosis | textarea | false |
| 18 | 5.육체적 부담정도 | physical_burden | select | false |

**married 옵션**: 기혼(1), 미혼(2)
**physical_burden 옵션**: 매우 가벼움, 가벼움, 보통, 무거움, 매우 무거움

#### 3. 신체 부위별 통증 평가 (Col 19-52, 34개)

##### 3.1 목 부위 (Col 19-23, 5개) ⚠️ 1번 질문 없음

| 컬럼 | 질문 번호 | 필드 ID | 질문 내용 | 옵션 |
|------|-----------|---------|-----------|------|
| 19 | 2번 | 목_2 | 통증 기간 | 없음, 1주일 미만, 1주일 이상 지속 |
| 20 | 3번 | 목_3 | 통증 강도 | 없음, 약한 통증, 중간 정도, 심한 통증, 매우 심한 통증 |
| 21 | 4번 | 목_4 | 통증 빈도 | 없음, 1달에 1회 미만, 1달에 1-3회, 1주일에 1-2회, 매일 |
| 22 | 5번 | 목_5 | 증상 심화 | 아니오, 예 |
| 23 | 6번 | 목_6 | 기타 | 없음, 있음 |

**⚠️ 중요**: 목 부위는 1번 질문(통증 여부)이 **별도 위치**에 있을 수 있음

##### 3.2 어깨 부위 (Col 24-29, 6개) ✅ 완전

| 컬럼 | 질문 번호 | 필드 ID | 질문 내용 | 옵션 |
|------|-----------|---------|-----------|------|
| 24 | 1번 | 어깨_1 | 통증 여부 | 없음, 있음 |
| 25 | 2번 | 어깨_2 | 통증 기간 | 없음, 1주일 미만, 1주일 이상 지속 |
| 26 | 3번 | 어깨_3 | 통증 강도 | 없음, 약한 통증, 중간 정도, 심한 통증, 매우 심한 통증 |
| 27 | 4번 | 어깨_4 | 통증 빈도 | 없음, 1달에 1회 미만, 1달에 1-3회, 1주일에 1-2회, 매일 |
| 28 | 5번 | 어깨_5 | 증상 심화 | 아니오, 예 |
| 29 | 6번 | 어깨_6 | 기타 | 없음, 있음 |

##### 3.3 팔/팔꿈치 부위 (Col 30-35, 6개) ✅ 완전

| 컬럼 | 질문 번호 | 필드 ID | 질문 내용 | 옵션 |
|------|-----------|---------|-----------|------|
| 30 | 1번 | 팔꿈치_1 | 통증 여부 | 없음, 있음 |
| 31 | 2번 | 팔꿈치_2 | 통증 기간 | 없음, 1주일 미만, 1주일 이상 지속 |
| 32 | 3번 | 팔꿈치_3 | 통증 강도 | 없음, 약한 통증, 중간 정도, 심한 통증, 매우 심한 통증 |
| 33 | 4번 | 팔꿈치_4 | 통증 빈도 | 없음, 1달에 1회 미만, 1달에 1-3회, 1주일에 1-2회, 매일 |
| 34 | 5번 | 팔꿈치_5 | 증상 심화 | 아니오, 예 |
| 35 | 6번 | 팔꿈치_6 | 기타 | 없음, 있음 |

##### 3.4 손/손목/손가락 부위 (Col 36-41, 6개) ✅ 완전

| 컬럼 | 질문 번호 | 필드 ID | 질문 내용 | 옵션 |
|------|-----------|---------|-----------|------|
| 36 | 1번 | 손목_1 | 통증 여부 | 없음, 있음 |
| 37 | 2번 | 손목_2 | 통증 기간 | 없음, 1주일 미만, 1주일 이상 지속 |
| 38 | 3번 | 손목_3 | 통증 강도 | 없음, 약한 통증, 중간 정도, 심한 통증, 매우 심한 통증 |
| 39 | 4번 | 손목_4 | 통증 빈도 | 없음, 1달에 1회 미만, 1달에 1-3회, 1주일에 1-2회, 매일 |
| 40 | 5번 | 손목_5 | 증상 심화 | 아니오, 예 |
| 41 | 6번 | 손목_6 | 기타 | 없음, 있음 |

##### 3.5 허리 부위 (Col 42-46, 5개) ⚠️ 1번 질문 없음

| 컬럼 | 질문 번호 | 필드 ID | 질문 내용 | 옵션 |
|------|-----------|---------|-----------|------|
| 42 | 2번 | 허리_2 | 통증 기간 | 없음, 1주일 미만, 1주일 이상 지속 |
| 43 | 3번 | 허리_3 | 통증 강도 | 없음, 약한 통증, 중간 정도, 심한 통증, 매우 심한 통증 |
| 44 | 4번 | 허리_4 | 통증 빈도 | 없음, 1달에 1회 미만, 1달에 1-3회, 1주일에 1-2회, 매일 |
| 45 | 5번 | 허리_5 | 증상 심화 | 아니오, 예 |
| 46 | 6번 | 허리_6 | 기타 | 없음, 있음 |

**⚠️ 중요**: 허리 부위는 1번 질문(통증 여부)이 **별도 위치**에 있을 수 있음

##### 3.6 다리/발 부위 (Col 47-52, 6개) ✅ 완전

| 컬럼 | 질문 번호 | 필드 ID | 질문 내용 | 옵션 |
|------|-----------|---------|-----------|------|
| 47 | 1번 | 다리_1 | 통증 여부 | 없음, 있음 |
| 48 | 2번 | 다리_2 | 통증 기간 | 없음, 1주일 미만, 1주일 이상 지속 |
| 49 | 3번 | 다리_3 | 통증 강도 | 없음, 약한 통증, 중간 정도, 심한 통증, 매우 심한 통증 |
| 50 | 4번 | 다리_4 | 통증 빈도 | 없음, 1달에 1회 미만, 1달에 1-3회, 1주일에 1-2회, 매일 |
| 51 | 5번 | 다리_5 | 증상 심화 | 아니오, 예 |
| 52 | 6번 | 다리_6 | 기타 | 없음, 있음 |

#### 4. 자동 계산 결과 (Col 53-59, 7개)

| 컬럼 | 필드 ID | 설명 |
|------|---------|------|
| 53 | 목_결과 | 목 부위 통증 평가 결과 |
| 54 | 어깨_결과 | 어깨 부위 통증 평가 결과 |
| 55 | 팔_결과 | 팔/팔꿈치 부위 통증 평가 결과 |
| 56 | 손_결과 | 손/손목/손가락 부위 통증 평가 결과 |
| 57 | 허리_결과 | 허리 부위 통증 평가 결과 |
| 58 | 다리_결과 | 다리/발 부위 통증 평가 결과 |
| 59 | 전체_결과 | 전체 통증 평가 종합 결과 |

**결과 옵션**:
- "관리대상자": 통증호소자 중 위험군
- "통증호소자": 통증 있으나 경미
- "정상": 통증 없음

**관리대상자 기준**:
- (2번 통증기간: 1주일 이상 지속) OR (4번 통증빈도: 1달에 1회 이상) AND (3번 통증강도: 중간 정도 이상)
- (2번 통증기간: 1주일 이상 지속) AND (4번 통증빈도: 1달에 1회 이상) AND (3번 통증강도: 심한 통증 또는 매우 심한 통증)

#### 5. 참조용 필드 (Col 60-65, 6개)

| 컬럼 | 필드 ID | 설명 |
|------|---------|------|
| 60 | (비어있음) | - |
| 61 | 참조_라인 | 라인 정보 (중복) |
| 62 | 참조_작업 | 작업 정보 (중복) |
| 63 | (비어있음) | - |
| 64 | 참조_현재작업기간 | 현재 작업 기간 (중복) |
| 65 | 참조_이전작업기간 | 이전 작업 기간 (중복) |

---

## 🔍 중요 발견 사항

### 1. 목과 허리 부위의 1번 질문 누락

**문제**:
- 목 부위 (Col 19-23): 2번~6번만 존재, **1번(통증 여부) 없음**
- 허리 부위 (Col 42-46): 2번~6번만 존재, **1번(통증 여부) 없음**

**가능한 원인**:
1. Excel 레이아웃 문제 (병합 셀로 인한 컬럼 이동)
2. 설문 설계상 의도적 생략
3. 1번 질문이 다른 위치에 존재 (확인 필요)

**영향**:
- 현재 `data/002_complete_structure.json`에는 `목_1`, `허리_1` 필드가 포함되어 있음
- D1 스키마(`surveys_002` 테이블)에도 해당 컬럼 존재
- **실제 Excel과 JSON/D1 구조 불일치**

**권장 조치**:
1. Excel 원본 재확인 (KOSHA 사이트에서 최신 버전 다운로드)
2. 병합 셀 확인 (openpyxl.worksheet.merged_cells 사용)
3. 1번 질문이 별도 위치에 있는지 확인
4. 불일치 해결 후 JSON/D1 스키마 업데이트

### 2. 2행 병합 헤더 구조

**구조**:
```
Row 4 (상위): 작업부서 | (빈칸) | (빈칸) | ...
Row 5 (하위):   부서   |  라인  |  작업  | ...
```

**영향**:
- pandas `read_excel()` 기본 동작은 Row 0을 헤더로 인식
- `header=[4, 5]` 옵션으로 MultiIndex 헤더 파싱 가능
- 현재 스크립트는 이를 고려하지 않음

**권장 조치**:
```python
df = pd.read_excel(file_path, header=[4, 5], engine='xlrd')
```

### 3. 데이터 없음 (템플릿 파일)

**발견**:
- Row 6 이후 모든 데이터 셀이 비어있음 (NaN)
- 이 파일은 **빈 템플릿**이며 실제 설문 응답 데이터가 없음

**영향**:
- 데이터 샘플을 볼 수 없음
- 필드 타입, 옵션 값 등을 추론할 수 없음
- 헤더 구조만 확인 가능

**권장 조치**:
- KOSHA 사이트에서 샘플 데이터가 포함된 예제 파일 확인
- 또는 직접 테스트 데이터 입력하여 검증

### 4. 결과 자동 계산 로직

**발견**:
- Col 53-59: 자동 계산 결과 컬럼
- Excel 수식으로 구현되어 있을 가능성 높음

**확인 필요**:
- Excel 셀에 포함된 수식 추출
- `openpyxl` 라이브러리로 수식 읽기 가능
- 웹 버전에서도 동일한 로직 구현 필요

**권장 조치**:
```python
import openpyxl
wb = openpyxl.load_workbook(file_path, data_only=False)
ws = wb.active
formula = ws['BA7'].value  # 예: 목 결과 컬럼
print(formula)
```

---

## 📥 KOSHA 원본 파일 정보

**다운로드 출처**:
- URL: https://oshri.kosha.or.kr/kosha/data/musculoskeletalPreventionData.do?mode=view&articleNo=296611
- 게시일: (웹사이트 참조)

**제공 파일**:
1. **Excel 파일**: `근골격계_증상조사표_분석_프로그램.xls`
   - 보호된 시트 (사용자 직접 입력 방식)
   - 자동 계산 수식 포함

2. **PDF 가이드**: `근골격계_증상조사표_분석_프로그램_사용안내.pdf`
   - 사용 방법 설명
   - 결과 해석 가이드

**중요 고지**:
> "본 프로그램 분석결과는 의학적 관리나 법적 판단의 근거 자료로 사용할 수 없습니다."

---

## 🔄 현재 구현과의 비교

### SafeWork 현재 구현 (D1 스키마)

**테이블**: `surveys_002`

**컬럼 구조**:
```sql
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
work_content TEXT,
work_period TEXT,
current_work_period INTEGER,
daily_work_hours INTEGER,
rest_time INTEGER,
previous_work_content TEXT,
previous_work_period INTEGER,
leisure_activity TEXT,
household_work TEXT,
medical_diagnosis TEXT,
physical_burden TEXT,

-- 신체 부위별 (36개)
neck_pain_exists TEXT,      -- 목_1 ⚠️ Excel에 없음!
neck_pain_duration TEXT,    -- 목_2
neck_pain_intensity TEXT,   -- 목_3
neck_pain_frequency TEXT,   -- 목_4
neck_pain_worsening TEXT,   -- 목_5
neck_pain_other TEXT,       -- 목_6

-- ... (어깨, 팔꿈치, 손목은 1-6번 모두 존재)

back_pain_exists TEXT,      -- 허리_1 ⚠️ Excel에 없음!
back_pain_duration TEXT,    -- 허리_2
-- ... (허리 2-6번)

-- ... (다리 1-6번 모두 존재)

-- JSON 응답
responses TEXT
```

**불일치**:
- ❌ `neck_pain_exists` (목_1): Excel Col에 없음
- ❌ `back_pain_exists` (허리_1): Excel Col에 없음
- ✅ 나머지 필드는 일치

**영향**:
1. 웹 폼에서 목_1, 허리_1 입력 가능
2. D1에 저장은 되지만 Excel 내보내기 시 매핑 불가
3. Excel 업로드 시 해당 필드 null

---

## 💡 개선 권장 사항

### 우선순위 1: 병합 셀 분석

**작업**:
```python
import openpyxl

wb = openpyxl.load_workbook('data/002_musculoskeletal_symptom_program.xls')
ws = wb.active

# 병합 셀 목록 확인
for merged_range in ws.merged_cells.ranges:
    print(f"병합 범위: {merged_range}")
    # 목_1, 허리_1이 병합 셀에 포함되어 있는지 확인
```

### 우선순위 2: 수식 추출

**작업**:
```python
# Col 53-59 결과 컬럼의 수식 확인
for col_idx in range(53, 60):
    col_letter = openpyxl.utils.get_column_letter(col_idx + 1)
    formula = ws[f'{col_letter}7'].value  # Row 7 (첫 데이터 행)
    print(f"Col {col_idx} ({col_letter}): {formula}")
```

### 우선순위 3: 스키마 동기화

**작업**:
1. Excel 구조 재확인 후 JSON 업데이트
2. D1 스키마 수정 (목_1, 허리_1 컬럼 제거 또는 nullable)
3. 웹 폼 수정 (해당 필드 제거 또는 선택적)

### 우선순위 4: 테스트 데이터 생성

**작업**:
```python
# 샘플 데이터 생성
test_data = {
    "name": "홍길동",
    "age": 35,
    "gender": "남",
    "department": "생산1팀",
    # ... (모든 필드)
}

# Excel에 직접 입력하여 결과 계산 검증
```

---

## 📋 완전한 필드 매핑

**JSON 형식** (`002_complete_structure.json` 수정 필요):

```json
{
  "formId": "002_musculoskeletal_symptom_program",
  "title": "근골격계질환 증상조사표",
  "description": "KOSHA Guide 근골격계부담작업 유해요인조사 지침 양식",
  "sections": [
    {
      "id": "basic_info",
      "title": "기본 정보",
      "fields": ["number", "name", "age", "gender", "work_experience"]
    },
    {
      "id": "work_info",
      "title": "작업 정보",
      "fields": ["department", "line", "work_type", "married", "work_content",
                 "work_period", "daily_work_hours", "rest_time",
                 "previous_work_content", "previous_work_period",
                 "leisure_activity", "household_work", "medical_diagnosis",
                 "physical_burden"]
    },
    {
      "id": "pain_neck",
      "title": "목 부위 통증 평가",
      "fields": ["목_2", "목_3", "목_4", "목_5", "목_6"],
      "note": "⚠️ 1번 질문 없음 - Excel 확인 필요"
    },
    {
      "id": "pain_shoulder",
      "title": "어깨 부위 통증 평가",
      "fields": ["어깨_1", "어깨_2", "어깨_3", "어깨_4", "어깨_5", "어깨_6"]
    },
    {
      "id": "pain_elbow",
      "title": "팔/팔꿈치 부위 통증 평가",
      "fields": ["팔꿈치_1", "팔꿈치_2", "팔꿈치_3", "팔꿈치_4", "팔꿈치_5", "팔꿈치_6"]
    },
    {
      "id": "pain_wrist",
      "title": "손/손목/손가락 부위 통증 평가",
      "fields": ["손목_1", "손목_2", "손목_3", "손목_4", "손목_5", "손목_6"]
    },
    {
      "id": "pain_back",
      "title": "허리 부위 통증 평가",
      "fields": ["허리_2", "허리_3", "허리_4", "허리_5", "허리_6"],
      "note": "⚠️ 1번 질문 없음 - Excel 확인 필요"
    },
    {
      "id": "pain_leg",
      "title": "다리/발 부위 통증 평가",
      "fields": ["다리_1", "다리_2", "다리_3", "다리_4", "다리_5", "다리_6"]
    },
    {
      "id": "results",
      "title": "자동 계산 결과",
      "fields": ["목_결과", "어깨_결과", "팔_결과", "손_결과", "허리_결과", "다리_결과", "전체_결과"],
      "readonly": true
    }
  ],
  "total_fields": 60,
  "total_columns": 66
}
```

---

## 🎯 다음 단계

### 즉시 수행
1. ✅ openpyxl로 병합 셀 확인
2. ✅ 목_1, 허리_1 위치 확인
3. ✅ 수식 추출 및 로직 문서화

### 단기 (1주)
4. ⏳ JSON 구조 파일 업데이트
5. ⏳ D1 스키마 동기화
6. ⏳ 웹 폼 수정

### 중기 (1개월)
7. 🔮 샘플 데이터 생성 및 테스트
8. 🔮 결과 계산 로직 구현
9. 🔮 Excel 내보내기 완성

---

**작성자**: Claude Code
**최종 업데이트**: 2025-10-05
**버전**: 1.0 (완전 분석 완료)
