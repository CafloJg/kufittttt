import { useState, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { reportError, categorizeError, formatErrorMessage } from '../utils/errorUtils';

interface ErrorHandlerOptions {
  context?: string;
  onError?: (error: Error) => void;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  retryable?: boolean;
  showToast?: boolean;
  actionLabel?: string;
  action?: () => void;
}

/**
 * Hook para gerenciar erros de forma centralizada na aplicação
 */
export function useErrorHandler(defaultOptions?: ErrorHandlerOptions) {
  const [error, setError] = useState<Error | null>(null);
  const [isHandlingError, setIsHandlingError] = useState(false);
  const toast = useToast();

  // Limpar o erro atual
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Manipular um erro com opções
  const handleError = useCallback((error: unknown, options?: ErrorHandlerOptions) => {
    const mergedOptions = { ...defaultOptions, ...options };
    const { 
      context = 'operação', 
      onError, 
      severity = 'error',
      showToast = true,
      actionLabel,
      action
    } = mergedOptions;

    // Normalizar o erro para um objeto Error
    const normalizedError = error instanceof Error 
      ? error 
      : new Error(typeof error === 'string' ? error : `Erro desconhecido durante ${context}`);
    
    // Atualizar o estado
    setError(normalizedError);
    setIsHandlingError(true);
    
    // Registrar o erro no console
    console.error(`[${severity.toUpperCase()}] Erro durante ${context}:`, normalizedError);
    
    // Reportar o erro para o sistema de monitoramento
    if (severity === 'error' || severity === 'critical') {
      reportError(normalizedError, { 
        context, 
        severity,
        metadata: mergedOptions
      });
    }
    
    // Mostrar toast se necessário
    if (showToast) {
      const { type } = categorizeError(normalizedError);
      const toastAction = action ? {
        label: actionLabel || 'Tentar novamente',
        onClick: () => {
          action();
          toast.removeToast(toastId);
        }
      } : undefined;
      
      const toastId = toast.error({
        title: `Erro ${type === 'network' ? 'de conexão' : 'na aplicação'}`,
        message: formatErrorMessage(normalizedError),
        error: normalizedError,
        action: toastAction
      });
    }
    
    // Chamar callback de erro se fornecido
    if (onError) {
      onError(normalizedError);
    }
    
    setIsHandlingError(false);
    return normalizedError;
  }, [defaultOptions, toast]);

  // Executar uma operação assíncrona com tratamento de erro
  const withErrorHandling = useCallback(async <T,>(
    operation: () => Promise<T>,
    options?: ErrorHandlerOptions & {
      onSuccess?: (result: T) => void;
    }
  ): Promise<T | null> => {
    try {
      const result = await operation();
      
      if (options?.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (err) {
      handleError(err, options);
      return null;
    }
  }, [handleError]);

  return {
    error,
    setError,
    clearError,
    handleError,
    withErrorHandling,
    isHandlingError
  };
} 