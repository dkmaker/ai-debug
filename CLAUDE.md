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
- ✅ CLI with all commands implemented
- ✅ TypeScript build setup using tsup (ESM/CJS dual module support)
- ✅ Build-time version injection using tsup's define option
- ✅ Tests setup and passing
- ✅ All linting issues fixed (proper 'any' handling with biome-ignore)
- ✅ 100% JSDoc documentation coverage for all public APIs
- ✅ Documentation generator (Claude, GitHub Copilot, Cursor formats)
- ✅ Analysis commands (analyze, coverage, stats, suggest, etc.)
- ✅ Project analyzer with AST-based code analysis
- ✅ Documentation coverage tool

## Development Commands

### Initial Setup
```bash
# Install dependencies using pnpm (when package.json exists)
pnpm install

# Build the TypeScript code (using tsup)
pnpm run build

# Development mode (watch for changes)
pnpm run dev

# Run tests
pnpm test

# Run Biome linter
pnpm run lint
pnpm run lint:fix  # Auto-fix linting issues

# Check documentation coverage
pnpm run doc:coverage
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
npx @dkmaker/ai-debug suggest

# View and manage debug data
npx @dkmaker/ai-debug list
npx @dkmaker/ai-debug view <action>
npx @dkmaker/ai-debug search <pattern>

# Watch mode for auto-documentation updates
npx @dkmaker/ai-debug watch
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
- **Build Tool**: tsup (for fast, zero-config builds)
- **Build Output**: Dual ESM/CJS support
- **Linter**: Biome (for code quality and formatting)

### Build System (tsup)
The project uses tsup for building TypeScript code with the following features:
- Fast builds using esbuild under the hood
- Automatic dual format output (ESM `.js` and CJS `.cjs`)
- Build-time version injection using `define` option
- Automatic shebang injection for CLI executable
- Source maps for debugging
- Type declarations generation

Key configuration in `tsup.config.ts`:
- Entry points: `src/index.ts` and `src/cli/index.ts`
- Version injection: `__PACKAGE_VERSION__` replaced at build time
- Clean build directory before each build
- Dependencies are externalized (not bundled)
- Preserves Node.js shims for compatibility

### Key Design Principles
1. Minimal repository footprint - most functionality lives in node_modules
2. Production-safe - debug code can be automatically removed for production builds
3. AI-optimized output - structured data formatted for AI assistant consumption
4. Template inheritance - custom templates can extend built-in ones
5. Automatic caching - intelligent caching based on operation patterns

### Documentation Standards

The codebase maintains 100% JSDoc documentation coverage with comprehensive comments optimized for AI understanding:

1. **All public APIs have JSDoc** - Every class, method, interface, and type is documented
2. **Detailed @example sections** - Show practical usage patterns with real code
3. **Clear parameter descriptions** - Explain what each parameter does and its type
4. **Return value documentation** - Describe what methods return and when
5. **Error documentation** - Use @throws to document potential errors
6. **AI-friendly language** - Clear, conversational tone that helps AI assistants

Documentation coverage is enforced and can be checked with:
```bash
pnpm run doc:coverage
```

Example pattern:
```typescript
/**
 * Brief description of what this does.
 * Additional context for AI assistants.
 * 
 * @param {Type} name - What this parameter is for
 * @returns {Type} What is returned
 * @throws {Error} When this might fail
 * 
 * @example
 * // How to use this
 * const result = await method(params);
 */
```

This documentation helps AI assistants:
- Understand code purpose without reading implementation
- Generate accurate code suggestions
- Avoid common mistakes
- Provide better assistance to developers