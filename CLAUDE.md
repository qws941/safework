# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeWork is a comprehensive occupational safety and health management system designed for the Korean construction/industrial environment. It runs on a **100% Cloudflare Native Serverless** architecture with Workers, D1, KV, R2, and AI services.

**Production URLs:**
- Custom Domain: https://safework.jclee.me (primary)
- Workers.dev: https://safework.jclee.workers.dev (Cloudflare default domain, same deployment)

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
- **Survey APIs**: `survey-d1.ts` (001), `survey-002-d1.ts` (002) - D1-based CRUD operations
- **Forms**: `form-001.ts` through `form-006.ts` - 6 specialized occupational health forms
  - Each form has a corresponding structure file in `workers/src/config/form-*-structure.ts`
- **Admin**: `admin-unified.ts` (new unified dashboard), `admin-002.ts`, `admin.ts` (legacy)
- **Native Services**: `native-api.ts` (R2, AI, Queue integrations)
- **Authentication**: `auth.ts` (login, registration, token refresh, JWT-based auth)
- **Utilities**: `health.ts`, `excel-processor.ts`, `warning-sign.ts`

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

### Survey Forms (001-006)
Six specialized occupational health survey forms:
1. **001**: Musculoskeletal Symptom Survey (근골격계 증상조사표)
2. **002**: Musculoskeletal Hazard Assessment (근골격계부담작업 유해요인조사)
3. **003**: Musculoskeletal Disease Prevention Program (근골격계질환 예방관리 프로그램)
4. **004**: Industrial Accident Survey (산업재해 실태조사표)
5. **005**: Basic Hazard Factor Survey (유해요인 기본조사표)
6. **006**: Elderly Worker Approval Form (고령근로자 작업투입 승인요청서)

Form structures are defined in `workers/src/config/form-*-structure.ts`.
Form templates (HTML) are in `workers/src/templates/*.ts`.

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
- `survey-validation.test.ts` - Survey validation & password hashing (89 tests, +24 new)

**Current Test Status** (as of 2025-11-12):
- Unit Tests: 157/157 passing ✅ (up from 133, +24 survey submission validation tests)
- Post-Deployment Tests: Integration tests for production endpoints
- Test Coverage: Growing coverage with focus on critical paths

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

2. **Create route handler**: `workers/src/routes/form-007.ts`
   ```typescript
   import { Hono } from 'hono';
   import { Env } from '../index';

   const app = new Hono<{ Bindings: Env }>();

   app.get('/', async (c) => {
     // Render form template
   });

   app.post('/submit', async (c) => {
     const db = c.env.PRIMARY_DB;
     // Handle form submission
   });

   export { app as form007Routes };
   ```

3. **Update main router**: Add route in `workers/src/index.ts`
   ```typescript
   import { form007Routes } from './routes/form-007';
   app.route('/api/form/007', form007Routes);
   ```

4. **Add UI template** (optional): Create `workers/src/templates/007.ts`
   - Use existing templates (001.ts, 002.ts) as reference
   - Bootstrap 5 for styling
   - Client-side validation before submission

5. **Update homepage**: Add form card in `workers/src/index.ts` homepage HTML
   - Look for the "작성 가능한 양식" section
   - Add a new card with appropriate styling (use unique color)

6. **Test locally**: `cd workers && npm run dev`
7. **Type check**: `npm run type-check`
8. **Deploy**: `git push origin master`

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
- **Explicit any**: Avoid where possible, but warnings are acceptable (86 current warnings)
- **Current status**: 0 errors ✅, 86 warnings ⚠️ (down from 102)

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
