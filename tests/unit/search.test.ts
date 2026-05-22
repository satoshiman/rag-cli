/**
 * Unit tests for vector search functionality
 */

import { search, searchChunks } from '../../src/vector/search.js';

// Mock dependencies
jest.mock('../../src/core/embedding.js', () => ({
  generateEmbedding: jest.fn(),
}));

jest.mock('../../src/vector/upstash.js', () => ({
  queryVectors: jest.fn(),
}));

jest.mock('../../src/config/env.js', () => ({
  getConfig: jest.fn(() => ({
    searchTopK: 5,
    embeddingModel: 'all-MiniLM-L6-v2',
  })),
}));

import { generateEmbedding } from '../../src/core/embedding.js';
import { queryVectors } from '../../src/vector/upstash.js';

const mockGenerateEmbedding = generateEmbedding as jest.MockedFunction<typeof generateEmbedding>;
const mockQueryVectors = queryVectors as jest.MockedFunction<typeof queryVectors>;

describe('search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate embedding for query and search vectors', async () => {
    const query = 'test query';
    const mockVector = Array(384).fill(0.1);
    const mockResults: Array<{
      id: string;
      score: number;
      metadata: {
        text: string;
        file: string;
        path: string;
        chunkIndex: number;
        documentId?: string;
      };
    }> = [
      {
        id: 'doc1::chunk_0',
        score: 0.95,
        metadata: {
          text: 'This is a test chunk',
          file: 'doc1.md',
          path: './docs/doc1.md',
          chunkIndex: 0,
        },
      },
    ];

    mockGenerateEmbedding.mockResolvedValue({
      text: query,
      vector: mockVector,
      dimensions: 384,
    });

    mockQueryVectors.mockResolvedValue(mockResults);

    const result = await search(query);

    expect(mockGenerateEmbedding).toHaveBeenCalledWith(query, 'all-MiniLM-L6-v2');
    expect(mockQueryVectors).toHaveBeenCalledWith(mockVector, 5, undefined);
    expect(result.query).toBe(query);
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].text).toBe('This is a test chunk');
    expect(result.chunks[0].score).toBe(0.95);
  });

  it('should use custom topK when provided', async () => {
    const query = 'test query';
    const mockVector = Array(384).fill(0.1);
    const mockResults: Array<{
      id: string;
      score: number;
      metadata: {
        text: string;
        file: string;
        path: string;
        chunkIndex: number;
        documentId?: string;
      };
    }> = [];

    mockGenerateEmbedding.mockResolvedValue({
      text: query,
      vector: mockVector,
      dimensions: 384,
    });

    mockQueryVectors.mockResolvedValue(mockResults);

    await search(query, { topK: 10 });

    expect(mockQueryVectors).toHaveBeenCalledWith(mockVector, 10, undefined);
  });

  it('should use filter when provided', async () => {
    const query = 'test query';
    const mockVector = Array(384).fill(0.1);
    const mockResults: Array<{
      id: string;
      score: number;
      metadata: {
        text: string;
        file: string;
        path: string;
        chunkIndex: number;
        documentId?: string;
      };
    }> = [];
    const filter = { file: 'doc1.md' };

    mockGenerateEmbedding.mockResolvedValue({
      text: query,
      vector: mockVector,
      dimensions: 384,
    });

    mockQueryVectors.mockResolvedValue(mockResults);

    await search(query, { topK: 5, filter });

    expect(mockQueryVectors).toHaveBeenCalledWith(mockVector, 5, filter);
  });

  it('should convert vector results to chunks with correct structure', async () => {
    const query = 'test query';
    const mockVector = Array(384).fill(0.1);
    const mockResults: Array<{
      id: string;
      score: number;
      metadata: {
        text: string;
        file: string;
        path: string;
        chunkIndex: number;
        documentId?: string;
      };
    }> = [
      {
        id: 'doc1::chunk_0',
        score: 0.95,
        metadata: {
          text: 'Chunk text 1',
          file: 'doc1.md',
          path: './docs/doc1.md',
          chunkIndex: 0,
          documentId: 'doc1',
        },
      },
      {
        id: 'doc2::chunk_1',
        score: 0.87,
        metadata: {
          text: 'Chunk text 2',
          file: 'doc2.md',
          path: './docs/doc2.md',
          chunkIndex: 1,
        },
      },
    ];

    mockGenerateEmbedding.mockResolvedValue({
      text: query,
      vector: mockVector,
      dimensions: 384,
    });

    mockQueryVectors.mockResolvedValue(mockResults);

    const result = await search(query);

    expect(result.chunks).toHaveLength(2);
    expect(result.chunks[0].id).toBe('doc1::chunk_0');
    expect(result.chunks[0].documentId).toBe('doc1');
    expect(result.chunks[0].text).toBe('Chunk text 1');
    expect(result.chunks[0].chunkIndex).toBe(0);
    expect(result.chunks[0].score).toBe(0.95);
    expect(result.chunks[1].documentId).toBe('doc2::chunk_1'.split('::')[0]);
  });

  it('should handle empty results', async () => {
    const query = 'test query';
    const mockVector = Array(384).fill(0.1);
    const mockResults: Array<{
      id: string;
      score: number;
      metadata: {
        text: string;
        file: string;
        path: string;
        chunkIndex: number;
        documentId?: string;
      };
    }> = [];

    mockGenerateEmbedding.mockResolvedValue({
      text: query,
      vector: mockVector,
      dimensions: 384,
    });

    mockQueryVectors.mockResolvedValue(mockResults);

    const result = await search(query);

    expect(result.chunks).toHaveLength(0);
    expect(result.query).toBe(query);
  });

  it('should set retrievedAt timestamp', async () => {
    const query = 'test query';
    const mockVector = Array(384).fill(0.1);
    const mockResults: Array<{
      id: string;
      score: number;
      metadata: {
        text: string;
        file: string;
        path: string;
        chunkIndex: number;
        documentId?: string;
      };
    }> = [];

    mockGenerateEmbedding.mockResolvedValue({
      text: query,
      vector: mockVector,
      dimensions: 384,
    });

    mockQueryVectors.mockResolvedValue(mockResults);

    const beforeSearch = new Date();
    const result = await search(query);
    const afterSearch = new Date();

    expect(result.retrievedAt).toBeInstanceOf(Date);
    expect(result.retrievedAt.getTime()).toBeGreaterThanOrEqual(beforeSearch.getTime());
    expect(result.retrievedAt.getTime()).toBeLessThanOrEqual(afterSearch.getTime());
  });
});

describe('searchChunks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return simplified chunk results', async () => {
    const query = 'test query';
    const mockVector = Array(384).fill(0.1);
    const mockResults: Array<{
      id: string;
      score: number;
      metadata: {
        text: string;
        file: string;
        path: string;
        chunkIndex: number;
        documentId?: string;
      };
    }> = [
      {
        id: 'doc1::chunk_0',
        score: 0.95,
        metadata: {
          text: 'Chunk text 1',
          file: 'doc1.md',
          path: './docs/doc1.md',
          chunkIndex: 0,
        },
      },
    ];

    mockGenerateEmbedding.mockResolvedValue({
      text: query,
      vector: mockVector,
      dimensions: 384,
    });

    mockQueryVectors.mockResolvedValue(mockResults);

    const result = await searchChunks(query, 5);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Chunk text 1');
    expect(result[0].score).toBe(0.95);
    expect(result[0].file).toBe('doc1');
  });

  it('should use default topK when not provided', async () => {
    const query = 'test query';
    const mockVector = Array(384).fill(0.1);
    const mockResults: Array<{
      id: string;
      score: number;
      metadata: {
        text: string;
        file: string;
        path: string;
        chunkIndex: number;
        documentId?: string;
      };
    }> = [];

    mockGenerateEmbedding.mockResolvedValue({
      text: query,
      vector: mockVector,
      dimensions: 384,
    });

    mockQueryVectors.mockResolvedValue(mockResults);

    await searchChunks(query);

    expect(mockQueryVectors).toHaveBeenCalledWith(mockVector, 5, undefined);
  });
});
