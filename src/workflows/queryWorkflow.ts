import { Notice, TFile, type App } from "obsidian";
import type VectorDB from "../vectorDB";
import type NotesGraph from "../graphDB";
import type { QueryResult } from "../types";
import { queryAgent } from "../agents/queryAgent";

export default class QueryWorkflow {
  vectorDB: VectorDB
  app: App
  graphDB: NotesGraph

  constructor(app: App, vectorDB: VectorDB, graphDB: NotesGraph) {
    this.app = app
    this.vectorDB = vectorDB
    this.graphDB = graphDB
  }

  findNeighbours(relevantNotes: QueryResult) {
    const neighboursMap = new Map<string, TFile>();

    for (const note of relevantNotes) {
      const path: string = note.metadata.path

      // Add the current file into the map
      const primaryFile = this.app.vault.getAbstractFileByPath(path);
      if (primaryFile instanceof TFile)
        neighboursMap.set(primaryFile.path, primaryFile);

      const noteNeighbours = this.graphDB.getNeighbours(path)

      // Add in all of the neighborus
      for (const neighbourFile of noteNeighbours) {
        if (neighbourFile instanceof TFile) {
          neighboursMap.set(neighbourFile.path, neighbourFile);
        }
      }
    }

    console.log("Relevant: ", relevantNotes)
    console.log("Neighbours: ", neighboursMap)

    return neighboursMap
  }

  async createPrompt(notes: Map<string, TFile>, query: string): Promise<string> {
    // 3. Read Content and Build Context Block
    let contextText = "";
    for (const file of notes.values()) {
      const content = await this.app.vault.read(file);
      contextText += `\n--- START NOTE: ${file.path} ---\n${content}\n--- END NOTE ---\n`;
    }

    // 4. Construct System and User Prompts
    const systemPrompt = `You are an AI assistant analyzing a personal knowledge base. 
Answer the user's query based strictly on the provided context below.
If the context does not contain enough information to answer, state clearly that you do not know.`;

    const userPrompt = `Context:\n${contextText}\n\nUser Question: ${query}`;

    return userPrompt
  }

  async run(query: string) {
    // Get the 2 most relevant notes
    const relevantNotes = await this.vectorDB.queryNotes(query, 1, 0)

    if (relevantNotes.length === 0) {
      new Notice("No relevant notes found")
      return
    } else
      new Notice("Found relevant notes")

    const notes = this.findNeighbours(relevantNotes)

    const prompt = await this.createPrompt(notes, query)

    // 5. Send to LLM
    const tagsAgentResult = await queryAgent.invoke({
      messages: [
        {
          role: "human",
          content: prompt
        }
      ]
    });

    let answer = tagsAgentResult.structuredResponse.answer
    const references = tagsAgentResult.structuredResponse.references

    answer += "\n\n" + "References:\n" + references.map(reference => `- ${reference}\n`)

    return answer;
  }
}