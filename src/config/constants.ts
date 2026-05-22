/**
 * Configuration constants and default values
 */

export const DEFAULT_CHUNK_SIZE = 1000;
export const DEFAULT_CHUNK_OVERLAP = 150;
export const DEFAULT_SEARCH_TOP_K = 5;
export const DEFAULT_EMBEDDING_MODEL = 'all-MiniLM-L6-v2';
export const DEFAULT_LLM_MODEL = 'qwen2.5:3b';
export const DEFAULT_LLM_TEMPERATURE = 0.7;
export const DEFAULT_LLM_MAX_TOKENS = 1024;
export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
export const DEFAULT_LOG_LEVEL = 'info';

export const SUPPORTED_EXTENSIONS = ['.md', '.txt', '.pdf'];

export const RAG_DIR_NAME = '.rag';
export const INDEX_FILE_NAME = 'index.json';
export const HASHES_FILE_NAME = 'hashes.json';
