from flask_wtf import FlaskForm
from wtforms import (BooleanField, DateField, IntegerField, PasswordField,
                     RadioField, SelectField, StringField, SubmitField,
                     TextAreaField)
from wtforms.validators import (DataRequired, Email, EqualTo, Length,
                                NumberRange, Optional)


class LoginForm(FlaskForm):
    """로그인 폼"""

    username = StringField("아이디", validators=[DataRequired(), Length(min=3, max=20)])
    password = PasswordField("비밀번호", validators=[DataRequired()])
    remember_me = BooleanField("로그인 상태 유지")
    submit = SubmitField("로그인")


class RegisterForm(FlaskForm):
    """회원가입 폼"""

    username = StringField("아이디", validators=[DataRequired(), Length(min=3, max=20)])
    email = StringField("이메일", validators=[DataRequired(), Email()])
    password = PasswordField("비밀번호", validators=[DataRequired(), Length(min=6)])
    password_confirm = PasswordField(
        "비밀번호 확인",
        validators=[
            DataRequired(),
            EqualTo("password", message="비밀번호가 일치하지 않습니다."),
        ],
    )
    submit = SubmitField("회원가입")


class SurveyForm(FlaskForm):
    """근골격계 증상조사표 폼 - PDF 001 정확 구현"""

    # I. 기본정보 (PDF 테이블과 동일)
    name = StringField("성명", validators=[DataRequired(), Length(min=2, max=100)])
    age = IntegerField(
        "연령", validators=[DataRequired(), NumberRange(min=18, max=100)]
    )
    gender = RadioField(
        "성별", choices=[("남", "남"), ("여", "여")], validators=[DataRequired()]
    )
    work_years = IntegerField(
        "현 직장경력(년)", validators=[Optional(), NumberRange(min=0, max=50)]
    )
    work_months = IntegerField(
        "현 직장경력(개월)", validators=[Optional(), NumberRange(min=0, max=11)]
    )

    department = StringField("작업부서", validators=[DataRequired(), Length(max=100)])
    line = StringField("라인", validators=[Optional(), Length(max=100)])
    work_name = StringField("수행작업", validators=[Optional(), Length(max=200)])
    marriage_status = RadioField(
        "결혼여부",
        choices=[("기혼", "기혼"), ("미혼", "미혼")],
        validators=[Optional()],
    )

    # 현재하고 있는 작업
    current_work_details = TextAreaField(
        "작업내용", validators=[Optional(), Length(max=500)]
    )
    current_work_years = IntegerField(
        "작업기간(년)", validators=[Optional(), NumberRange(min=0, max=50)]
    )
    current_work_months = IntegerField(
        "작업기간(개월)", validators=[Optional(), NumberRange(min=0, max=11)]
    )

    # 1일 근무시간
    work_hours_per_day = IntegerField(
        "1일 근무시간", validators=[Optional(), NumberRange(min=1, max=24)]
    )
    break_time_minutes = IntegerField(
        "휴식시간(분)", validators=[Optional(), NumberRange(min=0, max=480)]
    )
    break_frequency = IntegerField(
        "휴식횟수", validators=[Optional(), NumberRange(min=0, max=10)]
    )

    # 현작업 하기 전 작업
    previous_work_details = TextAreaField(
        "이전 작업내용", validators=[Optional(), Length(max=500)]
    )
    previous_work_years = IntegerField(
        "이전 작업기간(년)", validators=[Optional(), NumberRange(min=0, max=50)]
    )
    previous_work_months = IntegerField(
        "이전 작업기간(개월)", validators=[Optional(), NumberRange(min=0, max=11)]
    )

    # 1. 여가 및 취미활동
    hobby_computer = BooleanField("컴퓨터 관련활동")
    hobby_instrument = BooleanField("악기연주(피아노, 바이올린 등)")
    hobby_knitting = BooleanField("뜨개질/자수/붓글씨")
    hobby_racket_sports = BooleanField("테니스/배드민턴/스쿼시")
    hobby_ball_sports = BooleanField("축구/족구/농구/스키")
    hobby_none = BooleanField("해당사항 없음")

    # 2. 가사노동시간
    housework_hours = RadioField(
        "하루 평균 가사노동시간",
        choices=[
            ("거의하지않는다", "거의 하지 않는다"),
            ("1시간미만", "1시간 미만"),
            ("1-2시간", "1-2시간 미만"),
            ("2-3시간", "2-3시간 미만"),
            ("3시간이상", "3시간 이상"),
        ],
        validators=[Optional()],
    )

    # 3. 진단받은 질병
    disease_rheumatoid = BooleanField("류머티스 관절염")
    disease_diabetes = BooleanField("당뇨병")
    disease_lupus = BooleanField("루프스병")
    disease_gout = BooleanField("통풍")
    disease_alcoholism = BooleanField("알코올중독")
    disease_none = BooleanField("아니오")
    disease_status = RadioField(
        "현재상태",
        choices=[("완치", "완치"), ("치료중", "치료나 관찰 중")],
        validators=[Optional()],
    )

    # 4. 과거 사고
    past_accident = RadioField(
        "과거 운동/사고로 다친 적",
        choices=[("아니오", "아니오"), ("예", "예")],
        validators=[Optional()],
    )
    accident_hand = BooleanField("손/손가락/손목")
    accident_arm = BooleanField("팔/팔꿈치")
    accident_shoulder = BooleanField("어깨")
    accident_neck = BooleanField("목")
    accident_waist = BooleanField("허리")
    accident_leg = BooleanField("다리/발")

    # 5. 육체적 부담 정도
    physical_burden = RadioField(
        "현재 일의 육체적 부담 정도",
        choices=[
            ("전혀힘들지않음", "전혀 힘들지 않음"),
            ("견딜만함", "견딜만 함"),
            ("약간힘듦", "약간 힘듦"),
            ("매우힘듦", "매우 힘듦"),
        ],
        validators=[Optional()],
    )

    # II. 근골격계 증상 - 지난 1년 동안 통증 경험
    has_symptoms = RadioField(
        "지난 1년 동안 통증이나 불편함을 느끼신 적이 있습니까?",
        choices=[("아니오", "아니오"), ("예", "예")],
        validators=[DataRequired()],
    )

    # 통증 부위별 상세 정보는 동적으로 처리
    # JavaScript로 예를 선택한 경우에만 표시

    submit = SubmitField("제출하기")


class AdminFilterForm(FlaskForm):
    """관리자 검색/필터 폼"""

    search = StringField("검색 (이름, 사번, 부서)", validators=[Optional()])
    department = SelectField("부서", choices=[("", "전체")], validators=[Optional()])
    date_from = DateField("시작일", validators=[Optional()], format="%Y-%m-%d")
    date_to = DateField("종료일", validators=[Optional()], format="%Y-%m-%d")
    status = SelectField(
        "상태",
        choices=[
            ("", "전체"),
            ("submitted", "제출됨"),
            ("reviewed", "검토됨"),
            ("processed", "처리완료"),
        ],
    )
    pain_level = SelectField(
        "통증 수준",
        choices=[
            ("", "전체"),
            ("low", "낮음 (0-3)"),
            ("medium", "중간 (4-6)"),
            ("high", "높음 (7-10)"),
        ],
    )
    submit = SubmitField("검색")
