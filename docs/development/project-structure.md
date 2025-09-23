# SafeWork Project Structure (2024 Best Practices)

## Overview
SafeWork follows modern Python/Flask project structure best practices with independent Docker container architecture.

## Directory Structure (Optimized for Independent Container Builds)

```
safework2/                          # Root (RESTRICTED - only CLAUDE.md, README.md, .gitignore)
├── CLAUDE.md                       # ✅ Claude Code instructions
├── README.md                       # ✅ Project documentation
├── .gitignore                      # ✅ Git ignore rules (2024 standards)
├── .env                           # Local development variables
│
├── app/                           # 🐍 Flask Application (Complete Build Context)
│   ├── Dockerfile                 # Flask app container definition
│   ├── .dockerignore             # Build optimization
│   ├── app.py                     # Application factory entry point
│   ├── requirements.txt           # Python dependencies
│   ├── config.py                  # Configuration management
│   ├── models*.py                 # Database models
│   ├── forms*.py                  # Form definitions
│   ├── routes/                    # Blueprint route handlers
│   ├── static/                    # CSS, JS, images
│   ├── templates/                 # Jinja2 templates
│   └── tests/                     # Unit and integration tests
│
├── mysql/                         # 🗄️ MySQL 8.0 (Complete Build Context)
│   ├── Dockerfile                 # MySQL container with SafeWork optimizations
│   ├── .dockerignore             # Build optimization
│   ├── init.sql                   # Database initialization script
│   └── my.cnf                     # MySQL configuration (optional)
│
├── redis/                         # 🔴 Redis 7 (Complete Build Context)
│   ├── Dockerfile                 # Redis container with caching optimizations
│   ├── .dockerignore             # Build optimization
│   ├── redis.conf                # Redis configuration
│   └── healthcheck.sh             # Health check script (optional)
│
├── config/                        # ⚙️ Configuration Templates
│   └── .env.example              # Environment template
│
├── docs/                          # 📚 Documentation
│   ├── CHANGELOG.md              # Version history
│   ├── project-structure.md      # This file
│   └── deployment/               # Deployment guides
│
└── .github/                       # 🤖 GitHub Actions & Workflows
    ├── workflows/                 # CI/CD automation
    └── ISSUE_TEMPLATE/           # Issue templates
```

## Architecture Principles (2024)

### 🚫 Root Directory Protection
**ONLY ALLOWED in root:**
- `CLAUDE.md` - Claude Code instructions
- `README.md` - Project documentation  
- `.gitignore` - Git ignore rules

**PROHIBITED in root:**
- Any backup files (`*backup*`, `*.bak`, `*-v2*`, etc.)
- Configuration files (use `config/` instead)
- Additional documentation (use `docs/` instead)
- Docker files (use `docker/` instead)

### 🐳 Independent Container Architecture
Each service has its own Dockerfile:
- **app/**: Flask application with health checks
- **mysql/**: MySQL 8.0 optimized for SafeWork
- **redis/**: Redis 7 configured for session storage

**No docker-compose dependency** - containers run independently with:
- Individual health checks
- Watchtower labels for auto-updates
- Connection retry logic
- KST timezone configuration

### 🐍 Modern Python Structure
Following Python 2024 best practices:
- Application factory pattern (`app/app.py`)
- Blueprint-based modular design
- Comprehensive `.gitignore` for Python projects
- Security-first environment variable handling
- Test-driven development structure

### 🔒 Security & Git Best Practices
- Sensitive data in GitHub Secrets (not committed)
- Environment-specific configurations
- Backup file prevention (git ignored)
- Comprehensive security file patterns
- Modern IDE and tool support

### 📊 Monitoring & Operations
- Health check endpoints for all services
- Structured logging with KST timezone
- Performance monitoring capabilities  
- Independent container deployment
- Automated CI/CD with GitHub Actions

## Build & Deployment

### Independent Container Build
```bash
# Build all containers
./docker/build.sh

# Individual builds
cd docker/mysql && docker build -t safework/mysql .
cd docker/redis && docker build -t safework/redis .
cd app && docker build -f ../docker/app/Dockerfile -t safework/app .
```

### Production Deployment
- GitHub Actions automated pipeline
- Registry: `registry.jclee.me`
- Watchtower automatic updates
- Independent container execution

This structure supports scalable development, secure deployment, and maintainable operations following 2024 industry standards.