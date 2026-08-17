import { useState, useCallback, useMemo } from 'react';
import type { FileItem } from '../utils/fileSystem';

export interface SelectedItem {
  filePath: string;
  fileName: string;
  fileType: string;
}

export function useFileSelection() {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [selectionAnchorPath, setSelectionAnchorPath] = useState<string | null>(null);

  const selectedPaths = useMemo(
    () => new Set(selectedItems.map(item => item.filePath)),
    [selectedItems]
  );

  const primarySelectedItem = selectedItems.length > 0
    ? selectedItems[selectedItems.length - 1]
    : null;

  
  const handleFileSelect = useCallback((
    file: FileItem,
    event?: React.MouseEvent,
    visibleItems?: FileItem[]
  ) => {
    const item: SelectedItem = {
      filePath: file.path,
      fileName: file.name,
      fileType: file.type,
    };

    const ctrl = !!(event && (event.ctrlKey || event.metaKey));
    const shift = !!(event && event.shiftKey);

    
    if (ctrl && !shift) {
      setSelectedItems(prev => {
        const exists = prev.some(x => x.filePath === file.path);
        if (exists) {
          return prev.filter(x => x.filePath !== file.path);
        }
        return [...prev, item];
      });
      setSelectionAnchorPath(file.path);
      return;
    }

    
    if (shift && visibleItems) {
      const anchorPath = selectionAnchorPath ?? primarySelectedItem?.filePath ?? file.path;
      const start = visibleItems.findIndex(x => x.path === anchorPath);
      const end = visibleItems.findIndex(x => x.path === file.path);

      if (start >= 0 && end >= 0) {
        const from = Math.min(start, end);
        const to = Math.max(start, end);
        setSelectedItems(visibleItems.slice(from, to + 1).map(x => ({
          filePath: x.path,
          fileName: x.name,
          fileType: x.type,
        })));
      } else {
        setSelectedItems([item]);
        setSelectionAnchorPath(file.path);
      }
      return;
    }

    
    setSelectedItems([item]);
    setSelectionAnchorPath(file.path);
  }, [selectionAnchorPath, primarySelectedItem]);

  
  const clearSelection = useCallback(() => {
    setSelectedItems([]);
    setSelectionAnchorPath(null);
  }, []);

  
  const updateSelectionAfterRename = useCallback((oldPath: string, newName: string, fileType: string) => {
    const newPath = oldPath.replace(/[^/]+$/, newName);
    setSelectedItems([{
      filePath: newPath,
      fileName: newName,
      fileType,
    }]);
    setSelectionAnchorPath(newPath);
  }, []);

  
  const clearSelectionAfterDelete = useCallback(() => {
    setSelectedItems([]);
    setSelectionAnchorPath(null);
  }, []);

  
  const setContextSelection = useCallback((path: string, name: string, type: string) => {
    setSelectedItems(prev => {
      if (prev.some(x => x.filePath === path)) return prev;
      return [{ filePath: path, fileName: name, fileType: type }];
    });
    setSelectionAnchorPath(path);
  }, []);

  return {
    selectedItems,
    selectedPaths,
    primarySelectedItem,
    selectionAnchorPath,
    handleFileSelect,
    clearSelection,
    updateSelectionAfterRename,
    clearSelectionAfterDelete,
    setContextSelection,
  };
}
