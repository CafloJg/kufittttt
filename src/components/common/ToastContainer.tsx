import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ErrorToast } from './ErrorToast';

export interface Toast {
  id: string;
  type: 'error' | 'warning' | 'success' | 'info';
  title?: string;
  message: string;
  error?: Error | unknown;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

/**
 * Container para gerenciar múltiplas notificações toast
 */
export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  // Container para o portal de toasts
  const [container, setContainer] = useState<HTMLElement | null>(null);

  // Criar o container do portal quando o componente for montado
  useEffect(() => {
    // Verificar se o container já existe
    let toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    setContainer(toastContainer);
    
    // Limpar o container quando o componente for desmontado
    return () => {
      if (toastContainer && toastContainer.childNodes.length === 0) {
        document.body.removeChild(toastContainer);
      }
    };
  }, []);

  if (!container) return null;

  return createPortal(
    <div className="fixed bottom-0 right-0 z-50 p-4 space-y-4 max-h-screen overflow-hidden pointer-events-none">
      <div className="space-y-4 flex flex-col-reverse">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            {toast.type === 'error' && toast.error ? (
              <ErrorToast
                error={toast.error}
                action={toast.action}
                duration={toast.duration}
                onDismiss={() => removeToast(toast.id)}
              />
            ) : (
              <div
                className={`p-4 rounded-lg shadow-lg 
                  ${toast.type === 'success' ? 'bg-green-100 border-l-4 border-green-500' : 
                    toast.type === 'warning' ? 'bg-yellow-100 border-l-4 border-yellow-500' : 
                    toast.type === 'info' ? 'bg-blue-100 border-l-4 border-blue-500' : 
                    'bg-white border-l-4 border-gray-500'} 
                  animate-slideInRight`}
              >
                {toast.title && (
                  <h4 className="font-medium text-sm">{toast.title}</h4>
                )}
                <p className="text-sm">{toast.message}</p>
                {toast.action && (
                  <button
                    className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded"
                    onClick={toast.action.onClick}
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>,
    container
  );
} 