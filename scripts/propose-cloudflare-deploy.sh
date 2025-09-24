#!/bin/bash

# Propose - Cloudflare Pages Deployment Script
# Deploy the propose frontend application to Cloudflare Pages

set -e

echo "💍 Propose - Cloudflare Pages Deployment"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="propose"
DOMAIN="propose.jclee.me"
PROPOSE_DIR="/home/jclee/app/propose"

echo -e "${YELLOW}📋 Deployment Configuration:${NC}"
echo "   Project: $PROJECT_NAME"
echo "   Domain: $DOMAIN"
echo "   Source: $PROPOSE_DIR"
echo ""

# Use provided token
export CLOUDFLARE_API_TOKEN="tSkF6AcuybaS_SJe2YwTcWv9eeeK0Dao19w76bUT"

# Verify token
echo -e "${YELLOW}Verifying API Token...${NC}"
VERIFY_RESULT=$(curl -s -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json")

if echo "$VERIFY_RESULT" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Token is valid and active${NC}"
else
    echo -e "${RED}❌ Token verification failed${NC}"
    echo "$VERIFY_RESULT"
    echo ""
    echo -e "${YELLOW}Note: You may need additional permissions for Pages deployment${NC}"
fi

# Navigate to propose directory
cd "$PROPOSE_DIR"

# Build the project
echo -e "${YELLOW}Building Propose application...${NC}"

# Check if we're in the right directory
if [ -d "config" ]; then
    cd config
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    # Build the project
    echo "Running build..."
    npm run build:docker
    cd ..
else
    echo -e "${RED}❌ Cannot find config directory${NC}"
    exit 1
fi

# Check if dist directory was created
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build failed - dist directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"
echo "   Build output: $PROPOSE_DIR/dist"

# Deploy options
echo ""
echo -e "${BLUE}🚀 Deployment Options:${NC}"
echo ""
echo "Option 1: Direct Upload (Recommended for first deployment)"
echo "========================================================="
echo "1. Go to: https://dash.cloudflare.com/?to=/:account/pages"
echo "2. Click 'Create a project'"
echo "3. Select 'Direct Upload' tab"
echo "4. Name the project: 'propose'"
echo "5. Upload the contents of: $PROPOSE_DIR/dist"
echo "6. Click 'Deploy site'"
echo ""
echo "Option 2: Wrangler CLI (Requires Pages permissions)"
echo "===================================================="
echo "Run the following command:"
echo ""
echo "cd $PROPOSE_DIR && npx wrangler pages deploy dist --project-name=propose"
echo ""
echo "Option 3: GitHub Integration (For automatic deployments)"
echo "========================================================"
echo "1. Go to Cloudflare Pages dashboard"
echo "2. Connect your GitHub repository"
echo "3. Set build configuration:"
echo "   - Build command: cd config && npm run build:docker"
echo "   - Build output directory: dist"
echo "   - Root directory: /"
echo ""
echo -e "${YELLOW}📋 After deployment:${NC}"
echo ""
echo "1. Configure custom domain:"
echo "   - Go to Pages project > Custom domains"
echo "   - Add domain: propose.jclee.me"
echo "   - DNS will be configured automatically"
echo ""
echo "2. Your site will be available at:"
echo "   - https://propose.pages.dev"
echo "   - https://propose.jclee.me (after DNS setup)"
echo ""

# Try Wrangler deployment if user wants
echo -e "${YELLOW}Would you like to try Wrangler CLI deployment now? (y/n)${NC}"
read -n 1 -r DEPLOY_NOW
echo ""

if [[ $DEPLOY_NOW =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Attempting Wrangler deployment...${NC}"
    
    # Install wrangler if needed
    if ! command -v wrangler &> /dev/null; then
        echo "Installing Wrangler..."
        npm install -g wrangler
    fi
    
    # Try to deploy
    cd "$PROPOSE_DIR"
    npx wrangler pages deploy dist \
        --project-name="propose" \
        --compatibility-date="2024-01-01" \
        --branch="main" || {
        echo -e "${YELLOW}If deployment failed, you may need to:${NC}"
        echo "1. Create the project first via dashboard"
        echo "2. Or add Pages permissions to your token"
        echo "3. Or use the Direct Upload method above"
    }
fi

echo ""
echo -e "${GREEN}✅ Script completed!${NC}"