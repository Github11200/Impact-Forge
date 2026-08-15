import {
  Modal,
  Notice,
  Plugin,
  App,
  TAbstractFile,
  TFile,
} from 'obsidian';
import {
  DEFAULT_SETTINGS,
  type MyPluginSettings,
  SampleSettingTab,
} from './settings';

import { ItemView, WorkspaceLeaf } from 'obsidian';

// Import the Counter Svelte component and the `mount` and `unmount` methods.
import Counter from './components/OrganizeButton.svelte';
import { mount, unmount } from 'svelte';
import OrganizationWorkflow from './workflow';
import VectorDB from './vectorDB';
import NotesGraph from './graphDB';

// Remember to rename these classes and interfaces!

export default class NotesOrganizerPlugin extends Plugin {
  settings!: MyPluginSettings;
  vectorDB = new VectorDB()
  graphDB = new NotesGraph(this.app)
  isWorkflowRunning: boolean = false

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

    await this.saveData(data);
  }

  async loadGraphData() {
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

    this.saveVectorDatabase()
  }

  async onload() {
    await this.loadSettings();
    await this.loadVectorDatabase();
    await this.loadGraphData();

    this.app.vault.on("rename", (file, oldPath) => {
      // If the workflow is running then we don't want to change anything in the vector store
      if (!this.isWorkflowRunning)
        this.fileUpdate(file, this.vectorDB, oldPath)
    })
    this.app.vault.on("modify", (file) => {
      if (!this.isWorkflowRunning)
        this.fileUpdate(file, this.vectorDB, file.path)
    })

    // If the links in a file are changed then update the graph
    this.app.metadataCache.on("changed", (file, _, cache) => {
      this.graphDB.updateGraph(file, cache)
      this.saveGraphDatabase()
    })

    // Register the view
    this.registerView(
      VIEW_TYPE_EXAMPLE,
      (leaf) => new PluginView(leaf, this.organizeButtonCallback)
    );

    this.addRibbonIcon('dice', 'Activate view', () => {
      this.activateView();
    });

    // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
    const statusBarItemEl = this.addStatusBarItem();
    statusBarItemEl.setText('Status bar text');

    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new SampleSettingTab(this.app, this));

    // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
    this.registerInterval(
      window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000),
    );
  }

  onunload() { }

  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      (await this.loadData()) as Partial<MyPluginSettings>,
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

  organizeButtonCallback = async () => {
    this.isWorkflowRunning = true

    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice('No active file selected.');
      return;
    }

    const content = await this.app.vault.read(activeFile);

    const workflow = new OrganizationWorkflow(this.app, activeFile, content, this.vectorDB);
    const updatedFile = await workflow.run()

    if (updatedFile === undefined) {
      new Notice("Error organizing the file, aborting...")
      return
    }
    else {
      await this.vectorDB.addDocument(updatedFile, content)
      new Notice("Added document to the vector database")
      await this.saveVectorDatabase()
      new Notice("Saved the vector database")
    }

    this.isWorkflowRunning = false
  }
}

class SampleModal extends Modal {
  onOpen() {
    const { contentEl } = this;
    contentEl.setText('Woah!');
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}


export const VIEW_TYPE_EXAMPLE = 'example-view';

export class PluginView extends ItemView {
  component: Record<string, any> | undefined;
  organizeButtonCallback;

  constructor(leaf: WorkspaceLeaf, organizeButtonCallback: any) {
    super(leaf);
    this.organizeButtonCallback = organizeButtonCallback
  }

  getViewType() {
    return VIEW_TYPE_EXAMPLE;
  }

  getDisplayText() {
    return 'Plugin view';
  }

  async onOpen() {
    this.component = mount(Counter, {
      target: this.contentEl,
      props: {
        organizeButtonCallback: this.organizeButtonCallback,
      },
    });
  }

  async onClose() {
    if (this.component) {
      unmount(this.component);
    }
  }
}