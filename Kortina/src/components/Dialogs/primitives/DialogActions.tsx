import React from 'react';
import '../Dialogs.css';
export interface DialogActionsProps {
  children: React.ReactNode;
}
export const DialogActions: React.FC<DialogActionsProps> = ({
  children
}) => {
  return <div className="dialog-footer">{children}</div>;
};