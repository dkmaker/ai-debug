export interface CacheConfig {
  enabled: boolean;
  defaultTTL: number;
  maxSize: number;
  strategy: 'lru' | 'fifo';
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class Cache {
  private cache: Map<string, CacheEntry<unknown>>;
  private config: CacheConfig;
  private accessOrder: string[];

  constructor(config: CacheConfig) {
    this.config = config;
    this.cache = new Map();
    this.accessOrder = [];
  }

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

  async delete(key: string): Promise<boolean> {
    this.removeFromAccessOrder(key);
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder = [];
  }

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

  private evictOne(): void {
    if (this.accessOrder.length === 0) return;

    const keyToEvict = this.accessOrder.shift();
    if (keyToEvict) {
      this.cache.delete(keyToEvict);
    }
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  // Cleanup expired entries periodically
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
