/**
 * Embedding generation using @xenova/transformers (local, no API required)
 * Generates vector embeddings for text chunks
 */

import { pipeline } from '@xenova/transformers';
import type { EmbeddingResult } from '../utils/types.js';
import { DEFAULT_EMBEDDING_MODEL } from '../config/constants.js';

let embeddingPipeline: any = null;

/**
 * Initialize the embedding pipeline (lazy loading)
 * @param modelName - The model name to use (default: all-MiniLM-L6-v2)
 * @returns The embedding pipeline
 */
async function initPipeline(modelName: string = DEFAULT_EMBEDDING_MODEL): Promise<any> {
  if (embeddingPipeline) {
    return embeddingPipeline;
  }

  embeddingPipeline = await pipeline('feature-extraction', `Xenova/${modelName}`, {
    quantized: true,
  });

  return embeddingPipeline;
}

/**
 * Generate embedding for a single text
 * @param text - The text to embed
 * @param modelName - Optional model name override
 * @returns Embedding result with vector and dimensions
 */
export async function generateEmbedding(
  text: string,
  modelName?: string
): Promise<EmbeddingResult> {
  const model = modelName || DEFAULT_EMBEDDING_MODEL;
  const pipeline = await initPipeline(model);

  const output = await pipeline(text, {
    pooling: 'mean',
    normalize: true,
  });

  // Convert tensor to array
  const vector = Array.from(output.data) as number[];
  const dimensions = vector.length;

  return {
    text,
    vector,
    dimensions,
  };
}

/**
 * Generate embeddings for multiple texts in batch
 * @param texts - Array of texts to embed
 * @param modelName - Optional model name override
 * @returns Array of embedding results
 */
export async function generateEmbeddings(
  texts: string[],
  modelName?: string
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];

  for (const text of texts) {
    const result = await generateEmbedding(text, modelName);
    results.push(result);
  }

  return results;
}

/**
 * Clear the embedding pipeline (free memory)
 */
export function clearPipeline(): void {
  embeddingPipeline = null;
}
