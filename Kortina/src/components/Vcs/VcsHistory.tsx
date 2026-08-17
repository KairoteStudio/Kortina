import React, { useState, useEffect } from 'react';
import { GitCommit } from 'lucide-react';
import { useVcs } from '../../hooks/useVcs';
import './VcsHistory.css';
interface VcsHistoryProps {
  projectPath: string | null;
  onViewCommitDiff?: (commitHash: string, commitMessage: string) => void;
}
export const VcsHistory: React.FC<VcsHistoryProps> = ({
  projectPath,
  onViewCommitDiff
}) => {
  const [limit, setLimit] = useState(50);
  const vcs = useVcs(projectPath);
  useEffect(() => {
    if (vcs.isRepository && projectPath) {
      vcs.refreshCommits(limit);
    }
  }, [vcs.isRepository, projectPath, limit]);
  const loadMore = () => {
    setLimit(prev => prev + 50);
  };
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return { time, date: dateStr };
  };
  const handleCommitClick = (commit: any) => {
    if (onViewCommitDiff) {
      onViewCommitDiff(commit.hash, commit.message.split('\n')[0]);
    }
  };
  if (!projectPath) {
    return <div className="vcs-history">
        <div className="vcs-empty-state">
          <GitCommit size={48} />
          <p>请打开一个项目以查看提交历史</p>
        </div>
      </div>;
  }
  if (!vcs.isRepository) {
    return <div className="vcs-history">
        <div className="vcs-empty-state">
          <GitCommit size={48} />
          <p>当前目录不是Git仓库</p>
        </div>
      </div>;
  }
  return <div className="vcs-history">
      <div className="vcs-history-header">
        <h3>提交历史</h3>
        <button className="refresh-btn" onClick={() => vcs.refreshCommits(limit)} disabled={vcs.isLoading}>
          刷新
        </button>
      </div>

      {vcs.error && <div className="vcs-error">
          <span>{vcs.error}</span>
        </div>}

      {vcs.commits.length === 0 && !vcs.isLoading ? <div className="vcs-empty-state">
          <GitCommit size={48} />
          <p>没有提交记录</p>
        </div> : <div className="commits-timeline">
          {vcs.commits.map((commit, index) => <div key={commit.hash} className="commit-card" onClick={() => handleCommitClick(commit)}>
              <div className="timeline-connector">
                <div className="timeline-dot" />
                {index < vcs.commits.length - 1 && <div className="timeline-line" />}
              </div>
              <div className="commit-content">
                <div className="commit-title">{commit.message.split('\n')[0]}</div>
                <div className="commit-meta">
                  <span>{commit.author}, 
                  {formatDateTime(commit.date).time}, 
                  {formatDateTime(commit.date).date}</span>
                </div>
              </div>
            </div>)}

          {vcs.commits.length >= limit && <div className="load-more-container">
              <button className="load-more-btn" onClick={loadMore} disabled={vcs.isLoading}>
                加载更多
              </button>
            </div>}
        </div>}
    </div>;
};
