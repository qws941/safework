#!/bin/bash

# SafeWork Cloudflare Workers + D1 Migration Script
# This script handles the complete migration from Docker/PostgreSQL to Cloudflare

set -e

echo "🚀 SafeWork Cloudflare Migration Script"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="safework2"
WORKERS_DIR="./workers"
D1_DB_NAME="safework-db"
KV_NAMESPACE="safework_kv"

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check if wrangler is installed
    if ! command -v wrangler &> /dev/null; then
        echo -e "${RED}❌ Wrangler CLI not found. Installing...${NC}"
        npm install -g wrangler
    else
        echo -e "${GREEN}✅ Wrangler CLI found${NC}"
    fi
    
    # Check if logged in to Cloudflare
    if ! wrangler whoami &> /dev/null; then
        echo -e "${YELLOW}Please login to Cloudflare:${NC}"
        wrangler login
    else
        echo -e "${GREEN}✅ Logged in to Cloudflare${NC}"
    fi
}

# Function to create D1 database
create_d1_database() {
    echo -e "${YELLOW}Creating D1 database...${NC}"
    
    # Check if database exists
    if wrangler d1 list | grep -q "$D1_DB_NAME"; then
        echo -e "${GREEN}✅ D1 database already exists${NC}"
    else
        wrangler d1 create "$D1_DB_NAME"
        echo -e "${GREEN}✅ D1 database created${NC}"
    fi
    
    # Apply schema
    echo -e "${YELLOW}Applying database schema...${NC}"
    wrangler d1 execute "$D1_DB_NAME" --file="$WORKERS_DIR/schema.sql"
    echo -e "${GREEN}✅ Database schema applied${NC}"
}

# Function to create KV namespace
create_kv_namespace() {
    echo -e "${YELLOW}Creating KV namespace...${NC}"
    
    # Check if namespace exists
    if wrangler kv:namespace list | grep -q "$KV_NAMESPACE"; then
        echo -e "${GREEN}✅ KV namespace already exists${NC}"
    else
        wrangler kv:namespace create "$KV_NAMESPACE"
        echo -e "${GREEN}✅ KV namespace created${NC}"
    fi
    
    # Create preview namespace
    if ! wrangler kv:namespace list --preview | grep -q "${KV_NAMESPACE}_preview"; then
        wrangler kv:namespace create "$KV_NAMESPACE" --preview
        echo -e "${GREEN}✅ Preview KV namespace created${NC}"
    fi
}

# Function to build Workers
build_workers() {
    echo -e "${YELLOW}Building Workers application...${NC}"
    
    cd "$WORKERS_DIR"
    
    # Install dependencies
    npm install
    
    # Build TypeScript
    npm run build
    
    cd ..
    echo -e "${GREEN}✅ Workers application built${NC}"
}

# Function to deploy Workers
deploy_workers() {
    echo -e "${YELLOW}Deploying to Cloudflare Workers...${NC}"
    
    cd "$WORKERS_DIR"
    
    # Set secrets
    echo -e "${YELLOW}Setting secrets...${NC}"
    wrangler secret put ADMIN_PASSWORD
    
    # Deploy
    wrangler deploy
    
    cd ..
    echo -e "${GREEN}✅ Workers deployed successfully${NC}"
}

# Function to setup custom domain
setup_custom_domain() {
    echo -e "${YELLOW}Setting up custom domain...${NC}"
    
    # This requires DNS setup in Cloudflare dashboard
    echo -e "${YELLOW}Please ensure the following DNS records are configured:${NC}"
    echo "1. CNAME record: safework2.jclee.me -> safework2.workers.dev"
    echo "2. Or use Cloudflare Pages/Workers custom domain in dashboard"
    
    read -p "Press enter when DNS is configured..."
    
    echo -e "${GREEN}✅ Custom domain setup complete${NC}"
}

# Function to migrate data from PostgreSQL
migrate_data() {
    echo -e "${YELLOW}Migrating data from PostgreSQL...${NC}"
    
    # This would require a separate script to export from PostgreSQL
    # and import to D1 using the Cloudflare API
    
    echo -e "${YELLOW}Data migration requires manual steps:${NC}"
    echo "1. Export data from PostgreSQL: pg_dump safework_db > safework_backup.sql"
    echo "2. Convert PostgreSQL dump to SQLite format"
    echo "3. Import to D1: wrangler d1 execute $D1_DB_NAME --file=safework_sqlite.sql"
    
    echo -e "${YELLOW}Skipping automatic data migration${NC}"
}

# Function to test deployment
test_deployment() {
    echo -e "${YELLOW}Testing deployment...${NC}"
    
    # Health check
    echo -e "${YELLOW}Testing health endpoint...${NC}"
    HEALTH_RESPONSE=$(curl -s https://safework2.jclee.me/api/health || echo "Failed")
    
    if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
        echo -e "${GREEN}✅ Health check passed${NC}"
        echo "$HEALTH_RESPONSE" | jq '.'
    else
        echo -e "${RED}❌ Health check failed${NC}"
        echo "$HEALTH_RESPONSE"
    fi
}

# Main execution
main() {
    echo -e "${GREEN}Starting SafeWork Cloudflare migration...${NC}"
    
    check_prerequisites
    create_d1_database
    create_kv_namespace
    build_workers
    deploy_workers
    setup_custom_domain
    # migrate_data  # Optional - requires manual steps
    test_deployment
    
    echo ""
    echo -e "${GREEN}🎉 Migration complete!${NC}"
    echo -e "${GREEN}SafeWork is now running on Cloudflare Workers${NC}"
    echo ""
    echo "📋 Next steps:"
    echo "1. Configure DNS for safework2.jclee.me"
    echo "2. Migrate data from PostgreSQL to D1"
    echo "3. Update environment variables in Cloudflare dashboard"
    echo "4. Test all endpoints thoroughly"
    echo ""
    echo "🌐 Access URLs:"
    echo "   Workers: https://safework2.workers.dev"
    echo "   Custom:  https://safework2.jclee.me"
    echo "   Health:  https://safework2.jclee.me/api/health"
}

# Run main function
main "$@"