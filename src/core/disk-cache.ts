import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import type { CacheEntry, CacheMetadata, DebugContext } from '../types/index.js';
import type { CacheConfig } from './cache.js';

/**
 * Disk-based cache implementation for AI Debug.
 * Stores cache entries and metadata on disk for persistence across restarts.
 *
 * @class DiskCache
 *
 * Directory structure:
 * - debug/<action>/cache/<cacheKey>.json - Cache entries
 * - debug/<action>/cache/<cacheKey>-expired-<timestamp>.json - Expired entries
 * - debug/<action>/cache/cache.json - Cache metadata
 *
 * Features:
 * - Persistent storage across process restarts
 * - TTL support with automatic expiration
 * - Metadata tracking (hits, misses, sizes)
 * - Context preservation for debugging
 * - Atomic file operations
 *
 * @example
 * const cache = new DiskCache(config, './debug');
 *
 * // Generate cache key
 * const key = cache.generateKey('fetch_user', { userId: 123 });
 *
 * // Get from cache
 * const cached = await cache.get('fetch_user', key);
 * if (cached && !cached.expired) {
 *   return cached.data;
 * }
 *
 * // Save to cache
 * await cache.set('fetch_user', key, userData, 300000, { userId: 123 });
 */
export class DiskCache {
  private config: CacheConfig;
  private baseDir: string;

  constructor(config: CacheConfig, baseDir: string) {
    this.config = config;
    this.baseDir = baseDir;
  }

  /**
   * Generates a deterministic cache key from action and context.
   * Uses SHA256 hash for consistent key generation.
   *
   * @param {string} action - The action name
   * @param {unknown} context - The context object to hash
   * @returns {string} A 16-character hash key
   *
   * @example
   * const key = cache.generateKey('fetch_user', {
   *   method: 'GET',
   *   url: '/api/users/123',
   *   headers: { 'Accept': 'application/json' }
   * });
   * // Returns: 'a1b2c3d4e5f6g7h8'
   */
  generateKey(action: string, context: unknown): string {
    const sortedContext = this.sortObjectKeys(context);
    const stableContext = this.removeVolatileFields(sortedContext);
    const contextStr = JSON.stringify(stableContext);

    return createHash('sha256').update(`${action}:${contextStr}`).digest('hex').substring(0, 16);
  }

  /**
   * Gets a cache entry from disk.
   * Checks expiration and renames expired files.
   *
   * @param {string} action - The action name
   * @param {string} cacheKey - The cache key
   * @returns {Promise<{data: unknown, expired: boolean} | null>} Cache entry or null
   *
   * @example
   * const cached = await cache.get('fetch_user', 'a1b2c3d4');
   * if (cached && !cached.expired) {
   *   console.log('Cache hit:', cached.data);
   * }
   */
  async get(action: string, cacheKey: string): Promise<{ data: unknown; expired: boolean } | null> {
    const cachePath = this.getCachePath(action, cacheKey);

    if (!existsSync(cachePath)) {
      await this.updateMetadata(action, cacheKey, false); // Record miss
      return null;
    }

    try {
      const content = readFileSync(cachePath, 'utf8');
      const entry: CacheEntry = JSON.parse(content);

      // Check expiration
      const now = Date.now();
      const created = new Date(entry.created).getTime();
      const expired = now - created > entry.ttl;

      if (expired) {
        // Rename to expired file
        const expiredPath = this.getCachePath(action, `${cacheKey}-expired-${now}`);
        renameSync(cachePath, expiredPath);
        await this.updateMetadata(action, cacheKey, false, true); // Mark as expired
        return { data: entry.data, expired: true };
      }

      await this.updateMetadata(action, cacheKey, true); // Record hit
      return { data: entry.data, expired: false };
    } catch (error) {
      console.error(`Failed to read cache ${cacheKey}:`, error);
      return null;
    }
  }

  /**
   * Saves data to cache on disk.
   * Creates necessary directories and updates metadata.
   *
   * @param {string} action - The action name
   * @param {string} cacheKey - The cache key
   * @param {unknown} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   * @param {unknown} context - Original context for debugging
   * @returns {Promise<void>}
   *
   * @example
   * await cache.set('fetch_user', 'a1b2c3d4', userData, 300000, {
   *   method: 'GET',
   *   url: '/api/users/123'
   * });
   */
  async set(
    action: string,
    cacheKey: string,
    data: unknown,
    ttl: number,
    context: unknown,
  ): Promise<void> {
    const cacheDir = this.getCacheDir(action);
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }

    const entry: CacheEntry = {
      data,
      created: new Date().toISOString(),
      ttl,
      context,
    };

    const cachePath = this.getCachePath(action, cacheKey);
    const content = JSON.stringify(entry, null, 2);

    // Write atomically using temp file
    const tempPath = `${cachePath}.tmp`;
    writeFileSync(tempPath, content);
    renameSync(tempPath, cachePath);

    // Update metadata
    await this.updateMetadata(action, cacheKey, false, false, {
      context,
      created: entry.created,
      ttl,
      size: content.length,
    });
  }

  /**
   * Clears all cache entries for an action.
   *
   * @param {string} action - The action name
   * @returns {Promise<void>}
   */
  async clear(action: string): Promise<void> {
    const cacheDir = this.getCacheDir(action);
    if (!existsSync(cacheDir)) return;

    const files = readdirSync(cacheDir);
    for (const file of files) {
      if (file !== 'cache.json') {
        unlinkSync(join(cacheDir, file));
      }
    }

    // Reset metadata
    const metadataPath = join(cacheDir, 'cache.json');
    if (existsSync(metadataPath)) {
      unlinkSync(metadataPath);
    }
  }

  /**
   * Updates cache metadata for tracking and analytics.
   *
   * @private
   */
  private async updateMetadata(
    action: string,
    cacheKey: string,
    hit: boolean,
    expired?: boolean,
    newEntry?: {
      context: unknown;
      created: string;
      ttl: number;
      size: number;
    },
  ): Promise<void> {
    const cacheDir = this.getCacheDir(action);
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }
    const metadataPath = join(cacheDir, 'cache.json');

    let metadata: CacheMetadata = {
      entries: {},
      stats: { totalHits: 0, totalMisses: 0, totalSize: 0 },
    };

    if (existsSync(metadataPath)) {
      try {
        const content = readFileSync(metadataPath, 'utf8');
        const loaded = JSON.parse(content);
        // Ensure structure is complete
        metadata = {
          entries: loaded.entries || {},
          stats: loaded.stats || { totalHits: 0, totalMisses: 0, totalSize: 0 },
        };
      } catch {
        // Start fresh if corrupted
      }
    }

    // Update stats
    if (hit) {
      metadata.stats.totalHits++;
    } else if (!newEntry) {
      metadata.stats.totalMisses++;
    }

    // Update entry
    if (newEntry) {
      metadata.entries[cacheKey] = {
        context: newEntry.context,
        created: newEntry.created,
        lastAccessed: new Date().toISOString(),
        hitCount: 0,
        size: newEntry.size,
        ttl: newEntry.ttl,
      };
      metadata.stats.totalSize += newEntry.size;
    } else if (metadata.entries[cacheKey]) {
      metadata.entries[cacheKey].lastAccessed = new Date().toISOString();
      if (hit) {
        metadata.entries[cacheKey].hitCount++;
      }
      if (expired) {
        metadata.entries[cacheKey].expired = true;
      }
    }

    // Save metadata
    const content = JSON.stringify(metadata, null, 2);
    const tempPath = `${metadataPath}.tmp`;
    writeFileSync(tempPath, content);
    renameSync(tempPath, metadataPath);
  }

  /**
   * Gets the cache directory path for an action.
   *
   * @private
   */
  private getCacheDir(action: string): string {
    return join(this.baseDir, action, 'cache');
  }

  /**
   * Gets the cache file path for a specific key.
   *
   * @private
   */
  private getCachePath(action: string, cacheKey: string): string {
    return join(this.getCacheDir(action), `${cacheKey}.json`);
  }

  /**
   * Sorts object keys recursively for consistent hashing.
   *
   * @private
   */
  private sortObjectKeys(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.sortObjectKeys(item));

    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort();

    for (const key of keys) {
      sorted[key] = this.sortObjectKeys((obj as Record<string, unknown>)[key]);
    }

    return sorted;
  }

  /**
   * Removes volatile fields that shouldn't affect cache key.
   *
   * @private
   */
  private removeVolatileFields(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.removeVolatileFields(item));

    const cleaned: Record<string, unknown> = {};
    const volatileFields = ['timestamp', 'requestId', 'traceId', 'sessionId', 'random', 'nonce'];

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (!volatileFields.includes(key)) {
        cleaned[key] = this.removeVolatileFields(value);
      }
    }

    return cleaned;
  }
}
