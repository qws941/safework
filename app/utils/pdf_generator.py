"""PDF Generation for SafeWork Survey Forms"""

import json
from datetime import datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    PageBreak,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# Korean font support - fallback to default if not available
try:
    # Try to register Korean font if available
    pdfmetrics.registerFont(TTFont('NanumGothic', '/usr/share/fonts/truetype/nanum/NanumGothic.ttf'))
    KOREAN_FONT = 'NanumGothic'
except:
    # Fallback to built-in font
    KOREAN_FONT = 'Helvetica'


class SafeWorkPDFGenerator:
    """PDF Generator for SafeWork Survey Forms"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.setup_korean_styles()
    
    def setup_korean_styles(self):
        """Setup Korean-compatible styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='KoreanTitle',
            parent=self.styles['Title'],
            fontName=KOREAN_FONT,
            fontSize=16,
            spaceAfter=20,
            alignment=TA_CENTER
        ))
        
        # Header style
        self.styles.add(ParagraphStyle(
            name='KoreanHeading',
            parent=self.styles['Heading2'],
            fontName=KOREAN_FONT,
            fontSize=12,
            spaceAfter=10,
            alignment=TA_LEFT
        ))
        
        # Normal Korean text
        self.styles.add(ParagraphStyle(
            name='KoreanNormal',
            parent=self.styles['Normal'],
            fontName=KOREAN_FONT,
            fontSize=10,
            spaceBefore=3,
            spaceAfter=3
        ))
    
    def generate_survey_pdf(self, survey_data, survey_type="001"):
        """Generate PDF for survey data"""
        buffer = BytesIO()
        
        # Create document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20*mm,
            leftMargin=20*mm,
            topMargin=20*mm,
            bottomMargin=20*mm
        )
        
        # Build content based on survey type
        story = []
        
        if survey_type == "001":
            story = self._build_musculoskeletal_survey_pdf(survey_data)
        elif survey_type == "002":
            story = self._build_health_checkup_pdf(survey_data)
        else:
            story = self._build_generic_survey_pdf(survey_data, survey_type)
        
        # Build PDF
        doc.build(story)
        
        # Return buffer
        buffer.seek(0)
        return buffer
    
    def _build_musculoskeletal_survey_pdf(self, survey_data):
        """Build PDF content for musculoskeletal symptom survey (Form 001)"""
        story = []
        
        # Title
        story.append(Paragraph("근골격계 증상조사표", self.styles['KoreanTitle']))
        story.append(Spacer(1, 20))
        
        # Basic Information Section
        story.append(Paragraph("I. 기본정보", self.styles['KoreanHeading']))
        
        basic_info = [
            ['항목', '내용'],
            ['성명', survey_data.get('name', '')],
            ['연령', f"{survey_data.get('age', '')}세"],
            ['성별', survey_data.get('gender', '')],
            ['부서', survey_data.get('department', '')],
            ['현 직장경력', f"{survey_data.get('work_years', 0)}년 {survey_data.get('work_months', 0)}개월"],
        ]
        
        if survey_data.get('line'):
            basic_info.append(['라인', survey_data.get('line', '')])
        if survey_data.get('work_name'):
            basic_info.append(['수행작업', survey_data.get('work_name', '')])
        
        basic_table = Table(basic_info, colWidths=[40*mm, 120*mm])
        basic_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), KOREAN_FONT),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(basic_table)
        story.append(Spacer(1, 20))
        
        # Symptoms Section
        story.append(Paragraph("II. 증상 체크리스트", self.styles['KoreanHeading']))
        
        # Parse symptoms data
        symptoms_data = survey_data.get('symptoms_data', {})
        if isinstance(symptoms_data, str):
            try:
                symptoms_data = json.loads(symptoms_data)
            except:
                symptoms_data = {}
        
        # Body parts symptoms
        body_parts = ['neck', 'shoulder', 'arm', 'hand', 'waist', 'leg']
        body_part_names = {
            'neck': '목',
            'shoulder': '어깨', 
            'arm': '팔/팔꿈치',
            'hand': '손목/손가락',
            'waist': '허리',
            'leg': '다리/발'
        }
        
        symptoms_table_data = [['신체부위', '증상있음', '심각도', '치료필요']]
        
        for part in body_parts:
            part_data = symptoms_data.get(part, {})
            has_symptom = '✓' if part_data.get('has_symptom') else ''
            severity = part_data.get('severity', '')
            needs_treatment = '✓' if part_data.get('needs_treatment') else ''
            
            symptoms_table_data.append([
                body_part_names[part],
                has_symptom,
                severity,
                needs_treatment
            ])
        
        symptoms_table = Table(symptoms_table_data, colWidths=[40*mm, 30*mm, 50*mm, 30*mm])
        symptoms_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), KOREAN_FONT),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(symptoms_table)
        story.append(Spacer(1, 20))
        
        # Work Information Section
        if survey_data.get('current_work_details'):
            story.append(Paragraph("III. 작업 정보", self.styles['KoreanHeading']))
            story.append(Paragraph(f"작업내용: {survey_data.get('current_work_details', '')}", self.styles['KoreanNormal']))
            story.append(Spacer(1, 10))
        
        # Footer
        story.append(Spacer(1, 30))
        story.append(Paragraph(f"작성일: {datetime.now().strftime('%Y년 %m월 %d일')}", self.styles['KoreanNormal']))
        
        return story
    
    def _build_health_checkup_pdf(self, survey_data):
        """Build PDF content for health checkup survey (Form 002)"""
        story = []
        
        # Title
        story.append(Paragraph("신규 입사자 건강검진 양식", self.styles['KoreanTitle']))
        story.append(Spacer(1, 20))
        
        # Basic Information
        story.append(Paragraph("I. 기본정보", self.styles['KoreanHeading']))
        
        basic_info = [
            ['항목', '내용'],
            ['성명', survey_data.get('name', '')],
            ['연령', f"{survey_data.get('age', '')}세"],
            ['성별', survey_data.get('gender', '')],
            ['부서', survey_data.get('department', '')],
            ['직급', survey_data.get('position', '')],
            ['사번', survey_data.get('employee_id', '')],
        ]
        
        basic_table = Table(basic_info, colWidths=[40*mm, 120*mm])
        basic_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), KOREAN_FONT),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(basic_table)
        story.append(Spacer(1, 20))
        
        # Physical Information
        story.append(Paragraph("II. 신체정보", self.styles['KoreanHeading']))
        
        physical_info = [
            ['항목', '측정값'],
            ['신장', f"{survey_data.get('height_cm', '')} cm"],
            ['체중', f"{survey_data.get('weight_kg', '')} kg"],
            ['혈액형', survey_data.get('blood_type', '')],
        ]
        
        physical_table = Table(physical_info, colWidths=[40*mm, 120*mm])
        physical_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), KOREAN_FONT),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(physical_table)
        story.append(Spacer(1, 20))
        
        # Medical History
        if survey_data.get('existing_conditions') or survey_data.get('medication_history') or survey_data.get('allergy_history'):
            story.append(Paragraph("III. 의료 이력", self.styles['KoreanHeading']))
            
            if survey_data.get('existing_conditions'):
                story.append(Paragraph(f"기존 질환: {survey_data.get('existing_conditions', '')}", self.styles['KoreanNormal']))
            
            if survey_data.get('medication_history'):
                story.append(Paragraph(f"복용 약물: {survey_data.get('medication_history', '')}", self.styles['KoreanNormal']))
            
            if survey_data.get('allergy_history'):
                story.append(Paragraph(f"알레르기: {survey_data.get('allergy_history', '')}", self.styles['KoreanNormal']))
            
            story.append(Spacer(1, 20))
        
        # Footer
        story.append(Spacer(1, 30))
        story.append(Paragraph(f"작성일: {datetime.now().strftime('%Y년 %m월 %d일')}", self.styles['KoreanNormal']))
        
        return story
    
    def _build_generic_survey_pdf(self, survey_data, survey_type):
        """Build generic PDF for other survey types"""
        story = []
        
        # Title
        story.append(Paragraph(f"설문조사 양식 ({survey_type})", self.styles['KoreanTitle']))
        story.append(Spacer(1, 20))
        
        # Basic Information
        story.append(Paragraph("기본정보", self.styles['KoreanHeading']))
        
        basic_info = []
        basic_fields = ['name', 'age', 'gender', 'department', 'position']
        field_names = {
            'name': '성명',
            'age': '연령', 
            'gender': '성별',
            'department': '부서',
            'position': '직급'
        }
        
        for field in basic_fields:
            if survey_data.get(field):
                basic_info.append([field_names.get(field, field), str(survey_data.get(field, ''))])
        
        if basic_info:
            basic_table = Table(basic_info, colWidths=[40*mm, 120*mm])
            basic_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), KOREAN_FONT),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(basic_table)
            story.append(Spacer(1, 20))
        
        # Survey Response Data
        responses = survey_data.get('responses', {})
        if isinstance(responses, str):
            try:
                responses = json.loads(responses)
            except:
                responses = {}
        
        if responses:
            story.append(Paragraph("설문 응답", self.styles['KoreanHeading']))
            
            for key, value in responses.items():
                if value:
                    story.append(Paragraph(f"{key}: {value}", self.styles['KoreanNormal']))
            
            story.append(Spacer(1, 20))
        
        # Footer
        story.append(Spacer(1, 30))
        story.append(Paragraph(f"작성일: {datetime.now().strftime('%Y년 %m월 %d일')}", self.styles['KoreanNormal']))
        
        return story


def generate_survey_pdf(survey_id):
    """Generate PDF for a specific survey ID"""
    from models import SurveyModel
    
    # Get survey data from database
    survey = SurveyModel.query.get_or_404(survey_id)
    
    # Prepare survey data for PDF generation
    survey_data = {
        'name': survey.name,
        'age': survey.age,
        'gender': survey.gender,
        'department': survey.department,
        'position': survey.position,
        'employee_id': survey.employee_id,
        'work_years': survey.work_years,
        'work_months': survey.work_months,
        'responses': survey.responses,
        'symptoms_data': survey.symptoms_data,
    }
    
    # Add additional data from JSON fields
    if survey.data:
        if isinstance(survey.data, str):
            try:
                additional_data = json.loads(survey.data)
                survey_data.update(additional_data)
            except:
                pass
        elif isinstance(survey.data, dict):
            survey_data.update(survey.data)
    
    # Generate PDF
    generator = SafeWorkPDFGenerator()
    pdf_buffer = generator.generate_survey_pdf(survey_data, survey.form_type)
    
    return pdf_buffer


def generate_batch_pdf(survey_ids):
    """Generate batch PDF for multiple surveys"""
    from models import SurveyModel
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    story = []
    generator = SafeWorkPDFGenerator()
    
    for i, survey_id in enumerate(survey_ids):
        survey = SurveyModel.query.get(survey_id)
        if not survey:
            continue
            
        # Prepare survey data
        survey_data = {
            'name': survey.name,
            'age': survey.age,
            'gender': survey.gender,
            'department': survey.department,
            'position': survey.position,
            'employee_id': survey.employee_id,
            'work_years': survey.work_years,
            'work_months': survey.work_months,
            'responses': survey.responses,
            'symptoms_data': survey.symptoms_data,
        }
        
        # Add additional data from JSON fields
        if survey.data:
            if isinstance(survey.data, str):
                try:
                    additional_data = json.loads(survey.data)
                    survey_data.update(additional_data)
                except:
                    pass
            elif isinstance(survey.data, dict):
                survey_data.update(survey.data)
        
        # Generate content for this survey
        if survey.form_type == "001":
            survey_story = generator._build_musculoskeletal_survey_pdf(survey_data)
        elif survey.form_type == "002":
            survey_story = generator._build_health_checkup_pdf(survey_data)
        else:
            survey_story = generator._build_generic_survey_pdf(survey_data, survey.form_type)
        
        story.extend(survey_story)
        
        # Add page break between surveys (except for last one)
        if i < len(survey_ids) - 1:
            story.append(PageBreak())
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer