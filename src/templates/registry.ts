import type { Template } from '../types/index.js';
import { autoTemplate } from './auto.js';
import { baseTemplate } from './base.js';
import { businessTemplate } from './business.js';
import { databaseTemplate } from './database.js';
import { fileTemplate } from './file.js';
import { httpTemplate } from './http.js';
import { queueTemplate } from './queue.js';

export class TemplateRegistry {
  private templates: Map<string, Template> = new Map();
  private compiledTemplates: Map<string, Template> = new Map();

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

  register(name: string, template: Template): void {
    this.templates.set(name, template);
    // Clear compiled template cache when registering new template
    this.compiledTemplates.delete(name);
  }

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

  list(): string[] {
    return Array.from(this.templates.keys());
  }

  has(name: string): boolean {
    return this.templates.has(name);
  }
}
