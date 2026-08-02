import { useCallback } from 'react';
import { isExplorerFocused } from '../utils/focus';
import type { ProjectExplorerRef } from '../components/ProjectExplorer';
export interface UseEditorCommandsOptions {
  projectExplorerRef: React.RefObject<ProjectExplorerRef | null>;
  actions: {
    handleCopy: () => void;
    handleCut: () => void;
    handlePaste: () => void;
    handleRenameSymbol: () => void;
    handleRun: () => void;
  };
}
export const useEditorCommands = ({
  projectExplorerRef,
  actions
}: UseEditorCommandsOptions) => {
  const handleCopy = useCallback(() => {
    if (isExplorerFocused()) {
      projectExplorerRef.current?.copySelected();
      return;
    }
    actions.handleCopy();
  }, [projectExplorerRef, actions]);
  const handleCut = useCallback(() => {
    if (isExplorerFocused()) {
      projectExplorerRef.current?.cutSelected();
      return;
    }
    actions.handleCut();
  }, [projectExplorerRef, actions]);
  const handlePaste = useCallback(() => {
    if (isExplorerFocused()) {
      projectExplorerRef.current?.pasteToSelected();
      return;
    }
    actions.handlePaste();
  }, [projectExplorerRef, actions]);
  const handleRename = useCallback(() => {
    if (isExplorerFocused()) {
      projectExplorerRef.current?.renameSelected();
      return;
    }
    actions.handleRenameSymbol();
  }, [projectExplorerRef, actions]);
  const handleRun = useCallback(() => {
    if (isExplorerFocused()) {
      void projectExplorerRef.current?.refresh();
      return;
    }
    actions.handleRun();
  }, [projectExplorerRef, actions]);
  return {
    handleCopy,
    handleCut,
    handlePaste,
    handleRename,
    handleRun
  };
};