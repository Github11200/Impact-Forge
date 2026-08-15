import Graph from "graphology"
import type { TFile } from "obsidian"

export default class NotesGraph {
  graph: Graph

  constructor() {
    this.graph = new Graph()
  }

  addNote(file: TFile) {
    this.graph.addNode(file)
  }

  connectNotes(file1: TFile, file2: TFile) {
    this.graph.addEdge(file1, file2)
  }

  removeNote(file: TFile) {
    this.graph.dropNode(file)
  }

  loadFromJSON(jsonString: string) {
    const data = JSON.parse(jsonString)
    this.graph.import(data)
  }

  exportToJSON() {
    return JSON.stringify(this.graph.export())
  }
}