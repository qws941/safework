export function getSurvey001Html(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>근골격계질환 증상조사표 - SafeWork</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        :root {
            --sw-primary: #4f46e5;
            --sw-primary-light: #6366f1;
            --sw-primary-dark: #4338ca;
            --sw-secondary: #64748b;
            --sw-success: #10b981;
            --sw-danger: #ef4444;
        }
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px 0;
        }
        .survey-container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            overflow: hidden;
        }
        .survey-header {
            background: linear-gradient(135deg, var(--sw-primary) 0%, var(--sw-primary-dark) 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .section-card {
            padding: 25px;
            margin: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            border: 1px solid #e9ecef;
        }
        .section-title {
            color: var(--sw-primary);
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e9ecef;
        }
        .form-label {
            font-weight: 600;
            color: #495057;
            margin-bottom: 8px;
        }
        .form-control, .form-select {
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 10px;
        }
        .form-control:focus, .form-select:focus {
            border-color: var(--sw-primary);
            box-shadow: 0 0 0 0.2rem rgba(79, 70, 229, 0.15);
        }
        .checkbox-group, .radio-group {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-top: 10px;
        }
        .checkbox-group label, .radio-group label {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 15px;
            background: white;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .checkbox-group label:hover, .radio-group label:hover {
            border-color: var(--sw-primary-light);
            background: #f8f9ff;
        }
        .checkbox-group input:checked + label,
        .radio-group input:checked + label {
            border-color: var(--sw-primary);
            background: #f0f0ff;
            font-weight: 600;
        }
        .symptom-card {
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 15px;
        }
        .symptom-title {
            color: #1e40af;
            font-weight: 600;
            margin-bottom: 15px;
            font-size: 1.1rem;
        }
        .submit-btn {
            background: linear-gradient(135deg, var(--sw-primary) 0%, var(--sw-primary-dark) 100%);
            color: white;
            border: none;
            padding: 15px 50px;
            border-radius: 10px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .submit-btn:hover {
            transform: translateY(-2px);
        }
        .submit-section {
            text-align: center;
            padding: 30px;
        }
        .option-btn {
            padding: 8px 12px;
            border: 2px solid #dee2e6;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 0.9rem;
        }
        .option-btn:hover {
            border-color: var(--sw-primary-light);
            background: #f8f9ff;
        }
        .option-btn.selected {
            background: var(--sw-primary);
            color: white;
            border-color: var(--sw-primary);
        }
        .answer-options {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .question-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f0f0f0;
        }
        .question-text {
            flex: 1;
            font-size: 0.95rem;
            color: #495057;
        }
    </style>
</head>
<body>
    <div class="survey-container">
        <div class="survey-header">
            <h1><i class="bi bi-clipboard-pulse"></i> 근골격계질환 증상조사표</h1>
            <p>이 조사표는 근로자의 근골격계질환 증상을 조기 발견하여 예방하기 위한 것입니다.</p>
        </div>

        <form id="surveyForm">
            <!-- 1. 개인정보 -->
            <div class="section-card">
                <h3 class="section-title">1. 개인정보</h3>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label">성명 *</label>
                        <input type="text" name="name" class="form-control" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">나이 *</label>
                        <input type="number" name="age" class="form-control" min="18" max="100" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">성별 *</label>
                        <div class="radio-group">
                            <label><input type="radio" name="gender" value="남" required> 남</label>
                            <label><input type="radio" name="gender" value="여" required> 여</label>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">결혼상태</label>
                        <select name="marriage_status" class="form-select">
                            <option value="">선택하세요</option>
                            <option value="미혼">미혼</option>
                            <option value="기혼">기혼</option>
                            <option value="기타">기타</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- 2. 작업정보 -->
            <div class="section-card">
                <h3 class="section-title">2. 작업정보</h3>
                <div class="row g-3">
                    <div class="col-md-4">
                        <label class="form-label">업체명</label>
                        <input type="text" name="company" class="form-control">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">공정명</label>
                        <input type="text" name="process" class="form-control">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">직위/역할</label>
                        <input type="text" name="role" class="form-control">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">현 부서 근무기간</label>
                        <div class="row g-2">
                            <div class="col">
                                <input type="number" name="work_years" class="form-control" placeholder="년" min="0">
                            </div>
                            <div class="col">
                                <input type="number" name="work_months" class="form-control" placeholder="개월" min="0" max="11">
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">하루 평균 작업시간</label>
                        <input type="number" name="daily_work_hours" class="form-control" placeholder="시간" min="1" max="24">
                    </div>
                </div>
            </div>

            <!-- 3. 과거력 -->
            <div class="section-card">
                <h3 class="section-title">3. 과거력</h3>
                <div class="row g-3">
                    <div class="col-12">
                        <label class="form-label">과거 동일작업 근무기간</label>
                        <div class="row g-2">
                            <div class="col">
                                <input type="number" name="previous_work_years" class="form-control" placeholder="년" min="0">
                            </div>
                            <div class="col">
                                <input type="number" name="previous_work_months" class="form-control" placeholder="개월" min="0" max="11">
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 4. 여가 및 취미 -->
            <div class="section-card">
                <h3 class="section-title">4. 여가 및 취미</h3>
                <p>평소 규칙적으로 하는 운동이나 취미활동이 있습니까?</p>
                <div class="checkbox-group">
                    <label><input type="checkbox" name="hobby_computer"> 집안일/컴퓨터/게임</label>
                    <label><input type="checkbox" name="hobby_crafts"> 뜨개질/자수/붓글씨</label>
                    <label><input type="checkbox" name="hobby_racket"> 테니스/배드민턴/스쿼시</label>
                    <label><input type="checkbox" name="hobby_ball"> 축구/족구/농구/스키</label>
                    <label><input type="checkbox" name="hobby_none"> 해당사항 없음</label>
                </div>
            </div>

            <!-- 5. 가사노동시간 -->
            <div class="section-card">
                <h3 class="section-title">5. 가사노동시간</h3>
                <p>하루 평균 가사노동시간은?</p>
                <div class="radio-group">
                    <label><input type="radio" name="housework_hours" value="거의하지않는다"> 거의 하지 않는다</label>
                    <label><input type="radio" name="housework_hours" value="1시간미만"> 1시간 미만</label>
                    <label><input type="radio" name="housework_hours" value="1-2시간"> 1-2시간</label>
                    <label><input type="radio" name="housework_hours" value="2-3시간"> 2-3시간</label>
                    <label><input type="radio" name="housework_hours" value="3시간이상"> 3시간 이상</label>
                </div>
            </div>

            <!-- 6. 진단받은 질병 -->
            <div class="section-card">
                <h3 class="section-title">6. 진단받은 질병</h3>
                <p>의사에게서 근골격계 관련 질병을 진단받은 적이 있습니까?</p>
                <div class="radio-group">
                    <label><input type="radio" name="diagnosed" value="no" onchange="toggleDiseaseSection()"> 아니오</label>
                    <label><input type="radio" name="diagnosed" value="yes" onchange="toggleDiseaseSection()"> 예</label>
                </div>
                <div id="disease-section" style="display: none; margin-top: 15px;">
                    <p>진단받은 질병 (여러개 선택 가능):</p>
                    <div class="checkbox-group">
                        <label><input type="checkbox" name="disease_rheumatoid" onchange="toggleDiseaseStatus('rheumatoid')"> 류머티스관절염</label>
                        <label><input type="checkbox" name="disease_diabetes" onchange="toggleDiseaseStatus('diabetes')"> 당뇨병</label>
                        <label><input type="checkbox" name="disease_lupus" onchange="toggleDiseaseStatus('lupus')"> 루프스병</label>
                        <label><input type="checkbox" name="disease_gout" onchange="toggleDiseaseStatus('gout')"> 통풍</label>
                        <label><input type="checkbox" name="disease_alcohol" onchange="toggleDiseaseStatus('alcohol')"> 알코올중독</label>
                        <label><input type="checkbox" name="disease_other" onchange="toggleDiseaseOther()"> 기타</label>
                    </div>
                    <input type="text" name="disease_other_text" class="form-control mt-2" placeholder="기타 질병 입력" style="display: none;">

                    <!-- 질병 상태 선택 -->
                    <div id="disease-status-container" style="margin-top: 15px;">
                        <!-- 동적으로 생성됨 -->
                    </div>
                </div>
            </div>

            <!-- 7. 과거 사고 -->
            <div class="section-card">
                <h3 class="section-title">7. 과거 사고</h3>
                <p>과거에 운동 중 혹은 사고로 다친 적이 있습니까?</p>
                <div class="radio-group">
                    <label><input type="radio" name="past_accident" value="아니오" onchange="toggleAccidentSection()"> 아니오</label>
                    <label><input type="radio" name="past_accident" value="예" onchange="toggleAccidentSection()"> 예</label>
                </div>
                <div id="accident-section" style="display: none; margin-top: 15px;">
                    <p>다친 부위 (여러개 선택 가능):</p>
                    <div class="checkbox-group">
                        <label><input type="checkbox" name="accident_hand" onchange="toggleAccidentStatus('hand')"> 손/손가락/손목</label>
                        <label><input type="checkbox" name="accident_arm" onchange="toggleAccidentStatus('arm')"> 팔/팔꿈치</label>
                        <label><input type="checkbox" name="accident_shoulder" onchange="toggleAccidentStatus('shoulder')"> 어깨</label>
                        <label><input type="checkbox" name="accident_neck" onchange="toggleAccidentStatus('neck')"> 목</label>
                        <label><input type="checkbox" name="accident_waist" onchange="toggleAccidentStatus('waist')"> 허리</label>
                        <label><input type="checkbox" name="accident_leg" onchange="toggleAccidentStatus('leg')"> 다리/발</label>
                    </div>

                    <!-- 사고 부위 상태 선택 -->
                    <div id="accident-status-container" style="margin-top: 15px;">
                        <!-- 동적으로 생성됨 -->
                    </div>
                </div>
            </div>

            <!-- 8. 육체적 부담 정도 -->
            <div class="section-card">
                <h3 class="section-title">8. 육체적 부담 정도</h3>
                <p>현재 작업의 육체적 부담 정도는?</p>
                <div class="radio-group">
                    <label><input type="radio" name="physical_burden" value="전혀힘들지않음"> 전혀 힘들지 않음</label>
                    <label><input type="radio" name="physical_burden" value="견딜만함"> 견딜만 함</label>
                    <label><input type="radio" name="physical_burden" value="약간힘듦"> 약간 힘듦</label>
                    <label><input type="radio" name="physical_burden" value="매우힘듦"> 매우 힘듦</label>
                </div>
            </div>

            <!-- 9. 근골격계 증상조사 -->
            <div class="section-card">
                <h3 class="section-title">9. 근골격계 증상조사</h3>
                <p>지난 1년 동안 작업과 관련하여 통증이나 불편함을 느끼신 적이 있습니까?</p>
                <div class="radio-group">
                    <label><input type="radio" name="has_symptoms" value="아니오" onchange="toggleSymptomsSection()" required> 아니오</label>
                    <label><input type="radio" name="has_symptoms" value="예" onchange="toggleSymptomsSection()" required> 예</label>
                </div>

                <div id="symptoms-section" style="display: none; margin-top: 20px;">
                    <h4>통증 부위별 상세 조사</h4>
                    <div id="symptoms-grid"></div>
                </div>
            </div>

            <!-- 제출 버튼 -->
            <div class="submit-section">
                <button type="submit" class="submit-btn">제출하기</button>
            </div>
        </form>
    </div>

    <script>
        const bodyParts = ['목', '어깨', '팔/팔꿈치', '손/손목/손가락', '허리', '다리/발'];
        const symptomData = {};

        function toggleDiseaseSection() {
            const diagnosed = document.querySelector('input[name="diagnosed"]:checked');
            document.getElementById('disease-section').style.display = diagnosed?.value === 'yes' ? 'block' : 'none';
        }

        function toggleDiseaseOther() {
            const otherCheckbox = document.querySelector('input[name="disease_other"]');
            const otherText = document.querySelector('input[name="disease_other_text"]');
            otherText.style.display = otherCheckbox.checked ? 'block' : 'none';
        }

        function toggleDiseaseStatus(disease) {
            const checkbox = document.querySelector(\`input[name="disease_\${disease}"]\`);
            const container = document.getElementById('disease-status-container');

            if (!container) return;

            // Remove existing status for this disease
            const existingStatus = document.getElementById(\`disease_\${disease}_status\`);
            if (existingStatus) existingStatus.remove();

            if (checkbox.checked) {
                const statusDiv = document.createElement('div');
                statusDiv.id = \`disease_\${disease}_status\`;
                statusDiv.style.marginTop = '10px';
                statusDiv.innerHTML = \`
                    <label style="font-weight: 600;">\${getDiseaseLabel(disease)} 상태:</label>
                    <div class="radio-group" style="margin-top: 5px;">
                        <label><input type="radio" name="\${disease}_status" value="완치됨"> 완치됨</label>
                        <label><input type="radio" name="\${disease}_status" value="치료·관찰중"> 치료·관찰중</label>
                    </div>
                \`;
                container.appendChild(statusDiv);
            }
        }

        function getDiseaseLabel(disease) {
            const labels = {
                'rheumatoid': '류머티스관절염',
                'diabetes': '당뇨병',
                'lupus': '루프스병',
                'gout': '통풍',
                'alcohol': '알코올중독'
            };
            return labels[disease] || disease;
        }

        function toggleAccidentSection() {
            const accident = document.querySelector('input[name="past_accident"]:checked');
            document.getElementById('accident-section').style.display = accident?.value === '예' ? 'block' : 'none';
        }

        function toggleAccidentStatus(part) {
            const checkbox = document.querySelector(\`input[name="accident_\${part}"]\`);
            const container = document.getElementById('accident-status-container');

            if (!container) return;

            // Remove existing status for this part
            const existingStatus = document.getElementById(\`accident_\${part}_status\`);
            if (existingStatus) existingStatus.remove();

            if (checkbox.checked) {
                const statusDiv = document.createElement('div');
                statusDiv.id = \`accident_\${part}_status\`;
                statusDiv.style.marginTop = '10px';
                statusDiv.innerHTML = \`
                    <label style="font-weight: 600;">\${getAccidentLabel(part)} 상태:</label>
                    <div class="radio-group" style="margin-top: 5px;">
                        <label><input type="radio" name="\${part}_accident_status" value="완치됨"> 완치됨</label>
                        <label><input type="radio" name="\${part}_accident_status" value="치료·관찰중"> 치료·관찰중</label>
                    </div>
                \`;
                container.appendChild(statusDiv);
            }
        }

        function getAccidentLabel(part) {
            const labels = {
                'hand': '손/손가락/손목',
                'arm': '팔/팔꿈치',
                'shoulder': '어깨',
                'neck': '목',
                'waist': '허리',
                'leg': '다리/발'
            };
            return labels[part] || part;
        }

        function toggleConsequenceOther(part) {
            const checkbox = document.querySelector(\`input[name="\${part}_consequences"][value="기타"]\`);
            const otherText = document.querySelector(\`input[name="\${part}_consequence_other"]\`);
            if (otherText) {
                otherText.style.display = checkbox.checked ? 'block' : 'none';
            }
        }

        function toggleSymptomsSection() {
            const hasSymptoms = document.querySelector('input[name="has_symptoms"]:checked');
            const section = document.getElementById('symptoms-section');
            if (hasSymptoms?.value === '예') {
                section.style.display = 'block';
                renderSymptomGrid();
            } else {
                section.style.display = 'none';
            }
        }

        function renderSymptomGrid() {
            const grid = document.getElementById('symptoms-grid');
            grid.innerHTML = bodyParts.map((part, idx) => {
                const partId = 'part_' + idx;
                const needsSide = !['목', '허리'].includes(part);
                return \`
                    <div class="symptom-card">
                        <h4 class="symptom-title">\${part}</h4>
                        <div class="question-row">
                            <span class="question-text">통증 경험</span>
                            <div class="answer-options">
                                <button type="button" class="option-btn" onclick="selectOption('\${part}', 'pain', '없음', this)">없음</button>
                                <button type="button" class="option-btn" onclick="selectOption('\${part}', 'pain', '있음', this)">있음</button>
                            </div>
                        </div>
                        \${needsSide ? \`
                        <div class="question-row" id="\${part}-side-row" style="display: none;">
                            <span class="question-text">구체적 부위</span>
                            <div class="answer-options">
                                <button type="button" class="option-btn" onclick="selectOption('\${part}', 'side', '오른쪽', this)">오른쪽</button>
                                <button type="button" class="option-btn" onclick="selectOption('\${part}', 'side', '왼쪽', this)">왼쪽</button>
                                <button type="button" class="option-btn" onclick="selectOption('\${part}', 'side', '양쪽', this)">양쪽</button>
                            </div>
                        </div>
                        \` : ''}
                        <div class="question-row" id="\${part}-frequency-row" style="display: none;">
                            <span class="question-text">빈도</span>
                            <div class="answer-options">
                                <button type="button" class="option-btn" onclick="selectOption('\${part}', 'frequency', '항상', this)">항상</button>
                                <button type="button" class="option-btn" onclick="selectOption('\${part}', 'frequency', '자주', this)">자주</button>
                                <button type="button" class="option-btn" onclick="selectOption('\${part}', 'frequency', '가끔', this)">가끔</button>
                            </div>
                        </div>
                        <div class="question-row" id="\${part}-duration-row" style="display: none;">
                            <span class="question-text">지속기간</span>
                            <div class="answer-options">
                                <button type="button" class="option-btn" onclick="selectOption('\${part}', 'duration', '1주미만', this)">1주미만</button>
                                <button type="button" class="option-btn" onclick="selectOption('\${part}', 'duration', '1주-1개월', this)">1주-1개월</button>
                                <button type="button" class="option-btn" onclick="selectOption('\${part}', 'duration', '1개월-6개월', this)">1개월-6개월</button>
                                <button type="button" class="option-btn" onclick="selectOption('\${part}', 'duration', '6개월이상', this)">6개월이상</button>
                            </div>
                        </div>
                        <div class="question-row" id="\${part}-severity-row" style="display: none;">
                            <span class="question-text">통증정도</span>
                            <div class="answer-options">
                                <button type="button" class="option-btn" onclick="selectOption('\${part}', 'severity', '약함', this)">약함</button>
                                <button type="button" class="option-btn" onclick="selectOption('\${part}', 'severity', '중간', this)">중간</button>
                                <button type="button" class="option-btn" onclick="selectOption('\${part}', 'severity', '심함', this)">심함</button>
                                <button type="button" class="option-btn" onclick="selectOption('\${part}', 'severity', '매우심함', this)">매우심함</button>
                            </div>
                        </div>
                        <div class="question-row" id="\${part}-last_week-row" style="display: none;">
                            <span class="question-text">지난 1주일</span>
                            <div class="answer-options">
                                <button type="button" class="option-btn" onclick="selectOption('\${part}', 'last_week', '없음', this)">없음</button>
                                <button type="button" class="option-btn" onclick="selectOption('\${part}', 'last_week', '있음', this)">있음</button>
                            </div>
                        </div>
                        <div class="question-row" id="\${part}-consequences-row" style="display: none;">
                            <span class="question-text">통증으로 인한 결과</span>
                            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                                <label style="font-size: 0.9rem;"><input type="checkbox" name="\${part}_consequences" value="병원·한의원 치료"> 병원·한의원 치료</label>
                                <label style="font-size: 0.9rem;"><input type="checkbox" name="\${part}_consequences" value="약국치료"> 약국치료</label>
                                <label style="font-size: 0.9rem;"><input type="checkbox" name="\${part}_consequences" value="병가·산재"> 병가·산재</label>
                                <label style="font-size: 0.9rem;"><input type="checkbox" name="\${part}_consequences" value="작업전환"> 작업 전환</label>
                                <label style="font-size: 0.9rem;"><input type="checkbox" name="\${part}_consequences" value="해당사항없음"> 해당사항 없음</label>
                                <label style="font-size: 0.9rem;"><input type="checkbox" name="\${part}_consequences" value="기타" onchange="toggleConsequenceOther('\${part}')"> 기타</label>
                                <input type="text" name="\${part}_consequence_other" class="form-control mt-2" placeholder="기타 내용 입력" style="display: none;">
                            </div>
                        </div>
                    </div>
                \`;
            }).join('');
        }

        function selectOption(part, question, value, btn) {
            if (!symptomData[part]) symptomData[part] = {};
            symptomData[part][question] = value;

            // Clear other buttons in same group
            btn.parentElement.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            // Show/hide dependent questions
            if (question === 'pain') {
                const showDetails = value === '있음';
                const needsSide = !['목', '허리'].includes(part);
                if (needsSide) {
                    const sideRow = document.getElementById(\`\${part}-side-row\`);
                    if (sideRow) sideRow.style.display = showDetails ? 'flex' : 'none';
                }
                ['frequency', 'duration', 'severity', 'last_week', 'consequences'].forEach(field => {
                    const row = document.getElementById(\`\${part}-\${field}-row\`);
                    if (row) row.style.display = showDetails ? 'flex' : 'none';
                });
            }
        }

        // Collect consequences data for each body part
        function collectConsequencesData() {
            bodyParts.forEach(part => {
                if (symptomData[part] && symptomData[part].pain === '있음') {
                    const consequences = [];
                    const consequenceCheckboxes = document.querySelectorAll('input[name="' + part + '_consequences"]:checked');
                    consequenceCheckboxes.forEach(cb => {
                        consequences.push(cb.value);
                    });

                    if (consequences.length > 0) {
                        symptomData[part].consequences = consequences;
                    }

                    // Get "기타" text if selected
                    const otherInput = document.querySelector('input[name="' + part + '_consequence_other"]');
                    if (otherInput && otherInput.style.display !== 'none' && otherInput.value.trim()) {
                        symptomData[part].consequence_other = otherInput.value.trim();
                    }
                }
            });
        }

        // Form submission
        document.getElementById('surveyForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            // Collect consequences data before creating FormData
            collectConsequencesData();

            const formData = new FormData(this);
            const data = {
                // Personal info
                personal_info: {
                    name: formData.get('name'),
                    age: formData.get('age'),
                    gender: formData.get('gender'),
                    marriage_status: formData.get('marriage_status')
                },
                // Work info
                work_info: {
                    company: formData.get('company'),
                    process: formData.get('process'),
                    role: formData.get('role'),
                    work_years: formData.get('work_years'),
                    work_months: formData.get('work_months'),
                    daily_work_hours: formData.get('daily_work_hours')
                },
                // Past work
                past_work: {
                    previous_work_years: formData.get('previous_work_years'),
                    previous_work_months: formData.get('previous_work_months')
                },
                // Hobbies
                hobbies: {
                    computer: formData.get('hobby_computer') === 'on',
                    crafts: formData.get('hobby_crafts') === 'on',
                    racket: formData.get('hobby_racket') === 'on',
                    ball: formData.get('hobby_ball') === 'on',
                    none: formData.get('hobby_none') === 'on'
                },
                // Housework
                housework_hours: formData.get('housework_hours'),
                // Diseases
                diagnosed: formData.get('diagnosed'),
                diseases: {
                    rheumatoid: formData.get('disease_rheumatoid') === 'on',
                    rheumatoid_status: formData.get('disease_rheumatoid_status'),
                    diabetes: formData.get('disease_diabetes') === 'on',
                    diabetes_status: formData.get('disease_diabetes_status'),
                    lupus: formData.get('disease_lupus') === 'on',
                    lupus_status: formData.get('disease_lupus_status'),
                    gout: formData.get('disease_gout') === 'on',
                    gout_status: formData.get('disease_gout_status'),
                    alcohol: formData.get('disease_alcohol') === 'on',
                    alcohol_status: formData.get('disease_alcohol_status'),
                    other: formData.get('disease_other') === 'on',
                    other_text: formData.get('disease_other_text'),
                    other_status: formData.get('disease_other_status')
                },
                // Past accident
                past_accident: formData.get('past_accident'),
                accident_parts: {
                    hand: formData.get('accident_hand') === 'on',
                    hand_status: formData.get('accident_hand_status'),
                    arm: formData.get('accident_arm') === 'on',
                    arm_status: formData.get('accident_arm_status'),
                    shoulder: formData.get('accident_shoulder') === 'on',
                    shoulder_status: formData.get('accident_shoulder_status'),
                    neck: formData.get('accident_neck') === 'on',
                    neck_status: formData.get('accident_neck_status'),
                    waist: formData.get('accident_waist') === 'on',
                    waist_status: formData.get('accident_waist_status'),
                    leg: formData.get('accident_leg') === 'on',
                    leg_status: formData.get('accident_leg_status')
                },
                // Physical burden
                physical_burden: formData.get('physical_burden'),
                // Symptoms
                has_symptoms: formData.get('has_symptoms'),
                symptoms: symptomData
            };

            const surveyId = 'survey_001_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

            try {
                const response = await fetch('/api/survey/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: surveyId,
                        form_type: '001_musculoskeletal',
                        timestamp: new Date().toISOString(),
                        data: data
                    })
                });

                if (response.ok) {
                    alert('근골격계질환 증상조사표가 성공적으로 제출되었습니다.\\n제출번호: ' + surveyId);
                    window.location.href = '/';
                } else {
                    throw new Error('Submit failed');
                }
            } catch (error) {
                console.error('제출 오류:', error);
                localStorage.setItem(surveyId, JSON.stringify(data));
                alert('제출이 완료되었습니다. (로컬 저장)\\n제출번호: ' + surveyId);
                window.location.href = '/';
            }
        });
    </script>
</body>
</html>`;
}