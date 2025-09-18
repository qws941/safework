# GitHub Repository Rules for SafeWork Project

## Branch Protection Rules

### Master Branch Protection
- **Required status checks**: 
  - Independent Build (app, mysql, redis)
  - Security Scan (Trivy, Bandit)
  - Code Quality (ESLint, Pylint, Black)
  - Test Suite (pytest coverage > 80%)
- **Require pull request reviews**: Yes (1 reviewer minimum)
- **Dismiss stale reviews**: Yes
- **Require review from code owners**: Yes
- **Restrict pushes**: Admins only for emergency hotfixes
- **Allow force pushes**: No
- **Allow deletions**: No

### Development Branch Strategy
- **Feature branches**: `feature/*`
- **Hotfix branches**: `hotfix/*`
- **Release branches**: `release/*`
- **Development branch**: `develop` (optional)

## Repository Rules

### File Structure Enforcement
```yaml
# Root Directory Restrictions (GitHub Repository Rules)
allowed_root_files:
  - CLAUDE.md
  - README.md
  - .gitignore
  - .github/

prohibited_root_patterns:
  - "*.txt"
  - "*.md" (except README.md, CLAUDE.md)
  - "Dockerfile"
  - "docker-compose*.yml"
  - "*backup*"
  - "*.bak"
  - "*-v2*"
  - "*-copy*"
  - "*-old*"

required_service_structure:
  - app/
    - Dockerfile
    - .dockerignore
    - requirements.txt
    - app.py
  - mysql/
    - Dockerfile
    - .dockerignore
    - init.sql (optional)
  - redis/
    - Dockerfile
    - .dockerignore
    - redis.conf (optional)
```

### Automated Quality Gates

#### Security Requirements
- **Secret scanning**: Enabled
- **Dependency scanning**: Enabled (Dependabot)
- **Code scanning**: Enabled (CodeQL + Bandit)
- **Vulnerability alerts**: Enabled
- **Security policy**: SECURITY.md required

#### Code Quality Standards
- **Python Code Quality**:
  - Black formatting enforced
  - Flake8 linting (max line length: 88)
  - Pylint score > 8.0
  - Type hints recommended (mypy)
  
- **Test Coverage Requirements**:
  - Minimum coverage: 80%
  - Coverage report required in PRs
  - Critical path coverage: 95%
  
- **Documentation Standards**:
  - All public functions documented
  - API endpoints documented
  - Database schema documented

#### Container Standards
- **Dockerfile Requirements**:
  - Non-root user required
  - Health checks mandatory
  - Multi-stage builds recommended
  - Minimal base images (Alpine/slim)
  
- **Build Requirements**:
  - Independent container builds
  - No docker-compose dependency
  - Watchtower labels required
  - Registry push on merge to master

### Workflow Integration Rules

#### Required Workflows
1. **Independent Build** (`independent-build.yml`)
   - Matrix build for app, mysql, redis
   - Push to registry.jclee.me
   - Health check validation

2. **Security Scan** (integrated in CI)
   - Trivy container scanning
   - Bandit Python security scan
   - Safety dependency check

3. **Claude Code Integration** (`claude.yml`)
   - Automated issue analysis
   - PR review assistance
   - Deployment result analysis

4. **Operational Monitoring** (`operational-log-analysis.yml`)
   - Portainer API log collection
   - Performance analysis
   - Security monitoring

#### Deployment Rules
- **Production Deployment**:
  - Only from master branch
  - Required PR review and approval
  - All status checks must pass
  - Automatic Watchtower deployment
  
- **Development Deployment**:
  - Feature branch to develop
  - Automated testing required
  - Manual deployment trigger available

### Issue and PR Templates

#### Issue Templates
- **Bug Report**: Standard bug reporting template
- **Feature Request**: New feature proposal template
- **Security Issue**: Security vulnerability reporting
- **Performance Issue**: Performance problem reporting

#### PR Template Requirements
- **Description**: Clear description of changes
- **Testing**: Test coverage and validation steps
- **Security**: Security impact assessment
- **Breaking Changes**: Compatibility impact
- **Deployment**: Deployment considerations

### Automation Rules

#### Auto-merge Conditions
- **Dependabot PRs**: Auto-merge for patch updates
- **Documentation PRs**: Auto-merge for non-breaking docs
- **CI Fixes**: Auto-merge for CI configuration fixes

#### Auto-labeling Rules
- `security`: PRs affecting security components
- `performance`: Performance-related changes
- `documentation`: Documentation updates
- `dependencies`: Dependency updates
- `hotfix`: Critical fixes requiring fast-track

### Compliance Requirements

#### Audit Trail
- All changes tracked via Git history
- PR reviews documented
- Deployment history maintained
- Security scan results archived

#### Access Control
- **Admin Access**: Limited to core maintainers
- **Write Access**: Approved contributors only
- **Read Access**: Public (open source)
- **Secret Access**: GitHub Secrets for CI/CD only

#### Data Protection
- **Personal Data**: Health survey data protection
- **Credentials**: No hardcoded secrets
- **API Keys**: GitHub Secrets only
- **Database**: Production data protection

## Implementation Checklist

### Repository Settings
- [ ] Enable branch protection on master
- [ ] Configure required status checks
- [ ] Set up auto-merge rules
- [ ] Enable security scanning
- [ ] Configure Dependabot

### Workflow Configuration
- [ ] Update all workflow files with new rules
- [ ] Add status check requirements
- [ ] Configure matrix builds
- [ ] Set up deployment automation
- [ ] Enable monitoring workflows

### Documentation Updates
- [ ] Update README.md with new structure
- [ ] Create SECURITY.md policy
- [ ] Document API endpoints
- [ ] Update deployment guides
- [ ] Create troubleshooting docs

### Testing and Validation
- [ ] Test independent container builds
- [ ] Validate Watchtower deployment
- [ ] Test Portainer API integration
- [ ] Verify security scanning
- [ ] Validate monitoring workflows