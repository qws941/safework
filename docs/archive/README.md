# SafeWork Deployment Documentation

## Configuration Files

### Dockerfile
Located: `config/Dockerfile`
- Independent container configuration
- Environment variables with secure defaults
- No docker-compose dependency

### Environment Examples
Located: `config/.env.example`
- Development environment template
- Security warnings for production values

## Deployment History

### CHANGELOG
Located: `docs/CHANGELOG.md`
- Project change history
- Version updates and improvements

## Directory Structure

```
safework2/
├── config/           # Configuration files
│   ├── Dockerfile
│   └── .env.example
├── docs/            # Documentation
│   ├── CHANGELOG.md
│   └── deployment/
└── app/             # Application code
```

## Root Directory Rules

**ONLY ALLOWED in root:**
- `CLAUDE.md` - Claude Code instructions
- `README.md` - Project documentation  
- `.gitignore` - Git ignore rules

**PROHIBITED in root:**
- Any backup files (*backup*, *.bak, *-v2*, etc.)
- Configuration files (use config/ instead)
- Additional documentation (use docs/ instead)