import type { DatabaseError } from '../types/errors.js';
import type { Template } from '../types/index.js';

/**
 * Result structure from database operations.
 * @private
 */
interface DatabaseResult {
  fields?: Array<{ name?: string } | string>;
  rows?: Record<string, unknown>[];
  affectedRows?: number;
  rowsExamined?: number;
}

/**
 * Extracts field names from database result.
 * Handles various database driver result formats.
 *
 * @param {unknown} result - Database result object
 * @returns {string[] | undefined} Array of field names
 * @private
 */
function extractFields(result: unknown): string[] | undefined {
  if (!result || typeof result !== 'object') return undefined;

  const dbResult = result as DatabaseResult;

  if (dbResult.fields) {
    return dbResult.fields.map((f) => {
      if (typeof f === 'string') return f;
      return f.name || '';
    });
  }

  if (dbResult.rows && dbResult.rows.length > 0) {
    return Object.keys(dbResult.rows[0]);
  }

  return undefined;
}

/**
 * Extracts row count from database result.
 *
 * @param {unknown} result - Database result object
 * @returns {number} Number of rows affected or returned
 * @private
 */
function extractRowCount(result: unknown): number {
  if (!result || typeof result !== 'object') return 0;
  const dbResult = result as DatabaseResult;
  return dbResult.rows?.length || dbResult.affectedRows || 0;
}

/**
 * Extracts first row as sample from result set.
 *
 * @param {unknown} result - Database result object
 * @returns {unknown} First row of results
 * @private
 */
function extractSample(result: unknown): unknown {
  if (!result || typeof result !== 'object') return undefined;
  const dbResult = result as DatabaseResult;
  return dbResult.rows?.[0];
}

/**
 * Extracts performance metric for rows examined.
 *
 * @param {unknown} result - Database result object
 * @returns {number | undefined} Number of rows examined by query
 * @private
 */
function extractRowsExamined(result: unknown): number | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const dbResult = result as DatabaseResult;
  return dbResult.rowsExamined;
}

/**
 * Template for SQL database operations.
 * Captures query details, results, and performance metrics.
 *
 * @const databaseTemplate
 *
 * Expected context:
 * - sql: SQL query string
 * - params: Query parameters (for prepared statements)
 * - database: Database name or identifier
 * - transaction: Transaction ID if part of a transaction
 *
 * Captured data:
 * - Query SQL and parameters
 * - Database and transaction context
 * - Row count and field names
 * - First row sample for SELECT queries
 * - Error codes and SQL states
 * - Performance metrics (duration, rows examined)
 *
 * Performance tracking:
 * - Query duration in milliseconds
 * - Rows examined (if provided by driver)
 * - Helps identify slow queries and missing indexes
 *
 * Cache behavior:
 * - 1 hour TTL by default
 * - Only caches SELECT queries
 * - Cache key includes database, SQL, and parameters
 *
 * @example
 * await debug.wrap('get_user',
 *   () => db.query('SELECT * FROM users WHERE id = ?', [userId]),
 *   {
 *     template: 'database',
 *     context: {
 *       sql: 'SELECT * FROM users WHERE id = ?',
 *       params: [userId],
 *       database: 'production'
 *     }
 *   }
 * );
 *
 * @example
 * // With transaction support
 * await debug.wrap('update_balance',
 *   () => db.query('UPDATE accounts SET balance = ? WHERE id = ?', [newBalance, accountId]),
 *   {
 *     template: 'database',
 *     context: {
 *       sql: 'UPDATE accounts SET balance = ? WHERE id = ?',
 *       params: [newBalance, accountId],
 *       database: 'production',
 *       transaction: transactionId
 *     }
 *   }
 * );
 *
 * Troubleshooting:
 * - Large result sets may have truncated samples
 * - Ensure params are serializable for cache keys
 * - Transaction IDs help trace related queries
 */
export const databaseTemplate: Template = {
  extends: 'base',
  cacheContext: (context) => ({
    host: context.host,
    database: context.database,
    sql: context.sql,
    params: context.params,
  }),
  debugData: (context, result, error) => ({
    query: {
      sql: context.sql,
      params: context.params,
      database: context.database || 'default',
      transaction: context.transaction,
    },
    result: error
      ? {
          error: error.message,
          code: (error as DatabaseError).code,
          sqlState: (error as DatabaseError).sqlState,
        }
      : {
          rowCount: extractRowCount(result),
          fields: extractFields(result),
          sample: extractSample(result),
        },
    metrics: {
      duration_ms: context.duration,
      rows_examined: extractRowsExamined(result),
    },
  }),
  cache: {
    enabled: true,
    ttl: 60 * 60 * 1000, // 1 hour
    shouldCache: (_result, ctx) => !!ctx?.sql?.trim().toUpperCase().startsWith('SELECT'),
  },
  log: {
    format: (entry) => {
      const data = entry.data as Record<string, unknown>;
      const query = data.query as { database?: string } | undefined;
      const result = data.result as { rowCount?: number } | undefined;
      return `[DB] ${query?.database || 'unknown'} - ${result?.rowCount || 0} rows (${entry.duration_ms}ms)`;
    },
  },
};
