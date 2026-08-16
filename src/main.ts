import {
  Modal,
  Notice,
  Plugin,
  TAbstractFile,
  TFile,
} from 'obsidian';
import type { CachedMetadata } from 'obsidian';

import { WorkspaceLeaf } from 'obsidian';
import OrganizationWorkflow from './workflows/organizationWorkflow';
import VectorDB from './services/vectorDB';
import NotesGraph from './services/graphDB';
import QueryWorkflow from './workflows/queryWorkflow';
import { modelManager } from './modelManager';
import type { PluginSettings } from './types';
import { SettingTab } from './ui/settingTab';
import { PluginView, VIEW_TYPE_EXAMPLE } from './ui/pluginView';

export const DEFAULT_SETTINGS: PluginSettings = {
  geminiAPIKey: 'default',
};

export default class NotesOrganizerPlugin extends Plugin {
  settings!: PluginSettings;
  vectorDB = new VectorDB()
  graphDB = new NotesGraph(this.app)
  isWorkflowRunning: boolean = false
  templatePath = "5 - Templates/Note.md"

  printGraphNodes = () => {
    this.graphDB.printNodes()
  }

  printMemoryStores = () => {
    console.log(this.vectorDB.vectorStore?.memoryVectors)
  }

  // Load the data from the JSON file into the vector database to be queried
  async loadVectorDatabase() {
    await this.vectorDB.initializeDatabase();

    const data = await this.loadData();

    if (data && data.vectorStoreData) {
      await this.vectorDB.loadFromJSON(data.vectorStoreData);
    }
  }

  // Save the data from the vector database to a JSON file so it persists
  async saveVectorDatabase() {
    const jsonString = this.vectorDB.exportToJSON();

    // 2. Fetch existing settings/data and merge vector store data into it
    const data = (await this.loadData()) || {};
    data.vectorStoreData = jsonString;

    await this.saveData(data)
  }

  async loadGraphDatabase() {
    const data = await this.loadData()

    if (data && data.graphData)
      this.graphDB.loadFromJSON(data.graphData)
  }

  async saveGraphDatabase() {
    const jsonString = this.graphDB.exportToJSON()

    const data = (await this.loadData()) || {}
    data.graphData = jsonString

    await this.saveData(data)
  }

  async fileUpdate(file: TAbstractFile, vectorDB: VectorDB, path: string) {
    if (!vectorDB.deleteDocumentByPath(path)) return;

    if (file instanceof TFile) {
      const content = await this.app.vault.read(file)
      await this.vectorDB.addDocument(file, content)
    }

    await this.saveVectorDatabase()
  }

  private registerVaultAndMetadataEvents() {
    this.registerEvent(this.app.vault.on("rename", this.onVaultRename));
    this.registerEvent(this.app.vault.on("modify", this.onVaultModify));
    this.registerEvent(this.app.metadataCache.on("changed", this.onMetadataChanged));
    this.registerEvent(this.app.vault.on("delete", this.onVaultDelete));
  }

  private registerLayoutReadyInitialization() {
    this.app.workspace.onLayoutReady(this.onLayoutReadyInitializeGraph);
  }

  private onVaultRename = async (file: TAbstractFile, oldPath: string) => {
    if (file instanceof TFile && file.extension === "md") {
      console.log(`[Rename Event] ${oldPath} -> ${file.path}`);

      await this.fileUpdate(file, this.vectorDB, oldPath);
      this.graphDB.renameNote(oldPath, file.path);
      await this.saveGraphDatabase();
    }
  }

  private onVaultModify = async (file: TAbstractFile) => {
    if (this.isWorkflowRunning) return;

    if (file instanceof TFile && file.extension === "md" && file.parent?.name !== "") {
      console.log(`[Modify Event] ${file.path}`);
      await this.fileUpdate(file, this.vectorDB, file.path);
    }
  }

  private onMetadataChanged = (file: TFile, _data: string, cache: CachedMetadata) => {
    if (this.isWorkflowRunning) return;

    console.log(`[Metadata Changed] ${file.path}`);
    this.graphDB.updateGraph(file, cache);
    this.saveGraphDatabase();
  }

  private onVaultDelete = async (file: TAbstractFile) => {
    if (file instanceof TFile && file.extension === "md") {
      console.log(`[Delete Event] ${file.path}`);
      this.graphDB.removeNote(file.path);
      this.vectorDB.deleteDocumentByPath(file.path);

      await this.saveGraphDatabase();
      await this.saveVectorDatabase();
    }
  }

  private onLayoutReadyInitializeGraph = () => {
    if (this.graphDB.graph.order === 0) {
      console.log("[Layout Ready] Initializing graph population...");
      this.graphDB.populateGraph();
      this.saveGraphDatabase();
    }
  }

  async onload() {
    await this.loadSettings();
    await this.loadVectorDatabase();
    await this.loadGraphDatabase();

    const geminiSecret = await this.app.secretStorage.getSecret("gemini");
    modelManager.updateApiKey(geminiSecret)

    // Add the setting tab
    this.addSettingTab(new SettingTab(this.app, this));

    // Register the events and get the graph loaded once the layout has been loaded
    this.registerVaultAndMetadataEvents();
    this.registerLayoutReadyInitialization();

    // UI Views and Ribbon Icons
    this.registerView(
      VIEW_TYPE_EXAMPLE,
      (leaf) => new PluginView(leaf, this.organizeButtonCallback,
        this.queryButtonCallback,
        this.newNoteButtonCallback,
        this.printGraphNodes,
        this.printMemoryStores,
        this.app)
    );

    this.addRibbonIcon('dice', 'Activate view', () => {
      this.activateView();
    });
  }

  onunload() { }

  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      (await this.loadData()) as Partial<PluginSettings>,
    );
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async activateView() {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE);

    if (leaves.length > 0) {
      // A leaf with our view already exists, use that
      // @ts-ignore
      leaf = leaves[0];
    } else {
      // Our view could not be found in the workspace, create a new leaf
      // in the right sidebar for it
      leaf = workspace.getRightLeaf(false);
      // @ts-ignore
      await leaf.setViewState({ type: VIEW_TYPE_EXAMPLE, active: true });
    }

    // "Reveal" the leaf in case it is in a collapsed sidebar
    // @ts-ignore
    workspace.revealLeaf(leaf);
  }

  getActiveFile() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice('No active file selected.');
      return;
    }

    return activeFile
  }

  newNoteButtonCallback = async () => {
    const templateFile = this.app.vault.getAbstractFileByPath(this.templatePath)

    if (!(templateFile instanceof TFile)) {
      new Notice("No template file found")
      return
    }

    // Read the content inside the template
    let templateContent = await this.app.vault.cachedRead(templateFile);

    // Add in the template variables
    templateContent = templateContent.replace('{{date}}', new Date().toLocaleDateString('en-CA'));
    templateContent = templateContent.replace('{{time}}', new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    }));

    // Add that file in the root directory
    const newFile = await this.app.vault.create("/New Note.md", templateContent);

    // Open the newly created note in the active workspace tab
    await this.app.workspace.getLeaf(false).openFile(newFile);

    new Notice("New note successfully created")
  }

  queryButtonCallback = async (query: string): Promise<string> => {
    const queryWorkflow = new QueryWorkflow(this.app, this.vectorDB, this.graphDB)

    const queryResult = await queryWorkflow.run(query)

    if (queryResult === undefined) {
      new Notice("Could not get a query result")
      return "Error: Could not complete the query"
    }

    return queryResult
  }

  organizeButtonCallback = async () => {
    this.isWorkflowRunning = true

    const activeFile = this.getActiveFile()
    if (activeFile === undefined) return;

    const content = await this.app.vault.read(activeFile);

    const organizationWorkflow = new OrganizationWorkflow(this.app, activeFile, content, this.vectorDB);
    const updatedFile = await organizationWorkflow.run()

    if (updatedFile === undefined) {
      new Notice("Error organizing the file, aborting...")
      return
    }
    else {
      await this.saveVectorDatabase()
      new Notice("Saved the vector database")
    }

    this.isWorkflowRunning = false

    this.graphDB.populateGraph()
  }
}