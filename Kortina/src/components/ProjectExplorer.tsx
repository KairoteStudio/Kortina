import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { isTauri, isMobile } from '../utils/environment';
import { gitClone } from '../utils/fileSystem';
import { systemLogger } from '../utils/logger';
import { validateFileName } from '../utils/validation';
import { GitCloneDialog, CloneHistoryDialog, FileBrowserDialog } from './Dialogs';
import FileTree from './ProjectExplorer/FileTree';
import ProjectActions from './ProjectExplorer/ProjectActions';
import FileTooltip from './ProjectExplorer/FileTooltip';
import FilePreview from './ProjectExplorer/FilePreview';
import { ContextMenu, Toast } from './Core';
import { useFileDrag } from '../hooks/useFileDrag';
import { useToast } from '../hooks/useToast';
import { useFileSystemWatcher } from '../hooks/useFileSystemWatcher';
import { FileItem } from '../utils/fileSystem';
import { useUISettingsStore } from '../stores';
import { CloneHistoryManager, CloneHistoryItem } from '../utils/cloneHistory';
import { AppEvents, type InputDialogResultPayload } from '../events/app-events';
import { useProjectFiles } from '../hooks/useProjectFiles';
import { useFileSelection } from '../hooks/useFileSelection';
import { useContextMenu } from '../hooks/useContextMenu';
import { ProjectExplorerService } from '../services/projectExplorerService';

export interface ProjectExplorerRef {
  handleOpenFolder: () => Promise<void>;
  loadDirectory: (path: string, saveToRecents?: boolean) => Promise<FileItem[]>;
  newFile: () => void;
  newFolder: () => void;
  refresh: () => Promise<void>;
  renameSelected: () => void;
  deleteSelected: () => void;
  copySelected: () => void;
  cutSelected: () => void;
  pasteToSelected: () => void;
}

interface ProjectExplorerProps {
  onFileSelect?: (filePath: string, fileName: string) => Promise<void>;
  currentFile?: string | null;
  onProjectOpen?: (projectPath: string) => Promise<void>;
  currentProjectPath?: string | null;
}

interface GitCloneOptions {
  repoUrl: string;
  targetPath: string;
  branch?: string;
  depth?: number;
}

interface GitCloneDialogState {
  isOpen: boolean;
  defaultTargetPath: string;
}

interface TooltipState {
  content: string;
  x: number;
  y: number;
}

const ProjectExplorer = forwardRef<ProjectExplorerRef, ProjectExplorerProps>((props, ref) => {
  const { onProjectOpen, currentProjectPath } = props;

  
  const [projectRootPath, setProjectRootPath] = useState<string>('');

  
  const {
    files,
    setFiles,
    expandedDirs,
    setExpandedDirs,
    loadedDirs,
    isLoading,
    toggleDirectory,
    refresh: refreshFiles,
    findFile,
    getVisibleItems,
    loadDirectoryContent,
  } = useProjectFiles(projectRootPath);

  const {
    selectedItems,
    selectedPaths,
    primarySelectedItem,
    handleFileSelect,
    clearSelection,
    updateSelectionAfterRename,
    clearSelectionAfterDelete,
    setContextSelection,
  } = useFileSelection();

  const {
    contextMenu,
    openContextMenu,
    openBlankContextMenu,
    closeContextMenu,
  } = useContextMenu();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [gitCloneDialog, setGitCloneDialog] = useState<GitCloneDialogState>({ isOpen: false, defaultTargetPath: '' });
  const [isCloneHistoryDialogOpen, setIsCloneHistoryDialogOpen] = useState(false);
  const [isFileBrowserOpen, setIsFileBrowserOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ name: string; path: string; type: string; size?: number } | null>(null);
  const [clipboard, setClipboard] = useState<{ path: string; name: string; type: string; operation: 'copy' | 'cut' } | null>(null);

  
  const explorerRootRef = useRef<HTMLDivElement>(null);
  const fileTreeRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputDialogCallbackRef = useRef<((value: string) => void) | null>(null);
  const inputDialogRequestIdRef = useRef<string | null>(null);
  const hasAutoLoadedRef = useRef(false);

  
  const { theme } = useUISettingsStore();
  const { handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop } = useFileDrag();
  const { items: toasts, showSuccess, showError, showWarning, showInfo, removeToast } = useToast();

  
  const { isWatching } = useFileSystemWatcher({
    path: projectRootPath || '',
    onFilesChange: refreshFiles,
    onError: error => showError('监听错误', `文件系统监听出错: ${error.message}`),
    debounceMs: 1000
  });

  
  const isFileTooLong = useCallback((name: string): boolean => name.length > 25, []);

  
  const handleLoadDirectory = useCallback(async (path: string, saveToRecents: boolean = false): Promise<FileItem[]> => {
    try {
      if (saveToRecents && onProjectOpen) {
        await onProjectOpen(path);
      }
      const result = await ProjectExplorerService.readDirectory(path, true);
      const normalizedPath = path.replace(/\\/g, '/');
      setProjectRootPath(normalizedPath);
      setFiles(result);
      setExpandedDirs(new Set());
      return result;
    } catch (error) {
      systemLogger.error(`加载目录失败: ${error}`);
      return [];
    }
  }, [onProjectOpen, setFiles, setExpandedDirs]);

  
  useEffect(() => {
    if (hasAutoLoadedRef.current) return;
    if (!currentProjectPath) return;
    if (projectRootPath === currentProjectPath) return;
    hasAutoLoadedRef.current = true;
    handleLoadDirectory(currentProjectPath, false).catch(error => {
      systemLogger.error(`自动加载当前项目失败: ${error}`);
    });
  }, [currentProjectPath, projectRootPath, handleLoadDirectory]);

  
  useEffect(() => {
    if (!currentProjectPath && projectRootPath) {
      setFiles([]);
      setProjectRootPath('');
      setExpandedDirs(new Set());
      clearSelection();
    }
  }, [currentProjectPath, projectRootPath, setFiles, setExpandedDirs, clearSelection]);

  
  const handleDirectoryClick = useCallback(async (file: FileItem) => {
    await toggleDirectory(file.path);
  }, [toggleDirectory]);

  
  const openSelectedFile = useCallback(async (file: FileItem) => {
    if (file.type === 'directory') {
      handleDirectoryClick(file);
      return;
    }
    if (props.onFileSelect) {
      await props.onFileSelect(file.path, file.name);
      return;
    }
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'];
    const textExtensions = ['txt', 'md', 'json', 'xml', 'csv', 'log', 'ini', 'yaml', 'yml', 'toml'];
    const pdfExtensions = ['pdf'];
    if (imageExtensions.includes(fileExtension) || textExtensions.includes(fileExtension) || pdfExtensions.includes(fileExtension)) {
      setPreviewFile({ name: file.name, path: file.path, type: file.type, size: file.size });
    } else if (isTauri()) {
      try {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(file.path);
        systemLogger.info(`使用系统默认程序打开文件: ${file.path}`);
      } catch (error) {
        showError('打开失败', `无法打开文件: ${file.name}`);
      }
    } else {
      showInfo('提示', '文件预览功能仅在桌面应用中可用');
    }
  }, [handleDirectoryClick, showError, showInfo, props.onFileSelect]);

  
  const handleFileClick = useCallback(async (file: FileItem, event?: React.MouseEvent) => {
    const visibleItems = getVisibleItems();
    handleFileSelect(file, event, visibleItems);

    
    const ctrl = !!(event && (event.ctrlKey || event.metaKey));
    const shift = !!(event && event.shiftKey);
    if (!ctrl && !shift) {
      await openSelectedFile(file);
    }
  }, [handleFileSelect, getVisibleItems, openSelectedFile]);

  
  const handleFileContextMenu = useCallback((e: React.MouseEvent, path: string, name: string, type: string) => {
    setContextSelection(path, name, type);
    openContextMenu(e, path, name, type);
  }, [setContextSelection, openContextMenu]);

  
  const handleFileMouseEnter = useCallback((e: React.MouseEvent, name: string, path: string) => {
    if (isFileTooLong(name)) {
      setTooltip({ content: path, x: e.clientX, y: e.clientY });
    }
  }, [isFileTooLong]);

  const handleFileMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  
  const openInputDialog = useCallback(async (options: {
    title: string;
    placeholder?: string;
    defaultValue?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: (value: string) => void | Promise<void>;
  }) => {
    closeContextMenu();
    if (!isTauri || isMobile()) {
      const result = window.prompt(options.title, options.defaultValue ?? '');
      if (result !== null && result.trim()) {
        await options.onConfirm(result.trim());
      }
      return;
    }
    const requestId = `input-dialog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    inputDialogRequestIdRef.current = requestId;
    inputDialogCallbackRef.current = options.onConfirm;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('launch_input_dialog', {
        options: {
          title: options.title,
          placeholder: options.placeholder ?? null,
          default_value: options.defaultValue ?? null,
          confirm_text: options.confirmText ?? null,
          cancel_text: options.cancelText ?? null,
          request_id: requestId,
          theme: theme ?? null
        }
      });
    } catch (error) {
      console.error('打开输入对话框失败:', error);
      inputDialogCallbackRef.current = null;
      inputDialogRequestIdRef.current = null;
    }
  }, [theme, closeContextMenu]);

  
  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | null = null;
    const setup = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlisten = await listen<InputDialogResultPayload>(AppEvents.INPUT_DIALOG_RESULT, async event => {
          const { requestId, confirmed, value } = event.payload;
          if (requestId !== inputDialogRequestIdRef.current) return;
          const callback = inputDialogCallbackRef.current;
          inputDialogCallbackRef.current = null;
          inputDialogRequestIdRef.current = null;
          if (confirmed && callback && value) {
            await callback(value);
          }
        });
      } catch (e) {
        console.error('监听 input-dialog-result 失败:', e);
      }
    };
    setup();
    return () => { if (unlisten) unlisten(); };
  }, []);

  
  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 150);
  }, []);

  useEffect(() => {
    const el = fileTreeRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      return () => {
        el.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      };
    }
  }, [handleScroll]);

  
  useEffect(() => {
    const path = primarySelectedItem?.filePath;
    if (!path) return;
    const el = fileTreeRef.current?.querySelector(`.file-item[data-path="${CSS.escape(path)}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [primarySelectedItem?.filePath]);

  

  const resolveActionTarget = useCallback(() => {
    if (contextMenu && contextMenu.fileType !== 'blank') {
      return { filePath: contextMenu.filePath, fileName: contextMenu.fileName, fileType: contextMenu.fileType };
    }
    if (primarySelectedItem) return primarySelectedItem;
    if (contextMenu) {
      return { filePath: contextMenu.filePath, fileName: contextMenu.fileName, fileType: contextMenu.fileType };
    }
    if (projectRootPath) {
      return { filePath: projectRootPath, fileName: '', fileType: 'directory' };
    }
    return null;
  }, [contextMenu, primarySelectedItem, projectRootPath]);

  
  const handleNewFile = useCallback((isDirectory: boolean = false, targetPath?: string) => {
    console.log('[handleNewFile] CALLED', { isDirectory, targetPath, projectRootPath });
    const defaultExt = isDirectory ? '' : '.krt';
    const itemType = isDirectory ? '文件' : '文件夹';
    void openInputDialog({
      title: `新建${itemType}`,
      placeholder: `请输入新${itemType}名${isDirectory ? '' : '（包含扩展名）'}`,
      defaultValue: defaultExt,
      confirmText: '创建',
      cancelText: '取消',
      onConfirm: async (fileName: string) => {
        if (!fileName || !validateFileName(fileName)) {
          alert('名称不能包含特殊字符 /\\:*?"<>|');
          return;
        }
        const finalTargetPath = targetPath || projectRootPath;
        const result = await ProjectExplorerService.createFile(`${finalTargetPath}/${fileName}`, isDirectory);
        if (result.success) {
          if (finalTargetPath === projectRootPath) {
            await refreshFiles();
          } else {
            await loadDirectoryContent(finalTargetPath);
          }
          systemLogger.info(`${itemType} ${fileName} 创建成功`);
        } else {
          alert(`${itemType} 创建失败: ${result.message}`);
        }
      }
    });
  }, [projectRootPath, refreshFiles, loadDirectoryContent, openInputDialog]);

  
  const handleDeleteFile = useCallback(async () => {
    const targets = selectedItems.filter(item => item.fileType !== 'blank' && item.fileName);
    if (targets.length === 0) return;
    const label = targets.length === 1
      ? `${targets[0].fileType === 'directory' ? '文件夹' : '文件'} "${targets[0].fileName}"`
      : `${targets.length} 个项目`;
    if (!confirm(`确定要删除${label} 吗？此操作不可撤销。`)) return;

    closeContextMenu();
    let successCount = 0;
    for (const target of targets) {
      const result = await ProjectExplorerService.deleteFile(target.filePath);
      if (result.success) successCount++;
    }
    if (successCount > 0) {
      showSuccess('删除成功', `成功删除 ${successCount} 项`);
      clearSelectionAfterDelete();
      await refreshFiles();
    }
  }, [selectedItems, closeContextMenu, showSuccess, clearSelectionAfterDelete, refreshFiles]);

  
  const handleRenameFile = useCallback(async () => {
    const target = resolveActionTarget();
    if (!target || target.fileType === 'blank' || !target.fileName) return;
    const { filePath, fileName } = target;
    closeContextMenu();
    void openInputDialog({
      title: '重命名',
      placeholder: '请输入新名称',
      defaultValue: fileName,
      confirmText: '确定',
      cancelText: '取消',
      onConfirm: async (newName: string) => {
        if (!newName || newName === fileName) return;
        if (!validateFileName(newName)) {
          showError('重命名失败', '名称不能包含 /\:*?"<>|');
          return;
        }
        const newPath = filePath.replace(/[^/]+$/, newName);
        const result = await ProjectExplorerService.renameFile(filePath, newPath);
        if (result.success) {
          showSuccess('重命名成功', `成功将 ${fileName} 重命名为 ${newName}`);
          updateSelectionAfterRename(filePath, newName, target.fileType);
          await refreshFiles();
        } else {
          showError('重命名失败', result.message);
        }
      }
    });
  }, [resolveActionTarget, openInputDialog, showSuccess, showError, updateSelectionAfterRename, refreshFiles, closeContextMenu]);

  
  const handleCopyFile = useCallback(() => {
    const target = resolveActionTarget();
    if (!target || target.fileType === 'blank' || !target.fileName) return;
    setClipboard({ path: target.filePath, name: target.fileName, type: target.fileType, operation: 'copy' });
  }, [resolveActionTarget]);

  
  const handleCutFile = useCallback(() => {
    const target = resolveActionTarget();
    if (!target || target.fileType === 'blank' || !target.fileName) return;
    setClipboard({ path: target.filePath, name: target.fileName, type: target.fileType, operation: 'cut' });
  }, [resolveActionTarget]);

  
  const handlePasteFile = useCallback(async () => {
    if (!clipboard) {
      showWarning('粘贴失败', '剪贴板中没有内容可粘贴');
      return;
    }
    const target = resolveActionTarget();
    const pastePath = target?.fileType === 'directory' ? target.filePath : projectRootPath;
    if (!pastePath) return;

    const targetFilePath = `${pastePath}/${clipboard.name}`;
    let result;
    if (clipboard.operation === 'cut') {
      result = await ProjectExplorerService.moveFile(clipboard.path, targetFilePath);
      if (result.success) setClipboard(null);
    } else {
      result = await ProjectExplorerService.copyFile(clipboard.path, targetFilePath);
    }
    if (result.success) {
      showSuccess('粘贴成功', `成功${clipboard.operation === 'cut' ? '移动' : '复制'} ${clipboard.name}`);
      await refreshFiles();
    } else {
      showError('粘贴失败', result.message);
    }
  }, [clipboard, resolveActionTarget, projectRootPath, showWarning, showSuccess, showError, refreshFiles]);

  
  const handleDropFile = useCallback(async (e: React.DragEvent, targetPath: string, targetType: string) => {
    const dropInfo = handleDrop(e, targetPath, targetType);
    if (dropInfo) {
      const result = await ProjectExplorerService.moveFile(dropInfo.sourcePath, `${targetPath}/${dropInfo.sourceName}`);
      if (result.success) {
        showSuccess('移动成功', `成功移动 ${dropInfo.sourceName}`);
        await refreshFiles();
      } else {
        showError('移动失败', result.message);
      }
    }
  }, [handleDrop, showSuccess, showError, refreshFiles]);

  

  
  const handleOpenFolder = useCallback(async () => {
    if (!isTauri) {
      showError('功能不可用', '打开文件夹功能仅在桌面应用中可用。');
      return;
    }
    try {
      if (isMobile()) {
        setIsFileBrowserOpen(true);
        return;
      }
      const result = await open({ directory: true, multiple: false, title: '选择项目文件夹' });
      if (result && typeof result === 'string') {
        const normalizedPath = result.replace(/\\/g, '/');
        await handleLoadDirectory(normalizedPath, true);
        setProjectRootPath(normalizedPath);
        if (onProjectOpen) await onProjectOpen(normalizedPath);
      }
    } catch (error) {
      systemLogger.error(`打开文件夹选择器失败: ${error}`);
    }
  }, [isTauri, showError, handleLoadDirectory, onProjectOpen]);

  
  const handleGitClone = useCallback(() => {
    setGitCloneDialog({ isOpen: true, defaultTargetPath: '' });
  }, []);

  const handleGitCloneConfirm = useCallback(async (options: GitCloneOptions) => {
    try {
      const result = await gitClone(options);
      if (result.success) {
        showSuccess('克隆成功', `成功从 ${options.repoUrl} 克隆到 ${options.targetPath}`);
        const normalizedPath = options.targetPath.replace(/\\/g, '/');
        await handleLoadDirectory(normalizedPath, true);
        setProjectRootPath(normalizedPath);
        if (onProjectOpen) await onProjectOpen(normalizedPath);
        CloneHistoryManager.getInstance().addHistory(options, true, '克隆成功');
      } else {
        showError('克隆失败', result.message);
      }
    } catch (error) {
      showError('克隆异常', `Git克隆过程中发生异常: ${error}`);
    }
  }, [showSuccess, showError, handleLoadDirectory, onProjectOpen]);

  const handleSelectHistory = useCallback((item: CloneHistoryItem) => {
    handleGitCloneConfirm({ repoUrl: item.repoUrl, targetPath: item.targetPath, branch: item.branch });
  }, [handleGitCloneConfirm]);

  
  const handleRefresh = useCallback(async () => {
    closeContextMenu();
    await refreshFiles();
  }, [closeContextMenu, refreshFiles]);

  
  const handleExplorerKeyDown = useCallback((e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

    const key = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;

    
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !ctrl && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      const visible = getVisibleItems();
      if (visible.length === 0) return;
      const currentPath = primarySelectedItem?.filePath;
      let index = currentPath ? visible.findIndex(item => item.path === currentPath) : -1;
      if (index < 0) index = 0;
      index = e.key === 'ArrowDown'
        ? Math.min(index + 1, visible.length - 1)
        : Math.max(index - 1, 0);
      const next = visible[index];
      handleFileSelect(next, undefined, visible);
      return;
    }

    
    if (e.key === 'Enter' && !ctrl && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      const currentPath = primarySelectedItem?.filePath;
      if (currentPath) {
        const file = findFile(files, currentPath);
        if (file) void openSelectedFile(file);
      }
      return;
    }

    
    if (e.key === 'F2' && !ctrl && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      void handleRenameFile();
      return;
    }

    
    if (e.key === 'Delete' && !ctrl && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      void handleDeleteFile();
      return;
    }

    
    if (e.key === 'F5' && !ctrl && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      void handleRefresh();
      return;
    }

    
    if (ctrl && !e.altKey && key === 'c') {
      e.preventDefault();
      e.stopPropagation();
      handleCopyFile();
      return;
    }

    
    if (ctrl && !e.altKey && key === 'x') {
      e.preventDefault();
      e.stopPropagation();
      handleCutFile();
      return;
    }

    
    if (ctrl && !e.altKey && key === 'v') {
      e.preventDefault();
      e.stopPropagation();
      void handlePasteFile();
      return;
    }
  }, [files, getVisibleItems, primarySelectedItem, findFile, openSelectedFile, handleFileSelect, handleRenameFile, handleDeleteFile, handleRefresh, handleCopyFile, handleCutFile, handlePasteFile]);

  
  useImperativeHandle(ref, () => ({
    handleOpenFolder,
    loadDirectory: handleLoadDirectory,
    newFile: () => handleNewFile(false),
    newFolder: () => handleNewFile(true),
    refresh: handleRefresh,
    renameSelected: () => void handleRenameFile(),
    deleteSelected: () => void handleDeleteFile(),
    copySelected: handleCopyFile,
    cutSelected: handleCutFile,
    pasteToSelected: () => void handlePasteFile(),
  }), [handleOpenFolder, handleLoadDirectory, handleNewFile, handleRefresh, handleRenameFile, handleDeleteFile, handleCopyFile, handleCutFile, handlePasteFile]);

  return (
    <div
      className="project-explorer"
      ref={explorerRootRef}
      tabIndex={0}
      onMouseDown={() => explorerRootRef.current?.focus({ preventScroll: true })}
      onKeyDown={handleExplorerKeyDown}
    >
      <ProjectActions
        projectRootPath={projectRootPath}
        files={files}
        isLoading={isLoading}
        isWatching={isWatching}
        onNewFile={() => handleNewFile(false)}
        onRefresh={handleRefresh}
        onOpenFolder={handleOpenFolder}
        onGitClone={handleGitClone}
        onShowCloneHistory={() => setIsCloneHistoryDialogOpen(true)}
        onShowSearch={() => {}} 
      />

      <div
        ref={fileTreeRef}
        className={`file-tree ${isScrolling ? 'scrolling' : ''}`}
        onScroll={handleScroll}
        onClick={e => {
          const target = e.target as HTMLElement | null;
          if (!target?.closest?.('.file-item')) clearSelection();
        }}
        onContextMenu={e => openBlankContextMenu(e, projectRootPath)}
        onDragOver={e => handleDragOver(e, projectRootPath, 'directory')}
        onDragLeave={handleDragLeave}
        onDrop={e => handleDrop(e, projectRootPath, 'directory')}
      >
        {!projectRootPath ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="empty-text">没有打开的项目</div>
            <div className="empty-subtext">点击上方按钮打开文件夹或克隆Git仓库</div>
          </div>
        ) : (
          <FileTree
            files={files}
            projectRootPath={projectRootPath}
            expandedDirs={expandedDirs}
            loadedDirs={loadedDirs}
            selectedPaths={selectedPaths}
            isLoading={isLoading}
            onToggleDirectory={handleDirectoryClick}
            onFileClick={handleFileClick}
            onFileContextMenu={handleFileContextMenu}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropFile}
            onFileMouseEnter={handleFileMouseEnter}
            onFileMouseLeave={handleFileMouseLeave}
          />
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          isVisible={true}
          x={contextMenu.x}
          y={contextMenu.y}
          fileType={contextMenu.fileType}
          hasClipboardContent={!!clipboard}
          clipboardName={clipboard?.name}
          menuId="project-explorer-menu"
          onClose={closeContextMenu}
          onNewFile={() => handleNewFile(false)}
          onNewFolder={() => handleNewFile(true)}
          onCopy={handleCopyFile}
          onCut={handleCutFile}
          onPaste={handlePasteFile}
          onRename={handleRenameFile}
          onDelete={handleDeleteFile}
          onRefresh={handleRefresh}
        />
      )}

      {tooltip && <FileTooltip content={tooltip.content} x={tooltip.x} y={tooltip.y} />}

      {gitCloneDialog.isOpen && (
        <GitCloneDialog
          isOpen={gitCloneDialog.isOpen}
          defaultTargetPath={gitCloneDialog.defaultTargetPath}
          onClose={() => setGitCloneDialog({ isOpen: false, defaultTargetPath: '' })}
          onConfirm={handleGitCloneConfirm}
        />
      )}

      {isCloneHistoryDialogOpen && (
        <CloneHistoryDialog
          isOpen={isCloneHistoryDialogOpen}
          onClose={() => setIsCloneHistoryDialogOpen(false)}
          onSelectHistory={handleSelectHistory}
        />
      )}

      {isFileBrowserOpen && (
        <FileBrowserDialog
          isOpen={isFileBrowserOpen}
          onClose={() => setIsFileBrowserOpen(false)}
          onSelect={(path) => {
            setIsFileBrowserOpen(false);
            void handleLoadDirectory(path, true);
          }}
          title="选择项目文件夹"
          selectButtonText="打开"
          mode="directory"
        />
      )}

      {previewFile && (
        <FilePreview file={previewFile} isVisible={true} onClose={() => setPreviewFile(null)} />
      )}

      <Toast items={toasts} onClose={removeToast} />
    </div>
  );
});

ProjectExplorer.displayName = 'ProjectExplorer';
export default ProjectExplorer;
