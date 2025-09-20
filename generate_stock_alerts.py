#!/usr/bin/env python3
"""
SafeWork 재고 부족 알림 생성 스크립트
의약품 재고 현황을 확인하고 Slack 알림 생성
"""

import os
import sys
import json
from datetime import datetime, timedelta

def generate_mock_medication_data():
    """테스트용 의약품 재고 데이터 생성"""
    return [
        {
            "id": 1,
            "name": "아세트아미노펜 500mg",
            "category": "해열진통제",
            "current_stock": 5,
            "minimum_stock": 20,
            "unit": "정",
            "expiry_date": "2024-12-15",
            "supplier": "대한약품",
            "shortage_amount": 15
        },
        {
            "id": 2,
            "name": "포비돈 요오드",
            "category": "소독제",
            "current_stock": 2,
            "minimum_stock": 10,
            "unit": "병",
            "expiry_date": "2024-11-30",
            "supplier": "한국제약",
            "shortage_amount": 8
        },
        {
            "id": 3,
            "name": "밴드 (대형)",
            "category": "의료용품",
            "current_stock": 3,
            "minimum_stock": 50,
            "unit": "개",
            "expiry_date": "2025-06-30",
            "supplier": "메디컬코리아",
            "shortage_amount": 47
        },
        {
            "id": 4,
            "name": "이부프로펜 200mg",
            "category": "해열진통제",
            "current_stock": 12,
            "minimum_stock": 30,
            "unit": "정",
            "expiry_date": "2024-10-25",
            "supplier": "글로벌파마",
            "shortage_amount": 18
        }
    ]

def generate_slack_notification_payload(medication_data):
    """Slack 알림용 페이로드 생성"""

    # 긴급도별 분류
    critical_items = [item for item in medication_data if item['shortage_amount'] >= 20]
    urgent_items = [item for item in medication_data if 10 <= item['shortage_amount'] < 20]
    normal_items = [item for item in medication_data if item['shortage_amount'] < 10]

    # Slack 메시지 구성
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S KST")

    # 기본 알림 메시지
    base_payload = {
        "channel": "#safework-alerts",
        "text": f"🚨 SafeWork 의약품 재고 부족 알림 ({len(medication_data)}개 항목)",
        "attachments": []
    }

    # 긴급 항목 첨부
    if critical_items:
        critical_attachment = {
            "color": "danger",
            "title": f"🔴 긴급 보충 필요 ({len(critical_items)}개)",
            "fields": [],
            "footer": "SafeWork 재고 관리 시스템",
            "ts": int(datetime.now().timestamp())
        }

        for item in critical_items:
            critical_attachment["fields"].append({
                "title": f"📦 {item['name']}",
                "value": f"현재: {item['current_stock']}{item['unit']} | 최소: {item['minimum_stock']}{item['unit']} | 부족: {item['shortage_amount']}{item['unit']}",
                "short": False
            })

        base_payload["attachments"].append(critical_attachment)

    # 주의 항목 첨부
    if urgent_items:
        urgent_attachment = {
            "color": "warning",
            "title": f"🟡 보충 필요 ({len(urgent_items)}개)",
            "fields": [],
            "footer": "SafeWork 재고 관리 시스템"
        }

        for item in urgent_items:
            urgent_attachment["fields"].append({
                "title": f"📦 {item['name']}",
                "value": f"현재: {item['current_stock']}{item['unit']} | 부족: {item['shortage_amount']}{item['unit']}",
                "short": True
            })

        base_payload["attachments"].append(urgent_attachment)

    # 일반 항목 첨부
    if normal_items:
        normal_attachment = {
            "color": "good",
            "title": f"🟢 관찰 필요 ({len(normal_items)}개)",
            "fields": [],
            "footer": "SafeWork 재고 관리 시스템"
        }

        for item in normal_items:
            normal_attachment["fields"].append({
                "title": f"📦 {item['name']}",
                "value": f"현재: {item['current_stock']}{item['unit']} | 부족: {item['shortage_amount']}{item['unit']}",
                "short": True
            })

        base_payload["attachments"].append(normal_attachment)

    # 시스템 링크 추가
    system_links_attachment = {
        "color": "#36a64f",
        "title": "🔗 시스템 접속",
        "fields": [
            {
                "title": "관리 대시보드",
                "value": "<https://safework.jclee.me/admin/safework/medications|의약품 관리> | <https://safework.jclee.me/health|시스템 상태>",
                "short": False
            }
        ],
        "footer": f"생성 시간: {current_time}"
    }

    base_payload["attachments"].append(system_links_attachment)

    return base_payload

def generate_email_alert_content(medication_data):
    """이메일 알림용 HTML 콘텐츠 생성"""

    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">🏥 SafeWork 의약품 재고 부족 알림</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">발송 시간: {datetime.now().strftime('%Y년 %m월 %d일 %H:%M:%S')}</p>
            </div>

            <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #dc3545; margin-top: 0;">📊 재고 부족 현황 ({len(medication_data)}개 항목)</h2>

                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead>
                        <tr style="background: #e9ecef;">
                            <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">의약품명</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">현재 재고</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">최소 재고</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">부족량</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">긴급도</th>
                        </tr>
                    </thead>
                    <tbody>
    """

    for item in medication_data:
        # 긴급도 설정
        if item['shortage_amount'] >= 20:
            urgency = "🔴 긴급"
            urgency_color = "#dc3545"
        elif item['shortage_amount'] >= 10:
            urgency = "🟡 주의"
            urgency_color = "#ffc107"
        else:
            urgency = "🟢 보통"
            urgency_color = "#28a745"

        html_content += f"""
                        <tr>
                            <td style="padding: 12px; border: 1px solid #dee2e6;">
                                <strong>{item['name']}</strong><br>
                                <small style="color: #6c757d;">{item['category']} | {item['supplier']}</small>
                            </td>
                            <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">
                                {item['current_stock']}{item['unit']}
                            </td>
                            <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">
                                {item['minimum_stock']}{item['unit']}
                            </td>
                            <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6; color: #dc3545; font-weight: bold;">
                                {item['shortage_amount']}{item['unit']}
                            </td>
                            <td style="padding: 12px; text-align: center; border: 1px solid #dee2e6; color: {urgency_color}; font-weight: bold;">
                                {urgency}
                            </td>
                        </tr>
        """

    html_content += f"""
                    </tbody>
                </table>

                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
                    <h3 style="color: #856404; margin-top: 0;">🔧 권장 조치사항</h3>
                    <ul style="color: #856404; margin: 0;">
                        <li>긴급 재고 부족 항목 즉시 발주 처리</li>
                        <li>공급업체 연락 및 배송 일정 확인</li>
                        <li>임시 대체 의약품 확보 검토</li>
                        <li>재고 관리 담당자 지정 및 점검 주기 단축</li>
                    </ul>
                </div>

                <div style="text-align: center; margin: 20px 0;">
                    <a href="https://safework.jclee.me/admin/safework/medications"
                       style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        📦 의약품 관리 시스템 접속
                    </a>
                </div>

                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px;">
                    <p>이 알림은 SafeWork 안전보건 관리시스템에서 자동 생성되었습니다.</p>
                    <p>문의사항: admin@safework.com | 시스템 상태: <a href="https://safework.jclee.me/health">확인</a></p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    return html_content

def save_alert_reports(medication_data, slack_payload, email_content):
    """알림 리포트를 파일로 저장"""

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    reports_dir = "/home/jclee/app/safework/stock_reports"

    # 디렉토리 생성
    os.makedirs(reports_dir, exist_ok=True)

    # Slack 페이로드 저장
    slack_file = f"{reports_dir}/slack_alert_{timestamp}.json"
    with open(slack_file, 'w', encoding='utf-8') as f:
        json.dump(slack_payload, f, ensure_ascii=False, indent=2)

    # 이메일 HTML 저장
    email_file = f"{reports_dir}/email_alert_{timestamp}.html"
    with open(email_file, 'w', encoding='utf-8') as f:
        f.write(email_content)

    # 텍스트 요약 저장
    summary_file = f"{reports_dir}/summary_{timestamp}.txt"
    with open(summary_file, 'w', encoding='utf-8') as f:
        f.write(f"SafeWork 의약품 재고 부족 알림 요약\n")
        f.write(f"{'='*50}\n")
        f.write(f"생성 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"부족 항목: {len(medication_data)}개\n\n")

        for i, item in enumerate(medication_data, 1):
            f.write(f"{i}. {item['name']}\n")
            f.write(f"   분류: {item['category']}\n")
            f.write(f"   현재 재고: {item['current_stock']}{item['unit']}\n")
            f.write(f"   최소 재고: {item['minimum_stock']}{item['unit']}\n")
            f.write(f"   부족량: {item['shortage_amount']}{item['unit']}\n")
            f.write(f"   공급업체: {item['supplier']}\n")
            f.write(f"   유효기간: {item['expiry_date']}\n\n")

    return {
        'slack_file': slack_file,
        'email_file': email_file,
        'summary_file': summary_file
    }

def main():
    """메인 실행 함수"""

    print("=" * 60)
    print("🏥 SafeWork 재고 부족 알림 생성기")
    print("=" * 60)
    print(f"📅 실행 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # 1. 재고 부족 데이터 생성 (실제 환경에서는 DB에서 조회)
    print("📊 재고 부족 데이터 분석 중...")
    medication_data = generate_mock_medication_data()

    if not medication_data:
        print("✅ 재고 부족 항목이 없습니다.")
        return

    print(f"🚨 재고 부족 항목 {len(medication_data)}개 발견!")

    # 2. Slack 알림 페이로드 생성
    print("📱 Slack 알림 메시지 생성 중...")
    slack_payload = generate_slack_notification_payload(medication_data)

    # 3. 이메일 알림 콘텐츠 생성
    print("📧 이메일 알림 콘텐츠 생성 중...")
    email_content = generate_email_alert_content(medication_data)

    # 4. 리포트 파일 저장
    print("💾 알림 리포트 파일 저장 중...")
    saved_files = save_alert_reports(medication_data, slack_payload, email_content)

    # 5. 결과 출력
    print()
    print("✅ 재고 부족 알림 생성 완료!")
    print("-" * 40)
    print(f"📱 Slack 알림: {saved_files['slack_file']}")
    print(f"📧 이메일 알림: {saved_files['email_file']}")
    print(f"📄 요약 리포트: {saved_files['summary_file']}")
    print()
    print("🔧 다음 단계:")
    print("1. Slack Webhook URL 설정 후 알림 전송")
    print("2. 이메일 서버 설정 후 담당자에게 발송")
    print("3. 의약품 발주 및 재고 보충 작업 진행")
    print("4. 재고 관리 프로세스 개선 검토")

    # 6. 긴급 항목이 있는 경우 경고
    critical_count = len([item for item in medication_data if item['shortage_amount'] >= 20])
    if critical_count > 0:
        print()
        print(f"🚨 긴급 조치 필요: {critical_count}개 항목이 심각한 재고 부족 상태입니다!")
        return 1

    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)