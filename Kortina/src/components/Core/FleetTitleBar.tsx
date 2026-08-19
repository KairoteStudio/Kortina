import React from 'react';
import {
  PanelLeft,
  PanelBottom,
  PanelRight,
  LayoutGrid,
  UserPlus,
  Zap,
  Play,
  Search,
  Bell,
  Settings,
} from 'lucide-react';
import { WindowControls } from './WindowControls';

interface FleetTitleBarProps {
  projectName?: string;
  branchName?: string;
  onToggleSidebar?: () => void;
  onToggleTerminal?: () => void;
  onToggleAiPanel?: () => void;
  isAiPanelVisible?: boolean;
  onOpenSettings?: () => void;
  onRunProject?: () => void;
  onSearch?: () => void;
}

function IconButton({
  children,
  onClick,
  title,
  active = false,
  pressed,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      className={`fleet-icon-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      title={title}
      aria-pressed={pressed}
    >
      {children}
    </button>
  );
}

export const FleetTitleBar: React.FC<FleetTitleBarProps> = ({
  projectName = 'Kortina',
  branchName = 'main',
  onToggleSidebar,
  onToggleTerminal,
  onToggleAiPanel,
  isAiPanelVisible = true,
  onOpenSettings,
  onRunProject,
  onSearch,
}) => {
  return (
    <header className="fleet-titlebar" data-tauri-drag-region>
      <div className="fleet-titlebar-left" data-tauri-drag-region>
        <WindowControls />
        <div className="fleet-icon-group">
          <IconButton onClick={onToggleSidebar} title="切换侧边栏">
            <PanelLeft size={18} strokeWidth={1.5} />
          </IconButton>
          <IconButton onClick={onToggleTerminal} title="切换终端">
            <PanelBottom size={18} strokeWidth={1.5} />
          </IconButton>
          <IconButton
            onClick={onToggleAiPanel}
            title={isAiPanelVisible ? '隐藏 AI 面板' : '显示 AI 面板'}
            active={isAiPanelVisible}
            pressed={isAiPanelVisible}
          >
            <PanelRight size={18} strokeWidth={1.5} />
          </IconButton>
        </div>
        <div className="fleet-icon-group">
          <IconButton title="布局">
            <LayoutGrid size={18} strokeWidth={1.5} />
          </IconButton>
          <IconButton title="协作者">
            <UserPlus size={18} strokeWidth={1.5} />
          </IconButton>
        </div>
      </div>

      <div className="fleet-titlebar-center" data-tauri-drag-region>
        <span className="fleet-titlebar-project">{projectName}</span>
        <div className="fleet-titlebar-branch">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 3v6a3 3 0 0 0 3 3h5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path d="M10 9.5 12.5 12 10 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="4" cy="3" r="1.6" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          <span>{branchName}</span>
        </div>
      </div>

      <div className="fleet-titlebar-right" data-tauri-drag-region>
        <IconButton onClick={onRunProject} title="运行项目">
          <Zap size={18} strokeWidth={1.5} />
        </IconButton>
        <IconButton onClick={onRunProject} title="编译运行">
          <Play size={18} strokeWidth={1.5} />
        </IconButton>
        <IconButton onClick={onSearch} title="搜索">
          <Search size={18} strokeWidth={1.5} />
        </IconButton>
        <IconButton title="通知">
          <Bell size={18} strokeWidth={1.5} />
        </IconButton>
        <IconButton onClick={onOpenSettings} title="设置">
          <Settings size={18} strokeWidth={1.5} />
        </IconButton>
      </div>
    </header>
  );
};
