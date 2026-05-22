/**
 * Ollama API client for local LLM integration
 * Supports both streaming and non-streaming generation
 */

import { getConfig } from '../config/env.js';
import type { LLMOptions } from '../utils/types.js';

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
}

interface OllamaStreamChunk {
  model: string;
  response: string;
  done: boolean;
}

/**
 * Generate an answer using Ollama (non-streaming)
 * @param prompt - The prompt to send to the LLM
 * @param options - LLM generation options
 * @returns Generated answer text
 * @throws Error if Ollama is unavailable or request fails
 */
export async function generateAnswer(
  prompt: string,
  options?: Partial<LLMOptions>
): Promise<string> {
  const config = getConfig();
  const llmOptions: LLMOptions = {
    model: options?.model || config.llmModel,
    temperature: options?.temperature ?? config.llmTemperature,
    maxTokens: options?.maxTokens ?? config.llmMaxTokens,
  };

  const requestBody: OllamaGenerateRequest = {
    model: llmOptions.model,
    prompt,
    stream: false,
    options: {
      temperature: llmOptions.temperature,
      num_predict: llmOptions.maxTokens,
    },
  };

  try {
    const response = await fetch(`${config.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OllamaGenerateResponse;
    return data.response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate answer: ${error.message}`);
    }
    throw new Error('Failed to generate answer: Unknown error');
  }
}

/**
 * Generate an answer using Ollama with streaming
 * @param prompt - The prompt to send to the LLM
 * @param options - LLM generation options
 * @returns Async generator that yields response chunks
 * @throws Error if Ollama is unavailable or request fails
 */
export async function* generateAnswerStream(
  prompt: string,
  options?: Partial<LLMOptions>
): AsyncGenerator<string, void, unknown> {
  const config = getConfig();
  const llmOptions: LLMOptions = {
    model: options?.model || config.llmModel,
    temperature: options?.temperature ?? config.llmTemperature,
    maxTokens: options?.maxTokens ?? config.llmMaxTokens,
  };

  const requestBody: OllamaGenerateRequest = {
    model: llmOptions.model,
    prompt,
    stream: true,
    options: {
      temperature: llmOptions.temperature,
      num_predict: llmOptions.maxTokens,
    },
  };

  try {
    const response = await fetch(`${config.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete JSON objects (separated by newlines)
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const chunk: OllamaStreamChunk = JSON.parse(line);
            if (chunk.response) {
              yield chunk.response;
            }
            if (chunk.done) {
              return;
            }
          } catch (parseError) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      try {
        const chunk: OllamaStreamChunk = JSON.parse(buffer);
        if (chunk.response) {
          yield chunk.response;
        }
      } catch (parseError) {
        // Skip invalid JSON
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate answer stream: ${error.message}`);
    }
    throw new Error('Failed to generate answer stream: Unknown error');
  }
}

/**
 * Build a RAG prompt with context chunks and question
 * @param question - User's question
 * @param chunks - Relevant document chunks
 * @returns Formatted RAG prompt
 */
export function buildRAGPrompt(
  question: string,
  chunks: Array<{ text: string; file: string }>
): string {
  const context = chunks
    .map((chunk, index) => `[Context ${index + 1} from ${chunk.file}]\n${chunk.text}`)
    .join('\n\n');

  return `You are a helpful assistant that answers questions based on the provided context.
Use only the information from the context to answer the question. If the context doesn't contain enough information to answer the question, say so.

Context:
${context}

Question: ${question}

Answer:`;
}

/**
 * Check if Ollama is available and running
 * @returns true if Ollama is available, false otherwise
 */
export async function checkOllamaAvailability(): Promise<boolean> {
  const config = getConfig();
  try {
    const response = await fetch(`${config.ollamaUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get list of available Ollama models
 * @returns Array of model names
 * @throws Error if Ollama is unavailable
 */
export async function getAvailableModels(): Promise<string[]> {
  const config = getConfig();
  try {
    const response = await fetch(`${config.ollamaUrl}/api/tags`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { models?: Array<{ name: string }> };
    return data.models?.map((m) => m.name) || [];
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get models: ${error.message}`);
    }
    throw new Error('Failed to get models: Unknown error');
  }
}
