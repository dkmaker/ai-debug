import type { Template } from '../types/index.js';

/**
 * Truncates large message bodies for logging.
 * Prevents log bloat from large messages.
 *
 * @param {unknown} body - Message body to truncate
 * @param {number} maxLength - Maximum length before truncation (default: 1000)
 * @returns {unknown} Truncated body or original if under limit
 * @private
 */
function truncateBody(body: unknown, maxLength = 1000): unknown {
  if (!body) return body;

  const str = typeof body === 'string' ? body : JSON.stringify(body);
  if (str.length <= maxLength) return body;

  return `${str.slice(0, maxLength)}... (truncated)`;
}

/**
 * Template for message queue operations.
 * Captures queue messages, operations, and delivery status.
 *
 * @const queueTemplate
 *
 * Expected context:
 * - queue: Queue name or identifier
 * - operation: Queue operation ('send', 'receive', 'ack', 'nack', 'publish', 'consume')
 * - messageId: Unique message identifier
 * - headers: Message headers/metadata
 * - body: Message payload
 * - timestamp: Message timestamp
 *
 * Captured data:
 * - Queue name and operation type
 * - Message ID and headers
 * - Truncated message body (prevents log bloat)
 * - Message timestamp
 * - Delivery tags for acknowledgment
 * - Success/failure status
 *
 * Supported queue systems:
 * - RabbitMQ (AMQP)
 * - Redis Pub/Sub
 * - AWS SQS
 * - Kafka
 * - Any message queue with similar patterns
 *
 * Cache behavior:
 * - Disabled (queue operations are stateful)
 * - Messages should not be cached
 *
 * @example
 * await debug.wrap('send_notification',
 *   () => queue.send('notifications', notificationData),
 *   {
 *     template: 'queue',
 *     context: {
 *       queue: 'notifications',
 *       operation: 'send',
 *       messageId: uuid(),
 *       body: notificationData,
 *       timestamp: new Date().toISOString()
 *     }
 *   }
 * );
 *
 * @example
 * // Message consumption with acknowledgment
 * await debug.wrap('process_order',
 *   () => queue.consume('orders', processOrder),
 *   {
 *     template: 'queue',
 *     context: {
 *       queue: 'orders',
 *       operation: 'receive',
 *       messageId: message.id,
 *       headers: message.headers,
 *       body: message.body
 *     }
 *   }
 * );
 *
 * Troubleshooting:
 * - Large messages are truncated in logs
 * - Message IDs help trace message flow
 * - Use headers for routing information
 */
export const queueTemplate: Template = {
  extends: 'base',
  cacheContext: (context) => ({
    queue: context.queue,
    operation: context.operation,
    messageType: context.messageType,
    topic: context.topic,
  }),
  debugData: (context, result, error) => ({
    queue: context.queue,
    operation: context.operation, // send, receive, ack, nack
    message: {
      id: context.messageId,
      headers: context.headers,
      body: truncateBody(context.body),
      timestamp: context.timestamp,
    },
    result: error
      ? {
          error: error.message,
        }
      : {
          success: true,
          messageId: (result as { messageId?: string } | null)?.messageId,
          deliveryTag: (result as { deliveryTag?: string } | null)?.deliveryTag,
        },
  }),
  cache: {
    enabled: false,
  },
  log: {
    format: (entry) => {
      const data = entry.data as { operation?: string; queue?: string };
      return `[QUEUE] ${data.operation || 'unknown'} on ${data.queue || 'unknown'} - ${entry.status}`;
    },
  },
};
