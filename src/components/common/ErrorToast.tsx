import React, { useEffect, useState } from 'react';
import { AlertCircle, WifiOff, X } from 'lucide-react';
import { categorizeError, formatErrorMessage } from '../../utils/errorUtils';

export interface ErrorToastProps {
  error: Error | unknown;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  onDismiss?: () => void;
}

/**
 * Componente para exibir erros em um toast com feedback visual adequado
 */
export function ErrorToast({ 
  error, 
  action, 
  duration = 5000,
  onDismiss 
}: ErrorToastProps) {
  const { type: errorType } = categorizeError(error);
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);
  
  if (!visible) return null;
  
  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg 
                     border-l-4 ${errorType === 'network' 
                      ? 'border-orange-500' 
                      : errorType === 'auth' 
                        ? 'border-red-500' 
                        : 'border-red-500'} 
                     transition-all duration-300 ease-in-out animate-slideInRight`}>
      <div className="p-4 flex items-start">
        <div className="flex-shrink-0 mr-3">
          {errorType === 'network' ? (
            <WifiOff className="w-6 h-6 text-orange-500" />
          ) : (
            <AlertCircle className="w-6 h-6 text-red-500" />
          )}
        </div>
        <div className="flex-grow">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {errorType === 'network' 
              ? 'Problema de conexão' 
              : errorType === 'auth'
                ? 'Erro de autenticação'
                : errorType === 'timeout'
                  ? 'Operação excedeu o tempo limite'
                  : 'Ocorreu um erro'}
          </h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {formatErrorMessage(error)}
          </p>
          {action && (
            <button
              className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-transparent 
                        text-xs font-medium rounded text-gray-700 dark:text-gray-200
                        bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              onClick={action.onClick}
            >
              {action.label}
            </button>
          )}
        </div>
        <button
          className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-500"
          onClick={() => {
            setVisible(false);
            onDismiss?.();
          }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
} 