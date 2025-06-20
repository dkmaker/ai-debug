# Development Guide

Development workflows and patterns for @dkmaker/ai-debug.

## Getting Started

This guide is for developers working on the AI Debug package itself, not for users of the package.

### Prerequisites

- Node.js 22+
- pnpm 10+
- TypeScript knowledge
- Understanding of AST parsing (for JSDoc extraction)

### Development Setup

```bash
# Clone and install dependencies
git clone <repository-url>
cd ai-debug
pnpm install

# Build the project
pnpm run build

# Run tests
pnpm test

# Development mode (watch for changes)
pnpm run dev
```

## Project Structure

```
src/
├── core/          # Core debugging functionality
├── docs/          # Documentation generation system
├── cli/           # Command-line interface
├── templates/     # Built-in debug templates
├── types/         # TypeScript type definitions
└── index.ts       # Main entry point

tests/             # Test suite
docs/              # Generated documentation (build output)
dist/              # Compiled JavaScript (build output)
```

## Key Development Areas

## Testing Guidelines

The project maintains 100% test coverage. Key testing patterns:

### Unit Tests
- All core classes have comprehensive unit tests
- Mock external dependencies (file system, timers)
- Test both success and error paths

### Integration Tests
- End-to-end CLI command testing
- Documentation generation pipeline testing
- Template system integration testing

### Test Commands
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run linting
pnpm run lint
```

## Build System

The project uses `tsup` for fast TypeScript compilation:

### Build Configuration
- **Dual format**: ESM (`.js`) and CJS (`.cjs`) outputs
- **Version injection**: `__PACKAGE_VERSION__` replaced at build time
- **CLI executable**: Automatic shebang injection for CLI
- **Source maps**: Generated for debugging
- **Type definitions**: Separate `.d.ts` files

### Documentation Build
The documentation is generated at build time:

```bash
# The build process runs:
1. pnpm run docs:generate  # Generate versioned docs
2. tsup                    # Compile TypeScript
```

## Release Process

### Version Management
- Documentation is versioned (`docs/v{version}/`)
- Build-time version injection ensures consistency
- Symlink to `latest` version for easy access

### Publishing Checklist
1. **Update version** in `package.json`
2. **Run full build** to generate new versioned docs
3. **Run all tests** to ensure quality
4. **Review generated documentation** for completeness
5. **Commit changes** with conventional commit message
6. **Tag release** following semantic versioning
7. **Publish to npm**

## Debugging the Debug System

### Common Development Tasks

**Adding a new template:**
1. Create template definition in `src/templates/`
2. Add JSDoc with `@audience external` tag
3. Include comprehensive `@example` tags
4. Add unit tests in `tests/templates/`
5. Rebuild docs to include new template

**Modifying JSDoc extraction:**
1. Update `src/docs/jsdoc-extractor.ts`
2. Test with `pnpm run docs:generate`
3. Verify output in `docs/v{version}/`
4. Run full test suite

**Adding CLI commands:**
1. Create command in `src/cli/commands/`
2. Register in `src/cli/index.ts`
3. Add comprehensive JSDoc documentation
4. Add integration tests
5. Update CLI help text
