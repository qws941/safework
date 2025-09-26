# SafeWork URL Endpoints Documentation

## Survey Routes (`/survey`)

### Main Survey Forms
- `/survey/` - Survey list index page
- `/survey/001_musculoskeletal_symptom_survey` - 근골격계 증상조사표 (Form 001)
- `/survey/002_musculoskeletal_symptom_program` - 근골격계부담작업 유해요인조사 (Form 002)
- `/survey/003_musculoskeletal_program` - 근골격계질환 예방관리 프로그램 조사표 (Form 003) - 기본
- `/survey/003_musculoskeletal_program_enhanced` - 근골격계질환 예방관리 프로그램 조사표 - 완전판 (Form 003 Enhanced)

### Survey Management
- `/survey/complete/<id>` - Survey completion page
- `/survey/my_surveys` - User's submitted surveys
- `/survey/view/<id>` - View specific survey
- `/survey/survey_report/<id>` - Survey report

### Survey Shortcuts
- `/survey/001` - Redirect to 001_musculoskeletal_symptom_survey
- `/survey/002` - Redirect to 002_musculoskeletal_symptom_program
- `/survey/new` - New survey form

### Admin Survey Management
- `/survey/admin_dashboard` - Survey admin dashboard
- `/survey/admin_001_musculoskeletal` - Admin view for Form 001 surveys
- `/survey/admin_002_new_employee` - Admin view for Form 002 surveys (deprecated)
- `/survey/admin_survey_detail/<id>` - Survey detail admin view
- `/survey/admin_export` - Export survey data

### API Endpoints
- `/survey/api_submit` - API survey submission
- `/survey/serve_original_survey` - Serve original survey data

## Health & Monitoring Routes

### Health Checks
- `/health` - Main health check endpoint
- `/monitoring/health` - Detailed health monitoring
- `/monitoring/stats` - System statistics

### Simple IP Display
- `/simple-ip` - Display client IP address
- `/api/ip` - API endpoint for IP information

## Admin Routes (`/admin`)

### Main Admin
- `/admin/` - Main admin dashboard
- `/admin/safework` - SafeWork admin hub

### Document Management
- `/admin/documents` - Document admin panel
- `/admin/documents/upload` - Document upload
- `/admin/documents/view/<id>` - View document
- `/admin/documents/download/<id>` - Download document

### Raw Data Management
- `/admin/raw-data` - Raw data admin panel
- `/admin/raw-data/export` - Export raw data

### Reports & Analytics
- `/admin/reports` - Reports dashboard
- `/admin/reports/safework` - SafeWork-specific reports

### Notification System
- `/admin/notifications` - Notification management

## Authentication Routes (`/auth`)

### Standard Auth
- `/auth/login` - User login
- `/auth/logout` - User logout
- `/auth/register` - User registration

### Mobile Auth
- `/mobile-auth/login` - Mobile admin login
- `/mobile-auth/logout` - Mobile admin logout
- `/mobile-auth/admin` - Mobile admin panel

## API Routes

### SafeWork API v1 (`/api/safework`)
- `/api/safework/surveys` - Survey data API
- `/api/safework/reports` - Reports API

### SafeWork API v2 (`/api/safework/v2`)
- Enhanced API endpoints with improved functionality

### General API
- `/api/ip` - IP information API

## Document Routes (`/documents`)
- Document viewing and management endpoints

## Migration Routes (`/migration`)
- Database migration utilities

## PDF Export Routes (`/pdf`)
- PDF generation and export functionality

## Archived/Removed Endpoints

### Removed in Recent Cleanup
- ~~`/survey/002_new_employee_health_checkup_form`~~ - 신규 입사자 건강검진표 (removed)

## Notes

- All survey forms support both anonymous and authenticated submissions
- Admin routes require authentication
- Mobile auth provides simplified admin access for mobile devices
- Health endpoints are publicly accessible for monitoring
- API endpoints may require authentication depending on functionality