import React, { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isMobile } from '../../utils/environment';
import { systemLogger } from '../../utils/logger';

interface FileBrowserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  title?: string;
  selectButtonText?: string;
  initialPath?: string;
  mode?: 'file' | 'directory';
}

interface FsItem {
  name: string;
  path: string;
  type: string;
  size?: number;
  modified?: number;
  children?: FsItem[];
}

const FileBrowserDialog: React.FC<FileBrowserDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
  title = '选择文件夹',
  selectButtonText = '选择',
  initialPath,
  mode = 'directory'
}) => {
  const getDefaultPath = () => {
    if (initialPath) return initialPath;
    if (isMobile()) {
      
      return '/storage/emulated/0';
    }
    return '/';
  };

  const [currentPath, setCurrentPath] = useState(getDefaultPath());
  const [items, setItems] = useState<FsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [pathInput, setPathInput] = useState(getDefaultPath());
  const listRef = useRef<HTMLDivElement>(null);
  const hasLoaded = useRef(false);

  const loadDirectory = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await invoke<FsItem[]>('read_directory', { path, saveToRecents: false });
      
      const sorted = result.sort((a, b) => {
        const aIsDir = a.type === 'directory';
        const bIsDir = b.type === 'directory';
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.name.localeCompare(b.name);
      });
      setItems(sorted);
      setCurrentPath(path);
      setPathInput(path);
      setSelectedItem(null);
    } catch (err: any) {
      systemLogger.error(`读取目录失败: ${err}`);
      setError(`无法读取目录: ${err?.toString?.() || String(err)}`);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && !hasLoaded.current) {
      hasLoaded.current = true;
      loadDirectory(currentPath).catch(err => {
        systemLogger.error(`初始加载失败: ${err}`);
      });
    }
    if (!isOpen) {
      hasLoaded.current = false;
    }
  }, [isOpen, currentPath, loadDirectory]);

  const isDirectory = (item: FsItem) => item.type === 'directory';

  const handleItemClick = (item: FsItem) => {
    if (isDirectory(item)) {
      loadDirectory(item.path);
    } else if (mode === 'file') {
      setSelectedItem(item.path);
    }
  };

  const handleItemDoubleClick = (item: FsItem) => {
    if (isDirectory(item)) {
      loadDirectory(item.path);
    } else if (mode === 'file') {
      onSelect(item.path);
      onClose();
    }
  };

  const handleGoUp = () => {
    const parent = currentPath.substring(0, currentPath.lastIndexOf('/'));
    if (parent && parent !== currentPath) {
      loadDirectory(parent || '/');
    }
  };

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pathInput.trim()) {
      loadDirectory(pathInput.trim());
    }
  };

  const handleSelect = () => {
    if (mode === 'directory') {
      onSelect(currentPath);
    } else if (selectedItem) {
      onSelect(selectedItem);
    }
    onClose();
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (timestamp: number): string => {
    if (timestamp === 0) return '-';
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="file-browser-overlay" onClick={onClose}>
      <div className="file-browser-dialog" onClick={e => e.stopPropagation()}>
        <div className="file-browser-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="file-browser-toolbar">
          <button className="toolbar-btn" onClick={handleGoUp} disabled={currentPath === '/'}>
            ↑ 上级
          </button>
          <form onSubmit={handlePathSubmit} className="path-form">
            <input
              type="text"
              value={pathInput}
              onChange={e => setPathInput(e.target.value)}
              className="path-input"
              placeholder="输入路径..."
            />
          </form>
        </div>

        {error && (
          <div className="file-browser-error">
            {error}
          </div>
        )}

        <div className="file-browser-list" ref={listRef}>
          {isLoading ? (
            <div className="file-browser-loading">加载中...</div>
          ) : items.length === 0 ? (
            <div className="file-browser-empty">空文件夹</div>
          ) : (
            <table className="file-browser-table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>大小</th>
                  <th>修改时间</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr
                    key={item.path}
                    className={`
                      ${isDirectory(item) ? 'folder' : 'file'}
                      ${selectedItem === item.path ? 'selected' : ''}
                    `}
                    onClick={() => handleItemClick(item)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                  >
                    <td className="name-cell">
                      <span className="item-icon">
                        {isDirectory(item) ? '📁' : '📄'}
                      </span>
                      <span className="item-name">{item.name}</span>
                    </td>
                    <td className="size-cell">{formatSize(item.size || 0)}</td>
                    <td className="date-cell">{formatDate(item.modified || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="file-browser-footer">
          <div className="current-path">{currentPath}</div>
          <div className="action-buttons">
            <button className="btn-cancel" onClick={onClose}>取消</button>
            <button
              className="btn-select"
              onClick={handleSelect}
              disabled={mode === 'file' && !selectedItem}
            >
              {selectButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileBrowserDialog;