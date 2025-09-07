# SafeWork 프로젝트 Claude 가이드

## 프로젝트 개요
- **Flask 3.0+** 기반 산업안전보건 관리시스템
- **기술 스택**: Python Flask, MySQL 8.0, Redis, Bootstrap 4.6, jQuery
- **주요 기능**: 근골격계 설문조사, 신규직원 건강검진 관리

## 코드 수정 지침

### 필수 원칙
1. **실제 코드 변경**: 분석만 하지 말고 실제로 파일을 수정하세요
2. **테스트 포함**: 코드 수정 시 관련 테스트도 함께 작성
3. **커밋 & PR**: 변경사항을 커밋하고 PR을 생성하세요

### 파일 구조
```
app/
├── models.py          # SQLAlchemy 모델
├── routes/           # Flask 라우트
├── templates/        # Jinja2 템플릿
├── static/          # CSS, JS, 이미지
└── forms/           # WTForms 폼 정의
```

### 코딩 스타일
- **Python**: PEP 8 준수
- **HTML**: Bootstrap 4.6 컴포넌트 사용
- **JavaScript**: jQuery 기반
- **DB**: SQLAlchemy ORM 패턴 유지

### 우선순위별 작업
- 🔴 **P0**: 보안 취약점, 크리티컬 버그
- 🟠 **P1**: 주요 기능 개선
- 🟡 **P2**: UI/UX 개선
- 🟢 **P3**: 코드 리팩토링

### 작업 프로세스
1. 이슈 내용 정확히 파악
2. 관련 파일 식별 및 분석
3. **실제 코드 수정 실행**
4. 테스트 코드 작성 (필요시)
5. 변경사항 커밋
6. PR 생성 및 이슈 연결
7. 이슈 완료 처리

### 금지사항
- 분석만 하고 코드 수정 안하기
- 테스트 없이 중요 기능 변경
- 커밋 메시지 불명확하게 작성
- 이슈 완료 처리 누락

## 자주 사용하는 패턴

### Flask 라우트
```python
@bp.route('/survey/<int:survey_id>')
@login_required
def view_survey(survey_id):
    # 구현 로직
    pass
```

### SQLAlchemy 모델
```python
class Survey(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
```

### Jinja2 템플릿
```html
{% extends "base.html" %}
{% block content %}
<div class="container">
    <!-- Bootstrap 4.6 컴포넌트 사용 -->
</div>
{% endblock %}
```

**중요**: 반드시 실제 파일을 수정하고 변경사항을 커밋해주세요!