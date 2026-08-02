import { useEffect, useRef, useCallback, useState } from 'react';
import { isTauri } from '../utils/environment';
import { readDirectory, type FileItem } from '../utils/fileSystem';
import { systemLogger } from '../utils/logger';
import { AppEvents } from '../events/app-events';
export interface FileSystemWatcherOptions {
  path: string;
  onFilesChange?: (files: FileItem[]) => void;
  onDirectoryChange?: (dirPath: string, files: FileItem[]) => void;
  onError?: (error: Error) => void;
  debounceMs?: number;
}
const FS_CHANGED_EVENT = AppEvents.FS_CHANGED;
interface FsChangedPayload {
  path?: string;
}
export const useFileSystemWatcher = (options: FileSystemWatcherOptions) => {
  const {
    path,
    onFilesChange,
    onError,
    debounceMs = 500
  } = options;
  const [isWatching, setIsWatching] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFilesRef = useRef<FileItem[]>([]);
  const onFilesChangeRef = useRef(onFilesChange);
  const onErrorRef = useRef(onError);
  const debounceMsRef = useRef(debounceMs);
  onFilesChangeRef.current = onFilesChange;
  onErrorRef.current = onError;
  debounceMsRef.current = debounceMs;
  const areFilesEqual = useCallback((files1: FileItem[], files2: FileItem[]): boolean => {
    if (files1.length !== files2.length) return false;
    const sorted1 = [...files1].sort((a, b) => a.path.localeCompare(b.path));
    const sorted2 = [...files2].sort((a, b) => a.path.localeCompare(b.path));
    return sorted1.every((file, index) => {
      const other = sorted2[index];
      return file.name === other.name && file.path === other.path && file.type === other.type && file.size === other.size && file.modified === other.modified;
    });
  }, []);
  const refreshDirectory = useCallback(async (targetPath: string) => {
    if (!targetPath || !isTauri()) return;
    try {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      await new Promise<void>(resolve => {
        debounceTimerRef.current = setTimeout(async () => {
          try {
            const files = await readDirectory(targetPath, false);
            if (!areFilesEqual(files, lastFilesRef.current)) {
              lastFilesRef.current = files;
              onFilesChangeRef.current?.(files);
              systemLogger.info(`文件系统变更检测: ${targetPath}, 文件数量: ${files.length}`);
            }
          } catch (error) {
            systemLogger.error(`读取目录失败: ${targetPath}, 错误: ${error}`);
            onErrorRef.current?.(error as Error);
          } finally {
            resolve();
          }
        }, debounceMsRef.current);
      });
    } catch (error) {
      systemLogger.error(`文件系统监听异常: ${targetPath}, 错误: ${error}`);
      onErrorRef.current?.(error as Error);
    }
  }, [areFilesEqual]);
  useEffect(() => {
    if (!path || !isTauri()) {
      setIsWatching(false);
      return;
    }
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    let pollId: ReturnType<typeof setInterval> | null = null;
    const setup = async () => {
      try {
        const {
          invoke
        } = await import('@tauri-apps/api/core');
        const {
          listen
        } = await import('@tauri-apps/api/event');
        await invoke('start_fs_watch', {
          path
        });
        if (cancelled) {
          await invoke('stop_fs_watch', {
            path
          }).catch(() => {});
          return;
        }
        setIsWatching(true);
        systemLogger.info(`开始原生文件系统监听: ${path}`);
        await refreshDirectory(path);
        unlisten = await listen<FsChangedPayload>(FS_CHANGED_EVENT, event => {
          if (cancelled) return;
          const changedRoot = event.payload?.path;
          if (!changedRoot || changedRoot === path || path.startsWith(changedRoot) || changedRoot.startsWith(path)) {
            void refreshDirectory(path);
          }
        });
      } catch (error) {
        systemLogger.error(`启动原生文件监听失败，回退到低频轮询: ${error}`);
        if (cancelled) return;
        setIsWatching(true);
        void refreshDirectory(path);
        pollId = setInterval(() => {
          void refreshDirectory(path);
        }, 15000);
      }
    };
    setup();
    return () => {
      cancelled = true;
      setIsWatching(false);
      if (unlisten) unlisten();
      if (pollId) clearInterval(pollId);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      import('@tauri-apps/api/core').then(({
        invoke
      }) => invoke('stop_fs_watch', {
        path
      })).catch(() => {});
      systemLogger.info(`停止监听文件系统变更: ${path}`);
    };
  }, [path, refreshDirectory]);
  const refresh = useCallback(() => {
    if (path) void refreshDirectory(path);
  }, [path, refreshDirectory]);
  return {
    isWatching,
    refresh
  };
};