# Portainer Marketplace Action Setup Guide

## Required GitHub Secrets for Marketplace Action

Configure these secrets in your GitHub repository:
**Settings → Secrets and variables → Actions → New repository secret**

### 1. Portainer Credentials
```yaml
PORTAINER_URL: https://portainer.jclee.me
PORTAINER_USERNAME: admin  # Create a dedicated CI user for better security
PORTAINER_PASSWORD: bingogo1
```

### 2. Docker Registry
```yaml
REGISTRY_PASSWORD: bingogo1
```

### 3. Application Secrets
```yaml
DB_PASSWORD: safework2024
SECRET_KEY: safework-production-secret-key-2024
ADMIN_USERNAME: admin
ADMIN_PASSWORD: safework2024
```

## Stack Configuration

- **Stack Name**: `safework`
- **Endpoint ID**: 3 (synology)
- **Network**: safework_safework_network, traefik-public

## GitHub CLI Commands for Secret Setup

```bash
# Set all required secrets at once
gh secret set PORTAINER_URL --body="https://portainer.jclee.me"
gh secret set PORTAINER_USERNAME --body="admin"
gh secret set PORTAINER_PASSWORD --body="bingogo1"
gh secret set REGISTRY_PASSWORD --body="bingogo1"
gh secret set DB_PASSWORD --body="safework2024"
gh secret set SECRET_KEY --body="safework-production-secret-key-2024"
gh secret set ADMIN_USERNAME --body="admin"
gh secret set ADMIN_PASSWORD --body="safework2024"
```

## Advantages of Marketplace Action

1. **Simplified Configuration**: Uses standard GitHub Action syntax
2. **Better Error Handling**: Built-in retry and error reporting
3. **Template Variables**: Direct support for environment variables
4. **Image Management**: Automatic image pulling and pruning
5. **Community Support**: Well-maintained action with updates

## Deployment Triggers

### Automatic Deployment
```bash
# Push to master branch
git push origin master
```

### Manual Deployment
```yaml
# Go to Actions tab → Deploy with Marketplace → Run workflow
```

## Comparison with Custom Implementation

| Feature | Custom Webhook | Marketplace Action |
|---------|---------------|-------------------|
| Setup Complexity | Medium | Low |
| Maintenance | Self-maintained | Community maintained |
| Error Handling | Custom logic | Built-in |
| Speed | ~20 seconds | ~30-40 seconds |
| Flexibility | High | Medium |
| Documentation | Custom | Standard |

## Troubleshooting

### Authentication Failed
- Verify PORTAINER_USERNAME and PORTAINER_PASSWORD are correct
- Consider creating a dedicated CI user in Portainer

### Stack Not Found
- Ensure stack name is exactly "safework"
- Check if stack exists in Portainer UI

### Image Pull Errors
- Verify REGISTRY_PASSWORD is correct
- Check if images exist in registry.jclee.me

## Workflow Files

- **Marketplace Action**: `.github/workflows/deploy-marketplace.yml`
- **Original Webhook**: `.github/workflows/deploy.yml`
- **Direct Webhook**: `scripts/webhook-deploy.sh`

## Best Practices

1. Use dedicated CI credentials (not admin account)
2. Keep both workflows for redundancy
3. Test in staging before production
4. Monitor GitHub Actions logs
5. Regular secret rotation