"""PDF Export Routes for SafeWork Survey Forms"""

from datetime import datetime, timedelta
from flask import (
    Blueprint,
    current_app,
    send_file,
    jsonify,
    request,
    flash,
    redirect,
    url_for,
    abort
)
from flask_login import login_required, current_user

from models import SurveyModel, db
from utils.pdf_generator import generate_survey_pdf, generate_batch_pdf

pdf_export_bp = Blueprint("pdf_export", __name__, url_prefix="/pdf")


@pdf_export_bp.route("/survey/<int:survey_id>")
@login_required
def export_single_survey(survey_id):
    """Export single survey as PDF"""
    try:
        # Get survey from database
        survey = SurveyModel.query.get_or_404(survey_id)
        
        # Generate PDF
        pdf_buffer = generate_survey_pdf(survey_id)
        
        # Generate filename
        safe_name = survey.name.replace(" ", "_") if survey.name else "Anonymous"
        filename = f"survey_{survey.form_type}_{safe_name}_{survey_id}.pdf"
        
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        current_app.logger.error(f"PDF export error for survey {survey_id}: {str(e)}")
        flash(f"PDF 내보내기 중 오류가 발생했습니다: {str(e)}", "error")
        return redirect(request.referrer or url_for('admin.index'))


@pdf_export_bp.route("/batch")
@login_required
def export_batch_surveys():
    """Export multiple surveys as single PDF"""
    try:
        # Get survey IDs from request
        survey_ids = request.args.getlist('survey_ids', type=int)
        
        if not survey_ids:
            flash("선택된 설문이 없습니다.", "error")
            return redirect(request.referrer or url_for('admin.index'))
        
        # Validate survey IDs exist
        existing_surveys = SurveyModel.query.filter(
            SurveyModel.id.in_(survey_ids)
        ).count()
        
        if existing_surveys != len(survey_ids):
            flash("일부 설문을 찾을 수 없습니다.", "error")
            return redirect(request.referrer or url_for('admin.index'))
        
        # Generate batch PDF
        pdf_buffer = generate_batch_pdf(survey_ids)
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"surveys_batch_{timestamp}.pdf"
        
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        current_app.logger.error(f"Batch PDF export error: {str(e)}")
        flash(f"일괄 PDF 내보내기 중 오류가 발생했습니다: {str(e)}", "error")
        return redirect(request.referrer or url_for('admin.index'))


@pdf_export_bp.route("/department/<department_name>")
@login_required
def export_department_surveys(department_name):
    """Export all surveys from a specific department"""
    try:
        # Get all surveys from department
        surveys = SurveyModel.query.filter(
            SurveyModel.department == department_name
        ).all()
        
        if not surveys:
            flash(f"'{department_name}' 부서의 설문이 없습니다.", "error")
            return redirect(request.referrer or url_for('admin.index'))
        
        survey_ids = [s.id for s in surveys]
        
        # Generate batch PDF
        pdf_buffer = generate_batch_pdf(survey_ids)
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_dept = department_name.replace(" ", "_")
        filename = f"surveys_{safe_dept}_{timestamp}.pdf"
        
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        current_app.logger.error(f"Department PDF export error for {department_name}: {str(e)}")
        flash(f"부서별 PDF 내보내기 중 오류가 발생했습니다: {str(e)}", "error")
        return redirect(request.referrer or url_for('admin.index'))


@pdf_export_bp.route("/form_type/<form_type>")
@login_required
def export_form_type_surveys(form_type):
    """Export all surveys of a specific form type"""
    try:
        # Get all surveys of this form type
        surveys = SurveyModel.query.filter(
            SurveyModel.form_type == form_type
        ).all()
        
        if not surveys:
            flash(f"양식 '{form_type}'의 설문이 없습니다.", "error")
            return redirect(request.referrer or url_for('admin.index'))
        
        survey_ids = [s.id for s in surveys]
        
        # Generate batch PDF
        pdf_buffer = generate_batch_pdf(survey_ids)
        
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"surveys_form_{form_type}_{timestamp}.pdf"
        
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        current_app.logger.error(f"Form type PDF export error for {form_type}: {str(e)}")
        flash(f"양식별 PDF 내보내기 중 오류가 발생했습니다: {str(e)}", "error")
        return redirect(request.referrer or url_for('admin.index'))


@pdf_export_bp.route("/date_range")
@login_required  
def export_date_range_surveys():
    """Export surveys from a specific date range"""
    try:
        # Get date parameters
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        if not start_date_str or not end_date_str:
            flash("시작일과 종료일을 모두 입력해주세요.", "error")
            return redirect(request.referrer or url_for('admin.index'))
        
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            flash("날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)", "error")
            return redirect(request.referrer or url_for('admin.index'))
        
        # Get surveys within date range
        surveys = SurveyModel.query.filter(
            SurveyModel.created_at >= start_date,
            SurveyModel.created_at <= end_date + timedelta(days=1)  # Include end date
        ).all()
        
        if not surveys:
            flash(f"{start_date}부터 {end_date}까지의 설문이 없습니다.", "error")
            return redirect(request.referrer or url_for('admin.index'))
        
        survey_ids = [s.id for s in surveys]
        
        # Generate batch PDF
        pdf_buffer = generate_batch_pdf(survey_ids)
        
        # Generate filename
        filename = f"surveys_{start_date_str}_to_{end_date_str}.pdf"
        
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        current_app.logger.error(f"Date range PDF export error: {str(e)}")
        flash(f"기간별 PDF 내보내기 중 오류가 발생했습니다: {str(e)}", "error")
        return redirect(request.referrer or url_for('admin.index'))


@pdf_export_bp.route("/api/single/<int:survey_id>")
@login_required
def api_export_single(survey_id):
    """API endpoint for single survey PDF export"""
    try:
        # Get survey from database
        survey = SurveyModel.query.get_or_404(survey_id)
        
        # Generate PDF
        pdf_buffer = generate_survey_pdf(survey_id)
        
        # Generate filename
        safe_name = survey.name.replace(" ", "_") if survey.name else "Anonymous"
        filename = f"survey_{survey.form_type}_{safe_name}_{survey_id}.pdf"
        
        return send_file(
            pdf_buffer,
            as_attachment=False,  # Display in browser
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        current_app.logger.error(f"API PDF export error for survey {survey_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@pdf_export_bp.route("/preview/<int:survey_id>")
@login_required
def preview_survey_pdf(survey_id):
    """Preview survey PDF in browser (inline display)"""
    try:
        # Get survey from database
        survey = SurveyModel.query.get_or_404(survey_id)
        
        # Generate PDF
        pdf_buffer = generate_survey_pdf(survey_id)
        
        # Generate filename for display
        safe_name = survey.name.replace(" ", "_") if survey.name else "Anonymous"
        filename = f"survey_{survey.form_type}_{safe_name}_{survey_id}.pdf"
        
        return send_file(
            pdf_buffer,
            as_attachment=False,  # Display inline in browser
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        current_app.logger.error(f"PDF preview error for survey {survey_id}: {str(e)}")
        abort(500)


# Error handlers for PDF export blueprint
@pdf_export_bp.errorhandler(404)
def pdf_not_found(error):
    """Handle PDF not found errors"""
    flash("요청한 설문을 찾을 수 없습니다.", "error")
    return redirect(url_for('admin.index'))


@pdf_export_bp.errorhandler(500)
def pdf_server_error(error):
    """Handle PDF generation server errors"""
    flash("PDF 생성 중 서버 오류가 발생했습니다.", "error")
    return redirect(url_for('admin.index'))