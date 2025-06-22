import { describe, expect, it } from 'vitest';
import { baseTemplate } from '../../../src/templates/base.js';

describe('baseTemplate', () => {
  describe('structure', () => {
    it('has required properties', () => {
      expect(baseTemplate).toHaveProperty('debugData');
      expect(baseTemplate).toHaveProperty('cache');
      expect(baseTemplate).toHaveProperty('log');
    });

    it('has correct cache configuration', () => {
      expect(baseTemplate.cache).toEqual({
        enabled: true,
        ttl: 60 * 60 * 1000, // 1 hour in milliseconds
        shouldCache: expect.any(Function),
      });
    });

    it('has correct log configuration', () => {
      expect(baseTemplate.log).toEqual({
        enabled: true,
        level: 'info',
        format: expect.any(Function),
      });
    });
  });

  describe('debugData function', () => {
    it('captures basic debug information', () => {
      const context = {
        action: 'test_action',
        duration: 150,
      };
      const result = { data: 'test result' };

      const debugData = baseTemplate.debugData(context, result, undefined);

      expect(debugData).toMatchObject({
        action: 'test_action',
        duration_ms: 150,
        status: 'success',
        result: { data: 'test result' },
      });
      expect(debugData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(debugData.error).toBeUndefined();
    });

    it('handles errors correctly', () => {
      const context = {
        action: 'test_action',
        duration: 150,
      };
      const error = new Error('Test error');

      const debugData = baseTemplate.debugData(context, undefined, error);

      expect(debugData).toMatchObject({
        action: 'test_action',
        duration_ms: 150,
        status: 'failure',
        error: 'Test error',
      });
      expect(debugData.result).toBeUndefined();
    });

    it('generates timestamp in ISO format', () => {
      const context = {
        action: 'test',
        duration: 100,
      };

      const debugData = baseTemplate.debugData(context, null, undefined);
      const timestamp = new Date(debugData.timestamp);

      expect(timestamp.toISOString()).toBe(debugData.timestamp);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('cache.shouldCache function', () => {
    it('returns true for non-null results', () => {
      expect(baseTemplate.cache?.shouldCache?.({ data: 'test' })).toBe(true);
      expect(baseTemplate.cache?.shouldCache?.('string')).toBe(true);
      expect(baseTemplate.cache?.shouldCache?.(123)).toBe(true);
      expect(baseTemplate.cache?.shouldCache?.(true)).toBe(true);
      expect(baseTemplate.cache?.shouldCache?.(false)).toBe(true);
      expect(baseTemplate.cache?.shouldCache?.([])).toBe(true);
      expect(baseTemplate.cache?.shouldCache?.({})).toBe(true);
    });

    it('returns false for null and undefined', () => {
      expect(baseTemplate.cache?.shouldCache?.(null)).toBe(false);
      expect(baseTemplate.cache?.shouldCache?.(undefined)).toBe(false);
    });
  });

  describe('log.format function', () => {
    it('formats log entries correctly', () => {
      const entry = {
        id: '123',
        action: 'test_action',
        timestamp: '2024-01-01T12:00:00.000Z',
        duration_ms: 150,
        status: 'success' as const,
        data: {},
        cached: false,
        templateUsed: 'base',
      };

      const formatted = baseTemplate.log?.format?.(entry);

      expect(formatted).toBe('[DEBUG] test_action - success (150ms)');
    });

    it('formats failure entries correctly', () => {
      const entry = {
        id: '123',
        action: 'test_action',
        timestamp: '2024-01-01T12:00:00.000Z',
        duration_ms: 150,
        status: 'failure' as const,
        data: {},
        error: 'Test error',
        cached: false,
        templateUsed: 'base',
      };

      const formatted = baseTemplate.log?.format?.(entry);

      expect(formatted).toBe('[DEBUG] test_action - failure (150ms)');
    });
  });
});
