/**
 * Unit tests for embedding generation
 */

// Mock the @xenova/transformers module
const mockPipeline = jest.fn((text: string) => {
  // Generate different vectors based on text content to simulate different embeddings
  const value = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) / 1000;
  return Promise.resolve({
    data: new Float32Array(384).fill(value),
  });
});

jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn().mockResolvedValue(mockPipeline),
}));

import { generateEmbedding, generateEmbeddings, clearPipeline } from '../../src/core/embedding.js';

describe('generateEmbedding', () => {
  afterEach(() => {
    clearPipeline();
    jest.clearAllMocks();
  });

  it('should generate embedding for text', async () => {
    const text = 'hello world';
    const result = await generateEmbedding(text);

    expect(result.text).toBe(text);
    expect(result.vector).toBeInstanceOf(Array);
    expect(result.vector.length).toBeGreaterThan(0);
    expect(result.dimensions).toBe(result.vector.length);
  });

  it('should generate embeddings with correct dimensions', async () => {
    const text = 'test text';
    const result = await generateEmbedding(text);

    // all-MiniLM-L6-v2 produces 384-dimensional vectors
    expect(result.dimensions).toBe(384);
  });

  it('should generate embeddings for multiple texts', async () => {
    const texts = ['hello', 'world', 'test'];
    const results = await generateEmbeddings(texts);

    expect(results.length).toBe(3);
    results.forEach((result) => {
      expect(result.vector).toBeInstanceOf(Array);
      expect(result.vector.length).toBe(384);
    });
  });

  it('should handle empty text', async () => {
    const text = '';
    const result = await generateEmbedding(text);

    expect(result.text).toBe('');
    expect(result.vector).toBeInstanceOf(Array);
    expect(result.vector.length).toBe(384);
  });

  it('should handle special characters', async () => {
    const text = 'Hello! @#$%^&*()_+{}|:"<>?~`-=[]\\;\',./';
    const result = await generateEmbedding(text);

    expect(result.text).toBe(text);
    expect(result.vector).toBeInstanceOf(Array);
  });

  it('should handle unicode text', async () => {
    const text = 'Hello 世界 🌍';
    const result = await generateEmbedding(text);

    expect(result.text).toBe(text);
    expect(result.vector).toBeInstanceOf(Array);
  });

  it('should produce consistent embeddings for same text', async () => {
    const text = 'consistent text';
    const result1 = await generateEmbedding(text);
    const result2 = await generateEmbedding(text);

    expect(result1.vector).toEqual(result2.vector);
  });

  it('should produce different embeddings for different texts', async () => {
    const text1 = 'text one';
    const text2 = 'text two';
    const result1 = await generateEmbedding(text1);
    const result2 = await generateEmbedding(text2);

    expect(result1.vector).not.toEqual(result2.vector);
  });
});
