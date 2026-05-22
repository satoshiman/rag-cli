/**
 * Text chunking using LangChain's RecursiveCharacterTextSplitter
 * Splits text into semantic chunks for embedding generation
 */

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import type { Chunk, ChunkerOptions } from '../utils/types.js';

/**
 * Split text into chunks using RecursiveCharacterTextSplitter
 * @param text - The text to split
 * @param documentId - The document ID for the chunks
 * @param options - Chunking options (size, overlap)
 * @returns Array of chunks with metadata
 */
export async function chunkText(
  text: string,
  documentId: string,
  options: ChunkerOptions = { chunkSize: 1000, chunkOverlap: 150 }
): Promise<Chunk[]> {
  const { chunkSize, chunkOverlap } = options;

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  });

  const chunks = await splitter.splitText(text);

  return chunks.map((chunkText, index) => {
    const startChar = text.indexOf(chunkText);
    const endChar = startChar + chunkText.length;

    return {
      id: `${documentId}::chunk_${index}`,
      documentId,
      text: chunkText,
      chunkIndex: index,
      startChar,
      endChar,
    };
  });
}

/**
 * Create a chunker instance with default options
 * @param options - Optional chunking options
 * @returns Chunker function
 */
export function createChunker(options?: Partial<ChunkerOptions>) {
  const defaultOptions: ChunkerOptions = {
    chunkSize: 1000,
    chunkOverlap: 150,
  };

  const mergedOptions = { ...defaultOptions, ...options };

  return (text: string, documentId: string) => chunkText(text, documentId, mergedOptions);
}
