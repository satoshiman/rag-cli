/**
 * rag clear command - Clear all index data
 */

import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import { getRagDir } from '../storage/index.js';
import { INDEX_FILE_NAME, HASHES_FILE_NAME } from '../config/constants.js';
import { log, colors } from '../ui/colors.js';
import { getIndex, deleteVectors } from '../vector/upstash.js';

export const clearCommand = new Command()
  .name('clear')
  .description('Clear all RAG index data (index.json, hashes.json, and Upstash vectors)')
  .option('--force', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      const ragDir = getRagDir();
      const indexPath = path.join(ragDir, INDEX_FILE_NAME);
      const hashesPath = path.join(ragDir, HASHES_FILE_NAME);

      // Check if files exist
      let indexExists = false;
      let hashesExists = false;

      try {
        await fs.access(indexPath);
        indexExists = true;
      } catch {
        // File doesn't exist
      }

      try {
        await fs.access(hashesPath);
        hashesExists = true;
      } catch {
        // File doesn't exist
      }

      if (!indexExists && !hashesExists) {
        log.info('No index data found to clear.');
        return;
      }

      // Confirm unless --force flag is used
      if (!options.force) {
        console.log(colors.warning('\n⚠️  This will delete all index data:'));
        if (indexExists) console.log(`  - ${indexPath}`);
        if (hashesExists) console.log(`  - ${hashesPath}`);
        console.log(colors.dim('  - All vectors in Upstash Vector DB'));
        console.log();

        // Simple confirmation (in production, you might use a proper prompt library)
        console.log(colors.dim('To confirm, run with --force flag'));
        console.log(colors.dim('Example: rag clear --force'));
        return;
      }

      // Delete vectors from Upstash
      try {
        const index = getIndex();
        const dummyVector = Array(384).fill(0);
        let totalDeleted = 0;
        let hasMore = true;

        while (hasMore) {
          const results = await index.query({
            vector: dummyVector,
            topK: 1000,
            includeMetadata: true,
          });

          if (results.length === 0) {
            hasMore = false;
            break;
          }

          const ids = results
            .map((r) => String(r.id))
            .filter((id): id is string => id !== undefined && id !== '');
          if (ids.length > 0) {
            await deleteVectors(ids);
            totalDeleted += ids.length;
          }

          // If we got less than 1000 results, we've fetched all
          if (results.length < 1000) {
            hasMore = false;
          }
        }

        if (totalDeleted > 0) {
          log.success(`Deleted ${totalDeleted} vectors from Upstash`);
        } else {
          log.info('No vectors found in Upstash');
        }
      } catch (error) {
        log.warning(`Failed to clear Upstash vectors: ${error}`);
        log.info('Continuing with local metadata cleanup...');
      }

      // Delete files
      if (indexExists) {
        await fs.unlink(indexPath);
        log.success('Deleted index.json');
      }

      if (hashesExists) {
        await fs.unlink(hashesPath);
        log.success('Deleted hashes.json');
      }

      // Try to remove the .rag directory if it's empty
      try {
        const files = await fs.readdir(ragDir);
        if (files.length === 0) {
          await fs.rmdir(ragDir);
          log.success('Removed .rag directory');
        }
      } catch {
        // Directory not empty or other error, ignore
      }

      console.log(colors.bold('\n✅ All index data cleared successfully.\n'));
    } catch (error) {
      log.error(`Error clearing index: ${error}`);
      process.exit(1);
    }
  });
