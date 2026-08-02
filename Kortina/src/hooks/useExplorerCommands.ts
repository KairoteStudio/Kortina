import { useCallback } from 'react';
import { isExplorerFocused } from '../utils/focus';
import type { ProjectExplorerRef } from '../components/ProjectExplorer';
export interface UseExplorerCommandsOptions {
  projectExplorerRef: React.RefObject<ProjectExplorerRef | null>;
}
export const useExplorerCommands = ({
  projectExplorerRef
}: UseExplorerCommandsOptions) => {
  const handleExplorerNewFile = useCallback(() => {
    projectExplorerRef.current?.newFile();
  }, [projectExplorerRef]);
  const handleExplorerNewFolder = useCallback(() => {
    projectExplorerRef.current?.newFolder();
  }, [projectExplorerRef]);
  const handleExplorerDelete = useCallback(() => {
    if (!isExplorerFocused()) return;
    projectExplorerRef.current?.deleteSelected();
  }, [projectExplorerRef]);
  return {
    handleExplorerNewFile,
    handleExplorerNewFolder,
    handleExplorerDelete
  };
};