# SafeWork Deployment Guide

## Quick Start

### Local Development
```bash
# 1. Clone and setup
git clone <repository>
cd safework

# 2. Initialize development environment
make setup

# 3. Start local services
make up

# 4. Verify installation
make health
```

### Production Deployment
```bash
# 1. Trigger GitHub Actions deployment
git push origin master

# 2. Monitor deployment status
make status

# 3. Verify production health
make test-api
```

## Environment Configurations

### Development Environment
- **URL**: http://localhost:4545
- **Database**: PostgreSQL (safework-postgres:4546)
- **Cache**: Redis (safework-redis:4547)
- **Configuration**: `deployment/environments/development/.env`

### Production Environment
- **URL**: https://safework.jclee.me
- **Infrastructure**: Portainer + Watchtower
- **Registry**: registry.jclee.me
- **Configuration**: Environment variables in GitHub Secrets

## Deployment Methods

### Method 1: GitHub Actions (Recommended)
Automated deployment through GitHub Actions workflow:
1. Push to master branch triggers deployment
2. Builds all containers (app, postgres, redis)
3. Pushes to private registry
4. Updates containers via Portainer API
5. Verifies deployment health

### Method 2: Manual Local Deployment
```bash
# Build and deploy locally
make build
make deploy-local

# Monitor status
make logs
make monitor
```

### Method 3: Emergency Deployment
```bash
# Emergency recovery procedures
./tools/scripts/emergency_deploy.sh
./tools/scripts/emergency_recovery.sh
```

## Container Management

### Individual Container Operations
```bash
# App container
docker run -d --name safework-app \
  --network watchtower_default -p 4545:4545 \
  -e TZ=Asia/Seoul \
  -e DB_HOST=safework-postgres \
  -e DB_NAME=safework_db \
  registry.jclee.me/safework/app:latest

# PostgreSQL container
docker run -d --name safework-postgres \
  --network watchtower_default -p 4546:5432 \
  -e TZ=Asia/Seoul \
  -e POSTGRES_PASSWORD=safework2024 \
  -e POSTGRES_DB=safework_db \
  -e POSTGRES_USER=safework \
  registry.jclee.me/safework/postgres:latest

# Redis container
docker run -d --name safework-redis \
  --network watchtower_default -p 4547:6379 \
  -e TZ=Asia/Seoul \
  registry.jclee.me/safework/redis:latest
```

### Docker Compose (Local Development)
```bash
# Start all services
cd infrastructure
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Database Management

### Migration Commands
```bash
# Check migration status
make db-status

# Run migrations
make db-migrate

# Create new migration
docker exec -it safework-app python migrate.py create "Description"
```

### Database Backup
```bash
# Create backup
make db-backup

# Manual backup
docker exec safework-postgres pg_dump -U safework -d safework_db > backup.sql
```

## Monitoring and Health Checks

### System Health
```bash
# Comprehensive health check
make health

# System status
make status

# Performance monitoring
make monitor
```

### Log Analysis
```bash
# Real-time logs
make logs

# Error logs only
make logs-errors

# Specific container logs
./tools/scripts/safework_ops_unified.sh logs live safework-app
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check PostgreSQL container
docker ps | grep postgres
docker logs safework-postgres

# Restart if needed
docker restart safework-postgres
```

#### 2. Container Not Starting
```bash
# Check container logs
docker logs safework-app

# Verify network
docker network ls | grep watchtower

# Check image availability
docker images | grep safework
```

#### 3. Health Check Failures
```bash
# Direct health check
curl http://localhost:4545/health

# Check container health
docker inspect safework-app | grep Health -A 10
```

### Recovery Procedures

#### Emergency Recovery
```bash
# Complete system recovery
./tools/scripts/emergency_recovery.sh

# Individual service recovery
docker restart safework-app
docker restart safework-postgres
docker restart safework-redis
```

#### Rollback Deployment
```bash
# Using integrated script
./tools/scripts/integrated_build_deploy.sh rollback

# Manual rollback
docker pull registry.jclee.me/safework/app:previous
docker stop safework-app
docker rm safework-app
# Start with previous image
```

## Security Considerations

### Environment Variables
Never commit sensitive data to repository:
- Use `.env.example` files as templates
- Store production secrets in GitHub Secrets
- Use environment-specific configurations

### Container Security
- Run containers with non-root users
- Use secure networks (watchtower_default)
- Regular security updates via Watchtower

### Database Security
- Strong passwords for production
- Network isolation
- Regular backups with encryption

## Performance Optimization

### Resource Allocation
- **CPU**: 2 cores minimum for production
- **Memory**: 4GB minimum for full stack
- **Storage**: SSD recommended for database

### Caching Strategy
- Redis for session storage
- Database query optimization
- Static file caching

### Monitoring Metrics
- Response time < 200ms
- Database connection pool usage
- Memory and CPU utilization
- Error rates and patterns