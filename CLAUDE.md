# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the `@dkmaker/ai-debug` package - an AI-optimized debugging and caching system for Node.js applications. The package is designed to have minimal footprint in user repositories while providing comprehensive debugging capabilities.

## Current Status

The implementation is complete with:
- ✅ Core debugger with wrap() and raw() methods
- ✅ Template system with inheritance  
- ✅ Built-in templates (http, database, file, queue, business, auto)
- ✅ LRU/FIFO cache implementation
- ✅ Singleton file logger
- ✅ CLI with init command
- ✅ TypeScript build setup (ESM/CJS dual module support)
- ✅ Tests setup and passing
- ✅ All linting issues fixed (no 'any' types, proper error handling)
- ⏳ Documentation generator (placeholder)
- ⏳ Analysis commands (placeholder)

## Development Commands

### Initial Setup
```bash
# Install dependencies using pnpm (when package.json exists)
pnpm install

# Build the TypeScript code
pnpm run build

# Run tests
pnpm test

# Run Biome linter
pnpm run lint
pnpm run lint:fix  # Auto-fix linting issues
```

### Package CLI Commands (for testing during development)
```bash
# Initialize in a project
npx @dkmaker/ai-debug init --guided

# Generate AI documentation
npx @dkmaker/ai-debug docs:generate

# Analysis commands
npx @dkmaker/ai-debug analyze
npx @dkmaker/ai-debug coverage
npx @dkmaker/ai-debug stats
```

## Architecture

### Package Structure
The package maintains a minimal footprint in user repositories:
- `.ai-debug/wrapper.js` - Thin wrapper (~50 lines) that imports from node_modules
- `.ai-debug/config.json` - Simple configuration file
- `debug/` - Debug data directory (git-ignored)

### Core Components

1. **Template System**: Built-in templates for common operations:
   - `http` - HTTP/REST API debugging with automatic caching
   - `database` - Database query performance tracking
   - `file` - File I/O operation monitoring
   - `queue` - Message queue operation tracking
   - `business` - Business logic debugging
   - `auto` - Automatic object inspection

2. **Debug Wrapper Pattern**: All debug code is wrapped in special markers:
   ```javascript
   /*DEBUG:START*/
   const result = await debug.wrap('action_name', async () => {
     // Operation to debug
   }, { template: 'template_name' });
   /*DEBUG:END*/
   ```

3. **Singleton Logger**: Internal logging system prevents file lock conflicts across multiple debug instances.

4. **AI Documentation Generator**: Generates optimized documentation in Claude, Copilot, or Cursor formats.

### Technical Requirements
- **Node.js**: 22+
- **Package Manager**: pnpm 10-latest
- **TypeScript**: ESM module with CJS compatibility
- **Build Output**: Dual ESM/CJS support
- **Linter**: Biome (for code quality and formatting)

### Key Design Principles
1. Minimal repository footprint - most functionality lives in node_modules
2. Production-safe - debug code can be automatically removed for production builds
3. AI-optimized output - structured data formatted for AI assistant consumption
4. Template inheritance - custom templates can extend built-in ones
5. Automatic caching - intelligent caching based on operation patterns