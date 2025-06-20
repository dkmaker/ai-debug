import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { JSDocEntry } from './jsdoc-extractor.js';

/**
 * Configuration for Claude command generation.
 */
export interface ClaudeCommandGenOptions {
  /** Output directory for Claude command files */
  outputDir: string;
  /** Project name for context */
  projectName?: string;
  /** Project version */
  version?: string;
  /** Whether to include Mermaid diagrams in commands */
  includeDiagrams: boolean;
  /** Whether to include detailed code examples */
  includeExamples: boolean;
}

/**
 * Predefined Claude command template for AI-assisted development.
 */
export interface ClaudeCommandTemplate {
  /** Command name (filename without extension) */
  name: string;
  /** Command title for documentation */
  title: string;
  /** Command description */
  description: string;
  /** Implementation workflow steps */
  workflow: ClaudeWorkflowStep[];
  /** Mermaid diagram for the workflow */
  diagram?: string;
  /** Code examples */
  examples: ClaudeCodeExample[];
  /** Common patterns and best practices */
  patterns: string[];
  /** Troubleshooting tips */
  troubleshooting: string[];
}

/**
 * Workflow step for Claude commands.
 */
export interface ClaudeWorkflowStep {
  /** Step number */
  order: number;
  /** Step title */
  title: string;
  /** Detailed description */
  description: string;
  /** Code example for this step */
  code?: string;
  /** Additional notes or warnings */
  notes?: string[];
}

/**
 * Code example for Claude commands.
 */
export interface ClaudeCodeExample {
  /** Example title */
  title: string;
  /** Example description */
  description: string;
  /** Code content */
  code: string;
  /** Programming language */
  language: string;
  /** Additional context */
  context?: string;
}

/**
 * Generated Claude command files information.
 */
export interface GeneratedClaudeCommands {
  /** Files that were generated */
  files: string[];
  /** Total number of commands generated */
  commandCount: number;
  /** Total workflow steps across all commands */
  totalSteps: number;
}

/**
 * Specialized Claude command generator that creates predefined workflow commands
 * for AI-assisted development with the debug system.
 *
 * This generator creates specific command files like:
 * - implement-cache: Caching implementation workflow
 * - add-debug: Debug wrapping workflow
 * - dumpall: Data extraction workflow
 * - optimize-templates: Template optimization
 * - setup-logging: Logging configuration
 *
 * Each command file contains step-by-step implementation workflows,
 * code examples, Mermaid diagrams, and troubleshooting guides.
 *
 * @audience internal
 * @workflow "generate-claude-commands"
 * @claude-command "create-ai-workflows"
 *
 * @example
 * ```typescript
 * const generator = new ClaudeCommandGenerator();
 * const entries = await extractor.extractAll();
 *
 * const result = await generator.generateCommands(entries, {
 *   outputDir: './.claude/commands/ai-debug',
 *   projectName: '@dkmaker/ai-debug',
 *   version: '0.1.0',
 *   includeDiagrams: true,
 *   includeExamples: true
 * });
 *
 * console.log(`Generated ${result.commandCount} Claude commands`);
 * ```
 */
export class ClaudeCommandGenerator {
  private predefinedCommands: ClaudeCommandTemplate[] = [
    {
      name: 'implement-cache',
      title: 'Implement Caching Strategy',
      description: 'Step-by-step workflow for implementing caching with AI Debug system',
      workflow: [
        {
          order: 1,
          title: 'Analyze Caching Requirements',
          description: 'Identify operations that would benefit from caching',
          code: `// Analyze current debug data for cache opportunities
npx ai-debug analyze --focus=performance
npx ai-debug stats --group-by=template`,
          notes: [
            'Look for repeated operations with similar inputs',
            'Focus on expensive operations (database, HTTP, file I/O)',
            'Consider data volatility and TTL requirements',
          ],
        },
        {
          order: 2,
          title: 'Configure Cache Settings',
          description: 'Set up cache configuration in .ai-debug/config.json',
          code: `{
  "features": {
    "cache": {
      "enabled": true,
      "strategy": "lru",
      "maxSize": 100,
      "defaultTTL": 300000,
      "compression": true
    }
  }
}`,
          notes: [
            'Choose LRU for memory efficiency or FIFO for predictable behavior',
            'Set maxSize based on available memory',
            'Use compression for large cached objects',
          ],
        },
        {
          order: 3,
          title: 'Implement Template-Based Caching',
          description: 'Apply caching to operations using appropriate templates',
          code: `// HTTP operations with intelligent caching
/*DEBUG:START*/
const userData = await debug.wrap('fetch_user_profile', async () => {
  return await apiClient.get(\`/users/\${userId}\`);
}, { 
  template: 'http',
  context: { 
    url: \`/users/\${userId}\`,
    method: 'GET',
    cacheable: true
  }
});
/*DEBUG:END*/`,
          notes: [
            'HTTP template automatically caches GET requests',
            'Database template caches SELECT queries',
            'Use context.cacheable for explicit control',
          ],
        },
        {
          order: 4,
          title: 'Customize Cache Keys',
          description: 'Create custom cache key strategies for complex scenarios',
          code: `// Custom cache key for personalized data
/*DEBUG:START*/
const recommendations = await debug.wrap('user_recommendations', async () => {
  return await ml.getRecommendations(userId, preferences);
}, {
  template: 'business',
  cache: {
    key: (ctx) => \`recs:\${ctx.userId}:\${hashObject(ctx.preferences)}\`,
    ttl: 15 * 60 * 1000, // 15 minutes
    shouldCache: (result) => result.length > 0
  }
});
/*DEBUG:END*/`,
          notes: [
            'Include user context in cache keys for personalized data',
            'Use content hashing for complex input objects',
            'Set conditional caching based on result quality',
          ],
        },
        {
          order: 5,
          title: 'Monitor Cache Performance',
          description: 'Track cache hit rates and optimize configuration',
          code: `// Monitor cache effectiveness
npx ai-debug stats --cache-metrics
npx ai-debug view --cache-analysis

// Export cache data for analysis
npx ai-debug export --format=json --include=cache-stats`,
          notes: [
            'Aim for 60-80% cache hit rate for read operations',
            'Monitor memory usage and adjust maxSize if needed',
            'Review TTL settings based on data freshness requirements',
          ],
        },
      ],
      diagram: `graph TD
    A[Analyze Operations] --> B[Configure Cache]
    B --> C[Apply Templates]
    C --> D[Custom Keys]
    D --> E[Monitor Performance]
    E --> F{Good Hit Rate?}
    F -->|Yes| G[Done]
    F -->|No| H[Adjust TTL/Keys]
    H --> E`,
      examples: [
        {
          title: 'Database Query Caching',
          description: 'Cache expensive database queries with automatic key generation',
          code: `/*DEBUG:START*/
const products = await debug.wrap('fetch_active_products', async () => {
  return await db.query(
    'SELECT * FROM products WHERE active = ? ORDER BY created_at DESC',
    [true]
  );
}, { 
  template: 'database',
  context: { 
    table: 'products',
    operation: 'SELECT',
    filters: { active: true }
  }
  // Cache automatically enabled for SELECT queries
});
/*DEBUG:END*/`,
          language: 'typescript',
          context:
            'Database template automatically generates cache keys based on SQL and parameters',
        },
        {
          title: 'API Response Caching',
          description: 'Cache external API responses with custom TTL',
          code: `/*DEBUG:START*/
const weatherData = await debug.wrap('fetch_weather', async () => {
  return await weatherAPI.getCurrentWeather(city);
}, {
  template: 'http',
  context: {
    url: \`/weather/\${city}\`,
    method: 'GET'
  },
  cache: {
    ttl: 10 * 60 * 1000 // 10 minutes for weather data
  }
});
/*DEBUG:END*/`,
          language: 'typescript',
          context: 'Weather data changes frequently, so use shorter TTL',
        },
      ],
      patterns: [
        'Always use template-based caching for consistency',
        'Include user/tenant context in cache keys for multi-tenant apps',
        'Set TTL based on data volatility, not arbitrary timeouts',
        'Use conditional caching to avoid storing empty or error results',
        'Monitor cache hit rates and adjust strategies accordingly',
      ],
      troubleshooting: [
        'Low cache hit rate: Check if cache keys are too specific or TTL too short',
        'Memory issues: Reduce maxSize or enable compression',
        'Stale data: Implement cache invalidation or reduce TTL',
        'Cache misses on similar data: Review cache key generation logic',
      ],
    },
    {
      name: 'add-debug',
      title: 'Add Debug Wrapping',
      description: 'Systematic approach to adding debug wrapping to existing code',
      workflow: [
        {
          order: 1,
          title: 'Identify Debug Candidates',
          description: 'Scan codebase for async operations that need debug tracking',
          code: `// Use built-in analysis to find unwrapped operations
npx ai-debug analyze --find-async
npx ai-debug suggest --priority=high`,
          notes: [
            'Focus on critical business logic first',
            'Prioritize external integrations and database operations',
            'Look for error-prone or performance-sensitive code',
          ],
        },
        {
          order: 2,
          title: 'Choose Appropriate Templates',
          description: 'Select the most specific template for each operation type',
          code: `// Template selection guide:
// HTTP/API calls → 'http'
// Database queries → 'database'  
// File operations → 'file'
// Queue operations → 'queue'
// Business logic → 'business'
// Unknown objects → 'auto'`,
          notes: [
            'Use most specific template available',
            'Avoid defaulting to base template',
            'Create custom templates for domain-specific patterns',
          ],
        },
        {
          order: 3,
          title: 'Wrap Async Operations',
          description: 'Apply debug wrapping with proper context and error handling',
          code: `// Before: Unwrapped async operation
const user = await userService.findById(userId);

// After: Wrapped with debug tracking
/*DEBUG:START*/
const user = await debug.wrap('fetch_user_by_id', async () => {
  return await userService.findById(userId);
}, {
  template: 'database',
  context: {
    operation: 'findById',
    table: 'users',
    userId: userId
  }
});
/*DEBUG:END*/`,
          notes: [
            'Use descriptive action names that indicate purpose',
            'Include relevant context for debugging',
            'Wrap the minimal necessary scope',
          ],
        },
        {
          order: 4,
          title: 'Add Error Context',
          description: 'Enhance error handling with debug context',
          code: `/*DEBUG:START*/
try {
  const result = await debug.wrap('process_payment', async () => {
    return await paymentGateway.charge(amount, cardToken);
  }, {
    template: 'http',
    context: {
      amount: amount,
      gateway: 'stripe',
      operation: 'charge'
    }
  });
} catch (error) {
  // Debug data automatically captured for failed operations
  logger.error('Payment processing failed', { 
    amount, 
    error: error.message,
    debugAction: 'process_payment'
  });
  throw error;
}
/*DEBUG:END*/`,
          notes: [
            'Debug system automatically captures error context',
            'Failed operations are tracked separately',
            'Include action name in error logs for correlation',
          ],
        },
        {
          order: 5,
          title: 'Verify Debug Coverage',
          description: 'Check that debug wrapping is working correctly',
          code: `// Verify debug data is being captured
npx ai-debug list --recent=10
npx ai-debug view process_payment

// Check coverage metrics
npx ai-debug coverage --show-details
npx ai-debug stats --group-by=template`,
          notes: [
            'Test wrapped operations to ensure data capture',
            'Verify context data is meaningful',
            'Check that templates are being applied correctly',
          ],
        },
      ],
      diagram: `graph TD
    A[Scan for Candidates] --> B[Choose Templates]
    B --> C[Wrap Operations]
    C --> D[Add Error Context]
    D --> E[Verify Coverage]
    E --> F{Coverage Good?}
    F -->|Yes| G[Done]
    F -->|No| H[Add More Wrapping]
    H --> C`,
      examples: [
        {
          title: 'HTTP API Integration',
          description: 'Wrap external API calls with proper context',
          code: `/*DEBUG:START*/
const orderStatus = await debug.wrap('check_order_status', async () => {
  const response = await fetch(\`\${apiBase}/orders/\${orderId}/status\`, {
    headers: { 'Authorization': \`Bearer \${token}\` }
  });
  return await response.json();
}, {
  template: 'http',
  context: {
    url: \`\${apiBase}/orders/\${orderId}/status\`,
    method: 'GET',
    orderId: orderId,
    service: 'order-service'
  }
});
/*DEBUG:END*/`,
          language: 'typescript',
          context: 'External service integration with authentication',
        },
        {
          title: 'Complex Business Logic',
          description: 'Wrap business operations with domain context',
          code: `/*DEBUG:START*/
const pricingResult = await debug.wrap('calculate_dynamic_pricing', async () => {
  const basePrice = await pricing.getBasePrice(productId);
  const discounts = await pricing.getApplicableDiscounts(customerId);
  const surge = await pricing.getSurgeMultiplier(location, time);
  
  return pricing.calculateFinalPrice(basePrice, discounts, surge);
}, {
  template: 'business',
  context: {
    operation: 'dynamic_pricing',
    productId,
    customerId,
    location,
    factors: ['base', 'discounts', 'surge']
  }
});
/*DEBUG:END*/`,
          language: 'typescript',
          context: 'Complex calculation with multiple factors',
        },
      ],
      patterns: [
        'Wrap at the right granularity - not too fine, not too coarse',
        'Use action names that describe business intent, not technical implementation',
        'Include context that would help diagnose issues',
        'Focus on async operations and external dependencies first',
        'Test debug wrapping in development before deploying',
      ],
      troubleshooting: [
        'Debug data not appearing: Check if NODE_ENV=production is removing debug code',
        'Wrong template applied: Verify template selection logic',
        'Context data missing: Ensure context objects are serializable',
        'Performance impact: Review wrapping granularity and reduce if needed',
      ],
    },
    {
      name: 'dumpall',
      title: 'Extract All Debug Data',
      description: 'Comprehensive workflow for extracting and analyzing all debug data',
      workflow: [
        {
          order: 1,
          title: 'Export Debug Data',
          description: 'Extract all debug data in various formats for analysis',
          code: `// Export all debug data
npx ai-debug export --format=json --output=debug-export.json

// Export with filters
npx ai-debug export --format=csv --filter="status=failure" --output=failures.csv
npx ai-debug export --format=json --since="2024-01-01" --template=http`,
          notes: [
            'JSON format preserves full data structure',
            'CSV format is good for spreadsheet analysis',
            'Use filters to focus on specific subsets',
          ],
        },
        {
          order: 2,
          title: 'Generate Analysis Reports',
          description: 'Create comprehensive analysis of debug patterns and performance',
          code: `// Generate detailed analysis reports
npx ai-debug analyze --full-report --output=analysis-report.md
npx ai-debug coverage --detailed --output=coverage-report.html
npx ai-debug stats --comprehensive --format=json --output=stats.json`,
          notes: [
            'Full reports include patterns, anti-patterns, and suggestions',
            'Coverage reports show debug wrapping effectiveness',
            'Stats provide quantitative metrics',
          ],
        },
        {
          order: 3,
          title: 'Extract Performance Metrics',
          description: 'Analyze performance data and identify bottlenecks',
          code: `// Performance-focused extraction
npx ai-debug export --metrics-only --format=json --output=metrics.json

// Find slow operations
npx ai-debug list --sort-by=duration --limit=20 --format=table

// Analyze cache effectiveness
npx ai-debug stats --cache-analysis --output=cache-report.json`,
          notes: [
            'Metrics include duration, cache hits, error rates',
            'Sort by duration to find performance bottlenecks',
            'Cache analysis shows optimization opportunities',
          ],
        },
        {
          order: 4,
          title: 'Create Data Archive',
          description: 'Archive debug data with proper organization and compression',
          code: `// Create organized archive
mkdir -p debug-archive/\$(date +%Y-%m-%d)
npx ai-debug export --format=json --compress --output=debug-archive/\$(date +%Y-%m-%d)/full-export.json.gz

// Export by template for organized analysis
npx ai-debug export --template=http --output=debug-archive/\$(date +%Y-%m-%d)/http-operations.json
npx ai-debug export --template=database --output=debug-archive/\$(date +%Y-%m-%d)/database-operations.json`,
          notes: [
            'Organize archives by date for historical analysis',
            'Use compression for large datasets',
            'Separate by template for focused analysis',
          ],
        },
        {
          order: 5,
          title: 'Clean Up Debug Storage',
          description: 'Safely clean up debug storage after extraction',
          code: `// Backup current debug data
npx ai-debug export --format=json --output=backup-\$(date +%Y%m%d).json

// Clean up old debug entries (keep last 30 days)
npx ai-debug cleanup --older-than=30d --dry-run
npx ai-debug cleanup --older-than=30d --confirm

// Verify cleanup
npx ai-debug stats --storage-info`,
          notes: [
            'Always backup before cleanup',
            'Use dry-run to preview what will be deleted',
            'Monitor storage usage after cleanup',
          ],
        },
      ],
      diagram: `graph TD
    A[Export Data] --> B[Generate Reports]
    B --> C[Extract Metrics]
    C --> D[Create Archive]
    D --> E[Clean Storage]
    E --> F[Verify Results]`,
      examples: [
        {
          title: 'Complete Data Export',
          description: 'Export all debug data with comprehensive filtering',
          code: `#!/bin/bash
# Complete debug data extraction script

DATE=$(date +%Y-%m-%d)
EXPORT_DIR="debug-exports/$DATE"
mkdir -p "$EXPORT_DIR"

# Export all data
npx ai-debug export --format=json --output="$EXPORT_DIR/complete-export.json"

# Export by status
npx ai-debug export --filter="status=success" --output="$EXPORT_DIR/successful-operations.json"
npx ai-debug export --filter="status=failure" --output="$EXPORT_DIR/failed-operations.json"

# Export by template
for template in http database file queue business; do
  npx ai-debug export --template="$template" --output="$EXPORT_DIR/$template-operations.json"
done

# Generate reports
npx ai-debug analyze --output="$EXPORT_DIR/analysis-report.md"
npx ai-debug coverage --output="$EXPORT_DIR/coverage-report.html"

echo "Export complete: $EXPORT_DIR"`,
          language: 'bash',
          context: 'Automated export script for regular data extraction',
        },
        {
          title: 'Performance Analysis Export',
          description: 'Focus on performance metrics and slow operations',
          code: `// Export slow operations for analysis
const slowOps = await debug.export({
  filter: { minDuration: 1000 }, // Operations > 1 second
  format: 'json',
  includeContext: true,
  sortBy: 'duration',
  limit: 100
});

// Export cache statistics
const cacheStats = await debug.export({
  type: 'cache-stats',
  format: 'json',
  groupBy: 'template',
  includeHitRates: true
});

// Export error patterns
const errorPatterns = await debug.export({
  filter: { status: 'failure' },
  format: 'json',
  groupBy: ['template', 'errorType'],
  includeStackTraces: false // For privacy
});`,
          language: 'typescript',
          context: 'Programmatic export for automated analysis',
        },
      ],
      patterns: [
        'Export regularly to prevent data loss',
        'Use filters to focus analysis on specific issues',
        'Organize exports by date and purpose',
        'Compress large exports to save storage',
        'Always backup before cleaning up debug data',
      ],
      troubleshooting: [
        'Export fails: Check disk space and file permissions',
        'Large exports timeout: Use filters to reduce data size',
        'Missing data in exports: Verify date ranges and filters',
        'Corrupted exports: Check debug data integrity before export',
      ],
    },
  ];

  /**
   * Generates predefined Claude command files for AI-assisted development.
   *
   * Creates specific workflow command files that Claude can use to help with
   * common development tasks related to the debug system. Each command includes
   * step-by-step workflows, code examples, and troubleshooting guides.
   *
   * @param entries - JSDoc entries to enhance commands with project-specific examples
   * @param options - Configuration for command generation
   * @returns Promise that resolves to information about generated commands
   *
   * @throws {Error} If output directory cannot be created or files cannot be written
   *
   * @workflow-step 1 "Create output directory structure"
   * @workflow-step 2 "Generate predefined command files"
   * @workflow-step 3 "Enhance commands with project-specific examples"
   * @workflow-step 4 "Create master index file"
   *
   * @example
   * ```typescript
   * const generator = new ClaudeCommandGenerator();
   * const entries = await extractor.extractAll();
   *
   * const result = await generator.generateCommands(entries, {
   *   outputDir: './.claude/commands/ai-debug',
   *   projectName: '@dkmaker/ai-debug',
   *   version: '0.1.0',
   *   includeDiagrams: true,
   *   includeExamples: true
   * });
   *
   * console.log(`Generated ${result.commandCount} Claude commands`);
   * console.log(`Total workflow steps: ${result.totalSteps}`);
   * ```
   */
  async generateCommands(
    entries: JSDocEntry[],
    options: ClaudeCommandGenOptions,
  ): Promise<GeneratedClaudeCommands> {
    // Ensure output directory exists
    this.ensureDirectoryExists(options.outputDir);

    const generatedFiles: string[] = [];
    let totalSteps = 0;

    // Generate each predefined command
    for (const template of this.predefinedCommands) {
      const content = this.generateCommandFile(template, entries, options);
      const filePath = join(options.outputDir, `${template.name}.md`);

      writeFileSync(filePath, content);
      generatedFiles.push(filePath);
      totalSteps += template.workflow.length;
    }

    // Generate master index file
    const indexContent = this.generateIndexFile(options);
    const indexPath = join(options.outputDir, 'README.md');
    writeFileSync(indexPath, indexContent);
    generatedFiles.push(indexPath);

    return {
      files: generatedFiles,
      commandCount: this.predefinedCommands.length,
      totalSteps,
    };
  }

  /**
   * Generates content for a single Claude command file.
   *
   * @param template - Command template definition
   * @param entries - JSDoc entries for project-specific enhancements
   * @param options - Generation options
   * @returns Generated markdown content
   *
   * @audience internal
   */
  private generateCommandFile(
    template: ClaudeCommandTemplate,
    entries: JSDocEntry[],
    options: ClaudeCommandGenOptions,
  ): string {
    const sections: string[] = [
      `# ${template.title}`,
      '',
      template.description,
      '',
      '## Overview',
      '',
      `This command provides a step-by-step workflow for ${template.title.toLowerCase()}.`,
      'Each step includes detailed instructions, code examples, and best practices.',
      '',
    ];

    // Add Mermaid diagram if requested and available
    if (options.includeDiagrams && template.diagram) {
      sections.push('## Workflow Diagram');
      sections.push('');
      sections.push('```mermaid');
      sections.push(template.diagram);
      sections.push('```');
      sections.push('');
    }

    // Add workflow steps
    sections.push('## Implementation Steps');
    sections.push('');

    for (const step of template.workflow) {
      sections.push(`### Step ${step.order}: ${step.title}`);
      sections.push('');
      sections.push(step.description);
      sections.push('');

      if (step.code) {
        const language = this.detectCodeLanguage(step.code);
        sections.push(`\`\`\`${language}`);
        sections.push(step.code);
        sections.push('```');
        sections.push('');
      }

      if (step.notes && step.notes.length > 0) {
        sections.push('**Notes:**');
        sections.push('');
        for (const note of step.notes) {
          sections.push(`- ${note}`);
        }
        sections.push('');
      }
    }

    // Add examples if requested
    if (options.includeExamples && template.examples.length > 0) {
      sections.push('## Examples');
      sections.push('');

      for (const example of template.examples) {
        sections.push(`### ${example.title}`);
        sections.push('');
        sections.push(example.description);
        sections.push('');

        if (example.context) {
          sections.push(`**Context:** ${example.context}`);
          sections.push('');
        }

        sections.push(`\`\`\`${example.language}`);
        sections.push(example.code);
        sections.push('```');
        sections.push('');
      }
    }

    // Add project-specific examples from JSDoc entries
    const relevantEntries = this.findRelevantEntries(template.name, entries);
    if (relevantEntries.length > 0 && options.includeExamples) {
      sections.push('## Project-Specific Examples');
      sections.push('');

      for (const entry of relevantEntries.slice(0, 2)) {
        // Limit to 2 examples
        if (entry.examples.length > 0) {
          const example = entry.examples[0];
          sections.push(`### ${entry.name} - ${example.title || 'Usage Example'}`);
          sections.push('');
          sections.push(`From: \`${entry.file}:${entry.line}\``);
          sections.push('');
          sections.push(`\`\`\`${example.language}`);
          sections.push(example.code);
          sections.push('```');
          sections.push('');
        }
      }
    }

    // Add patterns
    if (template.patterns.length > 0) {
      sections.push('## Best Practices');
      sections.push('');
      for (const pattern of template.patterns) {
        sections.push(`- ${pattern}`);
      }
      sections.push('');
    }

    // Add troubleshooting
    if (template.troubleshooting.length > 0) {
      sections.push('## Troubleshooting');
      sections.push('');
      for (const tip of template.troubleshooting) {
        sections.push(`- ${tip}`);
      }
      sections.push('');
    }

    // Add footer
    sections.push('---');
    sections.push('');
    sections.push(
      `*Generated for ${options.projectName || 'this project'} v${options.version || 'latest'}*`,
    );

    return sections.join('\n');
  }

  /**
   * Generates index file for Claude commands.
   *
   * @param options - Generation options
   * @returns Generated markdown content
   *
   * @audience internal
   */
  private generateIndexFile(options: ClaudeCommandGenOptions): string {
    const sections: string[] = [
      '# Claude AI Debug Commands',
      '',
      `AI-assisted development workflows for ${options.projectName || 'this project'}.`,
      '',
      'This directory contains specialized Claude commands for working with the AI Debug system.',
      'Each command provides step-by-step workflows, code examples, and best practices.',
      '',
      '## Available Commands',
      '',
    ];

    for (const template of this.predefinedCommands) {
      sections.push(`### [${template.title}](./${template.name}.md)`);
      sections.push('');
      sections.push(template.description);
      sections.push('');
      sections.push(`**Workflow steps:** ${template.workflow.length}`);
      sections.push(`**Examples:** ${template.examples.length}`);
      sections.push('');
    }

    // Add usage instructions
    sections.push('## Usage');
    sections.push('');
    sections.push('To use these commands with Claude:');
    sections.push('');
    sections.push('1. Reference the specific command file when asking Claude for help');
    sections.push('2. Use the step-by-step workflows as implementation guides');
    sections.push('3. Adapt the examples to your specific use case');
    sections.push('4. Follow the best practices and troubleshooting tips');
    sections.push('');
    sections.push('Example prompt:');
    sections.push('```');
    sections.push(
      'Please help me implement caching using the workflow in .claude/commands/ai-debug/implement-cache.md',
    );
    sections.push('```');
    sections.push('');

    // Add footer
    sections.push('---');
    sections.push('');
    sections.push(
      `*Generated for ${options.projectName || 'this project'} v${options.version || 'latest'}*`,
    );

    return sections.join('\n');
  }

  /**
   * Finds JSDoc entries relevant to a specific command.
   *
   * @param commandName - Name of the command
   * @param entries - All JSDoc entries
   * @returns Relevant entries
   *
   * @audience internal
   */
  private findRelevantEntries(commandName: string, entries: JSDocEntry[]): JSDocEntry[] {
    const keywords = this.getCommandKeywords(commandName);

    return entries.filter((entry) => {
      // Check if entry has relevant Claude command
      if (entry.claude?.command === commandName) {
        return true;
      }

      // Check if entry description or name contains relevant keywords
      const text = `${entry.name} ${entry.description}`.toLowerCase();
      return keywords.some((keyword) => text.includes(keyword));
    });
  }

  /**
   * Gets relevant keywords for a command.
   *
   * @param commandName - Name of the command
   * @returns Array of relevant keywords
   *
   * @audience internal
   */
  private getCommandKeywords(commandName: string): string[] {
    const keywordMap: Record<string, string[]> = {
      'implement-cache': ['cache', 'caching', 'ttl', 'performance'],
      'add-debug': ['debug', 'wrap', 'tracking', 'monitoring'],
      dumpall: ['export', 'extract', 'analysis', 'data'],
      'optimize-templates': ['template', 'optimization', 'performance'],
      'setup-logging': ['log', 'logging', 'logger', 'output'],
    };

    return keywordMap[commandName] || [];
  }

  /**
   * Detects programming language from code content.
   *
   * @param code - Code content
   * @returns Detected language
   *
   * @audience internal
   */
  private detectCodeLanguage(code: string): string {
    if (code.includes('npx ') || code.includes('#!/bin/bash')) {
      return 'bash';
    }
    if (code.includes('{') && code.includes('}') && !code.includes('function')) {
      return 'json';
    }
    if (code.includes('const ') || code.includes('async ') || code.includes('await ')) {
      return 'typescript';
    }
    return 'bash';
  }

  /**
   * Ensures a directory exists, creating it if necessary.
   *
   * @param dirPath - Directory path
   *
   * @audience internal
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }
}
