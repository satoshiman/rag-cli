# RAG CLI - Project Agent & Architecture Guide

**Project**: Local-First RAG CLI Application  
**Status**: MVP Phase  
**Created**: 2026-05-22  
**Last Updated**: 2026-05-22

---

## 1. Project Vision & Goals

### 1.1 Vision Statement

Build a lightweight, local-first Retrieval-Augmented Generation (RAG) CLI application that allows users to organize and search personal documentation using semantic understanding. Users can quickly index local markdown/text/PDF files, then ask natural language questions to retrieve relevant information augmented with AI-generated answers from a local LLM.

### 1.2 Use Case

**Primary User**: Solo developer/knowledge worker who wants to:

- Index personal documentation (notes, guides, articles)
- Search using natural language questions
- Get AI-assisted answers based on relevant document chunks
- Run everything locally without external dependencies (except Upstash Vector DB)

### 1.3 Success Metrics

- MVP launches with core 3 commands working (`rag add`, `rag <question>`, `rag status`)
- Index & search 1000+ documents within reasonable time
- Semantic search accuracy > 80% relevance
- Local LLM response time < 10 seconds per query
- Developer can extend with new document types easily

---

## 2. Business Requirements & Data Model

### 2.1 Primary Entities

#### Document

```
{
  id: string (SHA256 of file path)
  path: string (relative path: ./docs/security.md)
  filename: string (security.md)
  filetype: enum (markdown | text | pdf)
  content: string (raw text after parsing)
  hash: string (SHA256 of content - for change detection)
  status: enum (indexed | pending | failed)
  indexedAt: ISO8601 timestamp
  fileSize: number (bytes)
}
```

#### Chunk

```
{
  id: string (format: "{documentId}::chunk_{index}")
  documentId: string
  text: string (semantic chunk of 1000 chars)
  chunkIndex: number (0, 1, 2...)
  embedding: vector[] (1536 dimensions from text-embedding-3-small)
  startChar: number
  endChar: number
}
```

#### Query

```
{
  id: string (UUID)
  question: string
  embedding: vector[] (1536 dimensions)
  results: {
    chunks: Chunk[]
    llmAnswer: string
    retrievedAt: ISO8601
  }
}
```

#### Metadata

```
{
  files: number (total indexed files)
  chunks: number (total chunks in vector DB)
  embedding_model: string (text-embedding-3-small)
  vector_db: string (Upstash Vector)
  llm_model: string (qwen2.5:3b)
  lastIndexedAt: ISO8601
  totalSize: number (bytes)
  documentPaths: string[] (tracked paths)
}
```

### 2.2 Entity Relationships

```
Document (1) ──────→ (Many) Chunk
                           │
                           └──→ Embedding (stored in Upstash)

Query
  ├─→ retrieves top K Chunks (via vector similarity)
  └─→ passes Chunks + question to LLM
      └─→ generates Answer
```

### 2.3 Data Flow

```
User Input Files
    ↓
[rag add ./docs ./notes/auth.md]
    ↓
1. Resolve & Glob Paths
2. Parse Files (markdown-it for .md, raw text for .txt, pdf-parse for .pdf)
3. Generate SHA256 hash of file content
4. Compare with .rag/hashes.json - skip if unchanged
5. Chunk text (RecursiveCharacterTextSplitter: 1000 chars, 150 overlap)
6. Generate embeddings (local: @xenova/transformers with all-MiniLM-L6-v2)
7. Store in Upstash Vector DB
8. Update .rag/index.json & .rag/hashes.json

User Query
    ↓
[rag "why avoid localStorage for JWT?"]
    ↓
1. Generate embedding for query
2. Vector similarity search (Upstash: top K=5)
3. Retrieve top 5 chunks with metadata
4. Build RAG prompt with chunks as context
5. Send to local Ollama (qwen2.5:3b)
6. Stream/return AI answer
7. (Optional) Display sources
```

### 2.4 State Transitions

**Document States**:

- `pending` → `indexed` (successful)
- `pending` → `failed` (error during embedding/storage)
- `indexed` → `deleted` (file removed, tombstone in metadata)

**Index States**:

- `empty` → `building` (during rag add)
- `building` → `ready` (completed)
- `ready` → `stale` (changes detected via file hashing)
- `stale` → `updating` → `ready`

---

## 3. Core Features & User Stories

### 3.1 MVP Features (Must-Have)

#### Feature 1: Add & Index Documents

**User Story**: As a user, I want to add markdown/text/PDF files to the RAG index so I can search them later.

**Acceptance Criteria**:

- [x] `rag add ./docs` recursively indexes all .md, .txt files
- [x] `rag add ./docs ./notes/auth.md` accepts multiple paths
- [x] Files are parsed and converted to text
- [x] File hashing prevents re-embedding unchanged files
- [x] Chunks are generated with configurable size (1000 chars, 150 overlap)
- [x] Embeddings are generated and stored in Upstash
- [x] `.rag/index.json` and `.rag/hashes.json` are updated
- [x] User sees progress/status during indexing
- [x] Errors are caught and reported gracefully

**Complexity**: Medium

---

#### Feature 2: Semantic Search & AI Answer

**User Story**: As a user, I want to ask a natural language question and get an AI-generated answer based on my indexed documents.

**Acceptance Criteria**:

- [x] `rag "why avoid localStorage for JWT?"` works
- [x] Query is embedded using same model as documents
- [x] Vector similarity search retrieves top 5 relevant chunks
- [x] Chunks are passed as context to local Ollama (qwen2.5:3b)
- [x] LLM generates natural language answer in < 10 seconds
- [x] Answer is printed to stdout
- [x] (Optional) Source documents are mentioned
- [x] Graceful handling if Ollama is unavailable (fallback to chunk display)
- [x] Streaming output support (default behavior)
- [x] Configurable streaming with --no-stream flag

**Complexity**: Medium-High

---

#### Feature 3: Status & Metadata

**User Story**: As a user, I want to see indexing statistics and system status to understand what's in my RAG database.

**Acceptance Criteria**:

- [x] `rag status` displays:
  - Total files indexed
  - Total chunks stored
  - Embedding model name
  - Vector DB provider
  - LLM model name
  - Last indexed timestamp
  - Total storage size
- [x] Output is human-readable table format
- [x] Information is read from `.rag/index.json` cache

**Complexity**: Simple

---

#### Feature 4: Clear Index Data

**User Story**: As a user, I want to clear all index data to start fresh or reset the RAG database.

**Acceptance Criteria**:

- [x] `rag clear` displays warning and requires confirmation
- [x] `rag clear --force` clears all index data without confirmation
- [x] Deletes `.rag/index.json` and `.rag/hashes.json`
- [x] Removes `.rag` directory if empty
- [x] Deletes all vectors from Upstash Vector DB
- [x] Shows success message after clearing
- [x] Handles case where no index data exists
- [x] Handles Upstash rate limits (batch deletion)

**Complexity**: Simple

---

### 3.2 Nice-to-Have Features (V1.1+)

- Hybrid search (BM25 + vector similarity)
- Reranking of results
- Filter by file/date
- Watch mode (auto-index changes)
- Export results to markdown
- Search history
- Configuration file (`.ragrc`)
- Support for more file types (.docx, .html, code files)

### 3.3 Out-of-Scope (Explicitly No)

- Multi-user support in MVP
- Web UI / Dashboard
- Real-time sync across machines
- Authentication/authorization
- Cloud deployment
- Analytics/telemetry

---

## 4. Technical Architecture

### 4.1 Tech Stack

| Layer                 | Choice                                                  | Reason                          |
| --------------------- | ------------------------------------------------------- | ------------------------------- |
| **Runtime**           | Node.js 18+                                             | Universal, good CLI support     |
| **Language**          | TypeScript (strict mode)                                | Type safety, maintainability    |
| **Dev Runtime**       | npm/npx                                                 | Standard Node.js tooling        |
| **CLI Framework**     | commander.js                                            | Mature, widely-used CLI parser  |
| **File Operations**   | fs/promises + glob                                      | Native Node.js APIs             |
| **Markdown Parsing**  | markdown-it                                             | Fast, spec-compliant            |
| **PDF Parsing**       | pdf-parse                                               | Lightweight, pure JS            |
| **Text Chunking**     | LangChain RecursiveCharacterTextSplitter                | Industry standard, configurable |
| **Embeddings**        | @xenova/transformers (JS) with all-MiniLM-L6-v2 (local) | No API dependency               |
| **Vector DB**         | Upstash Vector (REST API)                               | Serverless, free tier, no setup |
| **Local LLM**         | Ollama + qwen2.5:3b                                     | Fast, lightweight, multilingual |
| **UI/Formatting**     | chalk + ora + cli-table3                                | Rich terminal output            |
| **Config Management** | dotenv                                                  | Environment variables           |
| **Hashing**           | Node.js crypto module                                   | Built-in, no dependencies       |
| **Validation**        | zod                                                     | Runtime schema validation       |
| **Testing**           | Jest                                                    | Standard Node.js test framework |
| **Linting**           | ESLint + Prettier                                       | Code quality & formatting       |

### 4.2 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        RAG CLI                              │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
            ┌───────▼──┐  ┌───▼────┐  ┌▼────────┐
            │  rag add │  │rag ask │  │rag      │
            │          │  │        │  │status   │
            └─────┬────┘  └───┬────┘  └┬────────┘
                  │           │        │
        ┌─────────▼───────────▼────────▼──────────────┐
        │        Core RAG Engine                      │
        ├──────────────────────────────────────────────┤
        │                                              │
        │  ┌────────────┐         ┌─────────────────┐ │
        │  │ Scanner    │         │ Vector Search   │ │
        │  │ + Parser   │         │ (Upstash API)   │ │
        │  └────┬───────┘         └────────┬────────┘ │
        │       │                          │          │
        │  ┌────▼──────────┐    ┌──────────▼────────┐ │
        │  │ Chunker       │    │ Embedding Gen     │ │
        │  │ (LangChain)   │    │ (transformers.js) │ │
        │  └───────────────┘    └───────────────────┘ │
        │                                              │
        │  ┌────────────────────────────────────────┐ │
        │  │ Local Storage (.rag/)                  │ │
        │  │ - index.json (metadata)                │ │
        │  │ - hashes.json (file tracking)          │ │
        │  └────────────────────────────────────────┘ │
        └─────────────────────────────────────────────┘
                    │              │              │
        ┌───────────▼──┐  ┌────────▼───┐  ┌──────▼─────┐
        │Local Files   │  │Upstash     │  │ Ollama     │
        │(.md/.txt)    │  │ Vector DB  │  │ (Local LLM)│
        │              │  │            │  │            │
        └──────────────┘  └────────────┘  └────────────┘
```

### 4.3 Command Flow Details

#### `rag add` Flow

```
Input: ["./docs", "./notes/auth.md"]
  ↓
Step 1: Path Resolution (glob + fs)
  - Expand globs: ./docs/**/*.{md,txt,pdf}
  - Validate paths exist
  ↓
Step 2: File Parsing
  - For .md: parse with markdown-it → extract text
  - For .txt: read as-is
  - For .pdf: extract text with pdf-parse
  ↓
Step 3: Hashing & Change Detection
  - SHA256(file content)
  - Compare with .rag/hashes.json
  - If unchanged: skip
  - If new/changed: proceed
  ↓
Step 4: Chunking
  - RecursiveCharacterTextSplitter(1000, 150)
  - Generate chunk IDs: "security.md::chunk_0", "security.md::chunk_1"
  ↓
Step 5: Embedding Generation
  - For each chunk, generate vector using sentence-transformers
  - Vectors: 384 dimensions (all-MiniLM-L6-v2) or 1536 (if upgrading)
  ↓
Step 6: Store in Upstash
  - Upsert vectors with metadata:
    {
      id: "security.md::chunk_1",
      values: [0.123, -0.442, ...],
      metadata: {
        text: "Do not store JWT...",
        file: "security.md",
        path: "./docs/security.md",
        chunkIndex: 1
      }
    }
  ↓
Step 7: Update Local Metadata
  - Update .rag/index.json (files count, chunks count, timestamp)
  - Update .rag/hashes.json (path → hash mapping)
  ↓
Output: "Indexed 42 documents, 248 chunks"
```

#### `rag "question"` Flow

```
Input: "why avoid localStorage for JWT?"
  ↓
Step 1: Embed Query
  - Generate embedding vector (same model as docs)
  ↓
Step 2: Vector Search
  - Query Upstash with vector + top_k=5
  - Return 5 most similar chunks
  ↓
Step 3: Build RAG Prompt
  Context:
  ---
  [Chunk 1]
  [Chunk 2]
  ...
  [Chunk 5]
  ---

  Question: why avoid localStorage for JWT?
  ↓
Step 4: Call Local Ollama
  - POST to http://localhost:11434/api/generate
  - Model: qwen2.5:3b
  - Prompt: RAG prompt + conversation history
  - Stream: true (for real-time output)
  ↓
Step 5: Output Answer
  - Stream response to stdout
  - Optionally append sources
  ↓
Output:
"JWT should be stored in HTTP-only cookies, not localStorage,
because localStorage is vulnerable to XSS attacks..."
```

#### `rag status` Flow

```
Input: (no arguments)
  ↓
Step 1: Read .rag/index.json
  ↓
Step 2: Format Output
  RAG Status

  Files Indexed:      12
  Chunks Stored:      248
  Embedding Model:    all-MiniLM-L6-v2
  Vector DB:          Upstash Vector
  LLM Model:          qwen2.5:3b
  Last Indexed:       2026-05-22 12:00
  Total Size:         2.3 MB
  ↓
Output: Formatted table
```

---

## 5. Folder Structure

```
rag-cli/
├── src/
│   ├── commands/
│   │   ├── add.ts              # rag add implementation
│   │   ├── ask.ts              # rag <question> implementation
│   │   └── status.ts           # rag status implementation
│   │
│   ├── core/
│   │   ├── scanner.ts          # File globbing & detection
│   │   ├── parser.ts           # File parsing (md, txt, pdf)
│   │   ├── chunker.ts          # RecursiveCharacterTextSplitter wrapper
│   │   ├── embedding.ts        # Generate embeddings (local or API)
│   │   └── llm.ts              # Ollama API client
│   │
│   ├── vector/
│   │   ├── upstash.ts          # Upstash Vector API client
│   │   └── search.ts           # Vector similarity search
│   │
│   ├── storage/
│   │   ├── index.ts            # .rag/index.json manager
│   │   └── hashes.ts           # .rag/hashes.json manager
│   │
│   ├── ui/
│   │   ├── spinner.ts          # ora progress indicators
│   │   ├── table.ts            # cli-table3 formatting
│   │   └── colors.ts           # chalk color utilities
│   │
│   ├── config/
│   │   ├── env.ts              # dotenv loader + validation (zod)
│   │   └── constants.ts        # Magic numbers, defaults
│   │
│   ├── utils/
│   │   ├── hash.ts             # SHA256 hashing
│   │   ├── logger.ts           # Logging utilities
│   │   ├── errors.ts           # Custom error classes
│   │   └── types.ts            # Shared TypeScript types
│   │
│   ├── index.ts                # CLI entry point
│   └── main.ts                 # Main CLI setup
│
├── .rag/                       # Local RAG metadata & cache
│   ├── index.json              # {files, chunks, lastIndexedAt, ...}
│   ├── hashes.json             # {path → SHA256 hash mapping}
│   └── cache/                  # Optional: cached embeddings
│
├── tests/
│   ├── unit/
│   │   ├── chunker.test.ts
│   │   ├── scanner.test.ts
│   │   └── hash.test.ts
│   ├── integration/
│   │   ├── add.integration.test.ts
│   │   └── ask.integration.test.ts
│   └── fixtures/
│       ├── sample.md
│       └── sample.pdf
│
├── .eslintrc.json              # ESLint config
├── .prettierrc.json            # Prettier config
├── jest.config.js              # Jest test config
├── tsconfig.json               # TypeScript config (strict mode)
├── package.json
├── .env.example
├── .gitignore
├── README.md
└── CHANGELOG.md
```

---

## 6. Environment Variables

```env
# Required
UPSTASH_VECTOR_REST_URL=https://...
UPSTASH_VECTOR_REST_TOKEN=...

# Optional
OLLAMA_URL=http://localhost:11434
EMBEDDING_MODEL=all-MiniLM-L6-v2
LLM_MODEL=qwen2.5:3b
LOG_LEVEL=info
RAG_HOME=~/.rag

# Chunk Configuration
CHUNK_SIZE=1000
CHUNK_OVERLAP=150
SEARCH_TOP_K=5

# LLM Configuration
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=1024
```

### 6.1 Configuration Validation

Use `zod` to validate environment at startup:

```typescript
const configSchema = z.object({
  upstashUrl: z.string().url().optional(),
  upstashToken: z.string().optional(),
  ollamaUrl: z.string().url().default('http://localhost:11434'),
  embeddingModel: z.string().default('all-MiniLM-L6-v2'),
  llmModel: z.string().default('qwen2.5:3b'),
  chunkSize: z.number().default(1000),
  chunkOverlap: z.number().default(150),
  searchTopK: z.number().default(5),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});
```

---

## 7. API Interfaces & Type Definitions

### 7.1 Core Types

```typescript
// Document representation
interface Document {
  id: string;
  path: string;
  filename: string;
  filetype: 'markdown' | 'text' | 'pdf';
  content: string;
  hash: string;
  status: 'indexed' | 'pending' | 'failed';
  indexedAt: Date;
  fileSize: number;
}

// Chunk representation
interface Chunk {
  id: string;
  documentId: string;
  text: string;
  chunkIndex: number;
  startChar: number;
  endChar: number;
  embedding?: number[];
}

// Vector store record
interface VectorRecord {
  id: string;
  vector: number[];
  metadata: {
    text: string;
    file: string;
    path: string;
    chunkIndex: number;
  };
}

// Search result
interface SearchResult {
  chunks: (Chunk & { score: number })[];
  query: string;
  retrievedAt: Date;
}

// RAG result with LLM answer
interface RAGResult {
  answer: string;
  sources: Array<{ file: string; path: string }>;
  chunks: Chunk[];
  generatedAt: Date;
}

// Metadata
interface IndexMetadata {
  files: number;
  chunks: number;
  embeddingModel: string;
  vectorDB: string;
  llmModel: string;
  lastIndexedAt: Date;
  totalSize: number;
  documentPaths: string[];
}
```

### 7.2 Command Interfaces

```typescript
// Scanner
interface ScannerOptions {
  paths: string[];
  supportedExtensions: string[];
}

// Parser
interface ParserResult {
  text: string;
  metadata: Record<string, any>;
}

// Chunker
interface ChunkerOptions {
  chunkSize: number;
  chunkOverlap: number;
}

// Embedding
interface EmbeddingResult {
  text: string;
  vector: number[];
  dimensions: number;
}

// Vector Search
interface SearchOptions {
  query: string;
  topK: number;
  filter?: Record<string, any>;
}

// LLM
interface LLMOptions {
  model: string;
  temperature: number;
  maxTokens: number;
}

interface LLMRequest {
  prompt: string;
  stream: boolean;
  options: LLMOptions;
}
```

---

## 8. Implementation Details

### 8.1 File Parsing Strategy

#### Markdown (.md)

```typescript
// Use markdown-it to parse, extract text content
import MarkdownIt from 'markdown-it';
const md = new MarkdownIt();
const tokens = md.parse(content);
// Extract only text tokens, remove markdown syntax
```

#### Plain Text (.txt)

```typescript
// Pass through as-is
return content;
```

#### PDF (.pdf)

```typescript
// Use pdf-parse to extract text
import pdfParse from 'pdf-parse';
const data = await pdfParse(buffer);
const text = data.text;
```

### 8.2 Embedding Generation Strategy

**Option 1 (Recommended for MVP)**: sentence-transformers via subprocess

```bash
# Python subprocess using sentence-transformers
python -m sentence_transformers \
  --model all-MiniLM-L6-v2 \
  --encode "your text here"
```

**Option 2**: @xenova/transformers (pure JS, no Python required)

```typescript
import { pipeline } from '@xenova/transformers';
const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
const result = await extractor(text, { pooling: 'mean' });
```

**Option 3 (Future)**: OpenAI text-embedding-3-small

```typescript
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: text,
});
```

### 8.3 Vector Database: Upstash Integration

```typescript
import { Index } from '@upstash/vector';

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

// Upsert vectors
await index.upsert([
  {
    id: 'security.md::chunk_1',
    vector: [0.123, -0.442, ...],
    metadata: {
      text: 'Do not store JWT in localStorage...',
      file: 'security.md',
      path: './docs/security.md',
      chunkIndex: 1,
    },
  },
]);

// Query
const results = await index.query({
  vector: queryEmbedding,
  topK: 5,
  includeMetadata: true,
});
```

### 8.4 Local LLM: Ollama Integration

```typescript
// Ollama API client
async function generateAnswer(prompt: string): Promise<string> {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5:3b',
      prompt,
      stream: false,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.response;
}

// Streaming variant
async function* generateAnswerStream(prompt: string) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: 'qwen2.5:3b',
      prompt,
      stream: true,
      temperature: 0.7,
    }),
  });

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No stream');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = new TextDecoder().decode(value);
    yield chunk;
  }
}
```

### 8.5 Incremental Indexing & File Hashing

```typescript
// .rag/hashes.json structure
{
  "./docs/security.md": "abc123def456...",
  "./docs/auth.md": "xyz789uvw012...",
  "./notes/api.md": "aaa111bbb222..."
}

// On `rag add`, for each file:
1. Calculate currentHash = SHA256(fileContent)
2. Look up storedHash from .rag/hashes.json
3. If currentHash === storedHash: skip (no change)
4. If currentHash !== storedHash: re-index (updated file)
5. If path not in hashes.json: new file, index it

// Handle deleted files:
1. Compare tracked paths (hashes.json) with actual files
2. For paths no longer on disk:
   - Remove all chunks with that documentId from Upstash
   - Remove from hashes.json
   - Update index.json
```

---

## 9. Coding Standards & Guidelines

### 9.1 TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### 9.2 Code Style

**ESLint + Prettier**:

```json
{
  "extends": ["eslint:recommended"],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/explicit-return-types": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error",
    "no-var": "error",
    "eqeqeq": ["error", "always"]
  }
}
```

**Prettier**:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### 9.3 File Naming & Organization

- Commands: `src/commands/add.ts`, `src/commands/ask.ts`
- Core modules: `src/core/scanner.ts`, `src/core/parser.ts`
- Utils: `src/utils/hash.ts`, `src/utils/logger.ts`
- Tests: `tests/unit/`, `tests/integration/`, `tests/fixtures/`
- Config: `src/config/env.ts`, `src/config/constants.ts`

### 9.4 Error Handling

```typescript
// Custom error classes
class RAGError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
  }
}

class FileNotFoundError extends RAGError {
  constructor(path: string) {
    super(`File not found: ${path}`, 'FILE_NOT_FOUND');
  }
}

class EmbeddingError extends RAGError {
  constructor(message: string) {
    super(`Embedding generation failed: ${message}`, 'EMBEDDING_ERROR');
  }
}

class VectorDBError extends RAGError {
  constructor(message: string) {
    super(`Vector DB error: ${message}`, 'VECTOR_DB_ERROR');
  }
}

// Usage
try {
  await generateEmbedding(text);
} catch (error) {
  if (error instanceof EmbeddingError) {
    logger.error(`Failed to embed text: ${error.message}`);
    // Graceful fallback or retry
  }
}
```

### 9.5 Logging

```typescript
// Logger utility
const logger = {
  debug: (msg: string, data?: any) => {
    if (logLevel === 'debug') console.debug(`[DEBUG] ${msg}`, data);
  },
  info: (msg: string, data?: any) => {
    console.log(`[INFO] ${msg}`, data);
  },
  warn: (msg: string, data?: any) => {
    console.warn(`[WARN] ${msg}`, data);
  },
  error: (msg: string, data?: any) => {
    console.error(`[ERROR] ${msg}`, data);
  },
};
```

### 9.6 Documentation Requirements

- **JSDoc** for all exported functions/classes
- **Inline comments** for complex logic (chunking, vector search, LLM prompting)
- **Type definitions** replace most comments (use types to document intent)

Example:

```typescript
/**
 * Parse markdown file and extract text content
 * @param filePath - Absolute path to markdown file
 * @returns Parsed text with metadata
 * @throws FileNotFoundError if file doesn't exist
 * @example
 * const result = await parseMarkdown('./docs/api.md');
 * console.log(result.text); // "API Documentation..."
 */
export async function parseMarkdown(filePath: string): Promise<ParserResult> {
  // Implementation
}
```

---

## 10. Testing Strategy

### 10.1 Unit Tests (Jest)

**Coverage targets**: > 80%

**Test structure**:

```typescript
describe('Chunker', () => {
  it('should split text into chunks of specified size', () => {
    const text = 'a'.repeat(2500);
    const chunks = chunker.chunk(text, { size: 1000, overlap: 150 });
    expect(chunks.length).toBe(3);
    expect(chunks[0].length).toBe(1000);
  });

  it('should handle edge case of text smaller than chunk size', () => {
    const text = 'small text';
    const chunks = chunker.chunk(text, { size: 1000, overlap: 150 });
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe('small text');
  });
});
```

### 10.2 Integration Tests

- Test `rag add` with sample files
- Test `rag ask` with real Upstash & Ollama
- Test end-to-end workflow

### 10.3 Fixtures

```
tests/fixtures/
├── sample.md              # Small markdown file
├── sample.txt             # Plain text
├── sample.pdf             # PDF file
├── large.md               # 10K+ characters for chunking tests
└── edge_cases/
    ├── empty.md
    ├── unicode.md         # UTF-8 test
    └── special_chars.txt  # Punctuation, symbols
```

---

## 11. Performance & Optimization

### 11.1 Embedding Generation

**Current approach**: Batch embeddings in parallel

```typescript
// Process in batches of 100 chunks to avoid memory issues
const batchSize = 100;
for (let i = 0; i < chunks.length; i += batchSize) {
  const batch = chunks.slice(i, i + batchSize);
  const embeddings = await Promise.all(batch.map((chunk) => generateEmbedding(chunk.text)));
  // Upsert to Upstash
}
```

### 11.2 Vector Database Queries

- Use indexing on Upstash (built-in)
- Limit top K to 5 for MVP (configurable)
- Metadata filtering (if needed in future)

### 11.3 LLM Response Time

- Stream responses to user for perceived speed
- Consider response length limit (max 2048 tokens)
- Timeout if Ollama takes > 30 seconds

### 11.4 Local Storage

- Compress cached embeddings if needed
- Lazy load metadata on demand
- Keep `.rag/index.json` small (metadata only, not full embeddings)

---

## 12. Security Considerations

### 12.1 API Keys & Secrets

- **Never commit** `.env` file
- Use `.env.example` with placeholder values
- Load from environment variables at runtime (dotenv)
- Validate that required keys are present on startup

### 12.2 File Access

- Validate file paths to prevent directory traversal
- Use `path.resolve()` to normalize paths
- Only index files in allowed directories

### 12.3 Local LLM Safety

- Validate Ollama is running before querying
- Set timeout on LLM requests
- Don't expose system prompts to users

### 12.4 Vector Database

- Upstash tokens stored only in environment
- Don't log queries or embeddings

---

## 13. Development Workflow

### 13.1 Local Setup

```bash
# Clone & install
git clone <repo>
cd rag-cli
npm install

# Create environment file
cp .env.example .env
# Edit .env with your credentials

# Start Ollama (separate terminal)
ollama serve

# Pull model
ollama pull qwen2.5:3b

# Run in development
npm run dev -- add ./docs
npm run dev -- "what is RAG?"
npm run dev -- status

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Lint & format
npm run lint
npm run format

# Build
npm run build
```

### 13.2 Git Workflow

- **Branch naming**: `feature/[name]`, `bugfix/[name]`, `hotfix/[name]`
- **All commits to main**: via pull request
- **PR checks**: ESLint, Prettier, TypeScript, Tests must pass
- **Code review**: 1 approval minimum
- **Commit messages**: Clear, descriptive (e.g., "feat: add PDF parsing support")

### 13.3 CI/CD Pipeline (GitHub Actions)

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run lint
      - run: npm run type-check
      - run: npm test
      - run: npm run build
```

---

## 14. Deployment & Release

### 14.1 NPM Package Distribution

```json
{
  "name": "rag-cli",
  "version": "0.1.0",
  "description": "Local-first RAG CLI application",
  "bin": {
    "rag": "./dist/index.js"
  },
  "main": "./dist/index.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "jest",
    "lint": "eslint src",
    "format": "prettier --write src"
  },
  "dependencies": {
    "@upstash/vector": "^1.x",
    "@xenova/transformers": "^2.x",
    "chalk": "^5.x",
    "cli-table3": "^0.x",
    "commander": "^11.x",
    "dotenv": "^16.x",
    "glob": "^10.x",
    "langchain": "^0.x",
    "markdown-it": "^13.x",
    "ora": "^5.x",
    "pdf-parse": "^1.x",
    "zod": "^3.x"
  }
}
```

### 14.2 Release Process

1. Update `package.json` version
2. Update `CHANGELOG.md`
3. Create release branch: `release/v0.1.0`
4. Merge to main with git tag
5. GitHub Actions triggers npm publish
6. Create GitHub Release with notes

### 14.3 Versioning

- Semantic versioning: MAJOR.MINOR.PATCH
- v0.1.0: MVP launch
- v0.2.0: PDF support + improvements
- v1.0.0: Stable release

---

## 15. Documentation Requirements

### 15.1 Required Files

- **README.md**: Getting started, installation, basic usage
- **ARCHITECTURE.md**: System design, component interactions
- **API.md**: Command reference, options, examples
- **CONTRIBUTING.md**: Development setup, testing, PR guidelines
- **CHANGELOG.md**: Version history

### 15.2 README Structure

````markdown
# RAG CLI

Local-first Retrieval-Augmented Generation for personal documentation.

## Quick Start

```bash
npm install -g rag-cli
rag add ./docs
rag "how do I use JWT?"
```
````

## Features

- Index markdown, text, PDF files
- Semantic search with vectors
- AI-powered answers from local LLM
- Zero cloud dependencies (except embeddings)

## Installation

## Configuration

## Usage Examples

## Architecture

## Contributing

## License

```

---

## 16. MVP Feature Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1) ✅ COMPLETE

**Milestone**: Basic file scanning & parsing

- [x] Project scaffolding & setup
- [x] File scanner (glob, path resolution)
- [x] Markdown parser (markdown-it)
- [x] Text file parser
- [x] Environment configuration (dotenv + zod)
- [x] Local storage utilities (.rag/ structure)
- [x] CLI entry point with commander
- [x] Basic commands (add, status, ask placeholders)

**Deliverable**: `rag add ./docs` successfully scans & parses files ✅

---

### Phase 2: Embedding & Vector Storage (Week 2) ✅ COMPLETED

**Milestone**: Files are chunked & embedded

- [x] Text chunking (LangChain RecursiveCharacterTextSplitter)
- [x] Embedding generation (@xenova/transformers)
- [x] Upstash Vector client setup
- [x] Upsert vectors to Upstash
- [x] Update local metadata (.rag/index.json)
- [x] File hashing for incremental indexing
- [x] Integration in rag add command
- [x] Unit tests for chunker, embedding, and upstash client

**Deliverable**: `rag add ./docs` successfully indexes documents to vector DB ✅

**Completed**: 2026-05-22

---

### Phase 3: Search & Retrieval (Week 2-3) ✅ COMPLETED

**Milestone**: Query works

- [x] Query embedding generation
- [x] Vector similarity search (Upstash)
- [x] Chunk retrieval & metadata
- [x] Error handling for missing Ollama

**Deliverable**: `rag "question"` retrieves relevant chunks ✅

**Completed**: 2026-05-22

---

### Phase 4: LLM Integration (Week 3)

**Milestone**: AI answers work

- [ ] Ollama API client
- [ ] RAG prompt construction
- [ ] LLM response generation
- [ ] Streaming output

**Deliverable**: `rag "question"` returns AI-generated answer

---

### Phase 5: Status Command & Polish (Week 3-4) ✅ COMPLETED

**Milestone**: MVP complete

- [x] Status command implementation
- [x] CLI output formatting (chalk, table3, ora)
- [x] Error messages & graceful fallbacks
- [x] Unit tests (79% coverage)
- [x] Integration tests
- [x] Documentation complete
- [x] ESLint & Prettier passes

**Deliverable**: All 3 commands working, docs complete, ready for launch

**Completed**: 2026-05-22

---

### Phase 6: Testing & Deployment (Week 4)

**Milestone**: Ready for production

- [ ] End-to-end testing
- [ ] Performance testing (1000+ documents)
- [ ] Security audit
- [ ] GitHub Actions CI/CD
- [ ] NPM package publish
- [ ] GitHub Release

**Deliverable**: Published on npm, GitHub release with notes

---

## 17. Launch Checklist

### Development Complete
- [ ] All MVP features implemented
- [ ] Code compiles without errors
- [ ] TypeScript strict mode passing
- [ ] ESLint & Prettier clean
- [ ] Unit tests > 80% coverage
- [ ] All tests passing
- [ ] No console warnings

### QA & Testing
- [ ] Manual testing of all 3 commands
- [ ] Test with 100+ documents
- [ ] Test with mixed file types (md, txt, pdf)
- [ ] Error scenarios tested (missing files, no Ollama, bad API keys)
- [ ] Performance acceptable (indexing < 1 min for 100 docs)
- [ ] LLM response time reasonable (< 10 sec)

### Documentation
- [ ] README complete with setup & examples
- [ ] Architecture documentation written
- [ ] API reference / command guide written
- [ ] Contributing guide written
- [ ] CHANGELOG updated
- [ ] Code comments present for complex logic
- [ ] JSDoc comments on exported functions

### Deployment & Release
- [ ] Dependency versions locked (package-lock.json)
- [ ] .env.example created with all required vars
- [ ] .gitignore properly configured
- [ ] GitHub repo configured (main branch protection)
- [ ] GitHub Actions workflow created & tested
- [ ] NPM account ready for publish
- [ ] Version bumped in package.json (v0.1.0)
- [ ] Git tag created for release
- [ ] GitHub Release published with notes

### User-Facing
- [ ] Ollama setup guide in README
- [ ] Example usage in README
- [ ] Common issues FAQ
- [ ] Troubleshooting guide

---

## 18. Future Improvements (Not MVP)

### Search Enhancements
- [ ] Hybrid search (BM25 + vector)
- [ ] Reranking with cross-encoder
- [ ] Filter by file/date
- [ ] Keyword search fallback if embedding fails

### File Support
- [ ] .docx via docx package
- [ ] .html parsing
- [ ] Code files (.py, .js, .ts) with syntax awareness
- [ ] Confluence/Wiki imports

### Performance
- [ ] Parallel embedding processing
- [ ] Batch Upstash upserts
- [ ] Local embedding caching
- [ ] Watch mode for auto-indexing

### UX Enhancements
- [ ] Interactive mode (REPL-like)
- [ ] Search history & saved queries
- [ ] Configuration file (.ragrc)
- [ ] Export results to markdown
- [ ] Source highlighting in output
- [ ] TUI interface (probably not worth it)

### Advanced Features
- [ ] Multi-language support
- [ ] Custom prompt templates
- [ ] Fine-tuned embedding models
- [ ] Graph-based document relationships
- [ ] API mode (REST server)

---

## 19. Known Constraints & Decisions

### 1. **Local-First Philosophy**
- Embeddings are generated locally using @xenova/transformers with all-MiniLM-L6-v2 (384 dimensions)
- No API dependency for embeddings - fully local and free
- Future: Can switch to OpenAI embeddings (text-embedding-3-small) for higher quality if needed
- **Rationale**: True local-first, no API costs, sufficient quality for documentation

### 2. **Vector DB Choice: Upstash**
- MVP uses Upstash Vector (remote, requires internet)
- This breaks "local-first" slightly, but Upstash has generous free tier
- Could be replaced with self-hosted Qdrant/Milvus later
- **Rationale**: Zero infrastructure setup for MVP, easy to swap later

### 3. **Basic Search (No Hybrid)**
- MVP uses vector similarity only (no BM25 keyword search)
- Hybrid search adds complexity & dependencies (full-text search DB)
- Can be added in v0.2.0 if semantic search isn't good enough
- **Rationale**: Simpler, faster MVP, works well for documentation

### 4. **Streaming vs Non-Streaming LLM Response**
- Implemented as streaming for better UX
- Non-streaming fallback if Ollama doesn't support it
- **Rationale**: Better perceived performance, feel responsive

### 5. **No Multi-User / Cloud Sync**
- MVP is solo-user only
- No synchronization across machines
- `.rag/` folder is local to machine
- **Rationale**: Simpler architecture, can add later if needed

### 6. **PDF Parsing: pdf-parse**
- Pure JavaScript parser (no native dependencies)
- Works but not perfect for complex PDFs
- Future: Could upgrade to pdfjs-dist or pdf2json
- **Rationale**: Easy to install, no system dependencies

### 7. **No Web UI in MVP**
- Only CLI interface
- Future versions might add web UI
- **Rationale**: CLI is powerful enough, keep MVP scope tight

---

## 20. Glossary & Terminology

| Term | Definition |
|------|-----------|
| **RAG** | Retrieval-Augmented Generation - combining vector search with LLM |
| **Vector** | Numerical representation of text (embedding) |
| **Chunk** | Semantic unit of text (e.g., 1000 characters) |
| **Embedding** | Vector representation of text, generated by ML model |
| **Semantic Search** | Finding similar text based on meaning, not keywords |
| **Vector DB** | Database optimized for storing & searching vectors |
| **LLM** | Large Language Model (e.g., Ollama qwen2.5) |
| **Ollama** | Local LLM runtime & model manager |
| **Upstash** | Serverless vector database |
| **Metadata** | Information about a document (path, file, chunk index) |
| **Hash** | SHA256 fingerprint of file content |
| **Incremental Indexing** | Only re-index changed files, skip unchanged ones |

---

## 21. Update & Maintenance Notes

**Last Updated**: 2026-05-22

**Future Updates**:
- [ ] Update after Phase 1 completion
- [ ] Update after Phase 2 (embeddings working)
- [ ] Update after Phase 3 (search working)
- [ ] Update after Phase 4 (LLM working)
- [ ] Final update after MVP launch

**Maintainers**: @user

---

## 22. Questions for Clarification

*(Add as they arise during development)*

- Q: Should we support Windows paths differently?
- Q: What happens if Upstash is down?
- Q: Should we cache embeddings locally?
- Q: Should we support streaming chunks in LLM prompt?
```
