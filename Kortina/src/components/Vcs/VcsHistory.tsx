import React, { useState, useEffect } from 'react';
import { GitCommit, Calendar, User, Hash, ChevronDown, ChevronRight } from 'lucide-react';
import { useVcs } from '../../hooks/useVcs';
import './VcsHistory.css';
interface VcsHistoryProps {
  projectPath: string | null;
}
export const VcsHistory: React.FC<VcsHistoryProps> = ({
  projectPath
}) => {
  const [expandedCommits, setExpandedCommits] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(50);
  const vcs = useVcs(projectPath);
  useEffect(() => {
    if (vcs.isRepository && projectPath) {
      vcs.refreshCommits(limit);
    }
  }, [vcs.isRepository, projectPath, limit]);
  const toggleCommitExpansion = (commitHash: string) => {
    const newExpanded = new Set(expandedCommits);
    if (newExpanded.has(commitHash)) {
      newExpanded.delete(commitHash);
    } else {
      newExpanded.add(commitHash);
    }
    setExpandedCommits(newExpanded);
  };
  const loadMore = () => {
    setLimit(prev => prev + 50);
  };
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return '今天';
    } else if (diffDays === 1) {
      return '昨天';
    } else if (diffDays < 7) {
      return `${diffDays} 天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
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
        </div> : <div className="commits-container">
          {vcs.commits.map(commit => <div key={commit.hash} className="commit-item">
              <div className="commit-header" onClick={() => toggleCommitExpansion(commit.hash)}>
                <div className="commit-toggle">
                  {expandedCommits.has(commit.hash) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>

                <div className="commit-info">
                  <div className="commit-title">{commit.message.split('\n')[0]}</div>
                  <div className="commit-meta">
                    <div className="commit-author">
                      <User size={12} />
                      <span>{commit.author}</span>
                    </div>
                    <div className="commit-date">
                      <Calendar size={12} />
                      <span>{formatDate(commit.date)}</span>
                    </div>
                    <div className="commit-hash">
                      <Hash size={12} />
                      <span>{commit.short_hash}</span>
                    </div>
                  </div>
                </div>
              </div>

              {expandedCommits.has(commit.hash) && <div className="commit-details">
                  <div className="commit-full-message">
                    {commit.message.split('\n').slice(1).map((line, index) => <div key={index} className="commit-message-line">{line}</div>)}
                  </div>
                  <div className="commit-full-hash">
                    <span>完整哈希: {commit.hash}</span>
                  </div>
                  <div className="commit-actions">
                    <button className="commit-action-btn">
                      查看更改
                    </button>
                    <button className="commit-action-btn">
                      创建分支
                    </button>
                    <button className="commit-action-btn">
                      检出此提交
                    </button>
                  </div>
                </div>}
            </div>)}

          {vcs.commits.length >= limit && <div className="load-more-container">
              <button className="load-more-btn" onClick={loadMore} disabled={vcs.isLoading}>
                加载更多
              </button>
            </div>}
        </div>}
    </div>;
};