import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Settings, GitBranch, Layers, Terminal, ChevronRight, ChevronLeft, Search, Bug, PanelTop, Menu, X, History } from 'lucide-react';
import { KortinaLogo } from '../KortinaLogo';
import { pluginManager } from '../../../plugins/PluginManager';
import type { PanelContribution } from '../../../plugins/index';
import { toPluginPanelViewId } from '../../../plugins/PluginPanelHost';
import { isMobile } from '../../../utils/environment';
import './Sidebar.css';
interface SidebarProps {
  width: number;
  onToggle: () => void;
  isCollapsed: boolean;
  currentView: string;
  onViewChange: (view: string) => void;
  isTerminalOpen?: boolean;
  onTerminalToggle?: () => void;
  isSettingsOpen?: boolean;
  onSettingsToggle?: () => void;
}
export const Sidebar: React.FC<SidebarProps> = ({
  width,
  onToggle,
  isCollapsed,
  currentView,
  onViewChange,
  isTerminalOpen,
  onTerminalToggle,
  isSettingsOpen,
  onSettingsToggle
}) => {
  const [pluginPanels, setPluginPanels] = useState<PanelContribution[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobile = useMemo(() => isMobile(), []);
  useEffect(() => {
    const refresh = () => {
      setPluginPanels(pluginManager.getContributionRenderer().getPanelContributions());
    };
    refresh();
    const u1 = pluginManager.getEvents().on('plugin-activated', refresh);
    const u2 = pluginManager.getEvents().on('plugin-deactivated', refresh);
    const u3 = pluginManager.getEvents().on('plugin-contributions-changed', refresh);
    return () => {
      u1.dispose();
      u2.dispose();
      u3.dispose();
    };
  }, []);
  const mainMenuItems = [{
    id: 'explorer',
    icon: Layers,
    label: '资源管理器'
  }, {
    id: 'search',
    icon: Search,
    label: '搜索'
  }, {
    id: 'git',
    icon: GitBranch,
    label: '版本控制'
  }, {
    id: 'history',
    icon: History,
    label: '历史'
  }, {
    id: 'debug',
    icon: Bug,
    label: '调试'
  }];
  const bottomMenuItems = [{
    id: 'terminal',
    icon: Terminal,
    label: '终端',
    isToggle: true
  }, {
    id: 'settings',
    icon: Settings,
    label: '设置',
    isToggle: true
  }];
  const handleMenuClick = useCallback((item: {
    id: string;
    isToggle?: boolean;
  }) => {
    if (item.isToggle && item.id === 'terminal' && onTerminalToggle) {
      onTerminalToggle();
    } else if (item.isToggle && item.id === 'settings' && onSettingsToggle) {
      onSettingsToggle();
    } else if (!item.isToggle) {
      onViewChange(item.id);
    }
    if (mobile) {
      setMobileMenuOpen(false);
    }
  }, [mobile, onTerminalToggle, onSettingsToggle, onViewChange]);
  const handlePluginClick = useCallback((viewId: string) => {
    onViewChange(viewId);
    if (mobile) {
      setMobileMenuOpen(false);
    }
  }, [mobile, onViewChange]);
  const isBottomItemActive = (itemId: string): boolean => {
    if (itemId === 'terminal' && isTerminalOpen) {
      return true;
    }
    if (itemId === 'settings' && isSettingsOpen) {
      return true;
    }
    return false;
  };
  const sidebarStyle = useMemo(() => ({
    '--sidebar-width': `${width}px`
  }) as React.CSSProperties, [width, isCollapsed]);

  
  if (mobile) {
    return <>
      <button
        className="mobile-sidebar-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      {mobileMenuOpen && <div className="mobile-sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />}
      <div className={`sidebar mobile ${mobileMenuOpen ? 'open' : 'collapsed'} ${isCollapsed ? 'collapsed' : ''}`} style={sidebarStyle}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <KortinaLogo size={18} />
            <span className="sidebar-title">Kortina</span>
          </div>
          <button className="sidebar-toggle" onClick={() => setMobileMenuOpen(false)} title="关闭">
            <X size={16} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {mainMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return <button key={item.id} className={`sidebar-item ${isActive ? 'active' : ''}`} onClick={() => handleMenuClick(item)} title={item.label}>
                <Icon size={20} />
                <span className="sidebar-item-label">{item.label}</span>
                {isActive && <ChevronRight size={14} className="sidebar-indicator" />}
              </button>;
          })}

          {pluginPanels.length > 0 && <div className="sidebar-plugin-section">
              <div className="sidebar-section-label">插件面板</div>
              {pluginPanels.map(panel => {
                const viewId = toPluginPanelViewId(panel.id);
                const isActive = currentView === viewId;
                return <button key={panel.id} className={`sidebar-item ${isActive ? 'active' : ''}`} onClick={() => handlePluginClick(viewId)} title={panel.name}>
                    <PanelTop size={20} />
                    <span className="sidebar-item-label">{panel.name}</span>
                    {isActive && <ChevronRight size={14} className="sidebar-indicator" />}
                  </button>;
              })}
            </div>}
        </nav>

        <div className="sidebar-footer">
          {bottomMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = isBottomItemActive(item.id);
            return <button key={item.id} className={`sidebar-item ${isActive ? 'active' : ''}`} onClick={() => handleMenuClick(item)} title={item.label}>
                <Icon size={20} />
                <span className="sidebar-item-label">{item.label}</span>
              </button>;
          })}
        </div>
      </div>
    </>;
  }

  return <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} style={sidebarStyle}>
      <div className="sidebar-header">
        {!isCollapsed && <div className="sidebar-logo">
            <KortinaLogo size={18} />
            <span className="sidebar-title">Kortina</span>
          </div>}
        <button className={`sidebar-toggle ${isCollapsed ? 'collapsed' : ''}`} onClick={onToggle} title={isCollapsed ? '展开侧栏' : '收起侧栏'}>
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {mainMenuItems.map(item => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return <button key={item.id} className={`sidebar-item ${isActive ? 'active' : ''}`} onClick={() => handleMenuClick(item)} title={item.label}>
              <Icon size={18} />
              {!isCollapsed && <span className="sidebar-item-label">{item.label}</span>}
              {!isCollapsed && isActive && <ChevronRight size={14} className="sidebar-indicator" />}
            </button>;
      })}

        {pluginPanels.length > 0 && <div className="sidebar-plugin-section">
            {!isCollapsed && <div className="sidebar-section-label">插件面板</div>}
            {pluginPanels.map(panel => {
          const viewId = toPluginPanelViewId(panel.id);
          const isActive = currentView === viewId;
          return <button key={panel.id} className={`sidebar-item ${isActive ? 'active' : ''}`} onClick={() => handlePluginClick(viewId)} title={panel.name}>
                  <PanelTop size={18} />
                  {!isCollapsed && <span className="sidebar-item-label">{panel.name}</span>}
                  {!isCollapsed && isActive && <ChevronRight size={14} className="sidebar-indicator" />}
                </button>;
        })}
          </div>}
      </nav>

      <div className="sidebar-footer">
        {bottomMenuItems.map(item => {
        const Icon = item.icon;
        const isActive = isBottomItemActive(item.id);
        return <button key={item.id} className={`sidebar-item ${isActive ? 'active' : ''}`} onClick={() => handleMenuClick(item)} title={item.label}>
              <Icon size={18} />
              {!isCollapsed && <span className="sidebar-item-label">{item.label}</span>}
            </button>;
      })}
      </div>
    </div>;
};
export default Sidebar;
