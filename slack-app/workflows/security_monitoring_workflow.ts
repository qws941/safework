/**
 * SafeWork 보안 모니터링 워크플로우
 *
 * 보안 이벤트를 모니터링하고 알림을 전송합니다.
 */

import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SendSecurityAlertFunction } from "../functions/send_security_alert.ts";

/**
 * 보안 모니터링 워크플로우 정의
 */
export const SecurityMonitoringWorkflow = DefineWorkflow({
  callback_id: "security_monitoring_workflow",
  title: "SafeWork Security Monitoring Workflow",
  description: "Monitors and reports security events",
  input_parameters: {
    properties: {
      channel: {
        type: Schema.slack.types.channel_id,
        description: "Notification channel",
      },
      event_type: {
        type: Schema.types.string,
        description: "Security event type",
      },
      severity: {
        type: Schema.types.string,
        description: "Alert severity",
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
        description: "User involved",
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
});

// 보안 알림 전송
const securityAlertStep = SecurityMonitoringWorkflow.addStep(
  SendSecurityAlertFunction,
  {
    channel: SecurityMonitoringWorkflow.inputs.channel,
    event_type: SecurityMonitoringWorkflow.inputs.event_type,
    severity: SecurityMonitoringWorkflow.inputs.severity,
    description: SecurityMonitoringWorkflow.inputs.description,
    ip: SecurityMonitoringWorkflow.inputs.ip,
    user: SecurityMonitoringWorkflow.inputs.user,
    action_taken: SecurityMonitoringWorkflow.inputs.action_taken,
    additional_info: SecurityMonitoringWorkflow.inputs.additional_info,
  },
);

export default SecurityMonitoringWorkflow;
