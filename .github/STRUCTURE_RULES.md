# GitHub Repository Structure Rules

## 📁 Directory Organization

### Root Level
```
/
├── .github/          # GitHub workflows, templates, and configurations
├── app/              # Main Flask application
├── workers/          # Cloudflare Workers (active)
├── scripts/          # Deployment and utility scripts
├── data/             # Static data files and configurations
├── config/           # Configuration files
├── postgres/         # PostgreSQL Docker configuration
├── redis/            # Redis Docker configuration
├── tests/            # Test suites
├── docs/             # Documentation (consolidated)
├── archived/         # Deprecated/archived code
└── logs/             # Log files (gitignored)
```

### Application Structure
```
app/
├── routes/           # Flask blueprints
├── models/           # Database models
├── templates/        # Jinja2 templates
├── static/           # CSS, JS, images
├── migrations/       # Database migrations
└── utils/            # Utility functions
```

### Workers Structure
```
workers/
├── src/
│   ├── routes/       # API route handlers
│   ├── middleware/   # Custom middleware
│   └── utils/        # Utility functions
├── wrangler.toml     # Cloudflare configuration
└── package.json      # Dependencies
```

## 🚫 Deprecated Directories
- `cloudflare-workers/` → Moved to `workers/`
- Multiple scattered documentation files → Consolidated to `docs/`

## 📋 File Naming Conventions
- Use kebab-case for directories: `excel-processor`, `survey-routes`
- Use snake_case for Python files: `excel_processor.py`
- Use PascalCase for TypeScript classes: `ExcelProcessor.ts`
- Use UPPERCASE for constants: `README.md`, `CLAUDE.md`

## 🔄 Migration Status
- ✅ Active workers moved to `/workers`
- ✅ Documentation consolidated
- ✅ Proper gitignore configuration
- ✅ GitHub Actions workflows organized