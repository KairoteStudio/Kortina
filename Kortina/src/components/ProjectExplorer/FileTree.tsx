import React from 'react';
import { FileText, Folder, FolderOpen } from 'lucide-react';
import { FileItem } from '../../utils/fileSystem';
import { CollapsibleChildren } from '../Core/CollapsibleChildren';
interface FileTreeProps {
  files: FileItem[];
  projectRootPath: string;
  expandedDirs: Set<string>;
  loadedDirs: Set<string>;
  selectedPaths: Set<string>;
  onToggleDirectory: (file: FileItem) => void;
  onFileClick: (file: FileItem, event: React.MouseEvent) => void;
  onFileContextMenu: (e: React.MouseEvent, path: string, name: string, type: string) => void;
  onDragStart: (e: React.DragEvent, item: FileItem) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, path: string, type: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, path: string, type: string) => void;
  onFileMouseEnter: (e: React.MouseEvent, name: string, path: string) => void;
  onFileMouseLeave: () => void;
  isLoading: boolean;
}
const TREE_INDENT = 12;
const TREE_BASE_PAD = 6;
const FileTree: React.FC<FileTreeProps> = ({
  files,
  projectRootPath,
  expandedDirs,
  loadedDirs,
  selectedPaths,
  onToggleDirectory,
  onFileClick,
  onFileContextMenu,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileMouseEnter,
  onFileMouseLeave,
  isLoading
}) => {
  const isFileTooLong = (name: string): boolean => name.length > 25;
  const renderFileItem = React.useCallback((item: FileItem, depth: number = 0, parentHasNextSibling: boolean = false, ancestorHasNextSibling: boolean[] = []): React.ReactElement => {
    const isExpanded = expandedDirs.has(item.path);
    const tooLong = isFileTooLong(item.name);
    const isDirectory = item.type === 'directory';
    const isSelected = selectedPaths.has(item.path);
    const hasChildren = isDirectory;
    const canShowChildren = isDirectory && item.children !== undefined;
    const childrenLoaded = loadedDirs.has(item.path);
    return <div key={item.path} className={`file-tree-item ${isExpanded ? 'expanded' : ''}`}>
        <div className={`file-item ${item.type} ${tooLong ? 'long-name' : ''} ${hasChildren ? 'has-children' : ''} ${isSelected ? 'selected' : ''}`} data-path={item.path} aria-selected={isSelected} style={{
        paddingLeft: `${depth * TREE_INDENT + TREE_BASE_PAD}px`
      }} onClick={e => {
        onFileClick(item, e);
      }} onContextMenu={e => onFileContextMenu(e, item.path, item.name, item.type)} draggable onDragStart={e => {
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          e.preventDefault();
          return;
        }
        onDragStart(e, item);
      }} onDragEnd={onDragEnd} onDragOver={e => onDragOver(e, item.path, item.type)} onDragLeave={onDragLeave} onDrop={e => onDrop(e, item.path, item.type)} onMouseEnter={e => onFileMouseEnter(e, item.name, item.path)} onMouseLeave={onFileMouseLeave}>
          {}
          <span className={`folder-arrow ${hasChildren ? '' : 'is-spacer'}`.trim()} aria-hidden={!hasChildren}>
            {hasChildren ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg> : null}
          </span>

          {isDirectory ? isExpanded ? <FolderOpen size={14} /> : <Folder size={14} /> : <FileText size={14} />}
          <span className="file-name">
            {item.name}
          </span>
        </div>

        {canShowChildren && <CollapsibleChildren key={`${item.path}-children`} open={isExpanded} className="file-children collapsible-children" innerClassName="file-children-inner collapsible-children-inner">
            {item.children && item.children.length > 0 ? item.children.map((child: FileItem, index: number) => {
          const isLastChild = index === item.children!.length - 1;
          const hasNextSibling = !isLastChild;
          const childAncestorIndicators = parentHasNextSibling ? [...ancestorHasNextSibling, hasNextSibling] : [...ancestorHasNextSibling];
          return <React.Fragment key={child.path}>
                    {renderFileItem(child, depth + 1, hasNextSibling, childAncestorIndicators)}
                  </React.Fragment>;
        }) : childrenLoaded ? <div className="empty-folder" style={{
        paddingLeft: `${(depth + 1) * TREE_INDENT + TREE_BASE_PAD + 16}px`
      }}>
                <span className="empty-text">空文件夹</span>
              </div> : <div className="empty-folder loading" style={{
        paddingLeft: `${(depth + 1) * TREE_INDENT + TREE_BASE_PAD + 16}px`
      }}>
                <span className="empty-text">加载中...</span>
              </div>}
          </CollapsibleChildren>}
      </div>;
  }, [expandedDirs, loadedDirs, selectedPaths, onToggleDirectory, onFileClick, onFileContextMenu, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onFileMouseEnter, onFileMouseLeave]);
  if (isLoading) {
    return <div className="loading-state">
        <div className="spinning-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
        </div>
        <span>加载中...</span>
      </div>;
  }
  if (files.length === 0) {
    return <div className="empty-state">
        {projectRootPath ? <>
            <div className="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v15H6.5A2.5 2.5 0 0 1 4 14.5v-11A2.5 2.5 0 0 1 6.5 1z" />
              </svg>
            </div>
            <div className="empty-text">此文件夹为空</div>
            <div className="empty-subtext">右键点击空白处创建文件或文件夹</div>
          </> : <>
            <div className="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="empty-text">未选择项目文件夹</div>
            <div className="empty-subtext">点击上方按钮打开文件夹或从Git克隆项目</div>
          </>}
      </div>;
  }
  return <div className="file-tree-container">
      {files.map(file => renderFileItem(file, 0, false, []))}
    </div>;
};
export default FileTree;
