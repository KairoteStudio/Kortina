import React, { useState, useEffect } from 'react';
import { DialogShell, FormField, DialogActions } from './primitives';
import './Dialogs.css';
interface BranchInputDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (branch: string) => void;
  title?: string;
  defaultBranch?: string;
  confirmText?: string;
  cancelText?: string;
}
const commonBranches = ['main', 'master', 'develop', 'development', 'staging', 'test', 'feature', 'release', 'hotfix'];
export const BranchInputDialog: React.FC<BranchInputDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '输入分支名称',
  defaultBranch = '',
  confirmText = '确定',
  cancelText = '取消'
}) => {
  const [branch, setBranch] = useState(defaultBranch);
  const [error, setError] = useState('');
  useEffect(() => {
    if (isOpen) {
      setBranch(defaultBranch);
      setError('');
    }
  }, [isOpen, defaultBranch]);
  const handleSubmit = () => {
    const trimmed = branch.trim();
    if (!trimmed) {
      setError('请输入分支名称');
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
      <FormField label="分支名称" error={error}>
        <input type="text" value={branch} onChange={e => {
        setBranch(e.target.value);
        if (error) setError('');
      }} onKeyPress={handleKeyPress} placeholder="请输入分支名称" className={`dialog-input ${error ? 'error' : ''}`} />
      </FormField>

      <FormField label="常用分支">
        <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
          {commonBranches.map(branchName => <button key={branchName} onClick={() => {
          setBranch(branchName);
          setError('');
        }} className="dialog-btn dialog-btn-secondary" style={{
          padding: '6px 12px',
          fontSize: '13px'
        }}>
              {branchName}
            </button>)}
        </div>
      </FormField>
    </DialogShell>;
};
export default BranchInputDialog;