/**
 * Error type definitions for better type safety in templates.
 * Each error type captures domain-specific error information.
 */

/**
 * HTTP/API error with response details.
 * Used by the http template to capture API failures.
 *
 * @interface HttpError
 * @extends {Error}
 * @property {Object} [response] - HTTP response information
 * @property {number} response.status - HTTP status code
 * @property {string} [code] - Error code (e.g., 'ECONNREFUSED', 'TIMEOUT')
 *
 * @example
 * const error: HttpError = {
 *   message: 'Request failed',
 *   response: { status: 404 },
 *   code: 'NOT_FOUND'
 * };
 */
export interface HttpError extends Error {
  response?: {
    status: number;
    [key: string]: unknown;
  };
  code?: string;
}

/**
 * Database error with SQL-specific information.
 * Used by the database template to capture query failures.
 *
 * @interface DatabaseError
 * @extends {Error}
 * @property {string} [code] - Database error code (e.g., 'ER_DUP_ENTRY')
 * @property {string} [sqlState] - SQL state code (e.g., '23505')
 *
 * @example
 * const error: DatabaseError = {
 *   message: 'Duplicate key violation',
 *   code: 'ER_DUP_ENTRY',
 *   sqlState: '23505'
 * };
 */
export interface DatabaseError extends Error {
  code?: string;
  sqlState?: string;
}

/**
 * File system error with OS-specific codes.
 * Used by the file template to capture I/O failures.
 *
 * @interface FileSystemError
 * @extends {Error}
 * @property {string} [code] - File system error code (e.g., 'ENOENT', 'EPERM')
 *
 * @example
 * const error: FileSystemError = {
 *   message: 'File not found',
 *   code: 'ENOENT'
 * };
 */
export interface FileSystemError extends Error {
  code?: string;
}

/**
 * Business logic error with validation details.
 * Used by the business template to capture domain errors.
 *
 * @interface BusinessError
 * @extends {Error}
 * @property {unknown} [validation] - Validation error details
 *
 * @example
 * const error: BusinessError = {
 *   message: 'Invalid order',
 *   validation: {
 *     fields: ['quantity', 'price'],
 *     rules: ['min:1', 'required']
 *   }
 * };
 */
export interface BusinessError extends Error {
  validation?: unknown;
}

// Type guard functions

/**
 * Type guard to check if an error is an HttpError.
 *
 * @param {unknown} error - Error to check
 * @returns {boolean} True if error is HttpError
 *
 * @example
 * if (isHttpError(error)) {
 *   console.log(`HTTP ${error.response?.status}`);
 * }
 */
export function isHttpError(error: unknown): error is HttpError {
  return error instanceof Error && 'response' in error;
}

/**
 * Type guard to check if an error is a DatabaseError.
 *
 * @param {unknown} error - Error to check
 * @returns {boolean} True if error is DatabaseError
 *
 * @example
 * if (isDatabaseError(error)) {
 *   console.log(`SQL State: ${error.sqlState}`);
 * }
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof Error && ('sqlState' in error || 'code' in error);
}

/**
 * Type guard to check if an error is a FileSystemError.
 *
 * @param {unknown} error - Error to check
 * @returns {boolean} True if error is FileSystemError
 *
 * @example
 * if (isFileSystemError(error)) {
 *   if (error.code === 'ENOENT') {
 *     console.log('File not found');
 *   }
 * }
 */
export function isFileSystemError(error: unknown): error is FileSystemError {
  return error instanceof Error && 'code' in error;
}

/**
 * Type guard to check if an error is a BusinessError.
 *
 * @param {unknown} error - Error to check
 * @returns {boolean} True if error is BusinessError
 *
 * @example
 * if (isBusinessError(error)) {
 *   console.log('Validation:', error.validation);
 * }
 */
export function isBusinessError(error: unknown): error is BusinessError {
  return error instanceof Error && 'validation' in error;
}
