import type { EditorAPI, EditorState, SelectionRange } from '../index';
import { SandboxedAPI } from './SandboxedAPI';
export class SandboxedEditorAPI extends SandboxedAPI implements EditorAPI {
  private editorRef: any = null;
  setEditor(editor: any): void {
    this.editorRef = editor;
  }
  async openFile(path: string): Promise<void> {
    this.checkPermission('editor:read');
    const event = new CustomEvent('plugin:open-file', {
      detail: {
        path
      }
    });
    window.dispatchEvent(event);
    console.log(`[PluginManager] Dispatched open file event: ${path}`);
  }
  getActiveEditor(): EditorState | null {
    this.checkPermission('editor:read');
    if (!this.editorRef) {
      console.warn('[PluginManager] Editor not available');
      return null;
    }
    const model = this.editorRef.getModel?.();
    if (!model) return null;
    return {
      id: 'active-editor',
      path: model.uri?.fsPath || '',
      content: this.editorRef.getValue?.() || '',
      cursor: this.getSelection()!
    };
  }
  getSelection(): SelectionRange | null {
    this.checkPermission('editor:read');
    if (!this.editorRef) return null;
    const selection = this.editorRef.getSelection?.();
    if (selection) {
      return {
        startLine: selection.startLineNumber,
        startColumn: selection.startColumn,
        endLine: selection.endLineNumber,
        endColumn: selection.endColumn
      };
    }
    return {
      startLine: 1,
      startColumn: 1,
      endLine: 1,
      endColumn: 1
    };
  }
  async insertText(text: string): Promise<void> {
    this.checkPermission('editor:write');
    if (!this.editorRef) return;
    const selection = this.editorRef.getSelection();
    if (selection) {
      this.editorRef.executeEdits('plugin', [{
        range: selection,
        text: text
      }]);
    }
  }
  async replaceText(range: SelectionRange, text: string): Promise<void> {
    this.checkPermission('editor:write');
    if (!this.editorRef) return;
    this.editorRef.executeEdits('plugin', [{
      range: {
        startLineNumber: range.startLine,
        startColumn: range.startColumn,
        endLineNumber: range.endLine,
        endColumn: range.endColumn
      },
      text: text
    }]);
  }
  async getCurrentContent(): Promise<string> {
    this.checkPermission('editor:read');
    return this.editorRef?.getValue?.() || '';
  }
  showSuggestion(language: string): void {
    this.checkPermission('editor:read');
    if (!this.editorRef) return;
    const model = this.editorRef.getModel?.();
    if (model && language) {
      try {
        const monaco = (window as any).monaco;
        if (monaco?.editor?.setModelLanguage && model.getLanguageId?.() !== language) {
          monaco.editor.setModelLanguage(model, language);
        }
      } catch {}
    }
    this.editorRef.trigger('keyboard', 'editor.action.triggerSuggest', {});
  }
  async formatDocument(): Promise<void> {
    this.checkPermission('editor:write');
    if (this.editorRef) {
      this.editorRef.trigger('keyboard', 'editor.action.formatDocument', {});
    }
  }
}