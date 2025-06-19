import type { DocGenOptions, ProjectAnalysis } from '../generator.js';

/**
 * Documentation template for Claude AI assistant.
 * Generates CLAUDE.md file optimized for Claude's understanding.
 *
 * @const claudeTemplate
 *
 * Features:
 * - Structured markdown format
 * - Clear section organization
 * - Comprehensive examples
 * - Debug pattern documentation
 * - Template usage guides
 * - Project-specific patterns
 *
 * Generated sections:
 * - Project overview and stats
 * - Available debug commands
 * - Template documentation
 * - Usage patterns detected
 * - Optimization suggestions
 * - Coverage report
 * - Guidelines and best practices
 * - Performance considerations
 *
 * The template uses AI-DEBUG-START/END markers
 * to delineate AI-specific content.
 *
 * @example
 * // Used internally by docs:generate command
 * await generator.generate({
 *   format: 'claude',
 *   output: './CLAUDE.md'
 * });
 */
export const claudeTemplate = {
  async generate(analysis: ProjectAnalysis, _options: DocGenOptions): Promise<string> {
    const sections = [
      this.generateHeader(),
      this.generateOverview(analysis),
      this.generateCommands(),
      this.generateTemplates(analysis),
      this.generatePatterns(analysis),
      this.generateSuggestions(analysis),
      this.generateCoverage(analysis),
      this.generateGuidelines(),
      this.generatePerformance(analysis),
    ];

    return sections.join('\n\n');
  },

  generateHeader(): string {
    return `# CLAUDE.md - AI Debug System Guide

This file provides guidance to Claude Code when working with the debug system in this repository.

<!-- AI-DEBUG-START -->`;
  },

  generateOverview(analysis: ProjectAnalysis): string {
    const coverage = analysis.coverage.overall.toFixed(1);
    return `## Debug System Overview

This project uses @dkmaker/ai-debug for comprehensive debugging and caching.
- **Version**: 0.1.0
- **Configuration**: .ai-debug/config.json
- **Debug Coverage**: ${coverage}% of async operations
- **Total Debug Calls**: ${analysis.debugCalls.length}

### Quick Stats
- Wrapped operations: ${analysis.coverage.asyncOperations.wrapped}
- Unwrapped operations: ${analysis.coverage.asyncOperations.total - analysis.coverage.asyncOperations.wrapped}
- Most used template: ${analysis.templates[0]?.name || 'base'} (${analysis.templates[0]?.usage || 0} times)`;
  },

  generateCommands(): string {
    return `### Essential Debug Commands

\`\`\`bash
# View and analyze debug data
npx ai-debug view <action>      # View specific debug entry
npx ai-debug list               # List all debug entries
npx ai-debug search <pattern>   # Search debug data
npx ai-debug stats              # Show statistics

# Code analysis
npx ai-debug analyze            # Analyze usage patterns
npx ai-debug coverage           # Show debug coverage
npx ai-debug suggest            # Suggest optimizations

# Documentation
npx ai-debug docs:generate      # Generate AI documentation
npx ai-debug docs:generate --update  # Update existing docs
\`\`\``;
  },

  generateTemplates(analysis: ProjectAnalysis): string {
    const builtinTemplates = analysis.templates.filter((t) => t.type === 'builtin');
    const customTemplates = analysis.templates.filter((t) => t.type === 'custom');

    let content = `### Available Templates

**Built-in Templates:**`;

    builtinTemplates.forEach((template) => {
      const usage = template.usage > 0 ? ` (used ${template.usage} times)` : ' (unused)';
      content += `\n- \`${template.name}\`${usage}`;

      // Add description based on template name
      const descriptions: Record<string, string> = {
        http: ': HTTP/REST API calls with automatic caching',
        database: ': Database queries with performance metrics',
        file: ': File I/O operations tracking',
        queue: ': Message queue operations',
        business: ': Business logic operations',
        auto: ': Automatic object inspection',
        base: ': Base template for general operations',
      };

      if (descriptions[template.name]) {
        content += descriptions[template.name];
      }
    });

    if (customTemplates.length > 0) {
      content += '\n\n**Custom Templates in this project:**';
      customTemplates.forEach((template) => {
        content += `\n- \`${template.name}\` (used ${template.usage} times)`;
      });
    }

    return content;
  },

  generatePatterns(analysis: ProjectAnalysis): string {
    if (analysis.patterns.length === 0) {
      return `### Common Usage Patterns

No significant patterns detected yet. As you add more debug calls, patterns will be identified here.`;
    }

    let content = '### Common Usage Patterns';

    const commonPatterns = analysis.patterns.filter((p) => p.type === 'common');
    const antiPatterns = analysis.patterns.filter((p) => p.type === 'antipattern');

    if (commonPatterns.length > 0) {
      content += '\n\n**Detected Patterns:**';
      commonPatterns.forEach((pattern, index) => {
        content += `\n\n**Pattern ${index + 1}: ${pattern.name}** (found in ${pattern.occurrences} places)`;
        if (pattern.example) {
          content += `\n\`\`\`javascript
/*DEBUG:START*/
const result = await debug.wrap('${pattern.example}', async () => {
  // Your implementation
}, { template: 'base' });
/*DEBUG:END*/
\`\`\``;
        }
        content += `\nFiles: ${pattern.files.slice(0, 3).join(', ')}${pattern.files.length > 3 ? ', ...' : ''}`;
      });
    }

    if (antiPatterns.length > 0) {
      content += '\n\n**⚠️ Anti-patterns Detected:**';
      antiPatterns.forEach((pattern) => {
        content += `\n- **${pattern.name}**: ${pattern.description} (${pattern.occurrences} occurrences)`;
      });
    }

    return content;
  },

  generateSuggestions(analysis: ProjectAnalysis): string {
    if (analysis.suggestions.length === 0) {
      return `### Suggested Debug Points

No suggestions at this time. The codebase appears to have good debug coverage.`;
    }

    let content = `### Suggested Debug Points

Based on analysis, consider adding debug wrapping to:`;

    const highPriority = analysis.suggestions.filter((s) => s.priority === 'high').slice(0, 5);
    const mediumPriority = analysis.suggestions.filter((s) => s.priority === 'medium').slice(0, 3);

    if (highPriority.length > 0) {
      content += '\n\n**🔴 High Priority:**';
      highPriority.forEach((suggestion, index) => {
        content += `\n${index + 1}. \`${suggestion.file}:${suggestion.line}\` - \`${suggestion.function}\``;
        content += `\n   - Reason: ${suggestion.reason}`;
        content += `\n   - Suggested template: \`${suggestion.suggestedTemplate}\``;
      });
    }

    if (mediumPriority.length > 0) {
      content += '\n\n**🟡 Medium Priority:**';
      mediumPriority.forEach((suggestion, index) => {
        content += `\n${index + 1}. \`${suggestion.file}:${suggestion.line}\` - \`${suggestion.function}\``;
        content += `\n   - Suggested template: \`${suggestion.suggestedTemplate}\``;
      });
    }

    return content;
  },

  generateCoverage(analysis: ProjectAnalysis): string {
    const topFiles = analysis.coverage.byFile
      .sort((a, b) => b.debugCalls - a.debugCalls)
      .slice(0, 5);

    const lowCoverageFiles = analysis.coverage.byFile
      .filter((f) => f.coverage < 50 && f.asyncCalls > 0)
      .sort((a, b) => a.coverage - b.coverage)
      .slice(0, 5);

    let content = `### Debug Coverage Report

**Overall Coverage: ${analysis.coverage.overall.toFixed(1)}%**
- Total async operations: ${analysis.coverage.asyncOperations.total}
- Wrapped operations: ${analysis.coverage.asyncOperations.wrapped}
- Unwrapped operations: ${analysis.coverage.asyncOperations.total - analysis.coverage.asyncOperations.wrapped}

**Template Distribution:**`;

    analysis.coverage.byTemplate.forEach((template) => {
      content += `\n- ${template.template}: ${template.count} calls (${template.percentage.toFixed(1)}%)`;
    });

    if (topFiles.length > 0) {
      content += '\n\n**Most Debugged Files:**';
      topFiles.forEach((file) => {
        content += `\n- ${file.file}: ${file.debugCalls} debug calls (${file.coverage.toFixed(1)}% coverage)`;
      });
    }

    if (lowCoverageFiles.length > 0) {
      content += '\n\n**⚠️ Files Needing Attention (< 50% coverage):**';
      lowCoverageFiles.forEach((file) => {
        content += `\n- ${file.file}: ${file.coverage.toFixed(1)}% coverage (${file.debugCalls}/${file.asyncCalls} operations)`;
      });
    }

    return content;
  },

  generateGuidelines(): string {
    return `### Debug Wrapping Guidelines

When adding debug wrapping:
1. **Use the most specific template available** - Don't default to 'base' if a more specific template fits
2. **Always wrap async operations that:**
   - Make external API calls → use \`http\` template
   - Perform database operations → use \`database\` template
   - Process large datasets → use \`business\` template
   - Have performance implications → include timing context
3. **Include relevant context data** - This helps with debugging and analysis
4. **Use /*DEBUG:START*/ and /*DEBUG:END*/ markers** - These are removed in production builds

### Example Debug Wrapping

\`\`\`javascript
// ✅ Good - Specific template with context
/*DEBUG:START*/
const users = await debug.wrap('fetch_active_users', async () => {
  return await db.query('SELECT * FROM users WHERE active = ?', [true]);
}, { 
  template: 'database',
  context: { 
    table: 'users',
    filters: { active: true }
  }
});
/*DEBUG:END*/

// ❌ Bad - Generic template, no context
const users = await debug.wrap('get_users', async () => {
  return await db.query('SELECT * FROM users WHERE active = ?', [true]);
});
\`\`\``;
  },

  generatePerformance(analysis: ProjectAnalysis): string {
    // Calculate cache hit rate if available
    const cacheInfo = analysis.debugCalls.filter(
      (c) => c.template === 'http' || c.template === 'database',
    ).length;
    const estimatedCacheRate = cacheInfo > 10 ? '~60-70%' : 'Not enough data';

    return `### Performance Considerations

- **Debug code is automatically removed in production builds**
- **Caching is enabled by default for read operations**
- **Estimated cache hit rate**: ${estimatedCacheRate}
- **Average debug overhead**: <2ms per operation
- **File logging uses singleton pattern** to prevent lock conflicts

### Optimization Tips
1. Use specific templates - they're pre-optimized for their use case
2. Enable caching for expensive read operations
3. Use \`raw\` mode sparingly - it has higher overhead
4. Batch debug entries when possible to reduce I/O

<!-- AI-DEBUG-END -->`;
  },
};
