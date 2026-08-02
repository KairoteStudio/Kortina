import { create } from 'zustand';
import type { Tab, CompileError } from '../types/app';
interface EditorState {
  activeTab: string | null;
  tabs: Tab[];
  cursorPosition: {
    line: number;
    column: number;
  };
  editorContent: string;
  compileErrors: CompileError[];
  monacoReady: boolean;
}
interface EditorActions {
  setActiveTab: (tabId: string | null) => void;
  addTab: (tab: Tab) => void;
  removeTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<Tab>) => void;
  setTabs: (tabs: Tab[]) => void;
  setCursorPosition: (position: {
    line: number;
    column: number;
  }) => void;
  setEditorContent: (content: string) => void;
  setCompileErrors: (errors: CompileError[]) => void;
  setMonacoReady: (ready: boolean) => void;
  clearEditor: () => void;
}
export const useEditorStore = create<EditorState & EditorActions>(set => ({
  activeTab: null,
  tabs: [],
  cursorPosition: {
    line: 1,
    column: 1
  },
  editorContent: '',
  compileErrors: [],
  monacoReady: false,
  setActiveTab: activeTab => set({
    activeTab
  }),
  addTab: tab => set(state => ({
    tabs: [...state.tabs, tab]
  })),
  removeTab: tabId => set(state => ({
    tabs: state.tabs.filter(t => t.id !== tabId),
    activeTab: state.activeTab === tabId ? null : state.activeTab
  })),
  updateTab: (tabId, updates) => set(state => ({
    tabs: state.tabs.map(t => t.id === tabId ? {
      ...t,
      ...updates
    } : t)
  })),
  setTabs: tabs => set({
    tabs
  }),
  setCursorPosition: cursorPosition => set({
    cursorPosition
  }),
  setEditorContent: editorContent => set({
    editorContent
  }),
  setCompileErrors: compileErrors => set({
    compileErrors
  }),
  setMonacoReady: monacoReady => set({
    monacoReady
  }),
  clearEditor: () => set({
    activeTab: null,
    tabs: [],
    editorContent: '',
    cursorPosition: {
      line: 1,
      column: 1
    }
  })
}));