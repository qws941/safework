export function getSurveyDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>근골격계 증상조사 대시보드 - SafeWork</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {
            --sw-primary: #4f46e5;
            --sw-primary-light: #6366f1;
            --sw-primary-dark: #4338ca;
            --sw-secondary: #64748b;
            --sw-success: #10b981;
            --sw-warning: #f59e0b;
            --sw-danger: #ef4444;
        }
        body {
            background: #f3f4f6;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .dashboard-header {
            background: linear-gradient(135deg, var(--sw-primary) 0%, var(--sw-primary-dark) 100%);
            color: white;
            padding: 30px 0;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .stat-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            margin-bottom: 25px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .stat-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
        }
        .stat-number {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--sw-primary);
            margin: 0;
            line-height: 1;
        }
        .stat-label {
            color: var(--sw-secondary);
            font-size: 0.95rem;
            margin-top: 10px;
            font-weight: 600;
        }
        .chart-container {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            margin-bottom: 25px;
        }
        .chart-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #374151;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #f0f0f0;
        }
        .risk-badge {
            padding: 8px 15px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.85rem;
            display: inline-block;
        }
        .risk-high {
            background: #fee2e2;
            color: #dc2626;
        }
        .risk-medium {
            background: #fed7aa;
            color: #ea580c;
        }
        .risk-low {
            background: #dbeafe;
            color: #2563eb;
        }
        .table-container {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        .btn-export {
            background: var(--sw-success);
            color: white;
            border: none;
            padding: 10px 25px;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.2s;
        }
        .btn-export:hover {
            background: #059669;
            transform: translateY(-2px);
        }
        .refresh-btn {
            background: white;
            color: var(--sw-primary);
            border: 2px solid var(--sw-primary);
            padding: 10px 25px;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.2s;
        }
        .refresh-btn:hover {
            background: var(--sw-primary);
            color: white;
        }
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        }
        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 5px solid #f3f3f3;
            border-top: 5px solid var(--sw-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="loading-overlay" id="loadingOverlay">
        <div class="loading-spinner"></div>
    </div>

    <div class="dashboard-header">
        <div class="container">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <h1><i class="bi bi-graph-up"></i> 근골격계 증상조사 대시보드</h1>
                    <p class="mb-0">실시간 데이터 분석 및 위험도 평가</p>
                </div>
                <div class="col-md-4 text-end">
                    <button class="refresh-btn" onclick="refreshData()">
                        <i class="bi bi-arrow-clockwise"></i> 새로고침
                    </button>
                    <button class="btn-export ms-2" onclick="exportCSV()">
                        <i class="bi bi-download"></i> CSV 내보내기
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div class="container mt-4">
        <!-- 통계 카드 -->
        <div class="row">
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-people-fill text-primary" style="font-size: 2.5rem; margin-right: 15px;"></i>
                        <div>
                            <p class="stat-number" id="totalSurveys">0</p>
                            <p class="stat-label">전체 응답자</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-exclamation-triangle-fill text-danger" style="font-size: 2.5rem; margin-right: 15px;"></i>
                        <div>
                            <p class="stat-number" id="highRiskCount">0</p>
                            <p class="stat-label">고위험군</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-clock-history text-warning" style="font-size: 2.5rem; margin-right: 15px;"></i>
                        <div>
                            <p class="stat-number" id="todayCount">0</p>
                            <p class="stat-label">오늘 응답</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-graph-up-arrow text-success" style="font-size: 2.5rem; margin-right: 15px;"></i>
                        <div>
                            <p class="stat-number" id="avgRiskScore">0</p>
                            <p class="stat-label">평균 위험도</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 차트 섹션 -->
        <div class="row mt-4">
            <div class="col-md-6">
                <div class="chart-container">
                    <h3 class="chart-title">부위별 증상 분포</h3>
                    <canvas id="bodyPartChart"></canvas>
                </div>
            </div>
            <div class="col-md-6">
                <div class="chart-container">
                    <h3 class="chart-title">증상 심각도 분포</h3>
                    <canvas id="severityChart"></canvas>
                </div>
            </div>
        </div>

        <div class="row mt-4">
            <div class="col-md-8">
                <div class="chart-container">
                    <h3 class="chart-title">일별 응답 추이</h3>
                    <canvas id="dailyChart"></canvas>
                </div>
            </div>
            <div class="col-md-4">
                <div class="chart-container">
                    <h3 class="chart-title">위험도 분포</h3>
                    <canvas id="riskChart"></canvas>
                </div>
            </div>
        </div>

        <!-- 고위험군 테이블 -->
        <div class="row mt-4">
            <div class="col-12">
                <div class="table-container">
                    <h3 class="chart-title">고위험군 목록</h3>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>이름</th>
                                    <th>회사</th>
                                    <th>공정</th>
                                    <th>위험도</th>
                                    <th>주요 증상</th>
                                    <th>제출일</th>
                                    <th>상세</th>
                                </tr>
                            </thead>
                            <tbody id="highRiskTable">
                                <!-- 동적으로 생성됨 -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- 부서별 통계 -->
        <div class="row mt-4 mb-5">
            <div class="col-12">
                <div class="table-container">
                    <h3 class="chart-title">부서별 위험도 분석</h3>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>부서/공정</th>
                                    <th>전체 인원</th>
                                    <th>고위험</th>
                                    <th>중위험</th>
                                    <th>저위험</th>
                                    <th>평균 점수</th>
                                    <th>상태</th>
                                </tr>
                            </thead>
                            <tbody id="departmentTable">
                                <!-- 동적으로 생성됨 -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let charts = {};

        async function loadDashboard() {
            showLoading();
            try {
                // Load statistics
                const statsResponse = await fetch('/api/survey-admin/stats');
                const statsData = await statsResponse.json();

                // Load risk assessment
                const riskResponse = await fetch('/api/survey-admin/risk-assessment');
                const riskData = await riskResponse.json();

                if (statsData.success) {
                    updateStatistics(statsData.stats);
                    updateCharts(statsData.stats);
                }

                if (riskData.success) {
                    updateRiskTables(riskData.risk_assessment);
                }
            } catch (error) {
                console.error('Dashboard load error:', error);
                alert('데이터 로드 중 오류가 발생했습니다.');
            } finally {
                hideLoading();
            }
        }

        function updateStatistics(stats) {
            document.getElementById('totalSurveys').textContent = stats.total_surveys || 0;

            // Calculate today's count
            const today = new Date().toISOString().split('T')[0];
            const todayCount = stats.by_date[today] || 0;
            document.getElementById('todayCount').textContent = todayCount;
        }

        function updateCharts(stats) {
            // Body part symptoms chart
            if (charts.bodyPart) charts.bodyPart.destroy();
            const bodyPartCtx = document.getElementById('bodyPartChart').getContext('2d');
            charts.bodyPart = new Chart(bodyPartCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(stats.symptoms_by_body_part || {}),
                    datasets: [{
                        label: '증상 발생 건수',
                        data: Object.values(stats.symptoms_by_body_part || {}),
                        backgroundColor: 'rgba(79, 70, 229, 0.6)',
                        borderColor: 'rgba(79, 70, 229, 1)',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } }
                    }
                }
            });

            // Severity distribution chart
            if (charts.severity) charts.severity.destroy();
            const severityCtx = document.getElementById('severityChart').getContext('2d');
            const severityData = stats.severity_distribution || {};
            charts.severity = new Chart(severityCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(severityData),
                    datasets: [{
                        data: Object.values(severityData),
                        backgroundColor: [
                            'rgba(239, 68, 68, 0.7)',
                            'rgba(245, 158, 11, 0.7)',
                            'rgba(59, 130, 246, 0.7)',
                            'rgba(16, 185, 129, 0.7)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });

            // Daily trend chart
            if (charts.daily) charts.daily.destroy();
            const dailyCtx = document.getElementById('dailyChart').getContext('2d');
            const dates = Object.keys(stats.by_date || {}).sort().slice(-30);
            charts.daily = new Chart(dailyCtx, {
                type: 'line',
                data: {
                    labels: dates.map(d => d.split('-').slice(1).join('/')),
                    datasets: [{
                        label: '일별 응답수',
                        data: dates.map(d => stats.by_date[d] || 0),
                        borderColor: 'rgba(79, 70, 229, 1)',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } }
                    }
                }
            });
        }

        function updateRiskTables(riskData) {
            // Update high risk count
            document.getElementById('highRiskCount').textContent = riskData.high_risk.length;

            // Calculate average risk score
            const allScores = [
                ...riskData.high_risk.map(r => r.score),
                ...riskData.medium_risk.map(r => r.score),
                ...riskData.low_risk.map(r => r.score)
            ];
            const avgScore = allScores.length > 0
                ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
                : 0;
            document.getElementById('avgRiskScore').textContent = avgScore;

            // Risk distribution chart
            if (charts.risk) charts.risk.destroy();
            const riskCtx = document.getElementById('riskChart').getContext('2d');
            charts.risk = new Chart(riskCtx, {
                type: 'pie',
                data: {
                    labels: ['고위험', '중위험', '저위험'],
                    datasets: [{
                        data: [
                            riskData.high_risk.length,
                            riskData.medium_risk.length,
                            riskData.low_risk.length
                        ],
                        backgroundColor: [
                            'rgba(239, 68, 68, 0.7)',
                            'rgba(245, 158, 11, 0.7)',
                            'rgba(16, 185, 129, 0.7)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });

            // High risk table
            const highRiskTable = document.getElementById('highRiskTable');
            highRiskTable.innerHTML = riskData.high_risk.slice(0, 10).map(person => \`
                <tr>
                    <td>\${person.name}</td>
                    <td>\${person.company}</td>
                    <td>\${person.process}</td>
                    <td><span class="risk-badge risk-high">\${person.score}점</span></td>
                    <td>-</td>
                    <td>\${new Date(person.timestamp).toLocaleDateString('ko-KR')}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="viewDetails('\${person.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                </tr>
            \`).join('');

            // Department table
            const deptTable = document.getElementById('departmentTable');
            deptTable.innerHTML = Object.entries(riskData.risk_by_department).map(([dept, stats]) => {
                const riskLevel = stats.avg_score >= 70 ? 'risk-high' :
                                 stats.avg_score >= 40 ? 'risk-medium' : 'risk-low';
                return \`
                    <tr>
                        <td>\${dept}</td>
                        <td>\${stats.total}</td>
                        <td>\${stats.high_risk}</td>
                        <td>\${stats.medium_risk}</td>
                        <td>\${stats.low_risk}</td>
                        <td>\${stats.avg_score}점</td>
                        <td><span class="risk-badge \${riskLevel}">\${
                            riskLevel === 'risk-high' ? '위험' :
                            riskLevel === 'risk-medium' ? '주의' : '양호'
                        }</span></td>
                    </tr>
                \`;
            }).join('');
        }

        function refreshData() {
            loadDashboard();
        }

        function exportCSV() {
            window.location.href = '/api/survey-admin/export/csv';
        }

        function viewDetails(id) {
            window.open(\`/api/survey-data/\${id}\`, '_blank');
        }

        function showLoading() {
            document.getElementById('loadingOverlay').style.display = 'flex';
        }

        function hideLoading() {
            document.getElementById('loadingOverlay').style.display = 'none';
        }

        // Load dashboard on page load
        document.addEventListener('DOMContentLoaded', loadDashboard);

        // Auto-refresh every 30 seconds
        setInterval(loadDashboard, 30000);
    </script>
</body>
</html>`;
}