/**
 * Upstash Vector client for storing and retrieving embeddings
 * Handles vector upserts and similarity search
 */

import { Index } from '@upstash/vector';
import type { VectorRecord } from '../utils/types.js';
import { getConfig } from '../config/env.js';

let indexInstance: Index | null = null;

/**
 * Get or create the Upstash Vector index instance
 * @returns The Upstash Index instance
 * @throws Error if Upstash credentials are not configured
 */
export function getIndex(): Index {
  if (indexInstance) {
    return indexInstance;
  }

  const config = getConfig();

  if (!config.upstashUrl || !config.upstashToken) {
    throw new Error(
      'Upstash credentials not configured. Please set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN in your .env file.'
    );
  }

  indexInstance = new Index({
    url: config.upstashUrl,
    token: config.upstashToken,
  });

  return indexInstance;
}

/**
 * Upsert a single vector record to Upstash
 * @param record - The vector record to upsert
 * @returns The upsert result
 */
export async function upsertVector(record: VectorRecord): Promise<void> {
  const index = getIndex();

  await index.upsert([
    {
      id: record.id,
      vector: record.vector,
      metadata: record.metadata,
    },
  ]);
}

/**
 * Upsert multiple vector records in batch
 * @param records - Array of vector records to upsert
 * @returns The upsert result
 */
export async function upsertVectors(records: VectorRecord[]): Promise<void> {
  if (records.length === 0) {
    return;
  }

  const index = getIndex();

  // Upstash supports batch upserts
  await index.upsert(
    records.map((record) => ({
      id: record.id,
      vector: record.vector,
      metadata: record.metadata,
    }))
  );
}

/**
 * Query the vector database for similar vectors
 * @param vector - The query vector
 * @param topK - Number of results to return
 * @param filter - Optional metadata filter
 * @returns Array of search results with scores
 */
export async function queryVectors(
  vector: number[],
  topK: number = 5,
  filter?: Record<string, string | number | boolean>
): Promise<Array<{ id: string; score: number; metadata: Record<string, unknown> }>> {
  const index = getIndex();

  const results = await index.query({
    vector,
    topK,
    includeMetadata: true,
    filter: filter as string | undefined,
  });

  return results.map((result) => ({
    id: String(result.id || ''),
    score: result.score || 0,
    metadata: result.metadata || {},
  }));
}

/**
 * Delete vectors by IDs
 * @param ids - Array of vector IDs to delete
 * @returns The delete result
 */
export async function deleteVectors(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const index = getIndex();
  await index.delete(ids);
}

/**
 * Delete all vectors for a specific document
 * @param documentId - The document ID
 * @returns The delete result
 */
export async function deleteDocumentVectors(documentId: string): Promise<void> {
  const index = getIndex();

  // Query for all chunks with this documentId
  // Note: Upstash filter syntax may vary, using a simple approach
  const results = await index.query({
    vector: Array(384).fill(0), // Dummy vector for filtering
    topK: 1000,
    includeMetadata: true,
  });

  // Filter results by documentId in metadata
  const matchingIds = results
    .filter((result) => result.metadata?.documentId === documentId)
    .map((r) => String(r.id))
    .filter((id): id is string => id !== undefined && id !== '');

  if (matchingIds.length > 0) {
    await index.delete(matchingIds);
  }
}

/**
 * Reset the index instance (useful for testing)
 */
export function resetIndex(): void {
  indexInstance = null;
}
