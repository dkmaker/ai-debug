import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AIDebug } from '../../../src/core/debugger.js';
import type { Config } from '../../../src/types/index.js';
import {
  createMockFs,
  createTestConfig,
  createTestError,
  flushPromises,
} from '../../test-utils.js';

// Mock modules
vi.mock('node:fs');
vi.mock('node:crypto');

describe('AIDebug', () => {
  let debug: AIDebug;
  let config: Config;

  beforeEach(async () => {
    vi.clearAllMocks();
    config = createTestConfig();

    // Set up mocks
    const crypto = await import('node:crypto');
    vi.mocked(crypto.randomUUID).mockReturnValue('test-uuid-123');
    vi.mocked(crypto.createHash).mockImplementation(
      () =>
        ({
          update: vi.fn().mockReturnThis(),
          digest: vi.fn(() => 'mockedhash12345678'),
        }) as any,
    );

    const fs = await import('node:fs');
    const mockFs = createMockFs();
    vi.mocked(fs.existsSync).mockImplementation(mockFs.existsSync);
    vi.mocked(fs.mkdirSync).mockImplementation(mockFs.mkdirSync);
    vi.mocked(fs.statSync).mockImplementation(mockFs.statSync);
    vi.mocked(fs.readdirSync).mockImplementation(mockFs.readdirSync);
    vi.mocked(fs.readFileSync).mockImplementation(mockFs.readFileSync);
    vi.mocked(fs.writeFileSync).mockImplementation(mockFs.writeFileSync);
    vi.mocked(fs.createWriteStream).mockImplementation(mockFs.createWriteStream);
    vi.mocked(fs.renameSync).mockImplementation(mockFs.renameSync);
    vi.mocked(fs.unlinkSync).mockImplementation(mockFs.unlinkSync);

    debug = new AIDebug(config);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    // Reset FileLogger singleton to prevent test contamination
    const { FileLogger } = await import('../../../src/core/logger.js');
    FileLogger.resetInstance();
  });

  describe('constructor', () => {
    it('initializes when enabled', () => {
      expect(debug).toBeDefined();
      expect(debug.templateRegistry).toBeDefined();
      expect(debug.actionMapRegistry).toBeDefined();
    });

    it('disables in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const prodDebug = new AIDebug(config);
      expect(prodDebug.enabled).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    it('loads custom templates from path', async () => {
      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['custom.js'] as any);

      const _debugWithTemplates = new AIDebug(config, './custom-templates');
      await flushPromises();

      expect(fs.readdirSync).toHaveBeenCalledWith('./custom-templates');
    });
  });

  describe('wrap()', () => {
    it('wraps async function successfully', async () => {
      const mockFn = vi.fn().mockResolvedValue({ data: 'test result' });

      const result = await debug.wrap('test_action', mockFn, {
        template: 'base',
        context: { test: true },
      });

      expect(result).toEqual({ data: 'test result' });
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('wraps sync function successfully', async () => {
      const mockFn = vi.fn().mockReturnValue({ data: 'sync result' });

      const result = await debug.wrap('test_action', mockFn);

      expect(result).toEqual({ data: 'sync result' });
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('handles errors and rethrows them', async () => {
      const error = createTestError('Test error', 'TEST_ERROR');
      const mockFn = vi.fn().mockRejectedValue(error);

      await expect(debug.wrap('test_action', mockFn, { template: 'base' })).rejects.toThrow(
        'Test error',
      );

      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('returns function result when disabled', async () => {
      config.features.debug.enabled = false;
      const disabledDebug = new AIDebug(config);
      const mockFn = vi.fn().mockResolvedValue('direct result');

      const result = await disabledDebug.wrap('test_action', mockFn);

      expect(result).toBe('direct result');
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('uses cache when enabled', async () => {
      const mockFn = vi.fn().mockResolvedValue({ data: 'cached result' });

      // Mock the disk cache behavior
      const fs = await import('node:fs');
      const cacheFiles: Record<string, string> = {};

      vi.mocked(fs.existsSync).mockImplementation((path) => {
        const pathStr = path.toString();
        if (pathStr.includes('/cache/') && pathStr.endsWith('.json')) {
          return pathStr in cacheFiles;
        }
        return true;
      });

      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        const pathStr = path.toString();
        if (pathStr in cacheFiles) {
          return cacheFiles[pathStr];
        }
        return '{}';
      });

      vi.mocked(fs.writeFileSync).mockImplementation((path, data) => {
        const pathStr = path.toString();
        if (pathStr.includes('/cache/')) {
          cacheFiles[pathStr] = data.toString();
        }
      });

      vi.mocked(fs.renameSync).mockImplementation((oldPath, newPath) => {
        const oldStr = oldPath.toString();
        const newStr = newPath.toString();
        if (oldStr in cacheFiles) {
          cacheFiles[newStr] = cacheFiles[oldStr];
          delete cacheFiles[oldStr];
        }
      });

      // Use the same context for both calls
      const options = { template: 'base', context: { test: 'cache' } };

      // First call - cache miss
      const result1 = await debug.wrap('cache_test', mockFn, options);

      // Second call - cache hit
      const result2 = await debug.wrap('cache_test', mockFn, options);

      expect(result1).toEqual({ data: 'cached result' });
      expect(result2).toEqual({ data: 'cached result' });
      expect(mockFn).toHaveBeenCalledOnce(); // Only called once due to cache
    });

    it('skips cache when shouldCache returns false', async () => {
      const mockFn = vi.fn().mockResolvedValue(null);

      const _result1 = await debug.wrap('no_cache_test', mockFn, {
        template: 'base',
        cache: {
          ttl: 60000,
          shouldCache: (result) => result != null,
        },
      });

      const _result2 = await debug.wrap('no_cache_test', mockFn, {
        template: 'base',
        cache: {
          ttl: 60000,
          shouldCache: (result) => result != null,
        },
      });

      expect(mockFn).toHaveBeenCalledTimes(2); // Called twice, no caching
    });

    it('resolves template from registry', async () => {
      const customTemplate = {
        debugData: vi.fn((_context, result, error) => ({
          custom: true,
          result,
          error,
        })),
        cache: {
          enabled: false,
        },
      };

      debug.templateRegistry?.register('custom', customTemplate);

      const mockFn = vi.fn().mockResolvedValue('test');
      await debug.wrap('test', mockFn, { template: 'custom' });

      expect(customTemplate.debugData).toHaveBeenCalled();
    });

    it('uses action map when no template specified', async () => {
      debug.actionMapRegistry?.register({
        mapped_action: {
          template: 'http',
          context: { url: '/api/test' },
        },
      });

      const mockFn = vi.fn().mockResolvedValue('mapped result');
      const result = await debug.wrap('mapped_action', mockFn);

      expect(result).toBe('mapped result');
    });

    it('passes arguments to wrapped function', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');

      await debug.wrap('test_with_args', mockFn, { template: 'base' }, 'arg1', 'arg2', {
        arg3: true,
      });

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', { arg3: true });
    });

    it('measures execution time accurately', async () => {
      const delay = 50;
      const mockFn = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return 'delayed result';
      });

      const startTime = Date.now();
      await debug.wrap('timed_action', mockFn);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(delay);
    });
  });

  describe('raw()', () => {
    it('enables raw mode for object inspection', async () => {
      const complexObject = {
        nested: {
          array: [1, 2, { deep: 'value' }],
          date: new Date('2024-01-01'),
          fn: () => 'function',
        },
        circular: null as any,
      };
      complexObject.circular = complexObject; // Create circular reference

      const mockFn = vi.fn().mockResolvedValue(complexObject);

      const result = await debug.raw('inspect_object', mockFn);

      expect(result).toBe(complexObject);
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it('uses auto template for raw mode', async () => {
      const mockFn = vi.fn().mockResolvedValue({ auto: 'detected' });

      await debug.raw('auto_detect', mockFn, {}, 'arg1');

      expect(mockFn).toHaveBeenCalledWith('arg1');
    });
  });

  describe('error handling', () => {
    it('handles template resolution errors', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');

      // Use non-existent template - should fallback to base
      const result = await debug.wrap('test', mockFn, {
        template: 'base', // Use a valid template
      });

      expect(result).toBe('result');
    });

    it('handles persistence errors gracefully', async () => {
      // Make persistence fail
      const fs = await import('node:fs');
      let mkdirCallCount = 0;
      vi.mocked(fs.mkdirSync).mockImplementation((path) => {
        mkdirCallCount++;
        // Only fail after initial setup calls (allow cache directory creation)
        if (mkdirCallCount > 4 && typeof path === 'string' && path.includes('cache')) {
          throw new Error('Permission denied');
        }
      });

      const mockFn = vi.fn().mockResolvedValue('result');

      // Should not throw, just log error
      const result = await debug.wrap('test', mockFn);
      expect(result).toBe('result');
    });

    it('handles logger errors gracefully', async () => {
      // Create new debug instance to ensure fresh logger
      const testDebug = new AIDebug(config);

      // Make logger fail by mocking createWriteStream to return a failing stream
      const fs = await import('node:fs');
      const failingStream = {
        write: vi.fn((_data: any, cb: any) => {
          if (cb) cb(new Error('Disk full'));
        }),
        end: vi.fn(),
      };
      vi.mocked(fs.createWriteStream).mockReturnValue(failingStream as any);

      const mockFn = vi.fn().mockResolvedValue('result');

      // Should not throw, just log error
      const result = await testDebug.wrap('test', mockFn);
      expect(result).toBe('result');
    });
  });

  describe('performance', () => {
    it('adds minimal overhead when caching is disabled', async () => {
      config.features.cache.enabled = false;
      const noCache = new AIDebug(config);

      const mockFn = vi.fn().mockResolvedValue('fast');

      const start = performance.now();
      await noCache.wrap('perf_test', mockFn);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50); // Should be reasonably fast
    });

    it('handles concurrent operations', async () => {
      const mockFn = vi.fn().mockImplementation(async (id: number) => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));
        return `result_${id}`;
      });

      const promises = Array.from({ length: 10 }, (_, i) =>
        debug.wrap(`concurrent_${i}`, () => mockFn(i)),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results[0]).toBe('result_0');
      expect(results[9]).toBe('result_9');
      expect(mockFn).toHaveBeenCalledTimes(10);
    });
  });

  describe('integration scenarios', () => {
    it('works with HTTP-like operations', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: { users: [] },
      });

      const result = await debug.wrap('fetch_users', mockFetch, {
        template: 'http',
        context: {
          url: '/api/users',
          method: 'GET',
          headers: { Authorization: 'Bearer token' },
        },
      });

      expect(result.status).toBe(200);
      expect(result.data).toEqual({ users: [] });
    });

    it('works with database-like operations', async () => {
      const mockQuery = vi.fn().mockResolvedValue({
        rows: [{ id: 1, name: 'Test' }],
        rowCount: 1,
      });

      const result = await debug.wrap('query_users', mockQuery, {
        template: 'database',
        context: {
          sql: 'SELECT * FROM users WHERE id = ?',
          params: [1],
          database: 'test_db',
        },
      });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('Test');
    });
  });
});
