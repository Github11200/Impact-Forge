import { App, ItemView, WorkspaceLeaf } from 'obsidian';

import Counter from '../components/Sidebar.svelte';
import { mount, unmount } from 'svelte';

export const VIEW_TYPE_EXAMPLE = 'example-view';

export class PluginView extends ItemView {
  component: Record<string, any> | undefined;
  organizeButtonCallback;
  queryButtonCallback: (query: string) => Promise<string>;
  newNoteButtonCallback;
  printGraphNodes;
  printMemoryStores;
  inputValue: string = '';
  app: App;

  constructor(
    leaf: WorkspaceLeaf,
    organizeButtonCallback: any,
    queryButtonCallback: (query: string) => Promise<string>,
    newNoteButtonCallback: any,
    printGraphNodes: any,
    printMemoryStores: any,
    app: App,
  ) {
    super(leaf);
    this.organizeButtonCallback = organizeButtonCallback;
    this.queryButtonCallback = queryButtonCallback;
    this.newNoteButtonCallback = newNoteButtonCallback;
    this.printGraphNodes = printGraphNodes;
    this.printMemoryStores = printMemoryStores;
    this.app = app;
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
        app: this.app,
        organizeButtonCallback: this.organizeButtonCallback,
        queryButtonCallback: this.queryButtonCallback,
        newNoteButtonCallback: this.newNoteButtonCallback,
        printGraphNodes: this.printGraphNodes,
        printMemoryStores: this.printMemoryStores,
      },
    });
  }

  async onClose() {
    if (this.component) {
      unmount(this.component);
    }
  }
}
