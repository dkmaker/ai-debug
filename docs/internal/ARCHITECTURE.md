# Architecture Documentation

Architecture overview for @dkmaker/ai-debug.

## System Overview

The AI Debug system is built around a template-based architecture that provides
intelligent debugging, caching, and logging capabilities. The core design principles are:

- **Template-driven**: All debugging operations use templates for consistency
- **Minimal footprint**: Most functionality lives in node_modules, not user repos
- **Production-safe**: Debug code can be automatically removed for production
- **AI-optimized**: Structured data formatted for AI assistant consumption

## Core Components

## Data Structures

### Debug System

#### DebugContext

Context information passed to debug operations.

#### DebugResult

Result information from a debug operation.

#### DebugEntry

A single debug log entry representing one wrapped operation.

#### TypedDebugEntry

Type-safe version of DebugEntry with generic data type.

#### DebugCall

Represents a single debug.wrap() or debug.raw() call in the code.

### Caching

#### CacheMetadata

Metadata for cache entries and statistics.

#### CacheEntry

Cache entry stored on disk.

#### CacheOptions

Options for controlling caching behavior in templates.

### Logging

#### LogOptions

Options for controlling logging behavior in templates.

### Templates

#### Template

Template definition for customizing debug behavior.

#### TemplateCoverage

Usage statistics for a specific debug template.

#### TemplateUsage

Detailed usage information for a debug template.

#### ClaudeCommandTemplate

Predefined Claude command template for AI-assisted development.

### General

#### WrapOptions

Options passed to the wrap() method.

#### MultiAudienceGenOptions

Configuration for multi-audience documentation generation.

#### GeneratedDocs

Generated documentation files and their metadata.

#### GeneratedFile

Information about a generated documentation file.

#### GenerationStats

Statistics about the documentation generation process.

#### MermaidGenOptions

Configuration for Mermaid diagram generation.

#### GeneratedDiagram

Generated Mermaid diagram information.

#### MermaidGenResult

Result of Mermaid diagram generation.

#### JSDocEntry

Comprehensive JSDoc documentation extracted from code.

#### JSDocParameter

Parameter documentation from JSDoc.

#### JSDocReturn

Return value documentation from JSDoc.

#### JSDocExample

Code example from JSDoc @example tag.

#### JSDocThrows

Exception documentation from JSDoc @throws tag.

#### JSDocWorkflow

Workflow information for implementation guides.

#### JSDocWorkflowStep

Individual workflow step.

#### JSDocClaude

Claude-specific metadata for AI optimization.

#### DocGenOptions

Options for AI documentation generation.

#### ProjectAnalysis

Complete analysis results for a project's debug usage.

#### Pattern

Represents a usage pattern identified in the project.

#### Suggestion

Improvement suggestion for better debug coverage.

#### CoverageReport

Comprehensive coverage report for debug usage.

#### FileCoverage

Coverage statistics for a single file.

#### ClaudeCommandGenOptions

Configuration for Claude command generation.

#### ClaudeWorkflowStep

Workflow step for Claude commands.

#### ClaudeCodeExample

Code example for Claude commands.

#### GeneratedClaudeCommands

Generated Claude command files information.

#### ActionMapEntry

Configuration for a specific action in the action map.

#### ActionMap

Map of action names to their debug configurations.

### Error Handling

#### HttpError

Error type definitions for better type safety in templates.

#### DatabaseError

Database error with SQL-specific information.

#### FileSystemError

File system error with OS-specific codes.

#### BusinessError

Business logic error with validation details.

## Implementation Patterns

### Template Pattern

The system uses a template pattern to standardize debugging across different operation types:

```typescript
interface Template {
  extends?: string;  // Template inheritance
  debugData: (context, result, error) => any;
  cache?: CacheOptions;
  log?: LogOptions;
}
```

### Wrapper Pattern

All debugging is done through the wrapper pattern for consistency:

```typescript
const result = await debug.wrap("action_name", async () => {
  // Your operation here
}, { template: "template_name" });
```

### Singleton Logger

A singleton logger prevents file lock conflicts across multiple debug instances:

- Thread-safe file writing with queue-based batching
- Automatic log rotation and compression
- Multiple output formats (JSON, pretty, custom)
