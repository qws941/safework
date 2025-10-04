/**
 * 002 근골격계질환 증상조사 웹 프로그램
 * Excel 기반 분석 프로그램의 웹 버전
 * KOSHA GUIDE 기반 + NIOSH Symptom Survey 적용
 */

export const form002WebProgram = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>002 근골격계질환 증상조사 프로그램 - SafeWork</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px 0;
        }
        .program-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 30px;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .nav-tabs .nav-link.active {
            background: #667eea;
            color: white;
        }
        .body-part-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
        }
        @media (max-width: 1200px) {
            .body-part-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        @media (max-width: 768px) {
            .body-part-grid {
                grid-template-columns: 1fr;
            }
        }
        .btn-primary {
            background: #667eea;
            border: none;
        }
        .btn-primary:hover {
            background: #5568d3;
        }
        .result-badge {
            font-size: 0.9rem;
            padding: 8px 15px;
        }
        .pain-complainant { background: #ff6b6b; color: white; }
        .managed { background: #ffa500; color: white; }
        .normal { background: #51cf66; color: white; }
        .form-label {
            font-weight: 600;
            margin-bottom: 0.3rem;
        }
        .small-label {
            font-size: 0.85rem;
            font-weight: 500;
        }
        /* 실시간 피드백 */
        .realtime-status {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            background: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            min-width: 250px;
        }
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .status-danger { background: #ff6b6b; }
        .status-warning { background: #ffa500; }
        .status-success { background: #51cf66; }
        .status-muted { background: #dee2e6; }
        /* 진행률 표시 */
        .progress-tracker {
            position: sticky;
            top: 0;
            background: white;
            z-index: 999;
            padding: 10px 0;
            border-bottom: 2px solid #667eea;
        }
        .progress-bar-custom {
            height: 8px;
            background: linear-gradient(to right, #667eea, #764ba2);
            border-radius: 10px;
            transition: width 0.3s ease;
        }
        /* 입력 필드 상태 */
        .input-danger { border-color: #ff6b6b; background-color: #fff5f5; }
        .input-warning { border-color: #ffa500; background-color: #fff9f0; }
        .input-success { border-color: #51cf66; background-color: #f0fff4; }
        /* 카드 호버 효과 */
        .body-part-card {
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }
        .body-part-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        .body-part-card.has-pain {
            border-color: #ff6b6b;
            background-color: #fff5f5;
        }
        .body-part-card.needs-management {
            border-color: #ffa500;
            background-color: #fff9f0;
        }
        /* 애니메이션 */
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .card {
            animation: slideIn 0.5s ease;
        }
    </style>
</head>
<body>
    <!-- 실시간 상태 표시 -->
    <div class="realtime-status" id="realtimeStatus" style="display: none;">
        <div class="d-flex align-items-center mb-2">
            <span class="status-indicator status-muted" id="statusIndicator"></span>
            <strong id="statusText">입력 대기 중</strong>
        </div>
        <div class="small text-muted">
            <div id="painCount">통증호소자: 0</div>
            <div id="managedCount">관리대상자: 0</div>
        </div>
    </div>

    <div class="program-container">
        <!-- 진행률 표시 -->
        <div class="progress-tracker">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <small class="text-muted">입력 진행률</small>
                <small class="text-muted"><span id="progressPercent">0</span>%</small>
            </div>
            <div class="progress" style="height: 8px;">
                <div class="progress-bar-custom" id="progressBar" style="width: 0%"></div>
            </div>
        </div>

        <div class="text-center mb-4 mt-4">
            <h1 class="display-5"><i class="bi bi-clipboard-pulse"></i> 002 근골격계질환 증상조사 프로그램</h1>
            <p class="lead text-muted">KOSHA GUIDE 기반 웹 분석 프로그램 (NIOSH Symptom Survey 적용)</p>
        </div>

        <ul class="nav nav-tabs mb-4" role="tablist">
            <li class="nav-item">
                <a class="nav-link active" data-bs-toggle="tab" href="#data-input">
                    <i class="bi bi-input-cursor"></i> 데이터 입력
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" data-bs-toggle="tab" href="#result-view">
                    <i class="bi bi-bar-chart"></i> 결과 분석
                </a>
            </li>
        </ul>

        <!-- 실시간 상태 표시 -->
        <div id="realtimeStatus" class="realtime-status" style="display:none;">
            <h6 class="mb-2"><i class="bi bi-activity"></i> 실시간 평가</h6>
            <div id="statusContent">
                <small class="text-muted">데이터 입력 시 자동 업데이트</small>
            </div>
        </div>

        <!-- 진행률 표시 -->
        <div class="progress-tracker">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <small class="text-muted">입력 진행률</small>
                <small id="progressText" class="text-muted">0%</small>
            </div>
            <div class="progress" style="height: 8px;">
                <div id="progressBar" class="progress-bar-custom" role="progressbar" style="width: 0%"></div>
            </div>
        </div>

        <div class="tab-content">
            <!-- 데이터 입력 탭 -->
            <div id="data-input" class="tab-pane fade show active">
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i>
                    <strong>최대 600명</strong>까지 데이터 입력 가능합니다.
                    성명/작업부서/작업내용을 제외한 모든 데이터는 <strong>숫자</strong>로 입력하세요.
                </div>

                <form id="symptomForm">
                    <!-- 기본 정보 -->
                    <div class="card mb-4">
                        <div class="card-header bg-primary text-white">
                            <h5 class="mb-0"><i class="bi bi-person-badge"></i> 기본 정보</h5>
                        </div>
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label">성명 *</label>
                                    <input type="text" class="form-control" id="name" required>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">연령 *</label>
                                    <input type="number" class="form-control" id="age" required>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">성별 *</label>
                                    <select class="form-select" id="gender" required>
                                        <option value="">선택</option>
                                        <option value="1">남</option>
                                        <option value="2">여</option>
                                    </select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">현 직장 경력(년) *</label>
                                    <input type="number" step="0.1" class="form-control" id="work_experience" required>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">부서 *</label>
                                    <input type="text" class="form-control" id="department" placeholder="예: 관리" required>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 작업부서 -->
                    <div class="card mb-4">
                        <div class="card-header bg-secondary text-white">
                            <h5 class="mb-0"><i class="bi bi-building"></i> 작업부서 분류</h5>
                        </div>
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label">라인</label>
                                    <input type="text" class="form-control" id="line_name" placeholder="예: 지원1">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">작업 내용</label>
                                    <input type="text" class="form-control" id="task_desc" placeholder="예: 문서작업">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 통증부위 평가 -->
                    <div class="card mb-4">
                        <div class="card-header bg-danger text-white">
                            <h5 class="mb-0"><i class="bi bi-activity"></i> 통증부위 평가 (6개 신체부위)</h5>
                        </div>
                        <div class="card-body">
                            <div class="body-part-grid">
                                ${['목', '어깨', '팔/팔꿈치', '손/손목/손가락', '허리', '다리/발'].map((part, idx) => `
                                <div class="card body-part-card" id="card_${idx}">
                                    <div class="card-header bg-light">
                                        <strong>${part}</strong>
                                        <span class="badge float-end" id="badge_${idx}" style="display:none;">정상</span>
                                    </div>
                                    <div class="card-body p-3">
                                        <div class="row g-2">
                                            <div class="col-12">
                                                <label class="form-label small-label">1. 통증부위</label>
                                                <select class="form-select form-select-sm" id="part_${idx}_location">
                                                    <option value="">없음</option>
                                                    <option value="1">좌</option>
                                                    <option value="2">우</option>
                                                    <option value="3">양쪽</option>
                                                </select>
                                            </div>
                                            <div class="col-12">
                                                <label class="form-label small-label">2. 통증기간</label>
                                                <select class="form-select form-select-sm" id="part_${idx}_duration">
                                                    <option value="">없음</option>
                                                    <option value="1">1주일 미만</option>
                                                    <option value="2">1주일-1달</option>
                                                    <option value="3">1-3달</option>
                                                    <option value="4">3달 이상</option>
                                                </select>
                                            </div>
                                            <div class="col-12">
                                                <label class="form-label small-label">3. 통증강도</label>
                                                <select class="form-select form-select-sm" id="part_${idx}_intensity">
                                                    <option value="">없음</option>
                                                    <option value="1">약함</option>
                                                    <option value="2">중간</option>
                                                    <option value="3">심함</option>
                                                    <option value="4">매우심함</option>
                                                </select>
                                            </div>
                                            <div class="col-12">
                                                <label class="form-label small-label">4. 통증빈도</label>
                                                <select class="form-select form-select-sm" id="part_${idx}_frequency">
                                                    <option value="">없음</option>
                                                    <option value="1">1달 1회</option>
                                                    <option value="2">1달 2-3회</option>
                                                    <option value="3">주 1회</option>
                                                    <option value="4">주 2-6회</option>
                                                    <option value="5">매일</option>
                                                </select>
                                            </div>
                                            <div class="col-12">
                                                <label class="form-label small-label">5. 작업시간</label>
                                                <select class="form-select form-select-sm" id="part_${idx}_worktime">
                                                    <option value="">없음</option>
                                                    <option value="1">근무 전</option>
                                                    <option value="2">근무 중</option>
                                                    <option value="3">근무 후</option>
                                                    <option value="4">항상</option>
                                                </select>
                                            </div>
                                            <div class="col-12">
                                                <label class="form-label small-label">6. 휴식시간(분)</label>
                                                <input type="number" class="form-control form-control-sm" id="part_${idx}_resttime" placeholder="분">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- 육체적 부담 정도 -->
                    <div class="card mb-4">
                        <div class="card-header bg-warning">
                            <h5 class="mb-0"><i class="bi bi-lightning-charge"></i> 육체적 부담 정도 (1-5점)</h5>
                        </div>
                        <div class="card-body">
                            <div class="row g-3">
                                <div class="col-md-3">
                                    <label class="form-label">1. 여가 및 취미활동</label>
                                    <input type="number" class="form-control" id="physical_burden_1" min="1" max="5" placeholder="1-5">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">2. 가사일</label>
                                    <input type="number" class="form-control" id="physical_burden_2" min="1" max="5" placeholder="1-5">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">3. 운동</label>
                                    <input type="number" class="form-control" id="physical_burden_3" min="1" max="5" placeholder="1-5">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">4. 작업자세</label>
                                    <input type="number" class="form-control" id="physical_burden_4" min="1" max="5" placeholder="1-5">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="text-center">
                        <button type="submit" class="btn btn-primary btn-lg px-5">
                            <i class="bi bi-check-circle"></i> 데이터 저장 및 분석
                        </button>
                    </div>
                </form>
            </div>

            <!-- 결과 분석 탭 -->
            <div id="result-view" class="tab-pane fade">
                <div id="results" class="text-center py-5">
                    <i class="bi bi-bar-chart display-1 text-muted"></i>
                    <p class="lead text-muted mt-3">데이터를 입력하고 분석하면 결과가 표시됩니다</p>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
    // NIOSH 판정 함수
    function assessPainStatus(duration, frequency, intensity) {
        if (duration >= 2 && frequency >= 1 && intensity >= 3) {
            return { status: '통증호소자', level: 'danger', score: 3 };
        } else if ((duration >= 2 || frequency >= 1) && intensity >= 2) {
            return { status: '관리대상자', level: 'warning', score: 2 };
        } else if (duration > 0 || frequency > 0 || intensity > 0) {
            return { status: '정상', level: 'success', score: 1 };
        }
        return { status: '미입력', level: 'secondary', score: 0 };
    }

    // 진행률 업데이트
    function updateProgress() {
        const requiredFields = ['name', 'age', 'gender', 'work_experience', 'department'];
        let filled = 0;
        let total = requiredFields.length + 36; // 5 + 6부위x6항목

        requiredFields.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.value) filled++;
        });

        for (let i = 0; i < 6; i++) {
            ['location', 'duration', 'intensity', 'frequency', 'worktime', 'resttime'].forEach(field => {
                const el = document.getElementById(\`part_\${i}_\${field}\`);
                if (el && el.value) filled++;
            });
        }

        const percentage = Math.round((filled / total) * 100);
        const bar = document.getElementById('progressBar');
        const text = document.getElementById('progressText');
        if (bar) bar.style.width = percentage + '%';
        if (text) text.textContent = percentage + '%';
    }

    // 실시간 상태 업데이트
    function updateRealtimeStatus() {
        const bodyParts = ['목', '어깨', '팔/팔꿈치', '손/손목/손가락', '허리', '다리/발'];
        let painCount = 0;
        let managedCount = 0;
        let normalCount = 0;

        bodyParts.forEach((part, idx) => {
            const duration = parseInt(document.getElementById(\`part_\${idx}_duration\`)?.value) || 0;
            const frequency = parseInt(document.getElementById(\`part_\${idx}_frequency\`)?.value) || 0;
            const intensity = parseInt(document.getElementById(\`part_\${idx}_intensity\`)?.value) || 0;

            let status = '정상';
            let badgeClass = 'bg-success';
            let cardClass = '';

            if (duration >= 2 && frequency >= 1 && intensity >= 3) {
                status = '통증호소자';
                badgeClass = 'bg-danger pain-complainant';
                cardClass = 'has-pain';
                painCount++;
            } else if ((duration >= 2 || frequency >= 1) && intensity >= 2) {
                status = '관리대상자';
                badgeClass = 'bg-warning managed';
                cardClass = 'needs-management';
                managedCount++;
            }

            const badge = document.getElementById(\`badge_\${idx}\`);
            const card = document.getElementById(\`card_\${idx}\`);

            if (badge && (duration > 0 || frequency > 0 || intensity > 0)) {
                badge.style.display = 'inline-block';
                badge.textContent = status;
                badge.className = 'badge float-end ' + badgeClass;
            } else if (badge) {
                badge.style.display = 'none';
            }

            if (card) {
                card.className = 'card body-part-card ' + cardClass;
            }
        });

        // 상태 표시 업데이트
        const realtimeStatus = document.getElementById('realtimeStatus');
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');

        if (painCount > 0) {
            realtimeStatus.style.display = 'block';
            statusIndicator.className = 'status-indicator status-danger';
            statusText.textContent = '통증호소자 발견';
        } else if (managedCount > 0) {
            realtimeStatus.style.display = 'block';
            statusIndicator.className = 'status-indicator status-warning';
            statusText.textContent = '관리대상자 있음';
        } else if (painCount === 0 && managedCount === 0) {
            const hasInput = bodyParts.some((_, idx) => {
                const duration = parseInt(document.getElementById(\`part_\${idx}_duration\`)?.value) || 0;
                return duration > 0;
            });
            if (hasInput) {
                realtimeStatus.style.display = 'block';
                statusIndicator.className = 'status-indicator status-success';
                statusText.textContent = '정상 범위';
            }
        }

        document.getElementById('painCount').textContent = \`통증호소자: \${painCount}\`;
        document.getElementById('managedCount').textContent = \`관리대상자: \${managedCount}\`;
    }

    // 진행률 업데이트
    function updateProgress() {
        const totalFields = 5 + 36; // 기본정보 5개 + 통증부위 36개 (6부위 x 6문항)
        let filledFields = 0;

        // 기본 정보
        if (document.getElementById('name')?.value) filledFields++;
        if (document.getElementById('age')?.value) filledFields++;
        if (document.getElementById('gender')?.value) filledFields++;
        if (document.getElementById('work_experience')?.value) filledFields++;
        if (document.getElementById('department')?.value) filledFields++;

        // 통증부위
        for (let i = 0; i < 6; i++) {
            if (document.getElementById(\`part_\${i}_location\`)?.value) filledFields++;
            if (document.getElementById(\`part_\${i}_duration\`)?.value) filledFields++;
            if (document.getElementById(\`part_\${i}_intensity\`)?.value) filledFields++;
            if (document.getElementById(\`part_\${i}_frequency\`)?.value) filledFields++;
            if (document.getElementById(\`part_\${i}_worktime\`)?.value) filledFields++;
            if (document.getElementById(\`part_\${i}_resttime\`)?.value) filledFields++;
        }

        const progress = Math.round((filledFields / totalFields) * 100);
        document.getElementById('progressBar').style.width = progress + '%';
        document.getElementById('progressPercent').textContent = progress;
    }

    // 이벤트 리스너 등록
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('symptomForm');
        if (form) {
            form.addEventListener('input', () => {
                updateRealtimeStatus();
                updateProgress();
            });
            form.addEventListener('change', () => {
                updateRealtimeStatus();
                updateProgress();
            });
        }
    });

    document.getElementById('symptomForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        // NIOSH Symptom Survey 기준 자동 판정
        const bodyParts = ['목', '어깨', '팔/팔꿈치', '손/손목/손가락', '허리', '다리/발'];
        const results = [];

        bodyParts.forEach((part, idx) => {
            const duration = parseInt(document.getElementById(\`part_\${idx}_duration\`).value) || 0;
            const frequency = parseInt(document.getElementById(\`part_\${idx}_frequency\`).value) || 0;
            const intensity = parseInt(document.getElementById(\`part_\${idx}_intensity\`).value) || 0;

            let status = '정상';
            let score = 0;

            // 통증호소자: 통증기간 1주일 이상(2) AND 빈도 1달 1회 이상(1) AND 강도 심함 이상(3)
            if (duration >= 2 && frequency >= 1 && intensity >= 3) {
                status = '통증호소자';
                score = 3;
            }
            // 관리대상자: (통증기간 1주일 이상(2) OR 빈도 1달 1회 이상(1)) AND 강도 중간 이상(2)
            else if ((duration >= 2 || frequency >= 1) && intensity >= 2) {
                status = '관리대상자';
                score = 2;
            }
            // 정상
            else {
                status = '정상';
                score = 1;
            }

            results.push({ part, status, score, duration, frequency, intensity });
        });

        // 데이터 수집
        const formData = {
            form_type: '002_musculoskeletal_symptom_program',
            name: document.getElementById('name').value,
            age: parseInt(document.getElementById('age').value),
            gender: parseInt(document.getElementById('gender').value),
            work_experience: parseFloat(document.getElementById('work_experience').value),
            department: document.getElementById('department').value,
            responses: {
                line_name: document.getElementById('line_name').value,
                task_desc: document.getElementById('task_desc').value,
                body_parts_assessment: results,
                pain_data: bodyParts.map((_, idx) => ({
                    part: bodyParts[idx],
                    location: document.getElementById(\`part_\${idx}_location\`).value,
                    duration: document.getElementById(\`part_\${idx}_duration\`).value,
                    intensity: document.getElementById(\`part_\${idx}_intensity\`).value,
                    frequency: document.getElementById(\`part_\${idx}_frequency\`).value,
                    worktime: document.getElementById(\`part_\${idx}_worktime\`).value,
                    resttime: document.getElementById(\`part_\${idx}_resttime\`).value
                })),
                physical_burden: [1,2,3,4].map(i => document.getElementById(\`physical_burden_\${i}\`).value),
                niosh_results: results
            }
        };

        // API 전송
        try {
            const response = await fetch('/api/survey/d1/002/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                // 결과 탭으로 이동
                const resultsTab = new bootstrap.Tab(document.querySelector('a[href="#result-view"]'));
                resultsTab.show();

                // 통증호소자/관리대상자 개수 계산
                const painComplainants = results.filter(r => r.status === '통증호소자').length;
                const managed = results.filter(r => r.status === '관리대상자').length;
                const normal = results.filter(r => r.status === '정상').length;

                // 결과 표시
                document.getElementById('results').innerHTML = \`
                    <h3 class="mb-4"><i class="bi bi-clipboard-data"></i> NIOSH Symptom Survey 판정 결과</h3>

                    <div class="row mb-4">
                        <div class="col-md-4">
                            <div class="card bg-danger text-white">
                                <div class="card-body">
                                    <h2>\${painComplainants}</h2>
                                    <p class="mb-0">통증호소자</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card bg-warning text-dark">
                                <div class="card-body">
                                    <h2>\${managed}</h2>
                                    <p class="mb-0">관리대상자</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card bg-success text-white">
                                <div class="card-body">
                                    <h2>\${normal}</h2>
                                    <p class="mb-0">정상</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h4 class="mb-3">신체부위별 평가 결과</h4>
                    <div class="row">
                        \${results.map(r => \`
                            <div class="col-md-4 mb-3">
                                <div class="card">
                                    <div class="card-body">
                                        <h5>\${r.part}</h5>
                                        <span class="badge result-badge \${r.status === '통증호소자' ? 'pain-complainant' : r.status === '관리대상자' ? 'managed' : 'normal'}">
                                            \${r.status}
                                        </span>
                                        <div class="mt-2 small text-muted">
                                            <div>기간: \${r.duration === 1 ? '1주일미만' : r.duration === 2 ? '1주-1달' : r.duration === 3 ? '1-3달' : r.duration === 4 ? '3달이상' : '없음'}</div>
                                            <div>빈도: \${r.frequency === 1 ? '1달1회' : r.frequency === 2 ? '1달2-3회' : r.frequency === 3 ? '주1회' : r.frequency === 4 ? '주2-6회' : r.frequency === 5 ? '매일' : '없음'}</div>
                                            <div>강도: \${r.intensity === 1 ? '약함' : r.intensity === 2 ? '중간' : r.intensity === 3 ? '심함' : r.intensity === 4 ? '매우심함' : '없음'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        \`).join('')}
                    </div>

                    <div class="alert alert-success mt-4">
                        <i class="bi bi-check-circle"></i> 데이터가 성공적으로 저장되었습니다! (Survey ID: \${data.survey_id})
                    </div>

                    <div class="text-center mt-4">
                        <button class="btn btn-outline-primary" onclick="location.reload()">
                            <i class="bi bi-arrow-clockwise"></i> 새로운 데이터 입력
                        </button>
                        <a href="/admin" class="btn btn-outline-secondary">
                            <i class="bi bi-clipboard-data"></i> 관리자 대시보드
                        </a>
                    </div>
                \`;
            } else {
                alert('데이터 저장 실패: ' + (data.error || '알 수 없는 오류'));
            }
        } catch (error) {
            console.error('Submit error:', error);
            alert('데이터 전송 중 오류가 발생했습니다: ' + error.message);
        }
    });
    </script>
</body>
</html>`;
