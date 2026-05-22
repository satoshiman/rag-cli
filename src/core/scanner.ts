/**
 * File scanner for discovering and resolving document files
 */

import { glob } from 'glob';
import path from 'path';
import { promises as fs } from 'fs';
import { SUPPORTED_EXTENSIONS } from '../config/constants.js';
import { ScannerOptions } from '../utils/types.js';

/**
 * Scan directories and files to find supported document files
 * @param options - Scanner options including paths and supported extensions
 * @returns Array of absolute file paths
 */
export async function scanFiles(options: ScannerOptions): Promise<string[]> {
  const { paths, supportedExtensions = SUPPORTED_EXTENSIONS } = options;

  const allFiles: string[] = [];

  for (const inputPath of paths) {
    const resolvedPath = path.resolve(inputPath);

    // Check if path exists
    try {
      await fs.stat(resolvedPath);
    } catch (error) {
      console.warn(`Cannot access path: ${inputPath}`);
      continue;
    }

    // If it's a file, add it directly if it has a supported extension
    try {
      const stats = await fs.stat(resolvedPath);
      if (stats.isFile()) {
        const ext = path.extname(resolvedPath).toLowerCase();
        if (supportedExtensions.includes(ext)) {
          allFiles.push(resolvedPath);
        } else {
          console.warn(`Unsupported file type: ${resolvedPath}`);
        }
        continue;
      }
    } catch (error) {
      console.warn(`Error checking file: ${resolvedPath}`);
      continue;
    }

    // If it's a directory, use glob to find all supported files
    const pattern = path.join(resolvedPath, '**', `*{${supportedExtensions.join(',')}}`);
    const files = await glob(pattern, {
      absolute: true,
      nodir: true,
    });

    allFiles.push(...files);
  }

  // Remove duplicates
  const uniqueFiles = Array.from(new Set(allFiles));

  return uniqueFiles;
}

/**
 * Get relative path from current working directory
 * @param filePath - Absolute file path
 * @returns Relative path
 */
export function getRelativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath);
}

/**
 * Get file extension
 * @param filePath - File path
 * @returns File extension with dot (e.g., ".md")
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

/**
 * Get filename from path
 * @param filePath - File path
 * @returns Filename with extension
 */
export function getFilename(filePath: string): string {
  return path.basename(filePath);
}
