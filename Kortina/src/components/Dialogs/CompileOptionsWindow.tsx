import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { useUiZoomSync } from '../../hooks/useUiZoomSync';
import { AppEvents, type CompileOptionsResultPayload } from '../../events/app-events';
import { Select } from '../Core/Select';
import './Dialogs.css';
type TargetType = 'asm' | 'ir' | 'exe';
interface CompileOptionsInitData {
  theme?: string;
  themeGroup?: string;
  compilerPath?: string;
  compilerUseSystemPath?: boolean;
  compilerTargetType?: TargetType | string;
  compilerOutputFile?: string;
  compilerShowIR?: boolean;
}
const windowStyles = `
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: var(--font-kortina);
    background-color: var(--bg-primary);
    color: var(--text-primary);
  }
  #root {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
`;
const targetLabel = (type: TargetType) => {
  if (type === 'asm') return '汇编代码';
  if (type === 'ir') return '中间代码';
  return '可执行文件';
};
export const CompileOptionsWindow: React.FC = () => {
  const [targetType, setTargetType] = useState<TargetType>('exe');
  const [outputFile, setOutputFile] = useState('');
  const [showIR, setShowIR] = useState(false);
  const [compilerPath, setCompilerPath] = useState('');
  const [useSystemPath, setUseSystemPath] = useState(true);
  const [ready, setReady] = useState(false);
  const submittedRef = useRef(false);
  useUiZoomSync(true);
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = windowStyles;
    document.head.appendChild(styleElement);
    try {
      const saved = localStorage.getItem('kortina_settings') ?? localStorage.getItem('kortina_settings_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        const state = parsed?.state ?? parsed;
        if (state?.theme) {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
        if (state?.themeGroup) {
          document.documentElement.setAttribute('data-theme-group', state.themeGroup);
        }
      }
    } catch {}
    let unlisten: (() => void) | null = null;
    const applyData = (data: CompileOptionsInitData) => {
      const t = data.compilerTargetType;
      if (t === 'asm' || t === 'ir' || t === 'exe') {
        setTargetType(t);
      }
      setOutputFile(data.compilerOutputFile ?? '');
      setShowIR(Boolean(data.compilerShowIR));
      setCompilerPath(data.compilerPath ?? '');
      setUseSystemPath(data.compilerUseSystemPath ?? true);
      setReady(true);
      submittedRef.current = false;
      if (data.theme) {
        document.documentElement.setAttribute('data-theme', data.theme);
      }
      if (data.themeGroup) {
        document.documentElement.setAttribute('data-theme-group', data.themeGroup);
      }
    };
    const setup = async () => {
      try {
        const {
          listen
        } = await import('@tauri-apps/api/event');
        unlisten = await listen<CompileOptionsInitData>('compile-options-initial-data', event => {
          applyData(event.payload);
        });
        try {
          const {
            invoke
          } = await import('@tauri-apps/api/core');
          const state = await invoke<CompileOptionsInitData | null>('get_compile_options_state');
          if (state) {
            applyData(state);
          } else {
            setReady(true);
          }
        } catch (e) {
          console.warn('CompileOptionsWindow: pull state failed', e);
          setReady(true);
        }
      } catch (e) {
        console.error('CompileOptionsWindow: setup listeners failed', e);
        setReady(true);
      }
    };
    setup();
    return () => {
      if (unlisten) unlisten();
      styleElement.remove();
    };
  }, []);
  const closeWindow = useCallback(async () => {
    try {
      const {
        invoke
      } = await import('@tauri-apps/api/core');
      await invoke('close_compile_options');
    } catch {
      try {
        const {
          getCurrentWindow
        } = await import('@tauri-apps/api/window');
        await getCurrentWindow().close();
      } catch (e) {
        console.error('Failed to close compile options window:', e);
      }
    }
  }, []);
  const emitResult = useCallback(async (confirmed: boolean) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    try {
      const {
        emit
      } = await import('@tauri-apps/api/event');
      const payload: CompileOptionsResultPayload = {
        confirmed,
        compilerTargetType: targetType,
        compilerOutputFile: outputFile.trim(),
        compilerShowIR: showIR
      };
      await emit(AppEvents.COMPILE_OPTIONS_RESULT, payload);
    } catch (e) {
      console.error('Failed to emit compile-options-result:', e);
    }
    await closeWindow();
  }, [targetType, outputFile, showIR, closeWindow]);
  const handleConfirm = useCallback(() => {
    void emitResult(true);
  }, [emitResult]);
  const handleCancel = useCallback(() => {
    void emitResult(false);
  }, [emitResult]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleConfirm();
    }
  }, [handleConfirm, handleCancel]);
  return <div className="compile-options-window" onKeyDown={handleKeyDown}>
      <div className="input-dialog-title-bar" data-tauri-drag-region>
        <span className="input-dialog-title" data-tauri-drag-region>编译选项</span>
        <button className="input-dialog-close-btn" onClick={handleCancel} title="关闭" type="button">
          <X size={14} />
        </button>
      </div>

      <div className="compile-options-body">
        <div className="dialog-notice dialog-notice-info">
          <p>
            <strong>编译器</strong>
            {' · '}
            {useSystemPath ? '系统 PATH 中的 kairote' : compilerPath || '未设置路径'}
          </p>
          <p>目标类型：{targetLabel(targetType)}</p>
        </div>

        <div className="dialog-form-field">
          <label className="dialog-label" htmlFor="compile-target-type">目标类型</label>
          <Select id="compile-target-type" className="k-select--dialog" value={targetType} onChange={(v: string) => setTargetType(v as TargetType)} disabled={!ready} options={[{
          value: 'asm',
          label: '汇编代码 (asm)'
        }, {
          value: 'ir',
          label: '中间代码 (ir)'
        }, {
          value: 'exe',
          label: '可执行文件 (exe)'
        }]} ariaLabel="目标类型" />
        </div>

        <div className="dialog-form-field">
          <label className="dialog-label" htmlFor="compile-output-file">输出文件</label>
          <input id="compile-output-file" type="text" className="dialog-input" value={outputFile} onChange={e => setOutputFile(e.target.value)} placeholder="默认: output.asm 或当前平台的可执行文件名" disabled={!ready} />
          <p className="dialog-help-text">留空则使用当前目标和平台的默认文件名</p>
        </div>

        <label className="dialog-checkbox-row">
          <input type="checkbox" checked={showIR} onChange={e => setShowIR(e.target.checked)} disabled={!ready} />
          <span>显示 IR 中间代码</span>
        </label>
      </div>

      <div className="input-dialog-footer">
        <button type="button" className="dialog-btn dialog-btn-secondary" onClick={handleCancel}>
          取消
        </button>
        <button type="button" className="dialog-btn dialog-btn-primary" onClick={handleConfirm} disabled={!ready}>
          编译
        </button>
      </div>
    </div>;
};