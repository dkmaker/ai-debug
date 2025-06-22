import type { Template } from '../types/index.js';

/**
 * Base template that all other templates extend from.
 * Provides minimal data capture with standard fields.
 *
 * @const baseTemplate
 *
 * Captured fields:
 * - action: Operation identifier
 * - timestamp: ISO timestamp of operation
 * - duration_ms: Operation duration
 * - status: 'success' or 'failure'
 * - error: Error message if failed
 * - result: Operation result if successful
 *
 * Cache behavior:
 * - Enabled by default with 1 hour TTL
 * - Only caches non-null results
 *
 * @example
 * // Custom template extending base
 * const myTemplate: Template = {
 *   extends: 'base',
 *   debugData: (context, result, error, parentData) => ({
 *     ...parentData,
 *     customField: context.customValue
 *   })
 * };
 */
export const baseTemplate: Template = {
  debugData: (context, result, error) => {
    const data: Record<string, unknown> = {
      action: context.action,
      timestamp: new Date().toISOString(),
      duration_ms: context.duration,
      status: error ? 'failure' : 'success',
      error: error?.message,
      result: error ? undefined : result,
    };

    return data;
  },
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
