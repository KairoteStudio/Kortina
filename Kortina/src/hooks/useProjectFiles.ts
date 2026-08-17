import { useState, useCallback, useRef } from 'react';
import type { FileItem } from '../utils/fileSystem';
import { ProjectExplorerService } from '../services/projectExplorerService';

export function useProjectFiles(projectRootPath: string) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [loadedDirs, setLoadedDirs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef(false);

  const updateFileChildren = useCallback((
    items: FileItem[],
    targetPath: string,
    children: FileItem[]
  ): FileItem[] => {
    return items.map(item => {
      if (item.path === targetPath) {
        return { ...item, children };
      }
      if (item.children && item.children.length > 0) {
        return { ...item, children: updateFileChildren(item.children, targetPath, children) };
      }
      return item;
    });
  }, []);

  const loadChildrenForExpanded = useCallback(async (
    items: FileItem[],
    expandedPaths: string[]
  ): Promise<FileItem[]> => {
    const result: FileItem[] = [];
    for (const item of items) {
      if (item.type === 'directory') {
        if (expandedPaths.includes(item.path)) {
          const children = await ProjectExplorerService.readDirectory(item.path, false);
          const nestedChildren = await loadChildrenForExpanded(children, expandedPaths);
          result.push({ ...item, children: nestedChildren });
        } else {
          const nestedChildren = item.children
            ? await loadChildrenForExpanded(item.children, expandedPaths)
            : undefined;
          result.push({ ...item, children: nestedChildren });
        }
      } else {
        result.push(item);
      }
    }
    return result;
  }, []);

  const loadDirectoryContent = useCallback(async (targetPath: string): Promise<FileItem[]> => {
    const children = await ProjectExplorerService.readDirectory(targetPath, true);
    setFiles(prev => updateFileChildren(prev, targetPath, children));
    setLoadedDirs(prev => new Set(prev).add(targetPath));
    return children;
  }, [updateFileChildren]);

  const toggleDirectory = useCallback(async (targetPath: string) => {
    const isExpanding = !expandedDirs.has(targetPath);

    if (isExpanding) {
      await loadDirectoryContent(targetPath);
    }

    setExpandedDirs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(targetPath)) {
        newSet.delete(targetPath);
        const pathPrefix = targetPath.endsWith('/') ? targetPath : targetPath + '/';
        for (const expandedPath of newSet) {
          if (expandedPath.startsWith(pathPrefix)) {
            newSet.delete(expandedPath);
          }
        }
      } else {
        newSet.add(targetPath);
      }
      return newSet;
    });
  }, [expandedDirs, loadDirectoryContent]);

  const loadProject = useCallback(async (path: string) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);

    try {
      const items = await ProjectExplorerService.loadProject(path);
      setFiles(items);
      setExpandedDirs(new Set());
    } catch (error) {
      console.error('加载项目失败:', error);
      setFiles([]);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const refresh = useCallback(async () => {
    console.log('[refresh] CALLED', { projectRootPath, hasProjectPath: !!projectRootPath });
    if (!projectRootPath) return;
    setIsLoading(true);

    try {
      const { clearPathCache } = await import('../utils/fileCache');
      clearPathCache(projectRootPath);

      const rootFiles = await ProjectExplorerService.readDirectory(projectRootPath, false);
      const expandedPaths = Array.from(expandedDirs);
      console.log('[refresh] expandedPaths', expandedPaths);
      const finalFiles = await loadChildrenForExpanded(rootFiles, expandedPaths);
      console.log('[refresh] finalFiles', finalFiles.map(f => ({ name: f.name, childrenLen: f.children?.length })));
      setFiles(finalFiles);
      console.log('[refresh] setFiles DONE');
    } catch (error) {
      console.error('刷新项目失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectRootPath, expandedDirs, loadChildrenForExpanded]);

  const findFile = useCallback((items: FileItem[], targetPath: string): FileItem | null => {
    for (const item of items) {
      if (item.path === targetPath) return item;
      if (item.children) {
        const found = findFile(item.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const getVisibleItems = useCallback((): FileItem[] => {
    const result: FileItem[] = [];

    const walk = (list: FileItem[]) => {
      for (const item of list) {
        result.push(item);
        if (item.type === 'directory' && expandedDirs.has(item.path) && item.children) {
          walk(item.children);
        }
      }
    };

    walk(files);
    return result;
  }, [files, expandedDirs]);

  return {
    files,
    setFiles,
    expandedDirs,
    setExpandedDirs,
    loadedDirs,
    isLoading,
    toggleDirectory,
    loadProject,
    refresh,
    findFile,
    getVisibleItems,
    loadDirectoryContent,
  };
}
