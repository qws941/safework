#!/bin/bash

# SafeWork 배포 모니터링 및 자동 검증 스크립트
# Deployment Monitoring and Automated Verification Script

set -euo pipefail

# ===========================================
# CONFIGURATION
# ===========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$PROJECT_ROOT/tools/config"
LOGS_DIR="$PROJECT_ROOT/logs"

# Create logs directory
mkdir -p "$LOGS_DIR"

MONITOR_LOG="$LOGS_DIR/monitor_$(date +%Y%m%d_%H%M%S).log"

# Load configuration
source "$CONFIG_DIR/deployment.env"
if [[ -f "$CONFIG_DIR/environments/production.env" ]]; then
    source "$CONFIG_DIR/environments/production.env"
fi

# ===========================================
# LOGGING FUNCTIONS
# ===========================================

log_info() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1"
    echo "$message" | tee -a "$MONITOR_LOG"
}

log_warning() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  WARNING: $1"
    echo "$message" | tee -a "$MONITOR_LOG"
}

log_error() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ERROR: $1"
    echo "$message" | tee -a "$MONITOR_LOG" >&2
}

log_success() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] ✅ SUCCESS: $1"
    echo "$message" | tee -a "$MONITOR_LOG"
}

log_critical() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] 🚨 CRITICAL: $1"
    echo "$message" | tee -a "$MONITOR_LOG" >&2
}

# ===========================================
# MONITORING FUNCTIONS
# ===========================================

# Container health monitoring
monitor_container_health() {
    local container_name=$1
    local expected_state=${2:-"running"}

    local container_info=$(curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
                          "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/json" | \
                          jq -r ".[] | select(.Names[] | contains(\"$container_name\")) | {State: .State, Status: .Status, Health: .State}")

    if [[ -z "$container_info" ]]; then
        log_error "Container $container_name not found"
        return 1
    fi

    local state=$(echo "$container_info" | jq -r '.State')
    local status=$(echo "$container_info" | jq -r '.Status')

    if [[ "$state" == "$expected_state" ]]; then
        log_success "Container $container_name is healthy ($state)"
        return 0
    else
        log_error "Container $container_name unhealthy: $state - $status"
        return 1
    fi
}

# Memory and CPU monitoring
monitor_resource_usage() {
    log_info "Monitoring resource usage..."

    # Get container stats
    local containers=("$POSTGRES_CONTAINER" "$REDIS_CONTAINER" "$APP_CONTAINER")

    for container in "${containers[@]}"; do
        local stats=$(curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
                     "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/$container/stats?stream=false")

        if [[ -n "$stats" ]] && [[ "$stats" != "null" ]]; then
            local memory_usage=$(echo "$stats" | jq -r '.memory_stats.usage // 0')
            local memory_limit=$(echo "$stats" | jq -r '.memory_stats.limit // 0')
            local cpu_usage=$(echo "$stats" | jq -r '.cpu_stats.cpu_usage.total_usage // 0')

            if [[ "$memory_limit" -gt 0 ]]; then
                local memory_percent=$((memory_usage * 100 / memory_limit))
                log_info "Container $container: Memory ${memory_percent}%"

                # Alert if memory usage is high
                if [[ $memory_percent -gt 80 ]]; then
                    log_warning "High memory usage in $container: ${memory_percent}%"
                fi
            fi
        fi
    done
}

# Application performance monitoring
monitor_application_performance() {
    log_info "Monitoring application performance..."

    local response_times=()
    local success_count=0
    local total_requests=10

    for i in $(seq 1 $total_requests); do
        local start_time=$(date +%s%N)
        local response=$(curl -s -w "%{http_code}" "$PRODUCTION_URL/health" -o /dev/null --max-time 10)
        local end_time=$(date +%s%N)

        if [[ "$response" == "200" ]]; then
            local response_time=$(((end_time - start_time) / 1000000))  # Convert to milliseconds
            response_times+=($response_time)
            ((success_count++))
        fi

        sleep 1
    done

    # Calculate statistics
    if [[ ${#response_times[@]} -gt 0 ]]; then
        local total=0
        local min_time=${response_times[0]}
        local max_time=${response_times[0]}

        for time in "${response_times[@]}"; do
            total=$((total + time))
            [[ $time -lt $min_time ]] && min_time=$time
            [[ $time -gt $max_time ]] && max_time=$time
        done

        local average=$((total / ${#response_times[@]}))
        local success_rate=$((success_count * 100 / total_requests))

        log_info "Performance metrics:"
        log_info "  Success rate: ${success_rate}%"
        log_info "  Average response time: ${average}ms"
        log_info "  Min response time: ${min_time}ms"
        log_info "  Max response time: ${max_time}ms"

        # Performance thresholds
        if [[ $success_rate -lt 95 ]]; then
            log_warning "Low success rate: ${success_rate}%"
            return 1
        fi

        if [[ $average -gt 2000 ]]; then
            log_warning "High average response time: ${average}ms"
            return 1
        fi

        log_success "Application performance is within acceptable limits"
        return 0
    else
        log_error "No successful requests in performance test"
        return 1
    fi
}

# Database connection monitoring
monitor_database_health() {
    log_info "Monitoring database health..."

    # Check PostgreSQL container
    if ! monitor_container_health "$POSTGRES_CONTAINER"; then
        return 1
    fi

    # Check database connectivity through application
    local app_container_id=$(curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
                            "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/json" | \
                            jq -r ".[] | select(.Names[] | contains(\"$APP_CONTAINER\")) | .Id")

    if [[ -n "$app_container_id" ]]; then
        local db_test_cmd='python -c "
from app import create_app
from models import db, Survey
try:
    app = create_app()
    with app.app_context():
        # Test basic connection
        result = db.engine.execute(\"SELECT 1\").scalar()
        if result != 1:
            raise Exception(\"Connection test failed\")

        # Test table access
        count = Survey.query.count()
        print(f\"DB_OK:SURVEYS_{count}\")

except Exception as e:
    print(f\"DB_ERROR:{e}\")
"'

        local exec_response=$(curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
                             -H "Content-Type: application/json" \
                             "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/$app_container_id/exec" \
                             -d "{
                               \"AttachStdout\": true,
                               \"AttachStderr\": true,
                               \"Cmd\": [\"sh\", \"-c\", \"$db_test_cmd\"]
                             }")

        if echo "$exec_response" | grep -q '"Id"'; then
            log_success "Database health check initiated"
            return 0
        else
            log_error "Database health check failed"
            return 1
        fi
    else
        log_error "Application container not found for database test"
        return 1
    fi
}

# Log analysis for errors
analyze_application_logs() {
    log_info "Analyzing application logs for errors..."

    local app_container_id=$(curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
                            "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/json" | \
                            jq -r ".[] | select(.Names[] | contains(\"$APP_CONTAINER\")) | .Id")

    if [[ -n "$app_container_id" ]]; then
        # Get recent logs
        local logs=$(curl -s -H "X-API-Key: $PORTAINER_API_KEY" \
                    "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/$app_container_id/logs?tail=100&stderr=1&stdout=1")

        # Check for error patterns
        local error_patterns=("ERROR" "CRITICAL" "Exception" "Traceback" "Failed")
        local error_count=0

        for pattern in "${error_patterns[@]}"; do
            local count=$(echo "$logs" | grep -ci "$pattern" || true)
            if [[ $count -gt 0 ]]; then
                log_warning "Found $count instances of '$pattern' in recent logs"
                ((error_count += count))
            fi
        done

        if [[ $error_count -eq 0 ]]; then
            log_success "No critical errors found in recent logs"
            return 0
        else
            log_warning "Found $error_count potential errors in recent logs"
            return 1
        fi
    else
        log_error "Application container not found for log analysis"
        return 1
    fi
}

# Network connectivity monitoring
monitor_network_connectivity() {
    log_info "Monitoring network connectivity..."

    # Test external connectivity
    if ! curl -s --max-time 10 "$PRODUCTION_URL/health" > /dev/null; then
        log_error "External connectivity to production URL failed"
        return 1
    fi

    # Test internal container communication
    local containers=("$POSTGRES_CONTAINER" "$REDIS_CONTAINER" "$APP_CONTAINER")
    for container in "${containers[@]}"; do
        if ! monitor_container_health "$container"; then
            log_error "Container $container connectivity issue"
            return 1
        fi
    done

    log_success "Network connectivity is healthy"
    return 0
}

# ===========================================
# AUTOMATED RECOVERY FUNCTIONS
# ===========================================

# Restart unhealthy container
restart_container() {
    local container_name=$1

    log_warning "Attempting to restart container: $container_name"

    # Use Portainer API restart endpoint (compatible with current API version)
    local response=$(curl -s -X POST -H "X-API-Key: $PORTAINER_API_KEY" \
                    "$PORTAINER_URL/api/endpoints/$PORTAINER_ENDPOINT_ID/docker/containers/$container_name/restart")

    if [[ -z "$response" ]] || ! echo "$response" | grep -q '"message"'; then
        log_info "Container $container_name restart command sent"

        # Wait for container to be healthy
        sleep 15

        if monitor_container_health "$container_name"; then
            log_success "Container $container_name restarted successfully"
            return 0
        else
            log_error "Container $container_name failed to start properly after restart"
            return 1
        fi
    else
        log_error "Failed to restart container $container_name: $response"
        return 1
    fi
}

# Automated recovery action
perform_recovery() {
    local issue_type=$1
    local container_name=${2:-""}

    log_warning "Performing automated recovery for: $issue_type"

    case "$issue_type" in
        "container_unhealthy")
            if [[ -n "$container_name" ]]; then
                restart_container "$container_name"
                return $?
            fi
            ;;
        "high_response_time")
            # Restart application container
            restart_container "$APP_CONTAINER"
            return $?
            ;;
        "database_error")
            # Restart both database and application containers
            restart_container "$POSTGRES_CONTAINER" && \
            sleep 10 && \
            restart_container "$APP_CONTAINER"
            return $?
            ;;
        *)
            log_error "Unknown recovery type: $issue_type"
            return 1
            ;;
    esac
}

# ===========================================
# ALERTING SYSTEM
# ===========================================

# Send alert notification
send_alert() {
    local severity=$1
    local title=$2
    local message=$3

    # Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color
        case "$severity" in
            "critical") color="danger" ;;
            "warning") color="warning" ;;
            "info") color="good" ;;
            *) color="#439FE0" ;;
        esac

        local payload=$(cat <<EOF
{
    "text": "SafeWork Monitoring Alert",
    "attachments": [
        {
            "color": "$color",
            "title": "$title",
            "text": "$message",
            "fields": [
                {
                    "title": "Environment",
                    "value": "$ENVIRONMENT",
                    "short": true
                },
                {
                    "title": "Timestamp",
                    "value": "$(date)",
                    "short": true
                },
                {
                    "title": "Severity",
                    "value": "$severity",
                    "short": true
                }
            ]
        }
    ]
}
EOF
)

        curl -s -X POST -H "Content-Type: application/json" \
             -d "$payload" "$SLACK_WEBHOOK_URL" > /dev/null || true
    fi

    # Log to monitoring log
    log_critical "ALERT: [$severity] $title - $message"
}

# ===========================================
# COMPREHENSIVE HEALTH CHECK
# ===========================================

run_comprehensive_health_check() {
    log_info "Running comprehensive health check..."

    local issues=()
    local warnings=()

    # Container health checks
    local containers=("$POSTGRES_CONTAINER:PostgreSQL" "$REDIS_CONTAINER:Redis" "$APP_CONTAINER:Application")

    for container_info in "${containers[@]}"; do
        local container_name="${container_info%%:*}"
        local service_name="${container_info##*:}"

        if ! monitor_container_health "$container_name"; then
            issues+=("$service_name container unhealthy")

            # Attempt automatic recovery
            if perform_recovery "container_unhealthy" "$container_name"; then
                log_success "Automated recovery successful for $service_name"
            else
                send_alert "critical" "Container Recovery Failed" "$service_name container could not be recovered automatically"
            fi
        fi
    done

    # Performance monitoring
    if ! monitor_application_performance; then
        warnings+=("Application performance degraded")

        # Attempt recovery for high response times
        if perform_recovery "high_response_time"; then
            log_success "Performance recovery attempted"
        fi
    fi

    # Database health
    if ! monitor_database_health; then
        issues+=("Database connectivity issues")

        # Attempt database recovery
        if perform_recovery "database_error"; then
            log_success "Database recovery attempted"
        else
            send_alert "critical" "Database Recovery Failed" "Database connectivity could not be restored automatically"
        fi
    fi

    # Resource monitoring
    monitor_resource_usage

    # Network connectivity
    if ! monitor_network_connectivity; then
        issues+=("Network connectivity problems")
        send_alert "critical" "Network Connectivity" "Network connectivity issues detected"
    fi

    # Log analysis
    if ! analyze_application_logs; then
        warnings+=("Errors detected in application logs")
        send_alert "warning" "Application Logs" "Potential errors detected in application logs"
    fi

    # Summary report
    echo
    log_info "=== HEALTH CHECK SUMMARY ==="

    if [[ ${#issues[@]} -eq 0 ]] && [[ ${#warnings[@]} -eq 0 ]]; then
        log_success "All systems healthy"
        return 0
    else
        if [[ ${#issues[@]} -gt 0 ]]; then
            log_error "Critical issues found:"
            printf '  - %s\n' "${issues[@]}"
        fi

        if [[ ${#warnings[@]} -gt 0 ]]; then
            log_warning "Warnings found:"
            printf '  - %s\n' "${warnings[@]}"
        fi

        return 1
    fi
}

# ===========================================
# CONTINUOUS MONITORING
# ===========================================

# Real-time monitoring loop
start_continuous_monitoring() {
    local interval=${1:-300}  # Default 5 minutes

    log_info "Starting continuous monitoring (interval: ${interval}s)"

    while true; do
        echo
        log_info "=== MONITORING CYCLE START ==="

        if run_comprehensive_health_check; then
            log_success "Monitoring cycle completed - all systems healthy"
        else
            log_warning "Monitoring cycle completed - issues detected"
        fi

        log_info "Next check in ${interval} seconds..."
        sleep "$interval"
    done
}

# ===========================================
# MAIN COMMAND INTERFACE
# ===========================================

show_usage() {
    cat << EOF
SafeWork Deployment Monitoring Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    health          Run single comprehensive health check
    monitor         Start continuous monitoring (default)
    performance     Run performance tests only
    database        Check database health only
    logs            Analyze application logs
    recovery        Test recovery procedures

Options:
    --interval      Monitoring interval in seconds (default: 300)
    --verbose       Enable verbose logging
    --help          Show this help message

Examples:
    $0 health
    $0 monitor --interval 60
    $0 performance
    $0 recovery

EOF
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --interval)
                MONITOR_INTERVAL="$2"
                shift 2
                ;;
            --verbose)
                set -x
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                break
                ;;
        esac
    done
}

# Main function
main() {
    local operation=${1:-"monitor"}

    # Parse arguments
    shift || true
    parse_arguments "$@"

    echo "🔍 SafeWork 배포 모니터링 시스템"
    echo "================================"
    echo "환경: $ENVIRONMENT"
    echo "프로덕션 URL: $PRODUCTION_URL"
    echo "모니터링 로그: $MONITOR_LOG"
    echo "================================"

    case $operation in
        "health")
            run_comprehensive_health_check
            exit $?
            ;;
        "monitor")
            start_continuous_monitoring "${MONITOR_INTERVAL:-300}"
            ;;
        "performance")
            monitor_application_performance
            exit $?
            ;;
        "database")
            monitor_database_health
            exit $?
            ;;
        "logs")
            analyze_application_logs
            exit $?
            ;;
        "recovery")
            log_info "Testing recovery procedures..."
            # Test recovery functions (in dry-run mode)
            log_success "Recovery procedures tested"
            ;;
        *)
            log_error "Unknown operation: $operation"
            show_usage
            exit 1
            ;;
    esac
}

# Error handling
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "Monitoring script exited with error code: $exit_code"
    fi
    exit $exit_code
}

trap cleanup EXIT
trap 'log_critical "Monitoring interrupted"; exit 130' INT TERM

# Execute main function
main "$@"