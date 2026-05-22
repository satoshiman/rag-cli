/**
 * rag add command - Add and index documents
 */

import { Command } from 'commander';
import { scanFiles } from '../core/scanner.js';
import { parseFile } from '../core/parser.js';
import { getRelativePath, hashFile } from '../utils/hash.js';
import { readIndex, updateIndex, ensureRagDir, addDocumentPath } from '../storage/index.js';
import { readHashes, setHash, hasFileChanged } from '../storage/hashes.js';
import { SUPPORTED_EXTENSIONS } from '../config/constants.js';
import { chunkText } from '../core/chunker.js';
import { generateEmbeddings } from '../core/embedding.js';
import { upsertVectors, deleteDocumentVectors } from '../vector/upstash.js';
import { getConfig } from '../config/env.js';
import { log } from '../ui/colors.js';
import { startSpinner, succeedSpinner, failSpinner } from '../ui/spinner.js';

export const addCommand = new Command()
  .name('add')
  .description('Add documents to the RAG index')
  .argument('<paths...>', 'Paths to files or directories to index')
  .action(async (paths: string[]) => {
    try {
      startSpinner('Scanning files...');
      const files = await scanFiles({ paths, supportedExtensions: SUPPORTED_EXTENSIONS });

      if (files.length === 0) {
        failSpinner('No supported files found');
        log.info('Supported formats: .md, .txt, .pdf');
        return;
      }

      succeedSpinner(`Found ${files.length} file(s)`);

      // Ensure .rag directory exists
      await ensureRagDir();

      // Check for Upstash configuration
      const config = getConfig();
      if (!config.upstashUrl || !config.upstashToken) {
        log.error('Upstash credentials not configured');
        log.info(
          'Please set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN in your .env file'
        );
        process.exit(1);
      }

      // Read existing hashes and index
      const hashes = await readHashes();
      const index = await readIndex();

      let newFiles = 0;
      let updatedFiles = 0;
      let skippedFiles = 0;
      let totalChunks = 0;

      for (const filePath of files) {
        const relativePath = getRelativePath(filePath);
        const currentHash = await hashFile(filePath);
        const documentId = currentHash; // Use hash as document ID

        // Check if file has changed
        if (!(await hasFileChanged(relativePath, currentHash))) {
          skippedFiles++;
          log.dim(`Skipped (unchanged): ${relativePath}`);
          continue;
        }

        // If file was previously indexed, delete old vectors first
        if (hashes[relativePath]) {
          log.info(`Updating: ${relativePath}`);
          await deleteDocumentVectors(documentId);
          updatedFiles++;
        } else {
          log.info(`Indexing: ${relativePath}`);
          newFiles++;
          await addDocumentPath(relativePath);
        }

        try {
          // Parse file
          const parseResult = await parseFile(filePath);

          // Chunk the text
          const chunks = await chunkText(parseResult.text, documentId, {
            chunkSize: config.chunkSize,
            chunkOverlap: config.chunkOverlap,
          });

          log.dim(`  Chunks: ${chunks.length}`);

          // Generate embeddings for all chunks
          startSpinner('  Generating embeddings...');
          const chunkTexts = chunks.map((c) => c.text);
          const embeddings = await generateEmbeddings(chunkTexts, config.embeddingModel);
          succeedSpinner(`  Generated ${embeddings.length} embeddings`);

          // Prepare vector records for upstash
          const vectorRecords = chunks.map((chunk, i) => ({
            id: chunk.id,
            vector: embeddings[i].vector,
            metadata: {
              text: chunk.text,
              file: relativePath,
              path: relativePath,
              chunkIndex: chunk.chunkIndex,
              documentId,
            },
          }));

          // Upsert vectors to Upstash
          startSpinner('  Storing vectors...');
          await upsertVectors(vectorRecords);
          succeedSpinner('  Vectors stored');

          // Update chunk count
          totalChunks += chunks.length;

          // Update hash
          await setHash(relativePath, currentHash);
        } catch (fileError) {
          log.error(`Failed to process ${relativePath}: ${fileError}`);
          continue;
        }
      }

      // Update index
      await updateIndex({
        files: index.files + newFiles,
        chunks: index.chunks + totalChunks,
        lastIndexedAt: new Date(),
        embeddingModel: config.embeddingModel,
      });

      console.log();
      log.success('Indexing complete:');
      log.info(`  New files: ${newFiles}`);
      log.info(`  Updated files: ${updatedFiles}`);
      log.info(`  Skipped files: ${skippedFiles}`);
      log.info(`  Total chunks: ${totalChunks}`);
    } catch (error) {
      failSpinner('Indexing failed');
      log.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
