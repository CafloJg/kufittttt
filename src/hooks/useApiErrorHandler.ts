import { useState, useCallback } from 'react';
import { useError } from '../context/ErrorContext';
import { reportError, categorizeError } from '../utils/errorReporting';

/**
 * Hook especializado para lidar com erros de API
 * Fornece funções para executar chamadas de API com tratamento de erros padronizado
 */
export function useApiErrorHandler() {
  const { setError, clearError } = useError();
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  /**
   * Executa uma chamada de API com tratamento de erros
   */
  const callApi = useCallback(async <T,>(
    apiFunction: () => Promise<T>,
    options?: {
      context?: string;
      onSuccess?: (data: T) => void;
      onError?: (error: Error) => void;
      retries?: number;
      shouldReport?: boolean;
      severity?: 'info' | 'warning' | 'error' | 'critical';
    }
  ): Promise<T | null> => {
    const {
      context,
      onSuccess,
      onError,
      retries = 0,
      shouldReport = true,
      severity = 'error'
    } = options || {};
    
    setIsLoading(true);
    clearError();
    
    try {
      // Execute API call
      const result = await apiFunction();
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      // Categorize error
      const { type, isCritical, retryable, message } = categorizeError(error);
      
      // Determine if we should retry
      if (retryable && retryCount < retries) {
        setRetryCount(prev => prev + 1);
        
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the call
        return callApi(apiFunction, options);
      }
      
      // Set error state
      setError(error, {
        context,
        severity: isCritical ? 'critical' : severity,
        shouldReport
      });
      
      // Call error callback if provided
      if (onError && error instanceof Error) {
        onError(error);
      }
      
      // Report error if needed
      if (shouldReport) {
        reportError(error, {
          context,
          severity: isCritical ? 'critical' : severity,
          retryCount,
          maxRetries: retries
        });
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [clearError, setError, retryCount]);

  /**
   * Executa múltiplas chamadas de API em paralelo com tratamento de erros
   */
  const callApiBatch = useCallback(async <T,>(
    apiFunctions: Array<() => Promise<T>>,
    options?: {
      context?: string;
      onSuccess?: (data: T[]) => void;
      onError?: (error: Error) => void;
      continueOnError?: boolean;
      retries?: number;
    }
  ): Promise<T[]> => {
    const {
      context,
      onSuccess,
      onError,
      continueOnError = false,
      retries = 0
    } = options || {};
    
    setIsLoading(true);
    clearError();
    
    try {
      const results: T[] = [];
      
      // Process each API call
      for (const apiFunction of apiFunctions) {
        try {
          const result = await callApi(apiFunction, { context, retries });
          if (result !== null) {
            results.push(result);
          }
        } catch (error) {
          if (!continueOnError) {
            throw error;
          }
          
          // Log error but continue
          console.warn('Error in API batch (continuing):', error);
        }
      }
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(results);
      }
      
      return results;
    } catch (error) {
      // Set error state
      setError(error, { context });
      
      // Call error callback if provided
      if (onError && error instanceof Error) {
        onError(error);
      }
      
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [callApi, clearError, setError]);

  return {
    callApi,
    callApiBatch,
    isLoading,
    retryCount,
    resetRetryCount: () => setRetryCount(0)
  };
}