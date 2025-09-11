# GitHub Secrets Configuration Guide

This document describes all required GitHub Secrets for the SafeWork project workflows.

## Required Secrets

### 1. Claude Code Integration
```
CLAUDE_CODE_OAUTH_TOKEN=<your-claude-code-oauth-token>
```
**Description:** OAuth token for Claude Code Action integration
**Used by:** All workflows with Claude Code actions
**Required:** Yes

### 2. Docker Registry Authentication
```
DOCKER_REGISTRY_PASSWORD=<secure-registry-password>
```
**Description:** Password for Docker registry authentication
**Used by:** deploy.yml - Docker image push
**Required:** Yes
**Security:** Must be rotated regularly

### 3. Watchtower Integration
```
WATCHTOWER_HTTP_API_TOKEN=<secure-watchtower-token>
```
**Description:** HTTP API token for Watchtower container updates
**Used by:** deploy.yml - Automated deployments
**Required:** Yes
**Security:** Must be rotated regularly

### 4. Portainer Integration  
```
PORTAINER_API_TOKEN=<secure-portainer-token>
```
**Description:** API token for Portainer container management
**Used by:** deploy.yml, log-monitoring.yml - Container operations
**Required:** Yes
**Security:** Must be rotated regularly

### 5. Slack Notifications
```
SLACK_WEBHOOK_URL=<your-slack-webhook-url>
```
**Description:** Webhook URL for Slack deployment notifications
**Used by:** deploy.yml - Deployment status notifications
**Required:** Yes

## Optional Secrets (with defaults)

### Application Configuration
```
APP_NAME=safework
DOCKER_REGISTRY_URL=registry.jclee.me
DOCKER_REGISTRY_USER=admin
WATCHTOWER_URL=watchtower.jclee.me
PORTAINER_URL=portainer.jclee.me
PRD_URL=https://safework.jclee.me
DEV_URL=https://safework-dev.jclee.me
```
**Description:** Application and service configuration
**Default values:** Provided as fallbacks in workflows
**Required:** No (will use defaults if not set)

## Secrets Setup Commands

To set these secrets in your GitHub repository, run:

```bash
# Required secrets (NEVER commit actual values)
gh secret set CLAUDE_CODE_OAUTH_TOKEN --body "<your-claude-oauth-token>"
gh secret set DOCKER_REGISTRY_PASSWORD --body "<secure-registry-password>"
gh secret set WATCHTOWER_HTTP_API_TOKEN --body "<secure-watchtower-token>"
gh secret set PORTAINER_API_TOKEN --body "<secure-portainer-token>"
gh secret set SLACK_WEBHOOK_URL --body "<your-slack-webhook-url>"

# Application secrets
gh secret set SECRET_KEY --body "<flask-secret-key-32-chars-min>"
gh secret set MYSQL_PASSWORD --body "<secure-mysql-password>"
gh secret set MYSQL_ROOT_PASSWORD --body "<secure-mysql-root-password>"
gh secret set ADMIN_PASSWORD --body "<secure-admin-password>"

# Optional customization secrets
gh secret set APP_NAME --body "safework"
gh secret set DOCKER_REGISTRY_URL --body "registry.jclee.me"
gh secret set DOCKER_REGISTRY_USER --body "admin"  
gh secret set WATCHTOWER_URL --body "watchtower.jclee.me"
gh secret set PORTAINER_URL --body "portainer.jclee.me"
gh secret set PRD_URL --body "https://safework.jclee.me"
gh secret set DEV_URL --body "https://safework-dev.jclee.me"
```

## Environment Mapping

### Production Environment
- **App URL:** PRD_URL (https://safework.jclee.me)
- **Environment:** FLASK_CONFIG=production
- **Container Name:** safework-app, safework-mysql, safework-redis
- **Registry:** registry.jclee.me/safework/

### Development Environment  
- **App URL:** DEV_URL (https://safework-dev.jclee.me)
- **Environment:** FLASK_CONFIG=development
- **Container Name:** Uses same naming convention
- **Registry:** Same registry, different tags

### Local Development
- **App URL:** http://localhost:4545 (hardcoded)
- **Environment:** FLASK_CONFIG=development
- **No GitHub Secrets needed for local development**

## Security Notes

1. **Token Rotation:** Rotate API tokens regularly
2. **Minimal Permissions:** Use tokens with minimal required permissions
3. **Environment Separation:** Consider separate tokens for dev/prod environments
4. **Monitoring:** Monitor token usage through respective service dashboards

## Workflow Dependencies

### deploy.yml requires:
- DOCKER_REGISTRY_PASSWORD
- WATCHTOWER_HTTP_API_TOKEN  
- PORTAINER_API_TOKEN
- SLACK_WEBHOOK_URL

### claude.yml requires:
- CLAUDE_CODE_OAUTH_TOKEN

### ci-auto-fix.yml requires:
- CLAUDE_CODE_OAUTH_TOKEN

### issue-handler.yml requires:
- CLAUDE_CODE_OAUTH_TOKEN

### log-monitoring.yml requires:
- CLAUDE_CODE_OAUTH_TOKEN
- PORTAINER_API_TOKEN
- SLACK_WEBHOOK_URL

## Validation

To validate your secrets are correctly configured:

```bash
# Check if secrets are set
gh secret list

# Test deployment workflow
gh workflow run deploy.yml --ref main

# Monitor workflow runs
gh run list --workflow=deploy.yml
```