/**
 * File parser for extracting text from markdown, text, and PDF files
 */

import MarkdownIt from 'markdown-it';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FileType, ParserResult } from '../utils/types.js';

const md = new MarkdownIt();

/**
 * Parse markdown file and extract text content
 * @param filePath - Absolute path to markdown file
 * @returns Parsed text with metadata
 * @throws Error if file doesn't exist or cannot be parsed
 */
export async function parseMarkdown(filePath: string): Promise<ParserResult> {
  const content = await fs.readFile(filePath, 'utf-8');
  const tokens = md.parse(content, {});

  // Extract text content from tokens
  let text = '';
  for (const token of tokens) {
    if (token.type === 'text' || token.type === 'inline') {
      if (token.content) {
        text += token.content + ' ';
      }
      if (token.children) {
        for (const child of token.children) {
          if (child.type === 'text' && child.content) {
            text += child.content + ' ';
          }
        }
      }
    }
  }

  // Clean up extra whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return {
    text,
    metadata: {
      filetype: 'markdown' as FileType,
      filename: path.basename(filePath),
    },
  };
}

/**
 * Parse plain text file
 * @param filePath - Absolute path to text file
 * @returns Parsed text with metadata
 * @throws Error if file doesn't exist
 */
export async function parseText(filePath: string): Promise<ParserResult> {
  const content = await fs.readFile(filePath, 'utf-8');

  return {
    text: content,
    metadata: {
      filetype: 'text' as FileType,
      filename: path.basename(filePath),
    },
  };
}

/**
 * Parse PDF file and extract text
 * @param filePath - Absolute path to PDF file
 * @returns Parsed text with metadata
 * @throws Error if file doesn't exist or cannot be parsed
 */
export async function parsePDF(filePath: string): Promise<ParserResult> {
  // Use legacy build for Node.js compatibility
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // Set worker - use absolute path to CLI's node_modules
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const workerPath = path.join(
    __dirname,
    '..',
    '..',
    'node_modules',
    'pdfjs-dist',
    'legacy',
    'build',
    'pdf.worker.min.mjs'
  );
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;

  const buffer = await fs.readFile(filePath);
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;

  let text = '';
  const numPages = pdf.numPages;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str || '').join(' ');
    text += pageText + ' ';
  }

  // Clean up extra whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return {
    text,
    metadata: {
      filetype: 'pdf' as FileType,
      filename: path.basename(filePath),
      pages: numPages,
    },
  };
}

/**
 * Parse file based on its extension
 * @param filePath - Absolute path to file
 * @returns Parsed text with metadata
 * @throws Error if file type is not supported or parsing fails
 */
export async function parseFile(filePath: string): Promise<ParserResult> {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.md':
      return parseMarkdown(filePath);
    case '.txt':
      return parseText(filePath);
    case '.pdf':
      return parsePDF(filePath);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

/**
 * Get file type from extension
 * @param filePath - File path
 * @returns File type enum
 */
export function getFileType(filePath: string): FileType {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.md':
      return 'markdown';
    case '.txt':
      return 'text';
    case '.pdf':
      return 'pdf';
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}
