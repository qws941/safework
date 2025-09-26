from flask import Blueprint, request, jsonify
from datetime import datetime

simple_ip_bp = Blueprint("simple_ip", __name__)

@simple_ip_bp.route("/ip")
def show_ip():
    """간단한 IP 표시"""
    ip = request.headers.get('CF-Connecting-IP') or request.headers.get('X-Forwarded-For', '').split(',')[0] or request.remote_addr
    
    return jsonify({
        "ip": ip,
        "time": datetime.now().isoformat()
    })

@simple_ip_bp.route("/myip")
def my_ip():
    """내 IP 확인"""
    ip = request.headers.get('CF-Connecting-IP') or request.headers.get('X-Forwarded-For', '').split(',')[0] or request.remote_addr
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>내 IP 주소</title>
        <style>
            body {{ 
                font-family: Arial, sans-serif; 
                text-align: center; 
                margin-top: 100px; 
                background: #f5f5f5;
            }}
            .ip-box {{
                background: white;
                border-radius: 10px;
                padding: 40px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                display: inline-block;
                min-width: 300px;
            }}
            .ip {{
                font-size: 2em;
                color: #333;
                font-weight: bold;
                margin: 20px 0;
            }}
        </style>
    </head>
    <body>
        <div class="ip-box">
            <h1>🌐 내 IP 주소</h1>
            <div class="ip">{ip}</div>
            <p>현재 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
    </body>
    </html>
    """