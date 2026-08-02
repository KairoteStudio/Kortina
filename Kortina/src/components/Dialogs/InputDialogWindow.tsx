import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { useUiZoomSync } from '../../hooks/useUiZoomSync';
import { AppEvents, type InputDialogResultPayload } from '../../events/app-events';
import './Dialogs.css';
interface InputDialogInitData {
  title: string;
  placeholder: string;
  defaultValue: string;
  confirmText: string;
  cancelText: string;
  requestId: string;
  theme: string;
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
export const InputDialogWindow: React.FC = () => {
  const [title, setTitle] = useState('输入');
  const [placeholder, setPlaceholder] = useState('');
  const [confirmText, setConfirmText] = useState('确定');
  const [cancelText, setCancelText] = useState('取消');
  const [requestId, setRequestId] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
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
    const applyData = (data: InputDialogInitData) => {
      setTitle(data.title || '输入');
      setPlaceholder(data.placeholder || '');
      setConfirmText(data.confirmText || '确定');
      setCancelText(data.cancelText || '取消');
      setRequestId(data.requestId || '');
      setValue(data.defaultValue || '');
      setError('');
      setReady(true);
      submittedRef.current = false;
      if (data.theme) {
        document.documentElement.setAttribute('data-theme', data.theme);
      }
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    };
    const setup = async () => {
      try {
        const {
          listen
        } = await import('@tauri-apps/api/event');
        unlisten = await listen<InputDialogInitData>('input-dialog-initial-data', event => {
          applyData(event.payload);
        });
        try {
          const {
            invoke
          } = await import('@tauri-apps/api/core');
          const state = await invoke<InputDialogInitData | null>('get_input_dialog_state');
          if (state) {
            applyData(state);
          }
        } catch (e) {
          console.warn('InputDialogWindow: pull state failed', e);
        }
      } catch (e) {
        console.error('InputDialogWindow: setup listeners failed', e);
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
        getCurrentWindow
      } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch (e) {
      console.error('Failed to close input dialog window:', e);
    }
  }, []);
  const emitResult = useCallback(async (confirmed: boolean, resultValue?: string) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    try {
      const {
        emit
      } = await import('@tauri-apps/api/event');
      await emit<InputDialogResultPayload>(AppEvents.INPUT_DIALOG_RESULT, {
        requestId,
        confirmed,
        value: resultValue ?? ''
      });
    } catch (e) {
      console.error('Failed to emit input-dialog-result:', e);
    }
    await closeWindow();
  }, [requestId, closeWindow]);
  const handleConfirm = useCallback(() => {
    if (!value.trim()) {
      setError('输入不能为空');
      return;
    }
    if (/[\\/:*?"<>|]/.test(value)) {
      setError('名称不能包含特殊字符 /\\:*?"<>|');
      return;
    }
    void emitResult(true, value.trim());
  }, [value, emitResult]);
  const handleCancel = useCallback(() => {
    void emitResult(false);
  }, [emitResult]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }, [handleConfirm, handleCancel]);
  return <div className="input-dialog-window" onKeyDown={handleKeyDown}>
      <div className="input-dialog-title-bar" data-tauri-drag-region>
        <span className="input-dialog-title" data-tauri-drag-region>{title}</span>
        <button className="input-dialog-close-btn" onClick={handleCancel} title="关闭">
          <X size={14} />
        </button>
      </div>

      <div className="input-dialog-body">
        <input ref={inputRef} type="text" className={`dialog-input ${error ? 'error' : ''}`} value={value} onChange={e => {
        setValue(e.target.value);
        setError('');
      }} placeholder={placeholder} disabled={!ready} />
        {error && <div className="dialog-error-msg">{error}</div>}
      </div>

      <div className="input-dialog-footer">
        <button className="dialog-btn dialog-btn-secondary" onClick={handleCancel}>
          {cancelText}
        </button>
        <button className="dialog-btn dialog-btn-primary" onClick={handleConfirm} disabled={!ready}>
          {confirmText}
        </button>
      </div>
    </div>;
};
export default InputDialogWindow;