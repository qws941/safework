from flask import Blueprint, render_template, send_file, current_app
from flask_login import current_user
import os

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    """메인 페이지"""
    return render_template('index.html')

@main_bp.route('/download-form')
def download_form():
    """근골격계 증상조사표 PDF 다운로드"""
    pdf_path = '/app/forms/근골격계_증상조사표.pdf'
    if os.path.exists(pdf_path):
        return send_file(
            pdf_path,
            as_attachment=True,
            download_name='근골격계_증상조사표.pdf',
            mimetype='application/pdf'
        )
    else:
        # 기본 경로 체크
        alt_path = '/home/jclee/app/safework2/forms/근골격계+증상조사표.PDF'
        if os.path.exists(alt_path):
            return send_file(
                alt_path,
                as_attachment=True,
                download_name='근골격계_증상조사표.pdf',
                mimetype='application/pdf'
            )
        return "PDF 파일을 찾을 수 없습니다.", 404

@main_bp.route('/about')
def about():
    """서비스 소개"""
    return render_template('about.html')