"""
설문지 원본 HTML 저장 유틸리티
제출된 설문지를 원본 형태 그대로 HTML 파일로 저장
"""

import os
import json
from datetime import datetime
from flask import current_app, render_template_string


def save_survey_original_html(survey_data, survey_id, form_type):
    """
    제출된 설문지를 원본 HTML 형태로 저장

    Args:
        survey_data (dict): 설문 응답 데이터
        survey_id (int): 설문 ID
        form_type (str): 설문 유형 ('001', '002', '003')

    Returns:
        str: 저장된 HTML 파일 경로 (상대 경로)
    """

    # HTML 저장 디렉토리 설정
    base_dir = "/app/static/survey_originals"
    os.makedirs(base_dir, exist_ok=True)

    # 파일명 생성: survey_001_123_20241219_143045.html
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"survey_{form_type}_{survey_id}_{timestamp}.html"
    file_path = os.path.join(base_dir, filename)

    # 설문 유형별 HTML 템플릿 생성
    html_content = generate_original_survey_html(survey_data, survey_id, form_type)

    # HTML 파일 저장
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(html_content)

        current_app.logger.info(f"✅ Original survey HTML saved: {filename}")

        # 상대 경로 반환 (URL 생성용)
        return f"survey_originals/{filename}"

    except Exception as e:
        current_app.logger.error(f"❌ Failed to save original survey HTML: {str(e)}")
        return None


def generate_original_survey_html(survey_data, survey_id, form_type):
    """
    설문 유형별 원본 HTML 생성

    Args:
        survey_data (dict): 설문 응답 데이터
        survey_id (int): 설문 ID
        form_type (str): 설문 유형

    Returns:
        str: 생성된 HTML 내용
    """

    # 공통 HTML 구조
    base_template = """<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SafeWork 설문지 원본 - {{ form_name }}</title>
    <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.6.0/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            font-family: 'Noto Sans KR', sans-serif;
            background-color: #f8f9fa;
            padding: 20px;
        }
        .survey-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .survey-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #007bff;
        }
        .form-group label {
            font-weight: 600;
            color: #495057;
        }
        .submitted-value {
            background-color: #e3f2fd;
            padding: 8px 12px;
            border-radius: 4px;
            border-left: 4px solid #2196F3;
            margin-top: 5px;
        }
        .section-title {
            background-color: #f8f9fa;
            padding: 15px;
            margin: 20px 0 15px 0;
            border-left: 4px solid #007bff;
            font-weight: 600;
        }
        .submission-info {
            background-color: #fff3cd;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
        }
        @media print {
            .print-button { display: none; }
        }
    </style>
</head>
<body>
    <button class="btn btn-primary print-button" onclick="window.print()">
        🖨️ 인쇄
    </button>

    <div class="survey-container">
        <div class="survey-header">
            <h1>{{ form_name }}</h1>
            <p class="text-muted">SafeWork 산업안전보건관리시스템</p>
        </div>

        <div class="submission-info">
            <strong>📋 제출 정보</strong><br>
            <small>
                • 설문 ID: #{{ survey_id }}<br>
                • 제출일시: {{ submission_time }}<br>
                • 설문 유형: {{ form_type }}
            </small>
        </div>

        {{ survey_content }}

        <div class="mt-4 text-center">
            <small class="text-muted">
                이 문서는 SafeWork 시스템에서 자동 생성되었습니다.<br>
                생성일시: {{ generation_time }}
            </small>
        </div>
    </div>
</body>
</html>"""

    # 설문 유형별 내용 생성
    form_names = {
        '001': '근골격계 증상조사표',
        '002': '신규 입사자 건강검진표',
        '003': '근골격계질환 예방관리 프로그램 조사표'
    }

    form_name = form_names.get(form_type, '알 수 없는 설문')

    # 설문 유형별 내용 생성
    if form_type == '001':
        survey_content = generate_form_001_content(survey_data)
    elif form_type == '002':
        survey_content = generate_form_002_content(survey_data)
    elif form_type == '003':
        survey_content = generate_form_003_content(survey_data)
    else:
        survey_content = generate_generic_content(survey_data)

    # 템플릿 렌더링
    html_content = render_template_string(base_template,
        form_name=form_name,
        survey_id=survey_id,
        form_type=form_type,
        submission_time=datetime.now().strftime('%Y년 %m월 %d일 %H:%M:%S'),
        generation_time=datetime.now().strftime('%Y년 %m월 %d일 %H:%M:%S'),
        survey_content=survey_content
    )

    return html_content


def generate_form_001_content(survey_data):
    """근골격계 증상조사표 (001) 원본 내용 생성"""

    content = """
        <div class="section-title">👤 기본 정보</div>
        <div class="row">
            <div class="col-md-6">
                <div class="form-group">
                    <label>성명</label>
                    <div class="submitted-value">{{ name }}</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="form-group">
                    <label>나이</label>
                    <div class="submitted-value">{{ age }}세</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="form-group">
                    <label>성별</label>
                    <div class="submitted-value">{{ gender }}</div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-md-6">
                <div class="form-group">
                    <label>부서</label>
                    <div class="submitted-value">{{ department }}</div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="form-group">
                    <label>직급</label>
                    <div class="submitted-value">{{ position }}</div>
                </div>
            </div>
        </div>

        <div class="section-title">💼 근무 정보</div>
        <div class="row">
            <div class="col-md-4">
                <div class="form-group">
                    <label>근무년수</label>
                    <div class="submitted-value">{{ work_years }}년</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="form-group">
                    <label>근무개월</label>
                    <div class="submitted-value">{{ work_months }}개월</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="form-group">
                    <label>사번</label>
                    <div class="submitted-value">{{ employee_number }}</div>
                </div>
            </div>
        </div>

        <div class="section-title">🏥 증상 정보</div>
        <div class="form-group">
            <label>현재 근골격계 증상 유무</label>
            <div class="submitted-value">{{ current_symptom }}</div>
        </div>

        {% if musculo_details %}
        <div class="section-title">📋 상세 증상 정보</div>
        {% for detail in musculo_details %}
        <div class="card mb-3">
            <div class="card-body">
                <h6 class="card-title">{{ detail.part }}</h6>
                <p><strong>상태:</strong> {{ detail.status }}</p>
                {% if detail.details %}
                <p><strong>세부사항:</strong> {{ detail.details }}</p>
                {% endif %}
            </div>
        </div>
        {% endfor %}
        {% endif %}

        <div class="section-title">📝 기타 응답</div>
        {% for key, value in other_responses.items() %}
        <div class="form-group">
            <label>{{ key }}</label>
            <div class="submitted-value">{{ value }}</div>
        </div>
        {% endfor %}
    """

    # 데이터 정리
    name = survey_data.get('name', '미제공')
    age = survey_data.get('age', '미제공')
    gender = survey_data.get('gender', '미제공')
    department = survey_data.get('department', '미제공')
    position = survey_data.get('position', '미제공')
    work_years = survey_data.get('work_years', '미제공')
    work_months = survey_data.get('work_months', '미제공')
    employee_number = survey_data.get('employee_number', '미제공')
    current_symptom = survey_data.get('current_symptom', '미제공')

    # 기타 응답 데이터 (기본 필드 제외)
    exclude_keys = {'name', 'age', 'gender', 'department', 'position',
                   'work_years', 'work_months', 'employee_number', 'current_symptom',
                   'musculo_details', 'csrf_token', 'submit'}

    other_responses = {k: v for k, v in survey_data.items() if k not in exclude_keys}

    # musculo_details 처리
    musculo_details = survey_data.get('musculo_details', [])

    return render_template_string(content,
        name=name, age=age, gender=gender, department=department, position=position,
        work_years=work_years, work_months=work_months, employee_number=employee_number,
        current_symptom=current_symptom, musculo_details=musculo_details,
        other_responses=other_responses
    )


def generate_form_002_content(survey_data):
    """신규 입사자 건강검진표 (002) 원본 내용 생성"""

    content = """
        <div class="section-title">👤 기본 정보</div>
        <div class="row">
            <div class="col-md-4">
                <div class="form-group">
                    <label>성명</label>
                    <div class="submitted-value">{{ name }}</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="form-group">
                    <label>나이</label>
                    <div class="submitted-value">{{ age }}세</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="form-group">
                    <label>성별</label>
                    <div class="submitted-value">{{ gender }}</div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-md-6">
                <div class="form-group">
                    <label>부서</label>
                    <div class="submitted-value">{{ department }}</div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="form-group">
                    <label>직급</label>
                    <div class="submitted-value">{{ position }}</div>
                </div>
            </div>
        </div>

        <div class="section-title">🏥 건강검진 정보</div>
        <div class="form-group">
            <label>기존 질병력</label>
            <div class="submitted-value">{{ existing_conditions or '없음' }}</div>
        </div>

        <div class="form-group">
            <label>알레르기 이력</label>
            <div class="submitted-value">{{ allergy_history or '없음' }}</div>
        </div>

        <div class="form-group">
            <label>복용 중인 약물</label>
            <div class="submitted-value">{{ current_medications or '없음' }}</div>
        </div>

        <div class="section-title">📝 기타 응답</div>
        {% for key, value in other_responses.items() %}
        <div class="form-group">
            <label>{{ key }}</label>
            <div class="submitted-value">
                {% if value is mapping %}
                    <pre>{{ value | tojson(indent=2) }}</pre>
                {% elif value is iterable and value is not string %}
                    {{ value | join(', ') }}
                {% else %}
                    {{ value }}
                {% endif %}
            </div>
        </div>
        {% endfor %}
    """

    # 데이터 정리
    name = survey_data.get('name', '미제공')
    age = survey_data.get('age', '미제공')
    gender = survey_data.get('gender', '미제공')
    department = survey_data.get('department', '미제공')
    position = survey_data.get('position', '미제공')
    existing_conditions = survey_data.get('existing_conditions', '')
    allergy_history = survey_data.get('allergy_history', '')
    current_medications = survey_data.get('current_medications', '')

    # 기타 응답 데이터
    exclude_keys = {'name', 'age', 'gender', 'department', 'position',
                   'existing_conditions', 'allergy_history', 'current_medications',
                   'csrf_token', 'submit'}

    other_responses = {k: v for k, v in survey_data.items() if k not in exclude_keys}

    return render_template_string(content,
        name=name, age=age, gender=gender, department=department, position=position,
        existing_conditions=existing_conditions, allergy_history=allergy_history,
        current_medications=current_medications, other_responses=other_responses
    )


def generate_form_003_content(survey_data):
    """근골격계질환 예방관리 프로그램 조사표 (003) 원본 내용 생성"""

    content = """
        <div class="section-title">👤 기본 정보</div>
        <div class="row">
            <div class="col-md-4">
                <div class="form-group">
                    <label>성명</label>
                    <div class="submitted-value">{{ name }}</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="form-group">
                    <label>나이</label>
                    <div class="submitted-value">{{ age }}세</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="form-group">
                    <label>성별</label>
                    <div class="submitted-value">{{ gender }}</div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-md-6">
                <div class="form-group">
                    <label>부서</label>
                    <div class="submitted-value">{{ department }}</div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="form-group">
                    <label>직급</label>
                    <div class="submitted-value">{{ position }}</div>
                </div>
            </div>
        </div>

        {% if management_classification %}
        <div class="section-title">🏥 관리대상자 분류</div>
        <div class="alert alert-info">
            <strong>분류 결과:</strong> {{ management_classification }}
        </div>
        {% endif %}

        {% if body_parts_analysis %}
        <div class="section-title">📊 신체 부위별 분석</div>
        {% for part, data in body_parts_analysis.items() %}
        <div class="card mb-3">
            <div class="card-header">
                <h6>{{ part }}</h6>
            </div>
            <div class="card-body">
                <p><strong>통증 유무:</strong> {{ '예' if data.has_pain else '아니오' }}</p>
                {% if data.has_pain %}
                <p><strong>통증 지속기간:</strong> {{ data.pain_duration }}</p>
                <p><strong>통증 강도:</strong> {{ data.pain_intensity }}</p>
                <p><strong>통증 빈도:</strong> {{ data.pain_frequency }}</p>
                <p><strong>일상생활 지장:</strong> {{ data.daily_interference }}</p>
                {% endif %}
            </div>
        </div>
        {% endfor %}
        {% endif %}

        <div class="section-title">📝 기타 응답</div>
        {% for key, value in other_responses.items() %}
        <div class="form-group">
            <label>{{ key }}</label>
            <div class="submitted-value">
                {% if value is mapping %}
                    <pre>{{ value | tojson(indent=2) }}</pre>
                {% elif value is iterable and value is not string %}
                    {{ value | join(', ') }}
                {% else %}
                    {{ value }}
                {% endif %}
            </div>
        </div>
        {% endfor %}
    """

    # 데이터 정리
    name = survey_data.get('name', '미제공')
    age = survey_data.get('age', '미제공')
    gender = survey_data.get('gender', '미제공')
    department = survey_data.get('department', '미제공')
    position = survey_data.get('position', '미제공')
    management_classification = survey_data.get('management_classification')
    body_parts_analysis = survey_data.get('body_parts_analysis', {})

    # 기타 응답 데이터
    exclude_keys = {'name', 'age', 'gender', 'department', 'position',
                   'management_classification', 'body_parts_analysis',
                   'csrf_token', 'submit'}

    other_responses = {k: v for k, v in survey_data.items() if k not in exclude_keys}

    return render_template_string(content,
        name=name, age=age, gender=gender, department=department, position=position,
        management_classification=management_classification,
        body_parts_analysis=body_parts_analysis,
        other_responses=other_responses
    )


def generate_generic_content(survey_data):
    """일반 설문 내용 생성 (002 및 기타)"""

    content = """
        <div class="section-title">📝 설문 응답 내용</div>
        {% for key, value in survey_data.items() %}
        {% if key not in ['csrf_token', 'submit'] %}
        <div class="form-group">
            <label>{{ key }}</label>
            <div class="submitted-value">
                {% if value is mapping %}
                    <pre>{{ value | tojson(indent=2) }}</pre>
                {% elif value is iterable and value is not string %}
                    {{ value | join(', ') }}
                {% else %}
                    {{ value }}
                {% endif %}
            </div>
        </div>
        {% endif %}
        {% endfor %}
    """

    return render_template_string(content, survey_data=survey_data)