import type { Template } from '../types/index.js';
import { autoTemplate } from './auto.js';
import { baseTemplate } from './base.js';
import { businessTemplate } from './business.js';
import { databaseTemplate } from './database.js';
import { fileTemplate } from './file.js';
import { httpTemplate } from './http.js';
import { queueTemplate } from './queue.js';

/**
 * Registry for debug templates with inheritance support.
 * Manages built-in and custom templates for different operation types.
 *
 * @class TemplateRegistry
 *
 * Built-in templates:
 * - base: Foundation template with minimal data capture
 * - http: HTTP/REST API operations
 * - database: SQL queries and database operations
 * - file: File system operations
 * - queue: Message queue operations
 * - business: Business logic and domain operations
 * - auto: Automatic inspection of objects
 *
 * @example
 * const registry = new TemplateRegistry();
 *
 * // Register a custom template
 * registry.register('myapi', {
 *   extends: 'http',
 *   debugData: (context, result, error, parentData) => ({
 *     ...parentData,
 *     apiVersion: context.apiVersion,
 *     rateLimitRemaining: result?.headers?.['x-ratelimit-remaining']
 *   }),
 *   cache: {
 *     enabled: true,
 *     ttl: 60
 *   }
 * });
 *
 * Common patterns:
 * - Extend 'base' for custom templates
 * - Use template inheritance to add fields
 * - Override cache settings per template
 * - Custom templates can extend built-ins
 */
export class TemplateRegistry {
  private templates: Map<string, Template> = new Map();
  private compiledTemplates: Map<string, Template> = new Map();

  /**
   * Creates a new registry with built-in templates.
   */
  constructor() {
    // Register built-in templates
    this.register('base', baseTemplate);
    this.register('http', httpTemplate);
    this.register('database', databaseTemplate);
    this.register('file', fileTemplate);
    this.register('queue', queueTemplate);
    this.register('business', businessTemplate);
    this.register('auto', autoTemplate);
  }

  /**
   * Registers a new template or overwrites an existing one.
   *
   * @param {string} name - Template name for reference
   * @param {Template} template - Template configuration
   *
   * @example
   * registry.register('redis', {
   *   extends: 'base',
   *   debugData: (context, result) => ({
   *     command: context.command,
   *     key: context.key,
   *     result: result
   *   }),
   *   cache: { enabled: false } // Redis is already a cache
   * });
   */
  register(name: string, template: Template): void {
    this.templates.set(name, template);
    // Clear compiled template cache when registering new template
    this.compiledTemplates.delete(name);
  }

  /**
   * Retrieves a compiled template by name.
   * Resolves inheritance and caches the result.
   *
   * @param {string} name - Template name
   * @returns {Template} The compiled template
   * @throws {Error} If template not found
   *
   * @example
   * const httpTemplate = registry.get('http');
   * const data = httpTemplate.debugData(context, result);
   */
  get(name: string): Template {
    // Check if we have a compiled version
    const compiled = this.compiledTemplates.get(name);
    if (compiled) return compiled;

    // Get the template
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template '${name}' not found`);
    }

    // Compile the template (resolve inheritance)
    const compiledTemplate = this.compileTemplate(template);
    this.compiledTemplates.set(name, compiledTemplate);

    return compiledTemplate;
  }

  /**
   * Compiles a template by resolving inheritance.
   * Merges parent template properties with child.
   *
   * @private
   * @param {Template} template - Template to compile
   * @returns {Template} Compiled template with inheritance resolved
   */
  private compileTemplate(template: Template): Template {
    if (!template.extends) {
      return template;
    }

    // Get parent template
    const parentTemplate = this.get(template.extends);

    // Merge templates
    return {
      debugData: (context, result, error) => {
        const parentData = parentTemplate.debugData(context, result, error);
        return template.debugData(context, result, error, parentData);
      },
      cache: {
        ...parentTemplate.cache,
        ...template.cache,
      },
      log: {
        ...parentTemplate.log,
        ...template.log,
      },
    };
  }

  /**
   * Lists all registered template names.
   *
   * @returns {string[]} Array of template names
   *
   * @example
   * const templates = registry.list();
   * console.log('Available templates:', templates);
   * // ['base', 'http', 'database', 'file', 'queue', 'business', 'auto']
   */
  list(): string[] {
    return Array.from(this.templates.keys()).sort();
  }

  /**
   * Checks if a template is registered.
   *
   * @param {string} name - Template name to check
   * @returns {boolean} True if template exists
   *
   * @example
   * if (registry.has('custom')) {
   *   const template = registry.get('custom');
   * }
   */
  has(name: string): boolean {
    return this.templates.has(name);
  }
}
