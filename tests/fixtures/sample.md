# Sample Document for Testing

This is a sample markdown document used for testing the RAG CLI search functionality.

## Introduction

RAG CLI allows you to index your markdown, text, and PDF files and perform semantic search using vector embeddings.

## Features

- Index markdown, text, and PDF files
- Local embedding generation using all-MiniLM-L6-v2
- Vector storage with Upstash Vector DB
- Incremental indexing with file hashing
- Semantic search and retrieval

## Usage

To index files, use the `rag add` command:
```bash
rag add ./docs
```

To search for information, use the `rag ask` command:
```bash
rag ask "how do I index files?"
```

## Technical Details

The system uses a 384-dimensional embedding model (all-MiniLM-L6-v2) for generating vector representations of text chunks. Chunks are created with a size of 1000 characters and 150-character overlap to ensure context is preserved across chunk boundaries.
