import { create } from 'zustand';
interface CompileState {
  isCompiling: boolean;
  output: string;
}
interface CompileActions {
  setIsCompiling: (compiling: boolean) => void;
  setOutput: (output: string) => void;
  appendOutput: (output: string) => void;
  clearOutput: () => void;
}
export const useCompileStore = create<CompileState & CompileActions>(set => ({
  isCompiling: false,
  output: '',
  setIsCompiling: isCompiling => set({
    isCompiling
  }),
  setOutput: output => set({
    output
  }),
  appendOutput: output => set(state => ({
    output: state.output + output
  })),
  clearOutput: () => set({
    output: ''
  })
}));