import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { shortcutService } from '../../../services/ShortcutService';
import '../Dialogs.css';
export interface DialogShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  showCloseButton?: boolean;
  preventBackdropClose?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}
export const DialogShell: React.FC<DialogShellProps> = ({
  isOpen,
  onClose,
  title,
  showCloseButton = true,
  preventBackdropClose = false,
  className = '',
  style,
  children,
  footer,
  onKeyDown
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  }, [onClose, isClosing]);
  useEffect(() => {
    if (isOpen) setIsClosing(false);
  }, [isOpen]);
  useEffect(() => {
    shortcutService.setModalActive(isOpen);
    return () => shortcutService.setModalActive(false);
  }, [isOpen]);
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (preventBackdropClose) return;
    if (e.target === e.currentTarget && !isClosing) {
      handleClose();
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isClosing) {
      handleClose();
    }
    onKeyDown?.(e);
  };
  if (!isOpen && !isClosing) return null;
  return <div className={`dialog-backdrop ${isClosing ? 'closing' : ''}`} onClick={handleBackdropClick} onKeyDown={handleKeyDown} tabIndex={-1} onContextMenu={e => {
    e.preventDefault();
    e.stopPropagation();
  }}>
      <div className={`dialog-container ${isClosing ? 'closing' : ''} ${className}`} style={style} onContextMenu={e => {
      e.preventDefault();
      e.stopPropagation();
    }}>
        <div className="dialog-header">
          <h3>{title}</h3>
          {showCloseButton && <button className="dialog-close-btn" onClick={handleClose} aria-label="关闭">
              <X size={18} />
            </button>}
        </div>

        <div className="dialog-content">{children}</div>

        {footer && <div className="dialog-footer">{footer}</div>}
      </div>
    </div>;
};