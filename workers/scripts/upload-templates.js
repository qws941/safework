#!/usr/bin/env node

/**
 * Upload Intuitive Survey Templates to Cloudflare KV
 * 직관적 설문지 템플릿을 Cloudflare KV에 업로드하는 스크립트
 */

const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = '../../app/templates/survey';
const WRANGLER_COMMAND = 'npx wrangler kv key put';
const KV_NAMESPACE = '--binding=SAFEWORK_KV --remote';

async function uploadTemplate(templateFile, kvKey) {
  const templatePath = path.resolve(__dirname, TEMPLATES_DIR, templateFile);

  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Template not found: ${templatePath}`);
    return false;
  }

  const templateContent = fs.readFileSync(templatePath, 'utf8');

  // Create temporary file for upload
  const tempFile = `/tmp/${kvKey}.html`;
  fs.writeFileSync(tempFile, templateContent);

  try {
    const { execSync } = require('child_process');
    const command = `${WRANGLER_COMMAND} "${kvKey}" --path="${tempFile}" ${KV_NAMESPACE}`;

    console.log(`📤 Uploading ${templateFile} to KV key: ${kvKey}`);
    execSync(command, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });

    // Clean up temp file
    fs.unlinkSync(tempFile);

    console.log(`✅ Successfully uploaded ${kvKey}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to upload ${kvKey}:`, error.message);
    // Clean up temp file on error
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    return false;
  }
}

async function uploadAllTemplates() {
  console.log('🚀 SafeWork Intuitive Templates Upload Starting...\n');

  const templates = [
    {
      file: '001_musculoskeletal_symptom_survey_intuitive.html',
      key: 'template_001_intuitive'
    },
    {
      file: '002_musculoskeletal_symptom_program_intuitive.html',
      key: 'template_002_intuitive'
    }
  ];

  let successCount = 0;

  for (const template of templates) {
    const success = await uploadTemplate(template.file, template.key);
    if (success) successCount++;
    console.log(''); // Add spacing
  }

  console.log(`📊 Upload Summary: ${successCount}/${templates.length} templates uploaded successfully`);

  if (successCount === templates.length) {
    console.log('🎉 All intuitive templates uploaded to Cloudflare KV!');
    console.log('\n📋 Available URLs:');
    console.log('   • https://safework.jclee.me/survey/001_musculoskeletal_symptom_survey_intuitive');
    console.log('   • https://safework.jclee.me/survey/002_musculoskeletal_symptom_program_intuitive');
  } else {
    console.log('⚠️ Some uploads failed. Please check errors above.');
    process.exit(1);
  }
}

// Check if wrangler is available
try {
  const { execSync } = require('child_process');
  execSync('npx wrangler --version', { stdio: 'pipe' });
} catch (error) {
  console.error('❌ Wrangler CLI not found. Please install: npm install wrangler');
  process.exit(1);
}

uploadAllTemplates().catch(error => {
  console.error('❌ Upload failed:', error);
  process.exit(1);
});