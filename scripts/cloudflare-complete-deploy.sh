#!/bin/bash

# SafeWork Cloudflare Workers - Complete Deployment Script
# Handles AWS → Cloudflare migration with manual steps

set -e

echo "🚀 SafeWork Cloudflare Workers - Complete Deployment"
echo "===================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/jclee/app/safework/workers"
API_TOKEN="tSkF6AcuybaS_SJe2YwTcWv9eeeK0Dao19w76bUT"

echo -e "${YELLOW}📋 Deployment Configuration:${NC}"
echo "   Project: SafeWork2 Workers"
echo "   Directory: $PROJECT_DIR"
echo "   Domain: safework2.jclee.me"
echo ""

# Navigate to workers directory
cd "$PROJECT_DIR"

# Export API token
export CLOUDFLARE_API_TOKEN="$API_TOKEN"

echo -e "${YELLOW}Step 1: Verifying Dependencies${NC}"
echo "==============================="

# Check if wrangler is available
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npm/npx not found. Please install Node.js first.${NC}"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 2: Authentication Check${NC}"
echo "============================="

# Verify API token
VERIFY_RESULT=$(curl -s -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json")

if echo "$VERIFY_RESULT" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ API Token is valid${NC}"
else
    echo -e "${RED}❌ API Token verification failed${NC}"
    echo "$VERIFY_RESULT"
fi

echo ""

echo -e "${YELLOW}Step 3: Manual Configuration Required${NC}"
echo "====================================="
echo ""
echo -e "${BLUE}🔧 You need to manually create the following resources in Cloudflare Dashboard:${NC}"
echo ""

echo "A) Create D1 Database:"
echo "   1. Go to: https://dash.cloudflare.com/d1"
echo "   2. Click 'Create database'"
echo "   3. Name: 'safework-db'"
echo "   4. Copy the database ID"
echo "   5. Update wrangler.toml: database_id = \"YOUR_DATABASE_ID\""
echo ""

echo "B) Create KV Namespace:"
echo "   1. Go to: https://dash.cloudflare.com/kv/namespaces"
echo "   2. Click 'Create namespace'"
echo "   3. Name: 'SAFEWORK_KV'"
echo "   4. Copy the namespace ID"
echo "   5. Update wrangler.toml: id = \"YOUR_NAMESPACE_ID\""
echo ""

echo "C) Set up Database Schema:"
echo "   After creating D1 database, run:"
echo "   npx wrangler d1 execute safework-db --file=schema.sql"
echo ""

echo -e "${YELLOW}Step 4: Configuration Template${NC}"
echo "=============================="
echo ""
echo "Update your wrangler.toml file with the actual IDs:"
echo ""
cat << 'EOF'
[[d1_databases]]
binding = "SAFEWORK_DB"
database_name = "safework-db"
database_id = "YOUR_ACTUAL_D1_DATABASE_ID"

[[kv_namespaces]]
binding = "SAFEWORK_KV"
id = "YOUR_ACTUAL_KV_NAMESPACE_ID"
preview_id = "YOUR_ACTUAL_KV_PREVIEW_ID"
EOF

echo ""

echo -e "${YELLOW}Step 5: Secrets Configuration${NC}"
echo "============================="
echo ""
echo "After manual resource creation, set up secrets:"
echo ""
echo "npx wrangler secret put ADMIN_PASSWORD"
echo "# Enter: safework2024"
echo ""
echo "npx wrangler secret put JWT_SECRET"
echo "# Enter: safework-jwt-secret-2024-production"
echo ""

echo -e "${YELLOW}Step 6: Deployment Commands${NC}"
echo "=========================="
echo ""
echo "After completing manual setup, deploy with:"
echo ""
echo "# Deploy to production"
echo "npx wrangler deploy"
echo ""
echo "# Or deploy to development"
echo "npx wrangler deploy --env development"
echo ""

echo -e "${YELLOW}Step 7: DNS Configuration${NC}"
echo "======================="
echo ""
echo "Configure DNS for safework2.jclee.me:"
echo "1. Go to Cloudflare DNS dashboard"
echo "2. Add CNAME record:"
echo "   - Name: safework2"
echo "   - Target: safework2.workers.dev"
echo "   - Proxy: Enabled (Orange cloud)"
echo ""

echo -e "${YELLOW}Step 8: Health Check & Testing${NC}"
echo "============================="
echo ""
echo "After deployment, test endpoints:"
echo ""
echo "curl https://safework2.jclee.me/"
echo "curl https://safework2.jclee.me/api/health"
echo "curl https://safework2.jclee.me/api/survey/forms"
echo ""

echo -e "${YELLOW}Step 9: Migration Data (Optional)${NC}"
echo "================================"
echo ""
echo "To migrate data from existing PostgreSQL:"
echo "1. Export from PostgreSQL: pg_dump -h localhost -U safework -d safework_db --data-only > safework_data.sql"
echo "2. Convert to SQLite format (manual conversion needed)"
echo "3. Import to D1: npx wrangler d1 execute safework-db --file=safework_data_converted.sql"
echo ""

echo -e "${BLUE}📞 Next Steps:${NC}"
echo ""
echo "1. Complete manual resource creation in Cloudflare Dashboard"
echo "2. Update wrangler.toml with actual IDs"
echo "3. Run: npx wrangler d1 execute safework-db --file=schema.sql"
echo "4. Set secrets: npx wrangler secret put ADMIN_PASSWORD"
echo "5. Deploy: npx wrangler deploy"
echo "6. Configure DNS: safework2.jclee.me → safework2.workers.dev"
echo "7. Test endpoints"
echo ""

echo -e "${GREEN}✅ Deployment guide generated successfully!${NC}"
echo ""
echo -e "${YELLOW}💡 Remember: Due to API token permissions, manual steps are required via Cloudflare Dashboard${NC}"
echo ""

# Check current wrangler.toml status
if grep -q "YOUR_D1_DATABASE_ID_HERE" wrangler.toml; then
    echo -e "${YELLOW}⚠️  wrangler.toml still needs D1 database ID configuration${NC}"
fi

if grep -q "YOUR_KV_NAMESPACE_ID_HERE" wrangler.toml; then
    echo -e "${YELLOW}⚠️  wrangler.toml still needs KV namespace ID configuration${NC}"
fi

echo ""
echo -e "${BLUE}🎯 Ready for manual configuration phase!${NC}"