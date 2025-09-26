// 완전한 근골격계 증상조사표 - 원본 SafeWork 폼 복원
export const completeSurveyForm = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>근골격계 증상조사표 - SafeWork</title>
    <style>
        /* SafeWork 통합 디자인 시스템 */
        :root {
            --sw-primary: #6366f1;
            --sw-primary-light: #a5b4fc;
            --sw-primary-dark: #4f46e5;
            --sw-secondary: #64748b;
            --sw-success: #10b981;
            --sw-warning: #f59e0b;
            --sw-danger: #ef4444;
            --sw-white: #ffffff;
            --sw-gray-50: #f8fafc;
            --sw-gray-100: #f1f5f9;
            --sw-gray-200: #e2e8f0;
            --sw-gray-600: #475569;
            --sw-gray-900: #1e293b;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            line-height: 1.6;
        }

        .survey-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            min-width: 0;
            overflow-x: hidden;
        }

        .section-card {
            background: linear-gradient(145deg, var(--sw-white) 0%, var(--sw-gray-50) 100%);
            border-radius: 16px;
            padding: 28px;
            margin-bottom: 24px;
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.08), 0 0 0 1px rgba(99, 102, 241, 0.05);
            border: 1px solid rgba(99, 102, 241, 0.1);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        .section-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, var(--sw-primary), var(--sw-primary-light));
        }

        .section-title {
            color: var(--sw-gray-900);
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 3px solid var(--sw-primary);
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .form-row {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }

        .form-group {
            flex: 1;
            min-width: 280px;
        }

        .form-group.half {
            flex: 0 0 calc(50% - 10px);
        }

        .form-label {
            display: block;
            margin-bottom: 8px;
            color: var(--sw-gray-900);
            font-weight: 600;
            font-size: 0.95rem;
        }

        .form-label.required::after {
            content: ' *';
            color: var(--sw-danger);
            font-weight: 700;
        }

        .form-control {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid var(--sw-gray-200);
            border-radius: 8px;
            font-size: 1rem;
            transition: all 0.3s ease;
            background: white;
        }

        .form-control:focus {
            outline: none;
            border-color: var(--sw-primary);
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }

        .radio-group, .checkbox-group {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 12px;
            margin-top: 8px;
        }

        .radio-item, .checkbox-item {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            border: 2px solid var(--sw-gray-200);
            border-radius: 8px;
            background: white;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .radio-item:hover, .checkbox-item:hover {
            border-color: var(--sw-primary-light);
            background: var(--sw-gray-50);
        }

        .radio-item input, .checkbox-item input {
            margin-right: 8px;
            transform: scale(1.2);
        }

        .submit-btn {
            background: linear-gradient(135deg, var(--sw-primary) 0%, var(--sw-primary-dark) 100%);
            color: white;
            border: none;
            padding: 16px 40px;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: block;
            margin: 40px auto 0;
            min-width: 200px;
        }

        .submit-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
        }

        .body-part-selection {
            background: var(--sw-gray-50);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }

        .body-parts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-top: 16px;
        }

        .body-part-card {
            background: white;
            border: 2px solid var(--sw-gray-200);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .body-part-card:hover {
            border-color: var(--sw-primary);
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(99, 102, 241, 0.15);
        }

        .body-part-card.selected {
            border-color: var(--sw-primary);
            background: var(--sw-primary);
            color: white;
        }

        .body-part-icon {
            font-size: 2.5rem;
            margin-bottom: 12px;
            color: var(--sw-primary);
        }

        .body-part-card.selected .body-part-icon {
            color: white;
        }

        .body-part-name {
            font-weight: 600;
            font-size: 1.1rem;
        }

        .symptoms-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .symptoms-table th {
            background: linear-gradient(135deg, var(--sw-primary) 0%, var(--sw-primary-dark) 100%);
            color: white;
            padding: 16px;
            text-align: center;
            font-weight: 600;
        }

        .symptoms-table td {
            padding: 14px;
            border-bottom: 1px solid var(--sw-gray-200);
            text-align: center;
        }

        .symptoms-table tr:hover {
            background: var(--sw-gray-50);
        }

        .question-cell {
            text-align: left;
            font-weight: 500;
            min-width: 300px;
        }

        .answer-cell {
            min-width: 80px;
        }

        @media (max-width: 768px) {
            .survey-container { padding: 16px; }
            .section-card { padding: 20px; margin-bottom: 20px; }
            .form-row { gap: 16px; }
            .form-group, .form-group.half { min-width: 100%; }
            .radio-group, .checkbox-group { grid-template-columns: 1fr; }
            .body-parts-grid { grid-template-columns: 1fr; }
        }

        .alert {
            padding: 16px 20px;
            margin-bottom: 20px;
            border-radius: 12px;
            background: rgba(99, 102, 241, 0.1);
            border: 1px solid var(--sw-primary-light);
            color: var(--sw-primary-dark);
        }
    </style>
</head>
<body>
    <div class="survey-container">
        <form method="POST" action="/survey/001_musculoskeletal_symptom_survey/submit" id="surveyForm">

            <!-- 제목 -->
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #1f2937; margin-bottom: 5px;">
                    🏥 근골격계 증상조사표
                </h2>
                <p style="color: #6b7280; font-size: 0.9rem;">산업안전보건기준에 관한 규칙 제657조 - 정확한 데이터 수집</p>
            </div>

            <!-- I. 기본정보 -->
            <div class="section-card">
                <h4 class="section-title">
                    👤 I. 기본정보
                </h4>

                <div class="form-row">
                    <div class="form-group half">
                        <label class="form-label required">성명</label>
                        <input type="text" name="name" class="form-control" placeholder="홍길동" required>
                    </div>
                    <div class="form-group half">
                        <label class="form-label required">연령</label>
                        <input type="number" name="age" class="form-control" placeholder="35" min="18" max="80" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label required">성별</label>
                        <div class="radio-group">
                            <div class="radio-item">
                                <input type="radio" id="gender_male" name="gender" value="남" required>
                                <label for="gender_male">남성</label>
                            </div>
                            <div class="radio-item">
                                <input type="radio" id="gender_female" name="gender" value="여" required>
                                <label for="gender_female">여성</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- II. 근무정보 -->
            <div class="section-card">
                <h4 class="section-title">
                    🏢 II. 근무정보
                </h4>

                <div class="form-row">
                    <div class="form-group half">
                        <label class="form-label required">회사명</label>
                        <input type="text" name="company" class="form-control" placeholder="회사명을 입력하세요" required>
                    </div>
                    <div class="form-group half">
                        <label class="form-label required">부서/공정</label>
                        <input type="text" name="department" class="form-control" placeholder="부서명을 입력하세요" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group half">
                        <label class="form-label">직급</label>
                        <input type="text" name="position" class="form-control" placeholder="사원, 대리, 과장 등">
                    </div>
                    <div class="form-group half">
                        <label class="form-label required">담당업무</label>
                        <input type="text" name="role" class="form-control" placeholder="담당업무를 입력하세요" required>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group half">
                        <label class="form-label required">현 작업 근무년수</label>
                        <input type="number" name="work_years" class="form-control" placeholder="5" min="0" max="50" required>
                    </div>
                    <div class="form-group half">
                        <label class="form-label">현 작업 근무개월수</label>
                        <input type="number" name="work_months" class="form-control" placeholder="3" min="0" max="12">
                    </div>
                </div>
            </div>

            <!-- III. 작업특성 -->
            <div class="section-card">
                <h4 class="section-title">
                    ⚙️ III. 작업특성
                </h4>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label required">하루 평균 작업시간</label>
                        <select name="daily_work_hours" class="form-control" required>
                            <option value="">선택하세요</option>
                            <option value="6시간 미만">6시간 미만</option>
                            <option value="6-8시간">6-8시간</option>
                            <option value="8-10시간">8-10시간</option>
                            <option value="10-12시간">10-12시간</option>
                            <option value="12시간 이상">12시간 이상</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label required">주요 작업내용 (중복선택 가능)</label>
                    <div class="checkbox-group">
                        <div class="checkbox-item">
                            <input type="checkbox" id="work_lifting" name="work_type" value="중량물 들기/옮기기">
                            <label for="work_lifting">중량물 들기/옮기기</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="work_repetitive" name="work_type" value="반복작업">
                            <label for="work_repetitive">반복작업</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="work_sitting" name="work_type" value="장시간 앉아서 작업">
                            <label for="work_sitting">장시간 앉아서 작업</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="work_standing" name="work_type" value="장시간 서서 작업">
                            <label for="work_standing">장시간 서서 작업</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="work_bending" name="work_type" value="구부린 자세 작업">
                            <label for="work_bending">구부린 자세 작업</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="work_computer" name="work_type" value="컴퓨터/VDT 작업">
                            <label for="work_computer">컴퓨터/VDT 작업</label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- IV. 신체부위별 증상 -->
            <div class="section-card">
                <h4 class="section-title">
                    🏥 IV. 신체부위별 증상
                </h4>

                <div class="alert">
                    <strong>📝 작성방법:</strong> 지난 1년간 경험한 증상이 있는 신체부위를 선택하고, 해당 부위의 증상을 평가해주세요.
                </div>

                <div class="body-part-selection">
                    <label class="form-label">증상이 있는 신체부위를 모두 선택하세요</label>
                    <div class="body-parts-grid">
                        <div class="body-part-card" data-part="neck">
                            <div class="body-part-icon">🦴</div>
                            <div class="body-part-name">목</div>
                            <input type="checkbox" name="affected_parts" value="목" style="display: none;">
                        </div>
                        <div class="body-part-card" data-part="shoulder">
                            <div class="body-part-icon">💪</div>
                            <div class="body-part-name">어깨</div>
                            <input type="checkbox" name="affected_parts" value="어깨" style="display: none;">
                        </div>
                        <div class="body-part-card" data-part="arm">
                            <div class="body-part-icon">💪</div>
                            <div class="body-part-name">팔/팔꿈치</div>
                            <input type="checkbox" name="affected_parts" value="팔/팔꿈치" style="display: none;">
                        </div>
                        <div class="body-part-card" data-part="wrist">
                            <div class="body-part-icon">✋</div>
                            <div class="body-part-name">손목/손</div>
                            <input type="checkbox" name="affected_parts" value="손목/손" style="display: none;">
                        </div>
                        <div class="body-part-card" data-part="back">
                            <div class="body-part-icon">🧍</div>
                            <div class="body-part-name">허리</div>
                            <input type="checkbox" name="affected_parts" value="허리" style="display: none;">
                        </div>
                        <div class="body-part-card" data-part="leg">
                            <div class="body-part-icon">🦵</div>
                            <div class="body-part-name">다리/발</div>
                            <input type="checkbox" name="affected_parts" value="다리/발" style="display: none;">
                        </div>
                    </div>
                </div>

                <!-- 증상 평가 테이블 -->
                <div id="symptomEvaluationTable" style="display: none; margin-top: 30px;">
                    <h5 style="color: var(--sw-primary); margin-bottom: 16px;">선택한 부위의 증상을 평가해주세요</h5>
                    <div style="overflow-x: auto;">
                        <table class="symptoms-table">
                            <thead>
                                <tr>
                                    <th style="min-width: 300px;">증상 평가 항목</th>
                                    <th>전혀 없음<br>(0점)</th>
                                    <th>가끔<br>(1점)</th>
                                    <th>자주<br>(2점)</th>
                                    <th>항상<br>(3점)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td class="question-cell">1. 통증이나 아픔이 있다</td>
                                    <td class="answer-cell"><input type="radio" name="pain_frequency" value="0" required></td>
                                    <td class="answer-cell"><input type="radio" name="pain_frequency" value="1"></td>
                                    <td class="answer-cell"><input type="radio" name="pain_frequency" value="2"></td>
                                    <td class="answer-cell"><input type="radio" name="pain_frequency" value="3"></td>
                                </tr>
                                <tr>
                                    <td class="question-cell">2. 뻣뻣하거나 경직된 느낌이 있다</td>
                                    <td class="answer-cell"><input type="radio" name="stiffness_frequency" value="0" required></td>
                                    <td class="answer-cell"><input type="radio" name="stiffness_frequency" value="1"></td>
                                    <td class="answer-cell"><input type="radio" name="stiffness_frequency" value="2"></td>
                                    <td class="answer-cell"><input type="radio" name="stiffness_frequency" value="3"></td>
                                </tr>
                                <tr>
                                    <td class="question-cell">3. 저리거나 화끈거리는 느낌이 있다</td>
                                    <td class="answer-cell"><input type="radio" name="numbness_frequency" value="0" required></td>
                                    <td class="answer-cell"><input type="radio" name="numbness_frequency" value="1"></td>
                                    <td class="answer-cell"><input type="radio" name="numbness_frequency" value="2"></td>
                                    <td class="answer-cell"><input type="radio" name="numbness_frequency" value="3"></td>
                                </tr>
                                <tr>
                                    <td class="question-cell">4. 부어오른 느낌이나 붓기가 있다</td>
                                    <td class="answer-cell"><input type="radio" name="swelling_frequency" value="0" required></td>
                                    <td class="answer-cell"><input type="radio" name="swelling_frequency" value="1"></td>
                                    <td class="answer-cell"><input type="radio" name="swelling_frequency" value="2"></td>
                                    <td class="answer-cell"><input type="radio" name="swelling_frequency" value="3"></td>
                                </tr>
                                <tr>
                                    <td class="question-cell">5. 일상생활이나 업무에 지장을 준다</td>
                                    <td class="answer-cell"><input type="radio" name="interference_frequency" value="0" required></td>
                                    <td class="answer-cell"><input type="radio" name="interference_frequency" value="1"></td>
                                    <td class="answer-cell"><input type="radio" name="interference_frequency" value="2"></td>
                                    <td class="answer-cell"><input type="radio" name="interference_frequency" value="3"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- V. 추가정보 -->
            <div class="section-card">
                <h4 class="section-title">
                    📝 V. 추가정보
                </h4>

                <div class="form-group">
                    <label class="form-label">증상에 대한 자세한 설명</label>
                    <textarea name="symptom_description" class="form-control" rows="4"
                        placeholder="언제부터 시작되었는지, 어떤 작업을 할 때 심해지는지, 치료를 받은 적이 있는지 등을 자세히 적어주세요."></textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">작업환경 개선 제안사항</label>
                    <textarea name="improvement_suggestions" class="form-control" rows="3"
                        placeholder="근골격계 질환 예방을 위해 필요한 작업환경 개선사항이 있다면 적어주세요."></textarea>
                </div>
            </div>

            <button type="submit" class="submit-btn">
                📋 설문조사 제출하기
            </button>
        </form>
    </div>

    <script>
        // 신체부위 선택 기능
        document.querySelectorAll('.body-part-card').forEach(card => {
            card.addEventListener('click', function() {
                const checkbox = this.querySelector('input[type="checkbox"]');
                const isSelected = this.classList.contains('selected');

                if (isSelected) {
                    this.classList.remove('selected');
                    checkbox.checked = false;
                } else {
                    this.classList.add('selected');
                    checkbox.checked = true;
                }

                updateSymptomTable();
            });
        });

        function updateSymptomTable() {
            const selectedParts = document.querySelectorAll('.body-part-card.selected').length;
            const table = document.getElementById('symptomEvaluationTable');

            if (selectedParts > 0) {
                table.style.display = 'block';
                // 필수 항목 설정
                const radioInputs = table.querySelectorAll('input[type="radio"]');
                radioInputs.forEach(input => {
                    input.required = true;
                });
            } else {
                table.style.display = 'none';
                // 필수 항목 해제
                const radioInputs = table.querySelectorAll('input[type="radio"]');
                radioInputs.forEach(input => {
                    input.required = false;
                    input.checked = false;
                });
            }
        }

        // 폼 제출 검증
        document.getElementById('surveyForm').addEventListener('submit', function(e) {
            const selectedParts = document.querySelectorAll('.body-part-card.selected');

            if (selectedParts.length === 0) {
                e.preventDefault();
                alert('증상이 있는 신체부위를 최소 1개 이상 선택해주세요.');
                return false;
            }

            // 선택된 부위에 대한 증상 평가 완료 확인
            const requiredRadios = document.querySelectorAll('#symptomEvaluationTable input[required]');
            let allAnswered = true;
            const questions = {};

            requiredRadios.forEach(radio => {
                const name = radio.name;
                if (!questions[name]) {
                    questions[name] = false;
                }
                if (radio.checked) {
                    questions[name] = true;
                }
            });

            Object.values(questions).forEach(answered => {
                if (!answered) allAnswered = false;
            });

            if (!allAnswered) {
                e.preventDefault();
                alert('선택한 신체부위의 모든 증상 평가 항목을 완료해주세요.');
                return false;
            }
        });
    </script>
</body>
</html>
`;