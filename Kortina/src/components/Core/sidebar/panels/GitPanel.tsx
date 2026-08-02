import React from 'react';
import { VcsPanel } from '../../../Vcs/VcsPanel';
import { useUISettingsStore } from '../../../../stores';
import { isTauri } from '../../../../utils/environment';
import './PanelStyles.css';
interface GitPanelProps {
  projectPath: string | null;
  actionTrigger?: 'commit' | 'push' | 'pull' | null;
  onActionTriggered?: () => void;
}
export const GitPanel: React.FC<GitPanelProps> = ({
  projectPath,
  actionTrigger,
  onActionTriggered
}) => {
  const {
    theme
  } = useUISettingsStore();
  const handleOpenInWindow = async () => {
    if (!isTauri()) {
      alert('窗口模式仅在桌面应用中可用');
      return;
    }
    try {
      const {
        invoke
      } = await import('@tauri-apps/api/core');
      await invoke('launch_vcs_panel', {
        theme,
        projectPath
      });
    } catch (error) {
      console.error('打开 VCS 窗口失败:', error);
    }
  };
  return <VcsPanel projectPath={projectPath} actionTrigger={actionTrigger} onActionTriggered={onActionTriggered} onOpenInWindow={handleOpenInWindow} />;
};
export default GitPanel;