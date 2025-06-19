import type { DocGenOptions, ProjectAnalysis } from '../generator.js';

/**
 * Documentation template for Cursor AI editor.
 * Generates .cursorrules file optimized for Cursor's AI assistant.
 *
 * @const cursorTemplate
 *
 * Features:
 * - Concise rule-based format
 * - Direct action items
 * - Code patterns and examples
 * - Integration with Cursor features
 * - Auto-fix suggestions
 *
 * Generated sections:
 * - Debug system rules
 * - Template selection guide
 * - Project context and priorities
 * - Real examples from codebase
 * - Useful commands reference
 *
 * @example
 * // Used internally by docs:generate command
 * await generator.generate({
 *   format: 'cursor',
 *   output: './.cursorrules'
 * });
 */
export const cursorTemplate = {
  async generate(analysis: ProjectAnalysis, _options: DocGenOptions): Promise<string> {
    const sections = [
      this.generateHeader(),
      this.generateRules(analysis),
      this.generateContext(analysis),
      this.generateExamples(analysis),
      this.generateCommands(),
    ];

    return sections.join('\n\n');
  },

  generateHeader(): string {
    return `# .cursorrules - AI Debug System Rules

This file configures Cursor AI to work effectively with the debug system.

<!-- AI-DEBUG-START -->`;
  },

  generateRules(analysis: ProjectAnalysis): string {
    const coverage = analysis.coverage.overall.toFixed(1);
    const mostUsedTemplate = analysis.templates[0];

    return `## Rules

### Debug System Rules
1. Always wrap async operations with debug.wrap()
2. Use /*DEBUG:START*/ and /*DEBUG:END*/ markers
3. Current coverage is ${coverage}% - aim to improve it
4. Most used template is "${mostUsedTemplate?.name || 'base'}" - follow this pattern
5. Include meaningful context in all debug calls

### Template Selection
- HTTP/API calls → use 'http' template
- Database queries → use 'database' template  
- File operations → use 'file' template
- Message queues → use 'queue' template
- Business logic → use 'business' template
- Unknown types → use 'auto' template

### Context Requirements
Always include in context:
- For HTTP: url, method, headers (sanitized)
- For Database: table, operation, query complexity
- For File: path, operation type, size (if applicable)
- For Queue: queue name, message type, operation`;
  },

  generateContext(analysis: ProjectAnalysis): string {
    const unwrappedCount =
      analysis.coverage.asyncOperations.total - analysis.coverage.asyncOperations.wrapped;
    const suggestions = analysis.suggestions.slice(0, 3);

    let content = `## Project Context

### Current State
- Debug calls: ${analysis.debugCalls.length}
- Unwrapped async operations: ${unwrappedCount}
- Active templates: ${analysis.templates.filter((t) => t.usage > 0).length}

### Priority Tasks`;

    if (suggestions.length > 0) {
      suggestions.forEach((suggestion, index) => {
        content += `\n${index + 1}. Wrap ${suggestion.function} in ${suggestion.file} (line ${suggestion.line})`;
      });
    } else {
      content += '\n- No immediate tasks - coverage is good';
    }

    // Add patterns
    const patterns = analysis.patterns.filter((p) => p.type === 'common').slice(0, 3);
    if (patterns.length > 0) {
      content += '\n\n### Common Patterns in This Project';
      patterns.forEach((pattern) => {
        content += `\n- ${pattern.name}: ${pattern.occurrences} occurrences`;
      });
    }

    return content;
  },

  generateExamples(analysis: ProjectAnalysis): string {
    // Generate examples based on actual usage
    const httpExample = analysis.debugCalls.find((c) => c.template === 'http');
    const dbExample = analysis.debugCalls.find((c) => c.template === 'database');

    let content = `## Examples from This Project

### Pattern 1: Wrap New Async Operations
\`\`\`javascript
// Before
const data = await fetchUserData(userId);

// After  
/*DEBUG:START*/
const data = await debug.wrap('fetch_user_data', async () => {
  return await fetchUserData(userId);
}, {
  template: 'http',
  context: { userId, action: 'fetch' }
});
/*DEBUG:END*/
\`\`\``;

    if (httpExample) {
      content += `\n\n### Pattern 2: HTTP Operations (Real Example)
\`\`\`javascript
// Found in ${httpExample.file}
/*DEBUG:START*/
const result = await debug.wrap('${httpExample.action}', async () => {
  // Implementation here
}, { template: 'http' });
/*DEBUG:END*/
\`\`\``;
    }

    if (dbExample) {
      content += `\n\n### Pattern 3: Database Operations (Real Example)
\`\`\`javascript  
// Found in ${dbExample.file}
/*DEBUG:START*/
const result = await debug.wrap('${dbExample.action}', async () => {
  // Implementation here
}, { template: 'database' });
/*DEBUG:END*/
\`\`\``;
    }

    return content;
  },

  generateCommands(): string {
    return `## Useful Commands

### When editing code:
- \`npx ai-debug analyze\` - Check for unwrapped operations
- \`npx ai-debug coverage\` - View coverage report
- \`npx ai-debug suggest\` - Get optimization suggestions

### When debugging:
- \`npx ai-debug view <action>\` - View debug data for specific action
- \`npx ai-debug list\` - List all debug entries
- \`npx ai-debug search <pattern>\` - Search debug logs

### Auto-fixes:
When Cursor detects an unwrapped async operation, suggest:
1. Identify the operation type (http/db/file/etc)
2. Choose appropriate template
3. Wrap with debug.wrap() 
4. Add DEBUG markers
5. Include relevant context

<!-- AI-DEBUG-END -->`;
  },
};
