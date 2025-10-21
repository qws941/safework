/**
 * SafeWork Slack App Manifest
 *
 * Slack 앱의 모든 기능, 함수, 워크플로우를 정의합니다.
 */

import { Manifest } from "deno-slack-sdk/mod.ts";
import { SendDeploymentNotificationFunction } from "./functions/send_deployment_notification.ts";
import { SendErrorNotificationFunction } from "./functions/send_error_notification.ts";
import { SendSecurityAlertFunction } from "./functions/send_security_alert.ts";
import { SendTestResultFunction } from "./functions/send_test_result.ts";
import DeploymentWorkflow from "./workflows/deployment_workflow.ts";
import ErrorMonitoringWorkflow from "./workflows/error_monitoring_workflow.ts";
import SecurityMonitoringWorkflow from "./workflows/security_monitoring_workflow.ts";

/**
 * SafeWork Notifier 앱 매니페스트
 */
export default Manifest({
  name: "SafeWork Notifier",
  description: "SafeWork 산업안전보건 관리 시스템 통합 알림 봇",
  icon: "assets/icon.png",
  functions: [
    SendDeploymentNotificationFunction,
    SendErrorNotificationFunction,
    SendSecurityAlertFunction,
    SendTestResultFunction,
  ],
  workflows: [
    DeploymentWorkflow,
    ErrorMonitoringWorkflow,
    SecurityMonitoringWorkflow,
  ],
  outgoingDomains: [
    "safework.jclee.me",
    "safework.jclee.workers.dev",
  ],
  botScopes: [
    "commands",
    "chat:write",
    "chat:write.public",
    "channels:read",
    "channels:history",
    "users:read",
  ],
});
