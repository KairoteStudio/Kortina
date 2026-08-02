import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { isTauri } from '../utils/environment';
import { readDirectory, gitClone } from '../utils/fileSystem';
import { systemLogger } from '../utils/logger';
import { validateFileName } from '../utils/validation';
import { GitCloneDialog, CloneHistoryDialog } from './Dialogs';
import FileTree from './ProjectExplorer/FileTree';
import ProjectActions from './ProjectExplorer/ProjectActions';
import FileTooltip from './ProjectExplorer/FileTooltip';
import FileSearch from './ProjectExplorer/FileSearch';
import FilePreview from './ProjectExplorer/FilePreview';
import { ContextMenu, Toast } from './Core';
import { useFileDrag } from '../hooks/useFileDrag';
import { useFileOperations } from '../hooks/useFileOperations';
import { useFileSearch } from '../hooks/useFileSearch';
import { useToast } from '../hooks/useToast';
import { useFileSystemWatcher } from '../hooks/useFileSystemWatcher';
import { FileItem } from '../utils/fileSystem';
import { useUISettingsStore } from '../stores';
import { CloneHistoryManager, CloneHistoryItem } from '../utils/cloneHistory';
import { AppEvents, type InputDialogResultPayload } from '../events/app-events';
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
interface ContextMenuState {
  x: number;
  y: number;
  filePath: string;
  fileName: string;
  fileType: string;
}
interface TooltipState {
  content: string;
  x: number;
  y: number;
}
const ProjectExplorer = forwardRef<ProjectExplorerRef, ProjectExplorerProps>((props, ref) => {
  const {
    onProjectOpen,
    currentProjectPath
  } = props;
  const [files, setFiles] = useState<FileItem[]>([]);
  const [projectRootPath, setProjectRootPath] = useState<string>('');
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [selectedItems, setSelectedItems] = useState<Array<{
    filePath: string;
    fileName: string;
    fileType: string;
  }>>([]);
  const [selectionAnchorPath, setSelectionAnchorPath] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const explorerRootRef = useRef<HTMLDivElement>(null);
  const selectedPaths = useMemo(() => new Set(selectedItems.map(item => item.filePath)), [selectedItems]);
  const primarySelectedItem = selectedItems.length > 0 ? selectedItems[selectedItems.length - 1] : null;
  const inputDialogCallbackRef = useRef<((value: string) => void) | null>(null);
  const inputDialogRequestIdRef = useRef<string | null>(null);
  const {
    theme
  } = useUISettingsStore();
  const [gitCloneDialog, setGitCloneDialog] = useState<GitCloneDialogState>({
    isOpen: false,
    defaultTargetPath: ''
  });
  const [isCloneHistoryDialogOpen, setIsCloneHistoryDialogOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    path: string;
    type: string;
    size?: number;
  } | null>(null);
  const {
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useFileDrag();
  const {
    clipboard,
    isLoading: isOperationLoading,
    handleNewFile: createNewFile,
    handleDeleteFile,
    handleRenameFile,
    handleMoveFile,
    handleCopyFile,
    handleCutFile,
    handlePasteFile
  } = useFileOperations();
  const {
    isSearchVisible,
    showSearch,
    hideSearch
  } = useFileSearch();
  const {
    items: toasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeToast
  } = useToast();
  const {
    isWatching
  } = useFileSystemWatcher({
    path: projectRootPath || '',
    onFilesChange: files => {
      setFiles(files);
    },
    onError: error => {
      console.error('文件系统监听错误:', error);
      showError('监听错误', `文件系统监听出错: ${error.message}`);
    },
    debounceMs: 1000
  });
  const fileTreeRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoLoadedRef = useRef(false);
  const isFileTooLong = useCallback((name: string): boolean => {
    return name.length > 25;
  }, []);
  const loadDirectory = useCallback(async (path: string, saveToRecents: boolean = false): Promise<FileItem[]> => {
    try {
      if (saveToRecents && onProjectOpen) {
        await onProjectOpen(path);
      }
      const result = await readDirectory(path, true, false);
      const normalizedPath = path.replace(/\\/g, '/');
      setProjectRootPath(normalizedPath);
      setFiles(result);
      setExpandedDirs(new Set());
      return result;
    } catch (error) {
      systemLogger.error(`加载目录失败: ${error}`);
      return [];
    }
  }, [onProjectOpen]);
  useEffect(() => {
    if (!currentProjectPath && projectRootPath) {
      setFiles([]);
      setProjectRootPath('');
      setExpandedDirs(new Set());
      setSelectedItems([]);
    }
  }, [currentProjectPath, projectRootPath]);
  useEffect(() => {
    if (hasAutoLoadedRef.current) return;
    if (!currentProjectPath) return;
    if (projectRootPath === currentProjectPath) return;
    hasAutoLoadedRef.current = true;
    loadDirectory(currentProjectPath, false).catch(error => {
      systemLogger.error(`自动加载当前项目失败: ${error}`);
    });
  }, [currentProjectPath, projectRootPath, loadDirectory]);
  const loadDirectoryContent = useCallback(async (file: FileItem) => {
    try {
      const children = await readDirectory(file.path, true, false);
      setFiles(prevFiles => {
        const updateFileChildren = (items: FileItem[]): FileItem[] => {
          return items.map(item => {
            if (item.path === file.path) {
              return {
                ...item,
                children
              };
            }
            if (item.children && item.children.length > 0) {
              return {
                ...item,
                children: updateFileChildren(item.children)
              };
            }
            return item;
          });
        };
        return updateFileChildren(prevFiles);
      });
    } catch (error) {
      systemLogger.error(`加载文件夹内容失败: ${error}`);
    }
  }, []);
  const refreshCurrentProject = useCallback(async () => {
    if (!projectRootPath) return;
    try {
      const {
        clearPathCache
      } = await import('../utils/fileCache');
      clearPathCache(projectRootPath);
      const rootFiles = await readDirectory(projectRootPath, false);
      const expandedPaths = Array.from(expandedDirs);
      const filesWithChildren = [...rootFiles];
      const loadChildrenForExpanded = async (items: FileItem[], paths: string[]): Promise<FileItem[]> => {
        const result: FileItem[] = [];
        for (const item of items) {
          if (item.type === 'directory') {
            if (paths.includes(item.path)) {
              const children = await readDirectory(item.path, false, false);
              const nestedChildren = await loadChildrenForExpanded(children, paths);
              result.push({
                ...item,
                children: nestedChildren
              });
            } else {
              const nestedChildren = item.children ? await loadChildrenForExpanded(item.children, paths) : undefined;
              result.push({
                ...item,
                children: nestedChildren
              });
            }
          } else {
            result.push(item);
          }
        }
        return result;
      };
      const finalFiles = await loadChildrenForExpanded(filesWithChildren, expandedPaths);
      setFiles(finalFiles);
    } catch (error) {
      console.error('刷新项目失败:', error);
      showError('刷新失败', `刷新项目失败: ${error}`);
    }
  }, [projectRootPath, expandedDirs, showInfo, showError]);
  const handleDirectoryClick = useCallback(async (file: FileItem) => {
    setExpandedDirs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(file.path)) {
        newSet.delete(file.path);
        const pathPrefix = file.path.endsWith('/') ? file.path : file.path + '/';
        for (const expandedPath of newSet) {
          if (expandedPath.startsWith(pathPrefix)) {
            newSet.delete(expandedPath);
          }
        }
      } else {
        newSet.add(file.path);
        loadDirectoryContent(file);
      }
      return newSet;
    });
  }, [loadDirectoryContent]);
  const getVisibleTreeItems = useCallback((items: FileItem[], expanded: Set<string>): Array<{
    filePath: string;
    fileName: string;
    fileType: string;
  }> => {
    const result: Array<{
      filePath: string;
      fileName: string;
      fileType: string;
    }> = [];
    const walk = (list: FileItem[]) => {
      for (const item of list) {
        result.push({
          filePath: item.path,
          fileName: item.name,
          fileType: item.type
        });
        if (item.type === 'directory' && expanded.has(item.path) && item.children) {
          walk(item.children);
        }
      }
    };
    walk(items);
    return result;
  }, []);
  const findFileItem = useCallback((items: FileItem[], path: string): FileItem | null => {
    for (const item of items) {
      if (item.path === path) {
        return item;
      }
      if (item.children) {
        const found = findFileItem(item.children, path);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }, []);
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
      setPreviewFile({
        name: file.name,
        path: file.path,
        type: file.type,
        size: file.size
      });
    } else if (isTauri()) {
      try {
        const {
          open
        } = await import('@tauri-apps/plugin-shell');
        await open(file.path);
        systemLogger.info(`使用系统默认程序打开文件: ${file.path}`);
      } catch (error) {
        console.error('打开文件失败:', error);
        showError('打开失败', `无法打开文件: ${file.name}`);
      }
    } else {
      showInfo('提示', '文件预览功能仅在桌面应用中可用');
    }
  }, [handleDirectoryClick, isTauri, showError, showInfo, props.onFileSelect]);
  const handleFileClick = useCallback(async (file: FileItem, event?: React.MouseEvent) => {
    const item = {
      filePath: file.path,
      fileName: file.name,
      fileType: file.type
    };
    const ctrl = !!(event && (event.ctrlKey || event.metaKey));
    const shift = !!(event && event.shiftKey);
    if (ctrl && !shift) {
      setSelectedItems(prev => {
        const exists = prev.some(x => x.filePath === file.path);
        if (exists) {
          return prev.filter(x => x.filePath !== file.path);
        }
        return [...prev, item];
      });
      setSelectionAnchorPath(file.path);
      return;
    }
    if (shift) {
      const visible = getVisibleTreeItems(files, expandedDirs);
      const anchorPath = selectionAnchorPath ?? primarySelectedItem?.filePath ?? file.path;
      const start = visible.findIndex(x => x.filePath === anchorPath);
      const end = visible.findIndex(x => x.filePath === file.path);
      if (start >= 0 && end >= 0) {
        const from = Math.min(start, end);
        const to = Math.max(start, end);
        setSelectedItems(visible.slice(from, to + 1));
      } else {
        setSelectedItems([item]);
        setSelectionAnchorPath(file.path);
      }
      return;
    }
    setSelectedItems([item]);
    setSelectionAnchorPath(file.path);
    await openSelectedFile(file);
  }, [files, expandedDirs, selectionAnchorPath, primarySelectedItem, getVisibleTreeItems, openSelectedFile]);
  const handleContextMenuClose = useCallback(() => {
    try {
      const trigger = document.querySelector('[data-menu-id="project-explorer-menu"]');
      if (trigger && trigger.removeAttribute) {
        trigger.removeAttribute('data-menu-id');
      }
    } catch (err) {}
    setContextMenu(null);
  }, []);
  const handleFileContextMenu = useCallback((e: React.MouseEvent, path: string, name: string, type: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const el = e.currentTarget as HTMLElement | null;
      if (el && el.setAttribute) {
        el.setAttribute('data-menu-id', 'project-explorer-menu');
      }
    } catch (err) {}
    setSelectedItems(prev => {
      if (prev.some(x => x.filePath === path)) return prev;
      return [{
        filePath: path,
        fileName: name,
        fileType: type
      }];
    });
    setSelectionAnchorPath(path);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      filePath: path,
      fileName: name,
      fileType: type
    });
  }, []);
  const handleBlankContextMenu = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest?.('.dialog-backdrop, .dialog-container, .context-menu, .file-search, .file-preview')) {
      return;
    }
    if (target?.closest?.('.file-item')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    try {
      const el = e.currentTarget as HTMLElement | null;
      if (el && el.setAttribute) {
        el.setAttribute('data-menu-id', 'project-explorer-menu');
      }
    } catch (err) {}
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      filePath: projectRootPath,
      fileName: '',
      fileType: 'blank'
    });
  }, [projectRootPath]);
  const handleFileMouseEnter = useCallback((e: React.MouseEvent, name: string, path: string) => {
    if (isFileTooLong(name)) {
      setTooltip({
        content: path,
        x: e.clientX,
        y: e.clientY
      });
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
    setContextMenu(null);
    if (!isTauri) {
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
      const {
        invoke
      } = await import('@tauri-apps/api/core');
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
  }, [theme]);
  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | null = null;
    const setup = async () => {
      try {
        const {
          listen
        } = await import('@tauri-apps/api/event');
        unlisten = await listen<InputDialogResultPayload>(AppEvents.INPUT_DIALOG_RESULT, async event => {
          const {
            requestId,
            confirmed,
            value
          } = event.payload;
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
    return () => {
      if (unlisten) unlisten();
    };
  }, []);
  const handleNewFile = useCallback((isDirectory: boolean = false, targetPath?: string) => {
    const defaultExt = isDirectory ? '' : '.krt';
    const itemType = isDirectory ? '文件夹' : '文件';
    void openInputDialog({
      title: `新建${itemType}`,
      placeholder: `请输入新${itemType}名${isDirectory ? '' : '（包含扩展名）'}`,
      defaultValue: defaultExt,
      confirmText: '创建',
      cancelText: '取消',
      onConfirm: async (fileName: string) => {
        if (!fileName) return;
        if (!validateFileName(fileName)) {
          alert('名称不能包含特殊字符 /\\:*?"<>|');
          return;
        }
        const finalTargetPath = targetPath || projectRootPath;
        const result = await createNewFile(fileName, finalTargetPath, projectRootPath, isDirectory);
        if (result.success) {
          const {
            clearPathCache
          } = await import('../utils/fileCache');
          clearPathCache(finalTargetPath);
          if (finalTargetPath === projectRootPath) {
            await refreshCurrentProject();
          } else {
            const parentFile = findFileItem(files, finalTargetPath);
            if (parentFile) {
              await loadDirectoryContent(parentFile);
            }
          }
          systemLogger.info(`${itemType} ${fileName} 创建成功`);
        } else {
          systemLogger.error(`${itemType}创建失败: ${result.message}`);
          alert(`${itemType} 创建失败: ${result.message}`);
        }
      }
    });
  }, [createNewFile, projectRootPath, refreshCurrentProject, openInputDialog, files, findFileItem, loadDirectoryContent]);
  const resolveActionTarget = useCallback(() => {
    if (contextMenu && contextMenu.fileType !== 'blank') {
      return {
        filePath: contextMenu.filePath,
        fileName: contextMenu.fileName,
        fileType: contextMenu.fileType
      };
    }
    if (primarySelectedItem) return primarySelectedItem;
    if (contextMenu) {
      return {
        filePath: contextMenu.filePath,
        fileName: contextMenu.fileName,
        fileType: contextMenu.fileType
      };
    }
    if (projectRootPath) {
      return {
        filePath: projectRootPath,
        fileName: '',
        fileType: 'directory'
      };
    }
    return null;
  }, [contextMenu, primarySelectedItem, projectRootPath]);
  const resolveActionTargets = useCallback(() => {
    const validSelected = selectedItems.filter(item => item.fileType !== 'blank' && item.fileName);
    if (validSelected.length > 0) return validSelected;
    const single = resolveActionTarget();
    if (single && single.fileType !== 'blank' && single.fileName) {
      return [single];
    }
    return [];
  }, [selectedItems, resolveActionTarget]);
  const resolvePasteTargetPath = useCallback(() => {
    const target = resolveActionTarget();
    if (!target) return projectRootPath;
    if (target.fileType === 'directory' || target.fileType === 'blank') {
      return target.filePath || projectRootPath;
    }
    const parts = target.filePath.split('/');
    parts.pop();
    return parts.join('/') || projectRootPath;
  }, [resolveActionTarget, projectRootPath]);
  const handleNewFileClick = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const target = resolveActionTarget();
    let targetPath = projectRootPath;
    if (target) {
      if (target.fileType === 'directory' || target.fileType === 'blank') {
        targetPath = target.filePath || projectRootPath;
      } else {
        const parts = target.filePath.split('/');
        parts.pop();
        targetPath = parts.join('/') || projectRootPath;
      }
    }
    handleNewFile(false, targetPath);
  }, [resolveActionTarget, projectRootPath, handleNewFile]);
  const handleNewFolder = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const target = resolveActionTarget();
    let targetPath = projectRootPath;
    if (target) {
      if (target.fileType === 'directory' || target.fileType === 'blank') {
        targetPath = target.filePath || projectRootPath;
      } else {
        const parts = target.filePath.split('/');
        parts.pop();
        targetPath = parts.join('/') || projectRootPath;
      }
    }
    handleNewFile(true, targetPath);
  }, [resolveActionTarget, projectRootPath, handleNewFile]);
  const handleRefresh = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    handleContextMenuClose();
    await refreshCurrentProject();
  }, [handleContextMenuClose, refreshCurrentProject]);
  const handleOpenFolder = useCallback(async () => {
    if (!isTauri) {
      showError('功能不可用', '打开文件夹功能仅在桌面应用中可用。请在Tauri环境中运行此应用。');
      return;
    }
    try {
      systemLogger.info('正在打开文件夹选择器...');
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择项目文件夹'
      });
      if (selected && typeof selected === 'string') {
        setIsLoading(true);
        try {
          const normalizedPath = selected.replace(/\\/g, '/');
          systemLogger.info(`选择的文件夹路径: ${normalizedPath}`);
          const rootFiles = await loadDirectory(normalizedPath, true);
          setFiles(rootFiles);
          const pathParts = normalizedPath.split('/');
          const displayName = pathParts[pathParts.length - 1] || '项目根目录';
          setProjectRootPath(normalizedPath);
          setExpandedDirs(new Set());
          if (onProjectOpen) {
            await onProjectOpen(normalizedPath);
          }
          systemLogger.info(`成功打开文件夹: ${displayName} (${rootFiles.length} 个项目)`);
        } catch (error) {
          systemLogger.error(`加载文件夹失败: ${error}`);
        } finally {
          setIsLoading(false);
        }
      } else {
        systemLogger.info('用户取消了文件夹选择或选择失败');
      }
    } catch (error) {
      systemLogger.error(`打开文件夹选择器失败: ${error}`);
    }
  }, [isTauri, showError, loadDirectory, onProjectOpen]);
  const handleGitClone = useCallback(() => {
    setGitCloneDialog({
      isOpen: true,
      defaultTargetPath: ''
    });
  }, []);
  const closeGitCloneDialog = useCallback(() => {
    setGitCloneDialog({
      isOpen: false,
      defaultTargetPath: ''
    });
  }, []);
  const handleGitCloneConfirm = useCallback(async (options: GitCloneOptions) => {
    try {
      setIsLoading(true);
      const result = await gitClone(options);
      if (result.success) {
        systemLogger.info(`Git克隆成功: ${options.repoUrl} -> ${options.targetPath}`);
        showSuccess('克隆成功', `成功从 ${options.repoUrl} 克隆到 ${options.targetPath}`);
        const normalizedPath = options.targetPath.replace(/\\/g, '/');
        const rootFiles = await loadDirectory(normalizedPath, true);
        setFiles(rootFiles);
        setProjectRootPath(normalizedPath);
        setExpandedDirs(new Set());
        if (onProjectOpen) {
          await onProjectOpen(normalizedPath);
        }
        saveCloneHistory(options);
      } else {
        systemLogger.error(`Git克隆失败: ${result.message}`);
        showError('克隆失败', result.message);
      }
    } catch (error) {
      console.error('Git克隆异常:', error);
      systemLogger.error(`Git克隆异常: ${error}`);
      showError('克隆异常', `Git克隆过程中发生异常: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [showSuccess, showError, loadDirectory, onProjectOpen]);
  const saveCloneHistory = useCallback((options: GitCloneOptions) => {
    try {
      const historyManager = CloneHistoryManager.getInstance();
      historyManager.addHistory(options, true, '克隆成功');
    } catch (error) {
      console.error('保存克隆历史失败:', error);
    }
  }, []);
  const handleShowCloneHistory = useCallback(() => {
    setIsCloneHistoryDialogOpen(true);
  }, []);
  const handleSelectHistory = useCallback((item: CloneHistoryItem) => {
    const options: GitCloneOptions = {
      repoUrl: item.repoUrl,
      targetPath: item.targetPath,
      branch: item.branch
    };
    handleGitCloneConfirm(options);
  }, [handleGitCloneConfirm]);
  const handleCopyFileAction = useCallback(() => {
    const target = resolveActionTarget();
    if (!target || target.fileType === 'blank' || !target.fileName) return;
    handleCopyFile(target.filePath, target.fileName, target.fileType);
  }, [resolveActionTarget, handleCopyFile]);
  const handleCutFileAction = useCallback(() => {
    const target = resolveActionTarget();
    if (!target || target.fileType === 'blank' || !target.fileName) return;
    handleCutFile(target.filePath, target.fileName, target.fileType);
  }, [resolveActionTarget, handleCutFile]);
  const handlePasteFileAction = useCallback(async () => {
    if (!clipboard) {
      showWarning('粘贴失败', '剪贴板中没有内容可粘贴');
      return;
    }
    const pastePath = resolvePasteTargetPath();
    if (!pastePath) return;
    const result = await handlePasteFile(pastePath);
    if (result.success) {
      showSuccess('粘贴成功', `成功粘贴 ${clipboard.name}`);
      const {
        clearPathCache
      } = await import('../utils/fileCache');
      clearPathCache(pastePath);
      if (pastePath === projectRootPath) {
        await refreshCurrentProject();
      } else {
        const targetFile = findFileItem(files, pastePath);
        if (targetFile) {
          await loadDirectoryContent(targetFile);
        }
      }
    } else {
      showError('粘贴失败', result.message);
    }
  }, [clipboard, resolvePasteTargetPath, handlePasteFile, showWarning, showSuccess, showError, refreshCurrentProject, projectRootPath, files, findFileItem, loadDirectoryContent]);
  const handleRenameFileAction = useCallback(async () => {
    const target = resolveActionTarget();
    if (!target || target.fileType === 'blank' || !target.fileName) return;
    const {
      filePath,
      fileName
    } = target;
    setContextMenu(null);
    void openInputDialog({
      title: '重命名',
      placeholder: '请输入新名称',
      defaultValue: fileName,
      confirmText: '确定',
      cancelText: '取消',
      onConfirm: async (newName: string) => {
        if (!newName || newName === fileName) return;
        if (!validateFileName(newName)) {
          showError('重命名失败', '名称不能包含特殊字符 /\:*?"<>|');
          return;
        }
        try {
          const result = await handleRenameFile(filePath, newName);
          if (result.success) {
            showSuccess('重命名成功', `成功将 ${fileName} 重命名为 ${newName}`);
            const renamed = {
              filePath: filePath.replace(/[^/]+$/, newName),
              fileName: newName,
              fileType: target.fileType
            };
            setSelectedItems([renamed]);
            setSelectionAnchorPath(renamed.filePath);
            const pathParts = filePath.split('/');
            pathParts.pop();
            const parentPath = pathParts.join('/');
            const {
              clearPathCache
            } = await import('../utils/fileCache');
            clearPathCache(parentPath);
            if (parentPath === projectRootPath || !parentPath) {
              await refreshCurrentProject();
            } else {
              const parentFile = findFileItem(files, parentPath);
              if (parentFile) {
                await loadDirectoryContent(parentFile);
              }
            }
          } else {
            showError('重命名失败', result.message);
          }
        } catch (error) {
          console.error('重命名文件异常:', error);
          showError('重命名异常', `重命名文件过程中发生异常: ${error}`);
        }
      }
    });
  }, [resolveActionTarget, handleRenameFile, showSuccess, showError, refreshCurrentProject, openInputDialog, projectRootPath, files, findFileItem, loadDirectoryContent]);
  const handleDeleteFileAction = useCallback(async () => {
    const targets = resolveActionTargets();
    if (targets.length === 0) return;
    const label = targets.length === 1 ? `${targets[0].fileType === 'directory' ? '文件夹' : '文件'} "${targets[0].fileName}"` : `${targets.length} 个项目`;
    if (!confirm(`确定要删除${label} 吗？此操作不可撤销。`)) return;
    setContextMenu(null);
    const parentPaths = new Set<string>();
    let successCount = 0;
    let lastError = '';
    for (const target of targets) {
      try {
        const result = await handleDeleteFile(target.filePath);
        if (result.success) {
          successCount += 1;
          const pathParts = target.filePath.split('/');
          pathParts.pop();
          parentPaths.add(pathParts.join('/') || projectRootPath);
        } else {
          lastError = result.message;
        }
      } catch (error) {
        console.error('删除文件异常:', error);
        lastError = String(error);
      }
    }
    if (successCount > 0) {
      showSuccess('删除成功', `成功删除 ${successCount} 项`);
      setSelectedItems([]);
      setSelectionAnchorPath(null);
      const {
        clearPathCache
      } = await import('../utils/fileCache');
      for (const parentPath of parentPaths) {
        clearPathCache(parentPath);
      }
      if ([...parentPaths].some(p => !p || p === projectRootPath)) {
        await refreshCurrentProject();
      } else {
        for (const parentPath of parentPaths) {
          const parentFile = findFileItem(files, parentPath);
          if (parentFile) {
            await loadDirectoryContent(parentFile);
          }
        }
      }
    }
    if (lastError && successCount < targets.length) {
      showError('删除失败', lastError);
    }
  }, [resolveActionTargets, handleDeleteFile, showSuccess, showError, refreshCurrentProject, projectRootPath, files, findFileItem, loadDirectoryContent]);
  const handleDropFile = useCallback(async (e: React.DragEvent, targetPath: string, targetType: string) => {
    const dropInfo = handleDrop(e, targetPath, targetType);
    if (dropInfo) {
      const result = await handleMoveFile(dropInfo.sourcePath, `${targetPath}/${dropInfo.sourceName}`);
      if (result.success) {
        showSuccess('移动成功', `成功移动 ${dropInfo.sourceName}`);
        const sourcePathParts = dropInfo.sourcePath.split('/');
        sourcePathParts.pop();
        const sourceParentPath = sourcePathParts.join('/');
        const {
          clearPathCache
        } = await import('../utils/fileCache');
        clearPathCache(sourceParentPath);
        clearPathCache(targetPath);
        if (sourceParentPath === projectRootPath || targetPath === projectRootPath || !sourceParentPath) {
          await refreshCurrentProject();
        } else {
          if (sourceParentPath !== targetPath) {
            const sourceParentFile = findFileItem(files, sourceParentPath);
            if (sourceParentFile) {
              await loadDirectoryContent(sourceParentFile);
            }
          }
          const targetParentFile = findFileItem(files, targetPath);
          if (targetParentFile) {
            await loadDirectoryContent(targetParentFile);
          }
        }
      } else {
        showError('移动失败', result.message);
      }
    }
  }, [handleDrop, handleMoveFile, showSuccess, showError, refreshCurrentProject, projectRootPath, files, findFileItem, loadDirectoryContent]);
  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    });
  }, []);
  useEffect(() => {
    const fileTreeElement = fileTreeRef.current;
    if (fileTreeElement) {
      fileTreeElement.addEventListener('scroll', handleScroll);
      return () => {
        fileTreeElement.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, [handleScroll]);
  useImperativeHandle(ref, () => ({
    handleOpenFolder,
    loadDirectory,
    newFile: () => handleNewFileClick(),
    newFolder: () => handleNewFolder(),
    refresh: () => handleRefresh(),
    renameSelected: () => {
      void handleRenameFileAction();
    },
    deleteSelected: () => {
      void handleDeleteFileAction();
    },
    copySelected: () => handleCopyFileAction(),
    cutSelected: () => handleCutFileAction(),
    pasteToSelected: () => {
      void handlePasteFileAction();
    }
  }), [handleOpenFolder, loadDirectory, handleNewFileClick, handleNewFolder, handleRefresh, handleRenameFileAction, handleDeleteFileAction, handleCopyFileAction, handleCutFileAction, handlePasteFileAction]);
  const handleExplorerKeyDown = useCallback((e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    const key = e.key.toLowerCase();
    const ctrl = e.ctrlKey || e.metaKey;
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !ctrl && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      const visible = getVisibleTreeItems(files, expandedDirs);
      if (visible.length === 0) return;
      const currentPath = primarySelectedItem?.filePath;
      let index = currentPath ? visible.findIndex(item => item.filePath === currentPath) : -1;
      if (index < 0) index = 0;
      if (e.key === 'ArrowDown') {
        index = Math.min(index + 1, visible.length - 1);
      } else {
        index = Math.max(index - 1, 0);
      }
      const next = visible[index];
      setSelectedItems([next]);
      setSelectionAnchorPath(next.filePath);
      return;
    }
    if (e.key === 'Enter' && !ctrl && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      const currentPath = primarySelectedItem?.filePath;
      if (!currentPath) return;
      const file = findFileItem(files, currentPath);
      if (file) {
        void openSelectedFile(file);
      }
      return;
    }
    if (e.key === 'F2' && !ctrl && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      void handleRenameFileAction();
      return;
    }
    if (e.key === 'Delete' && !ctrl && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      void handleDeleteFileAction();
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
      handleCopyFileAction();
      return;
    }
    if (ctrl && !e.altKey && key === 'x') {
      e.preventDefault();
      e.stopPropagation();
      handleCutFileAction();
      return;
    }
    if (ctrl && !e.altKey && key === 'v') {
      e.preventDefault();
      e.stopPropagation();
      void handlePasteFileAction();
      return;
    }
  }, [files, expandedDirs, primarySelectedItem, getVisibleTreeItems, findFileItem, openSelectedFile, handleRenameFileAction, handleDeleteFileAction, handleRefresh, handleCopyFileAction, handleCutFileAction, handlePasteFileAction]);
  useEffect(() => {
    const path = primarySelectedItem?.filePath;
    if (!path) return;
    const el = fileTreeRef.current?.querySelector(`.file-item[data-path="${CSS.escape(path)}"]`) as HTMLElement | null;
    el?.scrollIntoView({
      block: 'nearest'
    });
  }, [primarySelectedItem?.filePath]);
  return <div className="project-explorer" ref={explorerRootRef} tabIndex={0} onMouseDown={() => {
    explorerRootRef.current?.focus({
      preventScroll: true
    });
  }} onKeyDown={handleExplorerKeyDown}>
      <ProjectActions projectRootPath={projectRootPath} files={files} isLoading={isLoading || isOperationLoading} isWatching={isWatching} onNewFile={() => handleNewFile(false)} onRefresh={handleRefresh} onOpenFolder={handleOpenFolder} onGitClone={handleGitClone} onShowCloneHistory={handleShowCloneHistory} onShowSearch={showSearch} />

      {}
      <div ref={fileTreeRef} className={`file-tree ${isScrolling ? 'scrolling' : ''}`} onScroll={handleScroll} onClick={e => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest?.('.file-item')) {
        setSelectedItems([]);
        setSelectionAnchorPath(null);
      }
    }} onContextMenu={handleBlankContextMenu} onDragOver={e => handleDragOver(e, projectRootPath, 'directory')} onDragLeave={handleDragLeave} onDrop={e => handleDrop(e, projectRootPath, 'directory')}>
        {!projectRootPath ? <div className="empty-state">
            <div className="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="empty-text">没有打开的项目</div>
            <div className="empty-subtext">点击上方按钮打开文件夹或克隆Git仓库</div>
          </div> : <FileTree files={files} projectRootPath={projectRootPath} expandedDirs={expandedDirs} selectedPaths={selectedPaths} isLoading={isLoading} onToggleDirectory={handleDirectoryClick} onFileClick={handleFileClick} onFileContextMenu={handleFileContextMenu} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDropFile} onFileMouseEnter={handleFileMouseEnter} onFileMouseLeave={handleFileMouseLeave} />}
      </div>
      
      {}
      {contextMenu && <ContextMenu isVisible={true} x={contextMenu.x} y={contextMenu.y} fileType={contextMenu.fileType} hasClipboardContent={!!clipboard} clipboardName={clipboard?.name} menuId="project-explorer-menu" onClose={handleContextMenuClose} onNewFile={handleNewFileClick} onNewFolder={handleNewFolder} onCopy={handleCopyFileAction} onCut={handleCutFileAction} onPaste={handlePasteFileAction} onRename={handleRenameFileAction} onDelete={handleDeleteFileAction} onRefresh={handleRefresh} />}
      
      {}
      {tooltip && <FileTooltip content={tooltip.content} x={tooltip.x} y={tooltip.y} />}
      
      {gitCloneDialog.isOpen && <GitCloneDialog isOpen={gitCloneDialog.isOpen} defaultTargetPath={gitCloneDialog.defaultTargetPath} onClose={closeGitCloneDialog} onConfirm={handleGitCloneConfirm} />}
      
      {}
      {isCloneHistoryDialogOpen && <CloneHistoryDialog isOpen={isCloneHistoryDialogOpen} onClose={() => setIsCloneHistoryDialogOpen(false)} onSelectHistory={handleSelectHistory} />}
      
      {}
      {isSearchVisible && <FileSearch files={files} onFileSelect={handleFileClick} onClose={hideSearch} placeholder="搜索文件..." />}
      
      {}
      {previewFile && <FilePreview file={previewFile} isVisible={true} onClose={() => setPreviewFile(null)} />}
      
      {}
      <Toast items={toasts} onClose={removeToast} />
    </div>;
});
ProjectExplorer.displayName = 'ProjectExplorer';
export default ProjectExplorer;