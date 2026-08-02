import React from 'react';
import { GitBranch, GitMerge, Trash2 } from 'lucide-react';
import { GitBranch as Branch } from '../../services/vcs';
interface VcsBranchesProps {
  branches: Branch[];
  onCheckoutBranch: (branchName: string) => void;
  onMerge: (branchName: string) => void;
  onDeleteBranch: (branchName: string, isRemote: boolean) => void;
}
export const VcsBranches: React.FC<VcsBranchesProps> = ({
  branches,
  onCheckoutBranch,
  onMerge,
  onDeleteBranch
}) => {
  const localBranches = branches.filter(b => !b.is_remote);
  const remoteBranches = branches.filter(b => b.is_remote);
  return <div className="vcs-branches">
      <div className="vcs-section-title">本地分支</div>
      <div className="branch-list">
        {localBranches.map(branch => <div key={branch.name} className={`branch-item ${branch.is_current ? 'current' : ''}`} onClick={() => !branch.is_current && onCheckoutBranch(branch.name)}>
            <div className="branch-item-main">
              <GitBranch size={14} />
              <span>{branch.name}</span>
              {branch.is_current && <span className="current-badge">当前</span>}
            </div>
            <div className="branch-item-actions">
              {!branch.is_current && <button className="branch-item-action merge" onClick={e => {
            e.stopPropagation();
            onMerge(branch.name);
          }} title="合并到当前分支">
                  <GitMerge size={14} />
                </button>}
              {!branch.is_current && <button className="branch-item-action delete" onClick={e => {
            e.stopPropagation();
            onDeleteBranch(branch.name, false);
          }} title="删除分支">
                  <Trash2 size={14} />
                </button>}
            </div>
          </div>)}
      </div>

      {remoteBranches.length > 0 && <>
          <div className="vcs-section-title" style={{
        marginTop: '16px'
      }}>远程分支</div>
          <div className="branch-list">
            {remoteBranches.map(branch => <div key={branch.name} className="branch-item remote" onClick={() => onCheckoutBranch(branch.name)}>
                <div className="branch-item-main">
                  <GitBranch size={14} />
                  <span>{branch.name}</span>
                </div>
                <div className="branch-item-actions">
                  <button className="branch-item-action delete" onClick={e => {
              e.stopPropagation();
              onDeleteBranch(branch.name, true);
            }} title="删除远程分支">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>)}
          </div>
        </>}
    </div>;
};