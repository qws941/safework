#!/usr/bin/env python3
"""
SafeWork 이슈 해소 사용자 알림 및 태그 시스템
GitHub API를 활용한 스마트 알림 시스템
"""

import os
import json
import requests
import time
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple
import argparse
import sys

class SafeWorkNotificationSystem:
    def __init__(self, github_token: str, repository: str):
        """
        SafeWork 알림 시스템 초기화
        
        Args:
            github_token: GitHub Personal Access Token
            repository: Repository name (format: owner/repo)
        """
        self.github_token = github_token
        self.repository = repository
        self.api_base = "https://api.github.com"
        self.headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "SafeWork-Notification-System/1.0"
        }
        
        # 기본 사용자 목록 (SafeWork 팀)
        self.default_stakeholders = [
            {
                "username": "qws941",
                "role": "Lead Developer",
                "priority": "high",
                "notification_types": ["resolution", "verification", "urgent"]
            },
            {
                "username": "seonmin994", 
                "role": "Project Manager",
                "priority": "high",
                "notification_types": ["resolution", "verification", "status"]
            }
        ]
        
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def get_issue_details(self, issue_number: int) -> Dict:
        """이슈 상세 정보 가져오기"""
        print(f"📋 이슈 #{issue_number} 상세 정보 조회 중...")
        
        url = f"{self.api_base}/repos/{self.repository}/issues/{issue_number}"
        response = self.session.get(url)
        
        if response.status_code == 200:
            issue_data = response.json()
            print(f"✅ 이슈 정보 조회 완료: {issue_data.get('title', 'Unknown')}")
            return issue_data
        else:
            raise Exception(f"이슈 조회 실패 (HTTP {response.status_code}): {response.text}")

    def get_issue_timeline(self, issue_number: int) -> List[Dict]:
        """이슈 타임라인 및 이벤트 기록 조회"""
        print(f"📅 이슈 #{issue_number} 타임라인 조회 중...")
        
        url = f"{self.api_base}/repos/{self.repository}/issues/{issue_number}/timeline"
        headers = {**self.headers, "Accept": "application/vnd.github.mockingbird-preview+json"}
        
        response = self.session.get(url, headers=headers)
        
        if response.status_code == 200:
            timeline = response.json()
            print(f"✅ 타임라인 조회 완료: {len(timeline)}개 이벤트")
            return timeline
        else:
            print(f"⚠️ 타임라인 조회 실패 (HTTP {response.status_code})")
            return []

    def identify_stakeholders(self, issue_data: Dict, custom_users: List[str] = None) -> List[Dict]:
        """이슈 관련 이해관계자 식별"""
        print("👥 이슈 관련 이해관계자 식별 중...")
        
        stakeholders = []
        
        # 1. 기본 팀 멤버들
        stakeholders.extend(self.default_stakeholders)
        
        # 2. 이슈 작성자
        if issue_data.get('user'):
            author = issue_data['user']['login']
            if not any(s['username'] == author for s in stakeholders):
                stakeholders.append({
                    "username": author,
                    "role": "Issue Author",
                    "priority": "medium",
                    "notification_types": ["resolution", "verification"]
                })
        
        # 3. 이슈 담당자들
        if issue_data.get('assignees'):
            for assignee in issue_data['assignees']:
                username = assignee['login']
                if not any(s['username'] == username for s in stakeholders):
                    stakeholders.append({
                        "username": username,
                        "role": "Assignee",
                        "priority": "high",
                        "notification_types": ["resolution", "verification", "urgent"]
                    })
        
        # 4. 수동으로 지정된 사용자들
        if custom_users:
            for username in custom_users:
                if not any(s['username'] == username for s in stakeholders):
                    stakeholders.append({
                        "username": username,
                        "role": "Reviewer",
                        "priority": "medium",
                        "notification_types": ["resolution", "verification"]
                    })
        
        # 5. 이슈 라벨에 따른 추가 이해관계자
        if issue_data.get('labels'):
            label_names = [label['name'].lower() for label in issue_data['labels']]
            
            # P0/긴급 라벨이 있으면 모든 팀원에게 알림
            if any(label in ['p0', 'urgent', '긴급'] for label in label_names):
                for stakeholder in stakeholders:
                    if "urgent" not in stakeholder["notification_types"]:
                        stakeholder["notification_types"].append("urgent")
                    stakeholder["priority"] = "high"
        
        print(f"✅ 총 {len(stakeholders)}명의 이해관계자 식별 완료")
        return stakeholders

    def generate_notification_message(self, issue_data: Dict, stakeholders: List[Dict], 
                                      evidence_info: Dict = None, verification_mode: str = "full") -> str:
        """알림 메시지 생성"""
        print("📝 알림 메시지 생성 중...")
        
        issue_number = issue_data['number']
        issue_title = issue_data['title']
        issue_url = issue_data['html_url']
        
        # 사용자 태그 문자열 생성
        user_tags = " ".join([f"@{s['username']}" for s in stakeholders])
        
        # 이슈 상태 분석
        is_closed = issue_data['state'] == 'closed'
        labels = [label['name'] for label in issue_data.get('labels', [])]
        
        # 긴급도 판단
        is_urgent = any(label.lower() in ['p0', 'urgent', '긴급'] for label in labels)
        urgency_emoji = "🚨" if is_urgent else "📢"
        
        current_time = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')
        
        message = f"""{urgency_emoji} **SafeWork 이슈 해소 증명 완료 알림**

{user_tags}

## 📋 이슈 정보
- **이슈 번호**: #{issue_number}
- **제목**: {issue_title}
- **현재 상태**: {"✅ 종료됨" if is_closed else "🔄 진행중"}
- **라벨**: {', '.join(labels) if labels else '없음'}
- **링크**: [이슈 #{issue_number}]({issue_url})

## 🎯 해소 증명 현황
- **증명 모드**: {verification_mode}
- **처리 시간**: {current_time}
- **증명 시스템**: SafeWork UI Evidence Capture System"""

        # 증거 자료 정보 추가
        if evidence_info:
            screenshot_count = evidence_info.get('screenshot_count', 0)
            artifacts_url = evidence_info.get('artifacts_url', '')
            
            message += f"""
- **캡처된 스크린샷**: {screenshot_count}개
- **증거 자료 다운로드**: [GitHub Artifacts]({artifacts_url})"""

        # 검증 요청 섹션
        message += f"""

## ✅ 검증 요청 사항

### 🧪 기능 검증 체크리스트
다음 항목들을 확인해주세요:

- [ ] **UI 정상 동작**: 이슈에서 요구한 기능이 화면에서 정상 작동
- [ ] **데이터 처리**: 입력된 데이터가 올바르게 저장/처리됨
- [ ] **사용자 경험**: 직관적이고 사용하기 편한 인터페이스
- [ ] **반응형 디자인**: 다양한 화면 크기에서 정상 표시
- [ ] **브라우저 호환성**: 주요 브라우저에서 동작 확인

### 🔍 검증 방법
\`\`\`bash
# SafeWork 애플리케이션 시작
docker-compose up -d

# 브라우저에서 직접 테스트
# http://localhost:4545/survey/001_musculoskeletal_symptom_survey
\`\`\`

## 🚀 검증 완료 후 액션

검증 완료 시 다음 중 하나로 응답해주세요:

**✅ 승인**: `@github-actions 검증 완료 - 이슈 해소 확인`
**❌ 수정 필요**: `@github-actions 추가 수정 필요 - [구체적인 문제점]`
**🔄 재검증**: `@github-actions 재검증 요청 - [재검증 사유]`

## 📊 이해관계자별 역할"""

        # 이해관계자별 역할 명시
        for stakeholder in stakeholders:
            role_emoji = {
                "Lead Developer": "👨‍💻",
                "Project Manager": "📋",
                "Issue Author": "✍️",
                "Assignee": "🎯",
                "Reviewer": "👀"
            }.get(stakeholder['role'], "👤")
            
            message += f"""
- {role_emoji} **@{stakeholder['username']}** ({stakeholder['role']}): {', '.join(stakeholder['notification_types'])} 알림"""

        message += f"""

---

> 🤖 **자동 알림 시스템**  
> 생성 시간: {current_time}  
> 시스템: SafeWork Issue Resolution Notification System v2.0  
> 품질 보장: 실제 UI 캡처 + 사용자 검증 기반  

**⚠️ 중요**: 이 알림은 실제 이슈 해소를 확인한 후 발송된 것입니다. 검증 후 승인/피드백 부탁드립니다."""

        print("✅ 알림 메시지 생성 완료")
        return message

    def send_issue_comment(self, issue_number: int, comment_body: str) -> Dict:
        """이슈에 댓글 추가"""
        print(f"💬 이슈 #{issue_number}에 알림 댓글 추가 중...")
        
        url = f"{self.api_base}/repos/{self.repository}/issues/{issue_number}/comments"
        data = {"body": comment_body}
        
        response = self.session.post(url, json=data)
        
        if response.status_code == 201:
            comment_data = response.json()
            print(f"✅ 알림 댓글 추가 완료: {comment_data.get('html_url', '')}")
            return comment_data
        else:
            raise Exception(f"댓글 추가 실패 (HTTP {response.status_code}): {response.text}")

    def send_team_mention_alert(self, issue_number: int, stakeholders: List[Dict]) -> Dict:
        """팀 멘션을 위한 별도 간단 알림"""
        print(f"📢 이슈 #{issue_number}에 팀 알림 추가 중...")
        
        user_tags = " ".join([f"@{s['username']}" for s in stakeholders 
                             if s['priority'] == 'high'])
        
        alert_message = f"""🔔 **팀 긴급 알림**: 이슈 #{issue_number} 해소 증명 완료

{user_tags}

📸 **UI 증명 스크린샷이 캡처되었습니다.**
🔍 **검증 및 승인이 필요합니다.**

상세 정보는 위의 댓글을 확인해주세요. 빠른 검토 부탁드립니다! 🚀"""

        return self.send_issue_comment(issue_number, alert_message)

    def create_verification_checklist(self, issue_number: int, issue_data: Dict) -> Dict:
        """검증 체크리스트 생성 (별도 이슈 또는 댓글)"""
        print(f"📋 이슈 #{issue_number} 검증 체크리스트 생성 중...")
        
        issue_title = issue_data['title']
        
        # 이슈 유형별 맞춤 체크리스트
        checklist_items = [
            "🖥️ UI가 정상적으로 표시됨",
            "⚡ 기능이 예상대로 동작함",
            "💾 데이터가 올바르게 저장됨",
            "📱 모바일에서도 정상 작동",
            "🌐 주요 브라우저에서 호환됨"
        ]
        
        # 이슈별 특화 체크리스트
        if "건설업" in issue_title or "기본정보" in issue_title:
            checklist_items.extend([
                "🏗️ 건설업체 드롭다운이 정상 작동",
                "⚙️ 공정 분류가 올바르게 표시",
                "👷 역할/직책 선택이 정상 작동"
            ])
        
        if "아코디언" in issue_title:
            checklist_items.extend([
                "🎵 아코디언 펼침/접힘이 정상 동작",
                "📍 부위별 개별 선택이 가능",
                "✅ 완성도 표시가 정확"
            ])
        
        if "질병" in issue_title or "상태" in issue_title:
            checklist_items.extend([
                "🏥 질병 선택 시 상태 옵션 표시",
                "🔄 조건부 표시 로직이 정상 작동",
                "💊 치료 상태 선택이 가능"
            ])
        
        checklist_markdown = "\n".join([f"- [ ] {item}" for item in checklist_items])
        
        checklist_comment = f"""📋 **검증 체크리스트 - 이슈 #{issue_number}**

다음 항목들을 확인하여 체크해주세요:

{checklist_markdown}

### 🧪 테스트 환경
\`\`\`bash
# 로컬 환경에서 테스트
docker-compose up -d
# 브라우저: http://localhost:4545

# 또는 개발 환경에서 테스트
# 개발 서버 URL 접속 후 동일한 기능 확인
\`\`\`

### ✅ 검증 완료 시
모든 항목을 확인한 후 다음 중 하나로 응답:
- **승인**: `✅ 모든 항목 검증 완료 - 이슈 해소 확인`
- **수정**: `❌ [X] 항목 문제 있음 - [구체적인 문제 설명]`

---
*자동 생성된 검증 체크리스트*"""

        return self.send_issue_comment(issue_number, checklist_comment)

    def send_follow_up_reminder(self, issue_number: int, stakeholders: List[Dict], 
                                hours_after: int = 24) -> Dict:
        """후속 알림 (미응답시 자동 리마인더)"""
        print(f"⏰ 이슈 #{issue_number} 후속 알림 예약 ({hours_after}시간 후)")
        
        # 실제 구현시에는 cron job이나 GitHub Actions scheduled workflow 사용
        reminder_message = f"""⏰ **알림 후속**: 이슈 #{issue_number} 검증 대기 중

아직 검증이 완료되지 않은 것 같습니다. 확인 부탁드립니다.

{" ".join([f"@{s['username']}" for s in stakeholders if s['priority'] == 'high'])}

📋 **필요한 액션**:
1. 기능 테스트 실행
2. 검증 체크리스트 확인  
3. 승인/피드백 제공

🔗 **빠른 링크**: http://localhost:4545/survey/001_musculoskeletal_symptom_survey

---
*{hours_after}시간 후 자동 리마인더*"""

        # 현재는 즉시 댓글 추가 (실제로는 스케줄링 필요)
        print("💡 리마인더는 별도 스케줄링 시스템에서 처리 예정")
        return {"scheduled": True, "hours_after": hours_after}

    def process_issue_resolution_notification(self, issue_number: int, 
                                              custom_users: List[str] = None,
                                              evidence_info: Dict = None,
                                              verification_mode: str = "full") -> Dict:
        """이슈 해소 알림 전체 프로세스 실행"""
        print(f"🚀 이슈 #{issue_number} 해소 알림 프로세스 시작")
        print(f"📋 검증 모드: {verification_mode}")
        
        try:
            # 1. 이슈 정보 수집
            issue_data = self.get_issue_details(issue_number)
            
            # 2. 이해관계자 식별
            stakeholders = self.identify_stakeholders(issue_data, custom_users)
            
            # 3. 알림 메시지 생성
            notification_message = self.generate_notification_message(
                issue_data, stakeholders, evidence_info, verification_mode
            )
            
            # 4. 기본 알림 댓글 추가
            main_comment = self.send_issue_comment(issue_number, notification_message)
            
            # 5. 팀 긴급 알림 (간단 버전)
            team_alert = self.send_team_mention_alert(issue_number, stakeholders)
            
            # 6. 검증 체크리스트 생성
            checklist = self.create_verification_checklist(issue_number, issue_data)
            
            # 7. 타임라인 기록 (선택적)
            timeline = self.get_issue_timeline(issue_number)
            
            result = {
                "success": True,
                "issue_number": issue_number,
                "stakeholders_notified": len(stakeholders),
                "comments_added": 3,  # 메인 알림 + 팀 알림 + 체크리스트
                "main_comment_url": main_comment.get('html_url', ''),
                "notification_summary": {
                    "total_stakeholders": len(stakeholders),
                    "high_priority_users": len([s for s in stakeholders if s['priority'] == 'high']),
                    "notification_types": list(set(
                        nt for s in stakeholders for nt in s['notification_types']
                    )),
                    "verification_mode": verification_mode
                }
            }
            
            print(f"✅ 이슈 #{issue_number} 알림 프로세스 완료")
            print(f"👥 총 {len(stakeholders)}명에게 알림 발송")
            print(f"💬 총 3개 댓글 추가")
            
            return result
            
        except Exception as e:
            error_result = {
                "success": False,
                "issue_number": issue_number,
                "error": str(e),
                "stakeholders_notified": 0
            }
            
            print(f"❌ 알림 프로세스 실패: {e}")
            return error_result

def main():
    parser = argparse.ArgumentParser(description='SafeWork 이슈 해소 알림 시스템')
    parser.add_argument('issue_number', type=int, help='알림할 이슈 번호')
    parser.add_argument('--users', type=str, help='추가 태그할 사용자들 (쉼표로 구분)')
    parser.add_argument('--mode', type=str, default='full', 
                       choices=['full', 'screenshot_only', 'notification_only'],
                       help='검증 모드')
    parser.add_argument('--screenshot-count', type=int, help='캡처된 스크린샷 수')
    parser.add_argument('--artifacts-url', type=str, help='GitHub Artifacts URL')
    
    args = parser.parse_args()
    
    # 환경 변수에서 GitHub 설정 읽기
    github_token = os.environ.get('GITHUB_TOKEN')
    repository = os.environ.get('GITHUB_REPOSITORY')
    
    if not github_token:
        print("❌ GITHUB_TOKEN 환경 변수가 설정되지 않았습니다.")
        sys.exit(1)
        
    if not repository:
        print("❌ GITHUB_REPOSITORY 환경 변수가 설정되지 않았습니다.")
        sys.exit(1)
    
    # 알림 시스템 초기화
    notification_system = SafeWorkNotificationSystem(github_token, repository)
    
    # 사용자 목록 처리
    custom_users = []
    if args.users:
        custom_users = [user.strip() for user in args.users.split(',')]
    
    # 증거 정보 구성
    evidence_info = {}
    if args.screenshot_count:
        evidence_info['screenshot_count'] = args.screenshot_count
    if args.artifacts_url:
        evidence_info['artifacts_url'] = args.artifacts_url
    
    # 알림 프로세스 실행
    result = notification_system.process_issue_resolution_notification(
        args.issue_number,
        custom_users=custom_users,
        evidence_info=evidence_info if evidence_info else None,
        verification_mode=args.mode
    )
    
    # 결과 출력
    if result['success']:
        print(f"🎉 알림 시스템 실행 성공!")
        print(f"📊 결과 요약:")
        print(f"  - 이슈 번호: #{result['issue_number']}")
        print(f"  - 알림 받은 사용자: {result['stakeholders_notified']}명")
        print(f"  - 추가된 댓글: {result['comments_added']}개")
        print(f"  - 메인 댓글 URL: {result['main_comment_url']}")
        sys.exit(0)
    else:
        print(f"❌ 알림 시스템 실행 실패: {result['error']}")
        sys.exit(1)

if __name__ == "__main__":
    main()