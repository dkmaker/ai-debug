import { describe, expect, it } from 'vitest';
import { httpTemplate } from '../../../src/templates/http.js';

describe('httpTemplate', () => {
  describe('structure', () => {
    it('extends base template', () => {
      expect(httpTemplate.extends).toBe('base');
    });

    it('has required properties', () => {
      expect(httpTemplate).toHaveProperty('debugData');
      expect(httpTemplate).toHaveProperty('cache');
      expect(httpTemplate).toHaveProperty('log');
    });

    it('has correct cache configuration', () => {
      expect(httpTemplate.cache).toMatchObject({
        key: expect.any(Function),
        ttl: 5 * 60 * 1000, // 5 minutes in milliseconds
        shouldCache: expect.any(Function),
      });
    });
  });

  describe('debugData function', () => {
    it('captures HTTP request context', () => {
      const context = {
        url: '/api/users',
        method: 'GET',
        headers: { Authorization: 'Bearer token' },
        duration: 150,
      };
      const result = { status: 200, data: { users: [] } };

      const debugData = httpTemplate.debugData(context, result, undefined);

      expect(debugData).toHaveProperty('request');
      expect(debugData.request).toMatchObject({
        url: '/api/users',
        method: 'GET',
        headers: { Authorization: '[REDACTED]' }, // Should be sanitized
      });
      expect(debugData.request.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('defaults method to GET', () => {
      const context = { url: '/api/test', duration: 100 };
      const result = { status: 200 };

      const debugData = httpTemplate.debugData(context, result, undefined);

      expect(debugData.request.method).toBe('GET');
    });

    it('includes request body when provided', () => {
      const body = { name: 'John', age: 30 };
      const context = {
        url: '/api/users',
        method: 'POST',
        body,
        duration: 100,
      };
      const result = { status: 201 };

      const debugData = httpTemplate.debugData(context, result, undefined);

      expect(debugData.request.body).toEqual(body);
    });

    it('captures response data', () => {
      const context = {
        url: '/api/users',
        method: 'GET',
        duration: 150,
      };
      const result = {
        status: 200,
        headers: { 'content-type': 'application/json' },
        data: { users: [{ id: 1, name: 'John' }] },
      };

      const debugData = httpTemplate.debugData(context, result, undefined);

      expect(debugData.response).toMatchObject({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: { users: [{ id: 1, name: 'John' }] },
      });
      expect(debugData.response.size).toBeGreaterThan(0);
    });

    it('handles errors correctly', () => {
      const context = {
        url: '/api/users',
        method: 'GET',
        duration: 150,
      };
      const error = new Error('Network error');
      (error as any).response = { status: 500 };
      (error as any).code = 'ERR_NETWORK';

      const debugData = httpTemplate.debugData(context, undefined, error);

      expect(debugData.response).toMatchObject({
        error: 'Network error',
        status: 500,
        code: 'ERR_NETWORK',
      });
    });

    it('sanitizes sensitive headers', () => {
      const context = {
        url: '/api/users',
        headers: {
          Authorization: 'Bearer secret-token',
          Cookie: 'session=secret',
          'X-API-Key': 'secret-key',
          'X-Auth-Token': 'secret-auth',
          'Content-Type': 'application/json',
        },
        duration: 100,
      };
      const result = { status: 200 };

      const debugData = httpTemplate.debugData(context, result, undefined);

      expect(debugData.request.headers).toEqual({
        Authorization: '[REDACTED]',
        Cookie: '[REDACTED]',
        'X-API-Key': '[REDACTED]',
        'X-Auth-Token': '[REDACTED]',
        'Content-Type': 'application/json',
      });
    });

    it('calculates metrics correctly', () => {
      const context = {
        url: '/api/users',
        method: 'POST',
        body: { name: 'John' },
        duration: 150,
      };
      const result = {
        status: 200,
        data: { id: 1, name: 'John' },
      };

      const debugData = httpTemplate.debugData(context, result, undefined);

      expect(debugData.metrics).toMatchObject({
        duration_ms: 150,
        bytes_sent: expect.any(Number),
        bytes_received: expect.any(Number),
      });
      expect(debugData.metrics.bytes_sent).toBeGreaterThan(0);
      expect(debugData.metrics.bytes_received).toBeGreaterThan(0);
    });

    it('truncates large bodies', () => {
      const largeBody = 'x'.repeat(2000);
      const context = {
        url: '/api/data',
        method: 'POST',
        body: largeBody,
        duration: 100,
      };
      const result = { status: 200 };

      const debugData = httpTemplate.debugData(context, result, undefined);

      expect(debugData.request.body).toContain('... (truncated)');
      expect((debugData.request.body as string).length).toBeLessThan(1100);
    });
  });

  describe('cache configuration', () => {
    it('generates cache key from method, url, and body hash', () => {
      const context = {
        method: 'POST',
        url: '/api/users',
        body: { name: 'John' },
      };

      // Use a mock hasher that returns predictable values
      const mockHasher = (data: unknown) => {
        const str = JSON.stringify(data);
        return `hash${str.length.toString(16).padStart(4, '0')}`;
      };

      const key = httpTemplate.cache?.key?.(context, mockHasher);

      expect(key).toBe('POST:/api/users:hash000f');
    });

    it('generates different keys for different bodies', () => {
      const context1 = {
        method: 'POST',
        url: '/api/users',
        body: { name: 'John' },
      };
      const context2 = {
        method: 'POST',
        url: '/api/users',
        body: { name: 'Jane' },
      };

      // Mock hasher that generates different hashes for different inputs
      const mockHasher = (data: unknown) => {
        const str = JSON.stringify(data);
        let sum = 0;
        for (let i = 0; i < str.length; i++) {
          sum += str.charCodeAt(i);
        }
        return `hash${(sum % 10000).toString().padStart(4, '0')}`;
      };

      const key1 = httpTemplate.cache?.key?.(context1, mockHasher);
      const key2 = httpTemplate.cache?.key?.(context2, mockHasher);

      expect(key1).not.toBe(key2);
      expect(key1).toMatch(/^POST:\/api\/users:hash\d{4}$/);
      expect(key2).toMatch(/^POST:\/api\/users:hash\d{4}$/);
    });

    it('should cache successful responses', () => {
      expect(httpTemplate.cache?.shouldCache?.({ status: 200 })).toBe(true);
      expect(httpTemplate.cache?.shouldCache?.({ status: 201 })).toBe(true);
      expect(httpTemplate.cache?.shouldCache?.({ status: 304 })).toBe(true);
    });

    it('should not cache error responses', () => {
      expect(httpTemplate.cache?.shouldCache?.({ status: 400 })).toBe(false);
      expect(httpTemplate.cache?.shouldCache?.({ status: 404 })).toBe(false);
      expect(httpTemplate.cache?.shouldCache?.({ status: 500 })).toBe(false);
    });

    it('handles missing status in shouldCache', () => {
      expect(httpTemplate.cache?.shouldCache?.({})).toBe(true); // defaults to 0 < 400
      expect(httpTemplate.cache?.shouldCache?.(null)).toBe(true);
    });
  });

  describe('log formatting', () => {
    it('formats HTTP log entries', () => {
      const entry = {
        id: '123',
        action: 'api_call',
        key: 'test',
        timestamp: '2024-01-01T12:00:00.000Z',
        duration_ms: 150,
        status: 'success' as const,
        data: {
          request: {
            method: 'GET',
            url: '/api/users',
          },
        },
        cached: false,
        templateUsed: 'http',
      };

      const formatted = httpTemplate.log?.format?.(entry);

      expect(formatted).toBe('[HTTP] GET /api/users - success (150ms)');
    });

    it('handles missing request data in log format', () => {
      const entry = {
        id: '123',
        action: 'api_call',
        key: 'test',
        timestamp: '2024-01-01T12:00:00.000Z',
        duration_ms: 150,
        status: 'failure' as const,
        data: {},
        cached: false,
        templateUsed: 'http',
      };

      const formatted = httpTemplate.log?.format?.(entry);

      expect(formatted).toBe('[HTTP] GET unknown - failure (150ms)');
    });
  });
});
