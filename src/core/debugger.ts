import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { TemplateRegistry } from '../templates/registry.js';
import type { Config, DebugContext, DebugEntry, Template, WrapOptions } from '../types/index.js';
import { ActionMapRegistry } from './action-map.js';
import { DiskCache } from './disk-cache.js';
import { FileLogger } from './logger.js';
import { DebugPersistence } from './persistence.js';

/**
 * Main debugging class that provides operation wrapping with performance tracking,
 * caching, and comprehensive logging. This is the primary entry point for ai-debug.
 *
 * @class AIDebug
 *
 * Common patterns:
 * - Use wrap() for normal debugging with templates
 * - Use raw() for detailed debugging of complex objects
 * - Register custom templates for domain-specific debugging
 * - Configure caching per operation type for optimal performance
 *
 * @example
 * // Initialize with configuration
 * const debug = new AIDebug(config);
 *
 * // Wrap an HTTP operation
 * const data = await debug.wrap('fetch_users', async () => {
 *   return await fetch('/api/users');
 * }, { template: 'http' });
 *
 * // Use raw mode for detailed debugging
 * const result = await debug.raw('complex_calc', () => {
 *   return performComplexCalculation();
 * });
 *
 * Troubleshooting:
 * - If debugging is not working, check NODE_ENV !== 'production'
 * - Ensure config.features.debug.enabled is true
 * - Check file permissions for debug log directory
 */

export class AIDebug {
  private config: Config;
  private diskCache?: DiskCache;
  private logger?: FileLogger;
  private persistence?: DebugPersistence;
  public templateRegistry?: TemplateRegistry;
  public actionMapRegistry?: ActionMapRegistry;
  private enabled: boolean;

  /**
   * Creates a new AIDebug instance.
   *
   * @param {Config} config - Configuration object for debugging behavior
   * @param {string} [customTemplatesPath] - Path to directory with custom templates
   *
   * @example
   * const debug = new AIDebug({
   *   version: '1.0.0',
   *   features: {
   *     debug: { enabled: true },
   *     cache: { enabled: true, defaultTTL: 300 }
   *   }
   * });
   */
  constructor(config: Config, customTemplatesPath?: string) {
    this.config = config;
    this.enabled = config.features.debug.enabled && process.env.NODE_ENV !== 'production';

    if (this.enabled) {
      this.diskCache = new DiskCache(config.features.cache, config.persistence.baseDir);
      this.logger = FileLogger.getInstance(config.features.logging.file);
      this.persistence = new DebugPersistence(config.persistence);
      this.templateRegistry = new TemplateRegistry();
      this.actionMapRegistry = new ActionMapRegistry();

      // Load custom templates and action maps if path provided
      if (customTemplatesPath) {
        this.loadCustomTemplates(customTemplatesPath);
        this.loadActionMaps(customTemplatesPath);
      }
    }
  }

  /**
   * Loads custom templates from a directory.
   * Templates must export objects with a debugData function.
   *
   * @private
   * @param {string} templatesPath - Path to templates directory
   */
  private async loadCustomTemplates(templatesPath: string): Promise<void> {
    try {
      const { existsSync, readdirSync } = await import('node:fs');
      const { join } = await import('node:path');

      if (!existsSync(templatesPath)) {
        return;
      }

      const files = readdirSync(templatesPath).filter(
        (file) => file.endsWith('.js') || file.endsWith('.ts'),
      );

      for (const file of files) {
        try {
          const modulePath = join(templatesPath, file);
          const module = await import(modulePath);

          // Register all exported templates
          for (const [name, template] of Object.entries(module)) {
            if (typeof template === 'object' && template !== null && 'debugData' in template) {
              this.templateRegistry?.register(name, template as Template);
            }
          }
        } catch (error) {
          console.warn(`Failed to load custom template from ${file}:`, error);
        }
      }
    } catch (error) {
      console.warn('Failed to load custom templates:', error);
    }
  }

  /**
   * Loads action map configuration from actions.js file.
   * Action maps auto-configure debugging options based on action names.
   *
   * @private
   * @param {string} basePath - Base path to search for actions.js
   */
  private async loadActionMaps(basePath: string): Promise<void> {
    try {
      const { existsSync } = await import('node:fs');
      const { join, dirname } = await import('node:path');

      // Look for actions.js in the parent .ai-debug directory
      const actionMapPath = join(dirname(basePath), 'actions.js');

      if (!existsSync(actionMapPath)) {
        return;
      }

      try {
        const module = await import(actionMapPath);
        if (module.actionMap) {
          this.actionMapRegistry?.register(module.actionMap);
        }
      } catch (error) {
        console.warn('Failed to load action map:', error);
      }
    } catch (error) {
      console.warn('Failed to load action maps:', error);
    }
  }

  /**
   * Wraps an operation with debugging, caching, and performance tracking.
   * This is the main method for debugging operations in your application.
   *
   * @template T - The return type of the wrapped function
   * @param {string} action - Unique identifier for this operation (e.g., 'fetch_user', 'db_query')
   * @param {Function} fn - The async or sync function to wrap and monitor
   * @param {WrapOptions} [options={}] - Configuration for debugging behavior
   * @param {...unknown} args - Additional arguments passed to action map resolution
   * @returns {Promise<T>} The result from the wrapped function
   * @throws {Error} Propagates any errors from the wrapped function
   *
   * @example
   * // Basic usage with HTTP template
   * const data = await debug.wrap('fetch_user', async () => {
   *   const response = await fetch('/api/user/123');
   *   return response.json();
   * }, { template: 'http' });
   *
   * @example
   * // With custom context
   * const result = await debug.wrap('db_query',
   *   () => db.query('SELECT * FROM users WHERE id = ?', [userId]),
   *   {
   *     template: 'database',
   *     context: {
   *       sql: 'SELECT * FROM users WHERE id = ?',
   *       params: [userId],
   *       database: 'production'
   *     }
   *   }
   * );
   *
   * @example
   * // Using action maps (auto-configuration)
   * const users = await debug.wrap('getUserList', fetchUsers);
   */
  async wrap<T>(
    action: string,
    fn: (...args: unknown[]) => Promise<T> | T,
    options: WrapOptions = {},
    ...args: unknown[]
  ): Promise<T> {
    // If debugging is disabled, just execute the function
    if (!this.enabled) {
      return await fn(...args);
    }

    // Check if action is in action map
    let finalOptions = options;
    if (this.actionMapRegistry?.has(action)) {
      const mappedOptions = this.actionMapRegistry.resolveOptions(action, args);
      finalOptions = { ...mappedOptions, ...options }; // User options override action map
    }

    const startTime = performance.now();
    const debugId = randomUUID();
    const context: DebugContext = {
      action,
      ...finalOptions.context,
    };

    let result: T;
    let error: Error | undefined;
    let cached = false;
    let cacheKey: string | undefined;

    try {
      // Get template
      const templateName = finalOptions.template || this.config.features.templates.default;
      if (!this.templateRegistry) {
        throw new Error('Template registry not initialized');
      }
      const template = this.templateRegistry.get(templateName);

      // Check cache
      if (template.cache?.enabled && this.config.features.cache.enabled && this.diskCache) {
        // Extract cache-relevant context
        const cacheContext = template.cacheContext ? template.cacheContext(context) : context;
        cacheKey = this.diskCache.generateKey(action, cacheContext);

        const cachedResult = await this.diskCache.get(action, cacheKey);
        if (cachedResult && !cachedResult.expired) {
          result = cachedResult.data as T;
          cached = true;
        } else {
          // Execute function
          result = await fn(...args);

          // Cache result if conditions are met
          if (template.cache.shouldCache?.(result, context) ?? true) {
            // Handle dynamic TTL
            const ttl =
              typeof template.cache.ttl === 'function'
                ? template.cache.ttl(result, context)
                : template.cache.ttl;
            await this.diskCache.set(
              action,
              cacheKey,
              result,
              ttl || this.config.features.cache.defaultTTL,
              cacheContext,
            );
          }
        }
      } else {
        // Execute function without caching
        result = await fn(...args);
      }

      // Record success
      const duration = performance.now() - startTime;
      const entry: DebugEntry = {
        id: debugId,
        action,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        status: 'success',
        data: template.debugData({ ...context, duration }, result, undefined),
        cached,
        templateUsed: templateName,
      };

      // Add cache info if caching was involved
      if (cacheKey) {
        entry.cacheKey = cacheKey;
        if (cached) {
          entry.cached = true;
        }
        if (template.cacheContext) {
          entry.cacheContext = template.cacheContext(context);
        }
      }

      await this.recordDebugEntry(entry);

      return result;
    } catch (err) {
      error = err as Error;

      // Record failure
      const duration = performance.now() - startTime;
      const templateName = finalOptions.template || this.config.features.templates.default;
      if (!this.templateRegistry) {
        throw new Error('Template registry not initialized');
      }
      const template = this.templateRegistry.get(templateName);

      await this.recordDebugEntry({
        id: debugId,
        action,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        status: 'failure',
        data: template.debugData({ ...context, duration }, undefined, error),
        error: error.message,
        cached: false,
        templateUsed: templateName,
      });

      throw error;
    }
  }

  /**
   * Wraps an operation in raw debugging mode.
   * Captures complete object state without template filtering.
   * Useful for debugging complex objects or unknown data structures.
   *
   * @template T - The return type of the wrapped function
   * @param {string} action - Unique identifier for this operation
   * @param {Function} fn - The function to wrap
   * @param {Omit<WrapOptions, 'template'>} [options={}] - Options excluding template
   * @returns {Promise<T>} The result from the wrapped function
   *
   * @example
   * // Debug a complex calculation
   * const result = await debug.raw('calculate_metrics', () => {
   *   return {
   *     users: getUserMetrics(),
   *     performance: getPerformanceData(),
   *     system: getSystemStats()
   *   };
   * });
   *
   * @example
   * // Debug with custom context
   * const data = await debug.raw('process_batch',
   *   () => processBatch(items),
   *   { context: { batchSize: items.length } }
   * );
   */
  async raw<T>(
    action: string,
    fn: (...args: unknown[]) => Promise<T> | T,
    options: Omit<WrapOptions, 'template'> = {},
    ...args: unknown[]
  ): Promise<T> {
    return this.wrap(action, fn, { ...options, template: 'auto', raw: true }, ...args);
  }

  /**
   * Logs a message with optional data to the debug system.
   * Useful for adding custom log entries alongside wrapped operations.
   *
   * @param {string} level - Log level (debug, info, warn, error)
   * @param {string} message - Log message
   * @param {unknown} [data] - Additional data to log
   *
   * @example
   * await debug.log('info', 'User login successful', { userId: 123 });
   *
   * @example
   * await debug.log('error', 'Payment failed', {
   *   orderId: 456,
   *   error: 'Insufficient funds'
   * });
   */
  async log(level: string, message: string, data?: unknown): Promise<void> {
    if (!this.enabled) return;

    const entry: DebugEntry = {
      id: randomUUID(),
      action: 'log',
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      status: 'success',
      data: {
        level,
        message,
        ...(typeof data === 'object' && data !== null ? data : {}),
      },
    };

    await this.recordDebugEntry(entry);
  }

  /**
   * Records a debug entry to configured outputs (file, console, persistence).
   * Applies filters and formatting based on configuration.
   *
   * @private
   * @param {DebugEntry} entry - The debug entry to record
   */
  private async recordDebugEntry(entry: DebugEntry): Promise<void> {
    // Apply filters
    const filters = this.config.features.logging.filters;
    if (filters) {
      // Check if action is excluded
      if (filters.excludeActions?.includes(entry.action)) {
        return;
      }

      // Check if only errors should be included
      if (filters.includeOnlyErrors && entry.status !== 'failure') {
        return;
      }

      // Check if template is excluded
      if (filters.excludeTemplates?.includes(entry.templateUsed || 'base')) {
        return;
      }
    }

    // Log to file
    if (this.config.features.logging.file.enabled) {
      await this.logger?.log(entry);
    }

    // Persist debug data
    if (this.persistence) {
      await this.persistence.save(entry);
    }

    // Log to console
    if (this.config.features.logging.console.enabled) {
      if (!this.templateRegistry) {
        throw new Error('Template registry not initialized');
      }
      const template = this.templateRegistry.get(entry.templateUsed || 'base');
      if (template.log?.enabled) {
        const message = template.log.format
          ? template.log.format(entry)
          : `[DEBUG] ${entry.action} - ${entry.status} (${entry.duration_ms}ms)`;

        console.log(message);
      }
    }
  }
}
