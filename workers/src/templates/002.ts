export const form002Template = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>관리자 대시보드 (002) - SafeWork</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        :root {
            --admin-primary: #1e40af;
            --admin-primary-dark: #1e3a8a;
            --admin-secondary: #0f172a;
            --success-color: #059669;
            --warning-color: #d97706;
            --danger-color: #dc2626;
            --info-color: #0ea5e9;
            --admin-bg: #f8fafc;
            --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --card-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --glass-bg: rgba(255, 255, 255, 0.95);
            --glass-border: rgba(255, 255, 255, 0.2);
        }

        body {
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 25%, #0f172a 100%);
            min-height: 100vh;
            font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
            color: #1f2937;
        }

        .admin-container {
            max-width: 1500px;
            margin: 0 auto;
            padding: 20px;
        }

        .admin-header {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            color: var(--admin-primary);
            padding: 40px;
            border-radius: 24px;
            margin-bottom: 30px;
            text-align: center;
            box-shadow: var(--card-shadow-lg);
            border: 1px solid var(--glass-border);
            position: relative;
            overflow: hidden;
        }

        .admin-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, var(--admin-primary), var(--info-color), var(--success-color));
        }

        .admin-header h1 {
            font-size: 2.5rem;
            font-weight: 800;
            margin-bottom: 15px;
            background: linear-gradient(135deg, var(--admin-primary), var(--admin-primary-dark));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .admin-header p {
            font-size: 1.2rem;
            opacity: 0.8;
            font-weight: 500;
        }

        .admin-section {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            padding: 35px;
            border-radius: 20px;
            box-shadow: var(--card-shadow-lg);
            margin-bottom: 25px;
            border: 1px solid var(--glass-border);
            transition: all 0.3s ease;
        }

        .admin-section:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .section-title {
            color: var(--admin-primary);
            font-weight: 700;
            font-size: 1.5rem;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 3px solid #e2e8f0;
            position: relative;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .section-title::after {
            content: '';
            position: absolute;
            bottom: -3px;
            left: 0;
            width: 80px;
            height: 3px;
            background: linear-gradient(135deg, var(--admin-primary), var(--admin-primary-dark));
            border-radius: 2px;
        }

        .stat-card {
            background: linear-gradient(135deg, var(--warning-color), #ea580c);
            color: white;
            padding: 25px;
            border-radius: 16px;
            text-align: center;
            box-shadow: var(--card-shadow);
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.1);
            position: relative;
            overflow: hidden;
        }

        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: rgba(255, 255, 255, 0.3);
        }

        .stat-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 25px rgba(0, 0, 0, 0.15);
        }

        .stat-card.danger {
            background: linear-gradient(135deg, var(--danger-color), #b91c1c);
        }

        .stat-card.success {
            background: linear-gradient(135deg, var(--success-color), #047857);
        }

        .stat-card.primary {
            background: linear-gradient(135deg, var(--admin-primary), var(--admin-primary-dark));
        }

        .stat-card h3 {
            font-size: 2.2rem;
            font-weight: 800;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .stat-card p {
            font-size: 0.95rem;
            font-weight: 600;
            margin: 0;
            opacity: 0.95;
        }

        .filter-section {
            background: #f1f5f9;
            background: linear-gradient(135deg, #f8fafc, #f1f5f9);
            padding: 25px;
            border-radius: 16px;
            margin-bottom: 25px;
            border: 2px solid #e2e8f0;
            box-shadow: var(--card-shadow);
        }

        .survey-table {
            font-size: 0.9rem;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: var(--card-shadow);
        }

        .survey-table thead th {
            background: linear-gradient(135deg, var(--admin-primary), var(--admin-primary-dark));
            color: white;
            font-weight: 600;
            padding: 15px 12px;
            border: none;
            font-size: 0.85rem;
        }

        .survey-table tbody tr {
            transition: all 0.2s ease;
            border-bottom: 1px solid #e5e7eb;
        }

        .survey-table tbody tr:hover {
            background: rgba(30, 64, 175, 0.05);
            transform: scale(1.002);
        }

        .survey-table td {
            padding: 12px;
            vertical-align: middle;
        }

        .risk-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .risk-low {
            background: linear-gradient(135deg, var(--success-color), #047857);
            color: white;
        }

        .risk-medium {
            background: linear-gradient(135deg, var(--warning-color), #ea580c);
            color: white;
        }

        .risk-high {
            background: linear-gradient(135deg, var(--danger-color), #b91c1c);
            color: white;
        }

        .risk-critical {
            background: linear-gradient(135deg, #dc2626, #991b1b);
            color: white;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }

        .btn-group-sm .btn {
            padding: 8px 12px;
            font-size: 0.8rem;
            border-radius: 8px;
            margin: 0 2px;
            transition: all 0.2s ease;
        }

        .btn-group-sm .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .form-control, .form-select {
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            padding: 10px 14px;
            transition: all 0.3s ease;
            background: white;
        }

        .form-control:focus, .form-select:focus {
            border-color: var(--admin-primary);
            box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1);
        }

        .btn {
            border-radius: 10px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: var(--card-shadow);
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--admin-primary), var(--admin-primary-dark));
            border: none;
        }

        .btn-success {
            background: linear-gradient(135deg, var(--success-color), #047857);
            border: none;
        }

        .btn-warning {
            background: linear-gradient(135deg, var(--warning-color), #ea580c);
            border: none;
        }

        .pagination .page-link {
            border-radius: 8px;
            margin: 0 2px;
            border: 1px solid #e5e7eb;
            color: var(--admin-primary);
            transition: all 0.2s ease;
        }

        .pagination .page-link:hover {
            background: var(--admin-primary);
            color: white;
            transform: translateY(-1px);
        }

        .pagination .page-item.active .page-link {
            background: linear-gradient(135deg, var(--admin-primary), var(--admin-primary-dark));
            border-color: var(--admin-primary);
        }

        @media (max-width: 1200px) {
            .admin-container { padding: 15px; }
            .admin-section { padding: 25px 20px; }
            .admin-header h1 { font-size: 2rem; }
        }

        @media (max-width: 768px) {
            .admin-header { padding: 25px 20px; }
            .admin-header h1 { font-size: 1.7rem; }
            .stat-card h3 { font-size: 1.8rem; }
            .survey-table { font-size: 0.8rem; }
            .btn-group-sm .btn { padding: 6px 8px; font-size: 0.7rem; }
        }

        /* Loading animation */
        .loading {
            position: relative;
            overflow: hidden;
        }

        .loading::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            animation: loading 1.5s infinite;
        }

        @keyframes loading {
            0% { left: -100%; }
            100% { left: 100%; }
        }

        /* Smooth transitions for all elements */
        * {
            transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }
    </style>
</head>
<body>
    <div class="admin-container">
        <div class="admin-header">
            <h1><i class="bi bi-speedometer2"></i> SafeWork 관리자 대시보드</h1>
            <p class="mb-0">Administrator Dashboard (002) - 근골격계 증상조사 관리</p>
        </div>

        <!-- Statistics Overview -->
        <div class="admin-section">
            <h3 class="section-title"><i class="bi bi-graph-up"></i> 조사 현황 통계</h3>
            <div class="row">
                <div class="col-md-3 mb-3">
                    <div class="stat-card primary">
                        <h3 id="totalSurveys">-</h3>
                        <p class="mb-0">총 조사 건수</p>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="stat-card danger">
                        <h3 id="highRiskCount">-</h3>
                        <p class="mb-0">고위험 대상자</p>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="stat-card">
                        <h3 id="mediumRiskCount">-</h3>
                        <p class="mb-0">중위험 대상자</p>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="stat-card success">
                        <h3 id="lowRiskCount">-</h3>
                        <p class="mb-0">저위험/정상</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Department Analysis -->
        <div class="admin-section">
            <h3 class="section-title"><i class="bi bi-building"></i> 부서별 위험도 분석</h3>
            <div class="row">
                <div class="col-md-6">
                    <canvas id="departmentChart" width="400" height="200"></canvas>
                </div>
                <div class="col-md-6">
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>부서</th>
                                    <th>조사자 수</th>
                                    <th>평균 위험도</th>
                                    <th>고위험자</th>
                                </tr>
                            </thead>
                            <tbody id="departmentStats">
                                <!-- Department statistics will be populated here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Survey Results Management -->
        <div class="admin-section">
            <h3 class="section-title"><i class="bi bi-table"></i> 조사 결과 관리</h3>

            <!-- Filters -->
            <div class="filter-section">
                <div class="row">
                    <div class="col-md-3">
                        <label class="form-label">부서 필터</label>
                        <select class="form-select form-select-sm" id="deptFilter">
                            <option value="">전체 부서</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">위험도 필터</label>
                        <select class="form-select form-select-sm" id="riskFilter">
                            <option value="">전체 위험도</option>
                            <option value="critical">고위험</option>
                            <option value="high">중위험</option>
                            <option value="medium">저위험</option>
                            <option value="low">정상</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">조사일 범위</label>
                        <input type="date" class="form-control form-control-sm" id="dateFilter">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">&nbsp;</label>
                        <div>
                            <button class="btn btn-primary btn-sm" onclick="applyFilters()">
                                <i class="bi bi-search"></i> 필터 적용
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="resetFilters()">
                                <i class="bi bi-arrow-clockwise"></i> 초기화
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Survey Results Table -->
            <div class="table-responsive">
                <table class="table table-striped survey-table">
                    <thead>
                        <tr>
                            <th>번호</th>
                            <th>성명</th>
                            <th>부서</th>
                            <th>조사일</th>
                            <th>종합위험도</th>
                            <th>목/어깨</th>
                            <th>팔/팔꿈치</th>
                            <th>손목/손</th>
                            <th>허리</th>
                            <th>다리/무릎</th>
                            <th>의료상담</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody id="surveyResults">
                        <!-- Survey results will be populated here -->
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <nav aria-label="조사 결과 페이지네이션">
                <ul class="pagination justify-content-center" id="pagination">
                    <!-- Pagination will be populated here -->
                </ul>
            </nav>
        </div>

        <!-- Quick Actions -->
        <div class="admin-section">
            <h3 class="section-title"><i class="bi bi-tools"></i> 관리 작업</h3>
            <div class="row">
                <div class="col-md-4">
                    <button class="btn btn-success w-100 mb-2" onclick="exportToExcel()">
                        <i class="bi bi-file-earmark-excel"></i> Excel 내보내기
                    </button>
                </div>
                <div class="col-md-4">
                    <button class="btn btn-primary w-100 mb-2" onclick="generateReport()">
                        <i class="bi bi-file-earmark-text"></i> 종합 리포트 생성
                    </button>
                </div>
                <div class="col-md-4">
                    <button class="btn btn-warning w-100 mb-2" onclick="sendAlerts()">
                        <i class="bi bi-bell"></i> 고위험자 알림 발송
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script>
        console.log('002 Admin Dashboard Loaded - ENG LOG');

        // Demo data for testing
        const demoSurveyData = [
            {
                id: 1,
                name: '김철수',
                department: '생산팀',
                date: '2024-09-28',
                overallRisk: 'high',
                scores: { neck: 70, arm: 30, wrist: 40, back: 85, leg: 50 },
                medicalConsultation: 'needed'
            },
            {
                id: 2,
                name: '이영희',
                department: '품질관리팀',
                date: '2024-09-27',
                overallRisk: 'medium',
                scores: { neck: 45, arm: 20, wrist: 35, back: 55, leg: 30 },
                medicalConsultation: 'not_needed'
            },
            {
                id: 3,
                name: '박민수',
                department: '생산팀',
                date: '2024-09-26',
                overallRisk: 'critical',
                scores: { neck: 80, arm: 70, wrist: 75, back: 90, leg: 65 },
                medicalConsultation: 'urgent'
            },
            {
                id: 4,
                name: '정소영',
                department: '안전관리팀',
                date: '2024-09-25',
                overallRisk: 'low',
                scores: { neck: 20, arm: 15, wrist: 25, back: 30, leg: 20 },
                medicalConsultation: 'not_needed'
            },
            {
                id: 5,
                name: '홍길동',
                department: '생산팀',
                date: '2024-09-24',
                overallRisk: 'medium',
                scores: { neck: 60, arm: 25, wrist: 35, back: 75, leg: 45 },
                medicalConsultation: 'needed'
            }
        ];

        let currentData = [...demoSurveyData];
        let currentPage = 1;
        const itemsPerPage = 10;

        // Initialize dashboard
        function initializeDashboard() {
            console.log('Initializing admin dashboard');
            updateStatistics();
            updateDepartmentAnalysis();
            renderSurveyTable();
            populateFilters();
        }

        // Update statistics
        function updateStatistics() {
            const stats = calculateStatistics(currentData);
            document.getElementById('totalSurveys').textContent = stats.total;
            document.getElementById('highRiskCount').textContent = stats.critical + stats.high;
            document.getElementById('mediumRiskCount').textContent = stats.medium;
            document.getElementById('lowRiskCount').textContent = stats.low;
        }

        // Calculate statistics
        function calculateStatistics(data) {
            const stats = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
            data.forEach(item => {
                stats.total++;
                stats[item.overallRisk]++;
            });
            return stats;
        }

        // Update department analysis
        function updateDepartmentAnalysis() {
            const deptStats = {};
            currentData.forEach(item => {
                if (!deptStats[item.department]) {
                    deptStats[item.department] = { count: 0, risks: [], highRisk: 0 };
                }
                deptStats[item.department].count++;
                deptStats[item.department].risks.push(item.overallRisk);
                if (item.overallRisk === 'critical' || item.overallRisk === 'high') {
                    deptStats[item.department].highRisk++;
                }
            });

            const tbody = document.getElementById('departmentStats');
            tbody.innerHTML = '';
            Object.keys(deptStats).forEach(dept => {
                const stat = deptStats[dept];
                const avgRisk = calculateAverageRisk(stat.risks);
                const row = \`
                    <tr>
                        <td>\${dept}</td>
                        <td>\${stat.count}</td>
                        <td><span class="risk-badge risk-\${avgRisk.level}">\${avgRisk.label}</span></td>
                        <td>\${stat.highRisk}</td>
                    </tr>
                \`;
                tbody.innerHTML += row;
            });
        }

        // Calculate average risk
        function calculateAverageRisk(risks) {
            const riskValues = { low: 1, medium: 2, high: 3, critical: 4 };
            const avg = risks.reduce((sum, risk) => sum + riskValues[risk], 0) / risks.length;

            if (avg >= 3.5) return { level: 'critical', label: '고위험' };
            if (avg >= 2.5) return { level: 'high', label: '중위험' };
            if (avg >= 1.5) return { level: 'medium', label: '저위험' };
            return { level: 'low', label: '정상' };
        }

        // Render survey table
        function renderSurveyTable() {
            const tbody = document.getElementById('surveyResults');
            tbody.innerHTML = '';

            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pageData = currentData.slice(startIndex, endIndex);

            pageData.forEach((item, index) => {
                const riskBadge = getRiskBadge(item.overallRisk);
                const medicalIcon = item.medicalConsultation === 'urgent' ? 'bi-exclamation-triangle text-danger' :
                                   item.medicalConsultation === 'needed' ? 'bi-clock text-warning' : 'bi-check-circle text-success';

                const row = \`
                    <tr>
                        <td>\${startIndex + index + 1}</td>
                        <td>\${item.name}</td>
                        <td>\${item.department}</td>
                        <td>\${item.date}</td>
                        <td><span class="risk-badge risk-\${item.overallRisk}">\${riskBadge}</span></td>
                        <td>\${item.scores.neck}점</td>
                        <td>\${item.scores.arm}점</td>
                        <td>\${item.scores.wrist}점</td>
                        <td>\${item.scores.back}점</td>
                        <td>\${item.scores.leg}점</td>
                        <td><i class="bi \${medicalIcon}"></i></td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="viewDetails(\${item.id})">
                                    <i class="bi bi-eye"></i>
                                </button>
                                <button class="btn btn-outline-success" onclick="generatePersonalReport(\${item.id})">
                                    <i class="bi bi-file-text"></i>
                                </button>
                                <button class="btn btn-outline-warning" onclick="sendNotification(\${item.id})">
                                    <i class="bi bi-bell"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                \`;
                tbody.innerHTML += row;
            });

            updatePagination();
        }

        // Get risk badge text
        function getRiskBadge(risk) {
            const badges = { low: '정상', medium: '저위험', high: '중위험', critical: '고위험' };
            return badges[risk] || '미분류';
        }

        // Update pagination
        function updatePagination() {
            const totalPages = Math.ceil(currentData.length / itemsPerPage);
            const pagination = document.getElementById('pagination');
            pagination.innerHTML = '';

            for (let i = 1; i <= totalPages; i++) {
                const li = document.createElement('li');
                li.className = \`page-item \${i === currentPage ? 'active' : ''}\`;
                li.innerHTML = \`<a class="page-link" href="#" onclick="changePage(\${i})">\${i}</a>\`;
                pagination.appendChild(li);
            }
        }

        // Change page
        function changePage(page) {
            currentPage = page;
            renderSurveyTable();
        }

        // Populate filters
        function populateFilters() {
            const departments = [...new Set(demoSurveyData.map(item => item.department))];
            const deptFilter = document.getElementById('deptFilter');
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept;
                option.textContent = dept;
                deptFilter.appendChild(option);
            });
        }

        // Apply filters
        function applyFilters() {
            console.log('Applying filters');
            const deptFilter = document.getElementById('deptFilter').value;
            const riskFilter = document.getElementById('riskFilter').value;
            const dateFilter = document.getElementById('dateFilter').value;

            currentData = demoSurveyData.filter(item => {
                if (deptFilter && item.department !== deptFilter) return false;
                if (riskFilter && item.overallRisk !== riskFilter) return false;
                if (dateFilter && item.date !== dateFilter) return false;
                return true;
            });

            currentPage = 1;
            updateStatistics();
            updateDepartmentAnalysis();
            renderSurveyTable();
        }

        // Reset filters
        function resetFilters() {
            document.getElementById('deptFilter').value = '';
            document.getElementById('riskFilter').value = '';
            document.getElementById('dateFilter').value = '';
            currentData = [...demoSurveyData];
            currentPage = 1;
            updateStatistics();
            updateDepartmentAnalysis();
            renderSurveyTable();
        }

        // View details
        function viewDetails(id) {
            console.log(\`Viewing details for survey ID: \${id}\`);
            alert(\`개별 상세 보기 (ID: \${id})\\n개인별 분석 결과 페이지로 이동합니다.\`);
        }

        // Generate personal report
        function generatePersonalReport(id) {
            console.log(\`Generating personal report for ID: \${id}\`);
            alert(\`개인 리포트 생성 (ID: \${id})\\nPDF 리포트가 생성됩니다.\`);
        }

        // Send notification
        function sendNotification(id) {
            console.log(\`Sending notification for ID: \${id}\`);
            alert(\`알림 발송 (ID: \${id})\\n해당 직원에게 알림이 발송됩니다.\`);
        }

        // Export to Excel
        function exportToExcel() {
            console.log('Exporting to Excel');
            alert('Excel 내보내기\\n조사 결과가 Excel 파일로 다운로드됩니다.');
        }

        // Generate report
        function generateReport() {
            console.log('Generating comprehensive report');
            alert('종합 리포트 생성\\n전체 조사 결과 종합 리포트가 생성됩니다.');
        }

        // Send alerts
        function sendAlerts() {
            console.log('Sending alerts to high-risk individuals');
            alert('고위험자 알림 발송\\n고위험 대상자들에게 알림이 발송됩니다.');
        }

        // Initialize dashboard on page load
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Admin dashboard page loaded, initializing');
            initializeDashboard();
        });
    </script>
</body>
</html>`;