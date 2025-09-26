const fs = require('fs');
const { execSync } = require('child_process');

const surveys = JSON.parse(fs.readFileSync('/tmp/postgres_surveys.json', 'utf8'));

// Upload each survey to KV
async function migrateSurveys() {
  console.log(`Starting migration of ${surveys.length} surveys...`);

  for (const survey of surveys) {
    const kvKey = `survey:${survey.id}`;
    const kvValue = JSON.stringify(survey);

    console.log(`Uploading ${survey.id}...`);

    // Write to temp file to avoid shell escaping issues
    const tempFile = `/tmp/survey_${survey.id}.json`;
    fs.writeFileSync(tempFile, kvValue);

    try {
      execSync(`npx wrangler kv:key put --binding=SURVEYS "${kvKey}" --path ${tempFile} --env production`, { stdio: 'inherit' });
      console.log(`✓ Uploaded ${survey.id}`);
      fs.unlinkSync(tempFile);
    } catch (error) {
      console.error(`✗ Failed to upload ${survey.id}:`, error.message);
    }
  }

  // Update survey list
  const surveyList = surveys.map(s => ({
    id: s.id,
    form_type: s.form_type,
    submitted_at: s.submitted_at,
    name: s.responses?.name || 'Unknown'
  }));

  const listFile = '/tmp/survey_list.json';
  fs.writeFileSync(listFile, JSON.stringify(surveyList));

  execSync(`npx wrangler kv:key put --binding=SURVEYS "survey_list" --path ${listFile} --env production`, { stdio: 'inherit' });
  console.log('✓ Updated survey list');

  fs.unlinkSync(listFile);
}

migrateSurveys().catch(console.error);
