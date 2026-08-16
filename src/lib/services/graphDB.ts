import Graph from "graphology"
import { Notice, TFile, type App, type CachedMetadata } from "obsidian"

export default class NotesGraph {
  graph: Graph
  app: App

  TAGS_FOLDER_NAME = '4 - Tags'
  TEMPLATES_FOLDER_NAME = '5 - Templates'

  constructor(app: App) {
    this.app = app
    this.graph = new Graph({ multi: false })
  }

  printNodes() {
    this.graph.forEachNode((node, attributes) => {
      // Get all outgoing links/neighbors for this node
      const children = this.graph.outNeighbors(node);

      console.log(`📄 ${node} (${attributes.name ?? "Unnamed"})`);

      if (children.length === 0) {
        console.log(`   └── (no outgoing links)`);
      } else {
        children.forEach((child, index) => {
          const isLast = index === children.length - 1;
          const prefix = isLast ? "   └── " : "   ├── ";
          console.log(`${prefix}${child}`);
        });
      }
      console.log(""); // Blank line separator
    });
  }
  addNote(file: TFile) {
    if (!this.graph.hasNode(file.path))
      this.graph.addNode(file.path, {
        path: file.path,
        name: file.basename
      })
  }

  connectNotes(file1Path: string, file2Path: string) {
    if (!this.graph.hasNode(file1Path) || !this.graph.hasNode(file2Path)) {
      new Notice("Could not connect nodes, one does not exist")
      console.log(`Could not connect nodes: ${file1Path} and ${file2Path}`)
      return;
    }

    if (!this.graph.hasEdge(file1Path, file2Path))
      this.graph.addEdge(file1Path, file2Path)
  }

  removeNote(filePath: string) {
    this.graph.dropNode(filePath)
  }

  getNeighbours(path: string): TFile[] {
    const neighborKeys = this.graph.neighbors(path)
    const paths = neighborKeys
      .map(key => this.graph.getNodeAttribute(key, 'path'))
      .filter((path: string) => !path.contains(this.TAGS_FOLDER_NAME));
    const files = paths.map(path => this.app.vault.getAbstractFileByPath(path) as TFile)

    return files
  }

  loadFromJSON(jsonString: string) {
    const data = JSON.parse(jsonString)
    this.graph.import(data)
  }

  exportToJSON() {
    return JSON.stringify(this.graph.export())
  }

  updateGraph(file: TFile, cache: CachedMetadata) {
    // Exclude ignored folders
    if (file.parent?.name === this.TAGS_FOLDER_NAME || file.parent?.name === this.TEMPLATES_FOLDER_NAME) return;

    // Remove the node so all the edges are dropped
    if (this.graph.hasNode(file.path))
      this.removeNote(file.path)
    this.addNote(this.app.vault.getAbstractFileByPath(file.path) as TFile)

    if (!cache?.links) return;

    // Resolve and reconnect current outgoing links
    for (const linkRef of cache.links) {
      const targetFile = this.app.metadataCache.getFirstLinkpathDest(
        linkRef.link,
        file.path
      );

      if (targetFile) {
        // Ensure the target node exists before making an edge
        if (!this.graph.hasNode(targetFile.path))
          this.addNote(targetFile);
        console.log(`Connecting ${file.path} and ${targetFile.path}`)
        this.connectNotes(file.path, targetFile.path);
      }
    }
  }

  renameNote(oldPath: string, newPath: string) {
    // If the old path isn't tracked, try adding the file at its new path
    if (!this.graph.hasNode(oldPath)) {
      const targetFile = this.app.vault.getAbstractFileByPath(newPath);
      if (targetFile instanceof TFile)
        this.addNote(targetFile);
      return;
    }

    // Collect attributes and connections before dropping the old node
    const attributes = this.graph.getNodeAttributes(oldPath);
    const inNeighbors = this.graph.inNeighbors(oldPath);
    const outNeighbors = this.graph.outNeighbors(oldPath);

    // Extract updated file name without extension
    const newBasename = newPath.split('/').pop()?.replace(/\.md$/, '') ?? newPath;

    // Remove old node (automatically drops attached edges)
    this.graph.dropNode(oldPath);

    // Re-add node under the new path
    this.graph.addNode(newPath, {
      ...attributes,
      path: newPath,
      name: newBasename
    });

    // Restore incoming edges
    for (const source of inNeighbors) {
      if (this.graph.hasNode(source) && !this.graph.hasEdge(source, newPath)) {
        this.graph.addEdge(source, newPath);
      }
    }

    // Restore outgoing edges
    for (const target of outNeighbors) {
      if (this.graph.hasNode(target) && !this.graph.hasEdge(newPath, target)) {
        this.graph.addEdge(newPath, target);
      }
    }
  }

  populateGraph() {
    this.graph.clear()
    this.printNodes()

    // Add all Markdown files as nodes
    const files = this.app.vault.getMarkdownFiles();
    for (const file of files)
      if (file.parent && file.parent.name !== "" && file.parent.name !== "5 - Templates")
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
            this.connectNotes(sourceFile.path, targetFile.path);
          }
        }
      }
    }
  }
}