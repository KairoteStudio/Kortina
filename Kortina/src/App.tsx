import React, { useState, useCallback, useRef, Suspense, useEffect, useMemo } from 'react';
import { Save, FileText } from 'lucide-react';
import StatusBar from './components/Core/StatusBar';
import { AppHeader } from './components/Core/layout/AppHeader';
import { AppTabs } from './components/Core/layout/AppTabs';
import { Sidebar } from './components/Core/sidebar/Sidebar';
import { openExternalUrl } from './utils/links';
import { isTauri } from './utils/environment';
import { useAppActions } from './hooks/useAppActions';
import { useAppBootstrap } from './hooks/useAppBootstrap';
import { useWindowEvents } from './hooks/useWindowEvents';
import { useSplash } from './hooks/useSplash';
import { useEditorTabs } from './hooks/useEditorTabs';
import { useCompiler } from './hooks/useCompiler';
import { useAppZoom } from './hooks/useAppZoom';
import { useAppShortcuts } from './hooks/useAppShortcuts';
import { useEditorCommands } from './hooks/useEditorCommands';
import { useExplorerCommands } from './hooks/useExplorerCommands';
import { usePlugins } from './plugins/usePlugins';
import { pluginManager } from './plugins/PluginManager';
import { DEFAULT_SHORTCUTS } from './constants/shortcuts';
import type { ProjectExplorerRef } from './components/ProjectExplorer';
import type { MonacoEditorInstance } from './types/editor';
import { useUISettingsStore, useEditorStore, useTerminalStore, useProjectStore } from './stores';
const CodeEditor = React.lazy(() => import('./components/Core/CodeEditor'));
const ProjectExplorer = React.lazy(() => import('./components/ProjectExplorer'));
const TerminalPanel = React.lazy(() => import('./components/Core/terminal/TerminalPanel'));
const PluginsPanel = React.lazy(() => import('./plugins/PluginsPanel'));
const SettingsWindow = React.lazy(() => import('./components/Core/SettingsWindow').then(m => ({
  default: m.SettingsWindow
})));
const AppWelcome = React.lazy(() => import('./components/Core/layout/AppWelcome').then(m => ({
  default: m.AppWelcome
})));
const SearchPanel = React.lazy(() => import('./components/Core/sidebar/panels/SearchPanel'));
const GitPanel = React.lazy(() => import('./components/Core/sidebar/panels/GitPanel'));
const DebugPanel = React.lazy(() => import('./components/Core/sidebar/panels/DebugPanel'));
const PluginPanelHost = React.lazy(() => import('./plugins/PluginPanelHost'));
import { parsePluginPanelViewId, isPluginPanelView } from './plugins/PluginPanelHost';
import './App.css';
import './styles/monaco-overrides.css';
const isTauriEnv = isTauri();
const PanelFallback = () => <div style={{
  flex: 1,
  minHeight: 0
}} />;
const LoadMarker = ({
  region,
  children,
  onMount
}: {
  region: import('./hooks/useSplash').SplashRegion;
  children: React.ReactNode;
  onMount: (region: import('./hooks/useSplash').SplashRegion) => void;
}) => {
  React.useEffect(() => {
    onMount(region);
  }, [region, onMount]);
  return <>{children}</>;
};
function App() {
  const {
    theme,
    setTheme,
    themeGroup,
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
    isSettingsWindowOpen,
    setSettingsWindowOpen,
    settingsInitialCategory,
    isPluginsPanelOpen,
    setPluginsPanelOpen,
    sidebarWidth,
    sidebarCollapsed,
    setSidebarCollapsed,
    currentSidebarView,
    setCurrentSidebarView,
    explorerWidth,
    consoleHeight
  } = useUISettingsStore();
  const {
    isOpen: isTerminalOpen,
    setIsOpen: setIsTerminalOpen,
    toggleTerminal
  } = useTerminalStore();
  const {
    recentProjects,
    currentProjectPath
  } = useProjectStore();
  const cursorPosition = useEditorStore(state => state.cursorPosition);
  const [isDraggingExplorer, setIsDraggingExplorer] = useState(false);
  const [isDraggingConsole, setIsDraggingConsole] = useState(false);
  const [vcsActionTrigger, setVcsActionTrigger] = useState<'commit' | 'push' | 'pull' | null>(null);
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const projectExplorerRef = useRef<ProjectExplorerRef | null>(null);
  const {
    saveRecentProject,
    openSettingsWindow,
    toggleTheme,
    scheduleLoadRecentProjects
  } = useAppBootstrap({
    isTauri: isTauriEnv,
    projectExplorerRef
  });
  const {
    beginExplorerResize,
    beginConsoleResize
  } = useWindowEvents({
    isDraggingExplorer,
    setIsDraggingExplorer,
    isDraggingConsole,
    setIsDraggingConsole
  });
  const {
    visibleRegions,
    splashRemoved,
    markRegionLoaded
  } = useSplash();
  scheduleLoadRecentProjects(splashRemoved);
  const {
    tabs,
    activeTab,
    currentTab,
    openFile,
    closeTab,
    updateTabContent,
    saveCurrentFile,
    handleTabClick
  } = useEditorTabs({
    isTauri: isTauriEnv,
    autoSave,
    autoSaveInterval
  });
  const {
    isCompiling,
    compileOutput,
    compileProject,
    runProject
  } = useCompiler({
    isTauri: isTauriEnv,
    saveCurrentFile
  });
  const {
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    appStyle
  } = useAppZoom();
  usePlugins({
    autoInitialize: true
  });
  useEffect(() => {
    const handlePluginOpenFile = (event: Event) => {
      const customEvent = event as CustomEvent<{
        path: string;
      }>;
      const {
        path
      } = customEvent.detail;
      if (projectExplorerRef.current) {
        projectExplorerRef.current.loadDirectory(path).catch(console.error);
      }
    };
    window.addEventListener('plugin:open-file', handlePluginOpenFile);
    return () => window.removeEventListener('plugin:open-file', handlePluginOpenFile);
  }, []);
  const actions = useAppActions({
    isTauri: isTauriEnv,
    editorRef,
    compileProject,
    runProject,
    saveCurrentFile,
    openExternalUrl,
    setVcsActionTrigger
  });
  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed, setSidebarCollapsed]);
  const handleCloseTab = useCallback(() => {
    if (activeTab) closeTab(activeTab);
  }, [activeTab, closeTab]);
  const handleNextTab = useCallback(() => {
    if (tabs.length === 0) return;
    const idx = tabs.findIndex(t => t.id === activeTab);
    const next = tabs[(idx >= 0 ? idx + 1 : 0) % tabs.length];
    if (next) handleTabClick(next.id);
  }, [tabs, activeTab, handleTabClick]);
  const handlePrevTab = useCallback(() => {
    if (tabs.length === 0) return;
    const idx = tabs.findIndex(t => t.id === activeTab);
    const prev = tabs[idx > 0 ? idx - 1 : tabs.length - 1];
    if (prev) handleTabClick(prev.id);
  }, [tabs, activeTab, handleTabClick]);
  const editorCommands = useEditorCommands({
    projectExplorerRef,
    actions: {
      handleCopy: actions.handleCopy,
      handleCut: actions.handleCut,
      handlePaste: actions.handlePaste,
      handleRenameSymbol: actions.handleRenameSymbol,
      handleRun: actions.handleRun
    }
  });
  const explorerCommands = useExplorerCommands({
    projectExplorerRef
  });
  const shortcutHandlers = useMemo(() => ({
    newFile: actions.handleNewFile,
    openFile: actions.handleOpenFile,
    saveFile: actions.handleSaveFile,
    saveAs: actions.handleSaveAs,
    exit: actions.handleExit,
    undo: actions.handleUndo,
    redo: actions.handleRedo,
    copy: editorCommands.handleCopy,
    cut: editorCommands.handleCut,
    paste: editorCommands.handlePaste,
    selectAll: actions.handleSelectAll,
    find: actions.handleFind,
    replace: actions.handleReplace,
    toggleExplorer: actions.handleToggleExplorer,
    toggleVcs: actions.handleToggleVcsPanel,
    toggleSidebar: handleToggleSidebar,
    toggleConsole: toggleTerminal,
    toggleFullscreen: actions.handleFullscreen,
    zoomIn: handleZoomIn,
    zoomOut: handleZoomOut,
    resetZoom: handleResetZoom,
    goToDefinition: actions.handleGoToDefinition,
    goToDeclaration: actions.handleGoToDeclaration,
    goToImplementation: actions.handleGoToImplementation,
    goBack: actions.handleGoBack,
    goForward: actions.handleGoForward,
    formatDocument: actions.handleFormatDocument,
    toggleLineComment: actions.handleToggleLineComment,
    toggleBlockComment: actions.handleToggleBlockComment,
    triggerSuggest: actions.handleTriggerSuggest,
    quickFix: actions.handleQuickFix,
    renameSymbol: editorCommands.handleRename,
    extractFunction: actions.handleExtractFunction,
    extractVariable: actions.handleExtractVariable,
    inlineVariable: actions.handleInlineVariable,
    compile: actions.handleCompile,
    rebuild: actions.handleRebuildProject,
    clean: actions.handleCleanProject,
    run: editorCommands.handleRun,
    debug: actions.handleDebugProject,
    stop: actions.handleStopProject,
    settings: () => {
      void openSettingsWindow();
    },
    commit: actions.handleCommit,
    push: actions.handlePush,
    pull: actions.handlePull,
    newWindow: actions.handleNewWindow,
    closeTab: handleCloseTab,
    closeWindow: actions.handleCloseWindow,
    nextTab: handleNextTab,
    prevTab: handlePrevTab,
    minimize: actions.handleMinimize,
    documentation: actions.handleDocumentation,
    keyboardShortcuts: actions.handleKeyboardShortcuts,
    explorerNewFile: explorerCommands.handleExplorerNewFile,
    explorerNewFolder: explorerCommands.handleExplorerNewFolder,
    explorerDelete: explorerCommands.handleExplorerDelete
  }), [actions, handleToggleSidebar, toggleTerminal, handleZoomIn, handleZoomOut, handleResetZoom, openSettingsWindow, handleCloseTab, handleNextTab, handlePrevTab, editorCommands, explorerCommands]);
  const effectiveShortcuts = useMemo(() => ({
    ...DEFAULT_SHORTCUTS,
    ...shortcuts
  }), [shortcuts]);
  useAppShortcuts(effectiveShortcuts, shortcutHandlers);
  const openRecentProject = useCallback(async (projectPath: string) => {
    try {
      if (projectExplorerRef.current) {
        await projectExplorerRef.current.loadDirectory(projectPath);
        await saveRecentProject(projectPath);
      }
    } catch (error) {
      console.error('打开最近项目失败:', error);
    }
  }, [saveRecentProject]);
  const handleOpenFolder = useCallback(() => {
    projectExplorerRef.current?.handleOpenFolder();
  }, []);
  const handleTerminalClose = useCallback(() => setIsTerminalOpen(false), [setIsTerminalOpen]);
  const handleEditorReady = useCallback((editor: MonacoEditorInstance) => {
    editorRef.current = editor;
    pluginManager.setEditor(editor);
  }, []);
  return <div className="app" style={appStyle}>
      {visibleRegions.has('top') ? <LoadMarker region="top" onMount={markRegionLoaded}>
          <AppHeader editorRef={editorRef} projectExplorerRef={projectExplorerRef} compileProject={compileProject} runProject={runProject} saveCurrentFile={saveCurrentFile} openSettingsWindow={openSettingsWindow} toggleTheme={toggleTheme} setVcsActionTrigger={setVcsActionTrigger} />
        </LoadMarker> : <div className="splash-region splash-top" data-region="top" />}

      <div className="main-content">
        {visibleRegions.has('sidebar') ? <LoadMarker region="sidebar" onMount={markRegionLoaded}>
            <Sidebar width={sidebarWidth} isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} currentView={currentSidebarView} onViewChange={setCurrentSidebarView} isTerminalOpen={isTerminalOpen} onTerminalToggle={toggleTerminal} isSettingsOpen={isSettingsWindowOpen} onSettingsToggle={() => void openSettingsWindow()} />
          </LoadMarker> : <div className="splash-region splash-sidebar" data-region="sidebar" />}

        <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0
      }}>
          <div style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden'
        }}>
            <div className="project-explorer-wrapper" style={{
            width: explorerWidth,
            display: currentSidebarView ? 'flex' : 'none'
          }}>
              {visibleRegions.has('explorer') ? <LoadMarker region="explorer" onMount={markRegionLoaded}>
                  {currentSidebarView === 'explorer' && <Suspense fallback={<div className="splash-region splash-explorer" style={{
                width: '100%',
                height: '100%'
              }} />}>
                      <ProjectExplorer ref={projectExplorerRef} onFileSelect={openFile} currentFile={activeTab} onProjectOpen={saveRecentProject} currentProjectPath={currentProjectPath} />
                    </Suspense>}
                  {currentSidebarView === 'search' && <Suspense fallback={<div className="splash-region splash-explorer" style={{
                width: '100%',
                height: '100%'
              }} />}>
                      <SearchPanel projectPath={currentProjectPath} onFileSelect={openFile} />
                    </Suspense>}
                  {currentSidebarView === 'git' && <Suspense fallback={<div className="splash-region splash-explorer" style={{
                width: '100%',
                height: '100%'
              }} />}>
                      <GitPanel projectPath={currentProjectPath} actionTrigger={vcsActionTrigger} onActionTriggered={() => setVcsActionTrigger(null)} />
                    </Suspense>}
                  {currentSidebarView === 'debug' && <Suspense fallback={<div className="splash-region splash-explorer" style={{
                width: '100%',
                height: '100%'
              }} />}>
                      <DebugPanel />
                    </Suspense>}
                  {isPluginPanelView(currentSidebarView) && <Suspense fallback={<div className="splash-region splash-explorer" style={{
                width: '100%',
                height: '100%'
              }} />}>
                      <PluginPanelHost panelId={parsePluginPanelViewId(currentSidebarView) || ''} />
                    </Suspense>}
                </LoadMarker> : <div className="splash-region splash-explorer" data-region="explorer" />}
            </div>

            <div className="resize-handle-vertical" onMouseDown={beginExplorerResize} title="拖拽调整侧边栏面板大小" />

            <div className="editor-area">
              {visibleRegions.has('editor') ? <LoadMarker region="editor" onMount={markRegionLoaded}>
                  <AppTabs tabs={tabs} activeTab={activeTab} onTabClick={handleTabClick} onTabClose={closeTab} />
                  <div className="code-editor-container">
                    {tabs.length === 0 ? <Suspense fallback={<div className="splash-region splash-editor" style={{
                  width: '100%',
                  height: '100%'
                }} />}>
                        <AppWelcome currentProjectPath={currentProjectPath} recentProjects={recentProjects} onOpenFolder={handleOpenFolder} onNewFile={actions.handleNewFile} onOpenSettings={openSettingsWindow} onOpenRecentProject={openRecentProject} openExternalUrl={openExternalUrl} />
                      </Suspense> : currentTab ? <div className="code-editor-wrapper">
                        <div className="editor-header">
                          <div className="editor-title">
                            <FileText size={16} />
                            <span>{currentTab.name}</span>
                            {currentTab.isDirty && <span className="dirty-indicator">●</span>}
                          </div>
                          <div className="editor-actions">
                            <button className="editor-action" onClick={saveCurrentFile} title="保存 (Ctrl+S)">
                              <Save size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="editor-content">
                          <Suspense fallback={<div className="splash-region splash-editor" style={{
                      width: '100%',
                      height: '100%'
                    }} />}>
                            <CodeEditor key={activeTab || 'monaco-editor'} content={currentTab.content} language={currentTab.language || 'kairote'} theme={theme} onChange={value => {
                        if (activeTab) updateTabContent(activeTab, value || '');
                      }} onSave={saveCurrentFile} onCursorChange={(line, column) => useEditorStore.getState().setCursorPosition({
                        line,
                        column
                      })} fontSize={fontSize} fontFamily={fontFamily} fontLigatures={fontLigatures} syntaxTheme={syntaxTheme} tabSize={tabSize} onEditorReady={handleEditorReady} currentFilePath={currentTab.id} />
                          </Suspense>
                        </div>
                      </div> : null}
                  </div>
                </LoadMarker> : <>
                  <div className="splash-region splash-top" style={{
                height: '35px',
                flexShrink: 0
              }} />
                  <div className="splash-region splash-editor" style={{
                flex: 1
              }} />
                </>}
            </div>
          </div>

          {isTerminalOpen && splashRemoved && <>
              <div className="resize-handle-horizontal" onMouseDown={beginConsoleResize} title="拖拽调整终端大小" />
              <div className="console-panel-wrapper" style={{
            height: consoleHeight,
            flexShrink: 0
          }}>
                <Suspense fallback={<PanelFallback />}>
                  <TerminalPanel isOpen={isTerminalOpen} height={consoleHeight} onClose={handleTerminalClose} />
                </Suspense>
              </div>
            </>}
        </div>
      </div>

      {visibleRegions.has('status') ? <LoadMarker region="status" onMount={markRegionLoaded}>
          <StatusBar currentFile={currentTab?.name || ''} currentProjectPath={currentProjectPath} cursorPosition={cursorPosition} isCompiling={isTauriEnv ? isCompiling : false} compileMessage={isTauriEnv ? compileOutput : '编译功能仅在桌面应用中可用'} onToggleSettings={() => openSettingsWindow('general')} onToggleConsole={toggleTerminal} />
        </LoadMarker> : <div className="splash-region splash-status" data-region="status" />}

      {splashRemoved && isSettingsWindowOpen && <Suspense fallback={null}>
          <SettingsWindow isOpen={isSettingsWindowOpen} onClose={() => setSettingsWindowOpen(false)} theme={theme} themeGroup={themeGroup} setTheme={setTheme} setThemeGroup={setThemeGroup} fontSize={fontSize} setFontSize={setFontSize} fontFamily={fontFamily} setFontFamily={setFontFamily} fontLigatures={fontLigatures} setFontLigatures={setFontLigatures} syntaxTheme={syntaxTheme} setSyntaxTheme={setSyntaxTheme} tabSize={tabSize} setTabSize={setTabSize} wordWrap={wordWrap} setWordWrap={setWordWrap} showLineNumbers={showLineNumbers} setShowLineNumbers={setShowLineNumbers} autoSave={autoSave} setAutoSave={setAutoSave} autoSaveInterval={autoSaveInterval} setAutoSaveInterval={setAutoSaveInterval} showMinimap={showMinimap} setShowMinimap={setShowMinimap} enableCodeLens={enableCodeLens} setEnableCodeLens={setEnableCodeLens} uiZoom={uiZoom} setUiZoom={setUiZoom} compilerPath={compilerPath} setCompilerPath={setCompilerPath} compilerUseSystemPath={compilerUseSystemPath} setCompilerUseSystemPath={setCompilerUseSystemPath} compilerTargetType={compilerTargetType} setCompilerTargetType={setCompilerTargetType} compilerOutputFile={compilerOutputFile} setCompilerOutputFile={setCompilerOutputFile} compilerShowIR={compilerShowIR} setCompilerShowIR={setCompilerShowIR} shortcuts={shortcuts} setShortcuts={setShortcuts} initialCategory={settingsInitialCategory} openExternalUrl={openExternalUrl} />
        </Suspense>}

      {splashRemoved && isPluginsPanelOpen && <Suspense fallback={null}>
          <PluginsPanel isOpen={isPluginsPanelOpen} onClose={() => setPluginsPanelOpen(false)} />
        </Suspense>}

    </div>;
}
export default App;