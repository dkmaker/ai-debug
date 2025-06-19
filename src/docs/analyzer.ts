import { readFileSync } from 'node:fs';
import * as parser from '@babel/parser';
// @ts-ignore - babel traverse has module issues
import traverse from '@babel/traverse';
import { glob } from 'glob';

// Note: We use 'any' for Babel AST nodes because:
// 1. @babel/types has complex type definitions that conflict with our simplified types
// 2. The AST structure is dynamic and varies based on the parsed code
// 3. We only access well-known properties that we validate at runtime
// This is a legitimate use case for 'any' as we're interfacing with an external library
import type {
  CoverageReport,
  DebugCall,
  FileCoverage,
  Pattern,
  Suggestion,
  TemplateCoverage,
  TemplateUsage,
} from './generator.js';

/**
 * Analyzes project code to find debug calls, patterns, and generate suggestions.
 *
 * This class provides comprehensive analysis of AI Debug usage in a project,
 * including finding debug calls, identifying patterns, and suggesting improvements.
 * It uses Babel to parse JavaScript/TypeScript files and extract debug-related
 * information for documentation and optimization.
 *
 * @example
 * ```typescript
 * const analyzer = new ProjectAnalyzer('/path/to/project');
 * const debugCalls = await analyzer.findDebugCalls();
 * const patterns = await analyzer.identifyPatterns(debugCalls);
 * const suggestions = await analyzer.generateSuggestions();
 * ```
 */
export class ProjectAnalyzer {
  private projectRoot: string;
  private sourcePatterns = [
    '**/*.{js,jsx,ts,tsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/.ai-debug/**',
  ];

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Finds all debug.wrap() and debug.raw() calls in the project.
   *
   * Scans all JavaScript/TypeScript files in the project (excluding node_modules,
   * dist, and .ai-debug directories) to find debug calls. Extracts information
   * about each call including the action name, template used, and location.
   *
   * @returns {Promise<DebugCall[]>} Array of debug calls found in the project
   *
   * @example
   * ```typescript
   * const analyzer = new ProjectAnalyzer();
   * const calls = await analyzer.findDebugCalls();
   * console.log(`Found ${calls.length} debug calls`);
   * calls.forEach(call => {
   *   console.log(`${call.file}:${call.line} - ${call.action}`);
   * });
   * ```
   */
  async findDebugCalls(): Promise<DebugCall[]> {
    const debugCalls: DebugCall[] = [];
    const files = await glob(this.sourcePatterns, { cwd: this.projectRoot });

    for (const file of files) {
      const fullPath = `${this.projectRoot}/${file}`;
      try {
        const content = readFileSync(fullPath, 'utf-8');
        const calls = this.extractDebugCalls(content, file);
        debugCalls.push(...calls);
      } catch {
        // Skip files that can't be parsed
      }
    }

    return debugCalls;
  }

  private extractDebugCalls(content: string, file: string): DebugCall[] {
    const calls: DebugCall[] = [];

    try {
      const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
        errorRecovery: true,
      });

      traverse(ast, {
        /**
         * Visits CallExpression nodes in the AST to find debug calls.
         *
         * Looks for patterns like debug.wrap() and debug.raw() and extracts
         * the action name and options (including template) from the arguments.
         *
         * @param path - Babel AST path containing the CallExpression node
         */
        // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
        CallExpression(path: any) {
          const { node } = path;

          // Look for debug.wrap() or debug.raw() calls
          if (
            node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'debug' &&
            node.callee.property.type === 'Identifier' &&
            ['wrap', 'raw'].includes(node.callee.property.name)
          ) {
            const action = node.arguments[0];
            const options = node.arguments[2];

            if (action && action.type === 'StringLiteral') {
              const debugCall: DebugCall = {
                file,
                line: node.loc?.start.line || 0,
                action: action.value,
              };

              // Extract template and context from options
              if (options && options.type === 'ObjectExpression') {
                // biome-ignore lint/suspicious/noExplicitAny: Babel AST types
                options.properties.forEach((prop: any) => {
                  if (prop.type === 'ObjectProperty' && prop.key.type === 'Identifier') {
                    if (prop.key.name === 'template' && prop.value.type === 'StringLiteral') {
                      debugCall.template = prop.value.value;
                    }
                  }
                });
              }

              calls.push(debugCall);
            }
          }
        },
      });
    } catch {
      // Skip files with parse errors
    }

    return calls;
  }

  async identifyPatterns(debugCalls: DebugCall[]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    const actionGroups = new Map<string, DebugCall[]>();

    // Group by action prefix
    debugCalls.forEach((call) => {
      const prefix = call.action.split('_')[0];
      if (!actionGroups.has(prefix)) {
        actionGroups.set(prefix, []);
      }
      const group = actionGroups.get(prefix);
      if (group) {
        group.push(call);
      }
    });

    // Identify common patterns
    actionGroups.forEach((calls, prefix) => {
      if (calls.length >= 3) {
        patterns.push({
          type: 'common',
          name: `${prefix}_* operations`,
          description: `Common pattern for ${prefix} operations`,
          occurrences: calls.length,
          files: [...new Set(calls.map((c) => c.file))],
          example: calls[0].action,
        });
      }
    });

    // Identify anti-patterns
    const noTemplateCount = debugCalls.filter((c) => !c.template).length;
    if (noTemplateCount > debugCalls.length * 0.3) {
      patterns.push({
        type: 'antipattern',
        name: 'Missing template specification',
        description: 'Many debug calls lack explicit template specification',
        occurrences: noTemplateCount,
        files: [...new Set(debugCalls.filter((c) => !c.template).map((c) => c.file))],
      });
    }

    return patterns;
  }

  async generateSuggestions(): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    const files = await glob(this.sourcePatterns, { cwd: this.projectRoot });

    for (const file of files) {
      const fullPath = `${this.projectRoot}/${file}`;
      try {
        const content = readFileSync(fullPath, 'utf-8');
        const fileSuggestions = this.analyzeFileForSuggestions(content, file);
        suggestions.push(...fileSuggestions);
      } catch {
        // Skip file
      }
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private analyzeFileForSuggestions(content: string, file: string): Suggestion[] {
    const suggestions: Suggestion[] = [];

    try {
      const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
        errorRecovery: true,
      });

      traverse(ast, {
        // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
        CallExpression: (path: any) => {
          const { node } = path;

          // Look for common async patterns without debug wrapping
          const isUnwrapped = this.isUnwrappedAsyncOperation(node, path);
          if (isUnwrapped) {
            const functionName = this.getFunctionName(node);
            const template = this.suggestTemplate(node);

            suggestions.push({
              file,
              line: node.loc?.start.line || 0,
              function: functionName,
              reason: 'Async operation without debug tracking',
              suggestedTemplate: template,
              priority: this.getPriority(node),
            });
          }
        },
      });
    } catch {
      // Skip files with parse errors
    }

    return suggestions;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
  private isUnwrappedAsyncOperation(node: any, path: any): boolean {
    // Check if it's an async operation
    const isAsync =
      // await expression
      path.parent?.type === 'AwaitExpression' ||
      // Common async patterns
      this.isAsyncPattern(node);

    if (!isAsync) return false;

    // Check if it's already wrapped in debug
    let parent = path.parent;
    while (parent) {
      if (
        parent.type === 'CallExpression' &&
        parent.callee?.type === 'MemberExpression' &&
        parent.callee.object?.name === 'debug'
      ) {
        return false;
      }
      // biome-ignore lint/suspicious/noExplicitAny: Babel AST traversal
      parent = (parent as any).parent;
    }

    return true;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
  private isAsyncPattern(node: any): boolean {
    if (node.callee?.type === 'MemberExpression') {
      const object = node.callee.object;
      const property = node.callee.property;

      // Common async patterns
      const asyncPatterns = [
        { object: 'axios', methods: ['get', 'post', 'put', 'delete', 'patch'] },
        { object: 'fetch', methods: [] },
        { object: 'db', methods: ['query', 'execute', 'find', 'findOne', 'save'] },
        { object: 'fs', methods: ['readFile', 'writeFile', 'readdir'] },
        { object: 'redis', methods: ['get', 'set', 'del', 'hget', 'hset'] },
      ];

      return asyncPatterns.some((pattern) => {
        if (object?.name === pattern.object) {
          return (
            pattern.methods.length === 0 ||
            (property?.name && pattern.methods.includes(property.name))
          );
        }
        return false;
      });
    }

    return false;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
  private getFunctionName(node: any): string {
    if (node.callee?.type === 'MemberExpression') {
      const object = node.callee.object?.name || 'unknown';
      const method = node.callee.property?.name || 'unknown';
      return `${object}.${method}`;
    }
    if (node.callee?.type === 'Identifier') {
      return node.callee.name;
    }
    return 'unknown';
  }

  // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
  private suggestTemplate(node: any): string {
    const functionName = this.getFunctionName(node).toLowerCase();

    if (
      functionName.includes('http') ||
      functionName.includes('axios') ||
      functionName.includes('fetch')
    ) {
      return 'http';
    }
    if (
      functionName.includes('db') ||
      functionName.includes('query') ||
      functionName.includes('sql')
    ) {
      return 'database';
    }
    if (functionName.includes('file') || functionName.includes('fs')) {
      return 'file';
    }
    if (
      functionName.includes('queue') ||
      functionName.includes('amqp') ||
      functionName.includes('redis')
    ) {
      return 'queue';
    }

    return 'base';
  }

  // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
  private getPriority(node: any): 'high' | 'medium' | 'low' {
    const functionName = this.getFunctionName(node).toLowerCase();

    // High priority for external API calls and database operations
    if (
      functionName.includes('http') ||
      functionName.includes('api') ||
      functionName.includes('db') ||
      functionName.includes('query')
    ) {
      return 'high';
    }

    // Medium priority for file operations and queues
    if (
      functionName.includes('file') ||
      functionName.includes('queue') ||
      functionName.includes('cache')
    ) {
      return 'medium';
    }

    return 'low';
  }

  async calculateCoverage(debugCalls: DebugCall[]): Promise<CoverageReport> {
    const files = await glob(this.sourcePatterns, { cwd: this.projectRoot });
    const fileCoverage: FileCoverage[] = [];
    let totalAsync = 0;
    const totalWrapped = debugCalls.length;
    const unwrappedOperations: string[] = [];

    for (const file of files) {
      const fullPath = `${this.projectRoot}/${file}`;
      try {
        const content = readFileSync(fullPath, 'utf-8');
        const stats = this.analyzeFileCoverage(content, file, debugCalls);
        fileCoverage.push(stats);
        totalAsync += stats.asyncCalls;

        // Track unwrapped operations
        const suggestions = this.analyzeFileForSuggestions(content, file);
        unwrappedOperations.push(...suggestions.map((s) => `${s.file}:${s.line} - ${s.function}`));
      } catch {
        // Skip file
      }
    }

    const overall = totalAsync > 0 ? (totalWrapped / totalAsync) * 100 : 0;

    // Calculate template distribution
    const templateCounts = new Map<string, number>();
    debugCalls.forEach((call) => {
      const template = call.template || 'base';
      templateCounts.set(template, (templateCounts.get(template) || 0) + 1);
    });

    const byTemplate: TemplateCoverage[] = Array.from(templateCounts.entries()).map(
      ([template, count]) => ({
        template,
        count,
        percentage: (count / totalWrapped) * 100,
      }),
    );

    return {
      overall,
      byFile: fileCoverage,
      byTemplate,
      asyncOperations: {
        total: totalAsync,
        wrapped: totalWrapped,
        unwrapped: unwrappedOperations.slice(0, 10), // Limit to top 10
      },
    };
  }

  private analyzeFileCoverage(
    content: string,
    file: string,
    debugCalls: DebugCall[],
  ): FileCoverage {
    const fileDebugCalls = debugCalls.filter((c) => c.file === file);
    let asyncCalls = 0;

    try {
      const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
        errorRecovery: true,
      });

      traverse(ast, {
        AwaitExpression() {
          asyncCalls++;
        },
        // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
        CallExpression: (path: any) => {
          if (this.isAsyncPattern(path.node)) {
            asyncCalls++;
          }
        },
      });
    } catch {
      // Skip files with parse errors
    }

    const coverage = asyncCalls > 0 ? (fileDebugCalls.length / asyncCalls) * 100 : 100;

    return {
      file,
      coverage,
      debugCalls: fileDebugCalls.length,
      asyncCalls,
    };
  }

  async detectTemplates(debugCalls: DebugCall[]): Promise<TemplateUsage[]> {
    const templateUsage = new Map<string, { count: number; examples: Set<string> }>();

    // Count template usage
    debugCalls.forEach((call) => {
      const template = call.template || 'base';
      if (!templateUsage.has(template)) {
        templateUsage.set(template, { count: 0, examples: new Set() });
      }
      const usage = templateUsage.get(template);
      if (!usage) return;
      usage.count++;
      if (usage.examples.size < 3) {
        usage.examples.add(`${call.file}:${call.line} - ${call.action}`);
      }
    });

    // Check for custom templates
    const customTemplates = await this.findCustomTemplates();

    // Combine results
    const templates: TemplateUsage[] = [];

    // Built-in templates
    const builtinTemplates = ['base', 'http', 'database', 'file', 'queue', 'business', 'auto'];
    builtinTemplates.forEach((name) => {
      const usage = templateUsage.get(name);
      templates.push({
        name,
        type: 'builtin',
        usage: usage?.count || 0,
        examples: usage ? Array.from(usage.examples) : [],
      });
    });

    // Custom templates
    customTemplates.forEach((name) => {
      const usage = templateUsage.get(name);
      templates.push({
        name,
        type: 'custom',
        usage: usage?.count || 0,
        examples: usage ? Array.from(usage.examples) : [],
      });
    });

    return templates.sort((a, b) => b.usage - a.usage);
  }

  private async findCustomTemplates(): Promise<string[]> {
    try {
      const templateFiles = await glob('.ai-debug/templates/*.{js,ts}', { cwd: this.projectRoot });
      const templates: string[] = [];

      for (const file of templateFiles) {
        const fullPath = `${this.projectRoot}/${file}`;
        try {
          const content = readFileSync(fullPath, 'utf-8');
          // Simple regex to find exported template names
          const matches = content.matchAll(/export\s+const\s+(\w+)Templates?\s*=/g);
          for (const match of matches) {
            templates.push(match[1]);
          }
        } catch {
          // Skip module
        }
      }

      return templates;
    } catch {
      return [];
    }
  }
}
