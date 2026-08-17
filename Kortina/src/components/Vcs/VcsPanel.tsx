import React, { useState, useEffect } from 'react';
import { Github, Plus, Minus, GitBranch, GitCommit, GitPullRequest, GitCommitVertical, RefreshCw, Check, X, AlertCircle, FileDiff, Download, GitMerge, Trash2, SquareArrowOutUpRight, RotateCcw } from 'lucide-react';
import { useSCM } from '../../hooks/useSCM';
import type { SCMResource, SCMResourceGroup } from '../../services/scm';
import { VcsDiffViewer } from './VcsDiffViewer';
import './VcsPanel.css';
interface VcsPanelProps {
  projectPath: string | null;
  actionTrigger?: 'commit' | 'push' | 'pull' | null;
  onActionTriggered?: () => void;
  onOpenInWindow?: () => void;
}
export const VcsPanel: React.FC<VcsPanelProps> = ({
  projectPath,
  actionTrigger,
  onActionTriggered,
  onOpenInWindow
}) => {
  const [activeTab, setActiveTab] = useState<'changes' | 'branches'>('changes');
  const [newBranchName, setNewBranchName] = useState('');
  const [showBranchInput, setShowBranchInput] = useState(false);
  const [showCommitInput, setShowCommitInput] = useState(false);
  const [diffFile, setDiffFile] = useState<string | undefined>(undefined);
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const scm = useSCM(projectPath);
  const stagedGroup = scm.repository?.groups.find(g => g.id === 'staged');
  const changesGroup = scm.repository?.groups.find(g => g.id === 'changes');
  const totalChanges = scm.repository?.groups.reduce((sum, g) => sum + g.resources.length, 0) ?? 0;
  useEffect(() => {
    if (!actionTrigger || !scm.repository) return;
    switch (actionTrigger) {
      case 'commit':
        setActiveTab('changes');
        setShowCommitInput(true);
        break;
      case 'push':
        handlePush();
        break;
      case 'pull':
        handlePull();
        break;
    }
    onActionTriggered?.();
  }, [actionTrigger, scm.repository, onActionTriggered]);
  const handleOpenFileDiff = (filePath: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDiffFile(filePath);
    setIsDiffOpen(true);
  };
  const handleStage = async (resource: SCMResource) => {
    await scm.stage([resource.filePath]);
  };
  const handleUnstage = async (resource: SCMResource) => {
    await scm.unstage([resource.filePath]);
  };
  const handleDiscard = async (resource: SCMResource) => {
    if (resource.isStaged) {
      if (!window.confirm(`确定要丢弃 "${resource.filePath}" 的已暂存更改吗？`)) return;
    } else {
      if (!window.confirm(`确定要丢弃 "${resource.filePath}" 的更改吗？此操作不可恢复。`)) return;
    }
    await scm.discard([resource.filePath]);
  };
  const handleStageAll = async (group: SCMResourceGroup) => {
    const paths = group.resources.map(r => r.filePath);
    if (paths.length === 0) return;
    await scm.stage(paths);
  };
  const handleUnstageAll = async (group: SCMResourceGroup) => {
    const paths = group.resources.map(r => r.filePath);
    if (paths.length === 0) return;
    await scm.unstage(paths);
  };
  const handleDiscardAll = async (group: SCMResourceGroup) => {
    const paths = group.resources.map(r => r.filePath);
    if (paths.length === 0) return;
    const message = group.id === 'staged' ? `确定要丢弃 ${paths.length} 个已暂存文件的更改吗？` : `确定要丢弃 ${paths.length} 个文件的更改吗？此操作不可恢复。`;
    if (!window.confirm(message)) return;
    await scm.discard(paths);
  };
  const handleCommit = async () => {
    if (!scm.input?.value.trim()) return;
    await scm.commit();
    setShowCommitInput(false);
  };
  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    await scm.createBranch(newBranchName);
    setNewBranchName('');
    setShowBranchInput(false);
  };
  const handleCheckoutBranch = async (branchName: string) => {
    await scm.checkoutBranch(branchName);
  };
  const handlePush = async () => {
    await scm.push();
  };
  const handlePull = async () => {
    await scm.pull();
  };
  const handleFetch = async () => {
    await scm.fetch();
  };
  const handleMerge = async (branchName: string) => {
    if (window.confirm(`确定要将分支 "${branchName}" 合并到当前分支吗？`)) {
      await scm.merge(branchName);
    }
  };
  const handleDeleteBranch = async (branchName: string, isRemote: boolean) => {
    if (window.confirm(`确定要删除分支 "${branchName}" 吗？`)) {
      await scm.deleteBranch(branchName, isRemote);
    }
  };
  const getStatusIcon = (resource: SCMResource) => {
    switch (resource.status) {
      case 'untracked':
        return <span className="status-icon untracked" title={resource.decorations.tooltip}>U</span>;
      case 'modified':
        return <span className="status-icon modified" title={resource.decorations.tooltip}>M</span>;
      case 'added':
        return <span className="status-icon added" title={resource.decorations.tooltip}>A</span>;
      case 'deleted':
        return <span className="status-icon deleted" title={resource.decorations.tooltip}>D</span>;
      case 'renamed':
        return <span className="status-icon renamed" title={resource.decorations.tooltip}>R</span>;
      case 'copied':
        return <span className="status-icon copied" title={resource.decorations.tooltip}>C</span>;
      case 'conflicted':
        return <span className="status-icon conflicted" title={resource.decorations.tooltip}>!</span>;
      default:
        return <span className="status-icon modified" title={resource.decorations.tooltip}>M</span>;
    }
  };
  const renderResource = (resource: SCMResource) => {
    const fileName = resource.originalFilePath ? `${resource.originalFilePath} → ${resource.filePath}` : resource.filePath;
    return <div key={resource.id} className="change-item" title={resource.decorations.tooltip}>
        <span className={`file-name ${resource.decorations.strikeThrough ? 'strikethrough' : ''} ${resource.decorations.faded ? 'faded' : ''}`}>
          {fileName}
        </span>
        <div className="resource-actions">
          {resource.isStaged ? <button className="resource-action-btn" onClick={() => handleUnstage(resource)} disabled={scm.isLoading} title="取消暂存">
              <Minus size={14} />
            </button> : <button className="resource-action-btn" onClick={() => handleStage(resource)} disabled={scm.isLoading} title="暂存">
              <Plus size={14} />
            </button>}
          <button className="resource-action-btn" onClick={e => handleOpenFileDiff(resource.filePath, e)} title="查看差异">
            <FileDiff size={14} />
          </button>
          <button className="resource-action-btn discard" onClick={() => handleDiscard(resource)} disabled={scm.isLoading} title="丢弃更改">
            <RotateCcw size={14} />
          </button>
        </div>
        {getStatusIcon(resource)}
      </div>;
  };
  const renderGroup = (group: SCMResourceGroup) => {
    if (group.hideWhenEmpty && group.resources.length === 0) return null;
    const canStage = group.id === 'changes' && group.resources.length > 0;
    const canUnstage = group.id === 'staged' && group.resources.length > 0;
    const canDiscard = group.resources.length > 0;
    return <div key={group.id} className="resource-group">
        <div className="resource-group-header">
          <span className="resource-group-title">{group.label}</span>
          <div className="resource-group-actions">
            {canStage && <button className="group-action-btn" onClick={() => handleStageAll(group)} disabled={scm.isLoading} title="全部暂存">
                <Plus size={14} />
              </button>}
            {canUnstage && <button className="group-action-btn" onClick={() => handleUnstageAll(group)} disabled={scm.isLoading} title="全部取消暂存">
                <Minus size={14} />
              </button>}
            {canDiscard && <button className="group-action-btn discard" onClick={() => handleDiscardAll(group)} disabled={scm.isLoading} title="全部丢弃">
                <RotateCcw size={14} />
              </button>}
          </div>
        </div>
        {group.resources.length === 0 ? <div className="no-changes">没有{group.id === 'staged' ? '暂存的' : ''}更改</div> : <div className="changes-list">
            {group.resources.map(renderResource)}
          </div>}
      </div>;
  };
  if (!projectPath) {
    return <div className="vcs-panel">
        <div className="vcs-empty-state">
          <Github size={48} />
          <p>请打开一个项目以使用版本控制功能</p>
        </div>
      </div>;
  }
  if (!scm.repository) {
    return <div className="vcs-panel">
        <div className="vcs-empty-state">
          <RefreshCw size={32} className="spin" />
          <p>正在加载版本控制信息...</p>
        </div>
      </div>;
  }
  if (scm.error && !scm.repository.currentBranch) {
    return <div className="vcs-panel">
        <div className="vcs-header">
          <h3>源代码管理</h3>
          <button className="init-repo-btn" onClick={scm.initRepository} disabled={scm.isLoading}>
            <Github size={16} />
            初始化Git仓库
          </button>
        </div>
        <div className="vcs-empty-state">
          <Github size={48} />
          <p>当前目录不是Git仓库</p>
          <p>点击上方按钮初始化仓库</p>
        </div>
      </div>;
  }
  return <div className="vcs-panel">
      <div className="vcs-header">
        <div className="vcs-tabs">
          <button className={`vcs-tab ${activeTab === 'changes' ? 'active' : ''}`} onClick={() => setActiveTab('changes')}>
            更改
            {totalChanges > 0 && <span className="tab-badge">{totalChanges}</span>}
          </button>
          <button className={`vcs-tab ${activeTab === 'branches' ? 'active' : ''}`} onClick={() => setActiveTab('branches')}>
            分支
          </button>
        </div>
        <div className="vcs-actions">
          <button className="vcs-action-btn" onClick={scm.refresh} disabled={scm.isLoading} title="刷新状态">
            <RefreshCw size={16} />
          </button>
          <button className="vcs-action-btn vcs-fetch-btn" onClick={handleFetch} disabled={scm.isLoading} title="获取 (Fetch)">
            <Download size={16} />
          </button>
          <button className="vcs-action-btn vcs-pull-btn" onClick={handlePull} disabled={scm.isLoading} title="拉取 (Pull)">
            <GitPullRequest size={16} />
          </button>
          <button className="vcs-action-btn vcs-push-btn" onClick={handlePush} disabled={scm.isLoading} title="推送 (Push)">
            <GitCommitVertical size={16} />
          </button>
          {onOpenInWindow && <button className="vcs-action-btn vcs-window-btn" onClick={onOpenInWindow} title="在窗口中打开">
              <SquareArrowOutUpRight size={16} />
            </button>}
        </div>
      </div>

      {activeTab === 'changes' ? <div className="vcs-tab-content">
          {scm.error && <div className="vcs-error">
              <AlertCircle size={16} />
              <span>{scm.error}</span>
            </div>}

          <div className="vcs-branch-info">
            <GitBranch size={16} />
            <span>当前分支: {scm.repository.currentBranch || '未知'}</span>
            <button className="branch-action-btn vcs-branch-btn" onClick={() => setShowBranchInput(!showBranchInput)} title="创建新分支">
              <Plus size={14} />
            </button>
          </div>

          {showBranchInput && <div className="branch-input-container">
              <input type="text" placeholder="新分支名称" value={newBranchName} onChange={e => setNewBranchName(e.target.value)} onKeyDown={e => {
          if (e.key === 'Enter') handleCreateBranch();
          if (e.key === 'Escape') setShowBranchInput(false);
        }} />
              <button onClick={handleCreateBranch} disabled={!newBranchName.trim()}>
                <Check size={14} />
              </button>
              <button onClick={() => setShowBranchInput(false)}>
                <X size={14} />
              </button>
            </div>}

          <div className="vcs-resource-groups">
            {stagedGroup && renderGroup(stagedGroup)}
            {changesGroup && renderGroup(changesGroup)}
          </div>

          <div className="vcs-footer">
            {showCommitInput ? <div className="commit-input-container">
                <textarea placeholder={scm.input?.placeholder || '输入提交消息'} value={scm.input?.value || ''} onChange={e => scm.setInputValue(e.target.value)} onKeyDown={e => {
            if (e.key === 'Enter' && e.ctrlKey) handleCommit();
            if (e.key === 'Escape') setShowCommitInput(false);
          }} />
                <div className="commit-actions">
                  <button onClick={handleCommit} disabled={!scm.input?.value.trim() || scm.isLoading || !scm.hasStagedChanges}>
                    提交 (Ctrl+Enter)
                  </button>
                  <button onClick={() => setShowCommitInput(false)}>
                    取消
                  </button>
                </div>
              </div> : <button className="commit-btn vcs-commit-btn" onClick={() => setShowCommitInput(true)} disabled={!scm.hasStagedChanges}>
                <GitCommit size={16} />
                提交
              </button>}
          </div>
        </div> : <div className="vcs-tab-content">
          <div className="vcs-branch-info">
            <GitBranch size={16} />
            <span>当前分支: {scm.repository.currentBranch || '未知'}</span>
            <button className="branch-action-btn vcs-branch-btn" onClick={() => setShowBranchInput(!showBranchInput)} title="创建新分支">
              <Plus size={14} />
            </button>
          </div>

          {showBranchInput && <div className="branch-input-container">
              <input type="text" placeholder="新分支名称" value={newBranchName} onChange={e => setNewBranchName(e.target.value)} onKeyDown={e => {
          if (e.key === 'Enter') handleCreateBranch();
          if (e.key === 'Escape') setShowBranchInput(false);
        }} />
              <button onClick={handleCreateBranch} disabled={!newBranchName.trim()}>
                <Check size={14} />
              </button>
              <button onClick={() => setShowBranchInput(false)}>
                <X size={14} />
              </button>
            </div>}

          <div className="vcs-branches">
            <div className="vcs-section-title">本地分支</div>
            <div className="branch-list">
              {scm.repository.branches.filter(b => !b.is_remote).map(branch => <div key={branch.name} className={`branch-item ${branch.is_current ? 'current' : ''}`} onClick={() => !branch.is_current && handleCheckoutBranch(branch.name)}>
                  <div className="branch-item-main">
                    <GitBranch size={14} />
                    <span>{branch.name}</span>
                    {branch.is_current && <span className="current-badge">当前</span>}
                  </div>
                  <div className="branch-item-actions">
                    {!branch.is_current && <button className="branch-item-action merge" onClick={e => {
                e.stopPropagation();
                handleMerge(branch.name);
              }} title="合并到当前分支">
                        <GitMerge size={14} />
                      </button>}
                    {!branch.is_current && <button className="branch-item-action delete" onClick={e => {
                e.stopPropagation();
                handleDeleteBranch(branch.name, false);
              }} title="删除分支">
                        <Trash2 size={14} />
                      </button>}
                  </div>
                </div>)}
            </div>

            {scm.repository.branches.some(b => b.is_remote) && <>
                <div className="vcs-section-title" style={{
            marginTop: '16px'
          }}>远程分支</div>
                <div className="branch-list">
                  {scm.repository.branches.filter(b => b.is_remote).map(branch => <div key={branch.name} className="branch-item remote" onClick={() => handleCheckoutBranch(branch.name)}>
                      <div className="branch-item-main">
                        <GitBranch size={14} />
                        <span>{branch.name}</span>
                      </div>
                      <div className="branch-item-actions">
                        <button className="branch-item-action delete" onClick={e => {
                  e.stopPropagation();
                  handleDeleteBranch(branch.name, true);
                }} title="删除远程分支">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>)}
                </div>
              </>}
          </div>
        </div>}

      <VcsDiffViewer projectPath={projectPath} filePath={diffFile} isOpen={isDiffOpen} onClose={() => setIsDiffOpen(false)} />
    </div>;
};