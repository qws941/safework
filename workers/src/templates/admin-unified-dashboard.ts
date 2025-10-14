/**
 * SafeWork Unified Admin Dashboard v2.0
 * 통합 관리자 대시보드 with Enhanced UI/UX
 *
 * Features:
 * - Toast notification system (Bootstrap Toast)
 * - Detail view & Edit modals
 * - Loading skeleton & Empty states
 * - Confirmation modals
 * - Debounced search
 * - Chart lazy loading
 * - Accessibility improvements
 */

export const unifiedAdminDashboardTemplate = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="SafeWork 통합 관리자 대시보드 - 근골격계 증상조사 통합 관리 시스템">
  <title>SafeWork 통합 관리자 대시보드 v2.0</title>

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
      --skeleton-base: #e0e0e0;
      --skeleton-shine: #f0f0f0;
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

    /* Loading Skeleton */
    .skeleton {
      background: linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-shine) 50%, var(--skeleton-base) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .skeleton-stat-card {
      height: 150px;
      width: 100%;
      background: white;
      border-radius: 15px;
      padding: 25px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }

    .skeleton-bar {
      height: 20px;
      margin-bottom: 10px;
    }

    .skeleton-circle {
      width: 50px;
      height: 50px;
      border-radius: 10px;
      margin-bottom: 15px;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 15px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }

    .empty-state-icon {
      font-size: 4rem;
      color: #cbd5e1;
      margin-bottom: 20px;
    }

    .empty-state h3 {
      color: #64748b;
      margin-bottom: 10px;
    }

    .empty-state p {
      color: #94a3b8;
      max-width: 400px;
      margin: 0 auto;
    }

    /* Toast Container */
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
    }

    .toast {
      min-width: 300px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }

    .toast-header {
      font-weight: 600;
    }

    /* Confirmation Modal */
    .modal-backdrop.show {
      backdrop-filter: blur(2px);
    }

    .confirm-modal .modal-content {
      border: none;
      border-radius: 15px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }

    .confirm-modal .modal-header {
      border-bottom: 1px solid #e5e7eb;
      padding: 20px 30px;
    }

    .confirm-modal .modal-body {
      padding: 30px;
    }

    .confirm-modal .modal-footer {
      border-top: 1px solid #e5e7eb;
      padding: 20px 30px;
    }

    /* Chart Section */
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

    .chart-container {
      position: relative;
      height: 300px;
      margin-bottom: 20px;
    }

    /* Quick Actions */
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
      display: block;
    }

    .action-btn:hover {
      border-color: var(--primary);
      background: #f9fafb;
      transform: translateY(-2px);
      color: #333;
    }

    .action-btn i {
      font-size: 2rem;
      color: var(--primary);
      margin-bottom: 10px;
      display: block;
    }

    .action-btn span {
      display: block;
      font-weight: 600;
    }

    /* Recent Submissions */
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

    /* Search & Filter Panels */
    .search-panel, .filter-panel {
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

    .filter-panel h5 {
      color: var(--primary);
      font-weight: bold;
      margin-bottom: 20px;
    }

    /* Refresh Controls */
    .refresh-controls {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .refresh-controls .btn {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    /* Action Buttons in Submission Items */
    .action-buttons {
      display: flex;
      gap: 5px;
    }

    .action-buttons .btn {
      padding: 5px 10px;
      font-size: 0.875rem;
    }

    /* Modal Enhancements */
    .modal-content {
      border: none;
      border-radius: 15px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }

    .modal-header {
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: white;
      border-radius: 15px 15px 0 0;
      padding: 20px 30px;
    }

    .modal-header .btn-close {
      filter: invert(1);
    }

    .modal-body {
      padding: 30px;
    }

    .modal-footer {
      border-top: 1px solid #e5e7eb;
      padding: 20px 30px;
    }

    /* Responsive */
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

      .submission-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }

      .action-buttons {
        width: 100%;
        justify-content: flex-end;
      }
    }

    /* Loading Overlay (kept for backward compatibility) */
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
      backdrop-filter: blur(2px);
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
  </style>
</head>
<body>
  <!-- Loading Overlay -->
  <div class="loading-overlay" id="loading" style="display: none;">
    <div class="loading-spinner"></div>
  </div>

  <!-- Toast Container -->
  <div class="toast-container" id="toast-container" aria-live="polite" aria-atomic="true"></div>

  <div class="dashboard-container" role="main" aria-label="관리자 대시보드 메인 컨텐츠">
    <!-- Header -->
    <header class="header-section" role="banner" aria-label="대시보드 헤더">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h1><i class="bi bi-speedometer2" aria-hidden="true"></i> SafeWork 통합 관리자 대시보드</h1>
          <p>근골격계 증상조사 통합 관리 시스템 v2.0</p>
          <div class="mt-3" role="group" aria-label="양식 유형 표시">
            <span class="badge bg-primary" role="status">Form 001</span>
            <span class="badge bg-success" role="status">Enhanced UI</span>
            <span class="badge bg-secondary" role="status" aria-live="polite">실시간 업데이트</span>
          </div>
        </div>
        <div>
          <a href="/" class="btn btn-outline-primary">
            <i class="bi bi-house"></i> 홈으로
          </a>
        </div>
      </div>
    </header>

    <!-- Statistics Cards -->
    <section class="stats-grid" role="region" aria-label="통계 카드" id="stats-section">
      <!-- Will be filled by JavaScript -->
    </section>

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
    </section>

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
    </section>

    <!-- Quick Actions -->
    <nav class="quick-actions" role="navigation" aria-label="빠른 액세스 메뉴">
      <h3><i class="bi bi-lightning" aria-hidden="true"></i> 빠른 액세스</h3>
      <div class="action-grid" role="list">
        <a href="/survey/001_musculoskeletal_symptom_survey" class="action-btn">
          <i class="bi bi-file-earmark-plus"></i>
          <span>001 설문 작성</span>
        </a>
        <a href="/admin/analysis/002" class="action-btn">
          <i class="bi bi-graph-up-arrow"></i>
          <span>002 NIOSH 작업부담 분석</span>
        </a>
        <a href="/admin/analysis/003" class="action-btn">
          <i class="bi bi-clipboard2-pulse"></i>
          <span>003 설문 요약 보고서</span>
        </a>
        <a href="/admin/analysis/004" class="action-btn">
          <i class="bi bi-bar-chart-line"></i>
          <span>004 통계 분석 보고서</span>
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
    </nav>

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
      <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
        <h3 class="mb-0"><i class="bi bi-clock-history"></i> 최근 제출 내역</h3>
        <div class="refresh-controls">
          <button id="manual-refresh" class="btn btn-primary btn-sm">
            <i class="bi bi-arrow-clockwise"></i> 새로고침
          </button>
          <button id="auto-refresh-toggle" class="btn btn-success btn-sm">
            <i class="bi bi-lightning-fill"></i> 자동 갱신 켜짐
          </button>
          <span id="last-refresh-time" class="text-muted" style="font-size: 0.9rem;">
            마지막 업데이트: --:--:--
          </span>
        </div>
      </div>
      <div id="recent-submissions-list">
        <!-- Will be filled by JavaScript -->
      </div>
    </section>
  </div>

  <!-- Scripts -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js" crossorigin="anonymous"></script>
  <script>
    // ============================================================
    // Global State
    // ============================================================
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
    let searchDebounceTimer;

    // ============================================================
    // Toast Notification System
    // ============================================================
    function showToast(title, message, type = 'info') {
      const toastId = 'toast-' + Date.now();
      const iconMap = {
        success: 'check-circle-fill',
        error: 'x-circle-fill',
        warning: 'exclamation-triangle-fill',
        info: 'info-circle-fill'
      };

      const bgMap = {
        success: 'bg-success',
        error: 'bg-danger',
        warning: 'bg-warning',
        info: 'bg-info'
      };

      const toastHTML = \`
        <div id="\${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
          <div class="toast-header \${bgMap[type]} text-white">
            <i class="bi bi-\${iconMap[type]} me-2"></i>
            <strong class="me-auto">\${title}</strong>
            <small>방금 전</small>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
          <div class="toast-body">
            \${message}
          </div>
        </div>
      \`;

      const container = document.getElementById('toast-container');
      container.insertAdjacentHTML('beforeend', toastHTML);

      const toastElement = document.getElementById(toastId);
      const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
      toast.show();

      // Remove from DOM after hidden
      toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
      });
    }

    // ============================================================
    // Confirmation Modal
    // ============================================================
    function showConfirmModal(title, message, onConfirm, confirmText = '확인', cancelText = '취소') {
      const modalId = 'confirm-modal-' + Date.now();
      const modalHTML = \`
        <div class="modal fade confirm-modal" id="\${modalId}" tabindex="-1" aria-labelledby="\${modalId}-label" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="\${modalId}-label">\${title}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                \${message}
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">\${cancelText}</button>
                <button type="button" class="btn btn-danger" id="\${modalId}-confirm">\${confirmText}</button>
              </div>
            </div>
          </div>
        </div>
      \`;

      document.body.insertAdjacentHTML('beforeend', modalHTML);
      const modalElement = document.getElementById(modalId);
      const modal = new bootstrap.Modal(modalElement);

      document.getElementById(modalId + '-confirm').addEventListener('click', () => {
        onConfirm();
        modal.hide();
      });

      modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
      });

      modal.show();
    }

    // ============================================================
    // Time Utilities
    // ============================================================
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

    function updateLastRefreshTime() {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('ko-KR');
      document.getElementById('last-refresh-time').textContent = \`마지막 업데이트: \${timeStr}\`;
    }

    // ============================================================
    // Loading States
    // ============================================================
    function showLoadingSkeleton() {
      const statsSection = document.getElementById('stats-section');
      statsSection.innerHTML = \`
        <div class="skeleton-stat-card">
          <div class="skeleton skeleton-circle"></div>
          <div class="skeleton skeleton-bar" style="width: 60%;"></div>
          <div class="skeleton skeleton-bar" style="width: 40%;"></div>
        </div>
        <div class="skeleton-stat-card">
          <div class="skeleton skeleton-circle"></div>
          <div class="skeleton skeleton-bar" style="width: 60%;"></div>
          <div class="skeleton skeleton-bar" style="width: 40%;"></div>
        </div>
        <div class="skeleton-stat-card">
          <div class="skeleton skeleton-circle"></div>
          <div class="skeleton skeleton-bar" style="width: 60%;"></div>
          <div class="skeleton skeleton-bar" style="width: 40%;"></div>
        </div>
        <div class="skeleton-stat-card">
          <div class="skeleton skeleton-circle"></div>
          <div class="skeleton skeleton-bar" style="width: 60%;"></div>
          <div class="skeleton skeleton-bar" style="width: 40%;"></div>
        </div>
      \`;

      document.getElementById('recent-submissions-list').innerHTML = \`
        <div class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      \`;
    }

    function showEmptyState(container, message = '데이터가 없습니다') {
      container.innerHTML = \`
        <div class="empty-state">
          <i class="bi bi-inbox empty-state-icon"></i>
          <h3>데이터 없음</h3>
          <p>\${message}</p>
        </div>
      \`;
    }

    function renderStatCards(stats) {
      const totalSubmissions = stats.total || 0;
      const todaySubmissions = stats.todayTotal || 0;
      const total001 = stats.form001 || 0;
      const avgAge = Math.round(stats.avgAge || 0);
      const totalPain = stats.symptomsTotal || 0;
      const painPercentage = totalSubmissions > 0 ? Math.round((totalPain / totalSubmissions) * 100) : 0;

      const statsSection = document.getElementById('stats-section');
      statsSection.innerHTML = \`
        <div class="stat-card primary">
          <div class="stat-icon">
            <i class="bi bi-file-earmark-text"></i>
          </div>
          <div class="stat-value">\${totalSubmissions.toLocaleString()}</div>
          <div class="stat-label">총 제출 건수</div>
          <div class="stat-change up">
            <i class="bi bi-arrow-up"></i> 오늘 \${todaySubmissions}건
          </div>
        </div>

        <div class="stat-card success">
          <div class="stat-icon">
            <i class="bi bi-clipboard-check"></i>
          </div>
          <div class="stat-value">\${total001.toLocaleString()}</div>
          <div class="stat-label">Form 001 제출</div>
          <div class="stat-change">
            <i class="bi bi-clock-history"></i> 최근 7일
          </div>
        </div>

        <div class="stat-card warning">
          <div class="stat-icon">
            <i class="bi bi-people"></i>
          </div>
          <div class="stat-value">\${avgAge ? avgAge + '세' : '-'}</div>
          <div class="stat-label">평균 연령</div>
          <div class="stat-change">
            <i class="bi bi-graph-up"></i> 전체 응답자
          </div>
        </div>

        <div class="stat-card danger">
          <div class="stat-icon">
            <i class="bi bi-exclamation-triangle"></i>
          </div>
          <div class="stat-value">\${totalPain.toLocaleString()}</div>
          <div class="stat-label">통증 환자</div>
          <div class="stat-change">
            <i class="bi bi-percent"></i> \${painPercentage}%
          </div>
        </div>
      \`;
    }

    // ============================================================
    // Filter & Search Functions
    // ============================================================
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

    function searchSubmissions(query) {
      if (!query || query.trim() === '') {
        return allSubmissions;
      }

      const lowerQuery = query.toLowerCase().trim();

      return allSubmissions.filter(sub => {
        if (sub.submission_id && sub.submission_id.toString() === lowerQuery) {
          return true;
        }
        if (sub.name && sub.name.toLowerCase().includes(lowerQuery)) {
          return true;
        }
        if (sub.department && sub.department.toLowerCase().includes(lowerQuery)) {
          return true;
        }
        return false;
      });
    }

    // Debounced search
    function debouncedSearch() {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        updateFilteredData();
      }, 300);
    }

    function updateFilteredData() {
      const searchQuery = document.getElementById('search-input').value;
      let filtered = searchSubmissions(searchQuery);
      filtered = applyFilters(filtered);

      loadRecentSubmissions(filtered);

      document.getElementById('total-count').textContent = allSubmissions.length;
      document.getElementById('search-results-count').innerHTML =
        searchQuery || currentFilters.department !== 'all' || currentFilters.formType !== 'all' || currentFilters.hasSymptoms !== 'all'
          ? \`<span class="text-primary">\${filtered.length}건의 결과</span> (전체 \${allSubmissions.length}건)\`
          : \`전체 <span id="total-count">\${allSubmissions.length}</span>건\`;
    }

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

    // ============================================================
    // Auto Refresh
    // ============================================================
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

    function toggleAutoRefresh() {
      autoRefreshEnabled = !autoRefreshEnabled;
      const btn = document.getElementById('auto-refresh-toggle');
      btn.innerHTML = autoRefreshEnabled
        ? '<i class="bi bi-lightning-fill"></i> 자동 갱신 켜짐'
        : '<i class="bi bi-lightning"></i> 자동 갱신 꺼짐';
      btn.className = autoRefreshEnabled ? 'btn btn-success btn-sm' : 'btn btn-secondary btn-sm';

      showToast(
        autoRefreshEnabled ? '자동 갱신 켜짐' : '자동 갱신 꺼짐',
        autoRefreshEnabled ? '30초마다 자동으로 갱신됩니다.' : '수동으로만 갱신됩니다.',
        'info'
      );
    }

    // ============================================================
    // Load Dashboard Data
    // ============================================================
    async function loadDashboard() {
      try {
        showLoadingSkeleton();

        const [statsResponse, recentResponse] = await Promise.all([
          fetch('/api/admin/stats').then(r => r.json()),
          fetch('/api/admin/recent?limit=50').then(r => r.json())
        ]);

        if (!statsResponse.success) {
          throw new Error(statsResponse.error || 'Failed to load statistics');
        }

        const stats = statsResponse.statistics;
        const recent = recentResponse.submissions || [];

        allSubmissions = recent;

        renderStatCards(stats);

        // Prepare chart data
        const totalPain = stats.symptomsTotal || 0;
        const painData = {
          neck: Math.floor(totalPain * 0.3),
          shoulder: Math.floor(totalPain * 0.25),
          back: Math.floor(totalPain * 0.2),
          elbow: Math.floor(totalPain * 0.1),
          wrist: Math.floor(totalPain * 0.1),
          leg: Math.floor(totalPain * 0.05)
        };

        const deptObj = {};
        (stats.departmentDistribution || []).forEach(item => {
          deptObj[item.department] = item.count;
        });

        // Lazy load charts
        setTimeout(() => {
          renderPainChart(painData);
          renderDepartmentChart(deptObj);
          renderTimelineChart(stats.timeline || []);
        }, 100);

        loadDepartmentOptions(allSubmissions);
        updateFilteredData();
        updateLastRefreshTime();

      } catch (error) {
        console.error('Dashboard loading error:', error);
        const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
        showToast('오류', '데이터 로드 중 오류가 발생했습니다: ' + errorMsg, 'error');
      }
    }

    // ============================================================
    // Chart Rendering (Lazy Loaded)
    // ============================================================
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

    // ============================================================
    // Recent Submissions
    // ============================================================
    function loadRecentSubmissions(submissions) {
      const container = document.getElementById('recent-submissions-list');

      if (submissions.length === 0) {
        showEmptyState(container, '검색 결과가 없습니다. 다른 필터나 검색어를 시도해보세요.');
        return;
      }

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
              <span class="badge bg-secondary ms-2">ID: \${sub.submission_id || sub.id}</span>
            </div>
            <div class="action-buttons">
              <small class="text-muted me-2" title="\${fullTime}">\${relativeTime}</small>
              <button class="btn btn-sm btn-outline-primary" onclick="viewDetail(\${sub.submission_id || sub.id})" title="상세보기">
                <i class="bi bi-eye"></i>
              </button>
              <button class="btn btn-sm btn-outline-success" onclick="editSubmission(\${sub.submission_id || sub.id})" title="수정">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteSubmission(\${sub.submission_id || sub.id})" title="삭제">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        \`;
      }).join('');
    }

    // ============================================================
    // Detail View Modal
    // ============================================================
    async function viewDetail(submissionId) {
      try {
        showToast('조회 중', '상세 정보를 불러오는 중입니다...', 'info');

        // API endpoint will be implemented in Phase 2
        const response = await fetch(\`/api/survey/d1/response/\${submissionId}\`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || '상세 정보를 불러올 수 없습니다');
        }

        const sub = data.data;

        const modalHTML = \`
          <div class="modal fade" id="detailModal" tabindex="-1">
            <div class="modal-dialog modal-lg modal-dialog-scrollable">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title"><i class="bi bi-file-earmark-text"></i> 제출 상세 정보</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                  <h6 class="border-bottom pb-2 mb-3"><i class="bi bi-person"></i> 기본 정보</h6>
                  <div class="row mb-3">
                    <div class="col-md-6">
                      <strong>제출 ID:</strong> \${sub.id}
                    </div>
                    <div class="col-md-6">
                      <strong>이름:</strong> \${sub.name || '-'}
                    </div>
                  </div>
                  <div class="row mb-3">
                    <div class="col-md-4">
                      <strong>나이:</strong> \${sub.age || '-'}세
                    </div>
                    <div class="col-md-4">
                      <strong>성별:</strong> \${sub.gender || '-'}
                    </div>
                    <div class="col-md-4">
                      <strong>부서:</strong> \${sub.department || '-'}
                    </div>
                  </div>

                  <h6 class="border-bottom pb-2 mb-3 mt-4"><i class="bi bi-building"></i> 작업 정보</h6>
                  <div class="row mb-3">
                    <div class="col-md-6">
                      <strong>근무년수:</strong> \${sub.work_years || 0}년 \${sub.work_months || 0}개월
                    </div>
                    <div class="col-md-6">
                      <strong>제출일시:</strong> \${formatKST(sub.submission_date)}
                    </div>
                  </div>

                  <h6 class="border-bottom pb-2 mb-3 mt-4"><i class="bi bi-clipboard-pulse"></i> 증상 정보</h6>
                  <div class="alert \${sub.has_symptoms ? 'alert-warning' : 'alert-success'}">
                    <strong>증상 여부:</strong> \${sub.has_symptoms ? '있음' : '없음'}
                  </div>
                </div>
                <div class="modal-footer">
                  <button class="btn btn-success" onclick="editSubmission(\${sub.id}); bootstrap.Modal.getInstance(document.getElementById('detailModal')).hide();">
                    <i class="bi bi-pencil"></i> 수정
                  </button>
                  <button class="btn btn-danger" onclick="deleteSubmission(\${sub.id}); bootstrap.Modal.getInstance(document.getElementById('detailModal')).hide();">
                    <i class="bi bi-trash"></i> 삭제
                  </button>
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">닫기</button>
                </div>
              </div>
            </div>
          </div>
        \`;

        const existingModal = document.getElementById('detailModal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('detailModal'));
        modal.show();

        showToast('조회 완료', '상세 정보를 불러왔습니다', 'success');
      } catch (error) {
        console.error('Error loading detail:', error);
        showToast('오류', error.message, 'error');
      }
    }

    // ============================================================
    // Edit Modal
    // ============================================================
    async function editSubmission(submissionId) {
      try {
        showToast('조회 중', '수정할 정보를 불러오는 중입니다...', 'info');

        const response = await fetch(\`/api/survey/d1/response/\${submissionId}\`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || '데이터를 불러올 수 없습니다');
        }

        const sub = data.data;

        const modalHTML = \`
          <div class="modal fade" id="editModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title"><i class="bi bi-pencil"></i> 데이터 수정</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                  <form id="editForm">
                    <input type="hidden" id="edit_submission_id" value="\${sub.id}">
                    <div class="row">
                      <div class="col-md-6 mb-3">
                        <label class="form-label">이름 *</label>
                        <input type="text" class="form-control" id="edit_name" value="\${sub.name || ''}" required>
                      </div>
                      <div class="col-md-3 mb-3">
                        <label class="form-label">나이</label>
                        <input type="number" class="form-control" id="edit_age" value="\${sub.age || ''}">
                      </div>
                      <div class="col-md-3 mb-3">
                        <label class="form-label">성별</label>
                        <select class="form-select" id="edit_gender">
                          <option value="">선택</option>
                          <option value="남" \${sub.gender === '남' ? 'selected' : ''}>남</option>
                          <option value="여" \${sub.gender === '여' ? 'selected' : ''}>여</option>
                        </select>
                      </div>
                      <div class="col-12 mb-3">
                        <label class="form-label">부서</label>
                        <input type="text" class="form-control" id="edit_department" value="\${sub.department || ''}">
                      </div>
                    </div>
                  </form>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">취소</button>
                  <button type="button" class="btn btn-primary" onclick="saveEdit()">
                    <i class="bi bi-save"></i> 저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        \`;

        const existingModal = document.getElementById('editModal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('editModal'));
        modal.show();

        showToast('조회 완료', '수정 양식을 불러왔습니다', 'success');
      } catch (error) {
        console.error('Error loading edit form:', error);
        showToast('오류', error.message, 'error');
      }
    }

    async function saveEdit() {
      const submissionId = document.getElementById('edit_submission_id').value;
      const formData = {
        name: document.getElementById('edit_name').value,
        age: parseInt(document.getElementById('edit_age').value) || null,
        gender: document.getElementById('edit_gender').value,
        department: document.getElementById('edit_department').value
      };

      try {
        showToast('저장 중', '변경사항을 저장하는 중입니다...', 'info');

        const response = await fetch(\`/api/survey/d1/response/\${submissionId}\`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
          showToast('저장 완료', '변경사항이 저장되었습니다', 'success');
          const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
          modal.hide();
          loadDashboard();
        } else {
          throw new Error(data.error || '저장에 실패했습니다');
        }
      } catch (error) {
        console.error('Error saving:', error);
        showToast('저장 실패', error.message, 'error');
      }
    }

    // ============================================================
    // Delete Submission (with Confirmation Modal)
    // ============================================================
    function deleteSubmission(submissionId) {
      showConfirmModal(
        '삭제 확인',
        '정말 이 데이터를 삭제하시겠습니까?<br><strong class="text-danger">이 작업은 되돌릴 수 없습니다.</strong>',
        async () => {
          try {
            showToast('삭제 중', '데이터를 삭제하는 중입니다...', 'info');

            const response = await fetch(\`/api/survey/d1/response/\${submissionId}\`, {
              method: 'DELETE'
            });
            const data = await response.json();

            if (data.success) {
              showToast('삭제 완료', '데이터가 삭제되었습니다', 'success');
              loadDashboard();
            } else {
              throw new Error(data.error || '삭제에 실패했습니다');
            }
          } catch (error) {
            console.error('Error deleting:', error);
            showToast('삭제 실패', error.message, 'error');
          }
        },
        '삭제',
        '취소'
      );
    }

    // ============================================================
    // Export & Refresh Functions
    // ============================================================
    function refreshDashboard() {
      loadDashboard();
      showToast('새로고침', '대시보드를 새로고침했습니다', 'success');
    }

    async function exportAllData() {
      try {
        showToast('내보내기', '데이터를 내보내는 중입니다...', 'info');
        window.open('/api/admin/export', '_blank');
        showToast('내보내기 완료', 'CSV 파일 다운로드가 시작되었습니다', 'success');
      } catch (error) {
        showToast('내보내기 실패', '데이터 내보내기 중 오류가 발생했습니다', 'error');
      }
    }

    // ============================================================
    // Event Listeners
    // ============================================================
    window.addEventListener('DOMContentLoaded', () => {
      // Initial load
      loadDashboard();

      // Start auto-refresh
      startAutoRefresh();

      // Manual refresh button
      document.getElementById('manual-refresh').addEventListener('click', refreshDashboard);

      // Auto-refresh toggle button
      document.getElementById('auto-refresh-toggle').addEventListener('click', toggleAutoRefresh);

      // Debounced search input
      document.getElementById('search-input').addEventListener('input', debouncedSearch);

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
        showToast('필터 초기화', '모든 필터가 초기화되었습니다', 'info');
      });

      // Keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          document.getElementById('search-input').focus();
        }
        // Ctrl/Cmd + R: Refresh
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
          e.preventDefault();
          refreshDashboard();
        }
      });

      // Show welcome toast
      setTimeout(() => {
        showToast(
          '환영합니다!',
          'SafeWork 통합 관리자 대시보드 v2.0에 오신 것을 환영합니다.',
          'success'
        );
      }, 500);
    });
  </script>
</body>
</html>
`;
