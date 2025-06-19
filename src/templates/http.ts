import { createHash } from 'node:crypto';
import type { HttpError } from '../types/errors.js';
import type { Template } from '../types/index.js';

/**
 * Sanitizes HTTP headers by redacting sensitive values.
 *
 * @param headers - Raw headers object
 * @returns Headers with sensitive values redacted
 * @private
 */
function sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
  if (!headers) return undefined;

  const sensitive = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (sensitive.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Truncates large request/response bodies for logging.
 *
 * @param body - Body content to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated body or original if under limit
 * @private
 */
function truncateBody(body: unknown, maxLength = 1000): unknown {
  if (!body) return body;

  const str = typeof body === 'string' ? body : JSON.stringify(body);
  if (str.length <= maxLength) return body;

  return `${str.slice(0, maxLength)}... (truncated)`;
}

/**
 * Calculates the byte size of data.
 *
 * @param data - Data to measure
 * @returns Size in bytes
 * @private
 */
function calculateSize(data: unknown): number {
  if (!data) return 0;

  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return Buffer.byteLength(str);
}

/**
 * Default hash function using SHA-256.
 * Creates a short hash of data for cache keys.
 *
 * @param data - Data to hash
 * @returns 8-character hash
 */
export function defaultHasher(data: unknown): string {
  const str = JSON.stringify(data);
  return createHash('sha256').update(str).digest('hex').slice(0, 8);
}

/**
 * Type definition for hash function that can be injected.
 */
export type HashFunction = (data: unknown) => string;

/**
 * Template for HTTP/REST API operations.
 * Captures request/response details with security sanitization.
 *
 * @const httpTemplate
 *
 * Expected context:
 * - url: Request URL
 * - method: HTTP method (GET, POST, etc.)
 * - headers: Request headers
 * - body: Request body
 *
 * Captured data:
 * - Request details (sanitized headers, truncated body)
 * - Response status, headers, and body
 * - Performance metrics (duration, bytes transferred)
 *
 * Security features:
 * - Redacts sensitive headers (Authorization, Cookie, etc.)
 * - Truncates large bodies to prevent log bloat
 * - Hashes request body for cache keys
 *
 * Cache behavior:
 * - 5 minute TTL by default
 * - Only caches successful responses (status < 400)
 * - Cache key includes method, URL, and body hash
 *
 * @example
 * await debug.wrap('api_call',
 *   () => fetch('/api/users'),
 *   {
 *     template: 'http',
 *     context: {
 *       url: '/api/users',
 *       method: 'GET'
 *     }
 *   }
 * );
 */
export const httpTemplate: Template = {
  extends: 'base',
  debugData: (context, result, error) => ({
    request: {
      url: context.url,
      method: context.method || 'GET',
      headers: sanitizeHeaders(context.headers),
      body: truncateBody(context.body),
      timestamp: new Date().toISOString(),
    },
    response: error
      ? {
          error: error.message,
          status: (error as HttpError).response?.status,
          code: (error as HttpError).code,
        }
      : {
          status: (result as { status?: number } | null)?.status || 200,
          headers: sanitizeHeaders(
            (result as { headers?: Record<string, string> } | null)?.headers,
          ),
          body: truncateBody((result as { data?: unknown } | null)?.data),
          size: calculateSize((result as { data?: unknown } | null)?.data),
        },
    metrics: {
      duration_ms: context.duration,
      bytes_sent: calculateSize(context.body),
      bytes_received: calculateSize((result as { data?: unknown } | null)?.data),
    },
  }),
  cache: {
    key: (ctx, hasher: HashFunction = defaultHasher) =>
      `${ctx.method}:${ctx.url}:${hasher(ctx.body)}`,
    ttl: 5 * 60 * 1000, // 5 minutes
    shouldCache: (result) => ((result as { status?: number } | null)?.status || 0) < 400,
  },
  log: {
    format: (entry) => {
      const data = entry.data as { request?: { method?: string; url?: string } };
      const method = data.request?.method || 'GET';
      const url = data.request?.url || 'unknown';
      return `[HTTP] ${method} ${url} - ${entry.status} (${entry.duration_ms}ms)`;
    },
  },
};
