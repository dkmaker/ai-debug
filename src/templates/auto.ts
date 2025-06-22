import { inspect } from 'node:util';
import type { Template } from '../types/index.js';

/**
 * Creates a replacer function that handles circular references.
 * Used when stringifying objects for size calculation.
 *
 * @returns {Function} Replacer function for JSON.stringify
 * @private
 */
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

/**
 * Calculates the approximate size of an object in bytes.
 * Handles circular references gracefully.
 *
 * @param {unknown} obj - Object to measure
 * @returns {number} Size in bytes, or -1 if unable to calculate
 * @private
 */
function calculateObjectSize(obj: unknown): number {
  if (!obj) return 0;

  try {
    return JSON.stringify(obj, createCircularReplacer()).length;
  } catch {
    return -1;
  }
}

/**
 * Recursively analyzes the structure of an object.
 * Provides a summary of types, array lengths, and object keys.
 *
 * @param {unknown} obj - Object to analyze
 * @param {number} maxDepth - Maximum recursion depth (default: 3)
 * @param {number} currentDepth - Current recursion depth
 * @returns {unknown} Structure summary object
 * @private
 */
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

/**
 * Analyzes a result object and suggests the most appropriate template.
 * Uses heuristics based on common property names and patterns.
 *
 * @param {unknown} result - Result object to analyze
 * @returns {string} Suggested template name
 * @private
 */
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

/**
 * Identifies potentially important fields in an object.
 * Uses pattern matching to find common important field names.
 *
 * @param {unknown} obj - Object to analyze
 * @returns {string[]} Array of important field names
 * @private
 */
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

/**
 * Automatic object inspection template.
 * Analyzes unknown objects and suggests appropriate templates.
 *
 * @const autoTemplate
 *
 * This template is used when:
 * - No specific template is specified
 * - You need to inspect complex objects
 * - You're debugging unknown data structures
 *
 * Features:
 * - Deep object inspection with circular reference handling
 * - Structure analysis with type information
 * - Automatic template suggestion based on object shape
 * - Identification of important fields
 * - Size calculation for performance monitoring
 *
 * Captured data:
 * - Object type, constructor, and key count
 * - Sample inspection output with controlled depth
 * - Object size in bytes
 * - Recursive structure analysis
 * - Template suggestions for future use
 * - Important field identification
 *
 * Cache behavior:
 * - Disabled by default (raw inspection shouldn't be cached)
 *
 * @example
 * // Inspect an unknown API response
 * const result = await debug.wrap('mystery_api',
 *   () => fetchSomeData(),
 *   { template: 'auto' }
 * );
 *
 * @example
 * // Use raw mode for detailed debugging
 * const data = await debug.raw('complex_operation', () => {
 *   return performComplexCalculation();
 * });
 *
 * Troubleshooting:
 * - Large objects may be truncated in the sample
 * - Circular references are marked as [Circular]
 * - Template suggestions are heuristic-based
 */
export const autoTemplate: Template = {
  extends: 'base',
  cacheContext: (context) => ({
    action: context.action,
    params: context.params,
  }),
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
