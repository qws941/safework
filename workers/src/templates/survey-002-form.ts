/**
 * SafeWork 002 Survey Form Template
 * 근골격계질환 증상조사표 (완전판) - 56 fields
 */

export const survey002FormTemplate = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>근골격계질환 증상조사표 - SafeWork</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
  <style>
    body {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 0;
    }
    .form-container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 15px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px;
    }
    .form-header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 3px solid #667eea;
    }
    .form-header h1 {
      color: #667eea;
      font-size: 2.5rem;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .form-header p {
      color: #666;
      font-size: 1.1rem;
    }
    .section-card {
      background: #f8f9fa;
      border-radius: 10px;
      padding: 25px;
      margin-bottom: 25px;
      border-left: 5px solid #667eea;
    }
    .section-title {
      color: #667eea;
      font-size: 1.5rem;
      font-weight: bold;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .pain-section {
      background: linear-gradient(to right, #fff5f5, #ffffff);
      border-left-color: #dc3545;
    }
    .pain-section .section-title {
      color: #dc3545;
    }
    .form-label {
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
    }
    .required-field::after {
      content: " *";
      color: #dc3545;
    }
    .btn-submit {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      padding: 15px 50px;
      font-size: 1.2rem;
      font-weight: bold;
      border-radius: 50px;
      transition: transform 0.2s;
    }
    .btn-submit:hover {
      transform: scale(1.05);
    }
    .pain-accordion .accordion-item {
      border: none;
      margin-bottom: 10px;
      border-radius: 8px;
      overflow: hidden;
    }
    .pain-accordion .accordion-button {
      background: linear-gradient(to right, #fff5f5, #ffe5e5);
      font-weight: bold;
      color: #dc3545;
    }
    .pain-accordion .accordion-button:not(.collapsed) {
      background: linear-gradient(to right, #dc3545, #c82333);
      color: white;
    }
    .pain-question {
      background: white;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 15px;
      border-left: 3px solid #dc3545;
    }
    .progress-bar-custom {
      position: fixed;
      top: 0;
      left: 0;
      width: 0%;
      height: 4px;
      background: linear-gradient(to right, #667eea, #764ba2);
      transition: width 0.3s;
      z-index: 9999;
    }
    .success-message {
      display: none;
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      z-index: 10000;
    }
    .overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
    }
  </style>
</head>
<body>
  <div class="progress-bar-custom" id="progress-bar"></div>
  <div class="overlay" id="overlay"></div>

  <div class="form-container">
    <div class="form-header">
      <h1><i class="bi bi-clipboard-heart"></i> 근골격계질환 증상조사표</h1>
      <p>근골격계부담작업 유해요인조사를 위한 증상조사표 (완전판)</p>
      <p class="text-muted"><small><span class="text-danger">*</span> 표시는 필수 입력 항목입니다</small></p>
    </div>

    <form id="survey-form">
      <!-- Section 1: 기본 정보 -->
      <div class="section-card">
        <h2 class="section-title">
          <i class="bi bi-person-badge"></i> 1. 기본 정보
        </h2>

        <div class="row mb-3">
          <div class="col-md-4">
            <label class="form-label required-field">#</label>
            <input type="number" class="form-control" name="number" required>
          </div>
          <div class="col-md-4">
            <label class="form-label required-field">성명</label>
            <input type="text" class="form-control" name="name" required>
          </div>
          <div class="col-md-4">
            <label class="form-label required-field">연령</label>
            <input type="number" class="form-control" name="age" required min="18" max="100">
          </div>
        </div>

        <div class="row mb-3">
          <div class="col-md-4">
            <label class="form-label required-field">성별</label>
            <select class="form-select" name="gender" required>
              <option value="">선택하세요</option>
              <option value="남">남</option>
              <option value="여">여</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label required-field">현 직장 경력(년)</label>
            <input type="number" class="form-control" name="work_experience" required min="0">
          </div>
          <div class="col-md-4">
            <label class="form-label">결혼여부</label>
            <select class="form-select" name="married">
              <option value="">선택하세요</option>
              <option value="기혼">기혼</option>
              <option value="미혼">미혼</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Section 2: 작업 정보 -->
      <div class="section-card">
        <h2 class="section-title">
          <i class="bi bi-briefcase"></i> 2. 작업 정보
        </h2>

        <div class="row mb-3">
          <div class="col-md-6">
            <label class="form-label required-field">작업부서</label>
            <input type="text" class="form-control" name="department" required>
          </div>
          <div class="col-md-3">
            <label class="form-label">라인</label>
            <input type="text" class="form-control" name="line">
          </div>
          <div class="col-md-3">
            <label class="form-label">작업</label>
            <input type="text" class="form-control" name="work_type">
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label">작업내용</label>
          <textarea class="form-control" name="work_content" rows="3"></textarea>
        </div>

        <div class="row mb-3">
          <div class="col-md-4">
            <label class="form-label">작업기간</label>
            <input type="text" class="form-control" name="work_period" placeholder="예: 2020-2024">
          </div>
          <div class="col-md-4">
            <label class="form-label">현재 작업 기간(년)</label>
            <input type="number" class="form-control" name="current_work_period" min="0">
          </div>
          <div class="col-md-4">
            <label class="form-label">1일 근무시간</label>
            <input type="number" class="form-control" name="daily_work_hours" min="0" max="24">
          </div>
        </div>

        <div class="row mb-3">
          <div class="col-md-12">
            <label class="form-label">휴식시간(분)</label>
            <input type="number" class="form-control" name="rest_time" min="0">
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label">이전 작업내용</label>
          <textarea class="form-control" name="previous_work_content" rows="2"></textarea>
        </div>

        <div class="mb-3">
          <label class="form-label">이전 작업 기간(년)</label>
          <input type="number" class="form-control" name="previous_work_period" min="0">
        </div>

        <div class="mb-3">
          <label class="form-label">여가 및 취미활동</label>
          <textarea class="form-control" name="leisure_activity" rows="2"></textarea>
        </div>

        <div class="mb-3">
          <label class="form-label">하루 가사노동</label>
          <textarea class="form-control" name="household_work" rows="2"></textarea>
        </div>

        <div class="mb-3">
          <label class="form-label">의사 진단</label>
          <textarea class="form-control" name="medical_diagnosis" rows="2"></textarea>
        </div>

        <div class="mb-3">
          <label class="form-label">육체적 부담정도</label>
          <select class="form-select" name="physical_burden">
            <option value="">선택하세요</option>
            <option value="매우 가벼움">매우 가벼움</option>
            <option value="가벼움">가벼움</option>
            <option value="보통">보통</option>
            <option value="무거움">무거움</option>
            <option value="매우 무거움">매우 무거움</option>
          </select>
        </div>
      </div>

      <!-- Section 3-8: 통증 평가 섹션 (아코디언) -->
      <div class="section-card pain-section">
        <h2 class="section-title">
          <i class="bi bi-activity"></i> 3. 신체 부위별 통증 평가
        </h2>
        <p class="text-muted mb-3">각 신체 부위에 대해 아래 질문에 답변해 주세요</p>

        <div class="accordion pain-accordion" id="painAccordion">
          <!-- 목 부위 -->
          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#pain-neck">
                <i class="bi bi-person-standing me-2"></i> 목 부위 통증
              </button>
            </h2>
            <div id="pain-neck" class="accordion-collapse collapse" data-bs-parent="#painAccordion">
              <div class="accordion-body">
                <div class="pain-question">
                  <label class="form-label">1. 통증이나 불편함이 있습니까?</label>
                  <select class="form-select" name="목_1">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="있음">있음</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">2. 증상이 얼마나 지속되었습니까?</label>
                  <select class="form-select" name="목_2">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="1주일 미만">1주일 미만</option>
                    <option value="1주일 이상 지속">1주일 이상 지속</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">3. 통증의 강도는?</label>
                  <select class="form-select" name="목_3">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="약한 통증">약한 통증</option>
                    <option value="중간 정도">중간 정도</option>
                    <option value="심한 통증">심한 통증</option>
                    <option value="매우 심한 통증">매우 심한 통증</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">4. 얼마나 자주 통증이 발생합니까?</label>
                  <select class="form-select" name="목_4">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="1달에 1회 미만">1달에 1회 미만</option>
                    <option value="1달에 1-3회">1달에 1-3회</option>
                    <option value="1주일에 1-2회">1주일에 1-2회</option>
                    <option value="매일">매일</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">5. 증상이 악화되었습니까?</label>
                  <select class="form-select" name="목_5">
                    <option value="">선택하세요</option>
                    <option value="아니오">아니오</option>
                    <option value="예">예</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">6. 기타 증상이 있습니까?</label>
                  <select class="form-select" name="목_6">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="있음">있음</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- 어깨 부위 -->
          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#pain-shoulder">
                <i class="bi bi-person-standing me-2"></i> 어깨 부위 통증
              </button>
            </h2>
            <div id="pain-shoulder" class="accordion-collapse collapse" data-bs-parent="#painAccordion">
              <div class="accordion-body">
                <div class="pain-question">
                  <label class="form-label">1. 통증이나 불편함이 있습니까?</label>
                  <select class="form-select" name="어깨_1">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="있음">있음</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">2. 증상이 얼마나 지속되었습니까?</label>
                  <select class="form-select" name="어깨_2">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="1주일 미만">1주일 미만</option>
                    <option value="1주일 이상 지속">1주일 이상 지속</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">3. 통증의 강도는?</label>
                  <select class="form-select" name="어깨_3">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="약한 통증">약한 통증</option>
                    <option value="중간 정도">중간 정도</option>
                    <option value="심한 통증">심한 통증</option>
                    <option value="매우 심한 통증">매우 심한 통증</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">4. 얼마나 자주 통증이 발생합니까?</label>
                  <select class="form-select" name="어깨_4">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="1달에 1회 미만">1달에 1회 미만</option>
                    <option value="1달에 1-3회">1달에 1-3회</option>
                    <option value="1주일에 1-2회">1주일에 1-2회</option>
                    <option value="매일">매일</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">5. 증상이 악화되었습니까?</label>
                  <select class="form-select" name="어깨_5">
                    <option value="">선택하세요</option>
                    <option value="아니오">아니오</option>
                    <option value="예">예</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">6. 기타 증상이 있습니까?</label>
                  <select class="form-select" name="어깨_6">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="있음">있음</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- 팔꿈치 부위 -->
          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#pain-elbow">
                <i class="bi bi-person-standing me-2"></i> 팔꿈치 부위 통증
              </button>
            </h2>
            <div id="pain-elbow" class="accordion-collapse collapse" data-bs-parent="#painAccordion">
              <div class="accordion-body">
                <div class="pain-question">
                  <label class="form-label">1. 통증이나 불편함이 있습니까?</label>
                  <select class="form-select" name="팔꿈치_1">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="있음">있음</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">2. 증상이 얼마나 지속되었습니까?</label>
                  <select class="form-select" name="팔꿈치_2">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="1주일 미만">1주일 미만</option>
                    <option value="1주일 이상 지속">1주일 이상 지속</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">3. 통증의 강도는?</label>
                  <select class="form-select" name="팔꿈치_3">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="약한 통증">약한 통증</option>
                    <option value="중간 정도">중간 정도</option>
                    <option value="심한 통증">심한 통증</option>
                    <option value="매우 심한 통증">매우 심한 통증</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">4. 얼마나 자주 통증이 발생합니까?</label>
                  <select class="form-select" name="팔꿈치_4">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="1달에 1회 미만">1달에 1회 미만</option>
                    <option value="1달에 1-3회">1달에 1-3회</option>
                    <option value="1주일에 1-2회">1주일에 1-2회</option>
                    <option value="매일">매일</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">5. 증상이 악화되었습니까?</label>
                  <select class="form-select" name="팔꿈치_5">
                    <option value="">선택하세요</option>
                    <option value="아니오">아니오</option>
                    <option value="예">예</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">6. 기타 증상이 있습니까?</label>
                  <select class="form-select" name="팔꿈치_6">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="있음">있음</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- 손목 부위 -->
          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#pain-wrist">
                <i class="bi bi-person-standing me-2"></i> 손목 부위 통증
              </button>
            </h2>
            <div id="pain-wrist" class="accordion-collapse collapse" data-bs-parent="#painAccordion">
              <div class="accordion-body">
                <div class="pain-question">
                  <label class="form-label">1. 통증이나 불편함이 있습니까?</label>
                  <select class="form-select" name="손목_1">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="있음">있음</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">2. 증상이 얼마나 지속되었습니까?</label>
                  <select class="form-select" name="손목_2">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="1주일 미만">1주일 미만</option>
                    <option value="1주일 이상 지속">1주일 이상 지속</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">3. 통증의 강도는?</label>
                  <select class="form-select" name="손목_3">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="약한 통증">약한 통증</option>
                    <option value="중간 정도">중간 정도</option>
                    <option value="심한 통증">심한 통증</option>
                    <option value="매우 심한 통증">매우 심한 통증</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">4. 얼마나 자주 통증이 발생합니까?</label>
                  <select class="form-select" name="손목_4">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="1달에 1회 미만">1달에 1회 미만</option>
                    <option value="1달에 1-3회">1달에 1-3회</option>
                    <option value="1주일에 1-2회">1주일에 1-2회</option>
                    <option value="매일">매일</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">5. 증상이 악화되었습니까?</label>
                  <select class="form-select" name="손목_5">
                    <option value="">선택하세요</option>
                    <option value="아니오">아니오</option>
                    <option value="예">예</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">6. 기타 증상이 있습니까?</label>
                  <select class="form-select" name="손목_6">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="있음">있음</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- 허리 부위 -->
          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#pain-back">
                <i class="bi bi-person-standing me-2"></i> 허리 부위 통증
              </button>
            </h2>
            <div id="pain-back" class="accordion-collapse collapse" data-bs-parent="#painAccordion">
              <div class="accordion-body">
                <div class="pain-question">
                  <label class="form-label">1. 통증이나 불편함이 있습니까?</label>
                  <select class="form-select" name="허리_1">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="있음">있음</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">2. 증상이 얼마나 지속되었습니까?</label>
                  <select class="form-select" name="허리_2">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="1주일 미만">1주일 미만</option>
                    <option value="1주일 이상 지속">1주일 이상 지속</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">3. 통증의 강도는?</label>
                  <select class="form-select" name="허리_3">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="약한 통증">약한 통증</option>
                    <option value="중간 정도">중간 정도</option>
                    <option value="심한 통증">심한 통증</option>
                    <option value="매우 심한 통증">매우 심한 통증</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">4. 얼마나 자주 통증이 발생합니까?</label>
                  <select class="form-select" name="허리_4">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="1달에 1회 미만">1달에 1회 미만</option>
                    <option value="1달에 1-3회">1달에 1-3회</option>
                    <option value="1주일에 1-2회">1주일에 1-2회</option>
                    <option value="매일">매일</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">5. 증상이 악화되었습니까?</label>
                  <select class="form-select" name="허리_5">
                    <option value="">선택하세요</option>
                    <option value="아니오">아니오</option>
                    <option value="예">예</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">6. 기타 증상이 있습니까?</label>
                  <select class="form-select" name="허리_6">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="있음">있음</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- 다리 부위 -->
          <div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#pain-leg">
                <i class="bi bi-person-standing me-2"></i> 다리 부위 통증
              </button>
            </h2>
            <div id="pain-leg" class="accordion-collapse collapse" data-bs-parent="#painAccordion">
              <div class="accordion-body">
                <div class="pain-question">
                  <label class="form-label">1. 통증이나 불편함이 있습니까?</label>
                  <select class="form-select" name="다리_1">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="있음">있음</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">2. 증상이 얼마나 지속되었습니까?</label>
                  <select class="form-select" name="다리_2">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="1주일 미만">1주일 미만</option>
                    <option value="1주일 이상 지속">1주일 이상 지속</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">3. 통증의 강도는?</label>
                  <select class="form-select" name="다리_3">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="약한 통증">약한 통증</option>
                    <option value="중간 정도">중간 정도</option>
                    <option value="심한 통증">심한 통증</option>
                    <option value="매우 심한 통증">매우 심한 통증</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">4. 얼마나 자주 통증이 발생합니까?</label>
                  <select class="form-select" name="다리_4">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="1달에 1회 미만">1달에 1회 미만</option>
                    <option value="1달에 1-3회">1달에 1-3회</option>
                    <option value="1주일에 1-2회">1주일에 1-2회</option>
                    <option value="매일">매일</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">5. 증상이 악화되었습니까?</label>
                  <select class="form-select" name="다리_5">
                    <option value="">선택하세요</option>
                    <option value="아니오">아니오</option>
                    <option value="예">예</option>
                  </select>
                </div>
                <div class="pain-question">
                  <label class="form-label">6. 기타 증상이 있습니까?</label>
                  <select class="form-select" name="다리_6">
                    <option value="">선택하세요</option>
                    <option value="없음">없음</option>
                    <option value="있음">있음</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Submit Button -->
      <div class="text-center mt-4">
        <button type="submit" class="btn btn-primary btn-submit" id="submit-btn">
          <i class="bi bi-check-circle me-2"></i>
          제출하기
        </button>
      </div>
    </form>
  </div>

  <!-- Success Message -->
  <div class="success-message" id="success-message">
    <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
    <h2 class="mt-3 text-success">제출 완료!</h2>
    <p class="text-muted">근골격계질환 증상조사표가 성공적으로 제출되었습니다.</p>
    <p class="text-muted"><strong>제출 ID:</strong> <span id="submission-id"></span></p>
    <button class="btn btn-primary mt-3" onclick="location.reload()">새로운 설문 작성</button>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const form = document.getElementById('survey-form');
      const submitBtn = document.getElementById('submit-btn');
      const progressBar = document.getElementById('progress-bar');
      const overlay = document.getElementById('overlay');
      const successMessage = document.getElementById('success-message');

      // Track form completion progress
      form.addEventListener('input', function() {
        const formData = new FormData(form);
        let filledFields = 0;
        let totalFields = 0;

        const allInputs = form.querySelectorAll('input, select, textarea');
        totalFields = allInputs.length;

        allInputs.forEach(input => {
          if (input.value && input.value.trim() !== '') {
            filledFields++;
          }
        });

        const progress = (filledFields / totalFields) * 100;
        progressBar.style.width = progress + '%';
      });

      // Form submission
      form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>제출 중...';

        try {
          const formData = new FormData(form);
          const data = {};

          // Convert FormData to object
          formData.forEach((value, key) => {
            data[key] = value || null;
          });

          // Submit to API
          const response = await fetch('/api/form/002/submit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          });

          const result = await response.json();

          if (result.success) {
            // Show success message
            document.getElementById('submission-id').textContent = result.submissionId;
            overlay.style.display = 'block';
            successMessage.style.display = 'block';

            // Reset form
            form.reset();
            progressBar.style.width = '0%';
          } else {
            throw new Error(result.error || 'Submission failed');
          }
        } catch (error) {
          console.error('Submission error:', error);
          alert('제출 중 오류가 발생했습니다: ' + error.message);
        } finally {
          // Reset button state
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>제출하기';
        }
      });
    });
  </script>
</body>
</html>
`;