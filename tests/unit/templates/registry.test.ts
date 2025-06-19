import { beforeEach, describe, expect, it } from 'vitest';
import { TemplateRegistry } from '../../../src/templates/registry.js';
import type { Template } from '../../../src/types/index.js';

describe('TemplateRegistry', () => {
  let registry: TemplateRegistry;

  beforeEach(() => {
    registry = new TemplateRegistry();
  });

  describe('constructor', () => {
    it('initializes with built-in templates', () => {
      expect(registry.has('base')).toBe(true);
      expect(registry.has('http')).toBe(true);
      expect(registry.has('database')).toBe(true);
      expect(registry.has('file')).toBe(true);
      expect(registry.has('queue')).toBe(true);
      expect(registry.has('business')).toBe(true);
      expect(registry.has('auto')).toBe(true);
    });
  });

  describe('register', () => {
    it('registers a custom template', () => {
      const customTemplate: Template = {
        debugData: (context, result, error) => ({
          custom: true,
          context,
          result,
          error: error?.message,
        }),
      };

      registry.register('custom', customTemplate);

      expect(registry.has('custom')).toBe(true);
      expect(registry.get('custom')).toBeDefined();
    });

    it('overwrites existing template', () => {
      const originalBase = registry.get('base');
      const replacement: Template = {
        debugData: (context, _result, _error) => ({
          replaced: true,
          action: context.action,
        }),
      };

      registry.register('base', replacement);

      const newBase = registry.get('base');
      expect(newBase).not.toBe(originalBase);
      expect(newBase.debugData({}, null, undefined)).toHaveProperty('replaced', true);
    });

    it('accepts template with all optional properties', () => {
      const fullTemplate: Template = {
        debugData: (_context, _result, _error) => ({ data: 'test' }),
        cache: {
          enabled: true,
          ttl: 300000,
          shouldCache: (result) => result != null,
        },
        log: {
          enabled: true,
          level: 'debug',
          format: (entry) => `Custom: ${entry.action}`,
        },
      };

      registry.register('full', fullTemplate);

      const retrieved = registry.get('full');
      expect(retrieved).toBeDefined();
      expect(retrieved.cache).toBeDefined();
      expect(retrieved.log).toBeDefined();
    });
  });

  describe('get', () => {
    it('returns registered template', () => {
      const template = registry.get('http');
      expect(template).toBeDefined();
      expect(template.debugData).toBeDefined();
      expect(template.cache).toBeDefined();
      expect(template.log).toBeDefined();
    });

    it('throws error for non-existent template', () => {
      expect(() => registry.get('non-existent')).toThrow("Template 'non-existent' not found");
    });

    it('is case-sensitive', () => {
      expect(() => registry.get('HTTP')).toThrow("Template 'HTTP' not found");
    });
  });

  describe('list', () => {
    it('returns all template names', () => {
      const names = registry.list();
      expect(names).toContain('base');
      expect(names).toContain('http');
      expect(names).toContain('database');
      expect(names).toContain('file');
      expect(names).toContain('queue');
      expect(names).toContain('business');
      expect(names).toContain('auto');
    });

    it('includes custom templates', () => {
      registry.register('custom', {
        debugData: () => ({ custom: true }),
      });

      const names = registry.list();
      expect(names).toContain('custom');
    });

    it('returns sorted list', () => {
      const names = registry.list();
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    });
  });

  describe('has', () => {
    it('returns true for existing templates', () => {
      expect(registry.has('base')).toBe(true);
      expect(registry.has('http')).toBe(true);
    });

    it('returns false for non-existent templates', () => {
      expect(registry.has('non-existent')).toBe(false);
      expect(registry.has('')).toBe(false);
    });

    it('is case-sensitive', () => {
      expect(registry.has('BASE')).toBe(false);
      expect(registry.has('HTTP')).toBe(false);
    });
  });

  describe('inheritance', () => {
    it('allows templates to extend base template', () => {
      registry.register('custom-http', {
        extends: 'http',
        debugData: (_context, _result, _error, parentData) => ({
          ...parentData,
          customField: 'added',
        }),
      });

      const template = registry.get('custom-http');
      const debugData = template.debugData(
        { url: '/test', method: 'GET', duration: 100 },
        { status: 200 },
        undefined,
      );

      expect(debugData).toHaveProperty('request'); // From http template
      expect(debugData).toHaveProperty('customField', 'added'); // From custom template
    });

    it('inherits cache configuration from parent', () => {
      registry.register('custom-cached', {
        extends: 'base',
        debugData: (_context, _result, _error, parentData) => ({
          ...parentData,
          custom: true,
        }),
      });

      const template = registry.get('custom-cached');
      expect(template.cache).toBeDefined();
      expect(template.cache?.enabled).toBe(true); // Inherited from base
    });

    it('allows overriding parent cache configuration', () => {
      registry.register('no-cache', {
        extends: 'base',
        debugData: (_context, _result, _error, parentData) => parentData || {},
        cache: {
          enabled: false,
        },
      });

      const template = registry.get('no-cache');
      expect(template.cache?.enabled).toBe(false);
    });

    it('handles nested inheritance', () => {
      registry.register('level1', {
        extends: 'base',
        debugData: (_context, _result, _error, parentData) => ({
          ...parentData,
          level1: true,
        }),
      });

      registry.register('level2', {
        extends: 'level1',
        debugData: (_context, _result, _error, parentData) => ({
          ...parentData,
          level2: true,
        }),
      });

      const template = registry.get('level2');
      const debugData = template.debugData({ action: 'test', duration: 100 }, null, undefined);

      expect(debugData).toHaveProperty('action', 'test'); // From base
      expect(debugData).toHaveProperty('level1', true); // From level1
      expect(debugData).toHaveProperty('level2', true); // From level2
    });
  });

  describe('compilation caching', () => {
    it('caches compiled templates', () => {
      // First call compiles the template
      const template1 = registry.get('http');

      // Second call should return the same instance
      const template2 = registry.get('http');

      expect(template1).toBe(template2);
    });

    it('clears cache when template is re-registered', () => {
      const original = registry.get('http');

      registry.register('http', {
        debugData: () => ({ modified: true }),
      });

      const modified = registry.get('http');

      expect(modified).not.toBe(original);
      expect(modified.debugData({}, null, undefined)).toHaveProperty('modified', true);
    });
  });
});
