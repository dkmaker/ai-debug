import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { JSDocEntry, JSDocExample, JSDocParameter, JSDocWorkflow } from './jsdoc-extractor.js';

/**
 * Configuration for multi-audience documentation generation.
 *
 * Defines what types of documentation to generate and where to output them.
 */
export interface MultiAudienceGenOptions {
  /** Type of documentation to generate */
  type: 'all' | 'internal' | 'external' | 'claude' | 'diagrams';
  /** Base output directory */
  outputDir: string;
  /** Whether to include code examples in output */
  includeExamples: boolean;
  /** Whether to include workflow information */
  includeWorkflows: boolean;
  /** Whether to include deprecated items */
  includeDeprecated: boolean;
  /** Project name for documentation headers */
  projectName?: string;
  /** Project version */
  version?: string;
}

/**
 * Generated documentation files and their metadata.
 */
export interface GeneratedDocs {
  /** Files that were generated */
  files: GeneratedFile[];
  /** Statistics about the generation */
  stats: GenerationStats;
}

/**
 * Information about a generated documentation file.
 */
export interface GeneratedFile {
  /** File path that was created */
  path: string;
  /** Type of documentation */
  type: 'internal' | 'external' | 'claude-command' | 'diagram';
  /** Number of entries included */
  entries: number;
  /** File size in bytes */
  size: number;
}

/**
 * Statistics about the documentation generation process.
 */
export interface GenerationStats {
  /** Total number of JSDoc entries processed */
  totalEntries: number;
  /** Entries by audience */
  byAudience: Record<string, number>;
  /** Entries by type */
  byType: Record<string, number>;
  /** Number of examples included */
  examples: number;
  /** Number of workflows included */
  workflows: number;
  /** Generation time in milliseconds */
  generationTime: number;
}

/**
 * Multi-audience documentation generator that creates different documentation
 * formats for different audiences from JSDoc entries.
 *
 * This generator produces:
 * - Internal documentation for package developers
 * - External documentation for package users
 * - Claude command files for AI-assisted development
 * - Mermaid diagrams for visual documentation
 *
 * @audience both
 * @workflow "generate-multi-audience-docs"
 * @claude-command "generate-docs"
 *
 * @example
 * ```typescript
 * const generator = new MultiAudienceGenerator();
 * const entries = await extractor.extractAll();
 *
 * // Generate all documentation types
 * const result = await generator.generate(entries, {
 *   type: 'all',
 *   outputDir: './docs',
 *   includeExamples: true,
 *   includeWorkflows: true,
 *   includeDeprecated: false,
 *   projectName: '@dkmaker/ai-debug',
 *   version: '0.1.0'
 * });
 *
 * console.log(`Generated ${result.files.length} documentation files`);
 * ```
 */
export class MultiAudienceGenerator {
  /**
   * Generates multi-audience documentation from JSDoc entries.
   *
   * Creates different documentation formats targeting specific audiences:
   * - Internal: Complete API reference for package developers
   * - External: User-focused guides for package consumers
   * - Claude: AI-optimized command files for development workflows
   * - Diagrams: Mermaid diagrams for visual documentation
   *
   * @param entries - JSDoc entries to generate documentation from
   * @param options - Configuration for documentation generation
   * @returns Promise that resolves to information about generated files
   *
   * @throws {Error} If output directory cannot be created or files cannot be written
   *
   * @workflow-step 1 "Filter entries by audience and type"
   * @workflow-step 2 "Generate internal developer documentation"
   * @workflow-step 3 "Generate external user documentation"
   * @workflow-step 4 "Create Claude command files"
   * @workflow-step 5 "Generate Mermaid diagrams"
   *
   * @example
   * ```typescript
   * // Generate only external documentation
   * const result = await generator.generate(entries, {
   *   type: 'external',
   *   outputDir: './docs/external',
   *   includeExamples: true,
   *   includeWorkflows: false,
   *   includeDeprecated: false
   * });
   *
   * // Generate Claude command files
   * const claudeResult = await generator.generate(entries, {
   *   type: 'claude',
   *   outputDir: './.claude/commands/ai-debug',
   *   includeExamples: true,
   *   includeWorkflows: true,
   *   includeDeprecated: false
   * });
   * ```
   */
  async generate(entries: JSDocEntry[], options: MultiAudienceGenOptions): Promise<GeneratedDocs> {
    const startTime = Date.now();
    const generatedFiles: GeneratedFile[] = [];

    // Ensure output directories exist
    this.ensureDirectoryExists(options.outputDir);

    // Filter entries based on options
    const filteredEntries = this.filterEntries(entries, options);

    // Generate documentation based on type
    switch (options.type) {
      case 'all':
        generatedFiles.push(...(await this.generateInternal(filteredEntries, options)));
        generatedFiles.push(...(await this.generateExternal(filteredEntries, options)));
        generatedFiles.push(...(await this.generateClaudeCommands(filteredEntries, options)));
        generatedFiles.push(...(await this.generateDiagrams(filteredEntries, options)));
        break;
      case 'internal':
        generatedFiles.push(...(await this.generateInternal(filteredEntries, options)));
        break;
      case 'external':
        generatedFiles.push(...(await this.generateExternal(filteredEntries, options)));
        break;
      case 'claude':
        generatedFiles.push(...(await this.generateClaudeCommands(filteredEntries, options)));
        break;
      case 'diagrams':
        generatedFiles.push(...(await this.generateDiagrams(filteredEntries, options)));
        break;
    }

    const stats = this.calculateStats(entries, filteredEntries, Date.now() - startTime);

    return {
      files: generatedFiles,
      stats,
    };
  }

  /**
   * Filters JSDoc entries based on generation options.
   *
   * @param entries - All JSDoc entries
   * @param options - Generation options
   * @returns Filtered entries
   *
   * @audience internal
   */
  private filterEntries(entries: JSDocEntry[], options: MultiAudienceGenOptions): JSDocEntry[] {
    return entries.filter((entry) => {
      // Filter by deprecated status
      if (!options.includeDeprecated && entry.deprecated) {
        return false;
      }

      // Include entries based on audience
      return true; // We'll filter by audience in individual generators
    });
  }

  /**
   * Generates internal documentation for package developers.
   *
   * Creates comprehensive API reference with implementation details,
   * including private methods and internal architecture information.
   *
   * @param entries - Filtered JSDoc entries
   * @param options - Generation options
   * @returns Array of generated file information
   *
   * @audience internal
   */
  private async generateInternal(
    entries: JSDocEntry[],
    options: MultiAudienceGenOptions,
  ): Promise<GeneratedFile[]> {
    const internalEntries = entries.filter(
      (e) => e.audience === 'internal' || e.audience === 'both',
    );
    const files: GeneratedFile[] = [];

    // Create internal documentation directory
    const internalDir =
      options.type === 'all' ? join(options.outputDir, 'internal') : options.outputDir;
    this.ensureDirectoryExists(internalDir);

    // Generate API Reference
    const apiContent = this.generateAPIReference(internalEntries, options, 'internal');
    const apiPath = join(internalDir, 'API_REFERENCE.md');
    writeFileSync(apiPath, apiContent);
    files.push({
      path: apiPath,
      type: 'internal',
      entries: internalEntries.length,
      size: Buffer.byteLength(apiContent, 'utf8'),
    });

    // Generate Architecture Documentation
    const archContent = this.generateArchitectureDoc(internalEntries, options);
    const archPath = join(internalDir, 'ARCHITECTURE.md');
    writeFileSync(archPath, archContent);
    files.push({
      path: archPath,
      type: 'internal',
      entries: internalEntries.filter((e) => e.type === 'class' || e.type === 'interface').length,
      size: Buffer.byteLength(archContent, 'utf8'),
    });

    // Generate Development Guide
    const devContent = this.generateDevelopmentGuide(internalEntries, options);
    const devPath = join(internalDir, 'DEVELOPMENT.md');
    writeFileSync(devPath, devContent);
    files.push({
      path: devPath,
      type: 'internal',
      entries: internalEntries.filter((e) => e.workflow).length,
      size: Buffer.byteLength(devContent, 'utf8'),
    });

    return files;
  }

  /**
   * Generates external documentation for package users.
   *
   * Creates user-focused documentation with practical examples,
   * setup guides, and usage patterns. Excludes internal implementation details.
   *
   * @param entries - Filtered JSDoc entries
   * @param options - Generation options
   * @returns Array of generated file information
   *
   * @audience internal
   */
  private async generateExternal(
    entries: JSDocEntry[],
    options: MultiAudienceGenOptions,
  ): Promise<GeneratedFile[]> {
    const externalEntries = entries.filter(
      (e) => e.exported && (e.audience === 'external' || e.audience === 'both'),
    );
    const files: GeneratedFile[] = [];

    // Create external documentation directory
    const externalDir =
      options.type === 'all' ? join(options.outputDir, 'external') : options.outputDir;
    this.ensureDirectoryExists(externalDir);

    // Generate CLAUDE.md section
    const claudeContent = this.generateClaudeSection(externalEntries, options);
    const claudePath = join(externalDir, 'CLAUDE_SECTION.md');
    writeFileSync(claudePath, claudeContent);
    files.push({
      path: claudePath,
      type: 'external',
      entries: externalEntries.length,
      size: Buffer.byteLength(claudeContent, 'utf8'),
    });

    // Generate Usage Guide
    const usageContent = this.generateUsageGuide(externalEntries, options);
    const usagePath = join(externalDir, 'USAGE_GUIDE.md');
    writeFileSync(usagePath, usageContent);
    files.push({
      path: usagePath,
      type: 'external',
      entries: externalEntries.filter((e) => e.examples.length > 0).length,
      size: Buffer.byteLength(usageContent, 'utf8'),
    });

    // Generate Configuration Guide
    const configContent = this.generateConfigurationGuide(externalEntries, options);
    const configPath = join(externalDir, 'CONFIGURATION.md');
    writeFileSync(configPath, configContent);
    files.push({
      path: configPath,
      type: 'external',
      entries: externalEntries.filter((e) => e.name.toLowerCase().includes('config')).length,
      size: Buffer.byteLength(configContent, 'utf8'),
    });

    return files;
  }

  /**
   * Generates Claude command files for AI-assisted development.
   *
   * Creates specific command files that Claude can use to help with
   * implementation tasks, including step-by-step workflows and examples.
   *
   * @param entries - Filtered JSDoc entries
   * @param options - Generation options
   * @returns Array of generated file information
   *
   * @audience internal
   */
  private async generateClaudeCommands(
    entries: JSDocEntry[],
    options: MultiAudienceGenOptions,
  ): Promise<GeneratedFile[]> {
    const claudeEntries = entries.filter((e) => e.claude?.command || e.workflow);
    const files: GeneratedFile[] = [];

    // Create Claude commands directory
    const claudeDir = join(options.outputDir, 'claude-commands');
    this.ensureDirectoryExists(claudeDir);

    // Group entries by Claude command
    const commandGroups = new Map<string, JSDocEntry[]>();

    for (const entry of claudeEntries) {
      const command = entry.claude?.command || entry.workflow?.id || 'general';
      if (!commandGroups.has(command)) {
        commandGroups.set(command, []);
      }
      commandGroups.get(command)?.push(entry);
    }

    // Generate command files
    for (const [command, commandEntries] of commandGroups) {
      const content = this.generateClaudeCommand(command, commandEntries, options);
      const path = join(claudeDir, `${command}.md`);
      writeFileSync(path, content);
      files.push({
        path,
        type: 'claude-command',
        entries: commandEntries.length,
        size: Buffer.byteLength(content, 'utf8'),
      });
    }

    return files;
  }

  /**
   * Generates Mermaid diagrams for visual documentation.
   *
   * Creates workflow diagrams, architecture diagrams, and process flows
   * based on the documented workflows and class relationships.
   *
   * @param entries - Filtered JSDoc entries
   * @param options - Generation options
   * @returns Array of generated file information
   *
   * @audience internal
   */
  private async generateDiagrams(
    entries: JSDocEntry[],
    options: MultiAudienceGenOptions,
  ): Promise<GeneratedFile[]> {
    const diagramEntries = entries.filter((e) => e.workflow?.diagram || e.type === 'class');
    const files: GeneratedFile[] = [];

    // Create diagrams directory
    const diagramsDir = join(options.outputDir, 'diagrams');
    this.ensureDirectoryExists(diagramsDir);

    // Generate workflow diagrams
    const workflows = diagramEntries
      .filter((e) => e.workflow?.steps.length)
      .map((e) => e.workflow)
      .filter((w): w is NonNullable<typeof w> => w !== undefined);
    for (const workflow of workflows) {
      const content = this.generateWorkflowDiagram(workflow);
      const path = join(diagramsDir, `${workflow.id}.mmd`);
      writeFileSync(path, content);
      files.push({
        path,
        type: 'diagram',
        entries: 1,
        size: Buffer.byteLength(content, 'utf8'),
      });
    }

    // Generate class hierarchy diagram
    const classes = diagramEntries.filter((e) => e.type === 'class');
    if (classes.length > 0) {
      const content = this.generateClassDiagram(classes);
      const path = join(diagramsDir, 'class-hierarchy.mmd');
      writeFileSync(path, content);
      files.push({
        path,
        type: 'diagram',
        entries: classes.length,
        size: Buffer.byteLength(content, 'utf8'),
      });
    }

    return files;
  }

  /**
   * Generates API reference documentation.
   *
   * @audience internal
   */
  private generateAPIReference(
    entries: JSDocEntry[],
    options: MultiAudienceGenOptions,
    audience: 'internal' | 'external',
  ): string {
    const title = audience === 'internal' ? 'Internal API Reference' : 'API Reference';
    const sections: string[] = [
      `# ${title}`,
      '',
      `Generated from JSDoc comments in ${options.projectName || 'this project'}.`,
      '',
    ];

    if (audience === 'internal') {
      sections.push('## Overview');
      sections.push('');
      sections.push(
        'This reference includes all internal APIs, private methods, and implementation details.',
      );
      sections.push('For external/public API documentation, see the external documentation.');
      sections.push('');
      sections.push('### Coverage Statistics');
      sections.push('');
      sections.push(`- **Total documented elements**: ${entries.length}`);
      sections.push(`- **Classes**: ${entries.filter((e) => e.type === 'class').length}`);
      sections.push(`- **Interfaces**: ${entries.filter((e) => e.type === 'interface').length}`);
      sections.push(`- **Functions**: ${entries.filter((e) => e.type === 'function').length}`);
      sections.push(`- **Methods**: ${entries.filter((e) => e.type === 'method').length}`);
      sections.push(`- **Constants**: ${entries.filter((e) => e.type === 'const').length}`);
      sections.push(`- **Types**: ${entries.filter((e) => e.type === 'type').length}`);
      sections.push('');
      sections.push('### Documentation Quality');
      sections.push('');
      const withExamples = entries.filter((e) => e.examples.length > 0).length;
      const withWorkflows = entries.filter((e) => e.workflow).length;
      sections.push(
        `- **Elements with examples**: ${withExamples} (${Math.round((withExamples / entries.length) * 100)}%)`,
      );
      sections.push(`- **Elements with workflows**: ${withWorkflows}`);
      sections.push('');
    }

    // Group entries by type
    const byType = this.groupByType(entries);

    for (const [type, typeEntries] of Object.entries(byType)) {
      if (typeEntries.length === 0) continue;

      sections.push(`## ${this.capitalizeFirst(type)}s`);
      sections.push('');

      // For internal docs, add more context about each section
      if (audience === 'internal') {
        let description = '';
        switch (type) {
          case 'class':
            description =
              'Main implementation classes. These form the core architecture of the system.';
            break;
          case 'interface':
            description =
              'Type definitions and contracts. These define the shape of data structures and public APIs.';
            break;
          case 'function':
            description = 'Standalone utility functions and helpers.';
            break;
          case 'method':
            description = 'Class methods organized by their parent class.';
            break;
          case 'const':
            description = 'Configuration constants and static values.';
            break;
          case 'type':
            description = 'Type aliases and utility types.';
            break;
        }
        if (description) {
          sections.push(description);
          sections.push('');
        }
      }

      for (const entry of typeEntries) {
        sections.push(this.formatAPIEntry(entry, options, audience));
        sections.push('');
      }
    }

    return sections.join('\n');
  }

  /**
   * Generates architecture documentation.
   *
   * @audience internal
   */
  private generateArchitectureDoc(entries: JSDocEntry[], options: MultiAudienceGenOptions): string {
    const sections: string[] = [
      '# Architecture Documentation',
      '',
      `Architecture overview for ${options.projectName || 'this project'}.`,
      '',
      '## System Overview',
      '',
      'The AI Debug system is built around a template-based architecture that provides',
      'intelligent debugging, caching, and logging capabilities. The core design principles are:',
      '',
      '- **Template-driven**: All debugging operations use templates for consistency',
      '- **Minimal footprint**: Most functionality lives in node_modules, not user repos',
      '- **Production-safe**: Debug code can be automatically removed for production',
      '- **AI-optimized**: Structured data formatted for AI assistant consumption',
      '',
    ];

    // Add class hierarchy
    const classes = entries.filter((e) => e.type === 'class');
    if (classes.length > 0) {
      sections.push('## Class Hierarchy');
      sections.push('');
      sections.push('```mermaid');
      sections.push(this.generateClassDiagramContent(classes));
      sections.push('```');
      sections.push('');
    }

    // Add core components
    sections.push('## Core Components');
    sections.push('');

    const coreComponents = entries.filter(
      (e) =>
        e.type === 'class' &&
        e.exported &&
        (e.name.includes('Debug') || e.name.includes('Cache') || e.name.includes('Logger')),
    );

    for (const component of coreComponents) {
      sections.push(`### ${component.name}`);
      sections.push('');
      sections.push(component.description);
      sections.push('');

      // Add methods for classes
      const methods = entries.filter(
        (e) => e.type === 'method' && e.name.startsWith(`${component.name}.`),
      );

      if (methods.length > 0) {
        sections.push('**Key Methods:**');
        sections.push('');
        for (const method of methods) {
          const methodName = method.name.split('.')[1];
          sections.push(`- \`${methodName}()\`: ${method.description.split('\n')[0]}`);
        }
        sections.push('');
      }

      if (component.workflow) {
        sections.push('**Workflow:**');
        for (const step of component.workflow.steps) {
          sections.push(`${step.order}. ${step.description}`);
        }
        sections.push('');
      }
    }

    // Add interfaces and types
    const interfaces = entries.filter((e) => e.type === 'interface' && e.exported);
    if (interfaces.length > 0) {
      sections.push('## Data Structures');
      sections.push('');

      // Group interfaces by category
      const categories = new Map<string, JSDocEntry[]>();

      for (const iface of interfaces) {
        let category = 'General';
        if (iface.name.toLowerCase().includes('config')) {
          category = 'Configuration';
        } else if (iface.name.toLowerCase().includes('debug')) {
          category = 'Debug System';
        } else if (iface.name.toLowerCase().includes('cache')) {
          category = 'Caching';
        } else if (iface.name.toLowerCase().includes('log')) {
          category = 'Logging';
        } else if (iface.name.toLowerCase().includes('template')) {
          category = 'Templates';
        } else if (iface.name.toLowerCase().includes('error')) {
          category = 'Error Handling';
        }

        if (!categories.has(category)) {
          categories.set(category, []);
        }
        categories.get(category)?.push(iface);
      }

      for (const [category, categoryInterfaces] of categories) {
        sections.push(`### ${category}`);
        sections.push('');

        for (const iface of categoryInterfaces) {
          sections.push(`#### ${iface.name}`);
          sections.push('');
          sections.push(iface.description.split('\n')[0]);
          sections.push('');

          if (iface.parameters.length > 0) {
            sections.push('**Properties:**');
            sections.push('');
            for (const param of iface.parameters.slice(0, 5)) {
              // Limit to avoid clutter
              const optionalText = param.optional ? ' *(optional)*' : '';
              sections.push(
                `- \`${param.name}\`: \`${param.type}\`${optionalText} - ${param.description}`,
              );
            }
            if (iface.parameters.length > 5) {
              sections.push(`- *...and ${iface.parameters.length - 5} more properties*`);
            }
            sections.push('');
          }
        }
      }
    }

    // Add implementation patterns
    sections.push('## Implementation Patterns');
    sections.push('');

    sections.push('### Template Pattern');
    sections.push('');
    sections.push(
      'The system uses a template pattern to standardize debugging across different operation types:',
    );
    sections.push('');
    sections.push('```typescript');
    sections.push('interface Template {');
    sections.push('  extends?: string;  // Template inheritance');
    sections.push('  debugData: (context, result, error) => any;');
    sections.push('  cache?: CacheOptions;');
    sections.push('  log?: LogOptions;');
    sections.push('}');
    sections.push('```');
    sections.push('');

    sections.push('### Wrapper Pattern');
    sections.push('');
    sections.push('All debugging is done through the wrapper pattern for consistency:');
    sections.push('');
    sections.push('```typescript');
    sections.push('const result = await debug.wrap("action_name", async () => {');
    sections.push('  // Your operation here');
    sections.push('}, { template: "template_name" });');
    sections.push('```');
    sections.push('');

    sections.push('### Singleton Logger');
    sections.push('');
    sections.push(
      'A singleton logger prevents file lock conflicts across multiple debug instances:',
    );
    sections.push('');
    sections.push('- Thread-safe file writing with queue-based batching');
    sections.push('- Automatic log rotation and compression');
    sections.push('- Multiple output formats (JSON, pretty, custom)');
    sections.push('');

    return sections.join('\n');
  }

  /**
   * Generates development guide.
   *
   * @audience internal
   */
  private generateDevelopmentGuide(
    entries: JSDocEntry[],
    options: MultiAudienceGenOptions,
  ): string {
    const sections: string[] = [
      '# Development Guide',
      '',
      `Development workflows and patterns for ${options.projectName || 'this project'}.`,
      '',
      '## Getting Started',
      '',
      'This guide is for developers working on the AI Debug package itself, not for users of the package.',
      '',
      '### Prerequisites',
      '',
      '- Node.js 22+',
      '- pnpm 10+',
      '- TypeScript knowledge',
      '- Understanding of AST parsing (for JSDoc extraction)',
      '',
      '### Development Setup',
      '',
      '```bash',
      '# Clone and install dependencies',
      'git clone <repository-url>',
      'cd ai-debug',
      'pnpm install',
      '',
      '# Build the project',
      'pnpm run build',
      '',
      '# Run tests',
      'pnpm test',
      '',
      '# Development mode (watch for changes)',
      'pnpm run dev',
      '```',
      '',
      '## Project Structure',
      '',
      '```',
      'src/',
      '├── core/          # Core debugging functionality',
      '├── docs/          # Documentation generation system',
      '├── cli/           # Command-line interface',
      '├── templates/     # Built-in debug templates',
      '├── types/         # TypeScript type definitions',
      '└── index.ts       # Main entry point',
      '',
      'tests/             # Test suite',
      'docs/              # Generated documentation (build output)',
      'dist/              # Compiled JavaScript (build output)',
      '```',
      '',
      '## Key Development Areas',
      '',
    ];

    // Add core modules
    const coreModules = entries.filter(
      (e) =>
        e.type === 'class' &&
        e.exported &&
        (e.file.includes('core/') || e.file.includes('docs/') || e.file.includes('cli/')),
    );

    if (coreModules.length > 0) {
      sections.push('### Core Modules');
      sections.push('');

      for (const module of coreModules) {
        sections.push(`#### ${module.name} (\`${module.file}\`)`);
        sections.push('');
        sections.push(module.description.split('\n')[0]);
        sections.push('');

        // Add key responsibilities
        if (module.name.includes('Debug')) {
          sections.push('**Key Responsibilities:**');
          sections.push('- Wrapping async operations with debugging instrumentation');
          sections.push('- Template-based operation categorization');
          sections.push('- Integration with caching and logging systems');
          sections.push('');
        } else if (module.name.includes('Cache')) {
          sections.push('**Key Responsibilities:**');
          sections.push('- LRU/FIFO cache implementation');
          sections.push('- TTL-based expiration');
          sections.push('- Template-specific caching strategies');
          sections.push('');
        } else if (module.name.includes('Logger')) {
          sections.push('**Key Responsibilities:**');
          sections.push('- Singleton file logger with queue-based batching');
          sections.push('- Multiple output formats (JSON, pretty, custom)');
          sections.push('- Automatic log rotation and compression');
          sections.push('');
        }
      }
    }

    // Add workflow sections
    const workflowEntries = entries.filter((e) => e.workflow && options.includeWorkflows);
    if (workflowEntries.length > 0) {
      sections.push('## Implementation Workflows');
      sections.push('');

      for (const entry of workflowEntries) {
        sections.push(`### ${entry.workflow?.id || entry.name}`);
        sections.push('');
        sections.push(`**Context:** ${entry.name} - ${entry.description.split('\n')[0]}`);
        sections.push('');

        if (entry.workflow?.steps) {
          sections.push('**Steps:**');
          sections.push('');
          for (const step of entry.workflow.steps) {
            sections.push(`${step.order}. ${step.description}`);
            if (step.code) {
              sections.push('   ```bash');
              sections.push(`   ${step.code}`);
              sections.push('   ```');
            }
          }
        }
        sections.push('');
      }
    }

    // Add testing guidelines
    sections.push('## Testing Guidelines');
    sections.push('');
    sections.push('The project maintains 100% test coverage. Key testing patterns:');
    sections.push('');
    sections.push('### Unit Tests');
    sections.push('- All core classes have comprehensive unit tests');
    sections.push('- Mock external dependencies (file system, timers)');
    sections.push('- Test both success and error paths');
    sections.push('');
    sections.push('### Integration Tests');
    sections.push('- End-to-end CLI command testing');
    sections.push('- Documentation generation pipeline testing');
    sections.push('- Template system integration testing');
    sections.push('');
    sections.push('### Test Commands');
    sections.push('```bash');
    sections.push('# Run all tests');
    sections.push('pnpm test');
    sections.push('');
    sections.push('# Run tests in watch mode');
    sections.push('pnpm test:watch');
    sections.push('');
    sections.push('# Run linting');
    sections.push('pnpm run lint');
    sections.push('```');
    sections.push('');

    // Add build system details
    sections.push('## Build System');
    sections.push('');
    sections.push('The project uses `tsup` for fast TypeScript compilation:');
    sections.push('');
    sections.push('### Build Configuration');
    sections.push('- **Dual format**: ESM (`.js`) and CJS (`.cjs`) outputs');
    sections.push('- **Version injection**: `__PACKAGE_VERSION__` replaced at build time');
    sections.push('- **CLI executable**: Automatic shebang injection for CLI');
    sections.push('- **Source maps**: Generated for debugging');
    sections.push('- **Type definitions**: Separate `.d.ts` files');
    sections.push('');
    sections.push('### Documentation Build');
    sections.push('The documentation is generated at build time:');
    sections.push('');
    sections.push('```bash');
    sections.push('# The build process runs:');
    sections.push('1. pnpm run docs:generate  # Generate versioned docs');
    sections.push('2. tsup                    # Compile TypeScript');
    sections.push('```');
    sections.push('');

    // Add release process
    sections.push('## Release Process');
    sections.push('');
    sections.push('### Version Management');
    sections.push('- Documentation is versioned (`docs/v{version}/`)');
    sections.push('- Build-time version injection ensures consistency');
    sections.push('- Symlink to `latest` version for easy access');
    sections.push('');
    sections.push('### Publishing Checklist');
    sections.push('1. **Update version** in `package.json`');
    sections.push('2. **Run full build** to generate new versioned docs');
    sections.push('3. **Run all tests** to ensure quality');
    sections.push('4. **Review generated documentation** for completeness');
    sections.push('5. **Commit changes** with conventional commit message');
    sections.push('6. **Tag release** following semantic versioning');
    sections.push('7. **Publish to npm**');
    sections.push('');

    // Add debugging tips
    sections.push('## Debugging the Debug System');
    sections.push('');
    sections.push('### Common Development Tasks');
    sections.push('');
    sections.push('**Adding a new template:**');
    sections.push('1. Create template definition in `src/templates/`');
    sections.push('2. Add JSDoc with `@audience external` tag');
    sections.push('3. Include comprehensive `@example` tags');
    sections.push('4. Add unit tests in `tests/templates/`');
    sections.push('5. Rebuild docs to include new template');
    sections.push('');
    sections.push('**Modifying JSDoc extraction:**');
    sections.push('1. Update `src/docs/jsdoc-extractor.ts`');
    sections.push('2. Test with `pnpm run docs:generate`');
    sections.push('3. Verify output in `docs/v{version}/`');
    sections.push('4. Run full test suite');
    sections.push('');
    sections.push('**Adding CLI commands:**');
    sections.push('1. Create command in `src/cli/commands/`');
    sections.push('2. Register in `src/cli/index.ts`');
    sections.push('3. Add comprehensive JSDoc documentation');
    sections.push('4. Add integration tests');
    sections.push('5. Update CLI help text');
    sections.push('');

    return sections.join('\n');
  }

  /**
   * Generates Claude section for merging into user CLAUDE.md files.
   *
   * @audience internal
   */
  private generateClaudeSection(entries: JSDocEntry[], options: MultiAudienceGenOptions): string {
    const sections: string[] = [
      '# AI Debug System Integration',
      '',
      "This section can be merged into your project's CLAUDE.md file to help Claude understand and work with the AI Debug system.",
      '',
      '## Package Overview',
      '',
      `${options.projectName || 'This package'} provides AI-optimized debugging and caching for Node.js applications.`,
      'It uses a template-based approach with automatic caching and comprehensive logging.',
      '',
      '## Quick Reference',
      '',
    ];

    // Add core concepts
    sections.push('### Core Concepts');
    sections.push('');
    sections.push(
      '- **Debug Wrapping**: Wrap operations with `debug.wrap()` for automatic instrumentation',
    );
    sections.push(
      '- **Templates**: Built-in patterns for common operations (http, database, file, business, auto)',
    );
    sections.push(
      '- **Caching**: Automatic intelligent caching based on operation type and context',
    );
    sections.push(
      '- **Raw Mode**: Deep object inspection with `debug.raw()` for complex debugging',
    );
    sections.push('');

    // Add quick API reference
    const exportedClasses = entries.filter((e) => e.type === 'class' && e.exported);
    const exportedInterfaces = entries.filter((e) => e.type === 'interface' && e.exported);

    if (exportedClasses.length > 0) {
      sections.push('### Main Classes');
      sections.push('');
      for (const cls of exportedClasses) {
        sections.push(`- **${cls.name}**: ${cls.description.split('\n')[0]}`);
      }
      sections.push('');
    }

    if (exportedInterfaces.length > 0) {
      sections.push('### Key Interfaces');
      sections.push('');
      const keyInterfaces = exportedInterfaces.filter((e) =>
        ['Config', 'DebugContext', 'DebugResult', 'Template', 'CacheOptions'].includes(e.name),
      );
      for (const iface of keyInterfaces) {
        sections.push(`- **${iface.name}**: ${iface.description.split('\n')[0]}`);
      }
      sections.push('');
    }

    // Add practical usage patterns
    sections.push('## Common Usage Patterns');
    sections.push('');

    sections.push('### Basic Debug Wrapping');
    sections.push('');
    sections.push('```typescript');
    sections.push('// Wrap any async operation for debugging');
    sections.push('const result = await debug.wrap("operation_name", async () => {');
    sections.push('  return await someAsyncOperation();');
    sections.push('}, { template: "auto" });');
    sections.push('```');
    sections.push('');

    sections.push('### HTTP API Debugging');
    sections.push('');
    sections.push('```typescript');
    sections.push('const userData = await debug.wrap("fetch_user", async () => {');
    sections.push('  return await fetch(`/api/users/${userId}`);');
    sections.push('}, { ');
    sections.push('  template: "http",');
    sections.push('  context: { url: `/api/users/${userId}`, method: "GET" }');
    sections.push('});');
    sections.push('```');
    sections.push('');

    sections.push('### Database Query Debugging');
    sections.push('');
    sections.push('```typescript');
    sections.push('const users = await debug.wrap("get_active_users", async () => {');
    sections.push('  return await db.query("SELECT * FROM users WHERE active = ?", [true]);');
    sections.push('}, { ');
    sections.push('  template: "database",');
    sections.push('  context: { table: "users", operation: "SELECT" }');
    sections.push('});');
    sections.push('```');
    sections.push('');

    // Add AI-specific guidance
    sections.push('## AI Assistant Guidelines');
    sections.push('');
    sections.push('When helping with this debug system:');
    sections.push('');
    sections.push(
      '1. **Always wrap async operations** in `debug.wrap()` for comprehensive tracking',
    );
    sections.push('2. **Choose appropriate templates**: http, database, file, business, or auto');
    sections.push('3. **Provide meaningful action names** that describe the operation purpose');
    sections.push('4. **Include relevant context** for better caching and analysis');
    sections.push('5. **Use raw mode** (`debug.raw()`) for complex object inspection');
    sections.push('');

    sections.push('### Template Selection Guide');
    sections.push('');
    sections.push('- **http**: REST API calls, HTTP requests, external service calls');
    sections.push('- **database**: SQL queries, ORM operations, data persistence');
    sections.push('- **file**: File I/O, reading configs, writing logs');
    sections.push('- **business**: Business logic, calculations, validations');
    sections.push('- **auto**: General purpose, automatic object inspection');
    sections.push('');

    // Add code examples from actual entries
    const entriesWithExamples = entries.filter(
      (e) => e.examples.length > 0 && options.includeExamples && e.exported,
    );

    if (entriesWithExamples.length > 0) {
      sections.push('## Implementation Examples');
      sections.push('');

      // Find the most relevant examples
      const relevantEntries = entriesWithExamples
        .filter((e) => e.type === 'class' || e.name === 'Config' || e.name.includes('Debug'))
        .slice(0, 3);

      for (const entry of relevantEntries) {
        if (entry.examples.length > 0) {
          const example = entry.examples[0];
          sections.push(`### ${entry.name} Usage`);
          sections.push('');
          sections.push(entry.description.split('\n')[0]);
          sections.push('');
          sections.push(`\`\`\`${example.language}`);
          sections.push(example.code);
          sections.push('```');
          sections.push('');
        }
      }
    }

    // Add CLI commands reference
    sections.push('## CLI Commands Reference');
    sections.push('');
    sections.push('The package provides CLI commands for analysis and documentation:');
    sections.push('');
    sections.push('```bash');
    sections.push('# Initialize debug system in project');
    sections.push('npx @dkmaker/ai-debug init --guided');
    sections.push('');
    sections.push('# Analyze debug usage patterns');
    sections.push('npx @dkmaker/ai-debug analyze');
    sections.push('');
    sections.push('# View debug data');
    sections.push('npx @dkmaker/ai-debug list');
    sections.push('npx @dkmaker/ai-debug view <action-name>');
    sections.push('');
    sections.push('# Generate documentation');
    sections.push('npx @dkmaker/ai-debug docs:generate');
    sections.push('```');
    sections.push('');

    return sections.join('\n');
  }

  /**
   * Generates usage guide for external users.
   *
   * @audience internal
   */
  private generateUsageGuide(entries: JSDocEntry[], options: MultiAudienceGenOptions): string {
    const sections: string[] = [
      '# Usage Guide',
      '',
      `Complete usage guide for ${options.projectName || 'this package'}.`,
      '',
      '## Getting Started',
      '',
    ];

    // Add installation and setup
    if (options.projectName) {
      sections.push('```bash');
      sections.push(`npm install ${options.projectName}`);
      sections.push('```');
      sections.push('');
    }

    // Add basic import example
    const mainClass = entries.find((e) => e.type === 'class' && e.exported);
    if (mainClass && options.projectName) {
      sections.push('### Basic Setup');
      sections.push('');
      sections.push('```typescript');
      sections.push(`import { ${mainClass.name} } from '${options.projectName}';`);
      sections.push('');
      sections.push(`const debug = new ${mainClass.name}();`);
      sections.push('```');
      sections.push('');
    }

    // Add examples by category - properly structured
    const entriesWithExamples = entries.filter(
      (e) => e.examples.length > 0 && options.includeExamples,
    );

    if (entriesWithExamples.length > 0) {
      sections.push('## Examples');
      sections.push('');

      // Group examples by functional category
      const categories = new Map<string, JSDocEntry[]>();

      for (const entry of entriesWithExamples) {
        // Determine category based on entry name and type
        let category = 'General';
        if (
          entry.name.toLowerCase().includes('cache') ||
          entry.description.toLowerCase().includes('caching')
        ) {
          category = 'Caching';
        } else if (
          entry.name.toLowerCase().includes('debug') ||
          entry.description.toLowerCase().includes('debug')
        ) {
          category = 'Debugging';
        } else if (
          entry.name.toLowerCase().includes('config') ||
          entry.description.toLowerCase().includes('configuration')
        ) {
          category = 'Configuration';
        } else if (entry.name.toLowerCase().includes('template')) {
          category = 'Templates';
        } else if (entry.type === 'interface') {
          category = 'Types & Interfaces';
        }

        if (!categories.has(category)) {
          categories.set(category, []);
        }
        categories.get(category)?.push(entry);
      }

      // Generate examples for each category
      for (const [category, categoryEntries] of categories) {
        sections.push(`### ${category}`);
        sections.push('');

        for (const entry of categoryEntries) {
          // Add entry description
          sections.push(`#### ${entry.name}`);
          sections.push('');
          sections.push(entry.description.split('\n')[0]); // First line only
          sections.push('');

          // Add all examples for this entry
          for (const example of entry.examples) {
            if (example.title && example.title !== 'Example 1') {
              sections.push(`**${example.title}:**`);
              sections.push('');
            }

            sections.push(`\`\`\`${example.language}`);
            sections.push(example.code);
            sections.push('```');
            sections.push('');

            if (example.description) {
              sections.push(example.description);
              sections.push('');
            }
          }
        }
      }
    }

    // Add common patterns section
    sections.push('## Common Patterns');
    sections.push('');

    const templateEntries = entries.filter(
      (e) =>
        e.name.toLowerCase().includes('template') ||
        e.description.toLowerCase().includes('template'),
    );

    if (templateEntries.length > 0) {
      sections.push('### Using Built-in Templates');
      sections.push('');
      sections.push('The package includes several built-in templates for common operations:');
      sections.push('');
      sections.push('- **http**: For REST API calls and HTTP operations');
      sections.push('- **database**: For database queries and transactions');
      sections.push('- **file**: For file system operations');
      sections.push('- **business**: For business logic debugging');
      sections.push('- **auto**: For automatic object inspection');
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Generates configuration guide.
   *
   * @audience internal
   */
  private generateConfigurationGuide(
    entries: JSDocEntry[],
    options: MultiAudienceGenOptions,
  ): string {
    const sections: string[] = [
      '# Configuration Guide',
      '',
      `Configuration options for ${options.projectName || 'this package'}.`,
      '',
      '## Overview',
      '',
      'This guide covers all configuration options available in the AI Debug system.',
      'Configuration can be set through the main Config interface or individual option objects.',
      '',
    ];

    // Find configuration-related entries and organize them
    const configEntries = entries.filter(
      (e) =>
        e.exported &&
        (e.name.toLowerCase().includes('config') ||
          e.name.toLowerCase().includes('option') ||
          (e.type === 'interface' &&
            (e.name === 'Config' || e.name.endsWith('Config') || e.name.endsWith('Options')))),
    );

    if (configEntries.length > 0) {
      // Organize by importance - main Config first
      const mainConfig = configEntries.find((e) => e.name === 'Config');
      const otherConfigs = configEntries.filter((e) => e.name !== 'Config');

      if (mainConfig) {
        sections.push('## Main Configuration');
        sections.push('');
        sections.push(`### ${mainConfig.name}`);
        sections.push('');
        sections.push(mainConfig.description);
        sections.push('');

        // Add complete examples for main config
        if (mainConfig.examples.length > 0 && options.includeExamples) {
          sections.push('**Complete Configuration Example:**');
          sections.push('');

          for (const example of mainConfig.examples) {
            if (example.title && example.title !== 'Example 1') {
              sections.push(`*${example.title}:*`);
              sections.push('');
            }

            sections.push(`\`\`\`${example.language}`);
            sections.push(example.code);
            sections.push('```');
            sections.push('');

            if (example.description) {
              sections.push(example.description);
              sections.push('');
            }
          }
        }
      }

      // Add other configuration options
      if (otherConfigs.length > 0) {
        sections.push('## Specific Configuration Options');
        sections.push('');

        // Group by category
        const categories = new Map<string, JSDocEntry[]>();

        for (const entry of otherConfigs) {
          let category = 'General';

          if (entry.name.toLowerCase().includes('cache')) {
            category = 'Caching';
          } else if (entry.name.toLowerCase().includes('log')) {
            category = 'Logging';
          } else if (entry.name.toLowerCase().includes('persistence')) {
            category = 'Data Persistence';
          } else if (entry.name.toLowerCase().includes('debug')) {
            category = 'Debug Settings';
          }

          if (!categories.has(category)) {
            categories.set(category, []);
          }
          categories.get(category)?.push(entry);
        }

        for (const [category, categoryEntries] of categories) {
          sections.push(`### ${category}`);
          sections.push('');

          for (const entry of categoryEntries) {
            sections.push(`#### ${entry.name}`);
            sections.push('');
            sections.push(entry.description);
            sections.push('');

            // Add properties if available
            if (entry.parameters.length > 0) {
              sections.push('**Properties:**');
              sections.push('');
              for (const param of entry.parameters) {
                const optionalText = param.optional ? ' *(optional)*' : '';
                const defaultText = param.defaultValue
                  ? ` (default: \`${param.defaultValue}\`)`
                  : '';
                sections.push(
                  `- **\`${param.name}\`** (\`${param.type}\`)${optionalText}${defaultText}: ${param.description}`,
                );
              }
              sections.push('');
            }

            // Add examples
            if (entry.examples.length > 0 && options.includeExamples) {
              sections.push('**Usage Examples:**');
              sections.push('');

              for (const example of entry.examples) {
                if (example.title && example.title !== 'Example 1') {
                  sections.push(`*${example.title}:*`);
                  sections.push('');
                }

                sections.push(`\`\`\`${example.language}`);
                sections.push(example.code);
                sections.push('```');
                sections.push('');

                if (example.description) {
                  sections.push(example.description);
                  sections.push('');
                }
              }
            }
          }
        }
      }

      // Add quick reference section
      sections.push('## Quick Reference');
      sections.push('');
      sections.push('### Essential Configuration');
      sections.push('');
      sections.push('For most use cases, you only need to configure:');
      sections.push('');
      sections.push('```typescript');
      sections.push('const config = {');
      sections.push('  features: {');
      sections.push('    cache: { enabled: true, defaultTTL: 300 },');
      sections.push('    debug: { enabled: true, level: "info" },');
      sections.push('    logging: { file: { enabled: true } }');
      sections.push('  }');
      sections.push('};');
      sections.push('```');
      sections.push('');

      sections.push('### Environment-Specific Settings');
      sections.push('');
      sections.push('**Development:**');
      sections.push('```typescript');
      sections.push('{ debug: { enabled: true, level: "debug", raw: { enabled: true } } }');
      sections.push('```');
      sections.push('');
      sections.push('**Production:**');
      sections.push('```typescript');
      sections.push('{ debug: { enabled: true, level: "warn", raw: { enabled: false } } }');
      sections.push('```');
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Generates a Claude command file.
   *
   * @audience internal
   */
  private generateClaudeCommand(
    command: string,
    entries: JSDocEntry[],
    options: MultiAudienceGenOptions,
  ): string {
    const commandTitle = this.formatCommandTitle(command);
    const sections: string[] = [
      `# ${commandTitle}`,
      '',
      `Step-by-step workflow for ${command.replace(/-/g, ' ')} with AI Debug system`,
      '',
      '## Overview',
      '',
      `This command provides a step-by-step workflow for ${command.replace(/-/g, ' ')}.`,
      'Each step includes detailed instructions, code examples, and best practices.',
      '',
    ];

    // Add workflow diagram if we have workflow entries
    const workflowEntries = entries.filter((e) => e.workflow);
    if (workflowEntries.length > 0) {
      sections.push('## Workflow Diagram');
      sections.push('');
      sections.push('```mermaid');
      sections.push('graph TD');

      const totalSteps = Math.max(
        ...workflowEntries.flatMap((e) => e.workflow?.steps.map((s) => s.order) || []),
      );

      for (let i = 1; i <= totalSteps; i++) {
        const stepId = String.fromCharCode(64 + i); // A, B, C, etc.
        const nextStepId = i < totalSteps ? String.fromCharCode(64 + i + 1) : null;

        const step = workflowEntries
          .flatMap((e) => e.workflow?.steps || [])
          .find((s) => s.order === i);

        const stepDesc = step?.description || `Step ${i}`;
        sections.push(`    ${stepId}[${stepDesc}]`);

        if (nextStepId) {
          if (i === totalSteps - 1) {
            sections.push(`    ${stepId} --> ${nextStepId}{Complete?}`);
            sections.push(`    ${nextStepId} -->|Yes| G[Done]`);
            sections.push(`    ${nextStepId} -->|No| H[Review & Adjust]`);
            sections.push('    H --> A');
          } else {
            sections.push(`    ${stepId} --> ${nextStepId}`);
          }
        }
      }

      sections.push('```');
      sections.push('');
    }

    // Add implementation steps
    if (workflowEntries.length > 0) {
      sections.push('## Implementation Steps');
      sections.push('');

      const allSteps = workflowEntries
        .flatMap((e) => e.workflow?.steps || [])
        .sort((a, b) => a.order - b.order);

      for (const step of allSteps) {
        sections.push(`### Step ${step.order}: ${step.description}`);
        sections.push('');

        // Find the entry this step belongs to for context
        const parentEntry = workflowEntries.find((e) =>
          e.workflow?.steps.some(
            (s) => s.order === step.order && s.description === step.description,
          ),
        );

        if (parentEntry) {
          sections.push(parentEntry.description.split('\n')[0]);
          sections.push('');
        }

        if (step.code) {
          sections.push('```bash');
          sections.push(step.code);
          sections.push('```');
          sections.push('');
        }

        // Add notes section for each step
        sections.push('**Notes:**');
        sections.push('');
        sections.push(
          `- ${step.description.toLowerCase().includes('analyze') ? 'Review the analysis results carefully' : 'Ensure this step completes successfully before proceeding'}`,
        );
        sections.push(
          `- ${step.description.toLowerCase().includes('config') ? 'Validate configuration settings match your requirements' : 'Test the implementation to verify it works as expected'}`,
        );
        sections.push('');
      }
    }

    // Add examples section with better organization
    const entriesWithExamples = entries.filter((e) => e.examples.length > 0);
    if (entriesWithExamples.length > 0 && options.includeExamples) {
      sections.push('## Examples');
      sections.push('');

      // Group examples by type
      const exampleCategories = new Map<string, JSDocEntry[]>();

      for (const entry of entriesWithExamples) {
        let category = 'General';
        if (entry.name.toLowerCase().includes('cache')) {
          category = 'Caching Examples';
        } else if (entry.name.toLowerCase().includes('template')) {
          category = 'Template Examples';
        } else if (entry.name.toLowerCase().includes('config')) {
          category = 'Configuration Examples';
        }

        if (!exampleCategories.has(category)) {
          exampleCategories.set(category, []);
        }
        exampleCategories.get(category)?.push(entry);
      }

      for (const [category, categoryEntries] of exampleCategories) {
        sections.push(`### ${category}`);
        sections.push('');

        for (const entry of categoryEntries) {
          for (let i = 0; i < entry.examples.length; i++) {
            const example = entry.examples[i];

            sections.push(`#### ${example.title || `${entry.name} Example ${i + 1}`}`);
            sections.push('');

            if (example.description) {
              sections.push(example.description);
              sections.push('');
            }

            // Add context for the example
            sections.push(`**Context:** ${entry.description.split('\n')[0]}`);
            sections.push('');

            sections.push(`\`\`\`${example.language}`);
            sections.push(example.code);
            sections.push('```');
            sections.push('');
          }
        }
      }
    }

    // Add project-specific examples section
    sections.push('## Project-Specific Examples');
    sections.push('');

    for (const entry of entriesWithExamples.slice(0, 2)) {
      for (const example of entry.examples.slice(0, 1)) {
        sections.push(`### ${entry.name} - ${example.title || 'Example'}`);
        sections.push('');
        sections.push(`From: \`${entry.file}:${entry.line}\``);
        sections.push('');
        sections.push(`\`\`\`${example.language}`);
        sections.push(example.code);
        sections.push('```');
        sections.push('');
      }
    }

    // Add best practices
    sections.push('## Best Practices');
    sections.push('');
    sections.push(`- Always use template-based ${command.replace(/-/g, ' ')} for consistency`);
    sections.push('- Include meaningful action names that describe the operation purpose');
    sections.push('- Provide relevant context for better caching and analysis');
    sections.push('- Monitor performance and adjust configuration based on results');
    sections.push('- Use appropriate templates for different operation types');
    sections.push('');

    // Add troubleshooting
    sections.push('## Troubleshooting');
    sections.push('');
    sections.push(
      `- If ${command.replace(/-/g, ' ')} doesn't work as expected, check your configuration`,
    );
    sections.push('- Verify that all required dependencies are properly installed');
    sections.push('- Check debug logs for detailed error information');
    sections.push('- Ensure templates are correctly configured for your use case');
    sections.push('');

    // Add Claude-specific patterns
    const claudeEntries = entries.filter((e) => e.claude?.patterns?.length);
    if (claudeEntries.length > 0) {
      sections.push('## AI Assistant Patterns');
      sections.push('');

      for (const entry of claudeEntries) {
        if (entry.claude?.patterns) {
          for (const pattern of entry.claude.patterns) {
            sections.push(`- ${pattern}`);
          }
        }
      }
      sections.push('');
    }

    // Add footer
    sections.push('---');
    sections.push('');
    sections.push(
      `*Generated for ${options.projectName || 'AI Debug'} v${options.version || '1.0.0'}*`,
    );

    return sections.join('\n');
  }

  /**
   * Generates workflow diagram in Mermaid format.
   *
   * @audience internal
   */
  private generateWorkflowDiagram(workflow: JSDocWorkflow): string {
    const lines: string[] = ['graph TD', ''];

    // Add workflow steps as nodes
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      const nodeId = `Step${step.order}`;
      const nextNodeId =
        i < workflow.steps.length - 1 ? `Step${workflow.steps[i + 1].order}` : null;

      lines.push(`    ${nodeId}["${step.order}. ${step.description}"]`);
      if (nextNodeId) {
        lines.push(`    ${nodeId} --> ${nextNodeId}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Generates class diagram in Mermaid format.
   *
   * @audience internal
   */
  private generateClassDiagram(classes: JSDocEntry[]): string {
    return `classDiagram\n${this.generateClassDiagramContent(classes)}`;
  }

  /**
   * Generates class diagram content.
   *
   * @audience internal
   */
  private generateClassDiagramContent(classes: JSDocEntry[]): string {
    const lines: string[] = [];

    for (const cls of classes) {
      lines.push(`    class ${cls.name} {`);

      // Find methods for this class
      const methods = classes.filter(
        (e) => e.type === 'method' && e.name.startsWith(`${cls.name}.`),
      );

      for (const method of methods) {
        const methodName = method.name.split('.')[1];
        const returnType = method.returns?.type || 'void';
        lines.push(`        +${methodName}() ${returnType}`);
      }

      lines.push('    }');
    }

    return lines.join('\n');
  }

  /**
   * Formats an API entry for documentation.
   *
   * @audience internal
   */
  private formatAPIEntry(
    entry: JSDocEntry,
    options: MultiAudienceGenOptions,
    audience: 'internal' | 'external',
  ): string {
    const sections: string[] = [`### ${entry.name}`, '', entry.description, ''];

    // Add signature for functions/methods
    if (entry.type === 'function' || entry.type === 'method') {
      sections.push('**Signature:**');
      sections.push('');
      sections.push('```typescript');
      sections.push(this.generateSignature(entry));
      sections.push('```');
      sections.push('');
    }

    // Add parameters
    if (entry.parameters.length > 0) {
      sections.push('**Parameters:**');
      sections.push('');
      for (const param of entry.parameters) {
        sections.push(
          `- \`${param.name}\` (\`${param.type}\`)${param.optional ? ' *(optional)*' : ''}: ${param.description}`,
        );
        if (param.defaultValue) {
          sections.push(`  - Default: \`${param.defaultValue}\``);
        }
      }
      sections.push('');
    }

    // Add return information
    if (entry.returns) {
      sections.push('**Returns:**');
      sections.push('');
      sections.push(`\`${entry.returns.type}\` - ${entry.returns.description}`);
      sections.push('');
    }

    // Add examples
    if (entry.examples.length > 0 && options.includeExamples) {
      sections.push('**Examples:**');
      sections.push('');
      for (const example of entry.examples) {
        if (example.title) {
          sections.push(`*${example.title}*`);
          sections.push('');
        }
        sections.push(`\`\`\`${example.language}`);
        sections.push(example.code);
        sections.push('```');
        sections.push('');
      }
    }

    // Add throws (for internal docs)
    if (entry.throws.length > 0 && audience === 'internal') {
      sections.push('**Throws:**');
      sections.push('');
      for (const throwInfo of entry.throws) {
        sections.push(`- \`${throwInfo.type}\`: ${throwInfo.description}`);
      }
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Generates function/method signature.
   *
   * @audience internal
   */
  private generateSignature(entry: JSDocEntry): string {
    const params = entry.parameters
      .map((p) => {
        const optional = p.optional ? '?' : '';
        const defaultVal = p.defaultValue ? ` = ${p.defaultValue}` : '';
        return `${p.name}${optional}: ${p.type}${defaultVal}`;
      })
      .join(', ');

    const returnType = entry.returns?.type || 'void';
    const isAsync =
      entry.description.toLowerCase().includes('async') || returnType.includes('Promise');
    const asyncPrefix = isAsync ? 'async ' : '';

    if (entry.type === 'method') {
      const methodName = entry.name.split('.')[1];
      return `${asyncPrefix}${methodName}(${params}): ${returnType}`;
    }

    return `${asyncPrefix}function ${entry.name}(${params}): ${returnType}`;
  }

  /**
   * Groups entries by type.
   *
   * @audience internal
   */
  private groupByType(entries: JSDocEntry[]): Record<string, JSDocEntry[]> {
    const groups: Record<string, JSDocEntry[]> = {
      class: [],
      interface: [],
      function: [],
      method: [],
      const: [],
      type: [],
    };

    for (const entry of entries) {
      if (groups[entry.type]) {
        groups[entry.type].push(entry);
      }
    }

    return groups;
  }

  /**
   * Groups examples by category based on entry type.
   *
   * @audience internal
   */
  private groupExamplesByCategory(entries: JSDocEntry[]): Record<string, JSDocEntry[]> {
    const groups: Record<string, JSDocEntry[]> = {};

    for (const entry of entries) {
      const category = entry.type === 'method' ? 'class' : entry.type;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(entry);
    }

    return groups;
  }

  /**
   * Calculates generation statistics.
   *
   * @audience internal
   */
  private calculateStats(
    allEntries: JSDocEntry[],
    filteredEntries: JSDocEntry[],
    generationTime: number,
  ): GenerationStats {
    const byAudience: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let examples = 0;
    let workflows = 0;

    for (const entry of filteredEntries) {
      byAudience[entry.audience] = (byAudience[entry.audience] || 0) + 1;
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      examples += entry.examples.length;
      if (entry.workflow) workflows++;
    }

    return {
      totalEntries: allEntries.length,
      byAudience,
      byType,
      examples,
      workflows,
      generationTime,
    };
  }

  /**
   * Ensures a directory exists, creating it if necessary.
   *
   * @audience internal
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Capitalizes the first letter of a string.
   *
   * @audience internal
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Formats command title for display.
   *
   * @audience internal
   */
  private formatCommandTitle(command: string): string {
    return command
      .split('-')
      .map((word) => this.capitalizeFirst(word))
      .join(' ');
  }
}
