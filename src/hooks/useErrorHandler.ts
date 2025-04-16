import { useState, useCallback } from 'react';
import { useStore } from '../store';
import { NetworkStatus } from '../utils/network';
import { reportError, categorizeError } from '../utils/errorReporting';

export function useErrorHandler() {
  const [error, setError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [errorContext, setErrorContext] = useState<string | null>(null);
  const { setError: setGlobalError } = useStore();
  const networkStatus = NetworkStatus.getInstance();

  const handleError = useCallback((error: unknown, isGlobal = false, context?: string, severity?: 'info' | 'warning' | 'error' | 'critical') => {
    // Check if it's a network error
    const isOffline = !networkStatus.isOnline();
    setIsNetworkError(isOffline);

    // Categorize o erro para tratamento específico
    const errorCategory = categorizeError(error);
    
    // Format error message
    let errorMessage = 'Ocorreu um erro. Tente novamente.';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for common error types
      const errorLower = errorMessage.toLowerCase();
      
      if (errorLower.includes('network') || 
          errorLower.includes('failed to fetch') || 
          errorLower.includes('internet') ||
          errorLower.includes('offline') ||
          errorLower.includes('connection')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        setIsNetworkError(true);
      } else if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
        errorMessage = 'A operação demorou muito tempo. Tente novamente mais tarde.';
      } else if (errorLower.includes('permission') || errorLower.includes('access')) {
        errorMessage = 'Você não tem permissão para realizar esta ação.';
      } else if (errorLower.includes('auth') || errorLower.includes('login')) {
        errorMessage = 'Erro de autenticação. Por favor, faça login novamente.';
      } else if (errorLower.includes('not found') || errorLower.includes('não encontrado')) {
        errorMessage = 'O recurso solicitado não foi encontrado.';
      }
    }
    
    // Add context if provided
    if (context) {
      errorMessage = `${context}: ${errorMessage}`;
      setErrorContext(context);
    } else {
      setErrorContext(null);
    }
    
    // Log error for debugging
    console.error('Error handled:', {
      error,
      message: errorMessage,
      context,
      isGlobal,
      isNetworkError: isNetworkError || isOffline,
      severity
    });

    // Report error to monitoring service
    reportError(error, {
      context,
      userId: localStorage.getItem('userId') || undefined,
      severity: severity || (errorCategory.isCritical ? 'critical' : 'error')
    });

    if (isGlobal) {
      setGlobalError(errorMessage);
    } else {
      setError(errorMessage);
    }
    
    // Return the formatted message for potential further use
    return errorMessage;
  }, [setGlobalError, networkStatus, isNetworkError]);

  const clearError = useCallback(() => {
    setError(null);
    setGlobalError(null);
    setErrorContext(null);
    setIsNetworkError(false);
  }, [setGlobalError]);

  const withErrorHandling = useCallback(async <T,>(
    fn: () => Promise<T>,
    context?: string,
    isGlobal?: boolean,
    severity?: 'info' | 'warning' | 'error' | 'critical'
  ): Promise<T | null> => {
    try {
      clearError();
      const result = await fn();
      return result;
    } catch (error) {
      // Categorize o erro para tratamento específico
      const { type, isCritical, retryable } = categorizeError(error);
      
      // Trate erros críticos de forma especial
      if (isCritical) {
        // Por exemplo, redirecionar para login em caso de erro de autenticação
        if (type === 'auth') {
          window.location.href = '/login';
        }
      }
      
      handleError(error, isGlobal || isCritical, context, severity || (isCritical ? 'critical' : 'error'));
      return null;
    }
  }, [handleError, clearError, categorizeError]);

  return {
    error,
    isNetworkError,
    setError,
    handleError,
    clearError,
    withErrorHandling,
    errorContext
  };
}