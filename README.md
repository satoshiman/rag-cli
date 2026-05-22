# RAG CLI

Local-first Retrieval-Augmented Generation CLI for personal documentation.

## Overview

RAG CLI allows you to index your markdown, text, and PDF files and perform semantic search using vector embeddings. All embeddings are generated locally using @xenova/transformers - no API keys required.

## Demo

Watch a quick demo of RAG CLI in action:

![Demo Video](https://github.com/satoshiman/rag-cli/raw/refs/heads/main/demo.mp4)

## Features

- ✅ Index markdown, text, and PDF files
- ✅ Local embedding generation (all-MiniLM-L6-v2, 384 dimensions)
- ✅ Vector storage with Upstash Vector DB
- ✅ Incremental indexing (only re-index changed files)
- ✅ File hashing for change detection
- ✅ Semantic search with vector similarity
- ✅ AI-powered answers with local Ollama LLM
- ✅ Streaming output support
- ✅ Clear all index data

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- Ollama (for AI-powered answers)

### Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd rag-cli
```

2. Install dependencies:

```bash
npm install
```

3. Initialize RAG CLI configuration:

```bash
npm run dev -- init
```

This will create `~/.rag/.env` with your configuration. Edit it with your Upstash credentials:

```env
UPSTASH_VECTOR_REST_URL=https://your-upstash-url.upstash.io
UPSTASH_VECTOR_REST_TOKEN=your-upstash-token
```

4. Install and configure Ollama (for AI-powered answers):

```bash
# Install Ollama (macOS)
brew install ollama

# Install Ollama (Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Pull the default model
ollama pull qwen2.5:3b

# Start Ollama server
ollama serve
```

### Upstash Setup

1. Go to [Upstash Console](https://console.upstash.com)
2. Create a new Vector index with:
   - **Dimensions**: 384
   - **Metric**: DOT_PRODUCT or COSINE
   - **Embedding Model**: any 384-dim model (e.g., BAAI/bge-small-en-v1.5)
3. Copy the REST URL and token to your `.env` file

## Usage

### Development Mode

During development, use `npm run dev` instead of the installed `rag` command:

```bash
npm run dev -- <command>
```

### Commands

#### Initialize Configuration

Set up RAG CLI configuration in your home directory:

```bash
npm run dev -- init
```

This command will:

- Create `~/.rag/` directory for global data storage
- Copy `.env` from current directory or use `.env.example` as template
- Create `~/.rag/.env` with your configuration
- Provide next steps for setup

After running `init`, edit `~/.rag/.env` to add your Upstash credentials.

#### Add Documents

Index files or directories:

```bash
# Index a single file (use README.md for testing to learn about RAG CLI)
npm run dev -- add README.md

# Index a directory
npm run dev -- add ./docs

# Index multiple paths
npm run dev -- add ./docs ./notes/auth.md
```

The command will:

- Scan for supported files (.md, .txt, .pdf)
- Parse file content
- Chunk text into 1000-character segments with 150-character overlap
- Generate embeddings locally using all-MiniLM-L6-v2
- Store vectors in Upstash Vector DB
- Track file hashes for incremental indexing

#### Check Status

View indexing statistics:

```bash
npm run dev -- status
```

Output:

```
RAG Status
==========
Files Indexed:      5
Chunks Stored:      42
Embedding Model:    all-MiniLM-L6-v2
Vector DB:          Upstash Vector
LLM Model:          qwen2.5:3b
Last Indexed:       2026-05-22T05:59:28.808Z
Total Size:         12.5 KB
Document Paths:     5
```

#### Clear Index Data

Clear all index data to start fresh:

```bash
# Show warning and require confirmation
npm run dev -- clear

# Clear without confirmation
npm run dev -- clear --force
```

The command will:

- Delete `.rag/index.json` and `.rag/hashes.json`
- Remove `.rag` directory if empty
- Delete all vectors from Upstash Vector DB
- Reset all indexing statistics

#### Ask Questions

Search for relevant document chunks and get AI-powered answers:

```bash
# Ask a question (streaming by default)
npm run dev -- ask "how do I index files?"

# Ask without streaming
npm run dev -- ask "what are the features?" --no-stream

# Ask without LLM (chunk-only mode)
npm run dev -- ask "how do I index files?" --no-llm

# Customize number of chunks to retrieve
npm run dev -- ask "what are the features?" --top-k 10
```

The command will:

- Generate embedding for your query
- Perform vector similarity search in Upstash
- Retrieve the most relevant chunks
- Build a RAG prompt with context
- Generate an AI answer using local Ollama
- Display the answer with source references

## Configuration

### Environment Variables

Required:

- `UPSTASH_VECTOR_REST_URL` - Your Upstash Vector REST URL
- `UPSTASH_VECTOR_REST_TOKEN` - Your Upstash Vector REST token

Optional:

- `OLLAMA_URL` - Ollama server URL (default: http://localhost:11434)
- `EMBEDDING_MODEL` - Embedding model (default: all-MiniLM-L6-v2)
- `LLM_MODEL` - LLM model (default: qwen2.5:3b)
- `CHUNK_SIZE` - Chunk size in characters (default: 1000)
- `CHUNK_OVERLAP` - Chunk overlap in characters (default: 150)
- `SEARCH_TOP_K` - Number of search results (default: 5)
- `LOG_LEVEL` - Logging level (default: info)

### Local Storage

The CLI creates a `.rag/` directory in your home directory (`~/.rag/`) for:

- `index.json` - Index metadata (file counts, chunk counts, timestamps)
- `hashes.json` - File hash tracking for incremental indexing
- `.env` - Environment configuration (created by `rag init`)
- `cache/` - Optional embedding cache

This allows the CLI to work from any directory on your system.

## Development

### Run Tests

```bash
npm test
```

### Type Check

```bash
npm run type-check
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

### Build

```bash
npm run build
```

### Link for Global Testing

Link the package globally to use `rag` command directly:

```bash
npm link
```

After linking, initialize and use commands directly:

```bash
rag init
rag add README.md
rag status
rag ask "what are the features?"
rag clear --force
```

To unlink:

```bash
npm unlink -g rag
```

## Architecture

### Phase 1: Core Infrastructure ✅

- File scanning and parsing
- Markdown, text, and PDF support
- File hashing for change detection
- Local storage management

### Phase 2: Embedding & Vector Storage ✅

- Text chunking with LangChain
- Local embedding generation (@xenova/transformers)
- Upstash Vector DB integration
- Incremental indexing

### Phase 3: Search & Retrieval ✅

- Query embedding generation
- Vector similarity search
- Chunk retrieval with metadata

### Phase 4: LLM Integration ✅

- Ollama API client
- RAG prompt construction
- AI answer generation
- Streaming output (default behavior)
- Graceful fallback when Ollama unavailable

### Phase 5: Status Command & Polish ✅

- Enhanced status command with table formatting
- CLI UI utilities (colors, spinner, table)
- Improved error messages and graceful fallbacks
- Integration tests for all commands
- 79% test coverage
- ESLint and Prettier configured

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict mode)
- **CLI Framework**: commander.js
- **Embeddings**: @xenova/transformers (local)
- **Vector DB**: Upstash Vector
- **Text Chunking**: LangChain
- **File Parsing**: markdown-it, pdfjs-dist
- **Testing**: Jest

## Troubleshooting

### "Invalid vector dimension" Error

This error occurs when your Upstash index dimension doesn't match the embedding model dimension.

**Solution**: Ensure your Upstash index is configured with:

- **Dimensions**: 384 (for all-MiniLM-L6-v2)
- **Metric**: DOT_PRODUCT or COSINE

### "Upstash credentials not configured" Error

**Solution**: Ensure you have set `UPSTASH_VECTOR_REST_URL` and `UPSTASH_VECTOR_REST_TOKEN` in your `.env` file.

### "Ollama is not available" Warning

This warning appears when Ollama is not running or not installed.

**Solution**:

- Install Ollama: `brew install ollama` (macOS) or `curl -fsSL https://ollama.com/install.sh | sh` (Linux)
- Pull the model: `ollama pull qwen2.5:3b`
- Start the server: `ollama serve`
- Use `--no-llm` flag to skip LLM and only show chunks

### Files are skipped during indexing

This is normal behavior - the CLI uses file hashing to skip unchanged files. To force re-index:

```bash
rm ~/.rag/hashes.json
rag add ./your-files
```

## License

MIT

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.
