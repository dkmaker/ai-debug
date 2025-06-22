# Configuration Guide

Configuration options for @dkmaker/ai-debug.

## Overview

This guide covers all configuration options available in the AI Debug system.
Configuration can be set through the main Config interface or individual option objects.

## Main Configuration

### Config

Main configuration object for the AI debugging system.
Controls all aspects of debugging, caching, logging, and documentation.

**Complete Configuration Example:**

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

## Specific Configuration Options

### Caching

#### CacheOptions

Options for controlling caching behavior in templates.
Allows fine-grained control over what gets cached and for how long.

**Usage Examples:**

```typescript
const cacheOptions: CacheOptions = {
  enabled: true,
  ttl: 300, // 5 minutes in seconds
  shouldCache: (result) => result.status === 200
};
```

*// Dynamic TTL based on result:*

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

#### CacheConfig

Configuration for the caching system.

**Usage Examples:**

```typescript
const cacheConfig: CacheConfig = {
  enabled: true,
  defaultTTL: 300000, // 5 minutes in milliseconds
  maxSize: 1000,
  strategy: 'lru' // Least Recently Used
};
```

### Logging

#### LogOptions

Options for controlling logging behavior in templates.

**Usage Examples:**

```typescript
const logOptions: LogOptions = {
  enabled: true,
  level: 'info',
  format: (entry) => `[${entry.action}] ${entry.duration_ms}ms`
};
```

#### FileLogConfig

Configuration for file-based logging.

**Usage Examples:**

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

### General

#### WrapOptions

Options passed to the wrap() method.
Controls how a specific operation is debugged.

**Usage Examples:**

*// Use HTTP template with custom context:*

```typescript
await debug.wrap('api_call', fetchData, {
  template: 'http',
  context: {
    url: '/api/users',
    method: 'GET'
  }
});
```

*// Raw mode for detailed debugging:*

```typescript
await debug.wrap('complex_operation', doWork, {
  raw: true
});
```

#### MultiAudienceGenOptions

Configuration for multi-audience documentation generation.

Defines what types of documentation to generate and where to output them.

#### MermaidGenOptions

Configuration for Mermaid diagram generation.

#### DocGenOptions

Options for AI documentation generation.

Configures how the documentation should be generated, including
the target AI assistant format and output location.

#### ClaudeCommandGenOptions

Configuration for Claude command generation.

### Data Persistence

#### PersistenceConfig

Configuration for debug data persistence.

**Usage Examples:**

```typescript
const config: PersistenceConfig = {
  baseDir: './debug',
  structure: 'key-based',
  compression: 'gzip'
};
```

## Quick Reference

### Essential Configuration

For most use cases, you only need to configure:

```typescript
const config = {
  features: {
    cache: { enabled: true, defaultTTL: 300 },
    debug: { enabled: true, level: "info" },
    logging: { file: { enabled: true } }
  }
};
```

### Environment-Specific Settings

**Development:**
```typescript
{ debug: { enabled: true, level: "debug", raw: { enabled: true } } }
```

**Production:**
```typescript
{ debug: { enabled: true, level: "warn", raw: { enabled: false } } }
```
