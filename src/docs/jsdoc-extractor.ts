import { readFileSync } from 'node:fs';
import * as parser from '@babel/parser';
import { glob } from 'glob';

/**
 * Comprehensive JSDoc documentation extracted from code.
 *
 * Contains all information needed to generate multi-audience documentation
 * including examples, workflows, and Claude-specific metadata.
 */
export interface JSDocEntry {
  /** Type of code element (class, interface, function, method, const) */
  type: 'class' | 'interface' | 'function' | 'method' | 'const' | 'type';
  /** Name of the element */
  name: string;
  /** Full JSDoc description text */
  description: string;
  /** File path where this element is defined */
  file: string;
  /** Line number in the file */
  line: number;
  /** Target audience for documentation */
  audience: 'internal' | 'external' | 'both';
  /** Whether this is exported from the module */
  exported: boolean;
  /** Function/method parameters */
  parameters: JSDocParameter[];
  /** Return type and description */
  returns?: JSDocReturn;
  /** Code examples from @example tags */
  examples: JSDocExample[];
  /** Exceptions that can be thrown */
  throws: JSDocThrows[];
  /** Custom workflow information */
  workflow?: JSDocWorkflow;
  /** Claude-specific metadata */
  claude?: JSDocClaude;
  /** See also references */
  seeAlso: string[];
  /** Deprecation information */
  deprecated?: string;
  /** Version when added */
  since?: string;
  /** Additional custom tags */
  customTags: Record<string, string>;
}

/**
 * Parameter documentation from JSDoc.
 */
export interface JSDocParameter {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: string;
  /** Parameter description */
  description: string;
  /** Whether parameter is optional */
  optional: boolean;
  /** Default value if any */
  defaultValue?: string;
}

/**
 * Return value documentation from JSDoc.
 */
export interface JSDocReturn {
  /** Return type */
  type: string;
  /** Return description */
  description: string;
}

/**
 * Code example from JSDoc @example tag.
 */
export interface JSDocExample {
  /** Example title/caption */
  title?: string;
  /** Example code */
  code: string;
  /** Example description */
  description?: string;
  /** Language for syntax highlighting */
  language: string;
}

/**
 * Exception documentation from JSDoc @throws tag.
 */
export interface JSDocThrows {
  /** Exception type/class */
  type: string;
  /** Description of when this exception is thrown */
  description: string;
}

/**
 * Workflow information for implementation guides.
 */
export interface JSDocWorkflow {
  /** Workflow identifier */
  id: string;
  /** Workflow steps */
  steps: JSDocWorkflowStep[];
  /** Associated diagram */
  diagram?: string;
}

/**
 * Individual workflow step.
 */
export interface JSDocWorkflowStep {
  /** Step number */
  order: number;
  /** Step description */
  description: string;
  /** Code example for this step */
  code?: string;
}

/**
 * Claude-specific metadata for AI optimization.
 */
export interface JSDocClaude {
  /** Associated Claude command name */
  command?: string;
  /** Implementation example for Claude */
  example?: string;
  /** Claude-specific usage patterns */
  patterns?: string[];
  /** Context hints for AI */
  context?: string;
}

/**
 * JSDoc extractor that parses TypeScript files and extracts comprehensive documentation.
 *
 * This class provides the foundation for multi-audience documentation generation,
 * including internal developer docs, external user guides, and Claude-specific
 * command files with implementation workflows.
 *
 * @audience both
 * @workflow "extract-documentation"
 * @claude-command "generate-docs"
 *
 * @example
 * ```typescript
 * const extractor = new JSDocExtractor('./src');
 * const entries = await extractor.extractAll();
 *
 * // Filter for external API documentation
 * const publicAPI = entries.filter(e =>
 *   e.exported && e.audience !== 'internal'
 * );
 * ```
 */
export class JSDocExtractor {
  private projectRoot: string;
  private sourcePatterns = [
    '**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.test.ts',
    '!**/*.d.ts',
  ];

  /**
   * Creates a new JSDoc extractor.
   *
   * @param projectRoot - Root directory to search for TypeScript files
   *
   * @example
   * ```typescript
   * // Extract from source directory
   * const extractor = new JSDocExtractor('./src');
   *
   * // Extract from specific directory
   * const extractor = new JSDocExtractor('/path/to/project');
   * ```
   */
  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Extracts JSDoc documentation from all TypeScript files in the project.
   *
   * Scans all TypeScript files (excluding test files and type definitions)
   * and extracts comprehensive JSDoc information including parameters,
   * examples, workflows, and Claude-specific metadata.
   *
   * @returns Promise that resolves to array of JSDoc entries
   *
   * @throws {Error} If project directory doesn't exist or files can't be read
   *
   * @workflow-step 1 "Scan project for TypeScript files"
   * @workflow-step 2 "Parse each file's AST"
   * @workflow-step 3 "Extract JSDoc comments and metadata"
   * @workflow-step 4 "Process custom tags and workflows"
   *
   * @example
   * ```typescript
   * const extractor = new JSDocExtractor();
   * const allDocs = await extractor.extractAll();
   *
   * console.log(`Found ${allDocs.length} documented elements`);
   *
   * // Group by type
   * const byType = allDocs.reduce((acc, entry) => {
   *   acc[entry.type] = (acc[entry.type] || 0) + 1;
   *   return acc;
   * }, {});
   * ```
   */
  async extractAll(): Promise<JSDocEntry[]> {
    const files = await glob(this.sourcePatterns, { cwd: this.projectRoot });
    const allEntries: JSDocEntry[] = [];

    for (const file of files) {
      const fullPath = `${this.projectRoot}/${file}`;
      try {
        const entries = await this.extractFromFile(fullPath, file);
        allEntries.push(...entries);
      } catch (error) {
        console.warn(`Warning: Could not parse ${file}:`, error);
      }
    }

    return allEntries;
  }

  /**
   * Extracts JSDoc documentation from a single TypeScript file.
   *
   * @param fullPath - Absolute path to the file
   * @param relativePath - Relative path for documentation references
   * @returns Promise that resolves to array of JSDoc entries from the file
   *
   * @audience internal
   */
  private async extractFromFile(fullPath: string, relativePath: string): Promise<JSDocEntry[]> {
    const content = readFileSync(fullPath, 'utf-8');
    const entries: JSDocEntry[] = [];

    try {
      const ast = parser.parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', 'decorators-legacy'],
        errorRecovery: true,
      });

      // Dynamically import traverse to handle ESM/CJS compatibility
      const traverseModule = await import('@babel/traverse');
      const traverse = traverseModule.default || traverseModule;

      traverse(ast, {
        // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
        ExportNamedDeclaration: (path: any) => {
          this.processExportDeclaration(path, entries, relativePath, true);
        },

        // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
        ExportDefaultDeclaration: (path: any) => {
          this.processExportDeclaration(path, entries, relativePath, true);
        },

        // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
        ClassDeclaration: (path: any) => {
          if (!this.isExported(path)) {
            this.processClassDeclaration(path, entries, relativePath, false);
          }
        },

        // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
        FunctionDeclaration: (path: any) => {
          if (!this.isExported(path)) {
            this.processFunctionDeclaration(path, entries, relativePath, false);
          }
        },

        // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
        TSInterfaceDeclaration: (path: any) => {
          if (!this.isExported(path)) {
            this.processInterfaceDeclaration(path, entries, relativePath, false);
          }
        },

        // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
        TSTypeAliasDeclaration: (path: any) => {
          if (!this.isExported(path)) {
            this.processTypeDeclaration(path, entries, relativePath, false);
          }
        },

        // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
        VariableDeclaration: (path: any) => {
          if (!this.isExported(path)) {
            this.processVariableDeclaration(path, entries, relativePath, false);
          }
        },
      });
    } catch (error) {
      console.warn(`Error parsing ${relativePath}:`, error);
    }

    return entries;
  }

  /**
   * Processes export declarations to extract documentation.
   *
   * @param path - Babel AST path
   * @param entries - Array to collect entries
   * @param file - File path for reference
   * @param exported - Whether this is exported
   *
   * @audience internal
   */
  private processExportDeclaration(
    // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
    path: any,
    entries: JSDocEntry[],
    file: string,
    exported: boolean,
  ): void {
    const { node } = path;

    if (node.declaration) {
      switch (node.declaration.type) {
        case 'ClassDeclaration':
          this.processClassDeclaration({ node: node.declaration }, entries, file, exported);
          break;
        case 'FunctionDeclaration':
          this.processFunctionDeclaration({ node: node.declaration }, entries, file, exported);
          break;
        case 'TSInterfaceDeclaration':
          this.processInterfaceDeclaration({ node: node.declaration, parent: node }, entries, file, exported);
          break;
        case 'TSTypeAliasDeclaration':
          this.processTypeDeclaration({ node: node.declaration, parent: node }, entries, file, exported);
          break;
        case 'VariableDeclaration':
          this.processVariableDeclaration({ node: node.declaration }, entries, file, exported);
          break;
      }
    }
  }

  /**
   * Processes class declarations to extract documentation.
   *
   * @audience internal
   */
  private processClassDeclaration(
    // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
    path: any,
    entries: JSDocEntry[],
    file: string,
    exported: boolean,
  ): void {
    const { node } = path;
    if (!node.id?.name) return;

    const jsdoc = this.extractJSDoc(node);
    if (!jsdoc) return; // Skip undocumented items

    const entry: JSDocEntry = {
      type: 'class',
      name: node.id.name,
      description: jsdoc.description,
      file,
      line: node.loc?.start.line || 0,
      audience: this.parseAudience(jsdoc.tags),
      exported,
      parameters: [],
      examples: this.parseExamples(jsdoc.tags),
      throws: this.parseThrows(jsdoc.tags),
      workflow: this.parseWorkflow(jsdoc.tags),
      claude: this.parseClaude(jsdoc.tags),
      seeAlso: this.parseSeeAlso(jsdoc.tags),
      deprecated: this.parseTag(jsdoc.tags, 'deprecated'),
      since: this.parseTag(jsdoc.tags, 'since'),
      customTags: this.parseCustomTags(jsdoc.tags),
    };

    entries.push(entry);

    // Process class methods
    if (node.body?.body) {
      for (const member of node.body.body) {
        if (member.type === 'MethodDefinition' && member.kind === 'method') {
          this.processMethodDeclaration(member, entries, file, exported, node.id.name);
        }
      }
    }
  }

  /**
   * Processes method declarations within classes.
   *
   * @audience internal
   */
  private processMethodDeclaration(
    // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
    node: any,
    entries: JSDocEntry[],
    file: string,
    exported: boolean,
    className: string,
  ): void {
    if (!node.key?.name) return;
    if (node.key.name.startsWith('_')) return; // Skip private methods

    const jsdoc = this.extractJSDoc(node);
    if (!jsdoc) return;

    const entry: JSDocEntry = {
      type: 'method',
      name: `${className}.${node.key.name}`,
      description: jsdoc.description,
      file,
      line: node.loc?.start.line || 0,
      audience: this.parseAudience(jsdoc.tags),
      exported,
      parameters: this.parseParameters(jsdoc.tags),
      returns: this.parseReturns(jsdoc.tags),
      examples: this.parseExamples(jsdoc.tags),
      throws: this.parseThrows(jsdoc.tags),
      workflow: this.parseWorkflow(jsdoc.tags),
      claude: this.parseClaude(jsdoc.tags),
      seeAlso: this.parseSeeAlso(jsdoc.tags),
      deprecated: this.parseTag(jsdoc.tags, 'deprecated'),
      since: this.parseTag(jsdoc.tags, 'since'),
      customTags: this.parseCustomTags(jsdoc.tags),
    };

    entries.push(entry);
  }

  /**
   * Processes function declarations to extract documentation.
   *
   * @audience internal
   */
  private processFunctionDeclaration(
    // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
    path: any,
    entries: JSDocEntry[],
    file: string,
    exported: boolean,
  ): void {
    const { node } = path;
    if (!node.id?.name) return;

    const jsdoc = this.extractJSDoc(node);
    if (!jsdoc) return;

    const entry: JSDocEntry = {
      type: 'function',
      name: node.id.name,
      description: jsdoc.description,
      file,
      line: node.loc?.start.line || 0,
      audience: this.parseAudience(jsdoc.tags),
      exported,
      parameters: this.parseParameters(jsdoc.tags),
      returns: this.parseReturns(jsdoc.tags),
      examples: this.parseExamples(jsdoc.tags),
      throws: this.parseThrows(jsdoc.tags),
      workflow: this.parseWorkflow(jsdoc.tags),
      claude: this.parseClaude(jsdoc.tags),
      seeAlso: this.parseSeeAlso(jsdoc.tags),
      deprecated: this.parseTag(jsdoc.tags, 'deprecated'),
      since: this.parseTag(jsdoc.tags, 'since'),
      customTags: this.parseCustomTags(jsdoc.tags),
    };

    entries.push(entry);
  }

  /**
   * Processes interface declarations to extract documentation.
   *
   * @audience internal
   */
  private processInterfaceDeclaration(
    // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
    path: any,
    entries: JSDocEntry[],
    file: string,
    exported: boolean,
  ): void {
    const { node } = path;
    if (!node.id?.name) return;

    // Try to get JSDoc from the node itself
    let jsdoc = this.extractJSDoc(node);
    
    // If no JSDoc on the interface, check the parent ExportNamedDeclaration
    if (!jsdoc && path.parent?.type === 'ExportNamedDeclaration') {
      jsdoc = this.extractJSDoc(path.parent);
    }
    
    if (!jsdoc) return;

    const entry: JSDocEntry = {
      type: 'interface',
      name: node.id.name,
      description: jsdoc.description,
      file,
      line: node.loc?.start.line || 0,
      audience: this.parseAudience(jsdoc.tags),
      exported,
      parameters: [],
      examples: this.parseExamples(jsdoc.tags),
      throws: [],
      workflow: this.parseWorkflow(jsdoc.tags),
      claude: this.parseClaude(jsdoc.tags),
      seeAlso: this.parseSeeAlso(jsdoc.tags),
      deprecated: this.parseTag(jsdoc.tags, 'deprecated'),
      since: this.parseTag(jsdoc.tags, 'since'),
      customTags: this.parseCustomTags(jsdoc.tags),
    };

    entries.push(entry);
  }

  /**
   * Processes type alias declarations to extract documentation.
   *
   * @audience internal
   */
  private processTypeDeclaration(
    // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
    path: any,
    entries: JSDocEntry[],
    file: string,
    exported: boolean,
  ): void {
    const { node } = path;
    if (!node.id?.name) return;

    // Try to get JSDoc from the node itself
    let jsdoc = this.extractJSDoc(node);
    
    // If no JSDoc on the type, check the parent ExportNamedDeclaration
    if (!jsdoc && path.parent?.type === 'ExportNamedDeclaration') {
      jsdoc = this.extractJSDoc(path.parent);
    }
    
    if (!jsdoc) return;

    const entry: JSDocEntry = {
      type: 'type',
      name: node.id.name,
      description: jsdoc.description,
      file,
      line: node.loc?.start.line || 0,
      audience: this.parseAudience(jsdoc.tags),
      exported,
      parameters: [],
      examples: this.parseExamples(jsdoc.tags),
      throws: [],
      workflow: this.parseWorkflow(jsdoc.tags),
      claude: this.parseClaude(jsdoc.tags),
      seeAlso: this.parseSeeAlso(jsdoc.tags),
      deprecated: this.parseTag(jsdoc.tags, 'deprecated'),
      since: this.parseTag(jsdoc.tags, 'since'),
      customTags: this.parseCustomTags(jsdoc.tags),
    };

    entries.push(entry);
  }

  /**
   * Processes variable declarations to extract documentation.
   *
   * @audience internal
   */
  private processVariableDeclaration(
    // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
    path: any,
    entries: JSDocEntry[],
    file: string,
    exported: boolean,
  ): void {
    const { node } = path;
    if (!node.declarations?.length) return;

    for (const declarator of node.declarations) {
      if (!declarator.id?.name) continue;

      const jsdoc = this.extractJSDoc(node);
      if (!jsdoc) continue;

      const entry: JSDocEntry = {
        type: 'const',
        name: declarator.id.name,
        description: jsdoc.description,
        file,
        line: node.loc?.start.line || 0,
        audience: this.parseAudience(jsdoc.tags),
        exported,
        parameters: [],
        examples: this.parseExamples(jsdoc.tags),
        throws: [],
        workflow: this.parseWorkflow(jsdoc.tags),
        claude: this.parseClaude(jsdoc.tags),
        seeAlso: this.parseSeeAlso(jsdoc.tags),
        deprecated: this.parseTag(jsdoc.tags, 'deprecated'),
        since: this.parseTag(jsdoc.tags, 'since'),
        customTags: this.parseCustomTags(jsdoc.tags),
      };

      entries.push(entry);
    }
  }

  /**
   * Checks if a node is exported.
   *
   * @audience internal
   */
  private isExported(
    // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
    path: any,
  ): boolean {
    let parent = path.parent;
    while (parent) {
      if (parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportDefaultDeclaration') {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  }

  /**
   * Extracts JSDoc comment from a node.
   *
   * @audience internal
   */
  private extractJSDoc(
    // biome-ignore lint/suspicious/noExplicitAny: Babel AST types are dynamic
    node: any,
  ): { description: string; tags: Map<string, string[]> } | null {
    const comments = node.leadingComments || [];
    const jsdocComment = comments.find(
      // biome-ignore lint/suspicious/noExplicitAny: Babel AST comment types are dynamic
      (c: any) => c.type === 'CommentBlock' && c.value.startsWith('*'),
    );

    if (!jsdocComment) return null;

    const content = jsdocComment.value;
    const lines = content.split('\n').map((line) => line.replace(/^\s*\*\s?/, ''));

    const tags = new Map<string, string[]>();
    let description = '';
    let currentTag = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const tagMatch = line.match(/^@(\w+)(?:\s+(.*))?$/);

      if (tagMatch) {
        // Save previous tag
        if (currentTag) {
          // For tags that can appear multiple times (like @example), append to existing array
          const existingContent = tags.get(currentTag) || [];
          if (currentTag === 'example' || currentTag === 'param' || currentTag === 'throws') {
            existingContent.push(currentContent.join('\n'));
            tags.set(currentTag, existingContent);
          } else {
            tags.set(currentTag, currentContent);
          }
        }

        // Start new tag
        currentTag = tagMatch[1];
        currentContent = tagMatch[2] ? [tagMatch[2]] : [];
      } else if (currentTag) {
        // Continue current tag
        currentContent.push(line);
      } else {
        // Part of description
        description += (description ? '\n' : '') + line;
      }
    }

    // Save final tag
    if (currentTag) {
      // For tags that can appear multiple times (like @example), append to existing array
      const existingContent = tags.get(currentTag) || [];
      if (currentTag === 'example' || currentTag === 'param' || currentTag === 'throws') {
        existingContent.push(currentContent.join('\n'));
        tags.set(currentTag, existingContent);
      } else {
        tags.set(currentTag, currentContent);
      }
    }

    return {
      description: description.trim(),
      tags,
    };
  }

  /**
   * Parses audience from JSDoc tags.
   *
   * @audience internal
   */
  private parseAudience(tags: Map<string, string[]>): 'internal' | 'external' | 'both' {
    const audience = tags.get('audience')?.[0]?.trim();
    if (audience === 'internal' || audience === 'external' || audience === 'both') {
      return audience;
    }
    return 'both'; // Default to both audiences
  }

  /**
   * Parses parameters from JSDoc tags.
   *
   * @audience internal
   */
  private parseParameters(tags: Map<string, string[]>): JSDocParameter[] {
    const params = tags.get('param') || [];
    return params.map((param) => {
      // Format: {type} name - description
      const match = param.match(/^\{([^}]+)\}\s+(\w+)(?:\s+-\s+(.*))?$/);
      if (match) {
        return {
          name: match[2],
          type: match[1],
          description: match[3] || '',
          optional: match[1].includes('?') || param.includes('['),
          defaultValue: this.extractDefaultValue(param),
        };
      }

      // Fallback format
      const parts = param.split(/\s+/);
      return {
        name: parts[0] || '',
        type: 'unknown',
        description: parts.slice(1).join(' '),
        optional: false,
      };
    });
  }

  /**
   * Parses return information from JSDoc tags.
   *
   * @audience internal
   */
  private parseReturns(tags: Map<string, string[]>): JSDocReturn | undefined {
    const returns = tags.get('returns') || tags.get('return');
    if (!returns?.length) return undefined;

    const returnInfo = returns[0];
    const match = returnInfo.match(/^\{([^}]+)\}\s*(.*)$/);

    if (match) {
      return {
        type: match[1],
        description: match[2] || '',
      };
    }

    return {
      type: 'unknown',
      description: returnInfo,
    };
  }

  /**
   * Parses examples from JSDoc tags.
   *
   * @audience internal
   */
  private parseExamples(tags: Map<string, string[]>): JSDocExample[] {
    const examples = tags.get('example') || [];
    
    return examples.map((exampleText, index) => {
      const lines = exampleText.split('\n');
      let title = '';
      let code = '';
      let language = 'typescript';

      // Check if first line is a title (not code)
      if (
        lines[0] &&
        !lines[0].includes('```') &&
        !lines[0].match(/^\s*(const|let|var|function|class|interface)/) &&
        !lines[0].includes('{') &&
        !lines[0].includes('=')
      ) {
        title = lines[0];
        lines.shift();
      }

      // Check for code block with language
      if (lines[0]?.startsWith('```')) {
        language = lines[0].replace('```', '').trim() || 'typescript';
        lines.shift();

        // Find closing ```
        const endIndex = lines.findIndex((line) => line.trim() === '```');
        if (endIndex !== -1) {
          code = lines.slice(0, endIndex).join('\n');
        } else {
          code = lines.join('\n');
        }
      } else {
        code = lines.join('\n');
      }

      return {
        title: title || `Example ${index + 1}`,
        code: code.trim(),
        language,
      };
    });
  }

  /**
   * Parses throws information from JSDoc tags.
   *
   * @audience internal
   */
  private parseThrows(tags: Map<string, string[]>): JSDocThrows[] {
    const throws = tags.get('throws') || [];
    return throws.map((throwInfo) => {
      const match = throwInfo.match(/^\{([^}]+)\}\s*(.*)$/);
      if (match) {
        return {
          type: match[1],
          description: match[2] || '',
        };
      }

      return {
        type: 'Error',
        description: throwInfo,
      };
    });
  }

  /**
   * Parses workflow information from JSDoc tags.
   *
   * @audience internal
   */
  private parseWorkflow(tags: Map<string, string[]>): JSDocWorkflow | undefined {
    const workflow = tags.get('workflow')?.[0];
    const workflowSteps = tags.get('workflow-step') || [];
    const diagram = tags.get('diagram')?.[0];

    if (!workflow && !workflowSteps.length) return undefined;

    const steps: JSDocWorkflowStep[] = workflowSteps
      .map((step) => {
        const match = step.match(/^(\d+)\s+"([^"]+)"(?:\s+(.*))?$/);
        if (match) {
          return {
            order: Number.parseInt(match[1], 10),
            description: match[2],
            code: match[3],
          };
        }

        return {
          order: 0,
          description: step,
        };
      })
      .sort((a, b) => a.order - b.order);

    return {
      id: workflow || 'default-workflow',
      steps,
      diagram,
    };
  }

  /**
   * Parses Claude-specific metadata from JSDoc tags.
   *
   * @audience internal
   */
  private parseClaude(tags: Map<string, string[]>): JSDocClaude | undefined {
    const command = tags.get('claude-command')?.[0];
    const example = tags.get('claude-example')?.[0];
    const patterns = tags.get('claude-pattern') || [];
    const context = tags.get('claude-context')?.[0];

    if (!command && !example && !patterns.length && !context) return undefined;

    return {
      command,
      example,
      patterns,
      context,
    };
  }

  /**
   * Parses see also references from JSDoc tags.
   *
   * @audience internal
   */
  private parseSeeAlso(tags: Map<string, string[]>): string[] {
    return tags.get('see') || [];
  }

  /**
   * Parses a specific tag value.
   *
   * @audience internal
   */
  private parseTag(tags: Map<string, string[]>, tagName: string): string | undefined {
    return tags.get(tagName)?.[0];
  }

  /**
   * Parses custom tags that aren't standard JSDoc.
   *
   * @audience internal
   */
  private parseCustomTags(tags: Map<string, string[]>): Record<string, string> {
    const customTags: Record<string, string> = {};
    const standardTags = new Set([
      'param',
      'returns',
      'return',
      'throws',
      'example',
      'see',
      'since',
      'deprecated',
      'audience',
      'workflow',
      'workflow-step',
      'diagram',
      'claude-command',
      'claude-example',
      'claude-pattern',
      'claude-context',
    ]);

    for (const [tagName, values] of tags) {
      if (!standardTags.has(tagName)) {
        customTags[tagName] = values.join(' ');
      }
    }

    return customTags;
  }

  /**
   * Extracts default value from parameter documentation.
   *
   * @audience internal
   */
  private extractDefaultValue(param: string): string | undefined {
    const match = param.match(/=\s*([^}\]]+)/);
    return match?.[1]?.trim();
  }
}
