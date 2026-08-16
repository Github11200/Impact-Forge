import { App, PluginSettingTab, SecretComponent, Setting, type Plugin } from 'obsidian';
import type { PluginSettings } from '../types';

interface SettingsHost {
  settings: PluginSettings;
  saveSettings: () => Promise<void>;
}

export class SettingTab extends PluginSettingTab {
  plugin: SettingsHost;

  constructor(app: App, plugin: Plugin & SettingsHost) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Gemini API key')
      .setDesc('API Key for your own external model')
      .addComponent((el) =>
        new SecretComponent(this.app, el)
          .setValue(this.plugin.settings.geminiAPIKey)
          .onChange((value) => {
            this.plugin.settings.geminiAPIKey = value;
            this.plugin.saveSettings();
          }),
      );
  }
}
