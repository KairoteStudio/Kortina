import { useCallback } from 'react';
import type { Tab } from '../types/app';
import { useUISettingsStore, useEditorStore, useCompileStore, useProjectStore } from '../stores';
import { readFile, writeFile } from '../utils/fileSystem';
import { detectLanguage } from '../utils/languageDetection';
import { AppEvents, type VcsActionTriggerPayload, type OpenFolderPayload } from '../events/app-events';
import type { MonacoEditorInstance } from '../types/editor';
import { showErrorToast, showInfoToast, showSuccessToast, showWarningToast } from '../utils/toastService';
import { VcsService } from '../services/vcs';
interface UseAppActionsOptions {
  isTauri: boolean;
  editorRef: React.RefObject<MonacoEditorInstance | null>;
  compileProject: () => Promise<void>;
  runProject: () => Promise<void>;
  saveCurrentFile: () => Promise<void>;
  openExternalUrl: (url: string) => void;
  setVcsActionTrigger: (trigger: 'commit' | 'push' | 'pull' | null) => void;
}
export const useAppActions = (options: UseAppActionsOptions) => {
  const {
    isTauri,
    editorRef,
    compileProject,
    runProject,
    saveCurrentFile,
    openExternalUrl,
    setVcsActionTrigger
  } = options;
  const {
    setSettingsWindowOpen,
    setPluginsPanelOpen,
    currentSidebarView,
    setCurrentSidebarView,
    compilerOutputFile
  } = useUISettingsStore();
  const {
    tabs,
    setTabs,
    activeTab,
    setActiveTab,
    setEditorContent,
    setCompileErrors
  } = useEditorStore();
  const {
    setIsCompiling,
    setOutput: setCompileOutput,
    appendOutput: appendCompileOutput
  } = useCompileStore();
  const {
    currentProjectPath
  } = useProjectStore();
  const handleNewFile = useCallback(() => {
    const newTab: Tab = {
      id: `new-${Date.now()}`,
      name: `未命名-${tabs.length + 1}.krt`,
      content: '',
      isDirty: true,
      language: 'kairote'
    };
    setTabs([...tabs, newTab]);
    setActiveTab(newTab.id);
    setEditorContent('');
  }, [tabs, setTabs, setActiveTab, setEditorContent]);
  const handleOpenFile = useCallback(async () => {
    try {
      if (isTauri) {
        const {
          open
        } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          multiple: false,
          filters: [{
            name: 'Kairote Files',
            extensions: ['krt', 'kairote']
          }, {
            name: 'All Files',
            extensions: ['*']
          }]
        });
        if (selected && typeof selected === 'string') {
          const fileName = selected.split('\\').pop() || selected.split('/').pop() || 'unknown';
          const fileContent = await readFile(selected);
          const content = fileContent.content;
          const language = detectLanguage(fileName);
          const newTab: Tab = {
            id: selected,
            name: fileName,
            content,
            isDirty: false,
            language
          };
          setTabs(tabs.find(t => t.id === selected) ? tabs : [...tabs, newTab]);
          setActiveTab(selected);
          setEditorContent(content);
          if (isTauri) {
            import('../utils/fileCache').then(({
              cacheFile
            }) => {
              cacheFile(selected, content);
            });
          }
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.krt,.kairote,.js,.jsx,.ts,.tsx,.html,.htm,.css';
        input.onchange = async e => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const content = await file.text();
            const language = detectLanguage(file.name);
            const newTab: Tab = {
              id: `browser-${Date.now()}`,
              name: file.name,
              content,
              isDirty: false,
              language
            };
            setTabs([...tabs, newTab]);
            setActiveTab(newTab.id);
            setEditorContent(content);
          }
        };
        input.click();
      }
    } catch (error) {
      console.error('导入文件失败:', error);
    }
  }, [isTauri, tabs, setTabs, setActiveTab, setEditorContent, readFile]);
  const handleSaveFile = useCallback(async () => {
    await saveCurrentFile();
  }, [saveCurrentFile]);
  const handleSaveAs = useCallback(async () => {
    if (!activeTab) return;
    const currentTab = tabs.find(tab => tab.id === activeTab);
    if (!currentTab) return;
    try {
      if (isTauri) {
        const {
          save
        } = await import('@tauri-apps/plugin-dialog');
        const filePath = await save({
          filters: [{
            name: 'Kairote Files',
            extensions: ['krt', 'kairote']
          }, {
            name: 'All Files',
            extensions: ['*']
          }]
        });
        if (filePath) {
          await writeFile(filePath, currentTab.content);
          const updatedTabs = tabs.map(tab => tab.id === activeTab ? {
            ...tab,
            id: filePath,
            name: filePath.split('\\').pop() || filePath.split('/').pop() || tab.name,
            isDirty: false
          } : tab);
          setTabs(updatedTabs);
          setActiveTab(filePath);
        }
      } else {
        const blob = new Blob([currentTab.content], {
          type: 'text/plain'
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = currentTab.name;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
    }
  }, [activeTab, tabs, isTauri, setTabs, setActiveTab, writeFile]);
  const handleExit = useCallback(() => {
    if (isTauri) {
      import('@tauri-apps/api/window').then(({
        getCurrentWindow
      }) => getCurrentWindow().close());
    } else if (window.confirm('确定要关闭Kortina IDE吗？')) {
      window.close();
    }
  }, [isTauri]);
  const handleUndo = useCallback(() => editorRef.current?.trigger('keyboard', 'undo', null), [editorRef]);
  const handleRedo = useCallback(() => editorRef.current?.trigger('keyboard', 'redo', null), [editorRef]);
  const handleCut = useCallback(() => editorRef.current?.trigger('keyboard', 'cut', null), [editorRef]);
  const handleCopy = useCallback(() => editorRef.current?.trigger('keyboard', 'copy', null), [editorRef]);
  const handlePaste = useCallback(() => editorRef.current?.trigger('keyboard', 'paste', null), [editorRef]);
  const handleSelectAll = useCallback(() => editorRef.current?.trigger('keyboard', 'editor.action.selectAll', null), [editorRef]);
  const handleFind = useCallback(() => editorRef.current?.trigger('keyboard', 'actions.find', null), [editorRef]);
  const handleReplace = useCallback(() => editorRef.current?.getAction('editor.action.startFindReplaceAction')?.run(), [editorRef]);
  const handleGoToDefinition = useCallback(() => editorRef.current?.getAction('editor.action.revealDefinition')?.run(), [editorRef]);
  const handleGoToDeclaration = useCallback(() => editorRef.current?.getAction('editor.action.revealDeclaration')?.run(), [editorRef]);
  const handleGoToImplementation = useCallback(() => editorRef.current?.getAction('editor.action.goToImplementation')?.run(), [editorRef]);
  const handleGoBack = useCallback(() => editorRef.current?.getAction('workbench.action.navigateBack')?.run(), [editorRef]);
  const handleGoForward = useCallback(() => editorRef.current?.getAction('workbench.action.navigateForward')?.run(), [editorRef]);
  const handleFormatDocument = useCallback(() => editorRef.current?.getAction('editor.action.formatDocument')?.run(), [editorRef]);
  const handleToggleLineComment = useCallback(() => editorRef.current?.getAction('editor.action.commentLine')?.run(), [editorRef]);
  const handleToggleBlockComment = useCallback(() => editorRef.current?.getAction('editor.action.blockComment')?.run(), [editorRef]);
  const handleTriggerSuggest = useCallback(() => editorRef.current?.trigger('keyboard', 'editor.action.triggerSuggest', {}), [editorRef]);
  const handleQuickFix = useCallback(() => editorRef.current?.getAction('editor.action.quickFix')?.run(), [editorRef]);
  const handleRenameSymbol = useCallback(() => editorRef.current?.getAction('editor.action.rename')?.run(), [editorRef]);
  const handleExtractFunction = useCallback(() => {
    const action = editorRef.current?.getAction('editor.action.extractFunction');
    if (action) {
      action.run();
    } else {
      showInfoToast('提取函数', '当前编辑器不支持此重构操作，需要语言服务提供');
    }
  }, [editorRef]);
  const handleExtractVariable = useCallback(() => {
    const action = editorRef.current?.getAction('editor.action.extractVariable');
    if (action) {
      action.run();
    } else {
      showInfoToast('提取变量', '当前编辑器不支持此重构操作，需要语言服务提供');
    }
  }, [editorRef]);
  const handleInlineVariable = useCallback(() => {
    const action = editorRef.current?.getAction('editor.action.inlineVariable');
    if (action) {
      action.run();
    } else {
      showInfoToast('内联变量', '当前编辑器不支持此重构操作，需要语言服务提供');
    }
  }, [editorRef]);
  const handleCompile = useCallback(() => compileProject(), [compileProject]);
  const handleRun = useCallback(() => {
    if (activeTab) void runProject();
  }, [activeTab, runProject]);
  const handleRebuildProject = useCallback(async () => {
    if (!isTauri || !currentProjectPath) {
      if (!isTauri) showWarningToast('重新构建', '此功能仅在桌面应用中可用');
      return;
    }
    setIsCompiling(true);
    setCompileOutput('正在清理并重新编译项目...\n');
    setCompileErrors([]);
    try {
      const {
        invoke
      } = await import('@tauri-apps/api/core');
      const result = await invoke('clean_project', {
        projectPath: currentProjectPath,
        outputFile: compilerOutputFile
      });
      appendCompileOutput((result as string) + '\n');
      setIsCompiling(false);
      await compileProject();
      showSuccessToast('重新构建', '已清理构建产物，请确认编译选项');
    } catch (error) {
      appendCompileOutput(`错误: ${error}\n`);
      showErrorToast('重新构建失败', String(error));
    } finally {
      setIsCompiling(false);
    }
  }, [isTauri, currentProjectPath, compilerOutputFile, compileProject, setIsCompiling, setCompileOutput, appendCompileOutput, setCompileErrors]);
  const handleCleanProject = useCallback(async () => {
    if (!isTauri || !currentProjectPath) {
      if (!isTauri) showWarningToast('清理项目', '此功能仅在桌面应用中可用');
      return;
    }
    setIsCompiling(true);
    setCompileOutput('正在清理项目...\n');
    setCompileErrors([]);
    try {
      const {
        invoke
      } = await import('@tauri-apps/api/core');
      const result = await invoke('clean_project', {
        projectPath: currentProjectPath,
        outputFile: compilerOutputFile
      });
      appendCompileOutput((result as string) + '\n');
      showSuccessToast('清理完成', '项目已清理');
    } catch (error) {
      appendCompileOutput(`错误: ${error}\n`);
      showErrorToast('清理失败', String(error));
    } finally {
      setIsCompiling(false);
    }
  }, [isTauri, currentProjectPath, compilerOutputFile, setIsCompiling, setCompileOutput, appendCompileOutput, setCompileErrors]);
  const handleBuildConfiguration = useCallback(() => {
    void compileProject();
  }, [compileProject]);
  const handleDebugProject = useCallback(() => {
    setCurrentSidebarView('debug');
  }, [setCurrentSidebarView]);
  const handleStopProject = useCallback(async () => {
    if (!isTauri) return;
    const {
      invoke
    } = await import('@tauri-apps/api/core');
    const [buildStopped, runStopped] = await Promise.all([invoke<boolean>('stop_task', {
      taskId: 'build'
    }), invoke<boolean>('stop_task', {
      taskId: 'run'
    })]);
    setIsCompiling(false);
    if (buildStopped || runStopped) {
      appendCompileOutput('\n[已停止]\n');
      showInfoToast('已停止', '编译/运行任务已终止');
    } else {
      showInfoToast('无运行中任务', '当前没有正在运行的编译或运行任务');
    }
  }, [isTauri, setIsCompiling, appendCompileOutput]);
  const handleRunConfiguration = useCallback(() => {
    void runProject();
  }, [runProject]);
  const handleToggleVcsPanel = useCallback(() => {
    setCurrentSidebarView(currentSidebarView === 'git' ? 'explorer' : 'git');
  }, [currentSidebarView, setCurrentSidebarView]);
  const emitVcsActionTrigger = useCallback(async (trigger: VcsActionTriggerPayload) => {
    try {
      if (isTauri) {
        const {
          emit
        } = await import('@tauri-apps/api/event');
        await emit<VcsActionTriggerPayload>(AppEvents.VCS_ACTION_TRIGGER, trigger);
      }
    } catch (error) {
      console.error('Failed to emit VCS action trigger:', error);
    }
  }, [isTauri]);
  const handleCommit = useCallback(() => {
    setCurrentSidebarView('git');
    setVcsActionTrigger('commit');
    emitVcsActionTrigger('commit');
  }, [setCurrentSidebarView, setVcsActionTrigger, emitVcsActionTrigger]);
  const handlePush = useCallback(() => {
    setCurrentSidebarView('git');
    setVcsActionTrigger('push');
    emitVcsActionTrigger('push');
  }, [setCurrentSidebarView, setVcsActionTrigger, emitVcsActionTrigger]);
  const handlePull = useCallback(() => {
    setCurrentSidebarView('git');
    setVcsActionTrigger('pull');
    emitVcsActionTrigger('pull');
  }, [setCurrentSidebarView, setVcsActionTrigger, emitVcsActionTrigger]);
  const handleBranch = useCallback(() => {
    setCurrentSidebarView('git');
  }, [setCurrentSidebarView]);
  const handleMerge = useCallback(() => {
    setCurrentSidebarView('git');
  }, [setCurrentSidebarView]);
  const handleStash = useCallback(async () => {
    setCurrentSidebarView('git');
    if (!isTauri || !currentProjectPath) {
      showWarningToast('保存工作区', isTauri ? '请先打开项目' : '此功能仅在桌面应用中可用');
      return;
    }
    try {
      const result = await VcsService.stash(currentProjectPath);
      if (result.success) {
        showSuccessToast('工作区已保存', result.message);
      } else {
        showErrorToast('保存工作区失败', result.message);
      }
    } catch (error) {
      showErrorToast('保存工作区失败', String(error));
    }
  }, [isTauri, currentProjectPath, setCurrentSidebarView]);
  const handlePreferences = useCallback(() => setSettingsWindowOpen(true, 'general'), [setSettingsWindowOpen]);
  const handleExtensions = useCallback(() => setPluginsPanelOpen(true), [setPluginsPanelOpen]);
  const handleThemes = useCallback(() => setSettingsWindowOpen(true, 'general'), [setSettingsWindowOpen]);
  const handleKeybindings = useCallback(() => setSettingsWindowOpen(true, 'shortcuts'), [setSettingsWindowOpen]);
  const handleDocumentation = useCallback(() => openExternalUrl('https://krt.kairot.es'), [openExternalUrl]);
  const handleKeyboardShortcuts = useCallback(() => setSettingsWindowOpen(true, 'shortcuts'), [setSettingsWindowOpen]);
  const handleAbout = useCallback(() => setSettingsWindowOpen(true, 'about'), [setSettingsWindowOpen]);
  const handleNewWindow = useCallback(() => {
    window.open(window.location.href, '_blank');
  }, []);
  const handleCloseWindow = useCallback(() => handleExit(), [handleExit]);
  const handleMinimize = useCallback(async () => {
    if (isTauri) {
      try {
        const {
          getCurrentWindow
        } = await import('@tauri-apps/api/window');
        getCurrentWindow().minimize();
      } catch {
        alert('最小化功能仅在桌面应用中可用');
      }
    } else {
      alert('最小化功能仅在桌面应用中可用');
    }
  }, [isTauri]);
  const handleMaximize = useCallback(async () => {
    if (isTauri) {
      try {
        const {
          getCurrentWindow
        } = await import('@tauri-apps/api/window');
        getCurrentWindow().toggleMaximize();
      } catch {
        alert('最大化功能仅在桌面应用中可用');
      }
    } else {
      alert('最大化功能仅在桌面应用中可用');
    }
  }, [isTauri]);
  const handleFullscreen = useCallback(() => {
    document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  }, []);
  const handleToggleExplorer = useCallback(() => {
    const explorerWrapper = document.querySelector('.project-explorer-wrapper') as HTMLElement;
    if (explorerWrapper) {
      explorerWrapper.style.display = explorerWrapper.style.display === 'none' ? 'flex' : 'none';
    }
  }, []);
  const handleOpenFolder = useCallback(async () => {
    try {
      if (isTauri) {
        const {
          open
        } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          directory: true,
          multiple: false,
          title: '打开项目文件夹'
        });
        if (selected && typeof selected === 'string') {
          const {
            emit
          } = await import('@tauri-apps/api/event');
          await emit<OpenFolderPayload>(AppEvents.OPEN_FOLDER, {
            path: selected
          });
        }
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  }, [isTauri]);
  return {
    handleNewFile,
    handleOpenFile,
    handleSaveFile,
    handleSaveAs,
    handleExit,
    handleUndo,
    handleRedo,
    handleCut,
    handleCopy,
    handlePaste,
    handleSelectAll,
    handleFind,
    handleReplace,
    handleGoToDefinition,
    handleGoToDeclaration,
    handleGoToImplementation,
    handleGoBack,
    handleGoForward,
    handleFormatDocument,
    handleToggleLineComment,
    handleToggleBlockComment,
    handleTriggerSuggest,
    handleQuickFix,
    handleRenameSymbol,
    handleExtractFunction,
    handleExtractVariable,
    handleInlineVariable,
    handleCompile,
    handleRun,
    handleRebuildProject,
    handleCleanProject,
    handleBuildConfiguration,
    handleDebugProject,
    handleStopProject,
    handleRunConfiguration,
    handleToggleVcsPanel,
    handleCommit,
    handlePush,
    handlePull,
    handleBranch,
    handleMerge,
    handleStash,
    handlePreferences,
    handleExtensions,
    handleThemes,
    handleKeybindings,
    handleDocumentation,
    handleKeyboardShortcuts,
    handleAbout,
    handleNewWindow,
    handleCloseWindow,
    handleMinimize,
    handleMaximize,
    handleFullscreen,
    handleToggleExplorer,
    handleOpenFolder
  };
};