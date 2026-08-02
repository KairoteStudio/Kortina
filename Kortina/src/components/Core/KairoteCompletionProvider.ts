import { Monaco } from '@monaco-editor/react';
import { KAIROTE_KEYWORDS, KAIROTE_TYPES, KAIROTE_FUNCTIONS, KAIROTE_SNIPPETS } from '../../constants/kairote';
export class KairoteCompletionProvider {
  private monaco: Monaco;
  private isRegistered = false;
  constructor(monaco: Monaco) {
    this.monaco = monaco;
  }
  register() {
    if (this.isRegistered) return;
    this.isRegistered = true;
    this.monaco.languages.registerCompletionItemProvider('kairote', {
      triggerCharacters: ['.'],
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };
        const suggestions: any[] = [...KAIROTE_KEYWORDS.map(k => ({
          label: k,
          kind: this.monaco.languages.CompletionItemKind.Keyword,
          insertText: k,
          range,
          sortText: 'a_' + k
        })), ...KAIROTE_TYPES.map(t => ({
          label: t,
          kind: this.monaco.languages.CompletionItemKind.TypeParameter,
          insertText: t,
          range,
          sortText: 'b_' + t
        })), ...KAIROTE_FUNCTIONS.map(f => ({
          label: f.label,
          kind: this.monaco.languages.CompletionItemKind.Function,
          insertText: f.insertText || f.label + '($0)',
          insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: f.detail,
          documentation: {
            value: f.documentation || '',
            isTrusted: true,
            supportHtml: true
          },
          range,
          sortText: 'c_' + f.label
        })), ...KAIROTE_SNIPPETS.map(s => ({
          label: s.label,
          kind: this.monaco.languages.CompletionItemKind.Snippet,
          insertText: s.insertText,
          insertTextRules: this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: s.detail,
          range,
          sortText: 'd_' + s.label
        }))];
        const seen = new Set<string>();
        const deduped = suggestions.filter(s => {
          const key = `${s.label}|${s.kind}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return {
          suggestions: deduped
        };
      }
    });
  }
  unregister() {
    this.isRegistered = false;
  }
}