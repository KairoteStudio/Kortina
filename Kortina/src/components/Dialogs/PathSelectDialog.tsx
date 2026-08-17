import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DialogShell, FormField, DialogActions } from './primitives';
import { isMobile } from '../../utils/environment';
import './Dialogs.css';
interface PathSelectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (path: string) => void;
  title?: string;
  defaultPath?: string;
  confirmText?: string;
  cancelText?: string;
}
export const PathSelectDialog: React.FC<PathSelectDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '选择路径',
  defaultPath = '',
  confirmText = '确定',
  cancelText = '取消'
}) => {
  const [path, setPath] = useState(defaultPath);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (isOpen) {
      setPath(defaultPath);
      setError('');
      setIsLoading(false);
    }
  }, [isOpen, defaultPath]);
  const handleBrowse = async () => {
    if (isMobile()) {
      try {
        setIsLoading(true);
        const result = await invoke<string | null>('open_folder_picker_android');
        if (result) {
          setPath(result);
        }
      } catch (error) {
        console.error('选择文件夹失败:', error);
        setError('选择文件夹失败，请重试');
      } finally {
        setIsLoading(false);
      }
      return;
    }
    try {
      setIsLoading(true);
      const selectedPath = await invoke<string>('show_folder_dialog', {
        defaultPath: path || undefined
      });
      if (selectedPath) {
        setPath(selectedPath);
      }
    } catch (error) {
      console.error('选择文件夹失败:', error);
      setError('选择文件夹失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };
  const handleSubmit = () => {
    const trimmed = path.trim();
    if (!trimmed) {
      setError('请选择或输入路径');
      return;
    }
    setError('');
    onConfirm(trimmed);
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };
  return <DialogShell isOpen={isOpen} onClose={onClose} title={title} footer={<DialogActions>
          <button className="dialog-btn dialog-btn-secondary" onClick={onClose}>
            {cancelText}
          </button>
          <button className="dialog-btn dialog-btn-primary" onClick={handleSubmit}>
            {confirmText}
          </button>
        </DialogActions>}>
      <FormField label="目标路径" error={error}>
        <div style={{
        display: 'flex',
        gap: '8px'
      }}>
          <input type="text" value={path} onChange={e => {
          setPath(e.target.value);
          if (error) setError('');
        }} onKeyPress={handleKeyPress} placeholder="请输入或选择目标路径" className={`dialog-input ${error ? 'error' : ''}`} style={{
          flex: 1
        }} />
          <button onClick={handleBrowse} disabled={isLoading} className="dialog-btn dialog-btn-secondary" style={{
          whiteSpace: 'nowrap'
        }}>
            {isLoading ? '...' : '浏览'}
          </button>
        </div>
      </FormField>
    </DialogShell>;
};
export default PathSelectDialog;