import { Notice } from "obsidian";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Document } from "langchain";
import type { QueryResult } from "./types";

export default class VectorDB {
  vectorStore: MemoryVectorStore | undefined
  embeddings: OllamaEmbeddings | undefined

  exportToJSON(): string {
    if (!this.vectorStore) return "[]";

    // Extract raw documents along with vectors from memoryStore
    const memoryVectors = this.vectorStore.memoryVectors;

    const dataToSave = memoryVectors.map((mv) => ({
      content: mv.content,
      embedding: mv.embedding,
      metadata: mv.metadata,
      id: mv.id,
    }));

    return JSON.stringify(dataToSave);
  }

  async loadFromJSON(jsonString: string) {
    if (!jsonString || !this.vectorStore) return;

    try {
      const parsedData = JSON.parse(jsonString);

      if (Array.isArray(parsedData) && parsedData.length > 0) {
        // Map saved objects back into memoryVectors format
        this.vectorStore.memoryVectors = parsedData.map((item) => ({
          content: item.content,
          embedding: item.embedding,
          metadata: item.metadata,
          id: item.id,
        }));
      }
    } catch (e) {
      console.error("Failed to parse vector store JSON:", e);
    }
  }

  async initializeDatabase() {
    this.embeddings = new OllamaEmbeddings({
      model: "nomic-embed-text",
      baseUrl: "http://localhost:11434",
    });

    this.vectorStore = new MemoryVectorStore(this.embeddings);
  }

  async queryNotes(document: string): Promise<QueryResult> {
    const results = await this.vectorStore?.similaritySearchWithScore(document, 2)

    if (results === undefined) {
      new Notice("There were no matching documents")
      return []
    }

    let queryResult: QueryResult = results.map(([doc, score], _) => {
      return { text: doc.pageContent, score: score, metadata: doc.metadata }
    })

    return queryResult
  }

  async addDocument(content: string, name: string) {
    const document = new Document({
      pageContent: content,
      metadata: {
        name: name,
      }
    })

    await this.vectorStore?.addDocuments([document])
  }
}