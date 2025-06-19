import type { Config } from '../src/types/index.js';

/**
 * Creates a test configuration with sensible defaults
 */
export function createTestConfig(overrides: Partial<Config> = {}): Config {
  return {
    version: '1.0.0',
    features: {
      cache: {
        enabled: true,
        defaultTTL: 3600000,
        maxSize: 100,
        strategy: 'lru',
      },
      debug: {
        enabled: true,
        level: 'info',
        captureMetadata: true,
        raw: {
          enabled: true,
          maxDepth: 3,
          maxSize: 10000,
        },
      },
      logging: {
        console: {
          enabled: false,
          level: 'info',
          format: 'pretty',
          colors: true,
        },
        file: {
          enabled: true,
          path: './test-debug/debug.log',
          maxSize: '10MB',
          maxFiles: 2,
          format: 'json',
          compress: false,
        },
        filters: {
          excludeActions: [],
          includeOnlyErrors: false,
          excludeTemplates: [],
        },
      },
      templates: {
        default: 'base',
        autoDetect: true,
      },
      documentation: {
        autoGenerate: false,
        format: 'claude',
        outputPath: './CLAUDE.md',
        includeExamples: true,
        analyzeCoverage: true,
        updateOnChange: false,
        customSections: {
          projectSpecific: true,
          performanceTips: true,
          commonErrors: true,
          teamGuidelines: true,
        },
      },
    },
    persistence: {
      baseDir: './test-debug',
      structure: 'key-based',
      compression: 'none',
    },
    ...overrides,
  };
}

/**
 * Creates a mock file system for testing
 */
export function createMockFs() {
  const mockStreams = new Map<string, any>();

  return {
    existsSync: vi.fn(() => false),
    mkdirSync: vi.fn(),
    statSync: vi.fn(() => ({ size: 0 })),
    readdirSync: vi.fn(() => []),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    createWriteStream: vi.fn((path: string) => {
      const stream = {
        write: vi.fn((_data: any, cb?: any) => {
          if (cb) cb();
        }),
        end: vi.fn(),
        on: vi.fn(),
      };
      mockStreams.set(path, stream);
      return stream;
    }),
    createReadStream: vi.fn(),
    unlinkSync: vi.fn(),
    renameSync: vi.fn(),
    _mockStreams: mockStreams, // Expose for testing
  };
}

/**
 * Waits for async operations to complete
 */
export async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

/**
 * Creates a test error with predictable properties
 */
export function createTestError(message: string, code?: string): Error & { code?: string } {
  const error = new Error(message) as Error & { code?: string };
  if (code) error.code = code;
  return error;
}
