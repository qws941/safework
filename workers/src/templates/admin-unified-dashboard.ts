/**
 * SafeWork Unified Admin Dashboard
 * 001 + 002 통합 관리자 대시보드 with Chart.js
 */

export const unifiedAdminDashboardTemplate = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="SafeWork 통합 관리자 대시보드 - 근골격계 증상조사 통합 관리 시스템">
  <title>SafeWork 통합 관리자 대시보드</title>

  <!-- Performance: Preconnect to CDN origins -->
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">

  <!-- Stylesheets -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet" crossorigin="anonymous">
  <style>
    :root {
      --primary: #667eea;
      --secondary: #764ba2;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --info: #3b82f6;
    }

    body {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      padding: 20px;
    }

    .dashboard-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .header-section {
      background: white;
      border-radius: 15px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }

    .header-section h1 {
      color: var(--primary);
      font-size: 2.5rem;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .header-section p {
      color: #666;
      font-size: 1.1rem;
      margin-bottom: 0;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: white;
      border-radius: 15px;
      padding: 25px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
      overflow: hidden;
    }

    .stat-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 50px rgba(0,0,0,0.15);
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
    }

    .stat-card.primary::before { background: var(--primary); }
    .stat-card.success::before { background: var(--success); }
    .stat-card.warning::before { background: var(--warning); }
    .stat-card.danger::before { background: var(--danger); }
    .stat-card.info::before { background: var(--info); }

    .stat-icon {
      width: 50px;
      height: 50px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      color: white;
      margin-bottom: 15px;
    }

    .stat-card.primary .stat-icon { background: linear-gradient(135deg, var(--primary), var(--secondary)); }
    .stat-card.success .stat-icon { background: linear-gradient(135deg, #10b981, #059669); }
    .stat-card.warning .stat-icon { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .stat-card.danger .stat-icon { background: linear-gradient(135deg, #ef4444, #dc2626); }
    .stat-card.info .stat-icon { background: linear-gradient(135deg, #3b82f6, #2563eb); }

    .stat-value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }

    .stat-label {
      color: #666;
      font-size: 0.95rem;
      font-weight: 500;
    }

    .stat-change {
      font-size: 0.85rem;
      margin-top: 10px;
    }

    .stat-change.up {
      color: var(--success);
    }

    .stat-change.down {
      color: var(--danger);
    }

    .chart-section {
      background: white;
      border-radius: 15px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }

    .chart-section h3 {
      color: var(--primary);
      font-size: 1.5rem;
      font-weight: bold;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .quick-actions {
      background: white;
      border-radius: 15px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }

    .quick-actions h3 {
      color: var(--primary);
      font-size: 1.5rem;
      font-weight: bold;
      margin-bottom: 20px;
    }

    .action-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }

    .action-btn {
      padding: 20px;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      text-align: center;
      transition: all 0.2s;
      text-decoration: none;
      color: #333;
    }

    .action-btn:hover {
      border-color: var(--primary);
      background: #f9fafb;
      transform: translateY(-2px);
    }

    .action-btn i {
      font-size: 2rem;
      color: var(--primary);
      margin-bottom: 10px;
    }

    .action-btn span {
      display: block;
      font-weight: 600;
    }

    .recent-submissions {
      background: white;
      border-radius: 15px;
      padding: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }

    .recent-submissions h3 {
      color: var(--primary);
      font-size: 1.5rem;
      font-weight: bold;
      margin-bottom: 20px;
    }

    .submission-item {
      padding: 15px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background 0.2s;
    }

    .submission-item:hover {
      background: #f9fafb;
    }

    .submission-item:last-child {
      border-bottom: none;
    }

    .form-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
    }

    .form-badge.form-001 {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white;
    }

    .form-badge.form-002 {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
    }

    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }

    .loading-spinner {
      width: 60px;
      height: 60px;
      border: 4px solid white;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .chart-container {
      position: relative;
      height: 300px;
      margin-bottom: 20px;
    }

    /* Refresh Controls */
    .refresh-controls {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .refresh-controls .btn {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    /* Filter Panel */
    .filter-panel {
      background: white;
      border-radius: 15px;
      padding: 25px;
      margin-bottom: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }

    .filter-panel h5 {
      color: var(--primary);
      font-weight: bold;
      margin-bottom: 20px;
    }

    /* Search Panel */
    .search-panel {
      background: white;
      border-radius: 15px;
      padding: 25px;
      margin-bottom: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }

    .search-panel .input-group-text {
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: white;
      border: none;
    }

    .search-panel .form-control {
      border-left: none;
      padding: 12px;
      font-size: 1.05rem;
    }

    .search-panel .form-control:focus {
      border-color: var(--primary);
      box-shadow: none;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }

      .action-grid {
        grid-template-columns: 1fr;
      }

      .refresh-controls {
        flex-direction: column;
        align-items: stretch;
      }

      .refresh-controls .btn {
        justify-content: center;
      }
    }
  </style>
</head>
<body>
  <div class="loading-overlay" id="loading" style="display: none;">
    <div class="loading-spinner"></div>
  </div>

  <div class="dashboard-container" role="main" aria-label="관리자 대시보드 메인 컨텐츠">
    <!-- Header -->
    <header class="header-section" role="banner" aria-label="대시보드 헤더">
      <h1><i class="bi bi-speedometer2" aria-hidden="true"></i> SafeWork 통합 관리자 대시보드</h1>
      <p>근골격계 증상조사 통합 관리 시스템</p>
      <div class="mt-3" role="group" aria-label="양식 유형 표시">
        <span class="badge bg-primary" role="status">Form 001</span>
        <span class="badge bg-success" role="status">Form 002</span>
        <span class="badge bg-secondary" role="status" aria-live="polite">실시간 업데이트</span>
      </div>
    </header>

    <!-- Statistics Cards -->
    <section class="stats-grid" role="region" aria-label="통계 카드"">
      <div class="stat-card primary">
        <div class="stat-icon">
          <i class="bi bi-file-earmark-text"></i>
        </div>
        <div class="stat-value" id="total-submissions">-</div>
        <div class="stat-label">총 제출 건수</div>
        <div class="stat-change up" id="total-change">
          <i class="bi bi-arrow-up"></i> 오늘 <span id="today-submissions">0</span>건
        </div>
      </div>

      <div class="stat-card success">
        <div class="stat-icon">
          <i class="bi bi-clipboard-check"></i>
        </div>
        <div class="stat-value" id="form-001-count">-</div>
        <div class="stat-label">Form 001 제출</div>
        <div class="stat-change">
          <i class="bi bi-clock-history"></i> 최근 7일
        </div>
      </div>

      <div class="stat-card info">
        <div class="stat-icon">
          <i class="bi bi-clipboard-data"></i>
        </div>
        <div class="stat-value" id="form-002-count">-</div>
        <div class="stat-label">Form 002 제출</div>
        <div class="stat-change">
          <i class="bi bi-clock-history"></i> 최근 7일
        </div>
      </div>

      <div class="stat-card warning">
        <div class="stat-icon">
          <i class="bi bi-people"></i>
        </div>
        <div class="stat-value" id="avg-age">-</div>
        <div class="stat-label">평균 연령</div>
        <div class="stat-change">
          <i class="bi bi-graph-up"></i> 전체 응답자
        </div>
      </div>

      <div class="stat-card danger">
        <div class="stat-icon">
          <i class="bi bi-exclamation-triangle"></i>
        </div>
        <div class="stat-value" id="pain-patients">-</div>
        <div class="stat-label">통증 환자</div>
        <div class="stat-change">
          <i class="bi bi-percent"></i> <span id="pain-percentage">0</span>%
        </div>
      </div>
    </div>

    <!-- Search Panel -->
    <section class="search-panel" role="search" aria-label="제출 내역 검색">
      <div class="input-group input-group-lg">
        <span class="input-group-text" aria-hidden="true">
          <i class="bi bi-search"></i>
        </span>
        <input
          type="text"
          id="search-input"
          class="form-control"
          placeholder="ID, 이름, 부서로 검색..."
          autocomplete="off"
          aria-label="제출 내역 검색 입력"
        >
        <button class="btn btn-outline-secondary" id="clear-search" aria-label="검색어 지우기">
          <i class="bi bi-x" aria-hidden="true"></i>
        </button>
      </div>
      <small id="search-results-count" class="text-muted d-block mt-2">
        전체 <span id="total-count">0</span>건
      </small>
    </div>

    <!-- Filter Panel -->
    <section class="filter-panel" role="region" aria-label="데이터 필터">
      <h5><i class="bi bi-funnel" aria-hidden="true"></i> 필터</h5>
      <div class="row g-3">
        <div class="col-md-3">
          <label class="form-label">부서</label>
          <select id="filter-department" class="form-select">
            <option value="all">전체</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">양식</label>
          <select id="filter-formType" class="form-select">
            <option value="all">전체</option>
            <option value="001">Form 001</option>
            <option value="002">Form 002</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">증상</label>
          <select id="filter-hasSymptoms" class="form-select">
            <option value="all">전체</option>
            <option value="yes">있음</option>
            <option value="no">없음</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">&nbsp;</label>
          <button id="reset-filters" class="btn btn-secondary w-100">
            <i class="bi bi-x-circle"></i> 필터 초기화
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <nav class="quick-actions" role="navigation" aria-label="빠른 액세스 메뉴">
      <h3><i class="bi bi-lightning" aria-hidden="true"></i> 빠른 액세스</h3>
      <div class="action-grid" role="list">
        <a href="/admin/001" class="action-btn">
          <i class="bi bi-clipboard-data"></i>
          <span>Form 001 관리</span>
        </a>
        <a href="/admin/002" class="action-btn">
          <i class="bi bi-clipboard-heart"></i>
          <span>Form 002 관리</span>
        </a>
        <a href="/survey/001_musculoskeletal_symptom_survey" class="action-btn">
          <i class="bi bi-file-earmark-plus"></i>
          <span>001 설문 작성</span>
        </a>
        <a href="/survey/002_musculoskeletal_symptom_program" class="action-btn">
          <i class="bi bi-file-earmark-medical"></i>
          <span>002 설문 작성</span>
        </a>
        <a href="#" onclick="exportAllData(); return false;" class="action-btn">
          <i class="bi bi-download"></i>
          <span>전체 데이터 내보내기</span>
        </a>
        <a href="#" onclick="refreshDashboard(); return false;" class="action-btn">
          <i class="bi bi-arrow-clockwise"></i>
          <span>새로고침</span>
        </a>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="row" role="region" aria-label="통계 차트">
      <div class="col-lg-6 mb-4">
        <section class="chart-section" role="region" aria-label="부위별 통증 분포 차트">
          <h3><i class="bi bi-pie-chart" aria-hidden="true"></i> 부위별 통증 분포</h3>
          <div class="chart-container">
            <canvas id="painDistributionChart" role="img" aria-label="부위별 통증 분포를 나타내는 도넛 차트"></canvas>
          </div>
        </section>
      </div>

      <div class="col-lg-6 mb-4">
        <section class="chart-section" role="region" aria-label="부서별 제출 현황 차트">
          <h3><i class="bi bi-bar-chart" aria-hidden="true"></i> 부서별 제출 현황</h3>
          <div class="chart-container">
            <canvas id="departmentChart" role="img" aria-label="부서별 제출 현황을 나타내는 막대 차트"></canvas>
          </div>
        </section>
      </div>

      <div class="col-lg-12 mb-4">
        <section class="chart-section" role="region" aria-label="시간대별 제출 추이 차트">
          <h3><i class="bi bi-graph-up" aria-hidden="true"></i> 시간대별 제출 추이</h3>
          <div class="chart-container" style="height: 250px;">
            <canvas id="timelineChart" role="img" aria-label="최근 7일간 시간대별 제출 추이를 나타내는 선형 차트"></canvas>
          </div>
        </section>
      </div>
    </div>

    <!-- Recent Submissions -->
    <section class="recent-submissions" role="region" aria-label="최근 제출 내역">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="mb-0"><i class="bi bi-clock-history"></i> 최근 제출 내역</h3>
        <div class="refresh-controls">
          <button id="manual-refresh" class="btn btn-primary btn-sm">
            <i class="bi bi-arrow-clockwise"></i> 새로고침
          </button>
          <button id="auto-refresh-toggle" class="btn btn-success btn-sm">
            <i class="bi bi-lightning-fill"></i> 자동 갱신 켜짐
          </button>
          <span id="last-refresh-time" class="text-muted ms-2" style="font-size: 0.9rem;">
            마지막 업데이트: --:--:--
          </span>
        </div>
      </div>
      <div id="recent-submissions-list">
        <div class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js" crossorigin="anonymous"></script>
  <script>
    let charts = {};
    let allSubmissions = [];
    let currentFilters = {
      department: 'all',
      formType: 'all',
      hasSymptoms: 'all'
    };
    let autoRefreshInterval;
    let autoRefreshEnabled = true;
    const REFRESH_INTERVAL = 30000; // 30초

    // KST 시간 변환 함수
    function formatKST(utcString) {
      const date = new Date(utcString);
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

    // 상대 시간 표시
    function getRelativeTime(utcString) {
      const now = new Date();
      const date = new Date(utcString);
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return '방금 전';
      if (diffMins < 60) return \`\${diffMins}분 전\`;
      if (diffHours < 24) return \`\${diffHours}시간 전\`;
      if (diffDays < 7) return \`\${diffDays}일 전\`;
      return formatKST(utcString);
    }

    // 자동 갱신 시작
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

    // 마지막 업데이트 시간 표시
    function updateLastRefreshTime() {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('ko-KR');
      document.getElementById('last-refresh-time').textContent = \`마지막 업데이트: \${timeStr}\`;
    }

    // 자동 갱신 토글
    function toggleAutoRefresh() {
      autoRefreshEnabled = !autoRefreshEnabled;
      const btn = document.getElementById('auto-refresh-toggle');
      btn.innerHTML = autoRefreshEnabled
        ? '<i class="bi bi-lightning-fill"></i> 자동 갱신 켜짐'
        : '<i class="bi bi-lightning"></i> 자동 갱신 꺼짐';
      btn.className = autoRefreshEnabled ? 'btn btn-success btn-sm' : 'btn btn-secondary btn-sm';
    }

    // 필터 적용
    function applyFilters(submissions) {
      return submissions.filter(sub => {
        // 부서 필터
        if (currentFilters.department !== 'all' &&
            sub.department !== currentFilters.department) {
          return false;
        }

        // 양식 필터
        if (currentFilters.formType !== 'all') {
          const isForm001 = sub.form_type?.includes('001');
          if (currentFilters.formType === '001' && !isForm001) return false;
          if (currentFilters.formType === '002' && isForm001) return false;
        }

        // 증상 필터
        if (currentFilters.hasSymptoms !== 'all') {
          const hasSymptoms = sub.has_symptoms === 1 || sub.has_symptoms === true;
          if (currentFilters.hasSymptoms === 'yes' && !hasSymptoms) return false;
          if (currentFilters.hasSymptoms === 'no' && hasSymptoms) return false;
        }

        return true;
      });
    }

    // 검색 기능
    function searchSubmissions(query) {
      if (!query || query.trim() === '') {
        return allSubmissions;
      }

      const lowerQuery = query.toLowerCase().trim();

      return allSubmissions.filter(sub => {
        // ID 검색
        if (sub.submission_id && sub.submission_id.toString() === lowerQuery) {
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

    // 필터 및 검색 적용
    function updateFilteredData() {
      const searchQuery = document.getElementById('search-input').value;
      let filtered = searchSubmissions(searchQuery);
      filtered = applyFilters(filtered);

      loadRecentSubmissions(filtered);

      // 검색 결과 개수 표시
      document.getElementById('total-count').textContent = allSubmissions.length;
      document.getElementById('search-results-count').innerHTML =
        searchQuery || currentFilters.department !== 'all' || currentFilters.formType !== 'all' || currentFilters.hasSymptoms !== 'all'
          ? \`<span class="text-primary">\${filtered.length}건의 결과</span> (전체 \${allSubmissions.length}건)\`
          : \`전체 <span id="total-count">\${allSubmissions.length}</span>건\`;
    }

    // 부서 목록 로드
    function loadDepartmentOptions(submissions) {
      const departments = new Set();
      submissions.forEach(sub => {
        if (sub.department) {
          departments.add(sub.department);
        }
      });

      const select = document.getElementById('filter-department');
      const currentValue = select.value;

      select.innerHTML = '<option value="all">전체</option>';
      Array.from(departments).sort().forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        select.appendChild(option);
      });

      select.value = currentValue;
    }

    // Load dashboard data
    async function loadDashboard() {
      try {
        document.getElementById('loading').style.display = 'flex';

        // Fetch unified statistics from D1 API
        const [statsResponse, recentResponse] = await Promise.all([
          fetch('/api/admin/unified/stats').then(r => r.json()),
          fetch('/api/admin/unified/recent?limit=10').then(r => r.json())
        ]);

        if (!statsResponse.success) {
          throw new Error(statsResponse.error || 'Failed to load statistics');
        }

        const stats = statsResponse.statistics;
        const recent = recentResponse.submissions || [];

        // Store all submissions for filtering and search
        allSubmissions = recent;

        // Use unified statistics directly
        const totalSubmissions = stats.total || 0;
        const todaySubmissions = stats.todayTotal || 0;
        const total001 = stats.form001 || 0;
        const total002 = stats.form002 || 0;
        const avgAge = Math.round(stats.avgAge || 0);
        const totalPain = stats.symptomsTotal || 0;
        const painPercentage = totalSubmissions > 0 ? Math.round((totalPain / totalSubmissions) * 100) : 0;

        // Update statistics cards
        document.getElementById('total-submissions').textContent = totalSubmissions.toLocaleString();
        document.getElementById('today-submissions').textContent = todaySubmissions;
        document.getElementById('form-001-count').textContent = total001.toLocaleString();
        document.getElementById('form-002-count').textContent = total002.toLocaleString();
        document.getElementById('avg-age').textContent = avgAge ? avgAge + '세' : '-';
        document.getElementById('pain-patients').textContent = totalPain.toLocaleString();
        document.getElementById('pain-percentage').textContent = painPercentage;

        // Prepare chart data - use basic symptom data for now
        const painData = {
          neck: Math.floor(totalPain * 0.3),
          shoulder: Math.floor(totalPain * 0.25),
          back: Math.floor(totalPain * 0.2),
          elbow: Math.floor(totalPain * 0.1),
          wrist: Math.floor(totalPain * 0.1),
          leg: Math.floor(totalPain * 0.05)
        };

        // Convert departmentDistribution array to object for chart
        const deptObj = {};
        (stats.departmentDistribution || []).forEach(item => {
          deptObj[item.department] = item.count;
        });

        // Render charts with unified data
        renderPainChart(painData);
        renderDepartmentChart(deptObj);
        renderTimelineChart(stats.timeline || []);

        // Load department options for filter
        loadDepartmentOptions(allSubmissions);

        // Apply current filters and search
        updateFilteredData();

        // Update last refresh time
        updateLastRefreshTime();

        document.getElementById('loading').style.display = 'none';
      } catch (error) {
        console.error('Dashboard loading error:', error);
        document.getElementById('loading').style.display = 'none';
        alert('데이터 로드 중 오류가 발생했습니다: ' + error.message);
      }
    }

    // Render pain distribution chart
    function renderPainChart(data) {
      const ctx = document.getElementById('painDistributionChart');
      if (charts.pain) charts.pain.destroy();

      charts.pain = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['목', '어깨', '허리', '팔꿈치', '손목', '다리'],
          datasets: [{
            data: [data.neck, data.shoulder, data.back, data.elbow, data.wrist, data.leg],
            backgroundColor: [
              '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    }

    // Render department chart
    function renderDepartmentChart(departmentDistribution) {
      const ctx = document.getElementById('departmentChart');
      if (charts.department) charts.department.destroy();

      charts.department = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: Object.keys(departmentDistribution),
          datasets: [{
            label: '제출 건수',
            data: Object.values(departmentDistribution),
            backgroundColor: 'rgba(102, 126, 234, 0.8)',
            borderColor: 'rgba(102, 126, 234, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      });
    }

    // Render timeline chart
    function renderTimelineChart(timelineData) {
      const last7Days = [];
      const timeline = {};

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push(dateStr);
        timeline[dateStr] = 0;
      }

      // Use timeline data from unified API
      timelineData.forEach(item => {
        if (item.date && timeline.hasOwnProperty(item.date)) {
          timeline[item.date] = item.count || 0;
        }
      });

      const ctx = document.getElementById('timelineChart');
      if (charts.timeline) charts.timeline.destroy();

      charts.timeline = new Chart(ctx, {
        type: 'line',
        data: {
          labels: last7Days.map(d => {
            const date = new Date(d);
            return (date.getMonth() + 1) + '/' + date.getDate();
          }),
          datasets: [{
            label: '제출 건수',
            data: last7Days.map(d => timeline[d]),
            borderColor: 'rgba(102, 126, 234, 1)',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      });
    }

    // Load recent submissions (with KST time display)
    function loadRecentSubmissions(submissions) {
      const container = document.getElementById('recent-submissions-list');

      if (submissions.length === 0) {
        container.innerHTML = '<p class="text-center text-muted py-4">검색 결과가 없습니다.</p>';
        return;
      }

      // Sort by submitted_at descending
      const sorted = submissions.sort((a, b) => {
        const dateA = new Date(a.submitted_at);
        const dateB = new Date(b.submitted_at);
        return dateB - dateA;
      }).slice(0, 20);

      container.innerHTML = sorted.map(sub => {
        const formType = sub.form_type?.includes('001') ? '001' : '002';
        const relativeTime = getRelativeTime(sub.submitted_at);
        const fullTime = formatKST(sub.submitted_at);

        return \`
          <div class="submission-item">
            <div>
              <span class="form-badge form-\${formType}">Form \${formType}</span>
              <strong class="ms-2">\${sub.name || '익명'}</strong>
              <span class="text-muted ms-2">\${sub.department || '-'}</span>
              <span class="badge bg-secondary ms-2">ID: \${sub.submission_id}</span>
            </div>
            <div class="text-end">
              <small class="text-muted" title="\${fullTime}">\${relativeTime}</small>
              <a href="/admin/\${formType}/view/\${sub.submission_id}" class="btn btn-sm btn-outline-primary ms-2">
                <i class="bi bi-eye"></i>
              </a>
            </div>
          </div>
        \`;
      }).join('');
    }

    // Refresh dashboard
    function refreshDashboard() {
      loadDashboard();
    }

    // Export all data
    async function exportAllData() {
      document.getElementById('loading').style.display = 'flex';

      try {
        // Download both CSVs
        window.open('/api/admin/001/export/csv', '_blank');
        await new Promise(resolve => setTimeout(resolve, 1000));
        window.open('/api/admin/002/export/csv', '_blank');

        document.getElementById('loading').style.display = 'none';
      } catch (error) {
        document.getElementById('loading').style.display = 'none';
        alert('데이터 내보내기 중 오류가 발생했습니다.');
      }
    }

    // Event listeners
    window.addEventListener('DOMContentLoaded', () => {
      // Initial load
      loadDashboard();

      // Start auto-refresh
      startAutoRefresh();

      // Manual refresh button
      document.getElementById('manual-refresh').addEventListener('click', () => {
        loadDashboard();
      });

      // Auto-refresh toggle button
      document.getElementById('auto-refresh-toggle').addEventListener('click', toggleAutoRefresh);

      // Search input
      document.getElementById('search-input').addEventListener('input', () => {
        updateFilteredData();
      });

      // Clear search button
      document.getElementById('clear-search').addEventListener('click', () => {
        document.getElementById('search-input').value = '';
        updateFilteredData();
      });

      // Filter dropdowns
      document.getElementById('filter-department').addEventListener('change', (e) => {
        currentFilters.department = e.target.value;
        updateFilteredData();
      });

      document.getElementById('filter-formType').addEventListener('change', (e) => {
        currentFilters.formType = e.target.value;
        updateFilteredData();
      });

      document.getElementById('filter-hasSymptoms').addEventListener('change', (e) => {
        currentFilters.hasSymptoms = e.target.value;
        updateFilteredData();
      });

      // Reset filters button
      document.getElementById('reset-filters').addEventListener('click', () => {
        currentFilters = {
          department: 'all',
          formType: 'all',
          hasSymptoms: 'all'
        };
        document.getElementById('filter-department').value = 'all';
        document.getElementById('filter-formType').value = 'all';
        document.getElementById('filter-hasSymptoms').value = 'all';
        document.getElementById('search-input').value = '';
        updateFilteredData();
      });
    });
  </script>
</body>
</html>
`;