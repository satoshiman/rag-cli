/**
 * SHA256 hashing utilities for file change detection
 */

import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Generate SHA256 hash of a string
 * @param text - Text to hash
 * @returns SHA256 hash as hex string
 */
export function hashString(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Generate SHA256 hash of a file's content
 * @param filePath - Path to file
 * @returns SHA256 hash as hex string
 * @throws Error if file cannot be read
 */
export async function hashFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8');
  return hashString(content);
}

/**
 * Generate SHA256 hash of a file path (for document ID)
 * @param filePath - Path to file
 * @returns SHA256 hash as hex string
 */
export function hashPath(filePath: string): string {
  return crypto.createHash('sha256').update(filePath).digest('hex');
}

/**
 * Get relative path from current working directory
 * @param filePath - Absolute file path
 * @returns Relative path
 */
export function getRelativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath);
}
