/**
 * rag ask command - Ask a question and get AI-powered answers using RAG
 */

import { Command } from 'commander';
import { search } from '../vector/search.js';
import { loadConfig } from '../config/env.js';
import {
  generateAnswer,
  generateAnswerStream,
  buildRAGPrompt,
  checkOllamaAvailability,
} from '../core/llm.js';
import { log, colors } from '../ui/colors.js';

export async function handleAsk(
  question: string,
  options: { topK: string; llm: boolean; stream: boolean }
) {
  try {
    const config = loadConfig();
    const topK = parseInt(options.topK, 10) || config.searchTopK;
    const useLLM = options.llm;
    const useStream = options.stream !== false; // Default to streaming, --no-stream sets to false

    console.log(colors.bold(`\nQuestion: ${question}\n`));

    // Perform semantic search
    const result = await search(question, { topK });

    if (result.chunks.length === 0) {
      log.warning('No relevant chunks found');
      log.info('Make sure you have indexed documents first using `rag add`');
      return;
    }

    log.success(`Found ${result.chunks.length} relevant chunks\n`);

    // If LLM is disabled, just show chunks
    if (!useLLM) {
      result.chunks.forEach((chunk, index) => {
        console.log(colors.dim(`[${index + 1}] Score: ${chunk.score.toFixed(4)}`));
        console.log(colors.dim(`    File: ${chunk.id.split('::')[0]}`));
        console.log(colors.dim(`    Chunk: ${chunk.chunkIndex}`));
        console.log(
          colors.dim(
            `    Text: ${chunk.text.substring(0, 200)}${chunk.text.length > 200 ? '...' : ''}\n`
          )
        );
      });
      log.dim(`Retrieved at: ${result.retrievedAt.toISOString()}`);
      return;
    }

    // Check Ollama availability
    const ollamaAvailable = await checkOllamaAvailability();
    if (!ollamaAvailable) {
      log.warning('Ollama is not available. Falling back to chunk-only mode.');
      log.info('Make sure Ollama is running: ollama serve\n');
      result.chunks.forEach((chunk, index) => {
        console.log(colors.dim(`[${index + 1}] Score: ${chunk.score.toFixed(4)}`));
        console.log(colors.dim(`    File: ${chunk.id.split('::')[0]}`));
        console.log(colors.dim(`    Chunk: ${chunk.chunkIndex}`));
        console.log(
          colors.dim(
            `    Text: ${chunk.text.substring(0, 200)}${chunk.text.length > 200 ? '...' : ''}\n`
          )
        );
      });
      return;
    }

    // Build RAG prompt with context
    const contextChunks = result.chunks.map((chunk) => ({
      text: chunk.text,
      file: chunk.id.split('::')[0],
    }));
    const prompt = buildRAGPrompt(question, contextChunks);

    log.info('Generating answer...\n');

    // Generate answer (streaming or non-streaming)
    if (useStream) {
      for await (const chunk of generateAnswerStream(prompt)) {
        process.stdout.write(chunk);
      }
      console.log('\n');
    } else {
      const answer = await generateAnswer(prompt);
      console.log(answer);
    }

    // Show sources
    console.log(colors.bold('\n--- Sources ---'));
    const uniqueFiles = [...new Set(contextChunks.map((c) => c.file))];
    uniqueFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export const askCommand = new Command()
  .name('ask')
  .description('Ask a question and get an AI-powered answer based on your documents')
  .argument('<question>', 'Natural language question')
  .option('-k, --top-k <number>', 'Number of chunks to retrieve', '5')
  .option('--no-llm', 'Disable LLM and show only retrieved chunks')
  .option('--no-stream', 'Disable streaming output')
  .action(handleAsk);
