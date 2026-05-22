/**
 * Integration tests for add command
 */

import { scanFiles } from '../../src/core/scanner.js';
import { parseFile } from '../../src/core/parser.js';
import { chunkText } from '../../src/core/chunker.js';
import { hashFile } from '../../src/utils/hash.js';
import { readHashes, setHash } from '../../src/storage/hashes.js';
import { readIndex, updateIndex, ensureRagDir } from '../../src/storage/index.js';
import { SUPPORTED_EXTENSIONS } from '../../src/config/constants.js';
import path from 'path';

const fixturesPath = path.join(process.cwd(), 'tests', 'fixtures');

describe('Add Command Integration', () => {
  beforeAll(async () => {
    await ensureRagDir();
  });

  it('should scan and find markdown files', async () => {
    const files = await scanFiles({
      paths: [fixturesPath],
      supportedExtensions: SUPPORTED_EXTENSIONS,
    });
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.endsWith('.md'))).toBe(true);
  });

  it('should parse markdown file', async () => {
    const samplePath = path.join(fixturesPath, 'sample.md');
    const result = await parseFile(samplePath);
    expect(result.text).toBeDefined();
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('should chunk text into segments', async () => {
    const samplePath = path.join(fixturesPath, 'sample.md');
    const parseResult = await parseFile(samplePath);
    const chunks = await chunkText(parseResult.text, 'test-doc', {
      chunkSize: 1000,
      chunkOverlap: 150,
    });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].id).toContain('test-doc');
    expect(chunks[0].chunkIndex).toBe(0);
  });

  it('should hash file consistently', async () => {
    const samplePath = path.join(fixturesPath, 'sample.md');
    const hash1 = await hashFile(samplePath);
    const hash2 = await hashFile(samplePath);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA256 hex length
  });

  it('should store and retrieve file hash', async () => {
    const testPath = './test.md';
    const testHash = 'abc123def456';
    await setHash(testPath, testHash);
    const hashes = await readHashes();
    expect(hashes[testPath]).toBe(testHash);
  });

  it('should update index metadata', async () => {
    const initialIndex = await readIndex();
    await updateIndex({
      files: initialIndex.files + 1,
      chunks: initialIndex.chunks + 5,
      lastIndexedAt: new Date(),
      embeddingModel: 'all-MiniLM-L6-v2',
    });
    const updatedIndex = await readIndex();
    expect(updatedIndex.files).toBe(initialIndex.files + 1);
    expect(updatedIndex.chunks).toBe(initialIndex.chunks + 5);
  });
});
