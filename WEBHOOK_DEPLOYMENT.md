# SafeWork Webhook Deployment System

## 🚀 Quick Deploy

### Method 1: Script
```bash
./scripts/webhook-deploy.sh
```

### Method 2: Direct Webhook
```bash
curl -X POST https://portainer.jclee.me/api/stacks/webhooks/e2abf888-e16d-419b-bdf0-65c206cca913
```

### Method 3: GitHub Push (Auto)
```bash
git push origin master
```

## 📌 Webhook Configuration

- **Webhook URL**: `https://portainer.jclee.me/api/stacks/webhooks/e2abf888-e16d-419b-bdf0-65c206cca913`
- **Stack Name**: safework (ID: 123)
- **Endpoint**: 3 (synology)
- **Response**: HTTP 204 (No Content) on success

## 🔧 GitHub Secrets Required

| Secret Name | Description |
|-------------|-------------|
| `PORTAINER_WEBHOOK_URL` | Portainer webhook URL |
| `PORTAINER_API_KEY` | Portainer API authentication key |
| `REGISTRY_PASSWORD` | Docker registry password |
| `DB_PASSWORD` | Database password |
| `ADMIN_USERNAME` | Admin panel username |
| `ADMIN_PASSWORD` | Admin panel password |

## 📊 Deployment Verification

```bash
# Health Check
curl https://safework.jclee.me/health

# Admin Panel
curl -L https://safework.jclee.me/admin

# Container Status
curl -H "X-API-Key: ptr_zdHC0mAdjC7hk7pZ8r2+pJZO+bLxBD/TaB3iPuQwx9Q=" \
  "https://portainer.jclee.me/api/endpoints/3/docker/containers/json" | \
  jq '.[] | select(.Names[] | contains("safework"))'
```

## ⚡ Performance

- **Deployment Time**: ~20 seconds (66% faster than API method)
- **Health Check**: Automatic with 5 retries
- **Rollback**: Automatic on failure via GitHub Actions

## 🔄 CI/CD Pipeline Flow

1. **Code Push** → GitHub repository
2. **GitHub Actions** → Build and push Docker images
3. **Webhook Trigger** → Portainer stack update
4. **Health Verification** → Service availability check
5. **Success/Failure** → Notification and rollback if needed

## 📝 Troubleshooting

### Webhook Returns 404
- Check if webhook URL is correct
- Verify stack exists in Portainer

### Deployment Not Updating
- Check if Docker image was pushed to registry
- Verify Portainer has registry credentials

### Health Check Fails
- Check container logs via Portainer
- Verify database connections
- Check environment variables

## 🎯 Best Practices

1. Always test locally before pushing
2. Monitor deployment via GitHub Actions
3. Use webhook script for quick deployments
4. Keep secrets updated in GitHub repository
5. Regular health check monitoring
