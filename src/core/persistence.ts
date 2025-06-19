import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { DebugEntry } from '../types/index.js';

export interface PersistenceConfig {
  baseDir: string;
  structure: 'key-based' | 'date-based';
  compression: 'gzip' | 'none';
}

export class DebugPersistence {
  private config: PersistenceConfig;

  constructor(config: PersistenceConfig) {
    this.config = config;
    this.ensureBaseDir();
  }

  async save(entry: DebugEntry): Promise<void> {
    const path = this.getEntryPath(entry);
    const dir = dirname(path);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const data =
      this.config.compression === 'gzip'
        ? await this.compress(JSON.stringify(entry, null, 2))
        : JSON.stringify(entry, null, 2);

    writeFileSync(path, data);
  }

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
      return join(this.config.baseDir, actionDir, keyDir, `${timestamp}.json`);
    }
    // Structure: baseDir/YYYY/MM/DD/action-key-timestamp.json
    const date = new Date(entry.timestamp);
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const filename = `${entry.action}-${entry.key}-${date.getTime()}.json`;
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
