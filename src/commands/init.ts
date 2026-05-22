/**
 * rag init command - Initialize RAG CLI configuration
 */

import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import { homedir } from 'os';
import { ensureRagDir } from '../storage/index.js';
import { log } from '../ui/colors.js';

export const initCommand = new Command()
  .name('init')
  .description('Initialize RAG CLI configuration in home directory')
  .action(async () => {
    try {
      const ragDir = path.join(homedir(), '.rag');
      const envPath = path.join(ragDir, '.env');
      const localEnvPath = path.join(process.cwd(), '.env');
      const exampleEnvPath = path.join(process.cwd(), '.env.example');

      log.info('Initializing RAG CLI configuration...');

      // Ensure .rag directory exists
      await ensureRagDir();
      log.success(`Created directory: ${ragDir}`);

      // Check if .env already exists in ~/.rag
      try {
        await fs.access(envPath);
        log.warning(`Configuration file already exists: ${envPath}`);
        log.info('To reconfigure, remove it and run init again.');
        return;
      } catch {
        // File doesn't exist, continue
      }

      // Try to copy .env from current directory first
      let envContent = '';
      let source = '';

      try {
        await fs.access(localEnvPath);
        envContent = await fs.readFile(localEnvPath, 'utf-8');
        source = localEnvPath;
        log.info(`Found .env in current directory`);
      } catch {
        // Try .env.example
        try {
          await fs.access(exampleEnvPath);
          envContent = await fs.readFile(exampleEnvPath, 'utf-8');
          source = exampleEnvPath;
          log.info(`Using .env.example as template`);
        } catch {
          // Create minimal .env
          envContent = `# Upstash Vector DB Configuration (Required)
UPSTASH_VECTOR_REST_URL=https://your-upstash-url.upstash.io
UPSTASH_VECTOR_REST_TOKEN=your-upstash-token

# Ollama Configuration (Optional)
OLLAMA_URL=http://localhost:11434

# Embedding Model Configuration (Optional)
EMBEDDING_MODEL=all-MiniLM-L6-v2

# LLM Configuration (Optional)
LLM_MODEL=qwen2.5:3b
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=1024

# Chunk Configuration (Optional)
CHUNK_SIZE=1000
CHUNK_OVERLAP=150

# Search Configuration (Optional)
SEARCH_TOP_K=5

# Logging Configuration (Optional)
LOG_LEVEL=info
`;
          source = 'default template';
          log.info(`Creating default .env template`);
        }
      }

      // Write .env to ~/.rag
      await fs.writeFile(envPath, envContent, 'utf-8');
      log.success(`Created configuration file: ${envPath}`);
      log.dim(`Source: ${source}`);

      console.log();
      log.success('Initialization complete!');
      console.log();
      log.info('Next steps:');
      log.info('  1. Edit ~/.rag/.env to add your Upstash credentials');
      log.info('  2. Run: rag add <file-or-directory>');
      log.info('  3. Run: rag ask "your question"');
      console.log();
    } catch (error) {
      log.error(`Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
