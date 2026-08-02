import React, { useEffect, useState, useCallback } from 'react';
import { Palette, PanelTop, Code, RefreshCw, Download, CheckCircle } from 'lucide-react';
import { pluginManager } from './PluginManager';
import { MenuContribution, PanelContribution, ThemeContribution, GrammarContribution, PluginUpdateInfo } from './index';
export const PluginMenu: React.FC<{
  onCommand?: (command: string) => void;
}> = ({
  onCommand
}) => {
  const [menus, setMenus] = useState<MenuContribution[]>([]);
  useEffect(() => {
    const updateMenus = () => {
      const renderer = pluginManager.getContributionRenderer();
      setMenus(renderer.getMenuContributions());
    };
    updateMenus();
    const unsubscribe = pluginManager.getEvents().on('plugin-activated', updateMenus);
    const unsubscribe2 = pluginManager.getEvents().on('plugin-deactivated', updateMenus);
    return () => {
      unsubscribe.dispose();
      unsubscribe2.dispose();
    };
  }, []);
  if (menus.length === 0) return null;
  const handleMenuClick = (command?: string) => {
    if (command && onCommand) {
      onCommand(command);
    }
  };
  return <div className="plugin-menu-container">
      {menus.map(menu => <button key={menu.id} className="plugin-menu-item" onClick={() => handleMenuClick(menu.command)} title={menu.label}>
          {menu.icon && <span className="plugin-menu-icon">{menu.icon}</span>}
          <span>{menu.label}</span>
        </button>)}
    </div>;
};
export const PluginPanels: React.FC<{
  activePanelId?: string;
  onPanelSelect?: (id: string) => void;
}> = ({
  activePanelId,
  onPanelSelect
}) => {
  const [panels, setPanels] = useState<PanelContribution[]>([]);
  useEffect(() => {
    const updatePanels = () => {
      const renderer = pluginManager.getContributionRenderer();
      setPanels(renderer.getPanelContributions());
    };
    updatePanels();
    const unsubscribe = pluginManager.getEvents().on('plugin-activated', updatePanels);
    const unsubscribe2 = pluginManager.getEvents().on('plugin-deactivated', updatePanels);
    const unsubscribe3 = pluginManager.getEvents().on('plugin-contributions-changed', updatePanels);
    return () => {
      unsubscribe.dispose();
      unsubscribe2.dispose();
      unsubscribe3.dispose();
    };
  }, []);
  if (panels.length === 0) return null;
  return <div className="plugin-panels-container">
      {panels.map(panel => <button key={panel.id} className={`plugin-panel-tab ${activePanelId === panel.id ? 'active' : ''}`} onClick={() => onPanelSelect?.(panel.id)} title={panel.name}>
          {panel.icon ? <span className="plugin-panel-icon">{panel.icon}</span> : <PanelTop size={16} />}
          <span>{panel.name}</span>
        </button>)}
    </div>;
};
export const PluginPanelContent: React.FC<{
  panelId: string;
}> = ({
  panelId
}) => {
  const [panelMeta, setPanelMeta] = useState<PanelContribution | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const refresh = () => {
      const renderer = pluginManager.getContributionRenderer();
      const found = renderer.getPanelContributions().find(p => p.id === panelId) || null;
      setPanelMeta(found);
      setTick(v => v + 1);
    };
    refresh();
    const unsub1 = pluginManager.getEvents().on('plugin-activated', refresh);
    const unsub2 = pluginManager.getEvents().on('plugin-deactivated', refresh);
    const unsub3 = pluginManager.getEvents().on('plugin-panel-view-registered', refresh);
    const unsub4 = pluginManager.getEvents().on('plugin-panel-view-unregistered', refresh);
    const unsub5 = pluginManager.getEvents().on('plugin-contributions-changed', refresh);
    return () => {
      unsub1.dispose();
      unsub2.dispose();
      unsub3.dispose();
      unsub4.dispose();
      unsub5.dispose();
    };
  }, [panelId]);
  const view = pluginManager.getPanelView(panelId) || (panelMeta?.component ? pluginManager.getPanelView(panelMeta.component) : undefined);
  const pluginId = pluginManager.getPanelOwner(panelId);
  const plugin = pluginId ? pluginManager.getPlugin(pluginId) : undefined;
  if (!panelMeta) {
    return <div className="plugin-panel-content">
        <div className="plugin-panel-content-placeholder">
          <PanelTop size={32} />
          <p>未找到面板: {panelId}</p>
          <p className="hint">该面板贡献可能尚未激活或已被移除</p>
        </div>
      </div>;
  }
  if (view?.component) {
    const PanelComponent = view.component;
    return <div className="plugin-panel-content" key={`${panelId}-${tick}`}>
        <PanelComponent panelId={panelId} panel={panelMeta} pluginId={view.pluginId || pluginId} context={plugin?.context} />
      </div>;
  }
  return <div className="plugin-panel-content">
      <div className="plugin-panel-fallback">
        <div className="plugin-panel-fallback-header">
          <PanelTop size={18} />
          <div>
            <div className="plugin-panel-fallback-title">{panelMeta.name}</div>
            <div className="plugin-panel-fallback-id">{panelMeta.id}</div>
          </div>
        </div>
        <p className="hint">
          此面板尚未注册 React 视图。本地插件可在 activate 中调用
          {' '}
          <code>pluginManager.registerPanelView(&apos;{panelMeta.component || panelMeta.id}&apos;, Component)</code>
          {' '}
          接入真实内容。
        </p>
        {panelMeta.component && <p className="hint">component: {panelMeta.component}</p>}
        {pluginId && <p className="hint">来源插件: {plugin?.manifest.name || pluginId}</p>}
      </div>
    </div>;
};
export const PluginThemeSelector: React.FC<{
  currentTheme?: string;
  onThemeChange?: (themeId: string) => void;
}> = ({
  currentTheme,
  onThemeChange
}) => {
  const [themes, setThemes] = useState<ThemeContribution[]>([]);
  const [activeTheme, setActiveTheme] = useState(currentTheme || '');
  useEffect(() => {
    const updateThemes = () => {
      const renderer = pluginManager.getContributionRenderer();
      setThemes(renderer.getThemeContributions());
    };
    updateThemes();
    const unsubscribe = pluginManager.getEvents().on('plugin-activated', updateThemes);
    const unsubscribe2 = pluginManager.getEvents().on('plugin-deactivated', updateThemes);
    return () => {
      unsubscribe.dispose();
      unsubscribe2.dispose();
    };
  }, []);
  const handleThemeSelect = useCallback((themeId: string) => {
    const renderer = pluginManager.getContributionRenderer();
    if (renderer.applyTheme(themeId)) {
      setActiveTheme(themeId);
      onThemeChange?.(themeId);
      localStorage.setItem('active-plugin-theme', themeId);
    }
  }, [onThemeChange]);
  if (themes.length === 0) return null;
  return <div className="plugin-theme-selector">
      <div className="plugin-theme-header">
        <Palette size={16} />
        <span>插件主题</span>
      </div>
      <div className="plugin-theme-list">
        {themes.map(theme => <button key={theme.id} className={`plugin-theme-item ${activeTheme === theme.id ? 'active' : ''}`} onClick={() => handleThemeSelect(theme.id)}>
            <div className="theme-preview" style={{
          background: theme.colors['bg-primary'] || '#333',
          borderColor: theme.colors['text-primary'] || '#fff'
        }}>
              <span style={{
            color: theme.colors['text-primary'] || '#fff'
          }}>Aa</span>
            </div>
            <span className="theme-name">{theme.name}</span>
            <span className="theme-type">{theme.type}</span>
          </button>)}
      </div>
    </div>;
};
export const PluginUpdateButton: React.FC<{
  pluginId?: string;
  onUpdateComplete?: () => void;
}> = ({
  pluginId,
  onUpdateComplete
}) => {
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<PluginUpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const checkUpdates = async () => {
    setChecking(true);
    setError(null);
    try {
      if (pluginId) {
        const info = await pluginManager.checkForUpdates(pluginId);
        setUpdateInfo(info);
      } else {
        const updates = await pluginManager.checkAllUpdates();
        if (updates.length > 0) {
          setUpdateInfo(updates[0]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '检查更新失败');
    } finally {
      setChecking(false);
    }
  };
  const handleUpdate = async () => {
    if (!updateInfo) return;
    setUpdating(true);
    setError(null);
    try {
      const success = await pluginManager.updatePlugin(updateInfo.pluginId, updateInfo.downloadUrl, updateInfo.latestVersion);
      if (success) {
        setUpdateInfo(null);
        onUpdateComplete?.();
      } else {
        setError('更新失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
    } finally {
      setUpdating(false);
    }
  };
  return <div className="plugin-update-button">
      <button className="plugin-action-btn secondary" onClick={checkUpdates} disabled={checking || updating} title="检查更新">
        {checking ? <RefreshCw size={14} className="spinning" /> : <RefreshCw size={14} />}
        {checking ? '检查中...' : '检查更新'}
      </button>
      
      {updateInfo && <div className="plugin-update-info">
          <div className="update-available">
            <Download size={14} />
            <span>新版本可用: v{updateInfo.latestVersion}</span>
            {updateInfo.releaseNotes && <p className="release-notes">{updateInfo.releaseNotes}</p>}
          </div>
          <button className="plugin-action-btn primary" onClick={handleUpdate} disabled={updating}>
            {updating ? <>
                <RefreshCw size={14} className="spinning" />
                更新中...
              </> : <>
                <Download size={14} />
                更新到 v{updateInfo.latestVersion}
              </>}
          </button>
        </div>}
      
      {error && <div className="plugin-update-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>关闭</button>
        </div>}
    </div>;
};
export const GrammarRegistration: React.FC<{
  registerGrammar?: (grammar: GrammarContribution) => void;
}> = ({
  registerGrammar
}) => {
  const [grammars, setGrammars] = useState<GrammarContribution[]>([]);
  useEffect(() => {
    const renderer = pluginManager.getContributionRenderer();
    const unsubscribe = renderer.onGrammarRegistered(grammar => {
      setGrammars(prev => {
        if (prev.some(g => g.language === grammar.language)) return prev;
        return [...prev, grammar];
      });
      registerGrammar?.(grammar);
    });
    setGrammars(renderer.getGrammarContributions());
    return () => unsubscribe.dispose();
  }, [registerGrammar]);
  const handleRegisterWithMonaco = useCallback(async (grammar: GrammarContribution) => {
    try {
      const monaco = await import('monaco-editor');
      const languages = monaco.languages.getLanguages();
      if (!languages.some(l => l.id === grammar.language)) {
        monaco.languages.register({
          id: grammar.language
        });
      }
      console.log(`[GrammarRegistration] Registered grammar for: ${grammar.language}`);
    } catch (error) {
      console.error('[GrammarRegistration] Failed to register grammar with Monaco:', error);
    }
  }, []);
  useEffect(() => {
    grammars.forEach(grammar => {
      handleRegisterWithMonaco(grammar);
    });
  }, [grammars, handleRegisterWithMonaco]);
  if (grammars.length === 0) return null;
  return <div className="grammar-registration-status">
      <div className="grammar-header">
        <Code size={14} />
        <span>语法高亮扩展</span>
      </div>
      <div className="grammar-list">
        {grammars.map(grammar => <div key={grammar.language} className="grammar-item">
            <CheckCircle size={12} className="grammar-registered" />
            <span>{grammar.language}</span>
            <span className="grammar-scope">{grammar.scopeName}</span>
          </div>)}
      </div>
    </div>;
};
export const PluginContributions: React.FC<{
  onMenuCommand?: (command: string) => void;
  activePanelId?: string;
  onPanelSelect?: (id: string) => void;
  currentTheme?: string;
  onThemeChange?: (themeId: string) => void;
  onUpdateComplete?: () => void;
}> = ({
  onMenuCommand,
  activePanelId,
  onPanelSelect,
  currentTheme,
  onThemeChange,
  onUpdateComplete
}) => {
  return <>
      <PluginMenu onCommand={onMenuCommand} />
      <PluginPanels activePanelId={activePanelId} onPanelSelect={onPanelSelect} />
      <PluginThemeSelector currentTheme={currentTheme} onThemeChange={onThemeChange} />
      <PluginUpdateButton onUpdateComplete={onUpdateComplete} />
    </>;
};