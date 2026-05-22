/**
 * File hash manager for .rag/hashes.json (incremental indexing)
 */

import { promises as fs } from 'fs';
import { getHashesFilePath, ensureRagDir } from './index.js';

export interface HashesMap {
  [path: string]: string;
}

/**
 * Read hashes.json
 * @returns Map of file paths to SHA256 hashes
 * @throws Error if file cannot be read or parsed
 */
export async function readHashes(): Promise<HashesMap> {
  const hashesPath = getHashesFilePath();

  try {
    const content = await fs.readFile(hashesPath, 'utf-8');
    return JSON.parse(content) as HashesMap;
  } catch (error) {
    // If file doesn't exist, return empty map
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw new Error(`Failed to read hashes.json: ${error}`);
  }
}

/**
 * Write hashes.json
 * @param hashes - Map of file paths to SHA256 hashes
 * @throws Error if file cannot be written
 */
export async function writeHashes(hashes: HashesMap): Promise<void> {
  await ensureRagDir();
  const hashesPath = getHashesFilePath();
  const content = JSON.stringify(hashes, null, 2);
  await fs.writeFile(hashesPath, content, 'utf-8');
}

/**
 * Get hash for a specific file path
 * @param filePath - File path to look up
 * @returns Hash string or undefined if not found
 */
export async function getHash(filePath: string): Promise<string | undefined> {
  const hashes = await readHashes();
  return hashes[filePath];
}

/**
 * Set hash for a file path
 * @param filePath - File path
 * @param hash - SHA256 hash
 */
export async function setHash(filePath: string, hash: string): Promise<void> {
  const hashes = await readHashes();
  hashes[filePath] = hash;
  await writeHashes(hashes);
}

/**
 * Remove hash for a file path
 * @param filePath - File path to remove
 */
export async function removeHash(filePath: string): Promise<void> {
  const hashes = await readHashes();
  delete hashes[filePath];
  await writeHashes(hashes);
}

/**
 * Check if file has changed since last index
 * @param filePath - File path
 * @param currentHash - Current SHA256 hash
 * @returns true if file is new or changed, false if unchanged
 */
export async function hasFileChanged(filePath: string, currentHash: string): Promise<boolean> {
  const storedHash = await getHash(filePath);
  return storedHash !== currentHash;
}
