import { afterEach, vi } from 'vitest';
import { FileLogger } from '../src/core/logger.js';

// Global test cleanup
afterEach(() => {
  // Always reset FileLogger singleton between test files
  FileLogger.resetInstance();
});

// Mock fs module globally to prevent real file operations in tests
vi.mock('node:fs');

// Mock crypto module globally before any tests run
vi.mock('node:crypto', () => ({
  createHash: vi.fn(() => {
    let updateData = '';
    const mockHash = {
      update: vi.fn((data: string) => {
        updateData = String(data);
        return mockHash;
      }),
      digest: vi.fn(() => {
        // Generate different hashes for different content
        let hash = 5381;
        for (let i = 0; i < updateData.length; i++) {
          hash = (hash << 5) + hash + updateData.charCodeAt(i);
        }
        return Math.abs(hash).toString(16).substring(0, 8);
      }),
    };
    return mockHash;
  }),
  randomUUID: vi.fn(() => 'test-uuid-123'),
}));
