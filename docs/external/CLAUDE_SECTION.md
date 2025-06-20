# AI Debug System Integration

This section can be merged into your project's CLAUDE.md file to help Claude understand and work with the AI Debug system.

## Package Overview

@dkmaker/ai-debug provides AI-optimized debugging and caching for Node.js applications.
It uses a template-based approach with automatic caching and comprehensive logging.

## Quick Reference

### Core Concepts

- **Debug Wrapping**: Wrap operations with `debug.wrap()` for automatic instrumentation
- **Templates**: Built-in patterns for common operations (http, database, file, business, auto)
- **Caching**: Automatic intelligent caching based on operation type and context
- **Raw Mode**: Deep object inspection with `debug.raw()` for complex debugging

### Key Interfaces

- **DebugContext**: Context information passed to debug operations.
- **DebugResult**: Result information from a debug operation.
- **CacheOptions**: Options for controlling caching behavior in templates.
- **Template**: Template definition for customizing debug behavior.
- **Config**: Main configuration object for the AI debugging system.

## Common Usage Patterns

### Basic Debug Wrapping

```typescript
// Wrap any async operation for debugging
const result = await debug.wrap("operation_name", async () => {
  return await someAsyncOperation();
}, { template: "auto" });
```

### HTTP API Debugging

```typescript
const userData = await debug.wrap("fetch_user", async () => {
  return await fetch(`/api/users/${userId}`);
}, { 
  template: "http",
  context: { url: `/api/users/${userId}`, method: "GET" }
});
```

### Database Query Debugging

```typescript
const users = await debug.wrap("get_active_users", async () => {
  return await db.query("SELECT * FROM users WHERE active = ?", [true]);
}, { 
  template: "database",
  context: { table: "users", operation: "SELECT" }
});
```

## AI Assistant Guidelines

When helping with this debug system:

1. **Always wrap async operations** in `debug.wrap()` for comprehensive tracking
2. **Choose appropriate templates**: http, database, file, business, or auto
3. **Provide meaningful action names** that describe the operation purpose
4. **Include relevant context** for better caching and analysis
5. **Use raw mode** (`debug.raw()`) for complex object inspection

### Template Selection Guide

- **http**: REST API calls, HTTP requests, external service calls
- **database**: SQL queries, ORM operations, data persistence
- **file**: File I/O, reading configs, writing logs
- **business**: Business logic, calculations, validations
- **auto**: General purpose, automatic object inspection

## Implementation Examples

### DebugContext Usage

Context information passed to debug operations.

```typescript
const context: DebugContext = {
  action: 'fetch_user',
  url: '/api/users/123',
  method: 'GET',
  headers: { 'Authorization': 'Bearer token' }
};
```

### DebugResult Usage

Result information from a debug operation.

```typescript
const result: DebugResult = {
  data: { id: 123, name: 'John' },
  status: 200,
  headers: { 'content-type': 'application/json' }
};
```

### DebugEntry Usage

A single debug log entry representing one wrapped operation.

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

## CLI Commands Reference

The package provides CLI commands for analysis and documentation:

```bash
# Initialize debug system in project
npx @dkmaker/ai-debug init --guided

# Analyze debug usage patterns
npx @dkmaker/ai-debug analyze

# View debug data
npx @dkmaker/ai-debug list
npx @dkmaker/ai-debug view <action-name>

# Generate documentation
npx @dkmaker/ai-debug docs:generate
```
