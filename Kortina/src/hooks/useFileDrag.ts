import { useState, useCallback } from 'react';
import { FileItem } from '../utils/fileSystem';
export interface DragState {
  isDragging: boolean;
  draggedItem: FileItem | null;
  dragOverPath: string | null;
}
export const useFileDrag = () => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    dragOverPath: null
  });
  const handleDragStart = useCallback((e: React.DragEvent, item: FileItem) => {
    setDragState({
      isDragging: true,
      draggedItem: item,
      dragOverPath: null
    });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({
      path: item.path,
      name: item.name,
      type: item.type
    }));
  }, []);
  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedItem: null,
      dragOverPath: null
    });
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent, path: string, type: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (type === 'directory') {
      setDragState(prev => ({
        ...prev,
        dragOverPath: path
      }));
    }
  }, []);
  const handleDragLeave = useCallback(() => {
    setDragState(prev => ({
      ...prev,
      dragOverPath: null
    }));
  }, []);
  const handleDrop = useCallback((e: React.DragEvent, targetPath: string, targetType: string, insertPosition: 'inside' | 'before' | 'after' = 'inside') => {
    e.preventDefault();
    setDragState({
      isDragging: false,
      draggedItem: null,
      dragOverPath: null
    });
    if (targetType !== 'directory') {
      return;
    }
    try {
      const data = e.dataTransfer.getData('text/plain');
      if (!data) return;
      const draggedData = JSON.parse(data);
      if (draggedData.path === targetPath || draggedData.path.startsWith(targetPath + '/')) {
        return;
      }
      return {
        sourcePath: draggedData.path,
        sourceName: draggedData.name,
        sourceType: draggedData.type,
        targetPath,
        insertPosition
      };
    } catch (error) {
      console.error('处理拖拽失败:', error);
    }
    return null;
  }, []);
  return {
    dragState,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
};