import {
  type WriteStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { dirname } from 'node:path';
import type { DebugEntry } from '../types/index.js';

/**
 * Configuration for file-based logging.
 *
 * @audience external
 * @interface FileLogConfig
 * @property {boolean} enabled - Whether file logging is enabled
 * @property {string} path - Path to the log file
 * @property {string} maxSize - Maximum file size (e.g., '10MB', '1GB')
 * @property {number} maxFiles - Number of rotated files to keep
 * @property {'json' | 'pretty'} format - Output format for logs
 * @property {boolean} compress - Whether to compress rotated files (not implemented)
 *
 * @example
 * const fileConfig: FileLogConfig = {
 *   enabled: true,
 *   path: './debug/debug.log',
 *   maxSize: '10MB',
 *   maxFiles: 5,
 *   format: 'json',
 *   compress: false
 * };
 */
export interface FileLogConfig {
  enabled: boolean;
  path: string;
  maxSize: string;
  maxFiles: number;
  format: 'json' | 'pretty';
  compress: boolean;
}

/**
 * Internal queue entry for batched writes.
 *
 * @interface LogQueueEntry
 * @private
 */
interface LogQueueEntry {
  entry: DebugEntry;
  resolve: () => void;
  reject: (error: Error) => void;
}

/**
 * Singleton file logger with automatic rotation and batched writes.
 * Prevents file lock conflicts when multiple debug instances write logs.
 *
 * @class FileLogger
 *
 * Features:
 * - Automatic file rotation based on size
 * - Batched writes for performance
 * - Queue-based write ordering
 * - Pretty and JSON output formats
 * - Thread-safe singleton pattern
 *
 * Common patterns:
 * - Always use getInstance() to get the logger
 * - Logs are written asynchronously
 * - Files rotate when they reach maxSize
 * - Old files are numbered (debug.1.log, debug.2.log)
 *
 * @example
 * const logger = FileLogger.getInstance(config);
 * await logger.log(debugEntry);
 *
 * Troubleshooting:
 * - Check file permissions if logs aren't written
 * - Ensure directory exists or can be created
 * - Monitor disk space for large log files
 * - Use JSON format for programmatic parsing
 */
export class FileLogger {
  private static instance: FileLogger | undefined;
  private config: FileLogConfig;
  private writeQueue: LogQueueEntry[] = [];
  private isWriting = false;
  private fileStream?: WriteStream;
  private currentFileIndex = 0;
  currentFileSize = 0;
  private maxSizeBytes: number;

  /**
   * Private constructor enforces singleton pattern.
   *
   * @private
   * @param {FileLogConfig} config - Logger configuration
   */
  private constructor(config: FileLogConfig) {
    this.config = config;
    this.maxSizeBytes = FileLogger.parseSize(config.maxSize);

    if (config.enabled) {
      this.ensureDirectoryExists();
      this.openFileStream();
    }
  }

  /**
   * Gets the singleton FileLogger instance.
   * Creates a new instance on first call.
   *
   * @param {FileLogConfig} config - Configuration (used only on first call)
   * @returns {FileLogger} The singleton logger instance
   *
   * @example
   * const logger = FileLogger.getInstance({
   *   enabled: true,
   *   path: './logs/debug.log',
   *   maxSize: '50MB',
   *   maxFiles: 3,
   *   format: 'json',
   *   compress: false
   * });
   */
  static getInstance(config: FileLogConfig): FileLogger {
    if (!FileLogger.instance) {
      FileLogger.instance = new FileLogger(config);
    }
    return FileLogger.instance;
  }

  /**
   * Resets the singleton instance.
   * Only use this for testing purposes.
   * @internal
   */
  static resetInstance(): void {
    if (FileLogger.instance) {
      FileLogger.instance.close();
      FileLogger.instance = undefined;
    }
  }

  /**
   * Logs a debug entry to file.
   * Writes are queued and processed in batches.
   *
   * @param {DebugEntry} entry - The debug entry to log
   * @returns {Promise<void>} Resolves when entry is written
   *
   * @example
   * await logger.log({
   *   id: '123',
   *   action: 'api_call',
   *   timestamp: new Date().toISOString(),
   *   duration_ms: 150,
   *   status: 'success',
   *   data: { count: 42 }
   * });
   */
  async log(entry: DebugEntry): Promise<void> {
    if (!this.config.enabled) return;

    return new Promise((resolve, reject) => {
      this.writeQueue.push({ entry, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Processes the write queue in batches.
   * Prevents concurrent writes and handles errors.
   *
   * @private
   */
  private async processQueue(): Promise<void> {
    if (this.isWriting || this.writeQueue.length === 0) return;

    // If logging is disabled, resolve all queued promises immediately
    if (!this.config.enabled || !this.fileStream) {
      const batch = this.writeQueue.splice(0, this.writeQueue.length);
      batch.forEach(({ resolve }) => resolve());
      return;
    }

    this.isWriting = true;
    const batch = this.writeQueue.splice(0, 100); // Process 100 at a time

    try {
      const lines = batch
        .map(({ entry }) => {
          if (this.config.format === 'json') {
            // Handle circular references
            const seen = new WeakSet();
            const replacer = (_key: string, value: unknown) => {
              if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                  return '[Circular]';
                }
                seen.add(value);
              }
              return value;
            };
            return `${JSON.stringify(entry, replacer)}\n`;
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

  /**
   * Writes data to the current log file.
   * Handles rotation when file size limit is reached.
   *
   * @private
   * @param {string} data - Formatted log data to write
   */
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

  /**
   * Rotates log files when size limit is reached.
   * Maintains a circular buffer of log files.
   */
  rotateFile(): void {
    try {
      if (this.fileStream) {
        this.fileStream.end();
      }

      const currentPath = this.config.path;
      const basePath = currentPath.replace(/\.log$/, '');

      // Rename existing files in reverse order to make room
      for (let i = this.config.maxFiles - 1; i >= 1; i--) {
        const oldPath = i === 1 ? currentPath : `${basePath}.${i - 1}.log`;
        const newPath = `${basePath}.${i}.log`;

        if (existsSync(oldPath)) {
          if (i === this.config.maxFiles - 1 && existsSync(newPath)) {
            // Delete the oldest file if we're at max
            unlinkSync(newPath);
          }
          renameSync(oldPath, newPath);
        }
      }

      this.currentFileSize = 0;
      this.openFileStream();
    } catch (error) {
      // If rotation fails, continue with current file
      console.error('File rotation error:', error);
      if (!this.fileStream) {
        this.openFileStream();
      }
    }
  }

  /**
   * Opens a write stream to the current log file.
   * Appends to existing file if present.
   *
   * @private
   */
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

  /**
   * Generates the file path for the current log file.
   *
   * @private
   * @returns {string} Full path to the log file
   */
  private getFilePath(): string {
    const base = this.config.path.replace(/\.log$/, '');
    if (this.currentFileIndex === 0) {
      return `${base}.log`;
    }
    return `${base}.${this.currentFileIndex}.log`;
  }

  /**
   * Ensures the log directory exists.
   * Creates it recursively if needed.
   *
   * @private
   */
  private ensureDirectoryExists(): void {
    try {
      const dir = dirname(this.config.path);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error);
      // Continue without throwing - logging will fail but app continues
    }
  }

  /**
   * Parses human-readable size strings to bytes.
   *
   * @param {string} size - Size string (e.g., '10MB', '1GB')
   * @returns {number} Size in bytes
   *
   * @example
   * FileLogger.parseSize('10MB') // returns 10485760
   * FileLogger.parseSize('1GB')  // returns 1073741824
   */
  static parseSize(size: string): number {
    const match = size.match(/^(\d+)([KMG]B)?$/i);
    if (!match) return 0; // Return 0 for invalid format

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

  /**
   * Formats a debug entry in human-readable format.
   *
   * @private
   * @param {DebugEntry} entry - Entry to format
   * @returns {string} Formatted log line
   *
   * @example
   * // Output: "[2024-01-01 12:00:00] ✓ fetch_users - 150ms (cached)"
   */
  private formatPretty(entry: DebugEntry): string {
    const timestamp = new Date(entry.timestamp).toLocaleString();
    const status = entry.status === 'success' ? '✓' : '✗';
    const cached = entry.cached ? ' (cached)' : '';

    return `[${timestamp}] ${status} ${entry.action} - ${entry.duration_ms}ms${cached}`;
  }

  /**
   * Closes the logger and flushes pending writes.
   * Call this before application shutdown.
   *
   * @example
   * logger.close();
   */
  close(): void {
    if (this.fileStream) {
      this.fileStream.end();
      this.fileStream = undefined;
    }
  }
}
