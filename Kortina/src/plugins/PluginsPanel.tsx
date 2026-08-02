import React, { useState, useEffect } from 'react';
import { Plug, Trash2, RefreshCw, Plus, Search, AlertCircle, CheckCircle, Download, Star, Tag, ExternalLink, Info, X, FolderUp } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import './PluginsPanel.css';
const API_BASE_URL = String(import.meta.env.VITE_MARKETPLACE_URL || '').replace(/\/+$/, '');
interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  category: string;
  tags: string[];
  homepage?: string;
  repository?: string;
  readme?: string;
  downloadCount: number;
  rating: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
  compatibility: {
    minVersion: string;
    maxVersion?: string;
  };
}
interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}
interface LocalPlugin {
  manifest: PluginManifest;
  isActive: boolean;
  isBuiltIn: boolean;
  path?: string;
}
interface PluginDetail {
  plugin: PluginManifest | null;
  isOpen: boolean;
  isInstalling: boolean;
  installProgress: string;
}
interface PluginsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}
const PluginsPanelComponent: React.FC<PluginsPanelProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('installed');
  const [localPlugins, setLocalPlugins] = useState<LocalPlugin[]>([]);
  const [remotePlugins, setRemotePlugins] = useState<PluginManifest[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pluginDetail, setPluginDetail] = useState<PluginDetail>({
    plugin: null,
    isOpen: false,
    isInstalling: false,
    installProgress: ''
  });
  useEffect(() => {
    if (isOpen) {
      initializePluginSystem();
    }
  }, [isOpen]);
  const initializePluginSystem = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([loadCategories(), loadLocalPlugins(), loadRemotePlugins()]);
    } catch (err) {
      console.error('[PluginsPanel] Initialization failed:', err);
      setError(err instanceof Error ? err.message : '初始化失败');
    } finally {
      setIsLoading(false);
    }
  };
  const loadCategories = async () => {
    if (!API_BASE_URL) return;
    try {
      const response = await fetch(`${API_BASE_URL}/categories`);
      if (!response.ok) throw new Error('Failed to load categories');
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      console.error('[PluginsPanel] Failed to load categories:', err);
      setCategories([{
        id: 'all',
        name: '全部',
        icon: 'grid',
        count: 0
      }, {
        id: 'examples',
        name: '示例',
        icon: 'book',
        count: 2
      }, {
        id: 'utilities',
        name: '工具',
        icon: 'wrench',
        count: 1
      }, {
        id: 'vcs',
        name: '版本控制',
        icon: 'git-branch',
        count: 0
      }, {
        id: 'themes',
        name: '主题',
        icon: 'palette',
        count: 0
      }, {
        id: 'snippets',
        name: '代码片段',
        icon: 'code',
        count: 0
      }, {
        id: 'ai',
        name: 'AI',
        icon: 'cpu',
        count: 0
      }]);
    }
  };
  const loadLocalPlugins = async () => {
    try {
      const pluginsData = await invoke('get_plugins_json');
      let plugins: LocalPlugin[] = [];
      try {
        const installedPlugins = Array.isArray(pluginsData) ? pluginsData : [];
        plugins = installedPlugins.map((p: any) => ({
          manifest: p,
          isActive: p.isEnabled !== false,
          isBuiltIn: !p.installPath && !p.installedAt,
          path: p.installPath || undefined
        }));
      } catch {
        plugins = [];
      }
      setLocalPlugins(plugins);
    } catch (err) {
      console.error('[PluginsPanel] Failed to load local plugins:', err);
      setLocalPlugins([]);
    }
  };
  const loadRemotePlugins = async (category?: string, search?: string) => {
    if (!API_BASE_URL) {
      setRemotePlugins([]);
      return;
    }
    try {
      let url = `${API_BASE_URL}/plugins?`;
      if (category && category !== 'all') url += `category=${category}&`;
      if (search) url += `search=${encodeURIComponent(search)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load plugins');
      const data = await response.json();
      setRemotePlugins(data.plugins || []);
    } catch (err) {
      console.error('[PluginsPanel] Failed to load remote plugins:', err);
      setRemotePlugins([]);
    }
  };
  const openPluginDetail = (plugin: PluginManifest) => {
    setPluginDetail({
      plugin,
      isOpen: true,
      isInstalling: false,
      installProgress: ''
    });
  };
  const closePluginDetail = () => {
    setPluginDetail({
      plugin: null,
      isOpen: false,
      isInstalling: false,
      installProgress: ''
    });
  };
  const handleInstall = async (plugin: PluginManifest) => {
    if (!API_BASE_URL) {
      setError('未配置远程扩展市场');
      return;
    }
    setPluginDetail(prev => ({
      ...prev,
      isInstalling: true,
      installProgress: '正在获取下载链接...'
    }));
    try {
      const downloadResponse = await fetch(`${API_BASE_URL}/plugins/${plugin.id}/download`);
      if (!downloadResponse.ok) throw new Error('获取下载链接失败');
      setPluginDetail(prev => ({
        ...prev,
        installProgress: '正在下载插件...'
      }));
      const blob = await downloadResponse.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      setPluginDetail(prev => ({
        ...prev,
        installProgress: '正在安装插件...'
      }));
      await invoke('install_plugin', {
        pluginId: plugin.id,
        version: plugin.version,
        pluginData: Array.from(uint8Array)
      });
      setPluginDetail(prev => ({
        ...prev,
        isInstalling: false,
        installProgress: ''
      }));
      await loadLocalPlugins();
      closePluginDetail();
      alert(`${plugin.name} 安装成功！`);
    } catch (err) {
      console.error('[PluginsPanel] Failed to install plugin:', err);
      setPluginDetail(prev => ({
        ...prev,
        isInstalling: false,
        installProgress: ''
      }));
      setError(err instanceof Error ? err.message : '安装失败');
    }
  };
  const handleUninstall = async (pluginId: string) => {
    if (!confirm('确定要卸载此插件吗？')) return;
    try {
      await invoke('uninstall_plugin', {
        pluginId
      });
      await loadLocalPlugins();
    } catch (err) {
      console.error('[PluginsPanel] Failed to uninstall plugin:', err);
      setError(err instanceof Error ? err.message : '卸载失败');
    }
  };
  const handleReload = () => {
    initializePluginSystem();
  };
  const handleLocalInstall = async () => {
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
      setError(null);
      const filePath = selected as string;
      const fileContent = await invoke<number[]>('read_file_as_bytes', {
        path: filePath
      });
      const fileName = filePath.split('/').pop()?.split('\\').pop() || 'unknown';
      const pluginId = fileName.replace(/\.(zip|kortina|bin|json)$/i, '');
      const version = '1.0.0';
      await invoke('install_plugin', {
        pluginId,
        version,
        pluginData: fileContent
      });
      await loadLocalPlugins();
      alert(`插件 "${fileName}" 安装成功！`);
    } catch (err) {
      console.error('[PluginsPanel] Failed to install local plugin:', err);
      setError(err instanceof Error ? err.message : '本地插件安装失败');
    } finally {
      setIsLoading(false);
    }
  };
  const handleTogglePlugin = async (pluginId: string, enabled: boolean) => {
    try {
      await invoke('set_plugin_enabled', {
        pluginId,
        enabled
      });
      await loadLocalPlugins();
    } catch (err) {
      console.error('[PluginsPanel] Failed to toggle plugin:', err);
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };
  const filteredLocalPlugins = localPlugins.filter(p => p.manifest.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.manifest.description?.toLowerCase().includes(searchQuery.toLowerCase()));
  if (!isOpen) return null;
  return <div className="plugins-panel-overlay" onClick={onClose}>
      <div className="plugins-panel" onClick={e => e.stopPropagation()}>
        <div className="plugins-panel-header">
          <div className="plugins-title">
            <Plug size={20} />
            <h2>插件管理</h2>
          </div>
          <button className="plugins-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="plugins-tabs">
          <button className={`plugins-tab ${activeTab === 'installed' ? 'active' : ''}`} onClick={() => setActiveTab('installed')}>
            已安装 ({localPlugins.length})
          </button>
          <button className={`plugins-tab ${activeTab === 'marketplace' ? 'active' : ''}`} onClick={() => setActiveTab('marketplace')}>
            插件市场
          </button>
        </div>

        {activeTab === 'marketplace' && <div className="plugins-categories">
            {categories.map(cat => <button key={cat.id} className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`} onClick={() => setSelectedCategory(cat.id)}>
                {cat.name}
                <span className="category-count">{cat.count}</span>
              </button>)}
          </div>}

        <div className="plugins-toolbar">
          <div className="plugins-search">
            <Search size={16} />
            <input type="text" placeholder={activeTab === 'marketplace' ? "搜索插件..." : "搜索已安装插件..."} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <div className="plugins-actions">
            {activeTab === 'installed' && <button className="plugins-action-btn" onClick={handleLocalInstall} disabled={isLoading} title="从本地安装插件">
                <FolderUp size={16} />
              </button>}
            <button className="plugins-action-btn" onClick={handleReload} disabled={isLoading} title="重新加载">
              <RefreshCw size={16} className={isLoading ? 'spinning' : ''} />
            </button>
          </div>
        </div>

        <div className="plugins-content">
          {error && <div className="plugins-error">
              <AlertCircle size={16} />
              <span>{error}</span>
              <button onClick={() => setError(null)}>关闭</button>
            </div>}

          {isLoading && <div className="plugins-loading">
              <RefreshCw size={24} className="spinning" />
              <span>正在加载插件...</span>
            </div>}

          {!isLoading && activeTab === 'installed' && <>
              {filteredLocalPlugins.length === 0 ? <div className="plugins-empty">
                  <Plug size={48} />
                  <h3>暂无已安装插件</h3>
                  <p>从插件市场安装插件来扩展 Kortina 的功能</p>
                  <button className="plugins-primary-btn" onClick={() => setActiveTab('marketplace')}>
                    <Plus size={16} />
                    浏览插件市场
                  </button>
                </div> : <div className="plugins-list">
                  {filteredLocalPlugins.map(plugin => <InstalledPluginCard key={plugin.manifest.id} plugin={plugin} onUninstall={() => handleUninstall(plugin.manifest.id)} onViewDetail={() => openPluginDetail(plugin.manifest)} onToggle={enabled => handleTogglePlugin(plugin.manifest.id, enabled)} />)}
                </div>}
            </>}

          {!isLoading && activeTab === 'marketplace' && <>
              {remotePlugins.length === 0 ? <div className="plugins-empty">
                  <Search size={48} />
                  <h3>未找到插件</h3>
                  <p>尝试其他搜索词或分类</p>
                </div> : <div className="plugins-list">
                  {remotePlugins.map(plugin => <MarketplacePluginCard key={plugin.id} plugin={plugin} isInstalled={localPlugins.some(p => p.manifest.id === plugin.id)} onInstall={() => handleInstall(plugin)} onViewDetail={() => openPluginDetail(plugin)} />)}
                </div>}
            </>}
        </div>

        <div className="plugins-footer">
          <span className="plugins-source">
            {API_BASE_URL ? <>数据来源: <a href={API_BASE_URL} target="_blank" rel="noopener noreferrer">远程市场</a></> : '未配置远程市场'}
          </span>
          <span className="plugins-count">
            {activeTab === 'installed' ? `已安装 ${localPlugins.length} 个插件` : `共 ${remotePlugins.length} 个插件`}
          </span>
        </div>
      </div>

      {pluginDetail.isOpen && pluginDetail.plugin && <PluginDetailModal plugin={pluginDetail.plugin} isInstalled={localPlugins.some(p => p.manifest.id === pluginDetail.plugin?.id)} isInstalling={pluginDetail.isInstalling} installProgress={pluginDetail.installProgress} onClose={closePluginDetail} onInstall={() => handleInstall(pluginDetail.plugin!)} onUninstall={() => handleUninstall(pluginDetail.plugin!.id)} />}
    </div>;
};
interface InstalledPluginCardProps {
  plugin: LocalPlugin;
  onUninstall: () => void;
  onViewDetail: () => void;
  onToggle: (enabled: boolean) => void;
}
const InstalledPluginCard: React.FC<InstalledPluginCardProps> = ({
  plugin,
  onUninstall,
  onViewDetail,
  onToggle
}) => {
  const {
    manifest,
    isActive,
    isBuiltIn
  } = plugin;
  const [isToggling, setIsToggling] = useState(false);
  const handleToggle = async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      await onToggle(!isActive);
    } finally {
      setIsToggling(false);
    }
  };
  return <div className={`plugin-card ${isActive ? 'active' : 'inactive'}`}>
      <div className="plugin-card-header">
        <div className="plugin-icon">
          <Plug size={24} />
        </div>
        <div className="plugin-info">
          <h3 className="plugin-name">{manifest.name}</h3>
          <div className="plugin-meta-row">
            <span className="plugin-version">v{manifest.version}</span>
            {isBuiltIn && <span className="plugin-builtin">内置</span>}
            <span className={`plugin-status-badge ${isActive ? 'enabled' : 'disabled'}`}>
              {isActive ? '已启用' : '已禁用'}
            </span>
          </div>
        </div>
      </div>

      {manifest.description && <p className="plugin-description">{manifest.description}</p>}

      {manifest.tags && manifest.tags.length > 0 && <div className="plugin-tags">
          {manifest.tags.slice(0, 4).map(tag => <span key={tag} className="plugin-tag">
              <Tag size={10} />
              {tag}
            </span>)}
        </div>}

      <div className="plugin-stats">
        <span title="下载量">
          <Download size={12} />
          {manifest.downloadCount.toLocaleString()}
        </span>
        <span title="作者">
          <Info size={12} />
          {manifest.author}
        </span>
      </div>

      <div className="plugin-card-actions">
        <button className="plugin-action-btn" onClick={onViewDetail}>
          详情
        </button>
        <button className={`plugin-action-btn ${isActive ? 'secondary' : 'primary'}`} onClick={handleToggle} disabled={isToggling || isBuiltIn} title={isBuiltIn ? '内置插件无法禁用' : isActive ? '点击禁用' : '点击启用'}>
          {isToggling ? <RefreshCw size={14} className="spinning" /> : isActive ? '禁用' : '启用'}
        </button>
        {!isBuiltIn && <button className="plugin-action-btn danger" onClick={onUninstall}>
            <Trash2 size={14} />
            卸载
          </button>}
      </div>
    </div>;
};
interface MarketplacePluginCardProps {
  plugin: PluginManifest;
  isInstalled: boolean;
  onInstall: () => void;
  onViewDetail: () => void;
}
const MarketplacePluginCard: React.FC<MarketplacePluginCardProps> = ({
  plugin,
  isInstalled,
  onInstall,
  onViewDetail
}) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const handleClick = async () => {
    if (isInstalled) {
      onViewDetail();
      return;
    }
    setIsInstalling(true);
    try {
      await onInstall();
    } finally {
      setIsInstalling(false);
    }
  };
  return <div className="plugin-card marketplace">
      <div className="plugin-card-header">
        <div className="plugin-icon">
          <Plug size={24} />
        </div>
        <div className="plugin-info">
          <h3 className="plugin-name">{plugin.name}</h3>
          <div className="plugin-meta-row">
            <span className="plugin-version">v{plugin.version}</span>
            <span className="plugin-rating">
              <Star size={12} fill="currentColor" />
              {plugin.rating > 0 ? plugin.rating.toFixed(1) : '新'}
            </span>
          </div>
        </div>
      </div>

      <p className="plugin-description">{plugin.description}</p>

      {plugin.tags && plugin.tags.length > 0 && <div className="plugin-tags">
          {plugin.tags.slice(0, 4).map(tag => <span key={tag} className="plugin-tag">
              <Tag size={10} />
              {tag}
            </span>)}
        </div>}

      <div className="plugin-stats">
        <span>
          <Download size={12} />
          {plugin.downloadCount.toLocaleString()}
        </span>
        <span>
          <Info size={12} />
          {plugin.author}
        </span>
        <span>{plugin.updatedAt || '最近更新'}</span>
      </div>

      <div className="plugin-card-actions">
        <button className="plugin-action-btn" onClick={onViewDetail}>
          详情
        </button>
        <button className={`plugin-action-btn ${isInstalled ? 'secondary' : 'primary'}`} onClick={handleClick} disabled={isInstalling}>
          {isInstalling ? <>
              <RefreshCw size={14} className="spinning" />
              安装中...
            </> : isInstalled ? <>
              <CheckCircle size={14} />
              已安装
            </> : <>
              <Download size={14} />
              安装
            </>}
        </button>
      </div>
    </div>;
};
interface PluginDetailModalProps {
  plugin: PluginManifest;
  isInstalled: boolean;
  isInstalling: boolean;
  installProgress: string;
  onClose: () => void;
  onInstall: () => void;
  onUninstall: () => void;
}
const PluginDetailModal: React.FC<PluginDetailModalProps> = ({
  plugin,
  isInstalled,
  isInstalling,
  installProgress,
  onClose,
  onInstall,
  onUninstall
}) => {
  return <div className="plugin-detail-overlay" onClick={onClose}>
      <div className="plugin-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="plugin-detail-header">
          <div className="plugin-detail-icon">
            <Plug size={32} />
          </div>
          <div className="plugin-detail-info">
            <h2>{plugin.name}</h2>
            <div className="plugin-detail-meta">
              <span className="plugin-version">v{plugin.version}</span>
              <span className="plugin-author">by {plugin.author}</span>
              <span className="plugin-license">{plugin.license}</span>
            </div>
          </div>
          <button className="plugin-detail-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="plugin-detail-content">
          <div className="plugin-detail-description">
            <p>{plugin.description}</p>
          </div>

          {plugin.tags && plugin.tags.length > 0 && <div className="plugin-detail-tags">
              {plugin.tags.map(tag => <span key={tag} className="plugin-tag">
                  <Tag size={12} />
                  {tag}
                </span>)}
            </div>}

          <div className="plugin-detail-stats">
            <div className="stat-item">
              <Download size={16} />
              <span>{plugin.downloadCount.toLocaleString()} 次下载</span>
            </div>
            <div className="stat-item">
              <Star size={16} fill="currentColor" />
              <span>{plugin.rating > 0 ? plugin.rating.toFixed(1) : '暂无评分'}</span>
            </div>
            <div className="stat-item">
              <RefreshCw size={16} />
              <span>更新于 {plugin.updatedAt || '未知'}</span>
            </div>
          </div>

          <div className="plugin-detail-compatibility">
            <h4>兼容性</h4>
            <p>Kortina {plugin.compatibility.minVersion}
               {plugin.compatibility.maxVersion ? ` - ${plugin.compatibility.maxVersion}` : '+'}</p>
          </div>

          {plugin.homepage && <a href={plugin.homepage} target="_blank" rel="noopener noreferrer" className="plugin-homepage-link">
              <ExternalLink size={14} />
              访问插件主页
            </a>}
        </div>

        <div className="plugin-detail-actions">
          <button className="plugin-action-btn" onClick={onClose}>
            关闭
          </button>
          {isInstalled ? <button className="plugin-action-btn danger" onClick={onUninstall}>
              <Trash2 size={16} />
              卸载插件
            </button> : <button className="plugin-action-btn primary" onClick={onInstall} disabled={isInstalling}>
              {isInstalling ? <>
                  <RefreshCw size={16} className="spinning" />
                  {installProgress || '安装中...'}
                </> : <>
                  <Download size={16} />
                  安装插件
                </>}
            </button>}
        </div>
      </div>
    </div>;
};
const PluginsPanel = React.memo(PluginsPanelComponent);
export default PluginsPanel;
export { PluginsPanel };