import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Cache } from '../../../src/core/cache.js';

describe('Cache', () => {
  let cache: Cache;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic operations', () => {
    beforeEach(() => {
      cache = new Cache({
        enabled: true,
        defaultTTL: 3600000, // 1 hour in milliseconds
        maxSize: 5,
        strategy: 'lru',
      });
    });

    it('stores and retrieves values', async () => {
      await cache.set('key1', 'value1');
      expect(await cache.get('key1')).toBe('value1');
    });

    it('returns undefined for non-existent keys', async () => {
      expect(await cache.get('non-existent')).toBeUndefined();
    });

    it('respects TTL expiration', async () => {
      await cache.set('expiring', 'value', 30000); // 30 seconds in milliseconds

      expect(await cache.get('expiring')).toBe('value');

      // Advance time by 31 seconds
      vi.advanceTimersByTime(31000);

      expect(await cache.get('expiring')).toBeUndefined();
    });

    it('uses default TTL when not specified', async () => {
      await cache.set('default-ttl', 'value');

      // Just before expiration
      vi.advanceTimersByTime(3599000);
      expect(await cache.get('default-ttl')).toBe('value');

      // After expiration
      vi.advanceTimersByTime(2000);
      expect(await cache.get('default-ttl')).toBeUndefined();
    });

    it('checks if key exists', async () => {
      await cache.set('exists', 'value');

      expect(await cache.has('exists')).toBe(true);
      expect(await cache.has('not-exists')).toBe(false);
    });

    it('deletes entries', async () => {
      await cache.set('to-delete', 'value');
      expect(await cache.has('to-delete')).toBe(true);

      await cache.delete('to-delete');
      expect(await cache.has('to-delete')).toBe(false);
    });

    it('clears all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      await cache.clear();

      expect(await cache.has('key1')).toBe(false);
      expect(await cache.has('key2')).toBe(false);
      expect(await cache.has('key3')).toBe(false);
    });

    it('returns correct size', async () => {
      expect(cache.size()).toBe(0);

      await cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);

      await cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);

      await cache.delete('key1');
      expect(cache.size()).toBe(1);
    });
  });

  describe('LRU eviction strategy', () => {
    beforeEach(() => {
      cache = new Cache({
        enabled: true,
        defaultTTL: 3600000,
        maxSize: 3,
        strategy: 'lru',
      });
    });

    it('evicts least recently used item when full', async () => {
      await cache.set('a', 1);
      await cache.set('b', 2);
      await cache.set('c', 3);

      // Cache is now full
      expect(cache.size()).toBe(3);

      // Access 'a' to make it recently used
      expect(await cache.get('a')).toBe(1);

      // Add new item, should evict 'b' (least recently used)
      await cache.set('d', 4);

      expect(await cache.has('a')).toBe(true); // Recently accessed
      expect(await cache.has('b')).toBe(false); // Evicted
      expect(await cache.has('c')).toBe(true); // Still there
      expect(await cache.has('d')).toBe(true); // Just added
    });

    it('updates LRU order on set', async () => {
      await cache.set('a', 1);
      await cache.set('b', 2);
      await cache.set('c', 3);

      // Update 'a' value, making it most recently used
      await cache.set('a', 11);

      // Add new items to trigger eviction
      await cache.set('d', 4); // Should evict 'b'
      await cache.set('e', 5); // Should evict 'c'

      expect(await cache.has('a')).toBe(true); // Recently updated
      expect(await cache.has('b')).toBe(false); // First evicted
      expect(await cache.has('c')).toBe(false); // Second evicted
      expect(await cache.has('d')).toBe(true);
      expect(await cache.has('e')).toBe(true);
    });

    it('handles get operations for LRU ordering', async () => {
      await cache.set('a', 1);
      await cache.set('b', 2);
      await cache.set('c', 3);

      // Access in order: b, a, c
      await cache.get('b');
      await cache.get('a');
      await cache.get('c');

      // Add new item, should evict 'b' (least recently accessed)
      await cache.set('d', 4);

      // Actually, the order after gets is: c (most recent), a, b (least recent)
      // So 'b' should be evicted
      expect(await cache.has('a')).toBe(true);
      expect(await cache.has('b')).toBe(false);
      expect(await cache.has('c')).toBe(true);
      expect(await cache.has('d')).toBe(true);
    });
  });

  describe('FIFO eviction strategy', () => {
    beforeEach(() => {
      cache = new Cache({
        enabled: true,
        defaultTTL: 3600000, // 1 hour in milliseconds
        maxSize: 3,
        strategy: 'fifo',
      });
    });

    it('evicts first item added when full', async () => {
      await cache.set('first', 1);
      await cache.set('second', 2);
      await cache.set('third', 3);

      // Cache is now full
      expect(cache.size()).toBe(3);

      // Add new item, should evict 'first' (oldest)
      await cache.set('fourth', 4);

      expect(await cache.has('first')).toBe(false); // Evicted (oldest)
      expect(await cache.has('second')).toBe(true);
      expect(await cache.has('third')).toBe(true);
      expect(await cache.has('fourth')).toBe(true);
    });

    it('maintains insertion order regardless of access', async () => {
      await cache.set('a', 1);
      await cache.set('b', 2);
      await cache.set('c', 3);

      // Access items (should not affect FIFO order)
      await cache.get('a');
      await cache.get('c');
      await cache.get('b');

      // Add new item, should still evict 'a' (first in)
      await cache.set('d', 4);

      expect(await cache.has('a')).toBe(false); // Evicted (first in)
      expect(await cache.has('b')).toBe(true);
      expect(await cache.has('c')).toBe(true);
      expect(await cache.has('d')).toBe(true);
    });

    it('handles updates without changing order', async () => {
      await cache.set('a', 1);
      await cache.set('b', 2);
      await cache.set('c', 3);

      // Update 'a' (should not change its position in FIFO)
      await cache.set('a', 11);

      // Add new item
      await cache.set('d', 4);

      // 'a' should still be evicted as it was first in
      expect(await cache.has('a')).toBe(false);
      expect(await cache.has('b')).toBe(true);
      expect(await cache.has('c')).toBe(true);
      expect(await cache.has('d')).toBe(true);
    });
  });

  describe('disabled cache', () => {
    beforeEach(() => {
      cache = new Cache({
        enabled: false,
        defaultTTL: 3600000, // 1 hour in milliseconds
        maxSize: 10,
        strategy: 'lru',
      });
    });

    it('does not store values when disabled', async () => {
      await cache.set('key', 'value');
      expect(await cache.get('key')).toBeUndefined();
      expect(await cache.has('key')).toBe(false);
      expect(cache.size()).toBe(0);
    });

    it('clear works even when disabled', async () => {
      await expect(cache.clear()).resolves.not.toThrow();
    });

    it('delete works even when disabled', async () => {
      await expect(cache.delete('any-key')).resolves.not.toThrow();
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      cache = new Cache({
        enabled: true,
        defaultTTL: 3600000,
        maxSize: 3,
        strategy: 'lru',
      });
    });

    it('handles null and undefined values', async () => {
      await cache.set('null', null);
      await cache.set('undefined', undefined);

      expect(await cache.get('null')).toBeNull();
      expect(await cache.get('undefined')).toBeUndefined();
      expect(await cache.has('null')).toBe(true);
      expect(await cache.has('undefined')).toBe(true);
    });

    it('handles complex objects', async () => {
      const complexObj = {
        nested: {
          array: [1, 2, 3],
          date: new Date('2024-01-01'),
        },
        fn: () => 'test',
      };

      await cache.set('complex', complexObj);
      const retrieved = await cache.get('complex');

      expect(retrieved).toBe(complexObj); // Same reference
      expect(retrieved?.nested.array).toEqual([1, 2, 3]);
    });

    it('handles zero and negative TTL', async () => {
      // Zero TTL should expire immediately
      await cache.set('zero-ttl', 'value', 0);
      vi.advanceTimersByTime(1);
      expect(await cache.get('zero-ttl')).toBeUndefined();

      // Negative TTL should also expire immediately
      await cache.set('negative-ttl', 'value', -100);
      expect(await cache.get('negative-ttl')).toBeUndefined();
    });

    it('handles cache size of 1', async () => {
      const tinyCache = new Cache({
        enabled: true,
        defaultTTL: 3600000, // 1 hour in milliseconds
        maxSize: 1,
        strategy: 'lru',
      });

      await tinyCache.set('a', 1);
      expect(await tinyCache.get('a')).toBe(1);

      await tinyCache.set('b', 2);
      expect(await tinyCache.get('a')).toBeUndefined();
      expect(await tinyCache.get('b')).toBe(2);
    });

    it('cleans up expired entries on access', async () => {
      await cache.set('expire1', 'value1', 10000); // 10 seconds in milliseconds
      await cache.set('expire2', 'value2', 20000); // 20 seconds in milliseconds
      await cache.set('keep', 'value3', 3600000); // 1 hour in milliseconds

      vi.advanceTimersByTime(15000); // 15 seconds

      // Accessing expired entry should clean it up
      expect(await cache.get('expire1')).toBeUndefined();
      expect(cache.size()).toBe(2); // Only expire2 and keep remain

      vi.advanceTimersByTime(10000); // 10 more seconds
      expect(await cache.get('expire2')).toBeUndefined();
      expect(cache.size()).toBe(1); // Only keep remains
    });
  });

  describe('performance considerations', () => {
    it('handles large number of entries with eviction', async () => {
      const largeCache = new Cache({
        enabled: true,
        defaultTTL: 3600000, // 1 hour in milliseconds
        maxSize: 1000,
        strategy: 'lru',
      });

      // Add many entries
      for (let i = 0; i < 1500; i++) {
        await largeCache.set(`key${i}`, `value${i}`);
      }

      // Should maintain maxSize
      expect(largeCache.size()).toBe(1000);

      // Early entries should be evicted
      expect(await largeCache.has('key0')).toBe(false);
      expect(await largeCache.has('key499')).toBe(false);

      // Recent entries should exist
      expect(await largeCache.has('key1499')).toBe(true);
      expect(await largeCache.has('key1000')).toBe(true);
    });

    it('performs well with rapid get/set operations', async () => {
      const start = performance.now();

      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        await cache.set(`k${i % 10}`, i); // Reuse keys
        await cache.get(`k${(i + 5) % 10}`); // Access different keys
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // Should be fast
    });
  });
});
