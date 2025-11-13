# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeWork is a comprehensive occupational safety and health management system designed for the Korean construction/industrial environment. It runs on a **100% Cloudflare Native Serverless** architecture with Workers, D1, KV, R2, and AI services.

**Production URLs:**
- Custom Domain: https://safework.jclee.me (primary)
- Workers.dev: https://safework.jclee.workers.dev (Cloudflare default domain, same deployment)

**Quick Commands** (run from `workers/` directory):
```bash
npm run dev              # Local development server (localhost:8787)
npm test                 # Run all tests (191 tests)
npm run test:unit        # Unit tests only (excludes post-deployment)
npm run type-check       # TypeScript type checking (0 errors)
npm run lint             # ESLint (0 warnings, 0 errors)
npm run deploy:prod      # Deploy to production
```

**Key Architecture Decision**: This project has fully migrated from Flask (PostgreSQL) to Cloudflare Workers (D1). The `app/` directory contains legacy code that is **no longer active**. All development work happens in `workers/`.

## Architecture

### Cloudflare Workers Edge Computing
- **Framework**: Hono.js (TypeScript) - lightweight, fast, edge-first web framework
- **Entry Point**: `workers/src/index.ts` (main router with middleware stack)
- **60+ API endpoints** serving survey forms, admin dashboards, and native services
- **Global Distribution**: 300+ edge locations (~50ms response time)

### Data Layer - Cloudflare Native Stack
- **D1 Database**: `PRIMARY_DB` binding → `safework-primary` (Serverless SQLite at the edge)
  - Schema: `workers/d1-schema.sql` (single source of truth)
  - No migrations - schema is applied directly via wrangler CLI
- **KV Namespaces** (3 separate namespaces for different concerns):
  - `SAFEWORK_KV`: Unified storage for sessions, forms, cache
  - `CACHE_LAYER`: Analytics and temporary data (300s TTL typically)
  - `AUTH_STORE`: Authentication tokens and rate limiting state
- **R2 Storage**: `SAFEWORK_STORAGE` → `safework-storage-prod` (unlimited file uploads)
- **Workers AI**: `AI` binding → `@cf/meta/llama-3-8b-instruct` for survey validation

### Middleware Stack (Order Matters)
Applied in `workers/src/index.ts`:
1. **Analytics**: Cloudflare Analytics (disabled on free plan, code commented out)
2. **Logger**: Hono's built-in request/response logging
3. **Security Headers**: CSP, HSTS, X-Frame-Options via `securityHeaders` middleware
   - Note: jQuery and CDNJS are allowed in CSP (needed for Bootstrap templates)
4. **CORS**: Applied to `/api/*` routes only (allows localhost:3000 + production domain)
5. **Rate Limiting**: Different presets per endpoint type
   - `LOGIN`: 5 requests/15min, 15min block on violation
   - `SURVEY_SUBMISSION`: 10 requests/15min
   - `ADMIN_OPERATIONS`: 30 requests/15min
6. **JWT Authentication**: Applied to `/api/workers/*` routes (optional feature)

### Route Organization
Routes are organized by feature in `workers/src/routes/`:
- **Survey APIs**: `survey-d1.ts` - D1-based CRUD operations for all 6 form types
- **Forms**: `form-001.ts` - Main survey form handler (consolidates all 6 form types)
  - Form structures: `workers/src/config/form-001-structure.ts`
  - Form templates: `workers/src/templates/001-dv06-restore.ts`, `work-system.ts`
- **Health Examination**: `health-exam.ts` - **NEW** Forms 007-008 (건강진단 관리) [2025-11-13]
  - Health exam target registration (Form 007)
  - Health exam results management (Form 008)
  - Based on 산업안전보건법 Article 129-132
- **Work Environment Measurement**: `work-environment.ts` - **NEW** Forms 009-010 (작업환경측정) [2025-11-14]
  - Hazard factors management (31 pre-defined factors)
  - Measurement plan registration (Form 009)
  - Measurement results tracking (Form 010)
  - Compliance monitoring and statistics
  - Based on 산업안전보건법 Article 125
- **Safety Education Management**: `safety-education.ts` - **NEW** Forms 011-012 (안전보건교육) [2025-11-14]
  - Education courses master data (11 pre-defined courses)
  - Education plan management (Form 011)
  - Session execution tracking (Form 012)
  - Attendance and certificate management
  - Based on 산업안전보건법 Article 29-31
- **Analysis**: `analysis.ts` - Survey data analysis and reporting
- **Admin**: `admin-unified.ts` - Unified dashboard with analytics
- **Native Services**: `native-api.ts` (R2, AI, Queue integrations)
- **Authentication**: `auth.ts` (login, registration, token refresh, JWT-based auth)
- **Utilities**: `health.ts`, `excel-processor.ts`, `warning-sign.ts`, `metrics.ts`, `worker.ts`

## Development Commands

### Workers Development (Primary Environment)

All development commands must be run from the `workers/` directory:

```bash
cd workers/

# Development server (localhost:8787)
npm run dev

# Type checking (run before committing)
npm run type-check

# Linting (ESLint 9 with flat config)
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues

# Testing
npm test              # Run all tests once
npm run test:unit     # Run only unit tests (excludes post-deployment)
npm run test:post-deploy  # Run post-deployment integration tests
npm run test:watch    # Watch mode for TDD

# Build (TypeScript compilation)
npm run build
```

**Note**: ESLint 9 uses flat config (`eslint.config.js` in ES module format). The project uses `"type": "module"` in `package.json` for ESLint 9 compatibility.

### Database Management (D1)

**Important**: D1 is a serverless SQLite database. Unlike PostgreSQL, there are no migrations - you apply the entire schema file.

```bash
# Apply schema to local D1 (for development)
wrangler d1 execute PRIMARY_DB --file=d1-schema.sql --local

# Apply schema to production D1 (CAUTION: destructive if tables exist)
wrangler d1 execute PRIMARY_DB --file=d1-schema.sql --remote --env=production

# Query local database
wrangler d1 execute PRIMARY_DB --command="SELECT COUNT(*) FROM surveys" --local

# Query production database
wrangler d1 execute PRIMARY_DB --command="SELECT COUNT(*) FROM surveys" --remote --env=production

# Important: Always test schema changes locally before applying to production
```

### Deployment

**Automatic Deployment (Recommended)**:
```bash
# Any push to master with workers/** changes triggers GitHub Actions
git add workers/
git commit -m "feat: Update worker functionality"
git push origin master
# → Gemini AI code review on PR → Auto-deploy on merge to master
```

**Manual Deployment**:
```bash
cd workers/
npm run deploy:prod      # Deploy to production
npm run deploy:dev       # Deploy to development (if configured)

# Alternative: Direct wrangler command
npx wrangler deploy --env production
```

### Monitoring & Debugging

```bash
# Stream real-time logs from production workers
wrangler tail --env production

# Check deployment status
wrangler deployments list --env production

# Health checks
curl https://safework.jclee.me/api/health
curl https://safework.jclee.me/api/native/native/health

# KV data inspection (for debugging)
wrangler kv:key list --binding=SAFEWORK_KV --env=production
wrangler kv:key get <key_name> --binding=SAFEWORK_KV --env=production

# R2 file listing
wrangler r2 object list safework-storage-prod
```

## Key Technical Details

### D1 Database Schema
Located in `workers/d1-schema.sql`. Core tables:
- `users`: Authentication and user management
- `companies`, `processes`, `roles`: Master data for surveys (pre-populated)
- `surveys`: Main survey responses table
  - Stores JSON data in `responses`, `data`, `symptoms_data` TEXT columns
  - Uses `form_type` to distinguish between different survey forms (001-006)
- `survey_statistics`: Aggregated statistics (daily rollups)
- **Health Examination Tables** (NEW - 2025-11-13):
  - `health_exam_categories`: Exam types (일반/특수/배치전/수시건강진단)
  - `health_exam_targets`: Target employees for health exams (Form 007)
  - `health_exam_results`: Detailed health exam results (Form 008)
- **Work Environment Measurement Tables** (NEW - 2025-11-14):
  - `hazard_factors`: Master data for 31 hazard types (chemical/physical/dust/heavy metals)
  - `work_environment_measurement_plans`: Measurement planning and scheduling (Form 009)
  - `work_environment_measurements`: Measurement results with compliance tracking (Form 010)
- **Safety Education Management Tables** (NEW - 2025-11-14):
  - `safety_education_courses`: Master data for 11 pre-defined courses (regular/new_hire/task_change/special/manager)
  - `safety_education_plans`: Education planning and scheduling (Form 011)
  - `safety_education_sessions`: Session execution records (Form 012)
  - `safety_education_attendance`: Attendance tracking and certificate issuance (Form 012 detail)
- `audit_logs`: Action tracking

**D1 Quirks**:
- SQLite syntax (not PostgreSQL): `AUTOINCREMENT` not `SERIAL`, `TEXT` not `VARCHAR`
- No `RETURNING` clause support - use `last_insert_rowid()` function
- Booleans stored as `INTEGER` (0/1), not native `BOOLEAN` type
- Foreign keys must be explicitly enabled: `PRAGMA foreign_keys = ON;`

### Authentication System
The authentication system uses JWT tokens with PBKDF2 password hashing:

**Endpoints**:
- `POST /api/auth/login`: User/admin login (returns JWT token)
- `POST /api/auth/register`: New user registration with validation
- `POST /api/auth/refresh`: Token refresh (7-day grace period for expired tokens)
- `GET /api/auth/verify`: Verify token validity
- `POST /api/auth/logout`: Client-side logout
- `GET /auth/login`: Login UI page
- `GET /auth/register`: Registration UI page

**Security Features**:
- PBKDF2 password hashing (600,000 iterations)
- Password strength validation (8+ chars, uppercase, lowercase, number, special char)
- Username format validation (3-30 chars, alphanumeric + underscore/hyphen)
- Email uniqueness checks
- JWT tokens with 24-hour expiry
- Token refresh with 7-day grace period
- Rate limiting on all auth endpoints

**User ID Extraction**:
Survey submissions and other authenticated operations use `getUserIdFromAuth()` helper function (in `survey-d1.ts`) to extract user_id from JWT tokens. Falls back to anonymous user (id=1) if no valid token.

**Password Utilities** (`workers/src/utils/password.ts`):
- `hashPassword(password)`: PBKDF2 hashing with 600,000 iterations
- `verifyPassword(password, hash)`: Constant-time comparison with backward compatibility for SHA-256 hashes
- `validatePasswordStrength(password)`: Returns validation result with specific error messages

### Environment Variables & Secrets
Configured in `workers/wrangler.toml` under `[env.production.vars]`:

**Public vars** (in wrangler.toml):
- `ADMIN_USERNAME`: "admin"
- `BACKEND_URL`: "https://safework.jclee.me"
- `ENVIRONMENT`: "production"
- `DEBUG`: "false"

**Secret vars** (stored via `wrangler secret put`):
- `JWT_SECRET`: JWT signing secret (required for authentication)
- `ADMIN_PASSWORD_HASH`: PBKDF2 hash of admin password

To update secrets:
```bash
wrangler secret put JWT_SECRET --env production
wrangler secret put ADMIN_PASSWORD_HASH --env production
```

### Survey Forms (001-012)
Twelve specialized occupational health survey forms:

**Existing Forms (001-006)**:
1. **001**: Musculoskeletal Symptom Survey (근골격계 증상조사표)
2. **002**: Musculoskeletal Hazard Assessment (근골격계부담작업 유해요인조사)
3. **003**: Musculoskeletal Disease Prevention Program (근골격계질환 예방관리 프로그램)
4. **004**: Industrial Accident Survey (산업재해 실태조사표)
5. **005**: Basic Hazard Factor Survey (유해요인 기본조사표)
6. **006**: Elderly Worker Approval Form (고령근로자 작업투입 승인요청서)

**NEW: Health Examination Management (007-008)** [2025-11-13]:
7. **007**: Health Examination Target Registration (건강진단 대상자 등록)
   - Register employees for health examinations
   - Track exam schedules, due dates, and completion status
   - Support 4 exam types: 일반/특수/배치전/수시건강진단
   - Based on 산업안전보건법 Article 129-132
8. **008**: Health Examination Results (건강진단 결과 입력)
   - Record comprehensive health exam results
   - Physical measurements, blood tests, vision/hearing, X-ray, ECG
   - Doctor's opinion and work fitness assessment
   - Follow-up management

**NEW: Work Environment Measurement (009-010)** [2025-11-14]:
9. **009**: Work Environment Measurement Plan (작업환경측정 계획)
   - Create and manage measurement plans
   - Define target workplaces, processes, and hazard factors
   - Schedule measurements and track completion status
   - Support 3 measurement types: regular/special/complaint
   - Based on 산업안전보건법 Article 125
10. **010**: Work Environment Measurement Results (작업환경측정 결과)
   - Record measurement results for each sampling point
   - Track exposure levels vs legal limits (TWA - Time Weighted Average)
   - Calculate compliance status (compliant/non_compliant/over_action_level)
   - Environmental conditions (temperature, humidity, pressure)
   - Follow-up actions for non-compliant results

**NEW: Safety Education Management (011-012)** [2025-11-14]:
11. **011**: Safety Education Plan (안전보건교육 계획)
   - Create and manage safety education plans
   - Select from 11 pre-defined courses (regular/new_hire/task_change/special/manager)
   - Plan quarterly/annual education sessions
   - Track instructor, location, curriculum, and materials
   - Based on 산업안전보건법 Article 29-31
12. **012**: Safety Education Session & Attendance (안전보건교육 실시 및 출석)
   - Record education session execution details
   - Track employee attendance (present/absent/late/excused)
   - Calculate attendance rate and completion status
   - Issue completion certificates
   - Record participation scores and quiz results

Form structures are defined in `workers/src/config/form-*-structure.ts`.
Form templates (HTML) are in `workers/src/templates/*.ts`.
Health exam APIs are in `workers/src/routes/health-exam.ts`.

### API Design Pattern
All APIs follow RESTful conventions:
- `GET /api/survey/d1/forms`: List available forms
- `POST /api/survey/d1/submit`: Submit survey response (form_type in body)
- `GET /api/survey/d1/responses/:formType`: List responses with pagination
- `GET /api/survey/d1/response/:surveyId`: Get single response
- `DELETE /api/survey/d1/response/:surveyId`: Delete response
- `GET /api/survey/d1/stats`: Overall statistics
- `GET /api/survey/d1/stats/daily`: Daily submission stats

**Response format**:
```typescript
{
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}
```

### Health Examination APIs (NEW - 2025-11-13)
Located in `workers/src/routes/health-exam.ts`:

**Form 007: Health Examination Target Management**:
- `GET /api/health-exam/categories`: Get all exam categories (일반/특수/배치전/수시)
- `POST /api/health-exam/targets`: Create new exam target
- `GET /api/health-exam/targets`: List targets (with filters: employee_id, exam_year, exam_category_id, exam_completed)
- `GET /api/health-exam/targets/:id`: Get single target details
- `PUT /api/health-exam/targets/:id`: Update target (completion, results, follow-up)
- `DELETE /api/health-exam/targets/:id`: Soft delete target (sets exam_completed = -1)
- `GET /api/health-exam/stats`: Get statistics (overall + by category)

**Form 008: Health Examination Results Management**:
- `POST /api/health-exam/results`: Create or update exam results (upsert by target_id)
- `GET /api/health-exam/results/:targetId`: Get results by target ID

**Key Features**:
- Comprehensive health data: Physical measurements, blood tests, vision/hearing, X-ray, ECG
- Follow-up management: Track required follow-ups and completion status
- Work fitness assessment: 적합/일부적합/부적합 classification
- Pagination support for list endpoints (default: 50 items per page)
- Soft delete support (no data loss)

**Legal Compliance**: Based on 산업안전보건법 Article 129-132 (Occupational Safety and Health Act)

### Work Environment Measurement APIs (NEW - 2025-11-14)
Located in `workers/src/routes/work-environment.ts`:

**Hazard Factors Management**:
- `GET /api/work-environment/hazard-factors`: List all hazard factors (31 pre-defined)
  - Query params: `category` (chemical/physical/biological/dust), `active_only`
- `GET /api/work-environment/hazard-factors/:id`: Get single hazard factor details

**Form 009: Measurement Plan Management**:
- `POST /api/work-environment/plans`: Create new measurement plan
- `GET /api/work-environment/plans`: List plans with filters
  - Query params: `plan_year`, `measurement_type`, `plan_status`, `page`, `limit`
- `GET /api/work-environment/plans/:id`: Get plan details
- `PUT /api/work-environment/plans/:id`: Update plan (status, dates, results)
- `DELETE /api/work-environment/plans/:id`: Soft delete plan (sets status to 'cancelled')

**Form 010: Measurement Results Management**:
- `POST /api/work-environment/measurements`: Create measurement result
  - Auto-calculates exposure ratio: (measured_value / exposure_limit) * 100
  - Updates plan statistics automatically
- `GET /api/work-environment/measurements/:planId`: List all measurements for a plan
- `GET /api/work-environment/measurements/detail/:id`: Get single measurement details
- `PUT /api/work-environment/measurements/:id`: Update measurement result
- `DELETE /api/work-environment/measurements/:id`: Delete measurement

**Statistics & Compliance**:
- `GET /api/work-environment/stats`: Overall statistics
  - Query params: `year` (optional)
  - Returns: Plan counts, compliance rates, category-wise breakdown
- `GET /api/work-environment/stats/plan/:planId`: Statistics for specific plan

**Key Features**:
- 31 pre-defined hazard factors (10 chemical, 10 physical, 6 dust, 5 heavy metals)
- CAS numbers for chemical identification
- TWA (Time-Weighted Average) exposure limits
- Automatic exposure ratio calculation
- Compliance status tracking (compliant/non_compliant/over_action_level)
- Environmental conditions recording (temperature, humidity, pressure)
- R2 document storage integration (plan_document_url, report_document_url)
- Auto-update plan statistics on measurement changes

**Legal Compliance**: Based on 산업안전보건법 Article 125 (Work Environment Measurement)

### Safety Education Management APIs (NEW - 2025-11-14)
Located in `workers/src/routes/safety-education.ts`:

**Education Courses Master Data**:
- `GET /api/safety-education/courses`: List all education courses (11 pre-defined)
  - Query params: `category` (regular/new_hire/task_change/special/manager), `active_only`
- `GET /api/safety-education/courses/:id`: Get single course details

**Form 011: Education Plan Management**:
- `POST /api/safety-education/plans`: Create new education plan
  - Required: plan_year, plan_title, course_id, planned_start_date, planned_hours
  - Optional: plan_quarter, target_department, instructor, location, method, etc.
- `GET /api/safety-education/plans`: List plans with filters
  - Query params: `plan_year`, `plan_quarter`, `course_id`, `plan_status`, `page`, `limit`
- `GET /api/safety-education/plans/:id`: Get plan details with sessions
- `PUT /api/safety-education/plans/:id`: Update plan (status, dates, completion info)
- `DELETE /api/safety-education/plans/:id`: Soft delete plan (sets status to 'cancelled')

**Form 012: Education Session Management**:
- `POST /api/safety-education/sessions`: Create education session
  - Required: plan_id, session_number, session_date, actual_duration_hours, instructor_name
  - Auto-updates plan statistics
- `GET /api/safety-education/sessions/:planId`: List all sessions for a plan
- `GET /api/safety-education/sessions/detail/:id`: Get session details with attendance records
- `PUT /api/safety-education/sessions/:id`: Update session details
- `DELETE /api/safety-education/sessions/:id`: Delete session (cascades to attendance)

**Form 012 Detail: Attendance Management**:
- `POST /api/safety-education/attendance`: Record employee attendance
  - Required: session_id, employee_id, attendance_status
  - Auto-updates session and plan statistics
- `GET /api/safety-education/attendance/:sessionId`: List attendance for session
- `PUT /api/safety-education/attendance/:id`: Update attendance record
  - Supports: participation_score, quiz_score, certificate_issued, completion_status
- `DELETE /api/safety-education/attendance/:id`: Delete attendance record

**Statistics & Reporting**:
- `GET /api/safety-education/stats`: Overall statistics
  - Query params: `year`, `quarter` (optional)
  - Returns: Plan counts by status, category-wise breakdown, attendance rates
- `GET /api/safety-education/stats/plan/:planId`: Detailed statistics for specific plan
  - Returns: Session stats, attendance stats, completion rates, evaluation scores

**Key Features**:
- 11 pre-defined safety education courses (3 regular, 2 new hire, 2 task change, 2 special, 2 manager)
- Required hours compliance (3h office workers, 6h production, 16h supervisors, etc.)
- Quarterly/annual education frequency tracking
- Automatic attendance rate calculation
- Completion status and certificate issuance
- Participation scores and quiz results
- Session evaluation and feedback
- R2 document storage integration (plan_document_url, session_document_url)
- Auto-update plan and session statistics on attendance changes

**Legal Compliance**: Based on 산업안전보건법 Article 29-31 (Safety and Health Education)

### Native Service APIs
Located in `workers/src/routes/native-api.ts`:
- **R2 File Management**: Upload, download, list, delete files
- **Workers AI**: Survey validation and insights using Llama 3
- **Queue Jobs**: Background tasks (requires Paid Plan - unavailable on Free)
- **Health Check**: All-in-one service status endpoint (`/api/native/native/health`)

**Important**: Queue status showing "unavailable" on Free Plan is expected and does not affect `success: true` in health checks.

## Testing and Validation

### Running Tests
```bash
cd workers/
npm test              # Run all tests (191 tests total)
npm run test:unit     # Run only unit tests (157 tests, excludes post-deployment)
npm run test:post-deploy  # Run post-deployment integration tests
npm run test:watch    # Watch mode for TDD

# Run specific test file
npm test -- survey-validation.test.ts
```

Tests use Vitest (Vite-native test framework, faster than Jest for edge workers).

**Test Files** (5 test suites):
- `worker.test.ts` - Basic worker functionality (7 tests)
- `ui-automation.test.ts` - UI automation tests (19 tests)
- `middleware-unit.test.ts` - Middleware functions (40 tests)
- `auth.test.ts` - Authentication system (36 tests, 34 skipped by default)
- `survey-validation.test.ts` - Survey validation & password hashing (89 tests)
- `post-deployment.test.ts` - Integration tests (20+ tests)

**Current Test Status** (as of 2025-11-13):
- Total Tests: 191 tests (all passing ✅)
- Unit Tests: 157/157 passing ✅ (includes 24 survey submission validation tests)
- Post-Deployment Tests: Integration tests for production endpoints
- Test Coverage: 2.3% (target: 80%)

**Note**: Some auth tests are skipped by default to avoid triggering rate limits during development. Run full test suite in CI/CD only.

### Manual Testing Endpoints
```bash
# Health checks
curl https://safework.jclee.me/api/health
curl https://safework.jclee.me/api/native/native/health

# Submit a test survey (001 form)
curl -X POST https://safework.jclee.me/api/survey/d1/submit \
  -H "Content-Type: application/json" \
  -d '{
    "form_type": "001_musculoskeletal_symptom_survey",
    "name": "Test User",
    "company_id": 1,
    "process_id": 1,
    "role_id": 1,
    "responses": {}
  }'

# Get survey statistics
curl https://safework.jclee.me/api/survey/d1/stats

# Authentication endpoints
# Login
curl -X POST https://safework.jclee.me/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "safework2024"}'

# Register new user
curl -X POST https://safework.jclee.me/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test123!@#",
    "email": "test@example.com",
    "full_name": "Test User"
  }'

# Refresh token
curl -X POST https://safework.jclee.me/api/auth/refresh \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Verify token
curl -X GET https://safework.jclee.me/api/auth/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Common Development Workflows

### Adding a New Survey Form (Form 007 Example)

**Note**: The current architecture consolidates form handling. To add a new form:

1. **Create form structure**: `workers/src/config/form-007-structure.ts`
   ```typescript
   export const form007Structure = {
     title: "Form 007 Title",
     sections: [
       {
         id: "section_1",
         title: "Section 1",
         questions: [
           { id: "q1", type: "text", label: "Question 1" }
         ]
       }
     ]
   };
   ```

2. **Create template**: `workers/src/templates/007.ts`
   - Use existing templates (`001-dv06-restore.ts`, `work-system.ts`) as reference
   - Bootstrap 5 for styling
   - Include client-side validation before submission

3. **Update survey-d1.ts**: Add form type to validation logic
   ```typescript
   // In survey-d1.ts, add to form type validation
   const validFormTypes = [
     '001_musculoskeletal_symptom_survey',
     // ... existing types ...
     '007_new_form_type'  // Add new form type
   ];
   ```

4. **Update D1 schema** (if needed): Modify `workers/d1-schema.sql`
   - Add new columns or tables if form requires special data structure
   - Apply schema: `wrangler d1 execute PRIMARY_DB --file=d1-schema.sql --local`

5. **Update main router**: Add route in `workers/src/index.ts`
   ```typescript
   // Add form route to serve the template
   app.get('/survey/007_new_form_type', async (c) => {
     return c.html(form007Template());
   });
   ```

6. **Update homepage**: Add form card in `workers/src/index.ts` homepage HTML
   - Look for the "작성 가능한 양식" section
   - Add a new card with appropriate styling (use unique color)

7. **Test locally**: `cd workers && npm run dev` then visit `/survey/007_new_form_type`
8. **Type check**: `npm run type-check`
9. **Deploy**: `git push origin master`

### Adding a New API Endpoint

1. **Choose appropriate route file** (e.g., `survey-d1.ts` for survey-related endpoints)

2. **Add handler function** using Hono context
   ```typescript
   app.get('/api/survey/d1/new-endpoint', async (c) => {
     const db = c.env.PRIMARY_DB;

     try {
       const result = await db.prepare("SELECT * FROM surveys WHERE status = ?")
         .bind('submitted')
         .all();

       return c.json({
         success: true,
         data: result.results
       });
     } catch (error) {
       return c.json({
         success: false,
         error: error.message
       }, 500);
     }
   });
   ```

3. **Update API documentation**: `docs/API_ENDPOINTS.md`
4. **Test locally**: `npm run dev`
5. **Type check**: `npm run type-check`
6. **Deploy**: `git push origin master`

### Modifying D1 Schema

**Warning**: D1 schema changes are destructive. Always test locally first.

1. **Update schema file**: `workers/d1-schema.sql`
   - Add new tables or columns
   - Remember: Use SQLite syntax (INTEGER, TEXT, REAL, BLOB)

2. **Apply to local D1**:
   ```bash
   cd workers/
   wrangler d1 execute PRIMARY_DB --file=d1-schema.sql --local
   ```

3. **Test with local dev server**: `npm run dev`
   - Verify queries work with new schema
   - Check that existing functionality isn't broken

4. **Apply to production** (only after thorough local testing):
   ```bash
   wrangler d1 execute PRIMARY_DB --file=d1-schema.sql --remote --env=production
   ```

5. **Update TypeScript models** (if needed): `workers/src/db/models.ts`
   - Add interfaces for new tables/columns
   - Update type definitions

### Troubleshooting Deployment Failures

1. **Check GitHub Actions logs**: https://github.com/qws941/safework/actions
   - Look for the "🚀 Deploy to Production" job
   - Common failures: TypeScript errors, wrangler config issues

2. **Verify wrangler.toml**: Ensure bindings are correct
   - D1 database ID matches
   - KV namespace IDs are correct
   - R2 bucket name is correct

3. **Check TypeScript errors**: `cd workers && npm run type-check`
   - Fix all type errors before deploying
   - Use `// @ts-ignore` sparingly (indicates a design issue)

4. **Verify environment secrets**:
   ```bash
   wrangler secret list --env production
   ```
   - Ensure JWT_SECRET and ADMIN_PASSWORD_HASH are set

5. **Manual deploy attempt**:
   ```bash
   cd workers/
   npx wrangler deploy --env production
   ```
   - Provides more detailed error messages than GitHub Actions

6. **Check health endpoint after deployment**:
   ```bash
   curl https://safework.jclee.me/api/health
   ```
   - Should return `{"status": "ok"}`

## Important Notes

- **No legacy Flask code**: The `app/` directory contains legacy Flask code that is **no longer used**. All active development is in `workers/`. Ignore `app/` for all feature work.

- **D1 is primary database**: Legacy KV-based survey APIs (`/api/survey/*` without `/d1/`) are deprecated. Always use D1-based endpoints (`/api/survey/d1/*`) for new features.

- **Authentication is fully implemented**: The system now has complete user registration, login, token refresh, and UI pages. All survey submissions properly track authenticated users via JWT tokens. No hardcoded user IDs remain in the codebase.

- **Queue unavailable on Free Plan**: Background job APIs will return "unavailable" status. This is expected and normal. The health check endpoint still returns `success: true`.

- **Deployment auto-triggers**: Any push to `master` branch with `workers/**` changes triggers GitHub Actions workflow:
  1. AI code review (on PR)
  2. Build & test
  3. Deploy to production
  4. AI-generated release notes

- **Health check status**: The `/api/native/native/health` endpoint shows Queue as "unavailable" on Free Plan - this is normal and doesn't affect `success: true` status.

- **Rate limiting storage**: Rate limiting uses `AUTH_STORE` KV namespace for distributed state. IP addresses are identified via `CF-Connecting-IP` header (Cloudflare-specific).

- **Security headers**: CSP includes `https://code.jquery.com` and `https://cdnjs.cloudflare.com` due to Bootstrap template dependencies. Don't remove these without updating all HTML templates.

- **ESLint 9 migration**: Project uses ESLint 9 flat config format (`eslint.config.js`). Package.json includes `"type": "module"` for compatibility. All interface parameters are allowed to be unused (configured via `args: 'none'` rule).

- **Recent cleanup (2025-10-13)**: Root directory reduced from 60+ files to 22 files. Completed documentation archived to `docs/archive/`, deployment scripts moved to `scripts/deployment/`, operational guides in `docs/operations/`. Dependencies updated to latest versions (ESLint 9, TypeScript ESLint 8, TypeScript 5.9.3, Wrangler 4.42.2).

## Recent Bug Fixes & Improvements

### 2025-11-12: Form Submission Fix
- **Issue**: Survey form 001 submissions were failing due to missing `form_type` field
- **Fix**: Added `jsonData.form_type = '001_musculoskeletal_symptom_survey'` in form submission handler
  - Location: `workers/src/templates/001-dv06-restore.ts:1928`
  - Commit: `afd5318` - fix: Add missing form_type field to survey submission
- **Testing**: Added 24 comprehensive validation tests for survey submission
  - Test file: `workers/tests/survey-validation.test.ts`
  - Coverage: Required fields, form type validation, data types, response structure
  - Commit: `f78b3df` - test: Add 24 survey submission validation unit tests
- **Status**: ✅ All 157 tests passing, deployed to production

**URL Pattern Clarification**:
- ✅ **Correct**: Survey form accessed via `/survey/001_musculoskeletal_symptom_survey`
- ❌ **Incorrect**: `/api/form/001` (404 - route does not exist)
- ℹ️  **Note**: `/api/form/001/*` routes are for structure/validation APIs only, not the form UI

### 2025-11-13: Comprehensive TypeScript Refactoring ⭐
- **Achievement**: Complete elimination of ESLint warnings and TypeScript errors
- **Phases Completed**: 7 comprehensive refactoring phases
  - Phase 1: Error handling (3 warnings fixed)
  - Phase 2: Analysis routes (13 warnings fixed)
  - Phase 3: Form routes (5 warnings fixed)
  - Phase 4: Service files (13 warnings fixed)
  - Phase 5: Route cleanup (2 warnings fixed)
  - Phase 6: Utility files (2 warnings fixed)
  - Phase 7: Admin & templates (13 warnings fixed)
- **Results**:
  - ESLint warnings: 56 → 0 (100% resolved) ✅
  - TypeScript errors: 9 → 0 (100% resolved) ✅
  - Type safety: All `any` types replaced with concrete types (51 instances)
  - Tests: All 191 tests passing ✅
- **Key Improvements**:
  - Comprehensive interface definitions for survey data, Workers AI responses, Slack API blocks
  - Type-safe D1 database operations with proper result typing
  - Cloudflare-specific type definitions (Request extensions, environment bindings)
  - NIOSH analysis and statistics template type safety
- **Documentation**: See `workers/REFACTORING_SUMMARY.md` for detailed breakdown

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/cloudflare-workers-deployment.yml`) includes:

1. **AI Code Review** (on PR): Gemini 1.5 Flash reviews code changes and posts comments
2. **Build & Test**: TypeScript compilation, linting, type checking, Vitest tests
3. **Deploy to Production**: Automatic deployment on push to master
4. **Health Check Verification**: Ensures `/api/health` returns 200
5. **Post-Deployment Tests**: Runs integration tests against live production

**Environment secrets required**:
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token (Account-level, Edit Cloudflare Workers permission)
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID
- `GEMINI_API_KEY`: Google Gemini API key (optional, for AI code review only)
- `SLACK_WEBHOOK_URL`: Slack webhook for deployment notifications (optional)

## Documentation Resources

- **API Reference**: `docs/API_ENDPOINTS.md` (complete list of 60+ endpoints)
- **Deployment Guide**: `docs/CLOUDFLARE_DEPLOYMENT.md` (CI/CD pipeline details)
- **D1 Migration**: `docs/architecture/D1-MIGRATION-COMPLETE.md` (PostgreSQL → D1 transition)
- **Project Structure**: `docs/PROJECT_STRUCTURE.md` (detailed architecture)
- **README**: `README.md` (quick start and overview)
- **Cleanup Report**: `CLEANUP_COMPLETE_REPORT.md` (2025-10-13 modernization details)
- **Codebase Analysis**: `CODEBASE_ANALYSIS_REPORT.md` (comprehensive analysis, grade: B+)
- **Operations Guides**: `docs/operations/` (integration config, resource ID updates, token guides)
- **Archived Documentation**: `docs/archive/2025-10-13/` (completed tasks and legacy docs)

## TypeScript Types Reference

Key type definitions to be aware of:

```typescript
// workers/src/index.ts
export interface Env {
  // KV Namespaces
  SAFEWORK_KV: KVNamespace;
  CACHE_LAYER: KVNamespace;
  AUTH_STORE: KVNamespace;

  // D1 Database
  PRIMARY_DB: D1Database;

  // R2 Storage
  SAFEWORK_STORAGE: R2Bucket;

  // Workers AI
  AI: Ai;

  // Queue (optional)
  SAFEWORK_QUEUE?: Queue<any>;

  // Environment Variables
  JWT_SECRET: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD_HASH: string;
  BACKEND_URL: string;
  DEBUG: string;
  ENVIRONMENT: string;
}
```

All route handlers should use `Context<{ Bindings: Env }>` from Hono.

## Code Quality Standards

### Linting Rules (ESLint 9)
- **Unused variables**: Prefix with `_` if intentionally unused (e.g., `_error`, `_result`)
- **Catch blocks**: Use anonymous `catch` if error not used: `} catch { ... }`
- **Interface parameters**: Allowed to be unused (configured with `args: 'none'`)
- **Explicit any**: All replaced with concrete types (refactoring completed 2025-11-13)
- **Current status**: 0 errors ✅, 0 warnings ✅ (100% clean code)

### TypeScript Configuration
- **Compiler**: TypeScript 5.9.3
- **Target**: ES2022
- **Strict mode**: Partially enabled (strictNullChecks disabled for legacy compatibility)
- **Type checking**: Run `npm run type-check` before committing

### Testing Standards
- **Framework**: Vitest
- **Target coverage**: 30-50% minimum, 80% ideal (current: 2.3%)
- **Test organization**:
  - Unit tests: `tests/*.test.ts` (excludes post-deployment)
  - Integration tests: `tests/post-deployment.test.ts`
- **Run tests before commit**: `npm test` or `npm run test:unit`

### Development Dependencies (Latest as of 2025-10-13)
```json
{
  "eslint": "^9.37.0",
  "@typescript-eslint/parser": "^8.46.0",
  "@typescript-eslint/eslint-plugin": "^8.46.0",
  "typescript": "^5.9.3",
  "@cloudflare/workers-types": "^4.20251011.0",
  "wrangler": "^4.42.2",
  "vitest": "^3.2.4"
}
```

### Production Dependencies
```json
{
  "hono": "^4.9.11",
  "bcryptjs": "^3.0.2"
}
```

**Security**: Zero vulnerabilities ✅ (verified with `npm audit`)
## Infrastructure Integration

### Observability Stack (Synology NAS)

All projects integrate with centralized monitoring on grafana.jclee.me:

```yaml
grafana: https://grafana.jclee.me
  dashboards: Project-specific dashboards for metrics visualization
  loki: Centralized logging (all docker logs → promtail → Loki)
  prometheus: Metrics collection and alerting

n8n: https://n8n.jclee.me
  workflows: Automated CI/CD, notifications, integrations
  webhooks: Event-driven automation triggers

slack: Team notifications
  channels: #alerts, #deployments, #monitoring
  integration: Via n8n workflows and direct API
```

**Health Checks**:
```bash
# Verify infrastructure connectivity
curl -sf https://grafana.jclee.me/api/health
curl -sf https://n8n.jclee.me/healthz
```

### Common Libraries (v1.0.0)

Centralized bash libraries eliminate code duplication:

```bash
# Load common libraries in scripts
source "${HOME}/.claude/lib/bash/colors.sh"    # Color definitions, output functions
source "${HOME}/.claude/lib/bash/logging.sh"   # Loki logging functions
source "${HOME}/.claude/lib/bash/ids.sh"       # Task ID generation
source "${HOME}/.claude/lib/bash/api-clients.sh" # Grafana, n8n, Slack APIs
source "${HOME}/.claude/lib/bash/errors.sh"    # Error handling, retries

# Example usage
TASK_ID=$(generate_task_id "deploy")
log_info "Starting deployment: $TASK_ID"
log_to_loki "my-project" "Deployment started" "INFO"
```

**Key Functions**:
- `log_to_loki(job, message, level)` - Send logs to Grafana Loki
- `generate_task_id(prefix)` - Create UUID-based task IDs
- `grafana_query(endpoint, method, data)` - Query Grafana API
- `n8n_webhook(webhook_id, data)` - Trigger n8n workflows
- `slack_message(channel, text)` - Send Slack notifications
- `retry_with_backoff(attempts, delay, max_delay, cmd)` - Retry with exponential backoff
- `require_command(cmd, package)` - Check dependencies
- `require_env(var)` - Validate environment variables

**Documentation**: `~/.claude/lib/README.md`

### Deployment Standards

All projects follow Constitutional Framework v11.11:

```yaml
mandatory_structure:
  - /resume/ (architecture, api, deployment, troubleshooting)
  - /demo/ (screenshots/, videos/, examples/)
  - docker-compose.yml (with health checks and Traefik labels)
  - .env.example (template for required env vars)

observability_requirements:
  - Metrics endpoint: /{service}/metrics (Prometheus format)
  - Health endpoint: /{service}/health (JSON response)
  - Docker logs: Automatically sent to Loki via promtail

prohibited:
  - Local Grafana/Prometheus/Loki instances (ports 3000/9090/3100)
  - Backup files (*.backup, *.bak, *.old) - Use git only
  - Root directory clutter - Use structured subdirectories
```

### Testing Requirements

```bash
# Pre-deployment checklist
npm test                    # All unit tests must pass
npm run test:coverage       # Coverage ≥ 80%
npm run lint                # No linting errors
docker-compose up -d        # Deploy
sleep 5
curl http://localhost:PORT/health  # Verify health endpoint

# Grafana verification (mandatory)
# 1. Check service is UP in Prometheus
# 2. Verify error_rate == 0
# 3. Confirm logs flowing to Loki
```

### Environment Variables

Required environment variables for infrastructure integration:

```bash
# Grafana/Loki/Prometheus
LOKI_URL=https://grafana.jclee.me
GRAFANA_URL=https://grafana.jclee.me
PROMETHEUS_URL=https://prometheus.jclee.me

# n8n
N8N_URL=https://n8n.jclee.me
N8N_API_KEY=<from ~/.env>

# Slack
SLACK_BOT_TOKEN=<from ~/.env>
SLACK_WEBHOOK_URL=<from ~/.env>

# Service-specific
SERVICE_NAME=<project-name>
LOG_LEVEL=info
TZ=Asia/Seoul
```
