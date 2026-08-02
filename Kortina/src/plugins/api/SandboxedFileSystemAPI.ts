import type { FileContent, FileEntry, FileStat, FileSystemAPI } from '../index';
import { exists, mkdir, readDir, readFile, rename as renameFile, rmdir, stat, unlink, writeFile } from '../../utils/fileSystem';
import { SandboxedAPI } from './SandboxedAPI';
import { useProjectStore } from '../../stores/ProjectStore';
export class SandboxedFileSystemAPI extends SandboxedAPI implements FileSystemAPI {
  private resolveWorkspacePath(path: string): string {
    const root = useProjectStore.getState().currentProjectPath;
    if (!root) throw new Error('No workspace is open');
    if (!path || path.includes('\0')) throw new Error('Invalid path');
    const normalize = (value: string): string => {
      const slashPath = value.replace(/\\/g, '/');
      const drive = slashPath.match(/^[A-Za-z]:/i)?.[0] ?? '';
      const unc = slashPath.startsWith('//');
      const absolute = slashPath.startsWith('/') || Boolean(drive);
      const prefix = drive ? `${drive}/` : unc ? '//' : absolute ? '/' : '';
      const bodyOffset = drive ? drive.length : unc ? 2 : absolute ? 1 : 0;
      const components: string[] = [];
      for (const component of slashPath.slice(bodyOffset).split('/')) {
        if (!component || component === '.') continue;
        if (component === '..') components.pop();else components.push(component);
      }
      const result = `${prefix}${components.join('/')}`;
      return result.length > prefix.length ? result.replace(/\/$/, '') : result;
    };
    const normalizedRoot = normalize(root);
    const isAbsolute = /^(?:[A-Za-z]:[\\/]|\/)/.test(path);
    const candidate = normalize(isAbsolute ? path : `${normalizedRoot}/${path}`);
    const caseInsensitive = /^[A-Za-z]:/.test(normalizedRoot);
    const comparableRoot = caseInsensitive ? normalizedRoot.toLowerCase() : normalizedRoot;
    const comparableCandidate = caseInsensitive ? candidate.toLowerCase() : candidate;
    if (comparableCandidate !== comparableRoot && !comparableCandidate.startsWith(`${comparableRoot}/`)) {
      throw new Error(`Plugin "${this.pluginId}" cannot access paths outside the workspace`);
    }
    return candidate;
  }
  async readFile(path: string): Promise<FileContent> {
    this.checkPermission('fs:read');
    path = this.resolveWorkspacePath(path);
    try {
      const result = await readFile(path);
      return result;
    } catch (error) {
      console.error(`[PluginManager] Failed to read file: ${path}`, error);
      throw error;
    }
  }
  async writeFile(path: string, content: string): Promise<void> {
    this.checkPermission('fs:write');
    path = this.resolveWorkspacePath(path);
    try {
      const result = await writeFile(path, content);
      if (!result.success) {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error(`[PluginManager] Failed to write file: ${path}`, error);
      throw error;
    }
  }
  async exists(path: string): Promise<boolean> {
    this.checkPermission('fs:read');
    path = this.resolveWorkspacePath(path);
    try {
      return await exists(path);
    } catch {
      return false;
    }
  }
  async mkdir(path: string): Promise<void> {
    this.checkPermission('fs:write');
    path = this.resolveWorkspacePath(path);
    try {
      await mkdir(path);
    } catch (error) {
      console.error(`[PluginManager] Failed to create directory: ${path}`, error);
      throw error;
    }
  }
  async rmdir(path: string): Promise<void> {
    this.checkPermission('fs:delete');
    path = this.resolveWorkspacePath(path);
    try {
      await rmdir(path);
    } catch (error) {
      console.error(`[PluginManager] Failed to remove directory: ${path}`, error);
      throw error;
    }
  }
  async readDir(path: string): Promise<FileEntry[]> {
    this.checkPermission('fs:read');
    path = this.resolveWorkspacePath(path);
    try {
      const items = await readDir(path);
      return items.map(item => ({
        name: item.name,
        path: item.path,
        isDirectory: item.type === 'directory'
      }));
    } catch (error) {
      console.error(`[PluginManager] Failed to read directory: ${path}`, error);
      throw error;
    }
  }
  async unlink(path: string): Promise<void> {
    this.checkPermission('fs:delete');
    path = this.resolveWorkspacePath(path);
    try {
      const result = await unlink(path);
      if (!result.success) {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error(`[PluginManager] Failed to delete file: ${path}`, error);
      throw error;
    }
  }
  async rename(oldPath: string, newPath: string): Promise<void> {
    this.checkPermission('fs:write');
    oldPath = this.resolveWorkspacePath(oldPath);
    newPath = this.resolveWorkspacePath(newPath);
    try {
      const result = await renameFile(oldPath, newPath);
      if (!result.success) {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error(`[PluginManager] Failed to rename: ${oldPath} -> ${newPath}`, error);
      throw error;
    }
  }
  async stat(path: string): Promise<FileStat> {
    this.checkPermission('fs:read');
    path = this.resolveWorkspacePath(path);
    try {
      return await stat(path);
    } catch (error) {
      console.error(`[PluginManager] Failed to stat: ${path}`, error);
      throw error;
    }
  }
}