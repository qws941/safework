// Survey form templates
export const surveyForms = {
  '001_musculoskeletal_symptom_survey': `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>근골격계 증상 조사표</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Malgun Gothic', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 15px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          padding: 40px;
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
          font-size: 28px;
          text-align: center;
        }
        .subtitle {
          color: #666;
          text-align: center;
          margin-bottom: 30px;
        }
        .section {
          margin-bottom: 30px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 10px;
        }
        .section h2 {
          color: #667eea;
          margin-bottom: 15px;
          font-size: 20px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          margin-bottom: 8px;
          color: #333;
          font-weight: 500;
        }
        input[type="text"],
        input[type="number"],
        input[type="date"],
        select,
        textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.3s;
        }
        input:focus,
        select:focus,
        textarea:focus {
          outline: none;
          border-color: #667eea;
        }
        .radio-group,
        .checkbox-group {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }
        .radio-item,
        .checkbox-item {
          display: flex;
          align-items: center;
        }
        .radio-item input,
        .checkbox-item input {
          margin-right: 5px;
        }
        button {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.3s;
          margin-top: 20px;
        }
        button:hover {
          transform: translateY(-2px);
        }
        .required {
          color: #f44336;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>근골격계 증상 조사표</h1>
        <p class="subtitle">산업안전보건기준에 관한 규칙 제657조</p>

        <form method="POST" action="/survey/001_musculoskeletal_symptom_survey/submit">
          <div class="section">
            <h2>1. 기본 정보</h2>
            <div class="form-group">
              <label>성명 <span class="required">*</span></label>
              <input type="text" name="name" required>
            </div>
            <div class="form-group">
              <label>연령 <span class="required">*</span></label>
              <input type="number" name="age" min="18" max="100" required>
            </div>
            <div class="form-group">
              <label>성별 <span class="required">*</span></label>
              <div class="radio-group">
                <div class="radio-item">
                  <input type="radio" id="male" name="gender" value="male" required>
                  <label for="male">남성</label>
                </div>
                <div class="radio-item">
                  <input type="radio" id="female" name="gender" value="female" required>
                  <label for="female">여성</label>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>부서/직책</label>
              <input type="text" name="department">
            </div>
            <div class="form-group">
              <label>현 작업 근무년수</label>
              <input type="number" name="work_years" min="0">
            </div>
          </div>

          <div class="section">
            <h2>2. 작업 관련 정보</h2>
            <div class="form-group">
              <label>하루 평균 작업시간</label>
              <select name="daily_work_hours">
                <option value="">선택하세요</option>
                <option value="less_than_8">8시간 미만</option>
                <option value="8_to_10">8-10시간</option>
                <option value="10_to_12">10-12시간</option>
                <option value="more_than_12">12시간 이상</option>
              </select>
            </div>
            <div class="form-group">
              <label>작업 중 주로 사용하는 신체 부위 (복수 선택 가능)</label>
              <div class="checkbox-group">
                <div class="checkbox-item">
                  <input type="checkbox" id="neck" name="body_parts" value="neck">
                  <label for="neck">목</label>
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" id="shoulder" name="body_parts" value="shoulder">
                  <label for="shoulder">어깨</label>
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" id="arm" name="body_parts" value="arm">
                  <label for="arm">팔/팔꿈치</label>
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" id="hand" name="body_parts" value="hand">
                  <label for="hand">손/손목/손가락</label>
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" id="back" name="body_parts" value="back">
                  <label for="back">허리</label>
                </div>
                <div class="checkbox-item">
                  <input type="checkbox" id="leg" name="body_parts" value="leg">
                  <label for="leg">다리/발</label>
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>3. 증상 정보</h2>
            <div class="form-group">
              <label>통증이나 불편함이 있는 부위가 있습니까?</label>
              <div class="radio-group">
                <div class="radio-item">
                  <input type="radio" id="pain_yes" name="has_pain" value="yes">
                  <label for="pain_yes">예</label>
                </div>
                <div class="radio-item">
                  <input type="radio" id="pain_no" name="has_pain" value="no">
                  <label for="pain_no">아니오</label>
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>통증 강도 (1-10)</label>
              <input type="range" name="pain_intensity" min="1" max="10" value="5">
            </div>
            <div class="form-group">
              <label>증상 설명</label>
              <textarea name="symptom_description" rows="4" placeholder="증상을 자세히 설명해주세요..."></textarea>
            </div>
          </div>

          <div class="section">
            <h2>4. 작업 환경</h2>
            <div class="form-group">
              <label>작업장 환경에 대한 만족도</label>
              <select name="work_satisfaction">
                <option value="">선택하세요</option>
                <option value="very_satisfied">매우 만족</option>
                <option value="satisfied">만족</option>
                <option value="neutral">보통</option>
                <option value="dissatisfied">불만족</option>
                <option value="very_dissatisfied">매우 불만족</option>
              </select>
            </div>
            <div class="form-group">
              <label>개선이 필요한 사항</label>
              <textarea name="improvement_needed" rows="3" placeholder="개선이 필요한 사항을 작성해주세요..."></textarea>
            </div>
          </div>

          <button type="submit">제출하기</button>
        </form>
      </div>
    </body>
    </html>
  `,

  '002_workplace_risk_assessment': `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>작업장 위험성 평가</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Malgun Gothic', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 15px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          padding: 40px;
        }
        h1 {
          color: #333;
          margin-bottom: 30px;
          text-align: center;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          margin-bottom: 8px;
          color: #333;
          font-weight: 500;
        }
        input, select, textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 16px;
        }
        button {
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>작업장 위험성 평가</h1>

        <form method="POST" action="/survey/002_workplace_risk_assessment/submit">
          <div class="form-group">
            <label>평가일자</label>
            <input type="date" name="assessment_date" required>
          </div>

          <div class="form-group">
            <label>작업장명</label>
            <input type="text" name="workplace_name" required>
          </div>

          <div class="form-group">
            <label>평가자</label>
            <input type="text" name="assessor" required>
          </div>

          <div class="form-group">
            <label>위험 요소</label>
            <textarea name="risk_factors" rows="4" required></textarea>
          </div>

          <div class="form-group">
            <label>위험도 평가</label>
            <select name="risk_level" required>
              <option value="">선택하세요</option>
              <option value="low">낮음</option>
              <option value="medium">중간</option>
              <option value="high">높음</option>
              <option value="very_high">매우 높음</option>
            </select>
          </div>

          <div class="form-group">
            <label>개선 조치</label>
            <textarea name="improvement_measures" rows="4"></textarea>
          </div>

          <button type="submit">제출하기</button>
        </form>
      </div>
    </body>
    </html>
  `
};