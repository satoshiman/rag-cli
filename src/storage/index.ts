/**
 * Index metadata manager for .rag/index.json
 */

import { promises as fs } from 'fs';
import path from 'path';
import { homedir } from 'os';
import { IndexMetadata } from '../utils/types.js';
import { HASHES_FILE_NAME, INDEX_FILE_NAME, RAG_DIR_NAME } from '../config/constants.js';

/**
 * Get the .rag directory path (stored in home directory for global access)
 * @returns Absolute path to .rag directory
 */
export function getRagDir(): string {
  return path.join(homedir(), RAG_DIR_NAME);
}

/**
 * Get the index.json file path
 * @returns Absolute path to index.json
 */
export function getIndexFilePath(): string {
  return path.join(getRagDir(), INDEX_FILE_NAME);
}

/**
 * Get the hashes.json file path
 * @returns Absolute path to hashes.json
 */
export function getHashesFilePath(): string {
  return path.join(getRagDir(), HASHES_FILE_NAME);
}

/**
 * Ensure .rag directory exists
 * @throws Error if directory cannot be created
 */
export async function ensureRagDir(): Promise<void> {
  const ragDir = getRagDir();
  try {
    await fs.mkdir(ragDir, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create .rag directory: ${error}`);
  }
}

/**
 * Initialize index.json with default values
 * @returns Initial index metadata
 */
export function createInitialIndex(): IndexMetadata {
  return {
    files: 0,
    chunks: 0,
    embeddingModel: 'all-MiniLM-L6-v2',
    vectorDB: 'Upstash Vector',
    llmModel: 'qwen2.5:3b',
    lastIndexedAt: new Date(),
    totalSize: 0,
    documentPaths: [],
  };
}

/**
 * Read index.json
 * @returns Index metadata
 * @throws Error if file cannot be read or parsed
 */
export async function readIndex(): Promise<IndexMetadata> {
  const indexPath = getIndexFilePath();

  try {
    const content = await fs.readFile(indexPath, 'utf-8');
    const data = JSON.parse(content);
    // Convert date strings back to Date objects
    data.lastIndexedAt = new Date(data.lastIndexedAt);
    return data as IndexMetadata;
  } catch (error) {
    // If file doesn't exist, return initial index
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return createInitialIndex();
    }
    throw new Error(`Failed to read index.json: ${error}`);
  }
}

/**
 * Write index.json
 * @param index - Index metadata to write
 * @throws Error if file cannot be written
 */
export async function writeIndex(index: IndexMetadata): Promise<void> {
  await ensureRagDir();
  const indexPath = getIndexFilePath();
  const content = JSON.stringify(index, null, 2);
  await fs.writeFile(indexPath, content, 'utf-8');
}

/**
 * Update index metadata
 * @param updates - Partial updates to apply
 * @throws Error if file cannot be written
 */
export async function updateIndex(updates: Partial<IndexMetadata>): Promise<void> {
  const index = await readIndex();
  const updated = { ...index, ...updates };
  await writeIndex(updated);
}

/**
 * Increment the chunk count in the index
 * @param count - Number of chunks to add (default: 1)
 * @throws Error if file cannot be written
 */
export async function incrementChunkCount(count: number = 1): Promise<void> {
  const index = await readIndex();
  index.chunks += count;
  await writeIndex(index);
}

/**
 * Decrement the chunk count in the index
 * @param count - Number of chunks to remove (default: 1)
 * @throws Error if file cannot be written
 */
export async function decrementChunkCount(count: number = 1): Promise<void> {
  const index = await readIndex();
  index.chunks = Math.max(0, index.chunks - count);
  await writeIndex(index);
}

/**
 * Add a document path to the index
 * @param path - Document path to add
 * @throws Error if file cannot be written
 */
export async function addDocumentPath(path: string): Promise<void> {
  const index = await readIndex();
  if (!index.documentPaths.includes(path)) {
    index.documentPaths.push(path);
    await writeIndex(index);
  }
}

/**
 * Remove a document path from the index
 * @param path - Document path to remove
 * @throws Error if file cannot be written
 */
export async function removeDocumentPath(path: string): Promise<void> {
  const index = await readIndex();
  index.documentPaths = index.documentPaths.filter((p) => p !== path);
  await writeIndex(index);
}
