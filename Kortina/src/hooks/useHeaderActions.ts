import { useCallback, useMemo } from 'react';
import { useAppActions } from './useAppActions';
import { useAppZoom } from './useAppZoom';
import { useProjectStore, useUISettingsStore, useEditorStore, useCompileStore, useTerminalStore } from '../stores';
import { isTauri } from '../utils/environment';
import { openExternalUrl } from '../utils/links';
import type { MonacoEditorInstance } from '../types/editor';
import type { ProjectExplorerRef } from '../components/ProjectExplorer';
export interface UseHeaderActionsOptions {
  editorRef: React.RefObject<MonacoEditorInstance | null>;
  projectExplorerRef: React.RefObject<ProjectExplorerRef | null>;
  compileProject: () => Promise<void>;
  runProject: () => Promise<void>;
  saveCurrentFile: () => Promise<void>;
  openSettingsWindow: (category?: string) => void | Promise<void>;
  toggleTheme: () => void;
  setVcsActionTrigger: (trigger: 'commit' | 'push' | 'pull' | null) => void;
}
export const useHeaderActions = (options: UseHeaderActionsOptions) => {
  const {
    editorRef,
    projectExplorerRef,
    compileProject,
    runProject,
    saveCurrentFile,
    openSettingsWindow,
    toggleTheme,
    setVcsActionTrigger
  } = options;
  const isTauriEnv = isTauri();
  const {
    saveRecentProject,
    removeRecentProjects
  } = useProjectStore();
  const {
    setPluginsPanelOpen
  } = useUISettingsStore();
  const activeTab = useEditorStore(state => state.activeTab);
  const isCompiling = useCompileStore(state => state.isCompiling);
  const {
    toggleTerminal
  } = useTerminalStore();
  const appActions = useAppActions({
    isTauri: isTauriEnv,
    editorRef,
    compileProject,
    runProject,
    saveCurrentFile,
    openExternalUrl,
    setVcsActionTrigger
  });
  const {
    handleZoomIn,
    handleZoomOut,
    handleResetZoom
  } = useAppZoom();
  const handleOpenFolder = useCallback(async () => {
    projectExplorerRef.current?.handleOpenFolder();
  }, [projectExplorerRef]);
  const openRecentProject = useCallback(async (projectPath: string) => {
    try {
      if (projectExplorerRef.current) {
        await projectExplorerRef.current.loadDirectory(projectPath);
        await saveRecentProject(projectPath);
      }
    } catch (error) {
      console.error('打开最近项目失败:', error);
    }
  }, [projectExplorerRef, saveRecentProject]);
  const handleRemoveRecentProjects = useCallback(async (paths: string[]) => {
    try {
      await removeRecentProjects(paths);
    } catch (error) {
      console.error('移除最近项目失败:', error);
    }
  }, [removeRecentProjects]);
  const handleSettings = useCallback(() => {
    void openSettingsWindow();
  }, [openSettingsWindow]);
  const handleExtensions = useCallback(() => {
    setPluginsPanelOpen(true);
  }, [setPluginsPanelOpen]);
  const handleCompileAction = useCallback(() => {
    void compileProject();
  }, [compileProject]);
  const handleSaveAction = useCallback(() => {
    void saveCurrentFile();
  }, [saveCurrentFile]);
  return useMemo(() => ({
    isCompiling,
    hasActiveTab: !!activeTab,
    onNewFile: appActions.handleNewFile,
    onOpenFile: appActions.handleOpenFile,
    onSaveFile: appActions.handleSaveFile,
    onSaveAs: appActions.handleSaveAs,
    onExit: appActions.handleExit,
    onSettings: handleSettings,
    onCompile: appActions.handleCompile,
    onRun: appActions.handleRun,
    onToggleConsole: () => toggleTerminal(),
    onToggleExplorer: appActions.handleToggleExplorer,
    onToggleVcsPanel: appActions.handleToggleVcsPanel,
    onUndo: appActions.handleUndo,
    onRedo: appActions.handleRedo,
    onCut: appActions.handleCut,
    onCopy: appActions.handleCopy,
    onPaste: appActions.handlePaste,
    onFind: appActions.handleFind,
    onReplace: appActions.handleReplace,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onResetZoom: handleResetZoom,
    onGoToDefinition: appActions.handleGoToDefinition,
    onGoToDeclaration: appActions.handleGoToDeclaration,
    onGoToImplementation: appActions.handleGoToImplementation,
    onGoBack: appActions.handleGoBack,
    onGoForward: appActions.handleGoForward,
    onFormatDocument: appActions.handleFormatDocument,
    onToggleLineComment: appActions.handleToggleLineComment,
    onToggleBlockComment: appActions.handleToggleBlockComment,
    onTriggerSuggest: appActions.handleTriggerSuggest,
    onQuickFix: appActions.handleQuickFix,
    onRenameSymbol: appActions.handleRenameSymbol,
    onExtractFunction: appActions.handleExtractFunction,
    onExtractVariable: appActions.handleExtractVariable,
    onInlineVariable: appActions.handleInlineVariable,
    onRebuildProject: appActions.handleRebuildProject,
    onCleanProject: appActions.handleCleanProject,
    onBuildConfiguration: appActions.handleBuildConfiguration,
    onDebugProject: appActions.handleDebugProject,
    onStopProject: appActions.handleStopProject,
    onRunConfiguration: appActions.handleRunConfiguration,
    onPreferences: appActions.handlePreferences,
    onExtensions: handleExtensions,
    onThemes: appActions.handleThemes,
    onKeybindings: appActions.handleKeybindings,
    onCommit: appActions.handleCommit,
    onPush: appActions.handlePush,
    onPull: appActions.handlePull,
    onBranch: appActions.handleBranch,
    onMerge: appActions.handleMerge,
    onStash: appActions.handleStash,
    onNewWindow: appActions.handleNewWindow,
    onCloseWindow: appActions.handleCloseWindow,
    onMinimize: appActions.handleMinimize,
    onMaximize: appActions.handleMaximize,
    onFullscreen: appActions.handleFullscreen,
    onWelcome: () => {},
    onDocumentation: appActions.handleDocumentation,
    onKeyboardShortcuts: appActions.handleKeyboardShortcuts,
    onAbout: appActions.handleAbout,
    onOpenFolder: handleOpenFolder,
    onCompileAction: handleCompileAction,
    onSaveAction: handleSaveAction,
    onToggleTheme: toggleTheme,
    openRecentProject,
    onRemoveRecentProjects: handleRemoveRecentProjects
  }), [appActions, activeTab, isCompiling, handleSettings, handleExtensions, handleOpenFolder, openRecentProject, handleRemoveRecentProjects, handleCompileAction, handleSaveAction, toggleTheme, toggleTerminal, handleZoomIn, handleZoomOut, handleResetZoom]);
};