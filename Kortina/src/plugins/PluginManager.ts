import { Plugin, PluginManifest, PluginModule, PluginAPI, PluginContribution, CommandRegistry, EventEmitter, PluginUpdateInfo, PluginLoadError } from './index';
import { isTauri } from '../utils/environment';
import { invoke } from '@tauri-apps/api/core';
import { getOrCreateSandbox, destroySandbox, SandboxPluginModule, SandboxAPIDescriptor } from './PluginSandbox';
import { pluginPanelRegistry, type PluginPanelComponent } from './PluginPanelRegistry';
import { marketplaceClient } from './marketplace/MarketplaceClient';
import '../components/Dialogs/Dialogs.css';
import { CommandRegistryImpl } from './core/CommandRegistry';
import { ContributionRenderer } from './core/ContributionRenderer';
import { pluginLogger } from './core/PluginLogger';
import { validateDependencies, validatePluginVersion } from './core/versionUtils';
import { createPluginModuleLoadError } from './core/moduleLoader';
import { EventEmitterImpl } from './api/EventEmitterImpl';
import { LoggerAPIImpl } from './api/LoggerAPIImpl';
import { SandboxedEditorAPI } from './api/SandboxedEditorAPI';
import { SandboxedEventEmitter } from './api/SandboxedEventEmitter';
import { SandboxedFileSystemAPI } from './api/SandboxedFileSystemAPI';
import { SandboxedLoggerAPI } from './api/SandboxedLoggerAPI';
import { SandboxedSettingsAPI } from './api/SandboxedSettingsAPI';
import { SandboxedTerminalAPI } from './api/SandboxedTerminalAPI';
import { SandboxedWindowManager } from './api/SandboxedWindowManager';
import { SettingsAPIImpl } from './api/SettingsAPIImpl';
import { PluginLifecycleManager, type LifecycleDeps } from './lifecycle/PluginLifecycleManager';
import { PluginMarketplace } from './marketplace/PluginMarketplace';
const API_BASE_URL = String(import.meta.env.VITE_MARKETPLACE_URL || '').replace(/\/+$/, '');
export { PluginModuleLoadError } from './core/PluginError';
export { PLUGIN_PERMISSIONS } from './core/PluginPermissions';
export class PluginManager {
  private static instance: PluginManager;
  private commands = new CommandRegistryImpl();
  private events = new EventEmitterImpl();
  private logger = new LoggerAPIImpl();
  private contributionRenderer = new ContributionRenderer();
  private settings = new SettingsAPIImpl();
  private lifecycle = new PluginLifecycleManager();
  private marketplace: PluginMarketplace;
  private pluginDir: string = '';
  private editorInstance: any = null;
  private apiBaseUrl = API_BASE_URL;
  private lifecycleDeps: LifecycleDeps;
  private constructor() {
    this.lifecycleDeps = {
      executeModuleSource: (source, pluginId) => this.executeModuleSource(source, pluginId),
      createSandboxedAPI: (pluginId, permissions) => this.createSandboxedAPI(pluginId, permissions),
      emit: (event, ...args) => this.events.emit(event, ...args),
      addContributions: contributions => this.contributionRenderer.addContributions(contributions),
      removeContributions: contributions => this.contributionRenderer.removeContributions(contributions)
    };
    this.marketplace = new PluginMarketplace({
      lifecycle: this.lifecycle,
      lifecycleDeps: this.lifecycleDeps,
      getApiBaseUrl: () => this.apiBaseUrl
    });
  }
  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }
  async initialize(pluginDir?: string): Promise<void> {
    this.pluginDir = pluginDir || 'plugins';
    pluginLogger.log(`Initializing with plugin directory: ${this.pluginDir}`);
    await this.lifecycle.loadPluginStates();
    if (isTauri()) {
      try {
        const dir = await invoke<string>('get_plugins_dir');
        await this.lifecycle.loadPluginsFromDirectory(dir, this.lifecycleDeps);
      } catch (error) {
        pluginLogger.warn('Failed to load from Tauri plugin dir:', error);
      }
    }
    await this.marketplace.testApiConnectivity();
    try {
      const {
        initializeGrammarRegistry
      } = await import('./GrammarRegistry');
      initializeGrammarRegistry();
    } catch (error) {
      pluginLogger.warn('Failed to initialize grammar registry:', error);
    }
    await this.lifecycle.restorePluginActivationStates(this.lifecycleDeps);
  }
  setEditor(editor: any): void {
    this.editorInstance = editor;
  }
  async registerPlugin(manifest: PluginManifest, module: PluginModule | SandboxPluginModule, options?: {
    loadError?: PluginLoadError;
    isBuiltIn?: boolean;
  }): Promise<void> {
    return this.lifecycle.registerPlugin(manifest, module, options ?? {}, this.lifecycleDeps);
  }
  async unregisterPlugin(pluginId: string): Promise<void> {
    return this.lifecycle.unregisterPlugin(pluginId, this.lifecycleDeps);
  }
  async activatePlugin(pluginId: string): Promise<void> {
    return this.lifecycle.activatePlugin(pluginId, this.lifecycleDeps);
  }
  async deactivatePlugin(pluginId: string): Promise<void> {
    return this.lifecycle.deactivatePlugin(pluginId, this.lifecycleDeps);
  }
  async setPluginEnabled(pluginId: string, enabled: boolean): Promise<void> {
    return this.lifecycle.setPluginEnabled(pluginId, enabled, this.lifecycleDeps);
  }
  async reloadAllPlugins(): Promise<void> {
    return this.lifecycle.reloadAllPlugins(this.lifecycleDeps);
  }
  async reloadPluginsFromDirectory(): Promise<void> {
    if (isTauri()) {
      try {
        const dir = await invoke<string>('get_plugins_dir');
        await this.lifecycle.loadPluginsFromDirectory(dir, this.lifecycleDeps);
      } catch (error) {
        pluginLogger.warn('Failed to reload plugins from directory:', error);
      }
    }
  }
  async shutdown(): Promise<void> {
    await this.lifecycle.shutdown(this.lifecycleDeps);
    this.commands = new CommandRegistryImpl();
    this.events = new EventEmitterImpl();
    this.contributionRenderer = new ContributionRenderer();
    this.lifecycle = new PluginLifecycleManager();
    this.marketplace = new PluginMarketplace({
      lifecycle: this.lifecycle,
      lifecycleDeps: this.lifecycleDeps,
      getApiBaseUrl: () => this.apiBaseUrl
    });
    this.editorInstance = null;
  }
  getPlugin(pluginId: string): Plugin | undefined {
    return this.lifecycle.getPlugin(pluginId);
  }
  getAllPlugins(): Plugin[] {
    return this.lifecycle.getAllPlugins();
  }
  getActivePlugins(): Plugin[] {
    return this.lifecycle.getActivePlugins();
  }
  getContributions(): PluginContribution[] {
    return [{
      menus: this.contributionRenderer.getMenuContributions(),
      panels: this.contributionRenderer.getPanelContributions(),
      themes: this.contributionRenderer.getThemeContributions(),
      grammars: this.contributionRenderer.getGrammarContributions()
    }];
  }
  getCommands(): CommandRegistry {
    return this.commands;
  }
  getEvents(): EventEmitter {
    return this.events;
  }
  getContributionRenderer(): ContributionRenderer {
    return this.contributionRenderer;
  }
  getPluginPermissions(pluginId: string): Set<string> {
    return this.lifecycle.getPluginPermissions(pluginId);
  }
  async grantPermission(pluginId: string, permission: string): Promise<void> {
    return this.lifecycle.grantPermission(pluginId, permission);
  }
  async revokePermission(pluginId: string, permission: string): Promise<void> {
    return this.lifecycle.revokePermission(pluginId, permission);
  }
  getDefaultPermissions(manifest: PluginManifest): string[] {
    return this.lifecycle.getDefaultPermissions(manifest);
  }
  isPluginEnabled(pluginId: string): boolean {
    return this.lifecycle.isPluginEnabled(pluginId);
  }
  validatePluginVersion(manifest: PluginManifest): {
    valid: boolean;
    error?: string;
  } {
    return validatePluginVersion(manifest);
  }
  validateDependencies(manifest: PluginManifest): {
    valid: boolean;
    missing: Record<string, string>;
    incompatible: Record<string, string>;
  } {
    return validateDependencies(manifest, new Map(this.lifecycle.getAllPlugins().map(p => [p.manifest.id, p])));
  }
  async loadPluginsFromDirectory(dir: string): Promise<void> {
    return this.lifecycle.loadPluginsFromDirectory(dir, this.lifecycleDeps);
  }
  async checkForUpdates(pluginId: string): Promise<PluginUpdateInfo | null> {
    return this.marketplace.checkForUpdates(pluginId);
  }
  async checkAllUpdates(): Promise<PluginUpdateInfo[]> {
    return this.marketplace.checkAllUpdates();
  }
  async updatePlugin(pluginId: string, downloadUrl: string, newVersion: string): Promise<boolean> {
    return this.marketplace.updatePlugin(pluginId, downloadUrl, newVersion);
  }
  async installFromMarketplace(pluginId: string, version?: string): Promise<boolean> {
    return this.marketplace.installFromMarketplace(pluginId, version);
  }
  getApiBaseUrl(): string {
    return this.apiBaseUrl;
  }
  getMarketplaceClient() {
    return marketplaceClient;
  }
  registerPanelView(id: string, component: PluginPanelComponent, pluginId?: string): {
    dispose: () => void;
  } {
    pluginPanelRegistry.register(id, component, pluginId);
    this.events.emit('plugin-panel-view-registered', {
      id,
      pluginId
    });
    return {
      dispose: () => {
        pluginPanelRegistry.unregister(id);
        this.events.emit('plugin-panel-view-unregistered', {
          id,
          pluginId
        });
      }
    };
  }
  unregisterPanelView(id: string): void {
    pluginPanelRegistry.unregister(id);
    this.events.emit('plugin-panel-view-unregistered', {
      id
    });
  }
  getPanelView(id: string) {
    return pluginPanelRegistry.get(id);
  }
  getPanelOwner(panelId: string): string | undefined {
    return this.lifecycle.getPanelOwner(panelId);
  }
  private createSandboxedAPI(pluginId: string, permissions: Set<string>): PluginAPI {
    const editorApi = new SandboxedEditorAPI(pluginId, permissions);
    if (this.editorInstance) {
      editorApi.setEditor(this.editorInstance);
    }
    return {
      commands: this.commands,
      windows: new SandboxedWindowManager(pluginId, permissions),
      terminals: new SandboxedTerminalAPI(pluginId, permissions),
      editor: editorApi,
      fs: new SandboxedFileSystemAPI(pluginId, permissions),
      settings: new SandboxedSettingsAPI(pluginId, permissions, this.settings),
      events: new SandboxedEventEmitter(pluginId, permissions, this.events),
      logger: new SandboxedLoggerAPI(pluginId, permissions, this.logger)
    };
  }
  private buildAPIDescriptor(): SandboxAPIDescriptor {
    const namespaces = ['commands', 'windows', 'terminals', 'editor', 'fs', 'settings', 'events', 'logger'];
    const methods: string[] = [];
    const methodMap: Record<string, string[]> = {
      commands: ['registerCommand', 'executeCommand', 'getCommands'],
      windows: ['openUrl', 'showNotification', 'showDialog', 'getCurrentWindowId'],
      terminals: ['createTerminal', 'getActiveTerminal', 'executeCommand', 'write'],
      editor: ['openFile', 'getActiveEditor', 'getSelection', 'insertText', 'replaceText', 'getCurrentContent', 'showSuggestion', 'formatDocument'],
      fs: ['readFile', 'writeFile', 'exists', 'mkdir', 'rmdir', 'readDir', 'unlink', 'rename', 'stat'],
      settings: ['get', 'set', 'remove', 'onDidChange'],
      events: ['on', 'off', 'emit', 'once'],
      logger: ['info', 'warn', 'error', 'debug']
    };
    namespaces.forEach(ns => {
      (methodMap[ns] || []).forEach(method => methods.push(`${ns}.${method}`));
    });
    return {
      namespaces,
      methods
    };
  }
  private async handleSandboxAPIRequest(pluginId: string, methodPath: string, args: any[]): Promise<any> {
    const plugin = this.lifecycle.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    const permissions = this.lifecycle.getPluginPermissions(pluginId);
    const api = plugin.context?.api ?? this.createSandboxedAPI(pluginId, permissions);
    const parts = methodPath.split('.');
    if (parts.length < 2) {
      throw new Error(`Invalid API method path: ${methodPath}`);
    }
    const methodName = parts.pop()!;
    const namespace = parts.join('.');
    const apiNamespace = (api as Record<string, any>)[namespace];
    if (!apiNamespace || typeof apiNamespace[methodName] !== 'function') {
      throw new Error(`Unknown API method: ${methodPath}`);
    }
    const result = await apiNamespace[methodName].apply(apiNamespace, args);
    if (result && typeof result.dispose === 'function') {
      const handleId = `disposable-${pluginId}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      plugin.subscriptions.push({
        dispose: () => {
          try {
            result.dispose();
          } catch (error) {
            pluginLogger.warn(`Error disposing ${methodPath} for ${pluginId}:`, error);
          }
        }
      });
      return {
        __type: 'Disposable',
        handleId
      };
    }
    return result;
  }
  private async executeModuleSource(source: string, pluginId: string): Promise<SandboxPluginModule> {
    try {
      const sandbox = getOrCreateSandbox(pluginId);
      sandbox.setAPIDescriptor(this.buildAPIDescriptor());
      sandbox.setAPIRequestHandler(this.handleSandboxAPIRequest.bind(this));
      return await sandbox.execute(source);
    } catch (error) {
      pluginLogger.error(`Failed to execute module for ${pluginId}:`, error);
      destroySandbox(pluginId);
      const message = error instanceof Error ? error.message : String(error);
      throw createPluginModuleLoadError({
        code: 'EXECUTE_FAILED',
        pluginId,
        message: `Sandbox execution failed: ${message}`,
        triedPaths: [],
        cause: error
      });
    }
  }
}
export const pluginManager = PluginManager.getInstance();