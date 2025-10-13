# 001번 양식 데이터 재가공 가이드

## 📋 개요

001번 양식(근골격계 증상조사표)에서 입력된 데이터를 자동으로 분석하여 003, 004 통계 요약 파일을 생성하는 시스템입니다.

## 🔄 데이터 흐름

```
[001번 양식 제출]
    ↓
[D1 Database 저장]
    ↓
[generate-musculoskeletal-summaries.js 실행]
    ↓
[003, 004 엑셀 파일 생성]
```

## 📊 생성되는 파일

### 003_Musculoskeletal_Questionnaire_Summary.xlsx
**질문지 응답 요약**

| 섹션 | 내용 |
|------|------|
| 1. 기본 정보 통계 | 성별, 연령대, 결혼여부 분포 |
| 2. 통증 부위별 응답 현황 | 6개 부위별 통증 빈도 (없음/가끔/자주/항상) |
| 3. 업무 지장도 | 부위별 업무 지장 발생률 |

### 004_Musculoskeletal_Statistics_Summary.xlsx
**통계 요약**

| 섹션 | 내용 |
|------|------|
| 1. 전체 통증 유병률 | 부위별 통증 유병률 및 심각도 |
| 2. 성별 통증 유병률 | 남성/여성 비교 분석 |
| 3. 연령대별 통증 유병률 | 20대~60대 이상 비교 |
| 4. 근무시간별 통증 유병률 | 8시간 미만~12시간 초과 비교 |

## 🎯 실행 방법

### 방법 1: npm 스크립트 (권장)

```bash
cd workers/
npm run generate:summaries
```

### 방법 2: 직접 실행

```bash
cd workers/
node scripts/generate-musculoskeletal-summaries.js
```

### 방법 3: 자동화 (추후 구현 가능)

#### Option A: Cloudflare Workers Cron Triggers
매일 자정에 자동으로 실행:

```toml
# wrangler.toml
[triggers]
crons = ["0 0 * * *"]  # 매일 00:00 KST
```

#### Option B: Admin 대시보드 버튼
Admin 페이지에 "요약 파일 생성" 버튼 추가 (향후 구현)

#### Option C: GitHub Actions
주간 자동 실행:

```yaml
# .github/workflows/generate-summaries.yml
name: Generate Weekly Summaries
on:
  schedule:
    - cron: '0 0 * * 0'  # 매주 일요일 00:00 UTC
  workflow_dispatch:  # 수동 실행 가능
```

## 📈 데이터 분석 내역

### 수집 데이터

**001번 양식에서 수집하는 데이터:**

1. **기본 정보**
   - 이름, 연령, 성별, 결혼여부
   - 부서, 라인, 작업 내용
   - 근무 경력 (년/월)

2. **근무 정보**
   - 현재 작업 개월 수
   - 1일 근무시간
   - 휴식시간
   - 이전 작업 이력

3. **여가 활동**
   - 규칙적인 활동 여부
   - 활동 빈도
   - 활동 유형 (컴퓨터, 악기, 운동 등)

4. **가사노동**
   - 하루 평균 가사노동시간
   - 활동 유형 (밥하기, 빨래, 청소, 육아)

5. **의료 진단**
   - 의사 진단 내역
   - 진단 세부사항

6. **신체 부위별 통증 평가** (6개 부위)
   - 목, 어깨, 팔/팔꿈치, 손목/손, 허리, 다리/발
   - 각 부위별 4가지 측정:
     - 통증 빈도 (없음/가끔/자주/항상)
     - 통증 지속기간 (없음/1주일 미만/1주일 이상)
     - 통증 강도 (없음/약함/중간/심함/매우 심함)
     - 업무 지장도 (없음/있음)

### 분석 지표

**003 파일 (질문지 요약):**
- 응답률 (각 질문별 응답한 인원 비율)
- 빈도 분포 (각 선택지별 인원 수 및 비율)
- 업무 지장률 (통증으로 인한 업무 지장 비율)

**004 파일 (통계 요약):**
- 유병률 (Prevalence Rate): 통증이 있는 인원 / 전체 응답자
- 심각도 점수: 가끔=1, 자주=2, 항상=3의 평균값
- 교차 분석: 성별×부위, 연령대×부위, 근무시간×부위

## 🔧 커스터마이징

### 새로운 분석 지표 추가

스크립트 파일 수정:
```javascript
// workers/scripts/generate-musculoskeletal-summaries.js

// 예: 부서별 통증 유병률 추가
const deptStats = {};
surveys.forEach(survey => {
  const dept = survey.department || '미지정';
  if (!deptStats[dept]) {
    deptStats[dept] = { total: 0, pain: 0 };
  }
  deptStats[dept].total++;
  if (/* 통증 조건 */) {
    deptStats[dept].pain++;
  }
});
```

### 새로운 엑셀 시트 추가

```javascript
// 새로운 시트 생성
const sheet2 = workbook.addWorksheet('부서별 분석');
sheet2.addRow(['부서', '인원', '통증 인원', '유병률(%)']);
// ... 데이터 추가
```

## 📊 데이터 품질 관리

### 데이터 검증

스크립트는 다음을 자동 처리합니다:
- 빈 응답 처리 (미응답으로 분류)
- JSON 파싱 오류 처리
- 잘못된 데이터 필터링

### 데이터 정합성

- **중복 제거**: 동일 사용자의 중복 제출은 최신 데이터 사용
- **무효 데이터**: 필수 항목 미입력 시 해당 항목만 제외
- **범위 검증**: 나이, 근무시간 등 범위 체크

## 🚨 문제 해결

### 스크립트 실행 오류

**"ExcelJS not found"**
```bash
npm install exceljs --save-dev
```

**"API request failed"**
- Production API가 정상 동작하는지 확인
- 네트워크 연결 확인

**"No survey data found"**
- D1 데이터베이스에 001번 양식 데이터가 있는지 확인
- 쿼리: `SELECT COUNT(*) FROM surveys WHERE form_type = '001_musculoskeletal_symptom_survey'`

### 데이터 불일치

**엑셀 파일의 수치가 예상과 다름**
- 생성 시각 확인 (엑셀 파일 내 상단에 표시)
- 최신 데이터 반영 확인 (API 응답 vs. 엑셀 파일 시간 비교)
- 재실행: `npm run generate:summaries`

## 📅 정기 업데이트 권장사항

| 주기 | 방법 | 목적 |
|------|------|------|
| **일일** | 수동 실행 또는 Cron | 실시간 모니터링 |
| **주간** | GitHub Actions | 주간 보고서 생성 |
| **월간** | 수동 실행 + 검토 | 월간 안전보건 회의 자료 |

## 🔐 보안 고려사항

- **개인정보 보호**: 생성된 엑셀 파일은 익명화된 통계 데이터만 포함
- **접근 제어**: data/ 디렉토리는 .gitignore에 추가 권장
- **데이터 보관**: 개인정보보호법에 따라 적절한 기간 후 삭제

## 📚 참고 자료

- [산업안전보건법 시행규칙 별지 제80호서식](https://www.law.go.kr/)
- [근골격계질환 예방관리 프로그램](https://www.kosha.or.kr/)
- [KOSHA GUIDE H-65-2021](https://www.kosha.or.kr/)

## 💡 향후 개선 사항

- [ ] Admin 대시보드에 "요약 생성" 버튼 추가
- [ ] PDF 형식 보고서 생성
- [ ] 시계열 분석 (월별 추이)
- [ ] 부서별 벤치마킹 분석
- [ ] 자동 이메일 발송 (주간 보고서)
- [ ] Grafana 대시보드 연동
- [ ] 예측 모델 (통증 발생 리스크 예측)
