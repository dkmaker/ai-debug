import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Config } from '../types/index.js';
import { ProjectAnalyzer } from './analyzer.js';
import { claudeTemplate } from './templates/claude.js';
import { cursorTemplate } from './templates/cursor.js';
import { githubTemplate } from './templates/github.js';

export interface DocGenOptions {
  format: 'claude' | 'github' | 'cursor';
  output: string;
  update?: boolean;
  config?: Config;
}

export interface ProjectAnalysis {
  debugCalls: DebugCall[];
  patterns: Pattern[];
  suggestions: Suggestion[];
  coverage: CoverageReport;
  templates: TemplateUsage[];
}

export interface DebugCall {
  file: string;
  line: number;
  action: string;
  template?: string;
  context?: Record<string, unknown>;
}

export interface Pattern {
  type: 'common' | 'antipattern';
  name: string;
  description: string;
  occurrences: number;
  files: string[];
  example?: string;
}

export interface Suggestion {
  file: string;
  line: number;
  function: string;
  reason: string;
  suggestedTemplate: string;
  priority: 'high' | 'medium' | 'low';
}

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

export interface FileCoverage {
  file: string;
  coverage: number;
  debugCalls: number;
  asyncCalls: number;
}

export interface TemplateCoverage {
  template: string;
  count: number;
  percentage: number;
}

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

export class AIDocGenerator {
  private analyzer: ProjectAnalyzer;

  constructor() {
    this.analyzer = new ProjectAnalyzer();
  }

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
