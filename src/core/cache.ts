/**
 * Configuration for the caching system.
 *
 * @interface CacheConfig
 * @property {boolean} enabled - Whether caching is enabled globally
 * @property {number} defaultTTL - Default time-to-live in seconds
 * @property {number} maxSize - Maximum number of cache entries
 * @property {'lru' | 'fifo'} strategy - Eviction strategy when cache is full
 *
 * @example
 * const cacheConfig: CacheConfig = {
 *   enabled: true,
 *   defaultTTL: 300, // 5 minutes
 *   maxSize: 1000,
 *   strategy: 'lru' // Least Recently Used
 * };
 */
export interface CacheConfig {
  enabled: boolean;
  defaultTTL: number;
  maxSize: number;
  strategy: 'lru' | 'fifo';
}

/**
 * Internal cache entry structure.
 *
 * @interface CacheEntry
 * @template T - Type of the cached value
 * @property {T} value - The cached value
 * @property {number} expiresAt - Timestamp when entry expires
 * @private
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * High-performance in-memory cache with LRU/FIFO eviction strategies.
 * Used internally by AIDebug to cache operation results.
 *
 * @class Cache
 *
 * Features:
 * - Configurable TTL per entry
 * - LRU (Least Recently Used) eviction
 * - FIFO (First In First Out) eviction
 * - Automatic cleanup of expired entries
 * - Size-based eviction
 *
 * @example
 * const cache = new Cache({
 *   enabled: true,
 *   defaultTTL: 300,
 *   maxSize: 1000,
 *   strategy: 'lru'
 * });
 *
 * // Store a value
 * await cache.set('user:123', userData, 600); // 10 min TTL
 *
 * // Retrieve a value
 * const user = await cache.get<User>('user:123');
 *
 * Troubleshooting:
 * - If cache misses are high, increase maxSize
 * - For frequently changing data, use shorter TTLs
 * - LRU is better for hot-spot access patterns
 * - FIFO is better for uniform access patterns
 */
export class Cache {
  private cache: Map<string, CacheEntry<unknown>>;
  private config: CacheConfig;
  private accessOrder: string[];

  /**
   * Creates a new cache instance.
   *
   * @param {CacheConfig} config - Cache configuration
   */
  constructor(config: CacheConfig) {
    this.config = config;
    this.cache = new Map();
    this.accessOrder = [];
  }

  /**
   * Retrieves a value from the cache.
   * Updates access order for LRU strategy.
   *
   * @template T - Expected type of the cached value
   * @param {string} key - Cache key to lookup
   * @returns {Promise<T | undefined>} The cached value or undefined if not found/expired
   *
   * @example
   * const userData = await cache.get<UserData>('user:123');
   * if (userData) {
   *   console.log('Cache hit!');
   * }
   */
  async get<T>(key: string): Promise<T | undefined> {
    if (!this.config.enabled) return undefined;

    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return undefined;
    }

    // Update access order for LRU
    if (this.config.strategy === 'lru') {
      this.removeFromAccessOrder(key);
      this.accessOrder.push(key);
    }

    return entry.value as T;
  }

  /**
   * Stores a value in the cache.
   * Evicts oldest/least-used entry if cache is full.
   *
   * @template T - Type of the value to cache
   * @param {string} key - Cache key
   * @param {T} value - Value to cache
   * @param {number} [ttl] - Time-to-live in seconds (overrides default)
   *
   * @example
   * // Cache with default TTL
   * await cache.set('api:users', userList);
   *
   * @example
   * // Cache with custom TTL
   * await cache.set('session:abc123', sessionData, 3600); // 1 hour
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.config.enabled) return;

    const expiresAt = Date.now() + (ttl || this.config.defaultTTL);

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictOne();
    }

    this.cache.set(key, { value, expiresAt });

    // Update access order
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Removes a specific entry from the cache.
   *
   * @param {string} key - Cache key to delete
   * @returns {Promise<boolean>} True if entry was deleted, false if not found
   *
   * @example
   * await cache.delete('user:123');
   */
  async delete(key: string): Promise<boolean> {
    this.removeFromAccessOrder(key);
    return this.cache.delete(key);
  }

  /**
   * Clears all entries from the cache.
   *
   * @example
   * await cache.clear();
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Returns current cache statistics.
   * Useful for monitoring cache performance.
   *
   * @returns {Object} Cache statistics
   * @returns {number} stats.size - Current number of entries
   * @returns {number} stats.maxSize - Maximum allowed entries
   * @returns {string} stats.strategy - Eviction strategy in use
   * @returns {number} [stats.hitRate] - Cache hit rate (if tracked)
   *
   * @example
   * const stats = cache.getStats();
   * console.log(`Cache usage: ${stats.size}/${stats.maxSize}`);
   */
  getStats(): {
    size: number;
    maxSize: number;
    strategy: string;
    hitRate?: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      strategy: this.config.strategy,
    };
  }

  /**
   * Evicts one entry based on the configured strategy.
   * LRU: Removes least recently used
   * FIFO: Removes oldest entry
   *
   * @private
   */
  private evictOne(): void {
    if (this.accessOrder.length === 0) return;

    const keyToEvict = this.accessOrder.shift();
    if (keyToEvict) {
      this.cache.delete(keyToEvict);
    }
  }

  /**
   * Removes a key from the access order tracking.
   *
   * @private
   * @param {string} key - Key to remove
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Starts periodic cleanup of expired entries.
   * Call this once after creating the cache.
   *
   * @param {number} [intervalMs=60000] - Cleanup interval in milliseconds
   *
   * @example
   * const cache = new Cache(config);
   * cache.startCleanup(30000); // Clean every 30 seconds
   */
  startCleanup(intervalMs = 60000): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
          this.removeFromAccessOrder(key);
        }
      }
    }, intervalMs);
  }
}
