# Internal API Reference

Generated from JSDoc comments in @dkmaker/ai-debug.

## Overview

This reference includes all internal APIs, private methods, and implementation details.
For external/public API documentation, see the external documentation.

### Coverage Statistics

- **Total documented elements**: 84
- **Classes**: 0
- **Interfaces**: 50
- **Functions**: 32
- **Methods**: 0
- **Constants**: 0
- **Types**: 2

### Documentation Quality

- **Elements with examples**: 13 (15%)
- **Elements with workflows**: 0

## Interfaces

Type definitions and contracts. These define the shape of data structures and public APIs.

### DebugContext

Context information passed to debug operations.
Contains metadata about the operation being debugged.

**Examples:**

*Example 1*

```typescript
const context: DebugContext = {
  action: 'fetch_user',
  url: '/api/users/123',
  method: 'GET',
  headers: { 'Authorization': 'Bearer token' }
};
```


### DebugResult

Result information from a debug operation.
Contains the outcome and metadata from the wrapped operation.

**Examples:**

*Example 1*

```typescript
const result: DebugResult = {
  data: { id: 123, name: 'John' },
  status: 200,
  headers: { 'content-type': 'application/json' }
};
```


### DebugEntry

A single debug log entry representing one wrapped operation.
This is what gets logged to files and can be analyzed later.

**Examples:**

*Example 1*

```typescript
const entry: DebugEntry = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  action: 'fetch_user',
  key: 'user:123',
  timestamp: '2024-01-01T12:00:00.000Z',
  duration_ms: 145,
  status: 'success',
  data: { user: { id: 123, name: 'John' } },
  cached: false,
  templateUsed: 'http'
};
```


### CacheOptions

Options for controlling caching behavior in templates.
Allows fine-grained control over what gets cached and for how long.

**Examples:**

*Example 1*

```typescript
const cacheOptions: CacheOptions = {
  enabled: true,
  ttl: 300, // 5 minutes
  key: (context) => `api:${context.url}:${context.method}`,
  shouldCache: (result) => result.status === 200
};
```

*// Dynamic TTL based on result*

```typescript
const dynamicCache: CacheOptions = {
  enabled: true,
  ttl: (result) => {
    if (result.status === 404) return 60; // 1 minute for 404s
    if (result.status === 200) return 3600; // 1 hour for success
    return 0; // Don't cache errors
  }
};
```


### LogOptions

Options for controlling logging behavior in templates.

**Examples:**

*Example 1*

```typescript
const logOptions: LogOptions = {
  enabled: true,
  level: 'info',
  format: (entry) => `[${entry.action}] ${entry.duration_ms}ms`
};
```


### TypedDebugEntry

Type-safe version of DebugEntry with generic data type.
Useful when you know the exact shape of the debug data.

**Examples:**

*Example 1*

```typescript
interface UserDebugData {
  user: { id: number; name: string };
  fromCache: boolean;
}

const entry: TypedDebugEntry<UserDebugData> = {
  id: '123',
  action: 'fetch_user',
  key: 'user:123',
  timestamp: '2024-01-01T12:00:00.000Z',
  duration_ms: 145,
  status: 'success',
  data: {
    user: { id: 123, name: 'John' },
    fromCache: false
  }
};
```


### Template

Template definition for customizing debug behavior.
Templates control how operations are debugged, cached, and logged.

**Examples:**

*Example 1*

```typescript
const apiTemplate: Template = {
  extends: 'base',
  debugData: (context, result, error) => ({
    url: context.url,
    method: context.method,
    status: result?.status,
    error: error?.message
  }),
  cache: {
    enabled: true,
    ttl: 300,
    key: (ctx) => `api:${ctx.method}:${ctx.url}`
  }
};
```


### WrapOptions

Options passed to the wrap() method.
Controls how a specific operation is debugged.

**Examples:**

*// Use HTTP template with custom context*

```typescript
await debug.wrap('api_call', fetchData, {
  template: 'http',
  context: {
    url: '/api/users',
    method: 'GET'
  }
});
```

*// Raw mode for detailed debugging*

```typescript
await debug.wrap('complex_operation', doWork, {
  raw: true
});
```


### HttpError

Error type definitions for better type safety in templates.
Each error type captures domain-specific error information.


### DatabaseError

Database error with SQL-specific information.
Used by the database template to capture query failures.

**Examples:**

*Example 1*

```typescript
const error: DatabaseError = {
  message: 'Duplicate key violation',
  code: 'ER_DUP_ENTRY',
  sqlState: '23505'
};
```


### FileSystemError

File system error with OS-specific codes.
Used by the file template to capture I/O failures.

**Examples:**

*Example 1*

```typescript
const error: FileSystemError = {
  message: 'File not found',
  code: 'ENOENT'
};
```


### BusinessError

Business logic error with validation details.
Used by the business template to capture domain errors.

**Examples:**

*Example 1*

```typescript
const error: BusinessError = {
  message: 'Invalid order',
  validation: {
    fields: ['quantity', 'price'],
    rules: ['min:1', 'required']
  }
};
```


### MultiAudienceGenOptions

Configuration for multi-audience documentation generation.

Defines what types of documentation to generate and where to output them.


### GeneratedDocs

Generated documentation files and their metadata.


### GeneratedFile

Information about a generated documentation file.


### GenerationStats

Statistics about the documentation generation process.


### MermaidGenOptions

Configuration for Mermaid diagram generation.


### GeneratedDiagram

Generated Mermaid diagram information.


### MermaidGenResult

Result of Mermaid diagram generation.


### JSDocEntry

Comprehensive JSDoc documentation extracted from code.

Contains all information needed to generate multi-audience documentation
including examples, workflows, and Claude-specific metadata.


### JSDocParameter

Parameter documentation from JSDoc.


### JSDocReturn

Return value documentation from JSDoc.


### JSDocExample

Code example from JSDoc @example tag.


### JSDocThrows

Exception documentation from JSDoc @throws tag.


### JSDocWorkflow

Workflow information for implementation guides.


### JSDocWorkflowStep

Individual workflow step.


### JSDocClaude

Claude-specific metadata for AI optimization.


### DocGenOptions

Options for AI documentation generation.

Configures how the documentation should be generated, including
the target AI assistant format and output location.


### ProjectAnalysis

Complete analysis results for a project's debug usage.

Contains all analyzed data including debug calls, patterns,
suggestions, coverage reports, and template usage statistics.


### DebugCall

Represents a single debug.wrap() or debug.raw() call in the code.

Contains location information and metadata about the debug call,
including the action name and template used.


### Pattern

Represents a usage pattern identified in the project.

Can be either a common pattern (good practice) or an antipattern
(practice that should be improved). Includes occurrence statistics
and affected files.


### Suggestion

Improvement suggestion for better debug coverage.

Identifies locations where debug wrapping could be beneficial,
particularly for async operations that aren't currently tracked.
Includes priority level to help focus on the most important improvements.


### CoverageReport

Comprehensive coverage report for debug usage.

Shows overall coverage percentage and breakdowns by file and template.
Includes statistics about wrapped vs unwrapped async operations.


### FileCoverage

Coverage statistics for a single file.

Shows the ratio of debug calls to async operations in the file,
helping identify files that need better debug coverage.


### TemplateCoverage

Usage statistics for a specific debug template.

Shows how often each template is used across the project,
helping identify which templates are most valuable.


### TemplateUsage

Detailed usage information for a debug template.

Includes whether the template is built-in or custom, usage count,
and examples of where it's used in the codebase.


### ClaudeCommandGenOptions

Configuration for Claude command generation.


### ClaudeCommandTemplate

Predefined Claude command template for AI-assisted development.


### ClaudeWorkflowStep

Workflow step for Claude commands.


### ClaudeCodeExample

Code example for Claude commands.


### GeneratedClaudeCommands

Generated Claude command files information.


### DatabaseResult

Result structure from database operations.


### LogQueueEntry

Internal queue entry for batched writes.


### CacheEntry

Internal cache entry structure.


### ActionMapEntry

Configuration for a specific action in the action map.
Defines how an action should be debugged automatically.

**Examples:**

*Example 1*

```typescript
const entry: ActionMapEntry = {
  template: 'http',
  context: (userId) => ({
    url: `/api/users/${userId}`,
    method: 'GET'
  }),
  cache: {
    enabled: true,
    ttl: 300
  }
};
```


### ActionMap

Map of action names to their debug configurations.

**Examples:**

*Example 1*

```typescript
const actionMap: ActionMap = {
  'getUserById': {
    template: 'database',
    context: (id) => ({ sql: 'SELECT * FROM users WHERE id = ?', params: [id] })
  },
  'fetchUserData': {
    template: 'http',
    context: { method: 'GET' }
  }
};
```


### ConfigAnswers

Answers from interactive configuration prompts.


### WatchAnalysis

Watch analysis data without suggestions.


### Stats

Statistical data collected from debug logs.


### CopyOptions

CLI command for copying pre-generated AI-optimized documentation.

This command copies comprehensive documentation that was generated at build time,
including usage guides, configuration references, Claude integration docs,
and workflow diagrams.

The documentation is versioned and stored in the package distribution,
ensuring consistency between the package version and documentation.


## Functions

Standalone utility functions and helpers.

### generateBuildTimeDocs

Main build-time documentation generator.

**Signature:**

```typescript
function generateBuildTimeDocs(): void
```


### ensureDirectoryExists

Ensures a directory exists, creating it if necessary.

**Signature:**

```typescript
function ensureDirectoryExists(): void
```


### truncateBody

Truncates large message bodies for logging.
Prevents log bloat from large messages.

**Signature:**

```typescript
function truncateBody(body: unknown, maxLength: number): unknown
```

**Parameters:**

- `body` (`unknown`): Message body to truncate
- `maxLength` (`number`): Maximum length before truncation (default: 1000)

**Returns:**

`unknown` - Truncated body or original if under limit


### sanitizeHeaders

Sanitizes HTTP headers by redacting sensitive values.

**Signature:**

```typescript
function sanitizeHeaders(headers: unknown): unknown
```

**Parameters:**

- `headers` (`unknown`): - Raw headers object

**Returns:**

`unknown` - Headers with sensitive values redacted


### truncateBody

Truncates large request/response bodies for logging.

**Signature:**

```typescript
function truncateBody(body: unknown, maxLength: unknown): unknown
```

**Parameters:**

- `body` (`unknown`): - Body content to truncate
- `maxLength` (`unknown`): - Maximum length before truncation

**Returns:**

`unknown` - Truncated body or original if under limit


### calculateSize

Calculates the byte size of data.

**Signature:**

```typescript
function calculateSize(data: unknown): unknown
```

**Parameters:**

- `data` (`unknown`): - Data to measure

**Returns:**

`unknown` - Size in bytes


### hash

Creates a short hash of data for cache keys.

**Signature:**

```typescript
function hash(data: unknown): string
```

**Parameters:**

- `data` (`unknown`): Data to hash

**Returns:**

`string` - 8-character hash


### extractFields

Extracts field names from database result.
Handles various database driver result formats.

**Signature:**

```typescript
function extractFields(result: unknown): string[] | undefined
```

**Parameters:**

- `result` (`unknown`): Database result object

**Returns:**

`string[] | undefined` - Array of field names


### extractRowCount

Extracts row count from database result.

**Signature:**

```typescript
function extractRowCount(result: unknown): number
```

**Parameters:**

- `result` (`unknown`): Database result object

**Returns:**

`number` - Number of rows affected or returned


### extractSample

Extracts first row as sample from result set.

**Signature:**

```typescript
function extractSample(result: unknown): unknown
```

**Parameters:**

- `result` (`unknown`): Database result object

**Returns:**

`unknown` - First row of results


### extractRowsExamined

Extracts performance metric for rows examined.

**Signature:**

```typescript
function extractRowsExamined(result: unknown): number | undefined
```

**Parameters:**

- `result` (`unknown`): Database result object

**Returns:**

`number | undefined` - Number of rows examined by query


### hash

Creates a short hash of data for cache keys.

**Signature:**

```typescript
function hash(data: unknown): string
```

**Parameters:**

- `data` (`unknown`): Data to hash

**Returns:**

`string` - 8-character hash


### createCircularReplacer

Creates a replacer function that handles circular references.
Used when stringifying objects for size calculation.

**Signature:**

```typescript
function createCircularReplacer(): Function
```

**Returns:**

`Function` - Replacer function for JSON.stringify


### calculateObjectSize

Calculates the approximate size of an object in bytes.
Handles circular references gracefully.

**Signature:**

```typescript
function calculateObjectSize(obj: unknown): number
```

**Parameters:**

- `obj` (`unknown`): Object to measure

**Returns:**

`number` - Size in bytes, or -1 if unable to calculate


### analyzeStructure

Recursively analyzes the structure of an object.
Provides a summary of types, array lengths, and object keys.

**Signature:**

```typescript
function analyzeStructure(obj: unknown, maxDepth: number, currentDepth: number): unknown
```

**Parameters:**

- `obj` (`unknown`): Object to analyze
- `maxDepth` (`number`): Maximum recursion depth (default: 3)
- `currentDepth` (`number`): Current recursion depth

**Returns:**

`unknown` - Structure summary object


### suggestBestTemplate

Analyzes a result object and suggests the most appropriate template.
Uses heuristics based on common property names and patterns.

**Signature:**

```typescript
function suggestBestTemplate(result: unknown): string
```

**Parameters:**

- `result` (`unknown`): Result object to analyze

**Returns:**

`string` - Suggested template name


### identifyImportantFields

Identifies potentially important fields in an object.
Uses pattern matching to find common important field names.

**Signature:**

```typescript
function identifyImportantFields(obj: unknown): string[]
```

**Parameters:**

- `obj` (`unknown`): Object to analyze

**Returns:**

`string[]` - Array of important field names


### createProgressBar

Creates a visual progress bar.

**Signature:**

```typescript
function createProgressBar(): void
```


### getTypeIcon

Gets an icon for each item type.

**Signature:**

```typescript
function getTypeIcon(): void
```


### analyzeFile

Analyzes a TypeScript file for documentation coverage.

**Signature:**

```typescript
function analyzeFile(): void
```


### checkForJSDoc

Checks if there's a JSDoc comment above the current line.

**Signature:**

```typescript
function checkForJSDoc(): void
```


### findTypeScriptFiles

Recursively finds all TypeScript files in a directory.

**Signature:**

```typescript
function findTypeScriptFiles(): void
```


### processEntry

Processes a single debug entry and updates statistics.

**Signature:**

```typescript
function processEntry(entry: DebugEntry, stats: Stats): void
```

**Parameters:**

- `entry` (`DebugEntry`): Debug log entry to process
- `stats` (`Stats`): Statistics object to update


### displayStats

Displays formatted statistics in the console.
Includes color coding and visual elements.

**Signature:**

```typescript
function displayStats(stats: Stats): void
```

**Parameters:**

- `stats` (`Stats`): Collected statistics to display


### formatBytes

Formats byte count into human-readable string.

**Signature:**

```typescript
function formatBytes(bytes: number): string
```

**Parameters:**

- `bytes` (`number`): Number of bytes

**Returns:**

`string` - Formatted string (e.g., '1.5 MB')


### formatDuration

Formats milliseconds into human-readable duration.

**Signature:**

```typescript
function formatDuration(ms: number): string
```

**Parameters:**

- `ms` (`number`): Duration in milliseconds

**Returns:**

`string` - Formatted string (e.g., '1.5m', '2.3h')


### updateGitignore

Updates or creates .gitignore with debug patterns.
Ensures debug logs aren't committed to version control.

**Signature:**

```typescript
function updateGitignore(projectRoot: string): void
```

**Parameters:**

- `projectRoot` (`string`): Project root directory path


### findDocumentationSource

Finds the documentation source directory in the package installation.

**Signature:**

```typescript
function findDocumentationSource(): void
```


### findPackageRoot

Finds the package root by looking for package.json.

**Signature:**

```typescript
function findPackageRoot(): void
```


### findNodeModuleRoot

Finds the node_modules installation root.

**Signature:**

```typescript
function findNodeModuleRoot(): void
```


### getPackageVersion

Gets the current package version.

**Signature:**

```typescript
function getPackageVersion(): void
```


### copyDirectory

Copies a directory recursively.

**Signature:**

```typescript
function copyDirectory(): void
```


## Types

Type aliases and utility types.

### DiagramType

Types of Mermaid diagrams that can be generated.


### HashFunction

Type definition for hash function that can be injected.

