import React, { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useUISettingsStore } from '../stores';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export interface UseFleetResizeOptions {
  gridRef: React.RefObject<HTMLDivElement | null>;
}

export interface UseFleetResizeReturn {
  beginSidebarResize: (e: ReactMouseEvent | MouseEvent) => void;
  beginAiPanelResize: (e: ReactMouseEvent | MouseEvent) => void;
  beginTerminalResize: (e: ReactMouseEvent | MouseEvent) => void;
  isDragging: boolean;
  activeHandle: 'sidebar' | 'ai' | 'terminal' | null;
}

export const useFleetResize = ({ gridRef }: UseFleetResizeOptions): UseFleetResizeReturn => {
  const { setFleetSidebarWidth, setFleetAiPanelWidth, setFleetTerminalHeight } = useUISettingsStore();

  const isDraggingRef = useRef(false);
  const activeHandleRef = useRef<'sidebar' | 'ai' | 'terminal' | null>(null);
  const startPosRef = useRef(0);
  const startSizeRef = useRef(0);

  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState<'sidebar' | 'ai' | 'terminal' | null>(null);

  const beginSidebarResize = useCallback((e: ReactMouseEvent | MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const grid = gridRef.current;
    if (!grid) return;
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ');
    const sidebarWidthPx = parseFloat(cols[0]) || 270;
    startPosRef.current = e.clientX;
    startSizeRef.current = sidebarWidthPx;
    isDraggingRef.current = true;
    activeHandleRef.current = 'sidebar';
    setIsDragging(true);
    setActiveHandle('sidebar');
  }, [gridRef]);

  const beginAiPanelResize = useCallback((e: ReactMouseEvent | MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const grid = gridRef.current;
    if (!grid) return;
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ');
    const aiWidthPx = parseFloat(cols[cols.length - 1]) || 330;
    startPosRef.current = e.clientX;
    startSizeRef.current = aiWidthPx;
    isDraggingRef.current = true;
    activeHandleRef.current = 'ai';
    setIsDragging(true);
    setActiveHandle('ai');
  }, [gridRef]);

  const beginTerminalResize = useCallback((e: ReactMouseEvent | MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const centerStack = gridRef.current?.querySelector('.fleet-center-stack') as HTMLElement | null;
    if (!centerStack) return;
    const terminal = centerStack.querySelector('.fleet-terminal-island') as HTMLElement | null;
    if (!terminal) return;
    const terminalHeightPx = terminal.getBoundingClientRect().height;
    startPosRef.current = e.clientY;
    startSizeRef.current = terminalHeightPx;
    isDraggingRef.current = true;
    activeHandleRef.current = 'terminal';
    setIsDragging(true);
    setActiveHandle('terminal');
  }, [gridRef]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || !activeHandleRef.current) return;
    const grid = gridRef.current;
    if (!grid) return;

    if (activeHandleRef.current === 'sidebar') {
      const delta = e.clientX - startPosRef.current;
      const newWidth = clamp(Math.round(startSizeRef.current + delta), 180, 480);
      setFleetSidebarWidth(newWidth);
    } else if (activeHandleRef.current === 'ai') {
      const delta = startPosRef.current - e.clientX;
      const newWidth = clamp(Math.round(startSizeRef.current + delta), 240, 520);
      setFleetAiPanelWidth(newWidth);
    } else if (activeHandleRef.current === 'terminal') {
      const centerStack = grid.querySelector('.fleet-center-stack') as HTMLElement | null;
      if (!centerStack) return;
      const terminal = centerStack.querySelector('.fleet-terminal-island') as HTMLElement | null;
      if (!terminal) return;
      const delta = startPosRef.current - e.clientY;
      const newHeight = clamp(Math.round(startSizeRef.current + delta), 100, 500);
      setFleetTerminalHeight(newHeight);
    }
  }, [gridRef, setFleetSidebarWidth, setFleetAiPanelWidth, setFleetTerminalHeight]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    activeHandleRef.current = null;
    setIsDragging(false);
    setActiveHandle(null);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    document.body.style.cursor = activeHandle === 'terminal' ? 'ns-resize' : 'ew-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, activeHandle, handleMouseMove, handleMouseUp]);

  return {
    beginSidebarResize,
    beginAiPanelResize,
    beginTerminalResize,
    isDragging,
    activeHandle,
  };
};
