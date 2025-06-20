/**
 * @dkmaker/ai-debug - AI-optimized debugging and caching for Node.js
 *
 * Main exports for the package.
 *
 * @module @dkmaker/ai-debug
 *
 * @example
 * // Basic usage
 * import { AIDebug } from '@dkmaker/ai-debug';
 *
 * const debug = new AIDebug(config);
 *
 * // Wrap an operation
 * const result = await debug.wrap('fetch_data', async () => {
 *   return await fetchDataFromAPI();
 * }, { template: 'http' });
 *
 * @example
 * // Custom template
 * import { AIDebug, TemplateRegistry } from '@dkmaker/ai-debug';
 *
 * const registry = new TemplateRegistry();
 * registry.register('custom', {
 *   extends: 'base',
 *   debugData: (context, result) => ({
 *     customField: context.custom,
 *     result: result
 *   })
 * });
 */

// Core classes
export { AIDebug } from './core/debugger.js';
export { Cache } from './core/cache.js';
export { FileLogger } from './core/logger.js';
export { TemplateRegistry } from './templates/registry.js';

// Export types
export type {
  Config,
  DebugContext,
  DebugEntry,
  DebugResult,
  Template,
  WrapOptions,
  CacheOptions,
  LogOptions,
} from './types/index.js';

// Export configuration types
export type { CacheConfig } from './core/cache.js';
export type { PersistenceConfig } from './core/persistence.js';
export type { FileLogConfig } from './core/logger.js';

// Export templates for customization
export { baseTemplate } from './templates/base.js';
export { httpTemplate } from './templates/http.js';
export { databaseTemplate } from './templates/database.js';
export { fileTemplate } from './templates/file.js';
export { queueTemplate } from './templates/queue.js';
export { businessTemplate } from './templates/business.js';
export { autoTemplate } from './templates/auto.js';
