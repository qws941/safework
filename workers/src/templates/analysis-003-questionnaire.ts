/**
 * Analysis 003: Musculoskeletal Questionnaire Summary Template
 * HTML visualization of Form 001 survey response summary
 */

export function analysis003Template(summaryData: any) {
  const { metadata, section1_demographics, section2_body_part_pain, section3_work_interference } = summaryData;

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>003 설문 요약 보고서 - SafeWork</title>

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

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card {
      background: #f9fafb;
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      border-left: 4px solid var(--primary);
    }

    .stat-card .value {
      font-size: 2rem;
      font-weight: bold;
      color: var(--primary);
    }

    .stat-card .label {
      color: #666;
      font-size: 0.9rem;
      margin-top: 5px;
    }

    .body-part-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .body-part-card {
      background: #f9fafb;
      border-radius: 10px;
      padding: 20px;
      transition: transform 0.2s;
    }

    .body-part-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }

    .body-part-card h4 {
      color: var(--primary);
      font-weight: bold;
      margin-bottom: 15px;
    }

    .progress-bar-custom {
      height: 25px;
      font-size: 0.85rem;
      font-weight: 600;
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
          <h1><i class="bi bi-clipboard2-pulse"></i> ${metadata.title}</h1>
          <p class="text-muted">${metadata.description}</p>
          <small class="text-muted">생성일시: ${new Date(metadata.generatedAt).toLocaleString('ko-KR')}</small>
          <span class="badge bg-primary ms-2">총 ${metadata.totalResponses}건 응답</span>
        </div>
        <a href="/admin" class="btn btn-outline-primary">
          <i class="bi bi-arrow-left"></i> 대시보드로
        </a>
      </div>
    </header>

    <!-- Section 1: Demographics -->
    <section class="section">
      <h2><i class="bi bi-people-fill"></i> ${section1_demographics.title}</h2>

      <div class="row mb-4">
        <div class="col-lg-6">
          <h4 class="mb-3">성별 분포</h4>
          <div class="chart-container" style="height: 300px;">
            <canvas id="genderChart"></canvas>
          </div>
          <div class="stat-grid">
            <div class="stat-card">
              <div class="value">${section1_demographics.gender.male.count}</div>
              <div class="label">남성 (${section1_demographics.gender.male.percentage}%)</div>
            </div>
            <div class="stat-card">
              <div class="value">${section1_demographics.gender.female.count}</div>
              <div class="label">여성 (${section1_demographics.gender.female.percentage}%)</div>
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <h4 class="mb-3">연령대 분포</h4>
          <div class="chart-container" style="height: 300px;">
            <canvas id="ageChart"></canvas>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 2: Body Part Pain -->
    <section class="section">
      <h2><i class="bi bi-activity"></i> ${section2_body_part_pain.title}</h2>

      <!-- Overall Pain Distribution Chart -->
      <div class="row mb-4">
        <div class="col-12">
          <h4 class="mb-3">부위별 통증 빈도 종합</h4>
          <div class="chart-container">
            <canvas id="bodyPartOverallChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Body Part Details -->
      <h4 class="mb-3">부위별 상세 통계</h4>
      <div class="body-part-grid">
        ${section2_body_part_pain.bodyParts.map((part: any) => `
          <div class="body-part-card">
            <h4>${part.name}</h4>
            <p class="text-muted mb-3">응답률: ${part.responseRate}%</p>

            <div class="mb-2">
              <small>없음 (${part.none}명)</small>
              <div class="progress mb-2">
                <div class="progress-bar bg-success progress-bar-custom"
                     style="width: ${part.none > 0 ? (part.none / metadata.totalResponses * 100).toFixed(1) : 0}%">
                  ${part.none}
                </div>
              </div>
            </div>

            <div class="mb-2">
              <small>가끔 (${part.sometimes}명)</small>
              <div class="progress mb-2">
                <div class="progress-bar bg-info progress-bar-custom"
                     style="width: ${part.sometimes > 0 ? (part.sometimes / metadata.totalResponses * 100).toFixed(1) : 0}%">
                  ${part.sometimes}
                </div>
              </div>
            </div>

            <div class="mb-2">
              <small>자주 (${part.often}명)</small>
              <div class="progress mb-2">
                <div class="progress-bar bg-warning progress-bar-custom"
                     style="width: ${part.often > 0 ? (part.often / metadata.totalResponses * 100).toFixed(1) : 0}%">
                  ${part.often}
                </div>
              </div>
            </div>

            <div class="mb-2">
              <small>항상 (${part.always}명)</small>
              <div class="progress mb-2">
                <div class="progress-bar bg-danger progress-bar-custom"
                     style="width: ${part.always > 0 ? (part.always / metadata.totalResponses * 100).toFixed(1) : 0}%">
                  ${part.always}
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- Section 3: Work Interference -->
    <section class="section">
      <h2><i class="bi bi-briefcase"></i> ${section3_work_interference.title}</h2>

      <div class="row">
        <div class="col-lg-6">
          <div class="stat-grid">
            <div class="stat-card" style="border-left-color: #10b981;">
              <div class="value">${section3_work_interference.noInterference}</div>
              <div class="label">업무 지장 없음</div>
            </div>
            <div class="stat-card" style="border-left-color: #ef4444;">
              <div class="value">${section3_work_interference.withInterference}</div>
              <div class="label">업무 지장 있음</div>
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="chart-container" style="height: 300px;">
            <canvas id="workInterferenceChart"></canvas>
          </div>
          <div class="text-center mt-3">
            <h3 class="text-primary">${section3_work_interference.interferenceRate}%</h3>
            <p class="text-muted">업무 지장률</p>
          </div>
        </div>
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
    const summaryData = ${JSON.stringify(summaryData)};

    // Gender Chart
    new Chart(document.getElementById('genderChart'), {
      type: 'pie',
      data: {
        labels: ['남성', '여성'],
        datasets: [{
          data: [
            summaryData.section1_demographics.gender.male.count,
            summaryData.section1_demographics.gender.female.count
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

    // Age Chart
    new Chart(document.getElementById('ageChart'), {
      type: 'bar',
      data: {
        labels: summaryData.section1_demographics.age.map(a => a.ageRange),
        datasets: [{
          label: '인원',
          data: summaryData.section1_demographics.age.map(a => a.count),
          backgroundColor: '#667eea'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });

    // Body Part Overall Chart
    new Chart(document.getElementById('bodyPartOverallChart'), {
      type: 'bar',
      data: {
        labels: summaryData.section2_body_part_pain.bodyParts.map(p => p.name),
        datasets: [
          {
            label: '없음',
            data: summaryData.section2_body_part_pain.bodyParts.map(p => p.none),
            backgroundColor: '#10b981'
          },
          {
            label: '가끔',
            data: summaryData.section2_body_part_pain.bodyParts.map(p => p.sometimes),
            backgroundColor: '#3b82f6'
          },
          {
            label: '자주',
            data: summaryData.section2_body_part_pain.bodyParts.map(p => p.often),
            backgroundColor: '#f59e0b'
          },
          {
            label: '항상',
            data: summaryData.section2_body_part_pain.bodyParts.map(p => p.always),
            backgroundColor: '#ef4444'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true }
        }
      }
    });

    // Work Interference Chart
    new Chart(document.getElementById('workInterferenceChart'), {
      type: 'doughnut',
      data: {
        labels: ['업무 지장 없음', '업무 지장 있음'],
        datasets: [{
          data: [
            summaryData.section3_work_interference.noInterference,
            summaryData.section3_work_interference.withInterference
          ],
          backgroundColor: ['#10b981', '#ef4444']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  </script>
</body>
</html>
`;
}
