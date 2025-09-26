#!/bin/bash
cat /tmp/postgres_surveys.json | jq -c '.[]' | while IFS= read -r survey; do
  survey_id=$(echo "$survey" | jq -r '.id')
  echo "$survey" > "/tmp/survey_${survey_id}.json"
  npx wrangler kv key put "survey:$survey_id" --path "/tmp/survey_${survey_id}.json" --namespace-id=81ca01654d204124aad62280cebe410e
  echo "✓ Uploaded survey:$survey_id"
done
