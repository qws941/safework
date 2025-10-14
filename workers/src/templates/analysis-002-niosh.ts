/**
 * Analysis 002: NIOSH Lifting Equation & Workload Analysis Template
 * HTML visualization of NIOSH-based risk analysis
 */

export function analysis002Template(analysisData: any) {
  const { metadata, workers, departmentAnalysis, recommendations } = analysisData;

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>002 NIOSH 작업부담 분석 - SafeWork</title>

  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">

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

    .report-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .report-header {
      background: white;
      border-radius: 15px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }

    .report-header h1 {
      color: var(--primary);
      font-size: 2.5rem;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .stat-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-box {
      background: white;
      border-radius: 15px;
      padding: 25px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      position: relative;
      overflow: hidden;
    }

    .stat-box::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
    }

    .stat-box.danger::before { background: var(--danger); }
    .stat-box.warning::before { background: var(--warning); }
    .stat-box.info::before { background: var(--info); }
    .stat-box.success::before { background: var(--success); }

    .stat-value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #333;
    }

    .stat-label {
      color: #666;
      font-size: 0.95rem;
      margin-top: 5px;
    }

    .section {
      background: white;
      border-radius: 15px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }

    .section h2 {
      color: var(--primary);
      font-size: 1.8rem;
      font-weight: bold;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .risk-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .risk-badge.very_high {
      background: #dc2626;
      color: white;
    }

    .risk-badge.high {
      background: #f59e0b;
      color: white;
    }

    .risk-badge.medium {
      background: #eab308;
      color: #333;
    }

    .risk-badge.low {
      background: #10b981;
      color: white;
    }

    .worker-card {
      background: #f9fafb;
      border-left: 4px solid;
      padding: 20px;
      margin-bottom: 15px;
      border-radius: 8px;
      transition: transform 0.2s;
    }

    .worker-card:hover {
      transform: translateX(5px);
    }

    .dept-analysis-item {
      background: #f9fafb;
      padding: 20px;
      margin-bottom: 15px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .recommendation-box {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 20px;
      margin-bottom: 15px;
      border-radius: 8px;
    }

    .chart-container {
      position: relative;
      height: 400px;
      margin-bottom: 20px;
    }

    .print-btn {
      position: fixed;
      bottom: 30px;
      right: 30px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: white;
      border: none;
      font-size: 1.5rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      cursor: pointer;
      z-index: 1000;
    }

    .print-btn:hover {
      transform: scale(1.1);
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }
      .print-btn {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header -->
    <header class="report-header">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <h1><i class="bi bi-graph-up-arrow"></i> ${metadata.title}</h1>
          <p class="text-muted">${metadata.description}</p>
          <small class="text-muted">생성일시: ${new Date(metadata.analysisDate).toLocaleString('ko-KR')}</small>
        </div>
        <a href="/admin" class="btn btn-outline-primary">
          <i class="bi bi-arrow-left"></i> 대시보드로
        </a>
      </div>
    </header>

    <!-- Summary Statistics -->
    <div class="stat-summary">
      <div class="stat-box info">
        <div class="stat-value">${metadata.totalWorkers}</div>
        <div class="stat-label">총 분석 대상 근로자</div>
      </div>
      <div class="stat-box danger">
        <div class="stat-value">${metadata.highRiskCount}</div>
        <div class="stat-label">고위험군 근로자</div>
        <small class="text-muted">(${metadata.highRiskPercent}%)</small>
      </div>
      <div class="stat-box warning">
        <div class="stat-value">${metadata.avgRiskScore}</div>
        <div class="stat-label">평균 위험도 점수</div>
        <small class="text-muted">(0-100 척도)</small>
      </div>
      <div class="stat-box success">
        <div class="stat-value">${departmentAnalysis.length}</div>
        <div class="stat-label">분석 대상 부서</div>
      </div>
    </div>

    <!-- Recommendations -->
    <section class="section">
      <h2><i class="bi bi-lightbulb"></i> 개선 권장사항</h2>
      ${recommendations.map((rec: string) => `
        <div class="recommendation-box">
          <strong>${rec}</strong>
        </div>
      `).join('')}
    </section>

    <!-- Department Analysis Chart -->
    <section class="section">
      <h2><i class="bi bi-building"></i> 부서별 위험도 분석</h2>
      <div class="chart-container">
        <canvas id="departmentRiskChart"></canvas>
      </div>
      <div class="table-responsive mt-4">
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>부서</th>
              <th class="text-center">근로자 수</th>
              <th class="text-center">평균 위험도</th>
              <th class="text-center">고위험군</th>
              <th class="text-center">고위험 비율</th>
            </tr>
          </thead>
          <tbody>
            ${departmentAnalysis.map((dept: any) => `
              <tr>
                <td><strong>${dept.department}</strong></td>
                <td class="text-center">${dept.workerCount}명</td>
                <td class="text-center">
                  <span class="badge ${dept.avgRiskScore >= 70 ? 'bg-danger' : dept.avgRiskScore >= 50 ? 'bg-warning' : 'bg-success'}">${dept.avgRiskScore}</span>
                </td>
                <td class="text-center">${dept.highRiskCount}명</td>
                <td class="text-center">${dept.highRiskPercent}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Individual Worker Analysis -->
    <section class="section">
      <h2><i class="bi bi-people"></i> 근로자별 상세 분석 (상위 20명)</h2>
      ${workers.slice(0, 20).map((worker: any) => `
        <div class="worker-card" style="border-left-color: ${worker.riskColor};">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <strong class="fs-5">${worker.name}</strong>
              <span class="text-muted ms-2">${worker.department}</span>
            </div>
            <span class="risk-badge ${worker.riskLevel}">
              위험도: ${worker.riskScore}
            </span>
          </div>
          <div class="row mt-3">
            <div class="col-md-3">
              <small class="text-muted">기본정보</small><br>
              <strong>${worker.age}세 / ${worker.gender} / ${worker.workExperience}</strong>
            </div>
            <div class="col-md-3">
              <small class="text-muted">중량물 취급</small><br>
              <strong>${worker.factors.heavyLifting.frequency || '-'}</strong><br>
              <small>${worker.factors.heavyLifting.weight || '-'}</small>
            </div>
            <div class="col-md-3">
              <small class="text-muted">작업 자세</small><br>
              ${worker.factors.posture.types.length > 0
                ? worker.factors.posture.types.slice(0, 2).join(', ')
                : '정상 자세'
              }
            </div>
            <div class="col-md-3">
              <small class="text-muted">작업 유형</small><br>
              ${worker.factors.workType.isRepetitive ? '<span class="badge bg-warning">반복작업</span> ' : ''}
              ${worker.factors.workType.isHeavyLoad ? '<span class="badge bg-danger">중량물</span>' : ''}
            </div>
          </div>
        </div>
      `).join('')}
    </section>

    <!-- Risk Distribution Chart -->
    <section class="section">
      <h2><i class="bi bi-pie-chart"></i> 위험도 분포</h2>
      <div class="chart-container" style="height: 300px;">
        <canvas id="riskDistributionChart"></canvas>
      </div>
    </section>
  </div>

  <!-- Print Button -->
  <button class="print-btn" onclick="window.print()" title="인쇄하기">
    <i class="bi bi-printer"></i>
  </button>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script>
    // Department Risk Chart
    const deptData = ${JSON.stringify(departmentAnalysis)};
    const deptChart = new Chart(document.getElementById('departmentRiskChart'), {
      type: 'bar',
      data: {
        labels: deptData.map(d => d.department),
        datasets: [
          {
            label: '평균 위험도',
            data: deptData.map(d => d.avgRiskScore),
            backgroundColor: deptData.map(d =>
              d.avgRiskScore >= 70 ? '#dc2626' :
              d.avgRiskScore >= 50 ? '#f59e0b' :
              d.avgRiskScore >= 30 ? '#eab308' : '#10b981'
            ),
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: '부서별 평균 위험도 점수' }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { stepSize: 10 }
          }
        }
      }
    });

    // Risk Distribution Chart
    const workersData = ${JSON.stringify(workers)};
    const riskCounts = {
      low: workersData.filter(w => w.riskLevel === 'low').length,
      medium: workersData.filter(w => w.riskLevel === 'medium').length,
      high: workersData.filter(w => w.riskLevel === 'high').length,
      very_high: workersData.filter(w => w.riskLevel === 'very_high').length
    };

    const riskChart = new Chart(document.getElementById('riskDistributionChart'), {
      type: 'doughnut',
      data: {
        labels: ['저위험', '중위험', '고위험', '매우 높음'],
        datasets: [{
          data: [riskCounts.low, riskCounts.medium, riskCounts.high, riskCounts.very_high],
          backgroundColor: ['#10b981', '#eab308', '#f59e0b', '#dc2626']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  </script>
</body>
</html>
`;
}
