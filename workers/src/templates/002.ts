export const form002Template = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>근골격계 증상 분석 결과 (002) - SafeWork</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        body { background-color: #f8f9fa; font-family: 'Malgun Gothic', sans-serif; }
        .analysis-container { max-width: 1000px; margin: 0 auto; padding: 20px; }
        .analysis-header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; text-align: center; }
        .analysis-section { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .section-title { color: #495057; font-weight: bold; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e9ecef; }
        .risk-badge { padding: 8px 15px; border-radius: 20px; font-weight: bold; color: white; }
        .risk-low { background-color: #10b981; }
        .risk-medium { background-color: #f59e0b; }
        .risk-high { background-color: #ef4444; }
        .risk-critical { background-color: #dc2626; }
        .program-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 15px; }
        .program-urgent { border-color: #ef4444; background-color: #fef2f2; }
        .program-recommended { border-color: #f59e0b; background-color: #fffbeb; }
        .program-preventive { border-color: #10b981; background-color: #f0fdf4; }
        .progress-bar { height: 25px; border-radius: 12px; }
    </style>
</head>
<body>
    <div class="analysis-container">
        <div class="analysis-header">
            <h1><i class="bi bi-graph-up"></i> 근골격계 증상 분석 결과</h1>
            <p class="mb-0">Musculoskeletal Symptom Analysis Results (002)</p>
        </div>

        <!-- Personal Info Summary -->
        <div class="analysis-section">
            <h3 class="section-title"><i class="bi bi-person-badge"></i> 조사 대상자 정보</h3>
            <div class="row" id="personalInfo">
                <div class="col-md-3">
                    <strong>성명:</strong> <span id="userName">-</span>
                </div>
                <div class="col-md-3">
                    <strong>부서:</strong> <span id="userDept">-</span>
                </div>
                <div class="col-md-3">
                    <strong>경력:</strong> <span id="userExp">-</span>년
                </div>
                <div class="col-md-3">
                    <strong>분석일시:</strong> <span id="analysisDate"></span>
                </div>
            </div>
        </div>

        <!-- Overall Risk Assessment -->
        <div class="analysis-section">
            <h3 class="section-title"><i class="bi bi-exclamation-triangle"></i> 종합 위험도 평가</h3>
            <div class="row text-center">
                <div class="col-md-12 mb-4">
                    <div class="card bg-light">
                        <div class="card-body">
                            <h2 id="overallRisk" class="risk-badge risk-medium">중위험</h2>
                            <p class="mt-3 mb-0" id="riskDescription">일부 신체 부위에서 위험 요인이 발견되었습니다. 예방 조치가 필요합니다.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <h5>위험 점수 분포</h5>
                    <div class="mb-2">목/어깨: <div class="progress"><div id="neckProgress" class="progress-bar bg-warning" style="width: 60%">60점</div></div></div>
                    <div class="mb-2">팔/팔꿈치: <div class="progress"><div id="armProgress" class="progress-bar bg-success" style="width: 20%">20점</div></div></div>
                    <div class="mb-2">손목/손: <div class="progress"><div id="wristProgress" class="progress-bar bg-success" style="width: 30%">30점</div></div></div>
                    <div class="mb-2">허리: <div class="progress"><div id="backProgress" class="progress-bar bg-danger" style="width: 80%">80점</div></div></div>
                    <div class="mb-2">다리/무릎: <div class="progress"><div id="legProgress" class="progress-bar bg-warning" style="width: 40%">40점</div></div></div>
                </div>
                <div class="col-md-6">
                    <h5>위험 요인 분석</h5>
                    <ul id="riskFactors">
                        <li>장시간 동일 자세 유지</li>
                        <li>반복적인 동작 수행</li>
                        <li>부적절한 작업 환경</li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- Customized Improvement Programs -->
        <div class="analysis-section">
            <h3 class="section-title"><i class="bi bi-heart-pulse"></i> 맞춤형 개선 프로그램</h3>

            <div id="urgentPrograms">
                <h5 class="text-danger">즉시 실행 필요</h5>
                <div class="program-card program-urgent">
                    <h6><i class="bi bi-exclamation-circle text-danger"></i> 허리 부위 집중 관리</h6>
                    <p>허리 통증 지수가 높게 측정되었습니다. 즉시 작업 자세 개선이 필요합니다.</p>
                    <ul>
                        <li>작업대 높이 조절 (권장: 팔꿈치 90도 각도)</li>
                        <li>1시간마다 5분씩 스트레칭</li>
                        <li>허리 지지대 착용 검토</li>
                        <li>무거운 물건 들기 시 올바른 자세 교육</li>
                    </ul>
                </div>
            </div>

            <div id="recommendedPrograms">
                <h5 class="text-warning">권장 프로그램</h5>
                <div class="program-card program-recommended">
                    <h6><i class="bi bi-clock text-warning"></i> 목/어깨 예방 프로그램</h6>
                    <p>목과 어깨 부위의 피로도가 증가하고 있습니다. 예방적 조치를 권장합니다.</p>
                    <ul>
                        <li>목과 어깨 스트레칭 (하루 3회, 10분씩)</li>
                        <li>모니터 높이 조절 (시선과 수평)</li>
                        <li>키보드, 마우스 위치 최적화</li>
                    </ul>
                </div>
            </div>

            <div id="preventivePrograms">
                <h5 class="text-success">예방 프로그램</h5>
                <div class="program-card program-preventive">
                    <h6><i class="bi bi-shield-check text-success"></i> 전신 건강 관리 프로그램</h6>
                    <p>현재 상태를 유지하고 향후 위험을 예방하기 위한 종합 관리 프로그램입니다.</p>
                    <ul>
                        <li>주 3회 이상 근력 강화 운동</li>
                        <li>유산소 운동 (주 150분 이상)</li>
                        <li>작업 전후 워밍업/쿨다운</li>
                        <li>정기적인 건강검진 (6개월마다)</li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- Medical Consultation Recommendation -->
        <div class="analysis-section" id="medicalConsultation" style="display: none;">
            <h3 class="section-title text-danger"><i class="bi bi-hospital"></i> 의료진 상담 권고</h3>
            <div class="alert alert-danger">
                <h5>즉시 전문의 상담을 받으시기 바랍니다</h5>
                <p>현재 증상의 정도가 심각한 수준입니다. 다음과 같은 전문의 상담을 권장합니다:</p>
                <ul id="medicalRecommendations">
                    <li>정형외과 - 허리, 목, 어깨 관련 증상</li>
                    <li>신경외과 - 신경 압박 증상</li>
                    <li>재활의학과 - 물리치료 및 재활 프로그램</li>
                </ul>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="text-center">
            <button onclick="printResults()" class="btn btn-primary me-3">
                <i class="bi bi-printer"></i> 결과 인쇄
            </button>
            <button onclick="downloadPDF()" class="btn btn-secondary me-3">
                <i class="bi bi-file-earmark-pdf"></i> PDF 다운로드
            </button>
            <a href="/survey/001_musculoskeletal_symptom_survey" class="btn btn-outline-primary">
                <i class="bi bi-arrow-clockwise"></i> 재조사 실시
            </a>
        </div>
    </div>

    <script>
        console.log('002 Analysis Page Loaded - ENG LOG');

        // Extract 001 survey data from URL
        function getAnalysisData() {
            const urlParams = new URLSearchParams(window.location.search);
            const dataParam = urlParams.get('data');

            if (dataParam) {
                try {
                    const parsedData = JSON.parse(decodeURIComponent(dataParam));
                    console.log('Parsed 001 survey data:', parsedData);
                    return parsedData;
                } catch (e) {
                    console.error('Failed to parse survey data:', e);
                }
            }

            // Default demo data
            console.log('Using demo data - no 001 survey data found');
            return {
                name: '홍길동',
                department: '생산팀',
                work_experience: '5',
                age: '35',
                gender: 'male',
                neck_shoulder_pain: 'moderate',
                neck_shoulder_intensity: '6',
                arm_elbow_pain: 'mild',
                arm_elbow_intensity: '2',
                wrist_hand_pain: 'mild',
                wrist_hand_intensity: '3',
                back_pain: 'severe',
                back_intensity: '8',
                leg_knee_pain: 'moderate',
                leg_knee_intensity: '4',
                medical_consultation: 'needed'
            };
        }

        // Calculate risk score
        function calculateRiskScore(painLevel, intensity) {
            const painScores = { none: 0, mild: 25, moderate: 50, severe: 75 };
            const intensityScore = parseInt(intensity) * 10;
            const score = Math.min(100, (painScores[painLevel] || 0) + intensityScore);
            console.log('Risk calculation:', { painLevel, intensity, score });
            return score;
        }

        // Assess overall risk
        function assessOverallRisk(scores) {
            const maxScore = Math.max(...Object.values(scores));
            const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;

            console.log('Overall risk assessment:', { maxScore, avgScore, scores });

            if (maxScore >= 80 || avgScore >= 60) return { level: 'critical', label: '고위험', class: 'risk-critical' };
            if (maxScore >= 60 || avgScore >= 40) return { level: 'high', label: '중위험', class: 'risk-high' };
            if (maxScore >= 40 || avgScore >= 25) return { level: 'medium', label: '저위험', class: 'risk-medium' };
            return { level: 'low', label: '정상', class: 'risk-low' };
        }

        // Render analysis results
        function renderAnalysis() {
            console.log('Starting analysis rendering');
            const data = getAnalysisData();

            // Display personal info
            document.getElementById('userName').textContent = data.name || '미입력';
            document.getElementById('userDept').textContent = data.department || '미입력';
            document.getElementById('userExp').textContent = data.work_experience || '0';
            document.getElementById('analysisDate').textContent = new Date().toLocaleDateString('ko-KR');

            // Calculate risk scores
            const scores = {
                neck: calculateRiskScore(data.neck_shoulder_pain, data.neck_shoulder_intensity),
                arm: calculateRiskScore(data.arm_elbow_pain, data.arm_elbow_intensity),
                wrist: calculateRiskScore(data.wrist_hand_pain, data.wrist_hand_intensity),
                back: calculateRiskScore(data.back_pain, data.back_intensity),
                leg: calculateRiskScore(data.leg_knee_pain, data.leg_knee_intensity)
            };

            // Update progress bars
            const progressBars = [
                { id: 'neckProgress', score: scores.neck },
                { id: 'armProgress', score: scores.arm },
                { id: 'wristProgress', score: scores.wrist },
                { id: 'backProgress', score: scores.back },
                { id: 'legProgress', score: scores.leg }
            ];

            progressBars.forEach(bar => {
                const element = document.getElementById(bar.id);
                element.style.width = bar.score + '%';
                element.textContent = bar.score + '점';

                // Update color based on score
                element.className = 'progress-bar';
                if (bar.score >= 70) element.classList.add('bg-danger');
                else if (bar.score >= 40) element.classList.add('bg-warning');
                else element.classList.add('bg-success');
            });

            // Overall risk assessment
            const overallRisk = assessOverallRisk(scores);
            const riskElement = document.getElementById('overallRisk');
            riskElement.textContent = overallRisk.label;
            riskElement.className = 'risk-badge ' + overallRisk.class;

            // Show medical consultation if needed
            if (data.medical_consultation === 'needed' || data.medical_consultation === 'urgent' || overallRisk.level === 'critical') {
                document.getElementById('medicalConsultation').style.display = 'block';
                console.log('Medical consultation recommended');
            }

            console.log('Analysis rendering completed');
        }

        // Print results
        function printResults() {
            console.log('Print results requested');
            window.print();
        }

        // Download PDF (using browser print function)
        function downloadPDF() {
            console.log('PDF download requested');
            alert('PDF 다운로드 기능은 브라우저의 인쇄 기능을 이용해 주세요.\\n인쇄 → 대상을 PDF로 저장');
            window.print();
        }

        // Execute analysis on page load
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Page loaded, executing analysis');
            renderAnalysis();
        });
    </script>
</body>
</html>`;