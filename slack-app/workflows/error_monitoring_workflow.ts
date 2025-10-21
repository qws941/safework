/**
 * SafeWork 에러 모니터링 워크플로우
 *
 * 프로덕션 에러를 모니터링하고 알림을 전송합니다.
 */

import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SendErrorNotificationFunction } from "../functions/send_error_notification.ts";

/**
 * 에러 모니터링 워크플로우 정의
 */
export const ErrorMonitoringWorkflow = DefineWorkflow({
  callback_id: "error_monitoring_workflow",
  title: "SafeWork Error Monitoring Workflow",
  description: "Monitors and reports production errors",
  input_parameters: {
    properties: {
      channel: {
        type: Schema.slack.types.channel_id,
        description: "Notification channel",
      },
      severity: {
        type: Schema.types.string,
        description: "Error severity",
      },
      error_message: {
        type: Schema.types.string,
        description: "Error message",
      },
      path: {
        type: Schema.types.string,
        description: "Request path",
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
});

// 에러 알림 전송
const errorNotificationStep = ErrorMonitoringWorkflow.addStep(
  SendErrorNotificationFunction,
  {
    channel: ErrorMonitoringWorkflow.inputs.channel,
    severity: ErrorMonitoringWorkflow.inputs.severity,
    error_message: ErrorMonitoringWorkflow.inputs.error_message,
    path: ErrorMonitoringWorkflow.inputs.path,
    method: ErrorMonitoringWorkflow.inputs.method,
    status_code: ErrorMonitoringWorkflow.inputs.status_code,
    ip: ErrorMonitoringWorkflow.inputs.ip,
    user_agent: ErrorMonitoringWorkflow.inputs.user_agent,
    stack_trace: ErrorMonitoringWorkflow.inputs.stack_trace,
  },
);

export default ErrorMonitoringWorkflow;
