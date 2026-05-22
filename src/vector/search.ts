/**
 * Vector similarity search module
 * Handles query embedding and retrieval of relevant chunks from Upstash
 */

import { generateEmbedding } from '../core/embedding.js';
import { queryVectors } from './upstash.js';
import type { SearchResult, SearchOptions, Chunk } from '../utils/types.js';
import { getConfig } from '../config/env.js';

/**
 * Perform semantic search to retrieve relevant chunks for a query
 * @param query - The natural language query
 * @param options - Search options (topK, filter)
 * @returns Search result with relevant chunks and scores
 */
export async function search(
  query: string,
  options?: Partial<SearchOptions>
): Promise<SearchResult> {
  const config = getConfig();
  const topK = options?.topK ?? config.searchTopK;
  const filter = options?.filter;

  // Generate embedding for the query
  const embeddingResult = await generateEmbedding(query, config.embeddingModel);

  // Query Upstash for similar vectors
  const vectorResults = await queryVectors(embeddingResult.vector, topK, filter);

  // Convert vector results to chunks with scores
  const chunks: (Chunk & { score: number })[] = vectorResults.map((result) => {
    const metadata = result.metadata as {
      text: string;
      file: string;
      path: string;
      chunkIndex: number;
      documentId?: string;
    };

    return {
      id: result.id,
      documentId: metadata.documentId || result.id.split('::')[0],
      text: metadata.text,
      chunkIndex: metadata.chunkIndex,
      startChar: 0, // Not stored in metadata, default to 0
      endChar: metadata.text.length,
      score: result.score,
    };
  });

  return {
    chunks,
    query,
    retrievedAt: new Date(),
  };
}

/**
 * Perform search and return only the text chunks (simplified result)
 * @param query - The natural language query
 * @param topK - Number of results to return
 * @returns Array of chunk texts with scores
 */
export async function searchChunks(
  query: string,
  topK?: number
): Promise<Array<{ text: string; score: number; file: string; path: string }>> {
  const result = await search(query, { topK });

  return result.chunks.map((chunk) => ({
    text: chunk.text,
    score: chunk.score,
    file: chunk.id.split('::')[0], // Extract filename from chunk ID
    path: '', // Not available in current metadata structure
  }));
}
