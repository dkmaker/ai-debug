import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { JSDocEntry, JSDocWorkflow } from './jsdoc-extractor.js';

/**
 * Configuration for Mermaid diagram generation.
 */
export interface MermaidGenOptions {
  /** Output directory for diagram files */
  outputDir: string;
  /** Types of diagrams to generate */
  diagramTypes: DiagramType[];
  /** Include styling and theming */
  includeTheme: boolean;
  /** Maximum nodes per diagram (for large codebases) */
  maxNodes: number;
  /** Whether to include private/internal elements */
  includeInternal: boolean;
}

/**
 * Types of Mermaid diagrams that can be generated.
 */
export type DiagramType =
  | 'class-hierarchy'
  | 'workflow'
  | 'api-flow'
  | 'template-inheritance'
  | 'debug-flow'
  | 'cache-flow'
  | 'error-flow';

/**
 * Generated Mermaid diagram information.
 */
export interface GeneratedDiagram {
  /** Diagram type */
  type: DiagramType;
  /** File path where diagram was saved */
  path: string;
  /** Number of nodes in the diagram */
  nodeCount: number;
  /** Number of relationships/edges */
  edgeCount: number;
  /** Raw Mermaid content */
  content: string;
}

/**
 * Result of Mermaid diagram generation.
 */
export interface MermaidGenResult {
  /** Generated diagram files */
  diagrams: GeneratedDiagram[];
  /** Total number of diagrams generated */
  totalDiagrams: number;
  /** Total nodes across all diagrams */
  totalNodes: number;
}

/**
 * Comprehensive Mermaid diagram generator for JSDoc documentation.
 *
 * Creates various types of visual diagrams from JSDoc entries including:
 * - Class hierarchy diagrams
 * - Workflow process diagrams
 * - API flow diagrams
 * - Template inheritance diagrams
 * - Debug flow diagrams
 * - Cache strategy diagrams
 * - Error handling flow diagrams
 *
 * All diagrams are generated in Mermaid format for easy integration
 * with documentation systems and AI assistants.
 *
 * @audience both
 * @workflow "generate-mermaid-diagrams"
 * @claude-command "create-diagrams"
 *
 * @example
 * ```typescript
 * const generator = new MermaidGenerator();
 * const entries = await extractor.extractAll();
 *
 * const result = await generator.generateDiagrams(entries, {
 *   outputDir: './docs/diagrams',
 *   diagramTypes: ['class-hierarchy', 'workflow', 'api-flow'],
 *   includeTheme: true,
 *   maxNodes: 50,
 *   includeInternal: false
 * });
 *
 * console.log(`Generated ${result.totalDiagrams} diagrams`);
 * console.log(`Total nodes: ${result.totalNodes}`);
 * ```
 */
export class MermaidGenerator {
  private nodeCounter = 0;
  private theme = `
%%{init: {
  "theme": "base",
  "themeVariables": {
    "primaryColor": "#4A90E2",
    "primaryTextColor": "#FFFFFF",
    "primaryBorderColor": "#357ABD",
    "lineColor": "#666666",
    "secondaryColor": "#F5F5F5",
    "tertiaryColor": "#E8E8E8",
    "background": "#FFFFFF",
    "mainBkg": "#4A90E2",
    "secondBkg": "#71B340",
    "tertiaryBkg": "#F39C12"
  }
}}%%`;

  /**
   * Generates Mermaid diagrams from JSDoc entries.
   *
   * Creates various types of visual documentation including class hierarchies,
   * workflows, API flows, and debug system diagrams. Each diagram type
   * provides a different perspective on the codebase structure and behavior.
   *
   * @param entries - JSDoc entries to generate diagrams from
   * @param options - Configuration for diagram generation
   * @returns Promise that resolves to information about generated diagrams
   *
   * @throws {Error} If output directory cannot be created or files cannot be written
   *
   * @workflow-step 1 "Analyze JSDoc entries for diagram content"
   * @workflow-step 2 "Generate class hierarchy diagrams"
   * @workflow-step 3 "Create workflow process diagrams"
   * @workflow-step 4 "Build API flow diagrams"
   * @workflow-step 5 "Generate template inheritance diagrams"
   * @workflow-step 6 "Create debug system flow diagrams"
   *
   * @example
   * ```typescript
   * // Generate all diagram types
   * const result = await generator.generateDiagrams(entries, {
   *   outputDir: './docs/diagrams',
   *   diagramTypes: ['class-hierarchy', 'workflow', 'api-flow'],
   *   includeTheme: true,
   *   maxNodes: 50,
   *   includeInternal: true
   * });
   *
   * // Generate only workflow diagrams
   * const workflowResult = await generator.generateDiagrams(entries, {
   *   outputDir: './docs/workflows',
   *   diagramTypes: ['workflow'],
   *   includeTheme: false,
   *   maxNodes: 20,
   *   includeInternal: false
   * });
   * ```
   */
  async generateDiagrams(
    entries: JSDocEntry[],
    options: MermaidGenOptions,
  ): Promise<MermaidGenResult> {
    const diagrams: GeneratedDiagram[] = [];
    let totalNodes = 0;

    // Reset node counter
    this.nodeCounter = 0;

    // Generate each requested diagram type
    for (const diagramType of options.diagramTypes) {
      const diagram = await this.generateDiagramByType(diagramType, entries, options);
      if (diagram) {
        diagrams.push(diagram);
        totalNodes += diagram.nodeCount;
      }
    }

    return {
      diagrams,
      totalDiagrams: diagrams.length,
      totalNodes,
    };
  }

  /**
   * Generates a specific type of diagram.
   *
   * @param diagramType - Type of diagram to generate
   * @param entries - JSDoc entries
   * @param options - Generation options
   * @returns Generated diagram or null if no content
   *
   * @audience internal
   */
  private async generateDiagramByType(
    diagramType: DiagramType,
    entries: JSDocEntry[],
    options: MermaidGenOptions,
  ): Promise<GeneratedDiagram | null> {
    let content: string;
    let nodeCount = 0;
    let edgeCount = 0;

    switch (diagramType) {
      case 'class-hierarchy':
        ({ content, nodeCount, edgeCount } = this.generateClassHierarchy(entries, options));
        break;
      case 'workflow':
        ({ content, nodeCount, edgeCount } = this.generateWorkflowDiagrams(entries, options));
        break;
      case 'api-flow':
        ({ content, nodeCount, edgeCount } = this.generateAPIFlow(entries, options));
        break;
      case 'template-inheritance':
        ({ content, nodeCount, edgeCount } = this.generateTemplateInheritance(entries, options));
        break;
      case 'debug-flow':
        ({ content, nodeCount, edgeCount } = this.generateDebugFlow(entries, options));
        break;
      case 'cache-flow':
        ({ content, nodeCount, edgeCount } = this.generateCacheFlow(entries, options));
        break;
      case 'error-flow':
        ({ content, nodeCount, edgeCount } = this.generateErrorFlow(entries, options));
        break;
      default:
        return null;
    }

    if (!content || nodeCount === 0) {
      return null;
    }

    // Ensure output directory exists
    if (!existsSync(options.outputDir)) {
      mkdirSync(options.outputDir, { recursive: true });
    }

    // Write diagram file
    const filename = `${diagramType}.mmd`;
    const filepath = join(options.outputDir, filename);
    writeFileSync(filepath, content);

    return {
      type: diagramType,
      path: filepath,
      nodeCount,
      edgeCount,
      content,
    };
  }

  /**
   * Generates class hierarchy diagram.
   *
   * @audience internal
   */
  private generateClassHierarchy(
    entries: JSDocEntry[],
    options: MermaidGenOptions,
  ): { content: string; nodeCount: number; edgeCount: number } {
    const classes = entries.filter(
      (e) => e.type === 'class' && (options.includeInternal || e.audience !== 'internal'),
    );
    const interfaces = entries.filter(
      (e) => e.type === 'interface' && (options.includeInternal || e.audience !== 'internal'),
    );

    if (classes.length === 0 && interfaces.length === 0) {
      return { content: '', nodeCount: 0, edgeCount: 0 };
    }

    const lines: string[] = [];

    if (options.includeTheme) {
      lines.push(this.theme);
    }

    lines.push('classDiagram');
    lines.push('    direction TB');
    lines.push('');

    let nodeCount = 0;
    const edgeCount = 0;

    // Add classes
    for (const cls of classes.slice(0, options.maxNodes)) {
      lines.push(`    class ${cls.name} {`);

      // Find methods for this class
      const methods = entries.filter(
        (e) => e.type === 'method' && e.name.startsWith(`${cls.name}.`) && !e.name.includes('_'), // Exclude private methods
      );

      for (const method of methods.slice(0, 10)) {
        // Limit methods shown
        const methodName = method.name.split('.')[1];
        const returnType = method.returns?.type?.replace(/Promise<(.*)>/, '$1') || 'void';
        const params = method.parameters.map((p) => `${p.name}: ${p.type}`).join(', ');
        lines.push(`        +${methodName}(${params.length > 30 ? '...' : params}) ${returnType}`);
      }

      lines.push('    }');
      nodeCount++;
    }

    // Add interfaces
    for (const iface of interfaces.slice(0, options.maxNodes - nodeCount)) {
      lines.push(`    class ${iface.name} {`);
      lines.push('        <<interface>>');
      lines.push('    }');
      nodeCount++;
    }

    // Add styling
    lines.push('');
    lines.push('    %% Styling');
    for (const cls of classes) {
      lines.push(`    class ${cls.name} fill:#4A90E2,stroke:#357ABD,stroke-width:2px,color:#fff`);
    }
    for (const iface of interfaces) {
      lines.push(`    class ${iface.name} fill:#71B340,stroke:#5A8A32,stroke-width:2px,color:#fff`);
    }

    return {
      content: lines.join('\n'),
      nodeCount,
      edgeCount,
    };
  }

  /**
   * Generates workflow diagrams.
   *
   * @audience internal
   */
  private generateWorkflowDiagrams(
    entries: JSDocEntry[],
    options: MermaidGenOptions,
  ): { content: string; nodeCount: number; edgeCount: number } {
    const workflowEntries = entries.filter((e) => e.workflow && e.workflow.steps.length > 0);

    if (workflowEntries.length === 0) {
      return { content: '', nodeCount: 0, edgeCount: 0 };
    }

    const lines: string[] = [];

    if (options.includeTheme) {
      lines.push(this.theme);
    }

    lines.push('graph TD');
    lines.push('');

    let nodeCount = 0;
    let edgeCount = 0;

    // Generate workflow for each entry
    for (const entry of workflowEntries.slice(0, 3)) {
      // Limit to 3 workflows to avoid clutter
      const workflow = entry.workflow;
      if (!workflow) continue;

      const prefix = entry.name.replace(/[^a-zA-Z0-9]/g, '');

      lines.push(`    %% ${entry.name} Workflow`);

      // Add workflow steps
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        const nodeId = `${prefix}Step${step.order}`;
        const nextNodeId =
          i < workflow.steps.length - 1 ? `${prefix}Step${workflow.steps[i + 1].order}` : null;

        const label = this.escapeLabel(step.description);
        lines.push(`    ${nodeId}["${step.order}. ${label}"]`);

        if (nextNodeId) {
          lines.push(`    ${nodeId} --> ${nextNodeId}`);
          edgeCount++;
        }

        nodeCount++;
      }

      lines.push('');
    }

    // Add styling
    lines.push('    %% Styling');
    lines.push('    classDef default fill:#4A90E2,stroke:#357ABD,stroke-width:2px,color:#fff');
    lines.push('    classDef decision fill:#F39C12,stroke:#E67E22,stroke-width:2px,color:#fff');
    lines.push('    classDef terminal fill:#71B340,stroke:#5A8A32,stroke-width:2px,color:#fff');

    return {
      content: lines.join('\n'),
      nodeCount,
      edgeCount,
    };
  }

  /**
   * Generates API flow diagram.
   *
   * @audience internal
   */
  private generateAPIFlow(
    entries: JSDocEntry[],
    options: MermaidGenOptions,
  ): { content: string; nodeCount: number; edgeCount: number } {
    const apiEntries = entries.filter(
      (e) =>
        e.exported &&
        (e.type === 'function' || e.type === 'method') &&
        (options.includeInternal || e.audience !== 'internal'),
    );

    if (apiEntries.length === 0) {
      return { content: '', nodeCount: 0, edgeCount: 0 };
    }

    const lines: string[] = [];

    if (options.includeTheme) {
      lines.push(this.theme);
    }

    lines.push('graph LR');
    lines.push('');

    let nodeCount = 0;
    let edgeCount = 0;

    // Group APIs by class/module
    const apisByClass = new Map<string, JSDocEntry[]>();

    for (const entry of apiEntries.slice(0, options.maxNodes)) {
      const className = entry.type === 'method' ? entry.name.split('.')[0] : 'Functions';
      if (!apisByClass.has(className)) {
        apisByClass.set(className, []);
      }
      apisByClass.get(className)?.push(entry);
    }

    // Create flow diagram
    lines.push('    Start([User Code]) --> Choice{Choose API}');
    nodeCount += 2;
    edgeCount++;

    for (const [_className, apis] of apisByClass) {
      for (const api of apis.slice(0, 5)) {
        // Limit APIs shown per class
        const apiId = this.generateNodeId(api.name);
        const label = this.escapeLabel(api.name);

        lines.push(`    Choice --> ${apiId}["${label}"]`);
        lines.push(`    ${apiId} --> Result${apiId}[Result]`);

        nodeCount += 2;
        edgeCount += 2;
      }
    }

    // Add styling
    lines.push('');
    lines.push('    %% Styling');
    lines.push('    classDef api fill:#4A90E2,stroke:#357ABD,stroke-width:2px,color:#fff');
    lines.push('    classDef result fill:#71B340,stroke:#5A8A32,stroke-width:2px,color:#fff');
    lines.push('    classDef decision fill:#F39C12,stroke:#E67E22,stroke-width:2px,color:#fff');

    return {
      content: lines.join('\n'),
      nodeCount,
      edgeCount,
    };
  }

  /**
   * Generates template inheritance diagram.
   *
   * @audience internal
   */
  private generateTemplateInheritance(
    entries: JSDocEntry[],
    options: MermaidGenOptions,
  ): { content: string; nodeCount: number; edgeCount: number } {
    const lines: string[] = [];

    if (options.includeTheme) {
      lines.push(this.theme);
    }

    lines.push('graph TD');
    lines.push('');

    // Define template hierarchy (from project knowledge)
    const templates = [
      { name: 'base', description: 'Base template for all operations', level: 0 },
      { name: 'http', description: 'HTTP/REST API operations', level: 1, extends: 'base' },
      { name: 'database', description: 'Database operations', level: 1, extends: 'base' },
      { name: 'file', description: 'File I/O operations', level: 1, extends: 'base' },
      { name: 'queue', description: 'Message queue operations', level: 1, extends: 'base' },
      { name: 'business', description: 'Business logic operations', level: 1, extends: 'base' },
      { name: 'auto', description: 'Automatic object inspection', level: 1, extends: 'base' },
    ];

    let nodeCount = 0;
    let edgeCount = 0;

    // Add template nodes
    for (const template of templates) {
      const nodeId = `Template${template.name}`;
      const label = this.escapeLabel(`${template.name}: ${template.description}`);
      lines.push(`    ${nodeId}["${label}"]`);
      nodeCount++;
    }

    lines.push('');

    // Add inheritance relationships
    for (const template of templates) {
      if (template.extends) {
        const fromId = `Template${template.extends}`;
        const toId = `Template${template.name}`;
        lines.push(`    ${fromId} --> ${toId}`);
        edgeCount++;
      }
    }

    // Add custom templates from project
    const customTemplateEntries = entries.filter(
      (e) => e.name.toLowerCase().includes('template') && e.type === 'const',
    );

    for (const customEntry of customTemplateEntries.slice(0, 5)) {
      const nodeId = this.generateNodeId(customEntry.name);
      const label = this.escapeLabel(customEntry.name);
      lines.push(`    TemplateBase --> ${nodeId}["${label}\\n(Custom)"]`);
      nodeCount++;
      edgeCount++;
    }

    // Add styling
    lines.push('');
    lines.push('    %% Styling');
    lines.push('    classDef builtin fill:#4A90E2,stroke:#357ABD,stroke-width:2px,color:#fff');
    lines.push('    classDef custom fill:#F39C12,stroke:#E67E22,stroke-width:2px,color:#fff');

    for (const template of templates) {
      lines.push(`    class Template${template.name} builtin`);
    }

    return {
      content: lines.join('\n'),
      nodeCount,
      edgeCount,
    };
  }

  /**
   * Generates debug flow diagram.
   *
   * @audience internal
   */
  private generateDebugFlow(
    _entries: JSDocEntry[],
    options: MermaidGenOptions,
  ): { content: string; nodeCount: number; edgeCount: number } {
    const lines: string[] = [];

    if (options.includeTheme) {
      lines.push(this.theme);
    }

    lines.push('graph TD');
    lines.push('');

    // Debug system flow
    const flowSteps = [
      { id: 'Start', label: 'debug.wrap() called', type: 'start' },
      { id: 'Init', label: 'Initialize debug context', type: 'process' },
      { id: 'Template', label: 'Select template', type: 'decision' },
      { id: 'Execute', label: 'Execute wrapped function', type: 'process' },
      { id: 'Success', label: 'Operation successful?', type: 'decision' },
      { id: 'ProcessResult', label: 'Process result data', type: 'process' },
      { id: 'ProcessError', label: 'Process error data', type: 'process' },
      { id: 'Cache', label: 'Update cache', type: 'process' },
      { id: 'Log', label: 'Write to log', type: 'process' },
      { id: 'Persist', label: 'Persist debug data', type: 'process' },
      { id: 'Return', label: 'Return result', type: 'end' },
    ];

    let nodeCount = 0;
    let edgeCount = 0;

    // Add nodes
    for (const step of flowSteps) {
      let nodeShape = '[]';
      if (step.type === 'start' || step.type === 'end') {
        nodeShape = '(())';
      } else if (step.type === 'decision') {
        nodeShape = '{}';
      }

      lines.push(`    ${step.id}${nodeShape.charAt(0)}"${step.label}"${nodeShape.charAt(1)}`);
      nodeCount++;
    }

    lines.push('');

    // Add flow connections
    const connections = [
      ['Start', 'Init'],
      ['Init', 'Template'],
      ['Template', 'Execute'],
      ['Execute', 'Success'],
      ['Success', 'ProcessResult', 'Yes'],
      ['Success', 'ProcessError', 'No'],
      ['ProcessResult', 'Cache'],
      ['ProcessError', 'Log'],
      ['Cache', 'Log'],
      ['Log', 'Persist'],
      ['Persist', 'Return'],
    ];

    for (const [from, to, label] of connections) {
      if (label) {
        lines.push(`    ${from} -->|${label}| ${to}`);
      } else {
        lines.push(`    ${from} --> ${to}`);
      }
      edgeCount++;
    }

    // Add styling
    lines.push('');
    lines.push('    %% Styling');
    lines.push('    classDef start fill:#71B340,stroke:#5A8A32,stroke-width:2px,color:#fff');
    lines.push('    classDef process fill:#4A90E2,stroke:#357ABD,stroke-width:2px,color:#fff');
    lines.push('    classDef decision fill:#F39C12,stroke:#E67E22,stroke-width:2px,color:#fff');
    lines.push('    classDef end fill:#E74C3C,stroke:#C0392B,stroke-width:2px,color:#fff');

    lines.push('    class Start start');
    lines.push('    class Init,Execute,ProcessResult,ProcessError,Cache,Log,Persist process');
    lines.push('    class Template,Success decision');
    lines.push('    class Return end');

    return {
      content: lines.join('\n'),
      nodeCount,
      edgeCount,
    };
  }

  /**
   * Generates cache flow diagram.
   *
   * @audience internal
   */
  private generateCacheFlow(
    _entries: JSDocEntry[],
    options: MermaidGenOptions,
  ): { content: string; nodeCount: number; edgeCount: number } {
    const lines: string[] = [];

    if (options.includeTheme) {
      lines.push(this.theme);
    }

    lines.push('graph TD');
    lines.push('');

    // Cache flow
    const flowSteps = [
      'Operation["Operation Request"]',
      'CacheCheck{"Cache Enabled?"}',
      'KeyGen["Generate Cache Key"]',
      'CacheHit{"Cache Hit?"}',
      'ValidTTL{"TTL Valid?"}',
      'ReturnCached["Return Cached Result"]',
      'Execute["Execute Operation"]',
      'ShouldCache{"Should Cache?"}',
      'StoreCache["Store in Cache"]',
      'ReturnResult["Return Result"]',
    ];

    const nodeCount = flowSteps.length;
    let edgeCount = 0;

    // Add nodes
    for (const step of flowSteps) {
      lines.push(`    ${step}`);
    }

    lines.push('');

    // Add connections
    const connections = [
      ['Operation', 'CacheCheck'],
      ['CacheCheck', 'Execute', 'No'],
      ['CacheCheck', 'KeyGen', 'Yes'],
      ['KeyGen', 'CacheHit'],
      ['CacheHit', 'Execute', 'Miss'],
      ['CacheHit', 'ValidTTL', 'Hit'],
      ['ValidTTL', 'ReturnCached', 'Yes'],
      ['ValidTTL', 'Execute', 'No'],
      ['Execute', 'ShouldCache'],
      ['ShouldCache', 'ReturnResult', 'No'],
      ['ShouldCache', 'StoreCache', 'Yes'],
      ['StoreCache', 'ReturnResult'],
      ['ReturnCached', 'ReturnResult'],
    ];

    for (const [from, to, label] of connections) {
      if (label) {
        lines.push(`    ${from} -->|${label}| ${to}`);
      } else {
        lines.push(`    ${from} --> ${to}`);
      }
      edgeCount++;
    }

    // Add styling
    lines.push('');
    lines.push('    %% Styling');
    lines.push('    classDef operation fill:#4A90E2,stroke:#357ABD,stroke-width:2px,color:#fff');
    lines.push('    classDef decision fill:#F39C12,stroke:#E67E22,stroke-width:2px,color:#fff');
    lines.push('    classDef cache fill:#71B340,stroke:#5A8A32,stroke-width:2px,color:#fff');
    lines.push('    classDef result fill:#E74C3C,stroke:#C0392B,stroke-width:2px,color:#fff');

    return {
      content: lines.join('\n'),
      nodeCount,
      edgeCount,
    };
  }

  /**
   * Generates error flow diagram.
   *
   * @audience internal
   */
  private generateErrorFlow(
    _entries: JSDocEntry[],
    options: MermaidGenOptions,
  ): { content: string; nodeCount: number; edgeCount: number } {
    const lines: string[] = [];

    if (options.includeTheme) {
      lines.push(this.theme);
    }

    lines.push('graph TD');
    lines.push('');

    // Error handling flow
    const flowSteps = [
      'Start["Operation Start"]',
      'Execute["Execute Function"]',
      'Error{"Error Occurred?"}',
      'CaptureError["Capture Error Context"]',
      'ClassifyError["Classify Error Type"]',
      'LogError["Log Error Details"]',
      'UpdateMetrics["Update Error Metrics"]',
      'NotifyHandlers["Notify Error Handlers"]',
      'ReturnError["Return/Throw Error"]',
      'Success["Process Success"]',
      'ReturnSuccess["Return Success"]',
    ];

    const nodeCount = flowSteps.length;
    let edgeCount = 0;

    // Add nodes
    for (const step of flowSteps) {
      lines.push(`    ${step}`);
    }

    lines.push('');

    // Add connections
    const connections = [
      ['Start', 'Execute'],
      ['Execute', 'Error'],
      ['Error', 'CaptureError', 'Yes'],
      ['Error', 'Success', 'No'],
      ['CaptureError', 'ClassifyError'],
      ['ClassifyError', 'LogError'],
      ['LogError', 'UpdateMetrics'],
      ['UpdateMetrics', 'NotifyHandlers'],
      ['NotifyHandlers', 'ReturnError'],
      ['Success', 'ReturnSuccess'],
    ];

    for (const [from, to, label] of connections) {
      if (label) {
        lines.push(`    ${from} -->|${label}| ${to}`);
      } else {
        lines.push(`    ${from} --> ${to}`);
      }
      edgeCount++;
    }

    // Add styling
    lines.push('');
    lines.push('    %% Styling');
    lines.push('    classDef start fill:#71B340,stroke:#5A8A32,stroke-width:2px,color:#fff');
    lines.push('    classDef process fill:#4A90E2,stroke:#357ABD,stroke-width:2px,color:#fff');
    lines.push('    classDef decision fill:#F39C12,stroke:#E67E22,stroke-width:2px,color:#fff');
    lines.push('    classDef error fill:#E74C3C,stroke:#C0392B,stroke-width:2px,color:#fff');
    lines.push('    classDef success fill:#2ECC71,stroke:#27AE60,stroke-width:2px,color:#fff');

    return {
      content: lines.join('\n'),
      nodeCount,
      edgeCount,
    };
  }

  /**
   * Generates a unique node ID for Mermaid diagrams.
   *
   * @param name - Base name for the node
   * @returns Sanitized node ID
   *
   * @audience internal
   */
  private generateNodeId(name: string): string {
    return `Node${++this.nodeCounter}_${name.replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  /**
   * Escapes labels for Mermaid diagram safety.
   *
   * @param label - Label to escape
   * @returns Escaped label
   *
   * @audience internal
   */
  private escapeLabel(label: string): string {
    return label.replace(/"/g, '\\"').replace(/\n/g, '\\n').slice(0, 50); // Limit length for readability
  }
}
