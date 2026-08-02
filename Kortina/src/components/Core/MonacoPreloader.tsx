import React, { useEffect } from 'react';
import { Monaco } from '@monaco-editor/react';
import { KAIROTE_LANGUAGE_DEF, KAIROTE_KEYWORDS, KAIROTE_TYPES, KAIROTE_FUNCTIONS } from '../../constants/kairote';
import { KairoteCompletionProvider } from './KairoteCompletionProvider';
interface MonacoPreloaderProps {
  theme: 'light' | 'dark' | 'kortina';
  onMonacoReady: (monaco: Monaco) => void;
}
interface SignatureInfo {
  label: string;
  documentation: string;
  parameters: {
    label: string;
    documentation: string;
  }[];
}
function parseFunctionSignature(func: any): SignatureInfo {
  const insertText: string = func.insertText || `${func.label}($0)`;
  const paramRegex = /\$\{(\d+)(?::([^}]+))?\}|\$(\d+)(?![0-9])/g;
  const params: {
    index: number;
    label: string;
    doc: string;
  }[] = [];
  let m: RegExpExecArray | null;
  while ((m = paramRegex.exec(insertText)) !== null) {
    const index = parseInt(m[1] || m[3], 10);
    if (index === 0) continue;
    const label = (m[2] || `arg${index}`).trim();
    if (!label) continue;
    params.push({
      index,
      label,
      doc: label
    });
  }
  const seen = new Set<number>();
  const unique = params.filter(p => {
    if (seen.has(p.index)) return false;
    seen.add(p.index);
    return true;
  }).sort((a, b) => a.index - b.index);
  const paramsLabel = unique.map(p => p.label).join(', ');
  return {
    label: `${func.label}(${paramsLabel})`,
    documentation: func.documentation || func.detail || '',
    parameters: unique.map(p => ({
      label: p.label,
      documentation: p.doc
    }))
  };
}
function findUserDefinedSignature(model: any, name: string, isConstructor: boolean): SignatureInfo | null {
  const text = model.getValue();
  if (isConstructor) {
    const classStartIdx = text.search(new RegExp(`\\bclass\\s+${escapeRegex(name)}\\b[^{]*\\{`));
    if (classStartIdx !== -1) {
      const classRegion = text.substring(classStartIdx, classStartIdx + 3000);
      const ctorMatch = classRegion.match(/constructor\s*\(([^)]*(?:\n[^)]*)*)\)/);
      if (ctorMatch) {
        return parseRawParams(name, ctorMatch[1].trim(), true);
      }
      return {
        label: `new ${name}()`,
        documentation: `Constructor of ${name}`,
        parameters: []
      };
    }
  }
  const funcRegex = new RegExp(`\\bfunction\\s+${escapeRegex(name)}\\s*\\(`, 'g');
  let match;
  while ((match = funcRegex.exec(text)) !== null) {
    const startIdx = match.index + match[0].length - 1;
    let depth = 1;
    let endIdx = startIdx + 1;
    const len = Math.min(text.length, startIdx + 2000);
    while (endIdx < len && depth > 0) {
      if (text[endIdx] === '(') depth++;else if (text[endIdx] === ')') depth--;
      if (text[endIdx] === '"' || text[endIdx] === "'" || text[endIdx] === '`') {
        const quote = text[endIdx];
        endIdx++;
        while (endIdx < text.length && text[endIdx] !== quote) {
          if (text[endIdx] === '\\') endIdx++;
          endIdx++;
        }
      }
      endIdx++;
    }
    if (depth !== 0) continue;
    const rawParams = text.substring(startIdx + 1, endIdx - 1).trim();
    if (!rawParams) {
      return {
        label: `${name}()`,
        documentation: `User-defined function ${name}`,
        parameters: []
      };
    }
    return parseRawParams(name, rawParams, isConstructor);
  }
  return null;
}
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function parseRawParams(name: string, raw: string, isConstructor: boolean): SignatureInfo {
  const parts = raw.split(',').map(p => p.trim()).filter(p => p.length > 0);
  const params = parts.map(p => {
    const nameMatch = p.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);
    const label = nameMatch ? nameMatch[1] : p;
    return {
      label,
      documentation: p
    };
  });
  const prefix = isConstructor ? 'new' : 'function';
  return {
    label: `${prefix} ${name}(${params.map(p => p.label).join(', ')})`,
    documentation: `${isConstructor ? 'Constructor' : 'Function'} ${name}`,
    parameters: params
  };
}
let monacoInitDone = false;
export const MonacoPreloader: React.FC<MonacoPreloaderProps> = ({
  onMonacoReady
}) => {
  useEffect(() => {
    console.log('MonacoPreloader useEffect 被调用');
    if (monacoInitDone) {
      console.log('Monaco 初始化标记已设置（模块级），跳过');
      return;
    }
    monacoInitDone = true;
    import('@monaco-editor/react').then(({
      loader
    }) => {
      loader.init().then((monaco: Monaco) => {
        console.log('Monaco 初始化完成');
        const languages = monaco.languages.getLanguages();
        const isRegistered = languages.some((lang: any) => lang.id === 'kairote');
        console.log('KairoteLang 语言注册状态:', isRegistered);
        if (!isRegistered) {
          console.log('注册 KairoteLang 语言...');
          monaco.languages.register({
            id: 'kairote'
          });
          monaco.languages.setMonarchTokensProvider('kairote', KAIROTE_LANGUAGE_DEF as any);
          monaco.languages.setLanguageConfiguration('kairote', {
            comments: {
              lineComment: '//',
              blockComment: ['/*', '*/']
            },
            brackets: [['{', '}'], ['[', ']'], ['(', ')']],
            autoClosingPairs: [{
              open: '{',
              close: '}'
            }, {
              open: '[',
              close: ']'
            }, {
              open: '(',
              close: ')'
            }, {
              open: '"',
              close: '"'
            }, {
              open: "'",
              close: "'"
            }, {
              open: '`',
              close: '`'
            }],
            surroundingPairs: [{
              open: '{',
              close: '}'
            }, {
              open: '[',
              close: ']'
            }, {
              open: '(',
              close: ')'
            }, {
              open: '"',
              close: '"'
            }, {
              open: "'",
              close: "'"
            }, {
              open: '`',
              close: '`'
            }],
            folding: {
              markers: {
                start: new RegExp('^\\s*#region\\b'),
                end: new RegExp('^\\s*#endregion\\b')
              }
            }
          });
          monaco.editor.defineTheme('kairote-light', {
            base: 'vs',
            inherit: true,
            rules: [{
              token: 'comment',
              foreground: '008000',
              fontStyle: 'italic'
            }, {
              token: 'string',
              foreground: 'A31515'
            }, {
              token: 'string.escape',
              foreground: 'A31515'
            }, {
              token: 'number',
              foreground: '098658'
            }, {
              token: 'keyword',
              foreground: '0000FF',
              fontStyle: 'bold'
            }, {
              token: 'keyword.special',
              foreground: '7B01A2',
              fontStyle: 'bold'
            }, {
              token: 'type',
              foreground: '267F99'
            }, {
              token: 'function',
              foreground: '795E26'
            }, {
              token: 'operator',
              foreground: '000000'
            }, {
              token: 'delimiter',
              foreground: '000000'
            }, {
              token: 'preprocessor',
              foreground: '7B01A2'
            }, {
              token: 'label',
              foreground: 'FF0000',
              fontStyle: 'bold'
            }, {
              token: 'identifier',
              foreground: '001080'
            }, {
              token: 'white',
              foreground: '#000000'
            }],
            colors: {
              'editor.foreground': '#333333',
              'editor.background': '#FFFFFF',
              'editorCursor.foreground': '#000000',
              'editor.lineHighlightBackground': '#F3F3F3',
              'editorLineNumber.foreground': '#237893',
              'editorLineNumber.activeForeground': '#0b216f',
              'editor.selectionBackground': '#ADD6FF80',
              'editor.inactiveSelectionBackground': '#ADD6FF40',
              'editor.selectionHighlightBackground': '#ADD6FF40',
              'editor.wordHighlightBackground': '#57575720',
              'editor.wordHighlightStrongBackground': '#007ACC20',
              'editorBracketMatch.background': '#0064001a',
              'editorBracketMatch.border': '#888888',
              'editorIndentGuide.background': '#D3D3D3',
              'editorIndentGuide.activeBackground': '#939393',
              'editorWhitespace.foreground': '#D3D3D3',
              'editorSuggestWidget.background': '#FFFFFF',
              'editorSuggestWidget.border': '#C8C8C8',
              'editorSuggestWidget.foreground': '#333333',
              'editorSuggestWidget.selectedBackground': '#0060C0',
              'editorSuggestWidget.selectedForeground': '#FFFFFF',
              'editorSuggestWidget.highlightForeground': '#0066CC',
              'editorSuggestWidget.focusHighlightForeground': '#9DDDFF',
              'editorWidget.border': '#C8C8C8',
              'editorWidget.background': '#F3F3F3',
              'editorHoverWidget.background': '#FFFFFF',
              'editorHoverWidget.border': '#C8C8C8',
              'editorHoverWidget.statusBarBackground': '#F3F3F3',
              'editorGhostText.foreground': '#0000004a'
            }
          });
          monaco.editor.defineTheme('kairote-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [{
              token: 'comment',
              foreground: '6A9955',
              fontStyle: 'italic'
            }, {
              token: 'string',
              foreground: 'CE9178'
            }, {
              token: 'string.escape',
              foreground: 'CE9178'
            }, {
              token: 'number',
              foreground: 'B5CEA8'
            }, {
              token: 'keyword',
              foreground: '569CD6',
              fontStyle: 'bold'
            }, {
              token: 'keyword.special',
              foreground: 'C586C0',
              fontStyle: 'bold'
            }, {
              token: 'type',
              foreground: '4EC9B0'
            }, {
              token: 'function',
              foreground: 'DCDCAA'
            }, {
              token: 'operator',
              foreground: '#D4D4D4'
            }, {
              token: 'delimiter',
              foreground: '#D4D4D4'
            }, {
              token: 'preprocessor',
              foreground: 'C586C0'
            }, {
              token: 'label',
              foreground: '#FF6B6B',
              fontStyle: 'bold'
            }, {
              token: 'identifier',
              foreground: '#9CDCFE'
            }, {
              token: 'white',
              foreground: '#D4D4D4'
            }],
            colors: {
              'editor.foreground': '#D4D4D4',
              'editor.background': '#1E1E1E',
              'editorCursor.foreground': '#AEAFAD',
              'editor.lineHighlightBackground': '#2D2D30',
              'editorLineNumber.foreground': '#858585',
              'editorLineNumber.activeForeground': '#C6C6C6',
              'editor.selectionBackground': '#264F78',
              'editor.inactiveSelectionBackground': '#3A3D41',
              'editor.selectionHighlightBackground': '#ADD6FF26',
              'editor.wordHighlightBackground': '#575757B0',
              'editor.wordHighlightStrongBackground': '#007ACC99',
              'editorBracketMatch.background': '#0064001a',
              'editorBracketMatch.border': '#888888',
              'editorIndentGuide.background': '#404040',
              'editorIndentGuide.activeBackground': '#707070',
              'editorWhitespace.foreground': '#404040',
              'editorSuggestWidget.background': '#252526',
              'editorSuggestWidget.border': '#454545',
              'editorSuggestWidget.foreground': '#D4D4D4',
              'editorSuggestWidget.selectedBackground': '#062F4A',
              'editorSuggestWidget.selectedForeground': '#FFFFFF',
              'editorSuggestWidget.highlightForeground': '#2AA198',
              'editorSuggestWidget.focusHighlightForeground': '#2AA198',
              'editorWidget.border': '#454545',
              'editorWidget.background': '#252526',
              'editorHoverWidget.background': '#252526',
              'editorHoverWidget.border': '#454545',
              'editorHoverWidget.statusBarBackground': '#2D2D30',
              'editorGhostText.foreground': '#FFFFFF3b'
            }
          });
          monaco.editor.defineTheme('kairote-jetbrains-light', {
            base: 'vs',
            inherit: true,
            rules: [{
              token: 'comment',
              foreground: '808080',
              fontStyle: 'italic'
            }, {
              token: 'string',
              foreground: '008000'
            }, {
              token: 'string.escape',
              foreground: '008000'
            }, {
              token: 'number',
              foreground: '0000FF'
            }, {
              token: 'keyword',
              foreground: '000080',
              fontStyle: 'bold'
            }, {
              token: 'keyword.special',
              foreground: '660E7A',
              fontStyle: 'bold'
            }, {
              token: 'type',
              foreground: '003D73'
            }, {
              token: 'function',
              foreground: '7A7A43'
            }, {
              token: 'operator',
              foreground: '000000'
            }, {
              token: 'delimiter',
              foreground: '000000'
            }, {
              token: 'preprocessor',
              foreground: '660E7A'
            }, {
              token: 'label',
              foreground: 'FF0000',
              fontStyle: 'bold'
            }, {
              token: 'identifier',
              foreground: '001080'
            }, {
              token: 'white',
              foreground: '#000000'
            }],
            colors: {
              'editor.foreground': '#000000',
              'editor.background': '#FFFFFF',
              'editorCursor.foreground': '#000000',
              'editor.lineHighlightBackground': '#F5F5F5',
              'editorLineNumber.foreground': '#787878',
              'editor.selectionBackground': '#C0D2F0',
              'editorSuggestWidget.background': '#FFFFFF',
              'editorSuggestWidget.border': '#C0C0C0',
              'editorSuggestWidget.foreground': '#000000',
              'editorSuggestWidget.selectedBackground': '#C0D2F0',
              'editorSuggestWidget.highlightForeground': '#000080',
              'editorSuggestWidget.selectedForeground': '#000000',
              'editorSuggestWidgetStatus.foreground': '#787878',
              'editorSuggestWidget.borderRadius': '4px'
            }
          });
          monaco.editor.defineTheme('kairote-jetbrains-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [{
              token: 'comment',
              foreground: '808080',
              fontStyle: 'italic'
            }, {
              token: 'string',
              foreground: '6A8759'
            }, {
              token: 'string.escape',
              foreground: '6A8759'
            }, {
              token: 'number',
              foreground: '6897BB'
            }, {
              token: 'keyword',
              foreground: 'CC7832',
              fontStyle: 'bold'
            }, {
              token: 'keyword.special',
              foreground: '94558A',
              fontStyle: 'bold'
            }, {
              token: 'type',
              foreground: '4A85E8'
            }, {
              token: 'function',
              foreground: 'FFC66D'
            }, {
              token: 'operator',
              foreground: 'A9B7C6'
            }, {
              token: 'delimiter',
              foreground: 'A9B7C6'
            }, {
              token: 'preprocessor',
              foreground: '94558A'
            }, {
              token: 'label',
              foreground: 'FF0000',
              fontStyle: 'bold'
            }, {
              token: 'identifier',
              foreground: 'A9B7C6'
            }, {
              token: 'white',
              foreground: '#FFFFFF'
            }],
            colors: {
              'editor.foreground': '#A9B7C6',
              'editor.background': '#2B2B2B',
              'editorCursor.foreground': '#A9B7C6',
              'editor.lineHighlightBackground': '#323232',
              'editorLineNumber.foreground': '#606366',
              'editor.selectionBackground': '#214283',
              'editorSuggestWidget.background': '#3C3F41',
              'editorSuggestWidget.border': '#5C5C5C',
              'editorSuggestWidget.foreground': '#A9B7C6',
              'editorSuggestWidget.selectedBackground': '#113A5C',
              'editorSuggestWidget.highlightForeground': '#CC7832',
              'editorSuggestWidget.selectedForeground': '#A9B7C6',
              'editorSuggestWidgetStatus.foreground': '#606366',
              'editorSuggestWidget.borderRadius': '4px'
            }
          });
          monaco.languages.registerHoverProvider('kairote', {
            provideHover: (model: any, position: any) => {
              const word = model.getWordAtPosition(position);
              if (!word) return null;
              const keyword = KAIROTE_KEYWORDS.find(k => k === word.word);
              if (keyword) {
                return {
                  range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                  contents: [{
                    value: `**关键字 \`${keyword}\`**`
                  }, {
                    value: '---'
                  }, {
                    value: `KairoteLang 语言的保留关键字。`
                  }]
                };
              }
              const type = KAIROTE_TYPES.find(t => t === word.word);
              if (type) {
                return {
                  range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                  contents: [{
                    value: `**数据类型 \`${type}\`**`
                  }, {
                    value: '---'
                  }, {
                    value: `KairoteLang 内置的数据类型。`
                  }]
                };
              }
              const func = KAIROTE_FUNCTIONS.find(f => f.label === word.word);
              if (func) {
                return {
                  range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                  contents: [{
                    value: `**函数 \`${func.label}\`**`
                  }, {
                    value: '---'
                  }, {
                    value: func.detail
                  }, {
                    value: func.documentation ? `\n\n${func.documentation}` : ''
                  }]
                };
              }
              return null;
            }
          });
          monaco.languages.registerSignatureHelpProvider('kairote', {
            signatureHelpTriggerCharacters: ['(', ','],
            signatureHelpRetriggerCharacters: [','],
            provideSignatureHelp: (model: any, position: any) => {
              const lineContent = model.getLineContent(position.lineNumber).substring(0, position.column - 1);
              const lastOpenParen = lineContent.lastIndexOf('(');
              if (lastOpenParen === -1) return null;
              const beforeParen = lineContent.substring(0, lastOpenParen).trimEnd();
              let targetName: string | null = null;
              let isConstructor = false;
              const methodChainMatch = beforeParen.match(/([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+)$/);
              if (methodChainMatch) {
                const fullPath = methodChainMatch[1];
                targetName = fullPath.split('.').pop() || null;
              } else {
                const newMatch = beforeParen.match(/\bnew\s+([a-zA-Z_][a-zA-Z0-9_]*)$/);
                if (newMatch) {
                  targetName = newMatch[1];
                  isConstructor = true;
                } else {
                  const funcMatch = beforeParen.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);
                  if (funcMatch) {
                    targetName = funcMatch[1];
                  }
                }
              }
              if (!targetName) return null;
              let signature: SignatureInfo | null = null;
              const func = KAIROTE_FUNCTIONS.find(f => f.label === targetName);
              if (func) {
                signature = parseFunctionSignature(func);
              }
              if (!signature && isConstructor) {
                const type = KAIROTE_TYPES.find(t => t === targetName);
                if (type) {
                  signature = {
                    label: `new ${type}()`,
                    documentation: `Creates a new ${type} instance.`,
                    parameters: [{
                      label: '...args',
                      documentation: `Constructor arguments for ${type}`
                    }]
                  };
                }
              }
              if (!signature) {
                signature = findUserDefinedSignature(model, targetName, isConstructor);
              }
              if (!signature) return null;
              const insideContent = lineContent.substring(lastOpenParen + 1);
              const activeParameter = (insideContent.match(/,/g) || []).length;
              return {
                value: {
                  signatures: [{
                    label: signature.label,
                    documentation: {
                      value: signature.documentation,
                      isTrusted: true
                    },
                    parameters: signature.parameters.map(p => ({
                      label: p.label,
                      documentation: {
                        value: p.documentation,
                        isTrusted: true
                      }
                    }))
                  }],
                  activeSignature: 0,
                  activeParameter: Math.min(activeParameter, Math.max(0, signature.parameters.length - 1))
                },
                dispose: () => {}
              };
            }
          });
          monaco.languages.registerDocumentSymbolProvider('kairote', {
            provideDocumentSymbols: (model: any) => {
              const symbols: any[] = [];
              const text = model.getValue();
              const funcRegex = /\bfunction\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
              let match;
              while ((match = funcRegex.exec(text)) !== null) {
                const startPos = model.getPositionAt(match.index);
                symbols.push({
                  name: match[1],
                  detail: '',
                  kind: monaco.languages.SymbolKind.Function,
                  range: {
                    startLineNumber: startPos.lineNumber,
                    startColumn: startPos.column,
                    endLineNumber: startPos.lineNumber,
                    endColumn: model.getLineMaxColumn(startPos.lineNumber)
                  },
                  selectionRange: {
                    startLineNumber: startPos.lineNumber,
                    startColumn: startPos.column,
                    endLineNumber: startPos.lineNumber,
                    endColumn: startPos.column + match[0].length
                  }
                });
              }
              const classRegex = /\bclass\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
              while ((match = classRegex.exec(text)) !== null) {
                const startPos = model.getPositionAt(match.index);
                symbols.push({
                  name: match[1],
                  detail: '',
                  kind: monaco.languages.SymbolKind.Class,
                  range: {
                    startLineNumber: startPos.lineNumber,
                    startColumn: startPos.column,
                    endLineNumber: startPos.lineNumber,
                    endColumn: model.getLineMaxColumn(startPos.lineNumber)
                  },
                  selectionRange: {
                    startLineNumber: startPos.lineNumber,
                    startColumn: startPos.column,
                    endLineNumber: startPos.lineNumber,
                    endColumn: startPos.column + match[0].length
                  }
                });
              }
              return symbols;
            }
          });
        }
        console.log('准备注册 KairoteCompletionProvider...');
        const completionProvider = new KairoteCompletionProvider(monaco);
        completionProvider.register();
        console.log('KairoteCompletionProvider 注册完成');
        console.log('调用 onMonacoReady...');
        const finalLanguages = monaco.languages.getLanguages();
        console.log('最终语言列表:', finalLanguages.map((lang: any) => lang.id));
        onMonacoReady(monaco);
      });
    });
    return () => {};
  }, [onMonacoReady]);
  return null;
};
export default MonacoPreloader;