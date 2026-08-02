import React, { useState, useEffect } from 'react';
import { GitCompare, FileText, X, ChevronDown, ChevronRight } from 'lucide-react';
import { VcsService, GitDiff, DiffHunk } from '../../services/vcs';
import './VcsDiffViewer.css';
interface VcsDiffViewerProps {
  projectPath: string | null;
  filePath?: string;
  isOpen: boolean;
  onClose: () => void;
}
export const VcsDiffViewer: React.FC<VcsDiffViewerProps> = ({
  projectPath,
  filePath,
  isOpen,
  onClose
}) => {
  const [diffs, setDiffs] = useState<GitDiff[]>([]);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (isOpen && projectPath) {
      loadDiff();
    }
  }, [isOpen, projectPath, filePath]);
  const loadDiff = async () => {
    if (!projectPath) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await VcsService.getDiff(projectPath, filePath);
      setDiffs(result);
      if (result.length === 1 || filePath) {
        setExpandedFiles(new Set(result.map(d => d.file_path)));
      }
    } catch (err) {
      setError(`获取差异失败: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };
  const toggleFileExpansion = (filePath: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filePath)) {
      newExpanded.delete(filePath);
    } else {
      newExpanded.add(filePath);
    }
    setExpandedFiles(newExpanded);
  };
  const renderHunk = (hunk: DiffHunk, hunkIndex: number) => {
    return <div key={hunkIndex} className="diff-hunk">
        <div className="diff-hunk-header">
          @@ -{hunk.old_start},{hunk.old_lines} +{hunk.new_start},{hunk.new_lines} @@
        </div>
        {hunk.lines.map((line, lineIndex) => {
        const lineType = line[0] === '+' ? 'added' : line[0] === '-' ? 'removed' : 'context';
        const lineNumber = lineType === 'added' ? hunk.new_start + lineIndex : hunk.old_start + lineIndex;
        return <div key={lineIndex} className={`diff-line ${lineType}`}>
              <div className="diff-line-number">
                {lineType === 'added' ? '' : lineNumber}
              </div>
              <div className="diff-line-number new">
                {lineType === 'removed' ? '' : lineNumber}
              </div>
              <div className="diff-line-content">{line.substring(1)}</div>
            </div>;
      })}
      </div>;
  };
  if (!isOpen) return null;
  return <div className="diff-viewer-overlay">
      <div className="diff-viewer-container">
        <div className="diff-viewer-header">
          <div className="diff-viewer-title">
            <GitCompare size={18} />
            <span>
              {filePath ? `差异: ${filePath}` : '工作区差异'}
            </span>
          </div>
          <button className="diff-viewer-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="diff-viewer-content">
          {isLoading ? <div className="diff-loading">
              <div className="loading-spinner"></div>
              <p>加载差异中...</p>
            </div> : error ? <div className="diff-error">
              <p>{error}</p>
            </div> : diffs.length === 0 ? <div className="diff-empty">
              <GitCompare size={48} />
              <p>没有差异</p>
            </div> : <div className="diff-files">
              {diffs.map(diff => <div key={diff.file_path} className="diff-file">
                  <div className="diff-file-header" onClick={() => toggleFileExpansion(diff.file_path)}>
                    <div className="diff-file-toggle">
                      {expandedFiles.has(diff.file_path) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                    <FileText size={16} />
                    <span className="diff-file-name">{diff.file_path}</span>
                    <span className="diff-file-stats">
                      {diff.hunks.reduce((acc, hunk) => acc + hunk.lines.filter(l => l.startsWith('+')).length, 0)} 添加,{' '}
                      {diff.hunks.reduce((acc, hunk) => acc + hunk.lines.filter(l => l.startsWith('-')).length, 0)} 删除
                    </span>
                  </div>

                  {expandedFiles.has(diff.file_path) && <div className="diff-file-content">
                      {diff.hunks.map((hunk, hunkIndex) => renderHunk(hunk, hunkIndex))}
                    </div>}
                </div>)}
            </div>}
        </div>
      </div>
    </div>;
};