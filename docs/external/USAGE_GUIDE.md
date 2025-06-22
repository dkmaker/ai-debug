# Usage Guide

Complete usage guide for @dkmaker/ai-debug.

## Getting Started

```bash
npm install @dkmaker/ai-debug
```

## Examples

### Debugging

#### DebugContext

Context information passed to debug operations.

```typescript
const context: DebugContext = {
  action: 'fetch_user',
  url: '/api/users/123',
  method: 'GET',
  headers: { 'Authorization': 'Bearer token' }
};
```

#### DebugResult

Result information from a debug operation.

```typescript
const result: DebugResult = {
  data: { id: 123, name: 'John' },
  status: 200,
  headers: { 'content-type': 'application/json' }
};
```

#### DebugEntry

A single debug log entry representing one wrapped operation.

```typescript
const entry: DebugEntry = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  action: 'fetch_user',
  timestamp: '2024-01-01T12:00:00.000Z',
  duration_ms: 145,
  status: 'success',
  data: { user: { id: 123, name: 'John' } },
  cached: false,
  templateUsed: 'http'
};
```

#### TypedDebugEntry

Type-safe version of DebugEntry with generic data type.

```typescript
interface UserDebugData {
  user: { id: number; name: string };
  fromCache: boolean;
}

const entry: TypedDebugEntry<UserDebugData> = {
  id: '123',
  action: 'fetch_user',
  timestamp: '2024-01-01T12:00:00.000Z',
  duration_ms: 145,
  status: 'success',
  data: {
    user: { id: 123, name: 'John' },
    fromCache: false
  }
};
```

#### Template

Template definition for customizing debug behavior.

```typescript
const apiTemplate: Template = {
  extends: 'base',
  debugData: (context, result, error) => ({
    url: context.url,
    method: context.method,
    status: result?.status,
    error: error?.message
  }),
  cache: {
    enabled: true,
    ttl: 300
  },
  cacheContext: (ctx) => ({
    method: ctx.method,
    url: ctx.url
  })
};
```

#### WrapOptions

Options passed to the wrap() method.

**// Use HTTP template with custom context:**

```typescript
await debug.wrap('api_call', fetchData, {
  template: 'http',
  context: {
    url: '/api/users',
    method: 'GET'
  }
});
```

**// Raw mode for detailed debugging:**

```typescript
await debug.wrap('complex_operation', doWork, {
  raw: true
});
```

#### PersistenceConfig

Configuration for debug data persistence.

```typescript
const config: PersistenceConfig = {
  baseDir: './debug',
  structure: 'key-based',
  compression: 'gzip'
};
```

#### ActionMapEntry

Configuration for a specific action in the action map.

```typescript
const entry: ActionMapEntry = {
  template: 'http',
  context: (userId) => ({
    url: `/api/users/${userId}`,
    method: 'GET'
  }),
  cache: {
    enabled: true,
    ttl: 300
  }
};
```

#### ActionMap

Map of action names to their debug configurations.

```typescript
const actionMap: ActionMap = {
  'getUserById': {
    template: 'database',
    context: (id) => ({ sql: 'SELECT * FROM users WHERE id = ?', params: [id] })
  },
  'fetchUserData': {
    template: 'http',
    context: { method: 'GET' }
  }
};
```

### Caching

#### CacheMetadata

Metadata for cache entries and statistics.

```typescript
const metadata: CacheMetadata = {
  entries: {
    'a1b2c3d4': {
      context: { method: 'GET', url: '/api/users' },
      created: '2024-01-01T12:00:00.000Z',
      lastAccessed: '2024-01-01T12:05:00.000Z',
      hitCount: 5,
      size: 2048,
      ttl: 300000,
      expired: false
    }
  },
  stats: {
    totalHits: 100,
    totalMisses: 20,
    totalSize: 51200
  }
};
```

#### CacheOptions

Options for controlling caching behavior in templates.

```typescript
const cacheOptions: CacheOptions = {
  enabled: true,
  ttl: 300, // 5 minutes in seconds
  shouldCache: (result) => result.status === 200
};
```

**// Dynamic TTL based on result:**

```typescript
const dynamicCache: CacheOptions = {
  enabled: true,
  ttl: (result) => {
    if (result.status === 404) return 60; // 1 minute for 404s
    if (result.status === 200) return 3600; // 1 hour for success
    return 0; // Don't cache errors
  }
};
```

#### Config

Main configuration object for the AI debugging system.

```typescript
const config: Config = {
  version: '1.0.0',
  features: {
    cache: {
      enabled: true,
      defaultTTL: 300,
      maxSize: 1000,
      strategy: 'lru'
    },
    debug: {
      enabled: true,
      level: 'info',
      captureMetadata: true,
      raw: {
        enabled: true,
        maxDepth: 5,
        maxSize: 10000
      }
    },
    logging: {
      console: {
        enabled: false,
        level: 'warn',
        format: 'pretty',
        colors: true
      },
      file: {
        enabled: true,
        path: './debug/debug.log',
        maxSize: '10MB',
        maxFiles: 5,
        format: 'json',
        compress: false
      }
    },
    templates: {
      default: 'auto',
      autoDetect: true
    },
    documentation: {
      autoGenerate: false,
      format: 'claude',
      outputPath: './debug/docs',
      includeExamples: true,
      analyzeCoverage: true,
      updateOnChange: false,
      customSections: {
        projectSpecific: true,
        performanceTips: true,
        commonErrors: true,
        teamGuidelines: false
      }
    }
  },
  persistence: {
    baseDir: './debug',
    structure: 'key-based',
    compression: 'none'
  }
};
```

#### CacheConfig

Configuration for the caching system.

```typescript
const cacheConfig: CacheConfig = {
  enabled: true,
  defaultTTL: 300000, // 5 minutes in milliseconds
  maxSize: 1000,
  strategy: 'lru' // Least Recently Used
};
```

### Types & Interfaces

#### LogOptions

Options for controlling logging behavior in templates.

```typescript
const logOptions: LogOptions = {
  enabled: true,
  level: 'info',
  format: (entry) => `[${entry.action}] ${entry.duration_ms}ms`
};
```

#### DatabaseError

Database error with SQL-specific information.

```typescript
const error: DatabaseError = {
  message: 'Duplicate key violation',
  code: 'ER_DUP_ENTRY',
  sqlState: '23505'
};
```

#### FileSystemError

File system error with OS-specific codes.

```typescript
const error: FileSystemError = {
  message: 'File not found',
  code: 'ENOENT'
};
```

#### BusinessError

Business logic error with validation details.

```typescript
const error: BusinessError = {
  message: 'Invalid order',
  validation: {
    fields: ['quantity', 'price'],
    rules: ['min:1', 'required']
  }
};
```

### Configuration

#### FileLogConfig

Configuration for file-based logging.

```typescript
const fileConfig: FileLogConfig = {
  enabled: true,
  path: './debug/debug.log',
  maxSize: '10MB',
  maxFiles: 5,
  format: 'json',
  compress: false
};
```

## Common Patterns

### Using Built-in Templates

The package includes several built-in templates for common operations:

- **http**: For REST API calls and HTTP operations
- **database**: For database queries and transactions
- **file**: For file system operations
- **business**: For business logic debugging
- **auto**: For automatic object inspection
