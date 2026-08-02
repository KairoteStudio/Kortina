import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DialogShell, FormField, DialogActions } from './primitives';
import './Dialogs.css';
interface SshKeySelectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (keyPath: string) => void;
  title?: string;
  confirmText?: string;
  cancelText?: string;
}
const commonKeyPaths = ['~/.ssh/id_rsa', '~/.ssh/id_ed25519', '~/.ssh/id_ecdsa', '~/.ssh/id_dsa'];
export const SshKeySelectDialog: React.FC<SshKeySelectDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '选择SSH密钥',
  confirmText = '确定',
  cancelText = '取消'
}) => {
  const [keyPath, setKeyPath] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setKeyPath('');
      setError('');
      setIsLoading(false);
    }
  }, [isOpen]);
  const handleBrowseClick = async () => {
    try {
      setIsLoading(true);
      const selectedPath = await invoke<string>('show_file_dialog', {
        filters: [{
          name: 'SSH Key',
          extensions: ['pem', 'key', 'pub']
        }]
      });
      if (selectedPath) {
        setKeyPath(selectedPath);
      }
    } catch (error) {
      console.error('选择文件失败:', error);
      setError('选择文件失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };
  const handleConfirm = () => {
    const trimmed = keyPath.trim();
    if (!trimmed) {
      setError('请选择SSH密钥文件');
      return;
    }
    setError('');
    onConfirm(trimmed);
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
  };
  return <DialogShell isOpen={isOpen} onClose={onClose} title={title} footer={<DialogActions>
          <button className="dialog-btn dialog-btn-secondary" onClick={onClose}>
            {cancelText}
          </button>
          <button className="dialog-btn dialog-btn-primary" onClick={handleConfirm}>
            {confirmText}
          </button>
        </DialogActions>}>
      <FormField label="SSH密钥文件路径" error={error}>
        <div style={{
        display: 'flex',
        gap: '8px'
      }}>
          <input type="text" value={keyPath} onChange={e => {
          setKeyPath(e.target.value);
          if (error) setError('');
        }} onKeyPress={handleKeyPress} placeholder="请输入或选择SSH密钥文件路径" className={`dialog-input ${error ? 'error' : ''}`} style={{
          flex: 1
        }} />
          <button onClick={handleBrowseClick} disabled={isLoading} className="dialog-btn dialog-btn-secondary" style={{
          whiteSpace: 'nowrap'
        }}>
            {isLoading ? '...' : '浏览'}
          </button>
        </div>
      </FormField>

      <FormField label="常用SSH密钥路径">
        <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
          {commonKeyPaths.map(keyPathItem => <button key={keyPathItem} onClick={() => {
          setKeyPath(keyPathItem);
          setError('');
        }} className="dialog-btn dialog-btn-secondary" style={{
          padding: '6px 12px',
          fontSize: '13px'
        }}>
              {keyPathItem}
            </button>)}
        </div>
      </FormField>
    </DialogShell>;
};
export default SshKeySelectDialog;