/**
 * Form 003 Template: 근골격계질환 예방관리 프로그램 조사표
 * Musculoskeletal Disease Prevention Program Survey
 */

export const form003Template = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>근골격계질환 예방관리 프로그램 조사표 (003) - SafeWork</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --primary-color: #10b981;
            --primary-dark: #059669;
            --success-color: #059669;
            --warning-color: #f59e0b;
            --danger-color: #ef4444;
            --light-bg: #f0fdf4;
        }

        body {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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

        .survey-header p {
            font-size: 1rem;
            opacity: 0.8;
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
            border-bottom: 3px solid #d1fae5;
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

        .form-control, .form-select {
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 10px 14px;
            transition: all 0.3s;
        }

        .form-control:focus, .form-select:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .body-part-card {
            background: #f0fdf4;
            border: 2px solid #d1fae5;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .body-part-title {
            font-weight: 700;
            color: var(--primary-dark);
            margin-bottom: 15px;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .pain-fields {
            display: none;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 2px dashed #d1fae5;
        }

        .pain-fields.active {
            display: block;
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
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }

        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
        }

        .alert-info {
            background: linear-gradient(135deg, #dbeafe, #bfdbfe);
            border: 2px solid #3b82f6;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 25px;
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
            <h1><i class="fas fa-heartbeat"></i> 근골격계질환 예방관리 프로그램 조사표</h1>
            <p>Musculoskeletal Disease Prevention Program Survey (Form 003)</p>
        </div>

        <div class="survey-form">
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                <strong>안내:</strong> 본 조사는 근골격계 질환 예방을 위한 건강 상태 조사입니다. 
                해당하는 신체 부위의 통증 여부를 체크하시고, 통증이 있는 경우 상세 정보를 입력해주세요.
            </div>

            <form id="form003" method="POST" action="/api/form/003/submit">
                <!-- Section 1: Basic Information -->
                <div class="section-title">
                    <i class="fas fa-user"></i> 기본 정보
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">성명 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="name" required>
                    </div>
                    <div class="col-md-3 mb-3">
                        <label class="form-label">나이 <span class="required">*</span></label>
                        <input type="number" class="form-control" name="age" min="18" max="100" required>
                    </div>
                    <div class="col-md-3 mb-3">
                        <label class="form-label">성별 <span class="required">*</span></label>
                        <select class="form-select" name="gender" required>
                            <option value="">선택</option>
                            <option value="남성">남성</option>
                            <option value="여성">여성</option>
                        </select>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">부서/팀</label>
                        <input type="text" class="form-control" name="department">
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">직위/직책</label>
                        <input type="text" class="form-control" name="position">
                    </div>
                </div>

                <!-- Section 2: Body Parts Pain Survey -->
                <div class="section-title">
                    <i class="fas fa-notes-medical"></i> 신체 부위별 통증 조사
                </div>

                <!-- Neck -->
                <div class="body-part-card">
                    <div class="body-part-title">
                        <span style="font-size: 1.5rem;">🔴</span> 목 (Neck)
                    </div>
                    <div class="form-check">
                        <input class="form-check-input pain-checkbox" type="checkbox" id="neck_pain" name="neck_pain" data-target="neck_fields">
                        <label class="form-check-label" for="neck_pain">
                            통증 있음
                        </label>
                    </div>
                    <div id="neck_fields" class="pain-fields">
                        <div class="row">
                            <div class="col-md-3 mb-3">
                                <label class="form-label">지속기간</label>
                                <select class="form-select" name="neck_duration">
                                    <option value="">선택</option>
                                    <option value="1일미만">1일미만</option>
                                    <option value="1-7일">1-7일</option>
                                    <option value="1주일이상">1주일이상</option>
                                    <option value="1-4주">1-4주</option>
                                    <option value="1-6개월">1-6개월</option>
                                    <option value="6개월이상">6개월이상</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label">통증강도 (1-10)</label>
                                <select class="form-select" name="neck_intensity">
                                    <option value="">선택</option>
                                    <option value="1">1 (약함)</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                    <option value="5">5 (보통)</option>
                                    <option value="6">6</option>
                                    <option value="7">7</option>
                                    <option value="8">8</option>
                                    <option value="9">9</option>
                                    <option value="10">10 (심함)</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label">발생빈도</label>
                                <select class="form-select" name="neck_frequency">
                                    <option value="">선택</option>
                                    <option value="월1회미만">월1회미만</option>
                                    <option value="월1-3회">월1-3회</option>
                                    <option value="주1-2회">주1-2회</option>
                                    <option value="주3-4회">주3-4회</option>
                                    <option value="매일">매일</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label">일상생활 지장</label>
                                <select class="form-select" name="neck_interference">
                                    <option value="">선택</option>
                                    <option value="없음">없음</option>
                                    <option value="약간">약간</option>
                                    <option value="보통">보통</option>
                                    <option value="심함">심함</option>
                                    <option value="매우심함">매우심함</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Shoulder -->
                <div class="body-part-card">
                    <div class="body-part-title">
                        <span style="font-size: 1.5rem;">🟠</span> 어깨 (Shoulder)
                    </div>
                    <div class="form-check">
                        <input class="form-check-input pain-checkbox" type="checkbox" id="shoulder_pain" name="shoulder_pain" data-target="shoulder_fields">
                        <label class="form-check-label" for="shoulder_pain">
                            통증 있음
                        </label>
                    </div>
                    <div id="shoulder_fields" class="pain-fields">
                        <div class="row">
                            <div class="col-md-3 mb-3">
                                <label class="form-label">지속기간</label>
                                <select class="form-select" name="shoulder_duration">
                                    <option value="">선택</option>
                                    <option value="1일미만">1일미만</option>
                                    <option value="1-7일">1-7일</option>
                                    <option value="1주일이상">1주일이상</option>
                                    <option value="1-4주">1-4주</option>
                                    <option value="1-6개월">1-6개월</option>
                                    <option value="6개월이상">6개월이상</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label">통증강도 (1-10)</label>
                                <select class="form-select" name="shoulder_intensity">
                                    <option value="">선택</option>
                                    <option value="1">1 (약함)</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                    <option value="5">5 (보통)</option>
                                    <option value="6">6</option>
                                    <option value="7">7</option>
                                    <option value="8">8</option>
                                    <option value="9">9</option>
                                    <option value="10">10 (심함)</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label">발생빈도</label>
                                <select class="form-select" name="shoulder_frequency">
                                    <option value="">선택</option>
                                    <option value="월1회미만">월1회미만</option>
                                    <option value="월1-3회">월1-3회</option>
                                    <option value="주1-2회">주1-2회</option>
                                    <option value="주3-4회">주3-4회</option>
                                    <option value="매일">매일</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label">일상생활 지장</label>
                                <select class="form-select" name="shoulder_interference">
                                    <option value="">선택</option>
                                    <option value="없음">없음</option>
                                    <option value="약간">약간</option>
                                    <option value="보통">보통</option>
                                    <option value="심함">심함</option>
                                    <option value="매우심함">매우심함</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Arm/Elbow -->
                <div class="body-part-card">
                    <div class="body-part-title">
                        <span style="font-size: 1.5rem;">🟡</span> 팔/팔꿈치 (Arm/Elbow)
                    </div>
                    <div class="form-check">
                        <input class="form-check-input pain-checkbox" type="checkbox" id="arm_pain" name="arm_pain" data-target="arm_fields">
                        <label class="form-check-label" for="arm_pain">
                            통증 있음
                        </label>
                    </div>
                    <div id="arm_fields" class="pain-fields">
                        <div class="row">
                            <div class="col-md-3 mb-3">
                                <label class="form-label">지속기간</label>
                                <select class="form-select" name="arm_duration">
                                    <option value="">선택</option>
                                    <option value="1일미만">1일미만</option>
                                    <option value="1-7일">1-7일</option>
                                    <option value="1주일이상">1주일이상</option>
                                    <option value="1-4주">1-4주</option>
                                    <option value="1-6개월">1-6개월</option>
                                    <option value="6개월이상">6개월이상</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label">통증강도 (1-10)</label>
                                <select class="form-select" name="arm_intensity">
                                    <option value="">선택</option>
                                    <option value="1">1 (약함)</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                    <option value="5">5 (보통)</option>
                                    <option value="6">6</option>
                                    <option value="7">7</option>
                                    <option value="8">8</option>
                                    <option value="9">9</option>
                                    <option value="10">10 (심함)</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label">발생빈도</label>
                                <select class="form-select" name="arm_frequency">
                                    <option value="">선택</option>
                                    <option value="월1회미만">월1회미만</option>
                                    <option value="월1-3회">월1-3회</option>
                                    <option value="주1-2회">주1-2회</option>
                                    <option value="주3-4회">주3-4회</option>
                                    <option value="매일">매일</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label">일상생활 지장</label>
                                <select class="form-select" name="arm_interference">
                                    <option value="">선택</option>
                                    <option value="없음">없음</option>
                                    <option value="약간">약간</option>
                                    <option value="보통">보통</option>
                                    <option value="심함">심함</option>
                                    <option value="매우심함">매우심함</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Hand/Wrist -->
                <div class="body-part-card">
                    <div class="body-part-title">
                        <span style="font-size: 1.5rem;">🟢</span> 손/손목 (Hand/Wrist)
                    </div>
                    <div class="form-check">
                        <input class="form-check-input pain-checkbox" type="checkbox" id="hand_pain" name="hand_pain" data-target="hand_fields">
                        <label class="form-check-label" for="hand_pain">
                            통증 있음
                        </label>
                    </div>
                    <div id="hand_fields" class="pain-fields">
                        <div class="row">
                            <div class="col-md-3 mb-3">
                                <label class="form-label">지속기간</label>
                                <select class="form-select" name="hand_duration">
                                    <option value="">선택</option>
                                    <option value="1일미만">1일미만</option>
                                    <option value="1-7일">1-7일</option>
                                    <option value="1주일이상">1주일이상</option>
                                    <option value="1-4주">1-4주</option>
                                    <option value="1-6개월">1-6개월</option>
                                    <option value="6개월이상">6개월이상</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label">통증강도 (1-10)</label>
                                <select class="form-select" name="hand_intensity">
                                    <option value="">선택</option>
                                    <option value="1">1 (약함)</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                    <option value="5">5 (보통)</option>
                                    <option value="6">6</option>
                                    <option value="7">7</option>
                                    <option value="8">8</option>
                                    <option value="9">9</option>
                                    <option value="10">10 (심함)</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label">발생빈도</label>
                                <select class="form-select" name="hand_frequency">
                                    <option value="">선택</option>
                                    <option value="월1회미만">월1회미만</option>
                                    <option value="월1-3회">월1-3회</option>
                                    <option value="주1-2회">주1-2회</option>
                                    <option value="주3-4회">주3-4회</option>
                                    <option value="매일">매일</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label">일상생활 지장</label>
                                <select class="form-select" name="hand_interference">
                                    <option value="">선택</option>
                                    <option value="없음">없음</option>
                                    <option value="약간">약간</option>
                                    <option value="보통">보통</option>
                                    <option value="심함">심함</option>
                                    <option value="매우심함">매우심함</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Waist/Lower Back -->
                <div class="body-part-card">
                    <div class="body-part-title">
                        <span style="font-size: 1.5rem;">🔵</span> 허리 (Waist/Lower Back)
                    </div>
                    <div class="form-check">
                        <input class="form-check-input pain-checkbox" type="checkbox" id="waist_pain" name="waist_pain" data-target="waist_fields">
                        <label class="form-check-label" for="waist_pain">
                            통증 있음
                        </label>
                    </div>
                    <div id="waist_fields" class="pain-fields">
                        <div class="row">
                            <div class="col-md-3 mb-3">
                                <label class="form-label">지속기간</label>
                                <select class="form-select" name="waist_duration">
                                    <option value="">선택</option>
                                    <option value="1일미만">1일미만</option>
                                    <option value="1-7일">1-7일</option>
                                    <option value="1주일이상">1주일이상</option>
                                    <option value="1-4주">1-4주</option>
                                    <option value="1-6개월">1-6개월</option>
                                    <option value="6개월이상">6개월이상</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label">통증강도 (1-10)</label>
                                <select class="form-select" name="waist_intensity">
                                    <option value="">선택</option>
                                    <option value="1">1 (약함)</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                    <option value="5">5 (보통)</option>
                                    <option value="6">6</option>
                                    <option value="7">7</option>
                                    <option value="8">8</option>
                                    <option value="9">9</option>
                                    <option value="10">10 (심함)</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label">발생빈도</label>
                                <select class="form-select" name="waist_frequency">
                                    <option value="">선택</option>
                                    <option value="월1회미만">월1회미만</option>
                                    <option value="월1-3회">월1-3회</option>
                                    <option value="주1-2회">주1-2회</option>
                                    <option value="주3-4회">주3-4회</option>
                                    <option value="매일">매일</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label">일상생활 지장</label>
                                <select class="form-select" name="waist_interference">
                                    <option value="">선택</option>
                                    <option value="없음">없음</option>
                                    <option value="약간">약간</option>
                                    <option value="보통">보통</option>
                                    <option value="심함">심함</option>
                                    <option value="매우심함">매우심함</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Leg/Foot -->
                <div class="body-part-card">
                    <div class="body-part-title">
                        <span style="font-size: 1.5rem;">🟣</span> 다리/발 (Leg/Foot)
                    </div>
                    <div class="form-check">
                        <input class="form-check-input pain-checkbox" type="checkbox" id="leg_pain" name="leg_pain" data-target="leg_fields">
                        <label class="form-check-label" for="leg_pain">
                            통증 있음
                        </label>
                    </div>
                    <div id="leg_fields" class="pain-fields">
                        <div class="row">
                            <div class="col-md-3 mb-3">
                                <label class="form-label">지속기간</label>
                                <select class="form-select" name="leg_duration">
                                    <option value="">선택</option>
                                    <option value="1일미만">1일미만</option>
                                    <option value="1-7일">1-7일</option>
                                    <option value="1주일이상">1주일이상</option>
                                    <option value="1-4주">1-4주</option>
                                    <option value="1-6개월">1-6개월</option>
                                    <option value="6개월이상">6개월이상</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label">통증강도 (1-10)</label>
                                <select class="form-select" name="leg_intensity">
                                    <option value="">선택</option>
                                    <option value="1">1 (약함)</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                    <option value="5">5 (보통)</option>
                                    <option value="6">6</option>
                                    <option value="7">7</option>
                                    <option value="8">8</option>
                                    <option value="9">9</option>
                                    <option value="10">10 (심함)</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label">발생빈도</label>
                                <select class="form-select" name="leg_frequency">
                                    <option value="">선택</option>
                                    <option value="월1회미만">월1회미만</option>
                                    <option value="월1-3회">월1-3회</option>
                                    <option value="주1-2회">주1-2회</option>
                                    <option value="주3-4회">주3-4회</option>
                                    <option value="매일">매일</option>
                                </select>
                            </div>
                            <div class="col-md-3 mb-3">
                                <label class="form-label">일상생활 지장</label>
                                <select class="form-select" name="leg_interference">
                                    <option value="">선택</option>
                                    <option value="없음">없음</option>
                                    <option value="약간">약간</option>
                                    <option value="보통">보통</option>
                                    <option value="심함">심함</option>
                                    <option value="매우심함">매우심함</option>
                                </select>
                            </div>
                        </div>
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
        // Toggle pain detail fields based on checkbox
        document.querySelectorAll('.pain-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const targetId = this.dataset.target;
                const targetFields = document.getElementById(targetId);
                if (this.checked) {
                    targetFields.classList.add('active');
                } else {
                    targetFields.classList.remove('active');
                    // Clear fields when unchecked
                    targetFields.querySelectorAll('select').forEach(select => select.value = '');
                }
            });
        });

        // Form submission
        document.getElementById('form003').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            
            try {
                const response = await fetch('/api/form/003/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('✅ 제출이 완료되었습니다!\\n제출 ID: ' + result.submissionId);
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
