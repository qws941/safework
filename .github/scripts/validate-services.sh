#!/bin/bash
set -e

TARGET_URL="$1"
TIMEOUT=30

if [ -z "$TARGET_URL" ]; then
    echo "❌ Error: TARGET_URL parameter required"
    echo "Usage: $0 <target_url>"
    exit 1
fi

echo "🧪 Validating SafeWork services at $TARGET_URL"
echo "⏱️ Timeout: ${TIMEOUT}s"

# Function to test endpoint with retry
test_endpoint() {
    local endpoint="$1"
    local description="$2"
    local max_attempts=3
    local attempt=1
    
    echo "Testing $description: $endpoint"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf --max-time $TIMEOUT "$endpoint" > /dev/null 2>&1; then
            echo "✅ $description - OK"
            return 0
        else
            echo "❌ $description - Attempt $attempt/$max_attempts failed"
            if [ $attempt -lt $max_attempts ]; then
                sleep 5
            fi
            attempt=$((attempt + 1))
        fi
    done
    
    return 1
}

# Critical service validations
echo "🏥 Running SafeWork health checks..."

# 1. Basic health endpoint
if test_endpoint "$TARGET_URL/health" "Health endpoint"; then
    HEALTH_PASSED=true
else
    HEALTH_PASSED=false
fi

# 2. Survey form endpoint (tests database connectivity)
if test_endpoint "$TARGET_URL/survey/001_musculoskeletal_symptom_survey" "Survey form endpoint"; then
    API_PASSED=true
else
    API_PASSED=false
fi

# 3. Admin dashboard (tests authentication and Redis connectivity)
if test_endpoint "$TARGET_URL/admin/dashboard" "Admin dashboard"; then
    MONITOR_PASSED=true
else
    MONITOR_PASSED=false
fi

# Results summary
echo ""
echo "📊 SafeWork Validation Results:"
echo "Health Endpoint: $([ "$HEALTH_PASSED" = true ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "Survey Forms: $([ "$API_PASSED" = true ] && echo "✅ PASS" || echo "❌ FAIL")"  
echo "Admin Dashboard: $([ "$MONITOR_PASSED" = true ] && echo "✅ PASS" || echo "❌ FAIL")"

# Overall result
if [ "$HEALTH_PASSED" = true ] && [ "$API_PASSED" = true ] && [ "$MONITOR_PASSED" = true ]; then
    echo ""
    echo "🎉 All SafeWork service validations passed!"
    exit 0
else
    echo ""
    echo "🚨 SafeWork service validation failed - system not ready"
    
    # Provide diagnostic information
    echo ""
    echo "🔍 Diagnostic Information:"
    echo "Target URL: $TARGET_URL"
    echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    
    # Try to get more info about the failure
    echo ""
    echo "📋 Detailed Error Analysis:"
    curl -I --max-time 10 "$TARGET_URL/health" 2>&1 || echo "No response from health endpoint"
    
    exit 1
fi