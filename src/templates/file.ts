import type { FileSystemError } from '../types/errors.js';
import type { Template } from '../types/index.js';

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
