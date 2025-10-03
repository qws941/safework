# 관리자 페이지 개선 계획

**작성일**: 2025-09-30
**현재 상태**: 기본 기능 작동 중
**목표**: 사용성 및 기능 대폭 개선

---

## 📊 현재 상황 분석

### ✅ 정상 작동 중인 기능
1. **통합 통계 표시**
   - 총 제출 수: 18개
   - Form 001: 14개
   - Form 002: 4개
   - 평균 나이, 증상 보고 등

2. **차트 시각화**
   - 통증 분포 도넛 차트
   - 부서별 분포 막대 차트
   - 7일 타임라인 차트

3. **최근 제출 목록**
   - 최근 10개 설문 표시
   - 기본 정보 (ID, 이름, 부서)

4. **개별 설문 조회**
   - 상세보기 링크 제공

### ⚠️ 개선 필요 사항

#### 1. 시간 표시 문제
**현재**: UTC 시간으로 표시
```
2025-09-30T09:56:21.995Z
```

**개선**: KST (한국 시간) 표시
```
2025-09-30 18:56:21 (KST)
오후 6시 56분
```

#### 2. 실시간 업데이트 없음
**현재**: 페이지 새로고침 필요
**개선**: 자동 갱신 기능 추가 (30초마다)

#### 3. 데이터 필터링 부재
**현재**: 전체 데이터만 표시
**개선**:
- 날짜 범위 필터
- 부서별 필터
- 양식별 필터
- 증상 유무 필터

#### 4. 검색 기능 없음
**현재**: 이름/ID 검색 불가
**개선**: 통합 검색 기능

#### 5. 데이터 내보내기 없음
**현재**: 수동으로 복사 필요
**개선**:
- CSV 내보내기
- Excel 내보내기
- PDF 리포트 생성

#### 6. 상세 정보 부족
**현재**: 기본 정보만 표시
**개선**:
- 증상 상세 정보
- 응답 데이터 전체 표시
- 제출 이력 추적

#### 7. 반응형 디자인 미흡
**현재**: 데스크톱 중심
**개선**: 모바일 최적화

#### 8. 페이지네이션 없음
**현재**: 최근 10개만 표시
**개선**: 전체 데이터 페이지네이션

---

## 🎯 개선 우선순위

### Phase 1: 긴급 개선 (오늘)
1. ✅ **KST 시간 표시**
2. ✅ **실시간 자동 갱신**
3. ✅ **부서별 필터링**
4. ✅ **검색 기능**

### Phase 2: 주요 개선 (이번 주)
1. **데이터 내보내기 (CSV, Excel)**
2. **날짜 범위 필터**
3. **상세 정보 모달**
4. **페이지네이션**

### Phase 3: 고급 기능 (다음 주)
1. **통계 대시보드 확장**
2. **커스텀 리포트**
3. **데이터 비교 기능**
4. **알림 설정**

---

## 🛠️ Phase 1 상세 구현 계획

### 1. KST 시간 표시 개선

#### 구현 내용
```javascript
// UTC를 KST로 변환하는 함수
function formatKST(utcString) {
  const date = new Date(utcString);
  const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));

  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul'
  };

  return new Intl.DateTimeFormat('ko-KR', options).format(date);
}

// 상대 시간 표시 (5분 전, 1시간 전 등)
function getRelativeTime(utcString) {
  const now = new Date();
  const date = new Date(utcString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return formatKST(utcString);
}
```

#### 적용 위치
- 최근 제출 목록
- 개별 설문 상세 정보
- 타임라인 차트
- 통계 카드 (마지막 업데이트 시간)

---

### 2. 실시간 자동 갱신

#### 구현 내용
```javascript
// 자동 갱신 설정
let autoRefreshInterval;
let autoRefreshEnabled = true;
const REFRESH_INTERVAL = 30000; // 30초

function startAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }

  autoRefreshInterval = setInterval(() => {
    if (autoRefreshEnabled) {
      loadDashboard();
      updateLastRefreshTime();
    }
  }, REFRESH_INTERVAL);
}

function updateLastRefreshTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ko-KR');
  document.getElementById('last-refresh-time').textContent =
    `마지막 업데이트: ${timeStr}`;
}

// 토글 버튼
function toggleAutoRefresh() {
  autoRefreshEnabled = !autoRefreshEnabled;
  const btn = document.getElementById('auto-refresh-toggle');
  btn.textContent = autoRefreshEnabled ?
    '자동 갱신 켜짐' : '자동 갱신 꺼짐';
  btn.classList.toggle('btn-success', autoRefreshEnabled);
  btn.classList.toggle('btn-secondary', !autoRefreshEnabled);
}
```

#### UI 추가
```html
<div class="refresh-controls">
  <button id="manual-refresh" class="btn btn-primary">
    <i class="bi bi-arrow-clockwise"></i> 새로고침
  </button>
  <button id="auto-refresh-toggle" class="btn btn-success">
    <i class="bi bi-lightning-fill"></i> 자동 갱신 켜짐
  </button>
  <span id="last-refresh-time" class="text-muted ms-3">
    마지막 업데이트: --:--:--
  </span>
</div>
```

---

### 3. 부서별 필터링

#### 구현 내용
```javascript
let currentFilters = {
  department: 'all',
  formType: 'all',
  hasSymptoms: 'all',
  dateRange: 'all'
};

function applyFilters(submissions) {
  return submissions.filter(sub => {
    // 부서 필터
    if (currentFilters.department !== 'all' &&
        sub.department !== currentFilters.department) {
      return false;
    }

    // 양식 필터
    if (currentFilters.formType !== 'all') {
      const isForm001 = sub.form_type.includes('001');
      if (currentFilters.formType === '001' && !isForm001) return false;
      if (currentFilters.formType === '002' && isForm001) return false;
    }

    // 증상 필터
    if (currentFilters.hasSymptoms !== 'all') {
      const hasSymptoms = sub.has_symptoms === 1;
      if (currentFilters.hasSymptoms === 'yes' && !hasSymptoms) return false;
      if (currentFilters.hasSymptoms === 'no' && hasSymptoms) return false;
    }

    return true;
  });
}

function updateFilterUI() {
  const filtered = applyFilters(allSubmissions);
  loadRecentSubmissions(filtered);
  updateFilteredStats(filtered);
}
```

#### UI 추가
```html
<div class="filter-panel">
  <h5>필터</h5>
  <div class="row">
    <div class="col-md-3">
      <label>부서</label>
      <select id="filter-department" class="form-select">
        <option value="all">전체</option>
        <!-- 동적으로 부서 목록 생성 -->
      </select>
    </div>
    <div class="col-md-3">
      <label>양식</label>
      <select id="filter-formType" class="form-select">
        <option value="all">전체</option>
        <option value="001">Form 001</option>
        <option value="002">Form 002</option>
      </select>
    </div>
    <div class="col-md-3">
      <label>증상</label>
      <select id="filter-hasSymptoms" class="form-select">
        <option value="all">전체</option>
        <option value="yes">있음</option>
        <option value="no">없음</option>
      </select>
    </div>
    <div class="col-md-3">
      <label>&nbsp;</label>
      <button id="reset-filters" class="btn btn-secondary w-100">
        <i class="bi bi-x-circle"></i> 필터 초기화
      </button>
    </div>
  </div>
</div>
```

---

### 4. 검색 기능

#### 구현 내용
```javascript
function searchSubmissions(query) {
  if (!query || query.trim() === '') {
    return allSubmissions;
  }

  const lowerQuery = query.toLowerCase().trim();

  return allSubmissions.filter(sub => {
    // ID 검색
    if (sub.submission_id.toString() === lowerQuery) {
      return true;
    }

    // 이름 검색 (부분 일치)
    if (sub.name && sub.name.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // 부서 검색
    if (sub.department && sub.department.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    return false;
  });
}

// 실시간 검색
document.getElementById('search-input').addEventListener('input', (e) => {
  const query = e.target.value;
  const results = searchSubmissions(query);
  loadRecentSubmissions(results);

  // 검색 결과 개수 표시
  document.getElementById('search-results-count').textContent =
    `${results.length}건의 결과`;
});
```

#### UI 추가
```html
<div class="search-panel">
  <div class="input-group input-group-lg">
    <span class="input-group-text">
      <i class="bi bi-search"></i>
    </span>
    <input
      type="text"
      id="search-input"
      class="form-control"
      placeholder="ID, 이름, 부서로 검색..."
      autocomplete="off"
    >
    <button class="btn btn-outline-secondary" id="clear-search">
      <i class="bi bi-x"></i>
    </button>
  </div>
  <small id="search-results-count" class="text-muted d-block mt-2">
    전체 18건
  </small>
</div>
```

---

## 📱 모바일 최적화

### 반응형 통계 카드
```css
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .stat-card {
    padding: 15px;
  }

  .chart-container {
    height: 250px !important;
  }

  .submission-item {
    flex-direction: column;
    align-items: flex-start !important;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## 🎨 UI/UX 개선

### 로딩 상태 개선
```html
<div id="loading" class="loading-overlay">
  <div class="spinner-container">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">로딩 중...</span>
    </div>
    <p class="mt-3">데이터를 불러오는 중입니다...</p>
  </div>
</div>
```

### 빈 상태 처리
```html
<div class="empty-state" style="display: none;">
  <i class="bi bi-inbox" style="font-size: 4rem; color: #ccc;"></i>
  <h4 class="mt-3">검색 결과가 없습니다</h4>
  <p class="text-muted">다른 검색어를 입력하거나 필터를 조정해보세요.</p>
</div>
```

### 성공/오류 토스트
```javascript
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${type} border-0`;
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto"></button>
    </div>
  `;

  document.getElementById('toast-container').appendChild(toast);
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();

  setTimeout(() => toast.remove(), 3000);
}
```

---

## 📊 개선된 차트

### 타임라인 차트 개선
```javascript
// 시간대별 제출 분포
function renderHourlyChart(submissions) {
  const hourlyData = new Array(24).fill(0);

  submissions.forEach(sub => {
    const date = new Date(sub.submitted_at);
    const kstHour = (date.getUTCHours() + 9) % 24;
    hourlyData[kstHour]++;
  });

  const ctx = document.getElementById('hourlyChart');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array.from({length: 24}, (_, i) => `${i}시`),
      datasets: [{
        label: '시간대별 제출',
        data: hourlyData,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}
```

---

## 🚀 배포 계획

### 1단계: 코드 수정
- [ ] KST 시간 변환 함수 추가
- [ ] 자동 갱신 로직 구현
- [ ] 필터링 기능 추가
- [ ] 검색 기능 추가

### 2단계: 테스트
- [ ] 브라우저 테스트 (Chrome, Firefox, Safari)
- [ ] 모바일 테스트 (iOS, Android)
- [ ] 성능 테스트

### 3단계: 배포
- [ ] GitHub에 푸시
- [ ] Cloudflare Workers 배포
- [ ] 프로덕션 확인

### 4단계: 모니터링
- [ ] 사용자 피드백 수집
- [ ] 에러 모니터링
- [ ] 성능 모니터링

---

## 📝 다음 단계

1. **Phase 1 개선사항 즉시 구현**
2. **사용자 테스트 및 피드백**
3. **Phase 2, 3 계획 조정**
4. **지속적 개선**

---

**작성자**: Claude Code
**상태**: 계획 수립 완료
**다음 액션**: Phase 1 구현 시작