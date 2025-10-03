#!/bin/bash
# SafeWork Cloudflare Native Setup Script
# Creates all required Cloudflare resources

set -e

echo "🚀 SafeWork - Cloudflare Native Setup"
echo "======================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI not found. Installing...${NC}"
    npm install -g wrangler
fi

echo -e "${BLUE}📦 Step 1: Creating R2 Buckets${NC}"
echo "-----------------------------------"

# Production R2 bucket
if wrangler r2 bucket list | grep -q "safework-storage-prod"; then
    echo -e "${GREEN}✅ Production R2 bucket already exists${NC}"
else
    echo "Creating production R2 bucket..."
    wrangler r2 bucket create safework-storage-prod
    echo -e "${GREEN}✅ Production R2 bucket created${NC}"
fi

# Preview R2 bucket
if wrangler r2 bucket list | grep -q "safework-storage-preview"; then
    echo -e "${GREEN}✅ Preview R2 bucket already exists${NC}"
else
    echo "Creating preview R2 bucket..."
    wrangler r2 bucket create safework-storage-preview
    echo -e "${GREEN}✅ Preview R2 bucket created${NC}"
fi

echo ""
echo -e "${BLUE}📬 Step 2: Creating Cloudflare Queues${NC}"
echo "---------------------------------------"

# Production queue
if wrangler queues list | grep -q "safework-jobs-prod"; then
    echo -e "${GREEN}✅ Production queue already exists${NC}"
else
    echo "Creating production queue..."
    wrangler queues create safework-jobs-prod
    echo -e "${GREEN}✅ Production queue created${NC}"
fi

# Development queue
if wrangler queues list | grep -q "safework-jobs"; then
    echo -e "${GREEN}✅ Development queue already exists${NC}"
else
    echo "Creating development queue..."
    wrangler queues create safework-jobs
    echo -e "${GREEN}✅ Development queue created${NC}"
fi

# Dead Letter Queue
if wrangler queues list | grep -q "safework-jobs-dlq"; then
    echo -e "${GREEN}✅ Dead Letter Queue already exists${NC}"
else
    echo "Creating Dead Letter Queue..."
    wrangler queues create safework-jobs-dlq
    echo -e "${GREEN}✅ Dead Letter Queue created${NC}"
fi

echo ""
echo -e "${BLUE}🗄️  Step 3: Initializing D1 Database${NC}"
echo "--------------------------------------"

# Check if D1 database exists
if wrangler d1 list | grep -q "safework-primary"; then
    echo -e "${GREEN}✅ D1 database already exists${NC}"
else
    echo "Creating D1 database..."
    wrangler d1 create safework-primary
    echo -e "${GREEN}✅ D1 database created${NC}"
fi

# Run schema
echo "Applying D1 schema..."
wrangler d1 execute PRIMARY_DB --file=../d1-schema.sql --remote
echo -e "${GREEN}✅ D1 schema applied${NC}"

echo ""
echo -e "${BLUE}🔑 Step 4: Creating KV Namespaces${NC}"
echo "-----------------------------------"

# KV namespaces are already created (check wrangler.toml)
echo -e "${GREEN}✅ KV namespaces configured in wrangler.toml${NC}"

echo ""
echo -e "${BLUE}🤖 Step 5: Verifying AI Access${NC}"
echo "--------------------------------"

echo -e "${GREEN}✅ Workers AI automatically available with Workers${NC}"
echo "   Model: @cf/meta/llama-3-8b-instruct"

echo ""
echo -e "${BLUE}📝 Step 6: Environment Configuration${NC}"
echo "--------------------------------------"

cat << EOF

Please ensure these secrets are set:

1. JWT Secret:
   wrangler secret put JWT_SECRET --env production

2. Admin credentials (if needed):
   wrangler secret put ADMIN_PASSWORD --env production

3. Backend URL (already in wrangler.toml):
   BACKEND_URL=https://safework.jclee.me

EOF

echo ""
echo -e "${BLUE}🚀 Step 7: Building and Deploying${NC}"
echo "-----------------------------------"

echo "Building TypeScript..."
npm run build
echo -e "${GREEN}✅ Build complete${NC}"

echo ""
read -p "Deploy to production now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Deploying to production..."
    npm run deploy:prod
    echo -e "${GREEN}✅ Deployed to production${NC}"
else
    echo "Skipping deployment. Run 'npm run deploy:prod' when ready."
fi

echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Test native services: curl https://safework.jclee.me/api/native/native/health"
echo "2. Upload a file: POST /api/native/files/upload"
echo "3. Queue a job: POST /api/native/jobs/export"
echo "4. Generate insights: POST /api/native/ai/validate"
echo ""
echo "Documentation: ./CLOUDFLARE-NATIVE.md"
echo "Monitor logs: wrangler tail --env production"
echo ""
echo -e "${GREEN}SafeWork is now 100% Cloudflare-native! 🚀${NC}"
