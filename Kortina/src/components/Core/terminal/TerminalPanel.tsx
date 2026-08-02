import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Plus, ChevronDown, Terminal, Command, Power, Shell, Trash2, Star, LayoutGrid, Eye, EyeOff, PanelRight, PanelTop } from 'lucide-react';
import { XtermTerminal } from './XtermTerminal';
import { useTerminalStore } from '../../../stores/TerminalStore';
import { ShellType } from '../../../services/TerminalService';
import { getShellProfiles, getShellProfilesForPlatform, getPlatform, ShellProfile } from '../../../services/terminal-profiles';
import { ITerminalInstance } from '../../../services/TerminalInstance';
import './TerminalPanel.css';
interface TerminalPanelProps {
  isOpen: boolean;
  height: number;
  onClose: () => void;
}
const SHELL_ICONS: Record<string, React.ReactNode> = {
  powershell: <Power size={12} />,
  cmd: <Command size={12} />,
  bash: <Shell size={12} />,
  zsh: <Shell size={12} />,
  fish: <Shell size={12} />,
  sh: <Shell size={12} />,
  wsl: <Terminal size={12} />
};
const DEFAULT_VERTICAL_TABS_WIDTH = 168;
const MIN_VERTICAL_TABS_WIDTH = 168;
const MAX_VERTICAL_TABS_WIDTH = 400;
const MIN_TERMINAL_CONTENT_WIDTH = 240;
const TerminalPanelComponent: React.FC<TerminalPanelProps> = ({
  isOpen,
  height,
  onClose
}) => {
  const {
    groups,
    activeInstance,
    defaultShellType,
    isCreating,
    isStatusBarVisible,
    isTabsVertical,
    verticalTabsWidth,
    createTerminal,
    closeInstance,
    closeAllInstances,
    setActiveInstance,
    setDefaultShellType,
    toggleStatusBar,
    toggleTabsVertical,
    setVerticalTabsWidth
  } = useTerminalStore();
  const instances = groups.reduce((acc, group) => acc.concat(group.terminalInstances), [] as ITerminalInstance[]);
  const [showShellSelector, setShowShellSelector] = useState(false);
  const [shellSelectorClosing, setShellSelectorClosing] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [actionsMenuClosing, setActionsMenuClosing] = useState(false);
  const [isResizingTabs, setIsResizingTabs] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabsResizeStartXRef = useRef(0);
  const tabsResizeStartWidthRef = useRef(0);
  const tabsResizeScaleRef = useRef(1);
  const platform = getPlatform();
  const [profiles, setProfiles] = useState<ShellProfile[]>(() => getShellProfilesForPlatform(platform));
  useEffect(() => {
    let cancelled = false;
    getShellProfiles().then(detected => {
      if (!cancelled && detected.length > 0) {
        setProfiles(detected);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const handleCreateTerminal = useCallback(async (shellType?: ShellType) => {
    const type = shellType ?? defaultShellType;
    await createTerminal(type);
    setShowShellSelector(false);
  }, [createTerminal, defaultShellType]);
  const handleCloseTab = useCallback(async (e: React.MouseEvent, instance: ITerminalInstance) => {
    e.stopPropagation();
    await closeInstance(instance);
  }, [closeInstance]);
  const handleSelectShell = useCallback((type: ShellType) => {
    handleCreateTerminal(type);
  }, [handleCreateTerminal]);
  const handleSetDefault = useCallback((e: React.MouseEvent, type: ShellType) => {
    e.stopPropagation();
    setDefaultShellType(type);
  }, [setDefaultShellType]);
  const handleClearTerminal = useCallback(() => {
    activeInstance?.clear();
    setShowActionsMenu(false);
  }, [activeInstance]);
  const handleCloseAll = useCallback(() => {
    closeAllInstances();
    setShowActionsMenu(false);
  }, [closeAllInstances]);
  const handleToggleStatusBar = useCallback(() => {
    toggleStatusBar();
    setShowActionsMenu(false);
  }, [toggleStatusBar]);
  const handleTabsResizeStart = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    tabsResizeStartXRef.current = event.clientX;
    tabsResizeStartWidthRef.current = verticalTabsWidth;
    const panel = panelRef.current;
    const rect = panel?.getBoundingClientRect();
    tabsResizeScaleRef.current = panel && panel.offsetWidth > 0 && rect && rect.width > 0 ? rect.width / panel.offsetWidth : 1;
    setIsResizingTabs(true);
  }, [verticalTabsWidth]);
  const handleTabsResizeReset = useCallback(() => {
    setVerticalTabsWidth(DEFAULT_VERTICAL_TABS_WIDTH);
  }, [setVerticalTabsWidth]);
  const handleTabsResizeKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 24 : 8;
    let nextWidth = verticalTabsWidth;
    if (event.key === 'ArrowLeft') nextWidth += step;else if (event.key === 'ArrowRight') nextWidth -= step;else if (event.key === 'Home') nextWidth = DEFAULT_VERTICAL_TABS_WIDTH;else return;
    event.preventDefault();
    const panelWidth = panelRef.current?.offsetWidth ?? 640;
    const maxWidth = Math.min(MAX_VERTICAL_TABS_WIDTH, Math.max(MIN_VERTICAL_TABS_WIDTH, panelWidth - MIN_TERMINAL_CONTENT_WIDTH));
    setVerticalTabsWidth(Math.max(MIN_VERTICAL_TABS_WIDTH, Math.min(maxWidth, nextWidth)));
  }, [setVerticalTabsWidth, verticalTabsWidth]);
  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as Node;
    const clickedInSelector = selectorRef.current?.contains(target);
    const clickedInActions = actionsRef.current?.contains(target);
    if (!clickedInSelector && showShellSelector && !shellSelectorClosing) {
      setShellSelectorClosing(true);
      setTimeout(() => {
        setShowShellSelector(false);
        setShellSelectorClosing(false);
      }, 150);
    }
    if (!clickedInActions && showActionsMenu && !actionsMenuClosing) {
      setActionsMenuClosing(true);
      setTimeout(() => {
        setShowActionsMenu(false);
        setActionsMenuClosing(false);
      }, 150);
    }
  }, [showShellSelector, shellSelectorClosing, showActionsMenu, actionsMenuClosing]);
  useEffect(() => {
    if (showShellSelector || showActionsMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showShellSelector, showActionsMenu, handleClickOutside]);
  useEffect(() => {
    if (!isOpen) {
      setShowShellSelector(false);
      setShowActionsMenu(false);
      setIsResizingTabs(false);
    }
  }, [isOpen]);
  useEffect(() => {
    if (!isResizingTabs) return;
    const handleMouseMove = (event: MouseEvent) => {
      const panel = panelRef.current;
      const scale = tabsResizeScaleRef.current || 1;
      const delta = (tabsResizeStartXRef.current - event.clientX) / scale;
      const panelWidth = panel?.offsetWidth ?? 640;
      const maxWidth = Math.min(MAX_VERTICAL_TABS_WIDTH, Math.max(MIN_VERTICAL_TABS_WIDTH, panelWidth - MIN_TERMINAL_CONTENT_WIDTH));
      const nextWidth = Math.max(MIN_VERTICAL_TABS_WIDTH, Math.min(maxWidth, tabsResizeStartWidthRef.current + delta));
      setVerticalTabsWidth(nextWidth);
    };
    const handleMouseUp = () => setIsResizingTabs(false);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingTabs, setVerticalTabsWidth]);
  useEffect(() => {
    if (!isOpen) return;
    const content = contentRef.current;
    if (!content) return;
    const rect = content.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      instances.forEach(instance => {
        instance.layout({
          width: rect.width,
          height: rect.height
        });
      });
    }
  }, [isOpen, height, isStatusBarVisible, isTabsVertical, verticalTabsWidth, instances]);
  useEffect(() => {
    if (!activeInstance || !tabsRef.current) return;
    const activeTab = tabsRef.current.querySelector(`[data-terminal-id="${activeInstance.instanceId}"]`) as HTMLElement;
    if (activeTab) {
      activeTab.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [activeInstance?.instanceId, isTabsVertical]);
  if (!isOpen) return null;
  const renderTerminalTabs = (vertical: boolean) => <div className={`terminal-tabs${vertical ? ' terminal-tabs-vertical' : ''}`} ref={tabsRef}>
      {instances.map(instance => <div key={instance.instanceId} data-terminal-id={instance.instanceId} className={`terminal-tab ${activeInstance?.instanceId === instance.instanceId ? 'active' : ''}`} onClick={() => setActiveInstance(instance)} title={instance.title}>
          <span className="terminal-tab-icon">{SHELL_ICONS[instance.shellType] ?? <Terminal size={12} />}</span>
          <span className="terminal-tab-label">{instance.title}</span>
          <button className="terminal-tab-close" onClick={e => handleCloseTab(e, instance)} title="关闭终端">
            <X size={12} />
          </button>
        </div>)}
    </div>;
  const renderTerminalActions = () => <div className="terminal-panel-actions">
      <div className="terminal-add-wrapper" ref={selectorRef}>
        <button className="terminal-add-btn" onClick={() => handleCreateTerminal()} disabled={isCreating} title={`新建 ${profiles.find(p => p.id === defaultShellType)?.name ?? '终端'}`}>
          <Plus size={14} />
        </button>
        <button className="terminal-add-btn terminal-shell-trigger" onClick={e => {
        e.stopPropagation();
        setShowShellSelector(!showShellSelector);
      }} disabled={isCreating} title="选择 Shell 类型">
          <ChevronDown size={12} />
        </button>

        {showShellSelector && <div className={`terminal-shell-selector${shellSelectorClosing ? ' closing' : ''}`}>
            <div className="terminal-shell-selector-header">选择默认配置文件</div>
            {profiles.map(profile => <ShellOption key={profile.id} profile={profile} isDefault={profile.id === defaultShellType} onSelect={() => handleSelectShell(profile.id)} onSetDefault={e => handleSetDefault(e, profile.id)} />)}
          </div>}
      </div>

      <button className="terminal-action-btn terminal-tab-layout-toggle" onClick={toggleTabsVertical} title={isTabsVertical ? '切换为水平标签' : '切换为垂直标签'} aria-label={isTabsVertical ? '切换为水平标签' : '切换为垂直标签'} aria-pressed={isTabsVertical}>
        {isTabsVertical ? <PanelTop size={14} /> : <PanelRight size={14} />}
      </button>

      <div className="terminal-actions-wrapper" ref={actionsRef}>
        <button className="terminal-action-btn terminal-actions-trigger" onClick={() => setShowActionsMenu(!showActionsMenu)} title="更多操作">
          <LayoutGrid size={14} />
        </button>

        {showActionsMenu && <div className={`terminal-actions-menu${actionsMenuClosing ? ' closing' : ''}`}>
            <button className="terminal-action-menu-item" onClick={handleClearTerminal}>
              <Trash2 size={14} />
              <span>清除终端</span>
            </button>
            <button className="terminal-action-menu-item" onClick={handleToggleStatusBar}>
              {isStatusBarVisible ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{isStatusBarVisible ? '隐藏状态栏' : '显示状态栏'}</span>
            </button>
            <button className="terminal-action-menu-item" onClick={handleCloseAll}>
              <X size={14} />
              <span>关闭所有终端</span>
            </button>
          </div>}
      </div>

      <button className="terminal-panel-close" onClick={onClose} title="关闭面板">
        <X size={16} />
      </button>
    </div>;
  return <div className={`terminal-panel${isResizingTabs ? ' resizing-tabs' : ''}`} style={{
    height
  }} ref={panelRef}>
      {!isTabsVertical && <div className="terminal-panel-header">
          {renderTerminalTabs(false)}
          {renderTerminalActions()}
        </div>}

      <div className="terminal-main">
        <div className="terminal-workspace">
          <div className="terminal-content" ref={contentRef}>
            {instances.length > 0 ? instances.map(instance => <div key={instance.instanceId} className={`terminal-instance-container ${activeInstance?.instanceId === instance.instanceId ? 'active' : ''}`}>
                  <XtermTerminal instance={instance} active={activeInstance?.instanceId === instance.instanceId} />
                </div>) : <div className="terminal-empty">
                <Terminal size={48} />
                <p>没有活动的终端会话</p>
                <button className="terminal-create-btn" onClick={() => handleCreateTerminal()} disabled={isCreating}>
                  {isCreating ? '创建中...' : '新建终端'}
                </button>
              </div>}
          </div>

          {isStatusBarVisible && <div className="terminal-statusbar">
              {activeInstance && <>
                  <span className="terminal-status-item">{activeInstance.title}</span>
                  <span className="terminal-status-item terminal-status-right">
                    {instances.length} 个会话
                  </span>
                </>}
            </div>}
        </div>

        {isTabsVertical && <>
            <div className="terminal-tabs-resize-handle" role="separator" tabIndex={0} aria-orientation="vertical" aria-label="调整终端标签栏宽度" aria-valuemin={MIN_VERTICAL_TABS_WIDTH} aria-valuemax={MAX_VERTICAL_TABS_WIDTH} aria-valuenow={verticalTabsWidth} title="拖拽调整标签栏宽度，双击恢复默认" onMouseDown={handleTabsResizeStart} onDoubleClick={handleTabsResizeReset} onKeyDown={handleTabsResizeKeyDown} />
            <aside className="terminal-vertical-sidebar" style={{
          width: verticalTabsWidth,
          flexBasis: verticalTabsWidth
        }} aria-label="终端实例">
              <div className="terminal-vertical-sidebar-header">
                {renderTerminalActions()}
              </div>
              {renderTerminalTabs(true)}
            </aside>
          </>}
      </div>
    </div>;
};
interface ShellOptionProps {
  profile: ShellProfile;
  isDefault: boolean;
  onSelect: () => void;
  onSetDefault: (e: React.MouseEvent) => void;
}
const ShellOption: React.FC<ShellOptionProps> = ({
  profile,
  isDefault,
  onSelect,
  onSetDefault
}) => {
  return <div className="terminal-shell-option">
      <button className="terminal-shell-info" onClick={onSelect}>
        {SHELL_ICONS[profile.id] ?? <Terminal size={14} />}
        <span className="terminal-shell-label">{profile.name}</span>
      </button>
      <button className={`terminal-shell-default-btn ${isDefault ? 'active' : ''}`} onClick={onSetDefault} title={isDefault ? '默认 Shell' : '设为默认 Shell'}>
        <Star size={12} />
      </button>
    </div>;
};
const TerminalPanel = React.memo(TerminalPanelComponent);
export default TerminalPanel;
export { TerminalPanel };