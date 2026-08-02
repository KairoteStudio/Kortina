import React from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import './Toast.css';
export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}
interface ToastProps {
  items: ToastItem[];
  onClose: (id: string) => void;
}
const Toast: React.FC<ToastProps> = ({
  items = [],
  onClose
}) => {
  return <div className="toast-container">
      {items.map(item => <div key={item.id} className={`toast toast-${item.type}`} title={item.message || item.title}>
          <div className="toast-icon">
            {item.type === 'success' && <CheckCircle size={20} />}
            {item.type === 'error' && <AlertCircle size={20} />}
            {item.type === 'warning' && <AlertCircle size={20} />}
            {item.type === 'info' && <AlertCircle size={20} />}
          </div>
          <div className="toast-content">
            <div className="toast-title">{item.title}</div>
            {item.message && <div className="toast-message">{item.message}</div>}
          </div>
          <button className="toast-close" onClick={() => onClose(item.id)}>
            <X size={16} />
          </button>
        </div>)}
    </div>;
};
export default Toast;