import { createHash } from 'node:crypto';
import type { HttpError } from '../types/errors.js';
import type { Template } from '../types/index.js';

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

function truncateBody(body: unknown, maxLength = 1000): unknown {
  if (!body) return body;

  const str = typeof body === 'string' ? body : JSON.stringify(body);
  if (str.length <= maxLength) return body;

  return `${str.slice(0, maxLength)}... (truncated)`;
}

function calculateSize(data: unknown): number {
  if (!data) return 0;

  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return Buffer.byteLength(str);
}

function hash(data: unknown): string {
  const str = JSON.stringify(data);
  return createHash('sha256').update(str).digest('hex').slice(0, 8);
}

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
    key: (ctx) => `${ctx.method}:${ctx.url}:${hash(ctx.body)}`,
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
