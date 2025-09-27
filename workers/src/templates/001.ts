export const form001Template = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>근골격계 증상조사표 (001) - SafeWork</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background-color: #f8f9fa; font-family: 'Malgun Gothic', sans-serif; }
        .survey-container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .survey-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; text-align: center; }
        .survey-form { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
        .section-title { color: #495057; font-weight: bold; margin-top: 25px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #e9ecef; }
        .form-group { margin-bottom: 20px; }
        .form-label { font-weight: 600; color: #495057; margin-bottom: 8px; }
        .required { color: #dc3545; }
        .submit-btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; padding: 12px 40px; font-size: 16px; font-weight: bold; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
        .pain-scale { display: flex; justify-content: space-between; align-items: center; margin: 10px 0; }
        .pain-number { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #dee2e6; display: flex; align-items: center; justify-content: center; cursor: pointer; font-weight: bold; }
        .pain-number:hover, .pain-number.active { background-color: #667eea; color: white; border-color: #667eea; }
    </style>
</head>
<body>
    <div class="survey-container">
        <div class="survey-header">
            <h1><i class="fas fa-clipboard-list"></i> 근골격계 증상조사표</h1>
            <p class="mb-0">Musculoskeletal Symptom Survey (001)</p>
        </div>

        <form id="surveyForm" class="survey-form">
            <!-- 기본 정보 -->
            <h3 class="section-title"><i class="fas fa-user"></i> 기본 정보</h3>
            <div class="row">
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">번호</label>
                        <input type="text" class="form-control" name="employee_number" placeholder="사번">
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">성명 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="name" required>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">연령 <span class="required">*</span></label>
                        <input type="number" class="form-control" name="age" min="18" max="100" required>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">성별 <span class="required">*</span></label>
                        <select class="form-control" name="gender" required>
                            <option value="">선택</option>
                            <option value="male">남</option>
                            <option value="female">여</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">현 직장 경력(년) <span class="required">*</span></label>
                        <input type="number" class="form-control" name="work_experience" min="0" max="50" required>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label class="form-label">부서 <span class="required">*</span></label>
                        <input type="text" class="form-control" name="department" required>
                    </div>
                </div>
            </div>

            <!-- 작업 특성 -->
            <h3 class="section-title"><i class="fas fa-briefcase"></i> 작업 특성</h3>
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label class="form-label">주요 작업내용 <span class="required">*</span></label>
                        <textarea class="form-control" name="main_work" rows="3" required placeholder="주요 작업내용을 기술해주세요"></textarea>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label class="form-label">일일 작업시간 <span class="required">*</span></label>
                        <select class="form-control" name="daily_work_hours" required>
                            <option value="">선택</option>
                            <option value="less_than_6">6시간 미만</option>
                            <option value="6_to_8">6-8시간</option>
                            <option value="8_to_10">8-10시간</option>
                            <option value="more_than_10">10시간 이상</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label class="form-label">주요 작업자세 <span class="required">*</span></label>
                        <select class="form-control" name="work_posture" required>
                            <option value="">선택</option>
                            <option value="sitting">앉은 자세</option>
                            <option value="standing">선 자세</option>
                            <option value="bending">구부린 자세</option>
                            <option value="lifting">들기 작업</option>
                            <option value="mixed">혼합 자세</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label class="form-label">반복작업 정도 <span class="required">*</span></label>
                        <select class="form-control" name="repetitive_work" required>
                            <option value="">선택</option>
                            <option value="low">낮음</option>
                            <option value="medium">보통</option>
                            <option value="high">높음</option>
                            <option value="very_high">매우 높음</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- 신체 부위별 증상 -->
            <h3 class="section-title"><i class="fas fa-user-injured"></i> 신체 부위별 증상</h3>
            <p class="text-muted mb-4">지난 1년간 경험한 증상에 대해 해당하는 정도를 선택해주세요.</p>

            <!-- 목/어깨 -->
            <div class="form-group">
                <label class="form-label">1. 목/어깨 부위 통증이나 불편감</label>
                <div class="row">
                    <div class="col-md-4">
                        <select class="form-control" name="neck_shoulder_pain" required>
                            <option value="">선택</option>
                            <option value="none">없음</option>
                            <option value="mild">가끔</option>
                            <option value="moderate">자주</option>
                            <option value="severe">항상</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">통증 정도 (0-10)</label>
                        <input type="range" class="form-range" name="neck_shoulder_intensity" min="0" max="10" value="0">
                        <div class="d-flex justify-content-between">
                            <span>0</span><span>5</span><span>10</span>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">업무 영향도</label>
                        <select class="form-control" name="neck_shoulder_impact">
                            <option value="">선택</option>
                            <option value="none">영향 없음</option>
                            <option value="mild">약간 영향</option>
                            <option value="moderate">상당한 영향</option>
                            <option value="severe">업무 불가</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- 팔/팔꿈치 -->
            <div class="form-group">
                <label class="form-label">2. 팔/팔꿈치 부위 통증이나 불편감</label>
                <div class="row">
                    <div class="col-md-4">
                        <select class="form-control" name="arm_elbow_pain" required>
                            <option value="">선택</option>
                            <option value="none">없음</option>
                            <option value="mild">가끔</option>
                            <option value="moderate">자주</option>
                            <option value="severe">항상</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">통증 정도 (0-10)</label>
                        <input type="range" class="form-range" name="arm_elbow_intensity" min="0" max="10" value="0">
                        <div class="d-flex justify-content-between">
                            <span>0</span><span>5</span><span>10</span>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">업무 영향도</label>
                        <select class="form-control" name="arm_elbow_impact">
                            <option value="">선택</option>
                            <option value="none">영향 없음</option>
                            <option value="mild">약간 영향</option>
                            <option value="moderate">상당한 영향</option>
                            <option value="severe">업무 불가</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- 손목/손 -->
            <div class="form-group">
                <label class="form-label">3. 손목/손 부위 통증이나 불편감</label>
                <div class="row">
                    <div class="col-md-4">
                        <select class="form-control" name="wrist_hand_pain" required>
                            <option value="">선택</option>
                            <option value="none">없음</option>
                            <option value="mild">가끔</option>
                            <option value="moderate">자주</option>
                            <option value="severe">항상</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">통증 정도 (0-10)</label>
                        <input type="range" class="form-range" name="wrist_hand_intensity" min="0" max="10" value="0">
                        <div class="d-flex justify-content-between">
                            <span>0</span><span>5</span><span>10</span>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">업무 영향도</label>
                        <select class="form-control" name="wrist_hand_impact">
                            <option value="">선택</option>
                            <option value="none">영향 없음</option>
                            <option value="mild">약간 영향</option>
                            <option value="moderate">상당한 영향</option>
                            <option value="severe">업무 불가</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- 허리 -->
            <div class="form-group">
                <label class="form-label">4. 허리 부위 통증이나 불편감</label>
                <div class="row">
                    <div class="col-md-4">
                        <select class="form-control" name="back_pain" required>
                            <option value="">선택</option>
                            <option value="none">없음</option>
                            <option value="mild">가끔</option>
                            <option value="moderate">자주</option>
                            <option value="severe">항상</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">통증 정도 (0-10)</label>
                        <input type="range" class="form-range" name="back_intensity" min="0" max="10" value="0">
                        <div class="d-flex justify-content-between">
                            <span>0</span><span>5</span><span>10</span>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">업무 영향도</label>
                        <select class="form-control" name="back_impact">
                            <option value="">선택</option>
                            <option value="none">영향 없음</option>
                            <option value="mild">약간 영향</option>
                            <option value="moderate">상당한 영향</option>
                            <option value="severe">업무 불가</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- 다리/무릎 -->
            <div class="form-group">
                <label class="form-label">5. 다리/무릎 부위 통증이나 불편감</label>
                <div class="row">
                    <div class="col-md-4">
                        <select class="form-control" name="leg_knee_pain" required>
                            <option value="">선택</option>
                            <option value="none">없음</option>
                            <option value="mild">가끔</option>
                            <option value="moderate">자주</option>
                            <option value="severe">항상</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">통증 정도 (0-10)</label>
                        <input type="range" class="form-range" name="leg_knee_intensity" min="0" max="10" value="0">
                        <div class="d-flex justify-content-between">
                            <span>0</span><span>5</span><span>10</span>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">업무 영향도</label>
                        <select class="form-control" name="leg_knee_impact">
                            <option value="">선택</option>
                            <option value="none">영향 없음</option>
                            <option value="mild">약간 영향</option>
                            <option value="moderate">상당한 영향</option>
                            <option value="severe">업무 불가</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- 추가 정보 -->
            <h3 class="section-title"><i class="fas fa-info-circle"></i> 추가 정보</h3>
            <div class="form-group">
                <label class="form-label">기타 증상이나 의견</label>
                <textarea class="form-control" name="additional_comments" rows="4" placeholder="추가로 경험하는 증상이나 의견이 있으시면 자유롭게 기술해주세요"></textarea>
            </div>

            <div class="form-group">
                <label class="form-label">의료진 상담 필요성</label>
                <select class="form-control" name="medical_consultation">
                    <option value="">선택</option>
                    <option value="not_needed">필요하지 않음</option>
                    <option value="maybe">검토 필요</option>
                    <option value="needed">필요함</option>
                    <option value="urgent">긴급함</option>
                </select>
            </div>

            <div class="text-center mt-4">
                <button type="submit" class="btn btn-primary submit-btn">
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

            // 데이터 검증
            const requiredFields = ['name', 'age', 'gender', 'work_experience', 'department', 'main_work', 'daily_work_hours', 'work_posture', 'repetitive_work'];
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

        // Range input 시각적 업데이트
        document.querySelectorAll('input[type="range"]').forEach(range => {
            const updateRangeValue = () => {
                const value = range.value;
                const parent = range.closest('.col-md-4');
                const valueDisplay = parent.querySelector('.range-value') || document.createElement('div');
                valueDisplay.className = 'range-value text-center mt-1 fw-bold';
                valueDisplay.textContent = value;
                if (!parent.querySelector('.range-value')) {
                    range.parentNode.appendChild(valueDisplay);
                }
            };

            range.addEventListener('input', updateRangeValue);
            updateRangeValue(); // 초기 값 설정
        });
    </script>
</body>
</html>
`;