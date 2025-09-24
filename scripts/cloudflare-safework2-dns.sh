#!/bin/bash

# SafeWork2 Cloudflare Workers + D1 Deployment Script
# This script handles the complete deployment to safework2.jclee.me

set -e

echo "🚀 SafeWork2 Cloudflare Deployment Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="safework2"
DOMAIN="safework2.jclee.me"
WORKERS_DIR="./workers"
D1_DB_NAME="safework-db"
KV_NAMESPACE="safework_kv"

echo -e "${YELLOW}📋 Deployment Requirements:${NC}"
echo ""
echo "1. Cloudflare Account with Workers enabled"
echo "2. API Token with the following permissions:"
echo "   - Account: D1:Edit"
echo "   - Account: Workers KV Storage:Edit"
echo "   - Account: Workers Scripts:Edit"
echo "   - Zone: Workers Routes:Edit (for safework2.jclee.me)"
echo ""
echo -e "${BLUE}To create a proper API Token:${NC}"
echo "1. Go to: https://dash.cloudflare.com/profile/api-tokens"
echo "2. Click 'Create Token'"
echo "3. Use 'Custom token' template"
echo "4. Add permissions listed above"
echo "5. Set Zone Resources to include jclee.me"
echo ""

read -p "Do you have an API Token with these permissions? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Please create a token first at: https://dash.cloudflare.com/profile/api-tokens${NC}"
    exit 1
fi

# Get API Token
echo ""
read -p "Enter your Cloudflare API Token: " CLOUDFLARE_API_TOKEN
export CLOUDFLARE_API_TOKEN

# Verify token
echo -e "${YELLOW}Verifying API Token...${NC}"
if npx wrangler whoami 2>/dev/null; then
    echo -e "${GREEN}✅ Authentication successful${NC}"
else
    echo -e "${RED}❌ Authentication failed. Please check your token permissions.${NC}"
    exit 1
fi

# Navigate to workers directory
cd "$WORKERS_DIR" || exit 1

# Update wrangler if needed
echo -e "${YELLOW}Updating Wrangler CLI...${NC}"
npm install --save-dev wrangler@latest

# Create D1 Database
echo -e "${YELLOW}Creating D1 Database...${NC}"
if npx wrangler d1 create "$D1_DB_NAME" 2>/dev/null; then
    echo -e "${GREEN}✅ D1 database created${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Copy the database_id from above and update wrangler.toml${NC}"
    read -p "Enter the database_id: " DATABASE_ID
    
    # Update wrangler.toml with actual database ID
    sed -i "s/database_id = \"safework-db-production\"/database_id = \"$DATABASE_ID\"/g" wrangler.toml
    echo -e "${GREEN}✅ Updated wrangler.toml with database ID${NC}"
else
    echo -e "${YELLOW}Database may already exist or error occurred${NC}"
fi

# Apply database schema
echo -e "${YELLOW}Applying database schema...${NC}"
npx wrangler d1 execute "$D1_DB_NAME" --file=schema.sql --remote
echo -e "${GREEN}✅ Database schema applied${NC}"

# Create KV namespaces
echo -e "${YELLOW}Creating KV namespaces...${NC}"

# Create main KV namespace
if npx wrangler kv:namespace create "$KV_NAMESPACE" 2>/dev/null; then
    echo -e "${GREEN}✅ Main KV namespace created${NC}"
    echo -e "${YELLOW}⚠️  Update the KV namespace ID in wrangler.toml${NC}"
    read -p "Enter the main KV namespace ID: " KV_ID
    sed -i "s/id = \"safework_kv_production\"/id = \"$KV_ID\"/g" wrangler.toml
fi

# Create preview KV namespace
if npx wrangler kv:namespace create "$KV_NAMESPACE" --preview 2>/dev/null; then
    echo -e "${GREEN}✅ Preview KV namespace created${NC}"
    read -p "Enter the preview KV namespace ID: " KV_PREVIEW_ID
    sed -i "s/preview_id = \"safework_kv_preview\"/preview_id = \"$KV_PREVIEW_ID\"/g" wrangler.toml
fi

# Create cache KV namespace
if npx wrangler kv:namespace create "safework_cache" 2>/dev/null; then
    echo -e "${GREEN}✅ Cache KV namespace created${NC}"
    read -p "Enter the cache KV namespace ID: " CACHE_ID
    sed -i "s/id = \"safework_cache_prod\"/id = \"$CACHE_ID\"/g" wrangler.toml
fi

# Build the project
echo -e "${YELLOW}Building TypeScript project...${NC}"
npm run build
echo -e "${GREEN}✅ Project built successfully${NC}"

# Set secrets
echo -e "${YELLOW}Setting secrets...${NC}"
echo "Enter the admin password for SafeWork2:"
npx wrangler secret put ADMIN_PASSWORD

# Deploy to Cloudflare Workers
echo -e "${YELLOW}Deploying to Cloudflare Workers...${NC}"
npx wrangler deploy --env production

echo ""
echo -e "${GREEN}🎉 Deployment process complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Configure DNS for safework2.jclee.me:"
echo "   - Add CNAME record: safework2 -> safework2.workers.dev"
echo "   - Or configure Workers custom domain in Cloudflare dashboard"
echo ""
echo "2. Test the deployment:"
echo "   - Workers URL: https://safework2.workers.dev"
echo "   - Custom domain: https://safework2.jclee.me"
echo "   - Health check: https://safework2.jclee.me/api/health"
echo ""
echo "3. Migrate data from PostgreSQL (optional):"
echo "   - Export from PostgreSQL: pg_dump safework_db > backup.sql"
echo "   - Convert to SQLite format"
echo "   - Import to D1: wrangler d1 execute $D1_DB_NAME --file=data.sql"
echo ""
echo -e "${BLUE}🌐 Access URLs:${NC}"
echo "   Workers: https://safework2.workers.dev"
echo "   Custom:  https://safework2.jclee.me"
echo "   API:     https://safework2.jclee.me/api/health"