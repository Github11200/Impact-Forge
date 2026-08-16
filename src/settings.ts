import { App, PluginSettingTab, Setting } from 'obsidian';
import NotesOrganizerPlugin from './main';

export interface PluginSettings {
  geminiAPIKey: string;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  geminiAPIKey: 'default',
};

export class SettingTab extends PluginSettingTab {
  plugin: NotesOrganizerPlugin;

  constructor(app: App, plugin: NotesOrganizerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Settings #1')
      .setDesc("It's a secret")
      .addText((text) =>
        text
          .setPlaceholder('Enter your secret')
          .setValue(this.plugin.settings.geminiAPIKey)
          .onChange(async (value) => {
            this.plugin.settings.geminiAPIKey = value;
            await this.plugin.saveSettings();
          }),
      );
  }
}
