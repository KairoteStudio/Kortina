import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, Search, Settings, Trash2, RefreshCw, Check, X, Puzzle, Globe, Package, Download, ArrowUpCircle, Shield, Power } from 'lucide-react';
import { usePlugins } from '../../../../plugins/usePlugins';
import { pluginManager, PLUGIN_PERMISSIONS } from '../../../../plugins/PluginManager';
import type { Plugin, PluginUpdateInfo } from '../../../../plugins/index';
import { marketplaceClient, type MarketplaceHealth, type MarketplacePluginSummary, type MarketplaceSource } from '../../../../plugins/marketplace';
import './PanelStyles.css';
interface ExtensionsPanelProps {
  projectPath: string | null;
}
function sourceLabel(source?: MarketplaceSource | string): string {
  switch (source) {
    case 'tauri':
      return '本机市场';
    case 'remote':
      return '远程市场';
    case 'local-fallback':
      return '内置目录';
    default:
      return source || '未知';
  }
}
export const ExtensionsPanel: React.FC<ExtensionsPanelProps> = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('installed');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updatingPluginId, setUpdatingPluginId] = useState<string | null>(null);
  const [availableUpdates, setAvailableUpdates] = useState<Record<string, PluginUpdateInfo>>({});
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [settingsPluginId, setSettingsPluginId] = useState<string | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [permissionTick, setPermissionTick] = useState(0);
  const [marketHealth, setMarketHealth] = useState<MarketplaceHealth | null>(null);
  const [marketItems, setMarketItems] = useState<MarketplacePluginSummary[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [marketLoaded, setMarketLoaded] = useState(false);
  const {
    initialized,
    plugins,
    isLoading: pluginsLoading,
    error,
    initialize,
    reloadPlugins,
    unregisterPlugin
  } = usePlugins({
    autoInitialize: false
  });
  useEffect(() => {
    if (!initialized && !pluginsLoading) {
      initialize();
    }
  }, [initialized, pluginsLoading, initialize]);
  const loadMarketplace = useCallback(async (query?: string) => {
    setMarketLoading(true);
    setMarketError(null);
    try {
      const health = await marketplaceClient.health();
      setMarketHealth(health);
      const list = await marketplaceClient.list({
        query: query?.trim() || undefined,
        page: 1,
        pageSize: 50,
        sort: 'relevance'
      });
      setMarketItems(list.items || []);
      setMarketLoaded(true);
    } catch (err) {
      setMarketError(err instanceof Error ? err.message : '加载扩展市场失败');
      setMarketItems([]);
    } finally {
      setMarketLoading(false);
    }
  }, []);
  useEffect(() => {
    if (activeTab !== 'marketplace') return;
    const delay = marketLoaded ? 300 : 0;
    const timer = window.setTimeout(() => {
      void loadMarketplace(searchQuery);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [searchQuery, activeTab, loadMarketplace]);
  const installedIds = useMemo(() => new Set(plugins.map(p => p.manifest.id)), [plugins]);
  const handleInstallFromMarket = useCallback(async (item: MarketplacePluginSummary) => {
    if (installingId) return;
    setInstallingId(item.id);
    setUpdateError(null);
    setUpdateMessage(null);
    try {
      await pluginManager.installFromMarketplace(item.id, item.version);
      setUpdateMessage(`已安装 ${item.name} v${item.version}`);
      await reloadPlugins();
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : `安装 ${item.name} 失败`);
    } finally {
      setInstallingId(null);
    }
  }, [installingId, reloadPlugins]);
  const settingsPlugin = useMemo(() => plugins.find((p: Plugin) => p.manifest.id === settingsPluginId) as Plugin | undefined, [plugins, settingsPluginId, permissionTick]);
  const settingsPermissions = useMemo(() => {
    if (!settingsPluginId) return [] as string[];
    void permissionTick;
    return Array.from(pluginManager.getPluginPermissions(settingsPluginId));
  }, [settingsPluginId, permissionTick]);
  const handleReload = useCallback(async () => {
    setIsLoading(true);
    try {
      await reloadPlugins();
    } catch (err) {
      console.error('重新加载插件失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [reloadPlugins]);
  const handleUninstall = useCallback(async (pluginId: string) => {
    try {
      await unregisterPlugin(pluginId);
      setAvailableUpdates(prev => {
        const next = {
          ...prev
        };
        delete next[pluginId];
        return next;
      });
      if (settingsPluginId === pluginId) {
        setSettingsPluginId(null);
      }
    } catch (err) {
      console.error('卸载插件失败:', err);
    }
  }, [unregisterPlugin, settingsPluginId]);
  const handleCheckUpdates = useCallback(async () => {
    if (checkingUpdates || plugins.length === 0) return;
    setCheckingUpdates(true);
    setUpdateError(null);
    setUpdateMessage(null);
    try {
      const updates = await pluginManager.checkAllUpdates();
      const updateMap: Record<string, PluginUpdateInfo> = {};
      for (const info of updates) {
        updateMap[info.pluginId] = info;
      }
      setAvailableUpdates(updateMap);
      if (updates.length === 0) {
        setUpdateMessage('所有扩展已是最新版本');
      } else {
        setUpdateMessage(`发现 ${updates.length} 个可用更新`);
      }
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : '检查更新失败');
    } finally {
      setCheckingUpdates(false);
    }
  }, [checkingUpdates, plugins.length]);
  const handleCheckSingleUpdate = useCallback(async (pluginId: string) => {
    if (checkingUpdates || updatingPluginId) return;
    setCheckingUpdates(true);
    setUpdateError(null);
    setUpdateMessage(null);
    try {
      const info = await pluginManager.checkForUpdates(pluginId);
      setAvailableUpdates(prev => {
        const next = {
          ...prev
        };
        if (info) {
          next[pluginId] = info;
        } else {
          delete next[pluginId];
        }
        return next;
      });
      if (info) {
        setUpdateMessage(`${info.pluginId} 有新版本 v${info.latestVersion}`);
      } else {
        setUpdateMessage('该扩展已是最新版本');
      }
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : '检查更新失败');
    } finally {
      setCheckingUpdates(false);
    }
  }, [checkingUpdates, updatingPluginId]);
  const handleUpdatePlugin = useCallback(async (info: PluginUpdateInfo) => {
    if (updatingPluginId) return;
    setUpdatingPluginId(info.pluginId);
    setUpdateError(null);
    setUpdateMessage(null);
    try {
      const success = await pluginManager.updatePlugin(info.pluginId, info.downloadUrl, info.latestVersion);
      if (success) {
        setAvailableUpdates(prev => {
          const next = {
            ...prev
          };
          delete next[info.pluginId];
          return next;
        });
        setUpdateMessage(`${info.pluginId} 已更新到 v${info.latestVersion}`);
        await reloadPlugins();
      } else {
        setUpdateError(`更新 ${info.pluginId} 失败`);
      }
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setUpdatingPluginId(null);
    }
  }, [updatingPluginId, reloadPlugins]);
  const openSettings = useCallback((pluginId: string) => {
    setSettingsError(null);
    setSettingsPluginId(pluginId);
    setPermissionTick(v => v + 1);
  }, []);
  const closeSettings = useCallback(() => {
    setSettingsPluginId(null);
    setSettingsError(null);
  }, []);
  const handleToggleEnabled = useCallback(async (pluginId: string, enabled: boolean) => {
    setSettingsBusy(true);
    setSettingsError(null);
    try {
      await pluginManager.setPluginEnabled(pluginId, enabled);
      setPermissionTick(v => v + 1);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : '切换启用状态失败');
    } finally {
      setSettingsBusy(false);
    }
  }, []);
  const handleTogglePermission = useCallback(async (pluginId: string, permission: string, granted: boolean) => {
    setSettingsBusy(true);
    setSettingsError(null);
    try {
      if (granted) {
        await pluginManager.grantPermission(pluginId, permission);
      } else {
        await pluginManager.revokePermission(pluginId, permission);
      }
      setPermissionTick(v => v + 1);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : '更新权限失败');
    } finally {
      setSettingsBusy(false);
    }
  }, []);
  const filteredPlugins = plugins.filter(plugin => plugin.manifest.name.toLowerCase().includes(searchQuery.toLowerCase()) || plugin.manifest.description && plugin.manifest.description.toLowerCase().includes(searchQuery.toLowerCase()));
  const updateCount = Object.keys(availableUpdates).length;
  const isBusy = isLoading || pluginsLoading || checkingUpdates || !!updatingPluginId || settingsBusy || marketLoading || !!installingId;
  if (settingsPlugin) {
    const pluginId = settingsPlugin.manifest.id;
    const enabled = pluginManager.isPluginEnabled(pluginId);
    const allPermissionIds = Object.keys(PLUGIN_PERMISSIONS);
    const knownPermissions = new Set(allPermissionIds);
    const extraPermissions = settingsPermissions.filter(p => !knownPermissions.has(p));
    return <div className="sidebar-panel extensions-panel">
        <div className="panel-header">
          <span className="panel-title">扩展设置</span>
          <div className="panel-actions">
            <button className="panel-action-btn" onClick={closeSettings} title="返回扩展列表">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="panel-content extension-settings">
          <div className="extension-settings-header">
            <div className="extension-icon">
              <Sparkles size={20} />
            </div>
            <div className="extension-settings-title">
              <div className="extension-name">{settingsPlugin.manifest.name}</div>
              <div className="extension-settings-meta">
                <span>v{settingsPlugin.manifest.version}</span>
                <span>{settingsPlugin.manifest.author || '未知作者'}</span>
                {settingsPlugin.isBuiltIn && <span>内置</span>}
              </div>
            </div>
          </div>

          <p className="extension-settings-description">
            {settingsPlugin.manifest.description || '暂无描述'}
          </p>

          {settingsError && <div className="extensions-error">
              <X size={14} />
              <span>{settingsError}</span>
            </div>}

          <div className="extension-settings-section">
            <div className="extension-settings-section-title">
              <Power size={14} />
              <span>运行状态</span>
            </div>
            <label className="extension-settings-toggle-row">
              <div>
                <div className="extension-settings-toggle-label">启用扩展</div>
                <div className="extension-settings-toggle-hint">
                  {settingsPlugin.isActive ? '当前正在运行' : '当前已停用'}
                </div>
              </div>
              <input type="checkbox" checked={enabled} disabled={settingsBusy} onChange={e => handleToggleEnabled(pluginId, e.target.checked)} />
            </label>
          </div>

          <div className="extension-settings-section">
            <div className="extension-settings-section-title">
              <Shield size={14} />
              <span>权限</span>
            </div>
            <div className="extension-permission-list">
              {allPermissionIds.map(permissionId => {
              const meta = PLUGIN_PERMISSIONS[permissionId];
              const granted = settingsPermissions.includes(permissionId);
              return <label key={permissionId} className="extension-permission-item">
                    <div className="extension-permission-info">
                      <div className="extension-permission-name">
                        {meta?.name || permissionId}
                        <span className={`permission-risk risk-${meta?.risk || 'low'}`}>
                          {meta?.risk || 'low'}
                        </span>
                      </div>
                      <div className="extension-permission-desc">
                        {meta?.description || permissionId}
                      </div>
                    </div>
                    <input type="checkbox" checked={granted} disabled={settingsBusy} onChange={e => handleTogglePermission(pluginId, permissionId, e.target.checked)} />
                  </label>;
            })}
              {extraPermissions.map(permissionId => <label key={permissionId} className="extension-permission-item">
                  <div className="extension-permission-info">
                    <div className="extension-permission-name">{permissionId}</div>
                    <div className="extension-permission-desc">自定义权限</div>
                  </div>
                  <input type="checkbox" checked={settingsPermissions.includes(permissionId)} disabled={settingsBusy} onChange={e => handleTogglePermission(pluginId, permissionId, e.target.checked)} />
                </label>)}
            </div>
          </div>

          <div className="extension-settings-footer">
            <button className="extensions-action-btn" onClick={closeSettings}>
              完成
            </button>
          </div>
        </div>
      </div>;
  }
  return <div className="sidebar-panel extensions-panel">
      <div className="panel-header">
        <span className="panel-title">扩展</span>
        <div className="panel-actions">
          <button className="panel-action-btn" onClick={handleCheckUpdates} disabled={isBusy || plugins.length === 0} title="检查更新">
            <ArrowUpCircle size={14} className={checkingUpdates ? 'spinning' : ''} />
          </button>
          <button className="panel-action-btn" onClick={handleReload} disabled={isBusy} title="重新加载扩展">
            <RefreshCw size={14} className={isLoading || pluginsLoading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      <div className="panel-content">
        <div className="search-input-wrapper">
          <Search size={14} className="search-icon" />
          <input type="text" className="search-input" placeholder="搜索扩展..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          {searchQuery && <button className="clear-btn" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>}
        </div>

        <div className="extensions-tabs">
          <button className={`extension-tab ${activeTab === 'installed' ? 'active' : ''}`} onClick={() => setActiveTab('installed')}>
            <Package size={14} />
            <span>已安装</span>
            <span className="tab-count">{plugins.length}</span>
            {updateCount > 0 && <span className="tab-count update-badge">{updateCount}</span>}
          </button>
          <button className={`extension-tab ${activeTab === 'marketplace' ? 'active' : ''}`} onClick={() => setActiveTab('marketplace')}>
            <Globe size={14} />
            <span>市场</span>
          </button>
        </div>

        {error && <div className="extensions-error">
            <X size={14} />
            <span>{error.message}</span>
          </div>}

        {updateError && <div className="extensions-error">
            <X size={14} />
            <span>{updateError}</span>
            <button className="clear-btn" onClick={() => setUpdateError(null)} title="关闭">
              <X size={12} />
            </button>
          </div>}

        {updateMessage && !updateError && <div className="extensions-update-message">
            <Check size={14} />
            <span>{updateMessage}</span>
            <button className="clear-btn" onClick={() => setUpdateMessage(null)} title="关闭">
              <X size={12} />
            </button>
          </div>}

        <div className="extensions-list">
          {activeTab === 'installed' ? <>
              {filteredPlugins.length === 0 ? <div className="extensions-empty">
                  <Puzzle size={48} opacity={0.3} />
                  <p>{searchQuery ? '未找到匹配的扩展' : '暂无已安装的扩展'}</p>
                  {!searchQuery && <button className="extensions-action-btn" onClick={() => setActiveTab('marketplace')}>
                      <Globe size={14} />
                      浏览市场
                    </button>}
                </div> : filteredPlugins.map(plugin => {
            const pluginId = plugin.manifest.id;
            const updateInfo = availableUpdates[pluginId];
            const isUpdating = updatingPluginId === pluginId;
            const enabled = pluginManager.isPluginEnabled(pluginId);
            const loadError = plugin.loadError;
            return <div key={pluginId} className={`extension-item ${updateInfo ? 'has-update' : ''} ${enabled ? 'enabled' : 'disabled'} ${loadError ? 'has-load-error' : ''}`}>
                      <div className="extension-icon">
                        <Sparkles size={20} />
                      </div>
                      <div className="extension-info">
                        <div className="extension-header">
                          <span className="extension-name">{plugin.manifest.name}</span>
                          <span className="extension-version">{plugin.manifest.version}</span>
                          {updateInfo && <span className="extension-update-badge">
                              → v{updateInfo.latestVersion}
                            </span>}
                        </div>
                        <div className="extension-description">
                          {plugin.manifest.description || '暂无描述'}
                        </div>
                        <div className="extension-meta">
                          <span className="extension-author">
                            {plugin.manifest.author || '未知作者'}
                          </span>
                          {loadError ? <span className="extension-status error" title={loadError.message}>
                              加载失败 ({loadError.code})
                            </span> : plugin.isActive ? <span className="extension-status active">
                              <Check size={10} />
                              运行中
                            </span> : <span className="extension-status inactive">
                              已停用
                            </span>}
                        </div>
                        {loadError && <div className="extension-load-error">
                            {loadError.message}
                          </div>}
                        {updateInfo?.releaseNotes && <div className="extension-release-notes">
                            {updateInfo.releaseNotes}
                          </div>}
                        {updateInfo && <div className="extension-update-actions">
                            <button className="extension-install-btn" onClick={() => handleUpdatePlugin(updateInfo)} disabled={isBusy} title={`更新到 v${updateInfo.latestVersion}`}>
                              {isUpdating ? <>
                                  <RefreshCw size={12} className="spinning" />
                                  更新中...
                                </> : <>
                                  <Download size={12} />
                                  更新到 v{updateInfo.latestVersion}
                                </>}
                            </button>
                          </div>}
                      </div>
                      <div className="extension-actions">
                        {!updateInfo && <button className="extension-action-btn" title="检查此扩展更新" onClick={() => handleCheckSingleUpdate(pluginId)} disabled={isBusy}>
                            <ArrowUpCircle size={14} />
                          </button>}
                        <button className="extension-action-btn" title="设置" onClick={() => openSettings(pluginId)}>
                          <Settings size={14} />
                        </button>
                        {!plugin.isBuiltIn && <button className="extension-action-btn danger" title="卸载" onClick={() => handleUninstall(pluginId)} disabled={isBusy}>
                            <Trash2 size={14} />
                          </button>}
                      </div>
                    </div>;
          })}
            </> : <>
              <div className="marketplace-status-bar">
                <span className={`marketplace-source source-${marketHealth?.source || 'unknown'}`}>
                  <Globe size={12} />
                  {marketHealth?.ok ? sourceLabel(marketHealth.source) : '市场未连接'}
                </span>
                {marketHealth?.message && <span className="marketplace-status-msg">{marketHealth.message}</span>}
                <button className="panel-action-btn" onClick={() => void loadMarketplace(searchQuery)} disabled={marketLoading} title="刷新市场">
                  <RefreshCw size={12} className={marketLoading ? 'spinning' : ''} />
                </button>
              </div>

              {marketError && <div className="extensions-error">
                  <X size={14} />
                  <span>{marketError}</span>
                </div>}

              {marketLoading && marketItems.length === 0 ? <div className="extensions-empty">
                  <RefreshCw size={32} className="spinning" opacity={0.4} />
                  <p>正在加载扩展市场...</p>
                </div> : marketItems.length === 0 ? <div className="extensions-empty">
                  <Globe size={48} opacity={0.3} />
                  <p>{searchQuery ? '未找到匹配的扩展' : '市场目录为空'}</p>
                  <button className="extensions-action-btn" onClick={() => void loadMarketplace(searchQuery)}>
                    <RefreshCw size={14} />
                    重试
                  </button>
                </div> : marketItems.map(item => {
            const installed = installedIds.has(item.id);
            const isInstalling = installingId === item.id;
            return <div key={item.id} className={`extension-item marketplace-item ${installed ? 'installed' : ''}`}>
                      <div className="extension-icon">
                        <Puzzle size={20} />
                      </div>
                      <div className="extension-info">
                        <div className="extension-header">
                          <span className="extension-name">{item.name}</span>
                          <span className="extension-version">v{item.version}</span>
                          {item.category && <span className="extension-category-badge">{item.category}</span>}
                        </div>
                        <div className="extension-description">
                          {item.description || '暂无描述'}
                        </div>
                        <div className="extension-meta">
                          <span className="extension-author">{item.author || '未知作者'}</span>
                          {typeof item.downloads === 'number' && <span className="extension-downloads">{item.downloads} 次下载</span>}
                          {installed && <span className="extension-status active">
                              <Check size={10} />
                              已安装
                            </span>}
                        </div>
                      </div>
                      <div className="extension-actions">
                        {installed ? <button className="extension-action-btn" title="已安装" disabled>
                            <Check size={14} />
                          </button> : <button className="extension-install-btn" title={`安装 ${item.name}`} disabled={isBusy} onClick={() => void handleInstallFromMarket(item)}>
                            {isInstalling ? <>
                                <RefreshCw size={12} className="spinning" />
                                安装中...
                              </> : <>
                                <Download size={12} />
                                安装
                              </>}
                          </button>}
                      </div>
                    </div>;
          })}
            </>}
        </div>
      </div>
    </div>;
};
export default ExtensionsPanel;