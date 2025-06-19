import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { TemplateRegistry } from '../templates/registry.js';
import type { Config, DebugContext, DebugEntry, Template, WrapOptions } from '../types/index.js';
import { ActionMapRegistry } from './action-map.js';
import { Cache } from './cache.js';
import { FileLogger } from './logger.js';
import { DebugPersistence } from './persistence.js';

export class AIDebug {
  private config: Config;
  private cache?: Cache;
  private logger?: FileLogger;
  private persistence?: DebugPersistence;
  public templateRegistry?: TemplateRegistry;
  public actionMapRegistry?: ActionMapRegistry;
  private enabled: boolean;

  constructor(config: Config, customTemplatesPath?: string) {
    this.config = config;
    this.enabled = config.features.debug.enabled && process.env.NODE_ENV !== 'production';

    if (this.enabled) {
      this.cache = new Cache(config.features.cache);
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

  async wrap<T>(
    action: string,
    fn: () => Promise<T> | T,
    options: WrapOptions = {},
    ...args: unknown[]
  ): Promise<T> {
    // If debugging is disabled, just execute the function
    if (!this.enabled) {
      return await fn();
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

    try {
      // Get template
      const templateName = finalOptions.template || this.config.features.templates.default;
      if (!this.templateRegistry) {
        throw new Error('Template registry not initialized');
      }
      const template = this.templateRegistry.get(templateName);

      // Check cache
      if (template.cache?.enabled && this.config.features.cache.enabled) {
        const cacheKey = template.cache.key
          ? template.cache.key(context)
          : `${action}:${JSON.stringify(context)}`;

        const cachedResult = await this.cache?.get<T>(cacheKey);
        if (cachedResult !== undefined) {
          result = cachedResult;
          cached = true;
        } else {
          // Execute function
          result = await fn();

          // Cache result if conditions are met
          if (template.cache.shouldCache?.(result, context) ?? true) {
            // Handle dynamic TTL
            const ttl =
              typeof template.cache.ttl === 'function'
                ? template.cache.ttl(result, context)
                : template.cache.ttl;
            await this.cache?.set(cacheKey, result, ttl);
          }
        }
      } else {
        // Execute function without caching
        result = await fn();
      }

      // Record success
      const duration = performance.now() - startTime;
      await this.recordDebugEntry({
        id: debugId,
        action,
        key: context.key || action,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        status: 'success',
        data: template.debugData({ ...context, duration }, result, undefined),
        cached,
        templateUsed: templateName,
      });

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
        key: context.key || action,
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

  async raw<T>(
    action: string,
    fn: () => Promise<T> | T,
    options: Omit<WrapOptions, 'template'> = {},
  ): Promise<T> {
    return this.wrap(action, fn, { ...options, template: 'auto', raw: true });
  }

  async log(level: string, message: string, data?: unknown): Promise<void> {
    if (!this.enabled) return;

    const entry: DebugEntry = {
      id: randomUUID(),
      action: 'log',
      key: 'log',
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
