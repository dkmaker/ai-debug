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

export interface CacheOptions {
  enabled?: boolean;
  ttl?: number | ((result: unknown, context?: DebugContext) => number);
  key?: (context: DebugContext) => string;
  shouldCache?: (result: unknown, context?: DebugContext) => boolean;
}

export interface LogOptions {
  enabled?: boolean;
  level?: 'debug' | 'info' | 'warn' | 'error';
  format?: (entry: DebugEntry) => string;
}

// Helper type for typed debug entry data
export interface TypedDebugEntry<T = unknown> extends Omit<DebugEntry, 'data'> {
  data: T;
}

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

export interface WrapOptions {
  template?: string;
  context?: DebugContext;
  raw?: boolean;
}

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
