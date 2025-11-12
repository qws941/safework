/**
 * 001 근골격계 증상조사표 - dv06_2025-09-26_10-36_Flask_089eeaf 완전 복구
 * 원본 Flask 템플릿 100% 변환 + Jinja2 for loop 확장
 */

export const form001Dv06Template = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="version" content="dv06_2025-09-26_10-36_Flask_089eeaf">
    <title>근골격계 증상조사표 - SafeWork</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">


근골격계 증상조사표 - SafeWork




<style>
    /* === SafeWork 설문 통합 디자인 시스템 === */
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
    
    /* 전체 컨테이너 */
    .survey-container {
        max-width: 900px;
        margin: 0 auto;
        padding: 20px;
        min-width: 0;
        overflow-x: hidden;
    }
    
    /* 섹션 카드 - 통일된 고급 디자인 */
    .section-card {
        background: linear-gradient(145deg, var(--sw-white) 0%, var(--sw-gray-50) 100%);
        border-radius: 16px;
        padding: 28px;
        margin-bottom: 24px;
        box-shadow: 
            0 8px 25px rgba(99, 102, 241, 0.08),
            0 0 0 1px rgba(99, 102, 241, 0.05);
        border: 1px solid rgba(99, 102, 241, 0.1);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
    }
    
    .section-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, var(--sw-primary), var(--sw-primary-light));
    }
    
    .section-card:hover {
        transform: translateY(-3px);
        box-shadow: 
            0 16px 40px rgba(99, 102, 241, 0.15),
            0 0 0 1px rgba(99, 102, 241, 0.1);
    }
    
    /* 섹션 제목 - 완전히 일관된 스타일 */
    .section-title {
        color: var(--sw-gray-900);
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 3px solid var(--sw-primary);
        display: flex;
        align-items: center;
        gap: 12px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.05);
        letter-spacing: -0.025em;
    }
    
    .section-title i {
        color: var(--sw-primary);
        font-size: 1.3em;
        text-shadow: none;
    }
    
    /* 폼 레이아웃 */
    .form-row {
        display: flex;
        gap: 20px;
        margin-bottom: 20px;
        flex-wrap: wrap;
    }
    
    .form-group {
        flex: 1;
        min-width: 280px;
    }
    
    .form-group.half {
        flex: 0 0 calc(50% - 10px);
    }
    
    /* 새로운 카드 기반 UI 스타일 */
    .body-part-grid {
        background: var(--sw-gray-50);
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 24px;
        border: 2px dashed var(--sw-primary);
        animation: fadeInSlide 0.4s ease-out;
    }
    
    @keyframes fadeInSlide {
        0% {
            opacity: 0;
            transform: translateY(20px);
        }
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .body-part-card {
        transition: all 0.3s ease;
        cursor: pointer;
    }
    
    .body-part-card:hover:not(.disabled) .card {
        transform: translateY(-5px);
        box-shadow: 0 8px 25px rgba(99, 102, 241, 0.2);
        border-color: var(--sw-primary);
    }
    
    .body-part-card .card {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 2px solid var(--sw-gray-200);
        background: var(--sw-white);
        cursor: pointer;
    }
    
    .body-part-card.disabled .card {
        background: var(--sw-success);
        border-color: var(--sw-success);
        color: white;
        cursor: default;
    }
    
    .body-part-icon {
        font-size: 3rem;
        color: var(--sw-primary);
        margin-bottom: 0.5rem;
    }
    
    .body-part-card.disabled .body-part-icon {
        color: white;
    }
    
    .body-part-card .card-title {
        font-weight: 600;
        color: var(--sw-gray-900);
        margin-bottom: 0.25rem;
    }
    
    .body-part-card.disabled .card-title {
        color: white;
    }
    
    /* 선택된 부위별 증상평가 블록 */
    .selected-parts-container {
        margin-top: 24px;
    }
    
    .symptom-evaluation-block {
        border: 2px solid var(--sw-primary);
        border-radius: 12px;
        animation: slideInUp 0.5s ease-out;
        box-shadow: 0 4px 16px rgba(99, 102, 241, 0.1);
    }
    
    @keyframes slideInUp {
        0% {
            opacity: 0;
            transform: translateY(30px);
        }
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .symptom-evaluation-block .card-header {
        background: linear-gradient(135deg, var(--sw-primary) 0%, var(--sw-primary-dark) 100%);
        color: white;
        border-bottom: none;
        border-radius: 10px 10px 0 0;
        padding: 16px 20px;
        font-weight: 600;
    }
    
    .symptom-evaluation-block .card-body {
        padding: 24px;
        background: var(--sw-white);
    }
    
    .symptom-evaluation-block .form-label {
        color: var(--sw-gray-900);
        font-weight: 600;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .symptom-evaluation-block .text-danger {
        color: var(--sw-danger) !important;
    }
    
    /* 라디오/체크박스 그룹 개선 */
    .radio-group-vertical {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    
    .radio-group-vertical label {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        background: var(--sw-gray-50);
        border: 1px solid var(--sw-gray-200);
        transition: all 0.2s ease;
        cursor: pointer;
    }
    
    .radio-group-vertical label:hover {
        background: var(--sw-primary-light);
        border-color: var(--sw-primary);
    }
    
    .radio-group-vertical input[type="radio"]:checked + span,
    .radio-group-vertical input[type="radio"]:checked ~ span {
        color: var(--sw-primary-dark);
        font-weight: 600;
    }
    
    .checkbox-group {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
    }
    
    .checkbox-group label {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: var(--sw-gray-50);
        border: 1px solid var(--sw-gray-200);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.9rem;
    }
    
    .checkbox-group label:hover {
        background: var(--sw-primary-light);
        border-color: var(--sw-primary);
    }
    
    .checkbox-group input[type="checkbox"]:checked + span {
        color: var(--sw-primary-dark);
        font-weight: 600;
    }
    
    /* 통증 정도 옵션 스타일 */
    .pain-level-option {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
    }
    
    .pain-level-option strong {
        color: var(--sw-gray-900);
        margin-bottom: 4px;
    }
    
    .pain-level-option small {
        color: var(--sw-gray-600);
        font-size: 0.8rem;
        line-height: 1.3;
    }
        min-width: 220px;
    }
    
    .form-group.third {
        flex: 0 0 calc(33.333% - 14px);
        min-width: 180px;
    }
    
    /* 폼 레이블 */
    .form-label {
        display: block;
        font-weight: 600;
        color: var(--sw-gray-600);
        margin-bottom: 8px;
        font-size: 1rem;
        letter-spacing: -0.01em;
    }
    
    .form-label.required::after {
        content: " *";
        color: var(--sw-danger);
        font-weight: 700;
    }
    
    /* 입력 필드 - 통일된 고급 스타일 */
    .form-control {
        width: 100%;
        padding: 14px 18px;
        border: 2px solid var(--sw-gray-200);
        border-radius: 12px;
        font-size: 15px;
        background: var(--sw-white);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: inherit;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    
    .form-control:hover {
        border-color: var(--sw-primary-light);
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.08);
    }
    
    .form-control:focus {
        outline: none;
        border-color: var(--sw-primary);
        box-shadow: 
            0 0 0 4px rgba(99, 102, 241, 0.15),
            0 2px 8px rgba(99, 102, 241, 0.08);
        background: var(--sw-gray-50);
    }
    
    /* 체크박스/라디오 그룹 - 완전히 새로운 디자인 */
    .checkbox-group,
    .radio-group {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
        margin-top: 20px;
    }
    
    .checkbox-item,
    .radio-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        background: linear-gradient(145deg, var(--sw-gray-50) 0%, var(--sw-gray-100) 100%);
        border: 2px solid var(--sw-gray-200);
        border-radius: 12px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        position: relative;
        overflow: hidden;
    }
    
    .checkbox-item::before,
    .radio-item::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, 
            transparent, 
            rgba(99, 102, 241, 0.1), 
            transparent);
        transition: left 0.6s ease;
    }
    
    .checkbox-item:hover::before,
    .radio-item:hover::before {
        left: 100%;
    }
    
    .checkbox-item:hover,
    .radio-item:hover {
        background: linear-gradient(145deg, var(--sw-gray-100) 0%, var(--sw-gray-200) 100%);
        border-color: var(--sw-primary);
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(99, 102, 241, 0.15);
    }
    
    /* 선택된 상태 */
    .checkbox-item:has(input:checked),
    .radio-item:has(input:checked) {
        background: linear-gradient(145deg, #ddd6fe 0%, #c4b5fd 100%);
        border-color: var(--sw-primary);
        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.25);
    }
    
    .checkbox-item input,
    .radio-item input {
        margin: 0;
        transform: scale(1.2);
        accent-color: var(--sw-primary);
    }
    
    .checkbox-item label,
    .radio-item label {
        margin: 0;
        font-size: 0.95rem;
        color: var(--sw-gray-600);
        font-weight: 500;
        cursor: pointer;
    }
    
    .checkbox-item:has(input:checked) label,
    .radio-item:has(input:checked) label {
        color: var(--sw-primary-dark);
        font-weight: 600;
        cursor: pointer;
    }
    
    .symptoms-grid {
        display: grid;
        gap: 15px;
    }
    
    .symptom-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 15px;
        min-width: 0;
        overflow-x: auto;
    }
    
    .symptom-title {
        font-weight: 600;
        color: #1e40af;
        margin-bottom: 12px;
        font-size: 1rem;
    }
    
    .symptom-questions {
        display: grid;
        gap: 10px;
    }
    
    .question-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #e5e7eb;
    }
    
    .question-row:last-child {
        border-bottom: none;
    }
    
    .question-text {
        font-size: 0.85rem;
        color: #374151;
        flex: 1;
        line-height: 1.4;
        word-break: keep-all;
        overflow-wrap: break-word;
    }
    
    .answer-options {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }
    
    .option-btn {
        padding: 6px 8px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: #ffffff;
        font-size: 0.75rem;
        cursor: pointer;
        min-width: 50px;
        text-align: center;
        word-break: keep-all;
        white-space: normal;
        line-height: 1.2;
        flex: 0 0 auto;
        transition: all 0.2s ease;
    }
    
    .option-btn.selected {
        background: var(--sw-primary);
        color: var(--sw-white);
        border-color: var(--sw-primary);
    }
    
    .question-row.disabled {
        opacity: 0.6;
        pointer-events: none;
    }
    
    .question-row.disabled .question-text {
        color: var(--sw-gray-600);
    }
    
    /* 증상 평가 테이블 - 완전히 새로운 디자인 */
    .symptoms-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        margin: 24px 0;
        font-size: 0.9rem;
        background: var(--sw-white);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 
            0 8px 25px rgba(99, 102, 241, 0.08),
            0 0 0 1px rgba(99, 102, 241, 0.05);
    }
    
    .symptoms-table th {
        background: linear-gradient(135deg, var(--sw-primary) 0%, var(--sw-primary-dark) 100%);
        color: var(--sw-white);
        text-align: center;
        font-weight: 700;
        letter-spacing: -0.01em;
        vertical-align: middle;
        font-weight: 600;
        font-size: 0.9rem;
        padding: 16px 12px;
        border: none;
        position: sticky;
        top: 0;
        z-index: 10;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .question-cell {
        background: linear-gradient(135deg, var(--sw-gray-50) 0%, var(--sw-gray-100) 100%);
        font-weight: 600;
        color: var(--sw-gray-900);
        text-align: left;
        vertical-align: middle;
        padding: 18px 16px;
        border: 1px solid var(--sw-gray-200);
        width: 300px;
        min-width: 300px;
        line-height: 1.4;
    }
    
    .answer-cell {
        text-align: center;
        vertical-align: middle;
        padding: 14px 10px;
        border: 1px solid var(--sw-gray-200);
        background-color: var(--sw-white);
        min-width: 120px;
        transition: background-color 0.2s ease;
    }
    
    .answer-cell:hover {
        background-color: var(--sw-gray-50);
    }
    
    .radio-group-vertical,
    .checkbox-group-vertical {
        display: flex;
        flex-direction: column;
        gap: 6px;
        align-items: flex-start;
    }
    
    .radio-group-vertical label,
    .checkbox-group-vertical label {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 0.8rem;
        margin-bottom: 8px;
        cursor: pointer;
        padding: 8px 12px;
        border-radius: 6px;
        transition: background-color 0.2s ease;
        border: 1px solid transparent;
    }
    
    .radio-group-vertical label:hover {
        background-color: var(--sw-primary-50);
        border-color: var(--sw-primary-200);
    }
    
    .pain-level-option {
        display: flex;
        flex-direction: column;
        gap: 2px;
        line-height: 1.3;
    }
    
    .pain-level-option strong {
        color: var(--sw-primary-700);
        font-size: 0.9rem;
    }
    
    .pain-level-option small {
        color: var(--sw-gray-600);
        font-size: 0.75rem;
        line-height: 1.4;
    }
    
    .radio-group-vertical input,
    .checkbox-group-vertical input[type="checkbox"],
    .checkbox-group-vertical input[type="radio"] {
        margin: 0;
        flex-shrink: 0;
    }
    
    .checkbox-group-vertical input[type="text"] {
        margin-top: 4px;
        font-size: 0.75rem;
        padding: 2px 4px;
    }
    
    .severity-guide {
        margin-top: 8px;
        padding: 8px;
        background-color: #f0f9ff;
        border-radius: 4px;
        border-left: 3px solid #0ea5e9;
    }
    
    .severity-guide small {
        line-height: 1.4;
    }
    
    .required {
        color: #ef4444;
    }
    
    /* 제출 버튼 섹션 - 고급 디자인 */
    .submit-section {
        text-align: center;
        margin-top: 40px;
        padding: 24px;
        background: linear-gradient(145deg, var(--sw-gray-50) 0%, var(--sw-white) 100%);
        border-radius: 16px;
        border: 1px solid var(--sw-gray-200);
    }
    
    .submit-btn {
        background: linear-gradient(135deg, var(--sw-primary) 0%, var(--sw-primary-dark) 100%);
        color: var(--sw-white);
        border: none;
        padding: 18px 48px;
        border-radius: 12px;
        font-size: 1.1rem;
        font-weight: 700;
        cursor: pointer;
        letter-spacing: -0.02em;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 
            0 4px 15px rgba(99, 102, 241, 0.3),
            0 1px 3px rgba(0, 0, 0, 0.1);
        position: relative;
        overflow: hidden;
    }
    
    .submit-btn::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, 
            transparent, 
            rgba(255, 255, 255, 0.3), 
            transparent);
        transition: left 0.6s ease;
    }
    
    .submit-btn:hover {
        transform: translateY(-3px);
        box-shadow: 
            0 8px 25px rgba(99, 102, 241, 0.4),
            0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .submit-btn:hover::before {
        left: 100%;
    }
    
    .submit-btn:active {
        transform: translateY(-1px);
        box-shadow: 
            0 4px 15px rgba(99, 102, 241, 0.35),
            0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    /* 반응형 테이블 스크롤 컨테이너 */
    .table-responsive {
        border-radius: 16px;
        border: 1px solid var(--sw-gray-200);
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        background: var(--sw-white);
        overflow-x: auto;
        -webkit-overflow-scrolling: touch; /* iOS 부드러운 스크롤 */
        position: relative;
    }

    /* 스크롤바 스타일링 */
    .table-responsive::-webkit-scrollbar {
        height: 8px;
    }

    .table-responsive::-webkit-scrollbar-track {
        background: var(--sw-gray-100);
        border-radius: 4px;
    }

    .table-responsive::-webkit-scrollbar-thumb {
        background: var(--sw-primary);
        border-radius: 4px;
    }

    .table-responsive::-webkit-scrollbar-thumb:hover {
        background: var(--sw-primary-dark);
    }

    /* 모바일에서 스크롤 가이드 표시 */
    @media (max-width: 768px) {
        .table-responsive::before {
            content: "← 좌우로 스크롤하여 모든 항목을 확인하세요 →";
            display: block;
            text-align: center;
            padding: 8px;
            background: linear-gradient(135deg, var(--sw-primary-light) 0%, var(--sw-primary) 100%);
            color: var(--sw-white);
            font-size: 0.8rem;
            font-weight: 600;
            border-radius: 8px 8px 0 0;
            margin-bottom: 0;
        }
        
        .symptoms-table {
            border-radius: 0 0 16px 16px;
        }
    }

    /* 반응형 디자인 */
    @media (max-width: 768px) {
        .survey-container {
            padding: 16px;
        }
        
        .section-card {
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .section-title {
            font-size: 1.3rem;
        }
        
        .form-row {
            gap: 16px;
        }
        
        .form-group,
        .form-group.half,
        .form-group.third {
            min-width: 100%;
        }
        
        .checkbox-group,
        .radio-group {
            grid-template-columns: 1fr;
        }
        
        .symptoms-table {
            font-size: 0.8rem;
        }
        
        .question-cell {
            min-width: 250px;
            width: 250px;
            font-size: 0.85rem;
            padding: 14px;
        }

        .answer-cell {
            min-width: 100px;
            padding: 10px 8px;
        }
        
        .submit-btn {
            padding: 16px 32px;
            font-size: 1rem;
        }
    }
    
    @media (max-width: 480px) {
        .section-card {
            padding: 16px;
        }
        
        .section-title {
            font-size: 1.2rem;
            gap: 8px;
        }
        
        .checkbox-item,
        .radio-item {
            padding: 12px 14px;
        }
        
        .question-cell {
            min-width: 200px;
            width: 200px;
            padding: 12px;
            font-size: 0.8rem;
        }

        .answer-cell {
            min-width: 90px;
            padding: 8px 6px;
        }

        .radio-group-vertical label,
        .checkbox-group-vertical label {
            font-size: 0.75rem;
            gap: 4px;
        }
        
        .submit-btn {
            padding: 14px 24px;
            font-size: 0.95rem;
        }
    }
    
    /* 알림 메시지 스타일 */
    .alert {
        padding: 16px 20px;
        margin-bottom: 20px;
        border-radius: 12px;
        border: 1px solid transparent;
    }
    
    .alert-info {
        background: linear-gradient(145deg, #dbeafe 0%, #bfdbfe 100%);
        border-color: var(--sw-primary);
        color: var(--sw-primary-dark);
    }
    
    .alert strong {
        font-weight: 700;
    }
    
    /* === 질병 단계식 입력 스타일 (Issue #11) === */
    .disease-selection-grid {
        margin-top: 20px;
    }
    
    .disease-card {
        border: 2px solid var(--sw-gray-200);
        border-radius: 12px;
        transition: all 0.3s ease;
        background: var(--sw-white);
    }
    
    .disease-card:hover {
        border-color: var(--sw-primary-light);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
    }
    
    .disease-card .card-title {
        color: var(--sw-gray-700);
        font-size: 1.1rem;
        margin-bottom: 0;
    }
    
    .remove-disease {
        opacity: 0.7;
        transition: all 0.2s ease;
    }
    
    .remove-disease:hover {
        opacity: 1;
        transform: scale(1.05);
    }
    
    .disease-option {
        border-radius: 8px;
        padding: 12px;
        transition: all 0.2s ease;
        font-weight: 500;
    }
    
    .disease-option:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .disease-option.btn-success {
        background-color: var(--sw-success);
        border-color: var(--sw-success);
    }
    
    .selected-diseases-container {
        max-height: 500px;
        overflow-y: auto;
    }
    
    .alert-info {
        background-color: rgba(99, 102, 241, 0.1);
        border-color: var(--sw-primary-light);
        color: var(--sw-primary-dark);
    }
    
    /* 직접입력 기능 스타일 */
    .input-with-custom {
        position: relative;
    }
    
    .input-with-custom select option[value="__custom__"] {
        background: linear-gradient(135deg, var(--sw-primary) 0%, var(--sw-primary-dark) 100%);
        color: white;
        font-weight: 600;
    }
    
    .input-with-custom input[type="text"] {
        border: 2px solid var(--sw-primary);
        background: var(--sw-gray-50);
        transition: all 0.3s ease;
    }
    
    .input-with-custom input[type="text"]:focus {
        border-color: var(--sw-primary-dark);
        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
        background: white;
    }
    
    .custom-input-error {
        border-color: var(--sw-danger) !important;
        box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.15) !important;
    }
    
    .error-message {
        color: var(--sw-danger);
        font-size: 0.85rem;
        margin-top: 5px;
        display: none;
    }

    /* Success Modal Styles */
    .modal-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 9999;
        animation: fadeIn 0.3s ease-out;
    }

    .modal-overlay.active {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .success-modal {
        background: white;
        border-radius: 16px;
        padding: 2rem;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.4s ease-out;
        text-align: center;
    }

    .success-icon {
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.5rem;
        animation: scaleIn 0.5s ease-out 0.2s both;
    }

    .success-icon i {
        font-size: 40px;
        color: white;
    }

    .success-modal h3 {
        color: #1f2937;
        font-size: 1.5rem;
        margin-bottom: 0.5rem;
        font-weight: 600;
    }

    .success-modal p {
        color: #6b7280;
        margin-bottom: 1.5rem;
        font-size: 0.95rem;
    }

    .submission-id {
        background: #f3f4f6;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        margin-bottom: 1.5rem;
        font-family: monospace;
        font-size: 0.85rem;
        color: #374151;
        word-break: break-all;
    }

    .modal-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
    }

    .modal-btn {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        font-size: 0.95rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-primary {
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
        color: white;
    }

    .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }

    .btn-secondary {
        background: #f3f4f6;
        color: #374151;
    }

    .btn-secondary:hover {
        background: #e5e7eb;
    }

    /* Loading Spinner */
    .loading-spinner {
        display: none;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10000;
    }

    .loading-spinner.active {
        display: block;
    }

    .spinner {
        width: 50px;
        height: 50px;
        border: 4px solid rgba(99, 102, 241, 0.2);
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @keyframes slideUp {
        from {
            transform: translateY(50px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }

    @keyframes scaleIn {
        from {
            transform: scale(0);
            opacity: 0;
        }
        to {
            transform: scale(1);
            opacity: 1;
        }
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>



<div class="survey-container">
    <form method="POST" action="/api/survey/d1/submit" id="surveyForm">
        
        <div class="text-center mb-4">
            <h2 style="color: #1f2937; margin-bottom: 5px;">
                <i class="bi bi-clipboard2-pulse"></i> 근골격계 증상조사표
            </h2>
            <p style="color: #6b7280; font-size: 0.9rem;">PDF 001 - 정확한 데이터 수집</p>
        </div>

        <!-- I. 기본정보 -->
        <div class="section-card">
            <h4 class="section-title">
                <i class="bi bi-person"></i> I. 기본정보
            </h4>
            
            <div class="form-row">
                <div class="form-group half">
                    <label class="form-label required">성명</label>
                    <input type="text" name="name" class="form-control" placeholder="홍길동" required>
                </div>
                <div class="form-group half">
                    <label class="form-label required">연령</label>
                    <input type="number" name="age" class="form-control" placeholder="35" required>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label required">성별</label>
                    <div class="radio-group">
                        <div class="radio-item">
                            <input type="radio" id="gender_male" name="gender" value="남" required>
                            <label for="gender_male">남</label>
                        </div>
                        <div class="radio-item">
                            <input type="radio" id="gender_female" name="gender" value="여" required>
                            <label for="gender_female">여</label>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group half">
                    <label class="form-label required">업체명</label>
                    <div class="input-with-custom">
                        <select name="company" class="form-control" required id="company_select">
                            <option value="">-- 업체를 선택하세요 --</option>
                            <option value="미래도시건설">미래도시건설</option>
                            <option value="직영팀">직영팀</option>
                            <option value="포커스이엔씨">포커스이엔씨</option>
                            <option value="골조팀">골조팀</option>
                            <option value="티이엔">티이엔</option>
                            <option value="__custom__">+ 직접입력</option>
                        </select>
                        <input type="text" name="company_custom" class="form-control mt-2" id="company_custom" 
                               placeholder="업체명을 입력하세요 (1-30자)" maxlength="30" style="display:none;">
                        <div class="error-message" id="company_error"></div>
                    </div>
                </div>
                <div class="form-group half">
                    <label class="form-label required">공정명</label>
                    <div class="input-with-custom">
                        <select name="process" class="form-control" required id="process_select">
                            <option value="">-- 공정을 선택하세요 --</option>
                            <option value="관리자">관리자</option>
                            <option value="철근">철근</option>
                            <option value="형틀목공">형틀목공</option>
                            <option value="콘크리트타설">콘크리트타설</option>
                            <option value="비계">비계</option>
                            <option value="전기">전기</option>
                            <option value="배관">배관</option>
                            <option value="방수">방수</option>
                            <option value="도장">도장</option>
                            <option value="미장">미장</option>
                            <option value="석공">석공</option>
                            <option value="타일">타일</option>
                            <option value="토공">토공</option>
                            <option value="굴삭">굴삭</option>
                            <option value="크레인">크레인</option>
                            <option value="신호수">신호수</option>
                            <option value="용접">용접</option>
                            <option value="__custom__">+ 직접입력</option>
                        </select>
                        <input type="text" name="process_custom" class="form-control mt-2" id="process_custom" 
                               placeholder="공정명을 입력하세요 (1-30자)" maxlength="30" style="display:none;">
                        <div class="error-message" id="process_error"></div>
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label required">직위/역할</label>
                    <div class="input-with-custom">
                        <select name="role" class="form-control" required id="role_select">
                            <option value="">-- 직위/역할을 선택하세요 --</option>
                            <option value="관리자">관리자</option>
                            <option value="보통인부">보통인부</option>
                            <option value="장비기사">장비기사</option>
                            <option value="신호수">신호수</option>
                            <option value="용접공">용접공</option>
                            <option value="전기공">전기공</option>
                            <option value="배관공">배관공</option>
                            <option value="타워크레인운전원">타워크레인운전원</option>
                            <option value="굴삭기기사">굴삭기기사</option>
                            <option value="안전관리자">안전관리자</option>
                            <option value="보건관리자">보건관리자</option>
                            <option value="__custom__">+ 직접입력</option>
                        </select>
                        <input type="text" name="role_custom" class="form-control mt-2" id="role_custom" 
                               placeholder="직위/역할을 입력하세요 (1-30자)" maxlength="30" style="display:none;">
                        <div class="error-message" id="role_error"></div>
                    </div>
                </div>
                <div class="form-group half">
                    <label class="form-label">직위</label>
                    <input type="text" name="position" class="form-control" placeholder="사원">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group half">
                    <label class="form-label">현 직장경력 (년)</label>
                    <input type="number" name="work_years" class="form-control" placeholder="5">
                </div>
                <div class="form-group half">
                    <label class="form-label">현 직장경력 (개월)</label>
                    <input type="number" name="work_months" class="form-control" placeholder="3">
                </div>
            </div>
            
            
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">결혼여부</label>
                    <div class="radio-group">
                        <div class="radio-item">
                            <input type="radio" id="marriage_single" name="marriage_status" value="미혼">
                            <label for="marriage_single">미혼</label>
                        </div>
                        <div class="radio-item">
                            <input type="radio" id="marriage_married" name="marriage_status" value="기혼">
                            <label for="marriage_married">기혼</label>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 현재하고 있는 작업 -->
        <div class="section-card">
            <h4 class="section-title">
                <i class="bi bi-briefcase"></i> 현재하고 있는 작업
            </h4>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">작업내용 (구체적으로)</label>
                    <textarea name="current_work_details" class="form-control" rows="3" placeholder="예: 컨베이어 벨트에서 제품 조립 작업"></textarea>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group third">
                    <label class="form-label">작업기간 (년)</label>
                    <input type="number" name="current_work_years" class="form-control" placeholder="2">
                </div>
                <div class="form-group third">
                    <label class="form-label">작업기간 (개월)</label>
                    <input type="number" name="current_work_months" class="form-control" placeholder="6">
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group third">
                    <label class="form-label">1일 근무시간</label>
                    <input type="number" name="work_hours_per_day" class="form-control" placeholder="8">
                </div>
                <div class="form-group third">
                    <label class="form-label">휴식시간(분)</label>
                    <input type="number" name="break_time_minutes" class="form-control" placeholder="60">
                </div>
                <div class="form-group third">
                    <label class="form-label">휴식횟수</label>
                    <input type="number" name="break_frequency" class="form-control" placeholder="2">
                </div>
            </div>
        </div>

        <!-- 현작업을 하기 전에 했던 작업 -->
        <div class="section-card">
            <h4 class="section-title">
                <i class="bi bi-clock-history"></i> 현작업을 하기 전에 했던 작업
            </h4>
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">작업내용</label>
                    <textarea name="previous_work_details" class="form-control" rows="2" placeholder="예: 포장 작업"></textarea>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group half">
                    <label class="form-label">작업기간 (년)</label>
                    <input type="number" name="previous_work_years" class="form-control" placeholder="1">
                </div>
                <div class="form-group half">
                    <label class="form-label">작업기간 (개월)</label>
                    <input type="number" name="previous_work_months" class="form-control" placeholder="6">
                </div>
            </div>
        </div>

        <!-- 1. 여가 및 취미활동 -->
        <div class="section-card">
            <h4 class="section-title">
                <i class="bi bi-palette"></i> 1. 여가 및 취미활동
            </h4>
            <p class="mb-3"><small>규칙적인 (한번에 30분 이상, 1주일에 2-3회, 적어도 1회 이상) 여가 및 취미활동을 하고 계시는 곳에 표시(✓)하여 주십시오.</small></p>
            
            <div class="checkbox-group">
                <div class="checkbox-item">
                    <input type="checkbox" id="hobby_computer" name="hobby_computer">
                    <label for="hobby_computer">컴퓨터 관련활동</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" id="hobby_instrument" name="hobby_instrument">
                    <label for="hobby_instrument">악기연주 (피아노, 바이올린 등)</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" id="hobby_knitting" name="hobby_knitting">
                    <label for="hobby_knitting">뜨개질/자수/붓글씨</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" id="hobby_racket_sports" name="hobby_racket_sports">
                    <label for="hobby_racket_sports">테니스/배드민턴/스쿼시</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" id="hobby_ball_sports" name="hobby_ball_sports">
                    <label for="hobby_ball_sports">축구/족구/농구/스키</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" id="hobby_none" name="hobby_none">
                    <label for="hobby_none">해당사항 없음</label>
                </div>
            </div>
        </div>

        <!-- 2. 가사노동시간 -->
        <div class="section-card">
            <h4 class="section-title">
                <i class="bi bi-house"></i> 2. 가사노동시간
            </h4>
            <p class="mb-3"><small>귀하의 하루 평균 가사노동시간 (밥하기, 빨래하기, 청소하기, 2살 미만의 아이 돌보기 등)은 얼마나 됩니까?</small></p>
            
            <div class="radio-group">
                <div class="radio-item">
                    <input type="radio" id="housework_none" name="housework_hours" value="거의하지않는다">
                    <label for="housework_none">거의 하지 않는다</label>
                </div>
                <div class="radio-item">
                    <input type="radio" id="housework_1h" name="housework_hours" value="1시간미만">
                    <label for="housework_1h">1시간 미만</label>
                </div>
                <div class="radio-item">
                    <input type="radio" id="housework_2h" name="housework_hours" value="1-2시간">
                    <label for="housework_2h">1-2시간 미만</label>
                </div>
                <div class="radio-item">
                    <input type="radio" id="housework_3h" name="housework_hours" value="2-3시간">
                    <label for="housework_3h">2-3시간 미만</label>
                </div>
                <div class="radio-item">
                    <input type="radio" id="housework_over3h" name="housework_hours" value="3시간이상">
                    <label for="housework_over3h">3시간 이상</label>
                </div>
            </div>
        </div>

        <!-- 3. 진단받은 질병 -->
        <div class="section-card">
            <h4 class="section-title">
                <i class="bi bi-heart-pulse"></i> 3. 진단받은 질병
            </h4>
            <p class="mb-3"><small>의사에게서 근골격계 관련 질병을 진단받은 적이 있습니까?</small></p>
            
            <!-- Step 1: 예/아니오 선택 -->
            <div class="radio-group">
                <div class="radio-item">
                    <input type="radio" id="diagnosed_no" name="diagnosed" value="no">
                    <label for="diagnosed_no">아니오</label>
                </div>
                <div class="radio-item">
                    <input type="radio" id="diagnosed_yes" name="diagnosed" value="yes">
                    <label for="diagnosed_yes">예</label>
                </div>
            </div>
            
            <!-- Step 2: 질병 선택 그리드 (예 선택 시에만 표시) -->
            <div id="disease_grid_section" style="display: none; margin-top: 20px;">
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i> 진단받은 질병을 선택하고 현재 상태를 지정해주세요.
                    <br><small class="text-muted mt-1"><strong>보기:</strong> 류머티스 관절염, 당뇨병, 루프스병, 통풍, 알코올중독, 기타</small>
                </div>
                
                <div id="selected_diseases_container">
                    <!-- 선택된 질병 카드들이 여기에 동적으로 추가됩니다 -->
                </div>
                
                <!-- 질병 선택 그리드 -->
                <div class="disease-selection-grid">
                    <label class="form-label">질병 선택:</label>
                    <div class="row g-2">
                        <div class="col-md-4 col-6">
                            <button type="button" class="btn btn-outline-primary w-100 disease-option" data-disease="류머티스관절염">
                                <i class="bi bi-plus"></i> 류머티스관절염
                            </button>
                        </div>
                        <div class="col-md-4 col-6">
                            <button type="button" class="btn btn-outline-primary w-100 disease-option" data-disease="당뇨병">
                                <i class="bi bi-plus"></i> 당뇨병
                            </button>
                        </div>
                        <div class="col-md-4 col-6">
                            <button type="button" class="btn btn-outline-primary w-100 disease-option" data-disease="루프스병">
                                <i class="bi bi-plus"></i> 루프스병
                            </button>
                        </div>
                        <div class="col-md-4 col-6">
                            <button type="button" class="btn btn-outline-primary w-100 disease-option" data-disease="통풍">
                                <i class="bi bi-plus"></i> 통풍
                            </button>
                        </div>
                        <div class="col-md-4 col-6">
                            <button type="button" class="btn btn-outline-primary w-100 disease-option" data-disease="알코올중독">
                                <i class="bi bi-plus"></i> 알코올중독
                            </button>
                        </div>
                        <div class="col-md-4 col-6">
                            <button type="button" class="btn btn-outline-secondary w-100" id="disease_custom">
                                <i class="bi bi-plus"></i> 기타 (직접입력)
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="text-center mt-3">
                    <small class="text-muted">질병을 선택하면 상태 지정 카드가 나타납니다</small>
                </div>
            </div>
            
            <!-- 숨겨진 input 필드들 (서버 전송용) -->
            <input type="hidden" id="diseases_data" name="diseases_data">
        </div>

        <!-- 4. 과거 사고 -->
        <div class="section-card">
            <h4 class="section-title">
                <i class="bi bi-bandaid"></i> 4. 과거 사고
            </h4>
            <p class="mb-3"><small>과거에 운동 중 혹은 사고로 (교통사고, 넘어짐, 추락 등) 인해 손/손가락/손목, 팔/팔꿈치, 어깨, 목, 허리, 다리/발 부위를 다친 적이 있습니까?</small></p>
            
            <div class="radio-group">
                <div class="radio-item">
                    <input type="radio" id="accident_no" name="past_accident" value="아니오">
                    <label for="accident_no">아니오</label>
                </div>
                <div class="radio-item">
                    <input type="radio" id="accident_yes" name="past_accident" value="예">
                    <label for="accident_yes">예</label>
                </div>
            </div>
            
            <!-- Step 2: 사고 부위 선택 그리드 (예 선택 시에만 표시) -->
            <div id="accident_parts_section" style="display: none; margin-top: 20px;">
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i> 다친 부위를 선택하고 현재 상태를 지정해주세요.
                    <br><small class="text-muted mt-1"><strong>보기:</strong> 손/손가락/손목, 팔/팔꿈치, 어깨, 목, 허리, 다리/발</small>
                </div>
                
                <div id="selected_accidents_container">
                    <!-- 선택된 부위 카드들이 여기에 동적으로 추가됩니다 -->
                </div>
                
                <!-- 부위 선택 그리드 -->
                <div class="accident-selection-grid">
                    <label class="form-label">부위 선택:</label>
                    <div class="row g-2">
                        <div class="col-md-4 col-6">
                            <button type="button" class="btn btn-outline-primary w-100 accident-option" data-part="손/손가락/손목">
                                <i class="bi bi-plus"></i> 손/손가락/손목
                            </button>
                        </div>
                        <div class="col-md-4 col-6">
                            <button type="button" class="btn btn-outline-primary w-100 accident-option" data-part="팔/팔꿈치">
                                <i class="bi bi-plus"></i> 팔/팔꿈치
                            </button>
                        </div>
                        <div class="col-md-4 col-6">
                            <button type="button" class="btn btn-outline-primary w-100 accident-option" data-part="어깨">
                                <i class="bi bi-plus"></i> 어깨
                            </button>
                        </div>
                        <div class="col-md-4 col-6">
                            <button type="button" class="btn btn-outline-primary w-100 accident-option" data-part="목">
                                <i class="bi bi-plus"></i> 목
                            </button>
                        </div>
                        <div class="col-md-4 col-6">
                            <button type="button" class="btn btn-outline-primary w-100 accident-option" data-part="허리">
                                <i class="bi bi-plus"></i> 허리
                            </button>
                        </div>
                        <div class="col-md-4 col-6">
                            <button type="button" class="btn btn-outline-primary w-100 accident-option" data-part="다리/발">
                                <i class="bi bi-plus"></i> 다리/발
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="text-center mt-3">
                    <small class="text-muted">부위를 선택하면 상태 지정 카드가 나타납니다</small>
                </div>
            </div>
            
            <!-- 숨겨진 input 필드들 (서버 전송용) -->
            <input type="hidden" id="accidents_data" name="accidents_data">
        </div>

        <!-- 5. 육체적 부담 정도 -->
        <div class="section-card">
            <h4 class="section-title">
                <i class="bi bi-speedometer2"></i> 5. 육체적 부담 정도
            </h4>
            <p class="mb-3"><small>현재 하고 계시는 일의 육체적 부담 정도는 어느 정도라고 생각합니까?</small></p>
            
            <div class="radio-group">
                <div class="radio-item">
                    <input type="radio" id="burden_none" name="physical_burden" value="전혀힘들지않음">
                    <label for="burden_none">전혀 힘들지 않음</label>
                </div>
                <div class="radio-item">
                    <input type="radio" id="burden_tolerable" name="physical_burden" value="견딜만함">
                    <label for="burden_tolerable">견딜만 함</label>
                </div>
                <div class="radio-item">
                    <input type="radio" id="burden_somewhat" name="physical_burden" value="약간힘듦">
                    <label for="burden_somewhat">약간 힘듦</label>
                </div>
                <div class="radio-item">
                    <input type="radio" id="burden_very" name="physical_burden" value="매우힘듦">
                    <label for="burden_very">매우 힘듦</label>
                </div>
            </div>
        </div>

        <!-- II. 근골격계 증상 조사 -->
        <div class="section-card">
            <h4 class="section-title">
                <i class="bi bi-body-text"></i> II. 근골격계 증상조사
            </h4>
            <p class="mb-3"><strong>지난 1년 동안 손/손가락/손목, 팔/팔꿈치, 어깨, 허리, 다리/발 중 어느 한 부위에서라도 귀하의 작업과 관련하여 통증이나 불편함(통증, 쑤시는 느낌, 뻣뻣함, 화끈거리는 느낌, 무감각 혹은 찌릿찌릿함 등)을 느끼신 적이 있습니까?</strong></p>
            
            <div class="radio-group">
                <div class="radio-item">
                    <input type="radio" id="symptoms_no" name="has_symptoms" value="아니오" required>
                    <label for="symptoms_no">아니오 (수고하셨습니다. 설문을 다 마치셨습니다.)</label>
                </div>
                <div class="radio-item">
                    <input type="radio" id="symptoms_yes" name="has_symptoms" value="예" required>
                    <label for="symptoms_yes">예 ("예"라고 답하신 분은 아래 표의 통증부위에 체크(✓)하고, 해당 통증부위의 세로줄로 내려가며 해당사항에 체크(✓)해 주십시오)</label>
                </div>
            </div>
            
            <!-- 증상 상세 정보는 "예" 선택 시 JavaScript로 동적 표시 -->
            <div id="symptom-details" style="display: none; margin-top: 20px;">
                <div class="alert alert-info">
                    <strong>📋 통증부위별 상세 조사</strong><br>
                    아래 표의 통증부위에 해당사항에 체크(✓)하고, 해당 통증부위의 세로줄로 내려가며 해당사항에 체크(✓)해 주십시오.
                </div>
                
                <!-- 부위 선택 그리드 UI -->
                <div id="body-part-grid" class="body-part-grid mb-4" style="display: none;">
                    <h5 class="mb-3"><i class="bi bi-hand-index"></i> 통증이 있는 부위를 여러 개 선택할 수 있습니다</h5>
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i> <strong>다중 선택 가능:</strong> 클릭하여 여러 부위를 선택하세요. 각 부위마다 개별 증상 평가가 진행됩니다.
                    </div>
                    <div class="row g-3">
                        
                        <div class="col-md-4 col-sm-6">
                            <div class="body-part-card" 
                                 data-part="목" 
                                 data-part-en="neck"
                                 onclick="selectBodyPart('목', 'neck')">
                                <div class="card h-100">
                                    <div class="card-body text-center">
                                        <i class="bi bi-person-circle body-part-icon"></i>
                                        <h6 class="card-title mt-2">목</h6>
                                        <small class="text-muted">클릭하여 선택</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-4 col-sm-6">
                            <div class="body-part-card" 
                                 data-part="어깨" 
                                 data-part-en="shoulder"
                                 onclick="selectBodyPart('어깨', 'shoulder')">
                                <div class="card h-100">
                                    <div class="card-body text-center">
                                        <i class="bi bi-person-arms-up body-part-icon"></i>
                                        <h6 class="card-title mt-2">어깨</h6>
                                        <small class="text-muted">클릭하여 선택</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-4 col-sm-6">
                            <div class="body-part-card" 
                                 data-part="팔/팔꿈치" 
                                 data-part-en="arm"
                                 onclick="selectBodyPart('팔/팔꿈치', 'arm')">
                                <div class="card h-100">
                                    <div class="card-body text-center">
                                        <i class="bi bi-person-raised-hand body-part-icon"></i>
                                        <h6 class="card-title mt-2">팔/팔꿈치</h6>
                                        <small class="text-muted">클릭하여 선택</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-4 col-sm-6">
                            <div class="body-part-card" 
                                 data-part="손/손목/손가락" 
                                 data-part-en="hand"
                                 onclick="selectBodyPart('손/손목/손가락', 'hand')">
                                <div class="card h-100">
                                    <div class="card-body text-center">
                                        <i class="bi bi-hand-index body-part-icon"></i>
                                        <h6 class="card-title mt-2">손/손목/손가락</h6>
                                        <small class="text-muted">클릭하여 선택</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-4 col-sm-6">
                            <div class="body-part-card" 
                                 data-part="허리" 
                                 data-part-en="waist"
                                 onclick="selectBodyPart('허리', 'waist')">
                                <div class="card h-100">
                                    <div class="card-body text-center">
                                        <i class="bi bi-person-standing body-part-icon"></i>
                                        <h6 class="card-title mt-2">허리</h6>
                                        <small class="text-muted">클릭하여 선택</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-4 col-sm-6">
                            <div class="body-part-card" 
                                 data-part="다리/발" 
                                 data-part-en="leg"
                                 onclick="selectBodyPart('다리/발', 'leg')">
                                <div class="card h-100">
                                    <div class="card-body text-center">
                                        <i class="bi bi-person-walking body-part-icon"></i>
                                        <h6 class="card-title mt-2">다리/발</h6>
                                        <small class="text-muted">클릭하여 선택</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                    </div>
                    
                    <!-- 선택 완료 버튼 -->
                    <div class="text-center mt-4">
                        <button type="button" class="btn btn-success" onclick="completeBodyPartSelection()">
                            <i class="bi bi-check2-circle"></i> 선택 완료 (선택된 부위: <span id="selected-count">0</span>개)
                        </button>
                        <button type="button" class="btn btn-outline-secondary ms-2" onclick="resetBodyPartSelection()">
                            <i class="bi bi-arrow-clockwise"></i> 다시 선택
                        </button>
                    </div>
                    
                    <div class="text-center mt-2">
                        <small class="text-muted">하나 이상의 부위를 선택한 후 '선택 완료' 버튼을 눌러주세요</small>
                    </div>
                </div>
                
                <!-- 선택된 부위별 증상평가 블록 -->
                <div id="selected-parts-container" class="selected-parts-container">
                    <!-- 동적으로 생성되는 증상평가 블록들 -->
                </div>
                </div>
        </div>




        <!-- 제출 버튼 -->
        <div class="submit-section">
            <button type="submit" class="submit-btn">제출하기</button>
        </div>
    </form>
</div>

<!-- Success Modal -->
<div class="modal-overlay" id="successModal">
    <div class="success-modal">
        <div class="success-icon">
            <i class="bi bi-check-lg"></i>
        </div>
        <h3>설문이 성공적으로 제출되었습니다!</h3>
        <p>소중한 의견 감사합니다. 제출하신 내용은 안전하게 저장되었습니다.</p>
        <div class="submission-id">
            제출 ID: <span id="submissionIdDisplay"></span>
        </div>
        <div class="modal-actions">
            <button class="modal-btn btn-primary" onclick="window.location.href='/'">
                <i class="bi bi-house"></i> 홈으로
            </button>
            <button class="modal-btn btn-secondary" onclick="location.reload()">
                <i class="bi bi-arrow-clockwise"></i> 새 설문 작성
            </button>
        </div>
    </div>
</div>

<!-- Loading Spinner -->
<div class="loading-spinner" id="loadingSpinner">
    <div class="spinner"></div>
</div>

<script>
// 선택된 부위 추적
let selectedBodyParts = [];

// 폼 검증 및 제출 처리 (AJAX)
document.getElementById('surveyForm').addEventListener('submit', async function(e) {
    e.preventDefault(); // 기본 form submit 방지

    // 직접입력 필드 검증
    const customFields = [
        { selectId: 'company_select', inputId: 'company_custom', errorId: 'company_error', name: '업체명' },
        { selectId: 'process_select', inputId: 'process_custom', errorId: 'process_error', name: '공정명' },
        { selectId: 'role_select', inputId: 'role_custom', errorId: 'role_error', name: '직위/역할' }
    ];

    let customInputErrors = [];

    customFields.forEach(field => {
        const input = document.getElementById(field.inputId);
        const select = document.getElementById(field.selectId);

        // 직접입력 필드가 보이는 경우 검증
        if (input.style.display !== 'none' && input.required) {
            if (!validateCustomInput(field)) {
                customInputErrors.push(field.name);
            } else {
                // 검증 통과 시 select에 임시 옵션 추가하고 선택
                const customValue = input.value.trim();
                const existingOption = Array.from(select.options).find(opt => opt.value === customValue);

                if (!existingOption) {
                    const newOption = new Option(customValue, customValue);
                    select.add(newOption);
                }
                select.value = customValue;

                // 입력 필드 숨기기
                input.style.display = 'none';
                input.required = false;
            }
        }
    });

    if (customInputErrors.length > 0) {
        alert('다음 항목을 올바르게 입력해주세요:\\n' + customInputErrors.join(', '));
        return false;
    }

    const hasSymptoms = document.querySelector('input[name="has_symptoms"]:checked');
    if (!hasSymptoms) {
        alert('통증 경험 여부를 선택해 주세요.');
        return false;
    }

    // "예"를 선택한 경우 최소 하나의 부위는 선택되어야 함
    if (hasSymptoms.value === '예') {
        if (selectedBodyParts.length === 0) {
            alert('통증 부위를 하나 이상 선택해 주세요.');
            return false;
        }

        // 각 선택된 부위의 필수 문항 검증
        let validationErrors = [];
        selectedBodyParts.forEach(part => {
            const requiredFields = ['duration', 'severity', 'frequency', 'last_week', 'consequences'];

            // 목과 허리가 아닌 경우에만 side 필드 체크
            if (part !== '목' && part !== '허리') {
                requiredFields.unshift('side');
            }

            requiredFields.forEach(field => {
                if (field === 'consequences') {
                    // 다중선택 필드 검증
                    const consequences = document.querySelectorAll(\`input[name="\${part}_\${field}"]:checked\`);
                    if (consequences.length === 0) {
                        validationErrors.push(\`\${part} 부위의 통증으로 인한 결과를 선택해주세요.\`);
                    }
                } else {
                    // 라디오 버튼 필드 검증
                    const fieldInput = document.querySelector(\`input[name="\${part}_\${field}"]:checked\`);
                    if (!fieldInput) {
                        const fieldNames = {
                            'side': '통증의 구체적 부위',
                            'duration': '통증 지속기간',
                            'severity': '통증 정도',
                            'frequency': '지난 1년 빈도',
                            'last_week': '지난 1주 증상'
                        };
                        validationErrors.push(\`\${part} 부위의 \${fieldNames[field]}을 선택해주세요.\`);
                    }
                }
            });

            // 기타 선택 시 텍스트 입력 검증
            const otherInput = document.querySelector(\`input[name="\${part}_consequence_other"]\`);
            const hasOtherSelected = document.querySelector(\`input[name="\${part}_consequences"][value="기타"]\`);
            if (hasOtherSelected && hasOtherSelected.checked && (!otherInput || !otherInput.value.trim())) {
                validationErrors.push(\`\${part} 부위의 기타 사항을 입력해주세요.\`);
            }
        });

        if (validationErrors.length > 0) {
            alert(validationErrors.join('\\n'));
            return false;
        }

        // 증상 데이터 수집
        collectSymptomData();
    }

    // 검증 통과 - 이제 AJAX로 제출
    try {
        // 로딩 스피너 표시
        document.getElementById('loadingSpinner').classList.add('active');

        // FormData 수집
        const formData = new FormData(this);
        const jsonData = {};

        // FormData를 JSON으로 변환
        for (const [key, value] of formData.entries()) {
            // 체크박스나 라디오 버튼 그룹 처리
            if (jsonData[key]) {
                // 이미 존재하는 키 - 배열로 변환
                if (Array.isArray(jsonData[key])) {
                    jsonData[key].push(value);
                } else {
                    jsonData[key] = [jsonData[key], value];
                }
            } else {
                jsonData[key] = value;
            }
        }

        // AJAX 요청
        const response = await fetch('/api/survey/d1/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(jsonData)
        });

        const result = await response.json();

        // 로딩 스피너 숨김
        document.getElementById('loadingSpinner').classList.remove('active');

        if (result.success) {
            // 성공 모달 표시
            document.getElementById('submissionIdDisplay').textContent = result.survey_id || 'N/A';
            document.getElementById('successModal').classList.add('active');
        } else {
            // 에러 알림
            alert('제출 실패: ' + (result.error || '알 수 없는 오류'));
        }
    } catch (error) {
        // 네트워크 에러
        document.getElementById('loadingSpinner').classList.remove('active');
        alert('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
        console.error('Submit error:', error);
    }
});

// 질병 상태 조건부 표시
const diseaseCheckboxes = document.querySelectorAll('input[name^="disease_"]:not([name="disease_none"])');
const diseaseStatusDiv = document.getElementById('disease_status_section');

function toggleDiseaseStatus() {
    const hasDisease = Array.from(diseaseCheckboxes).some(cb => cb.checked);
    if (diseaseStatusDiv) {
        diseaseStatusDiv.style.display = hasDisease ? 'block' : 'none';
    }
}

diseaseCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', toggleDiseaseStatus);
});

// "아니오" 체크박스 처리
const diseaseNone = document.querySelector('input[name="disease_none"]');
if (diseaseNone) {
    diseaseNone.addEventListener('change', function() {
        if (this.checked) {
            diseaseCheckboxes.forEach(cb => {
                cb.checked = false;
            });
        }
    });
}

diseaseCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        if (this.checked && diseaseNone) {
            diseaseNone.checked = false;
        }
    });
});

// 과거 사고 조건부 표시
document.querySelectorAll('input[name="past_accident"]').forEach(radio => {
    radio.addEventListener('change', function() {
        const accidentDetails = document.getElementById('accident_parts_section');
        if (this.value === '예') {
            accidentDetails.style.display = 'block';
        } else {
            accidentDetails.style.display = 'none';
        }
    });
});

// 여가활동 exclusive 처리
const leisureNone = document.querySelector('input[name="leisure_none"]');
const leisureCheckboxes = document.querySelectorAll('input[name^="leisure_"]:not([name="leisure_none"])');

if (leisureNone) {
    leisureNone.addEventListener('change', function() {
        if (this.checked) {
            leisureCheckboxes.forEach(cb => {
                cb.checked = false;
            });
        }
    });
}

leisureCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
        if (this.checked && leisureNone) {
            leisureNone.checked = false;
        }
    });
});

// 부위 선택 그리드 표시/숨김
function showBodyPartGrid() {
    const grid = document.getElementById('body-part-grid');
    grid.style.display = 'block';
    grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    updateBodyPartCards();
}

function hideBodyPartGrid() {
    document.getElementById('body-part-grid').style.display = 'none';
}

// 부위 카드 상태 업데이트 (선택된 부위 표시)
function updateBodyPartCards() {
    document.querySelectorAll('.body-part-card').forEach(card => {
        const part = card.dataset.part;
        const partInfo = getPartInfo(part);
        
        if (selectedBodyParts.includes(part)) {
            card.classList.add('disabled');
            card.querySelector('.card').classList.add('border-success');
            card.querySelector('.card-body').innerHTML = \`
                <i class="bi bi-check-circle-fill text-success" style="font-size: 2rem;"></i>
                <h6 class="card-title mt-2">\${part}</h6>
                <small class="text-success">✓ 선택됨 (클릭시 해제)</small>
            \`;
        } else {
            card.classList.remove('disabled');
            card.querySelector('.card').classList.remove('border-success');
            card.querySelector('.card-body').innerHTML = \`
                <i class="bi \${partInfo.icon} body-part-icon"></i>
                <h6 class="card-title mt-2">\${part}</h6>
                <small class="text-muted">클릭하여 선택</small>
            \`;
        }
    });
}

// 부위 정보 가져오기
function getPartInfo(partName) {
    const partInfoMap = {
        '목': { icon: 'bi-person-circle' },
        '어깨': { icon: 'bi-person-arms-up' },
        '팔/팔꿈치': { icon: 'bi-person-raised-hand' },
        '손/손목/손가락': { icon: 'bi-hand-index' },
        '허리': { icon: 'bi-person-standing' },
        '다리/발': { icon: 'bi-person-walking' }
    };
    return partInfoMap[partName] || { icon: 'bi-person' };
}

// 선택된 부위 개수 업데이트
function updateSelectedCount() {
    const countSpan = document.getElementById('selected-count');
    if (countSpan) {
        countSpan.textContent = selectedBodyParts.length;
    }
}

// 부위 선택 완료
function completeBodyPartSelection() {
    if (selectedBodyParts.length === 0) {
        alert('하나 이상의 부위를 선택해주세요.');
        return;
    }
    
    // 선택된 각 부위에 대해 증상평가 블록 생성
    selectedBodyParts.forEach(part => {
        const partEn = getPartEnglishName(part);
        createSymptomEvaluationBlock(part, partEn);
    });
    
    hideBodyPartGrid();
    
    // 완료 메시지
    const container = document.getElementById('selected-parts-container');
    const introMessage = document.createElement('div');
    introMessage.className = 'alert alert-success mb-4';
    introMessage.innerHTML = \`
        <i class="bi bi-check-circle"></i> 
        <strong>총 \${selectedBodyParts.length}개 부위 선택 완료:</strong> \${selectedBodyParts.join(', ')}<br>
        <small>각 부위별로 아래 증상평가를 완료해주세요.</small>
    \`;
    container.insertBefore(introMessage, container.firstChild);
}

// 부위 선택 초기화
function resetBodyPartSelection() {
    selectedBodyParts = [];
    const container = document.getElementById('selected-parts-container');
    container.innerHTML = '';
    updateBodyPartCards();
    updateSelectedCount();
    showBodyPartGrid();
}

// 부위 선택/선택해제 처리
function selectBodyPart(partName, partEn) {
    if (selectedBodyParts.includes(partName)) {
        // 이미 선택된 부위 → 선택 해제
        selectedBodyParts = selectedBodyParts.filter(part => part !== partName);
        removeSymptomBlock(partName, partEn);
    } else {
        // 새로운 부위 선택
        selectedBodyParts.push(partName);
    }
    
    updateBodyPartCards();
    updateSelectedCount();
}

// 부위별 증상평가 블록 생성
function createSymptomEvaluationBlock(partName, partEn) {
    const container = document.getElementById('selected-parts-container');
    const blockId = \`symptom-block-\${partEn}\`;
    
    // 목과 허리는 '통증의 구체적 부위' 문항을 숨김
    const hideSideQuestion = (partName === '목' || partName === '허리');
    
    const blockHtml = \`
        <div class="card mb-4 symptom-evaluation-block" id="\${blockId}" data-part="\${partName}">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0">
                    <i class="bi bi-person-circle text-primary"></i> 
                    \${partName} 부위 증상평가
                </h6>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeSymptomBlock('\${partName}', '\${partEn}')">
                    <i class="bi bi-x"></i> 삭제
                </button>
            </div>
            <div class="card-body">
                <div class="row">
                    \${!hideSideQuestion ? \`
                    <!-- 1. 통증의 구체적 부위 -->
                    <div class="col-md-6 mb-3">
                        <label class="form-label"><strong>1. 통증의 구체적 부위는?</strong> <span class="text-danger">*</span></label>
                        <div class="radio-group-vertical">
                            <label><input type="radio" name="\${partName}_side" value="right" required> 오른쪽</label>
                            <label><input type="radio" name="\${partName}_side" value="left" required> 왼쪽</label>
                            <label><input type="radio" name="\${partName}_side" value="both" required> 양쪽 모두</label>
                        </div>
                    </div>
                    \` : ''}
                    
                    <!-- 2. 통증 지속 기간 -->
                    <div class="col-md-6 mb-3">
                        <label class="form-label"><strong>\${!hideSideQuestion ? '2' : '1'}. 한번 아프기 시작하면 통증기간은 얼마동안 지속됩니까?</strong> <span class="text-danger">*</span></label>
                        <div class="radio-group-vertical">
                            <label><input type="radio" name="\${partName}_duration" value="under1d" required> 1일 미만</label>
                            <label><input type="radio" name="\${partName}_duration" value="1d_1w" required> 1일~1주</label>
                            <label><input type="radio" name="\${partName}_duration" value="1w_1m" required> 1주~1달</label>
                            <label><input type="radio" name="\${partName}_duration" value="1m_6m" required> 1달~6개월</label>
                            <label><input type="radio" name="\${partName}_duration" value="over6m" required> 6개월 이상</label>
                        </div>
                    </div>
                    
                    <!-- 3. 통증 정도 -->
                    <div class="col-md-6 mb-3">
                        <label class="form-label"><strong>\${!hideSideQuestion ? '3' : '2'}. 그때의 아픈 정도는 어느 정도입니까?</strong> <span class="text-danger">*</span></label>
                        <div class="radio-group-vertical">
                            <label><input type="radio" name="\${partName}_severity" value="mild" required>
                                <span class="pain-level-option">
                                    <strong>약한 통증</strong><br>
                                    <small class="text-muted">약간 불편한 정도이나 작업에 열중할 때는 못 느낀다</small>
                                </span>
                            </label>
                            <label><input type="radio" name="\${partName}_severity" value="moderate" required>
                                <span class="pain-level-option">
                                    <strong>중간 통증</strong><br>
                                    <small class="text-muted">작업 중 통증이 있으나 귀가 후 휴식을 취하면 괜찮다</small>
                                </span>
                            </label>
                            <label><input type="radio" name="\${partName}_severity" value="severe" required>
                                <span class="pain-level-option">
                                    <strong>심한 통증</strong><br>
                                    <small class="text-muted">작업 중 통증이 비교적 심하고 귀가 후에도 통증이 계속된다</small>
                                </span>
                            </label>
                            <label><input type="radio" name="\${partName}_severity" value="verysevere" required>
                                <span class="pain-level-option">
                                    <strong>매우 심한 통증</strong><br>
                                    <small class="text-muted">통증 때문에 작업은 물론 일상생활을 하기가 어렵다</small>
                                </span>
                            </label>
                        </div>
                    </div>
                    
                    <!-- 4. 지난 1년 빈도 -->
                    <div class="col-md-6 mb-3">
                        <label class="form-label"><strong>\${!hideSideQuestion ? '4' : '3'}. 지난 1년간 이러한 통증은 얼마나 자주 발생했습니까?</strong> <span class="text-danger">*</span></label>
                        <div class="radio-group-vertical">
                            <label><input type="radio" name="\${partName}_frequency" value="6m1" required> 6개월에 1번</label>
                            <label><input type="radio" name="\${partName}_frequency" value="2to3m1" required> 2~3달에 1번</label>
                            <label><input type="radio" name="\${partName}_frequency" value="1m1" required> 1달에 1번</label>
                            <label><input type="radio" name="\${partName}_frequency" value="1w1" required> 1주일에 1번</label>
                            <label><input type="radio" name="\${partName}_frequency" value="daily" required> 매일</label>
                        </div>
                    </div>
                    
                    <!-- 5. 지난 1주 증상 -->
                    <div class="col-md-6 mb-3">
                        <label class="form-label"><strong>\${!hideSideQuestion ? '5' : '4'}. 지난 1주 동안에도 이런 통증을 경험하셨습니까?</strong> <span class="text-danger">*</span></label>
                        <div class="radio-group-vertical">
                            <label><input type="radio" name="\${partName}_last_week" value="true" required> 예</label>
                            <label><input type="radio" name="\${partName}_last_week" value="false" required> 아니오</label>
                        </div>
                    </div>
                    
                    <!-- 6. 통증으로 인한 결과 -->
                    <div class="col-12 mb-3">
                        <label class="form-label"><strong>\${!hideSideQuestion ? '6' : '5'}. 통증으로 인한 결과 (다중선택 가능)</strong> <span class="text-danger">*</span></label>
                        <div class="row g-2">
                            <div class="col-md-6">
                                <label><input type="checkbox" name="\${partName}_consequences" value="병원·한의원 치료"> 병원·한의원 치료</label>
                            </div>
                            <div class="col-md-6">
                                <label><input type="checkbox" name="\${partName}_consequences" value="약국치료"> 약국치료</label>
                            </div>
                            <div class="col-md-6">
                                <label><input type="checkbox" name="\${partName}_consequences" value="병가·산재"> 병가·산재</label>
                            </div>
                            <div class="col-md-6">
                                <label><input type="checkbox" name="\${partName}_consequences" value="작업 전환"> 작업 전환</label>
                            </div>
                            <div class="col-md-6">
                                <label><input type="checkbox" name="\${partName}_consequences" value="해당사항 없음"> 해당사항 없음</label>
                            </div>
                            <div class="col-md-6">
                                <label><input type="checkbox" name="\${partName}_consequences" value="기타" onchange="toggleOtherInput('\${partName}')"> 기타</label>
                            </div>
                        </div>
                        <div id="\${partName}_other_container" class="mt-3" style="display: none;">
                            <input type="text" name="\${partName}_consequence_other" class="form-control" placeholder="기타 사항을 구체적으로 입력해주세요" maxlength="100">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    \`;
    
    container.insertAdjacentHTML('beforeend', blockHtml);
    
    // 생성된 블록으로 스크롤
    document.getElementById(blockId).scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // 해당사항 없음 선택 시 다른 옵션 비활성화
    setupConsequencesExclusive(partName);
}

// 기타 입력 필드 토글
function toggleOtherInput(partName) {
    const checkbox = document.querySelector(\`input[name="\${partName}_consequences"][value="기타"]\`);
    const container = document.getElementById(\`\${partName}_other_container\`);
    
    if (checkbox.checked) {
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
        const input = container.querySelector('input');
        if (input) input.value = '';
    }
}

// 결과 체크박스 exclusive 처리
function setupConsequencesExclusive(partName) {
    const noneCheckbox = document.querySelector(\`input[name="\${partName}_consequences"][value="해당사항 없음"]\`);
    const otherCheckboxes = document.querySelectorAll(\`input[name="\${partName}_consequences"]:not([value="해당사항 없음"])\`);
    
    if (noneCheckbox) {
        noneCheckbox.addEventListener('change', function() {
            if (this.checked) {
                otherCheckboxes.forEach(cb => {
                    cb.checked = false;
                });
                // 기타 입력 필드 숨기기
                const otherContainer = document.getElementById(\`\${partName}_other_container\`);
                if (otherContainer) {
                    otherContainer.style.display = 'none';
                    const input = otherContainer.querySelector('input');
                    if (input) input.value = '';
                }
            }
        });
    }
    
    otherCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (this.checked && noneCheckbox) {
                noneCheckbox.checked = false;
            }
        });
    });
}

// 증상평가 블록 삭제
function removeSymptomBlock(partName, partEn) {
    const blockId = \`symptom-block-\${partEn}\`;
    const block = document.getElementById(blockId);
    if (block) {
        block.remove();
    }
    
    // 선택된 부위 목록에서 제거
    selectedBodyParts = selectedBodyParts.filter(part => part !== partName);
    updateBodyPartCards();
}

// 증상 데이터 수집 함수 (새로운 구조에 맞춤)
function collectSymptomData() {
    const symptomDetails = [];
    
    selectedBodyParts.forEach(part => {
        const sideInput = document.querySelector(\`input[name="\${part}_side"]:checked\`);
        const durationInput = document.querySelector(\`input[name="\${part}_duration"]:checked\`);
        const severityInput = document.querySelector(\`input[name="\${part}_severity"]:checked\`);
        const frequencyInput = document.querySelector(\`input[name="\${part}_frequency"]:checked\`);
        const lastWeekInput = document.querySelector(\`input[name="\${part}_last_week"]:checked\`);
        
        const consequenceInputs = document.querySelectorAll(\`input[name="\${part}_consequences"]:checked\`);
        const otherInput = document.querySelector(\`input[name="\${part}_consequence_other"]\`);
        
        let consequences = Array.from(consequenceInputs).map(input => input.value);
        let consequenceOther = null;
        
        if (otherInput && otherInput.value.trim()) {
            consequenceOther = otherInput.value.trim();
        }
        
        const partData = {
            part: getPartEnglishName(part),
            side: sideInput ? sideInput.value : null, // 목/허리는 null
            duration: durationInput?.value || null,
            severity: severityInput?.value || null,
            frequency: frequencyInput?.value || null,
            last_week: lastWeekInput ? (lastWeekInput.value === 'true') : null,
            consequences: consequences,
            consequence_other: consequenceOther
        };
        
        symptomDetails.push(partData);
    });
    
    // 데이터를 숨겨진 input에 저장
    let hiddenInput = document.querySelector('input[name="musculo_details_json"]');
    if (!hiddenInput) {
        hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = 'musculo_details_json';
        document.getElementById('surveyForm').appendChild(hiddenInput);
    }
    hiddenInput.value = JSON.stringify(symptomDetails);
}

// 부위명을 영어로 변환
function getPartEnglishName(partName) {
    const partMap = {
        '목': 'neck',
        '어깨': 'shoulder', 
        '팔/팔꿈치': 'arm',
        '손/손목/손가락': 'hand',
        '허리': 'waist',
        '다리/발': 'leg'
    };
    return partMap[partName] || partName;
}

// 직접입력 기능 구현
function setupCustomInput() {
    const customFields = [
        { selectId: 'company_select', inputId: 'company_custom', errorId: 'company_error', name: '업체명' },
        { selectId: 'process_select', inputId: 'process_custom', errorId: 'process_error', name: '공정명' },
        { selectId: 'role_select', inputId: 'role_custom', errorId: 'role_error', name: '직위/역할' }
    ];
    
    customFields.forEach(field => {
        const select = document.getElementById(field.selectId);
        const input = document.getElementById(field.inputId);
        const errorDiv = document.getElementById(field.errorId);
        
        // 드롭다운 변경 이벤트
        select.addEventListener('change', function() {
            if (this.value === '__custom__') {
                input.style.display = 'block';
                input.required = true;
                input.focus();
                // 드롭다운 required 해제하고 직접입력 필드에 required 설정
                this.required = false;
                this.selectedIndex = 0;
            } else {
                input.style.display = 'none';
                input.required = false;
                input.value = '';
                // 드롭다운 required 복원
                this.required = true;
                hideError(field.errorId);
            }
        });
        
        // 직접입력 필드 검증
        input.addEventListener('input', function() {
            validateCustomInput(field);
        });
        
        input.addEventListener('blur', function() {
            validateCustomInput(field);
        });
    });
}

// 직접입력 필드 검증
function validateCustomInput(field) {
    const input = document.getElementById(field.inputId);
    const errorDiv = document.getElementById(field.errorId);
    const value = input.value.trim();
    
    // 특수문자 제한 (',", <, > 등)
    const invalidChars = /['"\`<>]/;
    
    hideError(field.errorId);
    input.classList.remove('custom-input-error');
    
    if (value.length === 0) {
        showError(field.errorId, \`\${field.name}을 입력해주세요.\`);
        input.classList.add('custom-input-error');
        return false;
    }
    
    if (value.length < 1 || value.length > 30) {
        showError(field.errorId, \`\${field.name}은 1-30자로 입력해주세요.\`);
        input.classList.add('custom-input-error');
        return false;
    }
    
    if (invalidChars.test(value)) {
        showError(field.errorId, \`\${field.name}에 특수문자(' \\" \\\` < >)는 사용할 수 없습니다.\`);
        input.classList.add('custom-input-error');
        return false;
    }
    
    // 중복 검사 (기존 옵션과 비교)
    const select = document.getElementById(field.selectId);
    const existingOptions = Array.from(select.options).map(opt => opt.value.toLowerCase());
    
    if (existingOptions.includes(value.toLowerCase())) {
        showError(field.errorId, \`이미 존재하는 \${field.name}입니다. 목록에서 선택해주세요.\`);
        input.classList.add('custom-input-error');
        return false;
    }
    
    return true;
}

// 오류 메시지 표시
function showError(errorId, message) {
    const errorDiv = document.getElementById(errorId);
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// 오류 메시지 숨김
function hideError(errorId) {
    const errorDiv = document.getElementById(errorId);
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
}

// 초기 상태 설정 및 모든 이벤트 리스너 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 직접입력 기능 초기화
    setupCustomInput();
    // 증상 유무에 따른 상세 정보 표시/숨김
    document.querySelectorAll('input[name="has_symptoms"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const symptomDetails = document.getElementById('symptom-details');
            const bodyPartGrid = document.getElementById('body-part-grid');
            const selectedPartsContainer = document.getElementById('selected-parts-container');
            
            if (this.value === '예') {
                symptomDetails.style.display = 'block';
                // 부위 선택 그리드 표시
                showBodyPartGrid();
            } else {
                symptomDetails.style.display = 'none';
                // 그리드 숨기고 모든 선택 초기화
                bodyPartGrid.style.display = 'none';
                selectedPartsContainer.innerHTML = '';
                selectedBodyParts = [];
            }
        });
    });

    // 진단받은 질병 단계식 처리 (Issue #11)
    const diagnosedRadios = document.querySelectorAll('input[name="diagnosed"]');
    const diseaseGridSection = document.getElementById('disease_grid_section');
    const selectedDiseasesContainer = document.getElementById('selected_diseases_container');
    const diseaseOptions = document.querySelectorAll('.disease-option');
    const diseaseCustomBtn = document.getElementById('disease_custom');
    const diseasesDataInput = document.getElementById('diseases_data');
    
    let selectedDiseases = [];

    // Step 1: 예/아니오 라디오 버튼 처리
    diagnosedRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'yes') {
                diseaseGridSection.style.display = 'block';
            } else {
                diseaseGridSection.style.display = 'none';
                selectedDiseases = [];
                selectedDiseasesContainer.innerHTML = '';
                updateDiseasesData();
                resetDiseaseOptions();
            }
        });
    });

    // Step 2: 질병 선택 버튼 처리
    diseaseOptions.forEach(btn => {
        btn.addEventListener('click', function() {
            const diseaseName = this.dataset.disease;
            if (!selectedDiseases.find(d => d.name === diseaseName)) {
                addDiseaseCard(diseaseName);
                this.classList.add('btn-success');
                this.classList.remove('btn-outline-primary');
                this.innerHTML = '<i class="bi bi-check"></i> ' + diseaseName;
                this.disabled = true;
            }
        });
    });

    // 기타 질병 직접 입력
    if (diseaseCustomBtn) {
        diseaseCustomBtn.addEventListener('click', function() {
            const customDisease = prompt('질병명을 입력해주세요:');
            if (customDisease && customDisease.trim()) {
                const diseaseName = customDisease.trim();
                if (!selectedDiseases.find(d => d.name === diseaseName)) {
                    addDiseaseCard(diseaseName, true);
                }
            }
        });
    }

    // 질병 카드 추가 함수
    function addDiseaseCard(diseaseName, isCustom = false) {
        const diseaseId = 'disease_' + selectedDiseases.length;
        
        const cardHtml = \`
            <div class="card mb-3 disease-card" data-disease="\${diseaseName}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h6 class="card-title">
                                <i class="bi bi-heart-pulse text-danger"></i> \${diseaseName}
                                \${isCustom ? '<span class="badge bg-secondary ms-2">기타</span>' : ''}
                            </h6>
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-danger remove-disease" data-disease="\${diseaseName}">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                    
                    <div class="mt-3">
                        <label class="form-label">현재 상태:</label>
                        <div class="radio-group">
                            <div class="radio-item">
                                <input type="radio" id="\${diseaseId}_cured" name="\${diseaseId}_status" value="완치">
                                <label for="\${diseaseId}_cured">완치</label>
                            </div>
                            <div class="radio-item">
                                <input type="radio" id="\${diseaseId}_treating" name="\${diseaseId}_status" value="치료·관찰중">
                                <label for="\${diseaseId}_treating">치료·관찰중</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        \`;
        
        selectedDiseasesContainer.insertAdjacentHTML('beforeend', cardHtml);
        
        // 질병 객체 추가
        selectedDiseases.push({
            name: diseaseName,
            status: '',
            isCustom: isCustom
        });
        
        // 이벤트 리스너 추가
        const card = selectedDiseasesContainer.lastElementChild;
        
        // 삭제 버튼
        card.querySelector('.remove-disease').addEventListener('click', function() {
            removeDiseaseCard(diseaseName);
        });
        
        // 상태 라디오 버튼
        card.querySelectorAll(\`input[name="\${diseaseId}_status"]\`).forEach(radio => {
            radio.addEventListener('change', function() {
                const diseaseObj = selectedDiseases.find(d => d.name === diseaseName);
                if (diseaseObj) {
                    diseaseObj.status = this.value;
                    updateDiseasesData();
                }
            });
        });
        
        updateDiseasesData();
    }

    // 질병 카드 삭제 함수
    function removeDiseaseCard(diseaseName) {
        // 선택된 질병 배열에서 제거
        selectedDiseases = selectedDiseases.filter(d => d.name !== diseaseName);
        
        // DOM에서 카드 제거
        const card = selectedDiseasesContainer.querySelector(\`[data-disease="\${diseaseName}"]\`);
        if (card) {
            card.remove();
        }
        
        // 버튼 상태 복원 (기본 질병인 경우)
        const diseaseBtn = document.querySelector(\`[data-disease="\${diseaseName}"]\`);
        if (diseaseBtn) {
            diseaseBtn.classList.add('btn-outline-primary');
            diseaseBtn.classList.remove('btn-success');
            diseaseBtn.innerHTML = '<i class="bi bi-plus"></i> ' + diseaseName;
            diseaseBtn.disabled = false;
        }
        
        updateDiseasesData();
    }

    // 질병 선택 버튼 상태 초기화
    function resetDiseaseOptions() {
        diseaseOptions.forEach(btn => {
            btn.classList.add('btn-outline-primary');
            btn.classList.remove('btn-success');
            btn.innerHTML = '<i class="bi bi-plus"></i> ' + btn.dataset.disease;
            btn.disabled = false;
        });
    }

    // 숨겨진 input 필드 업데이트
    function updateDiseasesData() {
        const data = {
            diagnosed: selectedDiseases.length > 0,
            diagnoses: selectedDiseases
        };
        diseasesDataInput.value = JSON.stringify(data);
    }

    // ===== 과거 사고 부위 관리 시스템 =====
    const accidentOptions = document.querySelectorAll('.accident-option');
    const selectedAccidentsContainer = document.getElementById('selected_accidents_container');
    const accidentsDataInput = document.getElementById('accidents_data');
    let selectedAccidents = [];

    // 과거 사고 조건부 표시
    document.querySelectorAll('input[name="past_accident"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const accidentDetails = document.getElementById('accident_parts_section');
            if (accidentDetails) {
                if (this.value === '예') {
                    accidentDetails.style.display = 'block';
                } else {
                    accidentDetails.style.display = 'none';
                    // 아니오 선택 시 모든 선택값 초기화
                    selectedAccidents = [];
                    selectedAccidentsContainer.innerHTML = '';
                    resetAccidentOptions();
                    updateAccidentsData();
                }
            }
        });
    });

    // 부위 선택 버튼 클릭 이벤트
    accidentOptions.forEach(btn => {
        btn.addEventListener('click', function() {
            const partName = this.dataset.part;
            
            // 이미 선택된 부위인지 확인
            if (selectedAccidents.some(accident => accident.part === partName)) {
                alert('이미 선택된 부위입니다.');
                return;
            }

            // 새 사고 부위 추가
            const newAccident = {
                part: partName,
                status: '' // 초기에는 빈 값
            };
            
            selectedAccidents.push(newAccident);
            createAccidentCard(newAccident, selectedAccidents.length - 1);
            
            // 버튼 상태 변경
            this.classList.remove('btn-outline-primary');
            this.classList.add('btn-success');
            this.innerHTML = '<i class="bi bi-check"></i> ' + partName;
            this.disabled = true;
            
            updateAccidentsData();
        });
    });

    // 사고 부위 카드 생성
    function createAccidentCard(accident, index) {
        const cardHtml = \`
            <div class="card mb-3 accident-card" data-index="\${index}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <h6 class="card-title mb-0">
                            <i class="bi bi-bandaid"></i> \${accident.part}
                        </h6>
                        <button type="button" class="btn btn-sm btn-outline-danger remove-accident" data-part="\${accident.part}">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                    
                    <div class="status-selection">
                        <label class="form-label">현재 상태:</label>
                        <div class="radio-group">
                            <div class="radio-item">
                                <input type="radio" id="accident_\${index}_cured" name="accident_\${index}_status" value="완치" \${accident.status === '완치' ? 'checked' : ''}>
                                <label for="accident_\${index}_cured">완치</label>
                            </div>
                            <div class="radio-item">
                                <input type="radio" id="accident_\${index}_treating" name="accident_\${index}_status" value="치료·관찰 중" \${accident.status === '치료·관찰 중' ? 'checked' : ''}>
                                <label for="accident_\${index}_treating">치료·관찰 중</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>\`;
        
        selectedAccidentsContainer.insertAdjacentHTML('beforeend', cardHtml);
        
        // 새로 추가된 카드의 상태 라디오 이벤트 리스너 추가
        const newCard = selectedAccidentsContainer.lastElementChild;
        const statusRadios = newCard.querySelectorAll('input[type="radio"]');
        statusRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                const cardIndex = parseInt(this.closest('.accident-card').dataset.index);
                selectedAccidents[cardIndex].status = this.value;
                updateAccidentsData();
            });
        });
        
        // 삭제 버튼 이벤트 리스너 추가
        const removeBtn = newCard.querySelector('.remove-accident');
        removeBtn.addEventListener('click', function() {
            removeAccident(this.dataset.part);
        });
    }

    // 사고 부위 제거
    function removeAccident(partName) {
        // 배열에서 제거
        selectedAccidents = selectedAccidents.filter(accident => accident.part !== partName);
        
        // DOM에서 해당 카드 제거
        const cards = selectedAccidentsContainer.querySelectorAll('.accident-card');
        cards.forEach((card, index) => {
            if (card.querySelector('h6').textContent.includes(partName)) {
                card.remove();
            }
        });
        
        // 모든 카드의 인덱스 업데이트
        updateAccidentCards();
        
        // 버튼 상태 복원
        const accidentBtn = document.querySelector(\`.accident-option[data-part="\${partName}"]\`);
        if (accidentBtn) {
            accidentBtn.classList.add('btn-outline-primary');
            accidentBtn.classList.remove('btn-success');
            accidentBtn.innerHTML = '<i class="bi bi-plus"></i> ' + partName;
            accidentBtn.disabled = false;
        }
        
        updateAccidentsData();
    }

    // 사고 부위 카드들 인덱스 업데이트
    function updateAccidentCards() {
        const cards = selectedAccidentsContainer.querySelectorAll('.accident-card');
        cards.forEach((card, index) => {
            card.dataset.index = index;
            
            // 라디오 버튼 name 속성 업데이트
            const radios = card.querySelectorAll('input[type="radio"]');
            radios.forEach(radio => {
                const oldName = radio.name;
                radio.name = \`accident_\${index}_status\`;
                radio.id = radio.id.replace(/accident_\\d+_/, \`accident_\${index}_\`);
                
                // 라벨의 for 속성도 업데이트
                const label = card.querySelector(\`label[for="\${radio.id.replace(/accident_\\d+_/, \`accident_\${oldName.split('_')[1]}_\`)}"]\`);
                if (label) {
                    label.setAttribute('for', radio.id);
                }
            });
        });
    }

    // 사고 부위 선택 버튼 상태 초기화
    function resetAccidentOptions() {
        accidentOptions.forEach(btn => {
            btn.classList.add('btn-outline-primary');
            btn.classList.remove('btn-success');
            btn.innerHTML = '<i class="bi bi-plus"></i> ' + btn.dataset.part;
            btn.disabled = false;
        });
    }

    // 숨겨진 input 필드 업데이트
    function updateAccidentsData() {
        const data = {
            past_accident: selectedAccidents.length > 0,
            past_accident_details: selectedAccidents
        };
        accidentsDataInput.value = JSON.stringify(data);
    }

    // 여가활동 exclusive 처리
    const leisureNone = document.querySelector('input[name="leisure_none"]');
    const leisureCheckboxes = document.querySelectorAll('input[name^="leisure_"]:not([name="leisure_none"])');

    if (leisureNone) {
        leisureNone.addEventListener('change', function() {
            if (this.checked) {
                leisureCheckboxes.forEach(cb => {
                    cb.checked = false;
                });
            }
        });
    }

    leisureCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (this.checked && leisureNone) {
                leisureNone.checked = false;
            }
        });
    });

    // 초기 상태 설정 - 질병 진단 관련 초기화는 새로운 시스템에서 자동 처리됨
});
</script>


</html>`;
