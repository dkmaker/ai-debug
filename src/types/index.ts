/**
 * Context information passed to debug operations.
 * Contains metadata about the operation being debugged.
 *
 * @interface DebugContext
 * @property {string} action - Unique identifier for the operation (e.g., 'fetch_user', 'db_query')
 * @property {string} [key] - Cache key override or identifier
 * @property {string} [url] - URL for HTTP operations
 * @property {string} [method] - HTTP method (GET, POST, etc.)
 * @property {Record<string, string>} [headers] - HTTP headers
 * @property {unknown} [body] - Request body for HTTP operations
 * @property {string} [sql] - SQL query for database operations
 * @property {unknown[]} [params] - Parameters for SQL queries
 * @property {string} [database] - Database name or identifier
 * @property {string} [transaction] - Transaction ID for database operations
 * @property {string} [operation] - File operation type (read, write, etc.)
 * @property {string} [path] - File system path
 * @property {unknown} [options] - Additional options for operations
 * @property {string} [queue] - Queue name for message operations
 * @property {string} [messageId] - Message identifier
 * @property {string} [timestamp] - ISO timestamp
 * @property {string} [entity] - Business entity name
 * @property {unknown} [input] - Input data for business operations
 * @property {unknown} [metadata] - Additional metadata
 * @property {string} [service] - Service name or identifier
 * @property {unknown} [payload] - Generic payload data
 * @property {number} [duration] - Operation duration in milliseconds
 *
 * @example
 * const context: DebugContext = {
 *   action: 'fetch_user',
 *   url: '/api/users/123',
 *   method: 'GET',
 *   headers: { 'Authorization': 'Bearer token' }
 * };
 */
export interface DebugContext {
  action: string;
  key?: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  sql?: string;
  params?: unknown[];
  database?: string;
  transaction?: string;
  operation?: string;
  path?: string;
  options?: unknown;
  queue?: string;
  messageId?: string;
  timestamp?: string;
  entity?: string;
  input?: unknown;
  metadata?: unknown;
  service?: string;
  payload?: unknown;
  duration?: number;
  [key: string]: unknown;
}

/**
 * Result information from a debug operation.
 * Contains the outcome and metadata from the wrapped operation.
 *
 * @interface DebugResult
 * @property {unknown} [data] - The main result data from the operation
 * @property {number} [status] - HTTP status code
 * @property {Record<string, string>} [headers] - Response headers
 * @property {unknown[]} [rows] - Database query result rows
 * @property {number} [affectedRows] - Number of rows affected by database operation
 * @property {number} [rowsExamined] - Number of rows examined in database query
 * @property {number} [size] - File size in bytes
 * @property {string} [encoding] - File encoding (utf8, base64, etc.)
 * @property {boolean} [success] - Operation success indicator
 * @property {string} [messageId] - Message/queue operation ID
 * @property {string} [deliveryTag] - Queue delivery tag
 * @property {Error} [error] - Error object if operation failed
 *
 * @example
 * const result: DebugResult = {
 *   data: { id: 123, name: 'John' },
 *   status: 200,
 *   headers: { 'content-type': 'application/json' }
 * };
 */
export interface DebugResult {
  data?: unknown;
  status?: number;
  headers?: Record<string, string>;
  rows?: unknown[];
  affectedRows?: number;
  rowsExamined?: number;
  size?: number;
  encoding?: string;
  success?: boolean;
  messageId?: string;
  deliveryTag?: string;
  error?: Error;
  [key: string]: unknown;
}

/**
 * A single debug log entry representing one wrapped operation.
 * This is what gets logged to files and can be analyzed later.
 *
 * @interface DebugEntry
 * @property {string} id - Unique identifier (UUID) for this entry
 * @property {string} action - The action name from DebugContext
 * @property {string} key - Cache key used for this operation
 * @property {string} timestamp - ISO 8601 timestamp when operation started
 * @property {number} duration_ms - How long the operation took in milliseconds
 * @property {'success' | 'failure'} status - Whether the operation succeeded
 * @property {unknown} data - Combined context and result data
 * @property {string} [error] - Error message if operation failed
 * @property {boolean} [cached] - Whether result was served from cache
 * @property {string} [templateUsed] - Name of the template used for debugging
 *
 * @example
 * const entry: DebugEntry = {
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   action: 'fetch_user',
 *   key: 'user:123',
 *   timestamp: '2024-01-01T12:00:00.000Z',
 *   duration_ms: 145,
 *   status: 'success',
 *   data: { user: { id: 123, name: 'John' } },
 *   cached: false,
 *   templateUsed: 'http'
 * };
 */
export interface DebugEntry {
  id: string;
  action: string;
  key: string;
  timestamp: string;
  duration_ms: number;
  status: 'success' | 'failure';
  data: unknown;
  error?: string;
  cached?: boolean;
  templateUsed?: string;
}

/**
 * Options for controlling caching behavior in templates.
 * Allows fine-grained control over what gets cached and for how long.
 *
 * @interface CacheOptions
 * @property {boolean} [enabled] - Whether caching is enabled for this operation
 * @property {number | Function} [ttl] - Time-to-live in seconds, or function returning TTL
 * @property {Function} [key] - Custom function to generate cache keys
 * @property {Function} [shouldCache] - Function to determine if result should be cached
 *
 * @example
 * const cacheOptions: CacheOptions = {
 *   enabled: true,
 *   ttl: 300, // 5 minutes
 *   key: (context) => `api:${context.url}:${context.method}`,
 *   shouldCache: (result) => result.status === 200
 * };
 *
 * @example
 * // Dynamic TTL based on result
 * const dynamicCache: CacheOptions = {
 *   enabled: true,
 *   ttl: (result) => {
 *     if (result.status === 404) return 60; // 1 minute for 404s
 *     if (result.status === 200) return 3600; // 1 hour for success
 *     return 0; // Don't cache errors
 *   }
 * };
 */
export interface CacheOptions {
  enabled?: boolean;
  ttl?: number | ((result: unknown, context?: DebugContext) => number);
  key?: (context: DebugContext) => string;
  shouldCache?: (result: unknown, context?: DebugContext) => boolean;
}

/**
 * Options for controlling logging behavior in templates.
 *
 * @interface LogOptions
 * @property {boolean} [enabled] - Whether logging is enabled
 * @property {'debug' | 'info' | 'warn' | 'error'} [level] - Minimum log level
 * @property {Function} [format] - Custom formatting function for log entries
 *
 * @example
 * const logOptions: LogOptions = {
 *   enabled: true,
 *   level: 'info',
 *   format: (entry) => `[${entry.action}] ${entry.duration_ms}ms`
 * };
 */
export interface LogOptions {
  enabled?: boolean;
  level?: 'debug' | 'info' | 'warn' | 'error';
  format?: (entry: DebugEntry) => string;
}

/**
 * Type-safe version of DebugEntry with generic data type.
 * Useful when you know the exact shape of the debug data.
 *
 * @interface TypedDebugEntry
 * @template T - The type of the data property
 *
 * @example
 * interface UserDebugData {
 *   user: { id: number; name: string };
 *   fromCache: boolean;
 * }
 *
 * const entry: TypedDebugEntry<UserDebugData> = {
 *   id: '123',
 *   action: 'fetch_user',
 *   key: 'user:123',
 *   timestamp: '2024-01-01T12:00:00.000Z',
 *   duration_ms: 145,
 *   status: 'success',
 *   data: {
 *     user: { id: 123, name: 'John' },
 *     fromCache: false
 *   }
 * };
 */
export interface TypedDebugEntry<T = unknown> extends Omit<DebugEntry, 'data'> {
  data: T;
}

/**
 * Template definition for customizing debug behavior.
 * Templates control how operations are debugged, cached, and logged.
 *
 * @interface Template
 * @property {string} [extends] - Name of parent template to inherit from
 * @property {Function} debugData - Function to transform debug data for logging
 * @property {CacheOptions} [cache] - Caching configuration for this template
 * @property {LogOptions} [log] - Logging configuration for this template
 *
 * Common patterns:
 * - Extend 'base' template for custom templates
 * - Use debugData to extract relevant information
 * - Configure cache TTL based on operation type
 *
 * @example
 * const apiTemplate: Template = {
 *   extends: 'base',
 *   debugData: (context, result, error) => ({
 *     url: context.url,
 *     method: context.method,
 *     status: result?.status,
 *     error: error?.message
 *   }),
 *   cache: {
 *     enabled: true,
 *     ttl: 300,
 *     key: (ctx) => `api:${ctx.method}:${ctx.url}`
 *   }
 * };
 */
export interface Template {
  extends?: string;
  debugData: (
    context: DebugContext,
    result: unknown,
    error?: Error,
    parentData?: unknown,
  ) => unknown;
  cache?: CacheOptions;
  log?: LogOptions;
}

/**
 * Options passed to the wrap() method.
 * Controls how a specific operation is debugged.
 *
 * @interface WrapOptions
 * @property {string} [template] - Template name to use (default: 'auto')
 * @property {DebugContext} [context] - Additional context to merge
 * @property {boolean} [raw] - Use raw debugging mode (captures everything)
 *
 * @example
 * // Use HTTP template with custom context
 * await debug.wrap('api_call', fetchData, {
 *   template: 'http',
 *   context: {
 *     url: '/api/users',
 *     method: 'GET'
 *   }
 * });
 *
 * @example
 * // Raw mode for detailed debugging
 * await debug.wrap('complex_operation', doWork, {
 *   raw: true
 * });
 */
export interface WrapOptions {
  template?: string;
  context?: DebugContext;
  raw?: boolean;
}

/**
 * Main configuration object for the AI debugging system.
 * Controls all aspects of debugging, caching, logging, and documentation.
 *
 * @audience external
 * @interface Config
 * @property {string} version - Package version for compatibility checking
 * @property {Object} features - Feature toggles and configurations
 * @property {Object} persistence - How debug data is stored on disk
 *
 * @example
 * const config: Config = {
 *   version: '1.0.0',
 *   features: {
 *     cache: {
 *       enabled: true,
 *       defaultTTL: 300,
 *       maxSize: 1000,
 *       strategy: 'lru'
 *     },
 *     debug: {
 *       enabled: true,
 *       level: 'info',
 *       captureMetadata: true,
 *       raw: {
 *         enabled: true,
 *         maxDepth: 5,
 *         maxSize: 10000
 *       }
 *     },
 *     logging: {
 *       console: {
 *         enabled: false,
 *         level: 'warn',
 *         format: 'pretty',
 *         colors: true
 *       },
 *       file: {
 *         enabled: true,
 *         path: './debug/debug.log',
 *         maxSize: '10MB',
 *         maxFiles: 5,
 *         format: 'json',
 *         compress: false
 *       }
 *     },
 *     templates: {
 *       default: 'auto',
 *       autoDetect: true
 *     },
 *     documentation: {
 *       autoGenerate: false,
 *       format: 'claude',
 *       outputPath: './debug/docs',
 *       includeExamples: true,
 *       analyzeCoverage: true,
 *       updateOnChange: false,
 *       customSections: {
 *         projectSpecific: true,
 *         performanceTips: true,
 *         commonErrors: true,
 *         teamGuidelines: false
 *       }
 *     }
 *   },
 *   persistence: {
 *     baseDir: './debug',
 *     structure: 'key-based',
 *     compression: 'none'
 *   }
 * };
 */
export interface Config {
  version: string;
  features: {
    cache: {
      enabled: boolean;
      defaultTTL: number;
      maxSize: number;
      strategy: 'lru' | 'fifo';
    };
    debug: {
      enabled: boolean;
      level: string;
      captureMetadata: boolean;
      raw: {
        enabled: boolean;
        maxDepth: number;
        maxSize: number;
      };
    };
    logging: {
      console: {
        enabled: boolean;
        level: string;
        format: 'pretty' | 'json';
        colors: boolean;
      };
      file: {
        enabled: boolean;
        path: string;
        maxSize: string;
        maxFiles: number;
        format: 'json' | 'pretty';
        compress: boolean;
      };
      filters?: {
        excludeActions?: string[];
        includeOnlyErrors?: boolean;
        excludeTemplates?: string[];
      };
    };
    templates: {
      default: string;
      autoDetect: boolean;
    };
    documentation: {
      autoGenerate: boolean;
      format: 'claude';
      outputPath: string;
      includeExamples: boolean;
      analyzeCoverage: boolean;
      updateOnChange: boolean;
      customSections: {
        projectSpecific: boolean;
        performanceTips: boolean;
        commonErrors: boolean;
        teamGuidelines: boolean;
      };
    };
  };
  persistence: {
    baseDir: string;
    structure: 'key-based' | 'date-based';
    compression: 'gzip' | 'none';
  };
}
