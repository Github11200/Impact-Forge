import { Notice, TFile, type App } from "obsidian";
import type VectorDB from "../vectorDB";
import type NotesGraph from "../graphDB";

export default class QueryWorkflow {
  vectorDB: VectorDB
  app: App
  graphDB: NotesGraph

  constructor(app: App, vectorDB: VectorDB, graphDB: NotesGraph) {
    this.app = app
    this.vectorDB = vectorDB
    this.graphDB = graphDB
  }

  async run(query: string) {
    // Get the 2 most relevant notes
    const relevantNotes = await this.vectorDB.queryNotes(query, 2, 0)

    new Notice("Found relevant notes")

    let neighbours: TFile[] = []
    for (const note of relevantNotes) {
      const path: string = note.metadata.path

      const noteNeighbours = this.graphDB.getNeighbours(path)
      console.log(noteNeighbours)
      neighbours.push(...noteNeighbours)
    }

    console.log("Relevant: ", relevantNotes)
    console.log("Neighbours: ", neighbours)
  }
}