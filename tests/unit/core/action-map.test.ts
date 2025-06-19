import { beforeEach, describe, expect, it } from 'vitest';
import { ActionMapRegistry } from '../../../src/core/action-map.js';

describe('ActionMapRegistry', () => {
  let registry: ActionMapRegistry;

  beforeEach(() => {
    registry = new ActionMapRegistry();
  });

  describe('constructor', () => {
    it('initializes with empty action map', () => {
      expect(Object.keys(registry.actionMap)).toHaveLength(0);
    });
  });

  describe('register', () => {
    it('registers single action', () => {
      registry.register({
        fetch_user: {
          template: 'http',
          context: { url: '/api/user' },
        },
      });

      const config = registry.getAction('fetch_user');
      expect(config).toEqual({
        template: 'http',
        context: { url: '/api/user' },
      });
    });

    it('registers multiple actions', () => {
      registry.register({
        fetch_user: {
          template: 'http',
          context: { url: '/api/user' },
        },
        save_file: {
          template: 'file',
          context: { path: './data' },
        },
      });

      expect(registry.getAction('fetch_user')).toBeDefined();
      expect(registry.getAction('save_file')).toBeDefined();
    });

    it('overwrites existing actions', () => {
      registry.register({
        test_action: {
          template: 'base',
          context: { version: 1 },
        },
      });

      registry.register({
        test_action: {
          template: 'http',
          context: { version: 2 },
        },
      });

      const config = registry.getAction('test_action');
      expect(config?.template).toBe('http');
      expect(config?.context.version).toBe(2);
    });

    it('preserves existing actions when adding new ones', () => {
      registry.register({
        action1: {
          template: 'base',
          context: {},
        },
      });

      registry.register({
        action2: {
          template: 'http',
          context: {},
        },
      });

      expect(registry.getAction('action1')).toBeDefined();
      expect(registry.getAction('action2')).toBeDefined();
    });

    it('handles cache configuration', () => {
      registry.register({
        cached_action: {
          template: 'http',
          context: { url: '/api/data' },
          cache: {
            ttl: 300000, // 5 minutes
            shouldCache: (result: any) => result.status === 200,
          },
        },
      });

      const config = registry.getAction('cached_action');
      expect(config?.cache).toBeDefined();
      expect(config?.cache?.ttl).toBe(300000);
    });
  });

  describe('getAction', () => {
    beforeEach(() => {
      registry.register({
        test_action: {
          template: 'base',
          context: { test: true },
        },
      });
    });

    it('returns action configuration if exists', () => {
      const config = registry.getAction('test_action');
      expect(config).toEqual({
        template: 'base',
        context: { test: true },
      });
    });

    it('returns undefined for non-existent action', () => {
      const config = registry.getAction('non_existent');
      expect(config).toBeUndefined();
    });

    it('is case-sensitive', () => {
      expect(registry.getAction('TEST_ACTION')).toBeUndefined();
      expect(registry.getAction('Test_Action')).toBeUndefined();
      expect(registry.getAction('test_action')).toBeDefined();
    });
  });

  describe('has', () => {
    beforeEach(() => {
      registry.register({
        existing_action: {
          template: 'base',
          context: {},
        },
      });
    });

    it('returns true for existing actions', () => {
      expect(registry.has('existing_action')).toBe(true);
    });

    it('returns false for non-existent actions', () => {
      expect(registry.has('non_existent')).toBe(false);
    });

    it('is case-sensitive', () => {
      expect(registry.has('EXISTING_ACTION')).toBe(false);
      expect(registry.has('existing_action')).toBe(true);
    });
  });

  describe('resolveOptions', () => {
    it('returns empty options for unregistered action', () => {
      const options = registry.resolveOptions('unregistered', []);
      expect(options).toEqual({});
    });

    it('resolves static context', () => {
      registry.register({
        static_action: {
          template: 'http',
          context: { url: '/api/static' },
        },
      });

      const options = registry.resolveOptions('static_action', []);
      expect(options).toEqual({
        template: 'http',
        context: { url: '/api/static' },
      });
    });

    it('resolves dynamic context with function', () => {
      registry.register({
        dynamic_action: {
          template: 'http',
          context: (userId: number) => ({ url: `/api/users/${userId}` }),
        },
      });

      const options = registry.resolveOptions('dynamic_action', [123]);
      expect(options).toEqual({
        template: 'http',
        context: { url: '/api/users/123' },
      });
    });

    it('includes raw flag when specified', () => {
      registry.register({
        raw_action: {
          template: 'auto',
          raw: true,
        },
      });

      const options = registry.resolveOptions('raw_action', []);
      expect(options).toEqual({
        template: 'auto',
        raw: true,
      });
    });
  });

  describe('integration', () => {
    it('supports complex action configurations', () => {
      registry.register({
        complex_api_call: {
          template: 'http',
          context: {
            url: '/api/v2/users',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Version': '2.0',
            },
          },
          cache: {
            ttl: 60000,
            shouldCache: (result: any) => {
              return result.status === 200 || result.status === 201;
            },
          },
        },
      });

      const config = registry.getAction('complex_api_call');
      expect(config).toBeDefined();
      expect(config?.context.headers).toEqual({
        'Content-Type': 'application/json',
        'X-API-Version': '2.0',
      });
      expect(config?.cache?.ttl).toBe(60000);
    });

    it('supports different template types', () => {
      const templates = ['base', 'http', 'database', 'file', 'queue', 'business', 'auto'];

      templates.forEach((template, index) => {
        registry.register({
          [`action_${template}`]: {
            template,
            context: { index },
          },
        });
      });

      templates.forEach((template, index) => {
        const config = registry.getAction(`action_${template}`);
        expect(config?.template).toBe(template);
        expect(config?.context.index).toBe(index);
      });
    });
  });
});
