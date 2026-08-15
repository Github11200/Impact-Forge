import { Notice } from "obsidian";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Document } from "langchain";

type QueryResult = { score: number, text: string }[]

export default class VectraClass {
  vectorStore: MemoryVectorStore | undefined
  embeddings: OllamaEmbeddings | undefined

  async initializeDatabase() {
    this.embeddings = new OllamaEmbeddings({
      model: "nomic-embed-text", // Default value
      baseUrl: "http://localhost:11434", // Default value
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
      return { text: doc.pageContent, score: score }
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