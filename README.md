# @dkmaker/ai-debug

AI-optimized debugging and caching system for Node.js applications with minimal repository footprint.

## Features

- 🚀 **Minimal Footprint**: Only ~50 lines in your repository
- 🎯 **Built-in Templates**: HTTP, Database, File I/O, Queue, Business Logic, and Auto-detection
- 🧬 **Template Inheritance**: Extend and customize built-in templates
- 💾 **Smart Caching**: LRU/FIFO strategies with configurable TTL
- 📝 **Integrated Logging**: Singleton file logger prevents conflicts
- 🤖 **AI Documentation**: Auto-generate CLAUDE.md for AI assistants
- 🔍 **Raw Object Debugging**: Automatic inspection of unknown objects

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

# Generate AI documentation
npx ai-debug docs:generate

# View debug data
npx ai-debug view <action>

# Analyze usage patterns
npx ai-debug analyze
```

## License

MIT
