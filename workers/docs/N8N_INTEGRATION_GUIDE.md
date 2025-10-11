# SafeWork n8n Workflow Integration Guide

**Generated**: 2025-10-11
**Purpose**: Automate SafeWork survey workflows using n8n
**Status**: Implementation Ready

---

## 🎯 Overview

This guide provides n8n workflow configurations for automating SafeWork occupational health survey operations.

### Key Use Cases

1. **Survey Submission Automation**: Webhook → Validation → Storage → Notification
2. **Daily Analytics Reports**: Scheduled workflow to aggregate survey data
3. **Multi-Channel Notifications**: Alert admin on high-risk survey responses
4. **Data Export Pipeline**: Automated Excel report generation
5. **Health Check Monitoring**: Monitor SafeWork service health

---

## 📊 Workflow 1: Survey Submission Automation

### Workflow Purpose
Receive survey submissions via webhook, validate, store in D1, and notify admins.

### Nodes Required
1. **Webhook Trigger** (nodes-base.webhook)
2. **Code Node** (nodes-base.code) - Validation logic
3. **HTTP Request** (nodes-base.httpRequest) - POST to SafeWork API
4. **Conditional** (nodes-base.if) - Risk assessment
5. **Gmail/Slack** (nodes-base.gmail or nodes-base.slack) - Notifications

### Configuration

#### 1. Webhook Trigger
```json
{
  "httpMethod": "POST",
  "path": "safework-survey-submit",
  "responseMode": "responseNode",
  "authentication": "headerAuth"
}
```

**Webhook URL**: `https://your-n8n-instance.com/webhook/safework-survey-submit`

#### 2. Validation Code Node (JavaScript)
```javascript
// Input: $input.all() contains webhook payload
const surveys = $input.all();
const validated = [];

for (const survey of surveys) {
  const data = survey.json;

  // Validate required fields
  if (!data.form_type || !data.name || !data.company_id) {
    throw new Error('Missing required fields');
  }

  // Calculate risk score for musculoskeletal surveys
  let riskScore = 0;
  if (data.form_type === '001_musculoskeletal_symptom_survey') {
    const responses = data.responses || {};
    // Count "yes" responses for symptoms
    riskScore = Object.values(responses).filter(v => v === 'yes').length;
  }

  validated.push({
    ...data,
    risk_score: riskScore,
    risk_level: riskScore >= 5 ? 'high' : riskScore >= 3 ? 'medium' : 'low',
    validated_at: new Date().toISOString()
  });
}

return validated;
```

#### 3. HTTP Request to SafeWork API
```json
{
  "method": "POST",
  "url": "https://safework.jclee.me/api/survey/d1/submit",
  "authentication": "none",
  "sendBody": true,
  "bodyParameters": {
    "parameters": [
      {
        "name": "form_type",
        "value": "={{ $json.form_type }}"
      },
      {
        "name": "name",
        "value": "={{ $json.name }}"
      },
      {
        "name": "company_id",
        "value": "={{ $json.company_id }}"
      },
      {
        "name": "process_id",
        "value": "={{ $json.process_id }}"
      },
      {
        "name": "role_id",
        "value": "={{ $json.role_id }}"
      },
      {
        "name": "responses",
        "value": "={{ $json.responses }}"
      }
    ]
  },
  "options": {
    "timeout": 10000
  }
}
```

#### 4. Risk Assessment Conditional
```json
{
  "conditions": {
    "string": [
      {
        "value1": "={{ $json.risk_level }}",
        "operation": "equals",
        "value2": "high"
      }
    ]
  }
}
```

#### 5. Slack Notification (High Risk Alert)
```json
{
  "resource": "message",
  "operation": "post",
  "channel": "#safework-alerts",
  "text": "🚨 High-risk survey detected!\n\nName: {{ $json.name }}\nForm: {{ $json.form_type }}\nRisk Score: {{ $json.risk_score }}\n\nView details: https://safework.jclee.me/admin",
  "attachments": []
}
```

---

## 📈 Workflow 2: Daily Analytics Report

### Workflow Purpose
Generate daily summary of survey submissions and email to admin.

### Nodes Required
1. **Cron Trigger** (nodes-base.cron)
2. **HTTP Request** (nodes-base.httpRequest) - GET statistics
3. **Code Node** (nodes-base.code) - Format report
4. **Gmail** (nodes-base.gmail) - Send email

### Configuration

#### 1. Cron Trigger
```json
{
  "triggerTimes": {
    "mode": "everyDay",
    "hour": 9,
    "minute": 0
  }
}
```

#### 2. Get Statistics HTTP Request
```json
{
  "method": "GET",
  "url": "https://safework.jclee.me/api/survey/d1/stats",
  "authentication": "none"
}
```

#### 3. Format Report Code Node
```javascript
const stats = $input.first().json;

const report = `
# SafeWork Daily Report
**Date**: ${new Date().toLocaleDateString('ko-KR')}

## Summary
- Total Surveys: ${stats.data?.total_surveys || 0}
- Today's Submissions: ${stats.data?.today_count || 0}
- Pending Reviews: ${stats.data?.pending_count || 0}

## By Form Type
${Object.entries(stats.data?.by_form_type || {}).map(([form, count]) =>
  `- ${form}: ${count}`
).join('\n')}

## Action Required
${stats.data?.high_risk_count > 0 ?
  `⚠️ ${stats.data.high_risk_count} high-risk surveys require immediate attention` :
  '✅ No urgent actions required'}

View full dashboard: https://safework.jclee.me/admin
`;

return [{ json: { report } }];
```

#### 4. Gmail Send
```json
{
  "sendTo": "admin@company.com",
  "subject": "SafeWork Daily Report - {{ $now.format('YYYY-MM-DD') }}",
  "message": "={{ $json.report }}",
  "options": {
    "format": "text"
  }
}
```

---

## 🔍 Workflow 3: Health Monitoring

### Workflow Purpose
Monitor SafeWork services every 5 minutes and alert on failures.

### Nodes Required
1. **Cron Trigger** (nodes-base.cron) - Every 5 minutes
2. **HTTP Request** (nodes-base.httpRequest) - Health check
3. **Conditional** (nodes-base.if) - Check status
4. **Slack** (nodes-base.slack) - Alert on failure

### Configuration

#### 1. Cron Trigger
```json
{
  "triggerTimes": {
    "mode": "everyX",
    "value": 5,
    "unit": "minutes"
  }
}
```

#### 2. Health Check HTTP Request
```json
{
  "method": "GET",
  "url": "https://safework.jclee.me/api/native/native/health",
  "authentication": "none",
  "options": {
    "timeout": 5000
  }
}
```

#### 3. Status Check Conditional
```json
{
  "conditions": {
    "boolean": [
      {
        "value1": "={{ $json.success }}",
        "operation": "notEqual",
        "value2": true
      }
    ]
  }
}
```

#### 4. Slack Alert
```json
{
  "resource": "message",
  "operation": "post",
  "channel": "#safework-monitoring",
  "text": "🔴 SafeWork Health Check Failed!\n\nTimestamp: {{ $now.format('YYYY-MM-DD HH:mm:ss') }}\nStatus: {{ $json.status }}\n\nServices:\n- D1: {{ $json.services.d1.status }}\n- KV: {{ $json.services.kv.status }}\n- R2: {{ $json.services.r2.status }}\n- AI: {{ $json.services.ai.status }}"
}
```

---

## 🔧 Workflow 4: Excel Export Pipeline

### Workflow Purpose
Export survey data to Excel on demand via webhook.

### Nodes Required
1. **Webhook Trigger** (nodes-base.webhook)
2. **HTTP Request** (nodes-base.httpRequest) - GET survey data
3. **Code Node** (nodes-base.code) - Transform to Excel format
4. **HTTP Request** (nodes-base.httpRequest) - POST to SafeWork Excel API
5. **Webhook Response** (nodes-base.respondToWebhook)

### Configuration

#### 1. Webhook Trigger
```json
{
  "httpMethod": "POST",
  "path": "safework-export",
  "responseMode": "responseNode"
}
```

#### 2. Get Survey Data
```json
{
  "method": "GET",
  "url": "https://safework.jclee.me/api/survey/d1/responses/{{ $json.form_type }}",
  "qs": {
    "limit": "1000"
  }
}
```

#### 3. Transform to Excel Format
```javascript
const surveys = $input.first().json.data || [];

// Transform to Excel-friendly format
const excelData = surveys.map(survey => ({
  'Survey ID': survey.id,
  'Name': survey.name,
  'Company': survey.company_name,
  'Process': survey.process_name,
  'Role': survey.role_name,
  'Submitted': new Date(survey.created_at).toLocaleDateString('ko-KR'),
  'Status': survey.status,
  // Add more fields as needed
}));

return [{ json: { data: excelData } }];
```

#### 4. Send to Excel Processor
```json
{
  "method": "POST",
  "url": "https://safework.jclee.me/api/excel/process",
  "sendBody": true,
  "bodyParameters": {
    "parameters": [
      {
        "name": "data",
        "value": "={{ $json.data }}"
      },
      {
        "name": "format",
        "value": "xlsx"
      }
    ]
  }
}
```

---

## 🚀 Deployment Instructions

### Prerequisites

1. **n8n Instance**: Self-hosted or n8n Cloud
2. **SafeWork Credentials**: API endpoint URLs
3. **Notification Services**: Gmail/Slack credentials

### Step-by-Step Setup

#### 1. Install n8n (if self-hosting)
```bash
docker run -d --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

#### 2. Import Workflows
- Navigate to n8n UI (http://localhost:5678)
- Click "Workflows" → "Import from File"
- Import each workflow JSON

#### 3. Configure Credentials
- **HTTP Request nodes**: No authentication needed for SafeWork public endpoints
- **Gmail**: Add Gmail OAuth2 credentials
- **Slack**: Add Slack OAuth2 credentials

#### 4. Test Workflows
```bash
# Test survey submission
curl -X POST https://your-n8n.com/webhook/safework-survey-submit \
  -H "Content-Type: application/json" \
  -d '{
    "form_type": "001_musculoskeletal_symptom_survey",
    "name": "Test User",
    "company_id": 1,
    "process_id": 1,
    "role_id": 1,
    "responses": {"q1": "yes", "q2": "no"}
  }'

# Check workflow execution logs in n8n UI
```

#### 5. Activate Workflows
- Click each workflow → "Active" toggle

---

## 📊 Monitoring & Maintenance

### Grafana Integration
Add n8n metrics to Grafana dashboard:

```yaml
- job_name: 'n8n-workflows'
  static_configs:
    - targets: ['n8n:5678']
  metrics_path: '/metrics'
```

### Key Metrics to Monitor
- Workflow execution count
- Execution duration
- Error rate
- Webhook response time

### Troubleshooting

**Webhook not receiving data**:
- Check n8n webhook URL is publicly accessible
- Verify CORS settings in SafeWork
- Check n8n logs: `docker logs n8n`

**HTTP Request failures**:
- Verify SafeWork API endpoints are accessible
- Check timeout settings (increase if needed)
- Review error logs in n8n execution details

**Notification failures**:
- Re-authenticate Gmail/Slack credentials
- Check API rate limits
- Verify channel names/email addresses

---

## 🔗 SafeWork API Endpoints Reference

### Survey APIs
- **Submit**: `POST /api/survey/d1/submit`
- **Get Responses**: `GET /api/survey/d1/responses/:formType`
- **Statistics**: `GET /api/survey/d1/stats`
- **Daily Stats**: `GET /api/survey/d1/stats/daily`

### Health Check
- **General**: `GET /api/health`
- **Native Services**: `GET /api/native/native/health`

### Admin
- **Dashboard**: `GET /admin-unified`
- **Form 002 Admin**: `GET /admin-002`

---

## 📈 Advanced Workflows (Future Enhancement)

### 1. AI-Powered Risk Analysis
- Use Cloudflare AI (Llama 3) to analyze survey text responses
- Detect patterns in symptom descriptions
- Generate risk assessment reports

### 2. Multi-Form Aggregation
- Combine data from Forms 001-006
- Create comprehensive worker health profiles
- Identify cross-functional risk factors

### 3. Predictive Analytics
- Time-series analysis of survey trends
- Predict high-risk periods
- Recommend preventive actions

### 4. Compliance Reporting
- Automated OSHA compliance reports
- Korean labor law documentation
- Audit trail generation

---

## 🎓 n8n Resources

- **Official Docs**: https://docs.n8n.io
- **Node Reference**: https://docs.n8n.io/integrations/builtin/core-nodes/
- **Community Forum**: https://community.n8n.io
- **Template Library**: https://n8n.io/workflows

---

## ✅ Completion Checklist

- [ ] n8n instance deployed and accessible
- [ ] Workflow 1: Survey Submission Automation - Imported & Tested
- [ ] Workflow 2: Daily Analytics Report - Imported & Scheduled
- [ ] Workflow 3: Health Monitoring - Imported & Active
- [ ] Workflow 4: Excel Export Pipeline - Imported & Tested
- [ ] Gmail/Slack credentials configured
- [ ] Webhook URLs added to SafeWork frontend
- [ ] Grafana monitoring configured
- [ ] Documentation shared with team

---

**Status**: ✅ Ready for Implementation
**Estimated Setup Time**: 2-3 hours
**Maintenance**: Low (periodic credential refresh)
**Impact**: High (significant automation gains)
