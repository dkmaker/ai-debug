import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileLogger } from '../../../src/core/logger.js';
import type { DebugEntry } from '../../../src/types/index.js';
import { flushPromises } from '../../test-utils.js';

// Mock the entire fs module
vi.mock('node:fs');

describe('FileLogger', () => {
  let logger: FileLogger;
  let mockWriteStream: any;

  const config = {
    enabled: true,
    path: './test-debug/debug.log',
    maxSize: '10MB',
    maxFiles: 3,
    format: 'json' as const,
    compress: false,
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset singleton instance
    FileLogger.instance = undefined;

    // Create mock write stream
    mockWriteStream = {
      write: vi.fn((_data, callback) => {
        if (callback) callback();
      }),
      end: vi.fn(),
    };

    // Set up fs mocks
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.statSync).mockReturnValue({ size: 0 } as any);
    vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as any);
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    vi.mocked(fs.unlinkSync).mockImplementation(() => undefined);
    vi.mocked(fs.renameSync).mockImplementation(() => undefined);
  });

  afterEach(() => {
    if (FileLogger.instance) {
      FileLogger.getInstance(config).close();
    }
  });

  describe('singleton pattern', () => {
    it('returns same instance on multiple calls', () => {
      const instance1 = FileLogger.getInstance(config);
      const instance2 = FileLogger.getInstance(config);

      expect(instance1).toBe(instance2);
    });

    it('creates directory if it does not exist', async () => {
      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);

      FileLogger.getInstance(config);

      expect(fs.mkdirSync).toHaveBeenCalledWith('./test-debug', { recursive: true });
    });

    it('initializes file stream', async () => {
      const fs = await import('node:fs');
      FileLogger.getInstance(config);

      expect(fs.createWriteStream).toHaveBeenCalledWith('./test-debug/debug.log', { flags: 'a' });
    });
  });

  describe('logging operations', () => {
    beforeEach(() => {
      logger = FileLogger.getInstance(config);
    });

    it('logs entry in JSON format', async () => {
      const entry: DebugEntry = {
        id: 'test-123',
        action: 'test_action',
        key: 'test_key',
        timestamp: '2024-01-01T00:00:00.000Z',
        duration_ms: 100,
        status: 'success',
        data: { result: 'test' },
        cached: false,
        templateUsed: 'base',
      };

      await logger.log(entry);
      await flushPromises();

      expect(mockWriteStream.write).toHaveBeenCalled();
      const writtenData = mockWriteStream.write.mock.calls[0][0];
      expect(writtenData).toContain(JSON.stringify(entry));
      expect(writtenData).toContain('\n');
    });

    it('logs entry in pretty format', async () => {
      const prettyConfig = {
        ...config,
        format: 'pretty' as const,
      };

      // Create new instance with pretty format
      FileLogger.instance = undefined;
      const prettyLogger = FileLogger.getInstance(prettyConfig);

      const entry: DebugEntry = {
        id: 'test-123',
        action: 'test_action',
        key: 'test_key',
        timestamp: '2024-01-01T00:00:00.000Z',
        duration_ms: 100,
        status: 'success',
        data: {},
        cached: true,
        templateUsed: 'base',
      };

      await prettyLogger.log(entry);
      await flushPromises();

      const writtenData = mockWriteStream.write.mock.calls[0][0];
      expect(writtenData).toContain('✓');
      expect(writtenData).toContain('test_action');
      expect(writtenData).toContain('100ms');
      expect(writtenData).toContain('(cached)');
    });

    it('handles write errors gracefully', async () => {
      mockWriteStream.write.mockImplementation((_data: any, cb: any) => {
        cb(new Error('Disk full'));
      });

      const entry: DebugEntry = {
        id: 'test-123',
        action: 'test_action',
        key: 'test_key',
        timestamp: new Date().toISOString(),
        duration_ms: 100,
        status: 'failure',
        data: {},
        cached: false,
        templateUsed: 'base',
      };

      // Should reject with the error
      await expect(logger.log(entry)).rejects.toThrow('Disk full');
    });

    it('processes queue in batches', async () => {
      // Add many entries quickly
      const promises = [];
      for (let i = 0; i < 150; i++) {
        const entry: DebugEntry = {
          id: `test-${i}`,
          action: `action_${i}`,
          key: `key_${i}`,
          timestamp: new Date().toISOString(),
          duration_ms: i,
          status: 'success',
          data: {},
          cached: false,
          templateUsed: 'base',
        };
        promises.push(logger.log(entry));
      }

      await Promise.all(promises);
      await flushPromises();

      // Should batch in groups of 100
      expect(mockWriteStream.write.mock.calls.length).toBeGreaterThanOrEqual(2);

      // Check that entries were written
      const allWrites = mockWriteStream.write.mock.calls.map((call) => call[0]).join('');
      const totalEntries = (allWrites.match(/\n/g) || []).length;
      expect(totalEntries).toBe(150);
    });

    it('handles concurrent writes without conflicts', async () => {
      const writes = Array(50)
        .fill(null)
        .map((_, i) => {
          const entry: DebugEntry = {
            id: `concurrent-${i}`,
            action: `action_${i}`,
            key: `key_${i}`,
            timestamp: new Date().toISOString(),
            duration_ms: Math.random() * 100,
            status: Math.random() > 0.5 ? 'success' : 'failure',
            data: { index: i },
            cached: false,
            templateUsed: 'base',
          };
          return logger.log(entry);
        });

      await Promise.all(writes);
      await flushPromises();

      // All writes should complete without error
      expect(mockWriteStream.write).toHaveBeenCalled();
    });
  });

  describe('file rotation', () => {
    it('rotates file when size limit reached', async () => {
      const fs = await import('node:fs');
      // Set current file size to near limit (10MB - 1KB)
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.statSync).mockReturnValue({ size: 10 * 1024 * 1024 - 1024 } as any);

      const logger = FileLogger.getInstance({
        ...config,
        maxSize: '10MB',
      });

      // Log large entry that exceeds limit
      const largeEntry: DebugEntry = {
        id: 'large',
        action: 'large_action',
        key: 'large_key',
        timestamp: new Date().toISOString(),
        duration_ms: 100,
        status: 'success',
        data: { large: 'x'.repeat(2000) }, // > 1KB
        cached: false,
        templateUsed: 'base',
      };

      await logger.log(largeEntry);
      await flushPromises();

      // Should rename current file and create new stream
      expect(fs.renameSync).toHaveBeenCalled();
      expect(fs.createWriteStream).toHaveBeenCalledTimes(2); // Initial + rotation
    });

    it('maintains circular buffer of log files', async () => {
      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        // Simulate existing rotated files
        return typeof path === 'string' && (path.includes('.1.log') || path.includes('.2.log'));
      });

      const logger = FileLogger.getInstance({
        ...config,
        maxFiles: 3,
      });

      // Force multiple rotations
      for (let i = 0; i < 5; i++) {
        logger.rotateFile();
      }

      // Should delete old files when exceeding maxFiles
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('handles rotation errors gracefully', async () => {
      const fs = await import('node:fs');
      vi.mocked(fs.renameSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const logger = FileLogger.getInstance(config);

      // Force rotation
      logger.currentFileSize = 11 * 1024 * 1024; // 11MB

      const entry: DebugEntry = {
        id: 'test',
        action: 'test',
        key: 'test',
        timestamp: new Date().toISOString(),
        duration_ms: 100,
        status: 'success',
        data: {},
        cached: false,
        templateUsed: 'base',
      };

      // Should not throw, continues with current file
      await expect(logger.log(entry)).resolves.toBeUndefined();
    });
  });

  describe('configuration', () => {
    it('parses size strings correctly', () => {
      const testCases = [
        { input: '100KB', expected: 100 * 1024 },
        { input: '10MB', expected: 10 * 1024 * 1024 },
        { input: '1GB', expected: 1024 * 1024 * 1024 },
        { input: '500', expected: 500 }, // Plain number
      ];

      testCases.forEach(({ input, expected }) => {
        const result = FileLogger.parseSize(input);
        expect(result).toBe(expected);
      });
    });

    it('disables logging when enabled is false', async () => {
      const fs = await import('node:fs');
      const disabledLogger = FileLogger.getInstance({
        ...config,
        enabled: false,
      });

      const entry: DebugEntry = {
        id: 'test',
        action: 'test',
        key: 'test',
        timestamp: new Date().toISOString(),
        duration_ms: 100,
        status: 'success',
        data: {},
        cached: false,
        templateUsed: 'base',
      };

      await disabledLogger.log(entry);

      // Should not create stream or write
      expect(fs.createWriteStream).not.toHaveBeenCalled();
    });

    it('handles invalid size format', () => {
      expect(() => FileLogger.parseSize('invalid')).not.toThrow();
      expect(FileLogger.parseSize('invalid')).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('closes file stream on close()', () => {
      const logger = FileLogger.getInstance(config);

      logger.close();

      expect(mockWriteStream.end).toHaveBeenCalled();
    });

    it('handles multiple close() calls safely', () => {
      const logger = FileLogger.getInstance(config);

      logger.close();
      logger.close(); // Second call should not throw

      expect(() => logger.close()).not.toThrow();
    });

    it('flushes pending writes before closing', async () => {
      const logger = FileLogger.getInstance(config);

      // Make writes async to test flushing
      let writeCallCount = 0;
      mockWriteStream.write.mockImplementation((_data: any, cb: any) => {
        writeCallCount++;
        // Delay callback to simulate async write
        setTimeout(() => cb(), 10);
      });

      // Add entries to queue
      const promises = Array(10)
        .fill(null)
        .map((_, i) =>
          logger.log({
            id: `closing-${i}`,
            action: 'test',
            key: 'test',
            timestamp: new Date().toISOString(),
            duration_ms: 100,
            status: 'success',
            data: {},
            cached: false,
            templateUsed: 'base',
          }),
        );

      // Wait for writes to complete
      await Promise.all(promises);

      // Close should have been called after writes
      logger.close();

      expect(writeCallCount).toBeGreaterThan(0);
    });
  });

  describe('error scenarios', () => {
    it('handles directory creation failure', async () => {
      const fs = await import('node:fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Should not throw during construction
      expect(() => FileLogger.getInstance(config)).not.toThrow();
    });

    it('recovers from stream errors', async () => {
      const logger = FileLogger.getInstance(config);

      // First write fails
      mockWriteStream.write.mockImplementationOnce((_data: any, cb: any) => {
        cb(new Error('Stream error'));
      });

      // Second write succeeds
      mockWriteStream.write.mockImplementationOnce((_data: any, cb: any) => {
        cb();
      });

      const entry: DebugEntry = {
        id: 'test',
        action: 'test',
        key: 'test',
        timestamp: new Date().toISOString(),
        duration_ms: 100,
        status: 'success',
        data: {},
        cached: false,
        templateUsed: 'base',
      };

      // First attempt fails
      await expect(logger.log(entry)).rejects.toThrow('Stream error');

      // Second attempt succeeds
      await expect(logger.log(entry)).resolves.toBeUndefined();
    });
  });
});
