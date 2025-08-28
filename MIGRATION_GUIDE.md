# SafeWork 데이터베이스 마이그레이션 가이드

## 📋 개요

SafeWork 프로젝트는 데이터베이스 스키마 변경을 안전하고 체계적으로 관리하기 위한 커스텀 마이그레이션 시스템을 사용합니다.

## 🚀 빠른 시작

### 마이그레이션 상태 확인
```bash
# 현재 마이그레이션 상태 확인
make migrate-status
# 또는
./migrate.sh status
```

### 마이그레이션 실행
```bash
# 대기 중인 모든 마이그레이션 실행
make migrate-run
# 또는
./migrate.sh migrate
```

### 새 마이그레이션 생성
```bash
# 새 마이그레이션 파일 생성
make migrate-create desc="Add user preferences table"
# 또는
./migrate.sh create "Add user preferences table"
```

## 📁 마이그레이션 시스템 구조

```
app/
├── migrations/                 # 마이그레이션 파일 디렉토리
│   ├── __init__.py
│   ├── 001_initial_schema.py   # 초기 스키마
│   ├── 002_create_admin_user.py # 관리자 계정 생성
│   └── 003_optimize_performance.py # 성능 최적화
├── migration_manager.py        # 마이그레이션 관리자
├── migration_model.py          # 마이그레이션 추적 모델
├── migrate.py                  # 마이그레이션 CLI
└── routes/migration.py         # 웹 관리 인터페이스
```

## 🛠️ 사용 방법

### 1. 명령어 라인 인터페이스

#### 기본 명령어
```bash
cd app
python migrate.py <command> [options]
```

#### 사용 가능한 명령어

| 명령어 | 설명 | 예시 |
|--------|------|------|
| `status` | 마이그레이션 상태 확인 | `python migrate.py status` |
| `migrate` | 대기 중인 마이그레이션 실행 | `python migrate.py migrate` |
| `create` | 새 마이그레이션 생성 | `python migrate.py create "Add new table"` |
| `rollback` | 마이그레이션 롤백 | `python migrate.py rollback --version 002` |
| `init-db` | 데이터베이스 초기화 | `python migrate.py init-db` |
| `reset-db` | 데이터베이스 리셋 | `python migrate.py reset-db` |

### 2. Makefile 명령어

```bash
# 마이그레이션 관리
make migrate-status                    # 상태 확인
make migrate-run                       # 마이그레이션 실행
make migrate-create desc="설명"        # 새 마이그레이션 생성
make migrate-rollback version=002      # 특정 버전 롤백
make migrate-rollback                  # 최신 마이그레이션 롤백

# 개발 도구
make migrate-init                      # 데이터베이스 초기화
make migrate-reset                     # 데이터베이스 리셋

# 백업/복원
make migrate-backup                    # 데이터베이스 백업
make migrate-restore file=backup.sql   # 백업에서 복원
make migrate-auto                      # 자동 마이그레이션
```

### 3. 간편 스크립트

```bash
# 마이그레이션 도우미 스크립트 사용
./migrate.sh status                    # 상태 확인
./migrate.sh migrate                   # 마이그레이션 실행
./migrate.sh create "설명"             # 새 마이그레이션 생성
./migrate.sh backup                    # 백업 생성
./migrate.sh restore backup.sql        # 복원
```

### 4. 웹 관리 인터페이스

- **URL**: `http://localhost:4545/admin/migrations` (관리자 로그인 필요)
- **기능**:
  - 마이그레이션 상태 시각화
  - 웹에서 마이그레이션 실행
  - 새 마이그레이션 생성
  - 마이그레이션 롤백
  - 실시간 상태 업데이트

## 📝 마이그레이션 파일 작성법

### 파일명 규칙
```
{버전}_{설명}.py
예: 001_initial_schema.py, 002_add_user_table.py
```

### 기본 템플릿
```python
"""Migration: 마이그레이션 설명

Created: 2025-01-15 12:00:00 UTC
Version: 004
"""

from app.models import db


def upgrade():
    """Apply the migration"""
    # 마이그레이션 로직 구현
    
    # 테이블 생성 예시
    db.engine.execute("""
        CREATE TABLE user_preferences (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            theme VARCHAR(50) DEFAULT 'default',
            language VARCHAR(10) DEFAULT 'ko',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)
    
    # 인덱스 생성
    db.engine.execute("""
        CREATE INDEX idx_user_preferences_user_id 
        ON user_preferences(user_id);
    """)
    
    print("✅ User preferences table created")


def downgrade():
    """Rollback the migration"""
    # 롤백 로직 구현
    
    db.engine.execute("DROP INDEX IF EXISTS idx_user_preferences_user_id;")
    db.engine.execute("DROP TABLE IF EXISTS user_preferences;")
    
    print("✅ User preferences table removed")
```

### 마이그레이션 작성 가이드라인

#### ✅ 해야 할 것
- **명확한 설명**: 마이그레이션의 목적을 명확히 기술
- **원자성**: 하나의 마이그레이션에는 하나의 논리적 변경사항만
- **롤백 가능**: 모든 변경사항에 대한 롤백 로직 구현
- **안전성**: 기존 데이터를 보존하는 방향으로 작성
- **테스트**: 로컬 환경에서 충분히 테스트

#### ❌ 하지 말 것
- **데이터 삭제**: 복구 불가능한 데이터 삭제 금지
- **복잡한 로직**: 비즈니스 로직은 별도 스크립트로 분리
- **환경 의존적**: 특정 환경에서만 작동하는 코드 금지
- **대량 데이터**: 큰 데이터 변경은 배치로 분할

## 🔄 배포 프로세스 통합

### 1. Docker 컨테이너
- 컨테이너 시작 시 자동으로 마이그레이션 실행
- `start.sh` 스크립트가 마이그레이션 후 앱 시작

### 2. GitHub Actions
```yaml
- name: Run database migrations
  run: |
    cd app
    python migrate.py migrate
```

### 3. 로컬 개발
```bash
# 개발 시작 전 마이그레이션 확인
make migrate-auto

# 개발 완료 후 커밋 전 마이그레이션 상태 확인
make migrate-status
```

## 🛡️ 안전 장치

### 1. 백업 시스템
```bash
# 자동 백업 (타임스탬프 포함)
make migrate-backup

# 복원
make migrate-restore file=backups/safework_backup_20250115_120000.sql
```

### 2. 체크섬 검증
- 마이그레이션 파일의 무결성을 SHA-256으로 검증
- 파일 변경 시 경고 메시지 출력

### 3. 실행 추적
- 모든 마이그레이션 실행 내역을 데이터베이스에 저장
- 실행 시간, 성공/실패 상태, 오류 메시지 기록

### 4. 원자적 실행
- 각 마이그레이션은 트랜잭션으로 실행
- 실패 시 자동 롤백

## 🚨 트러블슈팅

### 자주 발생하는 문제들

#### 1. 마이그레이션 실행 실패
```bash
# 상태 확인
make migrate-status

# 오류 로그 확인
cd app && python migrate.py status

# 수동 복구
make migrate-backup
make migrate-rollback
```

#### 2. 마이그레이션 충돌
```bash
# 현재 상태 확인
make migrate-status

# 문제가 있는 마이그레이션 롤백
make migrate-rollback version=003

# 올바른 마이그레이션 재작성
make migrate-create desc="Fixed migration"
```

#### 3. 데이터베이스 연결 실패
```bash
# 연결 설정 확인
cat app/config.py

# 데이터베이스 서비스 상태 확인
make status

# 네트워크 연결 테스트
ping safework-mysql
```

### 복구 절차

#### 1. 백업에서 복원
```bash
# 최근 백업 확인
ls -la backups/

# 복원 실행
make migrate-restore file=backups/safework_backup_20250115_120000.sql

# 마이그레이션 상태 재확인
make migrate-status
```

#### 2. 수동 데이터베이스 수정
```bash
# 직접 데이터베이스 접속
docker exec -it safework-mysql mysql -u safework -p safework_db

# 마이그레이션 기록 확인
SELECT * FROM migrations ORDER BY executed_at DESC;

# 수동 레코드 수정 (주의!)
DELETE FROM migrations WHERE version = '003';
```

## 📈 모니터링 및 로깅

### 1. 로그 확인
```bash
# 애플리케이션 로그
docker logs safework-app

# 마이그레이션 로그 (앱 시작 시)
docker logs safework-app | grep "🗂️"
```

### 2. 성능 모니터링
- 마이그레이션 실행 시간 추적
- 대용량 데이터 변경 시 진행률 표시
- 시스템 리소스 사용량 모니터링

### 3. 알림 설정
- 마이그레이션 실패 시 관리자 알림
- 장시간 실행 시 진행 상황 알림
- 백업 생성 완료 알림

## 🔧 고급 사용법

### 1. 조건부 마이그레이션
```python
def upgrade():
    # 테이블 존재 여부 확인
    result = db.engine.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='new_table';
    """).fetchone()
    
    if not result:
        db.engine.execute("""
            CREATE TABLE new_table (
                id INTEGER PRIMARY KEY,
                name VARCHAR(100)
            );
        """)
        print("✅ new_table created")
    else:
        print("ℹ️ new_table already exists, skipping")
```

### 2. 데이터 변환 마이그레이션
```python
def upgrade():
    # 기존 데이터를 새 형식으로 변환
    rows = db.engine.execute("SELECT id, old_field FROM users").fetchall()
    
    for row in rows:
        new_value = transform_data(row.old_field)
        db.engine.execute(
            "UPDATE users SET new_field = ? WHERE id = ?",
            (new_value, row.id)
        )
    
    print(f"✅ Transformed {len(rows)} records")
```

### 3. 배치 처리
```python
def upgrade():
    batch_size = 1000
    offset = 0
    
    while True:
        rows = db.engine.execute("""
            SELECT id FROM large_table 
            LIMIT ? OFFSET ?
        """, (batch_size, offset)).fetchall()
        
        if not rows:
            break
        
        # 배치 처리 로직
        for row in rows:
            # 데이터 처리
            pass
        
        offset += batch_size
        print(f"Processed {offset} records")
    
    print("✅ Batch processing complete")
```

## 📚 참고 자료

### 관련 파일
- `/app/migration_manager.py` - 마이그레이션 관리 클래스
- `/app/migrate.py` - CLI 인터페이스
- `/migrate.sh` - 간편 스크립트
- `/app/routes/migration.py` - 웹 인터페이스
- `/Makefile` - Make 명령어 정의

### 외부 링크
- [Flask-Migrate 문서](https://flask-migrate.readthedocs.io/)
- [SQLAlchemy 문서](https://docs.sqlalchemy.org/)
- [데이터베이스 마이그레이션 베스트 프랙티스](https://www.prisma.io/dataguide/types/relational/what-are-database-migrations)

---

> 💡 **팁**: 마이그레이션 시스템을 통해 데이터베이스 변경을 체계적으로 관리하여 개발팀 간의 협업을 원활하게 하고 프로덕션 환경의 안정성을 보장할 수 있습니다.