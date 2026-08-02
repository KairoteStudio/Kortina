import '../../monaco-setup';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import type { editor } from 'monaco-editor';
import type { MonacoEditorInstance } from '../../types/editor';
import ContextMenu from './ContextMenu';
import MonacoPreloader from './MonacoPreloader';
import { useBreakpointDecorations } from '../../hooks/useBreakpointDecorations';
import { useDebugStore } from '../../stores/DebugStore';
import { debugService } from '../../services/DebugService';
import './CodeEditor.css';
interface CodeEditorProps {
  content: string;
  onChange: (value: string) => void;
  onSave: () => void;
  theme: 'light' | 'dark' | 'kortina';
  language: string;
  fontSize: number;
  fontFamily: string;
  fontLigatures: boolean;
  syntaxTheme: 'default' | 'jetbrains' | 'vscode' | 'monokai';
  tabSize: number;
  onCursorChange: (line: number, column: number) => void;
  monaco?: Monaco;
  onEditorReady?: (editor: MonacoEditorInstance) => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSelectAll?: () => void;
  onFind?: () => void;
  onReplace?: () => void;
  currentFilePath?: string;
}
export const CodeEditor: React.FC<CodeEditorProps> = ({
  content,
  language,
  onChange,
  onSave,
  theme,
  fontSize,
  fontFamily,
  fontLigatures,
  syntaxTheme,
  tabSize,
  onCursorChange,
  monaco: externalMonaco,
  onEditorReady,
  onCopy,
  onCut,
  onPaste,
  onUndo,
  onRedo,
  onSelectAll,
  onFind,
  onReplace,
  currentFilePath
}) => {
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [cursorPosition, setCursorPosition] = useState({
    line: 1,
    column: 1
  });
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  useBreakpointDecorations(editorRef, monacoRef, currentFilePath || null);
  const {
    stoppedFile,
    stoppedLine,
    status
  } = useDebugStore();
  const currentLineDecorationIdsRef = useRef<string[]>([]);
  const propsRef = useRef({
    onChange,
    onCursorChange,
    onSave
  });
  propsRef.current = {
    onChange,
    onCursorChange,
    onSave
  };
  const handleEditorChange = (value: string | undefined) => {
    propsRef.current.onChange(value || '');
  };
  const handleContextMenuClose = useCallback(() => {
    console.debug('[CodeEditor] handleContextMenuClose');
    setContextMenu(null);
  }, []);
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.debug('[CodeEditor] contextmenu event', e.clientX, e.clientY);
    setContextMenu({
      x: e.clientX,
      y: e.clientY
    });
  }, []);
  const handleUndo = useCallback(() => {
    if (editorRef.current && onUndo) {
      onUndo();
    }
  }, [onUndo]);
  const handleRedo = useCallback(() => {
    if (editorRef.current && onRedo) {
      onRedo();
    }
  }, [onRedo]);
  const handleSelectAll = useCallback(() => {
    if (editorRef.current && onSelectAll) {
      onSelectAll();
    }
  }, [onSelectAll]);
  const handleFind = useCallback(() => {
    if (editorRef.current && onFind) {
      onFind();
    }
  }, [onFind]);
  const handleReplace = useCallback(() => {
    if (editorRef.current && onReplace) {
      onReplace();
    }
  }, [onReplace]);
  const getEditorTheme = () => {
    const isDarkLike = theme === 'dark' || theme === 'kortina';
    if (language === 'kairote') {
      return isDarkLike ? 'kairote-dark' : 'kairote-light';
    }
    return isDarkLike ? 'vs-dark' : 'vs';
  };
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const monaco = monacoRef.current;
      let themeName = '';
      const isDarkLike = theme === 'dark' || theme === 'kortina';
      if (language === 'kairote') {
        if (syntaxTheme === 'jetbrains') {
          themeName = isDarkLike ? 'kairote-jetbrains-dark' : 'kairote-jetbrains-light';
        } else if (syntaxTheme === 'vscode') {
          themeName = isDarkLike ? 'kairote-dark' : 'kairote-light';
        } else {
          themeName = isDarkLike ? 'kairote-dark' : 'kairote-light';
        }
      } else {
        themeName = isDarkLike ? 'vs-dark' : 'vs';
      }
      monaco.editor.setTheme(themeName);
    }
  }, [theme, language, externalMonaco, syntaxTheme]);
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (currentLineDecorationIdsRef.current.length > 0) {
      currentLineDecorationIdsRef.current = editor.deltaDecorations(currentLineDecorationIdsRef.current, []);
    }
    if (status === 'stopped' && stoppedFile && stoppedLine && currentFilePath && stoppedFile === currentFilePath) {
      const newDecorations: monaco.editor.IModelDeltaDecoration[] = [{
        range: new monaco.Range(stoppedLine, 1, stoppedLine, 1),
        options: {
          isWholeLine: true,
          className: 'debug-current-line-highlight',
          glyphMarginClassName: 'debug-current-line-glyph',
          linesDecorationsClassName: 'debug-current-line-decoration'
        }
      }];
      currentLineDecorationIdsRef.current = editor.deltaDecorations([], newDecorations);
      editor.revealLineInCenter(stoppedLine);
    }
  }, [status, stoppedFile, stoppedLine, currentFilePath]);
  const editorOptions = React.useMemo((): editor.IStandaloneEditorConstructionOptions => ({
    fontSize,
    fontFamily,
    fontLigatures,
    tabSize,
    wordWrap: 'on',
    lineHeight: Math.ceil(fontSize * 1.6),
    mouseWheelZoom: false,
    letterSpacing: 0.3,
    fontWeight: '400',
    minimap: {
      enabled: true,
      scale: 1,
      showSlider: 'mouseover',
      renderCharacters: false,
      maxColumn: 80,
      side: 'right'
    },
    scrollBeyondLastLine: true,
    automaticLayout: true,
    lineNumbers: 'on',
    lineNumbersMinChars: 3,
    padding: {
      top: 8,
      bottom: 8
    },
    smoothScrolling: true,
    cursorSmoothCaretAnimation: 'on',
    cursorBlinking: 'smooth',
    cursorStyle: 'line',
    cursorWidth: 2,
    renderLineHighlight: 'all',
    renderWhitespace: 'selection',
    occurrencesHighlight: 'singleFile',
    selectionHighlight: true,
    bracketPairColorization: {
      enabled: true,
      independentColorPoolPerBracketType: true
    },
    guides: {
      bracketPairs: true,
      indentation: true,
      highlightActiveBracketPair: true,
      highlightActiveIndentation: true
    },
    quickSuggestions: {
      other: true,
      comments: false,
      strings: true
    },
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'smart',
    snippetSuggestions: 'top',
    wordBasedSuggestions: 'off',
    suggest: {
      preview: true,
      previewMode: 'prefix',
      showMethods: true,
      showFunctions: true,
      showConstructors: true,
      showFields: true,
      showVariables: true,
      showClasses: true,
      showStructs: true,
      showInterfaces: true,
      showModules: true,
      showProperties: true,
      showEvents: true,
      showOperators: true,
      showUnits: true,
      showValues: true,
      showConstants: true,
      showEnums: true,
      showEnumMembers: true,
      showKeywords: true,
      showSnippets: true,
      showColors: true,
      showFiles: true,
      showReferences: true,
      showFolders: true,
      showTypeParameters: true,
      showUsers: true,
      showIssues: true,
      shareSuggestSelections: true
    },
    folding: true,
    foldingHighlight: true,
    foldingStrategy: 'indentation',
    unfoldOnClickAfterEndOfLine: true,
    links: true,
    roundedSelection: true,
    scrollbar: {
      vertical: 'visible',
      horizontal: 'visible',
      useShadows: false,
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
      verticalSliderSize: 10,
      horizontalSliderSize: 10
    },
    formatOnType: true,
    formatOnPaste: true,
    dragAndDrop: true,
    multiCursorModifier: 'alt',
    unicodeHighlight: {
      ambiguousCharacters: false,
      invisibleCharacters: false
    }
  }), [fontSize, fontFamily, fontLigatures, tabSize]);
  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.updateOptions({
      ...editorOptions,
      fontSize,
      fontFamily,
      fontLigatures,
      tabSize,
      lineHeight: Math.ceil(fontSize * 1.6),
      mouseWheelZoom: false
    });
  }, [editorOptions, fontSize, fontFamily, fontLigatures, tabSize]);
  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    if (!externalMonaco) {
      monacoRef.current = monaco;
    }
    setIsEditorReady(true);
    if (onEditorReady) {
      onEditorReady(editor);
    }
    const overflowWidgetsContainer = (() => {
      let el = document.getElementById('monaco-overflow-widgets');
      if (!el) {
        el = document.createElement('div');
        el.id = 'monaco-overflow-widgets';
        el.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;';
        el.setAttribute('aria-hidden', 'true');
        document.body.appendChild(el);
      }
      return el;
    })();
    editor.updateOptions({
      overflowWidgetsDomNode: overflowWidgetsContainer,
      contextmenu: false
    } as any);
    const editorContainer = editor.getContainerDomNode();
    editorContainer.addEventListener('contextmenu', handleContextMenu);
    editor.updateOptions({
      ...editorOptions,
      fontSize,
      fontFamily,
      fontLigatures,
      tabSize,
      lineHeight: Math.ceil(fontSize * 1.6),
      mouseWheelZoom: false
    });
    const isDarkLike = theme === 'dark' || theme === 'kortina';
    if (language === 'kairote') {
      let themeName = '';
      if (syntaxTheme === 'jetbrains') {
        themeName = isDarkLike ? 'kairote-jetbrains-dark' : 'kairote-jetbrains-light';
      } else if (syntaxTheme === 'vscode') {
        themeName = isDarkLike ? 'kairote-dark' : 'kairote-light';
      } else {
        themeName = isDarkLike ? 'kairote-dark' : 'kairote-light';
      }
      monaco.editor.setTheme(themeName);
    } else {
      monaco.editor.setTheme(isDarkLike ? 'vs-dark' : 'vs');
    }
    editor.onDidChangeCursorPosition((e: monaco.editor.ICursorPositionChangedEvent) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column
      });
      propsRef.current.onCursorChange(e.position.lineNumber, e.position.column);
    });
    let suggestTimeout: ReturnType<typeof setTimeout>;
    editor.onDidChangeModelContent((event: monaco.editor.IModelContentChangedEvent) => {
      for (const change of event.changes) {
        const isPureDeletion = change.rangeLength > 0 && change.text === '';
        if (!isPureDeletion) continue;
        const pos = editor.getPosition();
        if (!pos) continue;
        const model = editor.getModel();
        if (!model) continue;
        const lineText = model.getLineContent(pos.lineNumber);
        const prevChar = lineText[pos.column - 2];
        if (prevChar && /[a-zA-Z0-9_]/.test(prevChar)) {
          if (suggestTimeout) clearTimeout(suggestTimeout);
          suggestTimeout = setTimeout(() => {
            editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
          }, 30);
        }
        break;
      }
    });
    const hoverProviderDispose = monaco.languages.registerHoverProvider('*', {
      provideHover: async (model: editor.ITextModel, position: monaco.Position) => {
        const store = useDebugStore.getState();
        if (store.status !== 'stopped' || !store.sessionId) {
          return null;
        }
        const word = model.getWordAtPosition(position);
        if (!word) {
          return null;
        }
        const variableName = word.word;
        try {
          const frameId = store.callStack[0]?.id;
          const result = await debugService.evaluateForHover(store.sessionId, variableName, frameId);
          if (result) {
            return {
              contents: [{
                value: `\`${variableName}\`: ${result.value}${result.type ? ` (${result.type})` : ''}`
              }]
            };
          }
        } catch (error) {}
        return null;
      }
    });
    return () => {
      hoverProviderDispose.dispose();
      editorContainer.removeEventListener('contextmenu', handleContextMenu);
      if (suggestTimeout) clearTimeout(suggestTimeout);
    };
  }, [theme, syntaxTheme, language, fontSize, tabSize, fontFamily, fontLigatures, onEditorReady, handleContextMenu, externalMonaco, editorOptions]);
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        const editorContainer = editorRef.current.getContainerDomNode();
        editorContainer.removeEventListener('contextmenu', handleContextMenu);
      }
    };
  }, [handleContextMenu]);
  return <div className="code-editor-container" style={{
    height: '100%',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: 0
  }}>
      <MonacoPreloader theme={theme} onMonacoReady={() => {}} />
      {}
      {contextMenu && <ContextMenu isVisible={true} x={contextMenu.x} y={contextMenu.y} fileType="editor" hasClipboardContent={false} onClose={handleContextMenuClose} onNewFile={() => {}} onNewFolder={() => {}} onCopy={() => onCopy?.() || editorRef.current && document.execCommand('copy')} onCut={() => onCut?.() || editorRef.current && document.execCommand('cut')} onPaste={() => onPaste?.() || editorRef.current && document.execCommand('paste')} onRename={() => {}} onDelete={() => {}} onRefresh={() => {}} onUndo={handleUndo} onRedo={handleRedo} onSelectAll={handleSelectAll} onFind={handleFind} onReplace={handleReplace} />}

      <div style={{
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
      position: 'relative'
    }}>
        {!isEditorReady && <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        zIndex: 1
      }}>
            <div>正在加载编辑器...</div>
          </div>}
        <Editor height="100%" language={language === 'kairote' ? 'kairote' : language} value={content} theme={getEditorTheme()} onChange={handleEditorChange} onMount={handleEditorDidMount} loading={<div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}>正在加载编辑器...</div>} options={editorOptions} />
      </div>
      <div className="status-bar code-editor-status-bar" style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '2px 12px',
      height: '22px',
      flexShrink: 0,
      alignItems: 'center',
      backgroundColor: 'var(--text-primary)',
      color: 'var(--bg-primary)',
      fontSize: '11px',
      fontWeight: '400',
      userSelect: 'none'
    }}>
        <div style={{
        display: 'flex',
        gap: '16px'
      }}>
          <span>行 {cursorPosition.line}, 列 {cursorPosition.column}</span>
        </div>
        <div style={{
        display: 'flex',
        gap: '16px'
      }}>
          <span>空格: {tabSize}</span>
          <span>UTF-8</span>
          <span style={{
          cursor: 'pointer'
        }}>{language.toUpperCase()}</span>
        </div>
      </div>
    </div>;
};
export default CodeEditor;