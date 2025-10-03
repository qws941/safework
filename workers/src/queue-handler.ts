/**
 * Cloudflare Queue Consumer Handler
 * Processes background jobs for exports, reports, and analysis
 */

import { handleQueueMessage, QueueMessage } from './services/queue-processor';

export default {
  async queue(
    batch: MessageBatch<QueueMessage>,
    env: {
      PRIMARY_DB: D1Database;
      SAFEWORK_KV: KVNamespace;
      SAFEWORK_STORAGE: R2Bucket;
      AI: Ai;
    }
  ): Promise<void> {
    console.log(`Processing ${batch.messages.length} queue messages`);

    for (const message of batch.messages) {
      try {
        await handleQueueMessage(message, env);
      } catch (error) {
        console.error('Queue message processing failed:', error);
        // Message will be retried or moved to DLQ based on wrangler.toml config
      }
    }
  },
};
