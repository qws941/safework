"""
Warning Sign Blueprint for SafeWork
Modern chemical warning sign generator with real-time preview
"""
from flask import Blueprint, render_template, request, jsonify, send_file, current_app
from app import db
from app.models_warning_sign import (
    WarningSign, WarningSignTemplate, GHSPictogram,
    HazardStatement, PrecautionaryStatement
)
from datetime import datetime
import json
import os
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import logging

logger = logging.getLogger(__name__)

warning_sign_bp = Blueprint('warning_sign', __name__, url_prefix='/warning-sign')


@warning_sign_bp.route('/')
def index():
    """Main warning sign generator page"""
    return render_template('warning_sign/index.html')


@warning_sign_bp.route('/gallery')
def gallery():
    """Gallery of created warning signs"""
    page = request.args.get('page', 1, type=int)
    per_page = 12

    signs = WarningSign.query.filter_by(is_public=True).order_by(
        WarningSign.created_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)

    return render_template('warning_sign/gallery.html', signs=signs)


@warning_sign_bp.route('/templates')
def templates():
    """Pre-configured templates"""
    category = request.args.get('category', 'all')

    query = WarningSignTemplate.query.filter_by(is_active=True)
    if category != 'all':
        query = query.filter_by(category=category)

    templates = query.order_by(WarningSignTemplate.usage_count.desc()).all()

    return render_template('warning_sign/templates.html', templates=templates)


# ==================== API Endpoints ====================

@warning_sign_bp.route('/api/signs', methods=['GET'])
def api_get_signs():
    """Get all warning signs (with filters)"""
    try:
        user_id = request.args.get('user_id', type=int)
        is_public = request.args.get('is_public', type=lambda x: x.lower() == 'true')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        query = WarningSign.query

        if user_id:
            query = query.filter_by(user_id=user_id)
        if is_public is not None:
            query = query.filter_by(is_public=is_public)

        signs = query.order_by(WarningSign.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'success': True,
            'data': [sign.to_dict() for sign in signs.items],
            'pagination': {
                'page': signs.page,
                'per_page': signs.per_page,
                'total': signs.total,
                'pages': signs.pages
            }
        })
    except Exception as e:
        logger.error(f"Error fetching warning signs: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@warning_sign_bp.route('/api/signs/<int:sign_id>', methods=['GET'])
def api_get_sign(sign_id):
    """Get a specific warning sign"""
    try:
        sign = WarningSign.query.get_or_404(sign_id)
        return jsonify({
            'success': True,
            'data': sign.to_dict()
        })
    except Exception as e:
        logger.error(f"Error fetching warning sign {sign_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 404


@warning_sign_bp.route('/api/signs', methods=['POST'])
def api_create_sign():
    """Create a new warning sign"""
    try:
        data = request.get_json()

        sign = WarningSign(
            user_id=data.get('user_id'),
            created_by_name=data.get('created_by_name', 'Anonymous'),
            title=data.get('title', '제목 없음'),
            description=data.get('description'),
            aspect_ratio=data.get('aspect_ratio', '1:1'),
            width_mm=data.get('width_mm', 200),
            height_mm=data.get('height_mm', 200),
            pictograms=data.get('pictograms', []),
            signal_word=data.get('signal_word'),
            hazard_statements=data.get('hazard_statements', []),
            precautionary_statements=data.get('precautionary_statements', []),
            supplier_name=data.get('supplier_name'),
            supplier_address=data.get('supplier_address'),
            supplier_phone=data.get('supplier_phone'),
            emergency_phone=data.get('emergency_phone'),
            font_size_title=data.get('font_size_title', 24),
            font_size_statements=data.get('font_size_statements', 14),
            font_size_supplier=data.get('font_size_supplier', 12),
            background_color=data.get('background_color', '#FFFFFF'),
            border_color=data.get('border_color', '#FF0000'),
            border_width=data.get('border_width', 3),
            language=data.get('language', 'ko'),
            export_format=data.get('export_format', 'png'),
            is_public=data.get('is_public', False)
        )

        db.session.add(sign)
        db.session.commit()

        logger.info(f"Created warning sign: {sign.id}")

        return jsonify({
            'success': True,
            'data': sign.to_dict(),
            'message': '경고 표지가 성공적으로 생성되었습니다.'
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating warning sign: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@warning_sign_bp.route('/api/signs/<int:sign_id>', methods=['PUT'])
def api_update_sign(sign_id):
    """Update a warning sign"""
    try:
        sign = WarningSign.query.get_or_404(sign_id)
        data = request.get_json()

        # Update fields
        for field in ['title', 'description', 'aspect_ratio', 'width_mm', 'height_mm',
                      'pictograms', 'signal_word', 'hazard_statements',
                      'precautionary_statements', 'supplier_name', 'supplier_address',
                      'supplier_phone', 'emergency_phone', 'font_size_title',
                      'font_size_statements', 'font_size_supplier', 'background_color',
                      'border_color', 'border_width', 'language', 'is_public']:
            if field in data:
                setattr(sign, field, data[field])

        sign.updated_at = datetime.utcnow()
        db.session.commit()

        logger.info(f"Updated warning sign: {sign.id}")

        return jsonify({
            'success': True,
            'data': sign.to_dict(),
            'message': '경고 표지가 업데이트되었습니다.'
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating warning sign {sign_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@warning_sign_bp.route('/api/signs/<int:sign_id>', methods=['DELETE'])
def api_delete_sign(sign_id):
    """Delete a warning sign"""
    try:
        sign = WarningSign.query.get_or_404(sign_id)
        db.session.delete(sign)
        db.session.commit()

        logger.info(f"Deleted warning sign: {sign_id}")

        return jsonify({
            'success': True,
            'message': '경고 표지가 삭제되었습니다.'
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting warning sign {sign_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@warning_sign_bp.route('/api/templates', methods=['GET'])
def api_get_templates():
    """Get all templates"""
    try:
        category = request.args.get('category')

        query = WarningSignTemplate.query.filter_by(is_active=True)
        if category:
            query = query.filter_by(category=category)

        templates = query.order_by(WarningSignTemplate.usage_count.desc()).all()

        return jsonify({
            'success': True,
            'data': [t.to_dict() for t in templates]
        })

    except Exception as e:
        logger.error(f"Error fetching templates: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@warning_sign_bp.route('/api/templates/<int:template_id>/use', methods=['POST'])
def api_use_template(template_id):
    """Create a sign from template"""
    try:
        template = WarningSignTemplate.query.get_or_404(template_id)

        # Increment usage count
        template.usage_count += 1

        # Create new sign from template config
        config = template.template_config
        data = request.get_json() or {}

        sign = WarningSign(
            user_id=data.get('user_id'),
            created_by_name=data.get('created_by_name', 'Anonymous'),
            title=data.get('title', config.get('title')),
            description=data.get('description', config.get('description')),
            aspect_ratio=config.get('aspect_ratio', '1:1'),
            width_mm=config.get('width_mm', 200),
            height_mm=config.get('height_mm', 200),
            pictograms=config.get('pictograms', []),
            signal_word=config.get('signal_word'),
            hazard_statements=config.get('hazard_statements', []),
            precautionary_statements=config.get('precautionary_statements', []),
            supplier_name=data.get('supplier_name', config.get('supplier_name')),
            supplier_address=data.get('supplier_address', config.get('supplier_address')),
            supplier_phone=data.get('supplier_phone', config.get('supplier_phone')),
            emergency_phone=data.get('emergency_phone', config.get('emergency_phone')),
            font_size_title=config.get('font_size_title', 24),
            font_size_statements=config.get('font_size_statements', 14),
            font_size_supplier=config.get('font_size_supplier', 12),
            background_color=config.get('background_color', '#FFFFFF'),
            border_color=config.get('border_color', '#FF0000'),
            border_width=config.get('border_width', 3),
            language=data.get('language', 'ko')
        )

        db.session.add(sign)
        db.session.commit()

        logger.info(f"Created sign from template {template_id}: sign {sign.id}")

        return jsonify({
            'success': True,
            'data': sign.to_dict(),
            'message': '템플릿에서 경고 표지를 생성했습니다.'
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error using template {template_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== Reference Data API ====================

@warning_sign_bp.route('/api/pictograms', methods=['GET'])
def api_get_pictograms():
    """Get all GHS pictograms"""
    try:
        pictograms = GHSPictogram.query.filter_by(is_active=True).order_by(
            GHSPictogram.display_order
        ).all()

        return jsonify({
            'success': True,
            'data': [p.to_dict() for p in pictograms]
        })

    except Exception as e:
        logger.error(f"Error fetching pictograms: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@warning_sign_bp.route('/api/hazard-statements', methods=['GET'])
def api_get_hazard_statements():
    """Get all hazard statements"""
    try:
        hazard_class = request.args.get('hazard_class')

        query = HazardStatement.query.filter_by(is_active=True)
        if hazard_class:
            query = query.filter_by(hazard_class=hazard_class)

        statements = query.order_by(HazardStatement.code).all()

        return jsonify({
            'success': True,
            'data': [s.to_dict() for s in statements]
        })

    except Exception as e:
        logger.error(f"Error fetching hazard statements: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@warning_sign_bp.route('/api/precautionary-statements', methods=['GET'])
def api_get_precautionary_statements():
    """Get all precautionary statements"""
    try:
        category = request.args.get('category')

        query = PrecautionaryStatement.query.filter_by(is_active=True)
        if category:
            query = query.filter_by(category=category)

        statements = query.order_by(PrecautionaryStatement.code).all()

        return jsonify({
            'success': True,
            'data': [s.to_dict() for s in statements]
        })

    except Exception as e:
        logger.error(f"Error fetching precautionary statements: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== Export Endpoints ====================

@warning_sign_bp.route('/api/signs/<int:sign_id>/preview', methods=['GET'])
def api_preview_sign(sign_id):
    """Generate preview image of warning sign"""
    try:
        sign = WarningSign.query.get_or_404(sign_id)

        # Generate preview image (simplified version)
        img = generate_warning_sign_image(sign)

        # Save to BytesIO
        img_io = BytesIO()
        img.save(img_io, 'PNG')
        img_io.seek(0)

        return send_file(img_io, mimetype='image/png')

    except Exception as e:
        logger.error(f"Error generating preview for sign {sign_id}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@warning_sign_bp.route('/api/signs/<int:sign_id>/export/<format>', methods=['GET'])
def api_export_sign(sign_id, format):
    """Export warning sign in various formats (png, pdf, svg)"""
    try:
        sign = WarningSign.query.get_or_404(sign_id)

        # Increment usage count
        sign.usage_count += 1
        db.session.commit()

        if format == 'png':
            img = generate_warning_sign_image(sign)
            img_io = BytesIO()
            img.save(img_io, 'PNG', dpi=(300, 300))
            img_io.seek(0)
            return send_file(img_io, mimetype='image/png',
                           as_attachment=True,
                           download_name=f'warning_sign_{sign.id}.png')

        elif format == 'pdf':
            from app.utils.warning_sign_export import generate_warning_sign_pdf
            pdf_buffer = generate_warning_sign_pdf(sign)
            return send_file(
                pdf_buffer,
                mimetype='application/pdf',
                as_attachment=True,
                download_name=f'warning_sign_{sign.id}.pdf'
            )

        elif format == 'svg':
            from app.utils.warning_sign_export import generate_warning_sign_svg
            svg_buffer = generate_warning_sign_svg(sign)
            return send_file(
                svg_buffer,
                mimetype='image/svg+xml',
                as_attachment=True,
                download_name=f'warning_sign_{sign.id}.svg'
            )

        else:
            return jsonify({'success': False, 'error': 'Invalid format'}), 400

    except Exception as e:
        logger.error(f"Error exporting sign {sign_id} as {format}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== Helper Functions ====================

def generate_warning_sign_image(sign):
    """
    Generate a warning sign image using PIL
    This is a simplified version - in production, consider using a proper graphics library
    """
    # Convert mm to pixels (assume 300 DPI)
    dpi = 300
    width_px = int(sign.width_mm / 25.4 * dpi)
    height_px = int(sign.height_mm / 25.4 * dpi)

    # Create image
    img = Image.new('RGB', (width_px, height_px), sign.background_color)
    draw = ImageDraw.Draw(img)

    # Draw border
    border_width = sign.border_width
    draw.rectangle(
        [(border_width, border_width),
         (width_px - border_width, height_px - border_width)],
        outline=sign.border_color,
        width=border_width * 2
    )

    # Draw title
    try:
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                                       sign.font_size_title * 2)
    except:
        font_title = ImageFont.load_default()

    title_bbox = draw.textbbox((0, 0), sign.title, font=font_title)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (width_px - title_width) // 2
    draw.text((title_x, 50), sign.title, fill='#000000', font=font_title)

    # TODO: Add pictograms, hazard statements, etc.
    # This would require loading actual GHS pictogram images and compositing them

    return img


# ==================== Health Check ====================

@warning_sign_bp.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'warning-sign',
        'timestamp': datetime.utcnow().isoformat()
    })
