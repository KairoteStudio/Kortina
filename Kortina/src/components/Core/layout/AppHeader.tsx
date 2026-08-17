import React from 'react';
import MenuToolbar from '../MenuToolbar';
import { ProjectSelector } from '../ProjectSelector';
import { WindowControls } from '../WindowControls';
import { DropdownMenu } from '../DropdownMenu';
import { useHeaderActions } from '../../../hooks/useHeaderActions';
import { useProjectStore, useUISettingsStore, useEditorStore, useCompileStore } from '../../../stores';
import { isTauri, isMobile } from '../../../utils/environment';
import type { MonacoEditorInstance } from '../../../types/editor';
import type { ProjectExplorerRef } from '../../ProjectExplorer';
export interface AppHeaderProps {
  editorRef: React.RefObject<MonacoEditorInstance | null>;
  projectExplorerRef: React.RefObject<ProjectExplorerRef | null>;
  compileProject: () => Promise<void>;
  runProject: () => Promise<void>;
  saveCurrentFile: () => Promise<void>;
  openSettingsWindow: (category?: string) => void | Promise<void>;
  toggleTheme: () => void;
  setVcsActionTrigger: (trigger: 'commit' | 'push' | 'pull' | null) => void;
}
const AppHeaderComponent: React.FC<AppHeaderProps> = ({
  editorRef,
  projectExplorerRef,
  compileProject,
  runProject,
  saveCurrentFile,
  openSettingsWindow,
  toggleTheme,
  setVcsActionTrigger
}) => {
  const {
    currentProjectPath,
    recentProjects
  } = useProjectStore();
  const {
    theme
  } = useUISettingsStore();
  const {
    isCompiling
  } = useCompileStore();
  const hasActiveTab = !!useEditorStore(state => state.activeTab);
  const actions = useHeaderActions({
    editorRef,
    projectExplorerRef,
    compileProject,
    runProject,
    saveCurrentFile,
    openSettingsWindow,
    toggleTheme,
    setVcsActionTrigger
  });
  const mobile = isMobile();
  return <div className="top-menu-bar" data-tauri-drag-region={!mobile ? '' : undefined}>
      <div className="menu-left">
        <MenuToolbar onNewFile={actions.onNewFile} onOpenFile={actions.onOpenFile} onSaveFile={actions.onSaveFile} onSaveAs={actions.onSaveAs} onExit={actions.onExit} onSettings={actions.onSettings} onCompile={actions.onCompile} onRun={actions.onRun} onToggleConsole={actions.onToggleConsole} onToggleExplorer={actions.onToggleExplorer} onToggleVcsPanel={actions.onToggleVcsPanel} onUndo={actions.onUndo} onRedo={actions.onRedo} onCut={actions.onCut} onCopy={actions.onCopy} onPaste={actions.onPaste} onFind={actions.onFind} onReplace={actions.onReplace} onZoomIn={actions.onZoomIn} onZoomOut={actions.onZoomOut} onResetZoom={actions.onResetZoom} onGoToDefinition={actions.onGoToDefinition} onGoToDeclaration={actions.onGoToDeclaration} onGoToImplementation={actions.onGoToImplementation} onGoBack={actions.onGoBack} onGoForward={actions.onGoForward} onFormatDocument={actions.onFormatDocument} onToggleLineComment={actions.onToggleLineComment} onToggleBlockComment={actions.onToggleBlockComment} onTriggerSuggest={actions.onTriggerSuggest} onQuickFix={actions.onQuickFix} onRenameSymbol={actions.onRenameSymbol} onExtractFunction={actions.onExtractFunction} onExtractVariable={actions.onExtractVariable} onInlineVariable={actions.onInlineVariable} onRebuildProject={actions.onRebuildProject} onCleanProject={actions.onCleanProject} onBuildConfiguration={actions.onBuildConfiguration} onDebugProject={actions.onDebugProject} onStopProject={actions.onStopProject} onRunConfiguration={actions.onRunConfiguration} onPreferences={actions.onPreferences} onExtensions={actions.onExtensions} onThemes={actions.onThemes} onKeybindings={actions.onKeybindings} onCommit={actions.onCommit} onPush={actions.onPush} onPull={actions.onPull} onBranch={actions.onBranch} onMerge={actions.onMerge} onStash={actions.onStash} onNewWindow={actions.onNewWindow} onCloseWindow={actions.onCloseWindow} onMinimize={actions.onMinimize} onMaximize={actions.onMaximize} onFullscreen={actions.onFullscreen} onWelcome={actions.onWelcome} onDocumentation={actions.onDocumentation} onKeyboardShortcuts={actions.onKeyboardShortcuts} onAbout={actions.onAbout} />
        <ProjectSelector currentProjectPath={currentProjectPath} recentProjects={recentProjects} onProjectSelect={actions.openRecentProject} onOpenFolder={actions.onOpenFolder} onRemoveProjects={actions.onRemoveRecentProjects} />
      </div>
      {!mobile && <div style={{
      flex: 1,
      height: '100%'
    }} data-tauri-drag-region />}
      <div className="menu-right">
        <DropdownMenu onCompile={actions.onCompileAction} onSave={actions.onSaveAction} onOpenFolder={actions.onOpenFolder} onToggleTheme={actions.onToggleTheme} onOpenSettings={actions.onSettings} isCompiling={isCompiling} isTauri={isTauri()} theme={theme} hasActiveTab={hasActiveTab} />
        <WindowControls />
      </div>
    </div>;
};
export const AppHeader = React.memo(AppHeaderComponent);