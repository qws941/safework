#!/bin/bash

# SafeWork Integration Test Execution Pipeline
# ============================================
# Comprehensive test execution with reporting and validation

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TESTS_DIR="${PROJECT_ROOT}/tests"
REPORTS_DIR="${PROJECT_ROOT}/test-reports"
LOGS_DIR="${PROJECT_ROOT}/test-logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration variables
TEST_BASE_URL="${TEST_BASE_URL:-http://localhost:4545}"
TEST_DB_URL="${TEST_DB_URL:-postgresql://safework:safework2024@localhost:5432/safework_test}"
TEST_REDIS_URL="${TEST_REDIS_URL:-redis://localhost:6379/1}"
PARALLEL_WORKERS="${PARALLEL_WORKERS:-auto}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-300}"
SKIP_SLOW_TESTS="${SKIP_SLOW_TESTS:-false}"
GENERATE_COVERAGE="${GENERATE_COVERAGE:-true}"

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} ${timestamp} - $message" | tee -a "${LOGS_DIR}/integration_tests.log"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} ${timestamp} - $message" | tee -a "${LOGS_DIR}/integration_tests.log"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} ${timestamp} - $message" | tee -a "${LOGS_DIR}/integration_tests.log"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} ${timestamp} - $message" | tee -a "${LOGS_DIR}/integration_tests.log"
            ;;
    esac
}

# Create necessary directories
setup_directories() {
    log "INFO" "Setting up test directories..."
    
    mkdir -p "$REPORTS_DIR"
    mkdir -p "$LOGS_DIR"
    mkdir -p "${TESTS_DIR}/results"
    
    # Clear previous logs
    > "${LOGS_DIR}/integration_tests.log"
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check if Python is available
    if ! command -v python3 &> /dev/null; then
        log "ERROR" "Python 3 is required but not installed"
        exit 1
    fi
    
    # Check if pytest is available
    if ! python3 -c "import pytest" &> /dev/null; then
        log "WARN" "pytest not found, installing test requirements..."
        pip3 install -r "${TESTS_DIR}/requirements.txt"
    fi
    
    # Check if SafeWork service is running
    log "INFO" "Checking SafeWork service availability at ${TEST_BASE_URL}..."
    if curl -f -s "${TEST_BASE_URL}/health" > /dev/null; then
        log "SUCCESS" "SafeWork service is accessible"
    else
        log "WARN" "SafeWork service not accessible at ${TEST_BASE_URL}"
        log "WARN" "Tests may fail if service is not running"
    fi
}

# Install test dependencies
install_dependencies() {
    log "INFO" "Installing test dependencies..."
    
    cd "$PROJECT_ROOT"
    
    # Install Python dependencies
    pip3 install -r "${TESTS_DIR}/requirements.txt"
    
    # Install Chrome WebDriver for E2E tests
    if command -v google-chrome &> /dev/null || command -v chromium-browser &> /dev/null; then
        log "INFO" "Chrome browser detected, WebDriver will be managed automatically"
    else
        log "WARN" "Chrome browser not found, E2E tests may be skipped"
    fi
}

# Run specific test category
run_test_category() {
    local category="$1"
    local description="$2"
    local marker="$3"
    local additional_args="${4:-}"
    
    log "INFO" "Running $description tests..."
    
    local test_command="python3 -m pytest"
    test_command+=" -m \"$marker\""
    test_command+=" --junitxml=\"${REPORTS_DIR}/junit-${category}.xml\""
    test_command+=" --html=\"${REPORTS_DIR}/report-${category}.html\""
    test_command+=" --self-contained-html"
    
    if [[ "$GENERATE_COVERAGE" == "true" ]]; then
        test_command+=" --cov=app --cov-report=html:${REPORTS_DIR}/coverage-${category}"
        test_command+=" --cov-report=xml:${REPORTS_DIR}/coverage-${category}.xml"
    fi
    
    if [[ "$PARALLEL_WORKERS" != "1" ]]; then
        test_command+=" -n $PARALLEL_WORKERS"
    fi
    
    test_command+=" --timeout=$TIMEOUT_SECONDS"
    test_command+=" $additional_args"
    test_command+=" ${TESTS_DIR}"
    
    # Set environment variables
    export TEST_BASE_URL
    export TEST_DB_URL
    export TEST_REDIS_URL
    
    # Execute tests
    if eval "$test_command" 2>&1 | tee "${LOGS_DIR}/${category}_tests.log"; then
        log "SUCCESS" "$description tests completed successfully"
        return 0
    else
        log "ERROR" "$description tests failed"
        return 1
    fi
}

# Run all test categories
run_all_tests() {
    local failed_categories=()
    
    log "INFO" "Starting comprehensive integration test suite..."
    
    # API Integration Tests
    if run_test_category "api" "API Integration" "api"; then
        log "SUCCESS" "✓ API Integration tests passed"
    else
        failed_categories+=("api")
    fi
    
    # Database Integration Tests
    if run_test_category "database" "Database Integration" "database"; then
        log "SUCCESS" "✓ Database Integration tests passed"
    else
        failed_categories+=("database")
    fi
    
    # Container Integration Tests
    if run_test_category "container" "Container Integration" "container"; then
        log "SUCCESS" "✓ Container Integration tests passed"
    else
        failed_categories+=("container")
    fi
    
    # Monitoring Tests
    if run_test_category "monitoring" "System Monitoring" "monitoring"; then
        log "SUCCESS" "✓ System Monitoring tests passed"
    else
        failed_categories+=("monitoring")
    fi
    
    # End-to-End Tests (may be slow)
    if [[ "$SKIP_SLOW_TESTS" != "true" ]]; then
        if run_test_category "e2e" "End-to-End" "e2e" "--maxfail=3"; then
            log "SUCCESS" "✓ End-to-End tests passed"
        else
            failed_categories+=("e2e")
        fi
    else
        log "INFO" "Skipping End-to-End tests (SKIP_SLOW_TESTS=true)"
    fi
    
    # Critical Tests (run with strict mode)
    if run_test_category "critical" "Critical System" "critical" "--maxfail=1"; then
        log "SUCCESS" "✓ Critical System tests passed"
    else
        failed_categories+=("critical")
    fi
    
    # Return results
    if [[ ${#failed_categories[@]} -eq 0 ]]; then
        log "SUCCESS" "All test categories passed! 🎉"
        return 0
    else
        log "ERROR" "Failed test categories: ${failed_categories[*]}"
        return 1
    fi
}

# Generate comprehensive test report
generate_test_report() {
    log "INFO" "Generating comprehensive test report..."
    
    local report_file="${REPORTS_DIR}/integration-test-summary.html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>SafeWork Integration Test Report</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .success { color: green; }
        .warning { color: orange; }
        .error { color: red; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .timestamp { font-size: 0.9em; color: #666; }
        ul { margin: 10px 0; padding-left: 20px; }
        li { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>SafeWork Integration Test Report</h1>
        <p class="timestamp">Generated: $(date)</p>
        <p>Test Environment: ${TEST_BASE_URL}</p>
    </div>
    
    <div class="section">
        <h2>Test Categories</h2>
        <ul>
EOF

    # Add test category results
    for category in api database container monitoring e2e critical; do
        if [[ -f "${REPORTS_DIR}/junit-${category}.xml" ]]; then
            echo "            <li class=\"success\">✓ ${category^} Integration Tests - <a href=\"report-${category}.html\">View Report</a></li>" >> "$report_file"
        else
            echo "            <li class=\"error\">✗ ${category^} Integration Tests - Not Run</li>" >> "$report_file"
        fi
    done
    
    cat >> "$report_file" << EOF
        </ul>
    </div>
    
    <div class="section">
        <h2>Test Reports</h2>
        <ul>
EOF

    # Add links to individual reports
    for report in "${REPORTS_DIR}"/report-*.html; do
        if [[ -f "$report" ]]; then
            local basename=$(basename "$report")
            echo "            <li><a href=\"$basename\">$basename</a></li>" >> "$report_file"
        fi
    done
    
    cat >> "$report_file" << EOF
        </ul>
    </div>
    
    <div class="section">
        <h2>Coverage Reports</h2>
        <ul>
EOF

    # Add coverage reports
    for coverage_dir in "${REPORTS_DIR}"/coverage-*; do
        if [[ -d "$coverage_dir" ]]; then
            local basename=$(basename "$coverage_dir")
            echo "            <li><a href=\"$basename/index.html\">$basename</a></li>" >> "$report_file"
        fi
    done
    
    cat >> "$report_file" << EOF
        </ul>
    </div>
    
    <div class="section">
        <h2>Test Logs</h2>
        <ul>
EOF

    # Add log files
    for log_file in "${LOGS_DIR}"/*.log; do
        if [[ -f "$log_file" ]]; then
            local basename=$(basename "$log_file")
            echo "            <li><a href=\"../test-logs/$basename\">$basename</a></li>" >> "$report_file"
        fi
    done
    
    cat >> "$report_file" << EOF
        </ul>
    </div>
</body>
</html>
EOF
    
    log "SUCCESS" "Test report generated: $report_file"
}

# Cleanup function
cleanup() {
    log "INFO" "Cleaning up test environment..."
    
    # Clean up temporary test data
    if [[ -n "${TEST_DB_URL:-}" ]]; then
        log "INFO" "Cleaning up test database records..."
        # Note: Actual cleanup is handled by test fixtures
    fi
    
    # Compress old logs
    if [[ -d "$LOGS_DIR" ]]; then
        find "$LOGS_DIR" -name "*.log" -mtime +7 -exec gzip {} \;
    fi
}

# Error handling
handle_error() {
    local exit_code=$?
    log "ERROR" "Test execution failed with exit code $exit_code"
    cleanup
    exit $exit_code
}

# Main execution function
main() {
    # Set up error handling
    trap handle_error ERR
    
    log "INFO" "SafeWork Integration Test Pipeline Starting..."
    log "INFO" "Test URL: $TEST_BASE_URL"
    log "INFO" "Parallel Workers: $PARALLEL_WORKERS"
    log "INFO" "Timeout: $TIMEOUT_SECONDS seconds"
    
    # Setup
    setup_directories
    check_prerequisites
    install_dependencies
    
    # Run tests
    if run_all_tests; then
        log "SUCCESS" "Integration test pipeline completed successfully! 🎉"
        exit_code=0
    else
        log "ERROR" "Integration test pipeline failed! ❌"
        exit_code=1
    fi
    
    # Generate reports
    generate_test_report
    
    # Cleanup
    cleanup
    
    log "INFO" "Test reports available in: $REPORTS_DIR"
    log "INFO" "Test logs available in: $LOGS_DIR"
    
    exit $exit_code
}

# Help function
show_help() {
    cat << EOF
SafeWork Integration Test Pipeline

Usage: $0 [OPTIONS] [COMMAND]

Commands:
    all         Run all test categories (default)
    api         Run API integration tests only
    database    Run database integration tests only
    container   Run container integration tests only
    monitoring  Run monitoring tests only
    e2e         Run end-to-end tests only
    critical    Run critical system tests only
    help        Show this help message

Environment Variables:
    TEST_BASE_URL       Base URL for SafeWork service (default: http://localhost:4545)
    TEST_DB_URL         Database URL for testing (default: postgresql://...)
    TEST_REDIS_URL      Redis URL for testing (default: redis://localhost:6379/1)
    PARALLEL_WORKERS    Number of parallel workers (default: auto)
    TIMEOUT_SECONDS     Test timeout in seconds (default: 300)
    SKIP_SLOW_TESTS     Skip slow E2E tests (default: false)
    GENERATE_COVERAGE   Generate coverage reports (default: true)

Examples:
    $0 all                    # Run all tests
    $0 api                    # Run API tests only
    SKIP_SLOW_TESTS=true $0   # Run all tests except slow ones
    PARALLEL_WORKERS=4 $0     # Run with 4 parallel workers

EOF
}

# Command line argument handling
case "${1:-all}" in
    "api")
        setup_directories
        check_prerequisites
        install_dependencies
        run_test_category "api" "API Integration" "api"
        generate_test_report
        ;;
    "database")
        setup_directories
        check_prerequisites
        install_dependencies
        run_test_category "database" "Database Integration" "database"
        generate_test_report
        ;;
    "container")
        setup_directories
        check_prerequisites
        install_dependencies
        run_test_category "container" "Container Integration" "container"
        generate_test_report
        ;;
    "monitoring")
        setup_directories
        check_prerequisites
        install_dependencies
        run_test_category "monitoring" "System Monitoring" "monitoring"
        generate_test_report
        ;;
    "e2e")
        setup_directories
        check_prerequisites
        install_dependencies
        run_test_category "e2e" "End-to-End" "e2e"
        generate_test_report
        ;;
    "critical")
        setup_directories
        check_prerequisites
        install_dependencies
        run_test_category "critical" "Critical System" "critical"
        generate_test_report
        ;;
    "all")
        main
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        log "ERROR" "Unknown command: $1"
        show_help
        exit 1
        ;;
esac