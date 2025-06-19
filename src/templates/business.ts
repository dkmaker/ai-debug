import { createHash } from 'node:crypto';
import type { BusinessError } from '../types/errors.js';
import type { Template } from '../types/index.js';

function hash(data: unknown): string {
  const str = JSON.stringify(data);
  return createHash('sha256').update(str).digest('hex').slice(0, 8);
}

export const businessTemplate: Template = {
  extends: 'base',
  debugData: (context, result, error) => ({
    operation: context.operation,
    entity: context.entity,
    input: context.input,
    output: error
      ? {
          error: error.message,
          validation: (error as BusinessError).validation,
        }
      : result,
    metadata: context.metadata,
  }),
  cache: {
    key: (ctx) => `${ctx.operation}:${ctx.entity}:${hash(ctx.input)}`,
    ttl: 15 * 60 * 1000, // 15 minutes
    shouldCache: (result) => {
      if (result == null) return false;
      const res = result as Record<string, unknown>;
      return !res.error;
    },
  },
  log: {
    format: (entry) => {
      const data = entry.data as Record<string, unknown>;
      const operation = data.operation || 'unknown';
      const entity = data.entity || 'unknown';
      return `[BIZ] ${operation} ${entity} - ${entry.status}`;
    },
  },
};
