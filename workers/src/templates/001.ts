export const form001Template = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>근골격계 증상조사표 (001) - SafeWork</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --primary-color: #667eea;
            --primary-dark: #5568d3;
            --secondary-color: #764ba2;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --danger-color: #ef4444;
            --info-color: #3b82f6;
            --light-bg: #f8fafc;
            --card-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            --card-shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.1);
            --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        body {
            background: var(--gradient-primary);
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
            padding: 20px 0;
        }

        .survey-container {
            max-width: 1000px;
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
            box-shadow: var(--card-shadow-lg);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .survey-header h1 {
            font-size: 2.2rem;
            font-weight: 700;
            margin-bottom: 10px;
            background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .survey-header p {
            font-size: 1.1rem;
            opacity: 0.8;
            font-weight: 500;
        }

        .survey-form {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 20px;
            box-shadow: var(--card-shadow-lg);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .section-title {
            color: var(--primary-color);
            font-weight: 700;
            font-size: 1.4rem;
            margin-top: 35px;
            margin-bottom: 25px;
            padding-bottom: 12px;
            border-bottom: 3px solid #e2e8f0;
            position: relative;
        }

        .section-title::after {
            content: '';
            position: absolute;
            bottom: -3px;
            left: 0;
            width: 60px;
            height: 3px;
            background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
            border-radius: 2px;
        }

        .section-title:first-of-type {
            margin-top: 0;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-label {
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
            font-size: 0.95rem;
            display: block;
        }

        .required {
            color: var(--danger-color);
            font-weight: 700;
        }

        .form-control, .form-select {
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 10px 14px;
            font-size: 0.9rem;
            transition: all 0.3s ease;
            background: rgba(255, 255, 255, 0.9);
        }

        .form-control:focus, .form-select:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            background: white;
        }

        .pain-section {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .pain-title {
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: 15px;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .activity-group {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }

        .activity-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            background: white;
        }

        .submit-section {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
        }

        .submit-btn {
            background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
            border: none;
            padding: 16px 50px;
            font-size: 1.1rem;
            font-weight: 700;
            border-radius: 12px;
            color: white;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }

        @media (max-width: 768px) {
            .survey-container { padding: 0 15px; }
            .survey-form { padding: 25px 20px; }
            .survey-header { padding: 30px 20px; }
            .survey-header h1 { font-size: 1.8rem; }
            .activity-group { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="survey-container">
        <div class="survey-header">
            <h1><i class="fas fa-clipboard-list"></i> 근골격계 증상조사표</h1>
            <p class="mb-0">아래 사항을 직접 기입해 주시기 바랍니다</p>
        </div>

        <form id="surveyForm" class="survey-form">
            <!-- 기본 정보 -->
            <h3 class="section-title"><i class="fas fa-user"></i> 기본 정보</h3>
            <div class="row">
                <div class="col-md-3">
                    <div class="form-group">
                        <label class="form-label">사번</label>
                        <input type="text" class="form-control" name="employee_number" placeholder="사번">
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="form-group">
                        <label class="form-label">성명 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="name" required>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="form-group">
                        <label class="form-label">연령 <span class="required">*</span></label>
                        <input type="number" class="form-control" name="age" min="18" max="100" required>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="form-group">
                        <label class="form-label">성별 <span class="required">*</span></label>
                        <select class="form-control" name="gender" required>
                            <option value="">선택</option>
                            <option value="남">남</option>
                            <option value="여">여</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">현 직장 경력(년) <span class="required">*</span></label>
                        <input type="number" class="form-control" name="work_experience_years" min="0" max="50" required>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">현 직장 경력(개월) <span class="required">*</span></label>
                        <input type="number" class="form-control" name="work_experience_months" min="0" max="11" required>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">결혼여부</label>
                        <select class="form-control" name="married">
                            <option value="">선택</option>
                            <option value="기혼">기혼</option>
                            <option value="미혼">미혼</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">작업부서 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="department" required>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">라인</label>
                        <input type="text" class="form-control" name="line">
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">작업(수행작업)</label>
                        <input type="text" class="form-control" name="work_type">
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">현재하고 있는 작업(구체적으로) <span class="required">*</span></label>
                <textarea class="form-control" name="work_content" rows="3" required placeholder="현재 하고 있는 작업을 구체적으로 기술해주세요"></textarea>
            </div>

            <!-- 근무 정보 -->
            <h3 class="section-title"><i class="fas fa-clock"></i> 근무 정보</h3>
            <div class="row">
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">현재 작업 개월수</label>
                        <input type="number" class="form-control" name="current_work_months" min="0" placeholder="개월째 하고 있음">
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">1일 근무시간 <span class="required">*</span></label>
                        <input type="number" class="form-control" name="daily_work_hours" min="1" max="24" required placeholder="시간">
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">휴식시간(분)</label>
                        <input type="number" class="form-control" name="rest_time_minutes" min="0" placeholder="식사시간 제외, 분씩 휴식">
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">현작업을 하기 전에 했던 작업</label>
                <textarea class="form-control" name="previous_work" rows="2" placeholder="개월 동안 했음"></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">이전 작업 기간(개월)</label>
                <input type="number" class="form-control" name="previous_work_months" min="0" placeholder="개월">
            </div>

            <!-- 여가 및 취미활동 -->
            <h3 class="section-title"><i class="fas fa-gamepad"></i> 여가 및 취미활동</h3>
            <div class="form-group">
                <label class="form-label">규칙적인 활동 여부 (한번에 30분 이상, 1주일에 적어도 2-3회 이상)</label>
                <select class="form-control" name="regular_activity">
                    <option value="">선택</option>
                    <option value="있음">있음</option>
                    <option value="없음">없음</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">활동 빈도</label>
                <select class="form-control" name="activity_frequency">
                    <option value="">선택</option>
                    <option value="1주일에 1회 이상">1주일에 1회 이상</option>
                    <option value="1주일에 2회 이상">1주일에 2회 이상</option>
                    <option value="거의 하지 않음">거의 하지 않음</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">여가 및 취미활동을 하고 계시는 곳에 표시하여 주십시오</label>
                <div class="activity-group">
                    <div class="activity-item">
                        <input type="checkbox" name="computer_related" value="있음" id="computer">
                        <label for="computer">컴퓨터 관련활동</label>
                    </div>
                    <div class="activity-item">
                        <input type="checkbox" name="musical_instrument" value="있음" id="music">
                        <label for="music">악기연주(피아노, 바이올린)</label>
                    </div>
                    <div class="activity-item">
                        <input type="checkbox" name="handicraft" value="있음" id="handicraft">
                        <label for="handicraft">뜨개질, 자수, 붓글씨</label>
                    </div>
                    <div class="activity-item">
                        <input type="checkbox" name="sports" value="있음" id="sports">
                        <label for="sports">테니스, 배드민턴, 스쿼시, 축구, 족구, 농구, 스키</label>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label class="form-label">기타 활동</label>
                <textarea class="form-control" name="other_activity" rows="3" placeholder="기타 활동을 입력해주세요"></textarea>
            </div>

            <div class="form-group">
                <div class="activity-container">
                    <div class="activity-item">
                        <input type="checkbox" name="no_activity" value="있음" id="no_activity">
                        <label for="no_activity">해당사항 없음</label>
                    </div>
                </div>
            </div>

            <!-- 가사노동 -->
            <h3 class="section-title"><i class="fas fa-home"></i> 가사노동</h3>
            <div class="form-group">
                <label class="form-label">귀하의 하루 평균 가사노동시간(밥하기, 빨래하기, 청소하기, 5세 미만의 아이 돌보기) 얼마나 됩니까?</label>
                <select class="form-control" name="daily_household_hours">
                    <option value="">선택</option>
                    <option value="거의 하지 않는다">거의 하지 않는다</option>
                    <option value="1시간 미만">1시간 미만</option>
                    <option value="1-2시간">1-2시간</option>
                    <option value="2-3시간">2-3시간</option>
                    <option value="3시간 이상">3시간 이상</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">구체적인 가사노동 항목</label>
                <div class="activity-group">
                    <div class="activity-item">
                        <input type="checkbox" name="cooking" value="있음" id="cooking">
                        <label for="cooking">밥하기</label>
                    </div>
                    <div class="activity-item">
                        <input type="checkbox" name="laundry" value="있음" id="laundry">
                        <label for="laundry">빨래하기</label>
                    </div>
                    <div class="activity-item">
                        <input type="checkbox" name="cleaning" value="있음" id="cleaning">
                        <label for="cleaning">청소하기</label>
                    </div>
                    <div class="activity-item">
                        <input type="checkbox" name="childcare" value="있음" id="childcare">
                        <label for="childcare">5세 미만의 아이 돌보기</label>
                    </div>
                </div>
            </div>

            <!-- 의료진 진단 -->
            <h3 class="section-title"><i class="fas fa-stethoscope"></i> 의료진 진단</h3>
            <div class="form-group">
                <label class="form-label">귀하는 의사로부터 다음과 같은 질병에 대해 진단을 받으신 적이 있습니까?</label>
                <textarea class="form-control" name="medical_diagnosis" rows="3" placeholder="진단받은 질병이 있으시면 기술해주세요"></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">진단 세부사항</label>
                <textarea class="form-control" name="diagnosis_details" rows="2" placeholder="진단 관련 세부사항이 있으시면 기술해주세요"></textarea>
            </div>

            <!-- 신체 부위별 통증 평가 -->
            <h3 class="section-title"><i class="fas fa-user-injured"></i> 신체 부위별 통증 평가</h3>
            <p class="text-muted mb-4">각 신체 부위에 대해 해당하는 증상을 선택해주세요.</p>

            <!-- 목 부위 -->
            <div class="pain-section">
                <h4 class="pain-title"><i class="fas fa-head-side-cough"></i> 목 부위</h4>
                <div class="row">
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">통증 빈도</label>
                            <select class="form-control" name="neck_pain_frequency">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="가끔">가끔</option>
                                <option value="자주">자주</option>
                                <option value="항상">항상</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">통증 지속기간</label>
                            <select class="form-control" name="neck_pain_duration">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="1주일 미만">1주일 미만</option>
                                <option value="1주일 이상">1주일 이상</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">통증 강도</label>
                            <select class="form-control" name="neck_pain_intensity">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="약한 통증">약한 통증</option>
                                <option value="중간 정도">중간 정도</option>
                                <option value="심한 통증">심한 통증</option>
                                <option value="매우 심한 통증">매우 심한 통증</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">업무 지장도</label>
                            <select class="form-control" name="neck_work_interference">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="있음">있음</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 어깨 부위 -->
            <div class="pain-section">
                <h4 class="pain-title"><i class="fas fa-user-injured"></i> 어깨 부위</h4>
                <div class="row">
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">통증 빈도</label>
                            <select class="form-control" name="shoulder_pain_frequency">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="가끔">가끔</option>
                                <option value="자주">자주</option>
                                <option value="항상">항상</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">통증 지속기간</label>
                            <select class="form-control" name="shoulder_pain_duration">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="1주일 미만">1주일 미만</option>
                                <option value="1주일 이상">1주일 이상</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">통증 강도</label>
                            <select class="form-control" name="shoulder_pain_intensity">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="약한 통증">약한 통증</option>
                                <option value="중간 정도">중간 정도</option>
                                <option value="심한 통증">심한 통증</option>
                                <option value="매우 심한 통증">매우 심한 통증</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">업무 지장도</label>
                            <select class="form-control" name="shoulder_work_interference">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="있음">있음</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 팔/팔꿈치 부위 -->
            <div class="pain-section">
                <h4 class="pain-title"><i class="fas fa-arm"></i> 팔/팔꿈치 부위</h4>
                <div class="row">
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">통증 빈도</label>
                            <select class="form-control" name="arm_elbow_pain_frequency">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="가끔">가끔</option>
                                <option value="자주">자주</option>
                                <option value="항상">항상</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">통증 지속기간</label>
                            <select class="form-control" name="arm_elbow_pain_duration">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="1주일 미만">1주일 미만</option>
                                <option value="1주일 이상">1주일 이상</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">통증 강도</label>
                            <select class="form-control" name="arm_elbow_pain_intensity">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="약한 통증">약한 통증</option>
                                <option value="중간 정도">중간 정도</option>
                                <option value="심한 통증">심한 통증</option>
                                <option value="매우 심한 통증">매우 심한 통증</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">업무 지장도</label>
                            <select class="form-control" name="arm_elbow_work_interference">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="있음">있음</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 손목/손 부위 -->
            <div class="pain-section">
                <h4 class="pain-title"><i class="fas fa-hand"></i> 손목/손 부위</h4>
                <div class="row">
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">통증 빈도</label>
                            <select class="form-control" name="wrist_hand_pain_frequency">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="가끔">가끔</option>
                                <option value="자주">자주</option>
                                <option value="항상">항상</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">통증 지속기간</label>
                            <select class="form-control" name="wrist_hand_pain_duration">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="1주일 미만">1주일 미만</option>
                                <option value="1주일 이상">1주일 이상</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">통증 강도</label>
                            <select class="form-control" name="wrist_hand_pain_intensity">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="약한 통증">약한 통증</option>
                                <option value="중간 정도">중간 정도</option>
                                <option value="심한 통증">심한 통증</option>
                                <option value="매우 심한 통증">매우 심한 통증</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">업무 지장도</label>
                            <select class="form-control" name="wrist_hand_work_interference">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="있음">있음</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 허리 부위 -->
            <div class="pain-section">
                <h4 class="pain-title"><i class="fas fa-spine"></i> 허리 부위</h4>
                <div class="row">
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">통증 빈도</label>
                            <select class="form-control" name="back_pain_frequency">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="가끔">가끔</option>
                                <option value="자주">자주</option>
                                <option value="항상">항상</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">통증 지속기간</label>
                            <select class="form-control" name="back_pain_duration">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="1주일 미만">1주일 미만</option>
                                <option value="1주일 이상">1주일 이상</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">통증 강도</label>
                            <select class="form-control" name="back_pain_intensity">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="약한 통증">약한 통증</option>
                                <option value="중간 정도">중간 정도</option>
                                <option value="심한 통증">심한 통증</option>
                                <option value="매우 심한 통증">매우 심한 통증</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">업무 지장도</label>
                            <select class="form-control" name="back_work_interference">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="있음">있음</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 다리/발 부위 -->
            <div class="pain-section">
                <h4 class="pain-title"><i class="fas fa-running"></i> 다리/발 부위</h4>
                <div class="row">
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">통증 빈도</label>
                            <select class="form-control" name="leg_foot_pain_frequency">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="가끔">가끔</option>
                                <option value="자주">자주</option>
                                <option value="항상">항상</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">통증 지속기간</label>
                            <select class="form-control" name="leg_foot_pain_duration">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="1주일 미만">1주일 미만</option>
                                <option value="1주일 이상">1주일 이상</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">통증 강도</label>
                            <select class="form-control" name="leg_foot_pain_intensity">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="약한 통증">약한 통증</option>
                                <option value="중간 정도">중간 정도</option>
                                <option value="심한 통증">심한 통증</option>
                                <option value="매우 심한 통증">매우 심한 통증</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-group">
                            <label class="form-label">업무 지장도</label>
                            <select class="form-control" name="leg_foot_work_interference">
                                <option value="">선택</option>
                                <option value="없음">없음</option>
                                <option value="있음">있음</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div class="submit-section">
                <button type="submit" class="submit-btn">
                    <i class="fas fa-paper-plane"></i> 증상조사표 제출
                </button>
            </div>
        </form>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        document.getElementById('surveyForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const data = {};

            // FormData를 객체로 변환
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }

            // 체크박스 처리 (체크되지 않은 항목은 "없음"으로 설정)
            const checkboxFields = ['computer_related', 'musical_instrument', 'handicraft', 'sports', 'no_activity', 'cooking', 'laundry', 'cleaning', 'childcare'];
            checkboxFields.forEach(field => {
                if (!data[field]) {
                    data[field] = '없음';
                }
            });

            // 데이터 검증
            const requiredFields = ['name', 'age', 'gender', 'work_experience_years', 'work_experience_months', 'department', 'work_content', 'daily_work_hours'];
            const missingFields = requiredFields.filter(field => !data[field]);

            if (missingFields.length > 0) {
                alert('필수 항목을 모두 입력해주세요.');
                return;
            }

            try {
                const response = await fetch('/api/survey/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        form_type: '001_musculoskeletal_symptom_survey',
                        response_data: data,
                        is_anonymous: true
                    })
                });

                const result = await response.json();

                if (result.success) {
                    alert('증상조사표가 성공적으로 제출되었습니다.');
                    // 002 프로그램 페이지로 리다이렉트 (결과와 함께)
                    const encodedData = encodeURIComponent(JSON.stringify(data));
                    window.location.href = '/survey/002_musculoskeletal_symptom_program?data=' + encodedData;
                } else {
                    alert('제출 중 오류가 발생했습니다: ' + result.error);
                }
            } catch (error) {
                console.error('Submit error:', error);
                alert('제출 중 오류가 발생했습니다. 다시 시도해주세요.');
            }
        });

        // 해당사항 없음 체크시 다른 활동 체크박스 해제
        document.getElementById('no_activity').addEventListener('change', function() {
            if (this.checked) {
                ['computer', 'music', 'handicraft', 'sports'].forEach(id => {
                    document.getElementById(id).checked = false;
                });
            }
        });

        // 다른 활동 체크시 해당사항 없음 해제
        ['computer', 'music', 'handicraft', 'sports'].forEach(id => {
            document.getElementById(id).addEventListener('change', function() {
                if (this.checked) {
                    document.getElementById('no_activity').checked = false;
                }
            });
        });
    </script>
</body>
</html>
`;