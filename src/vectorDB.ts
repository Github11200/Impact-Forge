import { Notice, TFile } from "obsidian";
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

  async queryNotes(document: string, k: number = 5, SIMILARITY_SCORE_THRESHOLD: number = 0.7): Promise<QueryResult> {
    const results = await this.vectorStore?.similaritySearchWithScore(document, k)

    if (results === undefined) {
      new Notice("There were no matching documents")
      return []
    }

    let queryResult: QueryResult = []
    for (const [doc, score] of results) {

      // If the similarity score is quite low then we probably shouldn't include it
      if (score < SIMILARITY_SCORE_THRESHOLD) continue
      queryResult.push({ text: doc.pageContent, score: score, metadata: doc.metadata })
    }

    return queryResult
  }

  async deleteDocumentByPath(path: string): Promise<boolean> {
    if (!this.vectorStore) return false;

    const store = this.vectorStore as any;

    if (Array.isArray(store.memoryVectors)) {
      const initialCount = store.memoryVectors.length;

      store.memoryVectors = store.memoryVectors.filter(
        (mv: any) => mv.metadata?.path !== path
      );

      return initialCount > store.memoryVectors.length;
    }

    return false;
  }

  async addDocument(file: TFile, content: string) {
    const document = new Document({
      pageContent: content,
      metadata: {
        path: file.path,
        title: file.basename,
      },
      id: file.path
    })

    await this.vectorStore?.addDocuments([document])
  }

  async updateDocument() {
    // TODO: Handle updates when the text or title updates
  }
}