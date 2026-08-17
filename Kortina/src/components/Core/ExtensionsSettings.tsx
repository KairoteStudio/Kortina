import { useCallback, useEffect, useImperativeHandle, useMemo, useState, forwardRef } from 'react';
import { Search, Trash2, RefreshCw, Puzzle, Globe, Download, ArrowUpCircle, ChevronLeft, Settings, Shield, FolderUp } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { usePlugins } from '../../plugins/usePlugins';
import { pluginManager, PLUGIN_PERMISSIONS } from '../../plugins/PluginManager';
import type { Plugin, PluginUpdateInfo } from '../../plugins/index';
import { marketplaceClient, type MarketplaceHealth, type MarketplacePluginSummary } from '../../plugins/marketplace';
import { useToast } from '../../hooks/useToast';
import Toast from './Toast';
import './ExtensionsSettings.css';
type ExtensionsTab = 'installed' | 'marketplace';
export interface ExtensionsSettingsRef {
  applyChanges: () => Promise<void>;
  resetChanges: () => void;
  hasPendingChanges: () => boolean;
}
export const ExtensionsSettings = forwardRef<ExtensionsSettingsRef>((_props, ref) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ExtensionsTab>('installed');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updatingPluginId, setUpdatingPluginId] = useState<string | null>(null);
  const [availableUpdates, setAvailableUpdates] = useState<Record<string, PluginUpdateInfo>>({});
  const [detailPluginId, setDetailPluginId] = useState<string | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [permissionTick, setPermissionTick] = useState(0);
  const [pendingEnabled, setPendingEnabled] = useState<Record<string, boolean>>({});
  const [pendingPermissions, setPendingPermissions] = useState<Record<string, Set<string>>>({});
  const [marketHealth, setMarketHealth] = useState<MarketplaceHealth | null>(null);
  const [marketItems, setMarketItems] = useState<MarketplacePluginSummary[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [marketLoaded, setMarketLoaded] = useState(false);
  const {
    items: toasts,
    showSuccess,
    showError,
    showInfo,
    removeToast
  } = useToast();
  const allPermissionIds = useMemo(() => Object.keys(PLUGIN_PERMISSIONS), []);
  const hasPendingChanges = useCallback(() => {
    for (const [pluginId, enabled] of Object.entries(pendingEnabled)) {
      if (enabled !== pluginManager.isPluginEnabled(pluginId)) return true;
    }
    for (const [pluginId, pendingPerms] of Object.entries(pendingPermissions)) {
      const currentPermissions = new Set(pluginManager.getPluginPermissions(pluginId));
      if (allPermissionIds.some(id => pendingPerms.has(id) !== currentPermissions.has(id))) {
        return true;
      }
    }
    return false;
  }, [pendingEnabled, pendingPermissions, allPermissionIds]);
  const applyChanges = useCallback(async () => {
    if (!hasPendingChanges()) return;
    setSettingsBusy(true);
    try {
      for (const [pluginId, enabled] of Object.entries(pendingEnabled)) {
        const current = pluginManager.isPluginEnabled(pluginId);
        if (enabled !== current) {
          await pluginManager.setPluginEnabled(pluginId, enabled);
        }
      }
      for (const [pluginId, pendingPerms] of Object.entries(pendingPermissions)) {
        const currentPermissions = new Set(pluginManager.getPluginPermissions(pluginId));
        for (const permissionId of allPermissionIds) {
          const want = pendingPerms.has(permissionId);
          const have = currentPermissions.has(permissionId);
          if (want && !have) await pluginManager.grantPermission(pluginId, permissionId);
          if (!want && have) await pluginManager.revokePermission(pluginId, permissionId);
        }
      }
      setPendingEnabled({});
      setPendingPermissions({});
      setPermissionTick(v => v + 1);
      showSuccess('应用成功', '扩展设置已更新');
    } catch (err) {
      showError('应用失败', err instanceof Error ? err.message : String(err));
    } finally {
      setSettingsBusy(false);
    }
  }, [pendingEnabled, pendingPermissions, allPermissionIds, hasPendingChanges, showSuccess, showError]);
  const resetChanges = useCallback(() => {
    setPendingEnabled({});
    setPendingPermissions({});
  }, []);
  useImperativeHandle(ref, () => ({
    applyChanges,
    resetChanges,
    hasPendingChanges
  }));
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
      void initialize();
    }
  }, [initialized, pluginsLoading, initialize]);
  useEffect(() => {
    if (error) {
      showError('扩展系统', error.message);
    }
  }, [error, showError]);
  const loadMarketplace = useCallback(async (query?: string) => {
    setMarketLoading(true);
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
      showError('扩展市场', err instanceof Error ? err.message : '加载失败');
      setMarketItems([]);
    } finally {
      setMarketLoading(false);
    }
  }, [showError]);
  useEffect(() => {
    if (activeTab !== 'marketplace') return;
    const delay = marketLoaded ? 300 : 0;
    const timer = window.setTimeout(() => {
      void loadMarketplace(searchQuery);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [searchQuery, activeTab, loadMarketplace]);
  const installedIds = useMemo(() => new Set(plugins.map(p => p.manifest.id)), [plugins]);
  const detailPlugin = useMemo(() => plugins.find((p: Plugin) => p.manifest.id === detailPluginId) as Plugin | undefined, [plugins, detailPluginId, permissionTick]);
  useEffect(() => {
    if (!detailPluginId) return;
    const currentEnabled = pluginManager.isPluginEnabled(detailPluginId);
    const currentPermissions = new Set(pluginManager.getPluginPermissions(detailPluginId));
    setPendingEnabled(prev => ({
      ...prev,
      [detailPluginId]: currentEnabled
    }));
    setPendingPermissions(prev => ({
      ...prev,
      [detailPluginId]: currentPermissions
    }));
  }, [detailPluginId, permissionTick]);
  const filteredPlugins = useMemo(() => plugins.filter(plugin => plugin.manifest.name.toLowerCase().includes(searchQuery.toLowerCase()) || (plugin.manifest.description || '').toLowerCase().includes(searchQuery.toLowerCase())), [plugins, searchQuery]);
  const isBusy = isLoading || pluginsLoading || checkingUpdates || !!updatingPluginId || settingsBusy || marketLoading || !!installingId;
  const handleReload = useCallback(async () => {
    setIsLoading(true);
    try {
      await reloadPlugins();
      showInfo('扩展', '已重新加载');
    } catch (err) {
      showError('扩展', err instanceof Error ? err.message : '重新加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [reloadPlugins, showInfo, showError]);
  const handleLocalInstall = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: '插件包',
          extensions: ['zip', 'kortina', 'bin', 'json']
        }, {
          name: '所有文件',
          extensions: ['*']
        }]
      });
      if (!selected) return;
      setIsLoading(true);
      const filePath = selected as string;
      console.log('[ExtensionsSettings] 选择的文件:', filePath);
      const fileContent = await invoke<number[]>('read_file_as_bytes', {
        path: filePath
      });
      console.log('[ExtensionsSettings] 文件大小:', fileContent.length, 'bytes');
      const fileName = filePath.split('/').pop()?.split('\\').pop() || 'unknown';
      const pluginId = fileName.replace(/\.(zip|kortina|bin|json)$/i, '');
      const version = '1.0.0';
      console.log('[ExtensionsSettings] 安装插件:', {
        pluginId,
        version
      });
      const result = await invoke('install_plugin', {
        pluginId,
        version,
        pluginData: fileContent
      });
      console.log('[ExtensionsSettings] 安装结果:', result);
      await reloadPlugins();
      showSuccess('安装成功', `插件 "${fileName}" 已安装`);
    } catch (err) {
      console.error('[ExtensionsSettings] 安装失败:', err);
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
      showError('安装失败', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [reloadPlugins, showSuccess, showError]);
  const handleUninstall = useCallback(async (pluginId: string, name: string) => {
    try {
      await unregisterPlugin(pluginId);
      setAvailableUpdates(prev => {
        const next = {
          ...prev
        };
        delete next[pluginId];
        return next;
      });
      if (detailPluginId === pluginId) setDetailPluginId(null);
      showSuccess('已卸载', name);
    } catch (err) {
      showError('卸载失败', err instanceof Error ? err.message : String(err));
    }
  }, [unregisterPlugin, detailPluginId, showSuccess, showError]);
  const handleCheckUpdates = useCallback(async () => {
    if (checkingUpdates || plugins.length === 0) return;
    setCheckingUpdates(true);
    try {
      const updates = await pluginManager.checkAllUpdates();
      const updateMap: Record<string, PluginUpdateInfo> = {};
      for (const info of updates) updateMap[info.pluginId] = info;
      setAvailableUpdates(updateMap);
      if (updates.length === 0) showInfo('检查更新', '所有扩展已是最新版本');else showInfo('检查更新', `发现 ${updates.length} 个可用更新`);
    } catch (err) {
      showError('检查更新', err instanceof Error ? err.message : '失败');
    } finally {
      setCheckingUpdates(false);
    }
  }, [checkingUpdates, plugins.length, showInfo, showError]);
  const handleUpdatePlugin = useCallback(async (info: PluginUpdateInfo) => {
    if (updatingPluginId) return;
    setUpdatingPluginId(info.pluginId);
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
        showSuccess('更新完成', `${info.pluginId} → v${info.latestVersion}`);
        await reloadPlugins();
      } else {
        showError('更新失败', info.pluginId);
      }
    } catch (err) {
      showError('更新失败', err instanceof Error ? err.message : String(err));
    } finally {
      setUpdatingPluginId(null);
    }
  }, [updatingPluginId, reloadPlugins, showSuccess, showError]);
  const handleInstallFromMarket = useCallback(async (item: MarketplacePluginSummary) => {
    if (installingId) return;
    setInstallingId(item.id);
    try {
      await pluginManager.installFromMarketplace(item.id, item.version);
      showSuccess('安装完成', `${item.name} v${item.version}`);
      await reloadPlugins();
    } catch (err) {
      showError('安装失败', err instanceof Error ? err.message : `无法安装 ${item.name}`);
    } finally {
      setInstallingId(null);
    }
  }, [installingId, reloadPlugins, showSuccess, showError]);
  if (detailPlugin) {
    const pluginId = detailPlugin.manifest.id;
    const currentEnabled = pluginManager.isPluginEnabled(pluginId);
    const currentPermissions = new Set(pluginManager.getPluginPermissions(pluginId));
    const enabled = pendingEnabled[pluginId] ?? currentEnabled;
    const pendingPerms = pendingPermissions[pluginId] ?? currentPermissions;
    const allPermissionIds = Object.keys(PLUGIN_PERMISSIONS);
    const hasUnappliedChanges = enabled !== currentEnabled || allPermissionIds.some(id => pendingPerms.has(id) !== currentPermissions.has(id));
    return <div className="settings-scroll-container extensions-settings">
        <div className="extensions-toolbar">
          <button type="button" className="settings-btn settings-btn-cancel extensions-back-btn" onClick={() => setDetailPluginId(null)}>
            <ChevronLeft size={14} />
            返回
          </button>
          <span className="extensions-toolbar-title">{detailPlugin.manifest.name}</span>
        </div>

        {hasUnappliedChanges && <div className="extensions-pending-hint">
            有未应用的更改：扩展设置需点击“应用”后生效
          </div>}

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-name">{detailPlugin.manifest.name}</span>
            <span className="setting-description">
              v{detailPlugin.manifest.version}
              {detailPlugin.manifest.author ? ` · ${detailPlugin.manifest.author}` : ''}
              {detailPlugin.isBuiltIn ? ' · 内置' : ''}
            </span>
          </div>
        </div>

        {detailPlugin.manifest.description && <div className="setting-item">
            <div className="setting-info">
              <span className="setting-name">描述</span>
              <span className="setting-description">{detailPlugin.manifest.description}</span>
            </div>
          </div>}

        <div className="setting-item">
          <div className="setting-info">
            <span className="setting-name">启用扩展</span>
            <span className="setting-description">
              {enabled ? '启用后运行' : '停用后禁用'}
            </span>
          </div>
          <div className="setting-control">
            <label className="switch">
              <input type="checkbox" checked={enabled} disabled={settingsBusy} onChange={e => setPendingEnabled(prev => ({
              ...prev,
              [pluginId]: e.target.checked
            }))} />
              <span className="slider" />
            </label>
          </div>
        </div>

        <div className="extensions-section-label">
          <Shield size={14} />
          权限
        </div>

        {allPermissionIds.map(permissionId => {
        const meta = PLUGIN_PERMISSIONS[permissionId];
        const granted = pendingPerms.has(permissionId);
        return <div key={permissionId} className="setting-item">
              <div className="setting-info">
                <span className="setting-name">{meta?.name || permissionId}</span>
                <span className="setting-description">{meta?.description || permissionId}</span>
              </div>
              <div className="setting-control">
                <label className="switch">
                  <input type="checkbox" checked={granted} disabled={settingsBusy} onChange={e => {
                const next = new Set(pendingPerms);
                if (e.target.checked) next.add(permissionId);else next.delete(permissionId);
                setPendingPermissions(prev => ({
                  ...prev,
                  [pluginId]: next
                }));
              }} />
                  <span className="slider" />
                </label>
              </div>
            </div>;
      })}

        <Toast items={toasts} onClose={removeToast} />
      </div>;
  }
  return <div className="settings-scroll-container extensions-settings">
      <div className="extensions-toolbar">
        <div className="extensions-search-wrap">
          <Search size={14} className="extensions-search-icon" />
          <input type="text" className="setting-input extensions-search-input" placeholder={activeTab === 'installed' ? '搜索已安装扩展…' : '搜索市场…'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="extensions-toolbar-actions">
          {activeTab === 'installed' && <>
              <button type="button" className="setting-icon-btn" title="从本地安装插件" disabled={isBusy} onClick={() => void handleLocalInstall()}>
                <FolderUp size={16} />
              </button>
              <button type="button" className="setting-icon-btn" title="检查更新" disabled={isBusy || plugins.length === 0} onClick={() => void handleCheckUpdates()}>
                <ArrowUpCircle size={16} className={checkingUpdates ? 'spinning' : ''} />
              </button>
              <button type="button" className="setting-icon-btn" title="重新加载" disabled={isBusy} onClick={() => void handleReload()}>
                <RefreshCw size={16} className={isLoading || pluginsLoading ? 'spinning' : ''} />
              </button>
            </>}
          {activeTab === 'marketplace' && <button type="button" className="setting-icon-btn" title="刷新市场" disabled={marketLoading} onClick={() => void loadMarketplace(searchQuery)}>
              <RefreshCw size={16} className={marketLoading ? 'spinning' : ''} />
            </button>}
        </div>
      </div>

      <div className="extensions-tabs">
        <button type="button" className={`extensions-tab ${activeTab === 'installed' ? 'active' : ''}`} onClick={() => setActiveTab('installed')}>
          已安装
          <span className="extensions-tab-count">( {plugins.length} )</span>
        </button>
        <button type="button" className={`extensions-tab ${activeTab === 'marketplace' ? 'active' : ''}`} onClick={() => setActiveTab('marketplace')}>
          市场
        </button>
      </div>

      {activeTab === 'installed' && Object.entries(pendingEnabled).some(([pluginId, enabled]) => enabled !== pluginManager.isPluginEnabled(pluginId)) && <div className="extensions-pending-hint">
            有未应用的更改：扩展启用状态需点击“应用”后生效
          </div>}

      {activeTab === 'installed' ? filteredPlugins.length === 0 ? <div className="extensions-empty">
            <Puzzle size={40} opacity={0.35} />
            <p>{searchQuery ? '未找到匹配的扩展' : '暂无已安装的扩展'}</p>
            {!searchQuery && <button type="button" className="settings-btn settings-btn-apply" onClick={() => setActiveTab('marketplace')}>
                浏览市场
              </button>}
          </div> : filteredPlugins.map(plugin => {
      const pluginId = plugin.manifest.id;
      const updateInfo = availableUpdates[pluginId];
      const isUpdating = updatingPluginId === pluginId;
      const enabled = pendingEnabled[pluginId] ?? pluginManager.isPluginEnabled(pluginId);
      const loadError = plugin.loadError;
      return <div key={pluginId} className="setting-item extensions-plugin-row">
                <div className="setting-info">
                  <span className="setting-name">
                    {plugin.manifest.name}
                    <span className="extensions-version">v{plugin.manifest.version}</span>
                    {loadError && <span className="extensions-meta-tag">加载失败</span>}
                    {!loadError && !enabled && <span className="extensions-meta-tag">已停用</span>}
                    {updateInfo && <span className="extensions-meta-tag">可更新</span>}
                  </span>
                  <span className="setting-description">
                    {plugin.manifest.description || plugin.manifest.author || pluginId}
                    {loadError ? ` · ${loadError.message}` : ''}
                  </span>
                  {updateInfo && <div className="extensions-inline-actions">
                      <button type="button" className="settings-btn settings-btn-apply" disabled={isBusy} onClick={() => void handleUpdatePlugin(updateInfo)}>
                        {isUpdating ? <>
                            <RefreshCw size={12} className="spinning" />
                            更新中…
                          </> : <>
                            <Download size={12} />
                            更新到 v{updateInfo.latestVersion}
                          </>}
                      </button>
                    </div>}
                </div>
                <div className="setting-control extensions-row-controls">
                  <label className="switch" title={enabled ? '已启用' : '已停用'}>
                    <input type="checkbox" checked={enabled} disabled={settingsBusy} onChange={e => setPendingEnabled(prev => ({
              ...prev,
              [pluginId]: e.target.checked
            }))} />
                    <span className="slider" />
                  </label>
                  <button type="button" className="setting-icon-btn" title="详细设置" onClick={() => setDetailPluginId(pluginId)}>
                    <Settings size={16} />
                  </button>
                  {!plugin.isBuiltIn && <button type="button" className="setting-icon-btn" title="卸载" disabled={isBusy} onClick={() => void handleUninstall(pluginId, plugin.manifest.name)}>
                      <Trash2 size={16} />
                    </button>}
                </div>
              </div>;
    }) : <>
          <div className="extensions-market-hint">
            {marketHealth?.ok ? `数据源：${marketHealth.source === 'tauri' ? '本机' : marketHealth.source === 'remote' ? '远程' : '内置目录'}` : '市场连接中…'}
            {marketHealth?.message ? ` · ${marketHealth.message}` : ''}
          </div>

          {marketLoading && marketItems.length === 0 ? <div className="extensions-empty">
              <p>正在加载扩展市场…</p>
            </div> : marketItems.length === 0 ? <div className="extensions-empty">
              <Globe size={40} opacity={0.35} />
              <p>{searchQuery ? '未找到匹配的扩展' : '市场目录为空'}</p>
              <button type="button" className="settings-btn settings-btn-apply" onClick={() => void loadMarketplace(searchQuery)}>
                重试
              </button>
            </div> : marketItems.map(item => {
        const installed = installedIds.has(item.id);
        const isInstalling = installingId === item.id;
        return <div key={item.id} className="setting-item extensions-plugin-row">
                  <div className="setting-info">
                    <span className="setting-name">
                      {item.name}
                      <span className="extensions-version">v{item.version}</span>
                      {installed && <span className="extensions-meta-tag">已安装</span>}
                    </span>
                    <span className="setting-description">
                      {item.description || item.author || item.id}
                    </span>
                  </div>
                  <div className="setting-control">
                    {installed ? <span className="extensions-installed-label">已安装</span> : <button type="button" className="settings-btn settings-btn-apply" disabled={isBusy} onClick={() => void handleInstallFromMarket(item)}>
                        {isInstalling ? <>
                            <RefreshCw size={12} className="spinning" />
                            安装中…
                          </> : <>
                            <Download size={12} />
                            安装
                          </>}
                      </button>}
                  </div>
                </div>;
      })}
        </>}

      <Toast items={toasts} onClose={removeToast} />
    </div>;
});
ExtensionsSettings.displayName = 'ExtensionsSettings';
export default ExtensionsSettings;