import { create } from 'zustand';
import type { DebugBreakpoint, DebugVariable, DebugStackFrame, DebugThread, DebugStatus, DebugConfiguration } from '../services/debug/dap-types';
export interface DebugScope {
  name: string;
  variablesReference: number;
  expensive: boolean;
}
export interface WatchExpression {
  id: string;
  expression: string;
  value?: string;
  type?: string;
  variablesReference?: number;
}
export interface ExceptionFilter {
  filter: string;
  label: string;
  enabled: boolean;
  supportsCondition?: boolean;
}
interface DebugState {
  sessionId: string | null;
  status: DebugStatus;
  adapterType: string;
  launchConfigurations: DebugConfiguration[];
  selectedConfiguration: string | null;
  breakpoints: DebugBreakpoint[];
  variables: DebugVariable[];
  variablesMap: Map<number, DebugVariable[]>;
  scopeVariablesMap: Map<number, DebugVariable[]>;
  scopes: DebugScope[];
  callStack: DebugStackFrame[];
  threads: DebugThread[];
  stoppedThread: number | null;
  stoppedFile: string | null;
  stoppedLine: number | null;
  selectedThread: number | null;
  expandedVariables: Set<number>;
  watchExpressions: WatchExpression[];
  exceptionFilters: ExceptionFilter[];
  output: string[];
  error: string | null;
  setSession: (id: string | null, adapterType: string) => void;
  setStatus: (status: DebugStatus) => void;
  setLaunchConfigurations: (configs: DebugConfiguration[]) => void;
  setSelectedConfiguration: (name: string | null) => void;
  setBreakpoints: (breakpoints: DebugBreakpoint[]) => void;
  addBreakpoint: (bp: DebugBreakpoint) => void;
  removeBreakpoint: (id: string) => void;
  toggleBreakpoint: (id: string) => void;
  updateBreakpoint: (id: string, updates: Partial<DebugBreakpoint>) => void;
  setVariables: (variables: DebugVariable[]) => void;
  setVariablesForReference: (variablesReference: number, variables: DebugVariable[]) => void;
  getVariablesForReference: (variablesReference: number) => DebugVariable[];
  setScopeVariables: (scopeReference: number, variables: DebugVariable[]) => void;
  getScopeVariables: (scopeReference: number) => DebugVariable[];
  setExpandedVariable: (variablesReference: number, expanded: boolean) => void;
  isVariableExpanded: (variablesReference: number) => boolean;
  setScopes: (scopes: DebugScope[]) => void;
  setCallStack: (frames: DebugStackFrame[]) => void;
  setThreads: (threads: DebugThread[]) => void;
  setSelectedThread: (threadId: number | null) => void;
  setStoppedLocation: (thread: number | null, file: string | null, line: number | null) => void;
  appendOutput: (text: string) => void;
  clearOutput: () => void;
  setError: (error: string | null) => void;
  addWatchExpression: (expression: string) => void;
  removeWatchExpression: (id: string) => void;
  updateWatchExpression: (id: string, updates: Partial<WatchExpression>) => void;
  clearWatchExpressions: () => void;
  setExceptionFilters: (filters: ExceptionFilter[]) => void;
  toggleExceptionFilter: (filter: string) => void;
  reset: () => void;
}
const initialState = {
  sessionId: null,
  status: 'idle' as DebugStatus,
  adapterType: '',
  launchConfigurations: [] as DebugConfiguration[],
  selectedConfiguration: null as string | null,
  breakpoints: [] as DebugBreakpoint[],
  variables: [] as DebugVariable[],
  variablesMap: new Map<number, DebugVariable[]>(),
  scopeVariablesMap: new Map<number, DebugVariable[]>(),
  scopes: [] as DebugScope[],
  callStack: [] as DebugStackFrame[],
  threads: [] as DebugThread[],
  stoppedThread: null as number | null,
  stoppedFile: null as string | null,
  stoppedLine: null as number | null,
  selectedThread: null as number | null,
  expandedVariables: new Set<number>(),
  watchExpressions: [] as WatchExpression[],
  exceptionFilters: [] as ExceptionFilter[],
  output: [] as string[],
  error: null as string | null
};
export const useDebugStore = create<DebugState>((set, get) => ({
  ...initialState,
  setSession: (id, adapterType) => set({
    sessionId: id,
    adapterType
  }),
  setStatus: status => set({
    status
  }),
  setLaunchConfigurations: launchConfigurations => set({
    launchConfigurations
  }),
  setSelectedConfiguration: selectedConfiguration => set({
    selectedConfiguration
  }),
  setBreakpoints: breakpoints => set({
    breakpoints
  }),
  addBreakpoint: bp => set(state => ({
    breakpoints: [...state.breakpoints, bp]
  })),
  removeBreakpoint: id => set(state => ({
    breakpoints: state.breakpoints.filter(bp => bp.id !== id)
  })),
  toggleBreakpoint: id => set(state => ({
    breakpoints: state.breakpoints.map(bp => bp.id === id ? {
      ...bp,
      enabled: !bp.enabled
    } : bp)
  })),
  updateBreakpoint: (id, updates) => set(state => ({
    breakpoints: state.breakpoints.map(bp => bp.id === id ? {
      ...bp,
      ...updates
    } : bp)
  })),
  setVariables: variables => set({
    variables
  }),
  setVariablesForReference: (variablesReference, variables) => set(state => {
    const newMap = new Map(state.variablesMap);
    newMap.set(variablesReference, variables);
    return {
      variablesMap: newMap
    };
  }),
  getVariablesForReference: variablesReference => {
    return get().variablesMap.get(variablesReference) || [];
  },
  setScopeVariables: (scopeReference, variables) => set(state => {
    const newMap = new Map(state.scopeVariablesMap);
    newMap.set(scopeReference, variables);
    return {
      scopeVariablesMap: newMap
    };
  }),
  getScopeVariables: scopeReference => {
    return get().scopeVariablesMap.get(scopeReference) || [];
  },
  setExpandedVariable: (variablesReference, expanded) => set(state => {
    const newSet = new Set(state.expandedVariables);
    if (expanded) {
      newSet.add(variablesReference);
    } else {
      newSet.delete(variablesReference);
    }
    return {
      expandedVariables: newSet
    };
  }),
  isVariableExpanded: variablesReference => {
    return get().expandedVariables.has(variablesReference);
  },
  setScopes: scopes => set({
    scopes
  }),
  setCallStack: callStack => set({
    callStack
  }),
  setThreads: threads => set({
    threads
  }),
  setSelectedThread: threadId => set({
    selectedThread: threadId
  }),
  setStoppedLocation: (thread, file, line) => set({
    stoppedThread: thread,
    stoppedFile: file,
    stoppedLine: line
  }),
  appendOutput: text => set(state => ({
    output: [...state.output, text]
  })),
  clearOutput: () => set({
    output: []
  }),
  setError: error => set({
    error
  }),
  addWatchExpression: expression => set(state => ({
    watchExpressions: [...state.watchExpressions, {
      id: `watch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      expression
    }]
  })),
  removeWatchExpression: id => set(state => ({
    watchExpressions: state.watchExpressions.filter(w => w.id !== id)
  })),
  updateWatchExpression: (id, updates) => set(state => ({
    watchExpressions: state.watchExpressions.map(w => w.id === id ? {
      ...w,
      ...updates
    } : w)
  })),
  clearWatchExpressions: () => set({
    watchExpressions: []
  }),
  setExceptionFilters: filters => set({
    exceptionFilters: filters
  }),
  toggleExceptionFilter: filter => set(state => ({
    exceptionFilters: state.exceptionFilters.map(f => f.filter === filter ? {
      ...f,
      enabled: !f.enabled
    } : f)
  })),
  reset: () => set(initialState)
}));