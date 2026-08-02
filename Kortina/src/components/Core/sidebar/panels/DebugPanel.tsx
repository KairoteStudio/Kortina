import React, { useState, useCallback, useEffect } from 'react';
import { Play, Pause, ArrowDown, ArrowUp, ArrowRight, RotateCcw, Bug, XCircle, AlertTriangle, Info, ChevronRight, ChevronDown, Terminal as TerminalIcon, Square, Circle, Eye, Plus, Trash2, Filter, Edit2, Check, X, MessageSquare } from 'lucide-react';
import { useDebugStore } from '../../../../stores/DebugStore';
import { debugService } from '../../../../services/DebugService';
import { useEditorStore } from '../../../../stores/EditorStore';
import { useProjectStore } from '../../../../stores/ProjectStore';
import { readFile } from '../../../../utils/fileSystem';
import { detectLanguage } from '../../../../utils/languageDetection';
import './PanelStyles.css';
type DebugTab = 'variables' | 'watch' | 'breakpoints' | 'callstack' | 'output';
interface ConsoleHistoryEntry {
  command: string;
  timestamp: number;
}
export const DebugPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DebugTab>('variables');
  const [outputInput, setOutputInput] = useState('');
  const [newWatchExpr, setNewWatchExpr] = useState('');
  const [consoleHistory, setConsoleHistory] = useState<ConsoleHistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [expandedVars, setExpandedVars] = useState<Set<string>>(new Set());
  const [editingVariable, setEditingVariable] = useState<{
    name: string;
    variablesReference: number;
    scopeReference: number;
  } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newBreakpointCondition, setNewBreakpointCondition] = useState<{
    file: string;
    line: number;
    condition: string;
    hitCondition: string;
    logMessage: string;
  } | null>(null);
  const [selectedFrameId, setSelectedFrameId] = useState<number | null>(null);
  const {
    sessionId,
    status,
    breakpoints,
    variables,
    scopes,
    callStack,
    output,
    error,
    stoppedThread,
    launchConfigurations,
    selectedConfiguration,
    watchExpressions,
    exceptionFilters,
    threads,
    selectedThread,
    scopeVariablesMap,
    variablesMap
  } = useDebugStore();
  const {
    activeTab: activeEditorTabId,
    tabs
  } = useEditorStore();
  const {
    currentProjectPath
  } = useProjectStore();
  const isDebugging = sessionId !== null && status !== 'idle' && status !== 'terminated';
  const isStopped = status === 'stopped';
  const isRunning = status === 'running';
  const activeEditorTab = tabs.find(tab => tab.id === activeEditorTabId);
  const currentFilePath = activeEditorTab?.id || '';
  const currentFileName = currentFilePath.split('/').pop() || currentFilePath.split('\\').pop() || '';
  useEffect(() => {
    if (currentProjectPath) {
      debugService.loadLaunchConfigurations(currentProjectPath).then(configs => {
        useDebugStore.getState().setLaunchConfigurations(configs);
      });
    }
  }, [currentProjectPath]);
  useEffect(() => {
    if (status === 'stopped' && sessionId && watchExpressions.length > 0) {
      for (const w of watchExpressions) {
        debugService.evaluateForWatch(sessionId, w.expression, undefined, w.id);
      }
    }
  }, [status, sessionId, watchExpressions]);
  const getAdapterTypeForFile = useCallback((filePath: string): string | null => {
    if (filePath.endsWith('.js') || filePath.endsWith('.ts') || filePath.endsWith('.mjs')) {
      return 'node';
    }
    if (filePath.endsWith('.py')) {
      return 'debugpy';
    }
    return null;
  }, []);
  const startDebugging = useCallback(async () => {
    if (!currentFilePath) return;
    try {
      if (selectedConfiguration) {
        const config = launchConfigurations.find(c => c.name === selectedConfiguration);
        if (config) {
          await debugService.startSessionWithConfig(config, currentProjectPath || '');
          return;
        }
      }
      const adapterType = getAdapterTypeForFile(currentFilePath);
      if (!adapterType) {
        useDebugStore.getState().setError('该文件需要在 .vscode/launch.json 中配置真正的可执行程序和 DAP 适配器');
        return;
      }
      const cwd = currentProjectPath || currentFilePath.substring(0, currentFilePath.lastIndexOf('/'));
      await debugService.startSession(adapterType, currentFilePath, cwd);
    } catch (err) {
      console.error('[DebugPanel] Failed to start debugging:', err);
    }
  }, [currentFilePath, currentProjectPath, getAdapterTypeForFile, selectedConfiguration, launchConfigurations]);
  const stopDebugging = useCallback(async () => {
    if (!sessionId) return;
    try {
      await debugService.stopSession(sessionId);
    } catch (err) {
      console.error('[DebugPanel] Failed to stop debugging:', err);
    }
  }, [sessionId]);
  const handleContinue = useCallback(async () => {
    if (!sessionId) return;
    await debugService.continue(sessionId, stoppedThread ?? undefined);
  }, [sessionId, stoppedThread]);
  const handlePause = useCallback(async () => {
    if (!sessionId) return;
    await debugService.pause(sessionId, stoppedThread ?? undefined);
  }, [sessionId, stoppedThread]);
  const handleStepOver = useCallback(async () => {
    if (!sessionId) return;
    await debugService.next(sessionId, stoppedThread ?? undefined);
  }, [sessionId, stoppedThread]);
  const handleStepInto = useCallback(async () => {
    if (!sessionId) return;
    await debugService.stepIn(sessionId, stoppedThread ?? undefined);
  }, [sessionId, stoppedThread]);
  const handleStepOut = useCallback(async () => {
    if (!sessionId) return;
    await debugService.stepOut(sessionId, stoppedThread ?? undefined);
  }, [sessionId, stoppedThread]);
  const handleRestart = useCallback(async () => {
    if (!sessionId) return;
    await debugService.restart(sessionId);
  }, [sessionId]);
  const toggleBreakpoint = useCallback(async (id: string) => {
    if (!sessionId) return;
    await debugService.toggleBreakpoint(sessionId, id);
  }, [sessionId]);
  const removeBreakpoint = useCallback(async (id: string) => {
    if (!sessionId) return;
    await debugService.removeBreakpoint(sessionId, id);
  }, [sessionId]);
  const handleEvaluate = useCallback(async () => {
    if (!sessionId || !outputInput.trim()) return;
    await debugService.evaluate(sessionId, outputInput);
    setOutputInput('');
  }, [sessionId, outputInput]);
  const handleOutputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEvaluate();
      if (outputInput.trim()) {
        setConsoleHistory(prev => [...prev, {
          command: outputInput.trim(),
          timestamp: Date.now()
        }]);
        setHistoryIndex(-1);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (consoleHistory.length > 0) {
        const newIndex = historyIndex === -1 ? consoleHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setOutputInput(consoleHistory[newIndex].command);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= consoleHistory.length) {
          setHistoryIndex(-1);
          setOutputInput('');
        } else {
          setHistoryIndex(newIndex);
          setOutputInput(consoleHistory[newIndex].command);
        }
      }
    }
  }, [handleEvaluate, outputInput, consoleHistory, historyIndex]);
  const toggleVarExpanded = useCallback(async (variable: any) => {
    const varKey = variable.name;
    setExpandedVars(prev => {
      const next = new Set(prev);
      if (next.has(varKey)) {
        next.delete(varKey);
      } else {
        next.add(varKey);
        if (sessionId && variable.variablesReference > 0) {
          debugService.expandVariable(sessionId, variable.variablesReference);
        }
      }
      return next;
    });
  }, [sessionId]);
  const addWatchExpression = useCallback(() => {
    if (!newWatchExpr.trim()) return;
    const trimmedExpr = newWatchExpr.trim();
    useDebugStore.getState().addWatchExpression(trimmedExpr);
    const watches = useDebugStore.getState().watchExpressions;
    const watch = watches[watches.length - 1];
    setNewWatchExpr('');
    if (sessionId && status === 'stopped') {
      debugService.evaluateForWatch(sessionId, trimmedExpr, undefined, watch?.id);
    }
  }, [newWatchExpr, sessionId, status]);
  const removeWatchExpression = useCallback((id: string) => {
    useDebugStore.getState().removeWatchExpression(id);
  }, []);
  const toggleExceptionFilter = useCallback((filter: string) => {
    useDebugStore.getState().toggleExceptionFilter(filter);
    if (sessionId) {
      const updatedFilters = useDebugStore.getState().exceptionFilters;
      const enabledFilters = updatedFilters.filter(f => f.enabled).map(f => f.filter);
      debugService.setExceptionBreakpoints(sessionId, enabledFilters);
    }
  }, [sessionId]);
  const startEditingVariable = useCallback((variable: any, scopeReference: number) => {
    setEditingVariable({
      name: variable.name,
      variablesReference: variable.variablesReference,
      scopeReference
    });
    setEditValue(variable.value);
  }, []);
  const cancelEditingVariable = useCallback(() => {
    setEditingVariable(null);
    setEditValue('');
  }, []);
  const saveVariableValue = useCallback(async () => {
    if (!sessionId || !editingVariable) return;
    const scope = scopes.find(s => s.variablesReference === editingVariable.scopeReference);
    if (scope) {
      await debugService.setVariable(sessionId, scope.variablesReference, editingVariable.name, editValue);
    }
    setEditingVariable(null);
    setEditValue('');
  }, [sessionId, editingVariable, editValue, scopes]);
  const handleSelectThread = useCallback(async (threadId: number) => {
    if (!sessionId) return;
    useDebugStore.getState().setSelectedThread(threadId);
    await debugService.fetchStackTraceForThread(sessionId, threadId);
    const callStack = useDebugStore.getState().callStack;
    if (callStack.length > 0) {
      await debugService.fetchScopesForFrame(sessionId, callStack[0].id);
    }
  }, [sessionId]);
  const handleSelectFrame = useCallback(async (frame: typeof callStack[number]) => {
    if (!sessionId) return;
    setSelectedFrameId(frame.id);
    useDebugStore.getState().setStoppedLocation(stoppedThread, frame.file, frame.line);
    const editorStore = useEditorStore.getState();
    const existingTab = editorStore.tabs.find(item => item.id === frame.file);
    if (existingTab) {
      editorStore.setActiveTab(existingTab.id);
      editorStore.setEditorContent(existingTab.content);
    } else if (frame.file !== '<unknown>') {
      try {
        const file = await readFile(frame.file);
        const name = frame.file.split('/').pop() || frame.file.split('\\').pop() || frame.file;
        editorStore.addTab({
          id: frame.file,
          name,
          content: file.content,
          isDirty: false,
          language: detectLanguage(name)
        });
        editorStore.setActiveTab(frame.file);
        editorStore.setEditorContent(file.content);
      } catch (error) {
        useDebugStore.getState().setError(`无法打开栈帧文件: ${String(error)}`);
      }
    }
    await debugService.fetchScopesForFrame(sessionId, frame.id);
  }, [sessionId, stoppedThread]);
  const handleSetConditionalBreakpoint = useCallback(async () => {
    if (!newBreakpointCondition || !sessionId) return;
    const {
      file,
      line,
      condition,
      hitCondition,
      logMessage
    } = newBreakpointCondition;
    if (logMessage) {
      await debugService.setLogPoint(sessionId, file, line, logMessage);
    } else {
      await debugService.setConditionalBreakpoint(sessionId, file, line, condition, hitCondition);
    }
    setNewBreakpointCondition(null);
  }, [newBreakpointCondition, sessionId]);
  return <div className="sidebar-panel debug-panel">
      {}
      <div className="panel-header debug-panel-header">
        <span className="panel-title">调试</span>
        {}
        {launchConfigurations.length > 0 && !isDebugging && <select className="launch-config-selector" value={selectedConfiguration || ''} onChange={e => useDebugStore.getState().setSelectedConfiguration(e.target.value || null)} title="选择调试配置">
            <option value="">默认配置</option>
            {launchConfigurations.map(config => <option key={config.name} value={config.name}>
                {config.name}
              </option>)}
          </select>}
        <div className="panel-actions debug-controls">
          {!isDebugging ? <button className="panel-action-btn start-debug" onClick={startDebugging} disabled={!currentFilePath} title={currentFilePath ? '开始调试' : '打开一个文件以开始调试'}>
              <Play size={14} />
            </button> : <>
              {isRunning ? <button className="panel-action-btn" onClick={handlePause} title="暂停">
                  <Pause size={14} />
                </button> : <button className="panel-action-btn" onClick={handleContinue} title="继续">
                  <Play size={14} />
                </button>}
              <button className="panel-action-btn" onClick={handleStepOver} disabled={!isStopped} title="单步跳过">
                <ArrowRight size={14} />
              </button>
              <button className="panel-action-btn" onClick={handleStepInto} disabled={!isStopped} title="单步进入">
                <ArrowDown size={14} />
              </button>
              <button className="panel-action-btn" onClick={handleStepOut} disabled={!isStopped} title="单步跳出">
                <ArrowUp size={14} />
              </button>
              <button className="panel-action-btn" onClick={handleRestart} title="重启">
                <RotateCcw size={14} />
              </button>
              <button className="panel-action-btn stop-debug" onClick={stopDebugging} title="停止">
                <Square size={14} />
              </button>
            </>}
        </div>
      </div>

      {}
      {isDebugging && <div className={`debug-status-bar status-${status}`}>
          <Circle size={8} className="status-dot" />
          <span className="status-text">
            {status === 'starting' && '正在启动...'}
            {status === 'running' && '运行中'}
            {status === 'stopped' && `已停止 (线程 ${stoppedThread ?? '?'})`}
          </span>
        </div>}

      {}
      {error && <div className="debug-error-bar">
          <AlertTriangle size={12} />
          <span>{error}</span>
          <button onClick={() => useDebugStore.getState().setError(null)}>
            <XCircle size={12} />
          </button>
        </div>}

      {}
      <div className="panel-content debug-panel-content">
        {!isDebugging ? <div className="debug-placeholder">
            <Bug size={48} opacity={0.3} />
            <p>{currentFilePath ? '点击播放按钮开始调试当前文件' : '打开一个文件以开始调试'}</p>
            <span>
              {currentFilePath ? `当前文件: ${currentFileName}` : '在编辑器中点击行号可设置断点'}
            </span>
          </div> : <>
            {}
            <div className="debug-tabs">
              <button className={`debug-tab ${activeTab === 'variables' ? 'active' : ''}`} onClick={() => setActiveTab('variables')}>
                变量
              </button>
              <button className={`debug-tab ${activeTab === 'watch' ? 'active' : ''}`} onClick={() => setActiveTab('watch')}>
                监视 ({watchExpressions.length})
              </button>
              <button className={`debug-tab ${activeTab === 'breakpoints' ? 'active' : ''}`} onClick={() => setActiveTab('breakpoints')}>
                断点 ({breakpoints.length})
              </button>
              <button className={`debug-tab ${activeTab === 'callstack' ? 'active' : ''}`} onClick={() => setActiveTab('callstack')}>
                调用堆栈
              </button>
              <button className={`debug-tab ${activeTab === 'output' ? 'active' : ''}`} onClick={() => setActiveTab('output')}>
                输出
              </button>
            </div>

            {}
            {activeTab === 'variables' && <div className="variables-list">
                {variables.length === 0 && scopes.length === 0 ? <div className="debug-empty-state">
                    <Info size={16} opacity={0.5} />
                    <span>{isStopped ? '无可用变量' : '程序未暂停'}</span>
                  </div> : <>
                    {}
                    {scopes.map(scope => {
              const scopeVars = scopeVariablesMap.get(scope.variablesReference) || [];
              return <div key={scope.name} className="scope-section">
                          <div className="scope-header">{scope.name}</div>
                          {scopeVars.length === 0 ? <div className="scope-empty">无变量</div> : scopeVars.map((v, i) => {
                  const varKey = `${scope.name}_${v.name}_${v.variablesReference}`;
                  const isExpanded = expandedVars.has(varKey);
                  const isEditing = editingVariable?.name === v.name && editingVariable?.scopeReference === scope.variablesReference;
                  const childVars = isExpanded && v.variablesReference > 0 ? variablesMap.get(v.variablesReference) || [] : [];
                  return <div key={i} className="variable-item-wrapper">
                                  <div className="variable-item">
                                    {v.variablesReference > 0 && <button className="variable-expand-btn" onClick={() => toggleVarExpanded({
                        ...v,
                        name: varKey
                      })}>
                                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                      </button>}
                                    <span className="variable-name">{v.name}</span>
                                    {isEditing ? <div className="variable-edit">
                                        <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={e => {
                          if (e.key === 'Enter') saveVariableValue();
                          if (e.key === 'Escape') cancelEditingVariable();
                        }} className="variable-edit-input" autoFocus />
                                        <button onClick={saveVariableValue} title="保存">
                                          <Check size={12} />
                                        </button>
                                        <button onClick={cancelEditingVariable} title="取消">
                                          <X size={12} />
                                        </button>
                                      </div> : <>
                                        <span className="variable-value">{v.value}</span>
                                        {v.type && <span className="variable-type">{v.type}</span>}
                                        <button className="variable-edit-btn" onClick={() => startEditingVariable(v, scope.variablesReference)} title="编辑值">
                                          <Edit2 size={10} />
                                        </button>
                                      </>}
                                  </div>
                                  {}
                                  {isExpanded && childVars.length > 0 && <div className="variable-children">
                                      {childVars.map((child, j) => <div key={j} className="variable-item child-variable">
                                          <span className="variable-name">{child.name}</span>
                                          <span className="variable-value">{child.value}</span>
                                          {child.type && <span className="variable-type">{child.type}</span>}
                                        </div>)}
                                    </div>}
                                </div>;
                })}
                        </div>;
            })}
                  </>}
              </div>}

            {}
            {activeTab === 'watch' && <div className="watch-list">
                <div className="watch-input-row">
                  <input type="text" value={newWatchExpr} onChange={e => setNewWatchExpr(e.target.value)} onKeyDown={e => {
              if (e.key === 'Enter') addWatchExpression();
            }} placeholder="添加监视表达式..." className="watch-input" />
                  <button className="watch-add-btn" onClick={addWatchExpression} disabled={!newWatchExpr.trim()} title="添加监视">
                    <Plus size={14} />
                  </button>
                </div>
                {watchExpressions.length === 0 ? <div className="debug-empty-state">
                    <Eye size={16} opacity={0.5} />
                    <span>添加表达式以监视其值</span>
                  </div> : watchExpressions.map(w => <div key={w.id} className="watch-item">
                      <span className="watch-expression">{w.expression}</span>
                      <span className="watch-value">{w.value || (isStopped ? '= ...' : '程序未暂停')}</span>
                      {w.type && <span className="watch-type">{w.type}</span>}
                      <button className="watch-remove" onClick={() => removeWatchExpression(w.id)} title="删除监视">
                        <Trash2 size={12} />
                      </button>
                    </div>)}
              </div>}

            {}
            {activeTab === 'breakpoints' && <div className="breakpoints-list">
                {}
                <div className="exception-breakpoints-section">
                  <div className="section-header">
                    <Filter size={14} />
                    <span>异常断点</span>
                  </div>
                  {exceptionFilters.length === 0 ? <div className="debug-empty-state">
                      <Info size={16} opacity={0.5} />
                      <span>调试器未提供异常过滤器</span>
                    </div> : exceptionFilters.map(ef => <div key={ef.filter} className="exception-filter-item">
                        <label className="exception-filter-label">
                          <input type="checkbox" checked={ef.enabled} onChange={() => toggleExceptionFilter(ef.filter)} />
                          <span title={ef.filter}>{ef.label}</span>
                        </label>
                      </div>)}
                </div>

                {}
                <div className="section-header">
                  <AlertTriangle size={14} />
                  <span>断点</span>
                </div>
                {breakpoints.length === 0 ? <div className="debug-empty-state">
                    <Info size={16} opacity={0.5} />
                    <span>在编辑器中点击行号设置断点</span>
                  </div> : breakpoints.map(bp => <div key={bp.id} className={`breakpoint-item ${bp.enabled ? 'enabled' : 'disabled'}`}>
                      <button className="breakpoint-toggle" onClick={() => toggleBreakpoint(bp.id)} title={bp.enabled ? '禁用断点' : '启用断点'}>
                        {bp.enabled ? <AlertTriangle size={12} /> : <Info size={12} />}
                      </button>
                      <div className="breakpoint-info">
                        <span className="breakpoint-file">
                          {bp.file.split('/').pop() || bp.file.split('\\').pop() || bp.file}
                        </span>
                        <span className="breakpoint-line">行 {bp.line}</span>
                        {bp.condition && <span className="breakpoint-condition">条件: {bp.condition}</span>}
                        {bp.hitCondition && <span className="breakpoint-hit-condition">命中: {bp.hitCondition}</span>}
                        {bp.logMessage && <span className="breakpoint-log-message">日志: {bp.logMessage}</span>}
                        {bp.verified !== undefined && <span className={`breakpoint-status ${bp.verified ? 'verified' : 'unverified'}`}>
                            {bp.verified ? '已验证' : '未验证'}
                          </span>}
                      </div>
                      <button className="breakpoint-edit" onClick={() => setNewBreakpointCondition({
              file: bp.file,
              line: bp.line,
              condition: bp.condition || '',
              hitCondition: bp.hitCondition || '',
              logMessage: bp.logMessage || ''
            })} title="编辑条件">
                        <ChevronRight size={12} />
                      </button>
                      <button className="breakpoint-remove" onClick={() => removeBreakpoint(bp.id)} title="删除断点">
                        <XCircle size={12} />
                      </button>
                    </div>)}

                {}
                {newBreakpointCondition && <div className="conditional-breakpoint-dialog">
                    <div className="dialog-header">
                      <span>设置断点</span>
                      <button onClick={() => setNewBreakpointCondition(null)}>
                        <XCircle size={14} />
                      </button>
                    </div>
                    <div className="dialog-content">
                      <span className="dialog-location">
                        {newBreakpointCondition.file.split('/').pop()}:{newBreakpointCondition.line}
                      </span>
                      {}
                      <div className="condition-field">
                        <label className="condition-label">断点类型</label>
                        <div className="breakpoint-type-selector">
                          <button className={`type-btn ${!newBreakpointCondition.logMessage ? 'active' : ''}`} onClick={() => setNewBreakpointCondition({
                    ...newBreakpointCondition,
                    logMessage: ''
                  })}>
                            <AlertTriangle size={12} />
                            条件断点
                          </button>
                          <button className={`type-btn ${newBreakpointCondition.logMessage ? 'active' : ''}`} onClick={() => setNewBreakpointCondition({
                    ...newBreakpointCondition,
                    condition: '',
                    hitCondition: '',
                    logMessage: newBreakpointCondition.logMessage || '{variable}'
                  })}>
                            <MessageSquare size={12} />
                            日志点
                          </button>
                        </div>
                      </div>
                      {}
                      {!newBreakpointCondition.logMessage && <>
                          <div className="condition-field">
                            <label className="condition-label">条件表达式</label>
                            <input type="text" value={newBreakpointCondition.condition} onChange={e => setNewBreakpointCondition({
                    ...newBreakpointCondition,
                    condition: e.target.value
                  })} placeholder="例如: x > 5" className="condition-input" autoFocus />
                            <span className="condition-help">当表达式为 true 时中断</span>
                          </div>
                          <div className="condition-field">
                            <label className="condition-label">命中条件</label>
                            <input type="text" value={newBreakpointCondition.hitCondition} onChange={e => setNewBreakpointCondition({
                    ...newBreakpointCondition,
                    hitCondition: e.target.value
                  })} placeholder="例如: 3 或 >= 5" className="condition-input" />
                            <span className="condition-help">命中次数满足条件时中断</span>
                          </div>
                        </>}
                      {}
                      {newBreakpointCondition.logMessage && <div className="condition-field">
                          <label className="condition-label">日志消息</label>
                          <input type="text" value={newBreakpointCondition.logMessage} onChange={e => setNewBreakpointCondition({
                  ...newBreakpointCondition,
                  logMessage: e.target.value
                })} placeholder="例如: 变量 x 的值为 {x}" className="condition-input" autoFocus />
                          <span className="condition-help">使用 {'{变量名}'} 引用变量值</span>
                        </div>}
                      <div className="dialog-actions">
                        <button onClick={() => setNewBreakpointCondition(null)}>
                          取消
                        </button>
                        <button onClick={handleSetConditionalBreakpoint} className="primary">
                          确定
                        </button>
                      </div>
                    </div>
                  </div>}
              </div>}

            {}
            {activeTab === 'callstack' && <div className="callstack-list">
                {}
                {threads.length > 1 && <div className="thread-selector">
                    <div className="section-header">
                      <Circle size={14} />
                      <span>线程</span>
                    </div>
                    <div className="thread-list">
                      {threads.map(thread => <button key={thread.id} className={`thread-item ${selectedThread === thread.id ? 'selected' : ''}`} onClick={() => handleSelectThread(thread.id)}>
                          <span className={`thread-status ${thread.id === stoppedThread ? 'stopped' : 'running'}`} />
                          <span className="thread-name">{thread.name}</span>
                          <span className="thread-id">#{thread.id}</span>
                        </button>)}
                    </div>
                  </div>}
                {}
                {callStack.length === 0 ? <div className="debug-empty-state">
                    <Info size={16} opacity={0.5} />
                    <span>{isStopped ? '无调用堆栈' : '程序未暂停'}</span>
                  </div> : callStack.map(frame => <div key={frame.id} className={`callstack-item ${(selectedFrameId ?? callStack[0]?.id) === frame.id ? 'active-frame' : ''}`} onClick={() => void handleSelectFrame(frame)}>
                      <span className="callstack-function">{frame.name}</span>
                      <span className="callstack-location">
                        {frame.file.split('/').pop() || frame.file.split('\\').pop() || frame.file}:{frame.line}
                      </span>
                    </div>)}
              </div>}

            {}
            {activeTab === 'output' && <div className="debug-output">
                <div className="debug-output-content">
                  {output.length === 0 ? <div className="debug-empty-state">
                      <TerminalIcon size={16} opacity={0.5} />
                      <span>程序输出将显示在此处</span>
                    </div> : output.map((line, i) => <div key={i} className="debug-output-line">
                        {line}
                      </div>)}
                </div>
                <div className="debug-output-input">
                  <input type="text" value={outputInput} onChange={e => setOutputInput(e.target.value)} onKeyDown={handleOutputKeyDown} placeholder="输入表达式求值..." disabled={!isStopped} />
                  <button onClick={handleEvaluate} disabled={!isStopped || !outputInput.trim()} title="求值">
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>}
          </>}
      </div>
    </div>;
};
export default DebugPanel;