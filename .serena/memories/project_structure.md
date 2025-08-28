# SafeWork Project Structure

## Root Directory Structure
```
safework2/
├── app/                    # Main Flask application
├── mysql/                  # MySQL Docker configuration
├── redis/                  # Redis Docker configuration
├── forms/                  # PDF form templates
├── .github/workflows/      # CI/CD pipeline configurations
├── build.sh               # Docker build script
├── docker-run.sh          # Production deployment script
├── README.md              # Project documentation
├── VERSION                # Current version (1.0.2)
└── .gitignore             # Git ignore rules
```

## Application Directory (app/)
```
app/
├── app.py                 # Application factory and main entry point
├── config.py              # Configuration classes (Dev/Prod/Test)
├── models.py              # SQLAlchemy database models
├── forms.py               # WTForms form definitions
├── requirements.txt       # Python dependencies
├── Dockerfile            # App container configuration
├── migrations_init.py    # Database initialization
├── VERSION               # App-specific version
├── routes/               # Route blueprints
│   ├── __init__.py
│   ├── main.py          # Main application routes
│   ├── auth.py          # Authentication routes
│   ├── survey.py        # Survey form routes
│   ├── admin.py         # Admin dashboard routes
│   └── health.py        # Health check endpoints
├── templates/            # Jinja2 HTML templates
│   ├── base.html        # Base template
│   ├── index.html       # Homepage
│   ├── auth/            # Authentication templates
│   │   ├── login.html
│   │   └── register.html
│   ├── survey/          # Survey-related templates
│   │   ├── new.html
│   │   ├── view.html
│   │   ├── complete.html
│   │   └── my_surveys.html
│   ├── admin/           # Admin panel templates
│   │   ├── dashboard.html
│   │   └── surveys.html
│   └── errors/          # Error page templates
│       ├── 404.html
│       └── 500.html
└── forms/               # Form assets
    ├── 근골격계+증상조사표.PDF
    └── 신규채용자 건강문진표(2).docx
```

## Infrastructure Configuration
```
mysql/
└── Dockerfile           # MySQL 8.0 container setup

redis/
└── Dockerfile           # Redis container setup

.github/workflows/
├── ci-cd.yml           # Complete CI/CD pipeline
└── deploy.yml          # Deployment workflow
```

## Key Architecture Components

### Application Factory Pattern
- `create_app()` in `app.py` initializes Flask app with extensions
- Configurable environments (development/production/testing)
- Blueprint registration for modular routing

### Database Layer
- SQLAlchemy models in `models.py`
- MySQL as primary database
- Redis for caching and sessions
- Auto-migration with retry logic

### Route Organization
- **Main routes**: Homepage, general navigation
- **Auth routes**: Login, registration, user management
- **Survey routes**: Form submission, viewing responses
- **Admin routes**: Dashboard, data management, Excel export
- **Health routes**: Monitoring and status checks

### Template Hierarchy
- Base template with common layout
- Specialized templates for each functional area
- Error handling templates
- Mobile-responsive design

### Security Architecture
- JWT-based authentication for admin access
- CSRF protection via Flask-WTF
- Secure session management
- Input validation on all forms
- Audit logging for admin actions

### Deployment Architecture
- Multi-container Docker setup
- Private registry (registry.jclee.me)
- Watchtower for automatic updates
- GitHub Actions CI/CD pipeline
- Health monitoring endpoints