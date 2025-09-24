#!/bin/bash

# SafeWork Cloudflare DNS Configuration Script
# Configure DNS for safework2.jclee.me

set -e

echo "🌐 SafeWork Cloudflare DNS Configuration"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="safework2.jclee.me"
WORKERS_DOMAIN="safework2.workers.dev"
API_TOKEN="tSkF6AcuybaS_SJe2YwTcWv9eeeK0Dao19w76bUT"

echo -e "${YELLOW}📋 DNS Configuration:${NC}"
echo "   Custom Domain: $DOMAIN"
echo "   Workers Domain: $WORKERS_DOMAIN"
echo ""

echo -e "${YELLOW}Step 1: Get Zone Information${NC}"
echo "========================="

# Get zone ID for jclee.me
ZONE_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=jclee.me" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json")

if echo "$ZONE_RESPONSE" | grep -q '"success":true'; then
    ZONE_ID=$(echo "$ZONE_RESPONSE" | jq -r '.result[0].id' 2>/dev/null || echo "")
    if [ -n "$ZONE_ID" ] && [ "$ZONE_ID" != "null" ]; then
        echo -e "${GREEN}✅ Zone ID found: $ZONE_ID${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not extract zone ID from response${NC}"
        ZONE_ID=""
    fi
else
    echo -e "${YELLOW}⚠️  Could not get zone information${NC}"
    echo "$ZONE_RESPONSE"
    ZONE_ID=""
fi

echo ""

echo -e "${YELLOW}Step 2: DNS Record Configuration${NC}"
echo "==============================="

if [ -n "$ZONE_ID" ]; then
    echo "Attempting to create DNS record..."

    # Create CNAME record for safework2.jclee.me
    DNS_RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
      -H "Authorization: Bearer $API_TOKEN" \
      -H "Content-Type: application/json" \
      --data "{
        \"type\": \"CNAME\",
        \"name\": \"safework2\",
        \"content\": \"$WORKERS_DOMAIN\",
        \"proxied\": true,
        \"comment\": \"SafeWork Cloudflare Workers deployment\"
      }")

    if echo "$DNS_RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ DNS record created successfully${NC}"
        RECORD_ID=$(echo "$DNS_RESPONSE" | jq -r '.result.id' 2>/dev/null || echo "")
        echo "   Record ID: $RECORD_ID"
    else
        echo -e "${YELLOW}⚠️  DNS record creation may have failed${NC}"
        echo "$DNS_RESPONSE" | jq '.' 2>/dev/null || echo "$DNS_RESPONSE"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping automatic DNS creation due to missing zone ID${NC}"
fi

echo ""

echo -e "${YELLOW}Step 3: Manual DNS Configuration${NC}"
echo "==============================="
echo ""
echo -e "${BLUE}If automatic DNS creation failed, configure manually:${NC}"
echo ""
echo "1. Go to: https://dash.cloudflare.com/zones"
echo "2. Select the 'jclee.me' zone"
echo "3. Go to DNS > Records"
echo "4. Click 'Add record'"
echo "5. Configure:"
echo "   - Type: CNAME"
echo "   - Name: safework2"
echo "   - Target: safework2.workers.dev"
echo "   - Proxy status: Proxied (Orange cloud)"
echo "   - TTL: Auto"
echo ""

echo -e "${YELLOW}Step 4: Verify DNS Configuration${NC}"
echo "==============================="
echo ""
echo "Wait 1-2 minutes for DNS propagation, then test:"
echo ""
echo "# Check DNS resolution"
echo "nslookup safework2.jclee.me"
echo "dig safework2.jclee.me"
echo ""
echo "# Test connectivity"
echo "curl -I https://safework2.jclee.me"
echo ""

echo -e "${YELLOW}Step 5: Workers Custom Domain${NC}"
echo "============================="
echo ""
echo -e "${BLUE}Alternative: Configure custom domain in Workers dashboard:${NC}"
echo ""
echo "1. Go to: https://dash.cloudflare.com/workers"
echo "2. Select your 'safework2' worker"
echo "3. Go to Settings > Triggers"
echo "4. Click 'Add Custom Domain'"
echo "5. Enter: safework2.jclee.me"
echo "6. Click 'Add Custom Domain'"
echo ""

echo -e "${YELLOW}Step 6: SSL/TLS Configuration${NC}"
echo "============================="
echo ""
echo "Ensure SSL/TLS is properly configured:"
echo ""
echo "1. Go to: https://dash.cloudflare.com/ssl-tls"
echo "2. Set SSL/TLS encryption mode to 'Full (strict)'"
echo "3. Enable 'Always Use HTTPS'"
echo "4. Enable 'HSTS (HTTP Strict Transport Security)'"
echo ""

echo -e "${YELLOW}Step 7: Testing & Validation${NC}"
echo "========================="
echo ""
echo "Test the following endpoints after DNS propagation:"
echo ""
echo "# Root health check"
echo "curl https://safework2.jclee.me/"
echo ""
echo "# API health endpoint"
echo "curl https://safework2.jclee.me/api/health"
echo ""
echo "# Survey endpoints"
echo "curl https://safework2.jclee.me/api/survey/forms"
echo ""

echo -e "${YELLOW}Step 8: Monitoring & Analytics${NC}"
echo "==============================="
echo ""
echo "Monitor your Workers deployment:"
echo ""
echo "1. Workers Analytics: https://dash.cloudflare.com/workers/analytics"
echo "2. Real-time logs: npx wrangler tail"
echo "3. DNS analytics: https://dash.cloudflare.com/analytics/dns"
echo ""

# Test current DNS status
echo -e "${YELLOW}Current DNS Status Check:${NC}"
echo "========================"

# Check if domain is already configured
DNS_CHECK=$(curl -s -I "https://safework2.jclee.me" --max-time 5 || echo "Connection failed")
if echo "$DNS_CHECK" | grep -q "200 OK"; then
    echo -e "${GREEN}✅ Domain is already accessible!${NC}"
elif echo "$DNS_CHECK" | grep -q "HTTP"; then
    echo -e "${YELLOW}⚠️  Domain responds but with non-200 status${NC}"
else
    echo -e "${YELLOW}⚠️  Domain not yet accessible (normal if just configured)${NC}"
fi

echo ""
echo -e "${BLUE}📞 Next Steps:${NC}"
echo ""
echo "1. Wait 1-2 minutes for DNS propagation"
echo "2. Test: curl https://safework2.jclee.me/"
echo "3. If it fails, configure manually via Cloudflare Dashboard"
echo "4. Consider using Workers custom domain as alternative"
echo ""

echo -e "${GREEN}✅ DNS configuration guide completed!${NC}"