import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Config } from '../types/index.js';
import { ProjectAnalyzer } from './analyzer.js';
import { claudeTemplate } from './templates/claude.js';
import { cursorTemplate } from './templates/cursor.js';
import { githubTemplate } from './templates/github.js';

/**
 * Options for AI documentation generation.
 *
 * Configures how the documentation should be generated, including
 * the target AI assistant format and output location.
 */
export interface DocGenOptions {
  format: 'claude' | 'github' | 'cursor';
  output: string;
  update?: boolean;
  config?: Config;
}

/**
 * Complete analysis results for a project's debug usage.
 *
 * Contains all analyzed data including debug calls, patterns,
 * suggestions, coverage reports, and template usage statistics.
 */
export interface ProjectAnalysis {
  debugCalls: DebugCall[];
  patterns: Pattern[];
  suggestions: Suggestion[];
  coverage: CoverageReport;
  templates: TemplateUsage[];
}

/**
 * Represents a single debug.wrap() or debug.raw() call in the code.
 *
 * Contains location information and metadata about the debug call,
 * including the action name and template used.
 */
export interface DebugCall {
  file: string;
  line: number;
  action: string;
  template?: string;
  context?: Record<string, unknown>;
}

/**
 * Represents a usage pattern identified in the project.
 *
 * Can be either a common pattern (good practice) or an antipattern
 * (practice that should be improved). Includes occurrence statistics
 * and affected files.
 */
export interface Pattern {
  type: 'common' | 'antipattern';
  name: string;
  description: string;
  occurrences: number;
  files: string[];
  example?: string;
}

/**
 * Improvement suggestion for better debug coverage.
 *
 * Identifies locations where debug wrapping could be beneficial,
 * particularly for async operations that aren't currently tracked.
 * Includes priority level to help focus on the most important improvements.
 */
export interface Suggestion {
  file: string;
  line: number;
  function: string;
  reason: string;
  suggestedTemplate: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Comprehensive coverage report for debug usage.
 *
 * Shows overall coverage percentage and breakdowns by file and template.
 * Includes statistics about wrapped vs unwrapped async operations.
 */
export interface CoverageReport {
  overall: number;
  byFile: FileCoverage[];
  byTemplate: TemplateCoverage[];
  asyncOperations: {
    total: number;
    wrapped: number;
    unwrapped: string[];
  };
}

/**
 * Coverage statistics for a single file.
 *
 * Shows the ratio of debug calls to async operations in the file,
 * helping identify files that need better debug coverage.
 */
export interface FileCoverage {
  file: string;
  coverage: number;
  debugCalls: number;
  asyncCalls: number;
}

/**
 * Usage statistics for a specific debug template.
 *
 * Shows how often each template is used across the project,
 * helping identify which templates are most valuable.
 */
export interface TemplateCoverage {
  template: string;
  count: number;
  percentage: number;
}

/**
 * Detailed usage information for a debug template.
 *
 * Includes whether the template is built-in or custom, usage count,
 * and examples of where it's used in the codebase.
 */
export interface TemplateUsage {
  name: string;
  type: 'builtin' | 'custom';
  usage: number;
  examples: string[];
}

const TEMPLATE_MAP = {
  claude: claudeTemplate,
  github: githubTemplate,
  cursor: cursorTemplate,
};

/**
 * Generates AI-optimized documentation for different AI assistants.
 *
 * This class analyzes a project's debug usage and generates documentation
 * tailored for specific AI assistants like Claude, GitHub Copilot, or Cursor.
 * It performs comprehensive analysis including finding debug calls, identifying
 * patterns, and generating improvement suggestions.
 *
 * @example
 * ```typescript
 * const generator = new AIDocGenerator();
 * await generator.generate({
 *   format: 'claude',
 *   output: '.ai-debug/claude.md',
 *   update: false
 * });
 * ```
 */
export class AIDocGenerator {
  private analyzer: ProjectAnalyzer;

  constructor() {
    this.analyzer = new ProjectAnalyzer();
  }

  /**
   * Generates AI documentation based on project analysis.
   *
   * Performs a comprehensive analysis of the project's debug usage and generates
   * documentation in the specified format. The documentation includes debug patterns,
   * coverage reports, and suggestions for improvements. Can either create a new
   * file or update an existing one.
   *
   * @param {DocGenOptions} options - Configuration for documentation generation
   * @param {string} options.format - Target AI assistant format ('claude', 'github', or 'cursor')
   * @param {string} options.output - Output file path for the generated documentation
   * @param {boolean} [options.update] - Whether to update existing documentation
   * @param {Config} [options.config] - AI Debug configuration object
   *
   * @throws {Error} If the specified format is not supported
   *
   * @example
   * ```typescript
   * // Generate Claude documentation
   * await generator.generate({
   *   format: 'claude',
   *   output: '.ai-debug/CLAUDE.md'
   * });
   *
   * // Update existing documentation
   * await generator.generate({
   *   format: 'github',
   *   output: '.github/copilot-docs.md',
   *   update: true
   * });
   * ```
   */
  async generate(options: DocGenOptions): Promise<void> {
    console.log(`📚 Generating ${options.format.toUpperCase()} documentation...`);

    // Analyze project
    const analysis = await this.analyzeProject();

    // Generate documentation
    const template = TEMPLATE_MAP[options.format];
    const content = await template.generate(analysis, options);

    // Ensure output directory exists
    const outputDir = dirname(options.output);
    if (!existsSync(outputDir)) {
      throw new Error(`Output directory does not exist: ${outputDir}`);
    }

    // Write documentation
    if (options.update && existsSync(options.output)) {
      // Update existing documentation
      const existingContent = readFileSync(options.output, 'utf-8');
      const updatedContent = this.mergeDocumentation(existingContent, content);
      writeFileSync(options.output, updatedContent);
      console.log(`✅ Updated ${options.output}`);
    } else {
      writeFileSync(options.output, content);
      console.log(`✅ Created ${options.output}`);
    }

    // Show summary
    this.showSummary(analysis);
  }

  private async analyzeProject(): Promise<ProjectAnalysis> {
    const debugCalls = await this.analyzer.findDebugCalls();
    const patterns = await this.analyzer.identifyPatterns(debugCalls);
    const suggestions = await this.analyzer.generateSuggestions();
    const coverage = await this.analyzer.calculateCoverage(debugCalls);
    const templates = await this.analyzer.detectTemplates(debugCalls);

    return {
      debugCalls,
      patterns,
      suggestions,
      coverage,
      templates,
    };
  }

  private mergeDocumentation(existing: string, generated: string): string {
    // Simple merge strategy - replace the auto-generated sections
    const startMarker = '<!-- AI-DEBUG-START -->';
    const endMarker = '<!-- AI-DEBUG-END -->';

    const startIndex = existing.indexOf(startMarker);
    const endIndex = existing.indexOf(endMarker);

    if (startIndex !== -1 && endIndex !== -1) {
      return `${existing.substring(0, startIndex + startMarker.length)}\n${generated}\n${existing.substring(endIndex)}`;
    }

    // If markers not found, append to the end
    return `${existing}\n\n${generated}`;
  }

  private showSummary(analysis: ProjectAnalysis): void {
    console.log('\n📊 Analysis Summary:');
    console.log(`- Debug calls found: ${analysis.debugCalls.length}`);
    console.log(`- Coverage: ${analysis.coverage.overall.toFixed(1)}%`);
    console.log(`- Patterns detected: ${analysis.patterns.length}`);
    console.log(`- Optimization suggestions: ${analysis.suggestions.length}`);
    console.log(`- Templates in use: ${analysis.templates.length}`);
  }
}
