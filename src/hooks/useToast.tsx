import React, { useState, useCallback, useEffect, createContext, useContext, ReactNode } from 'react';
import { Toast, ToastType } from '../components/ui/Toast';

interface ToastOptions {
  /**
   * Tipo do toast
   * @default 'info'
   */
  type?: ToastType;
  
  /**
   * Se deve fechar automaticamente
   * @default true
   */
  autoClose?: boolean;
  
  /**
   * Duração em ms antes de fechar automaticamente
   * @default 5000
   */
  duration?: number;
  
  /**
   * Ação adicional (botão)
   */
  action?: React.ReactNode;
  
  /**
   * Posição do toast
   * @default 'bottom'
   */
  position?: 'top' | 'bottom' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

interface ToastContextType {
  /**
   * Mostrar um toast
   */
  showToast: (message: string, options?: ToastOptions) => void;
  
  /**
   * Mostrar um toast de sucesso
   */
  showSuccess: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  
  /**
   * Mostrar um toast de erro
   */
  showError: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  
  /**
   * Mostrar um toast de aviso
   */
  showWarning: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  
  /**
   * Mostrar um toast de informação
   */
  showInfo: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  
  /**
   * Fechar o toast atual
   */
  closeToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Provider para o sistema de toasts
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [options, setOptions] = useState<ToastOptions>({});
  
  // Fechar o toast
  const closeToast = useCallback(() => {
    setIsVisible(false);
  }, []);
  
  // Mostrar um toast
  const showToast = useCallback((message: string, options: ToastOptions = {}) => {
    setMessage(message);
    setOptions(options);
    setIsVisible(true);
  }, []);
  
  // Mostrar um toast de sucesso
  const showSuccess = useCallback((message: string, options: Omit<ToastOptions, 'type'> = {}) => {
    showToast(message, { ...options, type: 'success' });
  }, [showToast]);
  
  // Mostrar um toast de erro
  const showError = useCallback((message: string, options: Omit<ToastOptions, 'type'> = {}) => {
    showToast(message, { ...options, type: 'error' });
  }, [showToast]);
  
  // Mostrar um toast de aviso
  const showWarning = useCallback((message: string, options: Omit<ToastOptions, 'type'> = {}) => {
    showToast(message, { ...options, type: 'warning' });
  }, [showToast]);
  
  // Mostrar um toast de informação
  const showInfo = useCallback((message: string, options: Omit<ToastOptions, 'type'> = {}) => {
    showToast(message, { ...options, type: 'info' });
  }, [showToast]);
  
  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        closeToast
      }}
    >
      {children}
      
      <Toast
        message={message}
        isVisible={isVisible}
        onClose={closeToast}
        type={options.type}
        autoClose={options.autoClose}
        duration={options.duration}
        action={options.action}
        position={options.position}
      />
    </ToastContext.Provider>
  );
}

/**
 * Hook para usar o sistema de toasts
 */
export function useToast() {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
}