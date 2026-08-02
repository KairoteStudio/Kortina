import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Settings, Type, FileText, Palette, Keyboard, MoreHorizontal, Info, Puzzle } from 'lucide-react';
import { isTauri } from '../../utils/environment';
import { ExtensionsSettings, type ExtensionsSettingsRef } from './ExtensionsSettings';
import { DEFAULT_SHORTCUTS } from '../../constants/shortcuts';
import { DEFAULT_COMPILER_OUTPUT } from '../../stores/UISettingsStore';
import { findShortcutConflict } from '../../services/ShortcutService';
import { TitleRoller } from './settings/TitleRoller';
import { SettingsGeneral } from './settings/SettingsGeneral';
import { SettingsEditor } from './settings/SettingsEditor';
import { SettingsFiles } from './settings/SettingsFiles';
import { SettingsShortcuts } from './settings/SettingsShortcuts';
import { SettingsCompiler } from './settings/SettingsCompiler';
import { SettingsOther } from './settings/SettingsOther';
import { SettingsAbout } from './settings/SettingsAbout';
import { CATEGORIES, type Category } from './settings/types';
import './SettingsWindow.css';
interface SettingsWindowProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  themeGroup?: 'default' | 'islandtheme';
  setTheme: (theme: 'light' | 'dark') => void;
  setThemeGroup?: (themeGroup: 'default' | 'islandtheme') => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  fontFamily: string;
  setFontFamily: (family: string) => void;
  fontLigatures: boolean;
  setFontLigatures: (ligatures: boolean) => void;
  syntaxTheme: 'default' | 'jetbrains' | 'vscode' | 'monokai';
  setSyntaxTheme: (theme: 'default' | 'jetbrains' | 'vscode' | 'monokai') => void;
  tabSize: number;
  setTabSize: (size: number) => void;
  wordWrap: boolean;
  setWordWrap: (wrap: boolean) => void;
  showLineNumbers: boolean;
  setShowLineNumbers: (show: boolean) => void;
  autoSave: boolean;
  setAutoSave: (save: boolean) => void;
  autoSaveInterval: number;
  setAutoSaveInterval: (interval: number) => void;
  showMinimap: boolean;
  setShowMinimap: (show: boolean) => void;
  enableCodeLens: boolean;
  setEnableCodeLens: (enable: boolean) => void;
  uiZoom: number;
  setUiZoom: (zoom: number) => void;
  compilerPath: string;
  setCompilerPath: (path: string) => void;
  compilerUseSystemPath: boolean;
  setCompilerUseSystemPath: (use: boolean) => void;
  compilerTargetType: 'asm' | 'ir' | 'exe';
  setCompilerTargetType: (type: 'asm' | 'ir' | 'exe') => void;
  compilerOutputFile: string;
  setCompilerOutputFile: (file: string) => void;
  compilerShowIR: boolean;
  setCompilerShowIR: (show: boolean) => void;
  shortcuts: Record<string, string>;
  setShortcuts: (shortcuts: Record<string, string>) => void;
  isStandalone?: boolean;
  initialCategory?: Category;
  openExternalUrl?: (url: string) => void;
}
const SettingsWindowComponent: React.FC<SettingsWindowProps> = ({
  isOpen,
  onClose,
  theme,
  themeGroup,
  setTheme,
  setThemeGroup,
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily,
  fontLigatures,
  setFontLigatures,
  syntaxTheme,
  setSyntaxTheme,
  tabSize,
  setTabSize,
  wordWrap,
  setWordWrap,
  showLineNumbers,
  setShowLineNumbers,
  autoSave,
  setAutoSave,
  autoSaveInterval,
  setAutoSaveInterval,
  showMinimap,
  setShowMinimap,
  enableCodeLens,
  setEnableCodeLens,
  uiZoom,
  setUiZoom,
  compilerPath,
  setCompilerPath,
  compilerUseSystemPath,
  setCompilerUseSystemPath,
  compilerTargetType,
  setCompilerTargetType,
  compilerOutputFile,
  setCompilerOutputFile,
  compilerShowIR,
  setCompilerShowIR,
  shortcuts,
  setShortcuts,
  isStandalone = false,
  initialCategory = 'general',
  openExternalUrl
}) => {
  const [activeCategory, setActiveCategory] = useState<Category>(initialCategory);
  const [slideDirection, setSlideDirection] = useState<'up' | 'down'>('up');
  const [slidePages, setSlidePages] = useState<Category[]>([initialCategory]);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevCategoryRef = useRef<Category>(initialCategory);
  const [isClosing, setIsClosing] = useState(false);
  const isTauriEnv = isTauri();
  const extensionsRef = useRef<ExtensionsSettingsRef>(null);
  const [tempTheme, setTempTheme] = useState(theme);
  const [tempThemeGroup, setTempThemeGroup] = useState<'default' | 'islandtheme'>(themeGroup || 'default');
  const [tempFontSize, setTempFontSize] = useState(fontSize);
  const [tempFontFamily, setTempFontFamily] = useState(fontFamily);
  const [tempFontLigatures, setTempFontLigatures] = useState(fontLigatures);
  const [tempSyntaxTheme, setTempSyntaxTheme] = useState(syntaxTheme);
  const [tempTabSize, setTempTabSize] = useState(tabSize);
  const [tempWordWrap, setTempWordWrap] = useState(wordWrap);
  const [tempShowLineNumbers, setTempShowLineNumbers] = useState(showLineNumbers);
  const [tempAutoSave, setTempAutoSave] = useState(autoSave);
  const [tempAutoSaveInterval, setTempAutoSaveInterval] = useState(autoSaveInterval);
  const [tempShowMinimap, setTempShowMinimap] = useState(showMinimap);
  const [tempEnableCodeLens, setTempEnableCodeLens] = useState(enableCodeLens);
  const [tempUiZoom, setTempUiZoom] = useState(uiZoom);
  const [tempCompilerPath, setTempCompilerPath] = useState(compilerPath);
  const [tempCompilerUseSystemPath, setTempCompilerUseSystemPath] = useState(compilerUseSystemPath);
  const [tempCompilerTargetType, setTempCompilerTargetType] = useState(compilerTargetType);
  const [tempCompilerOutputFile, setTempCompilerOutputFile] = useState(compilerOutputFile);
  const [tempCompilerShowIR, setTempCompilerShowIR] = useState(compilerShowIR);
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setActiveCategory(prev => prev || initialCategory || 'general');
      setTempTheme(theme);
      setTempThemeGroup(themeGroup || 'default');
      setTempFontSize(fontSize);
      setTempFontFamily(fontFamily);
      setTempFontLigatures(fontLigatures);
      setTempSyntaxTheme(syntaxTheme);
      setTempTabSize(tabSize);
      setTempWordWrap(wordWrap);
      setTempShowLineNumbers(showLineNumbers);
      setTempAutoSave(autoSave);
      setTempAutoSaveInterval(autoSaveInterval);
      setTempShowMinimap(showMinimap);
      setTempEnableCodeLens(enableCodeLens);
      setTempUiZoom(uiZoom);
      setTempCompilerPath(compilerPath);
      setTempCompilerUseSystemPath(compilerUseSystemPath);
      setTempCompilerTargetType(compilerTargetType);
      setTempCompilerOutputFile(compilerOutputFile);
      setTempCompilerShowIR(compilerShowIR);
    }
  }, [isOpen, theme, themeGroup, fontSize, fontFamily, fontLigatures, syntaxTheme, tabSize, wordWrap, showLineNumbers, autoSave, autoSaveInterval, showMinimap, enableCodeLens, uiZoom, compilerPath, compilerUseSystemPath, compilerTargetType, compilerOutputFile, compilerShowIR, initialCategory]);
  const handleCategoryChange = useCallback((category: Category) => {
    if (category === activeCategory || isAnimating) return;
    const prevIndex = CATEGORIES.indexOf(prevCategoryRef.current);
    const nextIndex = CATEGORIES.indexOf(category);
    const pages: Category[] = [];
    if (nextIndex > prevIndex) {
      for (let i = prevIndex; i <= nextIndex; i++) {
        pages.push(CATEGORIES[i]);
      }
    } else {
      for (let i = prevIndex; i >= nextIndex; i--) {
        pages.push(CATEGORIES[i]);
      }
      pages.reverse();
    }
    setSlideDirection(nextIndex > prevIndex ? 'up' : 'down');
    setSlidePages(pages);
    setIsAnimating(true);
    prevCategoryRef.current = category;
    setActiveCategory(category);
  }, [activeCategory, isAnimating]);
  const handleClose = useCallback(() => {
    if (isStandalone) {
      if (onClose) onClose();
      if (isTauri()) {
        import('@tauri-apps/api/window').then(mod => {
          mod.getCurrentWindow().close();
        }).catch(() => {
          window.close();
        });
      } else {
        window.close();
      }
      return;
    }
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      if (onClose) onClose();
      setIsClosing(false);
    }, 150);
  }, [onClose, isClosing, isStandalone]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isClosing) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose, isClosing]);
  const detectCompilerPath = async () => {
    if (!isTauriEnv) {
      alert('自动检测功能仅在桌面应用中可用');
      return;
    }
    try {
      const {
        invoke
      } = await import('@tauri-apps/api/core');
      const detected = await invoke<string | null>('detect_compiler_path');
      if (detected) {
        setTempCompilerPath(detected);
        alert(`检测到编译器: ${detected}`);
        return;
      }
    } catch (error) {
      console.error('编译器检测失败', error);
    }
    alert('未检测到编译器，请手动选择编译器路径');
  };
  const openFileSelector = async () => {
    if (!isTauriEnv) {
      alert('文件选择功能仅在桌面应用中可用');
      return;
    }
    try {
      const {
        open
      } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: false,
        multiple: false,
        title: '选择 KairoteLang 编译器',
        filters: [{
          name: '可执行文件',
          extensions: ['exe', 'bin', '*']
        }, {
          name: '所有文件',
          extensions: ['*']
        }]
      });
      if (selected && typeof selected === 'string') {
        setTempCompilerPath(selected);
      }
    } catch (error) {
      console.error('文件选择失败:', error);
      alert('文件选择失败: ' + error);
    }
  };
  const saveSettings = useCallback(() => {
    setTheme(tempTheme);
    if (setThemeGroup) setThemeGroup(tempThemeGroup);
    setFontSize(tempFontSize);
    setFontFamily(tempFontFamily);
    setFontLigatures(tempFontLigatures);
    setSyntaxTheme(tempSyntaxTheme);
    setTabSize(tempTabSize);
    setWordWrap(tempWordWrap);
    setShowLineNumbers(tempShowLineNumbers);
    setAutoSave(tempAutoSave);
    setAutoSaveInterval(tempAutoSaveInterval);
    setShowMinimap(tempShowMinimap);
    setEnableCodeLens(tempEnableCodeLens);
    setUiZoom(tempUiZoom);
    setCompilerPath(tempCompilerPath);
    setCompilerUseSystemPath(tempCompilerUseSystemPath);
    setCompilerTargetType(tempCompilerTargetType);
    setCompilerOutputFile(tempCompilerOutputFile);
    setCompilerShowIR(tempCompilerShowIR);
    setShortcuts(shortcuts);
  }, [tempTheme, setTheme, setThemeGroup, tempThemeGroup, tempFontSize, setFontSize, tempFontFamily, setFontFamily, tempFontLigatures, setFontLigatures, tempSyntaxTheme, setSyntaxTheme, tempTabSize, setTabSize, tempWordWrap, setWordWrap, tempShowLineNumbers, setShowLineNumbers, tempAutoSave, setAutoSave, tempAutoSaveInterval, setAutoSaveInterval, tempShowMinimap, setShowMinimap, tempEnableCodeLens, setEnableCodeLens, tempUiZoom, setUiZoom, tempCompilerPath, setCompilerPath, tempCompilerUseSystemPath, setCompilerUseSystemPath, tempCompilerTargetType, setCompilerTargetType, tempCompilerOutputFile, setCompilerOutputFile, tempCompilerShowIR, setCompilerShowIR, shortcuts, setShortcuts]);
  const handleOK = async () => {
    saveSettings();
    await extensionsRef.current?.applyChanges();
    handleClose();
  };
  const handleApply = async () => {
    saveSettings();
    await extensionsRef.current?.applyChanges();
  };
  const handleCancel = () => {
    extensionsRef.current?.resetChanges();
    setTempTheme(theme);
    setTempThemeGroup(themeGroup || 'default');
    setTempFontSize(fontSize);
    setTempFontFamily(fontFamily);
    setTempFontLigatures(fontLigatures);
    setTempSyntaxTheme(syntaxTheme);
    setTempTabSize(tabSize);
    setTempWordWrap(wordWrap);
    setTempShowLineNumbers(showLineNumbers);
    setTempAutoSave(autoSave);
    setTempAutoSaveInterval(autoSaveInterval);
    setTempShowMinimap(showMinimap);
    setTempEnableCodeLens(enableCodeLens);
    setTempUiZoom(uiZoom);
    setTempCompilerPath(compilerPath);
    setTempCompilerUseSystemPath(compilerUseSystemPath);
    setTempCompilerTargetType(compilerTargetType);
    setTempCompilerOutputFile(compilerOutputFile);
    setTempCompilerShowIR(compilerShowIR);
    handleClose();
  };
  const handleReset = () => {
    setTempTheme('dark');
    setTempThemeGroup('default');
    setTempFontSize(14);
    setTempFontFamily('LitalagicaL Mono');
    setTempFontLigatures(false);
    setTempSyntaxTheme('jetbrains');
    setTempTabSize(4);
    setTempWordWrap(false);
    setTempShowLineNumbers(true);
    setTempAutoSave(false);
    setTempAutoSaveInterval(30);
    setTempShowMinimap(true);
    setTempEnableCodeLens(false);
    setTempUiZoom(1);
    setTempCompilerPath('');
    setTempCompilerUseSystemPath(true);
    setTempCompilerTargetType('exe');
    setTempCompilerOutputFile(DEFAULT_COMPILER_OUTPUT);
    setTempCompilerShowIR(false);
    setTheme('dark');
    if (setThemeGroup) setThemeGroup('default');
    setFontSize(14);
    setFontFamily('LitalagicaL Mono');
    setFontLigatures(false);
    setSyntaxTheme('jetbrains');
    setTabSize(4);
    setWordWrap(false);
    setShowLineNumbers(true);
    setAutoSave(false);
    setAutoSaveInterval(30);
    setShowMinimap(true);
    setEnableCodeLens(false);
    setUiZoom(1);
    setCompilerPath('');
    setCompilerUseSystemPath(true);
    setCompilerTargetType('exe');
    setCompilerOutputFile(DEFAULT_COMPILER_OUTPUT);
    setCompilerShowIR(false);
    setShortcuts({
      ...DEFAULT_SHORTCUTS
    });
    alert('所有设置已重置为默认值');
  };
  const shortcutNames: Record<string, string> = {
    newFile: '新建文件',
    openFile: '打开文件',
    saveFile: '保存文件',
    saveAs: '另存为',
    exit: '退出',
    undo: '撤销',
    redo: '重做',
    copy: '复制',
    cut: '剪切',
    paste: '粘贴',
    selectAll: '全选',
    find: '查找',
    replace: '替换',
    toggleExplorer: '切换资源管理器',
    toggleVcs: '切换版本控制',
    toggleSidebar: '切换侧边栏',
    toggleConsole: '切换控制台',
    toggleFullscreen: '切换全屏',
    zoomIn: '放大',
    zoomOut: '缩小',
    resetZoom: '重置缩放',
    goBack: '后退',
    goForward: '前进',
    goToDefinition: '转到定义',
    goToDeclaration: '转到声明',
    goToImplementation: '转到实现',
    formatDocument: '格式化文档',
    toggleLineComment: '切换行注释',
    toggleBlockComment: '切换块注释',
    triggerSuggest: '触发建议',
    quickFix: '快速修复',
    renameSymbol: '重命名符号',
    extractFunction: '提取函数',
    extractVariable: '提取变量',
    inlineVariable: '内联变量',
    compile: '编译',
    rebuild: '重新构建',
    clean: '清理项目',
    run: '运行',
    debug: '调试',
    stop: '停止',
    settings: '设置',
    commit: '提交',
    push: '推送',
    pull: '拉取',
    newWindow: '新建窗口',
    closeTab: '关闭标签页',
    closeWindow: '关闭窗口',
    nextTab: '下一个标签页',
    prevTab: '上一个标签页',
    minimize: '最小化',
    documentation: '文档',
    keyboardShortcuts: '快捷键参考',
    explorerNewFile: '资源管理器：新建文件',
    explorerNewFolder: '资源管理器：新建文件夹',
    explorerDelete: '资源管理器：删除'
  };
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [tempShortcut, setTempShortcut] = useState<string>('');
  const startEditingShortcut = (action: string, currentKeys: string) => {
    setEditingShortcut(action);
    setTempShortcut(currentKeys);
  };
  const cancelEditingShortcut = () => {
    setEditingShortcut(null);
    setTempShortcut('');
  };
  const saveShortcut = () => {
    if (editingShortcut) {
      const conflictId = findShortcutConflict(shortcuts, editingShortcut, tempShortcut);
      if (conflictId) {
        const conflictName = shortcutNames[conflictId] || conflictId;
        alert(`快捷键冲突：该组合已被「${conflictName}」使用，请重新设置。`);
        return;
      }
      const newShortcuts = {
        ...shortcuts,
        [editingShortcut]: tempShortcut
      };
      setShortcuts(newShortcuts);
      setEditingShortcut(null);
      setTempShortcut('');
    }
  };
  const handleShortcutKeyDown = (e: React.KeyboardEvent) => {
    e.preventDefault();
    const keys = [];
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.shiftKey) keys.push('Shift');
    if (e.altKey) keys.push('Alt');
    if (e.metaKey) keys.push('Meta');
    if (e.key === ' ') {
      keys.push('Space');
    } else if (e.key === 'Escape') {
      keys.push('Esc');
    } else if (e.key === 'ArrowUp') {
      keys.push('Up');
    } else if (e.key === 'ArrowDown') {
      keys.push('Down');
    } else if (e.key === 'ArrowLeft') {
      keys.push('Left');
    } else if (e.key === 'ArrowRight') {
      keys.push('Right');
    } else if (e.key === 'Enter') {
      keys.push('Enter');
    } else if (e.key === 'Tab') {
      keys.push('Tab');
    } else if (e.key === 'Backspace') {
      keys.push('Backspace');
    } else if (e.key === 'Delete') {
      keys.push('Delete');
    } else if (e.key === 'Insert') {
      keys.push('Insert');
    } else if (e.key === 'Home') {
      keys.push('Home');
    } else if (e.key === 'End') {
      keys.push('End');
    } else if (e.key === 'PageUp') {
      keys.push('PageUp');
    } else if (e.key === 'PageDown') {
      keys.push('PageDown');
    } else if (e.key.length === 1 && e.key.match(/[a-zA-Z0-9]/)) {
      keys.push(e.key.toUpperCase());
    } else if (e.key.length === 1) {
      keys.push(e.key);
    }
    if (keys.length > 0) {
      setTempShortcut(keys.join('+'));
    }
  };
  if (!isOpen && !isStandalone) return null;
  const renderContentFor = (category: Category) => {
    switch (category) {
      case 'general':
        return <SettingsGeneral tempTheme={tempTheme} setTempTheme={setTempTheme} tempThemeGroup={tempThemeGroup} setTempThemeGroup={setTempThemeGroup} tempUiZoom={tempUiZoom} setTempUiZoom={setTempUiZoom} />;
      case 'editor':
        return <SettingsEditor tempFontSize={tempFontSize} setTempFontSize={setTempFontSize} tempFontFamily={tempFontFamily} setTempFontFamily={setTempFontFamily} tempFontLigatures={tempFontLigatures} setTempFontLigatures={setTempFontLigatures} tempSyntaxTheme={tempSyntaxTheme} setTempSyntaxTheme={setTempSyntaxTheme} tempTabSize={tempTabSize} setTempTabSize={setTempTabSize} tempWordWrap={tempWordWrap} setTempWordWrap={setTempWordWrap} tempShowLineNumbers={tempShowLineNumbers} setTempShowLineNumbers={setTempShowLineNumbers} tempShowMinimap={tempShowMinimap} setTempShowMinimap={setTempShowMinimap} tempEnableCodeLens={tempEnableCodeLens} setTempEnableCodeLens={setTempEnableCodeLens} />;
      case 'files':
        return <SettingsFiles tempAutoSave={tempAutoSave} setTempAutoSave={setTempAutoSave} tempAutoSaveInterval={tempAutoSaveInterval} setTempAutoSaveInterval={setTempAutoSaveInterval} />;
      case 'shortcuts':
        return <SettingsShortcuts shortcuts={shortcuts} shortcutNames={shortcutNames} editingShortcut={editingShortcut} tempShortcut={tempShortcut} startEditingShortcut={startEditingShortcut} cancelEditingShortcut={cancelEditingShortcut} saveShortcut={saveShortcut} handleKeyDown={handleShortcutKeyDown} />;
      case 'other':
        return <SettingsOther onReset={handleReset} />;
      case 'extensions':
        return <ExtensionsSettings ref={extensionsRef} />;
      case 'compiler':
        return <SettingsCompiler tempCompilerUseSystemPath={tempCompilerUseSystemPath} setTempCompilerUseSystemPath={setTempCompilerUseSystemPath} tempCompilerPath={tempCompilerPath} setTempCompilerPath={setTempCompilerPath} tempCompilerTargetType={tempCompilerTargetType} setTempCompilerTargetType={setTempCompilerTargetType} tempCompilerOutputFile={tempCompilerOutputFile} setTempCompilerOutputFile={setTempCompilerOutputFile} tempCompilerShowIR={tempCompilerShowIR} setTempCompilerShowIR={setTempCompilerShowIR} isTauriEnv={isTauriEnv} openFileSelector={openFileSelector} detectCompilerPath={detectCompilerPath} />;
      case 'about':
        return <SettingsAbout isTauriEnv={isTauriEnv} openExternalUrl={openExternalUrl} />;
    }
  };
  const content = <div className={`settings-container ${isStandalone ? 'standalone' : ''} ${isClosing ? 'closing' : ''}`}>
      <div className="settings-sidebar">
        <div className="settings-sidebar-header" data-tauri-drag-region="true">
          <Settings size={20} />
          <span>设置</span>
        </div>
        <div className="settings-category-list">
          <div className="settings-category-main">
            <div className={`settings-category-item ${activeCategory === 'general' ? 'active' : ''}`} onClick={() => handleCategoryChange('general')}>
              <Palette size={16} />
              <span>常规</span>
            </div>
            <div className={`settings-category-item ${activeCategory === 'editor' ? 'active' : ''}`} onClick={() => handleCategoryChange('editor')}>
              <Type size={16} />
              <span>编辑器</span>
            </div>
            <div className={`settings-category-item ${activeCategory === 'files' ? 'active' : ''}`} onClick={() => handleCategoryChange('files')}>
              <FileText size={16} />
              <span>文件</span>
            </div>
            <div className={`settings-category-item ${activeCategory === 'shortcuts' ? 'active' : ''}`} onClick={() => handleCategoryChange('shortcuts')}>
              <Keyboard size={16} />
              <span>快捷键</span>
            </div>
            <div className={`settings-category-item ${activeCategory === 'compiler' ? 'active' : ''}`} onClick={() => handleCategoryChange('compiler')}>
              <Settings size={16} />
              <span>编译器</span>
            </div>
            <div className={`settings-category-item ${activeCategory === 'extensions' ? 'active' : ''}`} onClick={() => handleCategoryChange('extensions')}>
              <Puzzle size={16} />
              <span>扩展</span>
            </div>
            <div className={`settings-category-item ${activeCategory === 'other' ? 'active' : ''}`} onClick={() => handleCategoryChange('other')}>
              <MoreHorizontal size={16} />
              <span>其他</span>
            </div>
          </div>
          <div className="settings-category-bottom">
            <div className={`settings-category-item ${activeCategory === 'about' ? 'active' : ''}`} onClick={() => handleCategoryChange('about')}>
              <Info size={16} />
              <span>关于</span>
            </div>
          </div>
        </div>
      </div>
      <div className="settings-content-area">
        <div className="settings-content-header" data-tauri-drag-region="true">
          <TitleRoller activeCategory={activeCategory} direction={slideDirection} />
          <button className="settings-close-btn" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>
        <div key={slidePages.join('-')} className={`settings-page-filmstrip-wrapper ${slidePages.length > 1 ? 'animating' : ''}`}>
          <div className={`settings-page-filmstrip slide-${slideDirection}`} style={{
          ['--page-count' as any]: slidePages.length,
          ['--slide-duration' as any]: `${0.25 + (slidePages.length - 1) * 0.12}s`
        }} onAnimationEnd={e => {
          if (e.target !== e.currentTarget) return;
          setSlidePages([activeCategory]);
          setIsAnimating(false);
        }}>
            {slidePages.map(cat => <div key={cat} className="settings-page-frame">
                {renderContentFor(cat)}
              </div>)}
          </div>
        </div>
        <div className="settings-button-area">
          <div className="settings-button-right">
            <button className="settings-btn settings-btn-ok" onClick={handleOK}>
              确定
            </button>
            <button className="settings-btn settings-btn-apply" onClick={handleApply}>
              应用
            </button>
            <button className="settings-btn settings-btn-cancel" onClick={handleCancel}>
              取消
            </button>
          </div>
        </div>
      </div>
    </div>;
  if (isStandalone) {
    return content;
  }
  return <div className={`settings-overlay ${isClosing ? 'closing' : ''}`} onClick={e => {
    if (e.target === e.currentTarget && !isClosing) handleClose();
  }}>
      {content}
    </div>;
};
export const SettingsWindow = React.memo(SettingsWindowComponent);