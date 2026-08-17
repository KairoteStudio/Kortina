import { useState, useCallback } from 'react';

export interface ContextMenuState {
  x: number;
  y: number;
  filePath: string;
  fileName: string;
  fileType: string;
}

export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  
  const openContextMenu = useCallback((
    e: React.MouseEvent,
    filePath: string,
    fileName: string,
    fileType: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    
    try {
      const el = e.currentTarget as HTMLElement | null;
      if (el?.setAttribute) {
        el.setAttribute('data-menu-id', 'project-explorer-menu');
      }
    } catch {
      
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      filePath,
      fileName,
      fileType,
    });
  }, []);

  
  const openBlankContextMenu = useCallback((e: React.MouseEvent, projectRootPath: string) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest?.('.dialog-backdrop, .dialog-container, .context-menu, .file-search, .file-preview')) {
      return;
    }
    if (target?.closest?.('.file-item')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    try {
      const el = e.currentTarget as HTMLElement | null;
      if (el?.setAttribute) {
        el.setAttribute('data-menu-id', 'project-explorer-menu');
      }
    } catch {
      
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      filePath: projectRootPath,
      fileName: '',
      fileType: 'blank',
    });
  }, []);

  
  const closeContextMenu = useCallback(() => {
    try {
      const trigger = document.querySelector('[data-menu-id="project-explorer-menu"]');
      if (trigger?.removeAttribute) {
        trigger.removeAttribute('data-menu-id');
      }
    } catch {
      
    }
    setContextMenu(null);
  }, []);

  return {
    contextMenu,
    openContextMenu,
    openBlankContextMenu,
    closeContextMenu,
  };
}
