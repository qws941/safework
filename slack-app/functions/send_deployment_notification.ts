/**
 * SafeWork 배포 알림 Function
 *
 * Cloudflare Workers 배포 시 호출되어 Slack 채널에 알림을 전송합니다.
 */

import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

/**
 * 배포 알림 Function 정의
 */
export const SendDeploymentNotificationFunction = DefineFunction({
  callback_id: "send_deployment_notification",
  title: "Send Deployment Notification",
  description: "Send SafeWork deployment notifications to Slack",
  source_file: "functions/send_deployment_notification.ts",
  input_parameters: {
    properties: {
      channel: {
        type: Schema.slack.types.channel_id,
        description: "Channel to send notification to",
      },
      success: {
        type: Schema.types.boolean,
        description: "Deployment success status",
      },
      environment: {
        type: Schema.types.string,
        description: "Deployment environment (production, staging, etc.)",
      },
      version: {
        type: Schema.types.string,
        description: "Deployment version or commit SHA",
      },
      deployer: {
        type: Schema.types.string,
        description: "Person who triggered the deployment",
      },
      duration: {
        type: Schema.types.number,
        description: "Deployment duration in seconds",
      },
      url: {
        type: Schema.types.string,
        description: "Deployed application URL",
      },
      error_message: {
        type: Schema.types.string,
        description: "Error message (if deployment failed)",
      },
    },
    required: ["channel", "success", "environment", "version", "deployer"],
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
 * 배포 알림 Function 핸들러
 */
export default SlackFunction(
  SendDeploymentNotificationFunction,
  async ({ inputs, client }) => {
    const { channel, success, environment, version, deployer, duration, url, error_message } = inputs;

    // 배포 성공 메시지
    if (success) {
      const result = await client.chat.postMessage({
        channel: channel,
        text: `✅ SafeWork 배포 성공: ${environment}`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "✅ 배포 성공",
            },
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*환경:*\n${environment}`,
              },
              {
                type: "mrkdwn",
                text: `*버전:*\n${version.substring(0, 7)}`,
              },
              {
                type: "mrkdwn",
                text: `*배포자:*\n${deployer}`,
              },
              {
                type: "mrkdwn",
                text: `*소요시간:*\n${duration || 0}초`,
              },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*URL:* <${url || "https://safework.jclee.me"}|${url || "https://safework.jclee.me"}>`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `🎉 Health check 통과 | ⏱️ 배포 완료 | <!date^${Math.floor(Date.now() / 1000)}^{date_num} {time_secs}|${new Date().toISOString()}>`,
              },
            ],
          },
        ],
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
    }

    // 배포 실패 메시지
    const result = await client.chat.postMessage({
      channel: channel,
      text: `❌ SafeWork 배포 실패: ${environment}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "❌ 배포 실패",
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*환경:*\n${environment}`,
            },
            {
              type: "mrkdwn",
              text: `*버전:*\n${version.substring(0, 7)}`,
            },
            {
              type: "mrkdwn",
              text: `*배포자:*\n@${deployer}`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*에러:*\n\`\`\`${error_message || "Unknown error"}\`\`\``,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "⚠️ 즉시 확인이 필요합니다!",
          },
        },
      ],
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
