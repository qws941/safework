# Error Handling System

SafeWork의 전역 에러 처리 시스템 사용 가이드입니다.

## 📋 목차

1. [커스텀 에러 클래스](#커스텀-에러-클래스)
2. [사용 방법](#사용-방법)
3. [에러 로깅](#에러-로깅)
4. [Best Practices](#best-practices)

---

## 커스텀 에러 클래스

### 사용 가능한 에러 타입

| 에러 클래스 | HTTP 코드 | 사용 시나리오 |
|------------|----------|-------------|
| `ValidationError` | 400 | 클라이언트 입력 검증 실패 |
| `AuthenticationError` | 401 | 인증 필요/실패 |
| `AuthorizationError` | 403 | 권한 부족 |
| `NotFoundError` | 404 | 리소스를 찾을 수 없음 |
| `ConflictError` | 409 | 리소스 충돌 (중복 생성 등) |
| `RateLimitError` | 429 | Rate limit 초과 |
| `DatabaseError` | 500 | 데이터베이스 작업 실패 |
| `ExternalServiceError` | 503 | 외부 서비스 이용 불가 |
| `InternalError` | 500 | 예상치 못한 내부 오류 |

---

## 사용 방법

### 1. 기본 사용법

```typescript
import { Hono } from 'hono';
import { ValidationError, NotFoundError, DatabaseError } from '../errors/custom-errors';
import { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

app.post('/api/survey/submit', async (c) => {
  const body = await c.req.json();

  // ✅ 입력 검증
  if (!body.name || !body.age) {
    throw new ValidationError('Name and age are required', {
      missing: ['name', 'age']
    });
  }

  // ✅ 리소스 확인
  const survey = await db.get(body.surveyId);
  if (!survey) {
    throw new NotFoundError('Survey', body.surveyId);
  }

  // ✅ 데이터베이스 작업
  try {
    await db.insert({ ...body });
    return c.json({ success: true });
  } catch (error) {
    throw new DatabaseError('Failed to save survey', error);
  }
});
```

### 2. 인증 체크

```typescript
import { AuthenticationError, AuthorizationError } from '../errors/custom-errors';

app.get('/api/admin/users', async (c) => {
  // JWT 토큰 확인
  const token = c.req.header('Authorization');
  if (!token) {
    throw new AuthenticationError('Token required');
  }

  // 권한 확인
  const user = await verifyToken(token);
  if (user.role !== 'admin') {
    throw new AuthorizationError('Admin access required');
  }

  // ... 로직 ...
});
```

### 3. 데이터베이스 작업 (Helper 사용)

```typescript
import { withDatabaseErrorHandling } from '../middleware/error-handler';

app.get('/api/survey/:id', async (c) => {
  const id = c.req.param('id');

  const survey = await withDatabaseErrorHandling(
    async () => {
      return await db.prepare('SELECT * FROM surveys WHERE id = ?')
        .bind(id)
        .first();
    },
    'Fetch survey by ID'
  );

  if (!survey) {
    throw new NotFoundError('Survey', id);
  }

  return c.json(survey);
});
```

### 4. 유효성 검사 (Validation Helper)

```typescript
import { validateRequest } from '../middleware/error-handler';

app.post('/api/user/create', async (c) => {
  const body = await c.req.json();

  // ✅ 조건이 false면 ValidationError 자동 throw
  validateRequest(body.username?.length >= 3,
    'Username must be at least 3 characters');

  validateRequest(body.email?.includes('@'),
    'Invalid email format');

  validateRequest(body.age >= 18,
    'Must be 18 or older', { minAge: 18, provided: body.age });

  // 모든 검증 통과 시 계속 진행
  // ...
});
```

### 5. Async Handler Wrapper (선택사항)

```typescript
import { asyncHandler } from '../middleware/error-handler';

// ⚠️ 참고: Hono는 기본적으로 async 에러를 잘 처리하므로
// 이 wrapper는 선택사항입니다
app.get('/api/data', asyncHandler(async (c) => {
  const data = await fetchData();
  return c.json(data);
}));
```

---

## 에러 로깅

### 구조화된 로그 포맷

모든 에러는 자동으로 구조화된 JSON 포맷으로 로깅됩니다:

```json
{
  "level": "error",
  "message": "Survey with identifier '123' not found",
  "error": {
    "name": "NotFoundError",
    "message": "Survey with identifier '123' not found",
    "code": "NOT_FOUND",
    "statusCode": 404,
    "isOperational": true,
    "stack": "NotFoundError: Survey with identifier '123' not found\n    at ..."
  },
  "context": {
    "url": "https://safework.jclee.me/api/survey/123",
    "method": "GET",
    "ip": "203.0.113.45",
    "userAgent": "Mozilla/5.0 ...",
    "requestId": "cf-ray-123abc",
    "timestamp": "2025-10-13T12:34:56.789Z"
  },
  "environment": "production"
}
```

### 수동 로깅

```typescript
import { logError, logWarning, logInfo } from '../utils/error-logger';

// Error 로깅
try {
  await riskyOperation();
} catch (error) {
  logError(error, { userId: 123, action: 'data_export' }, 'production');
}

// Warning 로깅
logWarning('Rate limit approaching', { userId: 456, remaining: 5 });

// Info 로깅
logInfo('User login successful', { userId: 789 });
```

---

## Best Practices

### ✅ DO

1. **적절한 에러 타입 사용**
   ```typescript
   // ✅ Good
   if (!user) throw new NotFoundError('User', userId);

   // ❌ Bad
   if (!user) throw new Error('User not found');
   ```

2. **상세한 에러 정보 제공**
   ```typescript
   // ✅ Good
   throw new ValidationError('Invalid age', {
     provided: body.age,
     expected: 'integer between 0-120'
   });

   // ❌ Bad
   throw new ValidationError('Invalid input');
   ```

3. **데이터베이스 에러 래핑**
   ```typescript
   // ✅ Good
   try {
     await db.query(...);
   } catch (error) {
     throw new DatabaseError('Failed to insert user', error);
   }

   // ❌ Bad
   try {
     await db.query(...);
   } catch (error) {
     throw error; // 에러 타입이 명확하지 않음
   }
   ```

4. **일관된 에러 응답**
   ```typescript
   // ✅ Good - 자동으로 구조화된 응답 생성
   throw new ValidationError('Missing fields');

   // 응답:
   // {
   //   "success": false,
   //   "error": {
   //     "message": "Missing fields",
   //     "code": "VALIDATION_ERROR",
   //     "statusCode": 400
   //   },
   //   "timestamp": "2025-10-13T12:34:56.789Z",
   //   "requestId": "cf-ray-123abc"
   // }
   ```

### ❌ DON'T

1. **Generic Error 사용 금지**
   ```typescript
   // ❌ Bad
   throw new Error('Something went wrong');

   // ✅ Good
   throw new InternalError('Database connection failed', {
     dbHost: 'postgres.internal'
   });
   ```

2. **에러 무시 금지**
   ```typescript
   // ❌ Bad
   try {
     await criticalOperation();
   } catch (error) {
     console.log('Error occurred'); // 에러 무시
   }

   // ✅ Good
   try {
     await criticalOperation();
   } catch (error) {
     throw new DatabaseError('Critical operation failed', error);
   }
   ```

3. **민감한 정보 노출 금지**
   ```typescript
   // ❌ Bad
   throw new ValidationError('Invalid password', {
     providedPassword: body.password, // 민감 정보 노출
     hashedPassword: storedHash
   });

   // ✅ Good
   throw new ValidationError('Invalid password');
   ```

---

## 에러 응답 구조

### API 에러 응답 (JSON)

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "details": {
      "missing": ["name", "age"]
    }
  },
  "timestamp": "2025-10-13T12:34:56.789Z",
  "requestId": "cf-ray-123abc"
}
```

### HTML 페이지 에러 (404)

API가 아닌 일반 페이지 요청의 경우 404 HTML 페이지가 반환됩니다.

---

## 환경별 동작

### Development
- 에러 details 노출 ✅
- Stack trace 포함 ✅
- 상세한 로그 ✅

### Production
- Operational errors: 메시지 노출 ✅
- Non-operational errors: Generic 메시지 ("Internal server error") ⚠️
- Stack trace 숨김 🔒
- 구조화된 로그 (Grafana 연동 준비) 📊

---

## Grafana/Loki 연동 준비

모든 에러 로그는 향후 Grafana/Loki와 통합할 수 있도록 구조화되어 있습니다:

```javascript
// Cloudflare Workers 로그는 자동으로 수집됨
// Grafana Loki Query 예시:
{job="safework", level="error"}
  | json
  | error_statusCode >= 500
  | line_format "{{.error_message}}"
```

---

## 마이그레이션 가이드

### 기존 코드 업데이트

**Before:**
```typescript
app.get('/api/user/:id', async (c) => {
  try {
    const user = await db.get(id);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    return c.json(user);
  } catch (error) {
    return c.json({ error: 'Database error' }, 500);
  }
});
```

**After:**
```typescript
import { NotFoundError, DatabaseError } from '../errors/custom-errors';

app.get('/api/user/:id', async (c) => {
  const id = c.req.param('id');

  const user = await withDatabaseErrorHandling(
    async () => await db.get(id),
    'Fetch user by ID'
  );

  if (!user) {
    throw new NotFoundError('User', id);
  }

  return c.json(user);
  // 에러 발생 시 자동으로 errorHandler가 처리
});
```

---

## 관련 파일

- `src/errors/custom-errors.ts` - 커스텀 에러 클래스 정의
- `src/middleware/error-handler.ts` - 전역 에러 핸들러
- `src/utils/error-logger.ts` - 구조화된 로깅 유틸리티
- `src/index.ts` - 에러 핸들러 등록

---

**작성일**: 2025-10-13
**버전**: 1.0.0
**담당**: SafeWork 개발팀
