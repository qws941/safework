/**
 * Form 004 Template: 산업재해 실태조사표
 * Industrial Accident Survey
 */

export const form004Template = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>산업재해 실태조사표 (004) - SafeWork</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --primary-color: #f97316;
            --primary-dark: #ea580c;
            --danger-color: #dc2626;
            --warning-color: #f59e0b;
        }

        body {
            background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
            min-height: 100vh;
            font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
            padding: 20px 0;
        }

        .survey-container {
            max-width: 1100px;
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
            background: var(--danger-color);
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
            border-bottom: 3px solid #fed7aa;
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
            color: var(--danger-color);
        }

        .form-control, .form-select, .form-control[type="date"] {
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 10px 14px;
            transition: all 0.3s;
        }

        .form-control:focus, .form-select:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
        }

        textarea.form-control {
            min-height: 100px;
        }

        .alert-warning {
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            border: 2px solid #f59e0b;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 25px;
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
            box-shadow: 0 4px 15px rgba(249, 115, 22, 0.3);
        }

        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(249, 115, 22, 0.4);
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
            <h1><i class="fas fa-exclamation-triangle"></i> 산업재해 실태조사표</h1>
            <p>Industrial Accident Survey (Form 004)</p>
            <span class="badge">ACCIDENT REPORT</span>
        </div>

        <div class="survey-form">
            <div class="alert alert-warning">
                <i class="fas fa-info-circle"></i>
                <strong>중요:</strong> 산업재해 발생 시 정확한 조사를 위해 모든 항목을 상세히 기재해주시기 바랍니다.
            </div>

            <form id="form004" method="POST" action="/api/form/004/submit">
                <!-- Section 1: Basic Information -->
                <div class="section-title">
                    <i class="fas fa-building"></i> 기본 정보
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">회사명 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="company_name" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">부서명 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="department" required>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label class="form-label">조사자명 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="investigator_name" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">조사일자 <span class="required">*</span></label>
                        <input type="date" class="form-control" name="investigation_date" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">재해발생일자 <span class="required">*</span></label>
                        <input type="date" class="form-control" name="accident_date" required>
                    </div>
                </div>

                <!-- Section 2: Victim Information -->
                <div class="section-title">
                    <i class="fas fa-user-injured"></i> 피재자 정보
                </div>

                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label class="form-label">피재자명 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="victim_name" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">연령 <span class="required">*</span></label>
                        <input type="number" class="form-control" name="victim_age" min="18" max="80" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">성별 <span class="required">*</span></label>
                        <select class="form-select" name="victim_gender" required>
                            <option value="">선택</option>
                            <option value="남">남</option>
                            <option value="여">여</option>
                        </select>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label class="form-label">고용형태 <span class="required">*</span></label>
                        <select class="form-select" name="employment_type" required>
                            <option value="">선택</option>
                            <option value="정규직">정규직</option>
                            <option value="계약직">계약직</option>
                            <option value="일용직">일용직</option>
                            <option value="파견근로자">파견근로자</option>
                            <option value="하청업체">하청업체</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">근무경력(개월) <span class="required">*</span></label>
                        <input type="number" class="form-control" name="work_experience" min="0" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">안전교육이수 <span class="required">*</span></label>
                        <select class="form-select" name="training_status" required>
                            <option value="">선택</option>
                            <option value="완료">완료</option>
                            <option value="부분완료">부분완료</option>
                            <option value="미이수">미이수</option>
                            <option value="해당없음">해당없음</option>
                        </select>
                    </div>
                </div>

                <!-- Section 3: Accident Information -->
                <div class="section-title">
                    <i class="fas fa-ambulance"></i> 재해 발생 정보
                </div>

                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label class="form-label">재해형태 <span class="required">*</span></label>
                        <select class="form-select" name="accident_type" required>
                            <option value="">선택</option>
                            <option value="추락">추락</option>
                            <option value="전도">전도</option>
                            <option value="충돌">충돌</option>
                            <option value="낙하비래">낙하비래</option>
                            <option value="붕괴도괴">붕괴도괴</option>
                            <option value="끼임">끼임</option>
                            <option value="절단베임">절단베임</option>
                            <option value="화재폭발">화재폭발</option>
                            <option value="중독질식">중독질식</option>
                            <option value="감전">감전</option>
                            <option value="온도관련">온도관련</option>
                            <option value="기타">기타</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">상해종류 <span class="required">*</span></label>
                        <select class="form-select" name="injury_type" required>
                            <option value="">선택</option>
                            <option value="골절">골절</option>
                            <option value="타박상">타박상</option>
                            <option value="열상">열상</option>
                            <option value="화상">화상</option>
                            <option value="중독">중독</option>
                            <option value="질식">질식</option>
                            <option value="감전상">감전상</option>
                            <option value="동상">동상</option>
                            <option value="열사병">열사병</option>
                            <option value="기타">기타</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">부상부위 <span class="required">*</span></label>
                        <select class="form-select" name="body_part" required>
                            <option value="">선택</option>
                            <option value="머리">머리</option>
                            <option value="목">목</option>
                            <option value="가슴">가슴</option>
                            <option value="복부">복부</option>
                            <option value="등허리">등허리</option>
                            <option value="팔">팔</option>
                            <option value="손">손</option>
                            <option value="다리">다리</option>
                            <option value="발">발</option>
                            <option value="전신">전신</option>
                            <option value="기타">기타</option>
                        </select>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">재해발생장소 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="accident_location" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">작업공정 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="work_process" required>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label">재해원인 <span class="required">*</span></label>
                    <textarea class="form-control" name="accident_cause" required placeholder="재해가 발생한 원인을 상세히 기술해주세요"></textarea>
                </div>

                <!-- Section 4: Work Environment -->
                <div class="section-title">
                    <i class="fas fa-hard-hat"></i> 작업환경
                </div>

                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label class="form-label">기상상태</label>
                        <select class="form-select" name="weather_conditions">
                            <option value="">선택</option>
                            <option value="맑음">맑음</option>
                            <option value="흐림">흐림</option>
                            <option value="비">비</option>
                            <option value="눈">눈</option>
                            <option value="바람">바람</option>
                            <option value="기타">기타</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">조명상태</label>
                        <select class="form-select" name="lighting_conditions">
                            <option value="">선택</option>
                            <option value="양호">양호</option>
                            <option value="보통">보통</option>
                            <option value="불량">불량</option>
                            <option value="야간작업">야간작업</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">안전설비상태 <span class="required">*</span></label>
                        <select class="form-select" name="safety_equipment" required>
                            <option value="">선택</option>
                            <option value="정상">정상</option>
                            <option value="불량">불량</option>
                            <option value="미설치">미설치</option>
                            <option value="해당없음">해당없음</option>
                        </select>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">보호구착용 <span class="required">*</span></label>
                        <select class="form-select" name="protective_equipment_used" required>
                            <option value="">선택</option>
                            <option value="완전착용">완전착용</option>
                            <option value="부분착용">부분착용</option>
                            <option value="미착용">미착용</option>
                            <option value="해당없음">해당없음</option>
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">안전절차준수 <span class="required">*</span></label>
                        <select class="form-select" name="safety_procedures" required>
                            <option value="">선택</option>
                            <option value="완전준수">완전준수</option>
                            <option value="부분준수">부분준수</option>
                            <option value="미준수">미준수</option>
                            <option value="절차없음">절차없음</option>
                        </select>
                    </div>
                </div>

                <!-- Section 5: Cause Analysis -->
                <div class="section-title">
                    <i class="fas fa-search"></i> 원인 분석
                </div>

                <div class="mb-3">
                    <label class="form-label">직접원인 <span class="required">*</span></label>
                    <textarea class="form-control" name="immediate_cause" required placeholder="재해의 직접적인 원인을 기술해주세요"></textarea>
                </div>

                <div class="mb-3">
                    <label class="form-label">기본원인 <span class="required">*</span></label>
                    <textarea class="form-control" name="basic_cause" required placeholder="재해의 기본적인 원인을 기술해주세요"></textarea>
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">관리적원인</label>
                        <textarea class="form-control" name="management_cause" placeholder="관리상의 문제점"></textarea>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">인적요인</label>
                        <textarea class="form-control" name="human_factors" placeholder="작업자의 행동, 판단 등"></textarea>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">물적요인</label>
                        <textarea class="form-control" name="equipment_factors" placeholder="기계, 설비, 도구 등"></textarea>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">환경적요인</label>
                        <textarea class="form-control" name="environmental_factors" placeholder="작업환경, 기상조건 등"></textarea>
                    </div>
                </div>

                <!-- Section 6: Prevention Measures -->
                <div class="section-title">
                    <i class="fas fa-shield-alt"></i> 예방대책
                </div>

                <div class="mb-3">
                    <label class="form-label">즉시조치사항 <span class="required">*</span></label>
                    <textarea class="form-control" name="immediate_measures" required placeholder="재해 직후 즉시 취한 조치사항"></textarea>
                </div>

                <div class="mb-3">
                    <label class="form-label">단기대책 <span class="required">*</span></label>
                    <textarea class="form-control" name="short_term_measures" required placeholder="1개월 이내 실시할 재발방지 대책"></textarea>
                </div>

                <div class="mb-3">
                    <label class="form-label">중장기대책</label>
                    <textarea class="form-control" name="long_term_measures" placeholder="3개월~1년 이내 실시할 근본적인 개선대책"></textarea>
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">교육대책</label>
                        <textarea class="form-control" name="education_measures" placeholder="안전교육 계획 및 실시방안"></textarea>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">설비개선사항</label>
                        <textarea class="form-control" name="equipment_improvements" placeholder="기계, 설비 개선 계획"></textarea>
                    </div>
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
        // Date validation
        const accidentDateInput = document.querySelector('input[name="accident_date"]');
        const investigationDateInput = document.querySelector('input[name="investigation_date"]');

        function validateDates() {
            if (accidentDateInput.value && investigationDateInput.value) {
                const accidentDate = new Date(accidentDateInput.value);
                const investigationDate = new Date(investigationDateInput.value);

                if (accidentDate > investigationDate) {
                    alert('⚠️ 재해발생일자는 조사일자보다 이전이어야 합니다.');
                    accidentDateInput.value = '';
                }
            }
        }

        accidentDateInput?.addEventListener('change', validateDates);
        investigationDateInput?.addEventListener('change', validateDates);

        // Form submission
        document.getElementById('form004').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            
            try {
                const response = await fetch('/api/form/004/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('✅ 산업재해 조사표가 제출되었습니다!\\n제출 ID: ' + result.submissionId);
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
