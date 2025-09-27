#!/bin/bash

# SafeWork Integration Test Framework Validation
# =============================================
# Validates that the test framework is properly configured and ready to run

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validation results
VALIDATION_PASSED=true

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    
    case "$level" in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message"
            VALIDATION_PASSED=false
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} $message"
            ;;
    esac
}

# Check file existence
check_file() {
    local file="$1"
    local description="$2"
    
    if [[ -f "$file" ]]; then
        log "SUCCESS" "✓ $description exists: $file"
    else
        log "ERROR" "✗ $description missing: $file"
    fi
}

# Check directory existence
check_directory() {
    local dir="$1"
    local description="$2"
    
    if [[ -d "$dir" ]]; then
        log "SUCCESS" "✓ $description exists: $dir"
    else
        log "ERROR" "✗ $description missing: $dir"
    fi
}

# Check executable permissions
check_executable() {
    local file="$1"
    local description="$2"
    
    if [[ -x "$file" ]]; then
        log "SUCCESS" "✓ $description is executable: $file"
    else
        log "ERROR" "✗ $description not executable: $file"
    fi
}

# Main validation function
main() {
    log "INFO" "🧪 SafeWork Integration Test Framework Validation"
    log "INFO" "================================================"
    
    # Check project structure
    log "INFO" "Checking project structure..."
    check_directory "tests" "Tests directory"
    check_directory "scripts" "Scripts directory"
    check_directory ".github/workflows" "GitHub workflows directory"
    
    # Check test files
    log "INFO" "Checking test files..."
    check_file "tests/__init__.py" "Test package init"
    check_file "tests/conftest.py" "pytest configuration"
    check_file "tests/pytest.ini" "pytest settings"
    check_file "tests/requirements.txt" "Test requirements"
    check_file "tests/README.md" "Test documentation"
    
    # Check individual test modules
    log "INFO" "Checking test modules..."
    check_file "tests/test_api_integration.py" "API integration tests"
    check_file "tests/test_database_integration.py" "Database integration tests"
    check_file "tests/test_container_integration.py" "Container integration tests"
    check_file "tests/test_e2e_workflows.py" "End-to-end workflow tests"
    check_file "tests/test_monitoring_enhanced.py" "Enhanced monitoring tests"
    
    # Check scripts
    log "INFO" "Checking execution scripts..."
    check_file "scripts/run_integration_tests.sh" "Main test execution script"
    check_executable "scripts/run_integration_tests.sh" "Main test execution script"
    
    # Check CI/CD configuration
    log "INFO" "Checking CI/CD configuration..."
    check_file ".github/workflows/integration-tests.yml" "GitHub Actions workflow"
    check_file ".github/workflows/portainer-deployment.yml" "Deployment workflow"
    
    # Check test file syntax
    log "INFO" "Validating Python syntax..."
    for test_file in tests/test_*.py; do
        if python3 -m py_compile "$test_file" 2>/dev/null; then
            log "SUCCESS" "✓ Python syntax valid: $(basename "$test_file")"
        else
            log "ERROR" "✗ Python syntax error: $(basename "$test_file")"
        fi
    done
    
    # Check pytest configuration
    log "INFO" "Validating pytest configuration..."
    if [[ -f "tests/pytest.ini" ]]; then
        if grep -q "testpaths = tests" tests/pytest.ini; then
            log "SUCCESS" "✓ pytest testpaths configured"
        else
            log "WARN" "⚠ pytest testpaths may need configuration"
        fi
        
        if grep -q "markers =" tests/pytest.ini; then
            log "SUCCESS" "✓ pytest markers configured"
        else
            log "WARN" "⚠ pytest markers may need configuration"
        fi
    fi
    
    # Check requirements file
    log "INFO" "Validating requirements..."
    if [[ -f "tests/requirements.txt" ]]; then
        if grep -q "pytest" tests/requirements.txt; then
            log "SUCCESS" "✓ pytest dependency specified"
        else
            log "ERROR" "✗ pytest dependency missing"
        fi
        
        if grep -q "requests" tests/requirements.txt; then
            log "SUCCESS" "✓ requests dependency specified"
        else
            log "ERROR" "✗ requests dependency missing"
        fi
        
        if grep -q "selenium" tests/requirements.txt; then
            log "SUCCESS" "✓ selenium dependency specified"
        else
            log "WARN" "⚠ selenium dependency missing (E2E tests may fail)"
        fi
    fi
    
    # Check script permissions and syntax
    log "INFO" "Validating shell scripts..."
    for script in scripts/*.sh; do
        if [[ -f "$script" ]]; then
            if [[ -x "$script" ]]; then
                log "SUCCESS" "✓ Script executable: $(basename "$script")"
            else
                log "ERROR" "✗ Script not executable: $(basename "$script")"
            fi
            
            # Basic syntax check
            if bash -n "$script" 2>/dev/null; then
                log "SUCCESS" "✓ Shell syntax valid: $(basename "$script")"
            else
                log "ERROR" "✗ Shell syntax error: $(basename "$script")"
            fi
        fi
    done
    
    # Environment validation
    log "INFO" "Checking environment requirements..."
    
    # Check Python
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        log "SUCCESS" "✓ Python 3 available: $PYTHON_VERSION"
    else
        log "ERROR" "✗ Python 3 not found"
    fi
    
    # Check curl
    if command -v curl &> /dev/null; then
        log "SUCCESS" "✓ curl available"
    else
        log "ERROR" "✗ curl not found (required for health checks)"
    fi
    
    # Check docker
    if command -v docker &> /dev/null; then
        log "SUCCESS" "✓ Docker available"
    else
        log "WARN" "⚠ Docker not found (container tests may fail)"
    fi
    
    # Check docker-compose
    if command -v docker-compose &> /dev/null; then
        log "SUCCESS" "✓ Docker Compose available"
    else
        log "WARN" "⚠ Docker Compose not found (container orchestration tests may fail)"
    fi
    
    # Test framework structure validation
    log "INFO" "Validating test framework structure..."
    
    # Count test files
    TEST_COUNT=$(find tests -name "test_*.py" | wc -l)
    if [[ $TEST_COUNT -ge 5 ]]; then
        log "SUCCESS" "✓ Test modules count: $TEST_COUNT"
    else
        log "WARN" "⚠ Low test module count: $TEST_COUNT"
    fi
    
    # Check for test categories
    for category in api database container e2e monitoring; do
        if find tests -name "*${category}*" | grep -q .; then
            log "SUCCESS" "✓ Test category '$category' implemented"
        else
            log "WARN" "⚠ Test category '$category' may be missing"
        fi
    done
    
    # Final validation result
    echo ""
    log "INFO" "🔍 Validation Summary"
    log "INFO" "===================="
    
    if [[ "$VALIDATION_PASSED" == "true" ]]; then
        log "SUCCESS" "🎉 SafeWork Integration Test Framework validation PASSED!"
        log "SUCCESS" "Framework is ready for execution."
        echo ""
        log "INFO" "Next steps:"
        log "INFO" "1. Install test dependencies: pip install -r tests/requirements.txt"
        log "INFO" "2. Start SafeWork services: docker-compose up -d"
        log "INFO" "3. Run tests: ./scripts/run_integration_tests.sh"
        echo ""
        exit 0
    else
        log "ERROR" "❌ SafeWork Integration Test Framework validation FAILED!"
        log "ERROR" "Please address the errors above before running tests."
        echo ""
        log "INFO" "Common fixes:"
        log "INFO" "1. Install missing dependencies"
        log "INFO" "2. Fix file permissions: chmod +x scripts/*.sh"
        log "INFO" "3. Verify Python syntax in test files"
        echo ""
        exit 1
    fi
}

# Help function
show_help() {
    cat << EOF
SafeWork Integration Test Framework Validation

Usage: $0 [OPTIONS]

Options:
    -h, --help    Show this help message
    
This script validates that the SafeWork integration test framework
is properly configured and ready to execute tests.

Validation includes:
- File structure verification
- Python syntax checking
- Shell script validation
- Environment requirements
- Configuration validation

EOF
}

# Command line argument handling
case "${1:-}" in
    "-h"|"--help")
        show_help
        ;;
    "")
        main
        ;;
    *)
        log "ERROR" "Unknown option: $1"
        show_help
        exit 1
        ;;
esac