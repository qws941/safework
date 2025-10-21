/**
 * SafeWork 보안 알림 Function
 *
 * 보안 이벤트 발생 시 호출되어 Slack 채널에 알림을 전송합니다.
 */

import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

/**
 * 보안 알림 Function 정의
 */
export const SendSecurityAlertFunction = DefineFunction({
  callback_id: "send_security_alert",
  title: "Send Security Alert",
  description: "Send SafeWork security alerts to Slack",
  source_file: "functions/send_security_alert.ts",
  input_parameters: {
    properties: {
      channel: {
        type: Schema.slack.types.channel_id,
        description: "Channel to send notification to",
      },
      event_type: {
        type: Schema.types.string,
        description: "Security event type",
      },
      severity: {
        type: Schema.types.string,
        description: "Alert severity (critical, high, medium, low)",
      },
      description: {
        type: Schema.types.string,
        description: "Event description",
      },
      ip: {
        type: Schema.types.string,
        description: "Source IP address",
      },
      user: {
        type: Schema.types.string,
        description: "User involved (if any)",
      },
      action_taken: {
        type: Schema.types.string,
        description: "Action taken in response",
      },
      additional_info: {
        type: Schema.types.string,
        description: "Additional information",
      },
    },
    required: ["channel", "event_type", "severity", "description"],
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
 * 보안 알림 Function 핸들러
 */
export default SlackFunction(
  SendSecurityAlertFunction,
  async ({ inputs, client }) => {
    const {
      channel,
      event_type,
      severity,
      description,
      ip,
      user,
      action_taken,
      additional_info,
    } = inputs;

    // 심각도에 따른 색상 및 이모지
    const severityConfig = {
      critical: { color: "#ff0000", emoji: "🔴", label: "치명적" },
      high: { color: "#ff9900", emoji: "🟠", label: "높음" },
      medium: { color: "#ffcc00", emoji: "🟡", label: "중간" },
      low: { color: "#00ff00", emoji: "🟢", label: "낮음" },
    };

    const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.medium;

    const blocks: any[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🔒 보안 알림 - ${config.label}`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*이벤트 유형:*\n${event_type}`,
          },
          {
            type: "mrkdwn",
            text: `*심각도:*\n${config.emoji} ${config.label}`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*설명:*\n${description}`,
        },
      },
    ];

    // IP 정보 추가
    const ipFields: any[] = [];
    if (ip) {
      ipFields.push({
        type: "mrkdwn",
        text: `*IP 주소:*\n\`${ip}\``,
      });
    }
    if (user) {
      ipFields.push({
        type: "mrkdwn",
        text: `*사용자:*\n${user}`,
      });
    }
    if (ipFields.length > 0) {
      blocks.push({
        type: "section",
        fields: ipFields,
      });
    }

    // 조치 사항 추가
    if (action_taken) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*조치 사항:*\n${action_taken}`,
        },
      });
    }

    // 추가 정보
    if (additional_info) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*추가 정보:*\n\`\`\`${additional_info}\`\`\``,
        },
      });
    }

    // 경고 메시지 (critical/high인 경우)
    if (severity === "critical" || severity === "high") {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "⚠️ *즉시 확인 및 대응이 필요합니다!*",
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
      text: `🔒 SafeWork 보안 알림 (${config.label}): ${event_type}`,
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
