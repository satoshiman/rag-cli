/**
 * rag status command - Show indexing statistics
 */

import { Command } from 'commander';
import { readIndex } from '../storage/index.js';
import { log, colors } from '../ui/colors.js';

export const statusCommand = new Command()
  .name('status')
  .description('Show RAG index status and statistics')
  .action(async () => {
    try {
      const index = await readIndex();

      console.log(colors.bold('\n📊 RAG Status\n'));

      const formattedSize = formatBytes(index.totalSize ?? 0);
      const formattedDate = index.lastIndexedAt?.toLocaleString() ?? 'Never';

      console.log(`Files Indexed: ${index.files ?? 0}`);
      console.log(`Chunks Stored: ${index.chunks ?? 0}`);
      console.log(`Embedding Model: ${index.embeddingModel ?? 'Unknown'}`);
      console.log(`Vector DB: ${index.vectorDB ?? 'Unknown'}`);
      console.log(`LLM Model: ${index.llmModel ?? 'Unknown'}`);
      console.log(`Last Indexed: ${formattedDate}`);
      console.log(`Total Size: ${formattedSize}`);
      console.log(`Document Paths: ${index.documentPaths?.length ?? 0}`);

      console.log();
    } catch (error) {
      log.error(`Error reading index: ${error}`);
      console.error('Error details:', error);
      process.exit(1);
    }
  });

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
