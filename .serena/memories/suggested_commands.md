# SafeWork Development Commands

## Development Environment Setup
```bash
# Install Python dependencies
cd app
pip install -r requirements.txt

# Install development tools
pip install pytest pytest-cov pytest-flask flake8 black
```

## Code Quality & Formatting
```bash
# Format code with Black
cd app
black .

# Check code quality with Flake8
flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics

# Run all linting checks
flake8 . --count --show-source --statistics
black --check .
```

## Testing
```bash
cd app

# Run all tests
pytest

# Run tests with coverage
pytest --cov=. --cov-report=html --cov-report=term

# Run tests with coverage XML (for CI)
pytest --cov=. --cov-report=xml

# Run specific test file
pytest tests/test_specific.py

# Watch mode (if using pytest-watch)
pytest-watch
```

## Database Operations
```bash
# Initialize database (first time)
python migrations_init.py

# Create database tables (handled by app startup)
# Tables are auto-created by create_app() function
```

## Docker Operations
```bash
# Build all images
./build.sh

# Run production stack with auto-updates
./docker-run.sh

# Manual container management
docker network create safework-net
docker run -d --name safework-mysql --network safework-net registry.jclee.me/safework/mysql:latest
docker run -d --name safework-redis --network safework-net registry.jclee.me/safework/redis:latest  
docker run -d --name safework-app --network safework-net -p 4545:4545 registry.jclee.me/safework/app:latest

# Check container status
docker ps | grep safework

# View logs
docker logs safework-app
docker logs safework-mysql
docker logs safework-redis
```

## Registry Operations
```bash
# Login to private registry
docker login registry.jclee.me -u admin -p bingogo1

# Push images after build
docker push registry.jclee.me/safework/app:latest
docker push registry.jclee.me/safework/mysql:latest
docker push registry.jclee.me/safework/redis:latest

# Pull latest images
docker pull registry.jclee.me/safework/app:latest
```

## Local Development
```bash
# Run Flask development server (requires MySQL/Redis)
cd app
export FLASK_CONFIG=development
export MYSQL_HOST=localhost
export REDIS_HOST=localhost
python app.py

# Run with specific config
FLASK_CONFIG=development python app.py
```

## Health & Monitoring
```bash
# Check application health
curl http://localhost:4545/health

# View application logs
docker logs safework-app -f

# Monitor Watchtower updates
docker logs safework-watchtower
```

## Git & Deployment
```bash
# Development workflow
git add .
git commit -m "feat: your changes"
git push origin develop

# Production deployment (triggers CI/CD)
git checkout main
git merge develop
git push origin main

# Manual version tag
git tag v1.0.3
git push --tags
```

## Useful System Commands (Linux)
```bash
# Process management
ps aux | grep python
ps aux | grep docker

# Port checking
netstat -tulpn | grep :4545
ss -tulpn | grep :4545

# Disk usage
df -h
du -sh /var/lib/docker

# System monitoring
top
htop
docker stats
```

## Environment Variables (Development)
```bash
export FLASK_CONFIG=development
export MYSQL_HOST=localhost
export MYSQL_PORT=3306
export REDIS_HOST=localhost
export REDIS_PORT=6379
export SECRET_KEY=dev-secret-key
```