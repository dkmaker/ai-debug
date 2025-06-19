import type { Config } from '../../types/index.js';

interface ConfigAnswers {
  enableCache?: boolean;
  cacheStrategy?: 'lru' | 'fifo';
  enableFileLogging?: boolean;
  logPath?: string;
  enableConsoleLogging?: boolean;
  defaultTemplate?: string;
  generateDocs?: boolean;
}

export function generateConfig(answers: ConfigAnswers): Config {
  return {
    version: '2.0.0',
    features: {
      cache: {
        enabled: answers.enableCache ?? true,
        defaultTTL: 3600000, // 1 hour
        maxSize: 100,
        strategy: answers.cacheStrategy || 'lru',
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
          enabled: answers.enableConsoleLogging ?? false,
          level: 'info',
          format: 'pretty',
          colors: true,
        },
        file: {
          enabled: answers.enableFileLogging ?? true,
          path: answers.logPath || './debug/debug.log',
          maxSize: '100MB',
          maxFiles: 5,
          format: 'json',
          compress: true,
        },
        filters: {
          excludeActions: [],
          includeOnlyErrors: false,
          excludeTemplates: [],
        },
      },
      templates: {
        default: answers.defaultTemplate || 'base',
        autoDetect: true,
      },
      documentation: {
        autoGenerate: answers.generateDocs ?? true,
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
      compression: 'gzip',
    },
  };
}
