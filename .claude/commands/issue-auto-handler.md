# Issue Auto Handler

## Purpose
SafeWork 프로젝트의 GitHub 이슈를 자동으로 분석하고 처리하는 자동화 시스템

## Usage
```bash
/issue-auto-handler [issue-number]
```

## Description
GitHub 이슈를 자동으로 분석하고 처리하는 스마트 워크플로우:

1. **이슈 분석**: 이슈 내용, 라벨, 우선순위 분석
2. **코드베이스 검토**: 관련 파일 및 기능 식별
3. **자동 구현**: 가능한 경우 코드 변경사항 구현
4. **테스트 실행**: 변경사항에 대한 테스트 수행
5. **PR 생성**: 완성된 변경사항으로 Pull Request 생성

## Arguments
- `issue-number` (optional): 처리할 이슈 번호. 생략시 모든 open 이슈 검토

## Example
```bash
/issue-auto-handler 5
```

## Implementation

안녕하세요! SafeWork 프로젝트의 GitHub 이슈 자동 처리를 시작합니다.

**1단계: 이슈 정보 수집**
```bash
gh issue view $ARGUMENTS --json number,title,body,labels,state
```

**2단계: 코드베이스 분석**
- 이슈와 관련된 파일 검색
- 기존 구현 패턴 파악
- 영향 범위 분석

**3단계: 자동 구현**
- 기능 요구사항에 따른 코드 구현
- SafeWork 프로젝트 패턴 준수
- Flask/SQLAlchemy 모범사례 적용

**4단계: 테스트 및 검증**
```bash
# Docker 환경에서 테스트 실행
docker exec safework-app python3 -m pytest tests/ -v
```

**5단계: Pull Request 생성**
```bash
gh pr create --title "Fix #$ARGUMENTS: [이슈제목]" --body "Resolves #$ARGUMENTS"
```

## SafeWork 프로젝트 특화 기능

### Form Enhancement Issues
- 001/002 설문 폼 개선
- 조건부 필드 표시 로직
- 반응형 디자인 최적화

### Database Issues  
- MySQL 마이그레이션 처리
- 모델 스키마 업데이트
- 성능 최적화

### UI/UX Issues
- Bootstrap 컴포넌트 개선
- 모바일 반응형 수정
- 접근성 개선

### Integration Issues
- Docker 컨테이너 설정
- CI/CD 파이프라인 수정
- 배포 자동화 개선