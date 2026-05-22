/**
 * Shared TypeScript type definitions for RAG CLI
 */

export type FileType = 'markdown' | 'text' | 'pdf';
export type DocumentStatus = 'indexed' | 'pending' | 'failed';

export interface Document {
  id: string;
  path: string;
  filename: string;
  filetype: FileType;
  content: string;
  hash: string;
  status: DocumentStatus;
  indexedAt: Date;
  fileSize: number;
}

export interface Chunk {
  id: string;
  documentId: string;
  text: string;
  chunkIndex: number;
  startChar: number;
  endChar: number;
  embedding?: number[];
}

export interface VectorRecord {
  id: string;
  vector: number[];
  metadata: {
    text: string;
    file: string;
    path: string;
    chunkIndex: number;
  };
}

export interface SearchResult {
  chunks: (Chunk & { score: number })[];
  query: string;
  retrievedAt: Date;
}

export interface RAGResult {
  answer: string;
  sources: Array<{ file: string; path: string }>;
  chunks: Chunk[];
  generatedAt: Date;
}

export interface IndexMetadata {
  files: number;
  chunks: number;
  embeddingModel: string;
  vectorDB: string;
  llmModel: string;
  lastIndexedAt: Date;
  totalSize: number;
  documentPaths: string[];
}

export interface ParserResult {
  text: string;
  metadata: Record<string, any>;
}

export interface ScannerOptions {
  paths: string[];
  supportedExtensions: string[];
}

export interface ChunkerOptions {
  chunkSize: number;
  chunkOverlap: number;
}

export interface EmbeddingResult {
  text: string;
  vector: number[];
  dimensions: number;
}

export interface SearchOptions {
  query: string;
  topK: number;
  filter?: Record<string, any>;
}

export interface LLMOptions {
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface LLMRequest {
  prompt: string;
  stream: boolean;
  options: LLMOptions;
}
