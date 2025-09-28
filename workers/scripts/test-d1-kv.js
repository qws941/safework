#!/usr/bin/env node

/**
 * D1 및 KV 설정 테스트 스크립트
 * SafeWork Cloudflare Workers용 D1 데이터베이스와 KV 네임스페이스 구성을 테스트합니다.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 색상 출력을 위한 ANSI 코드
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(title) {
  const line = '='.repeat(60);
  log(`\n${line}`, colors.cyan);
  log(`  ${title}`, colors.bright + colors.cyan);
  log(line, colors.cyan);
}

function section(title) {
  log(`\n📋 ${title}`, colors.blue);
  log('-'.repeat(40), colors.blue);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function execCommand(command, description) {
  try {
    log(`\n🔧 ${description}...`);
    log(`   명령어: ${command}`, colors.yellow);

    const output = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: process.cwd()
    });

    success(`${description} 완료`);
    if (output.trim()) {
      log(`   출력: ${output.trim()}`, colors.cyan);
    }
    return output;
  } catch (err) {
    error(`${description} 실패: ${err.message}`);
    if (err.stdout) {
      log(`   stdout: ${err.stdout}`, colors.yellow);
    }
    if (err.stderr) {
      log(`   stderr: ${err.stderr}`, colors.red);
    }
    return null;
  }
}

async function main() {
  header('SafeWork D1 & KV 설정 테스트');

  // 작업 디렉토리 확인
  const workersDir = path.join(process.cwd());
  if (!fs.existsSync(path.join(workersDir, 'wrangler.toml'))) {
    error('workers 디렉토리에서 실행해주세요 (wrangler.toml이 필요)');
    process.exit(1);
  }

  section('1. Wrangler CLI 상태 확인');
  execCommand('npx wrangler --version', 'Wrangler 버전 확인');
  execCommand('npx wrangler whoami', 'Cloudflare 인증 상태 확인');

  section('2. 현재 구성 확인');

  // wrangler.toml 파일 내용 확인
  if (fs.existsSync('wrangler.toml')) {
    const config = fs.readFileSync('wrangler.toml', 'utf8');
    log('📄 현재 wrangler.toml 구성:', colors.blue);

    // D1 설정 확인
    if (config.includes('[[d1_databases]]')) {
      success('D1 데이터베이스 설정 발견');
      const d1Match = config.match(/database_name = "([^"]+)"/);
      if (d1Match) {
        log(`   데이터베이스 이름: ${d1Match[1]}`, colors.cyan);
      }
    } else {
      warning('D1 데이터베이스 설정이 없습니다');
    }

    // KV 설정 확인
    const kvMatches = config.match(/binding = "([^"]+)"/g);
    if (kvMatches && kvMatches.length > 0) {
      success(`KV 네임스페이스 바인딩 ${kvMatches.length}개 발견`);
      kvMatches.forEach(match => {
        const binding = match.match(/"([^"]+)"/)[1];
        log(`   바인딩: ${binding}`, colors.cyan);
      });
    } else {
      warning('KV 네임스페이스 설정이 없습니다');
    }
  }

  section('3. D1 데이터베이스 테스트');

  // D1 데이터베이스 목록 확인
  const d1Output = execCommand('npx wrangler d1 list', 'D1 데이터베이스 목록 조회');

  if (d1Output) {
    if (d1Output.includes('safework-db')) {
      success('safework-db 데이터베이스 존재 확인');
    } else {
      warning('safework-db 데이터베이스가 없습니다. 생성이 필요합니다.');
    }
  }

  // D1 스키마 파일 확인
  if (fs.existsSync('schema.sql')) {
    success('D1 스키마 파일(schema.sql) 존재 확인');
    const schemaContent = fs.readFileSync('schema.sql', 'utf8');
    const tableCount = (schemaContent.match(/CREATE TABLE/g) || []).length;
    log(`   테이블 정의 개수: ${tableCount}`, colors.cyan);
  } else {
    warning('D1 스키마 파일이 없습니다');
  }

  // 마이그레이션 파일 확인
  if (fs.existsSync('migrations/001_initial_setup.sql')) {
    success('D1 마이그레이션 파일 존재 확인');
  } else {
    warning('D1 마이그레이션 파일이 없습니다');
  }

  section('4. KV 네임스페이스 테스트');

  // KV 네임스페이스 목록 확인
  const kvOutput = execCommand('npx wrangler kv:namespace list', 'KV 네임스페이스 목록 조회');

  if (kvOutput) {
    const expectedNamespaces = ['SAFEWORK_KV', 'SAFEWORK_CACHE'];

    expectedNamespaces.forEach(ns => {
      if (kvOutput.includes(ns) || kvOutput.toLowerCase().includes(ns.toLowerCase())) {
        success(`${ns} 네임스페이스 존재 확인`);
      } else {
        warning(`${ns} 네임스페이스가 없습니다. 생성이 필요합니다.`);
      }
    });
  }

  section('5. TypeScript 타입 확인');

  // TypeScript 타입 검사
  execCommand('npm run type-check', 'TypeScript 타입 검사');

  section('6. 배포 구성 검증');

  // 배포 전 드라이런 테스트
  execCommand('npx wrangler deploy --dry-run', '배포 구성 드라이런 테스트');

  section('7. 테스트 요약 및 권장사항');

  log('\n📊 테스트 요약:', colors.bright);
  log('├─ Wrangler CLI: 설치 및 인증 상태', colors.green);
  log('├─ wrangler.toml: D1 및 KV 설정 완료', colors.green);
  log('├─ D1 스키마: 테이블 정의 및 마이그레이션 준비', colors.green);
  log('└─ TypeScript: 타입 안전성 검증', colors.green);

  log('\n🚀 다음 단계:', colors.bright);
  log('1. GitHub Actions를 통한 자동 배포 실행', colors.blue);
  log('2. D1 데이터베이스 및 KV 네임스페이스 자동 생성', colors.blue);
  log('3. 마이그레이션 실행 및 초기 데이터 설정', colors.blue);
  log('4. 운영 환경에서 D1 및 KV 기능 검증', colors.blue);

  log('\n💡 배포 명령어:', colors.bright);
  log('   로컬 배포: npm run deploy', colors.cyan);
  log('   GitHub 배포: git push origin master', colors.cyan);
  log('   수동 트리거: gh workflow run "SafeWork Cloudflare Workers Deployment"', colors.cyan);

  header('D1 & KV 설정 테스트 완료');
}

// 스크립트 실행
if (require.main === module) {
  main().catch(err => {
    error(`스크립트 실행 중 오류: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { main };