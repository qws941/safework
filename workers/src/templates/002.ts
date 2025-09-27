export const form002Template = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>근골격계부담작업 유해요인조사 (002) - SafeWork</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        :root {
            --sw-primary: #2563eb;
            --sw-primary-dark: #1d4ed8;
            --sw-secondary: #64748b;
            --sw-success: #10b981;
            --sw-warning: #f59e0b;
            --sw-danger: #ef4444;
            --sw-light: #f8f9fa;
            --sw-border: #dee2e6;
        }

        .survey-container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .survey-header {
            background: linear-gradient(135deg, var(--sw-primary), var(--sw-primary-dark));
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            margin: -20px -20px 30px -20px;
            text-align: center;
        }

        .survey-header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }

        .survey-header .subtitle {
            margin-top: 10px;
            opacity: 0.9;
            font-size: 16px;
        }

        .section-header {
            background: var(--sw-light);
            border-left: 5px solid var(--sw-primary);
            padding: 15px 20px;
            margin: 30px 0 20px 0;
            border-radius: 5px;
        }

        .section-header h3 {
            margin: 0;
            color: var(--sw-primary);
            font-weight: 600;
            display: flex;
            align-items: center;
        }

        .section-header i {
            margin-right: 10px;
            font-size: 20px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-label {
            font-weight: 600;
            color: #333;
            margin-bottom: 8px;
            display: block;
        }

        .form-control, .form-select {
            border: 2px solid var(--sw-border);
            border-radius: 6px;
            padding: 12px 15px;
            font-size: 14px;
            transition: all 0.3s ease;
        }

        .form-control:focus, .form-select:focus {
            border-color: var(--sw-primary);
            box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.25);
            outline: none;
        }

        .required-field::after {
            content: " *";
            color: var(--sw-danger);
            font-weight: bold;
        }

        .btn-submit {
            background: linear-gradient(135deg, var(--sw-primary), var(--sw-primary-dark));
            border: none;
            color: white;
            padding: 15px 40px;
            font-size: 16px;
            font-weight: 600;
            border-radius: 50px;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .btn-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(37, 99, 235, 0.3);
        }

        .row {
            margin-bottom: 15px;
        }

        @media (max-width: 768px) {
            .survey-container {
                margin: 10px;
                padding: 15px;
            }
            
            .survey-header {
                padding: 20px;
                margin: -15px -15px 20px -15px;
            }
            
            .survey-header h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px 0;">
    <div class="survey-container">
        <div class="survey-header">
            <h1><i class="bi bi-clipboard-data-fill"></i> 근골격계부담작업 유해요인조사</h1>
            <div class="subtitle">Musculoskeletal Disorder Risk Assessment (002)</div>
        </div>

        <form id="musculoskeletalForm" method="POST">
            <!-- 기본 정보 섹션 -->
            <div class="section-header">
                <h3><i class="bi bi-info-circle-fill"></i> 기본 정보</h3>
            </div>
            
            <div class="row">
                <div class="col-md-2">
                    <div class="form-group">
                        <label for="sequence_number" class="form-label">번호</label>
                        <input type="text" class="form-control" id="sequence_number" name="sequence_number" placeholder="#">
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="form-group">
                        <label for="name" class="form-label required-field">성명</label>
                        <input type="text" class="form-control" id="name" name="name" required>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="form-group">
                        <label for="age" class="form-label required-field">연령</label>
                        <input type="number" class="form-control" id="age" name="age" min="18" max="70" required>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="form-group">
                        <label for="gender" class="form-label required-field">성별</label>
                        <select class="form-select" id="gender" name="gender" required>
                            <option value="">선택</option>
                            <option value="남">남</option>
                            <option value="여">여</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="form-group">
                        <label for="work_experience" class="form-label required-field">현 직장 경력(년)</label>
                        <input type="number" class="form-control" id="work_experience" name="work_experience" min="0" max="50" required>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-12">
                    <div class="form-group">
                        <label for="department" class="form-label required-field">부서</label>
                        <input type="text" class="form-control" id="department" name="department" required>
                    </div>
                </div>
            </div>

            <!-- 작업환경 평가 섹션 -->
            <div class="section-header">
                <h3><i class="bi bi-gear-fill"></i> 작업환경 평가</h3>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="work_posture" class="form-label required-field">작업자세 평가</label>
                        <select class="form-select" id="work_posture" name="work_posture" required>
                            <option value="">선택</option>
                            <option value="양호">양호</option>
                            <option value="보통">보통</option>
                            <option value="위험">위험</option>
                            <option value="매우위험">매우위험</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="repetitive_motion" class="form-label required-field">반복동작 평가</label>
                        <select class="form-select" id="repetitive_motion" name="repetitive_motion" required>
                            <option value="">선택</option>
                            <option value="낮음">낮음</option>
                            <option value="보통">보통</option>
                            <option value="높음">높음</option>
                            <option value="매우높음">매우높음</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="force_exertion" class="form-label required-field">힘의 사용 정도</label>
                        <select class="form-select" id="force_exertion" name="force_exertion" required>
                            <option value="">선택</option>
                            <option value="가벼움">가벼움</option>
                            <option value="보통">보통</option>
                            <option value="무거움">무거움</option>
                            <option value="매우무거움">매우무거움</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="vibration_exposure" class="form-label required-field">진동노출</label>
                        <select class="form-select" id="vibration_exposure" name="vibration_exposure" required>
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="약간">약간</option>
                            <option value="보통">보통</option>
                            <option value="심함">심함</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="work_height" class="form-label">작업높이</label>
                        <select class="form-select" id="work_height" name="work_height">
                            <option value="">선택</option>
                            <option value="적정">적정</option>
                            <option value="높음">높음</option>
                            <option value="낮음">낮음</option>
                            <option value="변동">변동</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="tool_usage" class="form-label">사용도구</label>
                        <textarea class="form-control" id="tool_usage" name="tool_usage" rows="3" placeholder="사용하는 도구나 장비를 입력해주세요"></textarea>
                    </div>
                </div>
            </div>

            <!-- 건강상태 평가 섹션 -->
            <div class="section-header">
                <h3><i class="bi bi-heart-pulse-fill"></i> 건강상태 평가</h3>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="muscle_pain" class="form-label">근육통</label>
                        <select class="form-select" id="muscle_pain" name="muscle_pain">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="가끔">가끔</option>
                            <option value="자주">자주</option>
                            <option value="항상">항상</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="joint_pain" class="form-label">관절통</label>
                        <select class="form-select" id="joint_pain" name="joint_pain">
                            <option value="">선택</option>
                            <option value="없음">없음</option>
                            <option value="가끔">가끔</option>
                            <option value="자주">자주</option>
                            <option value="항상">항상</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-4">
                    <div class="form-group">
                        <label for="fatigue_level" class="form-label">피로도</label>
                        <select class="form-select" id="fatigue_level" name="fatigue_level">
                            <option value="">선택</option>
                            <option value="낮음">낮음</option>
                            <option value="보통">보통</option>
                            <option value="높음">높음</option>
                            <option value="매우높음">매우높음</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label for="sleep_quality" class="form-label">수면의질</label>
                        <select class="form-select" id="sleep_quality" name="sleep_quality">
                            <option value="">선택</option>
                            <option value="좋음">좋음</option>
                            <option value="보통">보통</option>
                            <option value="나쁨">나쁨</option>
                            <option value="매우나쁨">매우나쁨</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <label for="stress_level" class="form-label">스트레스수준</label>
                        <select class="form-select" id="stress_level" name="stress_level">
                            <option value="">선택</option>
                            <option value="낮음">낮음</option>
                            <option value="보통">보통</option>
                            <option value="높음">높음</option>
                            <option value="매우높음">매우높음</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- 위험요인 분석 섹션 -->
            <div class="section-header">
                <h3><i class="bi bi-exclamation-triangle-fill"></i> 위험요인 분석</h3>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="physical_factors" class="form-label">물리적 위험요인</label>
                        <textarea class="form-control" id="physical_factors" name="physical_factors" rows="3" placeholder="물리적 위험요인을 기술해주세요"></textarea>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="environmental_factors" class="form-label">환경적 위험요인</label>
                        <textarea class="form-control" id="environmental_factors" name="environmental_factors" rows="3" placeholder="환경적 위험요인을 기술해주세요"></textarea>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="psychosocial_factors" class="form-label">심리사회적 위험요인</label>
                        <textarea class="form-control" id="psychosocial_factors" name="psychosocial_factors" rows="3" placeholder="심리사회적 위험요인을 기술해주세요"></textarea>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="work_schedule" class="form-label">근무형태</label>
                        <select class="form-select" id="work_schedule" name="work_schedule">
                            <option value="">선택</option>
                            <option value="주간">주간</option>
                            <option value="야간">야간</option>
                            <option value="교대">교대</option>
                            <option value="불규칙">불규칙</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- 개선방안 섹션 -->
            <div class="section-header">
                <h3><i class="bi bi-lightbulb-fill"></i> 개선방안</h3>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="immediate_actions" class="form-label">즉시 개선사항</label>
                        <textarea class="form-control" id="immediate_actions" name="immediate_actions" rows="3" placeholder="즉시 개선이 필요한 사항을 기술해주세요"></textarea>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="long_term_plans" class="form-label">장기 개선계획</label>
                        <textarea class="form-control" id="long_term_plans" name="long_term_plans" rows="3" placeholder="장기적 개선계획을 기술해주세요"></textarea>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="training_needs" class="form-label">교육필요사항</label>
                        <textarea class="form-control" id="training_needs" name="training_needs" rows="3" placeholder="필요한 교육 내용을 기술해주세요"></textarea>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label for="equipment_needs" class="form-label">장비개선사항</label>
                        <textarea class="form-control" id="equipment_needs" name="equipment_needs" rows="3" placeholder="개선이 필요한 장비나 설비를 기술해주세요"></textarea>
                    </div>
                </div>
            </div>

            <div class="text-center mt-4">
                <button type="submit" class="btn btn-submit">
                    <i class="bi bi-check-lg"></i> 조사표 제출
                </button>
            </div>
        </form>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
    document.getElementById('musculoskeletalForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);
        
        // Submit to API
        fetch('/api/survey/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                form_type: '002_musculoskeletal_symptom_program',
                response_data: data,
                is_anonymous: true
            })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert('근골격계부담작업 유해요인조사가 성공적으로 제출되었습니다.');
                window.location.href = '/';
            } else {
                alert('제출 중 오류가 발생했습니다: ' + result.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('제출 중 오류가 발생했습니다.');
        });
    });
    </script>
</body>
</html>`;