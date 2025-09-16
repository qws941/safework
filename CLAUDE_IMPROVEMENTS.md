# Suggested Improvements to CLAUDE.md

After analyzing the current CLAUDE.md file and the codebase, here are the key improvements that should be made:

## Issues with Current CLAUDE.md

### 1. **Container Image Naming Inconsistency**
- Current CLAUDE.md refers to `safework/app`, `safework/postgres`, `safework/redis`
- But README.md and scripts refer to `safework2-app`, `safework2-postgres`, `safework2-redis`
- This inconsistency could cause deployment failures

### 2. **Missing Production Scripts Information**
The current file doesn't document the production scripts that are available:
- `/scripts/portainer_simple.sh` - Critical for production monitoring
- `/scripts/production_query_advanced.sh` and `/scripts/simple_production_query.sh` - New production monitoring tools
- `/scripts/portainer_production_logs.sh` - Production log analysis

### 3. **Outdated Database Configuration**
- References mixed PostgreSQL/MySQL usage but current codebase is PostgreSQL-only
- Database connection examples need updating

### 4. **Missing Survey Data Display Issue Context**
Based on the user's message about "https://safework.jclee.me/admin/survey/2 데이터 표현", there's likely a current data display issue that should be documented.

## Key Additions Needed

### 1. **Production Monitoring Scripts Section**
```bash
### Production Monitoring & Log Analysis
# Use production-optimized scripts for live system monitoring
./scripts/simple_production_query.sh           # Quick production status check
./scripts/production_query_advanced.sh         # Detailed production analysis
./scripts/portainer_production_logs.sh         # Production log analysis

# Container management shortcuts
./scripts/portainer_simple.sh status           # Container health overview
./scripts/portainer_simple.sh logs safework-app # View app container logs
./scripts/portainer_simple.sh network          # Network configuration check
```

### 2. **Survey Data Display Debugging Section**
```bash
### Survey Data Display Troubleshooting
# Debug survey detail pages not displaying data properly
# Common issue: Survey responses not saving to JSON field

# Check survey data in database
docker exec -it safework-postgres psql -U safework -d safework_db \
  -c "SELECT id, name, form_type, responses, created_at FROM surveys WHERE id = 2;"

# Verify responses field contains actual JSON data (not empty {})
docker exec -it safework-postgres psql -U safework -d safework_db \
  -c "SELECT jsonb_pretty(responses) FROM surveys WHERE id = 2;"

# Test survey submission with curl to verify data saving
curl -X POST http://localhost:4545/survey/api/submit -H "Content-Type: application/json" -d '{...}'
```

### 3. **Container Name Standardization**
The file should consistently use the correct container names throughout:
- `safework-app` (not `safework2-app`)
- `safework-postgres` (not `safework2-postgres`)
- `safework-redis` (not `safework2-redis`)

### 4. **GitHub Actions Context**
Add section about the comprehensive CI/CD pipeline:
```bash
### GitHub Actions Workflows
# Current active workflows:
- deploy.yml                    # Main production deployment
- claude-mcp-assistant.yml      # AI-powered issue analysis
- maintenance-automation.yml    # System maintenance tasks
- operational-log-analysis.yml  # Real-time log monitoring
- security-auto-triage.yml      # Security scanning
- issue-handler.yml             # Intelligent issue management
- dependency-auto-update.yml    # Dependency management
```

### 5. **Flask Route Architecture**
Add better documentation of the route structure:
```
app/routes/
├── admin.py              # 13 SafeWork admin panels + main admin dashboard
├── api_safework_v2.py    # RESTful API v2 endpoints for external systems
├── survey.py             # 001/002 form handling with conditional JavaScript
├── auth.py               # Flask-Login authentication (admin/safework2024)
├── health.py             # System health monitoring (/health endpoint)
├── document.py           # Public document access (version control)
├── document_admin.py     # Admin document management
└── main.py               # Homepage and general routes
```

## Critical Fixes Needed

1. **Update all container references** to use consistent naming
2. **Add production monitoring script documentation**
3. **Include survey data debugging section** for the current data display issue
4. **Standardize database configuration** - PostgreSQL only
5. **Add GitHub Actions workflow reference**

These improvements would make the CLAUDE.md file more accurate and useful for future Claude instances working on this codebase.