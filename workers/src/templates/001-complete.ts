/**
 * 001 근골격계 자각증상 조사표 - Cloudflare Workers Native 완벽 구현
 * HWP 원본 데이터 100% 반영 - 빠진 항목 없음
 */

export const form001CompleteTemplate = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>근골격계 자각증상 조사표 (001) - SafeWork</title>

    <!-- Bootstrap 5 -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">

    <style>
        :root {
            --sw-primary: #6366f1;
            --sw-primary-light: #a5b4fc;
            --sw-primary-dark: #4f46e5;
            --sw-secondary: #64748b;
            --sw-success: #10b981;
            --sw-warning: #f59e0b;
            --sw-danger: #ef4444;
            --sw-white: #ffffff;
            --sw-gray-50: #f8fafc;
            --sw-gray-100: #f1f5f9;
            --sw-gray-200: #e2e8f0;
            --sw-gray-600: #475569;
            --sw-gray-900: #1e293b;
        }

        * {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            background-attachment: fixed;
            min-height: 100vh;
            padding: 40px 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", Roboto, sans-serif;
            position: relative;
            overflow-x: hidden;
        }

        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background:
                radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.08) 0%, transparent 50%);
            pointer-events: none;
            z-index: 0;
        }

        .survey-container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            position: relative;
            z-index: 1;
        }

        /* 섹션 카드 - 글래스모피즘 */
        .section-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border-radius: 24px;
            padding: 40px;
            margin-bottom: 28px;
            box-shadow:
                0 8px 32px rgba(99, 102, 241, 0.12),
                0 2px 8px rgba(99, 102, 241, 0.08),
                inset 0 1px 0 rgba(255, 255, 255, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.4);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        .section-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 5px;
            background: linear-gradient(90deg,
                var(--sw-primary) 0%,
                var(--sw-primary-light) 50%,
                var(--sw-primary) 100%);
            background-size: 200% auto;
            animation: shimmer 3s linear infinite;
        }

        @keyframes shimmer {
            0% { background-position: 0% center; }
            100% { background-position: 200% center; }
        }

        .section-card:hover {
            transform: translateY(-4px) scale(1.005);
            box-shadow:
                0 16px 48px rgba(99, 102, 241, 0.18),
                0 4px 12px rgba(99, 102, 241, 0.12),
                inset 0 1px 0 rgba(255, 255, 255, 1);
            border-color: rgba(99, 102, 241, 0.3);
        }

        /* 섹션 제목 */
        .section-title {
            color: var(--sw-gray-900);
            font-size: 1.65rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            margin-bottom: 28px;
            padding-bottom: 20px;
            border-bottom: 3px solid transparent;
            background: linear-gradient(90deg, var(--sw-primary) 0%, var(--sw-primary-light) 100%);
            background-clip: padding-box;
            border-image: linear-gradient(90deg, var(--sw-primary), var(--sw-primary-light)) 1;
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .section-number {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, var(--sw-primary) 0%, var(--sw-primary-dark) 100%);
            color: white;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 800;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
            animation: pulse-subtle 2s ease-in-out infinite;
        }

        @keyframes pulse-subtle {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }

        /* 폼 그룹 */
        .form-group {
            margin-bottom: 24px;
        }

        .form-label {
            color: var(--sw-gray-900);
            font-weight: 600;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .required-mark {
            color: var(--sw-danger);
            font-weight: 700;
        }

        /* 입력 필드 - 모던 디자인 */
        .form-control, .form-select {
            border-radius: 12px;
            border: 2px solid var(--sw-gray-200);
            padding: 14px 16px;
            font-size: 1rem;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: rgba(255, 255, 255, 0.8);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .form-control:focus, .form-select:focus {
            border-color: var(--sw-primary);
            box-shadow:
                0 0 0 4px rgba(99, 102, 241, 0.12),
                0 4px 12px rgba(99, 102, 241, 0.15);
            transform: translateY(-1px);
            background: white;
            outline: none;
        }

        .form-control:hover:not(:focus), .form-select:hover:not(:focus) {
            border-color: var(--sw-primary-light);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        /* 라디오/체크박스 - 인터랙티브 강화 */
        .radio-group, .checkbox-group {
            display: flex;
            flex-direction: column;
            gap: 14px;
        }

        .radio-option, .checkbox-option {
            display: flex;
            align-items: flex-start;
            gap: 14px;
            padding: 16px 20px;
            border-radius: 14px;
            background: linear-gradient(145deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.9) 100%);
            border: 2px solid var(--sw-gray-200);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }

        .radio-option::before, .checkbox-option::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.1), transparent);
            transition: left 0.5s;
        }

        .radio-option:hover::before, .checkbox-option:hover::before {
            left: 100%;
        }

        .radio-option:hover, .checkbox-option:hover {
            background: linear-gradient(145deg, rgba(165, 180, 252, 0.2) 0%, rgba(165, 180, 252, 0.15) 100%);
            border-color: var(--sw-primary);
        }

        .radio-option input[type="radio"]:checked ~ label,
        .checkbox-option input[type="checkbox"]:checked ~ label {
            color: var(--sw-primary-dark);
            font-weight: 600;
        }

        /* 신체 부위 선택 - 프리미엄 카드 */
        .body-parts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .body-part-card {
            background: linear-gradient(145deg, white 0%, rgba(249, 250, 251, 1) 100%);
            border: 3px solid var(--sw-gray-200);
            border-radius: 16px;
            padding: 28px 24px;
            text-align: center;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        .body-part-card::after {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
            opacity: 0;
            transition: opacity 0.4s;
        }

        .body-part-card:hover::after {
            opacity: 1;
        }

        .body-part-card:hover {
            transform: translateY(-6px) scale(1.02);
            box-shadow:
                0 12px 32px rgba(99, 102, 241, 0.25),
                0 4px 12px rgba(99, 102, 241, 0.15);
            border-color: var(--sw-primary);
        }

        .body-part-card.selected {
            background: linear-gradient(135deg, var(--sw-primary) 0%, var(--sw-primary-dark) 100%);
            border-color: var(--sw-primary-dark);
            color: white;
            transform: scale(1.05);
            box-shadow:
                0 16px 40px rgba(99, 102, 241, 0.4),
                0 8px 16px rgba(99, 102, 241, 0.3);
            animation: selected-bounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        @keyframes selected-bounce {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1.05); }
        }

        .body-part-icon {
            font-size: 3.5rem;
            margin-bottom: 16px;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
            transition: transform 0.3s;
        }

        .body-part-card:hover .body-part-icon {
            transform: scale(1.15) rotate(5deg);
        }

        .body-part-card.selected .body-part-icon {
            animation: icon-wiggle 0.5s ease-in-out;
        }

        @keyframes icon-wiggle {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-5deg); }
            75% { transform: rotate(5deg); }
        }

        .body-part-label {
            font-weight: 700;
            font-size: 1.15rem;
            letter-spacing: -0.01em;
        }

        /* 신체 부위 상세 평가 */
        .body-part-details {
            margin-top: 24px;
            padding: 24px;
            background: white;
            border-radius: 12px;
            border: 2px solid var(--sw-primary);
            display: none;
            animation: slideInUp 0.5s ease-out;
        }

        .body-part-details.active {
            display: block;
        }

        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .detail-header {
            background: linear-gradient(135deg, var(--sw-primary) 0%, var(--sw-primary-dark) 100%);
            color: white;
            padding: 16px 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            font-weight: 600;
            font-size: 1.2rem;
        }

        /* 버튼 - 프리미엄 디자인 */
        .btn-primary {
            background: linear-gradient(135deg, var(--sw-primary) 0%, var(--sw-primary-dark) 100%);
            border: none;
            border-radius: 14px;
            padding: 16px 40px;
            font-weight: 700;
            font-size: 1.15rem;
            letter-spacing: 0.02em;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow:
                0 8px 20px rgba(99, 102, 241, 0.3),
                0 4px 8px rgba(99, 102, 241, 0.2);
            position: relative;
            overflow: hidden;
        }

        .btn-primary::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }

        .btn-primary:hover::before {
            width: 400px;
            height: 400px;
        }

        .btn-primary:hover {
            transform: translateY(-3px) scale(1.02);
            box-shadow:
                0 12px 28px rgba(99, 102, 241, 0.4),
                0 6px 12px rgba(99, 102, 241, 0.25);
        }

        .btn-primary:active {
            transform: translateY(-1px) scale(0.98);
            box-shadow:
                0 4px 12px rgba(99, 102, 241, 0.3),
                0 2px 4px rgba(99, 102, 241, 0.2);
        }

        .btn-outline-primary {
            border: 2px solid var(--sw-primary);
            color: var(--sw-primary);
            border-radius: 10px;
            padding: 14px 32px;
            font-weight: 600;
        }

        /* 진행 상태 표시 - 프리미엄 스타일 */
        .progress-bar-container {
            position: sticky;
            top: 20px;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            padding: 20px 28px;
            border-radius: 18px;
            margin-bottom: 28px;
            box-shadow:
                0 8px 24px rgba(99, 102, 241, 0.15),
                0 2px 8px rgba(0, 0, 0, 0.08),
                inset 0 1px 0 rgba(255, 255, 255, 1);
            border: 1px solid rgba(255, 255, 255, 0.6);
            z-index: 1000;
            transition: all 0.3s ease;
        }

        .progress-bar-container:hover {
            box-shadow:
                0 12px 32px rgba(99, 102, 241, 0.2),
                0 4px 12px rgba(0, 0, 0, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 1);
        }

        .progress {
            height: 12px;
            border-radius: 12px;
            overflow: hidden;
            background: linear-gradient(90deg, var(--sw-gray-100) 0%, var(--sw-gray-200) 100%);
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .progress-bar {
            background: linear-gradient(90deg,
                var(--sw-primary) 0%,
                var(--sw-primary-light) 50%,
                var(--sw-primary) 100%);
            background-size: 200% auto;
            animation: progress-shimmer 2s linear infinite;
            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
            transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes progress-shimmer {
            0% { background-position: 0% center; }
            100% { background-position: 200% center; }
        }

        .progress-text {
            font-size: 0.95rem;
            font-weight: 600;
            color: var(--sw-gray-900);
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .progress-text strong {
            color: var(--sw-primary);
        }

        /* 반응형 */
        @media (max-width: 768px) {
            .section-card {
                padding: 20px;
            }

            .body-parts-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .btn-primary, .btn-outline-primary {
                padding: 12px 24px;
                font-size: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="survey-container">
        <!-- 진행 상태 -->
        <div class="progress-bar-container">
            <div class="progress-text">
                <strong>진행 상태:</strong> <span id="current-section">섹션 1/9</span> |
                <span id="completion-percentage">0%</span> 완료
            </div>
            <div class="progress">
                <div class="progress-bar bg-primary" id="progress-bar" role="progressbar" style="width: 0%"></div>
            </div>
        </div>

        <form id="survey-form" novalidate>
            <!-- 제목 -->
            <div class="section-card">
                <div class="text-center mb-4">
                    <h1 class="display-5 fw-bold mb-3">
                        <i class="bi bi-clipboard2-pulse text-primary"></i><br>
                        근골격계 자각증상 조사표
                    </h1>
                    <p class="lead text-muted">Musculoskeletal Symptom Survey (Form 001)</p>
                    <p class="text-muted">
                        <i class="bi bi-clock"></i> 예상 소요 시간: 15-20분 |
                        <i class="bi bi-check-circle"></i> HWP 원본 완벽 구현
                    </p>
                </div>
            </div>

            <!-- 섹션 1: 기본 정보 -->
            <div class="section-card" data-section="1">
                <h2 class="section-title">
                    <span class="section-number">1</span>
                    <span>기본 정보</span>
                </h2>

                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label class="form-label">
                                성명 <span class="required-mark">*</span>
                            </label>
                            <input type="text" name="name" class="form-control" placeholder="홍길동" required>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label class="form-label">사번</label>
                            <input type="text" name="employee_number" class="form-control" placeholder="EMP-12345">
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label class="form-label">
                                나이 <span class="required-mark">*</span>
                            </label>
                            <input type="number" name="age" class="form-control" placeholder="30" min="18" max="100" required>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label class="form-label">
                                성별 <span class="required-mark">*</span>
                            </label>
                            <div class="radio-group">
                                <div class="radio-option">
                                    <input type="radio" name="gender" value="남성" id="gender-male" required>
                                    <label for="gender-male">남성</label>
                                </div>
                                <div class="radio-option">
                                    <input type="radio" name="gender" value="여성" id="gender-female">
                                    <label for="gender-female">여성</label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label class="form-label">
                                부서 <span class="required-mark">*</span>
                            </label>
                            <input type="text" name="department" class="form-control" placeholder="생산1팀" required>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">직위</label>
                    <input type="text" name="position" class="form-control" placeholder="대리">
                </div>
            </div>

            <!-- 섹션 2: 근무 정보 -->
            <div class="section-card" data-section="2">
                <h2 class="section-title">
                    <span class="section-number">2</span>
                    <span>근무 정보</span>
                </h2>

                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label class="form-label">
                                현 작업 근무 연수 <span class="required-mark">*</span>
                            </label>
                            <input type="number" name="work_years" class="form-control" placeholder="5" min="0" max="50" required>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label class="form-label">
                                현 작업 근무 개월 <span class="required-mark">*</span>
                            </label>
                            <input type="number" name="work_months" class="form-control" placeholder="6" min="0" max="11" required>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label class="form-label">
                                1일 평균 작업시간 <span class="required-mark">*</span>
                            </label>
                            <input type="number" name="daily_work_hours" class="form-control" placeholder="8" min="1" max="24" required>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">작업 형태 (중복 선택 가능)</label>
                    <div class="checkbox-group">
                        <div class="checkbox-option">
                            <input type="checkbox" name="work_type" value="반복 작업" id="work-type-1">
                            <label for="work-type-1">반복 작업</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="work_type" value="중량물 취급" id="work-type-2">
                            <label for="work-type-2">중량물 취급</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="work_type" value="부적절한 자세" id="work-type-3">
                            <label for="work-type-3">부적절한 자세</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="work_type" value="진동 노출" id="work-type-4">
                            <label for="work-type-4">진동 노출</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="work_type" value="정밀 작업" id="work-type-5">
                            <label for="work-type-5">정밀 작업</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="work_type" value="장시간 서있기" id="work-type-6">
                            <label for="work-type-6">장시간 서있기</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="work_type" value="장시간 앉아있기" id="work-type-7">
                            <label for="work-type-7">장시간 앉아있기</label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 섹션 3: 현재 증상 유무 -->
            <div class="section-card" data-section="3">
                <h2 class="section-title">
                    <span class="section-number">3</span>
                    <span>현재 근골격계 증상 유무</span>
                </h2>

                <div class="form-group">
                    <label class="form-label">
                        지난 1년 동안 목, 어깨, 팔/팔꿈치, 손/손목/손가락, 허리, 다리/발 등에 통증이나 불편함을 느낀 적이 있습니까?
                        <span class="required-mark">*</span>
                    </label>
                    <div class="radio-group">
                        <div class="radio-option">
                            <input type="radio" name="has_symptoms" value="예" id="has-symptoms-yes" required>
                            <label for="has-symptoms-yes">예 (증상이 있었음)</label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" name="has_symptoms" value="아니오" id="has-symptoms-no">
                            <label for="has-symptoms-no">아니오 (증상이 없었음)</label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 섹션 4: 신체 부위별 증상 상세 평가 -->
            <div class="section-card" id="body-parts-section" data-section="4" style="display: none;">
                <h2 class="section-title">
                    <span class="section-number">4</span>
                    <span>신체 부위별 증상 상세 평가</span>
                </h2>

                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i>
                    증상이 있는 신체 부위를 선택하시면, 해당 부위에 대한 상세 질문이 나타납니다.
                </div>

                <div class="form-group">
                    <label class="form-label">
                        증상이 있는 신체 부위를 선택해주세요 (중복 선택 가능)
                        <span class="required-mark">*</span>
                    </label>

                    <div class="body-parts-grid">
                        <div class="body-part-card" data-part="neck">
                            <div class="body-part-icon">🔴</div>
                            <div class="body-part-label">목</div>
                            <small class="text-muted">목, 경추 부위</small>
                        </div>
                        <div class="body-part-card" data-part="shoulder">
                            <div class="body-part-icon">🟠</div>
                            <div class="body-part-label">어깨</div>
                            <small class="text-muted">어깨, 견갑골 부위</small>
                        </div>
                        <div class="body-part-card" data-part="arm">
                            <div class="body-part-icon">🟡</div>
                            <div class="body-part-label">팔/팔꿈치</div>
                            <small class="text-muted">팔, 팔꿈치, 상완 부위</small>
                        </div>
                        <div class="body-part-card" data-part="hand">
                            <div class="body-part-icon">🟢</div>
                            <div class="body-part-label">손/손목/손가락</div>
                            <small class="text-muted">손, 손목, 손가락 부위</small>
                        </div>
                        <div class="body-part-card" data-part="waist">
                            <div class="body-part-icon">🔵</div>
                            <div class="body-part-label">허리</div>
                            <small class="text-muted">허리, 요추 부위</small>
                        </div>
                        <div class="body-part-card" data-part="leg">
                            <div class="body-part-icon">🟣</div>
                            <div class="body-part-label">다리/발</div>
                            <small class="text-muted">다리, 무릎, 발, 발목 부위</small>
                        </div>
                    </div>
                </div>

                <!-- 신체 부위 상세 평가 컨테이너 -->
                <div id="body-part-details-container"></div>
            </div>

            <!-- 섹션 5: 통증 발생 원인 및 작업 환경 -->
            <div class="section-card" data-section="5">
                <h2 class="section-title">
                    <span class="section-number">5</span>
                    <span>통증 발생 원인 및 작업 환경</span>
                </h2>

                <div class="form-group">
                    <label class="form-label">통증 발생 시기</label>
                    <div class="radio-group">
                        <div class="radio-option">
                            <input type="radio" name="pain_timing" value="작업 중" id="pain-timing-1">
                            <label for="pain-timing-1">작업 중</label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" name="pain_timing" value="작업 후" id="pain-timing-2">
                            <label for="pain-timing-2">작업 후</label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" name="pain_timing" value="아침 기상 시" id="pain-timing-3">
                            <label for="pain-timing-3">아침 기상 시</label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" name="pain_timing" value="밤 수면 중" id="pain-timing-4">
                            <label for="pain-timing-4">밤 수면 중</label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" name="pain_timing" value="특정 동작 시" id="pain-timing-5">
                            <label for="pain-timing-5">특정 동작 시</label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" name="pain_timing" value="항상" id="pain-timing-6">
                            <label for="pain-timing-6">항상</label>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">통증 유발 동작 (중복 선택 가능)</label>
                    <div class="checkbox-group">
                        <div class="checkbox-option">
                            <input type="checkbox" name="pain_trigger" value="물건 들어올리기" id="pain-trigger-1">
                            <label for="pain-trigger-1">물건 들어올리기</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="pain_trigger" value="물건 내려놓기" id="pain-trigger-2">
                            <label for="pain-trigger-2">물건 내려놓기</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="pain_trigger" value="밀고 당기기" id="pain-trigger-3">
                            <label for="pain-trigger-3">밀고 당기기</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="pain_trigger" value="반복적인 손목 사용" id="pain-trigger-4">
                            <label for="pain-trigger-4">반복적인 손목 사용</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="pain_trigger" value="고개 숙이기" id="pain-trigger-5">
                            <label for="pain-trigger-5">고개 숙이기</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="pain_trigger" value="팔 들어올리기" id="pain-trigger-6">
                            <label for="pain-trigger-6">팔 들어올리기</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="pain_trigger" value="허리 굽히기" id="pain-trigger-7">
                            <label for="pain-trigger-7">허리 굽히기</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="pain_trigger" value="장시간 서있기" id="pain-trigger-8">
                            <label for="pain-trigger-8">장시간 서있기</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="pain_trigger" value="장시간 앉아있기" id="pain-trigger-9">
                            <label for="pain-trigger-9">장시간 앉아있기</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="pain_trigger" value="계단 오르내리기" id="pain-trigger-10">
                            <label for="pain-trigger-10">계단 오르내리기</label>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">주요 작업 자세 (중복 선택 가능)</label>
                    <div class="checkbox-group">
                        <div class="checkbox-option">
                            <input type="checkbox" name="work_posture" value="서서 작업" id="work-posture-1">
                            <label for="work-posture-1">서서 작업</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="work_posture" value="앉아서 작업" id="work-posture-2">
                            <label for="work-posture-2">앉아서 작업</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="work_posture" value="쪼그려 앉아 작업" id="work-posture-3">
                            <label for="work-posture-3">쪼그려 앉아 작업</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="work_posture" value="무릎 꿇고 작업" id="work-posture-4">
                            <label for="work-posture-4">무릎 꿇고 작업</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="work_posture" value="허리 굽혀 작업" id="work-posture-5">
                            <label for="work-posture-5">허리 굽혀 작업</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="work_posture" value="팔 들어 작업" id="work-posture-6">
                            <label for="work-posture-6">팔 들어 작업</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="work_posture" value="고개 숙여 작업" id="work-posture-7">
                            <label for="work-posture-7">고개 숙여 작업</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="work_posture" value="비틀어서 작업" id="work-posture-8">
                            <label for="work-posture-8">비틀어서 작업</label>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label class="form-label">중량물 취급 빈도</label>
                            <div class="radio-group">
                                <div class="radio-option">
                                    <input type="radio" name="heavy_lifting_frequency" value="거의 없음" id="heavy-freq-1">
                                    <label for="heavy-freq-1">거의 없음</label>
                                </div>
                                <div class="radio-option">
                                    <input type="radio" name="heavy_lifting_frequency" value="가끔 (주 1-2회)" id="heavy-freq-2">
                                    <label for="heavy-freq-2">가끔 (주 1-2회)</label>
                                </div>
                                <div class="radio-option">
                                    <input type="radio" name="heavy_lifting_frequency" value="보통 (주 3-4회)" id="heavy-freq-3">
                                    <label for="heavy-freq-3">보통 (주 3-4회)</label>
                                </div>
                                <div class="radio-option">
                                    <input type="radio" name="heavy_lifting_frequency" value="자주 (매일)" id="heavy-freq-4">
                                    <label for="heavy-freq-4">자주 (매일)</label>
                                </div>
                                <div class="radio-option">
                                    <input type="radio" name="heavy_lifting_frequency" value="매우 자주 (하루 여러 번)" id="heavy-freq-5">
                                    <label for="heavy-freq-5">매우 자주 (하루 여러 번)</label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label class="form-label">취급 중량물 무게</label>
                            <div class="radio-group">
                                <div class="radio-option">
                                    <input type="radio" name="heavy_lifting_weight" value="5kg 미만" id="heavy-weight-1">
                                    <label for="heavy-weight-1">5kg 미만</label>
                                </div>
                                <div class="radio-option">
                                    <input type="radio" name="heavy_lifting_weight" value="5-10kg" id="heavy-weight-2">
                                    <label for="heavy-weight-2">5-10kg</label>
                                </div>
                                <div class="radio-option">
                                    <input type="radio" name="heavy_lifting_weight" value="10-20kg" id="heavy-weight-3">
                                    <label for="heavy-weight-3">10-20kg</label>
                                </div>
                                <div class="radio-option">
                                    <input type="radio" name="heavy_lifting_weight" value="20-30kg" id="heavy-weight-4">
                                    <label for="heavy-weight-4">20-30kg</label>
                                </div>
                                <div class="radio-option">
                                    <input type="radio" name="heavy_lifting_weight" value="30kg 이상" id="heavy-weight-5">
                                    <label for="heavy-weight-5">30kg 이상</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 섹션 6: 과거 병력 및 치료 이력 -->
            <div class="section-card" data-section="6">
                <h2 class="section-title">
                    <span class="section-number">6</span>
                    <span>과거 병력 및 치료 이력</span>
                </h2>

                <div class="form-group">
                    <label class="form-label">과거 근골격계 질환 진단 이력</label>
                    <div class="radio-group">
                        <div class="radio-option">
                            <input type="radio" name="previous_musculo_disease" value="있음" id="prev-disease-yes">
                            <label for="prev-disease-yes">있음</label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" name="previous_musculo_disease" value="없음" id="prev-disease-no">
                            <label for="prev-disease-no">없음</label>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">과거 진단받은 질환 (중복 선택 가능)</label>
                    <div class="checkbox-group">
                        <div class="checkbox-option">
                            <input type="checkbox" name="previous_disease_type" value="목 디스크" id="prev-type-1">
                            <label for="prev-type-1">목 디스크 (경추 추간판 탈출증)</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="previous_disease_type" value="어깨 질환" id="prev-type-2">
                            <label for="prev-type-2">어깨 질환 (회전근개 파열, 오십견 등)</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="previous_disease_type" value="손목터널증후군" id="prev-type-3">
                            <label for="prev-type-3">손목터널증후군</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="previous_disease_type" value="테니스 엘보 / 골프 엘보" id="prev-type-4">
                            <label for="prev-type-4">테니스 엘보 / 골프 엘보</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="previous_disease_type" value="허리 디스크" id="prev-type-5">
                            <label for="prev-type-5">허리 디스크 (요추 추간판 탈출증)</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="previous_disease_type" value="척추관 협착증" id="prev-type-6">
                            <label for="prev-type-6">척추관 협착증</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="previous_disease_type" value="무릎 관절염" id="prev-type-7">
                            <label for="prev-type-7">무릎 관절염</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="previous_disease_type" value="족저근막염" id="prev-type-8">
                            <label for="prev-type-8">족저근막염</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="previous_disease_type" value="기타" id="prev-type-9">
                            <label for="prev-type-9">기타</label>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">기타 질환 (구체적으로 기술)</label>
                    <textarea name="previous_disease_other" class="form-control" rows="3" placeholder="기타 근골격계 질환을 자유롭게 기술해주세요."></textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">현재 치료 중인 근골격계 질환</label>
                    <div class="radio-group">
                        <div class="radio-option">
                            <input type="radio" name="current_treatment" value="있음" id="curr-treatment-yes">
                            <label for="curr-treatment-yes">있음</label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" name="current_treatment" value="없음" id="curr-treatment-no">
                            <label for="curr-treatment-no">없음</label>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">치료 방법 (중복 선택 가능)</label>
                    <div class="checkbox-group">
                        <div class="checkbox-option">
                            <input type="checkbox" name="treatment_method" value="약물 치료" id="treatment-1">
                            <label for="treatment-1">약물 치료</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="treatment_method" value="물리 치료" id="treatment-2">
                            <label for="treatment-2">물리 치료</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="treatment_method" value="주사 치료" id="treatment-3">
                            <label for="treatment-3">주사 치료</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="treatment_method" value="한방 치료" id="treatment-4">
                            <label for="treatment-4">한방 치료</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="treatment_method" value="수술 치료" id="treatment-5">
                            <label for="treatment-5">수술 치료</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="treatment_method" value="운동 치료" id="treatment-6">
                            <label for="treatment-6">운동 치료</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="treatment_method" value="기타" id="treatment-7">
                            <label for="treatment-7">기타</label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 섹션 7: 생활 습관 및 운동 -->
            <div class="section-card" data-section="7">
                <h2 class="section-title">
                    <span class="section-number">7</span>
                    <span>생활 습관 및 운동</span>
                </h2>

                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label class="form-label">규칙적인 운동 빈도</label>
                            <select name="exercise_frequency" class="form-select">
                                <option value="">선택하세요</option>
                                <option value="전혀 하지 않음">전혀 하지 않음</option>
                                <option value="월 1-2회">월 1-2회</option>
                                <option value="주 1-2회">주 1-2회</option>
                                <option value="주 3-4회">주 3-4회</option>
                                <option value="주 5회 이상">주 5회 이상</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label class="form-label">흡연 여부</label>
                            <select name="smoking_status" class="form-select">
                                <option value="">선택하세요</option>
                                <option value="비흡연">비흡연</option>
                                <option value="과거 흡연">과거 흡연</option>
                                <option value="현재 흡연">현재 흡연</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label class="form-label">하루 평균 수면 시간</label>
                            <select name="sleep_hours" class="form-select">
                                <option value="">선택하세요</option>
                                <option value="4시간 미만">4시간 미만</option>
                                <option value="4-5시간">4-5시간</option>
                                <option value="5-6시간">5-6시간</option>
                                <option value="6-7시간">6-7시간</option>
                                <option value="7-8시간">7-8시간</option>
                                <option value="8시간 이상">8시간 이상</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label class="form-label">수면의 질</label>
                            <select name="sleep_quality" class="form-select">
                                <option value="">선택하세요</option>
                                <option value="매우 나쁨">매우 나쁨</option>
                                <option value="나쁨">나쁨</option>
                                <option value="보통">보통</option>
                                <option value="좋음">좋음</option>
                                <option value="매우 좋음">매우 좋음</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">업무 스트레스 수준</label>
                    <div class="radio-group">
                        <div class="radio-option">
                            <input type="radio" name="stress_level" value="매우 낮음" id="stress-1">
                            <label for="stress-1">매우 낮음</label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" name="stress_level" value="낮음" id="stress-2">
                            <label for="stress-2">낮음</label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" name="stress_level" value="보통" id="stress-3">
                            <label for="stress-3">보통</label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" name="stress_level" value="높음" id="stress-4">
                            <label for="stress-4">높음</label>
                        </div>
                        <div class="radio-option">
                            <input type="radio" name="stress_level" value="매우 높음" id="stress-5">
                            <label for="stress-5">매우 높음</label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 섹션 8: 작업 환경 개선 요청 사항 -->
            <div class="section-card" data-section="8">
                <h2 class="section-title">
                    <span class="section-number">8</span>
                    <span>작업 환경 개선 요청 사항</span>
                </h2>

                <div class="form-group">
                    <label class="form-label">현재 작업장의 문제점 (중복 선택 가능)</label>
                    <div class="checkbox-group">
                        <div class="checkbox-option">
                            <input type="checkbox" name="workplace_issues" value="작업대 높이 부적절" id="issue-1">
                            <label for="issue-1">작업대 높이 부적절</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="workplace_issues" value="의자 불편함" id="issue-2">
                            <label for="issue-2">의자 불편함</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="workplace_issues" value="조명 부족" id="issue-3">
                            <label for="issue-3">조명 부족</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="workplace_issues" value="소음 문제" id="issue-4">
                            <label for="issue-4">소음 문제</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="workplace_issues" value="온도/습도 부적절" id="issue-5">
                            <label for="issue-5">온도/습도 부적절</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="workplace_issues" value="작업 공간 협소" id="issue-6">
                            <label for="issue-6">작업 공간 협소</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="workplace_issues" value="보조 도구 부족" id="issue-7">
                            <label for="issue-7">보조 도구 부족</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="workplace_issues" value="휴게 시간 부족" id="issue-8">
                            <label for="issue-8">휴게 시간 부족</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="workplace_issues" value="작업 속도 과다" id="issue-9">
                            <label for="issue-9">작업 속도 과다</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="workplace_issues" value="기타" id="issue-10">
                            <label for="issue-10">기타</label>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">작업 환경 개선 건의 사항</label>
                    <textarea name="improvement_suggestions" class="form-control" rows="4" placeholder="작업 환경 개선을 위한 구체적인 건의 사항을 자유롭게 작성해주세요.
예: 작업대 높이 조절, 의자 교체, 보조 도구 지급 등"></textarea>
                </div>

                <div class="form-group">
                    <label class="form-label">필요한 인체공학적 도구 (중복 선택 가능)</label>
                    <div class="checkbox-group">
                        <div class="checkbox-option">
                            <input type="checkbox" name="ergonomic_tools" value="손목 받침대" id="tool-1">
                            <label for="tool-1">손목 받침대</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="ergonomic_tools" value="발판" id="tool-2">
                            <label for="tool-2">발판</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="ergonomic_tools" value="요추 지지 쿠션" id="tool-3">
                            <label for="tool-3">요추 지지 쿠션</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="ergonomic_tools" value="목 베개" id="tool-4">
                            <label for="tool-4">목 베개</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="ergonomic_tools" value="모니터 받침대" id="tool-5">
                            <label for="tool-5">모니터 받침대</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="ergonomic_tools" value="인체공학 마우스" id="tool-6">
                            <label for="tool-6">인체공학 마우스</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="ergonomic_tools" value="인체공학 키보드" id="tool-7">
                            <label for="tool-7">인체공학 키보드</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="ergonomic_tools" value="높이 조절 책상" id="tool-8">
                            <label for="tool-8">높이 조절 책상</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="ergonomic_tools" value="인체공학 의자" id="tool-9">
                            <label for="tool-9">인체공학 의자</label>
                        </div>
                        <div class="checkbox-option">
                            <input type="checkbox" name="ergonomic_tools" value="기타" id="tool-10">
                            <label for="tool-10">기타</label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 섹션 9: 추가 의견 -->
            <div class="section-card" data-section="9">
                <h2 class="section-title">
                    <span class="section-number">9</span>
                    <span>추가 의견</span>
                </h2>

                <div class="form-group">
                    <label class="form-label">기타 의견 및 건의 사항</label>
                    <textarea name="additional_comments" class="form-control" rows="5" placeholder="조사표에 포함되지 않은 내용이나 추가로 전달하고 싶은 의견이 있으시면 자유롭게 작성해주세요."></textarea>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label class="form-label">본 조사표 작성의 난이도</label>
                            <select name="survey_difficulty" class="form-select">
                                <option value="">선택하세요</option>
                                <option value="매우 쉬움">매우 쉬움</option>
                                <option value="쉬움">쉬움</option>
                                <option value="보통">보통</option>
                                <option value="어려움">어려움</option>
                                <option value="매우 어려움">매우 어려움</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group">
                            <label class="form-label">조사표 작성 소요 시간</label>
                            <select name="survey_time" class="form-select">
                                <option value="">선택하세요</option>
                                <option value="5분 미만">5분 미만</option>
                                <option value="5-10분">5-10분</option>
                                <option value="10-15분">10-15분</option>
                                <option value="15-20분">15-20분</option>
                                <option value="20분 이상">20분 이상</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 제출 버튼 -->
            <div class="section-card">
                <div class="d-grid gap-2">
                    <button type="submit" class="btn btn-primary btn-lg">
                        <i class="bi bi-check-circle"></i> 조사표 제출하기
                    </button>
                    <button type="button" class="btn btn-outline-primary" onclick="window.location.href='/'">
                        <i class="bi bi-arrow-left"></i> 메인으로 돌아가기
                    </button>
                </div>
            </div>
        </form>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

    <script>
        // 선택된 신체 부위 저장
        let selectedBodyParts = new Set();

        // 증상 유무에 따른 섹션 표시/숨김
        document.querySelectorAll('input[name="has_symptoms"]').forEach(radio => {
            radio.addEventListener('change', function() {
                const bodyPartsSection = document.getElementById('body-parts-section');
                if (this.value === '예') {
                    bodyPartsSection.style.display = 'block';
                    bodyPartsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else {
                    bodyPartsSection.style.display = 'none';
                    selectedBodyParts.clear();
                    document.querySelectorAll('.body-part-card').forEach(card => {
                        card.classList.remove('selected');
                    });
                    document.getElementById('body-part-details-container').innerHTML = '';
                }
                updateProgress();
            });
        });

        // 신체 부위 선택
        document.querySelectorAll('.body-part-card').forEach(card => {
            card.addEventListener('click', function() {
                const part = this.dataset.part;

                if (selectedBodyParts.has(part)) {
                    // 선택 해제
                    selectedBodyParts.delete(part);
                    this.classList.remove('selected');
                    document.getElementById(\`details-\${part}\`)?.remove();
                } else {
                    // 선택
                    selectedBodyParts.add(part);
                    this.classList.add('selected');
                    addBodyPartDetails(part, this.querySelector('.body-part-label').textContent);
                }

                updateProgress();
            });
        });

        // 신체 부위 상세 질문 추가
        function addBodyPartDetails(part, label) {
            const container = document.getElementById('body-part-details-container');

            const detailsHtml = \`
                <div class="body-part-details active" id="details-\${part}">
                    <div class="detail-header">
                        \${label} 부위 상세 평가
                    </div>

                    <div class="form-group">
                        <label class="form-label">증상 부위 (좌/우/양쪽) <span class="required-mark">*</span></label>
                        <div class="radio-group">
                            <div class="radio-option">
                                <input type="radio" name="\${part}_side" value="왼쪽" id="\${part}-side-left" required>
                                <label for="\${part}-side-left">왼쪽</label>
                            </div>
                            <div class="radio-option">
                                <input type="radio" name="\${part}_side" value="오른쪽" id="\${part}-side-right">
                                <label for="\${part}-side-right">오른쪽</label>
                            </div>
                            <div class="radio-option">
                                <input type="radio" name="\${part}_side" value="양쪽" id="\${part}-side-both">
                                <label for="\${part}-side-both">양쪽</label>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">증상 지속 기간 <span class="required-mark">*</span></label>
                        <div class="radio-group">
                            <div class="radio-option">
                                <input type="radio" name="\${part}_duration" value="1주일 미만" id="\${part}-duration-1" required>
                                <label for="\${part}-duration-1">1주일 미만</label>
                            </div>
                            <div class="radio-option">
                                <input type="radio" name="\${part}_duration" value="1주일 ~ 1개월" id="\${part}-duration-2">
                                <label for="\${part}-duration-2">1주일 ~ 1개월</label>
                            </div>
                            <div class="radio-option">
                                <input type="radio" name="\${part}_duration" value="1개월 ~ 6개월" id="\${part}-duration-3">
                                <label for="\${part}-duration-3">1개월 ~ 6개월</label>
                            </div>
                            <div class="radio-option">
                                <input type="radio" name="\${part}_duration" value="6개월 이상" id="\${part}-duration-4">
                                <label for="\${part}-duration-4">6개월 이상</label>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">증상 발생 빈도 <span class="required-mark">*</span></label>
                        <div class="radio-group">
                            <div class="radio-option">
                                <input type="radio" name="\${part}_frequency" value="한달에 1-3일" id="\${part}-freq-1" required>
                                <label for="\${part}-freq-1">한달에 1-3일</label>
                            </div>
                            <div class="radio-option">
                                <input type="radio" name="\${part}_frequency" value="한달에 4-7일" id="\${part}-freq-2">
                                <label for="\${part}-freq-2">한달에 4-7일</label>
                            </div>
                            <div class="radio-option">
                                <input type="radio" name="\${part}_frequency" value="주 1-2회" id="\${part}-freq-3">
                                <label for="\${part}-freq-3">주 1-2회</label>
                            </div>
                            <div class="radio-option">
                                <input type="radio" name="\${part}_frequency" value="주 3-4회" id="\${part}-freq-4">
                                <label for="\${part}-freq-4">주 3-4회</label>
                            </div>
                            <div class="radio-option">
                                <input type="radio" name="\${part}_frequency" value="매일" id="\${part}-freq-5">
                                <label for="\${part}-freq-5">매일</label>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">통증 정도 (0-10점) <span class="required-mark">*</span></label>
                        <input type="range" class="form-range" name="\${part}_severity" min="1" max="10" step="1" value="5" id="\${part}-severity" required>
                        <div class="d-flex justify-content-between text-muted small mt-2">
                            <span>1 (매우 약함)</span>
                            <span id="\${part}-severity-value" class="fw-bold text-primary">5점</span>
                            <span>10 (매우 심함)</span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">지난 1주일간 통증이 있었습니까? <span class="required-mark">*</span></label>
                        <div class="radio-group">
                            <div class="radio-option">
                                <input type="radio" name="\${part}_last_week" value="예" id="\${part}-last-week-yes" required>
                                <label for="\${part}-last-week-yes">예</label>
                            </div>
                            <div class="radio-option">
                                <input type="radio" name="\${part}_last_week" value="아니오" id="\${part}-last-week-no">
                                <label for="\${part}-last-week-no">아니오</label>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">일상생활이나 작업에 지장을 주었습니까? <span class="required-mark">*</span></label>
                        <div class="radio-group">
                            <div class="radio-option">
                                <input type="radio" name="\${part}_interference" value="예" id="\${part}-interference-yes" required>
                                <label for="\${part}-interference-yes">예</label>
                            </div>
                            <div class="radio-option">
                                <input type="radio" name="\${part}_interference" value="아니오" id="\${part}-interference-no">
                                <label for="\${part}-interference-no">아니오</label>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">통증으로 인한 결과 (중복 선택 가능)</label>
                        <div class="checkbox-group">
                            <div class="checkbox-option">
                                <input type="checkbox" name="\${part}_consequences" value="병가" id="\${part}-cons-1">
                                <label for="\${part}-cons-1">병가</label>
                            </div>
                            <div class="checkbox-option">
                                <input type="checkbox" name="\${part}_consequences" value="작업 전환" id="\${part}-cons-2">
                                <label for="\${part}-cons-2">작업 전환</label>
                            </div>
                            <div class="checkbox-option">
                                <input type="checkbox" name="\${part}_consequences" value="의료기관 방문" id="\${part}-cons-3">
                                <label for="\${part}-cons-3">의료기관 방문</label>
                            </div>
                            <div class="checkbox-option">
                                <input type="checkbox" name="\${part}_consequences" value="약물 복용" id="\${part}-cons-4">
                                <label for="\${part}-cons-4">약물 복용</label>
                            </div>
                            <div class="checkbox-option">
                                <input type="checkbox" name="\${part}_consequences" value="물리치료" id="\${part}-cons-5">
                                <label for="\${part}-cons-5">물리치료</label>
                            </div>
                            <div class="checkbox-option">
                                <input type="checkbox" name="\${part}_consequences" value="특별한 조치 없음" id="\${part}-cons-6">
                                <label for="\${part}-cons-6">특별한 조치 없음</label>
                            </div>
                            <div class="checkbox-option">
                                <input type="checkbox" name="\${part}_consequences" value="기타" id="\${part}-cons-7">
                                <label for="\${part}-cons-7">기타</label>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">기타 (구체적으로 기술)</label>
                        <textarea name="\${part}_consequence_other" class="form-control" rows="3" placeholder="기타 통증으로 인한 결과를 자유롭게 기술해주세요."></textarea>
                    </div>
                </div>
            \`;

            container.insertAdjacentHTML('beforeend', detailsHtml);

            // 통증 정도 슬라이더 이벤트
            const severityInput = document.getElementById(\`\${part}-severity\`);
            const severityValue = document.getElementById(\`\${part}-severity-value\`);
            severityInput.addEventListener('input', function() {
                severityValue.textContent = this.value + '점';
            });

            // 상세 평가 섹션으로 스크롤
            document.getElementById(\`details-\${part}\`).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // 진행 상태 업데이트
        function updateProgress() {
            const totalSections = 9;
            const form = document.getElementById('survey-form');
            const requiredFields = form.querySelectorAll('[required]');
            let filledFields = 0;

            requiredFields.forEach(field => {
                if (field.type === 'radio' || field.type === 'checkbox') {
                    if (field.checked) filledFields++;
                } else if (field.value) {
                    filledFields++;
                }
            });

            const percentage = Math.round((filledFields / requiredFields.length) * 100);
            const progressBar = document.getElementById('progress-bar');
            const completionPercentage = document.getElementById('completion-percentage');

            progressBar.style.width = percentage + '%';
            progressBar.setAttribute('aria-valuenow', percentage);
            completionPercentage.textContent = percentage + '%';
        }

        // 폼 제출 처리
        document.getElementById('survey-form').addEventListener('submit', async function(e) {
            e.preventDefault();

            // 유효성 검사
            if (!this.checkValidity()) {
                this.classList.add('was-validated');
                alert('필수 항목을 모두 입력해주세요.');
                return;
            }

            // 폼 데이터 수집
            const formData = new FormData(this);
            const data = {};

            // 체크박스 그룹 처리
            const checkboxGroups = {};
            formData.forEach((value, key) => {
                if (this.querySelector(\`input[name="\${key}"][type="checkbox"]\`)) {
                    if (!checkboxGroups[key]) {
                        checkboxGroups[key] = [];
                    }
                    checkboxGroups[key].push(value);
                } else {
                    data[key] = value;
                }
            });

            // 체크박스 데이터 추가
            Object.assign(data, checkboxGroups);

            // 선택된 신체 부위 정보 추가
            data.body_parts = Array.from(selectedBodyParts);

            try {
                const response = await fetch('/api/form/001/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    alert('조사표가 성공적으로 제출되었습니다!');
                    window.location.href = '/';
                } else {
                    alert('제출 중 오류가 발생했습니다: ' + (result.error || '알 수 없는 오류'));
                }
            } catch (error) {
                console.error('Submit error:', error);
                alert('제출 중 오류가 발생했습니다. 다시 시도해주세요.');
            }
        });

        // 진행 상태 실시간 업데이트
        document.getElementById('survey-form').addEventListener('input', updateProgress);
        document.getElementById('survey-form').addEventListener('change', updateProgress);

        // 초기 진행 상태 설정
        updateProgress();
    </script>
</body>
</html>`;