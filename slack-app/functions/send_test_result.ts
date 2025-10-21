/**
 * SafeWork 테스트 결과 알림 Function
 *
 * CI/CD 파이프라인의 테스트 결과를 Slack 채널에 알림합니다.
 */

import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

/**
 * 테스트 결과 알림 Function 정의
 */
export const SendTestResultFunction = DefineFunction({
  callback_id: "send_test_result",
  title: "Send Test Result",
  description: "Send SafeWork test results to Slack",
  source_file: "functions/send_test_result.ts",
  input_parameters: {
    properties: {
      channel: {
        type: Schema.slack.types.channel_id,
        description: "Channel to send notification to",
      },
      success: {
        type: Schema.types.boolean,
        description: "Overall test success status",
      },
      total_tests: {
        type: Schema.types.number,
        description: "Total number of tests",
      },
      passed_tests: {
        type: Schema.types.number,
        description: "Number of passed tests",
      },
      failed_tests: {
        type: Schema.types.number,
        description: "Number of failed tests",
      },
      skipped_tests: {
        type: Schema.types.number,
        description: "Number of skipped tests",
      },
      coverage: {
        type: Schema.types.number,
        description: "Code coverage percentage",
      },
      duration: {
        type: Schema.types.number,
        description: "Test duration in seconds",
      },
      commit_sha: {
        type: Schema.types.string,
        description: "Git commit SHA",
      },
      branch: {
        type: Schema.types.string,
        description: "Git branch name",
      },
      author: {
        type: Schema.types.string,
        description: "Commit author",
      },
      failed_test_details: {
        type: Schema.types.string,
        description: "Details of failed tests (JSON string)",
      },
    },
    required: ["channel", "success", "total_tests", "passed_tests", "failed_tests"],
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
 * 테스트 결과 Function 핸들러
 */
export default SlackFunction(
  SendTestResultFunction,
  async ({ inputs, client }) => {
    const {
      channel,
      success,
      total_tests,
      passed_tests,
      failed_tests,
      skipped_tests,
      coverage,
      duration,
      commit_sha,
      branch,
      author,
      failed_test_details,
    } = inputs;

    // 성공/실패에 따른 설정
    const statusConfig = success
      ? { emoji: "✅", color: "#00ff00", label: "테스트 성공" }
      : { emoji: "❌", color: "#ff0000", label: "테스트 실패" };

    const blocks: any[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${statusConfig.emoji} ${statusConfig.label}`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*전체 테스트:*\n${total_tests}개`,
          },
          {
            type: "mrkdwn",
            text: `*성공:*\n✅ ${passed_tests}개`,
          },
          {
            type: "mrkdwn",
            text: `*실패:*\n❌ ${failed_tests}개`,
          },
          {
            type: "mrkdwn",
            text: `*건너뜀:*\n⏭️ ${skipped_tests || 0}개`,
          },
        ],
      },
    ];

    // 커버리지 정보 추가
    if (coverage !== undefined && coverage !== null) {
      const coverageEmoji = coverage >= 80 ? "✅" : coverage >= 50 ? "⚠️" : "❌";
      blocks.push({
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*커버리지:*\n${coverageEmoji} ${coverage.toFixed(2)}%`,
          },
          {
            type: "mrkdwn",
            text: `*소요시간:*\n⏱️ ${duration?.toFixed(2) || 0}초`,
          },
        ],
      });
    }

    // Git 정보 추가
    const gitFields: any[] = [];
    if (branch) {
      gitFields.push({
        type: "mrkdwn",
        text: `*브랜치:*\n\`${branch}\``,
      });
    }
    if (commit_sha) {
      gitFields.push({
        type: "mrkdwn",
        text: `*커밋:*\n\`${commit_sha.substring(0, 7)}\``,
      });
    }
    if (author) {
      gitFields.push({
        type: "mrkdwn",
        text: `*작성자:*\n${author}`,
      });
    }
    if (gitFields.length > 0) {
      blocks.push({
        type: "section",
        fields: gitFields,
      });
    }

    // 실패한 테스트 상세 정보 추가
    if (!success && failed_test_details) {
      try {
        const failedTests = JSON.parse(failed_test_details);
        if (Array.isArray(failedTests) && failedTests.length > 0) {
          const failedList = failedTests
            .slice(0, 5) // 최대 5개만 표시
            .map((test: any) => `• ${test.name || test}`)
            .join("\n");

          blocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*실패한 테스트:*\n${failedList}${failedTests.length > 5 ? `\n...외 ${failedTests.length - 5}개` : ""}`,
            },
          });
        }
      } catch (error) {
        // JSON 파싱 실패 시 무시
        console.error("Failed to parse failed_test_details:", error);
      }
    }

    // 경고 메시지 (실패한 경우)
    if (!success) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "⚠️ *테스트 실패! 즉시 확인이 필요합니다.*",
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
      text: `${statusConfig.emoji} SafeWork ${statusConfig.label}: ${passed_tests}/${total_tests} 테스트 통과`,
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
