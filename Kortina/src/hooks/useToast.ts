import { useState, useCallback } from 'react';
export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}
interface ToastState {
  items: ToastItem[];
}
interface ToastActions {
  showSuccess: (title: string, message?: string, duration?: number) => void;
  showError: (title: string, message?: string, duration?: number) => void;
  showWarning: (title: string, message?: string, duration?: number) => void;
  showInfo: (title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}
export const useToast = (): ToastState & ToastActions => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const generateId = useCallback(() => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }, []);
  const addToast = useCallback((type: ToastItem['type'], title: string, message?: string, duration: number = 5000) => {
    const id = generateId();
    const newToast: ToastItem = {
      id,
      type,
      title,
      message,
      duration
    };
    setItems(prev => [...prev, newToast]);
    setTimeout(() => {
      setItems(prev => prev.filter(item => item.id !== id));
    }, duration);
  }, [generateId]);
  const showSuccess = useCallback((title: string, message?: string, duration?: number) => {
    addToast('success', title, message, duration);
  }, [addToast]);
  const showError = useCallback((title: string, message?: string, duration?: number) => {
    addToast('error', title, message, duration);
  }, [addToast]);
  const showWarning = useCallback((title: string, message?: string, duration?: number) => {
    addToast('warning', title, message, duration);
  }, [addToast]);
  const showInfo = useCallback((title: string, message?: string, duration?: number) => {
    addToast('info', title, message, duration);
  }, [addToast]);
  const removeToast = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);
  return {
    items,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeToast
  };
};
export default useToast;