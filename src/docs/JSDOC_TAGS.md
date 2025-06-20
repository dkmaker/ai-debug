# Custom JSDoc Tags Reference

This document describes the custom JSDoc tags supported by the AI Debug documentation system. These tags extend standard JSDoc to provide AI-optimized documentation and workflow information.

## Standard JSDoc Tags

The system supports all standard JSDoc tags:

- `@param {type} name - description` - Parameter documentation
- `@returns {type} description` - Return value documentation
- `@throws {ErrorType} description` - Exception documentation
- `@example` - Code examples
- `@see reference` - Cross-references
- `@since version` - Version information
- `@deprecated message` - Deprecation notice

## Custom Tags

### @audience

Specifies the target audience for documentation generation.

**Syntax:**
```javascript
/**
 * @audience internal|external|both
 */
```

**Values:**
- `internal` - Only include in internal developer documentation
- `external` - Only include in external user documentation  
- `both` - Include in both internal and external documentation (default)

**Example:**
```javascript
/**
 * Internal debugging utility function.
 * @audience internal
 */
function debugInternals() {
  // Implementation details
}

/**
 * Main API function for users.
 * @audience external
 */
export function createDebugger() {
  // Public API
}
```

### @workflow

Defines a workflow identifier for process documentation.

**Syntax:**
```javascript
/**
 * @workflow "workflow-id"
 */
```

**Example:**
```javascript
/**
 * Processes user data with validation.
 * @workflow "user-data-processing"
 */
async function processUser(userData) {
  // Implementation
}
```

### @workflow-step

Defines individual steps in a workflow process.

**Syntax:**
```javascript
/**
 * @workflow-step order "description" [code-example]
 */
```

**Example:**
```javascript
/**
 * Main debug wrapper function.
 * @workflow "debug-wrapping"
 * @workflow-step 1 "Initialize debug context"
 * @workflow-step 2 "Execute wrapped function" 
 * @workflow-step 3 "Process result and generate debug data"
 * @workflow-step 4 "Update cache and persist data"
 */
async function wrap(action, fn, options) {
  // Implementation
}
```

### @diagram

Specifies a Mermaid diagram associated with this element.

**Syntax:**
```javascript
/**
 * @diagram "diagram-name"
 */
```

**Example:**
```javascript
/**
 * Cache management system.
 * @workflow "cache-operations"
 * @diagram "cache-flow"
 */
class CacheManager {
  // Implementation
}
```

### Claude-Specific Tags

#### @claude-command

Associates this element with a Claude command file.

**Syntax:**
```javascript
/**
 * @claude-command "command-name"
 */
```

**Example:**
```javascript
/**
 * Implements caching strategy.
 * @claude-command "implement-cache"
 */
function setupCache(options) {
  // Implementation
}
```

#### @claude-example

Provides a Claude-specific implementation example.

**Syntax:**
```javascript
/**
 * @claude-example "example-name"
 */
```

**Example:**
```javascript
/**
 * Debug wrapper utility.
 * @claude-example "add-debug-wrapper"
 */
function wrapWithDebug(fn, options) {
  // Implementation
}
```

#### @claude-pattern

Defines usage patterns for Claude AI assistance.

**Syntax:**
```javascript
/**
 * @claude-pattern "pattern description"
 */
```

**Example:**
```javascript
/**
 * HTTP request handler.
 * @claude-pattern "Always wrap HTTP calls with debug.wrap()"
 * @claude-pattern "Include URL and method in context"
 * @claude-pattern "Use http template for automatic caching"
 */
async function makeRequest(url, options) {
  // Implementation
}
```

#### @claude-context

Provides context hints for AI understanding.

**Syntax:**
```javascript
/**
 * @claude-context "context information"
 */
```

**Example:**
```javascript
/**
 * Advanced configuration options.
 * @claude-context "This is used for fine-tuning performance and behavior"
 */
interface AdvancedConfig {
  // Properties
}
```

## Complete Example

Here's a comprehensive example showing multiple custom tags:

```javascript
/**
 * Main debug wrapper that tracks async operations with caching and logging.
 * 
 * This is the primary entry point for adding debug tracking to any async operation.
 * It provides automatic caching, error handling, and performance metrics.
 * 
 * @param {string} action - Unique identifier for this operation
 * @param {Function} fn - Async function to wrap and track
 * @param {WrapOptions} [options] - Configuration options
 * @returns {Promise<any>} Result of the wrapped function
 * @throws {Error} If the wrapped function throws or debug system fails
 * 
 * @audience both
 * @workflow "debug-wrapping"
 * @workflow-step 1 "Initialize debug context with action and options"
 * @workflow-step 2 "Check cache for existing result if caching enabled"
 * @workflow-step 3 "Execute wrapped function with error handling"
 * @workflow-step 4 "Process result data using selected template"
 * @workflow-step 5 "Update cache and persist debug data"
 * @diagram "debug-wrapper-flow"
 * 
 * @claude-command "add-debug"
 * @claude-example "wrap-async-operation"
 * @claude-pattern "Use specific templates for better categorization"
 * @claude-pattern "Include relevant context for debugging"
 * @claude-pattern "Wrap at the right granularity level"
 * @claude-context "This is the core debugging function - use it for all async operations"
 * 
 * @since 0.1.0
 * 
 * @example
 * ```typescript
 * // Basic usage with HTTP template
 * const userData = await debug.wrap('fetch_user', async () => {
 *   return await apiClient.get(`/users/${userId}`);
 * }, {
 *   template: 'http',
 *   context: { userId, endpoint: '/users' }
 * });
 * ```
 * 
 * @example
 * ```typescript
 * // Database operation with custom cache TTL
 * const products = await debug.wrap('fetch_products', async () => {
 *   return await db.query('SELECT * FROM products WHERE active = ?', [true]);
 * }, {
 *   template: 'database',
 *   context: { table: 'products', operation: 'SELECT' },
 *   cache: { ttl: 5 * 60 * 1000 } // 5 minutes
 * });
 * ```
 */
export async function wrap(action: string, fn: Function, options?: WrapOptions): Promise<any> {
  // Implementation here
}
```

## Usage in Documentation Generation

These custom tags are automatically processed during documentation generation:

1. **@audience** - Controls which documentation includes the element
2. **@workflow/@workflow-step** - Generates step-by-step implementation guides
3. **@diagram** - Links to Mermaid diagrams for visual documentation
4. **Claude tags** - Creates AI-optimized command files and examples

The tags work together to create comprehensive, multi-audience documentation that serves both human developers and AI assistants.

## Best Practices

1. **Use @audience appropriately** - Mark internal implementation details as `internal`
2. **Create meaningful workflows** - Break complex processes into clear steps
3. **Provide Claude context** - Help AI understand the purpose and usage patterns
4. **Include relevant examples** - Show practical usage for each audience
5. **Link diagrams to workflows** - Visual documentation enhances understanding

## Integration with AI Assistants

The custom tags are specifically designed to enhance AI assistant capabilities:

- **Claude Code** can use workflow steps as implementation guides
- **GitHub Copilot** benefits from clear patterns and examples  
- **Cursor** uses context hints for better code suggestions
- **Any AI** can understand the intended audience and usage patterns

This creates a documentation system that works for both human developers and AI assistants, improving development velocity and code quality.