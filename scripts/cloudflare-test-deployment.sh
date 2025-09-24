#!/bin/bash

# SafeWork Cloudflare Workers - Testing & Verification Script
# Comprehensive testing of deployed SafeWork application

set -e

echo "🧪 SafeWork Cloudflare Workers - Testing & Verification"
echo "======================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="https://safework2.jclee.me"
WORKERS_URL="https://safework2.workers.dev"
TIMEOUT=10

echo -e "${YELLOW}📋 Testing Configuration:${NC}"
echo "   Primary URL: $BASE_URL"
echo "   Workers URL: $WORKERS_URL"
echo "   Timeout: ${TIMEOUT}s"
echo ""

# Test function
test_endpoint() {
    local url="$1"
    local description="$2"
    local expected_status="${3:-200}"

    echo -n "Testing $description... "

    response=$(curl -s -w "HTTP_CODE:%{http_code};TIME:%{time_total}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "ERROR")

    if echo "$response" | grep -q "HTTP_CODE:$expected_status"; then
        time=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
        echo -e "${GREEN}✅ OK${NC} (${time}s)"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        if echo "$response" | grep -q "HTTP_CODE:"; then
            status=$(echo "$response" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
            echo "   Status: $status (expected $expected_status)"
        else
            echo "   Error: Connection failed or timeout"
        fi
        return 1
    fi
}

# Test JSON response
test_json_endpoint() {
    local url="$1"
    local description="$2"
    local check_key="$3"

    echo -n "Testing $description... "

    response=$(curl -s --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "ERROR")

    if [ "$response" = "ERROR" ]; then
        echo -e "${RED}❌ FAILED${NC} (Connection error)"
        return 1
    fi

    if echo "$response" | jq . >/dev/null 2>&1; then
        if [ -n "$check_key" ] && echo "$response" | jq -e ".$check_key" >/dev/null 2>&1; then
            value=$(echo "$response" | jq -r ".$check_key")
            echo -e "${GREEN}✅ OK${NC} ($check_key: $value)"
            return 0
        elif [ -z "$check_key" ]; then
            echo -e "${GREEN}✅ OK${NC} (Valid JSON)"
            return 0
        else
            echo -e "${YELLOW}⚠️  JSON valid but missing key: $check_key${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ FAILED${NC} (Invalid JSON or no response)"
        return 1
    fi
}

echo -e "${YELLOW}Step 1: Basic Connectivity Tests${NC}"
echo "==============================="

# Test primary domain
test_endpoint "$BASE_URL/" "Root endpoint" 200
test_endpoint "$BASE_URL/api/health" "Health endpoint" 200

# Test workers.dev domain as fallback
if ! test_endpoint "$BASE_URL/" "Root endpoint" 200; then
    echo ""
    echo -e "${YELLOW}Testing fallback Workers domain...${NC}"
    test_endpoint "$WORKERS_URL/" "Workers root endpoint" 200
    test_endpoint "$WORKERS_URL/api/health" "Workers health endpoint" 200
fi

echo ""

echo -e "${YELLOW}Step 2: API Health Checks${NC}"
echo "======================="

# Test health endpoint with JSON validation
test_json_endpoint "$BASE_URL/api/health" "Health JSON response" "status"
test_json_endpoint "$BASE_URL/" "Root JSON response" "service"

echo ""

echo -e "${YELLOW}Step 3: Survey API Tests${NC}"
echo "===================="

# Test survey endpoints
test_endpoint "$BASE_URL/api/survey/forms" "Survey forms list" 200

# Test specific survey forms
survey_forms=(
    "001_musculoskeletal_symptom_survey"
    "002_occupational_history_survey"
    "003_health_symptom_survey"
    "004_work_environment_survey"
)

for form in "${survey_forms[@]}"; do
    test_endpoint "$BASE_URL/api/survey/$form" "Survey form: $form" 200
done

echo ""

echo -e "${YELLOW}Step 4: Authentication Tests${NC}"
echo "========================="

# Test auth endpoints
test_endpoint "$BASE_URL/api/auth/login" "Auth login endpoint" 200

# Test protected admin endpoints (should return 401 without auth)
test_endpoint "$BASE_URL/api/admin/dashboard" "Admin dashboard (unauthorized)" 401
test_endpoint "$BASE_URL/api/workers" "Workers API (unauthorized)" 401

echo ""

echo -e "${YELLOW}Step 5: Performance Tests${NC}"
echo "======================"

echo "Testing response times..."

for i in {1..5}; do
    echo -n "Request $i: "
    time=$(curl -s -w "%{time_total}" --max-time "$TIMEOUT" -o /dev/null "$BASE_URL/" 2>/dev/null || echo "ERROR")
    if [ "$time" != "ERROR" ]; then
        echo -e "${GREEN}${time}s${NC}"
    else
        echo -e "${RED}Failed${NC}"
    fi
done

echo ""

echo -e "${YELLOW}Step 6: Security Headers Check${NC}"
echo "=============================="

echo "Checking security headers..."

headers=$(curl -s -I --max-time "$TIMEOUT" "$BASE_URL/" 2>/dev/null || echo "ERROR")

if [ "$headers" != "ERROR" ]; then
    # Check for important security headers
    security_headers=(
        "x-content-type-options"
        "x-frame-options"
        "strict-transport-security"
        "content-security-policy"
    )

    for header in "${security_headers[@]}"; do
        if echo "$headers" | grep -qi "$header"; then
            echo -e "   ${GREEN}✅${NC} $header"
        else
            echo -e "   ${YELLOW}⚠️${NC}  $header (missing)"
        fi
    done
else
    echo -e "${RED}❌ Could not retrieve headers${NC}"
fi

echo ""

echo -e "${YELLOW}Step 7: Database Connectivity${NC}"
echo "============================"

# Test endpoints that would use database
echo "Testing database-dependent endpoints..."

test_endpoint "$BASE_URL/api/survey/submit" "Survey submit endpoint" 405  # Method not allowed for GET
test_json_endpoint "$BASE_URL/api/health" "Health check with DB status" "database"

echo ""

echo -e "${YELLOW}Step 8: Error Handling Tests${NC}"
echo "=========================="

# Test 404 handling
test_endpoint "$BASE_URL/nonexistent" "404 error handling" 404

# Test invalid API endpoints
test_endpoint "$BASE_URL/api/invalid" "Invalid API endpoint" 404

echo ""

echo -e "${YELLOW}Step 9: Load Testing (Light)${NC}"
echo "========================="

echo "Running light load test (10 concurrent requests)..."

# Simple concurrent test
for i in {1..10}; do
    (curl -s --max-time "$TIMEOUT" "$BASE_URL/" > /dev/null 2>&1 && echo -n ".") &
done
wait
echo ""
echo -e "${GREEN}✅ Concurrent requests completed${NC}"

echo ""

echo -e "${YELLOW}Step 10: Deployment Status Summary${NC}"
echo "=================================="

# Count successful tests
total_tests=0
passed_tests=0

# This is a simplified summary - in practice, you'd track test results
echo -e "${BLUE}📊 Deployment Status:${NC}"
echo ""

# Check primary endpoints
if test_endpoint "$BASE_URL/" "Final connectivity check" 200 >/dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Primary domain accessible${NC}"
else
    echo -e "   ${RED}❌ Primary domain issues${NC}"
fi

if test_json_endpoint "$BASE_URL/api/health" "Final health check" "status" >/dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Health endpoint working${NC}"
else
    echo -e "   ${RED}❌ Health endpoint issues${NC}"
fi

if test_endpoint "$BASE_URL/api/survey/forms" "Final survey API check" 200 >/dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Survey API accessible${NC}"
else
    echo -e "   ${RED}❌ Survey API issues${NC}"
fi

echo ""

echo -e "${YELLOW}Step 11: Monitoring Setup${NC}"
echo "======================="

echo "Monitoring and logging options:"
echo ""
echo "# Real-time logs"
echo "npx wrangler tail"
echo ""
echo "# Workers analytics"
echo "https://dash.cloudflare.com/workers/analytics"
echo ""
echo "# Custom monitoring script"
echo "watch -n 30 'curl -s $BASE_URL/api/health | jq .'"
echo ""

echo -e "${YELLOW}Step 12: Troubleshooting Guide${NC}"
echo "=============================="

echo ""
echo -e "${BLUE}Common issues and solutions:${NC}"
echo ""
echo "1. DNS not resolving:"
echo "   - Wait 1-2 minutes for DNS propagation"
echo "   - Check Cloudflare DNS settings"
echo "   - Try workers.dev URL: $WORKERS_URL"
echo ""
echo "2. 500 Internal Server Error:"
echo "   - Check D1 database configuration"
echo "   - Verify secrets are set (ADMIN_PASSWORD, JWT_SECRET)"
echo "   - Check wrangler tail for detailed logs"
echo ""
echo "3. 401 Unauthorized on admin endpoints:"
echo "   - This is expected - admin endpoints require authentication"
echo "   - Test login: curl -X POST $BASE_URL/api/auth/login -d '{\"username\":\"admin\",\"password\":\"safework2024\"}'"
echo ""
echo "4. Database errors:"
echo "   - Ensure schema.sql was executed: npx wrangler d1 execute safework-db --file=schema.sql"
echo "   - Check D1 database exists and is properly bound"
echo ""

echo ""
echo -e "${GREEN}✅ Testing and verification completed!${NC}"
echo ""
echo -e "${BLUE}📞 Next Steps if issues found:${NC}"
echo "1. Check detailed logs: npx wrangler tail"
echo "2. Verify wrangler.toml configuration"
echo "3. Ensure all manual setup steps were completed"
echo "4. Test with workers.dev domain if custom domain fails"
echo ""