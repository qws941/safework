/**
 * 002 근골격계질환 증상조사 분석 도구
 * 001 설문 데이터를 NIOSH 기준으로 자동 분석
 */

export const form002AnalysisTool = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>002 근골격계 증상 분석 도구 - SafeWork</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px 0;
        }
        .analysis-container {
            max-width: 1600px;
            margin: 0 auto;
            padding: 30px;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .stats-card {
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            text-align: center;
        }
        .stats-card h2 {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .stats-card p {
            margin: 0;
            font-size: 1rem;
        }
        .danger-card { background: #ff6b6b; color: white; }
        .warning-card { background: #ffa500; color: white; }
        .success-card { background: #51cf66; color: white; }
        .info-card { background: #339af0; color: white; }

        .response-table {
            font-size: 0.9rem;
        }
        .badge-danger { background: #ff6b6b; }
        .badge-warning { background: #ffa500; }
        .badge-success { background: #51cf66; }

        .loading-spinner {
            text-align: center;
            padding: 50px;
        }
    </style>
</head>
<body>
    <div class="analysis-container">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h1><i class="bi bi-clipboard-data"></i> 002 근골격계 증상 분석 도구</h1>
            <button class="btn btn-primary" onclick="loadAnalysis()">
                <i class="bi bi-arrow-clockwise"></i> 새로고침
            </button>
        </div>

        <div class="alert alert-info">
            <i class="bi bi-info-circle"></i> 001 설문 응답을 NIOSH 기준으로 자동 분석합니다
        </div>

        <div id="loadingSpinner" class="loading-spinner">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">로딩 중...</span>
            </div>
            <p class="mt-3">001 설문 데이터를 불러오는 중...</p>
        </div>

        <div id="analysisResults" style="display:none;">
            <!-- 통계 카드 -->
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="stats-card danger-card">
                        <h2 id="painCount">0</h2>
                        <p>통증호소자</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stats-card warning-card">
                        <h2 id="managedCount">0</h2>
                        <p>관리대상자</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stats-card success-card">
                        <h2 id="normalCount">0</h2>
                        <p>정상</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stats-card info-card">
                        <h2 id="totalCount">0</h2>
                        <p>총 응답 수</p>
                    </div>
                </div>
            </div>

            <!-- 분석 결과 테이블 -->
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0"><i class="bi bi-table"></i> 상세 분석 결과</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover response-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>이름</th>
                                    <th>제출일</th>
                                    <th>증상부위</th>
                                    <th>NIOSH 판정</th>
                                    <th>상세보기</th>
                                </tr>
                            </thead>
                            <tbody id="analysisTableBody">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // NIOSH 판정 함수 (엑셀 002 기준)
        function assessNIOSH(responses) {
            const bodyParts = ['목', '어깨', '팔/팔꿈치', '손/손목/손가락', '허리', '다리/발'];
            const assessments = [];
            let maxSeverity = '정상';

            bodyParts.forEach(part => {
                const duration = responses[\`\${part}_duration\`];
                const severity = responses[\`\${part}_severity\`];

                if (!duration && !severity) return;

                let status = '정상';
                let score = 0;

                // 엑셀 002 기준 정확히 적용:
                // duration: under1week(1), 1week_1month(2), 1month_3month(3), over3month(4)
                // severity: mild(1), moderate(2), severe(3), very_severe(4)

                const durationWeek = duration === '1week_1month' || duration === '1month_3month' || duration === 'over3month';
                const isMild = severity === 'mild';
                const isModerate = severity === 'moderate';
                const isSevere = severity === 'severe' || severity === 'very_severe';

                // 통증호소자: 기간>=1주일(AND) + 강도>=심한통증
                if (durationWeek && isSevere) {
                    status = '통증호소자';
                    score = 3;
                }
                // 관리대상자: 기간>=1주일(OR) + 강도>=중간정도
                else if (durationWeek || isModerate || isSevere) {
                    if (isModerate || isSevere) {
                        status = '관리대상자';
                        score = 2;
                    }
                }
                else if (duration || severity) {
                    status = '정상';
                    score = 1;
                }

                if (score > 0) {
                    assessments.push({ part, status, score, duration, severity });

                    if (status === '통증호소자') maxSeverity = '통증호소자';
                    else if (status === '관리대상자' && maxSeverity !== '통증호소자') {
                        maxSeverity = '관리대상자';
                    }
                }
            });

            return {
                overall: maxSeverity,
                parts: assessments
            };
        }

        async function loadAnalysis() {
            document.getElementById('loadingSpinner').style.display = 'block';
            document.getElementById('analysisResults').style.display = 'none';

            try {
                // 001 설문 데이터 가져오기
                const response = await fetch('/api/survey/d1/responses/001_musculoskeletal_symptom_survey?limit=100');
                const data = await response.json();

                if (!data.success || !data.responses) {
                    throw new Error('데이터 로드 실패');
                }

                let painCount = 0;
                let managedCount = 0;
                let normalCount = 0;

                const tableBody = document.getElementById('analysisTableBody');
                tableBody.innerHTML = '';

                // 각 응답 분석
                for (const resp of data.responses) {
                    // 상세 데이터 가져오기
                    const detailResp = await fetch(\`/api/survey/d1/response/\${resp.id}\`);
                    const detailData = await detailResp.json();

                    if (!detailData.success) continue;

                    const survey = detailData.survey;
                    const assessment = assessNIOSH(survey.responses || {});

                    // 카운트
                    if (assessment.overall === '통증호소자') painCount++;
                    else if (assessment.overall === '관리대상자') managedCount++;
                    else normalCount++;

                    // 테이블 행 추가
                    const badgeClass = assessment.overall === '통증호소자' ? 'badge-danger' :
                                      assessment.overall === '관리대상자' ? 'badge-warning' : 'badge-success';

                    const partsText = assessment.parts.map(p => p.part).join(', ') || '없음';

                    const row = \`
                        <tr>
                            <td>\${survey.id}</td>
                            <td>\${survey.name || '익명'}</td>
                            <td>\${new Date(survey.submission_date).toLocaleDateString('ko-KR')}</td>
                            <td>\${partsText}</td>
                            <td><span class="badge \${badgeClass}">\${assessment.overall}</span></td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary" onclick="viewDetail(\${survey.id})">
                                    <i class="bi bi-eye"></i>
                                </button>
                            </td>
                        </tr>
                    \`;
                    tableBody.innerHTML += row;
                }

                // 통계 업데이트
                document.getElementById('painCount').textContent = painCount;
                document.getElementById('managedCount').textContent = managedCount;
                document.getElementById('normalCount').textContent = normalCount;
                document.getElementById('totalCount').textContent = data.responses.length;

                document.getElementById('loadingSpinner').style.display = 'none';
                document.getElementById('analysisResults').style.display = 'block';

            } catch (error) {
                console.error('분석 오류:', error);
                alert('데이터 분석 중 오류가 발생했습니다: ' + error.message);
            }
        }

        function viewDetail(surveyId) {
            window.open(\`/api/survey/d1/response/\${surveyId}\`, '_blank');
        }

        // 페이지 로드 시 자동 분석
        document.addEventListener('DOMContentLoaded', loadAnalysis);
    </script>
</body>
</html>
`;
