import Graph from "graphology"
import { TFile, type App, type CachedMetadata } from "obsidian"

export default class NotesGraph {
  graph: Graph
  app: App

  constructor(app: App) {
    this.app = app
    this.graph = new Graph({ multi: false })
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

  // This is a helper function only meant to be used once to populate everything
  populateGraph() {
    // Add all Markdown files as nodes
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files)
      this.addNote(file);

    // Get all the resolved links
    const resolvedLinks = this.app.metadataCache.resolvedLinks;

    // Go through all of the target paths from the source and add their links
    for (const [sourcePath, targets] of Object.entries(resolvedLinks)) {
      const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);

      if (sourceFile instanceof TFile) {
        for (const targetPath of Object.keys(targets)) {
          // Resolve target file
          const targetFile = this.app.vault.getAbstractFileByPath(targetPath);

          if (targetFile instanceof TFile) {
            this.connectNotes(sourceFile, targetFile);
          }
        }
      }
    }
  }
}