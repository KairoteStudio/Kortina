import { useCallback } from 'react';
import * as monaco from 'monaco-editor';
import type { MonacoEditorInstance } from '../types/editor';
interface UseEditorActionsOptions {
  editorRef: React.RefObject<MonacoEditorInstance | null>;
}
export const useEditorActions = (options: UseEditorActionsOptions) => {
  const {
    editorRef
  } = options;
  const handleUndo = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'undo', null);
    }
  }, [editorRef]);
  const handleRedo = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'redo', null);
    }
  }, [editorRef]);
  const handleCut = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'cut', null);
    }
  }, [editorRef]);
  const handleCopy = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'copy', null);
    }
  }, [editorRef]);
  const handlePaste = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'paste', null);
    }
  }, [editorRef]);
  const handleFind = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'actions.find', null);
    }
  }, [editorRef]);
  const handleReplace = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.startFindReplaceAction')?.run();
    }
  }, [editorRef]);
  const handleZoomIn = useCallback(() => {
    if (editorRef.current) {
      const currentFontSize = editorRef.current.getOption(monaco.editor.EditorOption.fontSize) as number;
      editorRef.current.updateOptions({
        fontSize: currentFontSize + 1
      });
    }
  }, [editorRef]);
  const handleZoomOut = useCallback(() => {
    if (editorRef.current) {
      const currentFontSize = editorRef.current.getOption(monaco.editor.EditorOption.fontSize) as number;
      if (currentFontSize > 8) {
        editorRef.current.updateOptions({
          fontSize: currentFontSize - 1
        });
      }
    }
  }, [editorRef]);
  const handleResetZoom = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: 14
      });
    }
  }, [editorRef]);
  const handleGoToDefinition = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'editor.action.revealDefinition', null);
    }
  }, [editorRef]);
  const handleGoToDeclaration = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'editor.action.revealDeclaration', null);
    }
  }, [editorRef]);
  const handleGoToImplementation = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'editor.action.goToImplementation', null);
    }
  }, [editorRef]);
  const handleGoBack = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'cursorUndo', null);
    }
  }, [editorRef]);
  const handleGoForward = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'cursorRedo', null);
    }
  }, [editorRef]);
  const handleFormatDocument = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'editor.action.formatDocument', null);
    }
  }, [editorRef]);
  const handleToggleLineComment = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'editor.action.commentLine', null);
    }
  }, [editorRef]);
  const handleToggleBlockComment = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'editor.action.blockComment', null);
    }
  }, [editorRef]);
  const handleTriggerSuggest = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'editor.action.triggerSuggest', null);
    }
  }, [editorRef]);
  const handleQuickFix = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'editor.action.quickFix', null);
    }
  }, [editorRef]);
  const handleRenameSymbol = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'editor.action.rename', null);
    }
  }, [editorRef]);
  const handleExtractFunction = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'editor.action.extractFunction', null);
    }
  }, [editorRef]);
  const handleExtractVariable = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'editor.action.extractVariable', null);
    }
  }, [editorRef]);
  const handleInlineVariable = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'editor.action.inlineVariable', null);
    }
  }, [editorRef]);
  return {
    handleUndo,
    handleRedo,
    handleCut,
    handleCopy,
    handlePaste,
    handleFind,
    handleReplace,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleGoToDefinition,
    handleGoToDeclaration,
    handleGoToImplementation,
    handleGoBack,
    handleGoForward,
    handleFormatDocument,
    handleToggleLineComment,
    handleToggleBlockComment,
    handleTriggerSuggest,
    handleQuickFix,
    handleRenameSymbol,
    handleExtractFunction,
    handleExtractVariable,
    handleInlineVariable
  };
};