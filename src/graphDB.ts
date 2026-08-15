import Graph from "graphology"
import { TFile, type App, type CachedMetadata } from "obsidian"

export default class NotesGraph {
  graph: Graph
  app: App

  constructor(app: App) {
    this.app = app
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

  updateGraph(file: TFile, cache: CachedMetadata) {
    if (!cache.links) return;

    // Resolve raw string links to target TFiles
    const resolvedLinks: string[] = [];

    // Get all the outgoing links from the current file
    for (const linkRef of cache.links) {
      // Resolves "[[My Note]]" to its target TFile using the current file's path
      const targetFile = this.app.metadataCache.getFirstLinkpathDest(
        linkRef.link,
        file.path
      );

      if (targetFile)
        resolvedLinks.push(targetFile.path);
    }

    // If the current node doesn't exist then add it
    if (!this.graph.hasNode(file))
      this.addNote(file)

    for (const link of resolvedLinks) {
      const secondFile = this.app.vault.getAbstractFileByPath(link)
      if (secondFile !== null && secondFile instanceof TFile)
        this.connectNotes(file, secondFile)
    }
  }
}