import { afterEach, describe, expect, it } from 'vitest';
import { FileLogger } from '../src/core/logger.js';
import { AIDebug } from '../src/index.js';
import type { Config } from '../src/types/index.js';

describe('AIDebug', () => {
  afterEach(() => {
    // Reset FileLogger singleton to prevent test contamination
    FileLogger.resetInstance();
  });
  it('should create an instance', () => {
    const config: Config = {
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
            enabled: false,
            path: './debug/debug.log',
            maxSize: '100MB',
            maxFiles: 5,
            format: 'json',
            compress: true,
          },
        },
        templates: {
          default: 'base',
          autoDetect: true,
        },
        documentation: {
          autoGenerate: true,
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
        baseDir: './debug',
        structure: 'key-based',
        compression: 'none',
      },
    };

    const debug = new AIDebug(config);
    expect(debug).toBeDefined();
    expect(debug.templateRegistry).toBeDefined();
  });

  it('should execute wrapped function', async () => {
    const config: Config = {
      version: '1.0.0',
      features: {
        cache: {
          enabled: false,
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
            enabled: false,
            path: './debug/debug.log',
            maxSize: '100MB',
            maxFiles: 5,
            format: 'json',
            compress: true,
          },
        },
        templates: {
          default: 'base',
          autoDetect: true,
        },
        documentation: {
          autoGenerate: true,
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
        baseDir: './debug',
        structure: 'key-based',
        compression: 'none',
      },
    };

    const debug = new AIDebug(config);
    const result = await debug.wrap('test', async () => {
      return { data: 'test result' };
    });

    expect(result).toEqual({ data: 'test result' });
  });
});
