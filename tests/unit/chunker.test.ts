/**
 * Unit tests for text chunker
 */

import { chunkText } from "../../src/core/chunker.js";

describe("chunkText", () => {
  it("should split text into chunks of specified size", async () => {
    const text = "a".repeat(2500);
    const chunks = await chunkText(text, "test-doc", {
      chunkSize: 1000,
      chunkOverlap: 150,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].text.length).toBeLessThanOrEqual(1000);
    expect(chunks[0].documentId).toBe("test-doc");
    expect(chunks[0].chunkIndex).toBe(0);
  });

  it("should handle text smaller than chunk size", async () => {
    const text = "small text";
    const chunks = await chunkText(text, "test-doc", {
      chunkSize: 1000,
      chunkOverlap: 150,
    });

    expect(chunks.length).toBe(1);
    expect(chunks[0].text).toBe("small text");
  });

  it("should generate correct chunk IDs", async () => {
    const text = "a".repeat(2500);
    const chunks = await chunkText(text, "doc123", {
      chunkSize: 1000,
      chunkOverlap: 150,
    });

    expect(chunks[0].id).toBe("doc123::chunk_0");
    expect(chunks[1].id).toBe("doc123::chunk_1");
  });

  it("should increment chunk index correctly", async () => {
    const text = "a".repeat(2500);
    const chunks = await chunkText(text, "test-doc", {
      chunkSize: 1000,
      chunkOverlap: 150,
    });

    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].chunkIndex).toBe(i);
    }
  });

  it("should include start and end character positions", async () => {
    const text = "hello world";
    const chunks = await chunkText(text, "test-doc", {
      chunkSize: 1000,
      chunkOverlap: 150,
    });

    expect(chunks[0].startChar).toBeGreaterThanOrEqual(0);
    expect(chunks[0].endChar).toBeGreaterThan(chunks[0].startChar);
  });

  it("should handle empty text", async () => {
    const text = "";
    const chunks = await chunkText(text, "test-doc", {
      chunkSize: 1000,
      chunkOverlap: 150,
    });

    expect(chunks.length).toBe(0);
  });

  it("should handle different chunk sizes", async () => {
    const text = "a".repeat(500);
    const chunks = await chunkText(text, "test-doc", {
      chunkSize: 100,
      chunkOverlap: 20,
    });

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => {
      expect(chunk.text.length).toBeLessThanOrEqual(100);
    });
  });
});
