import React, { createContext, useContext, useCallback, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ToastContainer, Toast } from '../components/common/ToastContainer';

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  toasts: Toast[];
  error: (options: Omit<Toast, 'id' | 'type'>) => string;
  success: (options: Omit<Toast, 'id' | 'type'>) => string;
  warning: (options: Omit<Toast, 'id' | 'type'>) => string;
  info: (options: Omit<Toast, 'id' | 'type'>) => string;
}

const ToastContext = createContext<ToastContextType | null>(null);

/**
 * Provider para gerenciar toasts na aplicação
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Adicionar um novo toast
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = uuidv4();
    const newToast: Toast = { id, ...toast };
    
    setToasts(prevToasts => [...prevToasts, newToast]);
    
    // Se o toast tiver duração, removê-lo automaticamente após o tempo
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }
    
    return id;
  }, []);

  // Remover um toast específico
  const removeToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  // Limpar todos os toasts
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Funções de utilidade para diferentes tipos de toast
  const error = useCallback((options: Omit<Toast, 'id' | 'type'>) => {
    return addToast({ ...options, type: 'error', duration: options.duration ?? 6000 });
  }, [addToast]);

  const success = useCallback((options: Omit<Toast, 'id' | 'type'>) => {
    return addToast({ ...options, type: 'success', duration: options.duration ?? 3000 });
  }, [addToast]);

  const warning = useCallback((options: Omit<Toast, 'id' | 'type'>) => {
    return addToast({ ...options, type: 'warning', duration: options.duration ?? 5000 });
  }, [addToast]);

  const info = useCallback((options: Omit<Toast, 'id' | 'type'>) => {
    return addToast({ ...options, type: 'info', duration: options.duration ?? 4000 });
  }, [addToast]);

  // Valor do contexto
  const value = useMemo(() => ({
    addToast,
    removeToast,
    clearToasts,
    toasts,
    error,
    success,
    warning,
    info
  }), [addToast, removeToast, clearToasts, toasts, error, success, warning, info]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

/**
 * Hook para utilizar o sistema de toasts
 */
export function useToast() {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
} 