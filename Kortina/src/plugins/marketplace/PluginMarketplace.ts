import { isTauri } from '../../utils/environment';
import { invoke } from '@tauri-apps/api/core';
import type { PluginLifecycleManager } from '../lifecycle/PluginLifecycleManager';
import { pluginLogger } from '../core/PluginLogger';
import { marketplaceClient } from './MarketplaceClient';
import type { MarketplacePluginDetail } from './types';
import type { PluginUpdateInfo } from '../index';
import { compareVersions } from '../core/versionUtils';
export interface MarketplaceDeps {
  lifecycle: PluginLifecycleManager;
  lifecycleDeps: {
    executeModuleSource(source: string, pluginId: string): Promise<any>;
    createSandboxedAPI(pluginId: string, permissions: Set<string>): any;
    emit(event: string, ...args: any[]): void;
    addContributions(contributions: any): void;
    removeContributions(contributions: any): void;
  };
  getApiBaseUrl(): string;
}
const API_FALLBACK_URLS: string[] = [];
export class PluginMarketplace {
  private deps: MarketplaceDeps;
  private apiBaseUrl: string;
  private fallbackUrls: string[] = API_FALLBACK_URLS;
  constructor(deps: MarketplaceDeps) {
    this.deps = deps;
    this.apiBaseUrl = deps.getApiBaseUrl();
  }
  getClient() {
    return marketplaceClient;
  }
  getApiBaseUrl(): string {
    return this.apiBaseUrl;
  }
  async testApiConnectivity(): Promise<void> {
    try {
      await fetch(`${this.apiBaseUrl}/health`, {
        method: 'HEAD',
        mode: 'no-cors'
      });
    } catch {
      pluginLogger.warn('Primary API unavailable, trying fallbacks');
      for (const fallbackUrl of this.fallbackUrls) {
        try {
          await fetch(`${fallbackUrl}/health`, {
            method: 'HEAD',
            mode: 'no-cors'
          });
          this.apiBaseUrl = fallbackUrl;
          pluginLogger.log(`Using fallback API: ${fallbackUrl}`);
          return;
        } catch {
          continue;
        }
      }
      pluginLogger.warn('All APIs unavailable, using offline mode');
    }
  }
  async checkForUpdates(pluginId: string): Promise<PluginUpdateInfo | null> {
    const plugin = this.deps.lifecycle.getPlugin(pluginId);
    if (!plugin) return null;
    try {
      const latestInfo = await marketplaceClient.getLatest(pluginId);
      if (compareVersions(latestInfo.version, plugin.manifest.version) > 0) {
        return {
          pluginId,
          currentVersion: plugin.manifest.version,
          latestVersion: latestInfo.version,
          downloadUrl: latestInfo.downloadUrl,
          releaseNotes: latestInfo.releaseNotes
        };
      }
    } catch (error) {
      pluginLogger.warn(`Failed to check updates for ${pluginId}:`, error);
    }
    return null;
  }
  async checkAllUpdates(): Promise<PluginUpdateInfo[]> {
    const updates: PluginUpdateInfo[] = [];
    for (const plugin of this.deps.lifecycle.getAllPlugins()) {
      const update = await this.checkForUpdates(plugin.manifest.id);
      if (update) updates.push(update);
    }
    return updates;
  }
  async updatePlugin(pluginId: string, downloadUrl: string, newVersion: string): Promise<boolean> {
    try {
      const metadata = await marketplaceClient.getLatest(pluginId);
      const checksum = metadata.version === newVersion ? metadata.checksum : undefined;
      const packageBytes = await marketplaceClient.downloadPackage(pluginId, newVersion, downloadUrl);
      await this.installPluginPackage(pluginId, newVersion, packageBytes, checksum);
      return true;
    } catch (error) {
      pluginLogger.error(`Failed to update plugin ${pluginId}:`, error);
      return false;
    }
  }
  async installFromMarketplace(pluginId: string, version?: string): Promise<boolean> {
    try {
      const latest = version ? await marketplaceClient.getPlugin(pluginId).then((p: MarketplacePluginDetail) => ({
        pluginId,
        version: version || p.version,
        downloadUrl: p.downloadUrl || `kortina://marketplace/download/${pluginId}?version=${version || p.version}`,
        releaseNotes: p.releaseNotes,
        checksum: p.checksum
      })) : await marketplaceClient.getLatest(pluginId);
      const packageBytes = await marketplaceClient.downloadPackage(pluginId, latest.version, latest.downloadUrl);
      await this.installPluginPackage(pluginId, latest.version, packageBytes, latest.checksum);
      return true;
    } catch (error) {
      pluginLogger.error(`Failed to install from marketplace ${pluginId}:`, error);
      throw error;
    }
  }
  private async installPluginPackage(pluginId: string, version: string, packageBytes: Uint8Array, checksum?: MarketplacePluginDetail['checksum']): Promise<void> {
    if (!isTauri()) {
      throw new Error('安装插件需要 Tauri 环境（install_plugin）');
    }
    await invoke('install_plugin', {
      pluginId,
      version,
      pluginData: Array.from(packageBytes),
      expectedChecksum: checksum?.algorithm === 'sha256' ? checksum.value : undefined
    });
    if (this.deps.lifecycle.getPlugin(pluginId)) {
      await this.deps.lifecycle.unregisterPlugin(pluginId, this.deps.lifecycleDeps);
    }
    const dir = await invoke<string>('get_plugins_dir');
    await this.deps.lifecycle.loadPluginsFromDirectory(dir, this.deps.lifecycleDeps);
    if (this.deps.lifecycle.getPlugin(pluginId)) {
      await this.deps.lifecycle.setPluginEnabled(pluginId, true, this.deps.lifecycleDeps);
    }
  }
}