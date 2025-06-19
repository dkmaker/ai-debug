# @dkmaker/ai-debug

AI-optimized debugging and caching system for Node.js applications with minimal repository footprint.

## Features

- 🚀 **Minimal Footprint**: Only ~50 lines in your repository
- 🎯 **Built-in Templates**: HTTP, Database, File I/O, Queue, Business Logic, and Auto-detection
- 🧬 **Template Inheritance**: Extend and customize built-in templates
- 💾 **Smart Caching**: LRU/FIFO strategies with configurable TTL
- 📝 **Integrated Logging**: Singleton file logger prevents conflicts
- 🤖 **AI Documentation**: Generate docs for Claude, GitHub Copilot, or Cursor
- 🔍 **Code Analysis**: AST-based analysis finds patterns and suggests improvements
- 📊 **Coverage Reports**: Track debug coverage across your codebase
- 🔄 **Watch Mode**: Auto-update documentation as code changes
- 📦 **Modern Build**: Fast tsup builds with dual ESM/CJS support

## Installation

```bash
npm install --save-dev @dkmaker/ai-debug
# or
pnpm add -D @dkmaker/ai-debug
```

## Quick Start

1. Initialize AI Debug in your project:

```bash
npx ai-debug init --guided
```

2. Import the debug wrapper:

```javascript
import { debug } from './.ai-debug/wrapper.js';
```

3. Wrap your async operations:

```javascript
/*DEBUG:START*/
const result = await debug.wrap('fetch_user', async () => {
  return await fetch(`/api/users/${userId}`);
}, { 
  template: 'http',
  context: { url: `/api/users/${userId}` }
});
/*DEBUG:END*/
```

## Built-in Templates

### HTTP Template
```javascript
await debug.wrap('api_call', async () => {
  return await axios.get(url);
}, { template: 'http', context: { url, method: 'GET' } });
```

### Database Template
```javascript
await debug.wrap('query_users', async () => {
  return await db.query('SELECT * FROM users WHERE active = ?', [true]);
}, { template: 'database', context: { sql, params } });
```

### Auto Template (Raw Object Inspection)
```javascript
await debug.raw('unknown_operation', async () => {
  return await complexOperation();
});
```

## Production Removal

Debug code is automatically removed in production builds using the `/*DEBUG:START*/` and `/*DEBUG:END*/` markers.

## Custom Templates

Create your own templates by extending the base template:

```javascript
// .ai-debug/templates/myTemplate.js
import { BaseTemplate } from '@dkmaker/ai-debug';

export const myTemplate = BaseTemplate.extend({
  name: 'myTemplate',
  captureContext: (args) => ({
    // Custom context extraction
  }),
  formatOutput: (result, error, context) => ({
    // Custom output formatting
  })
});
```

## Configuration

The `.ai-debug/config.json` file controls all features:

```json
{
  "features": {
    "cache": {
      "enabled": true,
      "strategy": "lru",
      "maxSize": 100
    },
    "logging": {
      "file": {
        "enabled": true,
        "path": "./debug/debug.log"
      }
    }
  }
}
```

## CLI Commands

```bash
# Initialize or upgrade
npx ai-debug init --guided

# Generate AI documentation (Claude, GitHub Copilot, or Cursor format)
npx ai-debug docs:generate --format claude --output .ai-debug/CLAUDE.md

# Analyze usage patterns
npx ai-debug analyze

# Check debug coverage
npx ai-debug coverage

# View statistics
npx ai-debug stats

# Get optimization suggestions
npx ai-debug suggest

# View and search debug data
npx ai-debug list                    # List all debug entries
npx ai-debug view <action>          # View specific action details
npx ai-debug search <pattern>       # Search debug logs

# Watch mode for auto-updates
npx ai-debug watch
```

## License

MIT
