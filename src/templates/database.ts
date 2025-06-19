import { createHash } from 'node:crypto';
import type { DatabaseError } from '../types/errors.js';
import type { Template } from '../types/index.js';

function hash(data: unknown): string {
  const str = JSON.stringify(data);
  return createHash('sha256').update(str).digest('hex').slice(0, 8);
}

interface DatabaseResult {
  fields?: Array<{ name?: string } | string>;
  rows?: Record<string, unknown>[];
  affectedRows?: number;
  rowsExamined?: number;
}

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

function extractRowCount(result: unknown): number {
  if (!result || typeof result !== 'object') return 0;
  const dbResult = result as DatabaseResult;
  return dbResult.rows?.length || dbResult.affectedRows || 0;
}

function extractSample(result: unknown): unknown {
  if (!result || typeof result !== 'object') return undefined;
  const dbResult = result as DatabaseResult;
  return dbResult.rows?.[0];
}

function extractRowsExamined(result: unknown): number | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const dbResult = result as DatabaseResult;
  return dbResult.rowsExamined;
}

export const databaseTemplate: Template = {
  extends: 'base',
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
    key: (ctx) => `db:${ctx.database}:${hash(ctx.sql + JSON.stringify(ctx.params))}`,
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
