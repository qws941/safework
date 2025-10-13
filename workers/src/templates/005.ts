/**
 * Form 005 Template: 유해요인 기본조사표
 * Basic Hazard Factor Survey
 */

export const form005Template = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>유해요인 기본조사표 (005) - SafeWork</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --primary-color: #8b5cf6;
            --primary-dark: #7c3aed;
            --secondary-color: #6366f1;
            --accent-color: #a855f7;
        }

        body {
            background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
            min-height: 100vh;
            font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
            padding: 20px 0;
        }

        .survey-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }

        .survey-header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            color: var(--primary-color);
            padding: 40px 30px;
            border-radius: 20px;
            margin-bottom: 30px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .survey-header h1 {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 10px;
        }

        .survey-header .badge {
            background: var(--primary-color);
            padding: 8px 16px;
            font-size: 0.9rem;
        }

        .survey-form {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .section-title {
            color: var(--primary-color);
            font-weight: 700;
            font-size: 1.3rem;
            margin-top: 30px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #e9d5ff;
        }

        .section-title:first-of-type {
            margin-top: 0;
        }

        .form-label {
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
        }

        .required {
            color: #dc2626;
        }

        .form-control, .form-select, .form-control[type="date"] {
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 10px 14px;
            transition: all 0.3s;
        }

        .form-control:focus, .form-select:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        textarea.form-control {
            min-height: 100px;
        }

        .alert-info {
            background: linear-gradient(135deg, #dbeafe, #bfdbfe);
            border: 2px solid #3b82f6;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 25px;
        }

        .risk-matrix-help {
            background: #faf5ff;
            border: 2px solid #e9d5ff;
            border-radius: 10px;
            padding: 15px;
            margin-top: 10px;
            font-size: 0.9rem;
        }

        .submit-btn {
            background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
            border: none;
            padding: 16px 50px;
            font-size: 1.1rem;
            font-weight: 700;
            border-radius: 12px;
            color: white;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
        }

        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4);
        }

        @media (max-width: 768px) {
            .survey-container { padding: 0 15px; }
            .survey-form { padding: 25px 20px; }
            .survey-header { padding: 30px 20px; }
        }
    </style>
</head>
<body>
    <div class="survey-container">
        <div class="survey-header">
            <h1><i class="fas fa-flask"></i> 유해요인 기본조사표</h1>
            <p>Basic Hazard Factor Survey (Form 005)</p>
            <span class="badge">HAZARD ASSESSMENT</span>
        </div>

        <div class="survey-form">
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                <strong>조사목적:</strong> 작업환경의 유해요인을 체계적으로 파악하고 위험성을 평가하여 적절한 통제방안을 수립하기 위한 조사입니다.
            </div>

            <form id="form005" method="POST" action="/api/form/005/submit">
                <!-- Section 1: Basic Information -->
                <div class="section-title">
                    <i class="fas fa-building"></i> 기본 정보
                </div>

                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label class="form-label">회사명 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="company_name" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">사업장명 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="workplace_name" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">부서명 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="department" required>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">조사자명 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="investigator_name" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">조사일자 <span class="required">*</span></label>
                        <input type="date" class="form-control" name="investigation_date" required>
                    </div>
                </div>

                <!-- Section 2: Work Process -->
                <div class="section-title">
                    <i class="fas fa-cogs"></i> 작업공정
                </div>

                <div class="mb-3">
                    <label class="form-label">공정명 <span class="required">*</span></label>
                    <input type="text" class="form-control" name="process_name" required>
                </div>

                <div class="mb-3">
                    <label class="form-label">작업내용 <span class="required">*</span></label>
                    <textarea class="form-control" name="work_description" required placeholder="작업의 세부 내용을 기술해주세요"></textarea>
                </div>

                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label class="form-label">사용장비</label>
                        <textarea class="form-control" name="equipment_used" placeholder="사용하는 기계, 장비 등"></textarea>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">사용물질</label>
                        <textarea class="form-control" name="materials_used" placeholder="취급하는 화학물질, 원자재 등"></textarea>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">작업방법</label>
                        <textarea class="form-control" name="work_methods" placeholder="작업 수행 방법 및 절차"></textarea>
                    </div>
                </div>

                <!-- Section 3: Physical Hazards -->
                <div class="section-title">
                    <i class="fas fa-sound"></i> 물리적 유해요인
                </div>

                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label class="form-label">소음수준 <span class="required">*</span></label>
                        <select class="form-select" name="noise_level" required>
                            <option value="">선택</option>
                            <option value="85dB미만">85dB 미만</option>
                            <option value="85-90dB">85-90dB</option>
                            <option value="90-95dB">90-95dB</option>
                            <option value="95dB이상">95dB 이상</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">진동 <span class="required">*</span></label>
                        <select class="form-select" name="vibration" required>
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="전신진동">전신진동</option>
                            <option value="국소진동">국소진동</option>
                            <option value="복합진동">복합진동</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">온도 <span class="required">*</span></label>
                        <select class="form-select" name="temperature" required>
                            <option value="">선택</option>
                            <option value="적정">적정</option>
                            <option value="고온(28도이상)">고온(28°C 이상)</option>
                            <option value="저온(18도미만)">저온(18°C 미만)</option>
                            <option value="변동">변동</option>
                        </select>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label class="form-label">습도</label>
                        <select class="form-select" name="humidity">
                            <option value="">선택</option>
                            <option value="적정">적정</option>
                            <option value="고습">고습</option>
                            <option value="저습">저습</option>
                            <option value="변동">변동</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">조명 <span class="required">*</span></label>
                        <select class="form-select" name="lighting" required>
                            <option value="">선택</option>
                            <option value="충분">충분</option>
                            <option value="보통">보통</option>
                            <option value="부족">부족</option>
                            <option value="눈부심">눈부심</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">방사선</label>
                        <select class="form-select" name="radiation">
                            <option value="">선택</option>
                            <option value="해당없음">해당없음</option>
                            <option value="이온화방사선">이온화방사선</option>
                            <option value="비이온화방사선">비이온화방사선</option>
                            <option value="자외선">자외선</option>
                            <option value="적외선">적외선</option>
                        </select>
                    </div>
                </div>

                <!-- Section 4: Chemical Hazards -->
                <div class="section-title">
                    <i class="fas fa-flask"></i> 화학적 유해요인
                </div>

                <div class="mb-3">
                    <label class="form-label">화학물질</label>
                    <textarea class="form-control" name="chemical_substances" placeholder="사용하는 화학물질 명칭 및 특성"></textarea>
                </div>

                <div class="row">
                    <div class="col-md-3 mb-3">
                        <label class="form-label">노출경로</label>
                        <select class="form-select" name="exposure_route">
                            <option value="">선택</option>
                            <option value="흡입">흡입</option>
                            <option value="피부접촉">피부접촉</option>
                            <option value="경구">경구</option>
                            <option value="복합">복합</option>
                        </select>
                    </div>
                    <div class="col-md-3 mb-3">
                        <label class="form-label">농도수준</label>
                        <select class="form-select" name="concentration_level">
                            <option value="">선택</option>
                            <option value="노출기준미만">노출기준 미만</option>
                            <option value="노출기준근접">노출기준 근접</option>
                            <option value="노출기준초과">노출기준 초과</option>
                            <option value="측정필요">측정필요</option>
                        </select>
                    </div>
                    <div class="col-md-3 mb-3">
                        <label class="form-label">노출시간</label>
                        <select class="form-select" name="exposure_duration">
                            <option value="">선택</option>
                            <option value="1시간미만">1시간 미만</option>
                            <option value="1-4시간">1-4시간</option>
                            <option value="4-8시간">4-8시간</option>
                            <option value="8시간이상">8시간 이상</option>
                        </select>
                    </div>
                    <div class="col-md-3 mb-3">
                        <label class="form-label">환기상태</label>
                        <select class="form-select" name="ventilation_status">
                            <option value="">선택</option>
                            <option value="양호">양호</option>
                            <option value="보통">보통</option>
                            <option value="불량">불량</option>
                            <option value="없음">없음</option>
                        </select>
                    </div>
                </div>

                <!-- Section 5: Ergonomic Hazards -->
                <div class="section-title">
                    <i class="fas fa-user-shield"></i> 인간공학적 유해요인
                </div>

                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label class="form-label">작업자세 <span class="required">*</span></label>
                        <select class="form-select" name="work_posture" required>
                            <option value="">선택</option>
                            <option value="양호">양호</option>
                            <option value="부적절한자세">부적절한자세</option>
                            <option value="장시간동일자세">장시간 동일자세</option>
                            <option value="반복작업">반복작업</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">반복동작 <span class="required">*</span></label>
                        <select class="form-select" name="repetitive_motion" required>
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="분당10회미만">분당 10회 미만</option>
                            <option value="분당10-20회">분당 10-20회</option>
                            <option value="분당20회이상">분당 20회 이상</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">중량물취급 <span class="required">*</span></label>
                        <select class="form-select" name="manual_handling" required>
                            <option value="">선택</option>
                            <option value="5kg미만">5kg 미만</option>
                            <option value="5-18kg">5-18kg</option>
                            <option value="18-25kg">18-25kg</option>
                            <option value="25kg이상">25kg 이상</option>
                        </select>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">VDT작업</label>
                        <select class="form-select" name="display_work">
                            <option value="">선택</option>
                            <option value="해당없음">해당없음</option>
                            <option value="2시간미만">2시간 미만</option>
                            <option value="2-4시간">2-4시간</option>
                            <option value="4시간이상">4시간 이상</option>
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">작업공간설계</label>
                        <select class="form-select" name="workspace_design">
                            <option value="">선택</option>
                            <option value="적정">적정</option>
                            <option value="협소">협소</option>
                            <option value="작업대높이부적절">작업대높이 부적절</option>
                            <option value="접근성불량">접근성 불량</option>
                        </select>
                    </div>
                </div>

                <!-- Section 6: Psychosocial Hazards -->
                <div class="section-title">
                    <i class="fas fa-brain"></i> 심리사회적 유해요인
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">업무스트레스 <span class="required">*</span></label>
                        <select class="form-select" name="work_stress" required>
                            <option value="">선택</option>
                            <option value="낮음">낮음</option>
                            <option value="보통">보통</option>
                            <option value="높음">높음</option>
                            <option value="매우높음">매우 높음</option>
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">업무요구도 <span class="required">*</span></label>
                        <select class="form-select" name="job_demands" required>
                            <option value="">선택</option>
                            <option value="낮음">낮음</option>
                            <option value="보통">보통</option>
                            <option value="높음">높음</option>
                            <option value="매우높음">매우 높음</option>
                        </select>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label class="form-label">업무자율성</label>
                        <select class="form-select" name="work_control">
                            <option value="">선택</option>
                            <option value="높음">높음</option>
                            <option value="보통">보통</option>
                            <option value="낮음">낮음</option>
                            <option value="매우낮음">매우 낮음</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">사회적지지</label>
                        <select class="form-select" name="social_support">
                            <option value="">선택</option>
                            <option value="충분">충분</option>
                            <option value="보통">보통</option>
                            <option value="부족">부족</option>
                            <option value="매우부족">매우 부족</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">근무일정스트레스</label>
                        <select class="form-select" name="work_schedule_stress">
                            <option value="">선택</option>
                            <option value="낮음">낮음</option>
                            <option value="보통">보통</option>
                            <option value="높음">높음</option>
                            <option value="매우높음">매우 높음</option>
                        </select>
                    </div>
                </div>

                <!-- Section 7: Risk Assessment -->
                <div class="section-title">
                    <i class="fas fa-chart-line"></i> 위험성 평가
                </div>

                <div class="risk-matrix-help">
                    <strong>위험성 평가 기준:</strong> 유해성정도와 노출가능성을 조합하여 위험수준을 결정합니다.
                    <br>• 허용가능: 현 상태 유지
                    <br>• 관심: 주기적 관찰
                    <br>• 주의: 개선 검토
                    <br>• 경고: 조속한 개선 필요
                    <br>• 위험: 즉각 개선 필수
                </div>

                <div class="row mt-3">
                    <div class="col-md-4 mb-3">
                        <label class="form-label">유해성정도 <span class="required">*</span></label>
                        <select class="form-select" name="hazard_severity" id="hazard_severity" required>
                            <option value="">선택</option>
                            <option value="경미">경미</option>
                            <option value="보통">보통</option>
                            <option value="중대">중대</option>
                            <option value="치명적">치명적</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">노출가능성 <span class="required">*</span></label>
                        <select class="form-select" name="exposure_probability" id="exposure_probability" required>
                            <option value="">선택</option>
                            <option value="낮음">낮음</option>
                            <option value="보통">보통</option>
                            <option value="높음">높음</option>
                            <option value="매우높음">매우 높음</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">위험수준 <span class="required">*</span></label>
                        <select class="form-select" name="risk_level" id="risk_level" required>
                            <option value="">선택</option>
                            <option value="허용가능">허용가능</option>
                            <option value="관심">관심</option>
                            <option value="주의">주의</option>
                            <option value="경고">경고</option>
                            <option value="위험">위험</option>
                        </select>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label">통제방안 <span class="required">*</span></label>
                    <textarea class="form-control" name="control_measures" required placeholder="위험을 통제하기 위한 구체적인 방안을 기술해주세요"></textarea>
                </div>

                <div class="mb-3">
                    <label class="form-label">모니터링계획</label>
                    <textarea class="form-control" name="monitoring_plan" placeholder="위험요인 모니터링 및 재평가 계획"></textarea>
                </div>

                <!-- Submit Button -->
                <div class="text-center mt-4">
                    <button type="submit" class="submit-btn">
                        <i class="fas fa-paper-plane"></i> 제출하기
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Risk Matrix Calculator
        const riskMatrix = {
            '경미': {
                '낮음': '허용가능',
                '보통': '허용가능',
                '높음': '관심',
                '매우높음': '주의'
            },
            '보통': {
                '낮음': '허용가능',
                '보통': '관심',
                '높음': '주의',
                '매우높음': '경고'
            },
            '중대': {
                '낮음': '관심',
                '보통': '주의',
                '높음': '경고',
                '매우높음': '위험'
            },
            '치명적': {
                '낮음': '주의',
                '보통': '경고',
                '높음': '위험',
                '매우높음': '위험'
            }
        };

        const hazardSeveritySelect = document.getElementById('hazard_severity');
        const exposureProbabilitySelect = document.getElementById('exposure_probability');
        const riskLevelSelect = document.getElementById('risk_level');

        function calculateRiskLevel() {
            const severity = hazardSeveritySelect.value;
            const probability = exposureProbabilitySelect.value;

            if (severity && probability) {
                const calculatedRisk = riskMatrix[severity]?.[probability];
                if (calculatedRisk) {
                    riskLevelSelect.value = calculatedRisk;
                }
            }
        }

        hazardSeveritySelect?.addEventListener('change', calculateRiskLevel);
        exposureProbabilitySelect?.addEventListener('change', calculateRiskLevel);

        // Form submission
        document.getElementById('form005').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            
            try {
                const response = await fetch('/api/form/005/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('✅ 유해요인 기본조사표가 제출되었습니다!\\n제출 ID: ' + result.submissionId);
                    window.location.href = '/';
                } else {
                    alert('❌ 제출 실패: ' + (result.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('Submission error:', error);
                alert('❌ 제출 중 오류가 발생했습니다.');
            }
        });
    </script>
</body>
</html>
`;
