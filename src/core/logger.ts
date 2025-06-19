import { type WriteStream, createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import type { DebugEntry } from '../types/index.js';

export interface FileLogConfig {
  enabled: boolean;
  path: string;
  maxSize: string;
  maxFiles: number;
  format: 'json' | 'pretty';
  compress: boolean;
}

interface LogQueueEntry {
  entry: DebugEntry;
  resolve: () => void;
  reject: (error: Error) => void;
}

export class FileLogger {
  private static instance: FileLogger;
  private config: FileLogConfig;
  private writeQueue: LogQueueEntry[] = [];
  private isWriting = false;
  private fileStream?: WriteStream;
  private currentFileIndex = 0;
  private currentFileSize = 0;
  private maxSizeBytes: number;

  private constructor(config: FileLogConfig) {
    this.config = config;
    this.maxSizeBytes = this.parseSize(config.maxSize);

    if (config.enabled) {
      this.ensureDirectoryExists();
      this.openFileStream();
    }
  }

  static getInstance(config: FileLogConfig): FileLogger {
    if (!FileLogger.instance) {
      FileLogger.instance = new FileLogger(config);
    }
    return FileLogger.instance;
  }

  async log(entry: DebugEntry): Promise<void> {
    if (!this.config.enabled) return;

    return new Promise((resolve, reject) => {
      this.writeQueue.push({ entry, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isWriting || this.writeQueue.length === 0) return;

    this.isWriting = true;
    const batch = this.writeQueue.splice(0, 100); // Process 100 at a time

    try {
      const lines = batch
        .map(({ entry }) => {
          if (this.config.format === 'json') {
            return `${JSON.stringify(entry)}\n`;
          }
          // Pretty format
          return `${this.formatPretty(entry)}\n`;
        })
        .join('');

      await this.writeToFile(lines);

      // Resolve all promises in the batch
      batch.forEach(({ resolve }) => resolve());
    } catch (error) {
      // Reject all promises in the batch
      batch.forEach(({ reject }) => reject(error as Error));
    } finally {
      this.isWriting = false;
      if (this.writeQueue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }

  private async writeToFile(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.fileStream) {
        reject(new Error('File stream not initialized'));
        return;
      }

      const dataSize = Buffer.byteLength(data);

      // Check if we need to rotate
      if (this.currentFileSize + dataSize > this.maxSizeBytes) {
        this.rotateFile();
      }

      this.fileStream.write(data, (error) => {
        if (error) {
          reject(error);
        } else {
          this.currentFileSize += dataSize;
          resolve();
        }
      });
    });
  }

  private rotateFile(): void {
    if (this.fileStream) {
      this.fileStream.end();
    }

    // Rotate existing files
    this.currentFileIndex = (this.currentFileIndex + 1) % this.config.maxFiles;
    this.currentFileSize = 0;

    this.openFileStream();
  }

  private openFileStream(): void {
    const filePath = this.getFilePath();

    // Check if file exists and get its size
    if (existsSync(filePath)) {
      try {
        const stats = statSync(filePath);
        this.currentFileSize = stats.size;
      } catch {
        this.currentFileSize = 0;
      }
    }

    this.fileStream = createWriteStream(filePath, { flags: 'a' });
  }

  private getFilePath(): string {
    const base = this.config.path.replace(/\.log$/, '');
    if (this.currentFileIndex === 0) {
      return `${base}.log`;
    }
    return `${base}.${this.currentFileIndex}.log`;
  }

  private ensureDirectoryExists(): void {
    const dir = dirname(this.config.path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private parseSize(size: string): number {
    const match = size.match(/^(\d+)([KMG]B)?$/i);
    if (!match) return 100 * 1024 * 1024; // Default 100MB

    const value = Number.parseInt(match[1], 10);
    const unit = match[2]?.toUpperCase() || 'B';

    switch (unit) {
      case 'KB':
        return value * 1024;
      case 'MB':
        return value * 1024 * 1024;
      case 'GB':
        return value * 1024 * 1024 * 1024;
      default:
        return value;
    }
  }

  private formatPretty(entry: DebugEntry): string {
    const timestamp = new Date(entry.timestamp).toLocaleString();
    const status = entry.status === 'success' ? '✓' : '✗';
    const cached = entry.cached ? ' (cached)' : '';

    return `[${timestamp}] ${status} ${entry.action} - ${entry.duration_ms}ms${cached}`;
  }

  close(): void {
    if (this.fileStream) {
      this.fileStream.end();
      this.fileStream = undefined;
    }
  }
}
