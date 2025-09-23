# SafeWork Development Guide

## Getting Started

### Prerequisites
- Python 3.8+
- Docker and Docker Compose
- Git
- Access to registry.jclee.me

### Development Environment Setup
```bash
# 1. Clone repository
git clone <repository>
cd safework

# 2. Setup development environment
make setup

# 3. Start development services
make up

# 4. Verify setup
make health
curl http://localhost:4545/health
```

### Project Structure (Updated - Phase 1 Modularization)
```
safework/
├── src/                     # Source code
│   └── app/                # Flask application
├── infrastructure/         # Infrastructure as Code
│   ├── docker/            # Container definitions
│   └── docker-compose.yml # Local development
├── deployment/            # Deployment configurations
│   └── environments/     # Environment-specific configs
├── docs/                  # Documentation
│   ├── architecture/     # System architecture
│   ├── development/      # Development guides
│   └── deployment/       # Deployment guides
├── tools/                 # Development and operational tools
│   └── scripts/          # Operational scripts
├── assets/               # Static assets and templates
│   └── forms/           # PDF/DOCX templates
├── build/                # Build artifacts
├── Makefile              # Development automation
└── CLAUDE.md            # Claude Code guidance
```

## Development Workflow

### Code Quality
```bash
# Format code
make format

# Lint code
make lint

# Combined quality check
make check
```

### Testing
```bash
# Run all tests
make test

# Validate project structure
make validate

# Integration tests
make test-integration
```

### Database Development
```bash
# Check migration status
make db-status

# Create new migration
docker exec -it safework-app python migrate.py create "Add new field"

# Run migrations
make db-migrate

# Database shell access
make db-shell
```

## Architecture Patterns

### Flask Application Factory
The application uses the factory pattern for flexible configuration:
```python
# src/app/app.py
def create_app(config_name=None):
    app = Flask(__name__)
    # Configuration loading
    # Extension initialization
    # Blueprint registration
    return app
```

### Model Architecture
```python
# Core Models (models.py)
class Survey(db.Model):
    form_type = db.Column(db.String(10))  # '001' or '002'
    responses = db.Column(db.JSON)        # Flexible form data

# SafeWork Models (models_safework.py)
class SafeworkWorker(db.Model):
    __tablename__ = "safework_workers"
    # Industrial safety management models
```

### Route Organization
```python
# src/app/routes/
├── __init__.py           # Route package initialization
├── admin.py             # Admin dashboard and SafeWork panels
├── api_safework_v2.py   # RESTful API v2 endpoints
├── survey.py            # Survey form handling
├── auth.py              # Authentication routes
├── health.py            # Health monitoring
└── ...
```

## Key Development Patterns

### Survey Form Development
1. **HTML Template**: Create in `src/app/templates/survey/`
2. **Route Handler**: Add to `src/app/routes/survey.py`
3. **JavaScript Logic**: Implement conditional logic with exact ID matching
4. **Model Updates**: Use JSON `responses` field for flexibility

Example:
```html
<!-- HTML: Exact ID matching critical -->
<div id="accident_parts_section">

<script>
// JavaScript: Must match HTML IDs exactly
document.getElementById('accident_parts_section')
</script>
```

### SafeWork Admin Panel Extension
1. **Model Definition**: Add to `models_safework.py`
2. **API Endpoint**: Add to `api_safework_v2.py`
3. **Admin Interface**: Add to `routes/admin.py`
4. **Template**: Create in `templates/admin/safework/`

### Database Patterns
```python
# Always use KST timezone
from utils.time_utils import kst_now
created_at = db.Column(db.DateTime, default=kst_now)

# Anonymous submissions
user_id = 1  # Special user for anonymous access

# Flexible JSON storage
responses = db.Column(db.JSON)  # PostgreSQL JSONB
```

## Configuration Management

### Environment-Specific Configs
```bash
# Development
deployment/environments/development/.env

# Production (template)
deployment/environments/production/.env.example

# Staging (template)
deployment/environments/staging/.env.example
```

### Configuration Loading
```python
# src/app/config.py
config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}
```

## API Development

### RESTful API v2 Pattern
```python
# src/app/routes/api_safework_v2.py
@api_safework_bp.route('/workers', methods=['GET', 'POST'])
@login_required
def handle_workers():
    if request.method == 'GET':
        # List workers with pagination
    elif request.method == 'POST':
        # Create new worker
```

### API Testing
```bash
# Health check
curl http://localhost:4545/health

# Survey submission
curl -X POST http://localhost:4545/survey/api/submit \
  -H "Content-Type: application/json" \
  -d '{"form_type": "001", "name": "테스트"}'

# Worker API
curl -X GET http://localhost:4545/api/safework/v2/workers \
  -H "Authorization: Bearer <token>"
```

## Frontend Development

### Bootstrap 4.6 + jQuery Pattern
```html
<!-- Template inheritance -->
{% extends "admin/base_admin.html" %}
{% block content %}
<div class="container-fluid">
    <!-- Bootstrap components -->
</div>
{% endblock %}
```

### JavaScript Best Practices
- Exact HTML ID matching for conditional logic
- CSRF token handling (currently disabled)
- Korean language support
- Responsive design patterns

## Debugging and Troubleshooting

### Common Development Issues
1. **Import Errors**: Check model aliases in `models.py`
2. **Database Errors**: Verify PostgreSQL container and `safework_db` name
3. **Container Issues**: Check Docker network and environment variables

### Debugging Tools
```bash
# Application logs
make logs

# Database inspection
make db-shell
\dt  # List tables
\d surveys  # Describe table

# Container debugging
docker exec -it safework-app bash
python -c "from app import create_app; print('App import OK')"
```

### Code Quality Tools
```bash
# Black formatting
cd src/app && black . --line-length 88

# Flake8 linting
cd src/app && flake8 . --max-line-length=88 --extend-ignore=E203,W503

# Manual syntax check
python -m py_compile *.py
```

## Performance Considerations

### Database Optimization
- Use connection pooling (configured in `config.py`)
- Optimize queries with proper indexing
- Use JSONB for flexible survey data storage

### Caching Strategy
- Redis for session storage
- Cache frequently accessed admin data
- Optimize static file serving

### Resource Management
- Monitor container resource usage
- Optimize database connection pool settings
- Use pagination for large datasets (20 items per page)

## Security Best Practices

### Authentication
- Flask-Login for admin access
- Session security with HTTP-only cookies
- Audit logging for administrative operations

### Data Protection
- Input validation and sanitization
- SQL injection prevention with SQLAlchemy
- Secure file upload handling

### Environment Security
- Never commit secrets to repository
- Use environment variables for sensitive data
- Regular security updates via container rebuilds