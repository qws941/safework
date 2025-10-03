# SafeWork - Cloudflare Native Architecture

## Overview

SafeWork is now **100% Cloudflare-native**, leveraging the full power of the Cloudflare Workers ecosystem:

- **Workers (Hono.js)** - Edge HTTP request handling
- **D1 Database** - Serverless SQL database
- **KV Storage** - 4 namespaces for different data types
- **R2 Object Storage** - File storage and exports
- **Queues** - Background job processing
- **Workers AI** - Intelligent form validation and insights
- **AI Gateway** - LLM access at the edge

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                  Cloudflare Edge                    │
│                                                     │
│  ┌──────────────┐      ┌──────────────┐           │
│  │   Workers    │      │  Workers AI  │           │
│  │  (Hono.js)   │◄────►│   (Llama 3)  │           │
│  └──────┬───────┘      └──────────────┘           │
│         │                                          │
│         ▼                                          │
│  ┌──────────────────────────────────────────┐     │
│  │          4 KV Namespaces                 │     │
│  │  • SAFEWORK_KV    • SESSION_STORE       │     │
│  │  • CACHE_LAYER    • AUTH_STORE          │     │
│  └──────────────────────────────────────────┘     │
│                                                     │
│  ┌──────────────┐      ┌──────────────┐           │
│  │ D1 Database  │      │  R2 Storage  │           │
│  │  (SQLite)    │      │   (Files)    │           │
│  └──────────────┘      └──────────────┘           │
│                                                     │
│  ┌──────────────────────────────────────────┐     │
│  │         Cloudflare Queues                │     │
│  │  Producer ──► Queue ──► Consumer         │     │
│  └──────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────┘
```

## Native Services

### 1. D1 Database (SQLite)

**Binding:** `PRIMARY_DB`
**Database ID:** `d1db1d92-f598-415e-910f-1af511bc182f`

Tables:
- `users` - User accounts and authentication
- `companies` - Company master data
- `processes` - Process master data
- `roles` - Role master data
- `surveys` - All survey submissions (JSON storage)
- `survey_statistics` - Aggregated statistics
- `audit_logs` - Audit trail

**Schema:** `workers/d1-schema.sql`

### 2. KV Namespaces

| Binding | Purpose | Use Cases |
|---------|---------|-----------|
| `SAFEWORK_KV` | Primary storage | Form structures, session data, API config |
| `SESSION_STORE` | User sessions | JWT tokens, user sessions |
| `CACHE_LAYER` | Computed data | Statistics, temp responses, cached queries |
| `AUTH_STORE` | Authentication | API keys, tokens, auth state |

### 3. R2 Object Storage

**Binding:** `SAFEWORK_STORAGE`
**Bucket:** `safework-storage-prod`

Storage structure:
```
/uploads/
  /excel/          - Original Excel survey forms
  /document/       - Documents and attachments
  /attachment/     - User-uploaded attachments

/exports/
  /001_*/          - Form 001 exports (CSV, XLSX)
  /002_*/          - Form 002 exports

/reports/
  /daily/          - Daily reports
  /weekly/         - Weekly reports
  /monthly/        - Monthly reports
```

**Service:** `src/services/r2-storage.ts`

### 4. Cloudflare Queues

**Binding:** `SAFEWORK_QUEUE`
**Queue:** `safework-jobs-prod`

Job types:
- `export` - Excel/CSV export generation
- `report` - AI-powered report generation
- `notification` - Email/SMS notifications
- `analysis` - Statistical analysis and insights
- `cleanup` - Old file cleanup

**Handler:** `src/queue-handler.ts`
**Processor:** `src/services/queue-processor.ts`

### 5. Workers AI

**Binding:** `AI`
**Model:** `@cf/meta/llama-3-8b-instruct`

Capabilities:
- **Form Validation** - Intelligent survey data validation
- **Health Insights** - Symptom analysis and risk assessment
- **Anomaly Detection** - Detect unusual patterns
- **Report Generation** - AI-powered summary reports

**Service:** `src/services/ai-validator.ts`

## API Endpoints

### Native Services API (`/api/native/*`)

#### File Storage (R2)

```bash
# Upload file
POST /api/native/files/upload
Content-Type: multipart/form-data

# Download file
GET /api/native/files/:key

# List files
GET /api/native/files?prefix=exports/001

# Delete file
DELETE /api/native/files/:key
```

#### Background Jobs (Queue)

```bash
# Queue export job
POST /api/native/jobs/export
{
  "formType": "001_musculoskeletal_symptom_survey",
  "format": "csv",
  "dateRange": { "start": "2024-01-01", "end": "2024-12-31" }
}

# Queue report generation
POST /api/native/jobs/report
{
  "reportType": "monthly",
  "formTypes": ["001_*", "002_*"],
  "period": "2024-10"
}

# Queue analysis job
POST /api/native/jobs/analysis
{
  "formType": "001_*",
  "surveyIds": [1, 2, 3],
  "analysisType": "risk"
}
```

#### AI Services

```bash
# Validate survey with AI
POST /api/native/ai/validate
{
  "formType": "001_musculoskeletal_symptom_survey",
  "data": { ... }
}

# Generate health insights
POST /api/native/ai/health-insights
{
  "symptomsData": { ... }
}

# Detect anomalies
POST /api/native/ai/detect-anomalies
{
  "formType": "001_*",
  "currentData": { ... },
  "historicalData": [ ... ]
}

# Generate AI report
POST /api/native/ai/summary-report
{
  "formType": "001_*",
  "data": [ ... ],
  "period": "2024-10"
}
```

#### Export & Download

```bash
# Export to Excel (generates and stores in R2)
POST /api/native/export/excel
{
  "formType": "001_musculoskeletal_symptom_survey",
  "format": "csv"
}

# Download export
GET /api/native/export/download/:filename
```

#### Health Check

```bash
# Check all native services
GET /api/native/native/health

Response:
{
  "success": true,
  "timestamp": "2024-10-02T...",
  "services": {
    "d1": { "status": "healthy" },
    "kv": { "status": "healthy" },
    "r2": { "status": "healthy" },
    "ai": { "status": "healthy", "model": "@cf/meta/llama-3-8b-instruct" },
    "queue": { "status": "healthy", "binding": "SAFEWORK_QUEUE" }
  }
}
```

## Setup Instructions

### 1. Create R2 Bucket

```bash
# Production
npx wrangler r2 bucket create safework-storage-prod

# Development
npx wrangler r2 bucket create safework-storage-preview
```

### 2. Create Queue

```bash
# Production
npx wrangler queues create safework-jobs-prod
npx wrangler queues create safework-jobs-dlq  # Dead Letter Queue

# Development
npx wrangler queues create safework-jobs
npx wrangler queues create safework-jobs-dlq
```

### 3. Initialize D1 Database

```bash
# Create database (already exists)
npx wrangler d1 create safework-primary

# Run schema
npx wrangler d1 execute PRIMARY_DB --file=./d1-schema.sql --remote
```

### 4. Deploy Worker

```bash
# Development
npm run deploy:dev

# Production
npm run deploy:prod
```

## Development Workflow

### Local Development

```bash
# Start dev server with all bindings
npm run dev

# Access at http://localhost:8787
```

### Testing Native Features

```bash
# Test R2 storage
curl -X POST http://localhost:8787/api/native/files/upload \
  -F "file=@test.xlsx" \
  -F "category=excel"

# Test AI validation
curl -X POST http://localhost:8787/api/native/ai/validate \
  -H "Content-Type: application/json" \
  -d '{"formType":"001_*","data":{}}'

# Test queue job
curl -X POST http://localhost:8787/api/native/jobs/export \
  -H "Content-Type: application/json" \
  -d '{"formType":"001_*","format":"csv"}'

# Check health
curl http://localhost:8787/api/native/native/health
```

### Queue Consumer Testing

Queue messages are processed automatically by the queue consumer.

Monitor queue processing:
```bash
npx wrangler tail --env production
```

## Migration from Flask

### What's Migrated

✅ **D1 Native Routes** (`/api/survey/d1/*`)
- Full survey CRUD operations
- Statistics and analytics
- Master data management

✅ **R2 File Storage**
- Excel file uploads
- Export generation and storage
- Document management

✅ **AI-Powered Features**
- Form validation
- Health insights
- Anomaly detection
- Report generation

✅ **Background Processing**
- Export jobs
- Report generation
- Analysis tasks
- Cleanup operations

### Hybrid Mode (Current)

The system runs in **hybrid mode**:
- Cloudflare Workers handle edge requests
- D1 is the primary database
- R2 stores files
- Queues process background jobs
- AI provides intelligent features
- Flask backend still available at `/backend/*` for legacy support

### Future: 100% Native

To go **100% Cloudflare-native**:
1. ✅ D1 for all database operations (done)
2. ✅ R2 for all file storage (done)
3. ✅ KV for sessions and cache (done)
4. ✅ Queues for background jobs (done)
5. ✅ Workers AI for intelligent features (done)
6. ⏳ Deprecate Flask backend
7. ⏳ Migrate remaining PostgreSQL data to D1

## Performance Benefits

### Edge Performance
- **Latency:** < 50ms globally (Cloudflare's 300+ PoPs)
- **Cold Start:** ~5ms (Workers)
- **Throughput:** 50,000+ req/s per worker

### Cost Efficiency
- **Workers:** $5/month for 10M requests
- **D1:** Free tier: 5GB storage, 100K writes/day
- **KV:** Free tier: 100K reads/day, 1K writes/day
- **R2:** Free tier: 10GB storage, 1M Class A ops/month
- **Queues:** Free tier: 1M messages/month
- **Workers AI:** Pay-per-token (Llama 3: ~$0.0001/request)

**Total Cost:** ~$10-20/month for moderate traffic

### Scalability
- **Auto-scaling:** Automatic global scale
- **Zero maintenance:** Fully managed
- **Geographic distribution:** Automatic edge distribution
- **DDoS protection:** Built-in Cloudflare protection

## Monitoring & Debugging

### Cloudflare Dashboard

1. **Workers Analytics:** Real-time request metrics
2. **D1 Analytics:** Query performance and storage
3. **R2 Analytics:** Storage and bandwidth
4. **Queue Analytics:** Job processing metrics
5. **AI Analytics:** Model usage and latency

### Logs

```bash
# Tail worker logs
npx wrangler tail --env production

# Filter by status
npx wrangler tail --env production --status error

# View queue consumer logs
npx wrangler tail --env production --queue safework-jobs-prod
```

### Debugging

```bash
# Local debugging with breakpoints
npm run dev

# Remote debugging
npx wrangler dev --remote
```

## Best Practices

### 1. D1 Queries
- Use prepared statements (automatic)
- Index frequently queried columns
- Batch operations when possible
- Use transactions for consistency

### 2. KV Operations
- Set appropriate TTLs
- Use metadata for searchability
- Batch writes when possible
- Cache frequently accessed data

### 3. R2 Storage
- Use consistent key naming (prefix-based)
- Set lifecycle policies for old files
- Use custom metadata for filtering
- Stream large files

### 4. Queue Jobs
- Keep messages small (<128KB)
- Use batch processing
- Implement idempotency
- Handle failures gracefully
- Use DLQ for failed messages

### 5. Workers AI
- Cache AI responses in KV
- Use appropriate models for tasks
- Handle rate limits
- Implement fallbacks

## Security

### Authentication
- JWT tokens stored in `AUTH_STORE` KV
- Token rotation every 24 hours
- Secure cookie handling

### Authorization
- Role-based access control (RBAC)
- Admin routes protected
- API key authentication for external access

### Data Protection
- All data encrypted at rest (Cloudflare default)
- TLS 1.3 for all connections
- No sensitive data in logs
- Automatic PII detection (Workers AI)

## Troubleshooting

### Common Issues

**D1 Connection Errors**
```bash
# Re-initialize database
npx wrangler d1 execute PRIMARY_DB --file=./d1-schema.sql --remote
```

**R2 Upload Failures**
```bash
# Check bucket exists
npx wrangler r2 bucket list

# Verify permissions
npx wrangler r2 bucket head safework-storage-prod
```

**Queue Not Processing**
```bash
# Check queue status
npx wrangler queues list

# Monitor consumer
npx wrangler tail --queue safework-jobs-prod
```

**AI Model Errors**
- Check model availability: `@cf/meta/llama-3-8b-instruct`
- Verify account has AI enabled
- Check rate limits

## Support

For issues or questions:
1. Check logs: `npx wrangler tail`
2. Review Cloudflare dashboard
3. Consult docs: https://developers.cloudflare.com/workers

---

**Last Updated:** 2025-10-02
**Architecture Version:** 2.0 - Full Cloudflare Native
