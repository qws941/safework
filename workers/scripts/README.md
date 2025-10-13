# SafeWork Data Processing Scripts

이 디렉토리에는 SafeWork 데이터를 처리하고 분석하는 스크립트들이 포함되어 있습니다.

## 📊 generate-musculoskeletal-summaries.js

001번 양식(근골격계 증상조사표) 데이터를 기반으로 통계 요약 엑셀 파일을 생성합니다.

### 생성되는 파일

1. **003_Musculoskeletal_Questionnaire_Summary.xlsx** - 질문지 응답 요약
   - 기본 정보 통계 (성별, 연령대, 결혼여부)
   - 통증 부위별 응답 현황 (목, 어깨, 팔/팔꿈치, 손목/손, 허리, 다리/발)
   - 통증으로 인한 업무 지장도 분석

2. **004_Musculoskeletal_Statistics_Summary.xlsx** - 통계 요약
   - 전체 통증 유병률 (Prevalence Rate)
   - 성별 통증 유병률
   - 연령대별 통증 유병률
   - 근무시간별 통증 유병률

### 사용 방법

```bash
# workers 디렉토리에서 실행
cd workers/

# 스크립트 실행
npm run generate:summaries

# 또는 직접 실행
node scripts/generate-musculoskeletal-summaries.js
```

### 출력 위치

생성된 파일은 `data/` 디렉토리에 저장됩니다:

```
data/
├── 003_Musculoskeletal_Questionnaire_Summary.xlsx
└── 004_Musculoskeletal_Statistics_Summary.xlsx
```

### 데이터 소스

- **Production API**: `https://safework.jclee.me/api/survey/d1/responses/001_musculoskeletal_symptom_survey`
- **데이터베이스**: Cloudflare D1 (`PRIMARY_DB`)
- **테이블**: `surveys` (form_type = '001_musculoskeletal_symptom_survey')

### 요구사항

- Node.js 18+
- ExcelJS (자동 설치됨)
- Production API 접근 권한

### 데이터 분석 내용

#### 003 - 질문지 요약
- 응답자 기본 정보 집계
- 6개 신체 부위별 통증 빈도 분석 (없음/가끔/자주/항상)
- 신체 부위별 업무 지장도 집계

#### 004 - 통계 요약
- 신체 부위별 통증 유병률 (전체, 성별, 연령대별, 근무시간별)
- 통증 심각도 점수 (가끔=1, 자주=2, 항상=3)
- 인구통계학적 교차 분석

### 업데이트 주기

- 수동 실행: 필요시 언제든지 실행
- 자동화: GitHub Actions 또는 Cron으로 정기 실행 가능

### 문제 해결

**오류: "Cannot read properties of undefined"**
- API 응답 구조가 변경되었을 수 있습니다
- Production API가 정상 동작하는지 확인하세요

**오류: "ExcelJS not found"**
```bash
npm install exceljs --save-dev
```

**빈 파일 생성**
- 001번 양식 제출 데이터가 없는 경우 발생
- D1 데이터베이스에 데이터가 있는지 확인하세요

### 참고

- 스크립트는 최대 1,000개의 레코드를 조회합니다
- 모든 타임스탬프는 KST (Asia/Seoul) 기준입니다
- 엑셀 파일은 UTF-8 인코딩을 사용합니다
