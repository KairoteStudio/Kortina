import React, { useRef } from 'react';
import { ArrowUp, AtSign, Bot, Plus, X } from 'lucide-react';
import { useUISettingsStore } from '../../stores';
import { useFleetResize } from '../../hooks/useFleetResize';

interface FleetWorkspacePageProps {
  titleBar: React.ReactNode;
  leftPanel: React.ReactNode;
  leftPanelCollapsed?: boolean;
  editorPanel: React.ReactNode;
  terminalPanel?: React.ReactNode;
  statusBar: React.ReactNode;
  currentProjectName?: string;
  onToggleAiPanel?: () => void;
}

function FleetAssistantMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <path
        d="M17 4c7 0 13 5.8 13 13s-5.8 13-13 13c-4 0-6.5-2-6.5-5 0-2.6 2-4.2 4.6-4.2 2.2 0 3.6 1.2 3.6 3 0 1.2-.7 2-1.7 2"
        stroke="#c99a5b"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M17 30c-7 0-13-5.8-13-13S9.8 4 17 4c4 0 6.5 2 6.5 5 0 2.6-2 4.2-4.6 4.2-2.2 0-3.6-1.2-3.6-3 0-1.2.7-2 1.7-2"
        stroke="#c99a5b"
        strokeLinecap="round"
        strokeWidth="1.8"
        opacity="0.5"
      />
    </svg>
  );
}

function FleetKey({ children }: { children: React.ReactNode }) {
  return <span className="fleet-ai-key">{children}</span>;
}

function FleetAiHint({
  keys,
  title,
  hint,
}: {
  keys: string[];
  title: string;
  hint: string;
}) {
  return (
    <div className="fleet-ai-hint">
      <div className="fleet-ai-keys">
        {keys.map(key => (
          <FleetKey key={key}>{key}</FleetKey>
        ))}
      </div>
      <div>
        <span className="fleet-ai-hint-title">{title}</span>
        <span className="fleet-ai-hint-copy"> {hint}</span>
      </div>
    </div>
  );
}

function FleetAssistantPanel({ currentProjectName = 'Kortina', onClose }: { currentProjectName?: string; onClose?: () => void }) {
  return (
    <aside className="fleet-ai-panel" aria-label="Fleet AI Assistant">
      <div className="fleet-ai-header">
        <div className="fleet-ai-tab">
          <Bot size={15} strokeWidth={1.8} />
          <span>AI Assistant</span>
          <button type="button" className="fleet-ai-tab-close" aria-label="关闭 AI Assistant" onClick={onClose}>
            <X size={14} strokeWidth={2} />
          </button>
        </div>
        <button type="button" className="fleet-ai-add" aria-label="新建 AI 对话">
          <Plus size={16} strokeWidth={2} />
        </button>
      </div>

      <div className="fleet-ai-body">
        <FleetAssistantMark />
        <h2>AI Assistant</h2>
        <p>Ask AI Assistant about {currentProjectName}, the current file, terminal output, or try other AI actions.</p>
        <div className="fleet-ai-hints">
          <FleetAiHint keys={['⌘', '.']} title="Ask AI" hint="Editor & Terminal" />
          <FleetAiHint keys={['⌥', '⏎']} title="AI Actions" hint="Editor" />
          <FleetAiHint keys={['/']} title="AI Commands" hint="Chat" />
        </div>
      </div>

      <div className="fleet-ai-input-wrap">
        <div className="fleet-ai-input">
          <input type="text" placeholder="Ask AI Assistant. Use ⌥↑ for history." aria-label="Ask AI Assistant" />
          <AtSign size={16} strokeWidth={1.75} />
          <button type="button" aria-label="发送">
            <ArrowUp size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export const FleetWorkspacePage: React.FC<FleetWorkspacePageProps> = ({
  titleBar,
  leftPanel,
  leftPanelCollapsed = false,
  editorPanel,
  terminalPanel,
  statusBar,
  currentProjectName,
  onToggleAiPanel,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const { fleetSidebarWidth, fleetAiPanelWidth, fleetAiPanelVisible, fleetTerminalHeight } = useUISettingsStore();
  const { beginSidebarResize, beginAiPanelResize, beginTerminalResize, isDragging, activeHandle } = useFleetResize({ gridRef });

  const gridStyle: React.CSSProperties = {
    '--fleet-sidebar-w': `${fleetSidebarWidth}px`,
    '--fleet-ai-w': `${fleetAiPanelWidth}px`,
  } as React.CSSProperties;

  const terminalStyle: React.CSSProperties = terminalPanel
    ? { height: `${fleetTerminalHeight}px` }
    : {};

  const gridClasses = [
    'fleet-island-grid',
    leftPanelCollapsed ? 'sidebar-collapsed' : '',
    !fleetAiPanelVisible ? 'ai-panel-hidden' : '',
    isDragging ? 'is-resizing' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="fleet-workspace-page">
      {titleBar}
      <div
        ref={gridRef}
        className={gridClasses}
        style={gridStyle}
      >
        {!leftPanelCollapsed ? (
          <>
            {leftPanel}
            <div
              className={`fleet-resize-handle fleet-resize-handle-horizontal fleet-resize-handle-sidebar ${activeHandle === 'sidebar' ? 'dragging' : ''}`}
              onMouseDown={beginSidebarResize}
              role="separator"
              aria-label="调整侧边栏宽度"
            />
          </>
        ) : null}
        <section className="fleet-center-stack" aria-label="Fleet editor workspace">
          <div className="fleet-editor-island">{editorPanel}</div>
          {terminalPanel ? (
            <>
              <div
                className={`fleet-resize-handle fleet-resize-handle-terminal ${activeHandle === 'terminal' ? 'dragging' : ''}`}
                onMouseDown={beginTerminalResize}
                role="separator"
                aria-label="调整终端高度"
              />
              <div className="fleet-terminal-island" style={terminalStyle}>{terminalPanel}</div>
            </>
          ) : null}
        </section>
        {fleetAiPanelVisible ? (
          <>
            <div
              className={`fleet-resize-handle fleet-resize-handle-horizontal fleet-resize-handle-ai ${activeHandle === 'ai' ? 'dragging' : ''} ${leftPanelCollapsed ? 'sidebar-collapsed' : ''}`}
              onMouseDown={beginAiPanelResize}
              role="separator"
              aria-label="调整 AI 面板宽度"
            />
            <FleetAssistantPanel currentProjectName={currentProjectName} onClose={onToggleAiPanel} />
          </>
        ) : null}
      </div>
      {statusBar}
    </div>
  );
};

export default FleetWorkspacePage;
