import type { Template } from '../types/index.js';

function truncateBody(body: unknown, maxLength = 1000): unknown {
  if (!body) return body;

  const str = typeof body === 'string' ? body : JSON.stringify(body);
  if (str.length <= maxLength) return body;

  return `${str.slice(0, maxLength)}... (truncated)`;
}

export const queueTemplate: Template = {
  extends: 'base',
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
