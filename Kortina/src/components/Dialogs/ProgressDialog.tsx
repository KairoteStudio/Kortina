import React, { useCallback } from 'react';
import { DialogShell, DialogActions } from './primitives';
import './Dialogs.css';
interface ProgressDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  progress?: number;
  onCancel?: () => void;
  cancelText?: string;
}
export const ProgressDialog: React.FC<ProgressDialogProps> = ({
  isOpen,
  title,
  message,
  progress,
  onCancel,
  cancelText = '取消'
}) => {
  const handleClose = useCallback(() => {
    onCancel?.();
  }, [onCancel]);
  const footer = onCancel && <DialogActions>
      <button onClick={handleClose} className="dialog-btn dialog-btn-secondary">
        {cancelText}
      </button>
    </DialogActions>;
  return <DialogShell isOpen={isOpen} onClose={handleClose} title={title} showCloseButton={false} preventBackdropClose style={{
    minWidth: '350px'
  }} footer={footer || undefined}>
      <p style={{
      color: 'var(--text-secondary)',
      marginBottom: '16px',
      fontSize: '14px'
    }}>{message}</p>

      {progress !== undefined ? <div style={{
      width: '100%',
      backgroundColor: 'var(--bg-tertiary)',
      borderRadius: '10px',
      height: '8px',
      overflow: 'hidden'
    }}>
          <div style={{
        width: `${progress}%`,
        backgroundColor: 'var(--bg-primary)',
        height: '100%',
        transition: 'width 0.3s ease'
      }}></div>
        </div> : <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px 0'
    }}>
          <div className="loading-spinner"></div>
          <span style={{
        marginLeft: '12px',
        color: 'var(--text-secondary)',
        fontSize: '14px'
      }}>处理中...</span>
        </div>}
    </DialogShell>;
};
export default ProgressDialog;