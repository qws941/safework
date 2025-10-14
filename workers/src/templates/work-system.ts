/**
 * SafeWork Work Management System v3.0
 * 보건관리자 업무 시스템 - 모듈식 확장 가능 구조
 *
 * 핵심 기능:
 * - 오늘의 업무 (Todo List)
 * - 보고서 생성 (002/003/004)
 * - 위험군 관리
 * - 설문 관리
 *
 * 디자인 원칙:
 * - 모듈식 카드 시스템 (쉬운 추가/제거)
 * - 업무 중심 (통계보다 액션 중심)
 * - 깔끔한 헬스케어 색상
 */

export const workSystemTemplate = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="SafeWork 보건관리자 업무시스템">
  <title>SafeWork 업무시스템 v3.0</title>

  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">

  <style>
    :root {
      --primary: #3b82f6;
      --primary-dark: #2563eb;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --info: #06b6d4;
      --gray-50: #f9fafb;
      --gray-100: #f3f4f6;
      --gray-200: #e5e7eb;
      --gray-600: #4b5563;
      --gray-900: #111827;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container-main {
      max-width: 1400px;
      margin: 0 auto;
    }

    /* ========== Header ========== */
    .header {
      background: white;
      border-radius: 16px;
      padding: 24px 32px;
      margin-bottom: 24px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-title i {
      font-size: 2rem;
      color: var(--primary);
    }

    .header-title h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--gray-900);
      margin: 0;
    }

    .header-subtitle {
      color: var(--gray-600);
      font-size: 0.95rem;
      margin-top: 4px;
    }

    /* ========== Module Card (공통) ========== */
    .module-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .module-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
    }

    .module-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid var(--gray-100);
    }

    .module-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--gray-900);
    }

    .module-title i {
      font-size: 1.5rem;
      color: var(--primary);
    }

    .module-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .module-badge.badge-primary { background: #dbeafe; color: #1e40af; }
    .module-badge.badge-success { background: #d1fae5; color: #065f46; }
    .module-badge.badge-warning { background: #fef3c7; color: #92400e; }
    .module-badge.badge-danger { background: #fee2e2; color: #991b1b; }

    /* ========== Grid Layout ========== */
    .modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
      margin-bottom: 24px;
    }

    @media (max-width: 768px) {
      .modules-grid {
        grid-template-columns: 1fr;
      }
    }

    /* ========== 오늘의 업무 Module ========== */
    .todo-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .todo-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .todo-item:hover {
      background: var(--gray-50);
    }

    .todo-item.priority-high {
      border-left: 4px solid var(--danger);
      background: #fef2f2;
    }

    .todo-item.priority-medium {
      border-left: 4px solid var(--warning);
      background: #fffbeb;
    }

    .todo-item.priority-low {
      border-left: 4px solid var(--success);
      background: #f0fdf4;
    }

    .todo-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .todo-content {
      flex: 1;
    }

    .todo-title {
      font-weight: 600;
      color: var(--gray-900);
      margin-bottom: 4px;
    }

    .todo-desc {
      font-size: 0.875rem;
      color: var(--gray-600);
    }

    .todo-count {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--primary);
    }

    /* ========== 보고서 생성 Module ========== */
    .report-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }

    .report-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 20px;
      border: 2px solid var(--gray-200);
      border-radius: 12px;
      background: white;
      text-decoration: none;
      color: var(--gray-900);
      transition: all 0.2s;
      cursor: pointer;
    }

    .report-btn:hover {
      border-color: var(--primary);
      background: var(--gray-50);
      transform: translateY(-2px);
    }

    .report-btn i {
      font-size: 2.5rem;
      color: var(--primary);
    }

    .report-btn span {
      font-weight: 600;
      text-align: center;
      font-size: 0.95rem;
    }

    /* ========== 위험군 관리 Module ========== */
    .risk-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }

    .risk-stat {
      text-align: center;
      padding: 16px;
      border-radius: 12px;
      background: var(--gray-50);
    }

    .risk-stat.high { background: #fef2f2; color: var(--danger); }
    .risk-stat.medium { background: #fffbeb; color: var(--warning); }
    .risk-stat.low { background: #f0fdf4; color: var(--success); }

    .risk-stat-value {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .risk-stat-label {
      font-size: 0.875rem;
      font-weight: 600;
    }

    .worker-list {
      list-style: none;
      padding: 0;
      margin: 0;
      max-height: 300px;
      overflow-y: auto;
    }

    .worker-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 8px;
      background: var(--gray-50);
      transition: background 0.2s;
    }

    .worker-item:hover {
      background: var(--gray-100);
    }

    .worker-info {
      flex: 1;
    }

    .worker-name {
      font-weight: 600;
      color: var(--gray-900);
    }

    .worker-dept {
      font-size: 0.875rem;
      color: var(--gray-600);
    }

    .worker-risk-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .worker-risk-badge.high { background: var(--danger); color: white; }
    .worker-risk-badge.medium { background: var(--warning); color: white; }
    .worker-risk-badge.low { background: var(--success); color: white; }

    /* ========== 설문 관리 Module ========== */
    .survey-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .action-btn {
      flex: 1;
      min-width: 150px;
      padding: 16px;
      border: 2px solid var(--gray-200);
      border-radius: 12px;
      background: white;
      font-weight: 600;
      color: var(--gray-900);
      transition: all 0.2s;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
    }

    .action-btn:hover {
      border-color: var(--primary);
      background: var(--primary);
      color: white;
    }

    .action-btn i {
      font-size: 1.25rem;
    }

    /* ========== Toast ========== */
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

    /* ========== Empty State ========== */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--gray-600);
    }

    .empty-state i {
      font-size: 3rem;
      color: var(--gray-400);
      margin-bottom: 16px;
    }

    /* ========== Loading ========== */
    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--gray-200);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <!-- Toast Container -->
  <div class="toast-container" id="toast-container" aria-live="polite" aria-atomic="true"></div>

  <div class="container-main">
    <!-- Header -->
    <header class="header">
      <div>
        <div class="header-title">
          <i class="bi bi-hospital"></i>
          <div>
            <h1>SafeWork 업무시스템</h1>
            <div class="header-subtitle">보건관리자 통합 업무 관리 v3.0</div>
          </div>
        </div>
      </div>
      <a href="/" class="btn btn-outline-primary">
        <i class="bi bi-house"></i> 홈으로
      </a>
    </header>

    <!-- Modules Grid -->
    <div class="modules-grid">
      <!-- Module 1: 오늘의 업무 -->
      <div class="module-card">
        <div class="module-header">
          <h2 class="module-title">
            <i class="bi bi-list-check"></i>
            오늘의 업무
          </h2>
          <span class="module-badge badge-primary">
            <span id="todo-count-badge">0</span>건
          </span>
        </div>
        <ul class="todo-list" id="todo-list">
          <li class="loading">
            <div class="spinner"></div>
          </li>
        </ul>
      </div>

      <!-- Module 2: 보고서 생성 -->
      <div class="module-card">
        <div class="module-header">
          <h2 class="module-title">
            <i class="bi bi-file-earmark-bar-graph"></i>
            보고서 생성
          </h2>
          <span class="module-badge badge-success">원클릭 생성</span>
        </div>
        <div class="report-grid">
          <a href="/admin/analysis/002" class="report-btn" target="_blank">
            <i class="bi bi-graph-up-arrow"></i>
            <span>002<br>NIOSH 분석</span>
          </a>
          <a href="/admin/analysis/003" class="report-btn" target="_blank">
            <i class="bi bi-clipboard2-pulse"></i>
            <span>003<br>설문 요약</span>
          </a>
          <a href="/admin/analysis/004" class="report-btn" target="_blank">
            <i class="bi bi-bar-chart-line"></i>
            <span>004<br>통계 분석</span>
          </a>
          <a href="#" onclick="exportAllData(); return false;" class="report-btn">
            <i class="bi bi-download"></i>
            <span>전체<br>데이터</span>
          </a>
        </div>
      </div>

      <!-- Module 3: 위험군 관리 -->
      <div class="module-card" style="grid-column: span 2;">
        <div class="module-header">
          <h2 class="module-title">
            <i class="bi bi-exclamation-triangle"></i>
            위험군 관리
          </h2>
          <button class="btn btn-sm btn-outline-primary" onclick="loadRiskData()">
            <i class="bi bi-arrow-clockwise"></i> 새로고침
          </button>
        </div>
        <div class="risk-summary" id="risk-summary">
          <div class="risk-stat high">
            <div class="risk-stat-value" id="high-risk-count">-</div>
            <div class="risk-stat-label">고위험 (7-10점)</div>
          </div>
          <div class="risk-stat medium">
            <div class="risk-stat-value" id="medium-risk-count">-</div>
            <div class="risk-stat-label">중위험 (4-6점)</div>
          </div>
          <div class="risk-stat low">
            <div class="risk-stat-value" id="low-risk-count">-</div>
            <div class="risk-stat-label">저위험 (1-3점)</div>
          </div>
        </div>
        <ul class="worker-list" id="worker-list">
          <li class="loading">
            <div class="spinner"></div>
          </li>
        </ul>
      </div>

      <!-- Module 4: 설문 관리 -->
      <div class="module-card">
        <div class="module-header">
          <h2 class="module-title">
            <i class="bi bi-clipboard-data"></i>
            설문 관리
          </h2>
          <span class="module-badge badge-primary">
            <span id="survey-count-badge">0</span>건
          </span>
        </div>
        <div class="survey-actions">
          <a href="/survey/001_musculoskeletal_symptom_survey" class="action-btn">
            <i class="bi bi-file-earmark-plus"></i>
            <span>새 설문 작성</span>
          </a>
          <button class="action-btn" onclick="viewAllSurveys()">
            <i class="bi bi-list-ul"></i>
            <span>전체 목록</span>
          </button>
        </div>
      </div>

      <!-- Module 5: 통계 요약 (향후 확장) -->
      <div class="module-card" style="opacity: 0.6; pointer-events: none;">
        <div class="module-header">
          <h2 class="module-title">
            <i class="bi bi-graph-up"></i>
            통계 요약
          </h2>
          <span class="module-badge badge-warning">준비중</span>
        </div>
        <div class="empty-state">
          <i class="bi bi-hourglass-split"></i>
          <div>추후 구현 예정</div>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    // ============================================================
    // Toast Notification
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
        <div id="\${toastId}" class="toast" role="alert">
          <div class="toast-header \${bgMap[type]} text-white">
            <i class="bi bi-\${iconMap[type]} me-2"></i>
            <strong class="me-auto">\${title}</strong>
            <small>방금 전</small>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
          </div>
          <div class="toast-body">\${message}</div>
        </div>
      \`;

      const container = document.getElementById('toast-container');
      container.insertAdjacentHTML('beforeend', toastHTML);

      const toastElement = document.getElementById(toastId);
      const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 5000 });
      toast.show();

      toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
      });
    }

    // ============================================================
    // Load Todo List
    // ============================================================
    async function loadTodoList() {
      const container = document.getElementById('todo-list');
      const badge = document.getElementById('todo-count-badge');

      try {
        const response = await fetch('/api/admin/recent?limit=5');
        const data = await response.json();

        if (!data.success) throw new Error(data.error);

        const submissions = data.submissions || [];
        const newCount = submissions.filter(s => {
          const submittedDate = new Date(s.submitted_at);
          const today = new Date();
          return submittedDate.toDateString() === today.toDateString();
        }).length;

        badge.textContent = newCount + 5; // +5 for other pending tasks

        if (submissions.length === 0) {
          container.innerHTML = \`
            <li class="empty-state">
              <i class="bi bi-check-circle"></i>
              <div>모든 업무를 완료했습니다!</div>
            </li>
          \`;
          return;
        }

        container.innerHTML = \`
          <li class="todo-item priority-high" onclick="viewAllSurveys()">
            <i class="bi bi-exclamation-circle todo-icon" style="color: var(--danger);"></i>
            <div class="todo-content">
              <div class="todo-title">신규 제출 검토</div>
              <div class="todo-desc">오늘 제출된 설문 \${newCount}건</div>
            </div>
            <div class="todo-count">\${newCount}</div>
          </li>
          <li class="todo-item priority-medium" onclick="location.href='/admin/analysis/002'">
            <i class="bi bi-file-earmark-bar-graph todo-icon" style="color: var(--warning);"></i>
            <div class="todo-content">
              <div class="todo-title">002 보고서 생성 필요</div>
              <div class="todo-desc">NIOSH 작업부담 분석</div>
            </div>
          </li>
          <li class="todo-item priority-medium" onclick="location.href='/admin/analysis/003'">
            <i class="bi bi-clipboard2-pulse todo-icon" style="color: var(--warning);"></i>
            <div class="todo-content">
              <div class="todo-title">003 설문 요약 보고서</div>
              <div class="todo-desc">질문지 종합 요약</div>
            </div>
          </li>
          <li class="todo-item priority-low" onclick="location.href='/admin/analysis/004'">
            <i class="bi bi-bar-chart-line todo-icon" style="color: var(--success);"></i>
            <div class="todo-content">
              <div class="todo-title">004 통계 분석</div>
              <div class="todo-desc">유병률 및 위험도 통계</div>
            </div>
          </li>
          <li class="todo-item priority-low" onclick="loadRiskData()">
            <i class="bi bi-people todo-icon" style="color: var(--success);"></i>
            <div class="todo-content">
              <div class="todo-title">위험군 팔로우업</div>
              <div class="todo-desc">고위험 직원 관리</div>
            </div>
          </li>
        \`;

      } catch (error) {
        console.error('Error loading todo list:', error);
        container.innerHTML = \`
          <li class="empty-state">
            <i class="bi bi-exclamation-triangle"></i>
            <div>업무 목록을 불러올 수 없습니다</div>
          </li>
        \`;
      }
    }

    // ============================================================
    // Load Risk Data
    // ============================================================
    async function loadRiskData() {
      const workerList = document.getElementById('worker-list');
      const highCount = document.getElementById('high-risk-count');
      const mediumCount = document.getElementById('medium-risk-count');
      const lowCount = document.getElementById('low-risk-count');

      try {
        const response = await fetch('/api/admin/recent?limit=50');
        const data = await response.json();

        if (!data.success) throw new Error(data.error);

        const submissions = data.submissions || [];

        // Simple risk classification (based on has_symptoms)
        const high = submissions.filter(s => s.has_symptoms === 1);
        const low = submissions.filter(s => s.has_symptoms === 0 || !s.has_symptoms);
        const medium = []; // No medium in current data model

        highCount.textContent = high.length;
        mediumCount.textContent = medium.length;
        lowCount.textContent = low.length;

        if (submissions.length === 0) {
          workerList.innerHTML = \`
            <li class="empty-state">
              <i class="bi bi-inbox"></i>
              <div>데이터가 없습니다</div>
            </li>
          \`;
          return;
        }

        workerList.innerHTML = high.slice(0, 5).map(worker => \`
          <li class="worker-item">
            <div class="worker-info">
              <div class="worker-name">\${worker.name || '익명'}</div>
              <div class="worker-dept">\${worker.department || '미지정'}</div>
            </div>
            <span class="worker-risk-badge high">고위험</span>
          </li>
        \`).join('') + low.slice(0, 5).map(worker => \`
          <li class="worker-item">
            <div class="worker-info">
              <div class="worker-name">\${worker.name || '익명'}</div>
              <div class="worker-dept">\${worker.department || '미지정'}</div>
            </div>
            <span class="worker-risk-badge low">저위험</span>
          </li>
        \`).join('');

      } catch (error) {
        console.error('Error loading risk data:', error);
        workerList.innerHTML = \`
          <li class="empty-state">
            <i class="bi bi-exclamation-triangle"></i>
            <div>데이터를 불러올 수 없습니다</div>
          </li>
        \`;
      }
    }

    // ============================================================
    // Actions
    // ============================================================
    async function exportAllData() {
      try {
        showToast('내보내기', '데이터를 내보내는 중입니다...', 'info');
        window.open('/api/admin/export', '_blank');
        showToast('내보내기 완료', 'CSV 파일 다운로드가 시작되었습니다', 'success');
      } catch (error) {
        showToast('내보내기 실패', '데이터 내보내기 중 오류가 발생했습니다', 'error');
      }
    }

    function viewAllSurveys() {
      // TODO: Implement full survey list view
      showToast('준비중', '전체 설문 목록 화면은 준비 중입니다', 'info');
    }

    // ============================================================
    // Initialize
    // ============================================================
    window.addEventListener('DOMContentLoaded', () => {
      loadTodoList();
      loadRiskData();

      // Load survey count
      fetch('/api/admin/stats')
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            document.getElementById('survey-count-badge').textContent = data.statistics.total || 0;
          }
        })
        .catch(err => console.error('Error loading survey count:', err));

      // Welcome toast
      setTimeout(() => {
        showToast(
          '환영합니다!',
          'SafeWork 업무시스템 v3.0',
          'success'
        );
      }, 500);
    });
  </script>
</body>
</html>
`;
