import type { FileSystemError } from '../types/errors.js';
import type { Template } from '../types/index.js';

/**
 * Template for file system operations.
 * Captures file paths, operations, and I/O metrics.
 *
 * @const fileTemplate
 *
 * Expected context:
 * - operation: File operation type ('read', 'write', 'delete', 'stat', 'mkdir', etc.)
 * - path: File or directory path
 * - options: Operation options (encoding, flags, mode, etc.)
 * - data: Data being written (for write operations)
 * - encoding: File encoding (defaults to 'utf8')
 *
 * Captured data:
 * - File operation type and path
 * - Operation options
 * - File size (bytes read/written)
 * - File encoding
 * - File system error codes
 *
 * Error handling:
 * - Captures file system error codes (ENOENT, EPERM, etc.)
 * - Preserves error context for debugging
 *
 * Cache behavior:
 * - Disabled by default (file ops shouldn't be cached)
 * - File contents may change between calls
 *
 * @example
 * await debug.wrap('read_config',
 *   () => fs.readFile('./config.json', 'utf8'),
 *   {
 *     template: 'file',
 *     context: {
 *       operation: 'read',
 *       path: './config.json',
 *       encoding: 'utf8'
 *     }
 *   }
 * );
 *
 * @example
 * // Write operation with size tracking
 * await debug.wrap('save_data',
 *   () => fs.writeFile('./data.json', jsonData),
 *   {
 *     template: 'file',
 *     context: {
 *       operation: 'write',
 *       path: './data.json',
 *       data: jsonData,
 *       options: { encoding: 'utf8', flag: 'w' }
 *     }
 *   }
 * );
 *
 * Troubleshooting:
 * - File paths are logged as-is (consider privacy)
 * - Large file operations may impact performance
 * - Use absolute paths for clarity in logs
 */
export const fileTemplate: Template = {
  extends: 'base',
  debugData: (context, result, error) => ({
    operation: context.operation, // read, write, delete, etc.
    path: context.path,
    options: context.options,
    result: error
      ? {
          error: error.message,
          code: (error as FileSystemError).code,
        }
      : {
          size:
            (result as { size?: number } | null)?.size ||
            (context.data as { length?: number } | null)?.length,
          encoding: (context.encoding as string | undefined) || 'utf8',
          success: true,
        },
  }),
  cache: {
    enabled: false, // File operations typically shouldn't be cached
  },
  log: {
    format: (entry) => {
      const data = entry.data as { operation?: string; path?: string };
      return `[FILE] ${data.operation || 'unknown'} ${data.path || 'unknown'} - ${entry.status}`;
    },
  },
};
