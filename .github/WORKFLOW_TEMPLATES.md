# 🤖 Claude Code Action Workflow Templates

This directory contains reusable workflow templates for Claude Code Action integration across different use cases. These templates follow best practices from the official Claude Code Action solutions documentation.

## 📋 Available Templates

### 1. `claude-code-action-base.yml` - Base Template
**Purpose:** General-purpose Claude Code Action template for basic analysis and assistance.

**Key Features:**
- Flexible action type configuration
- Customizable target files
- Adjustable temperature settings
- Comprehensive output format requirements
- Quality metrics enforcement

**Usage:**
```yaml
uses: ./.github/workflow-templates/claude-code-action-base.yml
with:
  action_type: 'analyze'
  target_files: 'app/**/*.py'
  temperature: '0.1'
  timeout_minutes: 30
```

**Best For:**
- General code analysis
- Issue investigation
- Code review assistance
- Development support

### 2. `claude-security-audit.yml` - Security Audit Template
**Purpose:** Specialized security analysis and vulnerability assessment.

**Key Features:**
- Comprehensive security scope options
- Severity threshold configuration
- CVSS scoring integration
- Security advisory creation
- Vulnerability remediation guidance

**Usage:**
```yaml
uses: ./.github/workflow-templates/claude-security-audit.yml
with:
  audit_scope: 'full'
  severity_threshold: 'medium'
```

**Security Analysis Areas:**
- Code security review (SQL injection, XSS, CSRF)
- Dependency vulnerability scanning
- Infrastructure security assessment
- Configuration security validation

### 3. `claude-performance-optimization.yml` - Performance Template
**Purpose:** Performance analysis and optimization recommendations.

**Key Features:**
- Targeted optimization areas
- Performance threshold configuration
- Measurable improvement metrics
- Resource utilization analysis
- Scaling recommendations

**Usage:**
```yaml
uses: ./.github/workflow-templates/claude-performance-optimization.yml
with:
  optimization_target: 'database'
  performance_threshold: '200ms'
```

**Performance Analysis Areas:**
- Database query optimization
- Application performance bottlenecks
- Frontend asset optimization
- Infrastructure scaling strategies

## 🏗️ Template Architecture

### Common Features Across All Templates
1. **Concurrency Control:** Prevents duplicate workflow execution
2. **Flexible Configuration:** Input parameters for customization
3. **Comprehensive Permissions:** Appropriate GitHub permissions
4. **Quality Standards:** Enforced output format and metrics
5. **Success Criteria:** Clear deliverable expectations

### Advanced Claude Integration
- **Enhanced Tool Permissions:** Comprehensive MCP tool access
- **Context Injection:** Rich repository and event metadata
- **Quality Metrics:** Measurable success criteria
- **Output Standards:** Consistent format requirements

## 🚀 Implementation Guidelines

### 1. Template Selection
Choose the appropriate template based on your use case:
- **General analysis:** Use `claude-code-action-base.yml`
- **Security focus:** Use `claude-security-audit.yml`
- **Performance focus:** Use `claude-performance-optimization.yml`

### 2. Customization
Customize templates by:
- Adjusting input parameters
- Modifying tool permissions
- Adding project-specific context
- Extending prompt engineering

### 3. Integration Examples

#### Basic Integration
```yaml
name: Code Analysis
on: [push, pull_request]
jobs:
  analyze:
    uses: ./.github/workflow-templates/claude-code-action-base.yml
    secrets: inherit
    with:
      action_type: 'review'
```

#### Security Audit Integration
```yaml
name: Security Audit
on:
  schedule:
    - cron: '0 2 * * 1'  # Weekly Monday 2 AM
jobs:
  security:
    uses: ./.github/workflow-templates/claude-security-audit.yml
    secrets: inherit
    with:
      audit_scope: 'full'
      severity_threshold: 'high'
```

#### Performance Optimization Integration
```yaml
name: Performance Check
on:
  workflow_dispatch:
    inputs:
      target:
        required: true
        type: choice
        options: ['database', 'frontend', 'backend']
jobs:
  optimize:
    uses: ./.github/workflow-templates/claude-performance-optimization.yml
    secrets: inherit
    with:
      optimization_target: ${{ inputs.target }}
      performance_threshold: '300ms'
```

## 🔧 Configuration Requirements

### Required Secrets
All templates require the following GitHub secret:
- `CLAUDE_CODE_OAUTH_TOKEN`: Claude Code Action authentication token

### Permissions
Templates automatically configure appropriate permissions:
- **Base Template:** General repository access with write permissions
- **Security Template:** Security events and advisory creation
- **Performance Template:** Code modification and issue creation

## 📊 Quality Standards

### Output Format Requirements
All templates enforce consistent output standards:
- Specific file paths and line numbers
- Working code examples with context
- Validation steps and test commands
- GitHub-flavored Markdown formatting
- Clear headings and organization

### Success Criteria
Each template defines measurable success criteria:
- **Base:** Comprehensive analysis with actionable recommendations
- **Security:** Vulnerability identification with remediation steps
- **Performance:** Bottleneck analysis with optimization solutions

## 🔄 Best Practices

### 1. Template Maintenance
- Regular updates based on Claude Code Action improvements
- Version tracking for template changes
- Testing with different repository types

### 2. Monitoring and Optimization
- Track template usage and effectiveness
- Collect feedback for improvement opportunities
- Monitor execution times and resource usage

### 3. Security Considerations
- Regular review of tool permissions
- Validation of output sensitivity
- Proper secret management

## 📈 Advanced Features

### Context Enhancement
Templates include rich context injection:
- Repository metadata
- Event-specific information
- Branch and commit details
- Pull request and issue context

### Tool Integration
Comprehensive MCP tool access:
- `mcp__serena__*`: Complete codebase control
- `mcp__github__*`: GitHub API integration
- `mcp__sequential-thinking__*`: Complex reasoning
- `mcp__memory__*`: Pattern learning
- `mcp__eslint__*`: Code quality enforcement

### Adaptive Behavior
Templates adapt based on:
- Event type (push, PR, issue, etc.)
- Repository structure
- Previous analysis results
- User feedback patterns

## 🎯 Future Enhancements

### Planned Improvements
1. **Multi-language Support:** Templates for different programming languages
2. **Integration Templates:** Specific CI/CD pipeline integration
3. **Monitoring Templates:** Operational health and metrics analysis
4. **Documentation Templates:** Automated documentation generation

### Experimental Features
- **Adaptive Learning:** Templates that improve based on usage patterns
- **Cross-repository Analysis:** Templates for organization-wide insights
- **Real-time Collaboration:** Templates for live development assistance

---

For more information on Claude Code Action best practices, see the [official solutions documentation](https://github.com/anthropics/claude-code-action/blob/main/docs/solutions.md).