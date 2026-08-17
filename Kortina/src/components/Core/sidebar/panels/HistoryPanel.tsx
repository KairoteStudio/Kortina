import React from 'react';
import { VcsHistory } from '../../../Vcs/VcsHistory';
import './PanelStyles.css';
interface HistoryPanelProps {
  projectPath: string | null;
  onViewCommitDiff?: (commitHash: string, commitMessage: string) => void;
}
export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  projectPath,
  onViewCommitDiff
}) => {
  return <div className="sidebar-panel">
      <div className="panel-header">
        <span className="panel-title">提交历史</span>
      </div>
      <div className="panel-content">
        <VcsHistory projectPath={projectPath} onViewCommitDiff={onViewCommitDiff} />
      </div>
    </div>;
};
export default HistoryPanel;
