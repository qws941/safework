"""Document management forms for SafeWork"""

from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileRequired, FileAllowed
from wtforms import (StringField, TextAreaField, SelectField, BooleanField, 
                     IntegerField, DateField, MultipleFileField, HiddenField)
from wtforms.validators import DataRequired, Length, Optional, ValidationError
from wtforms.widgets import TextArea


class DocumentUploadForm(FlaskForm):
    """문서 업로드 폼"""
    title = StringField('문서 제목', validators=[
        DataRequired(message='문서 제목을 입력해주세요.'),
        Length(min=2, max=200, message='제목은 2-200자 사이여야 합니다.')
    ])
    
    description = TextAreaField('문서 설명', validators=[
        Optional(),
        Length(max=1000, message='설명은 1000자 이내여야 합니다.')
    ], widget=TextArea())
    
    file = FileField('문서 파일', validators=[
        FileRequired(message='파일을 선택해주세요.'),
        FileAllowed(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 
                    'txt', 'png', 'jpg', 'jpeg'], 
                   message='허용된 파일 형식만 업로드 가능합니다.')
    ])
    
    category_id = SelectField('카테고리', coerce=int, validators=[
        DataRequired(message='카테고리를 선택해주세요.')
    ])
    
    document_type = SelectField('문서 유형', choices=[
        ('policy', '정책/규정'),
        ('guideline', '가이드라인'),
        ('report', '보고서'),
        ('form', '양식'),
        ('educational', '교육자료'),
        ('other', '기타')
    ], validators=[DataRequired()])
    
    tags = StringField('태그', validators=[Optional()], 
                      render_kw={'placeholder': '쉼표로 구분하여 입력 (예: 안전, 교육, 필수)'})
    
    is_public = BooleanField('공개 문서 (로그인 없이 접근 가능)')
    
    requires_admin = BooleanField('관리자 전용 문서')
    
    valid_from = DateField('유효 시작일', validators=[Optional()], format='%Y-%m-%d')
    
    valid_until = DateField('유효 종료일', validators=[Optional()], format='%Y-%m-%d')
    
    def validate_valid_until(self, field):
        if field.data and self.valid_from.data:
            if field.data < self.valid_from.data:
                raise ValidationError('유효 종료일은 시작일 이후여야 합니다.')


class DocumentEditForm(FlaskForm):
    """문서 수정 폼"""
    title = StringField('문서 제목', validators=[
        DataRequired(message='문서 제목을 입력해주세요.'),
        Length(min=2, max=200)
    ])
    
    description = TextAreaField('문서 설명', validators=[
        Optional(),
        Length(max=1000)
    ])
    
    file = FileField('새 버전 파일 (선택사항)', validators=[
        Optional(),
        FileAllowed(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 
                    'txt', 'png', 'jpg', 'jpeg'])
    ])
    
    version = StringField('버전', validators=[
        Optional(),
        Length(max=20)
    ])
    
    change_description = TextAreaField('변경 사항', validators=[
        Optional(),
        Length(max=500)
    ])
    
    category_id = SelectField('카테고리', coerce=int, validators=[
        DataRequired()
    ])
    
    document_type = SelectField('문서 유형', choices=[
        ('policy', '정책/규정'),
        ('guideline', '가이드라인'),
        ('report', '보고서'),
        ('form', '양식'),
        ('educational', '교육자료'),
        ('other', '기타')
    ])
    
    tags = StringField('태그', validators=[Optional()])
    
    is_public = BooleanField('공개 문서')
    
    requires_admin = BooleanField('관리자 전용')
    
    is_active = BooleanField('활성 상태')
    
    valid_from = DateField('유효 시작일', validators=[Optional()], format='%Y-%m-%d')
    
    valid_until = DateField('유효 종료일', validators=[Optional()], format='%Y-%m-%d')


class DocumentSearchForm(FlaskForm):
    """문서 검색 폼"""
    q = StringField('검색어', validators=[
        Optional(),
        Length(max=100)
    ], render_kw={'placeholder': '제목, 설명, 문서번호, 태그로 검색'})
    
    category = SelectField('카테고리', coerce=int, validators=[Optional()])
    
    document_type = SelectField('문서 유형', choices=[
        ('', '전체'),
        ('policy', '정책/규정'),
        ('guideline', '가이드라인'),
        ('report', '보고서'),
        ('form', '양식'),
        ('educational', '교육자료'),
        ('other', '기타')
    ], validators=[Optional()])
    
    date_from = DateField('시작일', validators=[Optional()], format='%Y-%m-%d')
    
    date_to = DateField('종료일', validators=[Optional()], format='%Y-%m-%d')
    
    sort_by = SelectField('정렬', choices=[
        ('created_at', '최신순'),
        ('title', '제목순'),
        ('download_count', '다운로드순'),
        ('view_count', '조회순')
    ], default='created_at')


class CategoryForm(FlaskForm):
    """카테고리 관리 폼"""
    name = StringField('카테고리명', validators=[
        DataRequired(message='카테고리명을 입력해주세요.'),
        Length(min=2, max=100)
    ])
    
    description = TextAreaField('설명', validators=[
        Optional(),
        Length(max=500)
    ])
    
    icon = StringField('아이콘 클래스', validators=[
        Optional(),
        Length(max=50)
    ], render_kw={'placeholder': 'fa-folder (Font Awesome 클래스)'})
    
    sort_order = IntegerField('정렬 순서', validators=[
        Optional()
    ], default=0)
    
    is_active = BooleanField('활성 상태', default=True)


class DocumentTemplateForm(FlaskForm):
    """문서 템플릿 관리 폼"""
    name = StringField('템플릿명', validators=[
        DataRequired(message='템플릿명을 입력해주세요.'),
        Length(min=2, max=100)
    ])
    
    description = TextAreaField('설명', validators=[
        Optional(),
        Length(max=500)
    ])
    
    template_code = StringField('템플릿 코드', validators=[
        DataRequired(),
        Length(min=2, max=50)
    ], render_kw={'placeholder': 'FORM-001'})
    
    file = FileField('템플릿 파일', validators=[
        FileRequired(message='템플릿 파일을 선택해주세요.'),
        FileAllowed(['pdf', 'doc', 'docx', 'xls', 'xlsx'], 
                   message='PDF, Word, Excel 파일만 가능합니다.')
    ])
    
    category = SelectField('카테고리', choices=[
        ('safety', '안전'),
        ('health', '보건'),
        ('incident', '사고'),
        ('inspection', '점검'),
        ('education', '교육'),
        ('other', '기타')
    ], validators=[DataRequired()])
    
    instructions = TextAreaField('작성 안내', validators=[
        Optional(),
        Length(max=1000)
    ])
    
    is_active = BooleanField('활성 상태', default=True)


class BulkDocumentActionForm(FlaskForm):
    """문서 일괄 작업 폼"""
    document_ids = HiddenField('선택된 문서들', validators=[
        DataRequired(message='문서를 선택해주세요.')
    ])
    
    action = SelectField('작업', choices=[
        ('activate', '활성화'),
        ('deactivate', '비활성화'),
        ('archive', '보관'),
        ('delete', '삭제'),
        ('change_category', '카테고리 변경'),
        ('change_access', '접근 권한 변경')
    ], validators=[DataRequired()])
    
    category_id = SelectField('새 카테고리', coerce=int, validators=[Optional()])
    
    is_public = BooleanField('공개 설정')
    
    requires_admin = BooleanField('관리자 전용')
    
    confirm = BooleanField('작업을 확인합니다', validators=[
        DataRequired(message='작업을 확인해주세요.')
    ])


class DocumentVersionForm(FlaskForm):
    """문서 버전 관리 폼"""
    file = FileField('새 버전 파일', validators=[
        FileRequired(message='파일을 선택해주세요.'),
        FileAllowed(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'])
    ])
    
    version_number = StringField('버전 번호', validators=[
        DataRequired(message='버전 번호를 입력해주세요.'),
        Length(min=1, max=20)
    ], render_kw={'placeholder': '2.0'})
    
    change_description = TextAreaField('변경 사항 설명', validators=[
        DataRequired(message='변경 사항을 설명해주세요.'),
        Length(min=10, max=500)
    ])
    
    set_as_current = BooleanField('현재 버전으로 설정', default=True)