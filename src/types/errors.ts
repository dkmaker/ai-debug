// Error type definitions for better type safety

export interface HttpError extends Error {
  response?: {
    status: number;
    [key: string]: unknown;
  };
  code?: string;
}

export interface DatabaseError extends Error {
  code?: string;
  sqlState?: string;
}

export interface FileSystemError extends Error {
  code?: string;
}

export interface BusinessError extends Error {
  validation?: unknown;
}

// Type guard functions
export function isHttpError(error: unknown): error is HttpError {
  return error instanceof Error && 'response' in error;
}

export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof Error && ('sqlState' in error || 'code' in error);
}

export function isFileSystemError(error: unknown): error is FileSystemError {
  return error instanceof Error && 'code' in error;
}

export function isBusinessError(error: unknown): error is BusinessError {
  return error instanceof Error && 'validation' in error;
}
