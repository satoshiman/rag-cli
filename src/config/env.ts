/**
 * Environment configuration management with dotenv and zod validation
 */

import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { homedir } from 'os';
import {
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_LLM_MAX_TOKENS,
  DEFAULT_LLM_MODEL,
  DEFAULT_LLM_TEMPERATURE,
  DEFAULT_LOG_LEVEL,
  DEFAULT_OLLAMA_URL,
  DEFAULT_SEARCH_TOP_K,
} from './constants.js';

// Load environment variables from multiple locations (in order of priority)
// 1. Current directory
// 2. Home directory
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(homedir(), '.rag', '.env') });

const configSchema = z.object({
  // Required for Phase 2+
  upstashUrl: z.string().url().optional(),
  upstashToken: z.string().optional(),

  // Optional with defaults
  ollamaUrl: z.string().url().default(DEFAULT_OLLAMA_URL),
  embeddingModel: z.string().default(DEFAULT_EMBEDDING_MODEL),
  llmModel: z.string().default(DEFAULT_LLM_MODEL),
  chunkSize: z.coerce.number().default(DEFAULT_CHUNK_SIZE),
  chunkOverlap: z.coerce.number().default(DEFAULT_CHUNK_OVERLAP),
  searchTopK: z.coerce.number().default(DEFAULT_SEARCH_TOP_K),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default(DEFAULT_LOG_LEVEL),
  llmTemperature: z.coerce.number().default(DEFAULT_LLM_TEMPERATURE),
  llmMaxTokens: z.coerce.number().default(DEFAULT_LLM_MAX_TOKENS),
});

export type Config = z.infer<typeof configSchema>;

let config: Config | null = null;

/**
 * Load and validate environment configuration
 * @returns Validated configuration object
 * @throws Error if validation fails
 */
export function loadConfig(): Config {
  if (config) {
    return config;
  }

  try {
    config = configSchema.parse({
      upstashUrl: process.env.UPSTASH_VECTOR_REST_URL,
      upstashToken: process.env.UPSTASH_VECTOR_REST_TOKEN,
      ollamaUrl: process.env.OLLAMA_URL,
      embeddingModel: process.env.EMBEDDING_MODEL,
      llmModel: process.env.LLM_MODEL,
      chunkSize: process.env.CHUNK_SIZE,
      chunkOverlap: process.env.CHUNK_OVERLAP,
      searchTopK: process.env.SEARCH_TOP_K,
      logLevel: process.env.LOG_LEVEL,
      llmTemperature: process.env.LLM_TEMPERATURE,
      llmMaxTokens: process.env.LLM_MAX_TOKENS,
    });

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingFields = error.errors.map((e) => e.path.join('.')).join(', ');
      throw new Error(`Configuration validation failed: ${missingFields}`);
    }
    throw error;
  }
}

/**
 * Get current configuration (loads if not already loaded)
 * @returns Configuration object
 */
export function getConfig(): Config {
  if (!config) {
    return loadConfig();
  }
  return config;
}
