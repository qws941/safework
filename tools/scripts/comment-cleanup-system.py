#!/usr/bin/env python3
"""
SafeWork GitHub 이슈 댓글 정리 자동화 시스템
해소된 이슈의 불필요한 댓글을 정리하고 최종 상태를 명확하게 유지
"""

import os
import json
import requests
import time
import re
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Tuple, Set
import argparse
import sys
from dataclasses import dataclass

@dataclass
class CommentAnalysis:
    id: int
    body: str
    author: str
    created_at: datetime
    is_bot: bool
    is_spam: bool
    is_duplicate: bool
    is_outdated: bool
    is_noise: bool
    importance_score: int
    cleanup_reason: str
    should_keep: bool

class SafeWorkCommentCleanup:
    def __init__(self, github_token: str, repository: str):
        """
        SafeWork 댓글 정리 시스템 초기화
        
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
            "User-Agent": "SafeWork-Comment-Cleanup-System/1.0"
        }
        
        # 정리 대상 키워드들
        self.cleanup_keywords = [
            "처리 중", "진행 중", "임시", "test", "테스트", "debugging", 
            "작업중", "WIP", "work in progress", "체크", "확인중",
            "살펴보겠습니다", "검토중", "분석중"
        ]
        
        # 중요한 키워드들 (보존해야 할 댓글)
        self.important_keywords = [
            "해결", "완료", "fixed", "resolved", "merged", "deployed",
            "검증", "승인", "확인됨", "테스트 통과", "증명", "최종"
        ]
        
        # 스팸/노이즈 패턴
        self.spam_patterns = [
            r'^[\.\!\?]+$',  # 점이나 느낌표만
            r'^[ㅋㅎ]+$',    # ㅋㅋ, ㅎㅎ만
            r'^\+1$|^-1$',   # +1, -1만
            r'^👍$|^👎$',    # 이모지만
            r'^(감사|고생|수고).*$'  # 단순 감사 인사
        ]
        
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def get_issue_comments(self, issue_number: int) -> List[Dict]:
        """이슈의 모든 댓글 조회"""
        print(f"💬 이슈 #{issue_number} 댓글 목록 조회 중...")
        
        url = f"{self.api_base}/repos/{self.repository}/issues/{issue_number}/comments"
        comments = []
        page = 1
        
        while True:
            response = self.session.get(url, params={'page': page, 'per_page': 100})
            
            if response.status_code != 200:
                raise Exception(f"댓글 조회 실패 (HTTP {response.status_code}): {response.text}")
            
            page_comments = response.json()
            if not page_comments:
                break
                
            comments.extend(page_comments)
            page += 1
        
        print(f"✅ 총 {len(comments)}개 댓글 조회 완료")
        return comments

    def analyze_comment(self, comment_data: Dict, all_comments: List[Dict]) -> CommentAnalysis:
        """개별 댓글 분석"""
        body = comment_data['body'].strip()
        author = comment_data['user']['login']
        created_at = datetime.fromisoformat(comment_data['created_at'].replace('Z', '+00:00'))
        comment_id = comment_data['id']
        
        # 기본 분석
        is_bot = comment_data['user']['type'] == 'Bot' or author.endswith('[bot]')
        
        # 스팸/노이즈 검사
        is_spam = self._is_spam_comment(body)
        is_noise = self._is_noise_comment(body)
        
        # 중복 검사
        is_duplicate = self._is_duplicate_comment(comment_data, all_comments)
        
        # 시효성 검사 (30일 이상 된 임시 댓글)
        is_outdated = self._is_outdated_comment(body, created_at)
        
        # 중요도 점수 계산 (1-10)
        importance_score = self._calculate_importance_score(body, author, is_bot, created_at)
        
        # 정리 사유 결정
        cleanup_reason = self._determine_cleanup_reason(
            is_spam, is_noise, is_duplicate, is_outdated, importance_score
        )
        
        # 보존 여부 결정
        should_keep = self._should_keep_comment(
            body, importance_score, is_spam, is_noise, is_duplicate, is_outdated
        )
        
        return CommentAnalysis(
            id=comment_id,
            body=body,
            author=author,
            created_at=created_at,
            is_bot=is_bot,
            is_spam=is_spam,
            is_duplicate=is_duplicate,
            is_outdated=is_outdated,
            is_noise=is_noise,
            importance_score=importance_score,
            cleanup_reason=cleanup_reason,
            should_keep=should_keep
        )

    def _is_spam_comment(self, body: str) -> bool:
        """스팸 댓글 판단"""
        body_lower = body.lower()
        
        # 패턴 기반 검사
        for pattern in self.spam_patterns:
            if re.match(pattern, body.strip()):
                return True
        
        # 길이 기반 검사
        if len(body.strip()) < 3:
            return True
        
        # 반복 문자 검사
        if re.match(r'^(.)\1{5,}$', body.strip()):  # 같은 문자 6번 이상
            return True
            
        return False

    def _is_noise_comment(self, body: str) -> bool:
        """노이즈 댓글 판단"""
        body_lower = body.lower()
        
        # 정리 대상 키워드 포함
        for keyword in self.cleanup_keywords:
            if keyword in body_lower:
                return True
        
        # 봇 자동 댓글 패턴
        bot_patterns = [
            "자동으로 생성된", "automatically generated", 
            "bot comment", "automated message"
        ]
        
        for pattern in bot_patterns:
            if pattern in body_lower:
                return True
                
        return False

    def _is_duplicate_comment(self, comment_data: Dict, all_comments: List[Dict]) -> bool:
        """중복 댓글 판단"""
        current_body = comment_data['body'].strip().lower()
        current_id = comment_data['id']
        current_created = comment_data['created_at']
        
        # 유사한 댓글 찾기
        for other_comment in all_comments:
            if other_comment['id'] == current_id:
                continue
                
            other_body = other_comment['body'].strip().lower()
            
            # 완전 일치
            if current_body == other_body:
                # 더 오래된 댓글이면 현재 댓글이 중복
                if current_created > other_comment['created_at']:
                    return True
            
            # 90% 이상 유사
            if self._similarity_ratio(current_body, other_body) > 0.9:
                if current_created > other_comment['created_at']:
                    return True
        
        return False

    def _is_outdated_comment(self, body: str, created_at: datetime) -> bool:
        """시효가 지난 댓글 판단"""
        # 30일 이상 된 임시 댓글
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        
        if created_at < thirty_days_ago:
            body_lower = body.lower()
            temporary_keywords = ["임시", "temporary", "wip", "작업중", "진행중"]
            
            for keyword in temporary_keywords:
                if keyword in body_lower:
                    return True
        
        return False

    def _calculate_importance_score(self, body: str, author: str, 
                                   is_bot: bool, created_at: datetime) -> int:
        """댓글 중요도 점수 계산 (1-10)"""
        score = 5  # 기본 점수
        body_lower = body.lower()
        
        # 중요한 키워드 포함시 점수 증가
        for keyword in self.important_keywords:
            if keyword in body_lower:
                score += 2
                break
        
        # 길이에 따른 점수 조정
        if len(body) > 100:
            score += 1
        elif len(body) < 20:
            score -= 1
        
        # 작성자에 따른 점수 조정
        if author in ['qws941', 'seonmin994']:  # 프로젝트 리더들
            score += 1
        elif is_bot:
            score -= 2
        
        # 최신성에 따른 점수 조정
        recent_time = datetime.now(timezone.utc) - timedelta(days=7)
        if created_at > recent_time:
            score += 1
        
        # 스레드의 첫 댓글이면 중요도 증가
        if "첫 댓글" in body_lower or "first comment" in body_lower:
            score += 1
        
        return max(1, min(10, score))  # 1-10 범위 제한

    def _determine_cleanup_reason(self, is_spam: bool, is_noise: bool, 
                                 is_duplicate: bool, is_outdated: bool, 
                                 importance_score: int) -> str:
        """정리 사유 결정"""
        reasons = []
        
        if is_spam:
            reasons.append("스팸/의미없는 댓글")
        if is_noise:
            reasons.append("노이즈/임시 댓글")
        if is_duplicate:
            reasons.append("중복 댓글")
        if is_outdated:
            reasons.append("시효 만료")
        if importance_score <= 2:
            reasons.append("낮은 중요도")
        
        return ", ".join(reasons) if reasons else "정리 불필요"

    def _should_keep_comment(self, body: str, importance_score: int,
                           is_spam: bool, is_noise: bool, 
                           is_duplicate: bool, is_outdated: bool) -> bool:
        """댓글 보존 여부 결정"""
        # 중요한 키워드가 있으면 무조건 보존
        body_lower = body.lower()
        for keyword in self.important_keywords:
            if keyword in body_lower:
                return True
        
        # 스팸이면 제거
        if is_spam:
            return False
        
        # 중요도가 높으면 보존
        if importance_score >= 7:
            return True
        
        # 복합적 판단
        negative_factors = sum([is_noise, is_duplicate, is_outdated])
        
        # 부정적 요소가 2개 이상이고 중요도가 낮으면 제거
        if negative_factors >= 2 and importance_score <= 4:
            return False
        
        # 기본적으로 보존
        return True

    def _similarity_ratio(self, text1: str, text2: str) -> float:
        """두 텍스트의 유사도 계산 (간단한 구현)"""
        if not text1 or not text2:
            return 0.0
        
        # 단어 기반 유사도
        words1 = set(text1.split())
        words2 = set(text2.split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        
        return intersection / union if union > 0 else 0.0

    def minimize_comment(self, comment_id: int, original_body: str, reason: str) -> Dict:
        """댓글 최소화 (실제 삭제 대신 내용 최소화)"""
        print(f"🔄 댓글 {comment_id} 최소화 중...")
        
        minimized_body = f"""~~[자동 정리됨: {reason}]~~

<details>
<summary>원본 댓글 보기</summary>

{original_body[:200]}{'...' if len(original_body) > 200 else ''}

</details>

---
*SafeWork Comment Cleanup System에 의해 자동 정리됨*"""

        url = f"{self.api_base}/repos/{self.repository}/issues/comments/{comment_id}"
        data = {"body": minimized_body}
        
        response = self.session.patch(url, json=data)
        
        if response.status_code == 200:
            print(f"✅ 댓글 {comment_id} 최소화 완료")
            return response.json()
        else:
            print(f"❌ 댓글 {comment_id} 최소화 실패: {response.status_code}")
            return {}

    def create_cleanup_summary(self, issue_number: int, analyses: List[CommentAnalysis], 
                              cleaned_count: int) -> Dict:
        """정리 요약 댓글 생성"""
        print(f"📋 이슈 #{issue_number} 정리 요약 생성 중...")
        
        total_comments = len(analyses)
        kept_comments = len([a for a in analyses if a.should_keep])
        
        # 정리 이유별 통계
        cleanup_reasons = {}
        for analysis in analyses:
            if not analysis.should_keep:
                reason = analysis.cleanup_reason
                cleanup_reasons[reason] = cleanup_reasons.get(reason, 0) + 1
        
        # 중요도별 통계
        importance_stats = {
            "high": len([a for a in analyses if a.importance_score >= 7]),
            "medium": len([a for a in analyses if 4 <= a.importance_score < 7]), 
            "low": len([a for a in analyses if a.importance_score < 4])
        }
        
        summary_comment = f"""🧹 **이슈 댓글 자동 정리 완료**

## 📊 정리 통계
- **전체 댓글**: {total_comments}개
- **보존된 댓글**: {kept_comments}개  
- **정리된 댓글**: {cleaned_count}개
- **정리 완료 시간**: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}

## 🔍 정리 기준 적용 결과"""

        # 정리 이유별 통계 추가
        if cleanup_reasons:
            summary_comment += "\n\n### 📝 정리 이유별 통계"
            for reason, count in cleanup_reasons.items():
                summary_comment += f"\n- **{reason}**: {count}개"
        
        # 중요도별 통계 추가  
        summary_comment += f"""

### ⭐ 중요도별 분석
- **높음 (7-10점)**: {importance_stats['high']}개 - 모두 보존
- **보통 (4-6점)**: {importance_stats['medium']}개 - 조건부 보존
- **낮음 (1-3점)**: {importance_stats['low']}개 - 대부분 정리

## 🎯 정리 정책
1. **중요한 키워드** 포함 댓글은 무조건 보존
   - 해결, 완료, fixed, resolved, 검증, 승인 등
2. **스팸/노이즈** 댓글 자동 정리
   - 의미없는 문자, 반복 댓글, 임시 메모 등
3. **중복 댓글** 정리 (90% 이상 유사)
4. **시효 만료** 댓글 정리 (30일 이상 된 임시 댓글)

## ✅ 최종 상태
이제 이슈의 핵심 내용과 해결 과정만 명확하게 남아있습니다.

---
*SafeWork Comment Cleanup System v1.0에 의해 자동 생성됨*"""

        url = f"{self.api_base}/repos/{self.repository}/issues/{issue_number}/comments"
        data = {"body": summary_comment}
        
        response = self.session.post(url, json=data)
        
        if response.status_code == 201:
            print(f"✅ 정리 요약 댓글 추가 완료")
            return response.json()
        else:
            print(f"❌ 정리 요약 댓글 추가 실패: {response.status_code}")
            return {}

    def process_issue_cleanup(self, issue_number: int, dry_run: bool = False,
                             preserve_recent_days: int = 7,
                             min_importance_threshold: int = 3) -> Dict:
        """이슈 댓글 정리 전체 프로세스"""
        print(f"🧹 이슈 #{issue_number} 댓글 정리 프로세스 시작")
        print(f"🔍 실행 모드: {'시뮬레이션' if dry_run else '실제 정리'}")
        
        try:
            # 1. 댓글 조회
            comments = self.get_issue_comments(issue_number)
            
            if not comments:
                print("💬 정리할 댓글이 없습니다.")
                return {"success": True, "message": "No comments to cleanup"}
            
            # 2. 댓글 분석
            print("🔍 댓글 분석 시작...")
            analyses = []
            
            for comment_data in comments:
                analysis = self.analyze_comment(comment_data, comments)
                
                # 최근 댓글 보호
                recent_threshold = datetime.now(timezone.utc) - timedelta(days=preserve_recent_days)
                if analysis.created_at > recent_threshold:
                    analysis.should_keep = True
                    analysis.cleanup_reason = "최근 댓글 (보호됨)"
                
                analyses.append(analysis)
            
            # 3. 정리 대상 선별
            cleanup_candidates = [a for a in analyses if not a.should_keep]
            keep_candidates = [a for a in analyses if a.should_keep]
            
            print(f"📊 분석 결과:")
            print(f"  - 전체 댓글: {len(analyses)}개")
            print(f"  - 보존 예정: {len(keep_candidates)}개")
            print(f"  - 정리 예정: {len(cleanup_candidates)}개")
            
            if dry_run:
                print("\n🔍 시뮬레이션 모드 - 정리 대상 상세:")
                for analysis in cleanup_candidates:
                    print(f"  - ID {analysis.id}: {analysis.cleanup_reason}")
                    print(f"    작성자: {analysis.author}, 중요도: {analysis.importance_score}")
                    print(f"    내용: {analysis.body[:50]}...")
                    print()
                
                return {
                    "success": True,
                    "dry_run": True,
                    "total_comments": len(analyses),
                    "cleanup_candidates": len(cleanup_candidates),
                    "preservation_candidates": len(keep_candidates)
                }
            
            # 4. 실제 정리 수행
            cleaned_count = 0
            
            for analysis in cleanup_candidates:
                try:
                    self.minimize_comment(analysis.id, analysis.body, analysis.cleanup_reason)
                    cleaned_count += 1
                    time.sleep(0.5)  # API 레이트 리밋 방지
                except Exception as e:
                    print(f"⚠️ 댓글 {analysis.id} 정리 실패: {e}")
            
            # 5. 정리 요약 생성
            summary = self.create_cleanup_summary(issue_number, analyses, cleaned_count)
            
            result = {
                "success": True,
                "issue_number": issue_number,
                "total_comments": len(analyses),
                "comments_cleaned": cleaned_count,
                "comments_preserved": len(keep_candidates),
                "cleanup_summary_url": summary.get('html_url', ''),
                "cleanup_statistics": {
                    "spam_cleaned": len([a for a in cleanup_candidates if a.is_spam]),
                    "noise_cleaned": len([a for a in cleanup_candidates if a.is_noise]),
                    "duplicate_cleaned": len([a for a in cleanup_candidates if a.is_duplicate]),
                    "outdated_cleaned": len([a for a in cleanup_candidates if a.is_outdated])
                }
            }
            
            print(f"✅ 이슈 #{issue_number} 댓글 정리 완료")
            print(f"📊 결과: {cleaned_count}개 정리, {len(keep_candidates)}개 보존")
            
            return result
            
        except Exception as e:
            error_result = {
                "success": False,
                "issue_number": issue_number,
                "error": str(e)
            }
            
            print(f"❌ 댓글 정리 실패: {e}")
            return error_result

def main():
    parser = argparse.ArgumentParser(description='SafeWork GitHub 이슈 댓글 정리 시스템')
    parser.add_argument('issue_number', type=int, help='정리할 이슈 번호')
    parser.add_argument('--dry-run', action='store_true', 
                       help='실제 정리하지 않고 시뮬레이션만 실행')
    parser.add_argument('--preserve-days', type=int, default=7,
                       help='보호할 최근 댓글 일수 (기본: 7일)')
    parser.add_argument('--min-importance', type=int, default=3,
                       help='보존 최소 중요도 임계값 (기본: 3)')
    
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
    
    # 정리 시스템 초기화
    cleanup_system = SafeWorkCommentCleanup(github_token, repository)
    
    # 정리 프로세스 실행
    result = cleanup_system.process_issue_cleanup(
        args.issue_number,
        dry_run=args.dry_run,
        preserve_recent_days=args.preserve_days,
        min_importance_threshold=args.min_importance
    )
    
    # 결과 출력
    if result['success']:
        if result.get('dry_run'):
            print(f"🔍 시뮬레이션 결과:")
            print(f"  - 전체 댓글: {result['total_comments']}개")
            print(f"  - 정리 대상: {result['cleanup_candidates']}개")  
            print(f"  - 보존 대상: {result['preservation_candidates']}개")
        else:
            print(f"🎉 댓글 정리 완료!")
            print(f"📊 결과 요약:")
            print(f"  - 이슈 번호: #{result['issue_number']}")
            print(f"  - 정리된 댓글: {result['comments_cleaned']}개")
            print(f"  - 보존된 댓글: {result['comments_preserved']}개")
            if result.get('cleanup_summary_url'):
                print(f"  - 요약 댓글: {result['cleanup_summary_url']}")
        sys.exit(0)
    else:
        print(f"❌ 댓글 정리 실패: {result['error']}")
        sys.exit(1)

if __name__ == "__main__":
    main()