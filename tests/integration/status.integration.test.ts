/**
 * Integration tests for status command
 */

import { readIndex } from '../../src/storage/index.js';
import { ensureRagDir, updateIndex } from '../../src/storage/index.js';

describe('Status Command Integration', () => {
  beforeAll(async () => {
    // Setup test index
    await ensureRagDir();
    await updateIndex({
      files: 5,
      chunks: 42,
      embeddingModel: 'all-MiniLM-L6-v2',
      vectorDB: 'Upstash Vector',
      llmModel: 'qwen2.5:3b',
      lastIndexedAt: new Date('2026-05-22T12:00:00.000Z'),
      totalSize: 12500,
    });
  });

  afterAll(async () => {
    // Cleanup could be added here
  });

  it('should read index metadata', async () => {
    const index = await readIndex();
    expect(index.files).toBe(5);
    expect(index.chunks).toBe(42);
    expect(index.embeddingModel).toBe('all-MiniLM-L6-v2');
    expect(index.vectorDB).toBe('Upstash Vector');
    expect(index.llmModel).toBe('qwen2.5:3b');
  });

  it('should have valid timestamp', async () => {
    const index = await readIndex();
    expect(index.lastIndexedAt).toBeInstanceOf(Date);
    expect(index.lastIndexedAt.toISOString()).toBe('2026-05-22T12:00:00.000Z');
  });

  it('should have valid total size', async () => {
    const index = await readIndex();
    expect(index.totalSize).toBe(12500);
  });
});
