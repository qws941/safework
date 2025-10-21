#!/usr/bin/env node
/**
 * Slack 테스트 결과 리포터
 *
 * GitHub Actions에서 테스트 결과를 Slack으로 전송
 *
 * Usage:
 *   node scripts/slack-test-reporter.ts <test-results.json>
 */

import { readFileSync } from 'fs';
import { createTestResultMessage, sendSlackWebhook } from '../src/utils/slack-client';

interface TestResult {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  testResults: Array<{
    name: string;
    status: 'passed' | 'failed';
    message?: string;
  }>;
  coverageMap?: {
    total: {
      statements: { pct: number };
      branches: { pct: number };
      functions: { pct: number };
      lines: { pct: number };
    };
  };
  startTime: number;
  endTime: number;
}

async function main() {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('Error: SLACK_WEBHOOK_URL environment variable not set');
    process.exit(1);
  }

  // GitHub Actions에서 제공하는 환경 변수
  const githubActor = process.env.GITHUB_ACTOR || 'Unknown';
  const githubRef = process.env.GITHUB_REF || 'Unknown';
  const githubSha = process.env.GITHUB_SHA?.substring(0, 7) || 'Unknown';
  const githubWorkflow = process.env.GITHUB_WORKFLOW || 'Test';

  // 테스트 결과 파일 읽기 (Vitest JSON 출력)
  const resultsFile = process.argv[2] || 'test-results.json';
  let testResults: TestResult;

  try {
    const rawData = readFileSync(resultsFile, 'utf-8');
    testResults = JSON.parse(rawData);
  } catch (error) {
    console.error(`Failed to read test results from ${resultsFile}:`, error);
    process.exit(1);
  }

  // 실패한 테스트 목록 추출
  const failedTests = testResults.testResults
    .filter((t) => t.status === 'failed')
    .map((t) => `${t.name}: ${t.message || 'No message'}`)
    .slice(0, 10); // 최대 10개만 표시

  // 커버리지 계산
  const coverage = testResults.coverageMap
    ? (
        (testResults.coverageMap.total.statements.pct +
          testResults.coverageMap.total.branches.pct +
          testResults.coverageMap.total.functions.pct +
          testResults.coverageMap.total.lines.pct) /
        4
      )
    : 0;

  // 실행 시간 계산 (초)
  const duration = (testResults.endTime - testResults.startTime) / 1000;

  // Slack 메시지 생성
  const message = createTestResultMessage({
    passed: testResults.numPassedTests,
    failed: testResults.numFailedTests,
    total: testResults.numTotalTests,
    coverage,
    duration,
    failedTests: failedTests.length > 0 ? failedTests : undefined,
  });

  // GitHub 정보 추가
  message.blocks?.push({
    type: 'divider',
  });
  message.blocks?.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `*Workflow:* ${githubWorkflow} | *Branch:* ${githubRef.replace('refs/heads/', '')} | *Commit:* \`${githubSha}\` | *Author:* ${githubActor}`,
      },
    ],
  });

  // Slack으로 전송
  console.log('Sending test results to Slack...');
  const success = await sendSlackWebhook(webhookUrl, message);

  if (success) {
    console.log('✅ Test results sent to Slack successfully');
  } else {
    console.error('❌ Failed to send test results to Slack');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
