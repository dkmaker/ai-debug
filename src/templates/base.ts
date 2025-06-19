import type { Template } from '../types/index.js';

export const baseTemplate: Template = {
  debugData: (context, result, error) => ({
    action: context.action,
    key: context.key,
    timestamp: new Date().toISOString(),
    duration_ms: context.duration,
    status: error ? 'failure' : 'success',
    error: error?.message,
    result: error ? undefined : result,
  }),
  cache: {
    enabled: true,
    ttl: 60 * 60 * 1000, // 1 hour
    shouldCache: (result) => result != null,
  },
  log: {
    enabled: true,
    level: 'info',
    format: (entry) => `[DEBUG] ${entry.action} - ${entry.status} (${entry.duration_ms}ms)`,
  },
};
