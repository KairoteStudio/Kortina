import React, { useState, useEffect } from 'react';
import { DialogShell, FormField, DialogActions } from './primitives';
import './Dialogs.css';
interface UrlInputDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string) => void;
  title?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  validateUrl?: (url: string) => boolean;
  helpText?: string;
}
export const UrlInputDialog: React.FC<UrlInputDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '输入URL',
  placeholder = '请输入URL',
  defaultValue = '',
  confirmText = '确定',
  cancelText = '取消',
  validateUrl,
  helpText = '支持 GitHub、GitLab、Bitbucket 等平台的仓库URL'
}) => {
  const [url, setUrl] = useState(defaultValue);
  const [error, setError] = useState('');
  useEffect(() => {
    if (isOpen) {
      setUrl(defaultValue);
      setError('');
    }
  }, [isOpen, defaultValue]);
  const handleSubmit = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError('请输入URL');
      return;
    }
    if (validateUrl && !validateUrl(trimmed)) {
      setError('请输入有效的Git仓库URL');
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
      <FormField error={error} helpText={helpText}>
        <input type="text" value={url} onChange={e => {
        setUrl(e.target.value);
        if (error) setError('');
      }} onKeyPress={handleKeyPress} placeholder={placeholder} className={`dialog-input ${error ? 'error' : ''}`} autoFocus />
      </FormField>
    </DialogShell>;
};
export default UrlInputDialog;