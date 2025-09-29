export const form002Template = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>근골격계질환 증상조사표 (002) - SafeWork</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary-color: #2563eb;
            --primary-dark: #1d4ed8;
            --success-color: #059669;
            --warning-color: #d97706;
            --danger-color: #dc2626;
            --light-bg: #f8fafc;
            --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --card-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

        .notice-box {
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            border: 2px solid #f59e0b;
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 30px;
            font-size: 0.9rem;
            color: #92400e;
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
            margin-bottom: 25px;
        }

        .form-label {
            font-weight: 600;
            color: #374151;
            margin-bottom: 10px;
            font-size: 0.95rem;
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .required {
            color: var(--danger-color);
            font-weight: 700;
        }

        .form-control, .form-select {
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 12px 16px;
            font-size: 0.95rem;
            transition: all 0.3s ease;
            background: rgba(255, 255, 255, 0.9);
        }

        .form-control:focus, .form-select:focus {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
            background: white;
        }

        .pain-section {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 16px;
            padding: 25px;
            margin-bottom: 25px;
            transition: all 0.3s ease;
        }

        .pain-section:hover {
            border-color: #cbd5e1;
            box-shadow: var(--card-shadow);
        }

        .pain-title {
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: 20px;
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .pain-questions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
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
            box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
        }

        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(37, 99, 235, 0.4);
            background: linear-gradient(135deg, var(--primary-dark), #1e40af);
        }

        @media (max-width: 768px) {
            .survey-container { padding: 0 15px; }
            .survey-form { padding: 25px 20px; }
            .survey-header { padding: 30px 20px; }
            .survey-header h1 { font-size: 1.8rem; }
            .pain-questions { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="survey-container">
        <div class="survey-header">
            <h1><i class="fas fa-clipboard-list"></i> 근골격계질환 증상조사표</h1>
            <p class="mb-0">근골격계부담작업 유해요인조사 (002)</p>
        </div>

        <div class="notice-box">
            <strong><i class="fas fa-exclamation-triangle"></i> 주의사항</strong><br>
            ※ 「근골격계부담작업 유해요인조사 지침」 양식 활용<br>
            ※ 본 평가 결과는 '의학적 관리'나 '법률적 판단' 등의 기준 및 근거자료로 사용되기 힘듬을 알려드립니다.
        </div>

        <form id="surveyForm" class="survey-form">
            <!-- 기본 정보 -->
            <h3 class="section-title"><i class="fas fa-user"></i> 기본 정보</h3>
            <div class="row">
                <div class="col-md-2">
                    <div class="form-group">
                        <label class="form-label">번호 <span class="required">*</span></label>
                        <input type="number" class="form-control" name="number" required>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="form-group">
                        <label class="form-label">성명 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="name" required>
                    </div>
                </div>
                <div class="col-md-2">
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
                            <option value="1">남</option>
                            <option value="2">여</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="form-group">
                        <label class="form-label">현 직장 경력(년) <span class="required">*</span></label>
                        <input type="number" class="form-control" name="work_experience" min="0" max="50" required>
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
                        <label class="form-label">결혼여부</label>
                        <select class="form-control" name="married">
                            <option value="">선택</option>
                            <option value="1">기혼</option>
                            <option value="2">미혼</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- 작업 정보 -->
            <h3 class="section-title"><i class="fas fa-briefcase"></i> 작업 정보</h3>
            <div class="row">
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">라인</label>
                        <input type="text" class="form-control" name="line">
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">작업</label>
                        <input type="text" class="form-control" name="work_type">
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">작업기간</label>
                        <input type="text" class="form-control" name="work_period">
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label class="form-label">작업내용</label>
                        <textarea class="form-control" name="work_content" rows="3" placeholder="현재 주요 작업내용을 기술해주세요"></textarea>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="form-group">
                        <label class="form-label">현재 작업 기간(년)</label>
                        <input type="number" class="form-control" name="current_work_period" min="0" step="0.1">
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="form-group">
                        <label class="form-label">1일 근무시간</label>
                        <input type="number" class="form-control" name="daily_work_hours" min="1" max="24" step="0.5">
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-3">
                    <div class="form-group">
                        <label class="form-label">휴식시간</label>
                        <input type="number" class="form-control" name="rest_time" min="0" step="0.5">
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="form-group">
                        <label class="form-label">이전 작업 기간(년)</label>
                        <input type="number" class="form-control" name="previous_work_period" min="0" step="0.1">
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label class="form-label">이전 작업내용</label>
                        <textarea class="form-control" name="previous_work_content" rows="2" placeholder="이전 작업내용이 있으면 기술해주세요"></textarea>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">1. 여가 및 취미활동</label>
                        <textarea class="form-control" name="leisure_activity" rows="2" placeholder="여가활동이나 취미에 대해 기술해주세요"></textarea>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">2. 하루 가사노동</label>
                        <textarea class="form-control" name="household_work" rows="2" placeholder="평균적인 가사노동 시간이나 내용을 기술해주세요"></textarea>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">3. 의사 진단</label>
                        <textarea class="form-control" name="medical_diagnosis" rows="2" placeholder="관련 질환의 의사 진단이 있으면 기술해주세요"></textarea>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label class="form-label">5. 육체적 부담정도</label>
                        <select class="form-control" name="physical_burden">
                            <option value="">선택</option>
                            <option value="매우 가벼움">매우 가벼움</option>
                            <option value="가벼움">가벼움</option>
                            <option value="보통">보통</option>
                            <option value="무거움">무거움</option>
                            <option value="매우 무거움">매우 무거움</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- 목 부위 통증 평가 -->
            <div class="pain-section">
                <h4 class="pain-title"><i class="fas fa-head-side-cough"></i> 목 부위 통증 평가</h4>
                <div class="pain-questions">
                    <div class="form-group">
                        <label class="form-label">2번: 통증 기간</label>
                        <select class="form-control" name="목_2">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="1주일 미만">1주일 미만</option>
                            <option value="1주일 이상">1주일 이상 지속</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">3번: 통증 강도</label>
                        <select class="form-control" name="목_3">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="약한 통증">약한 통증</option>
                            <option value="중간 정도">중간 정도</option>
                            <option value="심한 통증">심한 통증</option>
                            <option value="매우 심한 통증">매우 심한 통증</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">4번: 통증 빈도</label>
                        <select class="form-control" name="목_4">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="1달에 1회 미만">1달에 1회 미만</option>
                            <option value="1달에 1-3회">1달에 1-3회</option>
                            <option value="1주일에 1-2회">1주일에 1-2회</option>
                            <option value="매일">매일</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">5번: 증상 심화</label>
                        <select class="form-control" name="목_5">
                            <option value="">선택</option>
                            <option value="아니오">아니오</option>
                            <option value="예">예</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">6번: 기타</label>
                        <select class="form-control" name="목_6">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="있음">있음</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- 어깨 부위 통증 평가 -->
            <div class="pain-section">
                <h4 class="pain-title"><i class="fas fa-user-injured"></i> 어깨 부위 통증 평가</h4>
                <div class="pain-questions">
                    <div class="form-group">
                        <label class="form-label">1번: 통증 여부</label>
                        <select class="form-control" name="어깨_1">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="있음">있음</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">2번: 통증 기간</label>
                        <select class="form-control" name="어깨_2">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="1주일 미만">1주일 미만</option>
                            <option value="1주일 이상">1주일 이상 지속</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">3번: 통증 강도</label>
                        <select class="form-control" name="어깨_3">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="약한 통증">약한 통증</option>
                            <option value="중간 정도">중간 정도</option>
                            <option value="심한 통증">심한 통증</option>
                            <option value="매우 심한 통증">매우 심한 통증</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">4번: 통증 빈도</label>
                        <select class="form-control" name="어깨_4">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="1달에 1회 미만">1달에 1회 미만</option>
                            <option value="1달에 1-3회">1달에 1-3회</option>
                            <option value="1주일에 1-2회">1주일에 1-2회</option>
                            <option value="매일">매일</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">5번: 증상 심화</label>
                        <select class="form-control" name="어깨_5">
                            <option value="">선택</option>
                            <option value="아니오">아니오</option>
                            <option value="예">예</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">6번: 기타</label>
                        <select class="form-control" name="어깨_6">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="있음">있음</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- 팔/팔꿈치 부위 통증 평가 -->
            <div class="pain-section">
                <h4 class="pain-title"><i class="fas fa-hand-paper"></i> 팔/팔꿈치 부위 통증 평가</h4>
                <div class="pain-questions">
                    <div class="form-group">
                        <label class="form-label">1번: 통증 여부</label>
                        <select class="form-control" name="팔꿈치_1">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="있음">있음</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">2번: 통증 기간</label>
                        <select class="form-control" name="팔꿈치_2">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="1주일 미만">1주일 미만</option>
                            <option value="1주일 이상">1주일 이상 지속</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">3번: 통증 강도</label>
                        <select class="form-control" name="팔꿈치_3">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="약한 통증">약한 통증</option>
                            <option value="중간 정도">중간 정도</option>
                            <option value="심한 통증">심한 통증</option>
                            <option value="매우 심한 통증">매우 심한 통증</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">4번: 통증 빈도</label>
                        <select class="form-control" name="팔꿈치_4">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="1달에 1회 미만">1달에 1회 미만</option>
                            <option value="1달에 1-3회">1달에 1-3회</option>
                            <option value="1주일에 1-2회">1주일에 1-2회</option>
                            <option value="매일">매일</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">5번: 증상 심화</label>
                        <select class="form-control" name="팔꿈치_5">
                            <option value="">선택</option>
                            <option value="아니오">아니오</option>
                            <option value="예">예</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">6번: 기타</label>
                        <select class="form-control" name="팔꿈치_6">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="있음">있음</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- 손/손목/손가락 부위 통증 평가 -->
            <div class="pain-section">
                <h4 class="pain-title"><i class="fas fa-hand-rock"></i> 손/손목/손가락 부위 통증 평가</h4>
                <div class="pain-questions">
                    <div class="form-group">
                        <label class="form-label">1번: 통증 여부</label>
                        <select class="form-control" name="손목_1">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="있음">있음</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">2번: 통증 기간</label>
                        <select class="form-control" name="손목_2">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="1주일 미만">1주일 미만</option>
                            <option value="1주일 이상">1주일 이상 지속</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">3번: 통증 강도</label>
                        <select class="form-control" name="손목_3">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="약한 통증">약한 통증</option>
                            <option value="중간 정도">중간 정도</option>
                            <option value="심한 통증">심한 통증</option>
                            <option value="매우 심한 통증">매우 심한 통증</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">4번: 통증 빈도</label>
                        <select class="form-control" name="손목_4">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="1달에 1회 미만">1달에 1회 미만</option>
                            <option value="1달에 1-3회">1달에 1-3회</option>
                            <option value="1주일에 1-2회">1주일에 1-2회</option>
                            <option value="매일">매일</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">5번: 증상 심화</label>
                        <select class="form-control" name="손목_5">
                            <option value="">선택</option>
                            <option value="아니오">아니오</option>
                            <option value="예">예</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">6번: 기타</label>
                        <select class="form-control" name="손목_6">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="있음">있음</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- 허리 부위 통증 평가 -->
            <div class="pain-section">
                <h4 class="pain-title"><i class="fas fa-user-plus"></i> 허리 부위 통증 평가</h4>
                <div class="pain-questions">
                    <div class="form-group">
                        <label class="form-label">2번: 통증 기간</label>
                        <select class="form-control" name="허리_2">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="1주일 미만">1주일 미만</option>
                            <option value="1주일 이상">1주일 이상 지속</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">3번: 통증 강도</label>
                        <select class="form-control" name="허리_3">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="약한 통증">약한 통증</option>
                            <option value="중간 정도">중간 정도</option>
                            <option value="심한 통증">심한 통증</option>
                            <option value="매우 심한 통증">매우 심한 통증</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">4번: 통증 빈도</label>
                        <select class="form-control" name="허리_4">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="1달에 1회 미만">1달에 1회 미만</option>
                            <option value="1달에 1-3회">1달에 1-3회</option>
                            <option value="1주일에 1-2회">1주일에 1-2회</option>
                            <option value="매일">매일</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">5번: 증상 심화</label>
                        <select class="form-control" name="허리_5">
                            <option value="">선택</option>
                            <option value="아니오">아니오</option>
                            <option value="예">예</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">6번: 기타</label>
                        <select class="form-control" name="허리_6">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="있음">있음</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- 다리/발 부위 통증 평가 -->
            <div class="pain-section">
                <h4 class="pain-title"><i class="fas fa-running"></i> 다리/발 부위 통증 평가</h4>
                <div class="pain-questions">
                    <div class="form-group">
                        <label class="form-label">1번: 통증 여부</label>
                        <select class="form-control" name="다리_1">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="있음">있음</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">2번: 통증 기간</label>
                        <select class="form-control" name="다리_2">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="1주일 미만">1주일 미만</option>
                            <option value="1주일 이상">1주일 이상 지속</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">3번: 통증 강도</label>
                        <select class="form-control" name="다리_3">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="약한 통증">약한 통증</option>
                            <option value="중간 정도">중간 정도</option>
                            <option value="심한 통증">심한 통증</option>
                            <option value="매우 심한 통증">매우 심한 통증</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">4번: 통증 빈도</label>
                        <select class="form-control" name="다리_4">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="1달에 1회 미만">1달에 1회 미만</option>
                            <option value="1달에 1-3회">1달에 1-3회</option>
                            <option value="1주일에 1-2회">1주일에 1-2회</option>
                            <option value="매일">매일</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">5번: 증상 심화</label>
                        <select class="form-control" name="다리_5">
                            <option value="">선택</option>
                            <option value="아니오">아니오</option>
                            <option value="예">예</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">6번: 기타</label>
                        <select class="form-control" name="다리_6">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="있음">있음</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="submit-section">
                <button type="submit" class="btn btn-primary submit-btn">
                    <i class="fas fa-paper-plane"></i> 근골격계질환 증상조사표 제출
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

            // 필수 필드 검증
            const requiredFields = ['number', 'name', 'age', 'gender', 'work_experience', 'department'];
            const missingFields = requiredFields.filter(field => !data[field]);

            if (missingFields.length > 0) {
                alert('필수 항목을 모두 입력해주세요: ' + missingFields.join(', '));
                return;
            }

            try {
                const response = await fetch('/api/survey/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        form_type: '002_musculoskeletal_symptom_program',
                        response_data: data,
                        is_anonymous: true
                    })
                });

                const result = await response.json();

                if (result.success) {
                    alert('근골격계질환 증상조사표가 성공적으로 제출되었습니다!');
                    // 메인 페이지로 이동
                    window.location.href = '/';
                } else {
                    alert('제출 중 오류가 발생했습니다: ' + result.error);
                }
            } catch (error) {
                console.error('Submit error:', error);
                alert('제출 중 오류가 발생했습니다. 다시 시도해주세요.');
            }
        });
    </script>
</body>
</html>
`;