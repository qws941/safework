# 산업보건관리자 업무 자동화 기능 확장 계획

**작성일**: 2025-11-13
**프로젝트**: SafeWork (Cloudflare Workers)
**목표**: 산업안전보건법 기반 산업보건관리자 법정 업무 자동화

---

## 📊 현재 구현된 기능 (6개 양식)

### ✅ 이미 구현된 업무
1. **근골격계 증상조사** (Form 001) - 근골격계부담작업 유해요인조사의 일부
2. **근골격계부담작업 유해요인조사** (Form 002) - 법정 의무사항
3. **근골격계질환 예방관리 프로그램** (Form 003)
4. **산업재해 실태조사** (Form 004)
5. **유해요인 기본조사** (Form 005)
6. **고령근로자 작업투입 승인** (Form 006)

### ✅ 분석 및 보고 기능
- NIOSH 리프팅 방정식 분석
- 통계 분석 (부위별, 연령대별, 근무시간별 유병률)
- 설문조사 요약 리포트
- 통합 관리자 대시보드

---

## 🎯 추가 자동화 기능 제안

### 우선순위 1: 법정 의무사항 (즉시 추가 권장) ⭐⭐⭐

#### 1. 건강진단 관리 시스템
**법적 근거**: 산업안전보건법 제129조, 130조

**자동화 기능**:
- 건강진단 대상자 자동 선정 (일반/특수/배치전/수시)
- 건강진단 시기 자동 계산 및 알림
- 건강진단 결과 입력 및 관리
- 사후관리 대상자 자동 분류 (A~D판정)
- 사후관리 조치사항 추적
- 건강진단 미실시자 자동 알림
- 법정 보고서 자동 생성 (건강진단 결과표)

**DB 스키마 추가**:
```sql
-- 건강진단 대상자
CREATE TABLE health_exam_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    exam_type TEXT NOT NULL, -- general/special/pre_placement/emergency
    exam_year INTEGER NOT NULL,
    exam_due_date TEXT NOT NULL,
    exam_completed INTEGER DEFAULT 0,
    exam_date TEXT,
    exam_result TEXT, -- A/B/C1/C2/D1/D2/R
    follow_up_required INTEGER DEFAULT 0,
    follow_up_details TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (employee_id) REFERENCES users(id)
);

-- 건강진단 결과
CREATE TABLE health_exam_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL,
    exam_date TEXT NOT NULL,
    exam_institution TEXT NOT NULL,
    -- 검사 항목 (JSON)
    test_results TEXT,
    -- 판정
    overall_grade TEXT NOT NULL, -- A/B/C1/C2/D1/D2/R
    work_suitability TEXT NOT NULL, -- fit/conditional/unfit
    doctor_opinion TEXT,
    -- 사후관리
    follow_up_actions TEXT, -- JSON array
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (target_id) REFERENCES health_exam_targets(id)
);
```

**API 엔드포인트**:
```typescript
// Form 007: 건강진단 대상자 등록
POST /api/health-exam/targets
GET /api/health-exam/targets/:year
PUT /api/health-exam/targets/:id/complete

// Form 008: 건강진단 결과 입력
POST /api/health-exam/results
GET /api/health-exam/results/:targetId
GET /api/health-exam/follow-up/list

// 알림 및 보고서
GET /api/health-exam/notifications/upcoming
GET /api/health-exam/reports/annual/:year
```

---

#### 2. 작업환경측정 관리 시스템
**법적 근거**: 산업안전보건법 제125조

**자동화 기능**:
- 작업환경측정 대상 작업장 자동 식별
- 측정 주기 자동 계산 (6개월/1년)
- 측정 일정 알림
- 측정 결과 입력 및 관리
- 노출 기준 초과 여부 자동 판정
- 개선 조치 추적
- 법정 보고서 자동 생성 (작업환경측정 결과표)

**DB 스키마 추가**:
```sql
-- 작업환경측정 대상
CREATE TABLE work_env_measurement_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workplace_name TEXT NOT NULL,
    process_id INTEGER NOT NULL,
    hazard_factors TEXT NOT NULL, -- JSON array (소음, 분진, 화학물질 등)
    measurement_cycle TEXT NOT NULL, -- 6months/12months
    last_measurement_date TEXT,
    next_due_date TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (process_id) REFERENCES processes(id)
);

-- 작업환경측정 결과
CREATE TABLE work_env_measurement_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_id INTEGER NOT NULL,
    measurement_date TEXT NOT NULL,
    measurement_institution TEXT NOT NULL,
    -- 측정 결과 (JSON)
    measurement_data TEXT,
    -- 판정
    exceeds_limit INTEGER DEFAULT 0,
    grade TEXT, -- excellent/good/poor/very_poor
    improvement_required INTEGER DEFAULT 0,
    improvement_details TEXT,
    improvement_completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (target_id) REFERENCES work_env_measurement_targets(id)
);
```

**API 엔드포인트**:
```typescript
// Form 009: 작업환경측정 대상 관리
POST /api/work-env/targets
GET /api/work-env/targets/active
PUT /api/work-env/targets/:id

// Form 010: 작업환경측정 결과
POST /api/work-env/results
GET /api/work-env/results/:targetId
GET /api/work-env/improvements/pending

// 알림 및 보고서
GET /api/work-env/notifications/upcoming
GET /api/work-env/reports/annual/:year
```

---

#### 3. 안전보건교육 관리 시스템
**법적 근거**: 산업안전보건법 제29조

**자동화 기능**:
- 교육 대상자 자동 분류 (정기/채용시/작업내용변경시/특별)
- 교육 이수 시간 자동 추적
- 교육 미이수자 자동 알림
- 교육 일정 관리
- 교육 참석 체크
- 교육 이수증 자동 발급
- 법정 교육시간 준수 여부 자동 체크

**DB 스키마 추가**:
```sql
-- 안전보건교육 일정
CREATE TABLE safety_education_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    education_type TEXT NOT NULL, -- regular/hiring/job_change/special
    education_title TEXT NOT NULL,
    education_date TEXT NOT NULL,
    education_hours REAL NOT NULL,
    instructor TEXT,
    location TEXT,
    target_count INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'scheduled', -- scheduled/in_progress/completed/cancelled
    created_at TEXT DEFAULT (datetime('now'))
);

-- 안전보건교육 이수 기록
CREATE TABLE safety_education_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    attended INTEGER DEFAULT 0,
    attendance_time TEXT,
    completion_hours REAL DEFAULT 0,
    certificate_issued INTEGER DEFAULT 0,
    certificate_number TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (schedule_id) REFERENCES safety_education_schedules(id),
    FOREIGN KEY (employee_id) REFERENCES users(id)
);

-- 직원별 교육 이수 현황
CREATE TABLE employee_education_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    -- 법정 교육시간
    required_hours REAL NOT NULL,
    completed_hours REAL DEFAULT 0,
    completion_rate REAL DEFAULT 0,
    is_compliant INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (employee_id) REFERENCES users(id)
);
```

**API 엔드포인트**:
```typescript
// Form 011: 안전보건교육 일정 관리
POST /api/safety-education/schedules
GET /api/safety-education/schedules/:year
PUT /api/safety-education/schedules/:id

// Form 012: 교육 참석 체크
POST /api/safety-education/attendance
GET /api/safety-education/attendance/:scheduleId

// 이수 관리
GET /api/safety-education/summary/:employeeId/:year
GET /api/safety-education/non-compliant/:year
POST /api/safety-education/certificate/:recordId

// 알림 및 보고서
GET /api/safety-education/notifications/upcoming
GET /api/safety-education/reports/annual/:year
```

---

### 우선순위 2: 일상 관리 업무 (중요도 높음) ⭐⭐

#### 4. 보호구 지급 및 관리
**자동화 기능**:
- 보호구 지급 대상 자동 식별
- 보호구 재고 관리
- 지급 기록 및 서명 수집
- 교체 주기 알림
- 지급 현황 보고서

**DB 스키마**:
```sql
-- 보호구 마스터
CREATE TABLE ppe_master (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ppe_name TEXT NOT NULL,
    ppe_type TEXT NOT NULL, -- helmet/gloves/mask/goggles/boots/earplugs
    replacement_cycle_months INTEGER NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 보호구 지급 기록
CREATE TABLE ppe_distribution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    ppe_id INTEGER NOT NULL,
    distribution_date TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    next_replacement_date TEXT,
    signature_data TEXT, -- Base64 signature
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (employee_id) REFERENCES users(id),
    FOREIGN KEY (ppe_id) REFERENCES ppe_master(id)
);
```

**API 엔드포인트**:
```typescript
// Form 013: 보호구 지급
POST /api/ppe/distribute
GET /api/ppe/distribution/:employeeId
GET /api/ppe/replacement-due

// 재고 관리
GET /api/ppe/inventory
POST /api/ppe/stock/update
GET /api/ppe/stock/low-alert
```

---

#### 5. MSDS (물질안전보건자료) 관리
**법적 근거**: 산업안전보건법 제110조~114조

**자동화 기능**:
- MSDS 등록 및 저장 (R2 Storage)
- 화학물질별 MSDS 검색
- MSDS 열람 이력 관리
- 유해화학물질 목록 자동 생성
- 취급 작업장 매핑
- MSDS 업데이트 알림

**DB 스키마**:
```sql
-- MSDS 마스터
CREATE TABLE msds_master (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chemical_name TEXT NOT NULL,
    product_name TEXT NOT NULL,
    manufacturer TEXT,
    cas_number TEXT,
    -- R2 Storage 경로
    msds_file_key TEXT NOT NULL,
    msds_version TEXT,
    issue_date TEXT,
    update_date TEXT,
    -- 위험성 분류
    hazard_class TEXT, -- JSON array
    signal_word TEXT, -- danger/warning
    is_cmr INTEGER DEFAULT 0, -- 발암성/생식독성 물질
    created_at TEXT DEFAULT (datetime('now'))
);

-- 화학물질 취급 작업장
CREATE TABLE chemical_workplaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    msds_id INTEGER NOT NULL,
    process_id INTEGER NOT NULL,
    usage_amount_per_year REAL,
    handling_frequency TEXT,
    protective_measures TEXT, -- JSON array
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (msds_id) REFERENCES msds_master(id),
    FOREIGN KEY (process_id) REFERENCES processes(id)
);

-- MSDS 열람 이력
CREATE TABLE msds_access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    msds_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    access_date TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (msds_id) REFERENCES msds_master(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**API 엔드포인트**:
```typescript
// Form 014: MSDS 등록
POST /api/msds/register
GET /api/msds/list
GET /api/msds/:id/download
PUT /api/msds/:id/update

// 검색 및 관리
GET /api/msds/search?q=:keyword
GET /api/msds/cmr/list
GET /api/msds/workplace/:processId

// 이력 관리
POST /api/msds/:id/log-access
GET /api/msds/:id/access-history
```

---

#### 6. 안전보건 점검 체크리스트
**자동화 기능**:
- 일일/주간/월간 점검 체크리스트
- 점검 항목 자동 생성
- 점검 결과 기록
- 불량 항목 개선 추적
- 점검 통계 및 트렌드 분석

**DB 스키마**:
```sql
-- 점검 체크리스트 템플릿
CREATE TABLE inspection_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL,
    inspection_type TEXT NOT NULL, -- daily/weekly/monthly
    target_area TEXT, -- workplace/equipment/facility
    checklist_items TEXT NOT NULL, -- JSON array
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 점검 기록
CREATE TABLE inspection_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    inspector_id INTEGER NOT NULL,
    inspection_date TEXT NOT NULL,
    target_location TEXT,
    -- 점검 결과 (JSON)
    inspection_results TEXT NOT NULL,
    defect_count INTEGER DEFAULT 0,
    defects_resolved INTEGER DEFAULT 0,
    overall_status TEXT DEFAULT 'pending', -- pass/fail/pending
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (template_id) REFERENCES inspection_templates(id),
    FOREIGN KEY (inspector_id) REFERENCES users(id)
);

-- 불량 항목 개선 추적
CREATE TABLE inspection_defects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL,
    defect_item TEXT NOT NULL,
    defect_description TEXT,
    severity TEXT, -- low/medium/high/critical
    corrective_action TEXT,
    responsible_person TEXT,
    due_date TEXT,
    status TEXT DEFAULT 'open', -- open/in_progress/resolved
    resolved_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (record_id) REFERENCES inspection_records(id)
);
```

**API 엔드포인트**:
```typescript
// Form 015: 안전보건 점검
POST /api/inspection/templates
GET /api/inspection/templates/:type
POST /api/inspection/records
GET /api/inspection/records/:date
PUT /api/inspection/records/:id

// 불량 관리
GET /api/inspection/defects/open
PUT /api/inspection/defects/:id/resolve
GET /api/inspection/statistics/:year/:month
```

---

### 우선순위 3: 자동화 고도화 (편의성 향상) ⭐

#### 7. 법정 서류 자동 생성
**자동화 기능**:
- 산업안전보건위원회 회의록
- 안전보건관리규정
- 유해위험방지계획서
- 도급승인 신청서
- 각종 보고서 템플릿 자동 작성

#### 8. 대시보드 및 알림 시스템
**자동화 기능**:
- 실시간 안전보건 현황 대시보드
- 법정 기한 임박 알림 (건강진단, 작업환경측정, 교육)
- 이메일/SMS/Slack 알림 통합
- 월간/분기/연간 보고서 자동 생성
- KPI 자동 계산 (재해율, 교육 이수율, 건강진단 실시율)

#### 9. 산업재해 보고 시스템
**자동화 기능**:
- 산업재해 발생 즉시 보고
- 재해조사 보고서 작성 지원
- 원인 분석 및 재발 방지 대책
- 통계 분석 (재해 유형, 발생 부서, 시간대)
- 고용노동부 보고 양식 자동 생성

#### 10. 건강증진 프로그램 관리
**자동화 기능**:
- 금연 프로그램 참여자 관리
- 건강 캠페인 일정 관리
- 참여율 통계
- 효과 분석

---

## 📋 구현 우선순위 매트릭스

| 기능 | 법적 의무 | 자동화 효과 | 구현 난이도 | 우선순위 |
|------|-----------|-------------|-------------|----------|
| 건강진단 관리 | ⭐⭐⭐ | ⭐⭐⭐ | 중간 | **1위** |
| 작업환경측정 관리 | ⭐⭐⭐ | ⭐⭐⭐ | 중간 | **2위** |
| 안전보건교육 관리 | ⭐⭐⭐ | ⭐⭐⭐ | 중간 | **3위** |
| 보호구 지급 관리 | ⭐⭐ | ⭐⭐ | 낮음 | **4위** |
| MSDS 관리 | ⭐⭐ | ⭐⭐ | 낮음 | **5위** |
| 점검 체크리스트 | ⭐⭐ | ⭐⭐ | 낮음 | **6위** |
| 알림 시스템 | ⭐ | ⭐⭐⭐ | 낮음 | **7위** |
| 법정 서류 생성 | ⭐ | ⭐⭐ | 높음 | 8위 |
| 재해 보고 시스템 | ⭐⭐ | ⭐⭐ | 중간 | 9위 |
| 건강증진 프로그램 | ⭐ | ⭐ | 낮음 | 10위 |

---

## 🚀 1단계 구현 계획 (우선순위 1-3)

### Phase 1: 건강진단 관리 (Form 007-008)
**목표**: 법정 건강진단 업무 100% 자동화
**예상 기간**: 2주

**구현 항목**:
1. D1 스키마 추가 (`health_exam_targets`, `health_exam_results`)
2. API 라우트 추가 (`workers/src/routes/health-exam.ts`)
3. 건강진단 대상자 등록 폼 (Form 007)
4. 건강진단 결과 입력 폼 (Form 008)
5. 사후관리 대상자 대시보드
6. 건강진단 일정 알림 기능
7. 법정 보고서 생성 (Excel)

### Phase 2: 작업환경측정 관리 (Form 009-010)
**목표**: 작업환경측정 업무 자동화
**예상 기간**: 2주

**구현 항목**:
1. D1 스키마 추가 (`work_env_measurement_targets`, `work_env_measurement_results`)
2. API 라우트 추가 (`workers/src/routes/work-env.ts`)
3. 측정 대상 관리 폼 (Form 009)
4. 측정 결과 입력 폼 (Form 010)
5. 개선 조치 추적
6. 측정 일정 알림 기능
7. 법정 보고서 생성

### Phase 3: 안전보건교육 관리 (Form 011-012)
**목표**: 교육 이수 시간 자동 추적
**예상 기간**: 2주

**구현 항목**:
1. D1 스키마 추가 (`safety_education_schedules`, `safety_education_records`, `employee_education_summary`)
2. API 라우트 추가 (`workers/src/routes/safety-education.ts`)
3. 교육 일정 관리 폼 (Form 011)
4. 교육 참석 체크 폼 (Form 012)
5. 교육 이수증 자동 발급
6. 미이수자 자동 알림
7. 연간 교육 현황 보고서

---

## 🎯 기대 효과

### 업무 효율성
- ⏱️ **시간 절감**: 수작업 대비 70% 시간 단축
- 📉 **오류 감소**: 수기 입력 오류 90% 감소
- 🔔 **누락 방지**: 법정 기한 자동 알림으로 100% 준수

### 법적 리스크 관리
- ✅ **법 준수**: 산업안전보건법 법정 의무사항 100% 이행
- 📋 **증적 관리**: 모든 기록 자동 보관 및 추적
- 🚨 **리스크 예방**: 기한 임박 자동 알림

### 데이터 기반 의사결정
- 📊 **실시간 현황**: 대시보드로 전체 현황 한눈에 파악
- 📈 **트렌드 분석**: 연도별/부서별 통계 자동 생성
- 🎯 **KPI 관리**: 안전보건 지표 자동 계산

---

## 📝 다음 단계

1. ✅ 이 계획서 검토 및 승인
2. ⏭️ Phase 1 상세 설계 (건강진단 관리)
3. ⏭️ D1 스키마 업데이트
4. ⏭️ API 및 폼 개발
5. ⏭️ 테스트 및 배포

---

**담당자**: Claude Code AI
**문서 버전**: 1.0
**최종 수정**: 2025-11-13
