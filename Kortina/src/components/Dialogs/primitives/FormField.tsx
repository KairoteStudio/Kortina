import React from 'react';
import '../Dialogs.css';
export interface FormFieldProps {
  label?: string;
  error?: string;
  helpText?: string;
  children: React.ReactNode;
}
export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  helpText,
  children
}) => {
  return <div className="dialog-form-field">
      {label && <label className="dialog-label">{label}</label>}
      {children}
      {error && <p className="dialog-error-msg">{error}</p>}
      {helpText && <p className="dialog-help-text">{helpText}</p>}
    </div>;
};