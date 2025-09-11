# Security Policy

## 🔒 SafeWork Security Guidelines

This document outlines security best practices and procedures for the SafeWork project.

## ⚠️ Hardcoded Credentials Removed

**IMPORTANT**: All hardcoded credentials have been replaced with placeholder values that must be configured through environment variables or GitHub Secrets.

### 🚫 NEVER use these default values in production:

```bash
# These are PLACEHOLDER values - DO NOT USE IN PRODUCTION
MYSQL_PASSWORD=CHANGE_ME_MYSQL_USER
MYSQL_ROOT_PASSWORD=CHANGE_ME_MYSQL_ROOT  
ADMIN_PASSWORD=CHANGE_ME_ADMIN_PASSWORD
SECRET_KEY=CHANGE_ME_FLASK_SECRET_KEY_32_CHARS
```

## 🔐 Required Security Configuration

### 1. Environment Variables (Local Development)

Create a `.env` file with secure values:

```bash
# Database Credentials (Generate strong passwords)
MYSQL_ROOT_PASSWORD=<strong-mysql-root-password-32-chars>
MYSQL_PASSWORD=<strong-mysql-user-password-32-chars>

# Application Secrets  
SECRET_KEY=<flask-secret-key-minimum-32-characters>
ADMIN_PASSWORD=<strong-admin-password-16-chars-min>

# Optional Redis Password
REDIS_PASSWORD=<redis-password-if-needed>
```

### 2. GitHub Secrets (CI/CD)

All production deployments require these secrets:

```bash
# Core Infrastructure Secrets
gh secret set DOCKER_REGISTRY_PASSWORD --body "<secure-registry-password>"
gh secret set WATCHTOWER_HTTP_API_TOKEN --body "<secure-watchtower-token>"  
gh secret set PORTAINER_API_TOKEN --body "<secure-portainer-token>"

# Application Secrets
gh secret set SECRET_KEY --body "<flask-secret-key-minimum-32-characters>"
gh secret set MYSQL_PASSWORD --body "<strong-mysql-user-password>"
gh secret set MYSQL_ROOT_PASSWORD --body "<strong-mysql-root-password>"
gh secret set ADMIN_PASSWORD --body "<strong-admin-password>"

# Integration Secrets
gh secret set CLAUDE_CODE_OAUTH_TOKEN --body "<claude-oauth-token>"
gh secret set SLACK_WEBHOOK_URL --body "<slack-webhook-url>"
```

## 🛡️ Security Best Practices

### Password Requirements

- **Minimum Length**: 16 characters
- **Complexity**: Include uppercase, lowercase, numbers, and special characters
- **Uniqueness**: Never reuse passwords across different services
- **Rotation**: Change passwords every 90 days

### Secret Key Requirements

- **Flask SECRET_KEY**: Minimum 32 characters, cryptographically random
- **API Tokens**: Use service-provided tokens with minimal required permissions
- **Database Passwords**: 32+ character random strings

### Example Secure Password Generation

```bash
# Generate secure passwords (Linux/macOS)
openssl rand -base64 32  # For passwords
openssl rand -hex 32     # For secret keys

# Generate Flask SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"
```

## 🚨 Security Incidents

### If Credentials Are Compromised:

1. **Immediate Actions**:
   - Revoke/change all affected credentials
   - Check logs for unauthorized access
   - Update all dependent systems

2. **GitHub Secrets**:
   ```bash
   gh secret set <SECRET_NAME> --body "<new-secure-value>"
   ```

3. **Container Restart** (after secret updates):
   ```bash
   docker-compose down
   docker-compose up -d
   ```

## 🔍 Security Audit Checklist

- [ ] No hardcoded credentials in source code
- [ ] All `.env` files in `.gitignore`  
- [ ] GitHub Secrets properly configured
- [ ] Strong passwords (16+ chars) used everywhere
- [ ] API tokens have minimal required permissions
- [ ] Regular credential rotation (90 days)
- [ ] Security headers enabled in Flask app
- [ ] Database connections use TLS when possible
- [ ] Container logs don't expose sensitive data

## 📞 Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. Email security concerns to: [Your security email]
3. Include detailed description and reproduction steps
4. Allow reasonable time for response before disclosure

## 🔄 Credential Rotation Schedule

| Credential Type | Rotation Frequency | Last Rotated | Next Due |
|----------------|-------------------|--------------|----------|
| Database Passwords | 90 days | TBD | TBD |
| API Tokens | 90 days | TBD | TBD |
| Flask SECRET_KEY | 180 days | TBD | TBD |
| Registry Credentials | 90 days | TBD | TBD |

## ✅ Compliance Notes

- All credentials stored in environment variables or GitHub Secrets
- No sensitive data committed to version control  
- Secure defaults removed from configuration files
- Production deployments require explicit secret configuration
- Regular security audits and credential rotation enforced