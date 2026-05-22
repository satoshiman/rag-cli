/**
 * Unit tests for LLM integration (Ollama client)
 */

import {
  buildRAGPrompt,
  checkOllamaAvailability,
  generateAnswer,
  generateAnswerStream,
  getAvailableModels,
} from '../../src/core/llm.js';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('LLM Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildRAGPrompt', () => {
    it('should build a RAG prompt with context chunks', () => {
      const question = 'What is the best way to store JWT?';
      const chunks = [
        { text: 'JWT should be stored in HTTP-only cookies', file: 'security.md' },
        { text: 'localStorage is vulnerable to XSS attacks', file: 'auth.md' },
      ];

      const prompt = buildRAGPrompt(question, chunks);

      expect(prompt).toContain('You are a helpful assistant');
      expect(prompt).toContain(question);
      expect(prompt).toContain('JWT should be stored in HTTP-only cookies');
      expect(prompt).toContain('localStorage is vulnerable to XSS attacks');
      expect(prompt).toContain('Context 1 from security.md');
      expect(prompt).toContain('Context 2 from auth.md');
    });

    it('should handle empty chunks array', () => {
      const question = 'Test question';
      const chunks: Array<{ text: string; file: string }> = [];

      const prompt = buildRAGPrompt(question, chunks);

      expect(prompt).toContain(question);
      expect(prompt).toContain('Context:');
    });

    it('should handle single chunk', () => {
      const question = 'Test question';
      const chunks = [{ text: 'Single chunk content', file: 'test.md' }];

      const prompt = buildRAGPrompt(question, chunks);

      expect(prompt).toContain('Context 1 from test.md');
      expect(prompt).toContain('Single chunk content');
    });
  });

  describe('checkOllamaAvailability', () => {
    it('should return true when Ollama is available', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      } as Response);

      const available = await checkOllamaAvailability();

      expect(available).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tags'),
        expect.objectContaining({
          method: 'GET',
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should return false when Ollama is not available', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'));

      const available = await checkOllamaAvailability();

      expect(available).toBe(false);
    });

    it('should return false when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      } as Response);

      const available = await checkOllamaAvailability();

      expect(available).toBe(false);
    });
  });

  describe('getAvailableModels', () => {
    it('should return list of available models', async () => {
      const mockData = {
        models: [{ name: 'qwen2.5:3b' }, { name: 'llama2:7b' }, { name: 'mistral:7b' }],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const models = await getAvailableModels();

      expect(models).toEqual(['qwen2.5:3b', 'llama2:7b', 'mistral:7b']);
    });

    it('should return empty array when no models', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      } as Response);

      const models = await getAvailableModels();

      expect(models).toEqual([]);
    });

    it('should throw error when fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(getAvailableModels()).rejects.toThrow('Failed to get models');
    });

    it('should throw error when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(getAvailableModels()).rejects.toThrow('Ollama API error: 500');
    });
  });

  describe('generateAnswer', () => {
    it('should generate answer from Ollama', async () => {
      const mockResponse = {
        model: 'qwen2.5:3b',
        response: 'JWT should be stored in HTTP-only cookies',
        done: true,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const answer = await generateAnswer('What is the best way to store JWT?');

      expect(answer).toBe('JWT should be stored in HTTP-only cookies');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/generate'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should use custom options when provided', async () => {
      const mockResponse = {
        model: 'llama2:7b',
        response: 'Test answer',
        done: true,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await generateAnswer('Test question', {
        model: 'llama2:7b',
        temperature: 0.5,
        maxTokens: 512,
      });

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.model).toBe('llama2:7b');
      expect(body.options.temperature).toBe(0.5);
      expect(body.options.num_predict).toBe(512);
    });

    it('should throw error when fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(generateAnswer('Test question')).rejects.toThrow('Failed to generate answer');
    });

    it('should throw error when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(generateAnswer('Test question')).rejects.toThrow('Ollama API error: 500');
    });
  });

  describe('generateAnswerStream', () => {
    it('should stream answer chunks', async () => {
      const chunks = [
        { model: 'qwen2.5:3b', response: 'JWT ', done: false },
        { model: 'qwen2.5:3b', response: 'should ', done: false },
        { model: 'qwen2.5:3b', response: 'be stored ', done: false },
        { model: 'qwen2.5:3b', response: 'in cookies', done: true },
      ];

      const streamData = chunks.map((c) => JSON.stringify(c)).join('\n');
      let readCount = 0;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: async () => {
              if (readCount === 0) {
                readCount++;
                return {
                  done: false,
                  value: new TextEncoder().encode(streamData),
                };
              }
              return {
                done: true,
                value: new Uint8Array(0),
              };
            },
          }),
        },
      } as Response);

      const stream = generateAnswerStream('Test question');
      const results: string[] = [];

      for await (const chunk of stream) {
        results.push(chunk);
      }

      expect(results).toEqual(['JWT ', 'should ', 'be stored ', 'in cookies']);
    });

    it('should handle streaming errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Stream error'));

      const stream = generateAnswerStream('Test question');

      await expect(async () => {
        for await (const chunk of stream) {
          chunk;
        }
      }).rejects.toThrow('Failed to generate answer stream');
    });

    it('should handle malformed JSON in stream', async () => {
      const streamData =
        '{"model":"qwen2.5:3b","response":"Valid","done":false}\ninvalid json\n{"model":"qwen2.5:3b","response":"Valid2","done":true}';
      let readCount = 0;

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: async () => {
              if (readCount === 0) {
                readCount++;
                return {
                  done: false,
                  value: new TextEncoder().encode(streamData),
                };
              }
              return {
                done: true,
                value: new Uint8Array(0),
              };
            },
          }),
        },
      } as Response);

      const stream = generateAnswerStream('Test question');
      const results: string[] = [];

      for await (const chunk of stream) {
        results.push(chunk);
      }

      // Should skip invalid JSON and continue
      expect(results).toEqual(['Valid', 'Valid2']);
    });
  });
});
