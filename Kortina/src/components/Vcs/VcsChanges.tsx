import React from 'react';
import { GitStatus } from '../../services/vcs';
import { FileDiff, Check } from 'lucide-react';
interface VcsChangesProps {
  status: GitStatus[];
  selectedFiles: Set<string>;
  onFileSelect: (file_path: string) => void;
  onOpenFileDiff: (file_path: string, e: React.MouseEvent) => void;
  onOpenAllDiffs: () => void;
  onAddFiles: () => void;
  onSelectAll: () => void;
  isLoading: boolean;
}
export const VcsChanges: React.FC<VcsChangesProps> = ({
  status,
  selectedFiles,
  onFileSelect,
  onOpenFileDiff,
  onOpenAllDiffs,
  onAddFiles,
  onSelectAll,
  isLoading
}) => {
  const getStatusIcon = (status: GitStatus) => {
    if (status.worktree_status === '??') {
      return <div className="status-icon untracked" title="未跟踪">?</div>;
    } else if (status.worktree_status === 'M' || status.index_status === 'M') {
      return <div className="status-icon modified" title="已修改">M</div>;
    } else if (status.worktree_status === 'A' || status.index_status === 'A') {
      return <div className="status-icon added" title="已添加">A</div>;
    } else if (status.worktree_status === 'D' || status.index_status === 'D') {
      return <div className="status-icon deleted" title="已删除">D</div>;
    } else if (status.is_staged) {
      return <div className="status-icon staged" title="已暂存">✓</div>;
    }
    return null;
  };
  return <div className="vcs-changes">
      <div className="vcs-section-title">
        <span>更改</span>
        <div className="changes-actions">
          <button className="vcs-action-btn" onClick={onOpenAllDiffs} title="查看所有更改">
            <FileDiff size={14} />
          </button>
          {selectedFiles.size > 0 && <button className="add-files-btn" onClick={onAddFiles} disabled={isLoading}>
              暂存所选 ({selectedFiles.size})
            </button>}
          {status.length > 0 && <button className="select-all-btn" onClick={onSelectAll}>
              {selectedFiles.size === status.length ? '取消全选' : '全选'}
            </button>}
        </div>
      </div>

      {status.length === 0 ? <div className="no-changes">
          <p>没有更改</p>
        </div> : <div className="changes-list">
          {status.map(statusItem => <div key={statusItem.file_path} className={`change-item ${selectedFiles.has(statusItem.file_path) ? 'selected' : ''}`} onClick={() => onFileSelect(statusItem.file_path)}>
              <div className="change-checkbox">
                {selectedFiles.has(statusItem.file_path) && <Check size={14} />}
              </div>
              {getStatusIcon(statusItem)}
              <span className="file-name">{statusItem.file_path}</span>
              <button className="file-diff-btn" onClick={e => onOpenFileDiff(statusItem.file_path, e)} title="查看差异">
                <FileDiff size={14} />
              </button>
            </div>)}
        </div>}
    </div>;
};