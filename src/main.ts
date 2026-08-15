import {
  Modal,
  Notice,
  Plugin,
  App,
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
import VectorDB from './db';

// Remember to rename these classes and interfaces!

export default class NotesOrganizerPlugin extends Plugin {
  settings!: MyPluginSettings;
  vectorDB = new VectorDB()

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

  async onload() {
    await this.loadSettings();
    await this.loadVectorDatabase();

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
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice('No active file selected.');
      return;
    }

    const content = await this.app.vault.read(activeFile);

    const workflow = new OrganizationWorkflow(this.app, activeFile, content, this.vectorDB);

    // await this.vectorDB.addDocument(activeFile, content)
    // this.saveVectorDatabase()

    // console.log("added document")
    // workflow.getTagNames(await this.vectorDB.queryNotes("Some note"))

    workflow.moveFileToFolder("rough-note")
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