# GitHub Secrets Configuration for SafeWork Project

## Required GitHub Secrets

### Core Authentication
```bash
# Claude Code Integration
CLAUDE_CODE_OAUTH_TOKEN=<your-claude-code-oauth-token>

# Portainer API Integration
PORTAINER_API_TOKEN=ptr_your-portainer-api-token-here

# Container Registry
REGISTRY_PASSWORD=<registry-password>
REGISTRY_USERNAME=admin

# Watchtower API
WATCHTOWER_HTTP_API_TOKEN=<watchtower-api-token>
```

### Production Environment URLs
```bash
# SafeWork Application URLs
SAFEWORK_PROD_URL=safework.jclee.me
SAFEWORK_DEV_URL=safework-dev.jclee.me

# Infrastructure Management URLs
PORTAINER_URL=https://portainer.jclee.me
REGISTRY_URL=registry.jclee.me
WATCHTOWER_URL=https://watchtower.jclee.me
```

### Database Configuration (Production)
```bash
# MySQL Database
MYSQL_ROOT_PASSWORD=<production-root-password>
MYSQL_DATABASE=safework_db
MYSQL_USER=safework
MYSQL_PASSWORD=<production-mysql-password>

# Redis Cache
REDIS_PASSWORD=<redis-password-if-needed>
```

### Application Configuration
```bash
# Flask Application
SECRET_KEY=<production-secret-key>
FLASK_ENV=production

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<production-admin-password>
```

## Secret Usage in Workflows

### Operational Log Analysis Workflow
- `CLAUDE_CODE_OAUTH_TOKEN`: Claude Code Action authentication
- `PORTAINER_API_TOKEN`: Container log retrieval from Portainer API
- `SAFEWORK_PROD_URL`: Production application monitoring
- `SAFEWORK_DEV_URL`: Development environment monitoring

### Deployment Workflows
- `REGISTRY_PASSWORD`: Docker image push authentication
- `WATCHTOWER_HTTP_API_TOKEN`: Automatic deployment triggers
- `MYSQL_ROOT_PASSWORD`: Database initialization and health checks
- `SECRET_KEY`: Flask application security

### Security and Monitoring
- `ADMIN_PASSWORD`: Admin panel access validation
- `REDIS_PASSWORD`: Cache security (if authentication enabled)
- `PORTAINER_URL`: Infrastructure management endpoint

## Security Best Practices

1. **No Hardcoding**: All sensitive values must use GitHub Secrets
2. **Environment Defaults**: Dockerfiles contain secure defaults, production uses secrets
3. **Least Privilege**: Each secret only used where necessary
4. **Regular Rotation**: Passwords and tokens rotated regularly
5. **Audit Trail**: All secret usage logged in workflow runs

## Implementation Status

### ✅ Completed
- Portainer API token integration for log collection
- Claude Code OAuth token usage across all workflows
- Registry credentials for Docker image deployment
- Environment-specific URL configuration

### 🔄 In Progress
- Database credential secret integration
- Redis authentication setup
- Admin credential secret migration
- Watchtower API token implementation

### 📝 Next Steps
1. Update all Dockerfiles to use GitHub Secrets as environment variables
2. Remove any hardcoded credentials from configuration files
3. Test all workflows with new secret configuration
4. Document secret rotation procedures