/**
 * Unit tests for Upstash Vector client
 */

import {
  getIndex,
  upsertVector,
  upsertVectors,
  queryVectors,
  deleteVectors,
  deleteDocumentVectors,
  resetIndex,
} from '../../src/vector/upstash.js';
import type { VectorRecord } from '../../src/utils/types.js';

// Mock the Upstash Index
jest.mock('@upstash/vector', () => ({
  Index: jest.fn().mockImplementation(() => ({
    upsert: jest.fn().mockResolvedValue(undefined),
    query: jest
      .fn()
      .mockResolvedValue([{ id: 'test::chunk_0', score: 0.95, metadata: { text: 'test' } }]),
    delete: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('Upstash Vector client', () => {
  beforeEach(() => {
    resetIndex();
    jest.clearAllMocks();
  });

  describe('getIndex', () => {
    it('should throw error if credentials not configured', () => {
      process.env.UPSTASH_VECTOR_REST_URL = '';
      process.env.UPSTASH_VECTOR_REST_TOKEN = '';

      expect(() => getIndex()).toThrow('Configuration validation failed');
    });

    it('should return index instance if credentials are configured', () => {
      process.env.UPSTASH_VECTOR_REST_URL = 'https://test.upstash.io';
      process.env.UPSTASH_VECTOR_REST_TOKEN = 'test-token';

      const index = getIndex();
      expect(index).toBeDefined();
    });
  });

  describe('upsertVector', () => {
    beforeEach(() => {
      process.env.UPSTASH_VECTOR_REST_URL = 'https://test.upstash.io';
      process.env.UPSTASH_VECTOR_REST_TOKEN = 'test-token';
    });

    it('should upsert a single vector', async () => {
      const record: VectorRecord = {
        id: 'test::chunk_0',
        vector: Array(384).fill(0.1),
        metadata: {
          text: 'test text',
          file: 'test.md',
          path: './test.md',
          chunkIndex: 0,
        },
      };

      await expect(upsertVector(record)).resolves.not.toThrow();
    });
  });

  describe('upsertVectors', () => {
    beforeEach(() => {
      process.env.UPSTASH_VECTOR_REST_URL = 'https://test.upstash.io';
      process.env.UPSTASH_VECTOR_REST_TOKEN = 'test-token';
    });

    it('should upsert multiple vectors', async () => {
      const records: VectorRecord[] = [
        {
          id: 'test::chunk_0',
          vector: Array(384).fill(0.1),
          metadata: {
            text: 'test text 1',
            file: 'test.md',
            path: './test.md',
            chunkIndex: 0,
          },
        },
        {
          id: 'test::chunk_1',
          vector: Array(384).fill(0.2),
          metadata: {
            text: 'test text 2',
            file: 'test.md',
            path: './test.md',
            chunkIndex: 1,
          },
        },
      ];

      await expect(upsertVectors(records)).resolves.not.toThrow();
    });

    it('should handle empty array', async () => {
      await expect(upsertVectors([])).resolves.not.toThrow();
    });
  });

  describe('queryVectors', () => {
    beforeEach(() => {
      process.env.UPSTASH_VECTOR_REST_URL = 'https://test.upstash.io';
      process.env.UPSTASH_VECTOR_REST_TOKEN = 'test-token';
    });

    it('should query vectors', async () => {
      const vector = Array(384).fill(0.1);
      const results = await queryVectors(vector, 5);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('metadata');
    });

    it('should use default topK', async () => {
      const vector = Array(384).fill(0.1);
      await queryVectors(vector);
    });

    it('should use custom topK', async () => {
      const vector = Array(384).fill(0.1);
      await queryVectors(vector, 10);
    });
  });

  describe('deleteVectors', () => {
    beforeEach(() => {
      process.env.UPSTASH_VECTOR_REST_URL = 'https://test.upstash.io';
      process.env.UPSTASH_VECTOR_REST_TOKEN = 'test-token';
    });

    it('should delete vectors by IDs', async () => {
      const ids = ['test::chunk_0', 'test::chunk_1'];
      await expect(deleteVectors(ids)).resolves.not.toThrow();
    });

    it('should handle empty array', async () => {
      await expect(deleteVectors([])).resolves.not.toThrow();
    });
  });

  describe('deleteDocumentVectors', () => {
    beforeEach(() => {
      process.env.UPSTASH_VECTOR_REST_URL = 'https://test.upstash.io';
      process.env.UPSTASH_VECTOR_REST_TOKEN = 'test-token';
    });

    it('should delete vectors for a document', async () => {
      await expect(deleteDocumentVectors('doc123')).resolves.not.toThrow();
    });
  });

  describe('resetIndex', () => {
    it('should reset the index instance', () => {
      process.env.UPSTASH_VECTOR_REST_URL = 'https://test.upstash.io';
      process.env.UPSTASH_VECTOR_REST_TOKEN = 'test-token';

      getIndex();
      resetIndex();
      // Should create new instance on next call
      const index = getIndex();
      expect(index).toBeDefined();
    });
  });
});
