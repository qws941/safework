# Docker API v1.24+ Container Start Issue - Comprehensive Analysis

## 🚨 Critical Production Issue

**Status**: UNRESOLVED - SafeWork production site (safework.jclee.me) returning 502 Bad Gateway
**Date**: 2025-09-21
**Impact**: Complete production service outage

## Problem Summary

SafeWork containers are being created successfully via Portainer API but remain stuck in "created" state and cannot be started. This causes the production site to return 502 Bad Gateway errors.

### Root Cause Analysis

Docker API v1.24+ introduced a breaking change that deprecated and removed support for non-empty request bodies when starting containers:

> "starting container with non-empty request body was deprecated since API v1.22 and removed in v1.24"

## Technical Details

### Docker API Version Compatibility
- **Deprecated**: API v1.22 (warning issued)
- **Removed**: API v1.24 (hard failure)
- **Current Production**: Uses Docker API v1.24+ which strictly enforces empty request bodies

### Container States Observed
```bash
# Container IDs created but not started
PostgreSQL: 8275439ab6c1985ccd66f2d6ceacc553e936f383ea18ef50599a369862e277b1
Redis: b91a96cdaf70b0bfeafd52846e012d2a84ca04040243c5eb77100d6062783578
App: 525a9782e666fe1bb256b46242bc5727d992cc7f46c0b8cd1c2c458214ffbef4

# All containers stuck in "created" state
Status: created (cannot transition to "running")
```

## Solutions Attempted

### 1. ✅ Changed RestartPolicy from "unless-stopped" to "always"
- **Result**: Policy correctly set but doesn't help with initial container start
- **Learning**: RestartPolicy only applies after containers have been started at least once

### 2. ✅ Implemented Empty Request Body Fix
- **Implementation**: Modified `unified_stack_deploy.sh` to send empty request bodies
- **Code Change**:
  ```bash
  # Before (failing)
  curl -X POST -H "X-API-Key: $TOKEN" "$URL/start"

  # After (compliant)
  curl -X POST -H "X-API-Key: $TOKEN" -H "Content-Type: application/json" -d "" "$URL/start"
  ```
- **Result**: Still receiving HTTP 400 responses

### 3. ⚠️ Added Error Suppression and Timeout
- **Implementation**: Used timeout and error suppression (|| true)
- **Result**: Prevents script failure but doesn't solve container start issue

## Current Implementation Status

### Updated Container Start Function
```bash
# Docker API v1.24+ compatible container start
start_response=$(curl -s -w "%{http_code}" -X POST \
    -H "X-API-Key: $PORTAINER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "" \
    "$PORTAINER_URL/api/endpoints/$endpoint_id/docker/containers/$container_id/start")

http_code="${start_response: -3}"
if [ "$http_code" = "204" ] || [ "$http_code" = "304" ]; then
    echo "✅ Container started successfully (HTTP $http_code)"
else
    echo "⚠️  Container start returned HTTP $http_code, checking status..."
    # Container status verification
fi
```

### Expected vs Actual Results
- **Expected**: HTTP 204 (No Content) or HTTP 304 (Not Modified) for successful start
- **Actual**: HTTP 400 (Bad Request) - indicating API still rejecting the request

## Research Findings

### Industry Solutions
1. **Empty Request Body**: The primary solution for Docker API v1.24+ compatibility
2. **Configuration at Creation**: All container configuration must be specified during creation, not start
3. **Library Updates**: Various Docker client libraries have been updated to handle this change

### Portainer-Specific Issues
- Multiple GitHub issues document this exact problem with Portainer API
- Some versions of Portainer may have compatibility issues with newer Docker APIs
- Alternative approaches include using Portainer UI directly or SSH access to Docker host

## Workaround Options

### Option 1: Manual Container Start via Portainer UI
```bash
# Navigate to Portainer web interface
# Select containers stuck in "created" state
# Click "Start" button manually
```

### Option 2: Direct Docker Host Access
```bash
# SSH to Docker host and run commands directly
docker start safework-postgres
docker start safework-redis
docker start safework-app
```

### Option 3: Container Recreation Strategy
```bash
# Delete stuck containers and recreate with different approach
docker rm safework-postgres safework-redis safework-app
# Use docker run instead of create+start workflow
```

## Next Steps Required

### Immediate Actions
1. **Manual Recovery**: Use Portainer UI to manually start the created containers
2. **Production Verification**: Confirm SafeWork site accessibility after manual start
3. **Monitor Container Status**: Ensure containers remain running with "always" restart policy

### Long-term Solutions
1. **Docker API Investigation**: Test different API versions and request formats
2. **Portainer Version Check**: Verify Portainer compatibility with current Docker version
3. **Alternative Deployment**: Consider docker-compose or direct Docker commands
4. **Container Runtime Analysis**: Investigate if containers have startup issues beyond API problems

## Environment Information

### Production Infrastructure
- **Portainer URL**: https://portainer.jclee.me
- **Endpoint ID**: 3
- **Docker Registry**: registry.jclee.me
- **Production Site**: https://safework.jclee.me (currently 502 Bad Gateway)

### Container Configuration
- **Network**: safework_network (bridge mode with static IPs)
- **Volumes**: safework_postgres_data, safework_redis_data, safework_app_uploads
- **Images**: All using :latest tags from registry.jclee.me/safework/*

## Impact Assessment

### Business Impact
- **Production Outage**: Complete SafeWork service unavailability
- **User Access**: Industrial safety management system inaccessible
- **Data Integrity**: No data loss (containers created, just not started)

### Technical Impact
- **Container State**: All containers successfully created but non-functional
- **Network Configuration**: Proper network and volume setup completed
- **Image Availability**: All required images successfully pulled

## Lessons Learned

1. **Docker API Evolution**: Breaking changes in Docker API require careful compatibility testing
2. **Container Lifecycle**: Create and Start are separate operations with different requirements
3. **Error Handling**: Silent failures can mask critical deployment issues
4. **Monitoring**: Need better real-time container status validation during deployment

## References

- [Docker API v1.24 Documentation](https://docs.docker.com/reference/api/engine/version/v1.24/)
- [Portainer GitHub Issue #9239](https://github.com/portainer/portainer/issues/9239)
- [Docker Community Forum Discussion](https://forums.docker.com/t/error-starting-container-with-non-empty-request-body-was-deprecated-since-v1-10-and-removed-in-v1-12/30434)
- [Stack Overflow: Starting Container using Docker API](https://stackoverflow.com/questions/44515097/starting-container-using-docker-api)