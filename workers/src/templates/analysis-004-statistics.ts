/**
 * Analysis 004: Musculoskeletal Statistics Summary Template
 * HTML visualization of comprehensive statistical analysis
 */

export function analysis004Template(statisticsData: any) {
  const { metadata, section1_overall_prevalence, section2_gender_prevalence, section3_age_prevalence, section4_work_hours_prevalence } = statisticsData;

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>004 통계 분석 보고서 - SafeWork</title>

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
      border-bottom: 3px solid var(--primary);
      padding-bottom: 10px;
    }

    .chart-container {
      position: relative;
      height: 400px;
      margin-bottom: 30px;
    }

    .table-responsive {
      max-height: 500px;
      overflow-y: auto;
    }

    .prevalence-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .prevalence-high { background: #fee2e2; color: #dc2626; }
    .prevalence-medium { background: #fef3c7; color: #d97706; }
    .prevalence-low { background: #d1fae5; color: #059669; }

    .severity-indicator {
      width: 100%;
      height: 30px;
      border-radius: 5px;
      background: linear-gradient(to right, #10b981, #f59e0b, #ef4444);
      position: relative;
    }

    .severity-marker {
      position: absolute;
      top: -5px;
      width: 3px;
      height: 40px;
      background: #333;
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
          <h1><i class="bi bi-bar-chart-line"></i> ${metadata.title}</h1>
          <p class="text-muted">${metadata.description}</p>
          <small class="text-muted">생성일시: ${new Date(metadata.generatedAt).toLocaleString('ko-KR')}</small>
          <span class="badge bg-primary ms-2">총 ${metadata.totalAnalyzed}건 분석</span>
        </div>
        <a href="/admin" class="btn btn-outline-primary">
          <i class="bi bi-arrow-left"></i> 대시보드로
        </a>
      </div>
    </header>

    <!-- Section 1: Overall Prevalence -->
    <section class="section">
      <h2><i class="bi bi-activity"></i> ${section1_overall_prevalence.title}</h2>
      <p class="text-muted">${section1_overall_prevalence.note}</p>

      <div class="row mb-4">
        <div class="col-12">
          <h4 class="mb-3">부위별 유병률</h4>
          <div class="chart-container">
            <canvas id="prevalenceChart"></canvas>
          </div>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>부위</th>
              <th class="text-center">총 응답</th>
              <th class="text-center">통증 있음</th>
              <th class="text-center">유병률</th>
              <th class="text-center">평균 심각도</th>
              <th class="text-center">위험도</th>
            </tr>
          </thead>
          <tbody>
            ${section1_overall_prevalence.bodyParts.map((part: any) => {
              let riskClass = 'prevalence-low';
              if (part.prevalenceRate >= 30) riskClass = 'prevalence-high';
              else if (part.prevalenceRate >= 15) riskClass = 'prevalence-medium';

              return `
              <tr>
                <td><strong>${part.korean}</strong></td>
                <td class="text-center">${part.totalResponses}</td>
                <td class="text-center">${part.withPain}</td>
                <td class="text-center">
                  <span class="prevalence-badge ${riskClass}">${part.prevalenceRate}%</span>
                </td>
                <td class="text-center">
                  <span class="badge ${part.avgSeverity >= 2.5 ? 'bg-danger' : part.avgSeverity >= 1.5 ? 'bg-warning' : 'bg-success'}">
                    ${part.avgSeverity.toFixed(2)}
                  </span>
                </td>
                <td class="text-center">
                  ${part.prevalenceRate >= 30
                    ? '<i class="bi bi-exclamation-triangle-fill text-danger"></i>'
                    : part.prevalenceRate >= 15
                    ? '<i class="bi bi-exclamation-circle-fill text-warning"></i>'
                    : '<i class="bi bi-check-circle-fill text-success"></i>'
                  }
                </td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Section 2: Gender Prevalence -->
    <section class="section">
      <h2><i class="bi bi-gender-ambiguous"></i> ${section2_gender_prevalence.title}</h2>

      <div class="row">
        <div class="col-lg-6">
          <div class="card mb-3">
            <div class="card-header bg-primary text-white">
              <h5 class="mb-0"><i class="bi bi-gender-male"></i> 남성</h5>
            </div>
            <div class="card-body">
              <div class="row text-center">
                <div class="col-4">
                  <h3 class="text-primary">${section2_gender_prevalence.male.total}</h3>
                  <p class="text-muted">총 인원</p>
                </div>
                <div class="col-4">
                  <h3 class="text-danger">${section2_gender_prevalence.male.withPain}</h3>
                  <p class="text-muted">통증 있음</p>
                </div>
                <div class="col-4">
                  <h3 class="text-warning">${section2_gender_prevalence.male.prevalenceRate}%</h3>
                  <p class="text-muted">유병률</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="card mb-3">
            <div class="card-header text-white" style="background: #ec4899;">
              <h5 class="mb-0"><i class="bi bi-gender-female"></i> 여성</h5>
            </div>
            <div class="card-body">
              <div class="row text-center">
                <div class="col-4">
                  <h3 style="color: #ec4899;">${section2_gender_prevalence.female.total}</h3>
                  <p class="text-muted">총 인원</p>
                </div>
                <div class="col-4">
                  <h3 class="text-danger">${section2_gender_prevalence.female.withPain}</h3>
                  <p class="text-muted">통증 있음</p>
                </div>
                <div class="col-4">
                  <h3 class="text-warning">${section2_gender_prevalence.female.prevalenceRate}%</h3>
                  <p class="text-muted">유병률</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="chart-container" style="height: 300px;">
        <canvas id="genderChart"></canvas>
      </div>
    </section>

    <!-- Section 3: Age Prevalence -->
    <section class="section">
      <h2><i class="bi bi-calendar-check"></i> ${section3_age_prevalence.title}</h2>

      <div class="chart-container">
        <canvas id="ageChart"></canvas>
      </div>

      <div class="table-responsive">
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>연령대</th>
              <th class="text-center">총 인원</th>
              <th class="text-center">통증 있음</th>
              <th class="text-center">유병률</th>
            </tr>
          </thead>
          <tbody>
            ${section3_age_prevalence.ageGroups.map((group: any) => `
              <tr>
                <td><strong>${group.ageGroup}</strong></td>
                <td class="text-center">${group.total}</td>
                <td class="text-center">${group.withPain}</td>
                <td class="text-center">
                  <span class="prevalence-badge ${group.prevalenceRate >= 30 ? 'prevalence-high' : group.prevalenceRate >= 15 ? 'prevalence-medium' : 'prevalence-low'}">
                    ${group.prevalenceRate}%
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Section 4: Work Hours Prevalence -->
    <section class="section">
      <h2><i class="bi bi-clock-history"></i> ${section4_work_hours_prevalence.title}</h2>

      <div class="chart-container">
        <canvas id="workHoursChart"></canvas>
      </div>

      <div class="table-responsive">
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>근무시간</th>
              <th class="text-center">총 인원</th>
              <th class="text-center">통증 있음</th>
              <th class="text-center">유병률</th>
              <th class="text-center">위험도</th>
            </tr>
          </thead>
          <tbody>
            ${section4_work_hours_prevalence.workHours.map((hours: any) => {
              let riskClass = 'prevalence-low';
              if (hours.prevalenceRate >= 30) riskClass = 'prevalence-high';
              else if (hours.prevalenceRate >= 15) riskClass = 'prevalence-medium';

              return `
              <tr>
                <td><strong>${hours.hoursRange}</strong></td>
                <td class="text-center">${hours.total}</td>
                <td class="text-center">${hours.withPain}</td>
                <td class="text-center">
                  <span class="prevalence-badge ${riskClass}">${hours.prevalenceRate}%</span>
                </td>
                <td class="text-center">
                  ${hours.prevalenceRate >= 30
                    ? '<i class="bi bi-exclamation-triangle-fill text-danger"></i> 고위험'
                    : hours.prevalenceRate >= 15
                    ? '<i class="bi bi-exclamation-circle-fill text-warning"></i> 중위험'
                    : '<i class="bi bi-check-circle-fill text-success"></i> 저위험'
                  }
                </td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="alert alert-warning mt-4" role="alert">
        <i class="bi bi-info-circle"></i>
        <strong>해석 가이드:</strong> 장시간 근무(11시간 이상)에서 유병률이 유의미하게 증가하는 경향이 있습니다. 근무시간 단축 및 적절한 휴식시간 확보를 권장합니다.
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
    const statsData = ${JSON.stringify(statisticsData)};

    // Overall Prevalence Chart
    new Chart(document.getElementById('prevalenceChart'), {
      type: 'bar',
      data: {
        labels: statsData.section1_overall_prevalence.bodyParts.map(p => p.korean),
        datasets: [
          {
            label: '유병률 (%)',
            data: statsData.section1_overall_prevalence.bodyParts.map(p => p.prevalenceRate),
            backgroundColor: statsData.section1_overall_prevalence.bodyParts.map(p =>
              p.prevalenceRate >= 30 ? '#ef4444' :
              p.prevalenceRate >= 15 ? '#f59e0b' : '#10b981'
            ),
            yAxisID: 'y'
          },
          {
            label: '평균 심각도',
            data: statsData.section1_overall_prevalence.bodyParts.map(p => p.avgSeverity * 10),
            type: 'line',
            borderColor: '#8b5cf6',
            backgroundColor: 'transparent',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: '유병률 (%)' },
            beginAtZero: true
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: { display: true, text: '심각도 (x10)' },
            beginAtZero: true,
            grid: { drawOnChartArea: false }
          }
        }
      }
    });

    // Gender Prevalence Chart
    new Chart(document.getElementById('genderChart'), {
      type: 'doughnut',
      data: {
        labels: ['남성 유병률', '여성 유병률'],
        datasets: [{
          data: [
            statsData.section2_gender_prevalence.male.prevalenceRate,
            statsData.section2_gender_prevalence.female.prevalenceRate
          ],
          backgroundColor: ['#3b82f6', '#ec4899']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });

    // Age Group Prevalence Chart
    new Chart(document.getElementById('ageChart'), {
      type: 'line',
      data: {
        labels: statsData.section3_age_prevalence.ageGroups.map(g => g.ageGroup),
        datasets: [{
          label: '유병률 (%)',
          data: statsData.section3_age_prevalence.ageGroups.map(g => g.prevalenceRate),
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, title: { display: true, text: '유병률 (%)' } } }
      }
    });

    // Work Hours Prevalence Chart
    new Chart(document.getElementById('workHoursChart'), {
      type: 'bar',
      data: {
        labels: statsData.section4_work_hours_prevalence.workHours.map(h => h.hoursRange),
        datasets: [{
          label: '유병률 (%)',
          data: statsData.section4_work_hours_prevalence.workHours.map(h => h.prevalenceRate),
          backgroundColor: statsData.section4_work_hours_prevalence.workHours.map(h =>
            h.prevalenceRate >= 30 ? '#ef4444' :
            h.prevalenceRate >= 15 ? '#f59e0b' : '#10b981'
          )
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, title: { display: true, text: '유병률 (%)' } } }
      }
    });
  </script>
</body>
</html>
`;
}
