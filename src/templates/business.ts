import type { BusinessError } from '../types/errors.js';
import type { Template } from '../types/index.js';

/**
 * Template for business logic and domain operations.
 * Captures business context, entities, and validation errors.
 *
 * @const businessTemplate
 *
 * Expected context:
 * - operation: Business operation name (e.g., 'create', 'update', 'process')
 * - entity: Business entity being operated on (e.g., 'order', 'user', 'payment')
 * - input: Input data for the operation
 * - metadata: Additional business context
 *
 * Captured data:
 * - Business operation and entity names
 * - Input parameters
 * - Operation results or validation errors
 * - Business metadata
 *
 * Error handling:
 * - Captures validation errors from BusinessError types
 * - Preserves business context for troubleshooting
 *
 * Cache behavior:
 * - 15 minute TTL by default
 * - Cache key includes operation, entity, and input hash
 * - Only caches successful operations (no errors)
 *
 * @example
 * await debug.wrap('process_order',
 *   () => orderService.process(orderData),
 *   {
 *     template: 'business',
 *     context: {
 *       operation: 'process',
 *       entity: 'order',
 *       input: orderData,
 *       metadata: { userId: currentUser.id }
 *     }
 *   }
 * );
 *
 * @example
 * // With validation error handling
 * await debug.wrap('validate_payment',
 *   () => paymentValidator.validate(paymentData),
 *   {
 *     template: 'business',
 *     context: {
 *       operation: 'validate',
 *       entity: 'payment',
 *       input: paymentData
 *     }
 *   }
 * );
 */
export const businessTemplate: Template = {
  extends: 'base',
  cacheContext: (context) => ({
    operation: context.operation,
    entity: context.entity,
    input: context.input,
  }),
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
    enabled: true,
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
