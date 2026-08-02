import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { useDebugStore } from '../stores/DebugStore';
import { useEditorStore } from '../stores/EditorStore';
import { readFile, writeFile } from '../utils/fileSystem';
import type { DebugBreakpoint, DebugVariable, DebugStackFrame, DebugThread, DebugConfiguration } from './debug/dap-types';
interface DapResponseEvent {
  session_id: string;
  request_seq: number;
  command: string;
  success: boolean;
  body: any;
  message?: string;
}
interface SessionLaunch {
  request: 'launch' | 'attach';
  arguments: Record<string, unknown>;
}
export function resolveDebugConfiguration(config: DebugConfiguration, projectPath: string, activeFile: string): {
  program: string;
  cwd: string;
  args: string[];
  launch: SessionLaunch;
} {
  const resolveString = (value: string) => value.split('${workspaceFolder}').join(projectPath).split('${file}').join(activeFile);
  const program = resolveString(config.program || '${file}');
  const cwd = resolveString(config.cwd || projectPath);
  const args = (config.args || []).map(resolveString);
  const launchArguments: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (key === 'type' || key === 'name' || key === 'request') continue;
    if (typeof value === 'string') launchArguments[key] = resolveString(value);else if (Array.isArray(value)) {
      launchArguments[key] = value.map(item => typeof item === 'string' ? resolveString(item) : item);
    } else launchArguments[key] = value;
  }
  launchArguments.program = program;
  launchArguments.cwd = cwd;
  launchArguments.args = args;
  return {
    program,
    cwd,
    args,
    launch: {
      request: config.request,
      arguments: launchArguments
    }
  };
}
interface DapStoppedEvent {
  session_id: string;
  body: {
    reason: string;
    threadId?: number;
    preserveFocusHint?: boolean;
    text?: string;
    allThreadsStopped?: boolean;
    hitBreakpointIds?: number[];
  };
}
interface DapContinuedEvent {
  session_id: string;
  body: {
    threadId?: number;
    allThreadsContinued?: boolean;
  };
}
interface DapTerminatedEvent {
  session_id: string;
  body?: any;
}
interface DapOutputEvent {
  session_id: string;
  body: {
    category?: string;
    output: string;
    source?: any;
    line?: number;
    column?: number;
    data?: any;
  };
}
interface DapEvent {
  session_id: string;
  event: string;
  body?: unknown;
}
class DebugService {
  private responseListeners: Map<number, (response: DapResponseEvent) => void> = new Map();
  private eventUnlisteners: Map<string, UnlistenFn[]> = new Map();
  private sessionLaunches: Map<string, SessionLaunch> = new Map();
  private seqCounter = 1000;
  private nextSeq(): number {
    return ++this.seqCounter;
  }
  async startSession(adapterType: string, program: string, cwd?: string, args?: string[], launch?: SessionLaunch): Promise<string> {
    const sessionId = await invoke<string>('debug_new_session_id');
    const store = useDebugStore.getState();
    store.setSession(sessionId, adapterType);
    store.setStatus('starting');
    store.clearOutput();
    store.setError(null);
    this.sessionLaunches.set(sessionId, launch ?? {
      request: 'launch',
      arguments: {
        program,
        cwd,
        args: args ?? []
      }
    });
    await this.setupSessionListeners(sessionId);
    try {
      await invoke('debug_start_session', {
        request: {
          sessionId,
          adapterType,
          program,
          cwd: cwd ?? null,
          args: args ?? null,
          extra: null
        }
      });
    } catch (error) {
      this.removeSessionListeners(sessionId);
      this.sessionLaunches.delete(sessionId);
      store.setSession(null, '');
      store.setStatus('idle');
      store.setError(error instanceof Error ? error.message : String(error));
      throw error;
    }
    return sessionId;
  }
  async sendRequest(sessionId: string, command: string, args?: Record<string, unknown>): Promise<number> {
    const seq = await invoke<number>('debug_send_request', {
      request: {
        sessionId,
        command,
        arguments: args ?? null,
        clientSeq: null
      }
    });
    return seq;
  }
  async sendRequestAndWait(sessionId: string, command: string, args?: Record<string, unknown>, timeoutMs = 10000): Promise<DapResponseEvent> {
    const seq = this.nextSeq();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.responseListeners.delete(seq);
        reject(new Error(`Request ${command} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.responseListeners.set(seq, response => {
        clearTimeout(timeout);
        this.responseListeners.delete(seq);
        resolve(response);
      });
      invoke<number>('debug_send_request', {
        request: {
          sessionId,
          command,
          arguments: args ?? null,
          clientSeq: seq
        }
      }).then(requestSeq => {
        if (requestSeq !== seq) {
          const listener = this.responseListeners.get(seq);
          if (listener) {
            this.responseListeners.delete(seq);
            this.responseListeners.set(requestSeq, listener);
          }
        }
      }).catch(err => {
        clearTimeout(timeout);
        this.responseListeners.delete(seq);
        reject(err);
      });
    });
  }
  async stopSession(sessionId: string): Promise<void> {
    await invoke('debug_stop_session', {
      sessionId
    });
    this.removeSessionListeners(sessionId);
    this.sessionLaunches.delete(sessionId);
    const store = useDebugStore.getState();
    store.setStatus('terminated');
    store.setSession(null, '');
  }
  private async setupSessionListeners(sessionId: string): Promise<void> {
    const unlistenFns: UnlistenFn[] = [];
    const unlistenResponse = await listen<DapResponseEvent>(`debug:${sessionId}:response`, event => {
      const response = event.payload;
      const listener = this.responseListeners.get(response.request_seq);
      if (listener) {
        listener(response);
      }
      this.handleResponse(sessionId, response, Boolean(listener));
    });
    unlistenFns.push(unlistenResponse);
    const unlistenEvent = await listen<DapEvent>(`debug:${sessionId}:event`, event => {
      if (event.payload.event === 'initialized') {
        void this.finishConfiguration(sessionId);
      }
    });
    unlistenFns.push(unlistenEvent);
    const unlistenStopped = await listen<DapStoppedEvent>(`debug:${sessionId}:stopped`, event => {
      const {
        body
      } = event.payload;
      const store = useDebugStore.getState();
      store.setStatus('stopped');
      if (body.threadId !== undefined) {
        store.setStoppedLocation(body.threadId, null, null);
      }
      this.handleStopped(sessionId, body.threadId);
    });
    unlistenFns.push(unlistenStopped);
    const unlistenContinued = await listen<DapContinuedEvent>(`debug:${sessionId}:continued`, () => {
      const store = useDebugStore.getState();
      store.setStatus('running');
      store.setStoppedLocation(null, null, null);
    });
    unlistenFns.push(unlistenContinued);
    const unlistenTerminated = await listen<DapTerminatedEvent>(`debug:${sessionId}:terminated`, () => {
      const store = useDebugStore.getState();
      store.setStatus('terminated');
      store.setSession(null, '');
      this.sessionLaunches.delete(sessionId);
      this.removeSessionListeners(sessionId);
    });
    unlistenFns.push(unlistenTerminated);
    const unlistenOutput = await listen<DapOutputEvent>(`debug:${sessionId}:output`, event => {
      const store = useDebugStore.getState();
      store.appendOutput(event.payload.body.output);
    });
    unlistenFns.push(unlistenOutput);
    this.eventUnlisteners.set(sessionId, unlistenFns);
  }
  private removeSessionListeners(sessionId: string): void {
    const fns = this.eventUnlisteners.get(sessionId);
    if (fns) {
      fns.forEach(fn => fn());
      this.eventUnlisteners.delete(sessionId);
    }
  }
  private handleResponse(sessionId: string, response: DapResponseEvent, awaited: boolean): void {
    const store = useDebugStore.getState();
    if (!response.success) {
      store.setError(response.message || `Command ${response.command} failed`);
      return;
    }
    switch (response.command) {
      case 'initialize':
        if (response.body?.exceptionBreakpointFilters) {
          const filters = response.body.exceptionBreakpointFilters.map((f: any) => ({
            filter: f.filter,
            label: f.label || f.filter,
            enabled: f.default ?? false,
            supportsCondition: f.supportsCondition
          }));
          store.setExceptionFilters(filters);
        }
        void this.beginLaunch(sessionId);
        break;
      case 'setBreakpoints':
        break;
      case 'threads':
        if (response.body?.threads) {
          const threads: DebugThread[] = response.body.threads.map((t: any) => ({
            id: t.id,
            name: t.name,
            stopped: false
          }));
          store.setThreads(threads);
        }
        break;
      case 'stackTrace':
        if (response.body?.stackFrames) {
          const frames: DebugStackFrame[] = response.body.stackFrames.map((f: any) => ({
            id: f.id,
            name: f.name,
            file: f.source?.path || f.source?.name || '<unknown>',
            line: f.line,
            column: f.column
          }));
          store.setCallStack(frames);
        }
        break;
      case 'scopes':
        if (response.body?.scopes) {
          const scopes = response.body.scopes;
          store.setScopes(scopes);
        }
        break;
      case 'variables':
        break;
      case 'continue':
        store.setStatus('running');
        store.setStoppedLocation(null, null, null);
        break;
      case 'next':
      case 'stepIn':
      case 'stepOut':
        break;
      case 'evaluate':
        if (response.body && !awaited) {
          const result = response.body.result;
          const type = response.body.type;
          store.appendOutput(`← ${result}${type ? ` (${type})` : ''}`);
        }
        break;
      case 'disconnect':
        store.setStatus('terminated');
        break;
    }
  }
  private async beginLaunch(sessionId: string): Promise<void> {
    const launch = this.sessionLaunches.get(sessionId);
    if (!launch) return;
    try {
      await this.sendRequest(sessionId, launch.request, launch.arguments);
    } catch (error) {
      useDebugStore.getState().setError(error instanceof Error ? error.message : String(error));
      await this.stopSession(sessionId).catch(() => undefined);
    }
  }
  private async finishConfiguration(sessionId: string): Promise<void> {
    try {
      const store = useDebugStore.getState();
      const breakpointsByFile = new Map<string, DebugBreakpoint[]>();
      for (const breakpoint of store.breakpoints.filter(bp => bp.enabled)) {
        const entries = breakpointsByFile.get(breakpoint.file) ?? [];
        entries.push(breakpoint);
        breakpointsByFile.set(breakpoint.file, entries);
      }
      for (const [file, breakpoints] of breakpointsByFile) {
        await this.syncFileBreakpoints(sessionId, file, breakpoints);
      }
      const filters = store.exceptionFilters.filter(filter => filter.enabled).map(filter => filter.filter);
      await this.sendRequestAndWait(sessionId, 'setExceptionBreakpoints', {
        filters
      });
      await this.sendRequestAndWait(sessionId, 'configurationDone');
      store.setStatus('running');
    } catch (error) {
      useDebugStore.getState().setError(error instanceof Error ? error.message : String(error));
      await this.stopSession(sessionId).catch(() => undefined);
    }
  }
  private async handleStopped(sessionId: string, threadId?: number): Promise<void> {
    const store = useDebugStore.getState();
    if (threadId === undefined) return;
    try {
      const threadsResponse = await this.sendRequestAndWait(sessionId, 'threads');
      if (threadsResponse.body?.threads) {
        store.setThreads(threadsResponse.body.threads.map((thread: {
          id: number;
          name: string;
        }) => ({
          ...thread,
          stopped: thread.id === threadId
        })));
      }
      store.setStatus('stopped');
      const stackResponse = await this.sendRequestAndWait(sessionId, 'stackTrace', {
        threadId,
        startFrame: 0,
        levels: 20
      });
      const frames: DebugStackFrame[] = (stackResponse.body?.stackFrames ?? []).map((frame: {
        id: number;
        name: string;
        source?: {
          path?: string;
          name?: string;
        };
        line: number;
        column: number;
      }) => ({
        id: frame.id,
        name: frame.name,
        file: frame.source?.path || frame.source?.name || '<unknown>',
        line: frame.line,
        column: frame.column
      }));
      store.setCallStack(frames);
      const topFrame = frames[0];
      store.setStoppedLocation(threadId, topFrame?.file ?? null, topFrame?.line ?? null);
      if (topFrame) {
        await this.fetchScopesForFrame(sessionId, topFrame.id);
      }
    } catch (error) {
      console.error('[DebugService] Error handling stopped event:', error);
    }
  }
  async expandVariable(sessionId: string, variablesReference: number): Promise<void> {
    try {
      const response = await this.sendRequestAndWait(sessionId, 'variables', {
        variablesReference
      });
      const variables = this.toDebugVariables(response.body?.variables ?? []);
      useDebugStore.getState().setVariablesForReference(variablesReference, variables);
    } catch (error) {
      console.error('[DebugService] Error expanding variable:', error);
    }
  }
  async setVariable(sessionId: string, variablesReference: number, variableName: string, value: string): Promise<void> {
    await this.sendRequest(sessionId, 'setVariable', {
      variablesReference,
      name: variableName,
      value
    });
  }
  async fetchStackTraceForThread(sessionId: string, threadId: number): Promise<void> {
    const response = await this.sendRequestAndWait(sessionId, 'stackTrace', {
      threadId,
      startFrame: 0,
      levels: 20
    });
    const frames = (response.body?.stackFrames ?? []).map((frame: {
      id: number;
      name: string;
      source?: {
        path?: string;
        name?: string;
      };
      line: number;
      column: number;
    }) => ({
      id: frame.id,
      name: frame.name,
      file: frame.source?.path || frame.source?.name || '<unknown>',
      line: frame.line,
      column: frame.column
    }));
    useDebugStore.getState().setCallStack(frames);
  }
  async fetchScopesForFrame(sessionId: string, frameId: number): Promise<void> {
    const response = await this.sendRequestAndWait(sessionId, 'scopes', {
      frameId
    });
    const scopes = response.body?.scopes ?? [];
    const store = useDebugStore.getState();
    store.setScopes(scopes);
    await Promise.all(scopes.map(async (scope: {
      variablesReference: number;
    }) => {
      if (scope.variablesReference <= 0) return;
      const variablesResponse = await this.sendRequestAndWait(sessionId, 'variables', {
        variablesReference: scope.variablesReference
      });
      store.setScopeVariables(scope.variablesReference, this.toDebugVariables(variablesResponse.body?.variables ?? []));
    }));
  }
  private toDebugVariables(variables: Array<{
    name: string;
    value: string;
    type?: string;
    variablesReference: number;
  }>): DebugVariable[] {
    return variables.map(variable => ({
      ...variable,
      expanded: false,
      children: []
    }));
  }
  async setBreakpoint(sessionId: string, file: string, line: number): Promise<void> {
    const store = useDebugStore.getState();
    const localBp: DebugBreakpoint = {
      id: `${file}:${line}`,
      file,
      line,
      enabled: true
    };
    const existing = store.breakpoints.find(bp => bp.id === localBp.id);
    if (existing) store.updateBreakpoint(existing.id, localBp);else store.addBreakpoint(localBp);
    await this.syncFileBreakpoints(sessionId, file);
  }
  async setConditionalBreakpoint(sessionId: string, file: string, line: number, condition: string, hitCondition?: string): Promise<void> {
    const store = useDebugStore.getState();
    const localBp: DebugBreakpoint = {
      id: `${file}:${line}`,
      file,
      line,
      enabled: true,
      condition: condition || undefined,
      hitCondition: hitCondition || undefined
    };
    const existing = store.breakpoints.find(bp => bp.id === localBp.id);
    if (existing) store.updateBreakpoint(existing.id, localBp);else store.addBreakpoint(localBp);
    await this.syncFileBreakpoints(sessionId, file);
  }
  async setLogPoint(sessionId: string, file: string, line: number, logMessage: string): Promise<void> {
    const store = useDebugStore.getState();
    const localBp: DebugBreakpoint = {
      id: `${file}:${line}`,
      file,
      line,
      enabled: true,
      logMessage
    };
    const existing = store.breakpoints.find(bp => bp.id === localBp.id);
    if (existing) store.updateBreakpoint(existing.id, localBp);else store.addBreakpoint(localBp);
    await this.syncFileBreakpoints(sessionId, file);
  }
  async removeBreakpoint(sessionId: string, breakpointId: string): Promise<void> {
    const store = useDebugStore.getState();
    const bp = store.breakpoints.find(b => b.id === breakpointId);
    if (!bp) return;
    store.removeBreakpoint(breakpointId);
    await this.syncFileBreakpoints(sessionId, bp.file);
  }
  async toggleBreakpoint(sessionId: string, breakpointId: string): Promise<void> {
    const store = useDebugStore.getState();
    const bp = store.breakpoints.find(b => b.id === breakpointId);
    if (!bp) return;
    store.toggleBreakpoint(breakpointId);
    await this.syncFileBreakpoints(sessionId, bp.file);
  }
  async syncFileBreakpoints(sessionId: string, file: string, supplied?: DebugBreakpoint[]): Promise<void> {
    const store = useDebugStore.getState();
    const local = (supplied ?? store.breakpoints.filter(bp => bp.file === file)).filter(bp => bp.enabled);
    const response = await this.sendRequestAndWait(sessionId, 'setBreakpoints', {
      source: {
        path: file
      },
      breakpoints: local.map(({
        line,
        condition,
        hitCondition,
        logMessage
      }) => ({
        line,
        ...(condition ? {
          condition
        } : {}),
        ...(hitCondition ? {
          hitCondition
        } : {}),
        ...(logMessage ? {
          logMessage
        } : {})
      }))
    });
    if (!response.success) throw new Error(response.message || 'setBreakpoints failed');
    const remote = response.body?.breakpoints ?? [];
    local.forEach((breakpoint, index) => {
      const result = remote[index];
      if (result) {
        store.updateBreakpoint(breakpoint.id, {
          verified: result.verified,
          adapterId: result.id,
          message: result.message
        });
      }
    });
  }
  async continue(sessionId: string, threadId?: number): Promise<void> {
    await this.sendRequest(sessionId, 'continue', {
      threadId: threadId ?? useDebugStore.getState().stoppedThread ?? 1
    });
  }
  async next(sessionId: string, threadId?: number): Promise<void> {
    await this.sendRequest(sessionId, 'next', {
      threadId: threadId ?? useDebugStore.getState().stoppedThread ?? 1
    });
  }
  async stepIn(sessionId: string, threadId?: number): Promise<void> {
    await this.sendRequest(sessionId, 'stepIn', {
      threadId: threadId ?? useDebugStore.getState().stoppedThread ?? 1
    });
  }
  async stepOut(sessionId: string, threadId?: number): Promise<void> {
    await this.sendRequest(sessionId, 'stepOut', {
      threadId: threadId ?? useDebugStore.getState().stoppedThread ?? 1
    });
  }
  async pause(sessionId: string, threadId?: number): Promise<void> {
    await this.sendRequest(sessionId, 'pause', {
      threadId: threadId ?? 1
    });
  }
  async evaluate(sessionId: string, expression: string, frameId?: number): Promise<string> {
    await this.sendRequest(sessionId, 'evaluate', {
      expression,
      frameId: frameId ?? useDebugStore.getState().callStack[0]?.id,
      context: 'repl'
    });
    return expression;
  }
  async setExceptionBreakpoints(sessionId: string, filters: string[]): Promise<void> {
    await this.sendRequest(sessionId, 'setExceptionBreakpoints', {
      filters
    });
  }
  async evaluateForWatch(sessionId: string, expression: string, frameId?: number, watchId?: string): Promise<void> {
    const response = await this.sendRequestAndWait(sessionId, 'evaluate', {
      expression,
      frameId: frameId ?? useDebugStore.getState().callStack[0]?.id,
      context: 'watch'
    });
    const watch = useDebugStore.getState().watchExpressions.find(item => watchId ? item.id === watchId : item.expression === expression);
    if (watch && response.success && response.body) {
      useDebugStore.getState().updateWatchExpression(watch.id, {
        value: response.body.result,
        type: response.body.type,
        variablesReference: response.body.variablesReference
      });
    }
  }
  async evaluateForHover(sessionId: string, expression: string, frameId?: number): Promise<{
    value: string;
    type?: string;
  } | null> {
    const response = await this.sendRequestAndWait(sessionId, 'evaluate', {
      expression,
      frameId: frameId ?? useDebugStore.getState().callStack[0]?.id,
      context: 'hover'
    });
    if (response.success && response.body) {
      return {
        value: response.body.result,
        type: response.body.type
      };
    }
    return null;
  }
  async restart(sessionId: string): Promise<void> {
    await this.sendRequest(sessionId, 'restart', {});
  }
  async loadLaunchConfigurations(projectPath: string): Promise<DebugConfiguration[]> {
    try {
      const launchJsonPath = `${projectPath}/.vscode/launch.json`;
      const fileContent = await readFile(launchJsonPath, false);
      const launchConfig = JSON.parse(fileContent.content);
      return launchConfig.configurations || [];
    } catch (error) {
      console.warn('[DebugService] Failed to load launch.json:', error);
      return [];
    }
  }
  async saveLaunchConfigurations(projectPath: string, configurations: DebugConfiguration[]): Promise<void> {
    try {
      const launchJsonPath = `${projectPath}/.vscode/launch.json`;
      const content = JSON.stringify({
        version: '0.2.0',
        configurations
      }, null, 2);
      await writeFile(launchJsonPath, content);
      const store = useDebugStore.getState();
      store.setLaunchConfigurations(configurations);
    } catch (error) {
      console.error('[DebugService] Failed to save launch.json:', error);
      throw error;
    }
  }
  async createDefaultLaunchJson(projectPath: string): Promise<DebugConfiguration[]> {
    const defaultConfigs: DebugConfiguration[] = [{
      type: 'node',
      name: '调试当前文件',
      request: 'launch',
      program: '${file}',
      skipFiles: ['<node_internals>/**']
    }];
    await this.saveLaunchConfigurations(projectPath, defaultConfigs);
    return defaultConfigs;
  }
  async startSessionWithConfig(config: DebugConfiguration, projectPath: string): Promise<string> {
    const adapterType = config.type || 'node';
    const activeTabId = useEditorStore.getState().activeTab;
    const activeFile = useEditorStore.getState().tabs.find(tab => tab.id === activeTabId)?.id || '';
    const resolved = resolveDebugConfiguration(config, projectPath, activeFile);
    return this.startSession(adapterType, resolved.program, resolved.cwd, resolved.args, resolved.launch);
  }
  dispose(): void {
    this.eventUnlisteners.forEach(fns => {
      fns.forEach(fn => fn());
    });
    this.eventUnlisteners.clear();
    this.responseListeners.clear();
  }
}
export const debugService = new DebugService();