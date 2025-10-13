# SafeWork Cloudflare Native - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites

- Node.js 18+ installed
- Cloudflare account with Workers enabled
- Wrangler CLI (`npm install -g wrangler`)

### Step 1: Setup Cloudflare Resources

Run the automated setup script:

```bash
cd workers
./scripts/setup-cloudflare-native.sh
```

This will:
- ✅ Create R2 buckets (prod + preview)
- ✅ Create Queues (jobs + DLQ)
- ✅ Initialize D1 database
- ✅ Apply database schema
- ✅ Build TypeScript code
- ✅ Deploy to production (optional)

### Step 2: Verify Deployment

```bash
# Check health
curl https://safework.jclee.me/api/native/native/health
```

### Step 3: Test Features

#### Upload File
```bash
curl -X POST https://safework.jclee.me/api/native/files/upload \
  -F "file=@test.xlsx" \
  -F "category=excel"
```

#### Queue Export Job
```bash
curl -X POST https://safework.jclee.me/api/native/jobs/export \
  -H "Content-Type: application/json" \
  -d '{"formType":"001_*","format":"csv"}'
```

#### AI Validation
```bash
curl -X POST https://safework.jclee.me/api/native/ai/validate \
  -H "Content-Type: application/json" \
  -d '{"formType":"001_*","data":{}}'
```

## Next Steps

1. ✅ Complete setup
2. ✅ Test all endpoints
3. ✅ Monitor logs: `npx wrangler tail`
4. 📖 Read full docs: `CLOUDFLARE-NATIVE.md`

---

**Ready to go native?** Run `./scripts/setup-cloudflare-native.sh` now! 🚀
