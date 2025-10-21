/**
 * SafeWork 배포 워크플로우
 *
 * 배포 프로세스를 관리하고 각 단계별로 알림을 전송합니다.
 */

import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SendDeploymentNotificationFunction } from "../functions/send_deployment_notification.ts";
import { SendTestResultFunction } from "../functions/send_test_result.ts";

/**
 * 배포 워크플로우 정의
 */
export const DeploymentWorkflow = DefineWorkflow({
  callback_id: "deployment_workflow",
  title: "SafeWork Deployment Workflow",
  description: "Manages SafeWork deployment process with notifications",
  input_parameters: {
    properties: {
      channel: {
        type: Schema.slack.types.channel_id,
        description: "Notification channel",
      },
      deployment_success: {
        type: Schema.types.boolean,
        description: "Deployment success status",
      },
      environment: {
        type: Schema.types.string,
        description: "Deployment environment",
      },
      version: {
        type: Schema.types.string,
        description: "Deployment version",
      },
      deployer: {
        type: Schema.types.string,
        description: "Person who triggered deployment",
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
        description: "Error message if deployment failed",
      },
      test_total: {
        type: Schema.types.number,
        description: "Total number of tests",
      },
      test_passed: {
        type: Schema.types.number,
        description: "Number of passed tests",
      },
      test_failed: {
        type: Schema.types.number,
        description: "Number of failed tests",
      },
      test_coverage: {
        type: Schema.types.number,
        description: "Test coverage percentage",
      },
    },
    required: [
      "channel",
      "deployment_success",
      "environment",
      "version",
      "deployer",
    ],
  },
});

// Step 1: 테스트 결과 알림 (테스트 정보가 있는 경우)
const testResultStep = DeploymentWorkflow.addStep(
  SendTestResultFunction,
  {
    channel: DeploymentWorkflow.inputs.channel,
    success: DeploymentWorkflow.inputs.test_failed === 0,
    total_tests: DeploymentWorkflow.inputs.test_total || 0,
    passed_tests: DeploymentWorkflow.inputs.test_passed || 0,
    failed_tests: DeploymentWorkflow.inputs.test_failed || 0,
    skipped_tests: 0,
    coverage: DeploymentWorkflow.inputs.test_coverage || 0,
    duration: 0,
    commit_sha: DeploymentWorkflow.inputs.version,
    branch: DeploymentWorkflow.inputs.environment,
    author: DeploymentWorkflow.inputs.deployer,
  },
);

// Step 2: 배포 결과 알림
const deploymentResultStep = DeploymentWorkflow.addStep(
  SendDeploymentNotificationFunction,
  {
    channel: DeploymentWorkflow.inputs.channel,
    success: DeploymentWorkflow.inputs.deployment_success,
    environment: DeploymentWorkflow.inputs.environment,
    version: DeploymentWorkflow.inputs.version,
    deployer: DeploymentWorkflow.inputs.deployer,
    duration: DeploymentWorkflow.inputs.duration,
    url: DeploymentWorkflow.inputs.url,
    error_message: DeploymentWorkflow.inputs.error_message,
  },
);

export default DeploymentWorkflow;
