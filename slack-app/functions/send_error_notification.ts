/**
 * SafeWork 에러 알림 Function
 *
 * 프로덕션 에러 발생 시 호출되어 Slack 채널에 알림을 전송합니다.
 */

import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

/**
 * 에러 알림 Function 정의
 */
export const SendErrorNotificationFunction = DefineFunction({
  callback_id: "send_error_notification",
  title: "Send Error Notification",
  description: "Send SafeWork error notifications to Slack",
  source_file: "functions/send_error_notification.ts",
  input_parameters: {
    properties: {
      channel: {
        type: Schema.slack.types.channel_id,
        description: "Channel to send notification to",
      },
      severity: {
        type: Schema.types.string,
        description: "Error severity (critical, warning, info)",
      },
      error_message: {
        type: Schema.types.string,
        description: "Error message",
      },
      path: {
        type: Schema.types.string,
        description: "Request path where error occurred",
      },
      method: {
        type: Schema.types.string,
        description: "HTTP method",
      },
      status_code: {
        type: Schema.types.number,
        description: "HTTP status code",
      },
      ip: {
        type: Schema.types.string,
        description: "Client IP address",
      },
      user_agent: {
        type: Schema.types.string,
        description: "Client user agent",
      },
      stack_trace: {
        type: Schema.types.string,
        description: "Error stack trace",
      },
    },
    required: ["channel", "severity", "error_message", "path"],
  },
  output_parameters: {
    properties: {
      message_ts: {
        type: Schema.types.string,
        description: "Timestamp of the sent message",
      },
    },
    required: ["message_ts"],
  },
});

/**
 * 에러 알림 Function 핸들러
 */
export default SlackFunction(
  SendErrorNotificationFunction,
  async ({ inputs, client }) => {
    const {
      channel,
      severity,
      error_message,
      path,
      method,
      status_code,
      ip,
      user_agent,
      stack_trace,
    } = inputs;

    // 심각도에 따른 색상 및 이모지
    const severityConfig = {
      critical: { color: "#ff0000", emoji: "🚨", label: "치명적 오류" },
      warning: { color: "#ff9900", emoji: "⚠️", label: "경고" },
      info: { color: "#0099ff", emoji: "ℹ️", label: "정보" },
    };

    const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.info;

    const blocks: any[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${config.emoji} ${config.label}`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*경로:*\n\`${path}\``,
          },
          {
            type: "mrkdwn",
            text: `*메소드:*\n${method || "N/A"}`,
          },
          {
            type: "mrkdwn",
            text: `*상태 코드:*\n${status_code || "N/A"}`,
          },
          {
            type: "mrkdwn",
            text: `*IP:*\n${ip || "Unknown"}`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*에러 메시지:*\n\`\`\`${error_message}\`\`\``,
        },
      },
    ];

    // User Agent 추가 (있는 경우)
    if (user_agent) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*User Agent:*\n\`${user_agent}\``,
        },
      });
    }

    // Stack Trace 추가 (있는 경우)
    if (stack_trace) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Stack Trace:*\n\`\`\`${stack_trace.substring(0, 500)}${stack_trace.length > 500 ? "..." : ""}\`\`\``,
        },
      });
    }

    // 컨텍스트 정보
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `<!date^${Math.floor(Date.now() / 1000)}^{date_num} {time_secs}|${new Date().toISOString()}>`,
        },
      ],
    });

    // 메시지 전송
    const result = await client.chat.postMessage({
      channel: channel,
      text: `${config.emoji} SafeWork ${config.label}: ${error_message}`,
      blocks: blocks,
    });

    if (!result.ok) {
      return {
        error: `Failed to send message: ${result.error}`,
      };
    }

    return {
      outputs: {
        message_ts: result.ts || "",
      },
    };
  },
);
