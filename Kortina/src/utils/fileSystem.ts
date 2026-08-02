import { invoke } from '@tauri-apps/api/core';
import { getCachedDirectory, cacheDirectory, getCachedFile, cacheFile, clearPathCache, clearAllCache, getCacheStats } from './fileCache';
export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: number;
  children?: FileItem[];
}
export interface FileContent {
  content: string;
  encoding: string;
}
export interface FileOperationResult {
  success: boolean;
  message: string;
}
export interface GitCloneOptions {
  repoUrl: string;
  targetPath: string;
  branch?: string;
  authType?: 'none' | 'basic' | 'token' | 'ssh';
  username?: string;
  password?: string;
  token?: string;
  sshKeyPath?: string;
}
export async function readDirectory(path: string, useCache: boolean = true, saveToRecents: boolean = false): Promise<FileItem[]> {
  try {
    const normalizedPath = path.replace(/\\/g, '/');
    if (useCache) {
      const cachedItems = getCachedDirectory(normalizedPath);
      if (cachedItems) {
        console.log(`从缓存读取目录: ${normalizedPath}`);
        return cachedItems;
      }
    }
    const items = await invoke<FileItem[]>('read_directory', {
      path: normalizedPath,
      saveToRecents: saveToRecents
    });
    if (useCache) {
      cacheDirectory(normalizedPath, items);
      console.log(`缓存目录: ${normalizedPath}`);
    }
    return items;
  } catch (error) {
    console.error('读取目录失败:', error);
    throw error;
  }
}
export async function readFile(path: string, useCache: boolean = true): Promise<FileContent> {
  try {
    const normalizedPath = path.replace(/\\/g, '/');
    if (useCache) {
      const cachedContent = getCachedFile(normalizedPath);
      if (cachedContent !== null) {
        console.log(`从缓存读取文件: ${normalizedPath}`);
        return {
          content: cachedContent,
          encoding: 'utf-8'
        };
      }
    }
    const content = await invoke<FileContent>('read_file', {
      path: normalizedPath
    });
    if (useCache) {
      cacheFile(normalizedPath, content.content);
      console.log(`缓存文件: ${normalizedPath}`);
    }
    return content;
  } catch (error) {
    console.error('读取文件失败:', error);
    throw error;
  }
}
export async function writeFile(path: string, content: string): Promise<FileOperationResult> {
  try {
    const normalizedPath = path.replace(/\\/g, '/');
    const result = await invoke<FileOperationResult>('write_file', {
      path: normalizedPath,
      content
    });
    if (result.success) {
      clearPathCache(normalizedPath);
      console.log(`清除缓存: ${normalizedPath}`);
    }
    return result;
  } catch (error) {
    console.error('写入文件失败:', error);
    throw error;
  }
}
export async function createFile(path: string, isDirectory: boolean = false): Promise<FileOperationResult> {
  try {
    const normalizedPath = path.replace(/\\/g, '/');
    const result = await invoke<FileOperationResult>('create_file', {
      path: normalizedPath,
      isDirectory
    });
    if (result.success) {
      const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
      if (parentPath) {
        clearPathCache(parentPath);
        console.log(`清除父目录缓存: ${parentPath}`);
      }
    }
    return result;
  } catch (error) {
    console.error('创建文件失败:', error);
    throw error;
  }
}
export async function deleteFile(path: string): Promise<FileOperationResult> {
  try {
    const normalizedPath = path.replace(/\\/g, '/');
    const result = await invoke<FileOperationResult>('delete_file', {
      path: normalizedPath
    });
    if (result.success) {
      clearPathCache(normalizedPath);
      const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
      if (parentPath) {
        clearPathCache(parentPath);
        console.log(`清除父目录缓存: ${parentPath}`);
      }
    }
    return result;
  } catch (error) {
    console.error('删除文件失败:', error);
    throw error;
  }
}
export async function renameFile(oldPath: string, newPath: string): Promise<FileOperationResult> {
  try {
    const normalizedOldPath = oldPath.replace(/\\/g, '/');
    const normalizedNewPath = newPath.replace(/\\/g, '/');
    const result = await invoke<FileOperationResult>('rename_file', {
      oldPath: normalizedOldPath,
      newPath: normalizedNewPath
    });
    if (result.success) {
      clearPathCache(normalizedOldPath);
      clearPathCache(normalizedNewPath);
      const oldParentPath = normalizedOldPath.substring(0, normalizedOldPath.lastIndexOf('/'));
      const newParentPath = normalizedNewPath.substring(0, normalizedNewPath.lastIndexOf('/'));
      if (oldParentPath) {
        clearPathCache(oldParentPath);
        console.log(`清除旧父目录缓存: ${oldParentPath}`);
      }
      if (newParentPath && newParentPath !== oldParentPath) {
        clearPathCache(newParentPath);
        console.log(`清除新父目录缓存: ${newParentPath}`);
      }
    }
    return result;
  } catch (error) {
    console.error('重命名文件失败:', error);
    throw error;
  }
}
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}
export function getFileName(filepath: string): string {
  const parts = filepath.split(/[/\\]/);
  return parts[parts.length - 1] || '';
}
export function getDirectoryPath(filepath: string): string {
  const parts = filepath.split(/[/\\]/);
  parts.pop();
  return parts.join('/') || '/';
}
export function isTextFile(filename: string): boolean {
  const textExtensions = ['es', 'esh', 'txt', 'md', 'json', 'xml', 'yaml', 'yml', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'sass', 'py', 'java', 'cpp', 'c', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'scala', 'r', 'm', 'mm'];
  const ext = getFileExtension(filename).toLowerCase();
  return textExtensions.includes(ext);
}
export async function getProjectRoot(): Promise<string> {
  try {
    const currentDir = await invoke<string>('get_current_dir');
    return currentDir;
  } catch (error) {
    console.error('获取项目根目录失败:', error);
    return '/';
  }
}
export async function getCurrentDir(): Promise<string> {
  try {
    const currentDir = await invoke<string>('get_current_dir');
    return currentDir;
  } catch (error) {
    console.error('获取当前目录失败:', error);
    return '.';
  }
}
export async function moveFile(sourcePath: string, targetPath: string): Promise<FileOperationResult> {
  try {
    const normalizedSourcePath = sourcePath.replace(/\\/g, '/');
    const normalizedTargetPath = targetPath.replace(/\\/g, '/');
    const result = await invoke<FileOperationResult>('move_file', {
      sourcePath: normalizedSourcePath,
      targetPath: normalizedTargetPath
    });
    if (result.success) {
      clearPathCache(normalizedSourcePath);
      clearPathCache(normalizedTargetPath);
      const sourceParentPath = normalizedSourcePath.substring(0, normalizedSourcePath.lastIndexOf('/'));
      const targetParentPath = normalizedTargetPath.substring(0, normalizedTargetPath.lastIndexOf('/'));
      if (sourceParentPath) {
        clearPathCache(sourceParentPath);
        console.log(`清除源父目录缓存: ${sourceParentPath}`);
      }
      if (targetParentPath && targetParentPath !== sourceParentPath) {
        clearPathCache(targetParentPath);
        console.log(`清除目标父目录缓存: ${targetParentPath}`);
      }
    }
    return result;
  } catch (error) {
    console.error('移动文件失败:', error);
    return {
      success: false,
      message: `移动文件失败: ${error}`
    };
  }
}
export async function gitClone(options: GitCloneOptions): Promise<FileOperationResult> {
  try {
    const result = await invoke<FileOperationResult>('git_clone', {
      repoUrl: options.repoUrl,
      targetPath: options.targetPath,
      branch: options.branch,
      authType: options.authType,
      username: options.username,
      password: options.password,
      token: options.token,
      sshKeyPath: options.sshKeyPath
    });
    if (result.success) {
      const parentPath = options.targetPath.substring(0, options.targetPath.lastIndexOf('/'));
      if (parentPath) {
        clearPathCache(parentPath);
        console.log(`清除克隆目标父目录缓存: ${parentPath}`);
      }
    }
    return result;
  } catch (error) {
    console.error('Git克隆失败:', error);
    return {
      success: false,
      message: `Git克隆失败: ${error}`
    };
  }
}
export async function copyFile(sourcePath: string, targetPath: string): Promise<FileOperationResult> {
  try {
    const normalizedSourcePath = sourcePath.replace(/\\/g, '/');
    const normalizedTargetPath = targetPath.replace(/\\/g, '/');
    const result = await invoke<FileOperationResult>('copy_file', {
      sourcePath: normalizedSourcePath,
      targetPath: normalizedTargetPath
    });
    if (result.success) {
      const parentPath = normalizedTargetPath.substring(0, normalizedTargetPath.lastIndexOf('/'));
      if (parentPath) {
        clearPathCache(parentPath);
        console.log(`清除复制目标父目录缓存: ${parentPath}`);
      }
    }
    return result;
  } catch (error) {
    console.error('复制文件失败:', error);
    return {
      success: false,
      message: `复制文件失败: ${error}`
    };
  }
}
export async function exists(path: string): Promise<boolean> {
  try {
    const normalizedPath = path.replace(/\\/g, '/');
    const result = await invoke<boolean>('check_file_exists', {
      path: normalizedPath
    });
    return result;
  } catch {
    return false;
  }
}
export async function stat(path: string): Promise<{
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  modified: number;
}> {
  try {
    const normalizedPath = path.replace(/\\/g, '/');
    return await invoke('stat_path', {
      path: normalizedPath
    });
  } catch (error) {
    throw new Error(`无法读取路径元数据: ${String(error)}`);
  }
}
export async function rmdir(path: string): Promise<void> {
  try {
    const normalizedPath = path.replace(/\\/g, '/');
    const result = await invoke<FileOperationResult>('delete_file', {
      path: normalizedPath
    });
    if (!result.success) {
      throw new Error(result.message);
    }
    clearPathCache(normalizedPath);
  } catch (error) {
    console.error('删除目录失败:', error);
    throw error;
  }
}
export async function mkdir(path: string): Promise<void> {
  try {
    const normalizedPath = path.replace(/\\/g, '/');
    const result = await createFile(normalizedPath, true);
    if (!result.success) {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('创建目录失败:', error);
    throw error;
  }
}
export { readDirectory as readDir };
export { deleteFile as unlink };
export { renameFile as rename };
export { clearPathCache };
export { clearAllCache };
export { getCacheStats };
export interface SearchResult {
  file: string;
  line: number;
  column: number;
  content: string;
  matches: {
    start: number;
    end: number;
  }[];
}
export interface SearchOptions {
  query: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  useRegex?: boolean;
  includePattern?: string;
  excludePattern?: string;
}
export interface StreamingSearchHandlers {
  onBatch: (results: SearchResult[]) => void;
  onDone?: (info: {
    total: number;
    truncated: boolean;
  }) => void;
  onError?: (message: string) => void;
}
export interface StreamingSearchHandle {
  searchId: string;
  cancel: () => void;
  done: Promise<void>;
}
let searchIdSeq = 0;
export async function searchInFilesStreaming(projectPath: string, options: SearchOptions, handlers: StreamingSearchHandlers): Promise<StreamingSearchHandle> {
  const normalizedPath = projectPath.replace(/\\/g, '/');
  const searchId = `s-${Date.now()}-${++searchIdSeq}`;
  const {
    listen
  } = await import('@tauri-apps/api/event');
  let cancelled = false;
  let settled = false;
  let resolveDone!: () => void;
  const done = new Promise<void>(resolve => {
    resolveDone = resolve;
  });
  const finish = () => {
    if (settled) return;
    settled = true;
    resolveDone();
  };
  const unlistenResults = await listen<{
    searchId: string;
    results: SearchResult[];
  }>('search:results', event => {
    if (cancelled || event.payload.searchId !== searchId) return;
    if (event.payload.results?.length) {
      handlers.onBatch(event.payload.results);
    }
  });
  const unlistenDone = await listen<{
    searchId: string;
    total: number;
    truncated: boolean;
  }>('search:done', event => {
    if (cancelled || event.payload.searchId !== searchId) return;
    handlers.onDone?.({
      total: event.payload.total,
      truncated: event.payload.truncated
    });
    unlistenResults();
    unlistenDone();
    unlistenError();
    finish();
  });
  const unlistenError = await listen<{
    searchId: string;
    message: string;
  }>('search:error', event => {
    if (cancelled || event.payload.searchId !== searchId) return;
    handlers.onError?.(event.payload.message);
    unlistenResults();
    unlistenDone();
    unlistenError();
    finish();
  });
  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    unlistenResults();
    unlistenDone();
    unlistenError();
    void invoke('cancel_search', {
      searchId
    }).catch(() => undefined);
    finish();
  };
  void invoke('search_files', {
    projectPath: normalizedPath,
    searchId,
    options: {
      query: options.query,
      case_sensitive: options.caseSensitive ?? false,
      whole_word: options.wholeWord ?? false,
      use_regex: options.useRegex ?? false,
      include_pattern: options.includePattern ?? '*',
      exclude_pattern: options.excludePattern ?? 'node_modules,dist,build,.git'
    }
  }).catch(error => {
    if (cancelled || settled) return;
    handlers.onError?.(error instanceof Error ? error.message : String(error));
    unlistenResults();
    unlistenDone();
    unlistenError();
    finish();
  });
  return {
    searchId,
    cancel,
    done
  };
}
export async function searchInFiles(projectPath: string, options: SearchOptions): Promise<SearchResult[]> {
  const all: SearchResult[] = [];
  const handle = await searchInFilesStreaming(projectPath, options, {
    onBatch: batch => {
      all.push(...batch);
    }
  });
  await handle.done;
  return all;
}