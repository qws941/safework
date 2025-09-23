#!/bin/bash

# Read docker-compose.yml and escape it for JSON
COMPOSE_CONTENT=$(cat /home/jclee/app/safework/docker-compose.yml | jq -Rs .)

# Create the stack via Portainer API
curl -X POST \
  -H "X-API-Key: ptr_zdHC0mAdjC7hk7pZ8r2+pJZO+bLxBD/TaB3iPuQwx9Q=" \
  -H "Content-Type: application/json" \
  "https://portainer.jclee.me/api/stacks?type=2&method=string&endpointId=3" \
  -d @- <<EOF
{
  "Name": "safework",
  "StackFileContent": $COMPOSE_CONTENT
}
EOF