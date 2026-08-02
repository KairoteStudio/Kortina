import { useCallback, useRef, useEffect } from 'react';
import type { MonacoEditorInstance } from '../types/editor';
import * as monaco from 'monaco-editor';
import { useDebugStore } from '../stores/DebugStore';
import { debugService } from '../services/DebugService';
export function useBreakpointDecorations(editorRef: React.RefObject<MonacoEditorInstance | null>, _monacoRef: React.RefObject<typeof monaco | null>, currentFilePath: string | null) {
  const decorationIdsRef = useRef<string[]>([]);
  const {
    breakpoints,
    addBreakpoint,
    removeBreakpoint,
    sessionId
  } = useDebugStore();
  const currentFileBreakpoints = currentFilePath ? breakpoints.filter(bp => bp.file === currentFilePath) : [];
  const handleEditorMouseDown = useCallback((e: monaco.editor.IEditorMouseEvent) => {
    if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS) {
      return;
    }
    const lineNumber = e.target.position?.lineNumber;
    if (!lineNumber || !currentFilePath) return;
    const existingBp = currentFileBreakpoints.find(bp => bp.line === lineNumber);
    if (existingBp) {
      removeBreakpoint(existingBp.id);
    } else {
      addBreakpoint({
        id: `${currentFilePath}:${lineNumber}`,
        file: currentFilePath,
        line: lineNumber,
        enabled: true
      });
    }
    if (sessionId) {
      queueMicrotask(() => {
        debugService.syncFileBreakpoints(sessionId, currentFilePath).catch(error => {
          useDebugStore.getState().setError(String(error));
        });
      });
    }
  }, [currentFilePath, currentFileBreakpoints, addBreakpoint, removeBreakpoint, sessionId]);
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const newDecorations: monaco.editor.IModelDeltaDecoration[] = currentFileBreakpoints.map(bp => ({
      range: new monaco.Range(bp.line, 1, bp.line, 1),
      options: {
        isWholeLine: false,
        glyphMarginClassName: bp.enabled ? 'breakpoint-decoration' : 'breakpoint-decoration disabled',
        glyphMarginHoverMessage: {
          value: bp.enabled ? '断点 (点击移除)' : '已禁用断点 (点击移除)'
        },
        linesDecorationsClassName: bp.enabled ? 'debug-current-line' : undefined
      }
    }));
    const oldIds = decorationIdsRef.current;
    decorationIdsRef.current = editor.deltaDecorations(oldIds, newDecorations);
  }, [currentFileBreakpoints, editorRef]);
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const disposable = editor.onMouseDown(handleEditorMouseDown);
    return () => disposable.dispose();
  }, [editorRef, handleEditorMouseDown]);
  useEffect(() => {
    return () => {
      const editor = editorRef.current;
      if (editor && decorationIdsRef.current.length > 0) {
        editor.deltaDecorations(decorationIdsRef.current, []);
      }
    };
  }, [editorRef]);
  return {
    fileBreakpoints: currentFileBreakpoints
  };
}