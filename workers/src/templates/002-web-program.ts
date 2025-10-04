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
    </style>
</head>
<body>
    <div class="program-container">
        <div class="text-center mb-4">
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
                                <div class="card">
                                    <div class="card-header bg-light">
                                        <strong>${part}</strong>
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
