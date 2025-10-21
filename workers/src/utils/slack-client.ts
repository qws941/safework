/**
 * Slack 클라이언트 - SafeWork 알림 시스템
 *
 * 주요 기능:
 * - 배포 알림
 * - 에러 알림
 * - 보안 경고
 * - 성능 모니터링 알림
 */

export interface SlackMessage {
  channel?: string;
  text: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  thread_ts?: string; // 스레드 응답용
}

export interface SlackBlock {
  type: 'section' | 'header' | 'divider' | 'context' | 'actions';
  text?: {
    type: 'mrkdwn' | 'plain_text';
    text: string;
  };
  fields?: Array<{
    type: 'mrkdwn' | 'plain_text';
    text: string;
  }>;
  accessory?: any;
  elements?: any[];
}

export interface SlackAttachment {
  color?: 'good' | 'warning' | 'danger' | string;
  title?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
  footer?: string;
  ts?: number;
}

/**
 * Slack 웹훅으로 메시지 전송
 */
export async function sendSlackWebhook(
  webhookUrl: string,
  message: SlackMessage
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send Slack webhook:', error);
    return false;
  }
}

/**
 * Slack Bot API로 메시지 전송 (더 고급 기능)
 */
export async function sendSlackMessage(
  botToken: string,
  channel: string,
  message: SlackMessage
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        ...message,
      }),
    });

    const data = await response.json();
    return data as { ok: boolean; ts?: string; error?: string };
  } catch (error) {
    console.error('Failed to send Slack message:', error);
    return { ok: false, error: String(error) };
  }
}

/**
 * 배포 알림 (성공)
 */
export function createDeploymentSuccessMessage(details: {
  environment: string;
  version: string;
  deployer: string;
  duration: number;
  url: string;
}): SlackMessage {
  return {
    text: `✅ SafeWork 배포 성공: ${details.environment}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '✅ 배포 성공',
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*환경:*\n${details.environment}`,
          },
          {
            type: 'mrkdwn',
            text: `*버전:*\n${details.version}`,
          },
          {
            type: 'mrkdwn',
            text: `*배포자:*\n${details.deployer}`,
          },
          {
            type: 'mrkdwn',
            text: `*소요시간:*\n${details.duration}초`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*URL:* <${details.url}|${details.url}>`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `<!date^${Math.floor(Date.now() / 1000)}^{date_num} {time_secs}|${new Date().toISOString()}>`,
          },
        ],
      },
    ],
  };
}

/**
 * 배포 알림 (실패)
 */
export function createDeploymentFailureMessage(details: {
  environment: string;
  version: string;
  deployer: string;
  error: string;
  logs?: string;
}): SlackMessage {
  return {
    text: `❌ SafeWork 배포 실패: ${details.environment}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '❌ 배포 실패',
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*환경:*\n${details.environment}`,
          },
          {
            type: 'mrkdwn',
            text: `*버전:*\n${details.version}`,
          },
          {
            type: 'mrkdwn',
            text: `*배포자:*\n@${details.deployer}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*에러:*\n\`\`\`${details.error}\`\`\``,
        },
      },
    ],
    attachments: details.logs
      ? [
          {
            color: 'danger',
            title: '📋 배포 로그',
            text: details.logs.substring(0, 2000), // Slack 제한
            footer: 'SafeWork CI/CD',
            ts: Math.floor(Date.now() / 1000),
          },
        ]
      : undefined,
  };
}

/**
 * 에러 알림 (프로덕션)
 */
export function createErrorAlertMessage(details: {
  severity: 'low' | 'medium' | 'high' | 'critical';
  error: string;
  path: string;
  method: string;
  user?: string;
  ip?: string;
  stackTrace?: string;
}): SlackMessage {
  const severityEmoji = {
    low: '⚠️',
    medium: '🟠',
    high: '🔴',
    critical: '🚨',
  };

  const severityColor = {
    low: '#FFFF00',
    medium: '#FFA500',
    high: '#FF0000',
    critical: '#8B0000',
  };

  return {
    text: `${severityEmoji[details.severity]} SafeWork 에러: ${details.error}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${severityEmoji[details.severity]} 프로덕션 에러 발생`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*심각도:*\n${details.severity.toUpperCase()}`,
          },
          {
            type: 'mrkdwn',
            text: `*경로:*\n\`${details.method} ${details.path}\``,
          },
          {
            type: 'mrkdwn',
            text: `*사용자:*\n${details.user || 'Anonymous'}`,
          },
          {
            type: 'mrkdwn',
            text: `*IP:*\n\`${details.ip || 'Unknown'}\``,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*에러 메시지:*\n\`\`\`${details.error}\`\`\``,
        },
      },
    ],
    attachments: details.stackTrace
      ? [
          {
            color: severityColor[details.severity],
            title: '🔍 Stack Trace',
            text: details.stackTrace.substring(0, 2000),
            footer: 'SafeWork Error Tracker',
            ts: Math.floor(Date.now() / 1000),
          },
        ]
      : undefined,
  };
}

/**
 * 보안 경고
 */
export function createSecurityAlertMessage(details: {
  type: 'brute_force' | 'sql_injection' | 'xss' | 'rate_limit' | 'suspicious_activity';
  description: string;
  ip: string;
  userAgent?: string;
  attempts?: number;
  path?: string;
}): SlackMessage {
  const typeEmoji = {
    brute_force: '🔨',
    sql_injection: '💉',
    xss: '🕷️',
    rate_limit: '🚦',
    suspicious_activity: '👀',
  };

  return {
    text: `🚨 보안 경고: ${details.type}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${typeEmoji[details.type]} 보안 경고: ${details.type.replace('_', ' ').toUpperCase()}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*IP 주소:*\n\`${details.ip}\``,
          },
          {
            type: 'mrkdwn',
            text: `*시도 횟수:*\n${details.attempts || 'N/A'}`,
          },
          {
            type: 'mrkdwn',
            text: `*경로:*\n\`${details.path || 'N/A'}\``,
          },
          {
            type: 'mrkdwn',
            text: `*User Agent:*\n\`${details.userAgent?.substring(0, 50) || 'Unknown'}\``,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*설명:*\n${details.description}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '⚡️ 자동으로 IP를 블록 리스트에 추가했습니다.',
          },
        ],
      },
    ],
    attachments: [
      {
        color: 'danger',
        footer: 'SafeWork Security Monitor',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

/**
 * 성능 경고
 */
export function createPerformanceAlertMessage(details: {
  metric: 'response_time' | 'error_rate' | 'availability';
  current: number;
  threshold: number;
  unit: string;
}): SlackMessage {
  const metricLabels = {
    response_time: '응답 시간',
    error_rate: '에러율',
    availability: '가용성',
  };

  const emoji = details.current > details.threshold ? '📉' : '📈';

  return {
    text: `⚠️ 성능 경고: ${metricLabels[details.metric]} 임계값 초과`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} 성능 경고`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*지표:*\n${metricLabels[details.metric]}`,
          },
          {
            type: 'mrkdwn',
            text: `*현재값:*\n${details.current} ${details.unit}`,
          },
          {
            type: 'mrkdwn',
            text: `*임계값:*\n${details.threshold} ${details.unit}`,
          },
          {
            type: 'mrkdwn',
            text: `*초과율:*\n${((details.current / details.threshold - 1) * 100).toFixed(1)}%`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<https://grafana.jclee.me/d/safework|📊 Grafana 대시보드에서 확인>`,
        },
      },
    ],
  };
}

/**
 * 테스트 결과 알림
 */
export function createTestResultMessage(details: {
  passed: number;
  failed: number;
  total: number;
  coverage: number;
  duration: number;
  failedTests?: string[];
}): SlackMessage {
  const success = details.failed === 0;
  const emoji = success ? '✅' : '❌';
  const color = success ? 'good' : 'danger';

  return {
    text: `${emoji} 테스트 결과: ${details.passed}/${details.total} 통과`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} 테스트 결과`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*통과:*\n${details.passed} / ${details.total}`,
          },
          {
            type: 'mrkdwn',
            text: `*실패:*\n${details.failed}`,
          },
          {
            type: 'mrkdwn',
            text: `*커버리지:*\n${details.coverage.toFixed(1)}%`,
          },
          {
            type: 'mrkdwn',
            text: `*소요시간:*\n${details.duration.toFixed(1)}초`,
          },
        ],
      },
    ],
    attachments:
      details.failedTests && details.failedTests.length > 0
        ? [
            {
              color,
              title: '실패한 테스트',
              text: details.failedTests.map((t) => `• ${t}`).join('\n'),
              footer: 'SafeWork CI',
              ts: Math.floor(Date.now() / 1000),
            },
          ]
        : undefined,
  };
}

/**
 * 일일 요약 리포트
 */
export function createDailySummaryMessage(details: {
  date: string;
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
  newUsers: number;
  surveysSubmitted: number;
  errors: number;
}): SlackMessage {
  return {
    text: `📊 SafeWork 일일 요약: ${details.date}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📊 일일 요약 - ${details.date}`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*트래픽 & 성능*',
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*총 요청:*\n${details.totalRequests.toLocaleString()}`,
          },
          {
            type: 'mrkdwn',
            text: `*성공률:*\n${details.successRate.toFixed(2)}%`,
          },
          {
            type: 'mrkdwn',
            text: `*평균 응답시간:*\n${details.avgResponseTime}ms`,
          },
          {
            type: 'mrkdwn',
            text: `*에러:*\n${details.errors}`,
          },
        ],
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*사용자 활동*',
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*신규 가입:*\n${details.newUsers}명`,
          },
          {
            type: 'mrkdwn',
            text: `*설문 제출:*\n${details.surveysSubmitted}건`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<https://grafana.jclee.me/d/safework|📊 상세 대시보드 보기>`,
        },
      },
    ],
  };
}
