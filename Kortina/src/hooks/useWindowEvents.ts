import { useCallback, useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import { useUISettingsStore } from '../stores';
export interface UseWindowEventsOptions {
  isDraggingExplorer: boolean;
  setIsDraggingExplorer: (v: boolean) => void;
  isDraggingConsole: boolean;
  setIsDraggingConsole: (v: boolean) => void;
}
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const visualToLayout = (visualSize: number, el: HTMLElement, axis: 'x' | 'y') => {
  const rect = el.getBoundingClientRect();
  const layoutSize = axis === 'x' ? el.offsetWidth : el.offsetHeight;
  const visualRectSize = axis === 'x' ? rect.width : rect.height;
  if (!layoutSize || !visualRectSize) return visualSize;
  return visualSize * (layoutSize / visualRectSize);
};
export const useWindowEvents = ({
  isDraggingExplorer,
  setIsDraggingExplorer,
  isDraggingConsole,
  setIsDraggingConsole
}: UseWindowEventsOptions) => {
  const {
    setExplorerWidth,
    setConsoleHeight
  } = useUISettingsStore();
  const explorerOffsetXRef = useRef(0);
  const consoleOffsetYRef = useRef(0);
  const consoleBottomRef = useRef(0);
  const beginExplorerResize = useCallback((e: ReactMouseEvent | MouseEvent) => {
    e.preventDefault();
    const panel = document.querySelector('.project-explorer-wrapper') as HTMLElement | null;
    if (panel) {
      const rect = panel.getBoundingClientRect();
      explorerOffsetXRef.current = e.clientX - rect.right;
    } else {
      explorerOffsetXRef.current = 0;
    }
    setIsDraggingExplorer(true);
  }, [setIsDraggingExplorer]);
  const beginConsoleResize = useCallback((e: ReactMouseEvent | MouseEvent) => {
    e.preventDefault();
    const panel = document.querySelector('.console-panel-wrapper') as HTMLElement | null;
    if (panel) {
      const rect = panel.getBoundingClientRect();
      consoleOffsetYRef.current = e.clientY - rect.top;
      consoleBottomRef.current = rect.bottom;
    } else {
      consoleOffsetYRef.current = 0;
      consoleBottomRef.current = 0;
    }
    setIsDraggingConsole(true);
  }, [setIsDraggingConsole]);
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingExplorer) {
      const panel = document.querySelector('.project-explorer-wrapper') as HTMLElement | null;
      if (panel) {
        const rect = panel.getBoundingClientRect();
        const visualWidth = e.clientX - explorerOffsetXRef.current - rect.left;
        const layoutWidth = visualToLayout(visualWidth, panel, 'x');
        setExplorerWidth(clamp(Math.round(layoutWidth), 150, 500));
      }
    }
    if (isDraggingConsole) {
      const panel = document.querySelector('.console-panel-wrapper') as HTMLElement | null;
      if (panel) {
        const visualTop = e.clientY - consoleOffsetYRef.current;
        const bottom = consoleBottomRef.current || panel.getBoundingClientRect().bottom;
        const visualHeight = bottom - visualTop;
        const layoutHeight = visualToLayout(visualHeight, panel, 'y');
        setConsoleHeight(clamp(Math.round(layoutHeight), 100, 500));
      }
    }
  }, [isDraggingExplorer, isDraggingConsole, setExplorerWidth, setConsoleHeight]);
  const handleMouseUp = useCallback(() => {
    setIsDraggingExplorer(false);
    setIsDraggingConsole(false);
  }, [setIsDraggingExplorer, setIsDraggingConsole]);
  useEffect(() => {
    if (!isDraggingExplorer && !isDraggingConsole) return;
    document.body.style.cursor = isDraggingExplorer ? 'ew-resize' : 'ns-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingExplorer, isDraggingConsole, handleMouseMove, handleMouseUp]);
  return {
    beginExplorerResize,
    beginConsoleResize
  };
};