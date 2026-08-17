import { invoke } from '@tauri-apps/api/core';
import { getCachedDirectory, cacheDirectory, clearPathCache } from '../utils/fileCache';
import type { FileItem, FileOperationResult } from '../utils/fileSystem';

export const ProjectExplorerService = {
  
  async readDirectory(path: string, useCache: boolean = true): Promise<FileItem[]> {
    const normalizedPath = path.replace(/\\/g, '/');

    if (useCache) {
      const cached = getCachedDirectory(normalizedPath);
      if (cached) return cached;
    }

    const items = await invoke<FileItem[]>('read_directory', {
      path: normalizedPath,
      saveToRecents: false
    });

    if (useCache) {
      cacheDirectory(normalizedPath, items);
    }

    return items;
  },

  
  async loadProject(path: string): Promise<FileItem[]> {
    const normalizedPath = path.replace(/\\/g, '/');
    const items = await invoke<FileItem[]>('read_directory', {
      path: normalizedPath,
      saveToRecents: true
    });
    cacheDirectory(normalizedPath, items);
    return items;
  },

  
  async createFile(path: string, isDirectory: boolean = false): Promise<FileOperationResult> {
    const normalizedPath = path.replace(/\\/g, '/');
    const result = await invoke<FileOperationResult>('create_file', {
      path: normalizedPath,
      isDirectory
    });

    if (result.success) {
      const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
      if (parentPath) clearPathCache(parentPath);
    }

    return result;
  },

  
  async deleteFile(path: string): Promise<FileOperationResult> {
    const normalizedPath = path.replace(/\\/g, '/');
    const result = await invoke<FileOperationResult>('delete_file', {
      path: normalizedPath
    });

    if (result.success) {
      clearPathCache(normalizedPath);
      const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
      if (parentPath) clearPathCache(parentPath);
    }

    return result;
  },

  
  async renameFile(oldPath: string, newPath: string): Promise<FileOperationResult> {
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
      if (oldParentPath) clearPathCache(oldParentPath);
      if (newParentPath && newParentPath !== oldParentPath) clearPathCache(newParentPath);
    }

    return result;
  },

  
  async moveFile(sourcePath: string, targetPath: string): Promise<FileOperationResult> {
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
      if (sourceParentPath) clearPathCache(sourceParentPath);
      if (targetParentPath && targetParentPath !== sourceParentPath) clearPathCache(targetParentPath);
    }

    return result;
  },

  
  async copyFile(sourcePath: string, targetPath: string): Promise<FileOperationResult> {
    const normalizedSourcePath = sourcePath.replace(/\\/g, '/');
    const normalizedTargetPath = targetPath.replace(/\\/g, '/');
    const result = await invoke<FileOperationResult>('copy_file', {
      sourcePath: normalizedSourcePath,
      targetPath: normalizedTargetPath
    });

    if (result.success) {
      const parentPath = normalizedTargetPath.substring(0, normalizedTargetPath.lastIndexOf('/'));
      if (parentPath) clearPathCache(parentPath);
    }

    return result;
  },

  
  async exists(path: string): Promise<boolean> {
    try {
      const normalizedPath = path.replace(/\\/g, '/');
      return await invoke<boolean>('check_file_exists', { path: normalizedPath });
    } catch {
      return false;
    }
  },
} as const;
