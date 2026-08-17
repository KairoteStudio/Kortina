import React from 'react';
import { Plus, RefreshCw, FolderOpen, GitBranch, Search, Eye } from 'lucide-react';
import type { FileItem } from '../../utils/fileSystem';
interface ProjectActionsProps {
  projectRootPath: string;
  files: FileItem[];
  isLoading: boolean;
  isWatching?: boolean;
  onNewFile: () => void;
  onRefresh: () => void;
  onOpenFolder: () => void;
  onGitClone: () => void;
  onShowCloneHistory: () => void;
  onShowSearch?: () => void;
}
const ProjectActions: React.FC<ProjectActionsProps> = ({
  projectRootPath,
  files,
  isLoading,
  isWatching = false,
  onNewFile,
  onRefresh,
  onOpenFolder,
  onGitClone,
  onShowCloneHistory,
  onShowSearch
}) => {
  return <div className="panel-header">
      <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }}>
        <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
          <span style={{
          fontWeight: 600
        }}>{'项目浏览器'}</span>
        </div>
        <div style={{
        display: 'flex',
        gap: '6px',
        alignItems: 'center'
      }}>
          <div style={{
          display: 'flex',
          gap: '4px'
        }}>
            <button className="menu-button" onClick={onNewFile} title="新建文件" disabled={isLoading} style={{
            padding: '8px'
          }}>
              <Plus size={14} />
            </button>
            <button className="menu-button" onClick={onRefresh} title="刷新" disabled={isLoading} style={{
            padding: '8px'
          }}>
              <RefreshCw size={14} />
            </button>
            {projectRootPath && <button className="menu-button" onClick={onShowSearch} title="搜索文件" disabled={isLoading} style={{
            padding: '8px'
          }}>
                <Search size={14} />
              </button>}
            {isWatching && <button className="menu-button" title="文件系统监听已启用" disabled={true} style={{
            color: 'var(--text-primary)',
            padding: '8px'
          }}>
                <Eye size={14} />
              </button>}
          </div>
        </div>
      </div>

      {}
      {!projectRootPath && files.length === 0 && <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      padding: '0 6px'
    }}>
          <button className="context-menu-item" onClick={onOpenFolder} disabled={isLoading} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '10px 16px',
        margin: '0',
        border: 'none',
        borderRadius: '6px',
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        fontSize: '13px',
        textAlign: 'left'
      }}>
            <FolderOpen size={16} />
            打开文件夹
          </button>
          <button className="context-menu-item" onClick={onGitClone} disabled={isLoading} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '10px 16px',
        margin: '0',
        border: 'none',
        borderRadius: '6px',
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        fontSize: '13px',
        textAlign: 'left'
      }}>
            <GitBranch size={16} />
            从Git克隆
          </button>
          <button className="context-menu-item" onClick={onShowCloneHistory} disabled={isLoading} style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '10px 16px',
        margin: '0',
        border: 'none',
        borderRadius: '6px',
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        fontSize: '13px',
        textAlign: 'left'
      }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            克隆历史
          </button>
        </div>}
    </div>;
};
export default ProjectActions;