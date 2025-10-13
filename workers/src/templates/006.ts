/**
 * Form 006 Template: 고령근로자 작업투입 승인요청서
 * Elderly Worker Assignment Approval Request Form
 */

export const form006Template = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>고령근로자 작업투입 승인요청서 (006) - SafeWork</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --primary-color: #0891b2;
            --primary-dark: #0e7490;
            --secondary-color: #06b6d4;
            --accent-color: #22d3ee;
        }

        body {
            background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
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
            border-bottom: 3px solid #cffafe;
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

        .form-control, .form-select, .form-control[type="date"], .form-control[type="tel"] {
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 10px 14px;
            transition: all 0.3s;
        }

        .form-control:focus, .form-select:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(8, 145, 178, 0.1);
        }

        textarea.form-control {
            min-height: 100px;
        }

        .alert-info {
            background: linear-gradient(135deg, #cffafe, #a5f3fc);
            border: 2px solid #06b6d4;
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
            box-shadow: 0 4px 15px rgba(8, 145, 178, 0.3);
        }

        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(8, 145, 178, 0.4);
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
            <h1><i class="fas fa-user-clock"></i> 고령근로자 작업투입 승인요청서</h1>
            <p>Elderly Worker Assignment Approval Request Form (Form 006)</p>
            <span class="badge">ELDERLY WORKER MANAGEMENT</span>
        </div>

        <div class="survey-form">
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                <strong>안내:</strong> 50세 이상 고령근로자의 안전한 작업 배치를 위한 승인요청서입니다. 
                모든 항목을 정확히 작성하여 주시기 바랍니다.
            </div>

            <form id="form006" method="POST" action="/api/form/006/submit">
                <!-- Section 1: Basic Information -->
                <div class="section-title">
                    <i class="fas fa-file-alt"></i> 기본 정보
                </div>

                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label class="form-label">요청일자 <span class="required">*</span></label>
                        <input type="date" class="form-control" name="request_date" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">회사명 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="company_name" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">부서명 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="department" required>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">담당관리자 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="manager_name" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">연락처 <span class="required">*</span></label>
                        <input type="tel" class="form-control" name="contact_number" placeholder="010-1234-5678" required>
                    </div>
                </div>

                <!-- Section 2: Worker Information -->
                <div class="section-title">
                    <i class="fas fa-user"></i> 근로자 정보
                </div>

                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label class="form-label">근로자명 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="worker_name" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">연령 (50세 이상) <span class="required">*</span></label>
                        <input type="number" class="form-control" name="worker_age" min="50" max="100" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">성별 <span class="required">*</span></label>
                        <select class="form-select" name="worker_gender" required>
                            <option value="">선택</option>
                            <option value="남">남</option>
                            <option value="여">여</option>
                        </select>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">고용형태 <span class="required">*</span></label>
                        <select class="form-select" name="employment_type" required>
                            <option value="">선택</option>
                            <option value="정규직">정규직</option>
                            <option value="계약직">계약직</option>
                            <option value="일용직">일용직</option>
                            <option value="파견근로자">파견근로자</option>
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">작업시작예정일 <span class="required">*</span></label>
                        <input type="date" class="form-control" name="start_date" required>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label">이전근무경력</label>
                    <textarea class="form-control" name="previous_experience" placeholder="이전 작업 경력 및 경험사항"></textarea>
                </div>

                <!-- Section 3: Health Status -->
                <div class="section-title">
                    <i class="fas fa-heartbeat"></i> 건강상태
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">건강검진일자 <span class="required">*</span></label>
                        <input type="date" class="form-control" name="health_checkup_date" id="health_checkup_date" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">건강상태 <span class="required">*</span></label>
                        <select class="form-select" name="health_status" required>
                            <option value="">선택</option>
                            <option value="양호">양호</option>
                            <option value="보통">보통</option>
                            <option value="주의">주의</option>
                            <option value="부적합">부적합</option>
                        </select>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">만성질환</label>
                        <textarea class="form-control" name="chronic_diseases" placeholder="고혈압, 당뇨 등 만성질환 보유 여부"></textarea>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">복용약물</label>
                        <textarea class="form-control" name="medication_status" placeholder="현재 복용 중인 약물"></textarea>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">신체적제한사항</label>
                        <textarea class="form-control" name="physical_limitations" placeholder="작업 수행 시 고려해야 할 신체적 제한사항"></textarea>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">의사소견</label>
                        <textarea class="form-control" name="doctor_opinion" placeholder="건강검진 시 의사의 소견"></textarea>
                    </div>
                </div>

                <!-- Section 4: Work Assignment -->
                <div class="section-title">
                    <i class="fas fa-briefcase"></i> 작업배정
                </div>

                <div class="mb-3">
                    <label class="form-label">배정작업 <span class="required">*</span></label>
                    <textarea class="form-control" name="assigned_work" required placeholder="배정할 구체적인 작업내용"></textarea>
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">작업장소 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="work_location" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">근무일정 <span class="required">*</span></label>
                        <select class="form-select" name="work_schedule" required>
                            <option value="">선택</option>
                            <option value="주간">주간</option>
                            <option value="야간">야간</option>
                            <option value="교대">교대</option>
                            <option value="단시간">단시간</option>
                        </select>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label">육체적부담 <span class="required">*</span></label>
                    <select class="form-select" name="physical_demands" required>
                        <option value="">선택</option>
                        <option value="가벼움">가벼움</option>
                        <option value="보통">보통</option>
                        <option value="무거움">무거움</option>
                        <option value="적응필요">적응필요</option>
                    </select>
                </div>

                <div class="mb-3">
                    <label class="form-label">위험요인 <span class="required">*</span></label>
                    <textarea class="form-control" name="hazard_factors" required placeholder="작업 중 예상되는 위험요인"></textarea>
                </div>

                <div class="mb-3">
                    <label class="form-label">안전조치사항 <span class="required">*</span></label>
                    <textarea class="form-control" name="safety_measures" required placeholder="위험요인에 대한 안전조치 계획"></textarea>
                </div>

                <!-- Section 5: Safety Management -->
                <div class="section-title">
                    <i class="fas fa-shield-alt"></i> 안전관리
                </div>

                <div class="row">
                    <div class="col-md-4 mb-3">
                        <label class="form-label">안전교육 <span class="required">*</span></label>
                        <select class="form-select" name="safety_education" required>
                            <option value="">선택</option>
                            <option value="완료">완료</option>
                            <option value="계획">계획</option>
                            <option value="진행중">진행중</option>
                            <option value="미실시">미실시</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">지정감독자 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="supervisor_assignment" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label class="form-label">정기모니터링 <span class="required">*</span></label>
                        <select class="form-select" name="regular_monitoring" required>
                            <option value="">선택</option>
                            <option value="일일">일일</option>
                            <option value="주간">주간</option>
                            <option value="월간">월간</option>
                            <option value="분기">분기</option>
                        </select>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label">보호구지급 <span class="required">*</span></label>
                    <textarea class="form-control" name="protective_equipment" required placeholder="지급할 개인보호구 목록"></textarea>
                </div>

                <div class="mb-3">
                    <label class="form-label">비상시절차 <span class="required">*</span></label>
                    <textarea class="form-control" name="emergency_procedures" required placeholder="응급상황 발생 시 조치절차"></textarea>
                </div>

                <!-- Section 6: Approval (Optional) -->
                <div class="section-title">
                    <i class="fas fa-check-circle"></i> 승인 (관리자 작성)
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">승인상태</label>
                        <select class="form-select" name="approval_status">
                            <option value="">선택</option>
                            <option value="승인">승인</option>
                            <option value="조건부승인">조건부승인</option>
                            <option value="반려">반려</option>
                            <option value="검토중">검토중</option>
                        </select>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">재검토주기</label>
                        <select class="form-select" name="review_period">
                            <option value="">선택</option>
                            <option value="1개월">1개월</option>
                            <option value="3개월">3개월</option>
                            <option value="6개월">6개월</option>
                            <option value="1년">1년</option>
                        </select>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">승인자</label>
                        <input type="text" class="form-control" name="approved_by">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">승인일자</label>
                        <input type="date" class="form-control" name="approval_date">
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label">승인조건</label>
                    <textarea class="form-control" name="approval_conditions" placeholder="조건부 승인 시 이행 조건"></textarea>
                </div>

                <div class="mb-3">
                    <label class="form-label">특이사항</label>
                    <textarea class="form-control" name="comments" placeholder="기타 특이사항 또는 참고사항"></textarea>
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
        const healthCheckupDateInput = document.getElementById('health_checkup_date');
        const startDateInput = document.querySelector('input[name="start_date"]');

        // Health checkup date must be within 2 years
        healthCheckupDateInput?.addEventListener('change', function() {
            const checkupDate = new Date(this.value);
            const today = new Date();
            const twoYearsAgo = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());

            if (checkupDate < twoYearsAgo) {
                alert('⚠️ 건강검진일자는 최근 2년 이내여야 합니다.');
                this.value = '';
            }

            if (checkupDate > today) {
                alert('⚠️ 건강검진일자는 미래일 수 없습니다.');
                this.value = '';
            }
        });

        // Start date must be today or future
        startDateInput?.addEventListener('change', function() {
            const startDate = new Date(this.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (startDate < today) {
                alert('⚠️ 작업시작예정일은 오늘 이후여야 합니다.');
                this.value = '';
            }
        });

        // Form submission
        document.getElementById('form006').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            
            try {
                const response = await fetch('/api/form/006/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('✅ 고령근로자 작업투입 승인요청서가 제출되었습니다!\\n제출 ID: ' + result.submissionId);
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
