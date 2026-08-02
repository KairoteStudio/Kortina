import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUISettingsStore } from '../../stores';
import { DEFAULT_SHORTCUTS, MENU_SHORTCUT_COMMANDS, getShortcutLabel } from '../../constants/shortcuts';
import './MenuToolbar.css';
interface MenuSubItem {
  id: string;
  label: string;
  shortcut?: string;
  action?: () => void;
}
interface MenuItem {
  id: string;
  label: string;
  shortcut: string;
  items?: MenuSubItem[];
}
interface MenuToolbarProps {
  className?: string;
  onNewFile?: () => void;
  onOpenFile?: () => void;
  onSaveFile?: () => void;
  onSaveAs?: () => void;
  onExit?: () => void;
  onSettings?: () => void;
  onCompile?: () => void;
  onRun?: () => void;
  onToggleConsole?: () => void;
  onToggleExplorer?: () => void;
  onToggleVcsPanel?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onCut?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onFind?: () => void;
  onReplace?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onGoToDefinition?: () => void;
  onGoToDeclaration?: () => void;
  onGoToImplementation?: () => void;
  onGoBack?: () => void;
  onGoForward?: () => void;
  onFormatDocument?: () => void;
  onToggleLineComment?: () => void;
  onToggleBlockComment?: () => void;
  onTriggerSuggest?: () => void;
  onQuickFix?: () => void;
  onRenameSymbol?: () => void;
  onExtractFunction?: () => void;
  onExtractVariable?: () => void;
  onInlineVariable?: () => void;
  onRebuildProject?: () => void;
  onCleanProject?: () => void;
  onBuildConfiguration?: () => void;
  onDebugProject?: () => void;
  onStopProject?: () => void;
  onRunConfiguration?: () => void;
  onPreferences?: () => void;
  onExtensions?: () => void;
  onThemes?: () => void;
  onKeybindings?: () => void;
  onCommit?: () => void;
  onPush?: () => void;
  onPull?: () => void;
  onBranch?: () => void;
  onMerge?: () => void;
  onStash?: () => void;
  onNewWindow?: () => void;
  onCloseWindow?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onFullscreen?: () => void;
  onWelcome?: () => void;
  onDocumentation?: () => void;
  onKeyboardShortcuts?: () => void;
  onAbout?: () => void;
}
const MenuToolbar: React.FC<MenuToolbarProps> = ({
  className = '',
  onNewFile,
  onOpenFile,
  onSaveFile,
  onSaveAs,
  onExit,
  onSettings,
  onCompile,
  onRun,
  onToggleConsole,
  onToggleExplorer,
  onToggleVcsPanel,
  onUndo,
  onRedo,
  onCut,
  onCopy,
  onPaste,
  onFind,
  onReplace,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onGoToDefinition,
  onGoToDeclaration,
  onGoToImplementation,
  onGoBack,
  onGoForward,
  onFormatDocument,
  onToggleLineComment,
  onToggleBlockComment,
  onTriggerSuggest,
  onQuickFix,
  onRenameSymbol,
  onExtractFunction,
  onExtractVariable,
  onInlineVariable,
  onRebuildProject,
  onCleanProject,
  onBuildConfiguration,
  onDebugProject,
  onStopProject,
  onRunConfiguration,
  onPreferences,
  onExtensions,
  onThemes,
  onKeybindings,
  onCommit,
  onPush,
  onPull,
  onBranch,
  onMerge,
  onStash,
  onNewWindow,
  onCloseWindow,
  onMinimize,
  onMaximize,
  onFullscreen,
  onDocumentation,
  onKeyboardShortcuts,
  onAbout
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const shortcuts = useUISettingsStore(s => s.shortcuts);
  const shortcutMap = useMemo(() => ({
    ...DEFAULT_SHORTCUTS,
    ...shortcuts
  }), [shortcuts]);
  const sc = useCallback((menuItemId: string) => getShortcutLabel(shortcutMap, MENU_SHORTCUT_COMMANDS[menuItemId]), [shortcutMap]);
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setActiveDropdown(null);
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setIsExpanded(false);
      setIsClosing(false);
    }, 200);
  }, [isClosing]);
  const toggleToolbar = useCallback(() => {
    if (isClosing) return;
    if (isExpanded) {
      handleClose();
    } else {
      setIsClosing(false);
      setIsExpanded(true);
    }
  }, [isExpanded, isClosing, handleClose]);
  const menuItems: MenuItem[] = useMemo(() => [{
    id: 'file',
    label: '文件(F)',
    shortcut: 'F',
    items: [{
      id: 'new-file',
      label: '新建文件',
      shortcut: sc('new-file'),
      action: onNewFile
    }, {
      id: 'open-file',
      label: '打开文件',
      shortcut: sc('open-file'),
      action: onOpenFile
    }, {
      id: 'save-file',
      label: '保存文件',
      shortcut: sc('save-file'),
      action: onSaveFile
    }, {
      id: 'save-as',
      label: '另存为',
      shortcut: sc('save-as'),
      action: onSaveAs
    }, {
      id: 'separator',
      label: ''
    }, {
      id: 'exit',
      label: '退出',
      shortcut: sc('exit'),
      action: onExit
    }]
  }, {
    id: 'edit',
    label: '编辑(E)',
    shortcut: 'E',
    items: [{
      id: 'undo',
      label: '撤销',
      shortcut: sc('undo'),
      action: onUndo
    }, {
      id: 'redo',
      label: '重做',
      shortcut: sc('redo'),
      action: onRedo
    }, {
      id: 'separator',
      label: ''
    }, {
      id: 'cut',
      label: '剪切',
      shortcut: sc('cut'),
      action: onCut
    }, {
      id: 'copy',
      label: '复制',
      shortcut: sc('copy'),
      action: onCopy
    }, {
      id: 'paste',
      label: '粘贴',
      shortcut: sc('paste'),
      action: onPaste
    }, {
      id: 'separator',
      label: ''
    }, {
      id: 'find',
      label: '查找',
      shortcut: sc('find'),
      action: onFind
    }, {
      id: 'replace',
      label: '替换',
      shortcut: sc('replace'),
      action: onReplace
    }]
  }, {
    id: 'view',
    label: '视图(V)',
    shortcut: 'V',
    items: [{
      id: 'toggle-explorer',
      label: '切换资源管理器',
      shortcut: sc('toggle-explorer'),
      action: onToggleExplorer
    }, {
      id: 'toggle-vcs',
      label: '切换版本控制',
      shortcut: sc('toggle-vcs'),
      action: onToggleVcsPanel
    }, {
      id: 'toggle-console',
      label: '切换控制台',
      shortcut: sc('toggle-console'),
      action: onToggleConsole
    }, {
      id: 'separator',
      label: ''
    }, {
      id: 'zoom-in',
      label: '放大',
      shortcut: sc('zoom-in'),
      action: onZoomIn
    }, {
      id: 'zoom-out',
      label: '缩小',
      shortcut: sc('zoom-out'),
      action: onZoomOut
    }, {
      id: 'reset-zoom',
      label: '重置缩放',
      shortcut: sc('reset-zoom'),
      action: onResetZoom
    }]
  }, {
    id: 'navigate',
    label: '导航(N)',
    shortcut: 'N',
    items: [{
      id: 'go-to-definition',
      label: '转到定义',
      shortcut: sc('go-to-definition'),
      action: onGoToDefinition
    }, {
      id: 'go-to-declaration',
      label: '转到声明',
      shortcut: sc('go-to-declaration'),
      action: onGoToDeclaration
    }, {
      id: 'go-to-implementation',
      label: '转到实现',
      shortcut: sc('go-to-implementation'),
      action: onGoToImplementation
    }, {
      id: 'separator',
      label: ''
    }, {
      id: 'go-back',
      label: '后退',
      shortcut: sc('go-back'),
      action: onGoBack
    }, {
      id: 'go-forward',
      label: '前进',
      shortcut: sc('go-forward'),
      action: onGoForward
    }]
  }, {
    id: 'code',
    label: '代码(C)',
    shortcut: 'C',
    items: [{
      id: 'format',
      label: '格式化文档',
      shortcut: sc('format'),
      action: onFormatDocument
    }, {
      id: 'comment-line',
      label: '切换行注释',
      shortcut: sc('comment-line'),
      action: onToggleLineComment
    }, {
      id: 'comment-block',
      label: '切换块注释',
      shortcut: sc('comment-block'),
      action: onToggleBlockComment
    }, {
      id: 'separator',
      label: ''
    }, {
      id: 'intellisense',
      label: '触发建议',
      shortcut: sc('intellisense'),
      action: onTriggerSuggest
    }, {
      id: 'quick-fix',
      label: '快速修复',
      shortcut: sc('quick-fix'),
      action: onQuickFix
    }]
  }, {
    id: 'refactor',
    label: '重构(R)',
    shortcut: 'R',
    items: [{
      id: 'rename-symbol',
      label: '重命名符号',
      shortcut: sc('rename-symbol'),
      action: onRenameSymbol
    }, {
      id: 'extract-function',
      label: '提取函数',
      shortcut: sc('extract-function'),
      action: onExtractFunction
    }, {
      id: 'extract-variable',
      label: '提取变量',
      shortcut: sc('extract-variable'),
      action: onExtractVariable
    }, {
      id: 'separator',
      label: ''
    }, {
      id: 'inline-variable',
      label: '内联变量',
      shortcut: sc('inline-variable'),
      action: onInlineVariable
    }]
  }, {
    id: 'build',
    label: '构建(B)',
    shortcut: 'B',
    items: [{
      id: 'build-project',
      label: '构建项目',
      shortcut: sc('build-project'),
      action: onCompile
    }, {
      id: 'rebuild-project',
      label: '重新构建项目',
      shortcut: sc('rebuild-project'),
      action: onRebuildProject
    }, {
      id: 'clean-project',
      label: '清理项目',
      shortcut: sc('clean-project'),
      action: onCleanProject
    }, {
      id: 'separator',
      label: ''
    }, {
      id: 'build-configuration',
      label: '构建配置...',
      action: onBuildConfiguration
    }]
  }, {
    id: 'run',
    label: '运行(U)',
    shortcut: 'U',
    items: [{
      id: 'run-project',
      label: '运行项目',
      shortcut: sc('run-project'),
      action: onRun
    }, {
      id: 'debug-project',
      label: '调试项目',
      shortcut: sc('debug-project'),
      action: onDebugProject
    }, {
      id: 'stop-project',
      label: '停止项目',
      shortcut: sc('stop-project'),
      action: onStopProject
    }, {
      id: 'separator',
      label: ''
    }, {
      id: 'run-configuration',
      label: '运行配置...',
      action: onRunConfiguration
    }]
  }, {
    id: 'tools',
    label: '工具(T)',
    shortcut: 'T',
    items: [{
      id: 'settings',
      label: '设置',
      shortcut: sc('settings'),
      action: onSettings
    }, {
      id: 'preferences',
      label: '首选项',
      shortcut: sc('preferences'),
      action: onPreferences
    }, {
      id: 'separator',
      label: ''
    }, {
      id: 'extensions',
      label: '扩展',
      action: onExtensions
    }, {
      id: 'themes',
      label: '主题',
      action: onThemes
    }, {
      id: 'keybindings',
      label: '键盘快捷键',
      shortcut: sc('keybindings'),
      action: onKeybindings
    }]
  }, {
    id: 'vcs',
    label: 'VCS(S)',
    shortcut: 'S',
    items: [{
      id: 'commit',
      label: '提交',
      shortcut: sc('commit'),
      action: onCommit
    }, {
      id: 'push',
      label: '推送',
      shortcut: sc('push'),
      action: onPush
    }, {
      id: 'pull',
      label: '拉取',
      shortcut: sc('pull'),
      action: onPull
    }, {
      id: 'separator',
      label: ''
    }, {
      id: 'branch',
      label: '创建分支...',
      action: onBranch
    }, {
      id: 'merge',
      label: '合并分支...',
      action: onMerge
    }, {
      id: 'stash',
      label: '储藏更改',
      action: onStash
    }]
  }, {
    id: 'window',
    label: '窗口(W)',
    shortcut: 'W',
    items: [{
      id: 'new-window',
      label: '新建窗口',
      shortcut: sc('new-window'),
      action: onNewWindow
    }, {
      id: 'close-window',
      label: '关闭窗口',
      shortcut: sc('close-window'),
      action: onCloseWindow
    }, {
      id: 'separator',
      label: ''
    }, {
      id: 'minimize',
      label: '最小化',
      shortcut: sc('minimize'),
      action: onMinimize
    }, {
      id: 'maximize',
      label: '最大化',
      action: onMaximize
    }, {
      id: 'fullscreen',
      label: '全屏',
      shortcut: sc('fullscreen'),
      action: onFullscreen
    }]
  }, {
    id: 'help',
    label: '帮助(H)',
    shortcut: 'H',
    items: [{
      id: 'documentation',
      label: '文档',
      shortcut: sc('documentation'),
      action: onDocumentation
    }, {
      id: 'separator',
      label: ''
    }, {
      id: 'keyboard-shortcuts',
      label: '键盘快捷方式参考',
      shortcut: sc('keyboard-shortcuts'),
      action: onKeyboardShortcuts
    }, {
      id: 'about',
      label: '关于',
      action: onAbout
    }]
  }], [sc, onNewFile, onOpenFile, onSaveFile, onSaveAs, onExit, onUndo, onRedo, onCut, onCopy, onPaste, onFind, onReplace, onToggleExplorer, onToggleVcsPanel, onToggleConsole, onZoomIn, onZoomOut, onResetZoom, onGoToDefinition, onGoToDeclaration, onGoToImplementation, onGoBack, onGoForward, onFormatDocument, onToggleLineComment, onToggleBlockComment, onTriggerSuggest, onQuickFix, onRenameSymbol, onExtractFunction, onExtractVariable, onInlineVariable, onCompile, onRebuildProject, onCleanProject, onBuildConfiguration, onRun, onDebugProject, onStopProject, onRunConfiguration, onSettings, onPreferences, onExtensions, onThemes, onKeybindings, onCommit, onPush, onPull, onBranch, onMerge, onStash, onNewWindow, onCloseWindow, onMinimize, onMaximize, onFullscreen, onDocumentation, onKeyboardShortcuts, onAbout]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        if (isExpanded && !isClosing) {
          handleClose();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded, isClosing, handleClose]);
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);
  const handleMenuButtonClick = (itemId: string) => {
    if (activeDropdown === itemId) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(itemId);
    }
  };
  const handleDropdownItemClick = (item: MenuSubItem) => {
    if (item.action) {
      item.action();
    }
    setActiveDropdown(null);
    handleClose();
  };
  return <div className={`menu-toolbar ${className}`} ref={toolbarRef}>
      <button className="hamburger-button" onClick={toggleToolbar} title="菜单">
        <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
          <path d="M1 1H15M1 7H15M1 13H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {isExpanded && <div className={`menu-toolbar-expanded ${isClosing ? 'closing' : ''}`}>
          {menuItems.map(item => <div key={item.id} className="menu-dropdown-container">
              <button className="menu-toolbar-item" onClick={() => handleMenuButtonClick(item.id)}>
                {item.label}
              </button>

              {activeDropdown === item.id && item.items && <div className="menu-dropdown">
                  {item.items.map(dropdownItem => {
            if (dropdownItem.id === 'separator') {
              return <div key={dropdownItem.id} className="menu-dropdown-separator" />;
            }
            return <button key={dropdownItem.id} className="menu-dropdown-item" onClick={() => handleDropdownItemClick(dropdownItem)}>
                        <span>{dropdownItem.label}</span>
                        {dropdownItem.shortcut && <span className="menu-dropdown-shortcut">{dropdownItem.shortcut}</span>}
                      </button>;
          })}
                </div>}
            </div>)}
        </div>}
    </div>;
};
export default MenuToolbar;