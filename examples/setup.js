#!/usr/bin/env node

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';

console.log(chalk.blue('🔧 Setting up AI Debug examples...'));

// Create .ai-debug directory
if (!existsSync('.ai-debug')) {
  mkdirSync('.ai-debug', { recursive: true });
  console.log(chalk.green('✅ Created .ai-debug directory'));
}

// Create templates directory
if (!existsSync('.ai-debug/templates')) {
  mkdirSync('.ai-debug/templates', { recursive: true });
  console.log(chalk.green('✅ Created templates directory'));
}

// Create debug directory
if (!existsSync('debug')) {
  mkdirSync('debug', { recursive: true });
  console.log(chalk.green('✅ Created debug directory'));
}

// Create config.json
const config = {
  "version": "0.1.0",
  "features": {
    "cache": {
      "enabled": true,
      "defaultTTL": 300000,
      "maxSize": 100,
      "strategy": "lru"
    },
    "debug": {
      "enabled": true,
      "level": "info",
      "captureMetadata": true,
      "raw": {
        "enabled": true,
        "maxDepth": 3,
        "maxSize": 10000
      }
    },
    "logging": {
      "console": {
        "enabled": true,
        "level": "info",
        "format": "pretty",
        "colors": true
      },
      "file": {
        "enabled": true,
        "path": "./debug/debug.log",
        "maxSize": "50MB",
        "maxFiles": 3,
        "format": "json",
        "compress": false
      },
      "filters": {
        "excludeActions": [],
        "includeOnlyErrors": false
      }
    },
    "templates": {
      "default": "base",
      "autoDetect": true
    },
    "documentation": {
      "autoGenerate": false,
      "format": "claude",
      "outputPath": "./CLAUDE.md",
      "includeExamples": true,
      "analyzeCoverage": true,
      "updateOnChange": false,
      "customSections": {
        "projectSpecific": true,
        "performanceTips": true,
        "commonErrors": true,
        "teamGuidelines": true
      }
    }
  },
  "persistence": {
    "baseDir": "./debug",
    "structure": "key-based",
    "compression": "none"
  }
};

writeFileSync('.ai-debug/config.json', JSON.stringify(config, null, 2));
console.log(chalk.green('✅ Created config.json'));

// Create wrapper.js
const wrapper = `// AI Debug wrapper for examples
let aiDebugInstance = null;

// Initialize on first import
(async () => {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { AIDebug } = await import('@dkmaker/ai-debug');
      const config = await import('./config.json', { with: { type: 'json' } });
      const { resolve } = await import('node:path');
      const templatesPath = resolve('.ai-debug/templates');
      aiDebugInstance = new AIDebug(config.default, templatesPath);
      console.log('🔍 AI Debug initialized for examples');
    } catch (e) {
      console.warn('⚠️  Failed to initialize AI Debug:', e.message);
    }
  }
})();

// Simple wrapper - all logic is in the package
export const debug = {
  wrap: (action, fn, ...args) => aiDebugInstance?.wrap(action, fn, ...args) || fn(),
  raw: (action, fn, ...args) => aiDebugInstance?.raw(action, fn, ...args) || fn(),
  log: (level, message, data) => aiDebugInstance?.log(level, message, data)
};

// Removal patterns for production builds
export const REMOVAL_PATTERNS = {
  debugBlock: /\\/\\*DEBUG:START\\*\\/[\\s\\S]*?\\/\\*DEBUG:END\\*\\//g,
  inlineDebug: /\\/\\*DEBUG:START\\*\\/.*?\\/\\*DEBUG:END\\*\\//g
};
`;

writeFileSync('.ai-debug/wrapper.js', wrapper);
console.log(chalk.green('✅ Created wrapper.js'));

// Create custom template example
const customTemplate = `// Custom API template extending HTTP template
export const customApiTemplate = {
  extends: 'http',
  debugData: (context, result, error, parentData) => ({
    ...parentData,
    customApi: {
      requestId: context.requestId || 'unknown',
      userAgent: context.userAgent || 'unknown',
      apiVersion: context.apiVersion || 'v1',
      customMetrics: {
        responseSize: result ? JSON.stringify(result).length : 0,
        success: !error,
        timestamp: new Date().toISOString()
      }
    }
  }),
  cache: {
    key: (ctx) => \`custom-api:\${ctx.apiVersion}:\${ctx.url}:\${ctx.method}\`,
    ttl: 600000, // 10 minutes
    shouldCache: (result, ctx) => ctx.method === 'GET' && result?.status < 400
  },
  log: {
    enabled: true,
    level: 'info',
    format: (entry) => \`[CUSTOM-API] \${entry.data.customApi?.apiVersion} \${entry.data.request?.method} \${entry.data.request?.url} - \${entry.status} (\${entry.duration_ms}ms)\`
  }
};

// E-commerce specific template
export const ecommerceTemplate = {
  extends: 'business',
  debugData: (context, result, error, parentData) => ({
    ...parentData,
    ecommerce: {
      orderId: context.orderId,
      customerId: context.customerId,
      amount: context.amount,
      currency: context.currency || 'USD',
      paymentMethod: context.paymentMethod,
      shippingMethod: context.shippingMethod,
      metrics: {
        processingTime: parentData?.duration_ms,
        success: !error,
        errorType: error?.type || null
      }
    }
  }),
  cache: {
    enabled: false // E-commerce operations shouldn't be cached
  },
  log: {
    enabled: true,
    level: 'info',
    format: (entry) => \`[ECOMMERCE] Order \${entry.data.ecommerce?.orderId} - \${entry.status} (\${entry.duration_ms}ms)\`
  }
};
`;

writeFileSync('.ai-debug/templates/custom-templates.js', customTemplate);
console.log(chalk.green('✅ Created custom templates'));

// Create sample data files
mkdirSync('sample-data', { recursive: true });

const sampleUsers = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'admin', active: true },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'user', active: true },
  { id: 3, name: 'Carol Davis', email: 'carol@example.com', role: 'user', active: false },
  { id: 4, name: 'David Wilson', email: 'david@example.com', role: 'moderator', active: true }
];

writeFileSync('sample-data/users.json', JSON.stringify(sampleUsers, null, 2));

const sampleConfig = {
  app: {
    name: 'Example App',
    version: '1.0.0',
    environment: 'development',
    features: {
      enableNotifications: true,
      enableAnalytics: false,
      maxFileSize: '10MB'
    }
  },
  database: {
    host: 'localhost',
    port: 5432,
    name: 'example_db',
    ssl: false
  },
  cache: {
    ttl: 3600,
    maxSize: 1000
  }
};

writeFileSync('sample-data/config.json', JSON.stringify(sampleConfig, null, 2));

const sampleLog = [
  '[2024-01-01T10:00:00.000Z] INFO: Application started',
  '[2024-01-01T10:00:01.123Z] INFO: Database connection established',
  '[2024-01-01T10:00:02.456Z] WARN: Cache size approaching limit',
  '[2024-01-01T10:00:03.789Z] ERROR: Failed to process request: timeout',
  '[2024-01-01T10:00:04.012Z] INFO: Request processed successfully',
  '[2024-01-01T10:00:05.345Z] DEBUG: Cache hit for key: user:123'
].join('\\n');

writeFileSync('sample-data/app.log', sampleLog);

console.log(chalk.green('✅ Created sample data files'));

console.log(chalk.blue('\\n🎉 Setup complete! Run examples with:'));
console.log(chalk.yellow('  npm run http      # HTTP examples'));
console.log(chalk.yellow('  npm run database  # Database examples'));
console.log(chalk.yellow('  npm run files     # File I/O examples'));
console.log(chalk.yellow('  npm run all       # Run all examples'));
console.log(chalk.blue('\\n📊 Check debug data in ./debug/ directory'));