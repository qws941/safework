const fs = require('fs');

// Flask 템플릿 읽기
const flaskTemplate = fs.readFileSync('/home/jclee/app/safework/cloudflare-workers/flask_template.html', 'utf8');

// body 내용만 추출 (form 부분)
const formMatch = flaskTemplate.match(/<form[^>]*>([\s\S]*?)<\/form>/);
if (!formMatch) {
  console.error('Form not found');
  process.exit(1);
}

const formContent = formMatch[1]
  // Jinja2 템플릿 변수 제거
  .replace(/\{\{[^}]+\}\}/g, '')
  .replace(/\{%[^%]+%\}/g, '')
  // url_for 제거
  .replace(/url_for\([^)]+\)/g, '#')
  // CSRF token 필드 제거
  .replace(/<input[^>]*name="csrf_token"[^>]*>/g, '')
  // 백틱 이스케이프
  .replace(/`/g, '\\`')
  // 달러 기호 이스케이프
  .replace(/\$/g, '\\$');

console.log('Form content extracted:', formContent.substring(0, 200) + '...');
fs.writeFileSync('/tmp/form_content.html', formContent);
console.log('Saved to /tmp/form_content.html');
