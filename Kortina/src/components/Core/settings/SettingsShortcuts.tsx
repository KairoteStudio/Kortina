import React from 'react';
import { X, Check } from 'lucide-react';
interface SettingsShortcutsProps {
  shortcuts: Record<string, string>;
  shortcutNames: Record<string, string>;
  editingShortcut: string | null;
  tempShortcut: string;
  startEditingShortcut: (action: string, currentKeys: string) => void;
  cancelEditingShortcut: () => void;
  saveShortcut: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}
const shortcutSections: Array<{
  title: string;
  actions: string[];
}> = [{
  title: '文件操作',
  actions: ['newFile', 'openFile', 'saveFile', 'saveAs', 'exit']
}, {
  title: '编辑操作',
  actions: ['undo', 'redo', 'copy', 'cut', 'paste', 'selectAll', 'find', 'replace']
}, {
  title: '视图操作',
  actions: ['toggleExplorer', 'toggleVcs', 'toggleSidebar', 'toggleConsole', 'toggleFullscreen', 'zoomIn', 'zoomOut', 'resetZoom']
}, {
  title: '导航与代码',
  actions: ['goBack', 'goForward', 'goToDefinition', 'goToDeclaration', 'goToImplementation', 'formatDocument', 'toggleLineComment', 'toggleBlockComment', 'triggerSuggest', 'quickFix', 'renameSymbol', 'extractFunction', 'extractVariable', 'inlineVariable']
}, {
  title: '构建与运行',
  actions: ['compile', 'rebuild', 'clean', 'run', 'debug', 'stop']
}, {
  title: '工具与 VCS',
  actions: ['settings', 'commit', 'push', 'pull']
}, {
  title: '标签页',
  actions: ['closeTab', 'nextTab', 'prevTab']
}, {
  title: '资源管理器',
  actions: ['explorerNewFile', 'explorerNewFolder', 'explorerDelete']
}, {
  title: '窗口与帮助',
  actions: ['newWindow', 'closeWindow', 'minimize', 'documentation', 'keyboardShortcuts']
}];
export const SettingsShortcuts: React.FC<SettingsShortcutsProps> = ({
  shortcuts,
  shortcutNames,
  editingShortcut,
  tempShortcut,
  startEditingShortcut,
  cancelEditingShortcut,
  saveShortcut,
  handleKeyDown
}) => {
  const renderShortcutRow = (action: string) => <div key={action} className="shortcut-item">
      <span className="shortcut-action">{shortcutNames[action] || action}</span>
      <div className="shortcut-keys-container">
        {editingShortcut === action ? <div className="shortcut-edit-container">
            <input type="text" className="shortcut-edit-input" value={tempShortcut} readOnly onKeyDown={handleKeyDown} placeholder="按下新的快捷键组合" />
            <button className="shortcut-save-btn" onClick={saveShortcut}>
              <Check size={14} />
            </button>
            <button className="shortcut-cancel-btn" onClick={cancelEditingShortcut}>
              <X size={14} />
            </button>
          </div> : <div className="shortcut-keys editable" onClick={() => startEditingShortcut(action, shortcuts[action] || '')} title="点击编辑快捷键">
            {shortcuts[action] || '未设置'}
          </div>}
      </div>
    </div>;
  return <div className="settings-scroll-container">
      {shortcutSections.map(section => <div key={section.title} className="shortcuts-section">
          <h4 className="shortcuts-section-title">{section.title}</h4>
          <div className="shortcuts-list">
            {section.actions.map(renderShortcutRow)}
          </div>
        </div>)}
    </div>;
};