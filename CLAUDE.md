# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeWork is a Korean workplace musculoskeletal symptom survey system built with Flask. It's a containerized web application that provides online forms, document management, and administrative dashboards for workplace health assessments.

### Core Technology Stack
- **Backend**: Python Flask 3.0+ with SQLAlchemy ORM
- **Database**: MySQL 8.0 with custom migration system
- **Cache**: Redis 7.0
- **Container**: Docker with multi-service architecture
- **Registry**: Private registry at registry.jclee.me
- **CI/CD**: GitHub Actions with automated deployment pipelines

## Development Commands

### Local Development
```bash
# Start development environment with Docker Compose
make up                     # Full stack (MySQL + Redis + App)
make dev                    # Development mode (Python only)
make status                 # Check service status
make logs                   # View application logs

# Database operations
make migrate-status         # Check migration status
make migrate-run           # Run pending migrations
make migrate-create desc="description"  # Create new migration
make migrate-rollback      # Rollback last migration
make migrate-backup        # Backup database
```

### Testing and Quality
```bash
make test-local            # Run local tests with pytest
make test-docker          # Run tests in Docker environment
```

### Build and Deployment
```bash
# GitOps deployment (recommended)
make deploy               # Trigger GitHub Actions deployment
make deploy-dev          # Deploy to development environment
make deploy-staging      # Deploy to staging environment  
make deploy-prod         # Deploy to production environment

# Local deployment
make local               # Build and deploy locally
make release v=1.2.0     # Create release tag
```

### Branch Management
```bash
make branch-feature name=feature-name    # Create feature branch
make branch-hotfix name=hotfix-name      # Create hotfix branch
make branch-release v=1.2.0              # Create release branch
make pr-create                           # Create GitHub PR
```

## High-Level Architecture

### Application Structure
The Flask application follows a modular blueprint-based architecture:

```
app/
├── app.py                 # Application factory with create_app()
├── config.py             # Environment-based configuration
├── models.py             # Core SQLAlchemy models (User, Survey, etc.)
├── models_document.py    # Document management models
├── routes/               # Blueprint modules
│   ├── main.py          # Main routes and homepage
│   ├── auth.py          # Authentication (login/register)
│   ├── survey.py        # Survey form handling
│   ├── admin.py         # Admin dashboard and management
│   ├── document.py      # Document management (user-facing)
│   ├── document_admin.py # Document management (admin)
│   ├── migration.py     # Database migration web interface
│   └── health.py        # Health check endpoint
├── migrations/          # Custom database migration system
└── templates/           # Jinja2 HTML templates
```

### Key Architectural Patterns

1. **Application Factory Pattern**: `create_app()` function in `app.py` creates configured Flask instances
2. **Blueprint-based Routing**: Modular route organization by feature area
3. **Custom Migration System**: Web-managed database migrations with CLI support
4. **Multi-container Architecture**: Separate containers for app, database, and cache
5. **Environment-based Configuration**: Different configs for development/staging/production

### Database Schema
- **Core Tables**: users, surveys, survey_statistics, audit_logs
- **Document Management**: documents, document_categories, document_versions, document_access_logs
- **Migration Tracking**: schema_migrations table for version control

### Container Architecture
Three main services orchestrated with Docker Compose:
- **safework-app**: Flask application (port 4545)
- **safework-mysql**: MySQL 8.0 database (port 3307 external)
- **safework-redis**: Redis cache (port 6380 external)

## Development Workflow

### Branch Strategy
- `main`: Production releases (auto-deploys to production)
- `staging`: Pre-production testing (auto-deploys to staging)
- `develop`: Development integration (auto-deploys to dev environment)
- `feature/*`: Feature development branches
- `hotfix/*`: Emergency production fixes

### CI/CD Pipeline
GitHub Actions workflows handle:
- **Security scanning**: Trivy, Bandit, Safety vulnerability scans
- **Code quality**: Black, Flake8, Pylint, MyPy checks
- **Testing**: Automated pytest execution with coverage
- **Building**: Multi-platform Docker image builds
- **Deployment**: Automated registry push and environment deployment

### Migration Management
Custom migration system with both CLI and web interface:
- Migrations stored in `app/migrations/` as Python files
- Web interface at `/admin/migrations` for visual management
- MySQL 8.0 compatibility with proper transaction handling
- Automatic rollback capability on failures

## Configuration and Environment

### Key Environment Variables
```bash
# Flask Configuration
FLASK_CONFIG=production          # development/staging/production
SECRET_KEY=<secret-key>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=safework2024

# Database
MYSQL_HOST=safework-mysql
MYSQL_DATABASE=safework_db
MYSQL_USER=safework
MYSQL_PASSWORD=safework2024

# Redis Cache
REDIS_HOST=safework-redis
REDIS_PORT=6379

# Container Registry
REGISTRY_URL=registry.jclee.me
REGISTRY_USER=admin
REGISTRY_PASSWORD=bingogo1
```

### Docker Registry
Private registry at `registry.jclee.me` with three custom images:
- `registry.jclee.me/safework/app:latest`
- `registry.jclee.me/safework/mysql:latest`  
- `registry.jclee.me/safework/redis:latest`

## Key Features and Routes

### Public Routes
- `/`: Main landing page
- `/survey/new`: Musculoskeletal symptom survey form
- `/documents/`: Document browsing and download
- `/auth/login` and `/auth/register`: User authentication

### Admin Routes (login required)
- `/admin/dashboard`: Statistics and system overview
- `/admin/surveys`: Survey data management and Excel export
- `/admin/documents/`: Document management and upload
- `/admin/migrations`: Database migration interface

### System Routes
- `/health`: Health check endpoint for monitoring
- API endpoints for AJAX operations

## Testing Strategy

### Test Framework
- **pytest**: Primary testing framework with Flask-specific extensions
- **Coverage**: Target 80%+ code coverage
- **Docker Testing**: Full integration tests with docker-compose.test.yml

### Quality Gates
- Code formatting with Black
- Linting with Flake8 and Pylint
- Type checking with MyPy (when applicable)
- Security scanning in CI/CD pipeline

## Common Development Tasks

### Adding New Features
1. Create feature branch: `make branch-feature name=feature-name`
2. Implement changes in appropriate blueprint module
3. Add database migrations if needed: `make migrate-create desc="description"`
4. Run tests: `make test-local`
5. Create PR: `make pr-create`

### Database Changes
1. Create migration: `make migrate-create desc="Add new table"`
2. Edit generated migration file in `app/migrations/`
3. Test migration: `make migrate-run`
4. Verify with web interface: `http://localhost:4545/admin/migrations`

### Deployment Process
1. Development: Push to `develop` branch (auto-deploys)
2. Staging: `make deploy-staging` (auto-deploys for testing)
3. Production: `make deploy-prod` (requires approval in GitHub Actions)

## Security and Monitoring

### Security Features
- JWT-based authentication
- Role-based access control (admin vs. regular users)
- File upload validation and sanitization
- SQL injection protection via SQLAlchemy ORM
- Automated vulnerability scanning in CI/CD

### Monitoring
- Health check endpoint at `/health`
- Application performance monitoring via logs
- Database connection and Redis cache health checks
- Container health checks in Docker Compose

## Troubleshooting

### Common Issues
1. **Database Connection**: Check MySQL container status and credentials
2. **Migration Failures**: Use web interface or CLI rollback functionality
3. **Container Issues**: Use `make status` and `make logs` for debugging
4. **Build Failures**: Check GitHub Actions logs for CI/CD pipeline issues

### Log Locations
- Application logs: `docker logs safework-app`
- Database logs: `docker logs safework-mysql`
- All services: `make logs`