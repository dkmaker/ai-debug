import { inspect } from 'node:util';
import type { Template } from '../types/index.js';

function createCircularReplacer() {
  const seen = new WeakSet();
  return (_key: string, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
}

function calculateObjectSize(obj: unknown): number {
  if (!obj) return 0;

  try {
    return JSON.stringify(obj, createCircularReplacer()).length;
  } catch {
    return -1;
  }
}

function analyzeStructure(obj: unknown, maxDepth = 3, currentDepth = 0): unknown {
  if (!obj || currentDepth >= maxDepth) return typeof obj;

  if (Array.isArray(obj)) {
    return {
      type: 'array',
      length: obj.length,
      sample: obj.length > 0 ? analyzeStructure(obj[0], maxDepth, currentDepth + 1) : null,
    };
  }

  if (typeof obj === 'object') {
    const objRecord = obj as Record<string, unknown>;
    const structure: Record<string, unknown> = {
      type: 'object',
      constructor: objRecord.constructor?.name,
      keys: Object.keys(objRecord).length,
    };

    // Analyze a few key properties
    const sampleKeys = Object.keys(objRecord).slice(0, 5);
    if (sampleKeys.length > 0) {
      const sample: Record<string, unknown> = {};
      for (const key of sampleKeys) {
        sample[key] = analyzeStructure(objRecord[key], maxDepth, currentDepth + 1);
      }
      structure.sample = sample;
    }

    return structure;
  }

  return typeof obj;
}

function suggestBestTemplate(result: unknown): string {
  if (!result || typeof result !== 'object') return 'base';

  const obj = result as Record<string, unknown>;

  // Check for HTTP-like response
  if ('status' in obj && ('data' in obj || 'body' in obj)) {
    return 'http';
  }

  // Check for database-like result
  if ('rows' in obj || 'affectedRows' in obj || 'fields' in obj) {
    return 'database';
  }

  // Check for file operation result
  if ('bytesWritten' in obj || 'bytesRead' in obj) {
    return 'file';
  }

  // Check for queue/message result
  if ('messageId' in obj || 'deliveryTag' in obj) {
    return 'queue';
  }

  // Default to business logic
  return 'business';
}

function identifyImportantFields(obj: unknown): string[] {
  if (!obj || typeof obj !== 'object') return [];

  const important: string[] = [];
  const keys = Object.keys(obj);

  // Common important field patterns
  const patterns = [
    /^(id|key|name|type|status|error|result|data)$/i,
    /^(created|updated|modified).*$/i,
    /.*_(id|key|code|status|count)$/i,
  ];

  for (const key of keys) {
    if (patterns.some((pattern) => pattern.test(key))) {
      important.push(key);
    }
  }

  return important;
}

export const autoTemplate: Template = {
  extends: 'base',
  debugData: (_context, result, _error, baseData) => {
    const base = typeof baseData === 'object' && baseData !== null ? baseData : {};
    const res = result as Record<string, unknown> | null;
    return {
      ...base,
      raw: {
        type: typeof result,
        constructor: res?.constructor?.name,
        keys: result && typeof result === 'object' ? Object.keys(result) : [],
        sample: inspect(result, { depth: 2, maxArrayLength: 10, breakLength: 80 }),
        size: calculateObjectSize(result),
        structure: analyzeStructure(result, 3),
      },
      suggestions: {
        template: suggestBestTemplate(result),
        fields: identifyImportantFields(result),
      },
    };
  },
  cache: {
    enabled: false, // Don't cache auto-inspected objects by default
  },
  log: {
    format: (entry) => {
      const data = entry.data as Record<string, unknown>;
      const raw = data.raw as { type?: string; constructor?: string } | undefined;
      return `[AUTO] ${entry.action} - ${raw?.type || 'unknown'} (${raw?.constructor || 'unknown'}) - ${entry.status}`;
    },
  },
};
