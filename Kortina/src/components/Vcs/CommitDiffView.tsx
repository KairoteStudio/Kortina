import React, { useState, useMemo, memo, useCallback } from 'react';
import { ChevronRight, ChevronDown, FileText } from 'lucide-react';
import { GitDiff } from '../../services/vcs';
import DiffContextMenu from '../Core/DiffContextMenu';
import { useUISettingsStore } from '../../stores/UISettingsStore';
import './CommitDiffView.css';
interface CommitDiffViewProps {
  diffs: GitDiff[];
  commitHash: string;
  commitMessage: string;
}
interface FileDiffItemProps {
  diff: GitDiff;
}
const DiffLine = memo(({ line }: { line: string; side: 'before' | 'after' }) => {
  const isRemoved = line.startsWith('-');
  const isAdded = line.startsWith('+');
  const isContext = !isRemoved && !isAdded;
  const className = `diff-line ${isRemoved ? 'line-removed' : isAdded ? 'line-added' : 'line-context'}`;
  const content = isRemoved || isAdded ? line.slice(1) : line;
  return <div className={className}>
      <span className="line-marker">{isContext ? '·' : isRemoved ? '-' : '+'}</span>
      <span className="line-content">{content}</span>
    </div>;
});
DiffLine.displayName = 'DiffLine';

const FileDiffItem: React.FC<FileDiffItemProps> = memo(({ diff }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const fleetLayout = useUISettingsStore(state => state.fleetLayout);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const {
    addedCount,
    removedCount,
    fileName,
    allLines
  } = useMemo(() => {
    let added = 0;
    let removed = 0;
    const lines: string[] = [];
    for (const hunk of diff.hunks) {
      for (const line of hunk.lines) {
        if (line.startsWith('+')) added++;
        if (line.startsWith('-')) removed++;
        lines.push(line);
      }
    }
    return {
      addedCount: added,
      removedCount: removed,
      fileName: diff.file_path.split('/').pop(),
      allLines: lines
    };
  }, [diff.hunks, diff.file_path]);

  const expandedContent = useMemo(() => {
    const beforeLines = allLines.filter(l => !l.startsWith('+'));
    const afterLines = allLines.filter(l => !l.startsWith('-'));
    return (
      <div className="file-diff-content" onContextMenu={handleContextMenu}>
        <div className="diff-side-by-side">
          <div className="diff-side diff-before">
            <div className="hunk-lines">
              {beforeLines.map((line, index) => <DiffLine key={index} line={line} side="before" />)}
            </div>
          </div>
          <div className="diff-side diff-after">
            <div className="hunk-lines">
              {afterLines.map((line, index) => <DiffLine key={index} line={line} side="after" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }, [allLines, handleContextMenu]);

  return (
    <div className={`file-diff-item ${isExpanded ? 'expanded' : ''}`}>
      <div className="file-diff-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="file-diff-icon">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <FileText size={14} className="file-icon" />
        <span className="file-diff-name">{fileName}</span>
        <span className="file-diff-stats">
          {addedCount > 0 && <span className="stat-added">+{addedCount}</span>}
          {removedCount > 0 && <span className="stat-removed">-{removedCount}</span>}
        </span>
      </div>
      {isExpanded && expandedContent}
      <DiffContextMenu
        isVisible={contextMenu !== null}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        onClose={() => setContextMenu(null)}
        isFleetUI={fleetLayout}
      />
    </div>
  );
});
FileDiffItem.displayName = 'FileDiffItem';
export const CommitDiffView: React.FC<CommitDiffViewProps> = ({
  diffs,
  commitHash,
  commitMessage
}) => {
  if (diffs.length === 0) {
    return <div className="commit-diff-view">
        <div className="commit-info">
          <h3>{commitMessage}</h3>
          <span className="commit-hash">{commitHash.substring(0, 7)}</span>
        </div>
        <div className="empty-diff">
          <p>没有文件变更</p>
        </div>
      </div>;
  }
  return <div className="commit-diff-view">
      <div className="commit-info">
        <h3>{commitMessage}</h3>
        <span className="commit-hash">{commitHash.substring(0, 7)}</span>
      </div>
      <div className="files-list">
        {diffs.map((diff, index) => <FileDiffItem key={index} diff={diff} />)}
      </div>
    </div>;
};
export default CommitDiffView;