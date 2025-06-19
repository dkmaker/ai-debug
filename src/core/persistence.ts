import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { DebugEntry } from '../types/index.js';

/**
 * Configuration for debug data persistence.
 *
 * @interface PersistenceConfig
 * @property {string} baseDir - Base directory for storing debug data
 * @property {'key-based' | 'date-based'} structure - Directory structure strategy
 * @property {'gzip' | 'none'} compression - Compression method for stored data
 *
 * @example
 * const config: PersistenceConfig = {
 *   baseDir: './debug',
 *   structure: 'key-based',
 *   compression: 'gzip'
 * };
 */
export interface PersistenceConfig {
  baseDir: string;
  structure: 'key-based' | 'date-based';
  compression: 'gzip' | 'none';
}

/**
 * Handles persistent storage of debug entries to disk.
 * Supports different directory structures and compression.
 *
 * @class DebugPersistence
 *
 * Directory structures:
 * - key-based: baseDir/action/key/timestamp.json
 * - date-based: baseDir/YYYY/MM/DD/action-key-timestamp.json
 *
 * Features:
 * - Automatic directory creation
 * - Path sanitization for filesystem safety
 * - Optional gzip compression
 * - Hash generation for deduplication
 *
 * @example
 * const persistence = new DebugPersistence({
 *   baseDir: './debug',
 *   structure: 'key-based',
 *   compression: 'none'
 * });
 *
 * await persistence.save(debugEntry);
 */
export class DebugPersistence {
  private config: PersistenceConfig;

  constructor(config: PersistenceConfig) {
    this.config = config;
    this.ensureBaseDir();
  }

  /**
   * Saves a debug entry to disk.
   * Creates necessary directories and applies compression if configured.
   *
   * @param {DebugEntry} entry - Debug entry to save
   * @returns {Promise<void>}
   *
   * @example
   * await persistence.save({
   *   id: '123',
   *   action: 'fetch_user',
   *   key: 'user:123',
   *   timestamp: new Date().toISOString(),
   *   duration_ms: 45,
   *   status: 'success',
   *   data: { user: { id: 123 } }
   * });
   */
  async save(entry: DebugEntry): Promise<void> {
    const path = this.getEntryPath(entry);
    const dir = dirname(path);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Custom replacer to handle BigInt and other non-serializable types
    const seen = new WeakSet();
    const replacer = (_key: string, value: unknown): unknown => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    };

    const data =
      this.config.compression === 'gzip'
        ? await this.compress(JSON.stringify(entry, replacer, 2))
        : JSON.stringify(entry, replacer, 2);

    writeFileSync(path, data);
  }

  /**
   * Loads debug entries from disk.
   * Filters by action and optional key.
   *
   * @param {string} _action - Action name to filter by
   * @param {string} [_key] - Optional key to filter by
   * @returns {Promise<DebugEntry[]>} Array of matching entries
   *
   * @todo Implement file system scanning based on structure
   */
  async load(_action: string, _key?: string): Promise<DebugEntry[]> {
    // TODO: Implement file system scanning based on structure
    // This would use glob to find matching files
    const entries: DebugEntry[] = [];
    return entries;
  }

  private getEntryPath(entry: DebugEntry): string {
    if (this.config.structure === 'key-based') {
      // Structure: baseDir/action/key/timestamp.json
      const actionDir = this.sanitizePath(entry.action);
      const keyDir = this.sanitizePath(entry.key);
      const timestamp = new Date(entry.timestamp).toISOString().replace(/[:.]/g, '-');
      const ext = this.config.compression === 'gzip' ? '.json.gz' : '.json';
      return join(this.config.baseDir, actionDir, keyDir, `${timestamp}${ext}`);
    }
    // Structure: baseDir/YYYY/MM/DD/action-key-timestamp.json
    const date = new Date(entry.timestamp);
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const ext = this.config.compression === 'gzip' ? '.json.gz' : '.json';
    const filename = `${entry.action}-${entry.key}-${date.getTime()}${ext}`;
    return join(this.config.baseDir, year, month, day, this.sanitizePath(filename));
  }

  private sanitizePath(name: string): string {
    // Replace problematic characters for filesystem
    return name
      .replace(/[<>:"|?*]/g, '_')
      .replace(/\//g, '_')
      .replace(/\\/g, '_')
      .substring(0, 100); // Limit length
  }

  private ensureBaseDir(): void {
    if (!existsSync(this.config.baseDir)) {
      mkdirSync(this.config.baseDir, { recursive: true });
    }
  }

  private async compress(data: string): Promise<Buffer> {
    const { gzip } = await import('node:zlib');
    const { promisify } = await import('node:util');
    const gzipAsync = promisify(gzip);
    return gzipAsync(data);
  }

  generateHash(entry: DebugEntry): string {
    const content = `${entry.action}:${entry.key}:${JSON.stringify(entry.data)}`;
    return createHash('sha256').update(content).digest('hex').substring(0, 8);
  }
}
