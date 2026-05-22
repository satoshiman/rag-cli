/**
 * Integration tests for ask command
 */

import { checkOllamaAvailability } from '../../src/core/llm.js';
import { buildRAGPrompt } from '../../src/core/llm.js';

describe('Ask Command Integration', () => {
  it('should check Ollama availability', async () => {
    const available = await checkOllamaAvailability();
    // This test doesn't fail if Ollama is not running
    // It just checks that the function completes
    expect(typeof available).toBe('boolean');
  });

  it('should build RAG prompt with context', () => {
    const question = 'What is RAG?';
    const contextChunks = [
      { text: 'RAG stands for Retrieval-Augmented Generation', file: 'doc1.md' },
      { text: 'It combines vector search with LLM', file: 'doc2.md' },
    ];
    const prompt = buildRAGPrompt(question, contextChunks);
    expect(prompt).toContain(question);
    expect(prompt).toContain('RAG stands for');
    expect(prompt).toContain('vector search');
  });

  it('should handle empty context chunks', () => {
    const question = 'What is RAG?';
    const contextChunks: Array<{ text: string; file: string }> = [];
    const prompt = buildRAGPrompt(question, contextChunks);
    expect(prompt).toContain(question);
  });

  // Skip search test due to @xenova/transformers Jest compatibility issues
  // This is tested in unit tests instead
  it.skip('should perform vector search (requires Upstash)', async () => {
    // This test requires valid Upstash credentials
    // It will fail if credentials are not configured
  });
});
