import { isTauri } from '../../utils/environment';
import { invoke } from '@tauri-apps/api/core';
import type { SandboxPluginModule } from '../PluginSandbox';
import type { Disposable, Plugin, PluginContribution, PluginLoadError, PluginManifest, PluginModule } from '../index';
import { pluginPanelRegistry } from '../PluginPanelRegistry';
import { pluginLogger } from '../core/PluginLogger';
import { createFailedModuleStub, loadPluginModule, toPluginLoadError } from '../core/moduleLoader';
import { validateDependencies, validatePluginVersion } from '../core/versionUtils';
export interface LifecycleDeps {
  executeModuleSource(source: string, pluginId: string): Promise<SandboxPluginModule>;
  createSandboxedAPI(pluginId: string, permissions: Set<string>): any;
  emit(event: string, ...args: any[]): void;
  addContributions(contributions: PluginContribution): void;
  removeContributions(contributions: PluginContribution): void;
}
export class PluginLifecycleManager {
  private plugins = new Map<string, Plugin>();
  private pluginPermissions = new Map<string, Set<string>>();
  private pluginEnabled = new Map<string, boolean>();
  private panelOwners = new Map<string, string>();
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
  getActivePlugins(): Plugin[] {
    return this.getAllPlugins().filter(p => p.isActive);
  }
  getPluginPermissions(pluginId: string): Set<string> {
    return this.pluginPermissions.get(pluginId) || new Set();
  }
  getPanelOwner(panelId: string): string | undefined {
    return this.panelOwners.get(panelId);
  }
  isPluginEnabled(pluginId: string): boolean {
    if (this.pluginEnabled.has(pluginId)) {
      return this.pluginEnabled.get(pluginId)!;
    }
    return this.plugins.get(pluginId)?.isActive ?? false;
  }
  async registerPlugin(manifest: PluginManifest, module: PluginModule | SandboxPluginModule, options: {
    loadError?: PluginLoadError;
    isBuiltIn?: boolean;
  }, _deps: LifecycleDeps): Promise<void> {
    if (this.plugins.has(manifest.id)) {
      pluginLogger.warn(`Plugin "${manifest.id}" already registered`);
      return;
    }
    const versionCheck = validatePluginVersion(manifest);
    if (!versionCheck.valid) {
      pluginLogger.error(`Cannot register plugin ${manifest.id}: ${versionCheck.error}`);
      return;
    }
    const depCheck = validateDependencies(manifest, this.plugins);
    if (!depCheck.valid) {
      pluginLogger.error(`Cannot register plugin ${manifest.id}: missing=${JSON.stringify(depCheck.missing)}, incompatible=${JSON.stringify(depCheck.incompatible)}`);
      return;
    }
    const isSandboxed = 'callExport' in module;
    const loadError = options?.loadError;
    const plugin: Plugin = {
      manifest,
      module,
      isActive: false,
      subscriptions: [],
      isSandboxed,
      isBuiltIn: options?.isBuiltIn ?? !manifest.installPath,
      loadError
    };
    this.plugins.set(manifest.id, plugin);
    if (!this.pluginPermissions.has(manifest.id)) {
      this.pluginPermissions.set(manifest.id, new Set(this.getDefaultPermissions(manifest)));
    }
    if (!this.pluginEnabled.has(manifest.id)) {
      this.pluginEnabled.set(manifest.id, loadError ? false : manifest.isEnabled !== false);
    } else if (loadError) {
      this.pluginEnabled.set(manifest.id, false);
    }
    if (loadError) {
      pluginLogger.warn(`Plugin registered with load error: ${manifest.name} [${loadError.code}] ${loadError.message}`);
    } else {
      pluginLogger.log(`Plugin registered: ${manifest.name} v${manifest.version} (sandboxed: ${isSandboxed})`);
    }
  }
  async unregisterPlugin(pluginId: string, deps: LifecycleDeps): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      pluginLogger.warn(`Plugin "${pluginId}" not found`);
      return;
    }
    await this.deactivatePlugin(pluginId, deps);
    this.plugins.delete(pluginId);
    this.pluginPermissions.delete(pluginId);
    this.pluginEnabled.delete(pluginId);
    this.savePluginStates();
    pluginLogger.log(`Plugin unregistered: ${pluginId}`);
  }
  async activatePlugin(pluginId: string, deps: LifecycleDeps): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      pluginLogger.warn(`Plugin "${pluginId}" not found`);
      return;
    }
    if (plugin.isActive) {
      pluginLogger.warn(`Plugin "${pluginId}" is already active`);
      return;
    }
    if (plugin.loadError) {
      pluginLogger.warn(`Cannot activate plugin "${pluginId}" due to load error [${plugin.loadError.code}]: ${plugin.loadError.message}`);
      throw new Error(`插件模块加载失败 (${plugin.loadError.code}): ${plugin.loadError.message}`);
    }
    const contributions = plugin.manifest.contributions || {};
    let contributionsRegistered = false;
    try {
      const declaredPermissions = new Set<string>(plugin.manifest.permissions || []);
      const currentPermissions = this.pluginPermissions.get(plugin.manifest.id);
      if (currentPermissions) {
        for (const perm of declaredPermissions) {
          currentPermissions.add(perm);
        }
      } else {
        const defaultPerms = new Set(this.getDefaultPermissions(plugin.manifest));
        for (const perm of declaredPermissions) {
          defaultPerms.add(perm);
        }
        this.pluginPermissions.set(plugin.manifest.id, defaultPerms);
      }
      const permissions = this.pluginPermissions.get(pluginId) || new Set();
      const api = deps.createSandboxedAPI(pluginId, permissions);
      const context = {
        api,
        subscriptions: [] as Disposable[],
        contributions
      };
      plugin.context = context;
      if (contributions.menus || contributions.panels || contributions.themes || contributions.grammars) {
        deps.addContributions(contributions);
        this.trackPanelOwners(pluginId, contributions);
        contributionsRegistered = true;
        deps.emit('plugin-contributions-changed', {
          pluginId,
          phase: 'register'
        });
      }
      if (plugin.isSandboxed) {
        const sandboxedModule = plugin.module as SandboxPluginModule;
        if (sandboxedModule.activate) {
          await this.runWithTimeout(sandboxedModule.activate(context), 30000, `Plugin ${pluginId} activation timeout`);
        }
      } else {
        const localModule = plugin.module as PluginModule;
        if (typeof localModule.activate === 'function') {
          await this.runWithTimeout(localModule.activate(context), 30000, `Plugin ${pluginId} activation timeout`);
        } else if (typeof localModule.default === 'function') {
          await this.runWithTimeout(localModule.default(context), 30000, `Plugin ${pluginId} activation timeout`);
        }
      }
      if (context.subscriptions.length > 0) {
        for (const sub of context.subscriptions) {
          plugin.subscriptions.push(sub);
        }
        context.subscriptions = plugin.subscriptions;
      }
      plugin.isActive = true;
      this.savePluginStates();
      pluginLogger.log(`Plugin activated: ${plugin.manifest.name}`);
      deps.emit('plugin-activated', {
        pluginId,
        manifest: plugin.manifest
      });
    } catch (error) {
      pluginLogger.error(`Failed to activate plugin "${pluginId}":`, error);
      plugin.isActive = false;
      if (contributionsRegistered) {
        deps.removeContributions(contributions);
        this.untrackPanelOwners(pluginId, contributions);
        deps.emit('plugin-contributions-changed', {
          pluginId,
          phase: 'rollback'
        });
      }
      pluginPanelRegistry.unregisterByPlugin(pluginId);
      plugin.subscriptions.forEach(sub => {
        try {
          sub.dispose();
        } catch {}
      });
      plugin.subscriptions = [];
      plugin.context = undefined;
    }
  }
  async deactivatePlugin(pluginId: string, deps: LifecycleDeps): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      pluginLogger.warn(`Plugin "${pluginId}" not found`);
      return;
    }
    if (!plugin.isActive) return;
    try {
      if (plugin.isSandboxed) {
        const sandboxedModule = plugin.module as SandboxPluginModule;
        if (sandboxedModule.deactivate) {
          await this.runWithTimeout(sandboxedModule.deactivate(), 10000, `Plugin ${pluginId} deactivation timeout`);
        }
        const {
          destroySandbox
        } = await import('../PluginSandbox');
        destroySandbox(pluginId);
      } else {
        const localModule = plugin.module as PluginModule;
        if (typeof localModule.deactivate === 'function') {
          await this.runWithTimeout(localModule.deactivate(), 10000, `Plugin ${pluginId} deactivation timeout`);
        }
      }
      const contributions = plugin.context?.contributions || plugin.manifest.contributions;
      if (contributions) {
        deps.removeContributions(contributions);
        this.untrackPanelOwners(pluginId, contributions);
        deps.emit('plugin-contributions-changed', {
          pluginId,
          phase: 'unregister'
        });
      }
      plugin.subscriptions.forEach(sub => {
        try {
          sub.dispose();
        } catch (error) {
          pluginLogger.warn(`Error disposing subscription for ${pluginId}:`, error);
        }
      });
      plugin.subscriptions = [];
      pluginPanelRegistry.unregisterByPlugin(pluginId);
      plugin.isActive = false;
      plugin.context = undefined;
      this.savePluginStates();
      pluginLogger.log(`Plugin deactivated: ${plugin.manifest.name}`);
      deps.emit('plugin-deactivated', {
        pluginId
      });
    } catch (error) {
      pluginLogger.error(`Failed to deactivate plugin "${pluginId}":`, error);
    }
  }
  async setPluginEnabled(pluginId: string, enabled: boolean, deps: LifecycleDeps): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    if (enabled && plugin.loadError) {
      throw new Error(`插件模块加载失败 (${plugin.loadError.code}): ${plugin.loadError.message}`);
    }
    this.pluginEnabled.set(pluginId, enabled);
    if (enabled && !plugin.isActive) {
      await this.activatePlugin(pluginId, deps);
    } else if (!enabled && plugin.isActive) {
      await this.deactivatePlugin(pluginId, deps);
    } else {
      this.savePluginStates();
    }
  }
  async reloadAllPlugins(deps: LifecycleDeps): Promise<void> {
    pluginLogger.log('Reloading all plugins');
    const pluginIds = Array.from(this.plugins.keys());
    const activationTasks = pluginIds.map(async id => {
      const plugin = this.plugins.get(id);
      if (plugin && !plugin.isActive && !plugin.loadError) {
        try {
          await this.activatePlugin(id, deps);
        } catch (err) {
          pluginLogger.warn(`Failed to activate plugin ${id} during reload:`, err);
        }
      }
    });
    await Promise.all(activationTasks);
  }
  async shutdown(deps: LifecycleDeps): Promise<void> {
    pluginLogger.log('Shutting down');
    const pluginIds = Array.from(this.plugins.keys());
    for (const id of pluginIds) {
      await this.deactivatePlugin(id, deps);
    }
    this.plugins.clear();
    this.panelOwners.clear();
    pluginPanelRegistry.clear();
    deps.emit('plugin-system-shutdown');
  }
  async loadPluginsFromDirectory(dir: string, deps: LifecycleDeps): Promise<void> {
    pluginLogger.log(`Loading plugins from: ${dir}`);
    if (!isTauri()) {
      pluginLogger.log('Not in Tauri environment, skipping directory load');
      return;
    }
    let plugins: PluginManifest[] = [];
    try {
      plugins = await invoke<PluginManifest[]>('list_installed_plugins');
    } catch (error) {
      pluginLogger.error('Failed to list installed plugins:', error);
      return;
    }
    const loadTasks = plugins.map(async manifest => {
      if (this.plugins.has(manifest.id)) return;
      const versionCheck = validatePluginVersion(manifest);
      if (!versionCheck.valid) {
        pluginLogger.warn(`Skipping plugin ${manifest.id}: ${versionCheck.error}`);
        return;
      }
      const depCheck = validateDependencies(manifest, this.plugins);
      if (!depCheck.valid) {
        pluginLogger.warn(`Skipping plugin ${manifest.id}: missing deps:`, depCheck.missing, 'incompatible:', depCheck.incompatible);
        return;
      }
      try {
        const {
          module
        } = await loadPluginModule(manifest, deps);
        await this.registerPlugin(manifest, module, {}, deps);
      } catch (error) {
        const loadError = toPluginLoadError(manifest.id, error);
        pluginLogger.error(`Failed to load module for ${manifest.id} [${loadError.code}]:`, loadError.message, loadError.triedPaths);
        try {
          await this.registerPlugin(manifest, createFailedModuleStub(manifest, loadError), {
            loadError
          }, deps);
        } catch (registerErr) {
          pluginLogger.error(`Failed to register failed stub for ${manifest.id}:`, registerErr);
        }
      }
    });
    await Promise.all(loadTasks);
  }
  async loadPluginStates(): Promise<void> {
    this.loadPluginStatesFromLocal();
    if (!isTauri()) return;
    try {
      const plugins = await invoke<PluginManifest[]>('get_plugins_json');
      for (const plugin of plugins) {
        if (plugin.permissions && plugin.permissions.length > 0) {
          this.pluginPermissions.set(plugin.id, new Set(plugin.permissions));
        } else if (!this.pluginPermissions.has(plugin.id)) {
          this.pluginPermissions.set(plugin.id, new Set(this.getDefaultPermissions(plugin)));
        }
        if (typeof plugin.isEnabled === 'boolean') {
          this.pluginEnabled.set(plugin.id, plugin.isEnabled);
        }
      }
    } catch (error) {
      pluginLogger.warn('Failed to load plugin states from backend:', error);
    }
  }
  private loadPluginStatesFromLocal(): void {
    try {
      const stored = localStorage.getItem('kortina_plugin-states');
      if (!stored) {
        const legacy = localStorage.getItem('plugin-states');
        if (!legacy) return;
        this.applyLocalPluginStates(JSON.parse(legacy));
        return;
      }
      this.applyLocalPluginStates(JSON.parse(stored));
    } catch (error) {
      pluginLogger.warn('Failed to load plugin states from localStorage:', error);
    }
  }
  private applyLocalPluginStates(states: Record<string, {
    permissions?: string[];
    enabled?: boolean;
  }>): void {
    for (const [pluginId, state] of Object.entries(states)) {
      if (state.permissions) {
        this.pluginPermissions.set(pluginId, new Set(state.permissions));
      }
      if (typeof state.enabled === 'boolean') {
        this.pluginEnabled.set(pluginId, state.enabled);
      }
    }
  }
  savePluginStates(): void {
    this.savePluginStatesToLocal();
    if (isTauri()) {
      void this.persistPluginStatesToBackend();
    }
  }
  private savePluginStatesToLocal(): void {
    try {
      const states: Record<string, {
        permissions: string[];
        enabled: boolean;
      }> = {};
      const pluginIds = new Set<string>([...Array.from(this.plugins.keys()), ...Array.from(this.pluginPermissions.keys()), ...Array.from(this.pluginEnabled.keys())]);
      pluginIds.forEach(pluginId => {
        const plugin = this.plugins.get(pluginId);
        const permissions = this.pluginPermissions.get(pluginId) || new Set(plugin ? this.getDefaultPermissions(plugin.manifest) : []);
        const enabled = this.pluginEnabled.get(pluginId) ?? plugin?.isActive ?? true;
        states[pluginId] = {
          permissions: Array.from(permissions),
          enabled
        };
      });
      localStorage.setItem('kortina_plugin-states', JSON.stringify(states));
    } catch (error) {
      pluginLogger.warn('Failed to save plugin states:', error);
    }
  }
  private async persistPluginStatesToBackend(): Promise<void> {
    if (!isTauri()) return;
    for (const [pluginId, enabled] of this.pluginEnabled) {
      try {
        await invoke('set_plugin_enabled', {
          pluginId,
          enabled
        });
      } catch (error) {
        pluginLogger.debug(`Backend set_plugin_enabled skipped for ${pluginId}:`, error);
      }
    }
    try {
      await invoke('update_plugin_states', {
        states: Array.from(this.pluginPermissions.entries()).map(([pluginId, permissions]) => ({
          pluginId,
          permissions: Array.from(permissions),
          enabled: this.pluginEnabled.get(pluginId) ?? true
        }))
      });
    } catch {}
  }
  async restorePluginActivationStates(deps: LifecycleDeps): Promise<void> {
    for (const [pluginId, plugin] of this.plugins) {
      if (plugin.loadError) {
        this.pluginEnabled.set(pluginId, false);
        continue;
      }
      const enabled = this.pluginEnabled.get(pluginId);
      const shouldEnable = enabled !== false;
      this.pluginEnabled.set(pluginId, shouldEnable);
      if (shouldEnable && !plugin.isActive) {
        try {
          await this.activatePlugin(pluginId, deps);
        } catch (error) {
          pluginLogger.warn(`Failed to restore activation for ${pluginId}:`, error);
        }
      } else if (!shouldEnable && plugin.isActive) {
        await this.deactivatePlugin(pluginId, deps);
      }
    }
    this.savePluginStates();
  }
  async grantPermission(pluginId: string, permission: string): Promise<void> {
    const permissions = this.pluginPermissions.get(pluginId) || new Set();
    permissions.add(permission);
    this.pluginPermissions.set(pluginId, permissions);
    this.savePluginStates();
  }
  async revokePermission(pluginId: string, permission: string): Promise<void> {
    const permissions = this.pluginPermissions.get(pluginId);
    if (permissions) {
      permissions.delete(permission);
      this.savePluginStates();
    }
  }
  getDefaultPermissions(manifest: PluginManifest): string[] {
    const permissions = new Set<string>(['fs:read', 'editor:read', 'logger:write']);
    if (manifest.permissions) {
      for (const permission of manifest.permissions) {
        permissions.add(permission);
      }
    }
    return Array.from(permissions);
  }
  private trackPanelOwners(pluginId: string, contributions: PluginContribution): void {
    for (const panel of contributions.panels || []) {
      this.panelOwners.set(panel.id, pluginId);
      if (panel.component) {
        this.panelOwners.set(panel.component, pluginId);
      }
    }
  }
  untrackPanelOwners(pluginId: string, contributions: PluginContribution): void {
    for (const panel of contributions.panels || []) {
      if (this.panelOwners.get(panel.id) === pluginId) {
        this.panelOwners.delete(panel.id);
      }
      if (panel.component && this.panelOwners.get(panel.component) === pluginId) {
        this.panelOwners.delete(panel.component);
      }
    }
  }
  registerPanelView(id: string, component: any, pluginId?: string, deps?: LifecycleDeps): Disposable {
    pluginPanelRegistry.register(id, component, pluginId);
    deps?.emit('plugin-panel-view-registered', {
      id,
      pluginId
    });
    return {
      dispose: () => {
        pluginPanelRegistry.unregister(id);
        deps?.emit('plugin-panel-view-unregistered', {
          id,
          pluginId
        });
      }
    };
  }
  private async runWithTimeout<T>(promise: Promise<T> | void, timeoutMs: number, timeoutMessage: string): Promise<T | void> {
    if (!promise) return;
    const timeoutPromise = new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]);
  }
}