#!/bin/bash
# Ensure SafeWork network exists without duplication

set -euo pipefail

NETWORK_NAME="safework_network"

# Check if network exists
if docker network ls --format "{{.Name}}" | grep -q "^${NETWORK_NAME}$"; then
    echo "✓ Network '${NETWORK_NAME}' already exists"
else
    echo "Creating network '${NETWORK_NAME}'..."
    docker network create ${NETWORK_NAME}
    echo "✓ Network '${NETWORK_NAME}' created"
fi

# Clean up any duplicate networks
echo "Checking for duplicate networks..."
DUPLICATE_NETWORKS=$(docker network ls --format "{{.ID}} {{.Name}}" | grep "safework" | grep -v "^[^ ]* ${NETWORK_NAME}$" || true)

if [ -n "$DUPLICATE_NETWORKS" ]; then
    echo "Found duplicate networks to remove:"
    echo "$DUPLICATE_NETWORKS"
    echo "$DUPLICATE_NETWORKS" | awk '{print $1}' | while read -r network_id; do
        echo "Removing network: $network_id"
        docker network rm "$network_id" 2>/dev/null || echo "  Could not remove (may be in use)"
    done
else
    echo "✓ No duplicate networks found"
fi

echo "✓ Network setup complete"