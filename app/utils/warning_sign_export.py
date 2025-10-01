"""
Warning Sign Export Utilities
PDF and SVG generation for chemical warning signs
"""
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import svgwrite


def generate_warning_sign_pdf(sign):
    """
    Generate PDF from warning sign using ReportLab
    """
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import mm
        from reportlab.lib import colors
    except ImportError:
        raise ImportError("reportlab is required for PDF export. Install with: pip install reportlab")

    # Create BytesIO buffer
    buffer = BytesIO()

    # Convert mm to points (1mm = 2.83465 points)
    width_pts = sign.width_mm * mm
    height_pts = sign.height_mm * mm

    # Create PDF canvas
    c = canvas.Canvas(buffer, pagesize=(width_pts, height_pts))

    # Set background
    c.setFillColor(sign.background_color)
    c.rect(0, 0, width_pts, height_pts, fill=True, stroke=False)

    # Draw border
    border_color = colors.HexColor(sign.border_color)
    c.setStrokeColor(border_color)
    c.setLineWidth(sign.border_width * 2)
    c.rect(
        sign.border_width,
        sign.border_width,
        width_pts - (sign.border_width * 2),
        height_pts - (sign.border_width * 2),
        fill=False,
        stroke=True
    )

    # Draw title
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", sign.font_size_title)
    title_width = c.stringWidth(sign.title, "Helvetica-Bold", sign.font_size_title)
    c.drawString(
        (width_pts - title_width) / 2,
        height_pts - 50,
        sign.title
    )

    # Draw signal word
    if sign.signal_word:
        signal_text = sign.signal_word
        if sign.language == 'ko':
            signal_text = '위험' if sign.signal_word == 'Danger' else '경고'

        c.setFont("Helvetica-Bold", 20)
        signal_width = c.stringWidth(signal_text, "Helvetica-Bold", 20)

        # Signal word background
        signal_color = colors.HexColor('#DC2626') if sign.signal_word == 'Danger' else colors.HexColor('#EAB308')
        c.setFillColor(signal_color)
        c.rect(
            (width_pts - signal_width - 20) / 2,
            height_pts / 2 - 40,
            signal_width + 20,
            30,
            fill=True,
            stroke=False
        )

        # Signal word text
        c.setFillColor(colors.white)
        c.drawString(
            (width_pts - signal_width) / 2,
            height_pts / 2 - 35,
            signal_text
        )

    # Draw pictograms (simplified - just boxes for now)
    if sign.pictograms and len(sign.pictograms) > 0:
        pictogram_size = 40
        total_width = len(sign.pictograms) * (pictogram_size + 10) - 10
        start_x = (width_pts - total_width) / 2

        for i, code in enumerate(sign.pictograms):
            x = start_x + i * (pictogram_size + 10)
            y = height_pts - 120

            # Draw pictogram placeholder
            c.setFillColor(colors.HexColor('#F3F4F6'))
            c.rect(x, y, pictogram_size, pictogram_size, fill=True, stroke=True)

            # Draw code
            c.setFillColor(colors.black)
            c.setFont("Helvetica", 8)
            code_width = c.stringWidth(code, "Helvetica", 8)
            c.drawString(x + (pictogram_size - code_width) / 2, y + 15, code)

    # Draw supplier info
    if sign.supplier_name:
        y_pos = 60
        c.setFillColor(colors.black)
        c.setFont("Helvetica", sign.font_size_supplier)

        name_width = c.stringWidth(sign.supplier_name, "Helvetica", sign.font_size_supplier)
        c.drawString((width_pts - name_width) / 2, y_pos, sign.supplier_name)

        if sign.supplier_phone:
            y_pos -= 15
            phone_text = f"Tel: {sign.supplier_phone}"
            phone_width = c.stringWidth(phone_text, "Helvetica", sign.font_size_supplier)
            c.drawString((width_pts - phone_width) / 2, y_pos, phone_text)

        if sign.emergency_phone:
            y_pos -= 15
            c.setFillColor(colors.HexColor('#DC2626'))
            emergency_text = f"비상: {sign.emergency_phone}"
            emergency_width = c.stringWidth(emergency_text, "Helvetica", sign.font_size_supplier)
            c.drawString((width_pts - emergency_width) / 2, y_pos, emergency_text)

    # Save PDF
    c.save()
    buffer.seek(0)

    return buffer


def generate_warning_sign_svg(sign):
    """
    Generate SVG from warning sign using svgwrite
    """
    # Create SVG drawing
    dwg = svgwrite.Drawing(
        size=(f'{sign.width_mm}mm', f'{sign.height_mm}mm'),
        viewBox=f'0 0 {sign.width_mm} {sign.height_mm}'
    )

    # Background
    dwg.add(dwg.rect(
        insert=(0, 0),
        size=(f'{sign.width_mm}mm', f'{sign.height_mm}mm'),
        fill=sign.background_color
    ))

    # Border
    dwg.add(dwg.rect(
        insert=(f'{sign.border_width}px', f'{sign.border_width}px'),
        size=(
            f'{sign.width_mm - sign.border_width * 2}mm',
            f'{sign.height_mm - sign.border_width * 2}mm'
        ),
        fill='none',
        stroke=sign.border_color,
        stroke_width=f'{sign.border_width * 2}px'
    ))

    # Title
    dwg.add(dwg.text(
        sign.title,
        insert=(f'{sign.width_mm / 2}mm', '25mm'),
        text_anchor='middle',
        font_size=f'{sign.font_size_title}px',
        font_weight='bold',
        fill='black'
    ))

    # Signal word
    if sign.signal_word:
        signal_text = sign.signal_word
        if sign.language == 'ko':
            signal_text = '위험' if sign.signal_word == 'Danger' else '경고'

        signal_color = '#DC2626' if sign.signal_word == 'Danger' else '#EAB308'

        # Signal word background
        dwg.add(dwg.rect(
            insert=(f'{sign.width_mm / 2 - 40}mm', f'{sign.height_mm / 2 - 20}mm'),
            size=('80mm', '15mm'),
            fill=signal_color,
            rx='5mm'
        ))

        # Signal word text
        dwg.add(dwg.text(
            signal_text,
            insert=(f'{sign.width_mm / 2}mm', f'{sign.height_mm / 2 - 10}mm'),
            text_anchor='middle',
            font_size='20px',
            font_weight='bold',
            fill='white'
        ))

    # Pictograms (simplified placeholders)
    if sign.pictograms and len(sign.pictograms) > 0:
        pictogram_size = 30
        total_width = len(sign.pictograms) * (pictogram_size + 5) - 5
        start_x = (sign.width_mm - total_width) / 2

        for i, code in enumerate(sign.pictograms):
            x = start_x + i * (pictogram_size + 5)
            y = 45

            # Pictogram placeholder
            dwg.add(dwg.rect(
                insert=(f'{x}mm', f'{y}mm'),
                size=(f'{pictogram_size}mm', f'{pictogram_size}mm'),
                fill='#F3F4F6',
                stroke='#D1D5DB'
            ))

            # Code text
            dwg.add(dwg.text(
                code,
                insert=(f'{x + pictogram_size/2}mm', f'{y + pictogram_size/2 + 2}mm'),
                text_anchor='middle',
                font_size='8px',
                fill='black'
            ))

    # Supplier info
    if sign.supplier_name:
        y_pos = sign.height_mm - 30

        dwg.add(dwg.text(
            sign.supplier_name,
            insert=(f'{sign.width_mm / 2}mm', f'{y_pos}mm'),
            text_anchor='middle',
            font_size=f'{sign.font_size_supplier}px',
            fill='black'
        ))

        if sign.supplier_phone:
            y_pos += 5
            dwg.add(dwg.text(
                f'Tel: {sign.supplier_phone}',
                insert=(f'{sign.width_mm / 2}mm', f'{y_pos}mm'),
                text_anchor='middle',
                font_size=f'{sign.font_size_supplier}px',
                fill='black'
            ))

        if sign.emergency_phone:
            y_pos += 5
            dwg.add(dwg.text(
                f'비상: {sign.emergency_phone}',
                insert=(f'{sign.width_mm / 2}mm', f'{y_pos}mm'),
                text_anchor='middle',
                font_size=f'{sign.font_size_supplier}px',
                fill='#DC2626',
                font_weight='bold'
            ))

    # Convert to BytesIO
    buffer = BytesIO()
    buffer.write(dwg.tostring().encode('utf-8'))
    buffer.seek(0)

    return buffer
