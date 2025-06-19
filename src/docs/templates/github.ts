import type { DocGenOptions, ProjectAnalysis } from '../generator.js';

export const githubTemplate = {
  async generate(analysis: ProjectAnalysis, _options: DocGenOptions): Promise<string> {
    const sections = [
      this.generateHeader(),
      this.generateQuickStart(),
      this.generateTemplateReference(analysis),
      this.generateCodeSnippets(analysis),
      this.generateBestPractices(),
      this.generateMetrics(analysis),
    ];

    return sections.join('\n\n');
  },

  generateHeader(): string {
    return `# GitHub Copilot Debug Guide

This guide helps GitHub Copilot understand the debug system in this repository.

<!-- AI-DEBUG-START -->`;
  },

  generateQuickStart(): string {
    return `## Quick Start

### Import Debug Wrapper
\`\`\`javascript
import { debug } from './.ai-debug/wrapper.js';
\`\`\`

### Basic Usage
\`\`\`javascript
// Wrap async operations
const result = await debug.wrap('operation_name', async () => {
  // Your async code here
  return await someAsyncOperation();
}, { template: 'base' });
\`\`\`

### Common Templates
- \`http\` - For API calls
- \`database\` - For DB queries  
- \`file\` - For file operations
- \`queue\` - For message queues
- \`business\` - For business logic
- \`auto\` - For automatic detection`;
  },

  generateTemplateReference(analysis: ProjectAnalysis): string {
    let content = `## Template Reference

### HTTP Template
\`\`\`javascript
// API calls with automatic retry and caching
const data = await debug.wrap('fetch_user_data', async () => {
  return await axios.get(\`/api/users/\${userId}\`);
}, {
  template: 'http',
  context: { userId, endpoint: '/api/users' }
});
\`\`\`

### Database Template  
\`\`\`javascript
// SQL queries with performance tracking
const users = await debug.wrap('query_active_users', async () => {
  return await db.query('SELECT * FROM users WHERE active = ?', [true]);
}, {
  template: 'database',
  context: { table: 'users', operation: 'select' }
});
\`\`\`

### File Template
\`\`\`javascript
// File operations with size tracking
const content = await debug.wrap('read_config', async () => {
  return await fs.readFile('./config.json', 'utf-8');
}, {
  template: 'file',
  context: { path: './config.json', operation: 'read' }
});
\`\`\``;

    // Add custom templates if any
    const customTemplates = analysis.templates.filter((t) => t.type === 'custom' && t.usage > 0);
    if (customTemplates.length > 0) {
      content += '\n\n### Custom Templates';
      customTemplates.forEach((template) => {
        content += `\n- \`${template.name}\` - Used ${template.usage} times`;
      });
    }

    return content;
  },

  generateCodeSnippets(_analysis: ProjectAnalysis): string {
    const content = `## Code Snippets

### Snippet: Debug Wrap Async
\`\`\`javascript
/*DEBUG:START*/
const \${1:result} = await debug.wrap('\${2:action_name}', async () => {
  \${3:// Your async code here}
  return \${4:result};
}, {
  template: '\${5:base}',
  context: { \${6:} }
});
/*DEBUG:END*/
\`\`\`

### Snippet: Debug HTTP Call
\`\`\`javascript
/*DEBUG:START*/
const \${1:response} = await debug.wrap('\${2:fetch_}\${3:resource}', async () => {
  return await \${4:axios}.get('\${5:/api/}\${3:resource}');
}, {
  template: 'http',
  context: { 
    endpoint: '\${5:/api/}\${3:resource}',
    method: 'GET'
  }
});
/*DEBUG:END*/
\`\`\`

### Snippet: Debug Database Query
\`\`\`javascript
/*DEBUG:START*/
const \${1:result} = await debug.wrap('\${2:query_}\${3:table}', async () => {
  return await db.query('\${4:SELECT * FROM }\${3:table}\${5: WHERE ?}', [\${6:params}]);
}, {
  template: 'database',
  context: {
    table: '\${3:table}',
    operation: '\${7:select}'
  }
});
/*DEBUG:END*/
\`\`\``;

    return content;
  },

  generateBestPractices(): string {
    return `## Best Practices

### DO ✅
- Use specific templates for better insights
- Include meaningful context in debug calls
- Wrap all external API calls
- Wrap database operations
- Use descriptive action names

### DON'T ❌
- Use generic action names like "api_call"
- Forget to add DEBUG markers
- Wrap synchronous operations
- Include sensitive data in context
- Use debug in production without markers

### Naming Conventions
- HTTP: \`fetch_<resource>\`, \`create_<resource>\`, \`update_<resource>\`
- Database: \`query_<table>\`, \`insert_<table>\`, \`update_<table>\`
- File: \`read_<filename>\`, \`write_<filename>\`, \`delete_<filename>\`
- Queue: \`send_<queue>\`, \`receive_<queue>\`, \`process_<queue>\``;
  },

  generateMetrics(analysis: ProjectAnalysis): string {
    const topTemplate = analysis.templates[0];
    const coverage = analysis.coverage.overall.toFixed(1);

    return `## Project Metrics

### Debug Coverage
- **Overall**: ${coverage}%
- **Total Operations**: ${analysis.coverage.asyncOperations.total}
- **Wrapped**: ${analysis.coverage.asyncOperations.wrapped}

### Template Usage
- **Most Used**: ${topTemplate?.name || 'none'} (${topTemplate?.usage || 0} times)
- **Total Templates**: ${analysis.templates.filter((t) => t.usage > 0).length}

### Suggestions
- **High Priority**: ${analysis.suggestions.filter((s) => s.priority === 'high').length} operations need wrapping
- **Patterns Found**: ${analysis.patterns.filter((p) => p.type === 'common').length}

<!-- AI-DEBUG-END -->`;
  },
};
