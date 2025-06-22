import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DebugPersistence } from '../../../src/core/persistence.js';
import type { DebugEntry } from '../../../src/types/index.js';

// Mock modules
vi.mock('node:zlib');
vi.mock('node:util');

describe('DebugPersistence', () => {
  let persistence: DebugPersistence;
  const baseEntry: DebugEntry = {
    id: 'test-123',
    action: 'test_action',
    timestamp: '2024-01-01T00:00:00.000Z',
    duration_ms: 100,
    status: 'success',
    data: { result: 'test' },
    cached: false,
    templateUsed: 'base',
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Set up fs mocks
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

    // Set up zlib mocks
    const zlib = await import('node:zlib');
    vi.mocked(zlib.gzip).mockImplementation((_data: any, cb: any) => {
      if (typeof cb === 'function') {
        cb(null, Buffer.from('gzipped'));
      }
      return Buffer.from('gzipped');
    });

    // Set up util mocks
    const util = await import('node:util');
    vi.mocked(util.promisify).mockImplementation((fn: any) => {
      return async (...args: any[]) => {
        return new Promise((resolve, reject) => {
          fn(...args, (err: any, result: any) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
      };
    });

    // Set up crypto mocks
    const crypto = await import('node:crypto');
    vi.mocked(crypto.createHash).mockImplementation((_algorithm: string) => {
      let updateData = '';
      const mockHash = {
        update: vi.fn((data: string) => {
          updateData = String(data);
          return mockHash;
        }),
        digest: vi.fn(() => {
          // Generate a hash based on the content
          // Simple but deterministic hash that produces different results
          if (!updateData) return '00000000';

          let hash = 0;
          for (let i = 0; i < updateData.length; i++) {
            const char = updateData.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit int
          }

          // Convert to hex and ensure it's not all zeros
          const hexHash = Math.abs(hash).toString(16);
          // Pad to ensure consistent length but keep uniqueness at the start
          return hexHash.padEnd(16, '0');
        }),
      };
      return mockHash as any;
    });
  });

  describe('key-based structure', () => {
    beforeEach(() => {
      persistence = new DebugPersistence({
        baseDir: './debug',
        structure: 'key-based',
        compression: 'none',
      });
    });

    it('creates correct directory structure', async () => {
      const fs = await import('node:fs');
      await persistence.save(baseEntry);

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('debug/test_action'), {
        recursive: true,
      });
    });

    it('generates correct file path', async () => {
      const fs = await import('node:fs');
      await persistence.save(baseEntry);

      const expectedPath = 'debug/test_action/2024-01-01T00-00-00-000Z.json';
      expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expect.any(String));
    });

    it('sanitizes path names', async () => {
      const fs = await import('node:fs');
      const entry: DebugEntry = {
        ...baseEntry,
        action: 'test/action:with<>special|chars?*',
      };

      await persistence.save(entry);

      // Should replace problematic characters
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringMatching(/test_action_with__special_chars__/),
        expect.any(Object),
      );
    });

    it('limits path length', async () => {
      const fs = await import('node:fs');
      const entry: DebugEntry = {
        ...baseEntry,
        action: 'a'.repeat(200), // Very long action name
      };

      await persistence.save(entry);

      const mkdirCall = vi.mocked(fs.mkdirSync).mock.calls[0][0] as string;
      const pathParts = mkdirCall.split('/');
      const actionDir = pathParts[1]; // debug/[action]/key
      expect(actionDir).toBeDefined();
      expect(actionDir.length).toBeLessThanOrEqual(100);
    });

    it('saves data as formatted JSON', async () => {
      const fs = await import('node:fs');
      await persistence.save(baseEntry);

      const savedData = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
      const parsed = JSON.parse(savedData);

      expect(parsed).toEqual(baseEntry);
      expect(savedData).toContain('\n'); // Pretty printed
    });
  });

  describe('date-based structure', () => {
    beforeEach(() => {
      persistence = new DebugPersistence({
        baseDir: './debug',
        structure: 'date-based',
        compression: 'none',
      });
    });

    it('creates date-based directory structure', async () => {
      const fs = await import('node:fs');
      await persistence.save(baseEntry);

      expect(fs.mkdirSync).toHaveBeenCalledWith('debug/2024/01/01', { recursive: true });
    });

    it('generates correct file name', async () => {
      const fs = await import('node:fs');
      const timestampMs = new Date(baseEntry.timestamp).getTime();
      const expectedFilename = `test_action-${timestampMs}.json`;

      await persistence.save(baseEntry);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(expectedFilename),
        expect.any(String),
      );
    });

    it('handles different dates correctly', async () => {
      const fs = await import('node:fs');
      const entries = [
        { ...baseEntry, timestamp: '2024-01-01T00:00:00.000Z' },
        { ...baseEntry, timestamp: '2024-02-15T00:00:00.000Z' },
        { ...baseEntry, timestamp: '2025-01-01T00:00:00.000Z' },
      ];

      for (const entry of entries) {
        await persistence.save(entry);
      }

      expect(fs.mkdirSync).toHaveBeenCalledWith('debug/2024/01/01', expect.any(Object));
      expect(fs.mkdirSync).toHaveBeenCalledWith('debug/2024/02/15', expect.any(Object));
      expect(fs.mkdirSync).toHaveBeenCalledWith('debug/2025/01/01', expect.any(Object));
    });
  });

  describe('compression', () => {
    it('compresses data when gzip enabled', async () => {
      const fs = await import('node:fs');
      persistence = new DebugPersistence({
        baseDir: './debug',
        structure: 'key-based',
        compression: 'gzip',
      });

      await persistence.save(baseEntry);

      // Should write compressed buffer
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.json.gz'),
        expect.any(Buffer),
      );
    });

    it('does not compress when compression disabled', async () => {
      const fs = await import('node:fs');
      persistence = new DebugPersistence({
        baseDir: './debug',
        structure: 'key-based',
        compression: 'none',
      });

      await persistence.save(baseEntry);

      // Should write plain JSON string
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('.json'),
        expect.any(String),
      );

      // Should not have .gz extension
      const filePath = vi.mocked(fs.writeFileSync).mock.calls[0][0] as string;
      expect(filePath).not.toContain('.gz');
    });

    it('handles compression errors', async () => {
      persistence = new DebugPersistence({
        baseDir: './debug',
        structure: 'key-based',
        compression: 'gzip',
      });

      // Mock compression failure
      const zlib = await import('node:zlib');
      vi.mocked(zlib.gzip).mockImplementationOnce((_data, cb: any) => {
        cb(new Error('Compression failed'), null);
      });

      await expect(persistence.save(baseEntry)).rejects.toThrow('Compression failed');
    });
  });

  describe('hash generation', () => {
    beforeEach(() => {
      persistence = new DebugPersistence({
        baseDir: './debug',
        structure: 'key-based',
        compression: 'none',
      });
    });

    it('generates consistent hash for same content', () => {
      const hash1 = persistence.generateHash(baseEntry);
      const hash2 = persistence.generateHash(baseEntry);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(8); // Shortened hash (first 8 chars)
    });

    it('generates different hashes for different content', () => {
      const entry1 = { ...baseEntry, data: { result: 'test1' } };
      const entry2 = { ...baseEntry, data: { result: 'test2' } };

      const hash1 = persistence.generateHash(entry1);
      const hash2 = persistence.generateHash(entry2);

      // Hashes should be 8 characters long
      expect(hash1).toHaveLength(8);
      expect(hash2).toHaveLength(8);
      // And different for different content
      expect(hash1).not.toBe(hash2);
    });

    it('includes action and key in hash', () => {
      const entry1 = { ...baseEntry, action: 'action1' };
      const entry2 = { ...baseEntry, action: 'action2' };

      const hash1 = persistence.generateHash(entry1);
      const hash2 = persistence.generateHash(entry2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      persistence = new DebugPersistence({
        baseDir: './debug',
        structure: 'key-based',
        compression: 'none',
      });
    });

    it('creates base directory if not exists', async () => {
      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      new DebugPersistence({
        baseDir: './new-debug',
        structure: 'key-based',
        compression: 'none',
      });

      expect(fs.mkdirSync).toHaveBeenCalledWith('./new-debug', { recursive: true });
    });

    it('handles directory creation errors during save', async () => {
      const fs = await import('node:fs');
      vi.mocked(fs.mkdirSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await expect(persistence.save(baseEntry)).rejects.toThrow('Permission denied');
    });

    it('handles file write errors', async () => {
      const fs = await import('node:fs');
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Disk full');
      });

      await expect(persistence.save(baseEntry)).rejects.toThrow('Disk full');
    });

    it('continues if base directory exists', async () => {
      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.mkdirSync).mockImplementation(() => {
        throw new Error('Already exists');
      });

      // Should not throw
      expect(
        () =>
          new DebugPersistence({
            baseDir: './debug',
            structure: 'key-based',
            compression: 'none',
          }),
      ).not.toThrow();
    });
  });

  describe('load functionality', () => {
    beforeEach(() => {
      persistence = new DebugPersistence({
        baseDir: './debug',
        structure: 'key-based',
        compression: 'none',
      });
    });

    it('returns empty array (not implemented)', async () => {
      const entries = await persistence.load('test_action', 'test_key');
      expect(entries).toEqual([]);
    });

    it('accepts optional key parameter', async () => {
      const entries = await persistence.load('test_action');
      expect(entries).toEqual([]);
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      persistence = new DebugPersistence({
        baseDir: './debug',
        structure: 'key-based',
        compression: 'none',
      });
    });

    it('handles entries with no data', async () => {
      const fs = await import('node:fs');
      const emptyEntry: DebugEntry = {
        ...baseEntry,
        data: {},
      };

      await persistence.save(emptyEntry);

      const savedData = JSON.parse(vi.mocked(fs.writeFileSync).mock.calls[0][1] as string);
      expect(savedData.data).toEqual({});
    });

    it('handles entries with complex data', async () => {
      const fs = await import('node:fs');
      const complexEntry: DebugEntry = {
        ...baseEntry,
        data: {
          nested: {
            array: [1, 2, { deep: 'value' }],
            nullValue: null,
            undefinedValue: undefined,
          },
          date: new Date('2024-01-01'),
          bigNumber: BigInt(9007199254740991),
        },
      };

      await persistence.save(complexEntry);

      // Should not throw during JSON serialization
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('handles special characters in timestamps', async () => {
      const fs = await import('node:fs');
      const entry: DebugEntry = {
        ...baseEntry,
        timestamp: '2024-01-01T12:30:45.123Z',
      };

      await persistence.save(entry);

      // Colons and dots should be replaced in the timestamp part, but .json extension is ok
      const filePath = vi.mocked(fs.writeFileSync).mock.calls[0][0] as string;
      expect(filePath).not.toMatch(/:/); // No colons
      // Check that the timestamp part doesn't have dots (except for .json extension)
      const timestampPart = filePath.replace(/\.json(\.gz)?$/, '');
      expect(timestampPart).not.toMatch(/\./);
      expect(filePath).toContain('2024-01-01T12-30-45-123Z');
    });
  });
});
